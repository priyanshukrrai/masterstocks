// Server-side crypto proxy.
//
// Why this exists: fetching CoinGecko directly from the browser is unreliable.
// The free CoinGecko endpoint frequently blocks browser requests (CORS) or
// rate-limits them (HTTP 429). When that happened the client silently fell
// back to the hard-coded seed prices (BTC ~$67,250 etc.) and then random-walked
// them with the cosmetic simulation -- i.e. the site showed plausible but WRONG
// prices. Fetching here on the server removes the CORS problem and most of the
// rate-limiting, so the browser always receives real values from a same-origin
// route. The client then overlays Binance's real-time price on top for
// per-second motion (see lib/useMarkets.js -> loadCryptoLive).
//
// Requires a Node server runtime (next dev / next start / Vercel). A pure static
// export has no API routes, so the client falls back to a direct CoinGecko call.

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const COINGECKO_URL =
  "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=250&page=1&sparkline=true&price_change_percentage=24h";

export async function GET() {
  try {
    const headers = { Accept: "application/json" };
    // Optional demo key (raises the rate limit) from the server env.
    const key =
      process.env.COINGECKO_KEY || process.env.NEXT_PUBLIC_COINGECKO_KEY || "";
    if (key) headers["x-cg-demo-api-key"] = key;

    const r = await fetch(COINGECKO_URL, { headers, cache: "no-store" });
    if (!r.ok) {
      return new Response(JSON.stringify({ coins: [], error: r.status }), {
        headers: {
          "content-type": "application/json",
          "cache-control": "no-store",
        },
      });
    }
    const data = await r.json();
    const list = Array.isArray(data) ? data : [];
    const coins = list.map((d) => ({
      // CoinGecko's slug id is unique; ticker symbols collide within the top 250.
      id: "c_" + (d.id || d.symbol),
      symbol: (d.symbol || "").toUpperCase(),
      name: d.name,
      price: d.current_price,
      chg: d.price_change_percentage_24h || 0,
      image: d.image,
      mcap: d.market_cap,
      vol: d.total_volume,
      spark:
        d.sparkline_in_7d && Array.isArray(d.sparkline_in_7d.price)
          ? d.sparkline_in_7d.price.slice(-24)
          : [d.current_price],
    }));
    return new Response(JSON.stringify({ coins }), {
      headers: {
        "content-type": "application/json",
        "cache-control": "no-store",
      },
    });
  } catch (e) {
    return new Response(JSON.stringify({ coins: [], error: String(e) }), {
      headers: {
        "content-type": "application/json",
        "cache-control": "no-store",
      },
    });
  }
}
