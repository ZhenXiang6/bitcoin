import { Dashboard } from "@/components/dashboard";
import { getStrategyDashboardData } from "@/lib/transform";

export const revalidate = 1800;

async function loadDashboardData() {
  try {
    const data = await getStrategyDashboardData(365);
    return { data, error: null as string | null };
  } catch (error) {
    return {
      data: null,
      error:
        error instanceof Error
          ? error.message
          : "Unknown server error while loading dashboard data.",
    };
  }
}

export default async function Home() {
  const result = await loadDashboardData();

  if (result.error || !result.data) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-3xl items-center px-6 py-12">
        <section className="rounded-2xl border border-red-400/40 bg-red-500/10 p-6 text-red-100">
          <h1 className="text-xl font-semibold">Failed to load Strategy dashboard</h1>
          <p className="mt-3 text-sm leading-7 text-red-100/90">{result.error}</p>
          <p className="mt-4 text-xs text-red-100/80">
            Ensure `COINGECKO_API_KEY` and `FMP_API_KEY` are set in `web/.env.local`.
          </p>
        </section>
      </main>
    );
  }

  return <Dashboard data={result.data} />;
}
