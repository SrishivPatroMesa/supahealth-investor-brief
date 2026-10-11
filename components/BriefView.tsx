"use client";
import { useState } from "react";
import type { Brief } from "@/lib/types";
import { briefToMarkdown } from "@/lib/markdown";
import { bucketFor, last12Months, FACTOR_META } from "@/lib/predict";
import { ActivityChart, ChequeChart, FactorBars, Funnel, Gauge, ScaleBars, SectorMix } from "./charts";

function Cites({ ids }: { ids: number[] }) {
  if (!ids?.length) return null;
  return (
    <span className="cites">
      {ids.map((i) => <a key={i} href={`#src-${i}`} className="cite" aria-label={`Source ${i}`}>{i}</a>)}
    </span>
  );
}

const fmtDate = (d: string) => {
  const m = d?.match(/^(\d{4})-(\d{2})(?:-(\d{2}))?$/);
  if (!m) return d;
  const dt = new Date(Date.UTC(+m[1], +m[2] - 1, m[3] ? +m[3] : 1));
  return dt.toLocaleDateString("en-IN", m[3] ? { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" } : { month: "short", year: "numeric", timeZone: "UTC" });
};

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

const SECTIONS = [
  ["odds", "The odds"], ["person", "The person"], ["opening", "How to open"], ["connections", "Connections"],
  ["activity", "Recent activity"], ["comparables", "Comparable brands"], ["thesis", "Thesis"],
  ["context", "Context"], ["objections", "Objections"], ["sources", "Sources"],
] as const;

export function BriefView({ brief: b, onNew }: { brief: Brief; onNew: () => void }) {
  const [copied, setCopied] = useState(false);
  const a = b.analysis;
  const p = b.prediction;
  const company = b.meta.company || "SupaHealth";
  const generated = new Date(b.meta.generatedAt);

  const copy = async () => {
    await navigator.clipboard.writeText(briefToMarkdown(b));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  const print = () => {
    const details = [...document.querySelectorAll("details")];
    const wasOpen = details.map((d) => d.open);
    details.forEach((d) => (d.open = true));
    const prev = document.title;
    document.title = `Investor brief - ${b.investor.name} - ${b.investor.firm}`;
    window.print();
    document.title = prev;
    details.forEach((d, i) => (d.open = wasOpen[i]));
  };
  const download = () => {
    const blob = new Blob([briefToMarkdown(b)], { type: "text/markdown" });
    const el = document.createElement("a");
    el.href = URL.createObjectURL(blob);
    el.download = `investor-brief-${b.investor.name.toLowerCase().replace(/\W+/g, "-")}.md`;
    el.click();
    URL.revokeObjectURL(el.href);
  };

  const months = last12Months(a.activity.monthly, generated);
  const totalDeals = months.reduce((s, m) => s + m.deals, 0);
  const revRows = a.comparables.filter((c) => c.revenueCr > 0);
  const fundRows = a.comparables.filter((c) => c.fundingCr > 0);
  const useRevenue = revRows.length >= 2 || (revRows.length >= 1 && fundRows.length < 2);
  const ourRevenue = b.meta.revenueCr ?? 2.4;

  return (
    <article className="brief">
      <header className="brief-head">
        <div className="brief-actions no-print">
          <button className="btn btn-ghost" onClick={onNew}>New brief</button>
          <span className="spacer" />
          <button className="btn btn-quiet" onClick={copy}>{copied ? "Copied" : "Copy as Markdown"}</button>
          <button className="btn btn-quiet" onClick={download}>Download .md</button>
          <button className="btn btn-primary" onClick={print}>Save as PDF</button>
        </div>

        <p className="brief-kicker">
          Investor brief for {company}, prepared{" "}
          {generated.toLocaleString("en-IN", { day: "numeric", month: "long", year: "numeric", hour: "numeric", minute: "2-digit" })}
        </p>
        <h1 className="brief-name">{b.investor.name}</h1>
        <p className="brief-role">
          {[b.investor.role, b.investor.firm].filter(Boolean).join(", ")}
          {b.investor.location && <span className="brief-loc">{b.investor.location}</span>}
        </p>

        <div className="verdict">
          <div className="verdict-score">
            <Gauge value={p.index} label="Fit index" />
            <p className="verdict-prob">
              <strong>{p.probability % 1 === 0 ? p.probability : p.probability.toFixed(1)}%</strong> estimated chance of a term sheet
            </p>
            <p className={`band band-${p.band.toLowerCase().replace(" ", "-")}`}>{p.band}</p>
          </div>
          <div className="verdict-body">
            <p className="verdict-headline">{a.verdict.headline}</p>
            <p className="brief-summary">{b.summary}</p>
            <dl className="verdict-facts">
              {a.verdict.meetingGoal && <div><dt>Aim for</dt><dd>{a.verdict.meetingGoal}</dd></div>}
              {a.verdict.recommendedAsk && <div><dt>Ask for</dt><dd>{a.verdict.recommendedAsk}</dd></div>}
              <div><dt>Their likely role</dt><dd>{ROLE[a.verdict.likelyRole]}{a.cheque.typical ? `, typically ${a.cheque.typical}` : ""}</dd></div>
            </dl>
          </div>
        </div>

        {b.identity.confidence !== "high" && (
          <p className={`identity identity-${b.identity.confidence}`} role="note">
            <strong>Identity {b.identity.confidence === "low" ? "unconfirmed" : "likely but not certain"}.</strong>{" "}
            {b.identity.note || "Double-check this is the right person before relying on the brief."}
          </p>
        )}

        {a.funFact.fact && (
          <aside className="funfact">
            <p className="funfact-label">Something most founders won&apos;t know</p>
            <p className="funfact-text">{a.funFact.fact} <Cites ids={a.funFact.sourceIds} /></p>
            {a.funFact.howToUse && <p className="funfact-use">{a.funFact.howToUse}</p>}
          </aside>
        )}
      </header>

      <div className="brief-grid">
        <nav className="brief-nav no-print" aria-label="Brief sections">
          {SECTIONS.map(([id, label]) => <a key={id} href={`#${id}`}>{label}</a>)}
          <p className="nav-meta">{b.sources.length} sources, {Math.round(b.meta.durationMs / 1000)}s</p>
        </nav>

        <div className="brief-body">
          {/* ---------- The odds ---------- */}
          <section id="odds" className="sec">
            <h2>The odds</h2>
            <div className="panel">
              <h3 className="panel-title">From first meeting to term sheet</h3>
              <Funnel steps={p.funnel} />
              {p.capped && <p className="note-warn">{p.capped}</p>}
            </div>

            <div className="panel">
              <h3 className="panel-title">What drives the score</h3>
              <FactorBars factors={p.factors} />
              <details className="why">
                <summary>Why each factor scored this way</summary>
                <dl className="why-list">
                  {p.factors.map((f) => (
                    <div key={f.id}>
                      <dt>{f.label} <span className="muted">{f.score}/10</span></dt>
                      <dd>{f.evidence} <Cites ids={f.sourceIds} /> <span className="why-help">{FACTOR_META[f.id].help}</span></dd>
                    </div>
                  ))}
                </dl>
              </details>
            </div>

            <div className="panel">
              <h3 className="panel-title">Likely cheque size</h3>
              <ChequeChart data={a.cheque.distribution} highlight={bucketFor(b.meta.raiseAmountCr ?? 10)} />
              {a.cheque.rationale && <p className="prose small muted">{a.cheque.rationale} <Cites ids={a.cheque.sourceIds} /></p>}
            </div>

            {(b.fit.overlaps.length > 0 || b.fit.conflicts.length > 0) && (
              <div className="fit-cols">
                {!!b.fit.overlaps.length && (
                  <div>
                    <h3>Where you overlap</h3>
                    <ul className="plain">{b.fit.overlaps.map((o, i) => <li key={i}>{o}</li>)}</ul>
                  </div>
                )}
                <div>
                  <h3>Possible conflicts</h3>
                  {b.fit.conflicts.length ? (
                    <ul className="plain conflicts">{b.fit.conflicts.map((c, i) => <li key={i}><strong>{c.company}.</strong> {c.reason}</li>)}</ul>
                  ) : <p className="prose small muted">No competing brands found in their portfolio.</p>}
                </div>
              </div>
            )}
            <p className="method">
              The fit index is a weighted score of the eight factors above, each rated 0–10 by Gemini from the research. The funnel
              converts it into stage-by-stage odds using conservative base rates. It&apos;s a directional estimate, not a forecast.
            </p>
          </section>

          {/* ---------- The person ---------- */}
          <section id="person" className="sec">
            <h2>The person</h2>
            {b.investor.firmDescription && <p className="prose">{b.investor.firmDescription}</p>}
            <dl className="facts">
              {b.investor.stageFocus && <div><dt>Stage focus</dt><dd>{b.investor.stageFocus}</dd></div>}
              {b.investor.checkSize && <div><dt>Cheque size</dt><dd>{b.investor.checkSize}</dd></div>}
              {b.investor.location && <div><dt>Based in</dt><dd>{b.investor.location}</dd></div>}
            </dl>
            {!!a.person.background.length && (
              <>
                <h3 className="sub">Background</h3>
                <ul className="plain">{a.person.background.map((x, i) => <li key={i}>{x.fact} <Cites ids={x.sourceIds} /></li>)}</ul>
              </>
            )}
            {!!a.person.keyBets.length && (
              <>
                <h3 className="sub">Bets that define them</h3>
                <ul className="bets">
                  {a.person.keyBets.map((k, i) => (
                    <li key={i}>
                      <p className="bet-head"><strong>{k.company}</strong>{k.outcome && <span className="bet-outcome">{k.outcome}</span>}</p>
                      {k.whyItMatters && <p className="prose small">{k.whyItMatters} <Cites ids={k.sourceIds} /></p>}
                    </li>
                  ))}
                </ul>
              </>
            )}
            {!!a.person.insights.length && (
              <>
                <h3 className="sub">How they think</h3>
                <ul className="plain">{a.person.insights.map((x, i) => <li key={i}>{x.insight} <Cites ids={x.sourceIds} /></li>)}</ul>
              </>
            )}
          </section>

          {/* ---------- How to open ---------- */}
          <section id="opening" className="sec">
            <h2>How to open</h2>
            {!!a.hooks.length && (
              <ul className="hooks">
                {a.hooks.map((h, i) => (
                  <li key={i}>
                    <p className="hook-topic">{h.hook}</p>
                    <p className="hook-line">{h.line} <Cites ids={h.sourceIds} /></p>
                  </li>
                ))}
              </ul>
            )}
            <h3 className="sub">Talking points</h3>
            <ol className="points">
              {b.talkingPoints.map((t, i) => (
                <li key={i}>
                  <h3>{t.title}</h3>
                  <blockquote>{t.opener}</blockquote>
                  <p className="prose small muted">{t.why} <Cites ids={t.sourceIds} /></p>
                </li>
              ))}
            </ol>
          </section>

          {/* ---------- Connections ---------- */}
          <section id="connections" className="sec">
            <h2>Connections <span className="sec-sub">public paths to {b.investor.name.split(" ")[0]}</span></h2>
            {a.connections.length ? (
              <ul className="links">
                {a.connections.map((c, i) => (
                  <li key={i} className={`link link-${c.strength}`}>
                    <p className="link-meta"><span className="link-strength">{c.strength === "strong" ? "Strong link" : c.strength === "possible" ? "Possible link" : "Weak link"}</span><span className="cat">{CONNECTION[c.type]}</span></p>
                    <p className="link-detail">{c.detail} <Cites ids={c.sourceIds} /></p>
                    {c.howToUse && <p className="prose small muted">{c.howToUse}</p>}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="empty">No public overlap found with your education, past employers or communities. Look for a warm intro through one of their portfolio founders.</p>
            )}
            <p className="method">Based on public information only. LinkedIn mutual connections aren&apos;t visible to this tool; check them on LinkedIn before the meeting.</p>
          </section>

          {/* ---------- Recent activity ---------- */}
          <section id="activity" className="sec">
            <h2>Recent activity <span className="sec-sub">since {fmtDate(b.meta.windowStart)}</span></h2>
            {b.portfolioActivity.length ? (
              <ol className="timeline">
                {b.portfolioActivity.map((d, i) => (
                  <li key={i} className={`deal deal-${d.type}`}>
                    <time className="deal-date">{d.date ? fmtDate(d.date) : "Date unverified"}</time>
                    <div>
                      <p className="deal-head">
                        <strong>{d.company}</strong>
                        <span className="tag">{d.type === "follow-on" ? "Follow-on" : d.type === "exit" ? "Exit" : d.type === "investment" ? "New investment" : "Other"}</span>
                      </p>
                      <p className="deal-meta">{[d.round, d.amount, d.sector].filter(Boolean).join(", ")}</p>
                      <p className="prose small">{d.note} <Cites ids={d.sourceIds} /></p>
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="empty">No verified investments or exits in the last 90 days. A quiet period can mean they are between funds; ask about their deployment pace.</p>
            )}
            {totalDeals > 0 && (
              <div className="panel-row">
                <div className="panel">
                  <h3 className="panel-title">Deals by month, last 12 months <span className="muted">{totalDeals} reported</span></h3>
                  <ActivityChart data={months} />
                </div>
                {!!a.activity.sectorMix.length && (
                  <div className="panel">
                    <h3 className="panel-title">Where the money went</h3>
                    <SectorMix data={a.activity.sectorMix} />
                  </div>
                )}
              </div>
            )}
          </section>

          {/* ---------- Comparables ---------- */}
          <section id="comparables" className="sec">
            <h2>Comparable brands <span className="sec-sub">in their portfolio</span></h2>
            {a.comparables.length ? (
              <>
                {(useRevenue ? revRows.length : fundRows.length) > 0 && (
                  <div className="panel">
                    <h3 className="panel-title">{useRevenue ? "Latest reported revenue" : "Total funding raised"}</h3>
                    <ScaleBars
                      unit={useRevenue ? "Revenue in ₹ Cr, latest reported year" : `Funding in ₹ Cr. ${company} is raising ₹${b.meta.raiseAmountCr ?? 10} Cr.`}
                      rows={[
                        ...(useRevenue ? revRows.map((c) => ({ name: c.company, value: c.revenueCr })) : fundRows.map((c) => ({ name: c.company, value: c.fundingCr }))),
                        ...(useRevenue ? [{ name: `${company} (ARR)`, value: ourRevenue, us: true }] : []),
                      ].sort((x, y) => y.value - x.value)}
                    />
                  </div>
                )}
                <ul className="comps">
                  {a.comparables.map((c, i) => (
                    <li key={i}>
                      <div className="comp-head">
                        <strong>{c.company}</strong>
                        <span className={`traj traj-${c.trajectory}`}>{TRAJECTORY[c.trajectory]}</span>
                      </div>
                      <p className="deal-meta">{[c.whatTheyDo, c.invested && `Backed ${c.invested}`, c.scale].filter(Boolean).join(". ")}</p>
                      {c.trajectoryNote && <p className="prose small">{c.trajectoryNote} <Cites ids={c.sourceIds} /></p>}
                      {c.vsUs && <p className="vs"><span>Versus {company}:</span> {c.vsUs}</p>}
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="empty">No comparable consumer or health brands found in their portfolio. You may be their first bet in this category; frame that as an opening, not a risk.</p>
            )}
          </section>

          {/* ---------- Thesis ---------- */}
          <section id="thesis" className="sec">
            <h2>Investment thesis</h2>
            {b.thesis.summary && <p className="prose lead">{b.thesis.summary}</p>}
            <ul className="themes">
              {b.thesis.themes.map((t, i) => (
                <li key={i}><h3>{t.theme}</h3><p className="prose small">{t.evidence} <Cites ids={t.sourceIds} /></p></li>
              ))}
            </ul>
            {!b.thesis.themes.length && <p className="empty">No public statements of thesis found.</p>}
          </section>

          {/* ---------- Context ---------- */}
          <section id="context" className="sec">
            <h2>Context to know</h2>
            {b.context.length ? (
              <ul className="context">
                {b.context.map((c, i) => (
                  <li key={i} className={`ctx ctx-${c.severity}`}>
                    <p className="ctx-meta"><span className="sev">{SEVERITY[c.severity]}</span><span className="cat">{CATEGORY[c.category]}</span></p>
                    <h3>{c.title}</h3>
                    <p className="prose small">{c.detail} <Cites ids={c.sourceIds} /></p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="empty">Nothing notable found: no public controversies, sector exits or portfolio trouble.</p>
            )}
          </section>

          {/* ---------- Objections ---------- */}
          <section id="objections" className="sec">
            <h2>Likely objections</h2>
            <dl className="objections">
              {b.objections.map((o, i) => (
                <div key={i}><dt>{o.objection}</dt><dd>{o.response}</dd></div>
              ))}
            </dl>
          </section>

          {!!b.gaps.length && (
            <section className="sec gaps">
              <h2>What we couldn&apos;t verify</h2>
              <ul className="plain">{b.gaps.map((g, i) => <li key={i}>{g}</li>)}</ul>
            </section>
          )}

          <section id="sources" className="sec">
            <h2>Sources</h2>
            <ol className="sources">
              {b.sources.map((s) => (
                <li key={s.id} id={`src-${s.id}`}>
                  <span className="src-num">{s.id}</span>
                  <a href={s.url} target="_blank" rel="noopener noreferrer">{s.title}</a>
                </li>
              ))}
            </ol>
            <p className="method">
              Researched live with Google Search through {b.meta.model} across {b.meta.tracks.length} research tracks.{" "}
              {b.meta.removed.stale + b.meta.removed.uncited > 0
                ? `${b.meta.removed.stale} deals outside the 90-day window and ${b.meta.removed.uncited} unsourced claims were removed.`
                : "Every factual item is dated and sourced."}
            </p>
          </section>
        </div>
      </div>
    </article>
  );
}
