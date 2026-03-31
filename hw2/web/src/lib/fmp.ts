type FmpMarketCapItem = {
  date?: string;
  marketCap?: number;
};

const FMP_BASE_URL = "https://financialmodelingprep.com";

function requireFmpApiKey(): string {
  const key = process.env.FMP_API_KEY;
  if (!key) {
    throw new Error("Missing FMP_API_KEY in environment variables.");
  }
  return key;
}

async function fetchFmp<T>(
  path: string,
  searchParams: Record<string, string>,
): Promise<T> {
  const url = new URL(`${FMP_BASE_URL}${path}`);
  for (const [key, value] of Object.entries(searchParams)) {
    url.searchParams.set(key, value);
  }
  url.searchParams.set("apikey", requireFmpApiKey());

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: { accept: "application/json" },
    next: { revalidate: 3600 },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`FMP request failed (${response.status}): ${text}`);
  }

  return (await response.json()) as T;
}

function isValidRow(item: FmpMarketCapItem): item is Required<FmpMarketCapItem> {
  return Boolean(
    item.date &&
      typeof item.marketCap === "number" &&
      Number.isFinite(item.marketCap) &&
      item.marketCap > 0,
  );
}

export async function getMstrHistoricalMarketCap() {
  const payload = await fetchFmp<unknown>(
    "/stable/historical-market-capitalization",
    { symbol: "MSTR" },
  );

  const rows = Array.isArray(payload)
    ? payload
    : Array.isArray((payload as { historical?: unknown[] }).historical)
      ? (payload as { historical: unknown[] }).historical
      : [];

  return rows
    .filter((row): row is FmpMarketCapItem => typeof row === "object" && row !== null)
    .filter(isValidRow)
    .sort((a, b) => a.date.localeCompare(b.date));
}
