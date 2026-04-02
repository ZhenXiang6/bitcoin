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

function buildSummaryPrompt(data: StrategyDashboardData) {
  const series = data.series;
  const latest = data.current;
  const ninetyDaysAgo = series.length > 90 ? series[series.length - 91] : series[0];

  return [
    "You are writing a concise market summary for a student dashboard.",
    "Focus only on Strategy mNAV and directly related valuation metrics.",
    "Write exactly 3 bullet points in plain English.",
    "Each bullet must be one sentence and under 30 words.",
    "Do not mention uncertainty, caveats, methodology, or external sources.",
    "",
    `Current mNAV: ${latest.mNav.toFixed(2)}`,
    `Current premium to NAV: ${latest.premiumToNavPct.toFixed(2)}%`,
    `Current BTC NAV: $${latest.btcNavUsd.toFixed(0)}`,
    `Current enterprise value: $${latest.enterpriseValueUsd.toFixed(0)}`,
    `Current BTC holdings: ${latest.btcHoldings.toFixed(2)} BTC`,
    `90-day ago mNAV: ${ninetyDaysAgo.mNav.toFixed(2)}`,
    `90-day ago BTC NAV: $${ninetyDaysAgo.btcNavUsd.toFixed(0)}`,
    `90-day ago enterprise value: $${ninetyDaysAgo.enterpriseValueUsd.toFixed(0)}`,
    "Summarize trend, valuation regime, and BTC linkage.",
  ].join("\n");
}

export async function generateStrategySummary(data: StrategyDashboardData) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return null;
  }

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
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`OpenAI summary request failed (${response.status}): ${text}`);
  }

  const payload = (await response.json()) as OpenAiResponse;
  return extractOutputText(payload);
}

export async function generateStrategySummaries(): Promise<StrategySummaryMap> {
  const summaries: StrategySummaryMap = {};

  if (!hasOpenAiSummaryEnabled()) {
    return summaries;
  }

  for (const days of SUMMARY_RANGE_DAYS) {
    const data = await getStrategyDashboardData(days);
    summaries[days] = await generateStrategySummary(data).catch(() => null);
  }

  return summaries;
}

export { hasOpenAiSummaryEnabled };
