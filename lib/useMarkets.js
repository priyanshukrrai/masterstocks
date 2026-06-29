"use client";
import { useCallback, useEffect, useState } from "react";
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

  // CoinGecko live crypto - top 250 by market cap (optional demo key).
  const loadCrypto = useCallback(async () => {
    try {
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
    loadStocksLive();
    loadIndiaLive();
    const sim = setInterval(() => {
      // Only jitters assets that have no live feed; live ones are held steady.
      setCrypto((l) => tick(l));
      setStocks((l) => tick(l));
      setIndia((l) => tick(l));
    }, 1500);
    // Poll faster so the UI surfaces fresh quotes sooner. This only reduces our
    // own sampling lag (was 30s, now ~15s); the data provider's inherent feed
    // delay is a separate thing and cannot be removed on a free source.
    const cg = setInterval(loadCrypto, 30000);
    const fh = setInterval(loadStocksLive, 15000);
    // Poll India faster when a real-time service is wired up (it is our own
    // low-latency backend), otherwise stay gentle on the Yahoo route.
    const indMs = process.env.NEXT_PUBLIC_REALTIME_API ? 5000 : 15000;
    const ind = setInterval(loadIndiaLive, indMs);
    const st = setInterval(() => setOpen(indiaOpen()), 30000);
    return () => {
      clearInterval(sim);
      clearInterval(cg);
      clearInterval(fh);
      clearInterval(ind);
      clearInterval(st);
    };
  }, [loadCrypto, loadStocksLive, loadIndiaLive]);

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
