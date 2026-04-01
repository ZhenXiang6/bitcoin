import { NextResponse } from "next/server";
import { generateStrategySummary, hasOpenAiSummaryEnabled } from "@/lib/ai-summary";
import { DATA_REVALIDATE_SECONDS } from "@/lib/config";
import { getStrategyDashboardData } from "@/lib/transform";

export const dynamic = "force-dynamic";

const ALLOWED_DAYS = [7, 30, 180, 365] as const;

function parseDays(value: string | null) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return 365;
  }
  const normalized = Math.floor(parsed);
  return ALLOWED_DAYS.includes(normalized as (typeof ALLOWED_DAYS)[number])
    ? normalized
    : 365;
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
