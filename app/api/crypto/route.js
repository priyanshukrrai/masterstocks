// Server-side crypto proxy with a MULTI-PROVIDER fallback chain.
//
// Why this exists: fetching a single crypto API directly from the browser is
// unreliable -- free endpoints block browser requests (CORS) or rate-limit them
// (HTTP 429). When that happened the client silently fell back to the hard-coded
// seed prices and random-walked them, so the site showed WRONG prices.
//
// This route fetches on the SERVER (no CORS, far fewer rate-limit problems) and
// tries several independent, real data sources in order, using the first that
// responds. So if CoinGecko is throttled, CoinCap or CoinPaprika still serve
// real live values. The client additionally overlays Binance's real-time price
// for per-second motion (see lib/useMarkets.js -> loadCryptoLive).
//
// Requires a Node server runtime (next dev / next start / Vercel). A pure static
// export has no API routes, so the client falls back to a direct CoinGecko call.

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const COINGECKO_URL =
  "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=250&page=1&sparkline=true&price_change_percentage=24h";

function json(body) {
  return new Response(JSON.stringify(body), {
    headers: {
      "content-type": "application/json",
      "cache-control": "no-store",
    },
  });
}

// Build a natural-looking 24-point series ending at the real price when a
// provider doesn't return a sparkline. Deterministic so it doesn't jump around.
function synthSpark(price, chg) {
  if (!isFinite(price) || price <= 0) return [price];
  const pts = [];
  let p = price * (1 - (chg || 0) / 100);
  let seed =
    (Math.floor(Math.abs(price) * 1000 + Math.abs(chg || 0) * 97) + 1) | 0;
  const rand = () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  for (let i = 0; i < 23; i++) {
    p = p * (1 + (rand() - 0.48) * 0.012);
    pts.push(p);
  }
  pts.push(price);
  return pts;
}

const GOOD = (c) => c && isFinite(c.price) && c.price > 0;

// 1) CoinGecko - richest data incl. logos + a real 7-day sparkline.
async function fromCoinGecko() {
  const headers = { Accept: "application/json" };
  const key =
    process.env.COINGECKO_KEY || process.env.NEXT_PUBLIC_COINGECKO_KEY || "";
  if (key) headers["x-cg-demo-api-key"] = key;
  const r = await fetch(COINGECKO_URL, { headers, cache: "no-store" });
  if (!r.ok) return null;
  const data = await r.json();
  if (!Array.isArray(data) || !data.length) return null;
  return data
    .map((d) => ({
      id: "c_" + (d.id || d.symbol),
      symbol: (d.symbol || "").toUpperCase(),
      name: d.name,
      price: Number(d.current_price),
      chg: Number(d.price_change_percentage_24h) || 0,
      image: d.image,
      mcap: d.market_cap,
      vol: d.total_volume,
      spark:
        d.sparkline_in_7d && Array.isArray(d.sparkline_in_7d.price)
          ? d.sparkline_in_7d.price.slice(-24)
          : synthSpark(Number(d.current_price), d.price_change_percentage_24h),
    }))
    .filter(GOOD);
}

// 2) CoinCap - real-time top 250 by market cap (compact response, has logos).
async function fromCoinCap() {
  const r = await fetch("https://api.coincap.io/v2/assets?limit=250", {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  if (!r.ok) return null;
  const j = await r.json();
  const arr = j && Array.isArray(j.data) ? j.data : null;
  if (!arr || !arr.length) return null;
  return arr
    .map((d) => {
      const sym = (d.symbol || "").toUpperCase();
      const price = Number(d.priceUsd);
      const chg = Number(d.changePercent24Hr);
      return {
        id: "c_" + (d.id || sym.toLowerCase()),
        symbol: sym,
        name: d.name,
        price,
        chg: isFinite(chg) ? chg : 0,
        image: sym
          ? "https://assets.coincap.io/assets/icons/" +
            sym.toLowerCase() +
            "@2x.png"
          : undefined,
        mcap: Number(d.marketCapUsd) || undefined,
        vol: Number(d.volumeUsd24Hr) || undefined,
        spark: synthSpark(price, isFinite(chg) ? chg : 0),
      };
    })
    .filter(GOOD);
}

// 3) CoinPaprika - independent real-time fallback (no key).
async function fromCoinPaprika() {
  const r = await fetch("https://api.coinpaprika.com/v1/tickers?quotes=USD", {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  if (!r.ok) return null;
  const arr = await r.json();
  if (!Array.isArray(arr) || !arr.length) return null;
  return arr
    .slice(0, 250)
    .map((d) => {
      const u = (d.quotes && d.quotes.USD) || {};
      const price = Number(u.price);
      const chg = Number(u.percent_change_24h);
      return {
        id: "c_" + (d.id || (d.symbol || "").toLowerCase()),
        symbol: (d.symbol || "").toUpperCase(),
        name: d.name,
        price,
        chg: isFinite(chg) ? chg : 0,
        image: undefined,
        mcap: Number(u.market_cap) || undefined,
        vol: Number(u.volume_24h) || undefined,
        spark: synthSpark(price, isFinite(chg) ? chg : 0),
      };
    })
    .filter(GOOD);
}

export async function GET() {
  const providers = [
    ["coingecko", fromCoinGecko],
    ["coincap", fromCoinCap],
    ["coinpaprika", fromCoinPaprika],
  ];
  for (const [name, fn] of providers) {
    try {
      const coins = await fn();
      if (coins && coins.length) return json({ coins, source: name });
    } catch (e) {
      /* provider failed -> try the next one */
    }
  }
  return json({ coins: [], source: null });
}
