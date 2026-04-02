import { formatCurrency } from "@/lib/format";
import type { StrategySeriesRow } from "@/lib/types";

type PriceTableProps = {
  series: StrategySeriesRow[];
};

export function PriceTable({ series }: PriceTableProps) {
  if (series.length === 0) {
    return null;
  }

  const rows = [...series].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <section className="rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur-md md:p-6">
      <div className="flex flex-col gap-1 md:flex-row md:items-end md:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">
            Daily BTC and MSTR Prices
          </h3>
          <p className="mt-1 text-sm text-slate-300">
            BTC uses CoinGecko daily USD spot. MSTR uses Yahoo daily close.
          </p>
        </div>
        <p className="text-xs uppercase tracking-[0.12em] text-slate-400">
          {rows.length} daily rows
        </p>
      </div>

      <div className="mt-4 max-h-[28rem] overflow-auto rounded-xl border border-white/10">
        <table className="min-w-full border-collapse text-left text-sm text-slate-100">
          <thead className="sticky top-0 bg-slate-950/90 backdrop-blur-md">
            <tr className="border-b border-white/15 text-xs uppercase tracking-[0.12em] text-slate-300">
              <th className="py-3 pl-4 pr-4">Date</th>
              <th className="py-3 pr-4">BTC Price</th>
              <th className="py-3 pr-4">MSTR Price</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.date} className="border-b border-white/10">
                <td className="py-3 pl-4 pr-4 text-slate-200">{row.date}</td>
                <td className="py-3 pr-4 text-amber-100">
                  {formatCurrency(row.btcPriceUsd)}
                </td>
                <td className="py-3 pr-4 text-sky-100">
                  {row.mstrPriceUsd !== null
                    ? formatCurrency(row.mstrPriceUsd)
                    : "Unavailable"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
