export function IndicatorExplainer() {
  return (
    <section className="rounded-2xl border border-white/20 bg-white/10 p-5 text-sm leading-7 text-slate-100 backdrop-blur-md">
      <h2 className="text-lg font-semibold text-white">Indicator Definition</h2>
      <p className="mt-3">
        This project uses CoinGecko&apos;s EV-based mNAV definition:
        <span className="ml-2 rounded bg-black/30 px-2 py-1 font-mono text-xs text-orange-200">
          mNAV = (Market Cap + Debt - Cash) / (BTC_Holdings * BTC_Price)
        </span>
      </p>
      <p className="mt-3 text-slate-300">
        When mNAV is above 1, Strategy&apos;s enterprise value exceeds the
        marked value of its BTC treasury. When it is below 1, enterprise value
        trades at a discount to BTC NAV.
      </p>
      <p className="mt-3 text-slate-300">
        The supporting view on this website is the comparison between{" "}
        <span className="font-semibold text-white">BTC NAV</span> and{" "}
        <span className="font-semibold text-white">Enterprise Value</span>,
        because mNAV is the ratio linking those two series.
      </p>
    </section>
  );
}
