import { DATA_REVALIDATE_SECONDS } from "@/lib/config";

type FmpMarketCapItem = {
  date?: string;
  marketCap?: number;
};

type FmpProfileItem = {
  symbol?: string;
  price?: number;
  marketCap?: number;
};

type FmpSharesFloatItem = {
  symbol?: string;
  outstandingShares?: number;
};

export class FmpAccessError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FmpAccessError";
  }
}

const FMP_BASE_URL = "https://financialmodelingprep.com";

function requireFmpApiKey(): string {
  const key = process.env.FMP_API_KEY;
  if (!key) {
    throw new Error("Missing FMP_API_KEY in environment variables.");
  }
  return key;
}

function isAccessDeniedMessage(payload: unknown): payload is string {
  if (typeof payload !== "string") {
    return false;
  }
  return /premium|restricted|subscription|legacy endpoint/i.test(payload);
}

function isErrorMessageObject(payload: unknown): payload is { "Error Message": string } {
  return Boolean(
    payload &&
      typeof payload === "object" &&
      typeof (payload as { "Error Message"?: unknown })["Error Message"] === "string",
  );
}

async function fetchFmp(path: string, searchParams: Record<string, string>): Promise<unknown> {
  const url = new URL(`${FMP_BASE_URL}${path}`);
  for (const [key, value] of Object.entries(searchParams)) {
    url.searchParams.set(key, value);
  }
  url.searchParams.set("apikey", requireFmpApiKey());

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: { accept: "application/json" },
    next: { revalidate: DATA_REVALIDATE_SECONDS },
  });

  const text = await response.text();
  let payload: unknown = text;
  try {
    payload = JSON.parse(text);
  } catch {
    payload = text;
  }

  if (!response.ok) {
    throw new Error(`FMP request failed (${response.status}): ${text}`);
  }

  if (isAccessDeniedMessage(payload)) {
    throw new FmpAccessError(payload);
  }
  if (isErrorMessageObject(payload)) {
    throw new FmpAccessError(payload["Error Message"]);
  }

  return payload;
}

function isValidMarketCapRow(item: FmpMarketCapItem): item is Required<FmpMarketCapItem> {
  return Boolean(
    item.date &&
      typeof item.marketCap === "number" &&
      Number.isFinite(item.marketCap) &&
      item.marketCap > 0,
  );
}

function isValidProfileRow(item: FmpProfileItem): item is Required<FmpProfileItem> {
  return Boolean(
    item.symbol &&
      typeof item.price === "number" &&
      Number.isFinite(item.price) &&
      item.price > 0 &&
      typeof item.marketCap === "number" &&
      Number.isFinite(item.marketCap) &&
      item.marketCap > 0,
  );
}

function isValidSharesFloatRow(
  item: FmpSharesFloatItem,
): item is Required<FmpSharesFloatItem> {
  return Boolean(
    item.symbol &&
      typeof item.outstandingShares === "number" &&
      Number.isFinite(item.outstandingShares) &&
      item.outstandingShares > 0,
  );
}

export async function getMstrHistoricalMarketCap() {
  const payload = await fetchFmp("/stable/historical-market-capitalization", {
    symbol: "MSTR",
  });

  const rows = Array.isArray(payload)
    ? payload
    : Array.isArray((payload as { historical?: unknown[] }).historical)
      ? (payload as { historical: unknown[] }).historical
      : [];

  return rows
    .filter((row): row is FmpMarketCapItem => typeof row === "object" && row !== null)
    .filter(isValidMarketCapRow)
    .sort((a, b) => a.date.localeCompare(b.date));
}

export async function getMstrProfile() {
  const payload = await fetchFmp("/stable/profile", { symbol: "MSTR" });
  const rows = Array.isArray(payload) ? payload : [];
  const first = rows.find(
    (row): row is FmpProfileItem => typeof row === "object" && row !== null,
  );
  if (!first || !isValidProfileRow(first)) {
    return null;
  }
  return first;
}

export async function getMstrSharesFloat() {
  const payload = await fetchFmp("/stable/shares-float", { symbol: "MSTR" });
  const rows = Array.isArray(payload) ? payload : [];
  const first = rows.find(
    (row): row is FmpSharesFloatItem => typeof row === "object" && row !== null,
  );
  if (!first || !isValidSharesFloatRow(first)) {
    return null;
  }
  return first;
}
