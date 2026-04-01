import { DATA_REVALIDATE_SECONDS } from "@/lib/config";

type SecConceptResponse = {
  units?: Record<
    string,
    Array<{
      end?: string;
      filed?: string;
      val?: number;
    }>
  >;
};

export type SharesOutstandingPoint = {
  date: string;
  sharesOutstanding: number;
};

export type FinancialMetricPoint = {
  date: string;
  value: number;
};

const STRATEGY_CIK = "0001050446";
const SEC_BASE_URL = "https://data.sec.gov/api/xbrl/companyconcept";

function secUserAgent() {
  return (
    process.env.SEC_USER_AGENT ??
    "strategy-mnav-dashboard/1.0 (contact: student@example.com)"
  );
}

function normalizeDate(input: string) {
  return input.slice(0, 10);
}

function normalizeConceptRows(payload: SecConceptResponse) {
  const rows = [
    ...(payload.units?.shares ?? []),
    ...(payload.units?.Shares ?? []),
    ...(payload.units?.SHARES ?? []),
    ...(payload.units?.USD ?? []),
    ...(payload.units?.usd ?? []),
  ];

  const output: FinancialMetricPoint[] = [];
  for (const row of rows) {
    const date = row.end ?? row.filed;
    if (
      typeof date === "string" &&
      typeof row.val === "number" &&
      Number.isFinite(row.val) &&
      row.val >= 0
    ) {
      output.push({
        date: normalizeDate(date),
        value: row.val,
      });
    }
  }
  return output;
}

async function fetchSecConcept(taxonomy: string, concept: string) {
  const url = `${SEC_BASE_URL}/CIK${STRATEGY_CIK}/${taxonomy}/${concept}.json`;
  const response = await fetch(url, {
    method: "GET",
    headers: {
      accept: "application/json",
      "user-agent": secUserAgent(),
    },
    next: { revalidate: DATA_REVALIDATE_SECONDS },
  });

  if (response.status === 404) {
    return [] as FinancialMetricPoint[];
  }

  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      `SEC companyconcept request failed (${response.status}) for ${taxonomy}:${concept}: ${text}`,
    );
  }

  const payload = (await response.json()) as SecConceptResponse;
  return normalizeConceptRows(payload);
}

function dedupeByDate(points: FinancialMetricPoint[]) {
  const deduped = new Map<string, number>();
  for (const point of points.sort((a, b) => a.date.localeCompare(b.date))) {
    deduped.set(point.date, point.value);
  }
  return Array.from(deduped.entries()).map(([date, value]) => ({ date, value }));
}

async function getFirstAvailableConceptSeries(
  candidates: Array<{ taxonomy: string; concept: string }>,
) {
  for (const candidate of candidates) {
    const rows = await fetchSecConcept(candidate.taxonomy, candidate.concept);
    if (rows.length > 0) {
      return dedupeByDate(rows);
    }
  }
  return [] as FinancialMetricPoint[];
}

function sumSeriesByDate(seriesList: FinancialMetricPoint[][]) {
  const sumByDate = new Map<string, number>();
  for (const series of seriesList) {
    for (const point of series) {
      sumByDate.set(point.date, (sumByDate.get(point.date) ?? 0) + point.value);
    }
  }
  return Array.from(sumByDate.entries())
    .map(([date, value]) => ({ date, value }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export async function getStrategySharesOutstandingSeries(): Promise<SharesOutstandingPoint[]> {
  const merged = await getFirstAvailableConceptSeries([
    { taxonomy: "dei", concept: "EntityCommonStockSharesOutstanding" },
    { taxonomy: "dei", concept: "CommonStockSharesOutstanding" },
    { taxonomy: "us-gaap", concept: "CommonStockSharesOutstanding" },
  ]);

  return merged.map((row) => ({
    date: row.date,
    sharesOutstanding: row.value,
  }));
}

export async function getStrategyCashSeries(): Promise<FinancialMetricPoint[]> {
  return getFirstAvailableConceptSeries([
    { taxonomy: "us-gaap", concept: "CashAndCashEquivalentsAtCarryingValue" },
    {
      taxonomy: "us-gaap",
      concept: "CashCashEquivalentsRestrictedCashAndRestrictedCashEquivalents",
    },
  ]);
}

export async function getStrategyDebtSeries(): Promise<FinancialMetricPoint[]> {
  const totalDebt = await getFirstAvailableConceptSeries([
    { taxonomy: "us-gaap", concept: "Debt" },
    { taxonomy: "us-gaap", concept: "LongTermDebtAndFinanceLeaseObligations" },
    { taxonomy: "us-gaap", concept: "LongTermDebtAndCapitalLeaseObligations" },
    { taxonomy: "us-gaap", concept: "LongTermDebt" },
  ]);

  if (totalDebt.length > 0) {
    return totalDebt;
  }

  const [currentDebt, nonCurrentDebt] = await Promise.all([
    getFirstAvailableConceptSeries([
      { taxonomy: "us-gaap", concept: "ShortTermBorrowings" },
      { taxonomy: "us-gaap", concept: "LongTermDebtCurrentMaturities" },
      {
        taxonomy: "us-gaap",
        concept: "LongTermDebtAndFinanceLeaseObligationsCurrent",
      },
      {
        taxonomy: "us-gaap",
        concept: "LongTermDebtAndCapitalLeaseObligationsCurrent",
      },
    ]),
    getFirstAvailableConceptSeries([
      { taxonomy: "us-gaap", concept: "LongTermDebtNoncurrent" },
      {
        taxonomy: "us-gaap",
        concept: "LongTermDebtAndFinanceLeaseObligationsNoncurrent",
      },
      {
        taxonomy: "us-gaap",
        concept: "LongTermDebtAndCapitalLeaseObligationsNoncurrent",
      },
    ]),
  ]);

  return sumSeriesByDate([currentDebt, nonCurrentDebt]);
}
