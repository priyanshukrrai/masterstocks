// Server-side market-data proxy.
//
// Why this exists: the Indian indices (NIFTY 50, SENSEX, BANK NIFTY) had no
// live feed in the client, so they only drifted off a hard-coded seed -- which
// is why the site showed a stale ~23,440 while the real NIFTY 50 was ~23,952.
// There is no free, browser-CORS-friendly endpoint for NSE indices, so we fetch
// here on the server (no CORS limits, no API key needed) from Yahoo Finance and
// return both the live price and a recent daily-close series used for the
// charts, the ICT read and the quant / Bachelier / Livermore models.
//
// Requires a Node server runtime (next dev / next start / Vercel). When the app
// is built as a pure static export this route is absent and the client falls
// back to Twelve Data and then to the simulation.

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function fetchOne(sym, range, interval) {
  const url =
    "https://query1.finance.yahoo.com/v8/finance/chart/" +
    encodeURIComponent(sym) +
    "?range=" +
    encodeURIComponent(range) +
    "&interval=" +
    encodeURIComponent(interval);
  const r = await fetch(url, {
    headers: {
      // Yahoo rejects requests without a browser-like User-Agent.
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36",
      Accept: "application/json",
    },
    cache: "no-store",
  });
  if (!r.ok) return null;
  const j = await r.json();
  const res = j && j.chart && j.chart.result && j.chart.result[0];
  if (!res) return null;
  const meta = res.meta || {};
  const q = res.indicators && res.indicators.quote && res.indicators.quote[0];
  const closes = ((q && q.close) || []).filter((x) => x != null && isFinite(x));
  const price =
    meta.regularMarketPrice != null
      ? meta.regularMarketPrice
      : closes[closes.length - 1];
  if (price == null || !isFinite(price)) return null;
  const prev =
    meta.chartPreviousClose != null
      ? meta.chartPreviousClose
      : meta.previousClose != null
        ? meta.previousClose
        : closes[0];
  const chg = prev ? ((price - prev) / prev) * 100 : 0;
  const spark = closes.slice(-30);
  if (spark.length && spark[spark.length - 1] !== price) spark.push(price);
  return { price, chg, spark };
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const symbols = (searchParams.get("symbols") || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const range = searchParams.get("range") || "3mo";
  const interval = searchParams.get("interval") || "1d";

  const quotes = {};
  // Limit concurrency so we stay polite to the upstream provider.
  const CHUNK = 8;
  for (let i = 0; i < symbols.length; i += CHUNK) {
    const part = symbols.slice(i, i + CHUNK);
    const settled = await Promise.all(
      part.map(async (s) => {
        try {
          return [s, await fetchOne(s, range, interval)];
        } catch (e) {
          return [s, null];
        }
      }),
    );
    for (const [s, data] of settled) if (data) quotes[s] = data;
  }

  return new Response(JSON.stringify({ quotes }), {
    headers: {
      "content-type": "application/json",
      "cache-control": "no-store",
    },
  });
}
