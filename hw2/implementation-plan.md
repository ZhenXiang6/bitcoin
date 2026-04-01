# Strategy mNAV Project Implementation Plan

## 1. Project Objective

Build a web-based dashboard focused on `Strategy` as a Digital Asset Treasury company and use a daily time-series indicator set to help users observe the relationship between Strategy's Bitcoin treasury exposure, market valuation, treasury growth, and per-share BTC efficiency.

This project will use one required API and one stock-market data path:

1. `CoinGecko API`
   - For Strategy's Bitcoin treasury data
   - For Bitcoin historical price data
2. `Yahoo Finance + SEC data`
   - For `MSTR` historical stock price
   - For `MSTR` shares outstanding snapshots used to estimate market capitalization

The core indicator of the project will be:

```text
mNAV_t = MarketCap_t / BTC_NAV_t
BTC_NAV_t = BTC_Holdings_t x BTC_Price_t
PremiumToNAV_t = mNAV_t - 1
```

This choice fits the homework examples directly and is also easy to explain in the final report.

Secondary indicators will be added to avoid over-relying on one valuation ratio:

```text
UnrealizedPnL%_t = (BTC_Price_t - AvgEntryPrice_t) / AvgEntryPrice_t x 100
Accumulation30D_t = (Holdings_t - Holdings_t-30) / Holdings_t-30 x 100
BTC_NAV_Per_Share_t = BTC_NAV_t / SharesOutstanding_t
EstimatedBPS_t = BTC_Holdings_t / SharesOutstanding_t
EstimatedBTCYield30D_t = (EstimatedBPS_t / EstimatedBPS_t-30 - 1) x 100
```

## 2. Why Choose Strategy

`Strategy` is the most representative DAT company because:

1. It is widely recognized as the benchmark Bitcoin treasury company.
2. Its relationship with BTC is straightforward and easy to explain.
3. CoinGecko provides dedicated treasury endpoints for Strategy.
4. The report section on "relationship with Bitcoin" is much easier to write than for mixed-business firms.

## 3. Selected Indicators

The main indicator will be `mNAV`.

Definitions:

```text
BTC_Holdings_t = Strategy BTC holdings on day t
BTC_Price_t = BTC/USD price on day t
BTC_NAV_t = BTC_Holdings_t x BTC_Price_t
MarketCap_t = Strategy market capitalization on day t
mNAV_t = MarketCap_t / BTC_NAV_t
PremiumToNAV_t = mNAV_t - 1
```

Interpretation:

1. `mNAV > 1`
   - The stock market values Strategy above the marked value of its BTC holdings.
2. `mNAV = 1`
   - Strategy is valued roughly equal to its BTC treasury value.
3. `mNAV < 1`
   - Strategy trades below the value of its BTC treasury.

To reduce ambiguity, the report must state explicitly that this project uses:

```text
mNAV = market capitalization / BTC NAV
```

This is the operational definition used in this project, even though other platforms may use slightly different versions.

Additional implemented indicators:

1. `Unrealized PnL %`
   - Measures how profitable Strategy's BTC treasury is relative to reconstructed average entry price.
2. `30D Accumulation Pace`
   - Measures how fast Strategy has added BTC over the last 30 calendar days.
3. `BTC NAV Per Share`
   - Estimates the BTC-backed asset value attributable to each MSTR share.
4. `Estimated BPS`
   - Estimates `bitcoin per share` using reported outstanding shares.
5. `Estimated BTC Yield 30D`
   - Measures 30-day growth in Estimated BPS.

## 4. Data Sources

### 4.1 CoinGecko

Purpose:

1. Fetch Strategy BTC holdings
2. Fetch Strategy transaction history
3. Fetch BTC historical prices

Endpoints:

```text
GET /api/v3/public_treasury/strategy
GET /api/v3/public_treasury/strategy/bitcoin/holding_chart?days=365&include_empty_intervals=true
GET /api/v3/public_treasury/strategy/transaction_history?per_page=250&page=1&order=date_asc
GET /api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=365
```

Expected fields:

1. Strategy current profile
   - `symbol`
   - `m_nav`
   - `total_treasury_value_usd`
   - `total_asset_value_per_share_usd`
   - `holdings`
2. Holding chart
   - `holdings`
   - `holding_value_in_usd`
3. Transaction history
   - `date`
   - `transaction_type`
   - `quantity`
   - `total_value_usd`
   - `source_url`
4. BTC market chart
   - `prices`

### 4.2 Financial Modeling Prep

Purpose:

1. Fetch `MSTR` historical market capitalization
2. Optionally fetch historical stock price as backup

Endpoints:

```text
GET /stable/historical-market-capitalization?symbol=MSTR
GET /stable/historical-price-eod/full?symbol=MSTR
```

Expected fields:

1. Historical market cap
   - `date`
   - `marketCap`
2. Historical stock price fallback
   - `date`
   - `close`

Note:

1. `MSTR` historical endpoints on FMP may be blocked on free plans.
2. Keep FMP only as optional fallback for current `marketCap` or `shares-float`.

### 4.3 Yahoo Finance plus SEC Alternative

Purpose:

1. Replace blocked FMP historical endpoints for `MSTR`
2. Build daily estimated market cap using stock close and shares outstanding

Yahoo usage:

1. Preferred implementation path: `yfinance`
2. Underlying Yahoo chart endpoint commonly used by community libraries:

```text
GET https://query1.finance.yahoo.com/v8/finance/chart/MSTR?range=1y&interval=1d
```

Expected Yahoo fields:

1. `timestamp`
2. `indicators.quote[0].close`
3. `meta.symbol`

SEC usage:

1. Use official SEC Company Facts JSON for share-count data

```text
GET https://data.sec.gov/api/xbrl/companyfacts/CIK0001050446.json
```

Relevant concepts to extract:

1. `EntityCommonStockSharesOutstanding`
2. `CommonStockSharesOutstanding`
3. If the above are sparse, use `shares-float` fallback from FMP or the latest disclosed outstanding share count

Daily market-cap estimate:

```text
estimatedMarketCap_t = yahooClose_t x sharesOutstanding_t
```

Important caveat:

1. Yahoo Finance endpoints are not an official public API.
2. Community tooling such as `yfinance` explicitly notes the data is for research and personal use.
3. Yahoo can rate-limit requests, so the app must cache responses aggressively.

## 5. Data Pipeline Design

### 5.1 Time Range

Recommended initial range:

1. `365 days`

Reason:

1. Daily chart is enough for homework requirements.
2. One year is easy to visualize.
3. It keeps API usage and frontend rendering simple.

The UI can later add:

1. `30D`
2. `90D`
3. `180D`
4. `1Y`

### 5.2 Data Fetch Flow

Server-side flow:

1. Fetch Strategy holding chart from CoinGecko
2. Fetch BTC price chart from CoinGecko
3. Fetch MSTR historical close from Yahoo Finance
4. Fetch share-count snapshots from SEC Company Facts
5. Normalize all dates to `YYYY-MM-DD`
6. Forward-fill share count between filing dates
7. Compute estimated `marketCap = close x sharesOutstanding`
8. Join all datasets by date
9. Compute derived metrics
10. Return a clean dataset to the frontend

### 5.3 Data Alignment Rules

Because APIs may use different timestamps or trading calendars, use these rules:

1. Convert timestamps to `UTC date string`
2. Use daily granularity only
3. If BTC trades on weekends but market cap is absent on non-trading days:
   - carry forward the most recent available `marketCap`
4. If holdings do not change on a day:
   - use the value from CoinGecko's filled daily intervals
5. SEC share count should be forward-filled from the latest filing date
6. Remove rows where core fields are still missing after alignment

### 5.4 Derived Metrics

For each date:

```text
btcNavUsd = btcHoldings x btcPriceUsd
mNav = marketCapUsd / btcNavUsd
premiumToNavPct = (mNav - 1) x 100
```

Additional implemented metrics:

```text
holdingValueUsd = btcHoldings x btcPriceUsd
unrealizedPnlUsd = (btcPriceUsd - avgEntryPriceUsd) x btcHoldings
unrealizedPnlPct = (btcPriceUsd - avgEntryPriceUsd) / avgEntryPriceUsd x 100
netBtcAdded30d = btcHoldings_t - btcHoldings_t-30
accumulation30dPct = (btcHoldings_t - btcHoldings_t-30) / btcHoldings_t-30 x 100
btcNavPerShareUsd = btcNavUsd / sharesOutstanding
estimatedBps = btcHoldings / sharesOutstanding
estimatedBtcYield30dPct = (estimatedBps_t / estimatedBps_t-30 - 1) x 100
```

Approximation note:

1. When using Yahoo plus SEC, `marketCapUsd` is an estimate based on close price times latest available outstanding shares.
2. This is acceptable for coursework if the formula and limitation are stated explicitly in the report.

## 6. Recommended Tech Stack

Recommended stack:

1. `Next.js`
2. `TypeScript`
3. `Tailwind CSS`
4. `Recharts` or `Plotly`
5. `Vercel` for deployment

Reason:

1. Easy deployment to a public URL
2. Good developer experience
3. Easy server-side API aggregation
4. Fast for building charts and summary cards

If you want the lowest implementation friction, prefer:

1. `Next.js App Router`
2. `Recharts`

## 7. Suggested Project Structure

```text
src/
  app/
    page.tsx
    api/
      strategy-mnav/route.ts
  components/
    dashboard-header.tsx
    summary-cards.tsx
    metric-chart.tsx
    transaction-table.tsx
    indicator-explainer.tsx
  lib/
    coingecko.ts
    yahoo.ts
    sec.ts
    fmp.ts
    transform.ts
    types.ts
```

Environment variables:

```text
COINGECKO_API_KEY=
FMP_API_KEY= (optional fallback)
SEC_USER_AGENT=project-name/1.0 (contact: email@example.com)
```

## 8. Backend Implementation Plan

### 8.1 CoinGecko client

Implement a small client wrapper:

1. Add auth header
2. Centralize base URL
3. Handle response validation
4. Handle API errors cleanly

Functions:

1. `getStrategyProfile()`
2. `getStrategyHoldingChart(days)`
3. `getStrategyTransactions(page, perPage)`
4. `getBitcoinMarketChart(days)`

### 8.2 FMP client

Implement a separate wrapper:

1. Centralize base URL
2. Use API key query param
3. Validate returned market cap rows

Functions:

1. `getMstrHistoricalMarketCap()`
2. `getMstrHistoricalPrice()` as fallback

### 8.3 Transform layer

Create one function:

1. `buildStrategyMnavSeries()`

Responsibilities:

1. Normalize date formats
2. Sort ascending by date
3. Join holdings, BTC price, and market cap
4. Forward-fill market cap on non-trading days
5. Reconstruct average BTC entry price from transaction history
6. Estimate daily market cap from Yahoo close and forward-filled share count
7. Compute `btcNavUsd`, `mNav`, `premiumToNavPct`
8. Compute `unrealizedPnlPct`, `accumulation30dPct`, `btcNavPerShareUsd`, `estimatedBps`, and `estimatedBtcYield30dPct`
6. Return frontend-ready rows

Output row shape:

```ts
type StrategyMnavRow = {
  date: string;
  btcHoldings: number;
  btcPriceUsd: number;
  btcNavUsd: number;
  marketCapUsd: number;
  avgEntryPriceUsd: number | null;
  unrealizedPnlPct: number | null;
  accumulation30dPct: number | null;
  btcNavPerShareUsd: number | null;
  estimatedBps: number | null;
  estimatedBtcYield30dPct: number | null;
  mNav: number;
  premiumToNavPct: number;
};
```

### 8.4 API route

Expose one route:

```text
/api/strategy-mnav
```

Response:

```json
{
  "meta": {
    "company": "Strategy",
    "ticker": "MSTR",
    "range": "365d"
  },
  "series": [],
  "transactions": [],
  "current": {}
}
```

## 9. Frontend Implementation Plan

### 9.1 Main dashboard sections

The homepage should contain:

1. Title and project purpose
2. Indicator explanation
3. Key summary cards
4. Main mNAV chart
5. BTC NAV vs Market Cap comparison chart
6. BTC spot vs average entry chart
7. Per-share exposure chart
8. Treasury growth / BTC Yield chart
9. Transaction event table
10. Insights or interpretation section

### 9.2 Summary cards

Show:

1. Current BTC holdings
2. Current BTC treasury value
3. Current market cap
4. Current mNAV
5. Current premium to NAV
6. Current unrealized PnL %
7. 30D net BTC added
8. 30D accumulation pace
9. BTC NAV per share
10. Estimated BPS
11. Estimated BTC Yield 30D

### 9.3 Main chart

Primary chart:

1. X-axis: date
2. Y-axis: `mNAV`
3. Optional reference line at `1.0`

Design goal:

1. Make it obvious when Strategy is trading above or below BTC NAV.

### 9.4 Secondary chart

Comparison chart:

1. `BTC_NAV_USD`
2. `MarketCap_USD`

Purpose:

1. Show whether market valuation expands faster than treasury value.

### 9.5 Additional charts

Cost-basis chart:

1. `BTC Spot`
2. `Avg Entry Price`
3. `Unrealized PnL %`

Per-share chart:

1. `BTC NAV Per Share`
2. `Estimated BPS`

Treasury-efficiency chart:

1. `30D Accumulation Pace`
2. `Estimated BTC Yield 30D`

Purpose:

1. Separate valuation from treasury quality and treasury growth.
2. Avoid presenting only `mNAV` and `Premium`, which are linear transforms of the same concept.

### 9.6 Event markers

Mark major Strategy BTC purchase dates on charts.

Possible behavior:

1. Hover on marker to show:
   - date
   - quantity
   - transaction value
   - source link

### 9.7 Transaction table

Columns:

1. Date
2. Type
3. BTC quantity
4. Total value in USD
5. Source URL

## 10. Optional AI Bonus Plan

If you want the bonus later, add one extra server route:

```text
/api/summary
```

Input:

1. Last 30 or 90 days of `mNAV`
2. Last 30 or 90 days of BTC price
3. Recent Strategy transactions

Output:

1. Short natural-language summary
2. Trend interpretation
3. Risk note

Example summary topics:

1. Whether mNAV is expanding or compressing
2. Whether Strategy is accumulating BTC aggressively
3. Whether market valuation is outpacing BTC NAV growth

## 11. Validation Plan

### 11.1 Data validation

Check:

1. No negative holdings
2. No zero-division when `btcNavUsd = 0`
3. Date order is correct
4. Joined rows have consistent daily granularity

### 11.2 Financial sanity checks

Check:

1. `btcNavUsd` should approximately match CoinGecko treasury value scale
2. `mNAV` should be in a reasonable range
3. Market cap should generally exceed BTC NAV for Strategy over many periods, though this should not be hard-coded
4. `Estimated BPS` should move only when holdings or share count changes
5. `Estimated BTC Yield 30D` should not be treated as identical to price return

### 11.3 UI validation

Check:

1. Charts render on desktop and mobile
2. Tooltips show readable numbers
3. Dates are formatted consistently
4. Large USD values use readable formatting

## 12. Development Milestones

### Milestone 1: Data connectivity

Deliverables:

1. Both APIs connect successfully
2. Raw Strategy, BTC, and MSTR data can be fetched

### Milestone 2: Unified dataset

Deliverables:

1. Date-aligned daily dataset
2. Correct mNAV calculation

### Milestone 3: Dashboard UI

Deliverables:

1. Summary cards
2. mNAV chart
3. NAV vs market cap chart
4. Cost-basis chart
5. Per-share chart
6. Treasury growth chart
7. Transaction table

### Milestone 4: Report content

Deliverables:

1. Indicator explanation
2. BTC relationship analysis
3. Screenshots
4. Deployment URL

### Milestone 5: Optional AI summary

Deliverables:

1. Auto-generated trend summary
2. Explanation section on the page

## 13. Report Writing Plan

The final report should include these sections:

### 13.1 Selected Indicator

Write:

1. The selected indicator is `Strategy mNAV`
2. It measures how the stock market values Strategy relative to the marked value of its BTC treasury
3. This was chosen because it directly reflects market perception of a Bitcoin treasury company
4. Supporting indicators include unrealized treasury PnL, accumulation pace, BTC NAV per share, and Estimated BPS / BTC Yield

### 13.2 Why This Indicator Matters

Write:

1. Strategy is often treated as a leveraged BTC proxy
2. When the market becomes more optimistic about Strategy's BTC treasury strategy, mNAV rises
3. When that optimism fades, mNAV compresses

### 13.3 Relationship with Bitcoin

Write:

1. BTC price increases raise Strategy's BTC NAV directly
2. Strategy may still outperform BTC if equity investors assign a premium
3. Accumulation pace explains when treasury size itself is changing
4. Estimated BPS and BTC NAV per share translate the treasury into a shareholder-level lens
5. Therefore mNAV captures the gap between asset value and equity market narrative, while the other indicators explain treasury behavior and per-share efficiency

### 13.4 Data Sources

Write:

1. CoinGecko for treasury holdings and BTC market data
2. Yahoo Finance for MSTR daily close
3. SEC for shares outstanding snapshots
4. FMP only as fallback for blocked or missing market-cap/share data

### 13.5 Website Features

Write:

1. Daily mNAV chart
2. NAV vs Market Cap comparison
3. BTC spot vs average entry chart
4. BTC NAV per share / Estimated BPS chart
5. Treasury growth / Estimated BTC Yield chart
6. Strategy BTC purchase timeline

### 13.6 Deployment

Write:

1. Public website URL
2. Screenshot of the dashboard

## 14. Risks and Fallbacks

### Risk 1: Missing market cap on non-trading days

Solution:

1. Forward-fill the most recent trading day market cap

### Risk 2: Transaction history spans multiple pages

Solution:

1. Fetch all pages iteratively until empty

### Risk 3: API rate limits

Solution:

1. Cache server responses
2. Avoid refetching on every client render

### Risk 4: Definition confusion around mNAV

Solution:

1. State the formula explicitly everywhere
2. Use the same formula in both website and report

### Risk 5: Estimated BPS differs from Strategy's fully diluted KPI

Solution:

1. Label the metric `Estimated BPS`
2. State that the calculation uses reported outstanding shares rather than Strategy's assumed diluted share count

## 15. Execution Order

Implement in this order:

1. Set up environment variables
2. Build CoinGecko client
3. Build Yahoo and SEC clients
4. Keep FMP as a fallback only
5. Build transform function for daily merged series
6. Verify calculated mNAV, BTC NAV per share, and Estimated BPS values manually
7. Build API route
8. Build dashboard UI
9. Add transaction table and explanation section
10. Deploy to Vercel
11. Write report using the finalized charts and findings

## 16. Minimum Viable Version

If time is limited, the minimum acceptable version should include:

1. One page dashboard
2. Current summary cards
3. Daily `mNAV` chart for the last 365 days
4. BTC NAV vs Market Cap chart
5. Short explanation text
6. Public deployment URL
7. At least one supporting indicator among Unrealized PnL %, 30D Accumulation Pace, or BTC NAV per Share

This version is enough to satisfy the core homework requirements if the data is correct and the report is clear.

## 17. Nice-to-Have Extensions

Optional extensions:

1. Time range switcher
2. Buy event annotations on chart
3. Download CSV button
4. AI-generated trend summary
5. Compare Strategy mNAV with BTC price return
6. Add richer BPS / BTC Yield methodology notes

## 18. Final Recommendation

Build the first version around:

1. `Strategy`
2. `365-day daily mNAV`
3. `CoinGecko + Yahoo + SEC`
4. `Next.js + Vercel`

This is the best balance between:

1. Homework relevance
2. Implementation feasibility
3. Financial interpretability
4. Report quality

## 19. Vercel Deployment Playbook

Deploy target:

1. Next.js app in `web/`

Required environment variables on Vercel:

1. `COINGECKO_API_KEY`
2. `FMP_API_KEY`
3. `SEC_USER_AGENT` recommended for SEC requests

Deployment steps:

1. Push repository to GitHub
2. Import the repository in Vercel
3. Set root directory to `web`
4. Add environment variables in Project Settings
5. Trigger first production deployment

Post-deploy checks:

1. Open `/` and verify charts render
2. Open `/api/strategy-mnav?days=365` and verify JSON payload
3. Confirm API keys are not exposed client-side
4. Confirm `mNAV` is numeric and non-empty

Failure checklist:

1. If API route returns 500, check Vercel environment variables
2. If charts are empty, verify CoinGecko quota, Yahoo rate limit, and SEC accessibility
3. If weekend market cap is missing, verify forward-fill logic
4. If per-share metrics are flat unexpectedly, verify shares-outstanding series and fallback source
