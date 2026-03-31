type CoinGeckoChartPoint = [number, number];

type StrategyProfileResponse = {
  symbol?: string;
  m_nav?: number;
  holdings?: number;
};

type HoldingChartResponse = {
  holdings?: CoinGeckoChartPoint[];
  holding_value_in_usd?: CoinGeckoChartPoint[];
};

type BitcoinMarketChartResponse = {
  prices?: CoinGeckoChartPoint[];
};

const COINGECKO_BASE_URL = "https://api.coingecko.com/api/v3";

function requireCoinGeckoApiKey(): string {
  const key = process.env.COINGECKO_API_KEY;
  if (!key) {
    throw new Error("Missing COINGECKO_API_KEY in environment variables.");
  }
  return key;
}

function createCoinGeckoHeaders() {
  const apiKey = requireCoinGeckoApiKey();
  return {
    accept: "application/json",
    "x-cg-demo-api-key": apiKey,
    "x-cg-pro-api-key": apiKey,
  };
}

async function fetchCoinGecko<T>(
  path: string,
  searchParams: Record<string, string>,
): Promise<T> {
  const url = new URL(`${COINGECKO_BASE_URL}${path}`);
  for (const [key, value] of Object.entries(searchParams)) {
    url.searchParams.set(key, value);
  }

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: createCoinGeckoHeaders(),
    next: { revalidate: 3600 },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`CoinGecko request failed (${response.status}): ${text}`);
  }

  return (await response.json()) as T;
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
