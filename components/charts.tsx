/* Hand-built SVG/CSS charts: no chart library, theme-matched, print-safe. */

const pct = (n: number) => `${n % 1 === 0 ? n : n.toFixed(1)}%`;
export const scoreTone = (s10: number) => (s10 >= 7 ? "var(--emerald)" : s10 >= 4 ? "var(--amber)" : "var(--rose)");

/** Ring for a 0–100 score. */
export function Ring({ value, size = 120, stroke = 12, label, dark }: { value: number; size?: number; stroke?: number; label?: string; dark?: boolean }) {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(100, value));
  const id = `ring-${size}-${Math.round(v)}`;
  return (
    <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} className={`ring ${dark ? "ring-dark" : ""}`} role="img" aria-label={`${label ?? "Score"} ${v} of 100`}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#5B5BF7" />
          <stop offset="100%" stopColor="#14B8A6" />
        </linearGradient>
      </defs>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={dark ? "rgba(255,255,255,.12)" : "var(--line)"} strokeWidth={stroke} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={`url(#${id})`} strokeWidth={stroke} strokeLinecap="round"
        strokeDasharray={`${(v / 100) * c} ${c}`} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central" className="ring-num" style={{ fontSize: size * 0.3 }}>{Math.round(v)}</text>
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
            <span className={`funnel-bar f-${i}`} style={{ width: `${Math.max(2, s.probability)}%` }} />
          </span>
          <span className="funnel-val">{pct(s.probability)}</span>
        </div>
      ))}
    </div>
  );
}

/** Radar of the eight 0–10 factors. */
export function Radar({ factors }: { factors: { label: string; score: number }[] }) {
  const S = 300, cx = S / 2, cy = S / 2, R = 104, n = factors.length;
  const pt = (i: number, r: number) => {
    const a = -Math.PI / 2 + (i / n) * Math.PI * 2;
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  };
  const poly = factors.map((f, i) => pt(i, (Math.max(0, Math.min(10, f.score)) / 10) * R).join(",")).join(" ");
  return (
    <svg viewBox={`0 0 ${S} ${S}`} className="radar" role="img" aria-label={factors.map((f) => `${f.label} ${f.score}`).join(", ")}>
      {[0.25, 0.5, 0.75, 1].map((k) => (
        <polygon key={k} points={factors.map((_, i) => pt(i, R * k).join(",")).join(" ")} fill="none" stroke="var(--line)" />
      ))}
      {factors.map((_, i) => {
        const [x, y] = pt(i, R);
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="var(--line)" />;
      })}
      <polygon points={poly} fill="rgba(91,91,247,.18)" stroke="var(--indigo)" strokeWidth="2" strokeLinejoin="round" />
      {factors.map((f, i) => {
        const [x, y] = pt(i, (f.score / 10) * R);
        return <circle key={i} cx={x} cy={y} r="3.5" fill={scoreTone(f.score)} stroke="#fff" strokeWidth="1.5" />;
      })}
      {factors.map((f, i) => {
        const [x, y] = pt(i, R + 22);
        const anchor = Math.abs(x - cx) < 8 ? "middle" : x > cx ? "start" : "end";
        return (
          <text key={i} x={x} y={y} textAnchor={anchor} dominantBaseline="central" className="radar-label">
            {f.label.replace("No portfolio conflict", "No conflict").replace("Connection warmth", "Warmth").replace("Actively deploying", "Deploying").replace("Cheque size match", "Cheque").replace(" match", "").replace(" alignment", "")}
          </text>
        );
      })}
    </svg>
  );
}

/** 0–10 factor bars with weights. */
export function FactorBars({ factors }: { factors: { label: string; weight: number; score: number }[] }) {
  return (
    <div className="factors" role="img" aria-label={factors.map((f) => `${f.label} ${f.score} of 10`).join(", ")}>
      {factors.map((f) => (
        <div key={f.label} className="factor-row">
          <span className="factor-label">{f.label}<span className="factor-w">{Math.round(f.weight * 100)}%</span></span>
          <span className="factor-track"><span style={{ width: `${f.score * 10}%`, background: scoreTone(f.score) }} /></span>
          <span className="factor-val">{f.score % 1 === 0 ? f.score : f.score.toFixed(1)}</span>
        </div>
      ))}
    </div>
  );
}

/** Column chart for cheque-size likelihood. */
export function ChequeChart({ data, highlight, compact }: { data: { bucket: string; probability: number }[]; highlight: string; compact?: boolean }) {
  const max = Math.max(...data.map((d) => d.probability), 1);
  return (
    <div className={`cols ${compact ? "cols-compact" : ""}`} role="img" aria-label={data.map((d) => `${d.bucket}: ${d.probability}%`).join(", ")}>
      {data.map((d) => {
        const hi = d.bucket === highlight;
        return (
          <div key={d.bucket} className={`col ${hi ? "is-hi" : ""}`}>
            <span className="col-plot">
              <span className="col-val">{d.probability}%</span>
              <span className="col-bar" style={{ height: `${Math.max(3, (d.probability / max) * 100)}%` }} />
            </span>
            <span className="col-label">{d.bucket}</span>
            {!compact && <span className="col-note">{hi ? "your round" : "\u00a0"}</span>}
          </div>
        );
      })}
    </div>
  );
}

/** Deals per month over the last 12 months. */
export function ActivityChart({ data }: { data: { label: string; deals: number }[] }) {
  const max = Math.max(...data.map((d) => d.deals), 1);
  return (
    <div className="cols cols-activity" role="img" aria-label={data.map((d) => `${d.label} ${d.deals}`).join(", ")}>
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

export const PALETTE = ["#5B5BF7", "#14B8A6", "#F59E0B", "#EC4899", "#0EA5E9", "#8B5CF6", "#94A3B8"];

/** Donut with legend for sector mix. */
export function Donut({ data }: { data: { sector: string; count: number }[] }) {
  const total = data.reduce((s, d) => s + d.count, 0) || 1;
  const R = 52, C = 2 * Math.PI * R;
  let acc = 0;
  return (
    <div className="donut-wrap">
      <svg viewBox="0 0 140 140" className="donut" role="img" aria-label={data.map((d) => `${d.sector} ${d.count}`).join(", ")}>
        <circle cx="70" cy="70" r={R} fill="none" stroke="var(--line)" strokeWidth="18" />
        {data.map((d, i) => {
          const len = (d.count / total) * C;
          const el = (
            <circle key={d.sector} cx="70" cy="70" r={R} fill="none" stroke={PALETTE[i % PALETTE.length]} strokeWidth="18"
              strokeDasharray={`${Math.max(0, len - 2)} ${C}`} strokeDashoffset={-acc} transform="rotate(-90 70 70)" />
          );
          acc += len;
          return el;
        })}
        <text x="70" y="64" textAnchor="middle" className="donut-num">{total}</text>
        <text x="70" y="84" textAnchor="middle" className="donut-cap">deals</text>
      </svg>
      <ul className="legend">
        {data.map((d, i) => (
          <li key={d.sector}><span className="swatch" style={{ background: PALETTE[i % PALETTE.length] }} />{d.sector}<span className="legend-n">{d.count}</span></li>
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
      {rows.map((r, i) => (
        <div key={r.name} className={`scale-row ${r.us ? "is-us" : ""}`}>
          <span className="scale-name">{r.name}</span>
          <span className="scale-track">
            <span className="scale-bar" style={{ width: `${Math.max(2, (r.value / max) * 100)}%`, background: r.us ? "var(--indigo)" : PALETTE[(i + 1) % PALETTE.length] }} />
          </span>
          <span className="scale-val">₹{r.value >= 100 ? Math.round(r.value) : r.value} Cr</span>
        </div>
      ))}
      <p className="scale-unit">{unit}</p>
    </div>
  );
}

/** Coloured monogram tile for a company or person. */
export function Monogram({ name, size = 36 }: { name: string; size?: number }) {
  const letters = name.replace(/\(.*?\)/g, "").split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "?";
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const c1 = PALETTE[h % 6], c2 = PALETTE[((h >>> 3) + 1) % 6];
  return (
    <span className="mono" style={{ width: size, height: size, fontSize: size * 0.38, background: `linear-gradient(135deg, ${c1}, ${c2})` }} aria-hidden="true">
      {letters}
    </span>
  );
}
