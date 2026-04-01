"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatCurrencyCompact, formatNumber } from "@/lib/format";
import type { StrategySeriesRow } from "@/lib/types";

type MetricChartProps = {
  mode: "mnav" | "valuation";
  series: StrategySeriesRow[];
};

function formatDateLabel(value: string) {
  const date = new Date(value);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function MetricChart({ mode, series }: MetricChartProps) {
  const isMnav = mode === "mnav";

  return (
    <article className="rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur-md md:p-6">
      <div className="mb-5">
        <h3 className="text-lg font-semibold text-white">
          {isMnav ? "mNAV Daily Time Series" : "BTC NAV vs Enterprise Value"}
        </h3>
        <p className="mt-1 text-sm text-slate-300">
          {isMnav
            ? "mNAV is the core DAT.co indicator on this site."
            : "This comparison shows how BTC treasury value and enterprise value combine into mNAV."}
        </p>
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
            <YAxis
              width={84}
              tick={{ fill: "#cbd5e1", fontSize: 12 }}
              tickFormatter={(value) =>
                isMnav
                  ? formatNumber(Number(value))
                  : formatCurrencyCompact(Number(value))
              }
            />
            <Tooltip
              contentStyle={{
                border: "1px solid rgba(255,255,255,0.2)",
                backgroundColor: "rgba(10, 17, 40, 0.95)",
                color: "#e2e8f0",
                borderRadius: "12px",
              }}
              labelFormatter={(label) => new Date(label).toLocaleDateString("en-US")}
              formatter={(value, name) => [
                isMnav
                  ? formatNumber(Number(value))
                  : formatCurrencyCompact(Number(value)),
                name,
              ]}
            />
            {isMnav ? (
              <>
                <ReferenceLine y={1} stroke="#f8fafc" strokeOpacity={0.4} />
                <Line
                  type="monotone"
                  dataKey="mNav"
                  name="mNAV"
                  stroke="#f97316"
                  strokeWidth={2.3}
                  dot={false}
                  activeDot={{ r: 4 }}
                  connectNulls
                />
              </>
            ) : (
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
                  dataKey="enterpriseValueUsd"
                  name="Enterprise Value"
                  stroke="#f59e0b"
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
