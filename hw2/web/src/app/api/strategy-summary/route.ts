import { NextResponse } from "next/server";
import { generateStrategySummary, hasOpenAiSummaryEnabled } from "@/lib/ai-summary";
import { DATA_REVALIDATE_SECONDS } from "@/lib/config";
import { getStrategyDashboardData } from "@/lib/transform";

export const dynamic = "force-dynamic";

export async function GET() {
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
    const data = await getStrategyDashboardData(365);
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
