import { DashboardHeader } from "@/components/dashboard-header";
import { IndicatorExplainer } from "@/components/indicator-explainer";
import { MetricChart } from "@/components/metric-chart";
import { SummaryCards } from "@/components/summary-cards";
import { TransactionTable } from "@/components/transaction-table";
import type { StrategyDashboardData } from "@/lib/types";

type DashboardProps = {
  data: StrategyDashboardData;
};

export function Dashboard({ data }: DashboardProps) {
  return (
    <div className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-[-16rem] h-[36rem] w-[36rem] -translate-x-1/2 rounded-full bg-orange-400/25 blur-3xl" />
        <div className="absolute bottom-[-12rem] left-[-10rem] h-[24rem] w-[24rem] rounded-full bg-sky-500/20 blur-3xl" />
        <div className="absolute right-[-8rem] top-1/3 h-[22rem] w-[22rem] rounded-full bg-emerald-400/20 blur-3xl" />
      </div>

      <main className="relative mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-8 md:px-8 md:py-10">
        <DashboardHeader
          generatedAt={data.meta.generatedAt}
          marketCapSource={data.meta.marketCapSource}
        />
        <SummaryCards current={data.current} />
        <IndicatorExplainer />
        <MetricChart mode="mnav" series={data.series} />
        <MetricChart mode="valuation" series={data.series} />
        <MetricChart mode="costBasis" series={data.series} />
        <MetricChart mode="perShare" series={data.series} />
        <MetricChart mode="treasury" series={data.series} />
        <TransactionTable transactions={data.transactions} />

        <section className="rounded-2xl border border-white/20 bg-black/20 p-4 text-xs leading-6 text-slate-300">
          <p className="font-semibold uppercase tracking-[0.12em] text-slate-200">
            Notes
          </p>
          <ul className="mt-2 space-y-1">
            {data.notes.map((note) => (
              <li key={note}>- {note}</li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  );
}
