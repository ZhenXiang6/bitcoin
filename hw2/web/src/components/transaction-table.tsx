import { formatCurrency, formatNumber } from "@/lib/format";
import type { StrategyTransaction } from "@/lib/types";

type TransactionTableProps = {
  transactions: StrategyTransaction[];
};

export function TransactionTable({ transactions }: TransactionTableProps) {
  if (transactions.length === 0) {
    return null;
  }

  return (
    <section className="rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur-md md:p-6">
      <h3 className="text-lg font-semibold text-white">Recent BTC Treasury Transactions</h3>
      <p className="mt-1 text-sm text-slate-300">
        Showing the latest transaction records returned from CoinGecko.
      </p>
      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full border-collapse text-left text-sm text-slate-100">
          <thead>
            <tr className="border-b border-white/20 text-xs uppercase tracking-[0.12em] text-slate-300">
              <th className="py-3 pr-4">Date</th>
              <th className="py-3 pr-4">Type</th>
              <th className="py-3 pr-4">Quantity (BTC)</th>
              <th className="py-3 pr-4">Value (USD)</th>
              <th className="py-3">Source</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((row) => (
              <tr key={`${row.date}-${row.quantity}`} className="border-b border-white/10">
                <td className="py-3 pr-4 text-slate-200">{row.date}</td>
                <td className="py-3 pr-4 capitalize text-orange-200">{row.transactionType}</td>
                <td className="py-3 pr-4">{formatNumber(row.quantity)}</td>
                <td className="py-3 pr-4">{formatCurrency(row.totalValueUsd)}</td>
                <td className="py-3">
                  {row.sourceUrl ? (
                    <a
                      href={row.sourceUrl}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="text-sky-300 underline decoration-sky-300/40 underline-offset-4 hover:text-sky-200"
                    >
                      Link
                    </a>
                  ) : (
                    <span className="text-slate-400">N/A</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
