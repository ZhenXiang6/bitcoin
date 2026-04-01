# Deploy to Vercel

This document explains how to deploy the `Strategy mNAV Dashboard` to Vercel.

## 1. Project Root

The actual web app is in:

```text
web/
```

When importing into Vercel, set:

```text
Root Directory = web
```

## 2. Before Deployment

Make sure local build passes:

```bash
cd web
npm run lint
npm run build
```

## 3. Required Environment Variables

Add these in Vercel Project Settings -> Environment Variables.

### Required

```env
COINGECKO_API_KEY=your_coingecko_key
COINGECKO_API_TIER=demo
SEC_USER_AGENT=your_app_name/1.0 (contact: your_email@example.com)
```

### Optional

```env
OPENAI_API_KEY=your_openai_key
OPENAI_SUMMARY_MODEL=gpt-5-nano
FMP_API_KEY=your_fmp_key
```

Notes:

1. `OPENAI_API_KEY` is only needed if you want the AI summary.
2. `FMP_API_KEY` is fallback-only and not required for the main dashboard flow.
3. `COINGECKO_API_TIER=demo` should match your current CoinGecko key type.

## 4. Deploy from Vercel Dashboard

1. Push this repository to GitHub.
2. Open Vercel.
3. Click `Add New...` -> `Project`.
4. Import the GitHub repository.
5. Set `Root Directory` to `web`.
6. Add the environment variables listed above.
7. Click `Deploy`.

## 5. Deploy from Vercel CLI

Install CLI if needed:

```bash
npm install -g vercel
```

From the repository root:

```bash
cd web
vercel
```

For production deployment:

```bash
vercel --prod
```

If prompted:

1. link to existing Vercel account
2. create or select a project
3. confirm the working directory is `web`

## 6. Cron Jobs

This project already includes:

- [vercel.json](/Users/morrisliao/Desktop/git-repo/bitcoin/hw2/web/vercel.json)

Configured cron behavior:

1. Calls `/api/refresh-cache`
2. Runs 3 times per day
3. Refresh schedule:
   - `00:00 UTC`
   - `08:00 UTC`
   - `16:00 UTC`

This supports the assignment requirement that the data updates multiple times per day.

## 7. Post-Deploy Checks

After deployment, verify these URLs:

### Homepage

```text
https://your-project.vercel.app/
```

Check:

1. dashboard renders
2. charts render
3. range selector works
4. AI Summary block appears

### Data API

```text
https://your-project.vercel.app/api/strategy-mnav?days=30
```

Check:

1. response is valid JSON
2. `series` is non-empty
3. `current.mNav` exists

### AI Summary API

```text
https://your-project.vercel.app/api/strategy-summary?days=30
```

Check:

1. if `OPENAI_API_KEY` is set, response should include `enabled: true`
2. summary text should be returned

### Cache Refresh API

```text
https://your-project.vercel.app/api/refresh-cache
```

Check:

1. response should return `ok: true`

## 8. Common Problems

### Problem: Homepage shows "Failed to load Strategy dashboard"

Check:

1. `COINGECKO_API_KEY` is set in Vercel
2. `COINGECKO_API_TIER=demo` is set correctly
3. CoinGecko quota is not exhausted

### Problem: AI Summary does not show

Check:

1. `OPENAI_API_KEY` is set in Vercel
2. `OPENAI_SUMMARY_MODEL=gpt-5-nano` is set correctly
3. redeploy after changing environment variables
4. open `/api/strategy-summary?days=30`

### Problem: Charts show less history than expected

This is expected under the current CoinGecko demo plan.

Current supported ranges:

1. `1W`
2. `1M`
3. `6M`
4. `1Y`

Reason:

1. CoinGecko treasury `holding_chart` on Demo is capped at `365 days`

## 9. Recommended Final Submission Flow

1. Deploy to Vercel
2. Verify homepage and APIs
3. Take screenshots
4. Put deployed URL into the report
5. Mention that the site updates 3 times per day via Vercel cron
