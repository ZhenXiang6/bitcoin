import { NextResponse } from "next/server";
import {
  generateStrategySummaries,
  generateStrategySummary,
  hasOpenAiSummaryEnabled,
  SUMMARY_RANGE_DAYS,
  type SummaryRangeDays,
} from "@/lib/ai-summary";
import { DATA_REVALIDATE_SECONDS } from "@/lib/config";
import { getStrategyDashboardData } from "@/lib/transform";

export const dynamic = "force-dynamic";

function parseDays(value: string | null) {
  if (value === null) {
    return null;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return 365 as SummaryRangeDays;
  }
  const normalized = Math.floor(parsed);
  return SUMMARY_RANGE_DAYS.includes(normalized as SummaryRangeDays)
    ? (normalized as SummaryRangeDays)
    : (365 as SummaryRangeDays);
}

export async function GET(request: Request) {
  if (!hasOpenAiSummaryEnabled()) {
    return NextResponse.json(
      { enabled: false, summary: null },
      {
        headers: {
          "cache-control": `s-maxage=${DATA_REVALIDATE_SECONDS}, stale-while-revalidate=${DATA_REVALIDATE_SECONDS}`,
        },
      },
    );
  }

  try {
    const url = new URL(request.url);
    const days = parseDays(url.searchParams.get("days"));
    if (days === null) {
      const baseData = await getStrategyDashboardData(365);
      const summaries = await generateStrategySummaries(baseData);
      return NextResponse.json(
        { enabled: true, summaries },
        {
          headers: {
            "cache-control": `s-maxage=${DATA_REVALIDATE_SECONDS}, stale-while-revalidate=${DATA_REVALIDATE_SECONDS}`,
          },
        },
      );
    }

    const data = await getStrategyDashboardData(days);
    const summary = await generateStrategySummary(data);
    return NextResponse.json(
      { enabled: true, summary },
      {
        headers: {
          "cache-control": `s-maxage=${DATA_REVALIDATE_SECONDS}, stale-while-revalidate=${DATA_REVALIDATE_SECONDS}`,
        },
      },
    );
  } catch (error) {
    return NextResponse.json(
      {
        enabled: true,
        error: error instanceof Error ? error.message : "Unknown server error",
      },
      { status: 500 },
    );
  }
}
