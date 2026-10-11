"use client";
import { useState } from "react";

export function BriefForm({
  onSubmit, disabled,
}: { onSubmit: (investor: string, firm: string) => void; disabled?: boolean }) {
  const [investor, setInvestor] = useState("");
  const [firm, setFirm] = useState("");
  const ready = investor.trim().length > 1 && firm.trim().length > 1;

  return (
    <form
      className="brief-form"
      onSubmit={(e) => { e.preventDefault(); if (ready && !disabled) onSubmit(investor.trim(), firm.trim()); }}
    >
      <label className="field">
        <span className="field-label">Investor</span>
        <input
          value={investor}
          onChange={(e) => setInvestor(e.target.value)}
          placeholder="Full name or LinkedIn profile URL"
          autoComplete="off"
          spellCheck={false}
          disabled={disabled}
          required
        />
      </label>
      <label className="field">
        <span className="field-label">Firm</span>
        <input
          value={firm}
          onChange={(e) => setFirm(e.target.value)}
          placeholder="Firm name or website"
          autoComplete="off"
          spellCheck={false}
          disabled={disabled}
          required
        />
      </label>
      <div className="form-foot">
        <button className="btn btn-primary btn-md" type="submit" disabled={!ready || disabled}>
          Prepare brief
        </button>
        <span className="form-hint">Six live research tracks, about 90 seconds.</span>
      </div>
    </form>
  );
}
