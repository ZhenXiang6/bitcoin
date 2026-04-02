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

type NormalizedConceptPoint = {
  date: string;
  value: number;
  filedDate: string | null;
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

function sleep(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function normalizeConceptRows(payload: SecConceptResponse) {
  const rows = [
    ...(payload.units?.shares ?? []),
    ...(payload.units?.Shares ?? []),
    ...(payload.units?.SHARES ?? []),
    ...(payload.units?.USD ?? []),
    ...(payload.units?.usd ?? []),
  ];

  const output: NormalizedConceptPoint[] = [];
  for (const row of rows) {
    const date = row.end ?? row.filed;
    const filedDate =
      typeof row.filed === "string" ? normalizeDate(row.filed) : null;
    if (
      typeof date === "string" &&
      typeof row.val === "number" &&
      Number.isFinite(row.val) &&
      row.val >= 0
    ) {
      output.push({
        date: normalizeDate(date),
        value: row.val,
        filedDate,
      });
    }
  }
  return output;
}

async function fetchSecConcept(
  taxonomy: string,
  concept: string,
): Promise<NormalizedConceptPoint[]> {
  const url = `${SEC_BASE_URL}/CIK${STRATEGY_CIK}/${taxonomy}/${concept}.json`;
  let response: Response | null = null;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    response = await fetch(url, {
      method: "GET",
      headers: {
        accept: "application/json",
        "user-agent": secUserAgent(),
      },
      next: { revalidate: DATA_REVALIDATE_SECONDS },
    });

    if (response.ok || response.status === 404) {
      break;
    }

    if (
      (response.status === 429 ||
        response.status === 502 ||
        response.status === 503 ||
        response.status === 504) &&
      attempt < 2
    ) {
      await sleep(250 * (attempt + 1));
      continue;
    }
    break;
  }

  if (!response) {
    throw new Error(`SEC request failed before response for ${taxonomy}:${concept}`);
  }

  if (response.status === 404) {
    return [] as NormalizedConceptPoint[];
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

function dedupeByDate(points: NormalizedConceptPoint[]) {
  const deduped = new Map<string, NormalizedConceptPoint>();
  for (const point of points.sort((a, b) => a.date.localeCompare(b.date))) {
    const existing = deduped.get(point.date);
    if (!existing) {
      deduped.set(point.date, point);
      continue;
    }

    const existingFiled = existing.filedDate ?? "";
    const candidateFiled = point.filedDate ?? "";
    if (candidateFiled > existingFiled) {
      deduped.set(point.date, point);
      continue;
    }

    if (candidateFiled === existingFiled && point.value > existing.value) {
      deduped.set(point.date, point);
    }
  }
  return Array.from(deduped.values()).map((point) => ({
    date: point.date,
    value: point.value,
  }));
}

async function getFirstAvailableConceptSeries(
  candidates: Array<{ taxonomy: string; concept: string }>,
): Promise<FinancialMetricPoint[]> {
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
    {
      taxonomy: "us-gaap",
      concept: "WeightedAverageNumberOfDilutedSharesOutstanding",
    },
    {
      taxonomy: "us-gaap",
      concept: "WeightedAverageNumberOfSharesOutstandingBasic",
    },
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
    { taxonomy: "us-gaap", concept: "LongTermDebt" },
    { taxonomy: "us-gaap", concept: "Debt" },
    { taxonomy: "us-gaap", concept: "ConvertibleLongTermNotesPayable" },
    { taxonomy: "us-gaap", concept: "LongTermDebtAndFinanceLeaseObligations" },
    { taxonomy: "us-gaap", concept: "LongTermDebtAndCapitalLeaseObligations" },
  ]);

  if (totalDebt.length > 0) {
    return totalDebt;
  }

  const [currentDebt, nonCurrentDebt] = await Promise.all([
    getFirstAvailableConceptSeries([
      { taxonomy: "us-gaap", concept: "LongTermDebtCurrent" },
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
