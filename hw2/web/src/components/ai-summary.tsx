type AiSummaryProps = {
  enabled: boolean;
  summary: string | null;
};

function AiSummaryShell({
  children,
  subtitle,
}: {
  children: React.ReactNode;
  subtitle: string;
}) {
  return (
    <section className="relative overflow-hidden rounded-3xl border border-orange-300/30 bg-[linear-gradient(135deg,rgba(251,146,60,0.18),rgba(15,23,42,0.88)_42%,rgba(56,189,248,0.12))] p-5 shadow-[0_24px_80px_rgba(15,23,42,0.35)] backdrop-blur-md md:p-6">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute right-[-4rem] top-[-4rem] h-28 w-28 rounded-full bg-orange-300/20 blur-3xl" />
        <div className="absolute bottom-[-5rem] left-[-3rem] h-32 w-32 rounded-full bg-sky-400/10 blur-3xl" />
      </div>
      <div className="relative">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-2xl border border-orange-200/30 bg-orange-300/15 text-orange-100">
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6L12 3z" />
              <path d="M19 14l.9 2.1L22 17l-2.1.9L19 20l-.9-2.1L16 17l2.1-.9L19 14z" />
            </svg>
          </div>
          <div>
            <h2 className="text-xl font-semibold text-white md:text-2xl">
              AI Summary
            </h2>
            <p className="mt-1 text-sm leading-6 text-slate-200">{subtitle}</p>
          </div>
        </div>
        <div className="mt-5">{children}</div>
      </div>
    </section>
  );
}

export function AiSummary({ enabled, summary }: AiSummaryProps) {
  if (!enabled) {
    return (
      <AiSummaryShell subtitle="Low-cost model summary for the current mNAV regime and BTC linkage.">
        <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm leading-7 text-slate-200">
          Add `OPENAI_API_KEY` in `web/.env.local` to enable this block.
        </div>
      </AiSummaryShell>
    );
  }

  if (!summary) {
    return (
      <AiSummaryShell subtitle="Low-cost model summary for the current mNAV regime and BTC linkage.">
        <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm leading-7 text-slate-200">
          AI summary is enabled, but no summary text was returned for the current range.
        </div>
      </AiSummaryShell>
    );
  }

  const lines = summary
    .split("\n")
    .map((line) => line.trim().replace(/^[-*•]\s*/, ""))
    .filter((line) => line.length > 0);

  return (
    <AiSummaryShell subtitle="Generated from the latest cached mNAV dataset using a low-cost OpenAI model.">
      <div className="rounded-2xl border border-white/10 bg-black/20 p-4 md:p-5">
        <ul className="space-y-3 text-sm leading-7 text-slate-100 md:text-base">
          {lines.map((line) => (
            <li key={line} className="flex gap-3">
              <span className="mt-2 block h-2 w-2 shrink-0 rounded-full bg-orange-300" />
              <span>{line}</span>
            </li>
          ))}
        </ul>
      </div>
    </AiSummaryShell>
  );
}
