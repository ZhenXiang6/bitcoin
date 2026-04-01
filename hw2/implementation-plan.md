# Strategy mNAV Project Implementation Plan

## 1. Project Focus

This project now uses a single main DAT.co indicator:

```text
mNAV = EnterpriseValue / BTC_NAV
BTC_NAV = BTC_Holdings x BTC_Price
EnterpriseValue = MarketCap + TotalDebt - CashAndCashEquivalents
```

The website will stay focused on `Strategy (MSTR)` and show:

1. `mNAV` daily time series
2. `BTC NAV vs Enterprise Value` comparison
3. Current summary cards directly related to `mNAV`
4. Optional AI-generated summary

The goal is to keep the dashboard aligned with the homework requirement of choosing one DAT-related indicator, while still giving enough context to interpret it.

## 2. Why Choose mNAV

`mNAV` is a standard DAT company valuation indicator because it compares:

1. the equity market's valuation of Strategy
2. the marked value of Strategy's BTC treasury

Interpretation:

1. `mNAV > 1`
   - Strategy trades at a premium to BTC NAV
2. `mNAV = 1`
   - Strategy trades roughly in line with BTC NAV
3. `mNAV < 1`
   - Strategy trades at a discount to BTC NAV

Related supporting metrics on the site are not separate main indicators. They only explain the `mNAV` ratio:

1. `BTC NAV`
2. `Enterprise Value`
3. `Premium to NAV = (mNAV - 1) x 100`

## 3. Data Sources

Required production data path:

1. `CoinGecko API`
   - Strategy BTC holdings
   - Strategy treasury profile
   - BTC/USD market price
2. `Yahoo Finance`
   - MSTR daily close
3. `SEC Company Facts`
   - shares outstanding snapshots used to estimate market cap
   - cash and debt snapshots used to estimate enterprise value

Optional:

1. `OpenAI API`
   - low-cost AI summary for trend interpretation

Fallback only:

1. `FMP API`
   - used only if Yahoo/SEC market-cap reconstruction is unavailable

## 4. Indicator Formula

Daily calculation:

```text
BTC_Holdings_t = Strategy BTC holdings on day t
BTC_Price_t = BTC/USD price on day t
BTC_NAV_t = BTC_Holdings_t x BTC_Price_t
MarketCap_t = MSTR_Close_t x SharesOutstanding_t
EnterpriseValue_t = MarketCap_t + TotalDebt_t - CashAndCashEquivalents_t
mNAV_t = EnterpriseValue_t / BTC_NAV_t
PremiumToNAV_t = (mNAV_t - 1) x 100
```

Important statement for the report:

```text
This project defines mNAV as enterprise value divided by BTC NAV.
```

## 5. Time Frequency and Update Policy

The site will display:

1. daily data
2. default range: `365 days`

The site will update:

1. every `8 hours`
2. equivalent to `3 refreshes per day`

Implementation:

1. Next.js ISR / fetch cache revalidation: `28800` seconds
2. Vercel Cron Jobs hitting `/api/refresh-cache`
3. Cron schedule in UTC:
   - `00:00`
   - `08:00`
   - `16:00`

## 6. Website Scope

The homepage should contain:

1. dashboard header
2. indicator definition section
3. summary cards
4. `mNAV` chart
5. `BTC NAV vs Market Cap` chart
5. `BTC NAV vs Enterprise Value` chart
6. optional AI summary
7. methodology / notes section

Summary cards:

1. current BTC holdings
2. current BTC NAV
3. current enterprise value
4. current mNAV
5. current premium to NAV

This scope is intentionally narrow so the website clearly satisfies the "choose one indicator" requirement.

## 7. Backend Plan

### 7.1 CoinGecko client

Functions:

1. `getStrategyProfile()`
2. `getStrategyHoldingChart(days)`
3. `getBitcoinMarketChart(days)`

### 7.2 Yahoo / SEC enterprise-value reconstruction

Functions:

1. `getYahooHistoricalCloseSeries("MSTR", days)`
2. `getStrategySharesOutstandingSeries()`
3. `getStrategyCashSeries()`
4. `getStrategyDebtSeries()`

Logic:

1. fetch daily MSTR close
2. fetch shares outstanding snapshots
3. fetch cash and debt snapshots from SEC
4. forward-fill filing-based balance-sheet values
5. estimate `marketCap = close x sharesOutstanding`
6. estimate `enterpriseValue = marketCap + debt - cash`

### 7.3 Transform layer

Responsibilities:

1. normalize dates to `YYYY-MM-DD`
2. align holdings, BTC price, estimated market cap, and estimated enterprise value
3. forward-fill valuation and balance-sheet fields on non-trading days
4. compute `btcNavUsd`, `mNav`, `premiumToNavPct`
5. return a frontend-ready daily series

### 7.4 API routes

Required:

1. `/api/strategy-mnav`

Optional:

1. `/api/strategy-summary`
2. `/api/refresh-cache`

## 8. AI Summary Plan

This is an optional bonus feature.

Model choice:

1. use a low-cost OpenAI model
2. default model setting: `gpt-5-nano`

Input to the model:

1. current mNAV
2. current premium to NAV
3. current BTC NAV
4. current enterprise value
5. 90-day change in mNAV and valuation context

Output:

1. exactly 3 short bullet points
2. plain-English summary of mNAV trend
3. interpretation of BTC linkage

If `OPENAI_API_KEY` is not configured:

1. the site still works
2. the AI summary section is hidden

## 9. Environment Variables

Required:

```env
COINGECKO_API_KEY=
```

Recommended:

```env
SEC_USER_AGENT=your_app_name/1.0 (contact: your_email@example.com)
```

Optional:

```env
OPENAI_API_KEY=
OPENAI_SUMMARY_MODEL=gpt-5-nano
FMP_API_KEY=
```

## 10. Deployment Plan

Deploy target:

1. Vercel

Root directory:

1. `web`

Deployment checklist:

1. import repository into Vercel
2. set environment variables
3. confirm homepage loads
4. confirm `/api/strategy-mnav?days=365` returns JSON
5. confirm Vercel cron jobs are active
6. if AI summary is enabled, confirm `/api/strategy-summary` returns text

## 11. Report Plan

The report should include:

### 11.1 Selected Indicator

1. chosen indicator: `Strategy mNAV`
2. reason: it directly measures market valuation relative to BTC treasury value

### 11.2 Relationship with BTC

1. BTC price directly changes `BTC NAV`
2. if MSTR market cap rises faster than BTC NAV, `mNAV` expands
3. if MSTR market cap lags BTC NAV, `mNAV` compresses
4. therefore `mNAV` measures the gap between BTC treasury value and equity-market narrative

### 11.3 Data Sources

1. CoinGecko for Strategy treasury and BTC data
2. Yahoo Finance for MSTR daily close
3. SEC for shares outstanding
4. OpenAI for optional AI summary

### 11.4 Deployed Website URL

1. public Vercel URL
2. screenshot of the dashboard

## 12. Validation Checklist

Before deployment:

1. `mNAV` series is non-empty
2. `mNAV` chart renders on daily frequency
3. `BTC NAV` and `Market Cap` chart renders correctly
4. `Premium to NAV` matches `(mNAV - 1) x 100`
5. build passes
6. page still works when OpenAI key is missing

## 13. Final Scope Decision

This project is intentionally scoped to:

1. one main indicator: `mNAV`
2. one company: `Strategy`
3. daily frequency
4. three refreshes per day
5. optional AI summary with a low-cost model

This is the cleanest match to the homework requirement and is simpler to explain in the final report.
