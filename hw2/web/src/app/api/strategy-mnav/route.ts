import { NextResponse } from "next/server";
import { DATA_REVALIDATE_SECONDS } from "@/lib/config";
import { getStrategyDashboardData } from "@/lib/transform";

export const dynamic = "force-dynamic";

function parseDays(value: string | null) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return 365;
  }
  return Math.min(730, Math.max(30, Math.floor(parsed)));
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const days = parseDays(url.searchParams.get("days"));

  try {
    const data = await getStrategyDashboardData(days);
    return NextResponse.json(data, {
      headers: {
        "cache-control": `s-maxage=${DATA_REVALIDATE_SECONDS}, stale-while-revalidate=${DATA_REVALIDATE_SECONDS}`,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown server error",
      },
      { status: 500 },
    );
  }
}
