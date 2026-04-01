"use client";

import { useState, useTransition } from "react";
import { AiSummary } from "@/components/ai-summary";
import { DashboardHeader } from "@/components/dashboard-header";
import { IndicatorExplainer } from "@/components/indicator-explainer";
import { MetricChart } from "@/components/metric-chart";
import { SummaryCards } from "@/components/summary-cards";
import type { StrategyDashboardData } from "@/lib/types";

type DashboardProps = {
  data: StrategyDashboardData;
  summary: string | null;
  summaryEnabled: boolean;
};

const RANGE_OPTIONS = [
  { label: "1W", days: 7 },
  { label: "1M", days: 30 },
  { label: "6M", days: 180 },
  { label: "1Y", days: 365 },
] as const;

function isDashboardErrorPayload(
  value: StrategyDashboardData | { error?: string },
): value is { error?: string } {
  return "error" in value;
}

export function Dashboard({ data, summary, summaryEnabled }: DashboardProps) {
  const [dashboardData, setDashboardData] = useState(data);
  const [aiSummary, setAiSummary] = useState(summary);
  const [aiSummaryEnabled, setAiSummaryEnabled] = useState(summaryEnabled);
  const [selectedDays, setSelectedDays] = useState(data.meta.rangeDays);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleRangeChange(days: number) {
    if (days === selectedDays) {
      return;
    }

    startTransition(async () => {
      try {
        setLoadError(null);
        const dataResponse = await fetch(`/api/strategy-mnav?days=${days}`, {
          cache: "no-store",
        });
        const dataPayload = (await dataResponse.json()) as
          | StrategyDashboardData
          | { error?: string };

        if (!dataResponse.ok || isDashboardErrorPayload(dataPayload)) {
          throw new Error(
            isDashboardErrorPayload(dataPayload)
              ? dataPayload.error || "Unknown dashboard API error"
              : "Unknown dashboard API error",
          );
        }

        setDashboardData(dataPayload);
        setSelectedDays(days);

        const summaryResponse = await fetch(`/api/strategy-summary?days=${days}`, {
          cache: "no-store",
        });

        if (summaryResponse.ok) {
          const summaryPayload = (await summaryResponse.json()) as {
            enabled?: boolean;
            summary?: string | null;
          };
          if (summaryPayload.enabled === false) {
            setAiSummaryEnabled(false);
            setAiSummary(null);
          } else {
            setAiSummaryEnabled(true);
            setAiSummary(summaryPayload.summary ?? null);
          }
        } else {
          setAiSummary(null);
        }
      } catch (error) {
        setLoadError(
          error instanceof Error ? error.message : "Unknown range-switch error",
        );
      }
    });
  }

  const rangeSelector = (
    <div className="flex flex-wrap items-center gap-2">
      {RANGE_OPTIONS.map((option) => {
        const isActive = option.days === selectedDays;
        return (
          <button
            key={option.days}
            type="button"
            onClick={() => handleRangeChange(option.days)}
            className={`rounded-full border px-3 py-1.5 text-sm transition ${
              isActive
                ? "border-orange-300 bg-orange-400/20 text-orange-100"
                : "border-white/15 bg-white/5 text-slate-200 hover:border-white/30 hover:bg-white/10"
            }`}
            disabled={isPending}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );

  const rangeStatus = (
    <>
      <p>CoinGecko demo holdings history is capped at 1 year.</p>
      {isPending ? <p className="text-orange-200">Refreshing range...</p> : null}
      {loadError ? <p className="text-rose-200">{loadError}</p> : null}
    </>
  );

  return (
    <div className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-[-16rem] h-[36rem] w-[36rem] -translate-x-1/2 rounded-full bg-orange-400/25 blur-3xl" />
        <div className="absolute bottom-[-12rem] left-[-10rem] h-[24rem] w-[24rem] rounded-full bg-sky-500/20 blur-3xl" />
        <div className="absolute right-[-8rem] top-1/3 h-[22rem] w-[22rem] rounded-full bg-emerald-400/20 blur-3xl" />
      </div>

      <main className="relative mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-8 md:px-8 md:py-10">
        <DashboardHeader
          generatedAt={dashboardData.meta.generatedAt}
          marketCapSource={dashboardData.meta.marketCapSource}
        />

        <SummaryCards current={dashboardData.current} />
        <AiSummary enabled={aiSummaryEnabled} summary={aiSummary} />
        <MetricChart
          mode="mnav"
          series={dashboardData.series}
          rangeSelector={rangeSelector}
          statusNote={rangeStatus}
        />
        <MetricChart mode="valuation" series={dashboardData.series} />
        <IndicatorExplainer />

        <section className="rounded-2xl border border-white/20 bg-black/20 p-4 text-xs leading-6 text-slate-300">
          <p className="font-semibold uppercase tracking-[0.12em] text-slate-200">
            Notes
          </p>
          <ul className="mt-2 space-y-1">
            {dashboardData.notes.map((note) => (
              <li key={note}>- {note}</li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  );
}
