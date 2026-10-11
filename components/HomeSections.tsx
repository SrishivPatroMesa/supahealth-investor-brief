"use client";
import { useMemo, useState } from "react";
import type { Brief } from "@/lib/types";
import type { TabId } from "./BriefView";
import { Monogram, Ring } from "./charts";
import { Logo } from "./Logo";
import { meetingIcs, parseIcs, type CalMeeting } from "@/lib/calendar";

export type Meeting = CalMeeting;

const norm = (s: string) => s.toLowerCase().replace(/[^a-z]/g, "");
export const findBrief = (briefs: Brief[], investor: string) =>
  briefs.find((b) => norm(b.investor.name) === norm(investor) || norm(b.meta.input.investor) === norm(investor));

function relTime(iso: string) {
  const ms = new Date(iso).getTime() - Date.now();
  if (isNaN(ms)) return "";
  const h = Math.round(ms / 3_600_000);
  if (h < 0) return "Past";
  if (h < 1) return "Within the hour";
  if (h < 24) return `In ${h} hour${h === 1 ? "" : "s"}`;
  const d = Math.round(h / 24);
  return `In ${d} day${d === 1 ? "" : "s"}`;
}

/* ---------------- Stats strip ---------------- */
export function StatsStrip({ briefs, meetings }: { briefs: Brief[]; meetings: Meeting[] }) {
  const avg = briefs.length ? Math.round(briefs.reduce((s, b) => s + b.prediction.index, 0) / briefs.length) : 0;
  const best = [...briefs].sort((a, b) => b.prediction.index - a.prediction.index)[0];
  const next = [...meetings].filter((m) => new Date(m.when).getTime() > Date.now()).sort((a, b) => a.when.localeCompare(b.when))[0];
  const hours = (briefs.length * 45) / 60;
  return (
    <div className="stats">
      <div className="stat s-indigo"><span>Briefs prepared</span><strong>{briefs.length}</strong></div>
      <div className="stat s-teal"><span>Research time saved</span><strong>{hours % 1 ? hours.toFixed(1) : hours} h</strong><small>vs 45 min of manual prep each</small></div>
      <div className="stat s-amber"><span>Average fit index</span><strong>{briefs.length ? avg : "—"}</strong>{best && <small>Best: {best.investor.name}</small>}</div>
      <div className="stat s-pink"><span>Next meeting</span><strong className="stat-sm">{next ? next.investor : "None planned"}</strong>{next && <small>{relTime(next.when)}</small>}</div>
    </div>
  );
}

/* ---------------- How it works ---------------- */
const STEPS = [
  ["Read the inputs", "Names or LinkedIn and website links"],
  ["Confirm identity", "Checks the investor is at this firm"],
  ["Six research tracks", "Deals, thesis, context, comparables, person, network"],
  ["Score the odds", "Eight factors into a fit index and funnel"],
  ["Check every claim", "Undated and unsourced items removed"],
];
export function HowItWorks() {
  return (
    <ol className="how">
      {STEPS.map(([t, d], i) => (
        <li key={t}><span className="how-n">{i + 1}</span><strong>{t}</strong><p>{d}</p></li>
      ))}
    </ol>
  );
}

/* ---------------- What's in a brief (clickable) ---------------- */
const FEATURES: { title: string; desc: string; tab: TabId; tone: string }[] = [
  { title: "The odds", desc: "Fit index and term-sheet probability from 8 weighted factors", tab: "odds", tone: "f-indigo" },
  { title: "Portfolio", desc: "Deals in the last 90 days and comparable brands, with scale", tab: "portfolio", tone: "f-teal" },
  { title: "Person", desc: "Background, defining bets and a little-known fact", tab: "person", tone: "f-amber" },
  { title: "Playbook", desc: "Hooks, talking points, warm-intro paths and objections", tab: "playbook", tone: "f-pink" },
];
export function Features({ latest, onOpen }: { latest?: Brief; onOpen: (b: Brief, tab: TabId) => void }) {
  return (
    <div className="features">
      {FEATURES.map((f) => (
        <button key={f.title} className={`feature ${f.tone}`} disabled={!latest} onClick={() => latest && onOpen(latest, f.tab)}>
          <strong>{f.title}</strong>
          <p>{f.desc}</p>
          <span className="feature-cta">{latest ? `See it for ${latest.investor.name.split(" ")[0]}` : "Run a brief to unlock"}</span>
        </button>
      ))}
    </div>
  );
}

/* ---------------- Recent briefs ---------------- */
export function RecentList({ briefs, onOpen, onRemove }: { briefs: Brief[]; onOpen: (b: Brief) => void; onRemove: (b: Brief) => void }) {
  if (!briefs.length) return <p className="empty">No briefs yet. Prepare your first one above; it will be saved here in this browser.</p>;
  return (
    <div className="recent-grid">
      {briefs.map((b) => (
        <div key={b.meta.generatedAt} className="recent-card">
          <button className="recent-open" onClick={() => onOpen(b)}>
            <span className="recent-ring"><Ring value={b.prediction.index} size={48} stroke={5} label="Fit index" /></span>
            <span className="recent-text">
              <strong>{b.investor.name}</strong>
              <span>{b.investor.firm}</span>
              <small>{new Date(b.meta.generatedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}, {b.prediction.probability}% term-sheet odds</small>
            </span>
          </button>
          <button className="recent-x" onClick={() => onRemove(b)} aria-label={`Remove brief for ${b.investor.name}`}>×</button>
        </div>
      ))}
    </div>
  );
}

/* ---------------- Meetings planner ---------------- */
function download(name: string, text: string) {
  const blob = new Blob([text], { type: "text/calendar" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob); a.download = name; a.click(); URL.revokeObjectURL(a.href);
}

export function Meetings({
  meetings, briefs, onAdd, onImport, onRemove, onPrepare, onOpen, bookingUrl, onBookingUrl,
}: {
  meetings: Meeting[]; briefs: Brief[];
  onAdd: (m: Meeting) => void; onImport: (ms: Meeting[]) => void; onRemove: (id: string) => void;
  onPrepare: (investor: string, firm: string) => void; onOpen: (b: Brief) => void;
  bookingUrl: string; onBookingUrl: (u: string) => void;
}) {
  const [investor, setInvestor] = useState("");
  const [firm, setFirm] = useState("");
  const [when, setWhen] = useState("");
  const [note, setNote] = useState("");
  const [copied, setCopied] = useState(false);
  const sorted = [...meetings].sort((a, b) => a.when.localeCompare(b.when));
  const ready = investor.trim() && firm.trim() && when;
  const appUrl = typeof window !== "undefined" ? window.location.origin : "";

  return (
    <div className="grid">
      <div className="span-4 stack">
        <form className="card meet-form" onSubmit={(e) => {
          e.preventDefault();
          if (!ready) return;
          onAdd({ id: `${Date.now()}`, investor: investor.trim(), firm: firm.trim(), when, source: "manual" });
          setInvestor(""); setFirm(""); setWhen("");
        }}>
          <h3 className="card-title">Add a meeting</h3>
          <label className="field"><span className="field-label">Investor</span><input value={investor} onChange={(e) => setInvestor(e.target.value)} placeholder="Full name" /></label>
          <label className="field"><span className="field-label">Firm</span><input value={firm} onChange={(e) => setFirm(e.target.value)} placeholder="Firm name" /></label>
          <label className="field"><span className="field-label">Date and time</span><input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} /></label>
          <button className="btn btn-primary btn-sm" type="submit" disabled={!ready}>Add meeting</button>
        </form>

        <div className="card meet-form">
          <h3 className="card-title">Import from your calendar</h3>
          <p className="muted-p small">Export a .ics file from Cal.com, Google Calendar or Outlook and drop it here. Events titled like &ldquo;Rahul Sharma (Acme Ventures)&rdquo; are read as investor and firm.</p>
          <label className="file-drop">
            <input type="file" accept=".ics,text/calendar" onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              const found = parseIcs(await f.text());
              onImport(found);
              setNote(found.length ? `Imported ${found.length} upcoming event${found.length === 1 ? "" : "s"}.` : "No upcoming events found in that file.");
              e.target.value = "";
            }} />
            <span>Choose .ics file</span>
          </label>
          {note && <p className="ok-note">{note}</p>}
        </div>

        <div className="card meet-form">
          <h3 className="card-title">Your Cal.com booking link</h3>
          <p className="muted-p small">Share it with investors so they can pick a slot. Booked meetings can be imported above.</p>
          <input className="search" value={bookingUrl} onChange={(e) => onBookingUrl(e.target.value)} placeholder="https://cal.com/priya/investor-call" />
          <div className="row-btns">
            <button className="btn btn-sm btn-quiet" disabled={!bookingUrl} onClick={async () => { await navigator.clipboard.writeText(bookingUrl); setCopied(true); setTimeout(() => setCopied(false), 1600); }}>{copied ? "Copied" : "Copy link"}</button>
            <a className={`btn btn-sm btn-quiet ${bookingUrl ? "" : "is-disabled"}`} href={bookingUrl || undefined} target="_blank" rel="noopener noreferrer">Open booking page</a>
          </div>
        </div>
      </div>

      <div className="span-8">
        {sorted.length ? (
          <div className="meet-list">
            {sorted.map((m) => {
              const brief = findBrief(briefs, m.investor);
              const past = new Date(m.when).getTime() < Date.now();
              const d = new Date(m.when);
              return (
                <div key={m.id} className={`meet ${past ? "is-past" : ""}`}>
                  <div className="meet-date">
                    <span>{d.toLocaleDateString("en-IN", { month: "short" })}</span>
                    <strong>{d.getDate()}</strong>
                    <small>{d.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })}</small>
                  </div>
                  <div className="meet-body">
                    <strong>{m.investor}{m.source === "calendar" && <span className="src-badge">From calendar</span>}</strong>
                    <span>{m.firm || "Firm not set"}</span>
                    <small className={brief ? "ok" : "todo"}>{relTime(m.when)}{brief ? `, brief ready (fit ${brief.prediction.index})` : ", brief not prepared"}</small>
                  </div>
                  <div className="meet-actions">
                    {brief
                      ? <button className="btn btn-sm btn-quiet" onClick={() => onOpen(brief)}>Open brief</button>
                      : <button className="btn btn-sm btn-primary" onClick={() => onPrepare(m.investor, m.firm)}>Prepare brief</button>}
                    <button className="btn btn-sm btn-quiet" onClick={() => download(`meeting-${m.investor.toLowerCase().replace(/\W+/g, "-")}.ics`, meetingIcs(m, appUrl))} title="Download an .ics with a reminder the day before">Add to calendar</button>
                    <button className="recent-x" onClick={() => onRemove(m.id)} aria-label={`Remove meeting with ${m.investor}`}>×</button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : <p className="empty">No meetings planned. Add this week&apos;s investor meetings, or import them from your calendar.</p>}
      </div>
    </div>
  );
}

/* ---------------- Compare investors ---------------- */
export function Compare({ briefs, onOpen }: { briefs: Brief[]; onOpen: (b: Brief) => void }) {
  const ranked = useMemo(() => [...briefs].sort((a, b) => b.prediction.probability - a.prediction.probability), [briefs]);
  const [picked, setPicked] = useState<string[]>(() => ranked.slice(0, 3).map((b) => b.meta.generatedAt));
  if (briefs.length < 2) return <p className="empty">Prepare at least two briefs to compare investors side by side.</p>;
  const cols = ranked.filter((b) => picked.includes(b.meta.generatedAt)).slice(0, 3);
  const maxP = Math.max(...ranked.map((b) => b.prediction.probability), 1);
  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id].slice(-3)));
  const rows: [string, (b: Brief) => React.ReactNode][] = [
    ["Fit index", (b) => <Ring value={b.prediction.index} size={56} stroke={6} label="Fit index" />],
    ["Term-sheet odds", (b) => <strong className="cmp-big">{b.prediction.probability}%</strong>],
    ["Outlook", (b) => <span className={`band band-${b.prediction.band.toLowerCase().replace(" ", "-")}`}>{b.prediction.band}</span>],
    ["Likely cheque", (b) => b.analysis.cheque.typical || "—"],
    ["Likely role", (b) => ({ lead: "Could lead", "co-lead": "Could co-lead", follow: "Likely to follow", unlikely: "Unlikely to invest" })[b.analysis.verdict.likelyRole]],
    ["Deals, last 90 days", (b) => b.portfolioActivity.length],
    ["Comparable brands", (b) => b.analysis.comparables.length],
    ["Best connection", (b) => b.analysis.connections[0] ? `${b.analysis.connections[0].strength}: ${b.analysis.connections[0].detail}` : "None found"],
    ["Top watch-out", (b) => b.context.find((c) => c.severity !== "info")?.title ?? "None"],
    ["The call", (b) => b.analysis.verdict.headline],
  ];
  return (
    <div className="grid">
      <div className="card span-4">
        <h3 className="card-title">Who to prioritise</h3>
        <ol className="rank">
          {ranked.map((b, i) => (
            <li key={b.meta.generatedAt}>
              <label className="rank-row">
                <input type="checkbox" checked={picked.includes(b.meta.generatedAt)} onChange={() => toggle(b.meta.generatedAt)} />
                <span className="rank-n">{i + 1}</span>
                <span className="rank-name"><strong>{b.investor.name}</strong><small>{b.investor.firm}</small></span>
                <span className="rank-val">{b.prediction.probability}%</span>
              </label>
              <span className="rank-track"><span style={{ width: `${(b.prediction.probability / maxP) * 100}%` }} /></span>
            </li>
          ))}
        </ol>
        <p className="muted-p small">Ranked by estimated term-sheet odds. Tick up to three to compare.</p>
      </div>
      <div className="card span-8 cmp-card">
        <div className="table-wrap flat">
          <table className="table cmp">
            <thead>
              <tr><th />{cols.map((b) => (
                <th key={b.meta.generatedAt}>
                  <button className="cmp-head" onClick={() => onOpen(b)}><Monogram name={b.investor.name} size={30} /><span><strong>{b.investor.name}</strong><small>{b.investor.firm}</small></span></button>
                </th>
              ))}</tr>
            </thead>
            <tbody>
              {rows.map(([label, fn]) => (
                <tr key={label}><td className="cmp-label">{label}</td>{cols.map((b) => <td key={b.meta.generatedAt}>{fn(b)}</td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Footer ---------------- */
export function Footer({ onTab }: { onTab: (t: string) => void }) {
  return (
    <footer className="footer no-print">
      <div className="footer-inner">
        <div className="footer-brand">
          <Logo />
          <p>Pre-meeting investor intelligence for SupaHealth. Every brief is researched live and every claim links to its source.</p>
        </div>
        <div>
          <h4>Workspace</h4>
          <button onClick={() => onTab("dashboard")}>Dashboard</button>
          <button onClick={() => onTab("briefs")}>Briefs</button>
          <button onClick={() => onTab("meetings")}>Meetings and calendar</button>
          <button onClick={() => onTab("compare")}>Compare investors</button>
          <button onClick={() => onTab("directory")}>Investor directory</button>
        </div>
        <div>
          <h4>How it&apos;s built</h4>
          <p>Gemini Flash for every AI step</p>
          <p>Live Google Search grounding</p>
          <p>Scores computed in code, not by the model</p>
          <p>Hosted on Vercel</p>
        </div>
        <div>
          <h4>Good to know</h4>
          <p>Briefs, meetings and your profile are saved only in this browser.</p>
          <p>The investor directory is a starter list; run a brief to verify.</p>
          <p>Public sources only; LinkedIn connections aren&apos;t visible.</p>
          <p>Verify key facts before the meeting.</p>
        </div>
      </div>
      <div className="footer-base">
        <span>SupaHealth Investor Briefs</span>
        <span>Built for MESA Cohort C4, AI and its Applications</span>
      </div>
    </footer>
  );
}
