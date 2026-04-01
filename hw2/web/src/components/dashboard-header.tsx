type DashboardHeaderProps = {
  generatedAt: string;
  marketCapSource: string;
};

export function DashboardHeader({ generatedAt, marketCapSource }: DashboardHeaderProps) {
  const generatedText = new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: "UTC",
  }).format(new Date(generatedAt));

  return (
    <header className="rounded-3xl border border-white/20 bg-white/10 p-6 backdrop-blur-md md:p-8">
      <p className="text-sm uppercase tracking-[0.2em] text-orange-200">
        Digital Asset Treasury Dashboard
      </p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white md:text-5xl">
        Strategy mNAV Tracker
      </h1>
      <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-200 md:text-base">
        This dashboard aligns Strategy BTC holdings, BTC market price, and MSTR
        enterprise value into one daily series to visualize premium and
        valuation pressure over time. Data is cached and refreshed on an
        8-hour cycle so the site updates three times per day.
      </p>
      <p className="mt-5 text-xs text-slate-300">Last generated (UTC): {generatedText}</p>
      <p className="mt-1 text-xs text-slate-300">Valuation Source: {marketCapSource}</p>
    </header>
  );
}
