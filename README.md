# MasterStocks — Next.js rebuild

A premium, animated stock & crypto tracker rebuilt on **Next.js (App Router)** with the modern motion stack you asked for:

| Tool                                         | Used for                                                                                  |
| -------------------------------------------- | ----------------------------------------------------------------------------------------- |
| **GSAP + ScrollTrigger**                     | Scroll-reveal animations & timelines (`components/Reveal.jsx`), synced to smooth scroll   |
| **Lenis**                                    | Momentum smooth-scrolling wired into ScrollTrigger (`components/SmoothScroll.jsx`)        |
| **Three.js** (`@react-three/fiber` + `drei`) | Animated 3D hero background (`components/Hero3D.jsx`) — swap for Spline if you prefer     |
| **Framer Motion**                            | UI interactions: preloader, nav, tab pill (`layoutId`), card hover, modal, analytics bars |
| **Lottie** (`lottie-react`)                  | Micro UI animation — live “pulse” indicator (`components/LottieIcon.jsx`)                 |
| **Rive** (`@rive-app/react-canvas`)          | Interactive button state (`components/RiveButton.jsx`) with a Framer Motion fallback      |

Developed by **Priyanshu Kumar Rai**.

## Run it locally

```bash
npm install
npm run dev
```

Then open http://localhost:3000.

> This project ships as source. The build sandbox it was authored in has no
> network access, so dependencies were **not** pre-installed — run `npm install`
> once on your machine and everything (Next, GSAP, Three.js, Framer Motion,
> Lottie, Rive) will be pulled in.

## Live data

- **Crypto** — live from the public CoinGecko API (no key required), refreshed every 60s.
- **US stocks** — live from Finnhub. A key is already baked in (`lib/data.js`),
  and you can override it from the browser console:
  `localStorage.setItem("finnhub_key", "YOUR_KEY")`.
- **Indian markets** — NSE/BSE symbols. Prices only move during market hours
  (Mon–Fri, 09:15–15:30 IST); outside hours the last close is shown and frozen.
- If an API is unreachable, a gentle local simulation keeps the UI alive.

## Analytics

Analytics (top movers, average change, advancers/decliners) are computed live in
the browser from the current market data and animated with Framer Motion — no
server, pandas or matplotlib step is required to view the site.

## 3D hero options

`components/Hero3D.jsx` renders a react-three-fiber scene. To use **Spline**
instead, install `@splinetool/react-spline` and replace the `<Canvas>` block
with `<Spline scene="https://prod.spline.design/your-scene/scene.splinecode" />`.

## Rive button

Drop a compiled `button.riv` into `public/rive/` (state machine
“State Machine 1”) to get the full interactive Rive button. Without it the app
falls back to a Framer Motion button automatically.

## Structure

```
app/            layout.js, page.js (server), globals.css
components/     Hero3D, Preloader, SmoothScroll, Reveal, Navbar, RiveButton,
                LottieIcon, MarketStatus, TickerStrip, Controls, AssetCard,
                AssetGrid, DetailModal, AnalyticsSection, App
lib/            data.js (seeds + API helpers), useMarkets.js (live data hook),
                ict.js (ICT-style edge heuristic)
public/rive/    place button.riv here (optional)
```

## Deploy (server app — recommended: Vercel)

This project runs as a **server (Node) Next.js app** so the `/api/quote` route
can fetch **real, key-free live market data from Yahoo Finance — including the
NSE indices** (NIFTY 50, SENSEX, BANK NIFTY). Those indices have no free,
browser-CORS feed, so a pure static export cannot show them live; this server
proxy is what makes them accurate.

### Deploy to Vercel (free)

1. Push this folder to a GitHub repository.
2. Go to <https://vercel.com>, choose **Add New → Project**, and import the repo.
3. Vercel auto-detects the **Next.js** preset. Leave the defaults (build command
   `next build`, no environment variables required) and click **Deploy**.

That's it — Vercel runs the server route, so NIFTY / SENSEX / BANK NIFTY and the
NSE / US stocks all go live with no API key.

### Run the production server locally

```bash
npm install
npm run build
npm run start      # serves at http://localhost:3000 with the live proxy
```

### How live is the data?

| Market                         | Source (no key)      | Accuracy                                |
| ------------------------------ | -------------------- | --------------------------------------- |
| Crypto                         | CoinGecko            | Near real-time, ~60s refresh            |
| US stocks                      | Yahoo (server proxy) | Near real-time (can be ~15 min delayed) |
| NSE stocks                     | Yahoo (server proxy) | Near real-time (can be ~15 min delayed) |
| NIFTY 50 / SENSEX / BANK NIFTY | Yahoo (server proxy) | Near real-time (can be ~15 min delayed) |

For true tick-by-tick intraday data, plug in a paid/broker feed (Zerodha Kite,
Upstox, Angel One for India; Polygon / Alpaca for US) — these need an account,
authentication, and usually a paid plan.

> Educational use only. Free feeds can be delayed; do not trade real money based
> on these numbers.

## Premium / live data APIs

MasterStocks pulls live quotes from real providers, with a graceful simulation
fallback so the UI always feels alive.

| Market              | Provider                                    | Key required                                 |
| ------------------- | ------------------------------------------- | -------------------------------------------- |
| Crypto              | CoinGecko (`/coins/markets`)                | No (optional Demo key reduces rate-limiting) |
| US stocks           | Twelve Data `/quote` (preferred) or Finnhub | Twelve Data key, else bundled Finnhub key    |
| Indian stocks (NSE) | Twelve Data `/quote` (`exchange=NSE`)       | **Yes** - Twelve Data key for live prices    |

### Configure keys

1. Copy `.env.local.example` to `.env.local` and add your keys, then rebuild:
   ```bash
   cp .env.local.example .env.local
   npm run build
   ```
2. Or set them at runtime from the browser console (no rebuild needed):
   ```js
   localStorage.setItem("twelvedata_key", "YOUR_KEY");
   ```

Get free keys: Twelve Data <https://twelvedata.com/apikey>, CoinGecko
<https://www.coingecko.com/en/developers/dashboard>. Without a Twelve Data key,
Indian prices run on a market-hours-aware simulation.
