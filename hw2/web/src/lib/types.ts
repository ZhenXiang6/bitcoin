export type StrategySeriesRow = {
  date: string;
  btcHoldings: number;
  btcPriceUsd: number;
  mstrPriceUsd: number | null;
  holdingValueUsd: number;
  btcNavUsd: number;
  marketCapUsd: number;
  enterpriseValueUsd: number;
  totalDebtUsd: number | null;
  cashAndEquivalentsUsd: number | null;
  sharesOutstanding: number | null;
  avgEntryPriceUsd: number | null;
  unrealizedPnlUsd: number | null;
  unrealizedPnlPct: number | null;
  accumulation30dPct: number | null;
  netBtcAdded30d: number | null;
  btcNavPerShareUsd: number | null;
  estimatedBps: number | null;
  estimatedBtcYield30dPct: number | null;
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
    mstrPriceUsd: number | null;
    btcNavUsd: number;
    marketCapUsd: number;
    enterpriseValueUsd: number;
    totalDebtUsd: number | null;
    cashAndEquivalentsUsd: number | null;
    sharesOutstanding: number | null;
    avgEntryPriceUsd: number | null;
    unrealizedPnlUsd: number | null;
    unrealizedPnlPct: number | null;
    accumulation30dPct: number | null;
    netBtcAdded30d: number | null;
    btcNavPerShareUsd: number | null;
    estimatedBps: number | null;
    estimatedBtcYield30dPct: number | null;
    mNav: number;
    premiumToNavPct: number;
    profileMNav: number | null;
  };
  series: StrategySeriesRow[];
  transactions: StrategyTransaction[];
  notes: string[];
};
