import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import {
  generateStrategySummaries,
  hasOpenAiSummaryEnabled,
} from "@/lib/ai-summary";
import { getStrategyDashboardData } from "@/lib/transform";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await getStrategyDashboardData(365);
    let summaryStatus = "disabled";

    if (hasOpenAiSummaryEnabled()) {
      await generateStrategySummaries();
      summaryStatus = "refreshed:7,30,180,365";
    }

    revalidatePath("/");

    return NextResponse.json({
      ok: true,
      summaryStatus,
      refreshedAt: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown refresh error",
      },
      { status: 500 },
    );
  }
}
