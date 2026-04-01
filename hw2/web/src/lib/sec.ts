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
  ];

  const output: SharesOutstandingPoint[] = [];
  for (const row of rows) {
    const date = row.end ?? row.filed;
    if (
      typeof date === "string" &&
      typeof row.val === "number" &&
      Number.isFinite(row.val) &&
      row.val > 0
    ) {
      output.push({
        date: normalizeDate(date),
        sharesOutstanding: row.val,
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
    next: { revalidate: 3600 * 24 },
  });

  if (response.status === 404) {
    return [] as SharesOutstandingPoint[];
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

export async function getStrategySharesOutstandingSeries(): Promise<SharesOutstandingPoint[]> {
  const conceptCandidates = await Promise.all([
    fetchSecConcept("dei", "EntityCommonStockSharesOutstanding"),
    fetchSecConcept("dei", "CommonStockSharesOutstanding"),
    fetchSecConcept("us-gaap", "CommonStockSharesOutstanding"),
  ]);

  const merged = conceptCandidates.flat();
  merged.sort((a, b) => a.date.localeCompare(b.date));

  const deduped = new Map<string, number>();
  for (const row of merged) {
    deduped.set(row.date, row.sharesOutstanding);
  }

  return Array.from(deduped.entries()).map(([date, sharesOutstanding]) => ({
    date,
    sharesOutstanding,
  }));
}
