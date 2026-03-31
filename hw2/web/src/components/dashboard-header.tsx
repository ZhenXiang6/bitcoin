type DashboardHeaderProps = {
  generatedAt: string;
};

export function DashboardHeader({ generatedAt }: DashboardHeaderProps) {
  const generatedText = new Date(generatedAt).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });

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
        market capitalization into one daily series to visualize premium and
        valuation pressure over time.
      </p>
      <p className="mt-5 text-xs text-slate-300">Last generated: {generatedText}</p>
    </header>
  );
}
