"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  CRYPTO_SEED,
  STOCK_SEED,
  INDIA_SEED,
  CRYPTO_LIMIT,
  COINGECKO_URL,
  getApiKey,
  twelveDataUrl,
  withSpark,
  indiaOpen,
  fetchProxyQuotes,
  fetchBinanceQuotes,
  ANNUAL_HOURLY,
} from "./data";

// Cosmetic "alive" jitter for assets WITHOUT a live feed only. Anything marked
// _live (CoinGecko / proxy / Twelve Data) is held exactly at its fetched value
// so the displayed price and the ICT/quant reads always track the real market
// instead of drifting away from it.
function tick(list) {
  return list.map((a) => {
    if (a._live) return a;
    const drift = (Math.random() - 0.5) * 0.0016;
    const price = Math.max(0.0001, a.price * (1 + drift));
    const chg = a.chg + drift * 100;
    const spark = [...(a.spark || []).slice(1), price];
    return { ...a, price, chg, spark };
  });
}

// Merge a proxy quote map ({ price, chg, spark }) onto a state list by symbol.
function applyProxyQuotes(setter, map) {
  let touched = 0;
  setter((prev) =>
    prev.map((p) => {
      const q = map[p.symbol];
      if (!q) return p;
      const price = Number(q.price);
      if (!isFinite(price) || price === 0) return p;
      touched++;
      const spark =
        Array.isArray(q.spark) && q.spark.length > 2
          ? q.spark
          : [...(p.spark || []).slice(1), price];
      return {
        ...p,
        price,
        chg: isFinite(Number(q.chg)) ? Number(q.chg) : p.chg,
        spark,
        _live: true,
        _ts: Date.now(),
      };
    }),
  );
  return touched;
}

function chunk(arr, n) {
  const out = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
}

// Parse a Twelve Data /quote response. Batch requests return a dict keyed by
// symbol; a single-symbol request returns the quote object directly.
async function fetchTwelveData(symbols, key, exchange) {
  const r = await fetch(twelveDataUrl(symbols, key, exchange));
  if (!r.ok) return {};
  const data = await r.json();
  if (!data || data.status === "error") return {};
  if (data.symbol && data.close != null) {
    const single = {};
    single[data.symbol] = data;
    return single;
  }
  return data;
}

// Twelve Data caps batch size (~120 symbols/call); chunk and merge.
async function fetchTwelveDataBatch(symbols, key, exchange) {
  const groups = chunk(symbols, 100);
  let merged = {};
  for (const g of groups) {
    const part = await fetchTwelveData(g, key, exchange);
    merged = { ...merged, ...part };
  }
  return merged;
}

// Merge a Twelve Data quote map onto a state list, matched by symbol.
function applyQuotes(setter, map) {
  setter((prev) =>
    prev.map((p) => {
      const q = map[p.symbol];
      if (!q) return p;
      const price = parseFloat(q.close);
      if (!isFinite(price) || price === 0) return p;
      const chg = parseFloat(q.percent_change);
      const spark = [...(p.spark || []).slice(1), price];
      return {
        ...p,
        price,
        chg: isFinite(chg) ? chg : p.chg,
        spark,
        _live: true,
      };
    }),
  );
}

export function useMarkets() {
  const [tab, setTab] = useState("crypto");
  const [search, setSearch] = useState("");
  const [crypto, setCrypto] = useState(() => withSpark(CRYPTO_SEED));
  const [stocks, setStocks] = useState(() => withSpark(STOCK_SEED));
  const [india, setIndia] = useState(() => withSpark(INDIA_SEED));
  const [open, setOpen] = useState(false);

  // Keep the newest crypto list in a ref so the realtime poller can map the
  // currently displayed coins to Binance pairs without re-creating its interval
  // on every render.
  const cryptoRef = useRef(crypto);
  useEffect(() => {
    cryptoRef.current = crypto;
  }, [crypto]);

  // CoinGecko live crypto - top 250 by market cap (optional demo key).
  const loadCrypto = useCallback(async () => {
    try {
      // Prefer our own server proxy (/api/crypto): no browser CORS and no
      // client-side rate-limiting, so we always get REAL prices instead of
      // silently falling back to the stale seed. Only a pure static export
      // lacks the route -- then we drop to the direct CoinGecko call below.
      if (process.env.NEXT_PUBLIC_STATIC_EXPORT !== "true") {
        try {
          const pr = await fetch("/api/crypto", { cache: "no-store" });
          if (pr.ok) {
            const pj = await pr.json();
            const coins = (pj && Array.isArray(pj.coins) && pj.coins) || [];
            if (coins.length) {
              if (typeof console !== "undefined") {
                const btc = coins.find((c) => c.symbol === "BTC");
                console.info(
                  "[masterstocks] crypto base via /api/crypto source=" +
                    (pj.source || "?") +
                    (btc ? " BTC=$" + btc.price : ""),
                );
              }
              setCrypto((prev) =>
                coins.slice(0, CRYPTO_LIMIT).map((d, i) => ({
                  ...d,
                  cur: "USD",
                  kind: "crypto",
                  annualFactor: ANNUAL_HOURLY,
                  barLabel: "hour",
                  barsPerDay: 24,
                  spark:
                    Array.isArray(d.spark) && d.spark.length
                      ? d.spark
                      : (prev[i] && prev[i].spark) || [d.price],
                  _live: true,
                })),
              );
              return;
            }
          }
        } catch (e) {
          /* proxy unreachable: fall through to direct CoinGecko */
        }
      }
      const cgKey = getApiKey("coingecko");
      const opts = cgKey
        ? { headers: { "x-cg-demo-api-key": cgKey } }
        : undefined;
      const r = await fetch(COINGECKO_URL, opts);
      if (!r.ok) return;
      const data = await r.json();
      if (!Array.isArray(data)) return;
      setCrypto((prev) =>
        data.slice(0, CRYPTO_LIMIT).map((d, i) => ({
          // Use CoinGecko's unique slug id (e.g. "bitcoin"); ticker symbols
          // collide within the top 250 and would create duplicate React keys.
          id: "c_" + (d.id || d.symbol),
          symbol: (d.symbol || "").toUpperCase(),
          name: d.name,
          price: d.current_price,
          chg: d.price_change_percentage_24h || 0,
          cur: "USD",
          kind: "crypto",
          annualFactor: ANNUAL_HOURLY,
          barLabel: "hour",
          barsPerDay: 24,
          image: d.image,
          mcap: d.market_cap,
          vol: d.total_volume,
          spark:
            d.sparkline_in_7d && d.sparkline_in_7d.price
              ? d.sparkline_in_7d.price.slice(-24)
              : (prev[i] && prev[i].spark) || [d.current_price],
          _live: true,
        })),
      );
    } catch (e) {
      /* offline / CORS: keep simulated data */
    }
  }, []);

  // Real-time crypto price overlay (Binance, key-free). CoinGecko supplies the
  // coin list, images and market caps but only refreshes every ~30-60s, which
  // is why prices looked frozen. Binance ticks every second, so we layer its
  // live prices on top of the existing list to keep crypto prices moving.
  const loadCryptoLive = useCallback(async () => {
    try {
      const map = await fetchBinanceQuotes(cryptoRef.current);
      const n = Object.keys(map).length;
      if (n) {
        applyProxyQuotes(setCrypto, map);
        if (typeof console !== "undefined") {
          console.info(
            "[masterstocks] crypto live overlay via Binance: " +
              n +
              " coins" +
              (map.BTC ? " BTC=$" + map.BTC.price : ""),
          );
        }
      }
    } catch (e) {
      /* Binance offline / blocked: CoinGecko values remain */
    }
  }, []);

  // US equities: prefer the key-free server proxy (Yahoo). If that is absent
  // (static export) fall back to Twelve Data batch (premium) when a key is
  // set, else Finnhub per-symbol (capped to stay under free-tier limits).
  const loadStocksLive = useCallback(async () => {
    try {
      const proxyMap = await fetchProxyQuotes(STOCK_SEED, "3mo", "1d");
      if (Object.keys(proxyMap).length) {
        applyProxyQuotes(setStocks, proxyMap);
        return;
      }
    } catch (e) {
      /* proxy unreachable: fall through to Twelve Data / Finnhub */
    }
    try {
      const td = getApiKey("twelvedata");
      if (td) {
        const syms = STOCK_SEED.map((s) => s.symbol);
        const map = await fetchTwelveDataBatch(syms, td);
        applyQuotes(setStocks, map);
        return;
      }
      const k = getApiKey("finnhub");
      if (!k) return;
      await Promise.all(
        STOCK_SEED.slice(0, 30).map(async (s) => {
          try {
            const r = await fetch(
              "https://finnhub.io/api/v1/quote?symbol=" +
                s.symbol +
                "&token=" +
                k,
            );
            if (!r.ok) return;
            const q = await r.json();
            if (!q || typeof q.c !== "number" || q.c === 0) return;
            setStocks((prev) =>
              prev.map((p) =>
                p.symbol === s.symbol
                  ? { ...p, price: q.c, chg: q.dp || p.chg, _live: true }
                  : p,
              ),
            );
          } catch (e) {
            /* ignore individual symbol failures */
          }
        }),
      );
    } catch (e) {
      /* keep simulated data */
    }
  }, []);

  // Indian markets (NSE): prefer the key-free server proxy (Yahoo), which now
  // covers the indices too (NIFTY 50 ^NSEI, SENSEX ^BSESN, BANK NIFTY ^NSEBANK)
  // as well as every single stock -- this is the fix for the stale index value.
  // If the proxy is unavailable, fall back to Twelve Data (single stocks only;
  // indices then hold their seed level rather than drifting to a wrong number).
  const loadIndiaLive = useCallback(async () => {
    try {
      // If a real-time service (e.g. the Angel One FastAPI proxy in /realtime)
      // is configured, fetch India quotes from there for true sub-second data;
      // otherwise use the built-in Yahoo route. Same response shape either way.
      const rt = process.env.NEXT_PUBLIC_REALTIME_API;
      const proxyMap = await fetchProxyQuotes(
        INDIA_SEED,
        "3mo",
        "1d",
        rt ? { base: rt } : {},
      );
      if (Object.keys(proxyMap).length) {
        applyProxyQuotes(setIndia, proxyMap);
        return;
      }
    } catch (e) {
      /* proxy unreachable: fall through to Twelve Data */
    }
    const td = getApiKey("twelvedata");
    if (!td) return;
    try {
      const syms = INDIA_SEED.filter((s) => !s.index).map((s) => s.symbol);
      const map = await fetchTwelveDataBatch(syms, td, "NSE");
      applyQuotes(setIndia, map);
    } catch (e) {
      /* keep simulated data */
    }
  }, []);

  // Boot + intervals
  useEffect(() => {
    setOpen(indiaOpen());
    loadCrypto();
    loadCryptoLive();
    loadStocksLive();
    loadIndiaLive();
    const sim = setInterval(() => {
      // Only jitters assets that have no live feed; live ones are held steady.
      setCrypto((l) => tick(l));
      setStocks((l) => tick(l));
      setIndia((l) => tick(l));
    }, 1500);
    // Poll faster so the UI surfaces fresh quotes sooner. This only reduces our
    // own sampling lag; the provider's inherent feed delay is separate and
    // cannot be removed on a free source.
    //   - loadCrypto hits our /api/crypto server proxy (real CoinGecko data,
    //     no browser CORS / rate-limit) for the coin list + base price.
    //   - Binance (loadCryptoLive) is the real-time price feed and ticks every
    //     few seconds so crypto prices actually move.
    const cg = setInterval(loadCrypto, 15000);
    const cl = setInterval(loadCryptoLive, 4000);
    const fh = setInterval(loadStocksLive, 8000);
    // Poll India faster when a real-time service is wired up (it is our own
    // low-latency backend), otherwise stay reasonably fresh on the Yahoo route.
    const indMs = process.env.NEXT_PUBLIC_REALTIME_API ? 3000 : 8000;
    const ind = setInterval(loadIndiaLive, indMs);
    const st = setInterval(() => setOpen(indiaOpen()), 30000);

    // Refetch the instant the user comes back to the tab/window, so prices are
    // fresh immediately on return instead of waiting out the poll interval.
    const refetchAll = () => {
      loadCrypto();
      loadCryptoLive();
      loadStocksLive();
      loadIndiaLive();
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") refetchAll();
    };
    window.addEventListener("focus", refetchAll);
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      clearInterval(sim);
      clearInterval(cg);
      clearInterval(cl);
      clearInterval(fh);
      clearInterval(ind);
      clearInterval(st);
      window.removeEventListener("focus", refetchAll);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [loadCrypto, loadCryptoLive, loadStocksLive, loadIndiaLive]);

  // Save/clear a provider key at runtime: setKey("twelvedata", "...").
  const setKey = useCallback((provider, value) => {
    if (typeof window === "undefined") return;
    const k = provider + "_key";
    if (value) localStorage.setItem(k, value);
    else localStorage.removeItem(k);
  }, []);

  const list = tab === "crypto" ? crypto : tab === "stocks" ? stocks : india;
  const q = search.trim().toLowerCase();
  const filtered = q
    ? list.filter(
        (a) =>
          a.name.toLowerCase().includes(q) ||
          a.symbol.toLowerCase().includes(q),
      )
    : list;

  return {
    tab,
    setTab,
    search,
    setSearch,
    crypto,
    stocks,
    india,
    open,
    filtered,
    setKey,
  };
}
