/* Hand-built SVG charts: no chart library, theme-matched, print-safe. */

const pct = (n: number) => `${n % 1 === 0 ? n : n.toFixed(1)}%`;

/** Semicircle gauge for the 0–100 fit index. */
export function Gauge({ value, label }: { value: number; label: string }) {
  const r = 80, cx = 100, cy = 96;
  const angle = Math.PI * (1 - Math.min(100, Math.max(0, value)) / 100);
  const x = cx + r * Math.cos(angle), y = cy - r * Math.sin(angle);
  const large = 0;
  const tone = value >= 70 ? "var(--high)" : value >= 45 ? "var(--medium)" : "var(--low)";
  return (
    <svg viewBox="0 0 200 116" className="gauge" role="img" aria-label={`${label}: ${value} out of 100`}>
      <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`} fill="none" stroke="var(--line)" strokeWidth="14" strokeLinecap="round" />
      {value > 0 && (
        <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 ${large} 1 ${x.toFixed(2)} ${y.toFixed(2)}`} fill="none" stroke={tone} strokeWidth="14" strokeLinecap="round" />
      )}
      <text x={cx} y={cy - 12} textAnchor="middle" className="gauge-num">{value}</text>
      <text x={cx} y={cy + 12} textAnchor="middle" className="gauge-cap">{label}</text>
    </svg>
  );
}

/** Stepped funnel of stage probabilities. */
export function Funnel({ steps }: { steps: { stage: string; probability: number }[] }) {
  return (
    <div className="funnel" role="img" aria-label={steps.map((s) => `${s.stage} ${pct(s.probability)}`).join(", ")}>
      {steps.map((s, i) => (
        <div key={s.stage} className="funnel-row">
          <span className="funnel-label">{s.stage}</span>
          <span className="funnel-track">
            <span className={`funnel-bar ${i === steps.length - 1 ? "is-last" : ""}`} style={{ width: `${Math.max(1.5, s.probability)}%` }} />
          </span>
          <span className="funnel-val">{pct(s.probability)}</span>
        </div>
      ))}
    </div>
  );
}

/** 0–10 factor bars with weights. */
export function FactorBars({ factors }: { factors: { label: string; weight: number; score: number }[] }) {
  return (
    <div className="factors" role="img" aria-label={factors.map((f) => `${f.label} ${f.score} of 10`).join(", ")}>
      {factors.map((f) => (
        <div key={f.label} className="factor-row">
          <span className="factor-label">{f.label}<span className="factor-w">{Math.round(f.weight * 100)}%</span></span>
          <span className="factor-track">
            {Array.from({ length: 10 }, (_, i) => (
              <span key={i} className={i < Math.round(f.score) ? `on s-${f.score >= 7 ? "hi" : f.score >= 4 ? "mid" : "lo"}` : ""} />
            ))}
          </span>
          <span className="factor-val">{f.score % 1 === 0 ? f.score : f.score.toFixed(1)}</span>
        </div>
      ))}
    </div>
  );
}

/** Column chart for cheque-size likelihood, with the founder's round highlighted. */
export function ChequeChart({ data, highlight }: { data: { bucket: string; probability: number }[]; highlight: string }) {
  const max = Math.max(...data.map((d) => d.probability), 1);
  return (
    <div className="cols cols-cheque" role="img" aria-label={data.map((d) => `${d.bucket}: ${d.probability}%`).join(", ")}>
      {data.map((d) => {
        const hi = d.bucket === highlight;
        return (
          <div key={d.bucket} className={`col ${hi ? "is-hi" : ""}`}>
            <span className="col-plot">
              <span className="col-val">{d.probability}%</span>
              <span className="col-bar" style={{ height: `${Math.max(2, (d.probability / max) * 100)}%` }} />
            </span>
            <span className="col-label">{d.bucket}</span>
            <span className="col-note">{hi ? "your full round" : "\u00a0"}</span>
          </div>
        );
      })}
    </div>
  );
}

/** Deals per month over the last 12 months. */
export function ActivityChart({ data }: { data: { label: string; deals: number }[] }) {
  const max = Math.max(...data.map((d) => d.deals), 1);
  const total = data.reduce((s, d) => s + d.deals, 0);
  return (
    <div className="cols cols-activity" role="img" aria-label={`${total} deals reported in 12 months`}>
      {data.map((d, i) => (
        <div key={i} className={`col ${i >= data.length - 3 ? "is-hi" : ""}`}>
          <span className="col-plot">
            {d.deals > 0 && <span className="col-val">{d.deals}</span>}
            {d.deals > 0 && <span className="col-bar" style={{ height: `${(d.deals / max) * 100}%` }} />}
          </span>
          <span className="col-label">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

const MIX_COLORS = ["var(--forest)", "#4d8a6e", "#8fbca5", "var(--cobalt)", "#9aa9e8", "var(--line-2)"];

/** One stacked bar with a legend: sector mix of recent deals. */
export function SectorMix({ data }: { data: { sector: string; count: number }[] }) {
  const total = data.reduce((s, d) => s + d.count, 0) || 1;
  return (
    <div className="mix">
      <div className="mix-bar" role="img" aria-label={data.map((d) => `${d.sector} ${d.count}`).join(", ")}>
        {data.map((d, i) => (
          <span key={d.sector} style={{ width: `${(d.count / total) * 100}%`, background: MIX_COLORS[i % MIX_COLORS.length] }} />
        ))}
      </div>
      <ul className="mix-legend">
        {data.map((d, i) => (
          <li key={d.sector}>
            <span className="swatch" style={{ background: MIX_COLORS[i % MIX_COLORS.length] }} />
            {d.sector}<span className="mix-n">{d.count}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Horizontal bars comparing scale of portfolio brands with the founder's company. */
export function ScaleBars({ rows, unit }: { rows: { name: string; value: number; us?: boolean }[]; unit: string }) {
  const max = Math.max(...rows.map((r) => r.value), 1);
  return (
    <div className="scale" role="img" aria-label={rows.map((r) => `${r.name} ₹${r.value} Cr`).join(", ")}>
      {rows.map((r) => (
        <div key={r.name} className={`scale-row ${r.us ? "is-us" : ""}`}>
          <span className="scale-name">{r.name}</span>
          <span className="scale-track">
            <span className="scale-bar" style={{ width: `${Math.max(1.5, (r.value / max) * 100)}%` }} />
          </span>
          <span className="scale-val">₹{r.value >= 100 ? Math.round(r.value) : r.value} Cr</span>
        </div>
      ))}
      <p className="scale-unit">{unit}</p>
    </div>
  );
}
