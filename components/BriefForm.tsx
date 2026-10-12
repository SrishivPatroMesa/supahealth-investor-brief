"use client";
import { useEffect, useRef, useState } from "react";

export type Preset = { investor: string; firm: string; nonce: number };

const EXAMPLES: [string, string][] = [
  ["Kanwaljit Singh", "Fireside Ventures"],
  ["Deepak Shahdadpuri", "DSG Consumer Partners"],
  ["Vani Kola", "Kalaari Capital"],
];

export function BriefForm({
  onSubmit, disabled, preset,
}: { onSubmit: (investor: string, firm: string) => void; disabled?: boolean; preset?: Preset | null }) {
  const [investor, setInvestor] = useState("");
  const [firm, setFirm] = useState("");
  const ready = investor.trim().length > 1 && firm.trim().length > 1;
  const invRef = useRef<HTMLInputElement>(null);
  const firmRef = useRef<HTMLInputElement>(null);
  const [touched, setTouched] = useState(false);
  const missing = !investor.trim() ? "investor" : !firm.trim() ? "firm" : null;

  useEffect(() => {
    if (!preset) return;
    setInvestor(preset.investor); setFirm(preset.firm); setTouched(true);
    setTimeout(() => { if (!preset.investor) invRef.current?.focus(); else if (!preset.firm) firmRef.current?.focus(); }, 300);
  }, [preset]);

  return (
    <form
      className="brief-form"
      onSubmit={(e) => { e.preventDefault(); if (ready && !disabled) onSubmit(investor.trim(), firm.trim()); }}
    >
      <div className="form-row">
        <label className="field">
          <span className="field-label">Investor</span>
          <input ref={invRef} className={touched && !investor.trim() ? "is-missing" : ""} value={investor} onChange={(e) => setInvestor(e.target.value)} placeholder="Full name or LinkedIn URL"
            autoComplete="off" spellCheck={false} disabled={disabled} required />
        </label>
        <label className="field">
          <span className="field-label">Firm</span>
          <input ref={firmRef} className={touched && !firm.trim() ? "is-missing" : ""} value={firm} onChange={(e) => setFirm(e.target.value)} placeholder="Firm name or website"
            autoComplete="off" spellCheck={false} disabled={disabled} required />
        </label>
      </div>
      <div className="form-foot">
        <button className="btn btn-primary btn-md" type="submit" disabled={!ready || disabled}>Prepare brief</button>
        <span className={`form-hint ${!ready && (touched || investor || firm) ? "is-warn" : ""}`}>
          {ready ? "Six live research tracks, about 90 seconds." : missing === "investor" && (touched || firm) ? "Add the investor's name to continue." : missing === "firm" && (touched || investor) ? "Add the firm to continue." : "Enter both the investor and the firm."}
        </span>
      </div>
      <div className="try">
        <span className="try-label">Try</span>
        {EXAMPLES.map(([i, f]) => (
          <button key={i} type="button" className="try-chip" onClick={() => { setInvestor(i); setFirm(f); setTouched(false); }}>
            {i}<span>{f}</span>
          </button>
        ))}
      </div>
    </form>
  );
}
