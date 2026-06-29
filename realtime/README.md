# MasterStocks real-time service (Angel One SmartAPI)

A tiny **FastAPI** service that streams **genuine real-time** Indian market ticks
from Angel One's SmartAPI WebSocket (free with an Angel One account) and serves
them to the MasterStocks website over the same `/api/quote` contract it already
uses.

This replaces the ~15-minute-delayed Yahoo feed for the **India** tab with
sub-second ticks for NIFTY 50, BANK NIFTY, SENSEX and NSE stocks.

> Personal-use only. Broker market-data feeds are licensed for your own use;
> redistributing real-time exchange data publicly can require NSE/BSE licensing.

## 1. Get free Angel One API credentials

1. Open a (free) Angel One account if you do not have one.
2. Go to <https://smartapi.angelbroking.com/> -> **Create App** (a trading /
   market-feeds app). Note the **API key**.
3. Enable **TOTP** for SmartAPI and save the **base32 secret** (the text behind
   the QR code) -- the service uses it to log in automatically.
4. You will also need your **client code** (e.g. `A123456`) and your **login
   PIN/MPIN**.

## 2. Run it locally

```bash
cd realtime
python -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env        # then fill in your credentials
uvicorn main:app --host 0.0.0.0 --port 8000
```

Check it:

```bash
curl "http://localhost:8000/api/quote?symbols=^NSEI,^NSEBANK,RELIANCE.NS"
# -> { "quotes": { "^NSEI": { "price": 23952.1, "chg": 0.42, "spark": [..] } } }
```

(During market hours you get live values; outside hours you get the last traded
price. The first request for a new symbol may be empty for a second until the
first tick arrives.)

## 3. Deploy it (always-on server required)

A WebSocket needs a persistent process, so this part canNOT go on Vercel
serverless. Use **Render** or **Railway** (both have free tiers) or any VPS.

**Render example**

1. Push the repo to GitHub.
2. Render -> **New -> Web Service**, root directory `realtime`.
3. Build command: `pip install -r requirements.txt`
4. Start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
   (a `Procfile` with the same command is included.)
5. Add the environment variables from `.env.example`.
6. Deploy and copy the public URL, e.g. `https://masterstocks-rt.onrender.com`.

## 4. Point the website at it

In the Next.js app set **one** environment variable (Vercel -> Project ->
Settings -> Environment Variables, or `.env.local` for local dev):

```bash
NEXT_PUBLIC_REALTIME_API=https://masterstocks-rt.onrender.com
```

Redeploy the site. The **India** tab now pulls from this real-time service
(polling every ~5s); crypto (CoinGecko) and US stocks (Yahoo/Twelve Data) are
unchanged. If the service is down or the variable is unset, the site
automatically falls back to the built-in Yahoo proxy.

## Symbols

| Site symbol | Instrument |
| --- | --- |
| `^NSEI` | NIFTY 50 |
| `^NSEBANK` | NIFTY BANK |
| `^BSESN` | SENSEX |
| `<SYMBOL>.NS` | NSE stock (e.g. `RELIANCE.NS`) |

## Notes & limits

- **Daily token:** SmartAPI sessions expire daily; the service re-authenticates
  automatically on reconnect.
- **Charts:** the sparkline is seeded from daily closes (best-effort via Angel's
  historical candles) with the live price as the last point, so the quant /
  Bachelier / Livermore reads keep their daily-bar meaning.
- **US stocks / crypto** are not Indian instruments and stay on their existing
  sources.
- Index tokens are pre-filled and stable; override via env if Angel changes them.
