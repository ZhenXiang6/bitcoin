import {
  formatCurrency,
  formatNumber,
  formatPercent,
  formatPreciseNumber,
} from "@/lib/format";
import type { StrategyDashboardData } from "@/lib/types";

type SummaryCardsProps = {
  current: StrategyDashboardData["current"];
};

export function SummaryCards({ current }: SummaryCardsProps) {
  function fallbackText(value: string | null) {
    return value ?? "N/A";
  }

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
      label: "MSTR Market Cap",
      value: formatCurrency(current.marketCapUsd),
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
    {
      label: "Unrealized PnL %",
      value: fallbackText(
        current.unrealizedPnlPct !== null
          ? formatPercent(current.unrealizedPnlPct)
          : null,
      ),
      tone:
        current.unrealizedPnlPct !== null && current.unrealizedPnlPct >= 0
          ? "text-emerald-200"
          : "text-rose-200",
    },
    {
      label: "30D Net BTC Added",
      value: fallbackText(
        current.netBtcAdded30d !== null
          ? `${formatNumber(current.netBtcAdded30d)} BTC`
          : null,
      ),
      tone:
        current.netBtcAdded30d !== null && current.netBtcAdded30d >= 0
          ? "text-sky-200"
          : "text-rose-200",
    },
    {
      label: "30D Accumulation Pace",
      value: fallbackText(
        current.accumulation30dPct !== null
          ? formatPercent(current.accumulation30dPct)
          : null,
      ),
      tone:
        current.accumulation30dPct !== null && current.accumulation30dPct >= 0
          ? "text-orange-200"
          : "text-rose-200",
    },
    {
      label: "BTC NAV Per Share",
      value: fallbackText(
        current.btcNavPerShareUsd !== null
          ? formatCurrency(current.btcNavPerShareUsd)
          : null,
      ),
      tone: "text-fuchsia-200",
    },
    {
      label: "Estimated BPS",
      value: fallbackText(
        current.estimatedBps !== null
          ? `${formatPreciseNumber(current.estimatedBps)} BTC/share`
          : null,
      ),
      tone: "text-cyan-200",
    },
    {
      label: "Estimated BTC Yield 30D",
      value: fallbackText(
        current.estimatedBtcYield30dPct !== null
          ? formatPercent(current.estimatedBtcYield30dPct)
          : null,
      ),
      tone:
        current.estimatedBtcYield30dPct !== null &&
        current.estimatedBtcYield30dPct >= 0
          ? "text-amber-200"
          : "text-rose-200",
    },
  ];

  return (
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
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
