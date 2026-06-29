// Seeds + formatting helpers for MasterStocks.
// Live data is layered on top of these seeds at runtime (CoinGecko / Twelve
// Data / Finnhub), with a client-side simulation fallback so the UI always
// feels alive. Seeds are the offline fallback; live feeds override them.

export const DEFAULT_FINNHUB_KEY = "d8lcmb1r01qtamgu3da0d8lcmb1r01qtamgu3dag";

// Annualisation factors (sqrt of bars-per-year) for the volatility models.
// Equities/indices use a daily series (252 trading days); crypto uses an
// hourly series (24 x 365).
export const ANNUAL_DAILY = Math.sqrt(252);
export const ANNUAL_HOURLY = Math.sqrt(24 * 365);

// Crypto: fetch the top 250 coins by market cap in a single CoinGecko call.
export const CRYPTO_LIMIT = 250;
export const COINGECKO_URL =
  "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=250&page=1&sparkline=true&price_change_percentage=24h";

// Fallback crypto universe (live fetch expands this to the top 250).
const CRYPTO = [
  ["BTC", "Bitcoin", 67250, 1.8],
  ["ETH", "Ethereum", 3520, 2.4],
  ["USDT", "Tether", 1.0, 0.01],
  ["BNB", "BNB", 605, 0.9],
  ["SOL", "Solana", 163, 3.6],
  ["XRP", "XRP", 0.62, -1.2],
  ["USDC", "USD Coin", 1.0, 0.0],
  ["ADA", "Cardano", 0.45, -0.8],
  ["DOGE", "Dogecoin", 0.16, 4.1],
  ["AVAX", "Avalanche", 36, 2.0],
  ["TRX", "TRON", 0.13, 0.5],
  ["LINK", "Chainlink", 14.2, 1.4],
  ["DOT", "Polkadot", 6.1, -0.6],
  ["MATIC", "Polygon", 0.58, 1.1],
  ["SHIB", "Shiba Inu", 0.000023, 2.2],
  ["LTC", "Litecoin", 84, 0.7],
  ["BCH", "Bitcoin Cash", 480, 1.0],
  ["UNI", "Uniswap", 9.5, -0.4],
  ["ATOM", "Cosmos", 7.2, 0.9],
  ["XLM", "Stellar", 0.11, 1.6],
  ["ETC", "Ethereum Classic", 26, 0.3],
  ["NEAR", "NEAR Protocol", 5.4, 2.8],
  ["APT", "Aptos", 9.1, 1.2],
  ["FIL", "Filecoin", 4.8, -1.0],
  ["ICP", "Internet Computer", 10.5, 0.6],
  ["ARB", "Arbitrum", 0.78, -0.9],
  ["OP", "Optimism", 1.7, 1.3],
  ["VET", "VeChain", 0.027, 0.4],
  ["HBAR", "Hedera", 0.07, 2.0],
  ["AAVE", "Aave", 98, 1.5],
];
export const CRYPTO_SEED = CRYPTO.map(([symbol, name, price, chg]) => ({
  id: "c_" + symbol.toLowerCase(),
  symbol,
  name,
  price,
  chg: chg || 0,
  cur: "USD",
  kind: "crypto",
  annualFactor: ANNUAL_HOURLY,
  barLabel: "hour",
  barsPerDay: 24,
}));

// US equities (~95 large-caps). Live quotes come from Twelve Data (batch) or
// Finnhub. Symbols are kept clean (no dotted class shares) for batch quoting.
const US = [
  ["AAPL", "Apple", 228.5],
  ["MSFT", "Microsoft", 441],
  ["NVDA", "NVIDIA", 131],
  ["GOOGL", "Alphabet A", 179],
  ["GOOG", "Alphabet C", 181],
  ["AMZN", "Amazon", 201],
  ["META", "Meta Platforms", 592],
  ["TSLA", "Tesla", 346],
  ["AVGO", "Broadcom", 175],
  ["JPM", "JPMorgan Chase", 243],
  ["V", "Visa", 312],
  ["MA", "Mastercard", 525],
  ["UNH", "UnitedHealth", 480],
  ["XOM", "Exxon Mobil", 115],
  ["JNJ", "Johnson & Johnson", 152],
  ["WMT", "Walmart", 82],
  ["LLY", "Eli Lilly", 780],
  ["PG", "Procter & Gamble", 168],
  ["HD", "Home Depot", 410],
  ["COST", "Costco", 980],
  ["ORCL", "Oracle", 175],
  ["KO", "Coca-Cola", 62],
  ["PEP", "PepsiCo", 168],
  ["BAC", "Bank of America", 42],
  ["MRK", "Merck", 100],
  ["ABBV", "AbbVie", 195],
  ["CVX", "Chevron", 145],
  ["ADBE", "Adobe", 480],
  ["CRM", "Salesforce", 280],
  ["NFLX", "Netflix", 902],
  ["AMD", "AMD", 138],
  ["INTC", "Intel", 22],
  ["CSCO", "Cisco", 58],
  ["ACN", "Accenture", 360],
  ["MCD", "McDonald's", 290],
  ["TMO", "Thermo Fisher", 540],
  ["ABT", "Abbott", 113],
  ["DHR", "Danaher", 240],
  ["WFC", "Wells Fargo", 72],
  ["DIS", "Disney", 113],
  ["TXN", "Texas Instruments", 205],
  ["VZ", "Verizon", 43],
  ["CMCSA", "Comcast", 38],
  ["PM", "Philip Morris", 130],
  ["NKE", "Nike", 75],
  ["INTU", "Intuit", 640],
  ["IBM", "IBM", 230],
  ["QCOM", "Qualcomm", 165],
  ["AMGN", "Amgen", 310],
  ["NOW", "ServiceNow", 980],
  ["HON", "Honeywell", 215],
  ["UNP", "Union Pacific", 240],
  ["GE", "GE Aerospace", 175],
  ["CAT", "Caterpillar", 360],
  ["SPGI", "S&P Global", 520],
  ["BA", "Boeing", 180],
  ["RTX", "RTX", 120],
  ["LOW", "Lowe's", 250],
  ["ELV", "Elevance Health", 400],
  ["BKNG", "Booking", 4900],
  ["SBUX", "Starbucks", 95],
  ["GILD", "Gilead", 88],
  ["T", "AT&T", 22],
  ["MDT", "Medtronic", 85],
  ["ISRG", "Intuitive Surgical", 480],
  ["PLD", "Prologis", 110],
  ["AXP", "American Express", 270],
  ["BLK", "BlackRock", 980],
  ["LMT", "Lockheed Martin", 470],
  ["SYK", "Stryker", 360],
  ["TJX", "TJX", 120],
  ["VRTX", "Vertex", 470],
  ["REGN", "Regeneron", 740],
  ["CB", "Chubb", 280],
  ["MMC", "Marsh McLennan", 215],
  ["ADP", "ADP", 295],
  ["MO", "Altria", 55],
  ["CI", "Cigna", 330],
  ["ZTS", "Zoetis", 175],
  ["SO", "Southern Co", 88],
  ["DUK", "Duke Energy", 110],
  ["PGR", "Progressive", 250],
  ["BSX", "Boston Scientific", 85],
  ["FI", "Fiserv", 200],
  ["MU", "Micron", 95],
  ["COP", "ConocoPhillips", 105],
  ["PYPL", "PayPal", 70],
  ["SHOP", "Shopify", 80],
  ["UBER", "Uber", 72],
  ["ABNB", "Airbnb", 130],
  ["PANW", "Palo Alto Networks", 360],
  ["SNOW", "Snowflake", 130],
  ["COIN", "Coinbase", 230],
  ["PLTR", "Palantir", 35],
];
export const STOCK_SEED = US.map(([symbol, name, price], i) => ({
  id: "s_" + symbol.toLowerCase(),
  symbol,
  name,
  price,
  chg: ((i % 7) - 3) * 0.4,
  cur: "USD",
  kind: "stock",
  annualFactor: ANNUAL_DAILY,
  barLabel: "day",
  barsPerDay: 1,
}));

// Indian indices (kept on the market-hours simulation - no reliable free
// index symbol) plus the full NSE Nifty 50 (live via Twelve Data, exchange NSE).
// Fallback seed levels only (used when no live feed is reachable). Live values
// override these via the /api/quote proxy (Yahoo: ^NSEI, ^BSESN, ^NSEBANK).
const INDIA_INDICES = [
  {
    id: "i_nifty",
    symbol: "NIFTY",
    name: "NIFTY 50",
    price: 23952,
    chg: 0.2,
    index: true,
  },
  {
    id: "i_sensex",
    symbol: "SENSEX",
    name: "Sensex",
    price: 78600,
    chg: 0.2,
    index: true,
  },
  {
    id: "i_banknifty",
    symbol: "BANKNIFTY",
    name: "BANK NIFTY",
    price: 51200,
    chg: 0.3,
    index: true,
  },
];
const INDIA = [
  ["RELIANCE", "Reliance", 2950],
  ["TCS", "TCS", 4180],
  ["HDFCBANK", "HDFC Bank", 1690],
  ["ICICIBANK", "ICICI Bank", 1240],
  ["INFY", "Infosys", 1860],
  ["HINDUNILVR", "Hindustan Unilever", 2450],
  ["ITC", "ITC", 428],
  ["SBIN", "State Bank of India", 830],
  ["BHARTIARTL", "Bharti Airtel", 1530],
  ["BAJFINANCE", "Bajaj Finance", 6900],
  ["LICI", "LIC", 950],
  ["KOTAKBANK", "Kotak Mahindra Bank", 1780],
  ["LT", "Larsen & Toubro", 3600],
  ["HCLTECH", "HCL Technologies", 1780],
  ["AXISBANK", "Axis Bank", 1180],
  ["MARUTI", "Maruti Suzuki", 12500],
  ["ASIANPAINT", "Asian Paints", 2900],
  ["SUNPHARMA", "Sun Pharma", 1750],
  ["TITAN", "Titan", 3400],
  ["ULTRACEMCO", "UltraTech Cement", 11500],
  ["ADANIENT", "Adani Enterprises", 3100],
  ["WIPRO", "Wipro", 290],
  ["ONGC", "ONGC", 270],
  ["NTPC", "NTPC", 360],
  ["NESTLEIND", "Nestle India", 2500],
  ["M&M", "Mahindra & Mahindra", 2950],
  ["POWERGRID", "Power Grid", 320],
  ["TATAMOTORS", "Tata Motors", 980],
  ["JSWSTEEL", "JSW Steel", 920],
  ["TATASTEEL", "Tata Steel", 150],
  ["COALINDIA", "Coal India", 480],
  ["BAJAJFINSV", "Bajaj Finserv", 1650],
  ["HDFCLIFE", "HDFC Life", 620],
  ["TECHM", "Tech Mahindra", 1650],
  ["ADANIPORTS", "Adani Ports", 1450],
  ["GRASIM", "Grasim", 2600],
  ["DRREDDY", "Dr Reddy's", 1300],
  ["CIPLA", "Cipla", 1500],
  ["BRITANNIA", "Britannia", 5400],
  ["EICHERMOT", "Eicher Motors", 4800],
  ["APOLLOHOSP", "Apollo Hospitals", 6800],
  ["DIVISLAB", "Divi's Labs", 5200],
  ["HINDALCO", "Hindalco", 680],
  ["TATACONSUM", "Tata Consumer", 1100],
  ["BPCL", "BPCL", 320],
  ["SBILIFE", "SBI Life", 1700],
  ["INDUSINDBK", "IndusInd Bank", 1400],
  ["BAJAJ-AUTO", "Bajaj Auto", 9500],
  ["HEROMOTOCO", "Hero MotoCorp", 5200],
  ["SHRIRAMFIN", "Shriram Finance", 3000],
];
const INDIA_STOCKS = INDIA.map(([symbol, name, price], i) => ({
  id: "i_" + symbol.toLowerCase().replace(/[^a-z0-9]/g, ""),
  symbol,
  name,
  price,
  chg: ((i % 7) - 3) * 0.4,
  index: false,
}));
export const INDIA_SEED = [...INDIA_INDICES, ...INDIA_STOCKS].map((s) => ({
  ...s,
  cur: "INR",
  kind: "india",
  annualFactor: ANNUAL_DAILY,
  barLabel: "day",
  barsPerDay: 1,
}));

// Build a fake sparkline series around a price so cards always have a chart.
// IMPORTANT: this must be DETERMINISTIC. It runs once during server-side
// rendering and again on the client during hydration; if it used Math.random()
// the two passes would differ and React would throw a hydration mismatch error.
// A small seeded PRNG (mulberry32) keyed off the price keeps both passes
// identical while still drawing a natural-looking wiggle.
export function seedSpark(price, chg) {
  const pts = [];
  let p = price * (1 - chg / 100);
  let seed = (Math.floor(Math.abs(price) * 1000 + Math.abs(chg) * 97) + 1) | 0;
  const rand = () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  for (let i = 0; i < 24; i++) {
    p = p * (1 + (rand() - 0.48) * 0.012);
    pts.push(p);
  }
  pts.push(price);
  return pts;
}

export function withSpark(list) {
  return list.map((a) => ({ ...a, spark: seedSpark(a.price, a.chg) }));
}

// Indian markets: Mon-Fri 09:15-15:30 IST.
export function indiaOpen(now = new Date()) {
  const ist = new Date(now.getTime() + (now.getTimezoneOffset() + 330) * 60000);
  const day = ist.getDay();
  if (day === 0 || day === 6) return false;
  const mins = ist.getHours() * 60 + ist.getMinutes();
  return mins >= 555 && mins <= 930;
}

export function fmtCur(n, cur = "USD") {
  if (n == null || isNaN(n)) return "\u2014";
  const sym = cur === "INR" ? "\u20b9" : "$";
  const locale = cur === "INR" ? "en-IN" : "en-US";
  const d = n >= 1000 ? 0 : n >= 1 ? 2 : 4;
  return (
    sym +
    n.toLocaleString(locale, {
      minimumFractionDigits: d,
      maximumFractionDigits: d,
    })
  );
}

export function fmtBig(n) {
  if (n == null || isNaN(n)) return "\u2014";
  if (n >= 1e12) return (n / 1e12).toFixed(2) + "T";
  if (n >= 1e9) return (n / 1e9).toFixed(2) + "B";
  if (n >= 1e6) return (n / 1e6).toFixed(2) + "M";
  if (n >= 1e3) return (n / 1e3).toFixed(2) + "K";
  return String(Math.round(n));
}

// ---- Premium API configuration --------------------------------------------
// Keys can be supplied at build time via NEXT_PUBLIC_* env vars (.env.local)
// or overridden at runtime via localStorage ("<provider>_key"). Runtime wins,
// so users can paste their own premium keys without rebuilding.
export const ENV_KEYS = {
  finnhub: process.env.NEXT_PUBLIC_FINNHUB_KEY || "",
  twelvedata: process.env.NEXT_PUBLIC_TWELVEDATA_KEY || "",
  coingecko: process.env.NEXT_PUBLIC_COINGECKO_KEY || "",
};

export function getApiKey(name) {
  if (typeof window !== "undefined") {
    const v = window.localStorage.getItem(name + "_key");
    if (v) return v;
  }
  if (name === "finnhub") return ENV_KEYS.finnhub || DEFAULT_FINNHUB_KEY;
  return ENV_KEYS[name] || "";
}

// Twelve Data: premium, unified quotes for US + Indian (NSE) equities.
// /quote accepts comma-separated symbols and returns a dict keyed by symbol.
export const TWELVEDATA_QUOTE = "https://api.twelvedata.com/quote";

export function twelveDataUrl(symbols, key, exchange) {
  const p = new URLSearchParams();
  p.set("symbol", symbols.join(","));
  if (exchange) p.set("exchange", exchange);
  p.set("apikey", key);
  return TWELVEDATA_QUOTE + "?" + p.toString();
}

// ---- Live data proxy (key-free, server-side Yahoo Finance) -----------------
// Maps an app asset to its Yahoo Finance symbol. Indian indices use the ^
// caret symbols; NSE single stocks use the .NS suffix; US stocks are as-is.
const INDIA_INDEX_YAHOO = {
  NIFTY: "^NSEI",
  SENSEX: "^BSESN",
  BANKNIFTY: "^NSEBANK",
};

export function yahooSymbol(asset) {
  if (asset.kind === "india") {
    if (asset.index) return INDIA_INDEX_YAHOO[asset.symbol] || null;
    return asset.symbol + ".NS";
  }
  if (asset.kind === "stock") return asset.symbol;
  return null; // crypto stays on CoinGecko
}

// Fetch a batch of assets from the local proxy route. Returns a map keyed by
// the app symbol: { price, chg, spark }. Empty object if the proxy is absent
// (e.g. a pure static export) or unreachable, so callers can fall back.
export async function fetchProxyQuotes(
  assets,
  range = "3mo",
  interval = "1d",
  opts = {},
) {
  // `opts.base` lets callers target an external real-time service (e.g. the
  // Angel One FastAPI proxy in /realtime). When unset we use the built-in
  // same-origin /api/quote route.
  const base = (opts && opts.base) || "";
  // Static export has no built-in /api/quote route; skip straight to the
  // fallback UNLESS an external base URL was provided (then always call it).
  if (!base && process.env.NEXT_PUBLIC_STATIC_EXPORT === "true") return {};
  const pairs = assets
    .map((a) => [a.symbol, yahooSymbol(a)])
    .filter(([, y]) => y);
  if (!pairs.length) return {};
  const p = new URLSearchParams();
  p.set("symbols", pairs.map(([, y]) => y).join(","));
  p.set("range", range);
  p.set("interval", interval);
  const r = await fetch(base + "/api/quote?" + p.toString());
  if (!r.ok) return {};
  const data = await r.json();
  const quotes = (data && data.quotes) || {};
  const out = {};
  for (const [appSym, ySym] of pairs) {
    if (quotes[ySym]) out[appSym] = quotes[ySym];
  }
  return out;
}
