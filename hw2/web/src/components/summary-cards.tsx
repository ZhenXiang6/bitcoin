import {
  formatCurrency,
  formatNumber,
  formatPercent,
} from "@/lib/format";
import type { StrategyDashboardData } from "@/lib/types";

type SummaryCardsProps = {
  current: StrategyDashboardData["current"];
};

export function SummaryCards({ current }: SummaryCardsProps) {
  const cards = [
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
    <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      {cards.map((card) => (
        <article
          key={card.label}
          className="rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur-md"
        >
          <p className="text-xs uppercase tracking-[0.14em] text-slate-300">
            {card.label}
          </p>
          <p className={`mt-3 text-xl font-semibold md:text-2xl ${card.tone}`}>
            {card.value}
          </p>
        </article>
      ))}
    </section>
  );
}
