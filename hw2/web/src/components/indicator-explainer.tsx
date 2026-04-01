export function IndicatorExplainer() {
  return (
    <section className="rounded-2xl border border-white/20 bg-white/10 p-5 text-sm leading-7 text-slate-100 backdrop-blur-md">
      <h2 className="text-lg font-semibold text-white">Indicator Definition</h2>
      <p className="mt-3">
        This project uses a market-cap-based mNAV definition:
        <span className="ml-2 rounded bg-black/30 px-2 py-1 font-mono text-xs text-orange-200">
          mNAV = MarketCap / (BTC_Holdings * BTC_Price)
        </span>
      </p>
      <p className="mt-3 text-slate-300">
        When mNAV is above 1, the equity market values Strategy above its
        marked BTC treasury value. When it is below 1, Strategy trades at a
        discount to BTC NAV.
      </p>
      <div className="mt-4 grid gap-3 text-slate-300 md:grid-cols-2">
        <p>
          <span className="font-semibold text-white">Unrealized PnL %</span>{" "}
          tracks whether Strategy&apos;s BTC cost basis is in profit relative to
          current BTC spot.
        </p>
        <p>
          <span className="font-semibold text-white">30D Accumulation Pace</span>{" "}
          measures how fast holdings expanded over the last 30 calendar days.
        </p>
        <p>
          <span className="font-semibold text-white">BTC NAV Per Share</span>{" "}
          estimates how much BTC-backed asset value sits behind each MSTR share.
        </p>
        <p>
          <span className="font-semibold text-white">Estimated BPS / BTC Yield</span>{" "}
          approximates Strategy&apos;s BTC-per-share efficiency using reported
          outstanding shares rather than fully diluted assumptions.
        </p>
      </div>
    </section>
  );
}
