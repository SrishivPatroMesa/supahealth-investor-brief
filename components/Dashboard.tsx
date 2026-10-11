"use client";
import { useMemo, useState } from "react";
import type { Brief } from "@/lib/types";
import type { CalMeeting } from "@/lib/calendar";
import { bandCounts, findBrief, nextActions, roundCoverage, type Action } from "@/lib/insights";
import { Ring } from "./charts";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export function CalendarCard({ meetings, briefs, onOpen }: { meetings: CalMeeting[]; briefs: Brief[]; onOpen: (b: Brief) => void }) {
  const today = new Date();
  const [cursor, setCursor] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selected, setSelected] = useState<string>(ymd(today));
  const byDay = useMemo(() => {
    const m = new Map<string, CalMeeting[]>();
    for (const x of meetings) { const k = x.when.slice(0, 10); m.set(k, [...(m.get(k) ?? []), x]); }
    return m;
  }, [meetings]);
  const first = new Date(cursor);
  const offset = (first.getDay() + 6) % 7;
  const daysIn = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
  const cells = Array.from({ length: Math.ceil((offset + daysIn) / 7) * 7 }, (_, i) => {
    const day = i - offset + 1;
    return day >= 1 && day <= daysIn ? new Date(cursor.getFullYear(), cursor.getMonth(), day) : null;
  });
  const sel = (byDay.get(selected) ?? []).sort((a, b) => a.when.localeCompare(b.when));
  const monthMeetings = meetings.filter((m) => m.when.startsWith(ymd(cursor).slice(0, 7))).length;

  return (
    <div className="card cal-card">
      <div className="cal-head">
        <h3 className="card-title">{cursor.toLocaleDateString("en-IN", { month: "long", year: "numeric" })} <span className="muted">{monthMeetings} meeting{monthMeetings === 1 ? "" : "s"}</span></h3>
        <div className="cal-nav">
          <button className="icon-btn" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))} aria-label="Previous month">‹</button>
          <button className="btn btn-sm btn-quiet" onClick={() => { setCursor(new Date(today.getFullYear(), today.getMonth(), 1)); setSelected(ymd(today)); }}>Today</button>
          <button className="icon-btn" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))} aria-label="Next month">›</button>
        </div>
      </div>
      <div className="cal-grid" role="grid">
        {DAYS.map((d) => <span key={d} className="cal-dow">{d}</span>)}
        {cells.map((d, i) => {
          if (!d) return <span key={i} className="cal-cell is-empty" />;
          const k = ymd(d);
          const items = byDay.get(k) ?? [];
          const isToday = k === ymd(today);
          return (
            <button key={i} className={`cal-cell ${isToday ? "is-today" : ""} ${k === selected ? "is-selected" : ""} ${items.length ? "has-items" : ""} ${d < new Date(today.getFullYear(), today.getMonth(), today.getDate()) ? "is-past" : ""}`} onClick={() => setSelected(k)} aria-label={`${d.toDateString()}, ${items.length} meetings`}>
              <span className="cal-num">{d.getDate()}</span>
              {items.slice(0, 2).map((m) => {
                const ready = !!findBrief(briefs, m.investor);
                return <span key={m.id} className={`cal-ev ${ready ? "ready" : "todo"}`}>{m.investor.split(" ")[0]}</span>;
              })}
              {items.length > 2 && <span className="cal-more">+{items.length - 2}</span>}
            </button>
          );
        })}
      </div>
      <div className="cal-day">
        <p className="cal-day-title">{new Date(selected + "T00:00").toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}</p>
        {sel.length ? sel.map((m) => {
          const b = findBrief(briefs, m.investor);
          return (
            <div key={m.id} className="cal-item">
              <span className="cal-time">{new Date(m.when).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })}</span>
              <span className="cal-who"><strong>{m.investor}</strong>{m.firm && <small>{m.firm}</small>}</span>
              {b ? <button className="btn btn-sm btn-quiet" onClick={() => onOpen(b)}>Brief, fit {b.prediction.index}</button> : <span className="pill-todo">No brief yet</span>}
            </div>
          );
        }) : <p className="muted-p">Nothing scheduled.</p>}
      </div>
      <p className="cal-legend"><span className="lg ready" />Brief ready <span className="lg todo" />Brief needed</p>
    </div>
  );
}

export function NextActions({ briefs, meetings, raise, onAction }: { briefs: Brief[]; meetings: CalMeeting[]; raise: number; onAction: (a: Action) => void }) {
  const actions = nextActions(briefs, meetings, raise);
  return (
    <div className="card">
      <h3 className="card-title">Next actions <span className="muted">{actions.length}</span></h3>
      {actions.length ? (
        <ul className="actions">
          {actions.map((a, i) => (
            <li key={i} className={`action a-${a.tone}`}>
              <span className="a-bar" />
              <div><strong>{a.title}</strong><p>{a.detail}</p></div>
              {a.cta && <button className="btn btn-sm btn-quiet" onClick={() => onAction(a)}>{a.cta.label}</button>}
            </li>
          ))}
        </ul>
      ) : <p className="muted-p">You&apos;re up to date. Add meetings or prepare briefs to see suggestions.</p>}
    </div>
  );
}

export function RoundCoverage({ briefs, raise }: { briefs: Brief[]; raise: number }) {
  const cov = roundCoverage(briefs, raise);
  const top = cov.rows.slice(0, 5);
  const colors = ["#5B5BF7", "#14B8A6", "#F59E0B", "#EC4899", "#0EA5E9"];
  return (
    <div className="card">
      <h3 className="card-title">Round coverage <span className="muted">₹{raise} Cr target</span></h3>
      {briefs.length ? (
        <>
          <p className="cov-num"><strong>₹{cov.expected.toFixed(1)} Cr</strong> expected</p>
          <div className="cov-bar" role="img" aria-label={`₹${cov.expected.toFixed(1)} Cr of ₹${raise} Cr expected`}>
            {top.map((r, i) => <span key={r.b.meta.generatedAt} style={{ width: `${(r.expected / raise) * 100}%`, background: colors[i] }} title={r.b.investor.name} />)}
          </div>
          <div className="cov-scale"><span>₹0</span><span>₹{raise} Cr</span></div>
          <ul className="cov-list">
            {top.map((r, i) => (
              <li key={r.b.meta.generatedAt}><span className="swatch" style={{ background: colors[i] }} />{r.b.investor.name}<span className="muted">{r.b.prediction.probability}% × ₹{r.cheque.toFixed(1)} Cr</span><strong>₹{r.expected.toFixed(1)} Cr</strong></li>
            ))}
          </ul>
          <p className="method">Expected commitment = term-sheet odds × expected cheque, summed across briefed investors.</p>
        </>
      ) : <p className="muted-p">Prepare briefs to estimate how much of the round your pipeline is likely to cover.</p>}
    </div>
  );
}

export function PipelineBands({ briefs }: { briefs: Brief[] }) {
  const counts = bandCounts(briefs);
  const max = Math.max(...counts.map((c) => c.count), 1);
  return (
    <div className="card">
      <h3 className="card-title">Pipeline by outlook</h3>
      <div className="bands">
        {counts.map((c) => (
          <div key={c.band} className={`bandrow br-${c.band.toLowerCase().replace(" ", "-")}`}>
            <span>{c.band}</span>
            <span className="band-track"><span style={{ width: `${(c.count / max) * 100}%` }} /></span>
            <strong>{c.count}</strong>
          </div>
        ))}
      </div>
      <p className="method">Based on estimated term-sheet odds: Strong ≥ 20%, Promising ≥ 10%, Long shot ≥ 4%.</p>
    </div>
  );
}

export function Leaderboard({ briefs, onOpen }: { briefs: Brief[]; onOpen: (b: Brief) => void }) {
  const top = [...briefs].sort((a, b) => b.prediction.index - a.prediction.index).slice(0, 5);
  return (
    <div className="card">
      <h3 className="card-title">Best fits</h3>
      {top.length ? (
        <ol className="leader">
          {top.map((b) => (
            <li key={b.meta.generatedAt}>
              <button onClick={() => onOpen(b)}>
                <Ring value={b.prediction.index} size={40} stroke={4} label="Fit index" />
                <span><strong>{b.investor.name}</strong><small>{b.investor.firm}</small></span>
                <em>{b.prediction.probability}%</em>
              </button>
            </li>
          ))}
        </ol>
      ) : <p className="muted-p">Your best-fit investors will rank here.</p>}
    </div>
  );
}
