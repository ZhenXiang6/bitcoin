import {
  getBitcoinMarketChart,
  getStrategyHoldingChart,
  getStrategyProfile,
  getStrategyTransactions,
} from "@/lib/coingecko";
import {
  FmpAccessError,
  getMstrHistoricalMarketCap,
  getMstrProfile,
  getMstrSharesFloat,
} from "@/lib/fmp";
import { getStrategySharesOutstandingSeries } from "@/lib/sec";
import type { SharesOutstandingPoint } from "@/lib/sec";
import type {
  StrategyDashboardData,
  StrategySeriesRow,
  StrategyTransaction,
} from "@/lib/types";
import { getYahooHistoricalCloseSeries, type YahooClosePoint } from "@/lib/yahoo";

type NumericPoint = [number, number];
type MarketCapRow = { date: string; marketCap: number };
type AverageEntryRow = { date: string; avgEntryPriceUsd: number };

type NormalizedTransactionRow = {
  date: string;
  transactionType: string;
  quantity: number;
  totalValueUsd: number;
  averageEntryValueUsd: number | null;
  sourceUrl: string | null;
};

function toDateString(input: number | string): string {
  if (typeof input === "number") {
    return new Date(input).toISOString().slice(0, 10);
  }
  return input.slice(0, 10);
}

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return null;
}

function pointsToMap(points: NumericPoint[] | undefined) {
  const map = new Map<string, number>();
  if (!points) {
    return map;
  }

  for (const [timestamp, value] of points) {
    const normalized = toNumber(value);
    if (normalized === null) {
      continue;
    }
    map.set(toDateString(timestamp), normalized);
  }
  return map;
}

function normalizeTransactionRow(row: unknown): NormalizedTransactionRow | null {
  if (!row || typeof row !== "object") {
    return null;
  }
  const raw = row as Record<string, unknown>;
  const dateValue = raw.date;
  if (typeof dateValue !== "string" && typeof dateValue !== "number") {
    return null;
  }

  const quantity =
    toNumber(raw.quantity) ??
    toNumber(raw.holding_net_change) ??
    toNumber(raw.amount) ??
    toNumber(raw.coin_amount) ??
    toNumber(raw.btc_amount);
  const totalValueUsd =
    toNumber(raw.total_value_usd) ??
    toNumber(raw.transaction_value_usd) ??
    toNumber(raw.total_value) ??
    toNumber(raw.value_usd);
  const averageEntryValueUsd =
    toNumber(raw.average_entry_value_usd) ?? toNumber(raw.avg_entry_value_usd);
  const transactionType =
    typeof raw.transaction_type === "string"
      ? raw.transaction_type
      : typeof raw.type === "string"
        ? raw.type
        : "unknown";
  const sourceUrl =
    typeof raw.source_url === "string"
      ? raw.source_url
      : typeof raw.url === "string"
        ? raw.url
        : null;

  if (quantity === null || totalValueUsd === null) {
    return null;
  }

  return {
    date: toDateString(dateValue),
    transactionType,
    quantity,
    totalValueUsd,
    averageEntryValueUsd,
    sourceUrl,
  };
}

function sortByDateAsc<T extends { date: string }>(rows: T[]) {
  return [...rows].sort((a, b) => a.date.localeCompare(b.date));
}

function classifySignedQuantity(transactionType: string, quantity: number) {
  const normalized = transactionType.toLowerCase();
  if (normalized.includes("sell") || normalized.includes("dispose")) {
    return -Math.abs(quantity);
  }
  return Math.abs(quantity);
}

function buildAverageEntryRows(
  transactionRows: NormalizedTransactionRow[],
  fallbackAvgEntryPriceUsd: number | null,
) {
  const sortedRows = sortByDateAsc(transactionRows);
  const directRows = sortedRows
    .filter(
      (row) =>
        row.averageEntryValueUsd !== null && row.averageEntryValueUsd > 0,
    )
    .map((row) => ({
      date: row.date,
      avgEntryPriceUsd: row.averageEntryValueUsd as number,
    }));

  if (directRows.length > 0) {
    const latestByDate = new Map<string, number>();
    for (const row of directRows) {
      latestByDate.set(row.date, row.avgEntryPriceUsd);
    }
    return Array.from(latestByDate.entries()).map(([date, avgEntryPriceUsd]) => ({
      date,
      avgEntryPriceUsd,
    }));
  }

  const avgEntryByDate = new Map<string, number>();
  let cumulativeQuantity = 0;
  let cumulativeCostUsd = 0;

  for (const row of sortedRows) {
    const signedQuantity = classifySignedQuantity(row.transactionType, row.quantity);
    if (signedQuantity > 0) {
      cumulativeQuantity += signedQuantity;
      cumulativeCostUsd += Math.abs(row.totalValueUsd);
    } else {
      const sellQuantity = Math.min(cumulativeQuantity, Math.abs(signedQuantity));
      const averageCost = cumulativeQuantity > 0 ? cumulativeCostUsd / cumulativeQuantity : 0;
      cumulativeQuantity -= sellQuantity;
      cumulativeCostUsd -= sellQuantity * averageCost;
      if (cumulativeQuantity <= 0) {
        cumulativeQuantity = 0;
        cumulativeCostUsd = 0;
      }
    }

    if (cumulativeQuantity > 0 && cumulativeCostUsd > 0) {
      avgEntryByDate.set(row.date, cumulativeCostUsd / cumulativeQuantity);
    }
  }

  if (avgEntryByDate.size === 0 && fallbackAvgEntryPriceUsd && fallbackAvgEntryPriceUsd > 0) {
    return [] as AverageEntryRow[];
  }

  return Array.from(avgEntryByDate.entries()).map(([date, avgEntryPriceUsd]) => ({
    date,
    avgEntryPriceUsd,
  }));
}

function buildEstimatedMarketCapRows(
  closeRows: YahooClosePoint[],
  sharesRows: SharesOutstandingPoint[],
  fallbackShares: number | null,
): MarketCapRow[] {
  if (closeRows.length === 0) {
    return [];
  }

  const sortedClose = sortByDateAsc(closeRows);
  const sortedShares = sortByDateAsc(
    sharesRows.filter(
      (row) =>
        Number.isFinite(row.sharesOutstanding) &&
        row.sharesOutstanding > 0 &&
        row.date.length >= 10,
    ),
  );

  if (sortedShares.length === 0) {
    if (!fallbackShares || fallbackShares <= 0) {
      return [];
    }
    return sortedClose.map((row) => ({
      date: row.date,
      marketCap: row.close * fallbackShares,
    }));
  }

  const output: MarketCapRow[] = [];
  let sharesIndex = 0;
  let lastShares: number | null = null;

  for (const closeRow of sortedClose) {
    while (
      sharesIndex < sortedShares.length &&
      sortedShares[sharesIndex].date <= closeRow.date
    ) {
      lastShares = sortedShares[sharesIndex].sharesOutstanding;
      sharesIndex += 1;
    }

    if ((lastShares === null || lastShares <= 0) && fallbackShares && fallbackShares > 0) {
      lastShares = fallbackShares;
    }

    if (lastShares === null || lastShares <= 0) {
      continue;
    }

    output.push({
      date: closeRow.date,
      marketCap: closeRow.close * lastShares,
    });
  }

  return output;
}

function addRollingMetrics(series: StrategySeriesRow[]) {
  const withMetrics = [...series];
  for (let index = 0; index < withMetrics.length; index += 1) {
    const current = withMetrics[index];
    const prior30 = index >= 30 ? withMetrics[index - 30] : null;

    current.netBtcAdded30d =
      prior30 !== null ? current.btcHoldings - prior30.btcHoldings : null;
    current.accumulation30dPct =
      prior30 !== null && prior30.btcHoldings > 0
        ? ((current.btcHoldings - prior30.btcHoldings) / prior30.btcHoldings) * 100
        : null;
    current.estimatedBtcYield30dPct =
      prior30 !== null &&
      prior30.estimatedBps !== null &&
      prior30.estimatedBps > 0 &&
      current.estimatedBps !== null
        ? (current.estimatedBps / prior30.estimatedBps - 1) * 100
        : null;
  }
  return withMetrics;
}

function buildMergedSeries(
  holdingsMap: Map<string, number>,
  holdingValueMap: Map<string, number>,
  btcPriceMap: Map<string, number>,
  marketCapMap: Map<string, number>,
  sharesOutstandingMap: Map<string, number>,
  avgEntryPriceMap: Map<string, number>,
  fallbackMarketCap: number | null,
  fallbackShares: number | null,
  fallbackAvgEntryPriceUsd: number | null,
): StrategySeriesRow[] {
  const allDates = new Set<string>([
    ...holdingsMap.keys(),
    ...holdingValueMap.keys(),
    ...btcPriceMap.keys(),
    ...marketCapMap.keys(),
    ...sharesOutstandingMap.keys(),
    ...avgEntryPriceMap.keys(),
  ]);
  const sortedDates = Array.from(allDates).sort((a, b) => a.localeCompare(b));

  let lastHoldings: number | null = null;
  let lastHoldingValue: number | null = null;
  let lastBtcPrice: number | null = null;
  let lastMarketCap: number | null = null;
  let lastSharesOutstanding: number | null = fallbackShares;
  let lastAvgEntryPriceUsd: number | null = fallbackAvgEntryPriceUsd;

  const rows: StrategySeriesRow[] = [];

  for (const date of sortedDates) {
    if (holdingsMap.has(date)) {
      lastHoldings = holdingsMap.get(date) ?? null;
    }
    if (holdingValueMap.has(date)) {
      lastHoldingValue = holdingValueMap.get(date) ?? null;
    }
    if (btcPriceMap.has(date)) {
      lastBtcPrice = btcPriceMap.get(date) ?? null;
    }
    if (marketCapMap.has(date)) {
      lastMarketCap = marketCapMap.get(date) ?? null;
    } else if (lastMarketCap === null && fallbackMarketCap && fallbackMarketCap > 0) {
      lastMarketCap = fallbackMarketCap;
    }
    if (sharesOutstandingMap.has(date)) {
      lastSharesOutstanding = sharesOutstandingMap.get(date) ?? lastSharesOutstanding;
    }
    if (avgEntryPriceMap.has(date)) {
      lastAvgEntryPriceUsd = avgEntryPriceMap.get(date) ?? lastAvgEntryPriceUsd;
    }

    if (
      lastHoldings === null ||
      lastBtcPrice === null ||
      lastMarketCap === null ||
      lastHoldings <= 0 ||
      lastBtcPrice <= 0 ||
      lastMarketCap <= 0
    ) {
      continue;
    }

    const btcNavUsd = lastHoldings * lastBtcPrice;
    if (btcNavUsd <= 0) {
      continue;
    }

    const holdingValueUsd =
      lastHoldingValue !== null && lastHoldingValue > 0 ? lastHoldingValue : btcNavUsd;
    const mNav = lastMarketCap / btcNavUsd;
    const premiumToNavPct = (mNav - 1) * 100;
    const sharesOutstanding =
      lastSharesOutstanding !== null && lastSharesOutstanding > 0 ? lastSharesOutstanding : null;
    const btcNavPerShareUsd =
      sharesOutstanding !== null ? btcNavUsd / sharesOutstanding : null;
    const estimatedBps =
      sharesOutstanding !== null ? lastHoldings / sharesOutstanding : null;
    const avgEntryPriceUsd =
      lastAvgEntryPriceUsd !== null && lastAvgEntryPriceUsd > 0 ? lastAvgEntryPriceUsd : null;
    const unrealizedPnlUsd =
      avgEntryPriceUsd !== null ? (lastBtcPrice - avgEntryPriceUsd) * lastHoldings : null;
    const unrealizedPnlPct =
      avgEntryPriceUsd !== null ? ((lastBtcPrice - avgEntryPriceUsd) / avgEntryPriceUsd) * 100 : null;

    rows.push({
      date,
      btcHoldings: lastHoldings,
      btcPriceUsd: lastBtcPrice,
      holdingValueUsd,
      btcNavUsd,
      marketCapUsd: lastMarketCap,
      sharesOutstanding,
      avgEntryPriceUsd,
      unrealizedPnlUsd,
      unrealizedPnlPct,
      accumulation30dPct: null,
      netBtcAdded30d: null,
      btcNavPerShareUsd,
      estimatedBps,
      estimatedBtcYield30dPct: null,
      mNav,
      premiumToNavPct,
    });
  }

  return addRollingMetrics(rows);
}

function sliceSeriesByDays(series: StrategySeriesRow[], days: number): StrategySeriesRow[] {
  if (series.length === 0) {
    return series;
  }
  const cutoffDate = new Date(series[series.length - 1].date);
  cutoffDate.setUTCDate(cutoffDate.getUTCDate() - days);
  const cutoff = cutoffDate.toISOString().slice(0, 10);
  return series.filter((row) => row.date >= cutoff);
}

function formatTransactions(rawRows: unknown[]): StrategyTransaction[] {
  return rawRows
    .map(normalizeTransactionRow)
    .filter((row): row is NormalizedTransactionRow => row !== null)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 25)
    .map((row) => ({
      date: row.date,
      transactionType: row.transactionType,
      quantity: row.quantity,
      totalValueUsd: row.totalValueUsd,
      sourceUrl: row.sourceUrl,
    }));
}

function pickConstantFallbackMarketCap(
  fmpProfileMarketCap: number | null,
  coingeckoProfileMnav: number | null,
  coingeckoTreasuryValue: number | null,
) {
  const fromCoinGecko =
    coingeckoProfileMnav && coingeckoTreasuryValue
      ? coingeckoProfileMnav * coingeckoTreasuryValue
      : null;
  return fmpProfileMarketCap ?? fromCoinGecko;
}

export async function getStrategyDashboardData(days = 365): Promise<StrategyDashboardData> {
  const requestedDays = Math.min(Math.max(days, 30), 730);
  const yahooDays = Math.min(requestedDays + 80, 730);

  const [
    coingeckoProfile,
    holdingChart,
    btcChart,
    rawTransactionRows,
    yahooCloseRows,
    secSharesRows,
    fmpProfile,
    fmpShares,
  ] = await Promise.all([
    getStrategyProfile(),
    getStrategyHoldingChart(requestedDays),
    getBitcoinMarketChart(requestedDays),
    getStrategyTransactions(),
    getYahooHistoricalCloseSeries("MSTR", yahooDays).catch(() => []),
    getStrategySharesOutstandingSeries().catch(() => []),
    getMstrProfile().catch(() => null),
    getMstrSharesFloat().catch(() => null),
  ]);

  const transactionRows = rawTransactionRows
    .map(normalizeTransactionRow)
    .filter((row): row is NormalizedTransactionRow => row !== null);
  const profileHolding = Array.isArray(coingeckoProfile.holdings)
    ? coingeckoProfile.holdings[0]
    : null;
  const fallbackAvgEntryPriceUsd = toNumber(profileHolding?.average_entry_value_usd);
  const fallbackShares = toNumber(fmpShares?.outstandingShares);
  const avgEntryRows = buildAverageEntryRows(transactionRows, fallbackAvgEntryPriceUsd);

  const notes: string[] = [
    "mNAV formula in this project: marketCap / (btcHoldings x btcPrice).",
    "BTC NAV per Share is estimated with forward-filled shares outstanding.",
    "Estimated BPS and Estimated BTC Yield use outstanding shares rather than fully diluted share assumptions.",
    "All values are USD-based educational estimates and should be interpreted with methodology notes.",
  ];

  const estimatedMarketCapRows = buildEstimatedMarketCapRows(
    yahooCloseRows,
    secSharesRows,
    fallbackShares,
  );

  let marketCapRows: MarketCapRow[] = [];
  let fallbackMarketCap: number | null = null;
  let marketCapSource = "Yahoo close x SEC shares outstanding";

  if (estimatedMarketCapRows.length > 0) {
    marketCapRows = estimatedMarketCapRows;
    if (secSharesRows.length === 0 && fallbackShares && fallbackShares > 0) {
      marketCapSource = "Yahoo close x FMP shares-float fallback";
      notes.push(
        "SEC shares-outstanding series unavailable. Used FMP shares-float as constant share count.",
      );
    }
  } else {
    try {
      marketCapRows = await getMstrHistoricalMarketCap();
      if (marketCapRows.length > 0) {
        marketCapSource = "FMP historical market cap fallback";
        notes.push(
          "Yahoo/SEC market-cap reconstruction unavailable. Fell back to FMP historical market cap.",
        );
      }
    } catch (error) {
      if (error instanceof FmpAccessError) {
        notes.push(
          "FMP historical market cap is restricted under current plan. Using constant market-cap fallback.",
        );
      } else {
        notes.push(
          "FMP historical market cap request failed. Using constant market-cap fallback.",
        );
      }
    }
  }

  if (marketCapRows.length === 0) {
    const fmpProfileMarketCap = toNumber(fmpProfile?.marketCap);
    const coingeckoProfileMnav = toNumber(coingeckoProfile.m_nav);
    const coingeckoTreasuryValue = toNumber(coingeckoProfile.total_treasury_value_usd);
    fallbackMarketCap = pickConstantFallbackMarketCap(
      fmpProfileMarketCap,
      coingeckoProfileMnav,
      coingeckoTreasuryValue,
    );
    marketCapSource = "Constant market-cap fallback (FMP profile or CoinGecko-derived)";
  }

  if (marketCapRows.length === 0 && (!fallbackMarketCap || fallbackMarketCap <= 0)) {
    throw new Error(
      "No usable MSTR market-cap source available. Yahoo/SEC and FMP sources were both unavailable.",
    );
  }

  if (yahooCloseRows.length === 0) {
    notes.push("Yahoo historical close series unavailable in this runtime (possible rate limit).");
  }
  if (secSharesRows.length === 0) {
    notes.push("SEC shares-outstanding series unavailable in this runtime.");
  }
  if (avgEntryRows.length === 0 && fallbackAvgEntryPriceUsd) {
    notes.push(
      "Daily average-entry reconstruction was incomplete. Used current average entry price as fallback for unrealized PnL estimates.",
    );
  }

  const holdingsMap = pointsToMap(holdingChart.holdings);
  const holdingValueMap = pointsToMap(holdingChart.holding_value_in_usd);
  const btcPriceMap = pointsToMap(btcChart.prices);
  const marketCapMap = new Map<string, number>(
    marketCapRows.map((row) => [row.date, row.marketCap]),
  );
  const sharesOutstandingMap = new Map<string, number>(
    secSharesRows.map((row) => [row.date, row.sharesOutstanding]),
  );
  const avgEntryPriceMap = new Map<string, number>(
    avgEntryRows.map((row) => [row.date, row.avgEntryPriceUsd]),
  );

  const mergedSeries = buildMergedSeries(
    holdingsMap,
    holdingValueMap,
    btcPriceMap,
    marketCapMap,
    sharesOutstandingMap,
    avgEntryPriceMap,
    fallbackMarketCap,
    fallbackShares,
    fallbackAvgEntryPriceUsd,
  );
  const series = sliceSeriesByDays(mergedSeries, requestedDays);
  const lastRow = series[series.length - 1];

  if (!lastRow) {
    throw new Error("No merged series data available. Check API keys and data-source limits.");
  }

  return {
    meta: {
      company: "Strategy",
      ticker: coingeckoProfile.symbol ?? fmpProfile?.symbol ?? "MSTR",
      rangeDays: requestedDays,
      generatedAt: new Date().toISOString(),
      marketCapSource,
    },
    current: {
      btcHoldings: lastRow.btcHoldings,
      btcPriceUsd: lastRow.btcPriceUsd,
      btcNavUsd: lastRow.btcNavUsd,
      marketCapUsd: lastRow.marketCapUsd,
      sharesOutstanding: lastRow.sharesOutstanding,
      avgEntryPriceUsd: lastRow.avgEntryPriceUsd,
      unrealizedPnlUsd: lastRow.unrealizedPnlUsd,
      unrealizedPnlPct: lastRow.unrealizedPnlPct,
      accumulation30dPct: lastRow.accumulation30dPct,
      netBtcAdded30d: lastRow.netBtcAdded30d,
      btcNavPerShareUsd: lastRow.btcNavPerShareUsd,
      estimatedBps: lastRow.estimatedBps,
      estimatedBtcYield30dPct: lastRow.estimatedBtcYield30dPct,
      mNav: lastRow.mNav,
      premiumToNavPct: lastRow.premiumToNavPct,
      profileMNav: toNumber(coingeckoProfile.m_nav),
    },
    series,
    transactions: formatTransactions(rawTransactionRows),
    notes,
  };
}
