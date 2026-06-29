"""
MasterStocks real-time market-data service (Angel One SmartAPI).

Why this exists
---------------
The Next.js site pulled Indian quotes from Yahoo's free feed, which can lag the
live market by up to ~15 minutes. This small FastAPI service connects to Angel
One's SmartAPI WebSocket (free with an Angel One account) and streams genuine
real-time ticks for the NSE indices and NSE/BSE stocks, then exposes them over
the SAME /api/quote contract the website already speaks:

    GET /api/quote?symbols=^NSEI,^NSEBANK,RELIANCE.NS
    -> { "quotes": { "^NSEI": { "price": 23952.1, "chg": 0.42, "spark": [..] } } }

So the frontend needs ONE change: point NEXT_PUBLIC_REALTIME_API at this
service's URL. Symbols use the same Yahoo-style names the site already sends
(^NSEI = Nifty 50, ^NSEBANK = Bank Nifty, ^BSESN = Sensex, <SYMBOL>.NS = an NSE
stock); we translate them to Angel tokens here.

Run locally
-----------
    pip install -r requirements.txt
    cp .env.example .env        # fill in your Angel One credentials
    uvicorn main:app --host 0.0.0.0 --port 8000

This MUST run on an always-on server (Render / Railway / a small VPS) because it
holds a live WebSocket -- it will NOT work on Vercel's serverless functions.
"""

import datetime
import os
import threading
import time
from collections import defaultdict, deque

import pyotp
import requests
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from SmartApi import SmartConnect
from SmartApi.smartWebSocketV2 import SmartWebSocketV2

load_dotenv()

API_KEY = os.getenv("ANGEL_API_KEY", "")
CLIENT_CODE = os.getenv("ANGEL_CLIENT_CODE", "")
MPIN = os.getenv("ANGEL_MPIN", "")  # your Angel One login PIN (or password)
TOTP_SECRET = os.getenv("ANGEL_TOTP_SECRET", "")  # base32 secret from TOTP setup
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "*")

# Prices on the SmartAPI WebSocket arrive as integers scaled x100 (paise).
SCALE = 100.0
SPARK_LEN = 30

# Angel exchangeType codes used by SmartWebSocketV2.
EXCH_NSE = 1  # NSE cash + NSE indices
EXCH_BSE = 3  # BSE cash + BSE indices (e.g. SENSEX)

# Well-known Angel tokens for the indices the site shows. They are stable, but
# can be overridden via env if Angel ever changes them. Verify against the
# ScripMaster if a value ever looks wrong.
INDEX_MAP = {
    "^NSEI": (EXCH_NSE, os.getenv("NIFTY_TOKEN", "99926000")),  # NIFTY 50
    "^NSEBANK": (EXCH_NSE, os.getenv("BANKNIFTY_TOKEN", "99926009")),  # NIFTY BANK
    "^BSESN": (EXCH_BSE, os.getenv("SENSEX_TOKEN", "99919000")),  # BSE SENSEX
}

SCRIP_MASTER_URL = (
    "https://margincalculator.angelbroking.com/OpenAPI_File/files/"
    "OpenAPIScripMaster.json"
)

# ---- shared state -----------------------------------------------------------
_store = {}  # token -> {"ltp": float, "close": float, "ts": int}
_sparks = defaultdict(lambda: deque(maxlen=SPARK_LEN))  # token -> recent ticks
_base_spark = {}  # token -> list of daily closes (best-effort seed)
_token_for_symbol = {}  # yahoo symbol -> (exchangeType, token)
_symbol_for_token = {}  # token -> yahoo symbol
_subscribed = set()  # subscribed tokens
_scrip = None  # cached ScripMaster list
_lock = threading.Lock()
_sws = None  # SmartWebSocketV2 instance
_rest = None  # SmartConnect REST instance (for historical candles)
_auth = {"jwt": None, "feed": None}


def load_scrip_master():
    """Download + cache Angel's instrument master (needed for equity tokens)."""
    global _scrip
    if _scrip is not None:
        return _scrip
    r = requests.get(SCRIP_MASTER_URL, timeout=30)
    r.raise_for_status()
    _scrip = r.json()
    return _scrip


def resolve_token(ysym):
    """Map a Yahoo-style symbol to (exchangeType, token). Cached."""
    if ysym in _token_for_symbol:
        return _token_for_symbol[ysym]
    pair = None
    if ysym in INDEX_MAP:
        pair = INDEX_MAP[ysym]
    elif ysym.endswith(".NS"):
        target = ysym[:-3].upper() + "-EQ"
        try:
            for row in load_scrip_master():
                if (
                    row.get("exch_seg") == "NSE"
                    and str(row.get("symbol", "")).upper() == target
                ):
                    pair = (EXCH_NSE, str(row.get("token")))
                    break
        except Exception:
            pair = None
    if pair:
        _token_for_symbol[ysym] = pair
        _symbol_for_token[pair[1]] = ysym
    return pair


def _seed_spark(exch, token):
    """Best-effort: seed a daily-close series so charts keep daily-bar meaning.
    The live LTP then just updates the last point. Failures are non-fatal."""
    if token in _base_spark or _rest is None:
        return
    try:
        seg = "NSE" if exch == EXCH_NSE else "BSE"
        to = datetime.datetime.now()
        frm = to - datetime.timedelta(days=60)
        params = {
            "exchange": seg,
            "symboltoken": token,
            "interval": "ONE_DAY",
            "fromdate": frm.strftime("%Y-%m-%d %H:%M"),
            "todate": to.strftime("%Y-%m-%d %H:%M"),
        }
        res = _rest.getCandleData(params)
        candles = (res or {}).get("data") or []
        closes = [float(c[4]) for c in candles][-SPARK_LEN:]
        if closes:
            _base_spark[token] = closes
    except Exception:
        pass


def _on_data(wsapp, message):
    """WebSocket tick handler. SmartWebSocketV2 delivers a parsed dict."""
    try:
        if not isinstance(message, dict):
            return
        tok = str(message.get("token") or message.get("tk") or "")
        ltp_raw = message.get("last_traded_price")
        close_raw = message.get("closed_price")
        if not tok or ltp_raw is None:
            return
        ltp = float(ltp_raw) / SCALE
        prev = _store.get(tok, {}).get("close")
        close = float(close_raw) / SCALE if close_raw else (prev or ltp)
        _store[tok] = {"ltp": ltp, "close": close, "ts": int(time.time() * 1000)}
        _sparks[tok].append(ltp)
    except Exception:
        pass


def _ensure_subscribed(pairs):
    """Subscribe (mode 2 = Quote) to any tokens we are not already streaming."""
    with _lock:
        new = [(e, t) for (e, t) in pairs if t and t not in _subscribed]
        if not new or _sws is None:
            return
        by_exch = defaultdict(list)
        for e, t in new:
            by_exch[e].append(t)
            _subscribed.add(t)
        token_list = [
            {"exchangeType": e, "tokens": toks} for e, toks in by_exch.items()
        ]
        try:
            _sws.subscribe("masterstocks", 2, token_list)
        except Exception:
            for e, t in new:
                _subscribed.discard(t)


def _authenticate():
    """Log in via API key + PIN + TOTP and capture the JWT + feed token."""
    global _rest
    obj = SmartConnect(api_key=API_KEY)
    totp = pyotp.TOTP(TOTP_SECRET).now()
    data = obj.generateSession(CLIENT_CODE, MPIN, totp)
    _auth["jwt"] = data["data"]["jwtToken"]
    _auth["feed"] = obj.getfeedToken()
    _rest = obj
    return obj


def _run_ws():
    """Background loop: authenticate, open the WebSocket, auto-reconnect."""
    global _sws
    backoff = 5
    while True:
        try:
            _authenticate()
            _sws = SmartWebSocketV2(
                _auth["jwt"], API_KEY, CLIENT_CODE, _auth["feed"]
            )

            def on_open(wsapp):
                # (re)subscribe everything we already know about.
                pairs = list(set(_token_for_symbol.values()))
                _subscribed.clear()
                _ensure_subscribed(pairs)

            _sws.on_open = on_open
            _sws.on_data = _on_data
            _sws.on_error = lambda wsapp, error: None
            _sws.on_close = lambda wsapp: None
            backoff = 5
            _sws.connect()  # blocks until the socket drops
        except Exception:
            pass
        time.sleep(backoff)
        backoff = min(backoff * 2, 60)


app = FastAPI(title="MasterStocks Realtime (Angel One SmartAPI)")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in CORS_ORIGINS.split(",")],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def _startup():
    if not (API_KEY and CLIENT_CODE and MPIN and TOTP_SECRET):
        print("WARNING: Angel One credentials missing -- set them in .env")
    for ysym in INDEX_MAP:
        resolve_token(ysym)  # pre-resolve indices so they subscribe on connect
    threading.Thread(target=_run_ws, daemon=True).start()


@app.get("/health")
def health():
    return {
        "ok": True,
        "subscribed": len(_subscribed),
        "symbols": len(_token_for_symbol),
        "live": len(_store),
    }


@app.get("/api/quote")
def quote(symbols: str = "", range: str = "3mo", interval: str = "1d"):
    # range/interval are accepted for drop-in compatibility with the old Yahoo
    # proxy contract but are ignored here (the feed is live ticks).
    syms = [s.strip() for s in symbols.split(",") if s.strip()]
    pairs = []
    for ysym in syms:
        p = resolve_token(ysym)
        if p:
            pairs.append(p)
            _seed_spark(p[0], p[1])
    _ensure_subscribed(pairs)

    quotes = {}
    for ysym in syms:
        p = _token_for_symbol.get(ysym)
        if not p:
            continue
        tok = p[1]
        st = _store.get(tok)
        if not st:
            continue
        price = st["ltp"]
        close = st["close"] or price
        chg = ((price - close) / close * 100.0) if close else 0.0
        base = _base_spark.get(tok)
        if base and len(base) > 1:
            spark = base[:-1] + [price]
        else:
            spark = list(_sparks.get(tok, [])) or [price]
        quotes[ysym] = {"price": price, "chg": chg, "spark": spark}
    return {"quotes": quotes}


@app.get("/")
def root():
    return {
        "service": "masterstocks-realtime",
        "provider": "Angel One SmartAPI",
        "try": "/api/quote?symbols=^NSEI,^NSEBANK,RELIANCE.NS",
    }
