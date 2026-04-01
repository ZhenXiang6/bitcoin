# Strategy mNAV Dashboard

This project is a DAT-focused web dashboard for `Strategy (MSTR)` using:

1. `CoinGecko API` for BTC treasury holdings and BTC market data
2. `Yahoo Finance` (unofficial chart endpoint) for MSTR historical close
3. `SEC Company Facts` for shares outstanding snapshots
4. `FMP API` as optional fallback when Yahoo/SEC data is unavailable

Core indicator:

```text
mNAV = MarketCap / (BTC_Holdings x BTC_Price)
```

## 1. Prerequisites

Required:

1. `Node.js >= 20`
2. `npm`
3. `COINGECKO_API_KEY`
4. `FMP_API_KEY` (optional but recommended as fallback)

## 2. Environment Variables

Create `web/.env.local`:

```env
COINGECKO_API_KEY=your_coingecko_key
FMP_API_KEY=your_fmp_key
SEC_USER_AGENT=your_app_name/1.0 (contact: your_email@example.com)
```

Do not expose these keys in client-side code.

## 3. Run on Localhost

From `web/`:

```bash
npm install
npm run dev
```

Open:

```text
http://localhost:3000
```

Useful commands:

```bash
npm run lint
npm run build
```

## 4. API Endpoint

Dashboard data endpoint:

```text
GET /api/strategy-mnav?days=365
```

`days` supports range `30` to `730`.

## 5. Deploy to Vercel (Dashboard Method)

Recommended method:

1. Push this repository to GitHub.
2. In Vercel, click `Add New Project` and import the repository.
3. Set `Root Directory` to `web`.
4. In `Project Settings -> Environment Variables`, add:
   - `COINGECKO_API_KEY`
   - `FMP_API_KEY` (optional fallback)
   - `SEC_USER_AGENT` (recommended for SEC access)
5. Deploy.

After deployment, verify:

1. `/` page renders charts and summary cards.
2. `/api/strategy-mnav?days=365` returns JSON.

## 6. Deploy to Vercel (CLI Method)

Install Vercel CLI:

```bash
npm install -g vercel
```

From `web/`:

```bash
vercel
```

For production:

```bash
vercel --prod
```

If this is the first deploy, follow prompts to link/create project and set root directory as `web`.

## 7. Troubleshooting

If homepage shows "Failed to load Strategy dashboard":

1. Check `web/.env.local` keys are present and correct.
2. Confirm API key quotas are not exhausted.
3. Confirm `/api/strategy-mnav?days=365` response.

If Vercel deployment succeeds but data is empty:

1. Recheck environment variables in Vercel project settings.
2. Redeploy after updating variables.

If FMP returns 402 for `MSTR`:

1. Your plan may block `historical-market-capitalization` for this symbol.
2. The app will use `Yahoo close x SEC shares` as the primary market-cap path.
3. If Yahoo or SEC is unavailable at runtime, it may fallback to `stable/profile` current market cap.
4. Check the `Market Cap Source` label on the page header to confirm active mode.
