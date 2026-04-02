import type { ReactNode } from "react";
import {
  formatCurrency,
  formatNumber,
  formatPercent,
} from "@/lib/format";
import type { StrategyDashboardData } from "@/lib/types";

type SummaryCardsProps = {
  current: StrategyDashboardData["current"];
};

type FeaturedCard = {
  label: string;
  value: string;
  subtitle: string;
  tone: string;
  icon: ReactNode;
};

type StandardCard = {
  label: string;
  value: string;
  tone: string;
};

function PriceIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 2v20" />
      <path d="M17 6.5c0-1.9-2.24-3.5-5-3.5S7 4.6 7 6.5 9.24 10 12 10s5 1.6 5 3.5-2.24 3.5-5 3.5-5-1.6-5-3.5" />
    </svg>
  );
}

function EquityIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 18l5-5 4 4 7-9" />
      <path d="M18 8h2v2" />
    </svg>
  );
}

function FeaturedPriceCard({ card }: { card: FeaturedCard }) {
  return (
    <article className="rounded-2xl border border-white/20 bg-[linear-gradient(135deg,rgba(255,255,255,0.16),rgba(15,23,42,0.72))] p-5 shadow-[0_18px_48px_rgba(15,23,42,0.22)] backdrop-blur-md">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.14em] text-slate-300">
            {card.label}
          </p>
          <p className={`mt-3 text-3xl font-semibold md:text-[2rem] ${card.tone}`}>
            {card.value}
          </p>
          <p className="mt-2 text-xs leading-5 text-slate-300">{card.subtitle}</p>
        </div>
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/15 bg-white/10 ${card.tone}`}>
          {card.icon}
        </div>
      </div>
    </article>
  );
}

function StandardMetricCard({ card }: { card: StandardCard }) {
  return (
    <article className="rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur-md">
      <p className="text-xs uppercase tracking-[0.14em] text-slate-300">
        {card.label}
      </p>
      <p className={`mt-3 text-xl font-semibold md:text-2xl ${card.tone}`}>
        {card.value}
      </p>
    </article>
  );
}

export function SummaryCards({ current }: SummaryCardsProps) {
  const featuredCards: FeaturedCard[] = [
    {
      label: "BTC Spot Price",
      value: formatCurrency(current.btcPriceUsd),
      subtitle: "CoinGecko BTC/USD spot from the latest cached dashboard refresh.",
      tone: "text-amber-100",
      icon: <PriceIcon />,
    },
    {
      label: "MSTR Price",
      value:
        current.mstrPriceUsd !== null
          ? formatCurrency(current.mstrPriceUsd)
          : "Unavailable",
      subtitle: "Yahoo last available daily close. Not intraday streaming.",
      tone: "text-sky-100",
      icon: <EquityIcon />,
    },
  ];

  const standardCards: StandardCard[] = [
    {
      label: "BTC Holdings",
      value: `${formatNumber(current.btcHoldings)} BTC`,
      tone: "text-emerald-200",
    },
    {
      label: "BTC NAV (USD)",
      value: formatCurrency(current.btcNavUsd),
      tone: "text-sky-200",
    },
    {
      label: "Enterprise Value",
      value: formatCurrency(current.enterpriseValueUsd),
      tone: "text-amber-200",
    },
    {
      label: "mNAV (Calculated)",
      value: formatNumber(current.mNav),
      tone: "text-fuchsia-200",
    },
    {
      label: "Premium to NAV",
      value: formatPercent(current.premiumToNavPct),
      tone:
        current.premiumToNavPct >= 0
          ? "text-rose-200"
          : "text-emerald-200",
    },
  ];

  return (
    <section className="space-y-3">
      <div className="grid gap-3 lg:grid-cols-2">
        {featuredCards.map((card) => (
          <FeaturedPriceCard key={card.label} card={card} />
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {standardCards.map((card) => (
          <StandardMetricCard key={card.label} card={card} />
        ))}
      </div>
    </section>
  );
}
