"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  formatCurrencyCompact,
  formatNumber,
  formatPercent,
  formatPreciseNumber,
} from "@/lib/format";
import type { StrategySeriesRow } from "@/lib/types";

type MetricChartMode =
  | "mnav"
  | "valuation"
  | "costBasis"
  | "perShare"
  | "treasury";

type MetricChartProps = {
  mode: MetricChartMode;
  series: StrategySeriesRow[];
};

function formatDateLabel(value: string) {
  const date = new Date(value);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function getChartCopy(mode: MetricChartMode) {
  switch (mode) {
    case "mnav":
      return {
        title: "mNAV Daily Time Series",
        description:
          "Reference line at 1.0 separates premium and discount regimes.",
      };
    case "valuation":
      return {
        title: "BTC NAV vs Market Cap",
        description:
          "Comparing BTC NAV and equity valuation shows when market value diverges from treasury value.",
      };
    case "costBasis":
      return {
        title: "BTC Spot vs Average Entry",
        description:
          "Unrealized PnL is derived from reconstructed BTC average entry price versus BTC spot.",
      };
    case "perShare":
      return {
        title: "Per-Share Treasury Exposure",
        description:
          "BTC NAV per share and Estimated BPS translate treasury size into per-share terms.",
      };
    case "treasury":
      return {
        title: "Treasury Activity and BTC Yield",
        description:
          "30D accumulation pace and Estimated BTC Yield show treasury growth and share-efficiency momentum.",
      };
  }
}

function formatTooltipValue(value: number, name: string) {
  if (
    name === "BTC NAV" ||
    name === "Market Cap" ||
    name === "BTC Spot" ||
    name === "Avg Entry Price" ||
    name === "BTC NAV / Share"
  ) {
    return formatCurrencyCompact(value);
  }
  if (
    name === "Unrealized PnL %" ||
    name === "30D Accumulation Pace" ||
    name === "Estimated BTC Yield 30D"
  ) {
    return formatPercent(value);
  }
  if (name === "Estimated BPS" || name === "mNAV") {
    return name === "Estimated BPS"
      ? `${formatPreciseNumber(value)} BTC/share`
      : formatNumber(value);
  }
  return formatNumber(value);
}

export function MetricChart({ mode, series }: MetricChartProps) {
  const copy = getChartCopy(mode);

  return (
    <article className="rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur-md md:p-6">
      <div className="mb-5">
        <h3 className="text-lg font-semibold text-white">{copy.title}</h3>
        <p className="mt-1 text-sm text-slate-300">{copy.description}</p>
      </div>
      <div className="h-[320px] w-full">
        <ResponsiveContainer>
          <LineChart data={series} margin={{ top: 8, right: 18, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.12)" />
            <XAxis
              dataKey="date"
              tickFormatter={formatDateLabel}
              tick={{ fill: "#cbd5e1", fontSize: 12 }}
              minTickGap={32}
            />

            {mode === "mnav" && (
              <YAxis
                width={72}
                tick={{ fill: "#cbd5e1", fontSize: 12 }}
                tickFormatter={(value) => formatNumber(Number(value))}
                domain={["auto", "auto"]}
              />
            )}

            {mode === "valuation" && (
              <YAxis
                width={84}
                tick={{ fill: "#cbd5e1", fontSize: 12 }}
                tickFormatter={(value) => formatCurrencyCompact(Number(value))}
              />
            )}

            {mode === "costBasis" && (
              <>
                <YAxis
                  yAxisId="left"
                  width={84}
                  tick={{ fill: "#cbd5e1", fontSize: 12 }}
                  tickFormatter={(value) => formatCurrencyCompact(Number(value))}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  width={72}
                  tick={{ fill: "#fda4af", fontSize: 12 }}
                  tickFormatter={(value) => formatPercent(Number(value))}
                  domain={["auto", "auto"]}
                />
              </>
            )}

            {mode === "perShare" && (
              <>
                <YAxis
                  yAxisId="left"
                  width={84}
                  tick={{ fill: "#cbd5e1", fontSize: 12 }}
                  tickFormatter={(value) => formatCurrencyCompact(Number(value))}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  width={84}
                  tick={{ fill: "#67e8f9", fontSize: 12 }}
                  tickFormatter={(value) => formatPreciseNumber(Number(value))}
                  domain={["auto", "auto"]}
                />
              </>
            )}

            {mode === "treasury" && (
              <YAxis
                width={84}
                tick={{ fill: "#cbd5e1", fontSize: 12 }}
                tickFormatter={(value) => formatPercent(Number(value))}
                domain={["auto", "auto"]}
              />
            )}

            <Tooltip
              contentStyle={{
                border: "1px solid rgba(255,255,255,0.2)",
                backgroundColor: "rgba(10, 17, 40, 0.95)",
                color: "#e2e8f0",
                borderRadius: "12px",
              }}
              labelFormatter={(label) => new Date(label).toLocaleDateString("en-US")}
              formatter={(value, name) => [
                formatTooltipValue(Number(value), String(name)),
                name,
              ]}
            />
            <Legend />

            {mode === "mnav" && (
              <>
                <ReferenceLine y={1} stroke="#f8fafc" strokeOpacity={0.4} />
                <Line
                  type="monotone"
                  dataKey="mNav"
                  name="mNAV"
                  stroke="#f97316"
                  strokeWidth={2.2}
                  dot={false}
                  activeDot={{ r: 4 }}
                  connectNulls
                />
              </>
            )}

            {mode === "valuation" && (
              <>
                <Line
                  type="monotone"
                  dataKey="btcNavUsd"
                  name="BTC NAV"
                  stroke="#38bdf8"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                  connectNulls
                />
                <Line
                  type="monotone"
                  dataKey="marketCapUsd"
                  name="Market Cap"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  dot={false}
                  connectNulls
                />
              </>
            )}

            {mode === "costBasis" && (
              <>
                <Line
                  type="monotone"
                  dataKey="btcPriceUsd"
                  name="BTC Spot"
                  yAxisId="left"
                  stroke="#38bdf8"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                  connectNulls
                />
                <Line
                  type="monotone"
                  dataKey="avgEntryPriceUsd"
                  name="Avg Entry Price"
                  yAxisId="left"
                  stroke="#f97316"
                  strokeWidth={2}
                  dot={false}
                  connectNulls
                />
                <Line
                  type="monotone"
                  dataKey="unrealizedPnlPct"
                  name="Unrealized PnL %"
                  yAxisId="right"
                  stroke="#fb7185"
                  strokeWidth={1.8}
                  dot={false}
                  connectNulls
                />
              </>
            )}

            {mode === "perShare" && (
              <>
                <Line
                  type="monotone"
                  dataKey="btcNavPerShareUsd"
                  name="BTC NAV / Share"
                  yAxisId="left"
                  stroke="#a855f7"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                  connectNulls
                />
                <Line
                  type="monotone"
                  dataKey="estimatedBps"
                  name="Estimated BPS"
                  yAxisId="right"
                  stroke="#22d3ee"
                  strokeWidth={1.8}
                  dot={false}
                  connectNulls
                />
              </>
            )}

            {mode === "treasury" && (
              <>
                <ReferenceLine y={0} stroke="#f8fafc" strokeOpacity={0.3} />
                <Line
                  type="monotone"
                  dataKey="accumulation30dPct"
                  name="30D Accumulation Pace"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                  connectNulls
                />
                <Line
                  type="monotone"
                  dataKey="estimatedBtcYield30dPct"
                  name="Estimated BTC Yield 30D"
                  stroke="#34d399"
                  strokeWidth={2}
                  dot={false}
                  connectNulls
                />
              </>
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </article>
  );
}
