"use client";
import { useEffect, useState } from "react";
import type { Brief } from "@/lib/types";
import { briefToMarkdown } from "@/lib/markdown";
import { bucketFor, last12Months, FACTOR_META } from "@/lib/predict";
import { ActivityChart, ChequeChart, Donut, FactorBars, Funnel, Monogram, Radar, Ring, ScaleBars } from "./charts";

function Cites({ ids }: { ids: number[] }) {
  if (!ids?.length) return null;
  return (
    <span className="cites">
      {ids.map((i) => <a key={i} href={`#src-${i}`} className="cite" data-src={i} aria-label={`Source ${i}`}>{i}</a>)}
    </span>
  );
}

const fmtDate = (d: string) => {
  const m = d?.match(/^(\d{4})-(\d{2})(?:-(\d{2}))?$/);
  if (!m) return d;
  const dt = new Date(Date.UTC(+m[1], +m[2] - 1, m[3] ? +m[3] : 1));
  return dt.toLocaleDateString("en-IN", m[3] ? { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" } : { month: "short", year: "numeric", timeZone: "UTC" });
};
const pctTxt = (n: number) => `${n % 1 === 0 ? n : n.toFixed(1)}%`;

const CATEGORY: Record<string, string> = {
  "sector-shift": "Sector shift", controversy: "Controversy", "portfolio-pivot": "Portfolio pivot",
  "portfolio-risk": "Portfolio risk", "fund-status": "Fund status", other: "Other",
};
const SEVERITY: Record<string, string> = { flag: "Raise with care", watch: "Watch", info: "Background" };
const TRAJECTORY: Record<string, string> = {
  scaling: "Scaling", steady: "Steady", struggling: "Struggling", exited: "Exited", "shut-down": "Shut down", unknown: "Unclear",
};
const CONNECTION: Record<string, string> = {
  "alma-mater": "Alma mater", "ex-employer": "Past employer", "co-investor": "Co-investor",
  "portfolio-founder": "Portfolio founder", community: "Community", location: "Location", other: "Other",
};
const ROLE: Record<string, string> = { lead: "Could lead", "co-lead": "Could co-lead", follow: "Likely to follow", unlikely: "Unlikely to invest" };

export type TabId = "overview" | "odds" | "person" | "playbook" | "portfolio" | "market" | "sources";

function domainOf(s: { title: string; domain?: string; url: string }) {
  const t = s.title?.trim() ?? "";
  if (/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(t)) return t.replace(/^www\./, "");
  if (s.domain && !s.domain.includes("vertexaisearch")) return s.domain;
  return "";
}

export function BriefView({ brief: b, onNew, initialTab, onRerun }: { brief: Brief; onNew: () => void; initialTab?: TabId; onRerun?: () => void }) {
  const [tab, setTab] = useState<TabId>(initialTab ?? "overview");
  const [copied, setCopied] = useState(false);
  const a = b.analysis;
  const p = b.prediction;
  const company = b.meta.company || "SupaHealth";
  const generated = new Date(b.meta.generatedAt);
  const months = last12Months(a.activity.monthly, generated);
  const totalDeals = months.reduce((s, m) => s + m.deals, 0);
  const revRows = a.comparables.filter((c) => c.revenueCr > 0);
  const fundRows = a.comparables.filter((c) => c.fundingCr > 0);
  const useRevenue = revRows.length >= 2 || (revRows.length >= 1 && fundRows.length < 2);
  const ourRevenue = b.meta.revenueCr ?? 2.4;
  const raise = b.meta.raiseAmountCr ?? 10;
  const flags = b.context.filter((c) => c.severity !== "info");
  const firstName = b.investor.name.split(" ")[0];
  const TRACK_LABEL: Record<string, string> = {
    portfolio: "deals and exits", thesis: "public thesis", context: "context and red flags",
    comparables: "comparable brands", person: "background", network: "connections",
  };
  const failed = [
    ...(b.meta.identityFailed ? ["identity check"] : []),
    ...b.meta.tracks.filter((t) => !t.ok).map((t) => TRACK_LABEL[t.id] ?? t.id),
  ];

  // Citation chips jump to the Sources tab.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const el = (e.target as HTMLElement).closest("a.cite") as HTMLAnchorElement | null;
      if (!el) return;
      e.preventDefault();
      setTab("sources");
      const id = el.dataset.src;
      setTimeout(() => {
        const row = document.getElementById(`src-${id}`);
        row?.scrollIntoView({ behavior: "smooth", block: "center" });
        row?.classList.add("flash");
        setTimeout(() => row?.classList.remove("flash"), 1600);
      }, 50);
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  const copy = async () => {
    await navigator.clipboard.writeText(briefToMarkdown(b));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  const print = () => {
    const details = [...document.querySelectorAll("details")];
    details.forEach((d) => (d.open = true));
    const prev = document.title;
    document.title = `Investor brief - ${b.investor.name} - ${b.investor.firm}`;
    window.print();
    document.title = prev;
  };
  const download = () => {
    const blob = new Blob([briefToMarkdown(b)], { type: "text/markdown" });
    const el = document.createElement("a");
    el.href = URL.createObjectURL(blob);
    el.download = `investor-brief-${b.investor.name.toLowerCase().replace(/\W+/g, "-")}.md`;
    el.click();
    URL.revokeObjectURL(el.href);
  };

  const TABS: { id: TabId; label: string; count?: number }[] = [
    { id: "overview", label: "Overview" },
    { id: "odds", label: "The odds" },
    { id: "person", label: "Person" },
    { id: "playbook", label: "Playbook" },
    { id: "portfolio", label: "Portfolio", count: b.portfolioActivity.length + a.comparables.length || undefined },
    { id: "market", label: "Thesis and context", count: flags.length || undefined },
    { id: "sources", label: "Sources", count: b.sources.length },
  ];
  const panel = (id: TabId) => `tabpanel ${tab === id ? "is-active" : ""}`;

  return (
    <article className="brief">
      {/* ---------------- Profile header ---------------- */}
      <header className="hero hero-brief">
        <div className="hero-inner">
          <div className="hero-top no-print">
            <button className="btn btn-sm btn-glass" onClick={onNew}>New brief</button>
            <span className="spacer" />
            <button className="btn btn-sm btn-glass" onClick={copy}>{copied ? "Copied" : "Copy Markdown"}</button>
            <button className="btn btn-sm btn-glass" onClick={download}>Download .md</button>
            <button className="btn btn-sm btn-bright" onClick={print}>Save as PDF</button>
          </div>

          <div className="id-row">
            <Monogram name={b.investor.name} size={64} />
            <div className="id-text">
              <h1 className="id-name">{b.investor.name}</h1>
              <div className="chips">
                {b.investor.role && <span className="chip">{b.investor.role}</span>}
                <span className="chip chip-strong">{b.investor.firm}</span>
                {b.investor.location && <span className="chip">{b.investor.location}</span>}
                <span className={`chip chip-id-${b.identity.confidence}`}>
                  {b.identity.confidence === "high" ? "Identity confirmed" : b.identity.confidence === "medium" ? "Identity likely" : "Identity unconfirmed"}
                </span>
              </div>
            </div>
          </div>

          <div className="kpis">
            <div className="kpi kpi-ring">
              <Ring value={p.index} size={76} stroke={8} dark label="Fit index" />
              <div><p className="kpi-label">Fit index</p><p className={`band band-${p.band.toLowerCase().replace(" ", "-")}`}>{p.band}</p></div>
            </div>
            <div className="kpi"><p className="kpi-label">Chance of term sheet</p><p className="kpi-val">{pctTxt(p.probability)}</p></div>
            <div className="kpi"><p className="kpi-label">Likely cheque</p><p className="kpi-val kpi-val-sm">{a.cheque.typical || "Unknown"}</p></div>
            <div className="kpi"><p className="kpi-label">Deals, last 90 days</p><p className="kpi-val">{b.portfolioActivity.length}</p></div>
            <div className="kpi"><p className="kpi-label">Likely role</p><p className="kpi-val kpi-val-sm">{ROLE[a.verdict.likelyRole]}</p></div>
          </div>
        </div>
      </header>

      {failed.length > 0 && (
        <div className="partial no-print" role="status">
          <div className="partial-inner">
            <span className="partial-dot" />
            <p><strong>Some research didn&apos;t finish in time:</strong> {failed.join(", ")}. Those sections may be incomplete; running the brief again usually fills them in.</p>
            {onRerun && <button className="btn btn-sm btn-primary" onClick={onRerun}>Run again</button>}
          </div>
        </div>
      )}

      {/* ---------------- Tabs ---------------- */}
      <nav className="tabs no-print" role="tablist" aria-label="Brief sections">
        <div className="tabs-inner">
          {TABS.map((t) => (
            <button key={t.id} role="tab" aria-selected={tab === t.id} className={`tab ${tab === t.id ? "is-active" : ""}`} onClick={() => { setTab(t.id); window.scrollTo({ top: 0, behavior: "smooth" }); }}>
              {t.label}{t.count ? <span className="tab-count">{t.count}</span> : null}
            </button>
          ))}
          <span className="tabs-meta">{b.sources.length} sources, {Math.round(b.meta.durationMs / 1000)}s, {generated.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span>
        </div>
      </nav>

      <div className="brief-main">
        {/* ================= OVERVIEW ================= */}
        <section className={panel("overview")} aria-label="Overview">
          <h2 className="print-h">Overview</h2>
          <div className="grid">
            <div className="card span-8 card-verdict">
              <p className="eyebrow-q">The call</p>
              <p className="verdict-headline">{a.verdict.headline}</p>
              <p className="summary">{b.summary}</p>
              <div className="pillrow">
                {a.verdict.meetingGoal && <div className="pillbox pb-indigo"><span>Aim for</span>{a.verdict.meetingGoal}</div>}
                {a.verdict.recommendedAsk && <div className="pillbox pb-teal"><span>Ask for</span>{a.verdict.recommendedAsk}</div>}
              </div>
            </div>
            {a.funFact.fact ? (
              <div className="card span-4 card-fun">
                <p className="fun-label">Something most founders won&apos;t know</p>
                <p className="fun-text">{a.funFact.fact} <Cites ids={a.funFact.sourceIds} /></p>
                {a.funFact.howToUse && <p className="fun-use">{a.funFact.howToUse}</p>}
              </div>
            ) : (
              <div className="card span-4 card-fun card-fun-empty">
                <p className="fun-label">Little-known fact</p>
                <p className="fun-use">Nothing reliable enough to cite was found for this investor.</p>
              </div>
            )}

            <div className="card span-4">
              <h3 className="card-title">Path to a term sheet</h3>
              <Funnel steps={p.funnel} />
            </div>
            <div className="card span-4">
              <h3 className="card-title">Likely cheque size</h3>
              <ChequeChart data={a.cheque.distribution} highlight={bucketFor(raise)} compact />
            </div>
            <div className="card span-4">
              <h3 className="card-title">Fit profile</h3>
              <Radar factors={p.factors} />
            </div>

            <div className="card span-6">
              <h3 className="card-title">Watch-outs <span className="muted">{flags.length}</span></h3>
              {flags.length ? (
                <ul className="mini-list">
                  {flags.slice(0, 3).map((c, i) => (
                    <li key={i} className={`mini mini-${c.severity}`}><span className="dot" /><div><strong>{c.title}</strong><p>{c.detail} <Cites ids={c.sourceIds} /></p></div></li>
                  ))}
                </ul>
              ) : <p className="muted-p">No red flags or watch items found.</p>}
            </div>
            <div className="card span-6">
              <h3 className="card-title">Best way in</h3>
              <ul className="mini-list">
                {a.connections[0] && (
                  <li className="mini mini-link"><span className="dot" /><div><strong>{CONNECTION[a.connections[0].type]}: {a.connections[0].strength} link</strong><p>{a.connections[0].detail} <Cites ids={a.connections[0].sourceIds} /></p></div></li>
                )}
                {a.hooks[0] && (
                  <li className="mini mini-hook"><span className="dot" /><div><strong>Open with: {a.hooks[0].hook}</strong><p>&ldquo;{a.hooks[0].line}&rdquo;</p></div></li>
                )}
                {b.talkingPoints[0] && (
                  <li className="mini mini-point"><span className="dot" /><div><strong>Lead point: {b.talkingPoints[0].title}</strong><p>{b.talkingPoints[0].why}</p></div></li>
                )}
              </ul>
            </div>
          </div>
        </section>

        {/* ================= ODDS ================= */}
        <section className={panel("odds")} aria-label="The odds">
          <h2 className="print-h">The odds</h2>
          <div className="grid">
            <div className="card span-5 card-score">
              <Ring value={p.index} size={150} stroke={14} label="Fit index" />
              <div>
                <p className="big-num">{pctTxt(p.probability)}</p>
                <p className="muted-p">estimated chance of a term sheet</p>
                <p className={`band band-${p.band.toLowerCase().replace(" ", "-")}`}>{p.band}</p>
                {p.capped && <p className="note-warn">{p.capped}</p>}
              </div>
            </div>
            <div className="card span-7">
              <h3 className="card-title">From first meeting to term sheet</h3>
              <Funnel steps={p.funnel} />
            </div>
            <div className="card span-5">
              <h3 className="card-title">Fit profile</h3>
              <Radar factors={p.factors} />
            </div>
            <div className="card span-7">
              <h3 className="card-title">What drives the score <span className="muted">weight</span></h3>
              <FactorBars factors={p.factors} />
              <details className="why">
                <summary>Why each factor scored this way</summary>
                <dl className="why-list">
                  {p.factors.map((f) => (
                    <div key={f.id}>
                      <dt>{f.label} <span className="muted">{f.score}/10</span></dt>
                      <dd>{f.evidence} <Cites ids={f.sourceIds} /><span className="why-help">{FACTOR_META[f.id].help}</span></dd>
                    </div>
                  ))}
                </dl>
              </details>
            </div>
            <div className="card span-7">
              <h3 className="card-title">Likely cheque size</h3>
              <ChequeChart data={a.cheque.distribution} highlight={bucketFor(raise)} />
              {a.cheque.rationale && <p className="body-s">{a.cheque.rationale} <Cites ids={a.cheque.sourceIds} /></p>}
            </div>
            <div className="card span-5">
              <h3 className="card-title">Overlaps and conflicts</h3>
              {b.fit.overlaps.map((o, i) => <p key={i} className="tick tick-ok">{o}</p>)}
              {b.fit.conflicts.length
                ? b.fit.conflicts.map((c, i) => <p key={i} className="tick tick-bad"><strong>{c.company}.</strong> {c.reason}</p>)
                : <p className="tick tick-ok">No competing brands found in their portfolio.</p>}
            </div>
          </div>
          <p className="method">The fit index is a weighted score of eight factors, each rated 0–10 by Gemini from the research. The funnel turns it into stage-by-stage odds using conservative base rates. It&apos;s a directional estimate, not a forecast.</p>
        </section>

        {/* ================= PERSON ================= */}
        <section className={panel("person")} aria-label="Person">
          <h2 className="print-h">The person</h2>
          <div className="grid">
            <div className="card span-12">
              {b.investor.firmDescription && <p className="summary">{b.investor.firmDescription}</p>}
              <div className="facts">
                {b.investor.stageFocus && <div><span>Stage focus</span>{b.investor.stageFocus}</div>}
                {b.investor.checkSize && <div><span>Cheque size</span>{b.investor.checkSize}</div>}
                {b.investor.location && <div><span>Based in</span>{b.investor.location}</div>}
              </div>
            </div>
            {!!a.person.background.length && (
              <div className="card span-6">
                <h3 className="card-title">Background</h3>
                <ol className="timeline">
                  {a.person.background.map((x, i) => <li key={i}><span className="tl-dot" /><p>{x.fact} <Cites ids={x.sourceIds} /></p></li>)}
                </ol>
              </div>
            )}
            {!!a.person.insights.length && (
              <div className="card span-6">
                <h3 className="card-title">How they think</h3>
                {a.person.insights.map((x, i) => <p key={i} className="quote">{x.insight} <Cites ids={x.sourceIds} /></p>)}
              </div>
            )}
          </div>
          {!!a.person.keyBets.length && (
            <>
              <h3 className="section-title">Bets that define them</h3>
              <div className="tiles">
                {a.person.keyBets.map((k, i) => (
                  <div key={i} className="tile">
                    <div className="tile-head"><Monogram name={k.company} /><div><strong>{k.company}</strong>{k.outcome && <p className="tile-sub">{k.outcome}</p>}</div></div>
                    {k.whyItMatters && <p className="body-s">{k.whyItMatters} <Cites ids={k.sourceIds} /></p>}
                  </div>
                ))}
              </div>
            </>
          )}
        </section>

        {/* ================= PLAYBOOK ================= */}
        <section className={panel("playbook")} aria-label="Playbook">
          <h2 className="print-h">Playbook</h2>
          {!!a.hooks.length && (
            <>
              <h3 className="section-title first">Conversation hooks</h3>
              <div className="hooks">
                {a.hooks.map((h, i) => (
                  <div key={i} className={`hook hook-${i}`}>
                    <p className="hook-topic">{h.hook}</p>
                    <p className="hook-line">&ldquo;{h.line}&rdquo; <Cites ids={h.sourceIds} /></p>
                  </div>
                ))}
              </div>
            </>
          )}
          <h3 className="section-title">Talking points</h3>
          <div className="points">
            {b.talkingPoints.map((t, i) => (
              <div key={i} className="point">
                <span className="point-n">{i + 1}</span>
                <div>
                  <h4>{t.title}</h4>
                  <blockquote>&ldquo;{t.opener}&rdquo;</blockquote>
                  <p className="body-s muted">{t.why} <Cites ids={t.sourceIds} /></p>
                </div>
              </div>
            ))}
          </div>

          <h3 className="section-title">Who can get you a warm intro <span className="muted">public paths to {firstName}</span></h3>
          {a.connections.length ? (
            <div className="links">
              {a.connections.map((c, i) => (
                <div key={i} className={`link link-${c.strength}`}>
                  <div className="link-meta"><span className="link-strength">{c.strength === "strong" ? "Strong link" : c.strength === "possible" ? "Possible link" : "Weak link"}</span><span className="tag">{CONNECTION[c.type]}</span></div>
                  <p className="link-detail">{c.detail} <Cites ids={c.sourceIds} /></p>
                  {c.howToUse && <p className="body-s muted">{c.howToUse}</p>}
                </div>
              ))}
            </div>
          ) : <p className="empty">No public overlap found with your education, past employers or communities. Look for a warm intro through one of their portfolio founders.</p>}
          <p className="method">Based on public information only. LinkedIn mutual connections aren&apos;t visible to this tool; check them on LinkedIn before the meeting.</p>

          <h3 className="section-title">Likely objections</h3>
          <div className="objections">
            {b.objections.map((o, i) => (
              <div key={i} className="objection">
                <p className="obj-q">&ldquo;{o.objection}&rdquo;</p>
                <p className="obj-a"><span>Your answer</span>{o.response}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ================= PORTFOLIO ================= */}
        <section className={panel("portfolio")} aria-label="Portfolio">
          <h2 className="print-h">Portfolio</h2>
          <div className="grid">
            <div className="card span-8">
              <h3 className="card-title">Deals by month, last 12 months <span className="muted">{totalDeals} reported</span></h3>
              {totalDeals ? <ActivityChart data={months} /> : <p className="muted-p">No dated deals found in public reports for the last 12 months.</p>}
            </div>
            <div className="card span-4">
              <h3 className="card-title">Where the money went</h3>
              {a.activity.sectorMix.length ? <Donut data={a.activity.sectorMix} /> : <p className="muted-p">Not enough deals to show a sector mix.</p>}
            </div>
          </div>

          <h3 className="section-title">Recent activity <span className="muted">since {fmtDate(b.meta.windowStart)}</span></h3>
          {b.portfolioActivity.length ? (
            <div className="table-wrap">
              <table className="table">
                <thead><tr><th>Date</th><th>Company</th><th>Type</th><th>Round</th><th>Amount</th><th>Note</th></tr></thead>
                <tbody>
                  {b.portfolioActivity.map((d, i) => (
                    <tr key={i}>
                      <td className="nowrap">{d.date ? fmtDate(d.date) : "Unverified"}</td>
                      <td><span className="cell-co"><Monogram name={d.company} size={26} /><span><strong>{d.company}</strong><small>{d.sector}</small></span></span></td>
                      <td><span className={`tag tag-${d.type}`}>{d.type === "follow-on" ? "Follow-on" : d.type === "exit" ? "Exit" : d.type === "investment" ? "New" : "Other"}</span></td>
                      <td>{d.round || "—"}</td>
                      <td className="nowrap">{d.amount || "—"}</td>
                      <td className="cell-note">{d.note} <Cites ids={d.sourceIds} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <p className="empty">No verified investments or exits in the last 90 days. A quiet period can mean they are between funds; ask about their deployment pace.</p>}

          <h3 className="section-title">Comparable brands <span className="muted">brands they&apos;ve backed, and how they&apos;ll benchmark {company}</span></h3>
          {a.comparables.length ? (
            <div className="grid">
              {(useRevenue ? revRows.length : fundRows.length) > 0 && (
                <div className="card span-12">
                  <h3 className="card-title">{useRevenue ? "Latest reported revenue" : "Total funding raised"}</h3>
                  <ScaleBars
                    unit={useRevenue ? "₹ Cr, latest reported year" : `₹ Cr. ${company} is raising ₹${raise} Cr.`}
                    rows={[
                      ...(useRevenue ? revRows.map((c) => ({ name: c.company, value: c.revenueCr })) : fundRows.map((c) => ({ name: c.company, value: c.fundingCr }))),
                      ...(useRevenue ? [{ name: `${company} (ARR)`, value: ourRevenue, us: true }] : []),
                    ].sort((x, y) => y.value - x.value)}
                  />
                </div>
              )}
              {a.comparables.map((c, i) => (
                <div key={i} className="card span-6 comp">
                  <div className="tile-head">
                    <Monogram name={c.company} />
                    <div><strong>{c.company}</strong><p className="tile-sub">{[c.whatTheyDo, c.invested && `backed ${c.invested}`].filter(Boolean).join(", ")}</p></div>
                    <span className={`traj traj-${c.trajectory}`}>{TRAJECTORY[c.trajectory]}</span>
                  </div>
                  {c.revenueCr || c.fundingCr ? (
                    <div className="comp-stats">
                      <div><span>Revenue</span>{c.revenueCr ? `₹${c.revenueCr} Cr` : "Not public"}</div>
                      <div><span>Funding</span>{c.fundingCr ? `₹${c.fundingCr} Cr` : "Not public"}</div>
                      <div><span>Scale</span>{c.scale || "—"}</div>
                    </div>
                  ) : c.scale ? <p className="comp-scale"><span>Scale</span>{c.scale}</p> : null}
                  {c.trajectoryNote && <p className="body-s">{c.trajectoryNote} <Cites ids={c.sourceIds} /></p>}
                  {c.vsUs && <p className="vs"><span>Versus {company}</span>{c.vsUs}</p>}
                </div>
              ))}
            </div>
          ) : <p className="empty">No comparable consumer or health brands found in their portfolio. You may be their first bet in this category; frame that as an opening, not a risk.</p>}
        </section>

        {/* ================= THESIS & CONTEXT ================= */}
        <section className={panel("market")} aria-label="Thesis and context">
          <h2 className="print-h">Thesis and context</h2>
          {b.thesis.summary && <p className="summary lead">{b.thesis.summary}</p>}
          <div className="tiles">
            {b.thesis.themes.map((t, i) => (
              <div key={i} className={`tile theme theme-${i % 4}`}>
                <strong>{t.theme}</strong>
                <p className="body-s">{t.evidence} <Cites ids={t.sourceIds} /></p>
              </div>
            ))}
          </div>
          {!b.thesis.themes.length && <p className="empty">No public statements of thesis found.</p>}

          <h3 className="section-title">Context to know</h3>
          {b.context.length ? (
            <div className="context">
              {b.context.map((c, i) => (
                <div key={i} className={`ctx ctx-${c.severity}`}>
                  <div className="ctx-meta"><span className="sev">{SEVERITY[c.severity]}</span><span className="tag">{CATEGORY[c.category]}</span></div>
                  <strong>{c.title}</strong>
                  <p className="body-s">{c.detail} <Cites ids={c.sourceIds} /></p>
                </div>
              ))}
            </div>
          ) : <p className="empty">Nothing notable found: no public controversies, sector exits or portfolio trouble.</p>}

          {!!b.gaps.length && (
            <>
              <h3 className="section-title">What we couldn&apos;t verify</h3>
              <ul className="gaps">{b.gaps.map((g, i) => <li key={i}>{g}</li>)}</ul>
            </>
          )}
        </section>

        {/* ================= SOURCES ================= */}
        <section className={panel("sources")} aria-label="Sources">
          <h2 className="print-h">Sources</h2>
          <div className="sources">
            {b.sources.map((s) => {
              const dom = domainOf(s);
              return (
                <a key={s.id} id={`src-${s.id}`} className="source" href={s.url} target="_blank" rel="noopener noreferrer">
                  <span className="src-num">{s.id}</span>
                  {dom
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img className="favicon" src={`https://www.google.com/s2/favicons?domain=${dom}&sz=64`} alt="" width={20} height={20} loading="lazy" />
                    : <span className="favicon favicon-blank" />}
                  <span className="src-title">{s.title}</span>
                </a>
              );
            })}
          </div>
          <div className="coverage">
            {b.meta.tracks.map((t) => (
              <span key={t.id} className={`cov-chip ${t.ok ? "ok" : "bad"}`}>{t.ok ? "✓" : "!"} {TRACK_LABEL[t.id] ?? t.id}{t.ok ? `, ${t.sources} sources` : ", didn't finish"}</span>
            ))}
          </div>
          <p className="method">
            Researched live with Google Search through {b.meta.model} across {b.meta.tracks.length} research tracks.{" "}
            {b.meta.removed.stale + b.meta.removed.uncited > 0
              ? `${b.meta.removed.stale} deals outside the 90-day window and ${b.meta.removed.uncited} unsourced claims were removed.`
              : "Every factual item is dated and sourced."}
          </p>
        </section>
      </div>
    </article>
  );
}
