# Deploying MasterStocks

This is a standard **server-mode Next.js 14 (App Router)** app. It needs a Node
server runtime (not a static export) because the `/api/quote` route fetches the
live, key-free market data (including the NSE indices) on the server. Vercel runs
this with zero configuration.

---

## 1. Push to GitHub

The project is already initialized as a git repository with an initial commit, so
you only need to point it at your own GitHub repo and push.

1. Create a new **empty** repository on GitHub (no README, no .gitignore — this
   repo already has them).
2. In the project folder, run:

```bash
git remote add origin https://github.com/<your-username>/<your-repo>.git
git branch -M main
git push -u origin main
```

That's it — your code is on GitHub.

> If you'd rather start the history fresh, delete the `.git` folder first and run
> `git init`, `git add .`, `git commit -m "Initial commit"` before the steps above.

---

## 2. Deploy to Vercel

### Option A — Vercel Dashboard (easiest)

1. Go to <https://vercel.com/new>.
2. **Import** the GitHub repo you just pushed.
3. Vercel auto-detects Next.js. Leave all build settings at their defaults:
   - Framework Preset: **Next.js**
   - Build Command: `next build` (default)
   - Output: handled automatically
4. Click **Deploy**. Your site goes live at `https://<project>.vercel.app`.

Every future `git push` to `main` redeploys automatically.

### Option B — Vercel CLI

```bash
npm i -g vercel
vercel        # first run links/creates the project (preview deploy)
vercel --prod # production deploy
```

---

## 3. Environment variables (all OPTIONAL)

The app works out of the box with **no env vars**: crypto comes from CoinGecko
(key-free) and US/Indian quotes come through the built-in Yahoo proxy.

To raise rate limits or use premium feeds, add any of these in
**Vercel → Project → Settings → Environment Variables** (see
`.env.local.example` for the full list):

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_FINNHUB_KEY` | US stock quotes fallback |
| `NEXT_PUBLIC_TWELVEDATA_KEY` | US + Indian stock quotes fallback |
| `NEXT_PUBLIC_COINGECKO_KEY` | Higher CoinGecko rate limit |
| `NEXT_PUBLIC_REALTIME_API` | Base URL of your own real-time India backend |

Do **not** set `NEXT_PUBLIC_STATIC_EXPORT` on Vercel — a static export disables
the `/api/quote` route, which the live stock and index data depend on.

---

## 4. Local development

```bash
npm install
npm run dev      # http://localhost:3000
# production check:
npm run build && npm run start
```
