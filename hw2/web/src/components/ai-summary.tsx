type AiSummaryProps = {
  summary: string | null;
};

export function AiSummary({ summary }: AiSummaryProps) {
  if (!summary) {
    return null;
  }

  const lines = summary
    .split("\n")
    .map((line) => line.trim().replace(/^[-*•]\s*/, ""))
    .filter((line) => line.length > 0);

  return (
    <section className="rounded-2xl border border-white/20 bg-white/10 p-5 text-sm leading-7 text-slate-100 backdrop-blur-md">
      <h2 className="text-lg font-semibold text-white">AI Summary</h2>
      <p className="mt-2 text-slate-300">
        Generated from the latest cached mNAV dataset using a low-cost OpenAI model.
      </p>
      <ul className="mt-4 space-y-2 text-slate-100">
        {lines.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
    </section>
  );
}
