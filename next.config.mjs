/** @type {import('next').NextConfig} */
//
// This project is deployed as a SERVER (Node) Next.js app. The recommended
// target is Vercel (free tier is enough). The /api/quote route runs on the
// server and fetches real, KEY-FREE live market data from Yahoo Finance,
// INCLUDING the NSE indices (NIFTY 50 ^NSEI, SENSEX ^BSESN, BANK NIFTY
// ^NSEBANK) -- these have no free browser-CORS feed, so they can only go live
// through this server proxy (which is why a pure static export cannot show them
// live).
//
// Local:       npm run dev
// Production:  npm run build && npm run start
// Vercel:      just push the repo -- it builds and serves automatically.
const nextConfig = {
  reactStrictMode: true,
  // Crypto icons are remote (CoinGecko); skip the Image Optimizer to avoid
  // having to allow-list every remote host. Works fine on Vercel too.
  images: { unoptimized: true },
  // @react-three/drei ships untranspiled ESM in some sub-deps; transpile to be safe.
  transpilePackages: ["three", "@react-three/fiber", "@react-three/drei"],
};

export default nextConfig;
