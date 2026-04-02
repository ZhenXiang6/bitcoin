import { DATA_REVALIDATE_SECONDS, OPENAI_SUMMARY_MODEL, hasOpenAiSummaryEnabled } from "@/lib/config";
import type { StrategyDashboardData } from "@/lib/types";
import { getStrategyDashboardData } from "@/lib/transform";

export const SUMMARY_RANGE_DAYS = [7, 30, 180, 365] as const;
export type SummaryRangeDays = (typeof SUMMARY_RANGE_DAYS)[number];
export type StrategySummaryMap = Partial<Record<SummaryRangeDays, string | null>>;

type OpenAiResponse = {
  output_text?: string;
  output?: Array<{
    content?: Array<{
      type?: string;
      text?: string;
    }>;
  }>;
};

const RANGE_LABELS: Record<SummaryRangeDays, string> = {
  7: "1W",
  30: "1M",
  180: "6M",
  365: "1Y",
};

const SUBWINDOW_BY_RANGE: Record<SummaryRangeDays, number> = {
  7: 3,
  30: 7,
  180: 30,
  365: 90,
};
const OPENAI_TIMEOUT_MS = 15000;

function extractOutputText(payload: OpenAiResponse) {
  if (typeof payload.output_text === "string" && payload.output_text.trim().length > 0) {
    return payload.output_text.trim();
  }

  const text = payload.output
    ?.flatMap((item) => item.content ?? [])
    .filter((item) => item.type === "output_text" || item.type === "text")
    .map((item) => item.text ?? "")
    .join("\n")
    .trim();

  return text && text.length > 0 ? text : null;
}

function formatUsd(value: number | null) {
  if (value === null || !Number.isFinite(value)) {
    return "N/A";
  }
  return `$${value.toFixed(0)}`;
}

function getRowByLookbackDays(data: StrategyDashboardData, lookbackDays: number) {
  const { series } = data;
  if (series.length === 0) {
    return null;
  }
  const targetIndex = Math.max(0, series.length - 1 - lookbackDays);
  return series[targetIndex];
}

function getSummaryContext(data: StrategyDashboardData) {
  const rangeDays = (SUMMARY_RANGE_DAYS.includes(data.meta.rangeDays as SummaryRangeDays)
    ? data.meta.rangeDays
    : 365) as SummaryRangeDays;
  const rangeLabel = RANGE_LABELS[rangeDays];
  const subWindowDays = SUBWINDOW_BY_RANGE[rangeDays];
  const latest = data.current;
  const rangeStart = data.series[0] ?? null;
  const subWindowAgo = getRowByLookbackDays(data, subWindowDays);

  return {
    rangeDays,
    rangeLabel,
    subWindowDays,
    latest,
    rangeStart,
    subWindowAgo,
  };
}

function sliceDashboardSeriesByDays(data: StrategyDashboardData, days: SummaryRangeDays) {
  if (data.series.length === 0) {
    return data.series;
  }
  if (days === 365) {
    return data.series;
  }

  const latestDate = new Date(data.series[data.series.length - 1].date);
  latestDate.setUTCDate(latestDate.getUTCDate() - days);
  const cutoffDate = latestDate.toISOString().slice(0, 10);
  const sliced = data.series.filter((row) => row.date >= cutoffDate);
  return sliced.length > 0 ? sliced : [data.series[data.series.length - 1]];
}

function buildRangedDashboardData(
  data: StrategyDashboardData,
  days: SummaryRangeDays,
): StrategyDashboardData {
  return {
    ...data,
    meta: {
      ...data.meta,
      rangeDays: days,
    },
    series: sliceDashboardSeriesByDays(data, days),
  };
}

function buildSummaryPrompt(data: StrategyDashboardData) {
  const context = getSummaryContext(data);
  const {
    rangeLabel,
    subWindowDays,
    latest,
    rangeStart,
    subWindowAgo,
  } = context;

  return [
    "You are writing a concise market summary for a student dashboard.",
    "Focus only on Strategy mNAV and directly related valuation metrics.",
    `Use the selected time range (${rangeLabel}) as the primary comparison frame.`,
    "Write exactly 3 bullet points in plain English.",
    "Each bullet must be one sentence and under 30 words.",
    "Do not mention uncertainty, caveats, methodology, or external sources.",
    "",
    `Selected range: ${rangeLabel}`,
    `Current mNAV: ${latest.mNav.toFixed(2)}`,
    `Current premium to NAV: ${latest.premiumToNavPct.toFixed(2)}%`,
    `Current BTC NAV: ${formatUsd(latest.btcNavUsd)}`,
    `Current enterprise value: ${formatUsd(latest.enterpriseValueUsd)}`,
    `Current BTC holdings: ${latest.btcHoldings.toFixed(2)} BTC`,
    `Current BTC price: ${formatUsd(latest.btcPriceUsd)}`,
    `Current MSTR price: ${formatUsd(latest.mstrPriceUsd)}`,
    `Range-start mNAV: ${rangeStart ? rangeStart.mNav.toFixed(2) : "N/A"}`,
    `Range-start BTC NAV: ${formatUsd(rangeStart?.btcNavUsd ?? null)}`,
    `Range-start enterprise value: ${formatUsd(rangeStart?.enterpriseValueUsd ?? null)}`,
    `${subWindowDays}-day-ago mNAV: ${subWindowAgo ? subWindowAgo.mNav.toFixed(2) : "N/A"}`,
    `${subWindowDays}-day-ago BTC NAV: ${formatUsd(subWindowAgo?.btcNavUsd ?? null)}`,
    `${subWindowDays}-day-ago enterprise value: ${formatUsd(subWindowAgo?.enterpriseValueUsd ?? null)}`,
    "Summarize trend, valuation regime, and BTC linkage.",
  ].join("\n");
}

export async function generateStrategySummary(data: StrategyDashboardData) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return null;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), OPENAI_TIMEOUT_MS);
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: OPENAI_SUMMARY_MODEL,
      reasoning: { effort: "minimal" },
      text: { format: { type: "text" } },
      max_output_tokens: 180,
      input: buildSummaryPrompt(data),
    }),
    next: { revalidate: DATA_REVALIDATE_SECONDS },
    signal: controller.signal,
  }).finally(() => clearTimeout(timeoutId));

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`OpenAI summary request failed (${response.status}): ${text}`);
  }

  const payload = (await response.json()) as OpenAiResponse;
  return extractOutputText(payload);
}

export async function generateStrategySummaries(
  baseData?: StrategyDashboardData,
): Promise<StrategySummaryMap> {
  const summaries: StrategySummaryMap = {};

  if (!hasOpenAiSummaryEnabled()) {
    return summaries;
  }

  const oneYearData = baseData ?? (await getStrategyDashboardData(365));

  const results = await Promise.all(
    SUMMARY_RANGE_DAYS.map(async (days) => {
      try {
        const rangedData = buildRangedDashboardData(oneYearData, days);
        const summary = await generateStrategySummary(rangedData);
        return [days, summary] as const;
      } catch {
        return [days, null] as const;
      }
    }),
  );

  for (const [days, summary] of results) {
    summaries[days] = summary;
  }

  return summaries;
}

export { hasOpenAiSummaryEnabled };
