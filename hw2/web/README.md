# Strategy mNAV Dashboard

This project is a DAT-focused dashboard centered on one main indicator:

```text
mNAV = (MarketCap + TotalDebt - CashAndCashEquivalents) / (BTC_Holdings x BTC_Price)
```

The site uses:

1. `CoinGecko` for Strategy BTC holdings and BTC price
2. `Yahoo Finance` for MSTR daily close
3. `SEC` for shares outstanding, cash, and debt snapshots
4. `OpenAI` optionally for a low-cost AI summary

## 1. Required Environment Variables

Create `web/.env.local`:

```env
COINGECKO_API_KEY=your_coingecko_key
SEC_USER_AGENT=your_app_name/1.0 (contact: your_email@example.com)
```

Optional:

```env
OPENAI_API_KEY=your_openai_key
OPENAI_SUMMARY_MODEL=gpt-5-nano
FMP_API_KEY=your_fmp_key
```

Notes:

1. `OPENAI_API_KEY` is only needed if you want the AI summary.
2. `FMP_API_KEY` is only a fallback and is not required for the main dashboard.

## 2. Run on Localhost

From `web/`:

```bash
npm install
npm run dev
```

Open:

```text
http://localhost:3000
```

Useful checks:

```bash
npm run lint
npm run build
```

## 3. Main Routes

Dashboard:

```text
/
```

Data API:

```text
/api/strategy-mnav?days=365
```

Optional AI summary API:

```text
/api/strategy-summary
```

Cache refresh endpoint used by Vercel Cron:

```text
/api/refresh-cache
```

## 4. Update Frequency

The project is configured to refresh:

1. every `8 hours`
2. equivalent to `3 times per day`

Implementation:

1. Next.js revalidation uses `28800` seconds
2. Vercel Cron Jobs call `/api/refresh-cache`
3. cron schedule is defined in [vercel.json](/Users/morrisliao/Desktop/git-repo/bitcoin/hw2/web/vercel.json)

## 5. Deploy to Vercel

Recommended method:

1. push repository to GitHub
2. import repository in Vercel
3. set `Root Directory` to `web`
4. add environment variables
5. deploy

Required Vercel env vars:

1. `COINGECKO_API_KEY`
2. `SEC_USER_AGENT`

Optional Vercel env vars:

1. `OPENAI_API_KEY`
2. `OPENAI_SUMMARY_MODEL`
3. `FMP_API_KEY`

After deployment, verify:

1. homepage loads
2. `/api/strategy-mnav?days=365` returns JSON
3. if OpenAI is enabled, `/api/strategy-summary` returns summary text
4. cron jobs are active in Vercel

## 6. Troubleshooting

If homepage shows "Failed to load Strategy dashboard":

1. confirm `COINGECKO_API_KEY` is correct
2. confirm CoinGecko quota is not exhausted
3. open `/api/strategy-mnav?days=365` and inspect the returned error

If enterprise value or mNAV looks off:

1. check the header label `Market Cap Source`
2. if Yahoo or SEC was blocked, the app may have used fallback market cap
3. if SEC debt or cash series is missing, EV may temporarily collapse toward market-cap-only behavior

If AI summary does not appear:

1. confirm `OPENAI_API_KEY` is set
2. confirm the deployment has redeployed after adding the variable
3. open `/api/strategy-summary`
