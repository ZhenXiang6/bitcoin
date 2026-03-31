export type StrategySeriesRow = {
  date: string;
  btcHoldings: number;
  btcPriceUsd: number;
  holdingValueUsd: number;
  btcNavUsd: number;
  marketCapUsd: number;
  mNav: number;
  premiumToNavPct: number;
};

export type StrategyTransaction = {
  date: string;
  transactionType: string;
  quantity: number;
  totalValueUsd: number;
  sourceUrl: string | null;
};

export type StrategyDashboardData = {
  meta: {
    company: string;
    ticker: string;
    rangeDays: number;
    generatedAt: string;
    marketCapSource: string;
  };
  current: {
    btcHoldings: number;
    btcPriceUsd: number;
    btcNavUsd: number;
    marketCapUsd: number;
    mNav: number;
    premiumToNavPct: number;
    profileMNav: number | null;
  };
  series: StrategySeriesRow[];
  transactions: StrategyTransaction[];
  notes: string[];
};
