type CoinGeckoChartPoint = [number, number];
type CoinGeckoTier = "demo" | "pro";

type StrategyProfileResponse = {
  symbol?: string;
  m_nav?: number;
  total_treasury_value_usd?: number;
  holdings?: Array<{
    amount?: number;
    average_entry_value_usd?: number;
    amount_per_share?: number;
    percentage_of_total_supply?: number;
    current_value_usd?: number;
    total_entry_value_usd?: number;
    unrealized_pnl?: number;
  }>;
};

type HoldingChartResponse = {
  holdings?: CoinGeckoChartPoint[];
  holding_value_in_usd?: CoinGeckoChartPoint[];
};

type BitcoinMarketChartResponse = {
  prices?: CoinGeckoChartPoint[];
};

const COINGECKO_BASE_URLS: Record<CoinGeckoTier, string> = {
  demo: "https://api.coingecko.com/api/v3",
  pro: "https://pro-api.coingecko.com/api/v3",
};

function requireCoinGeckoApiKey(): string {
  const key = process.env.COINGECKO_API_KEY;
  if (!key) {
    throw new Error("Missing COINGECKO_API_KEY in environment variables.");
  }
  return key;
}

function getConfiguredTier(): CoinGeckoTier | null {
  const rawTier = process.env.COINGECKO_API_TIER?.toLowerCase();
  if (rawTier === "demo" || rawTier === "pro") {
    return rawTier;
  }
  return null;
}

function getTierOrder(): CoinGeckoTier[] {
  const configuredTier = getConfiguredTier();
  if (configuredTier) {
    return configuredTier === "pro" ? ["pro", "demo"] : ["demo", "pro"];
  }
  return ["demo", "pro"];
}

function createCoinGeckoHeaders(tier: CoinGeckoTier, apiKey: string) {
  const headers: Record<string, string> = {
    accept: "application/json",
  };
  if (tier === "pro") {
    headers["x-cg-pro-api-key"] = apiKey;
  } else {
    headers["x-cg-demo-api-key"] = apiKey;
  }
  return headers;
}

function buildCoinGeckoUrl(path: string, searchParams: Record<string, string>, tier: CoinGeckoTier) {
  const url = new URL(`${COINGECKO_BASE_URLS[tier]}${path}`);
  for (const [key, value] of Object.entries(searchParams)) {
    url.searchParams.set(key, value);
  }
  return url;
}

function shouldTryAlternateTier(status: number, responseBody: string) {
  if ([400, 401, 403].includes(status)) {
    if (
      /pro-api\.coingecko\.com|api\.coingecko\.com|root URL|x-cg-pro-api-key|x-cg-demo-api-key/i.test(
        responseBody,
      )
    ) {
      return true;
    }
  }
  return false;
}

async function fetchCoinGecko<T>(path: string, searchParams: Record<string, string>): Promise<T> {
  const apiKey = requireCoinGeckoApiKey();
  const tiers = getTierOrder();
  let lastErrorText = "Unknown CoinGecko error";

  for (const tier of tiers) {
    const url = buildCoinGeckoUrl(path, searchParams, tier);
  const response = await fetch(url.toString(), {
    method: "GET",
      headers: createCoinGeckoHeaders(tier, apiKey),
    next: { revalidate: 3600 },
  });

  if (!response.ok) {
    const text = await response.text();
      lastErrorText = `CoinGecko ${tier} request failed (${response.status}): ${text}`;
      if (shouldTryAlternateTier(response.status, text)) {
        continue;
      }
      throw new Error(lastErrorText);
  }

  return (await response.json()) as T;
  }

  throw new Error(lastErrorText);
}

export async function getStrategyProfile() {
  return fetchCoinGecko<StrategyProfileResponse>("/public_treasury/strategy", {});
}

export async function getStrategyHoldingChart(days: number) {
  return fetchCoinGecko<HoldingChartResponse>(
    "/public_treasury/strategy/bitcoin/holding_chart",
    {
      days: String(days),
      include_empty_intervals: "true",
    },
  );
}

export async function getStrategyTransactions() {
  const allRows: unknown[] = [];
  const perPage = 250;
  const maxPages = 8;

  for (let page = 1; page <= maxPages; page += 1) {
    const pageRows = await fetchCoinGecko<unknown[]>(
      "/public_treasury/strategy/transaction_history",
      {
        per_page: String(perPage),
        page: String(page),
        order: "date_asc",
      },
    );

    if (!Array.isArray(pageRows) || pageRows.length === 0) {
      break;
    }
    allRows.push(...pageRows);
  }

  return allRows;
}

export async function getBitcoinMarketChart(days: number) {
  return fetchCoinGecko<BitcoinMarketChartResponse>("/coins/bitcoin/market_chart", {
    vs_currency: "usd",
    days: String(days),
  });
}
