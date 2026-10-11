"use client";
import { useMemo, useState } from "react";
import { DIRECTORY, type DirEntry } from "@/lib/directory";
import type { Brief } from "@/lib/types";
import { Monogram, PALETTE } from "./charts";

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

export function Directory({ briefs, onPrepare, onOpen, compact }: { briefs: Brief[]; onPrepare: (investor: string, firm: string) => void; onOpen: (b: Brief) => void; compact?: boolean }) {
  const [q, setQ] = useState("");
  const [type, setType] = useState<string>("All");
  const [stage, setStage] = useState<string>("All");
  const types = ["All", ...Array.from(new Set(DIRECTORY.map((d) => d.type)))];
  const stages = ["All", "Pre-seed", "Seed", "Series A", "Series B", "Growth"];

  const rows = useMemo(() => DIRECTORY.filter((d) =>
    (type === "All" || d.type === type) &&
    (stage === "All" || d.stages.includes(stage)) &&
    (!q || norm([d.firm, ...d.people, ...d.focus, ...d.consumerBets].join(" ")).includes(norm(q)))
  ), [q, type, stage]);
  const briefFor = (d: DirEntry) => briefs.find((b) => norm(b.investor.firm).includes(norm(d.firm).slice(0, 8)) || norm(d.firm).includes(norm(b.investor.firm).slice(0, 8)));

  const list = compact ? DIRECTORY.filter((d) => d.type === "Consumer specialist" && d.stages.includes("Seed") && !briefFor(d)).slice(0, 4) : rows;

  // Charts: investors by type, and by stage coverage.
  const byType = types.slice(1).map((t) => ({ t, n: DIRECTORY.filter((d) => d.type === t).length }));
  const byStage = stages.slice(1).map((s) => ({ s, n: DIRECTORY.filter((d) => d.stages.includes(s)).length }));
  const maxStage = Math.max(...byStage.map((x) => x.n), 1);

  return (
    <>
      {!compact && (
        <div className="grid dir-top">
          <div className="card span-4">
            <h3 className="card-title">Investors by type <span className="muted">{DIRECTORY.length}</span></h3>
            <div className="mix-bar">{byType.map((x, i) => <span key={x.t} style={{ width: `${(x.n / DIRECTORY.length) * 100}%`, background: PALETTE[i] }} />)}</div>
            <ul className="legend dir-legend">{byType.map((x, i) => <li key={x.t}><span className="swatch" style={{ background: PALETTE[i] }} />{x.t}<span className="legend-n">{x.n}</span></li>)}</ul>
          </div>
          <div className="card span-4">
            <h3 className="card-title">Who writes at your stage</h3>
            <div className="bands">
              {byStage.map((x) => (
                <div key={x.s} className={`bandrow ${x.s === "Seed" ? "br-strong" : "br-plain"}`}><span>{x.s}</span><span className="band-track"><span style={{ width: `${(x.n / maxStage) * 100}%` }} /></span><strong>{x.n}</strong></div>
              ))}
            </div>
          </div>
          <div className="card span-4 dir-note">
            <h3 className="card-title">How to use this list</h3>
            <p className="body-s">A starter list of Indian investors relevant to a seed-stage consumer health brand, pre-loaded from public information.</p>
            <p className="body-s">People and focus areas change. Click <strong>Prepare brief</strong> to get a live, sourced view before reaching out.</p>
          </div>
        </div>
      )}

      {!compact && (
        <div className="filters">
          <input className="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search firm, person, sector or portfolio brand" aria-label="Search the directory" />
          <div className="seg" role="group" aria-label="Investor type">{types.map((t) => <button key={t} className={type === t ? "is-on" : ""} onClick={() => setType(t)}>{t}</button>)}</div>
          <div className="seg" role="group" aria-label="Stage">{stages.map((s) => <button key={s} className={stage === s ? "is-on" : ""} onClick={() => setStage(s)}>{s}</button>)}</div>
        </div>
      )}

      <div className="dir-grid">
        {list.map((d) => {
          const b = briefFor(d);
          return (
            <div key={d.firm} className="dir-card">
              <div className="tile-head">
                <Monogram name={d.firm} size={40} />
                <div><strong>{d.firm}</strong><p className="tile-sub">{d.city}</p></div>
                <span className={`dir-type t-${d.type.split(" ")[0].toLowerCase().replace("/", "")}`}>{d.type}</span>
              </div>
              <p className="body-s muted">{d.note}</p>
              <div className="dir-tags">
                {d.stages.map((s) => <span key={s} className={`tag ${s === "Seed" ? "tag-investment" : ""}`}>{s}</span>)}
                {d.focus.slice(0, 3).map((f) => <span key={f} className="tag">{f}</span>)}
              </div>
              {!!d.consumerBets.length && <p className="dir-bets"><span>Consumer bets</span>{d.consumerBets.join(", ")}</p>}
              <div className="dir-foot">
                <span className="dir-people">{d.people.length ? d.people.join(", ") : "Partner names vary"}</span>
                {b
                  ? <button className="btn btn-sm btn-quiet" onClick={() => onOpen(b)}>Brief, fit {b.prediction.index}</button>
                  : <button className="btn btn-sm btn-primary" onClick={() => onPrepare(d.people[0] ?? "", d.firm)}>Prepare brief</button>}
              </div>
            </div>
          );
        })}
        {!list.length && <p className="empty">No investors match these filters.</p>}
      </div>
    </>
  );
}
