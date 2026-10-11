"use client";
import { useEffect, useState } from "react";
import type { StageId, TrackId } from "@/lib/types";

export type Status = "waiting" | "active" | "done" | "error";
export type LedgerState = {
  stages: Record<StageId, { status: Status; detail?: string }>;
  tracks: Record<TrackId, { status: Status; sources?: number; detail?: string }>;
};

export const initialLedger = (): LedgerState => ({
  stages: {
    parse: { status: "waiting" }, identity: { status: "waiting" }, research: { status: "waiting" },
    synthesis: { status: "waiting" }, validate: { status: "waiting" },
  },
  tracks: {
    portfolio: { status: "waiting" }, thesis: { status: "waiting" }, context: { status: "waiting" },
    comparables: { status: "waiting" }, person: { status: "waiting" }, network: { status: "waiting" },
  },
});

const STAGES: { id: StageId; label: string; doing: string }[] = [
  { id: "parse", label: "Read the inputs", doing: "Working out names and links" },
  { id: "identity", label: "Confirm who they are", doing: "Checking the investor is at this firm" },
  { id: "research", label: "Research in parallel", doing: "Searching the live web" },
  { id: "synthesis", label: "Write the brief and score the odds", doing: "Turning notes into a brief and an analysis" },
  { id: "validate", label: "Check every claim", doing: "Dropping undated or unsourced items, computing the score" },
];

const TRACKS: { id: TrackId; label: string }[] = [
  { id: "portfolio", label: "Deals and exits, last 12 months" },
  { id: "thesis", label: "Public thesis and statements" },
  { id: "context", label: "Controversies, pivots, fund status" },
  { id: "comparables", label: "Comparable brands and their trajectory" },
  { id: "person", label: "Background, key bets, little-known facts" },
  { id: "network", label: "Connections to you" },
];

function Mark({ status }: { status: Status }) {
  return <span className={`mark mark-${status}`} aria-hidden="true" />;
}

export function ResearchLedger({ state, investor, firm }: { state: LedgerState; investor: string; firm: string }) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const t0 = Date.now();
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - t0) / 1000)), 500);
    return () => clearInterval(id);
  }, []);

  return (
    <section className="ledger" aria-live="polite" aria-label="Research progress">
      <header className="ledger-head">
        <div>
          <p className="ledger-sub">Preparing brief</p>
          <h2 className="ledger-title">{investor}<span className="ledger-firm">{firm}</span></h2>
        </div>
        <span className="ledger-clock" aria-label={`${elapsed} seconds elapsed`}>
          {Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, "0")}
        </span>
      </header>
      <ol className="ledger-steps">
        {STAGES.map((s, i) => {
          const st = state.stages[s.id];
          return (
            <li key={s.id} className={`step step-${st.status}`}>
              <span className="step-num">{i + 1}</span>
              <div className="step-body">
                <div className="step-row"><span className="step-label">{s.label}</span><Mark status={st.status} /></div>
                <p className="step-detail">{st.detail ?? (st.status === "active" ? s.doing : "")}</p>
                {s.id === "research" && st.status !== "waiting" && (
                  <ul className="tracks">
                    {TRACKS.map((t) => {
                      const tr = state.tracks[t.id];
                      return (
                        <li key={t.id} className={`track track-${tr.status}`}>
                          <Mark status={tr.status} />
                          <span className="track-label">{t.label}</span>
                          <span className="track-count">
                            {tr.status === "done" ? `${tr.sources ?? 0} sources` : tr.status === "error" ? "Skipped" : tr.status === "active" ? "Searching" : ""}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
