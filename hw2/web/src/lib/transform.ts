import {
  getBitcoinMarketChart,
  getStrategyHoldingChart,
  getStrategyProfile,
  getStrategyTransactions,
} from "@/lib/coingecko";
import { getMstrHistoricalMarketCap } from "@/lib/fmp";
import type {
  StrategyDashboardData,
  StrategySeriesRow,
  StrategyTransaction,
} from "@/lib/types";

type NumericPoint = [number, number];

type NormalizedTransactionRow = {
  date: string;
  transactionType: string;
  quantity: number;
  totalValueUsd: number;
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
  if (typeof dateValue !== "string") {
    return null;
  }

  const quantity =
    toNumber(raw.quantity) ??
    toNumber(raw.amount) ??
    toNumber(raw.coin_amount) ??
    toNumber(raw.btc_amount);
  const totalValueUsd =
    toNumber(raw.total_value_usd) ?? toNumber(raw.total_value) ?? toNumber(raw.value_usd);
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
    sourceUrl,
  };
}

function buildMergedSeries(
  holdingsMap: Map<string, number>,
  holdingValueMap: Map<string, number>,
  btcPriceMap: Map<string, number>,
  marketCapMap: Map<string, number>,
): StrategySeriesRow[] {
  const allDates = new Set<string>([
    ...holdingsMap.keys(),
    ...holdingValueMap.keys(),
    ...btcPriceMap.keys(),
    ...marketCapMap.keys(),
  ]);

  const sortedDates = Array.from(allDates).sort((a, b) => a.localeCompare(b));

  let lastHoldings: number | null = null;
  let lastHoldingValue: number | null = null;
  let lastBtcPrice: number | null = null;
  let lastMarketCap: number | null = null;

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

    rows.push({
      date,
      btcHoldings: lastHoldings,
      btcPriceUsd: lastBtcPrice,
      holdingValueUsd,
      btcNavUsd,
      marketCapUsd: lastMarketCap,
      mNav,
      premiumToNavPct,
    });
  }

  return rows;
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

export async function getStrategyDashboardData(days = 365): Promise<StrategyDashboardData> {
  const [profile, holdingChart, btcChart, marketCapRows, transactionRows] =
    await Promise.all([
      getStrategyProfile(),
      getStrategyHoldingChart(days),
      getBitcoinMarketChart(days),
      getMstrHistoricalMarketCap(),
      getStrategyTransactions(),
    ]);

  const holdingsMap = pointsToMap(holdingChart.holdings);
  const holdingValueMap = pointsToMap(holdingChart.holding_value_in_usd);
  const btcPriceMap = pointsToMap(btcChart.prices);
  const marketCapMap = new Map<string, number>(
    marketCapRows.map((row) => [row.date, row.marketCap]),
  );

  const mergedSeries = buildMergedSeries(
    holdingsMap,
    holdingValueMap,
    btcPriceMap,
    marketCapMap,
  );
  const series = sliceSeriesByDays(mergedSeries, days);
  const lastRow = series[series.length - 1];

  if (!lastRow) {
    throw new Error("No merged series data available. Check API keys and plan limits.");
  }

  const profileMNav = toNumber(profile.m_nav);

  return {
    meta: {
      company: "Strategy",
      ticker: profile.symbol ?? "MSTR",
      rangeDays: days,
      generatedAt: new Date().toISOString(),
    },
    current: {
      btcHoldings: lastRow.btcHoldings,
      btcPriceUsd: lastRow.btcPriceUsd,
      btcNavUsd: lastRow.btcNavUsd,
      marketCapUsd: lastRow.marketCapUsd,
      mNav: lastRow.mNav,
      premiumToNavPct: lastRow.premiumToNavPct,
      profileMNav,
    },
    series,
    transactions: formatTransactions(transactionRows),
    notes: [
      "mNAV formula in this project: marketCap / (btcHoldings x btcPrice).",
      "Market cap on non-trading dates is forward-filled to align daily BTC data.",
      "All values are USD-based daily approximations for educational analysis.",
    ],
  };
}
