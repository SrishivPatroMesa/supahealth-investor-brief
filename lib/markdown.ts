import type { Brief } from "./types";

const cite = (ids: number[]) => (ids?.length ? " " + ids.map((i) => `[${i}]`).join("") : "");

export function briefToMarkdown(b: Brief): string {
  const a = b.analysis, p = b.prediction;
  const company = b.meta.company || "SupaHealth";
  const L: string[] = [];
  const date = new Date(b.meta.generatedAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });

  L.push(`# Investor brief: ${b.investor.name}, ${b.investor.firm}`);
  L.push(`Prepared for ${company} on ${date}. Identity confidence: ${b.identity.confidence}.`, "");
  L.push(`**Verdict:** ${a.verdict.headline}`, "");
  L.push(`**Fit index:** ${p.index}/100 · **Estimated chance of a term sheet:** ${p.probability}% (${p.band})`);
  if (a.verdict.meetingGoal) L.push(`**Aim for:** ${a.verdict.meetingGoal}`);
  if (a.verdict.recommendedAsk) L.push(`**Ask for:** ${a.verdict.recommendedAsk}`);
  L.push("", b.summary, "");
  if (a.funFact.fact) L.push(`> **Little-known fact:** ${a.funFact.fact}${cite(a.funFact.sourceIds)}  `, `> ${a.funFact.howToUse}`, "");

  L.push("## The odds");
  L.push("| Stage | Probability |", "|---|---|", ...p.funnel.map((f) => `| ${f.stage} | ${f.probability}% |`), "");
  L.push("| Factor | Weight | Score | Evidence |", "|---|---|---|---|",
    ...p.factors.map((f) => `| ${f.label} | ${Math.round(f.weight * 100)}% | ${f.score}/10 | ${f.evidence.replace(/\|/g, "/")}${cite(f.sourceIds)} |`), "");
  if (p.capped) L.push(`_${p.capped}_`, "");
  L.push("**Likely cheque size:** " + a.cheque.distribution.map((d) => `${d.bucket} ${d.probability}%`).join(", "));
  if (a.cheque.rationale) L.push(a.cheque.rationale + cite(a.cheque.sourceIds));
  if (b.fit.overlaps.length) L.push("", "**Overlaps:**", ...b.fit.overlaps.map((o) => `- ${o}`));
  if (b.fit.conflicts.length) L.push("", "**Possible conflicts:**", ...b.fit.conflicts.map((c) => `- ${c.company}: ${c.reason}`));
  L.push("");

  L.push("## The person");
  const facts: [string, string][] = [
    ["Role", b.investor.role], ["Firm", b.investor.firmDescription], ["Stage focus", b.investor.stageFocus],
    ["Cheque size", b.investor.checkSize], ["Based in", b.investor.location],
  ];
  facts.filter(([, v]) => v).forEach(([k, v]) => L.push(`- **${k}:** ${v}`));
  a.person.background.forEach((x) => L.push(`- ${x.fact}${cite(x.sourceIds)}`));
  if (a.person.keyBets.length) L.push("", "**Bets that define them**", ...a.person.keyBets.map((k) => `- **${k.company}** (${k.outcome}): ${k.whyItMatters}${cite(k.sourceIds)}`));
  if (a.person.insights.length) L.push("", "**How they think**", ...a.person.insights.map((x) => `- ${x.insight}${cite(x.sourceIds)}`));
  L.push("");

  L.push("## How to open");
  a.hooks.forEach((h) => L.push(`- **${h.hook}:** "${h.line}"${cite(h.sourceIds)}`));
  L.push("", "**Talking points**");
  b.talkingPoints.forEach((t, i) => L.push(`${i + 1}. **${t.title}**`, `   > ${t.opener}`, `   ${t.why}${cite(t.sourceIds)}`));
  L.push("");

  L.push("## Connections");
  if (!a.connections.length) L.push("No public overlap found.");
  a.connections.forEach((c) => L.push(`- **${c.strength} (${c.type}):** ${c.detail}${cite(c.sourceIds)}. ${c.howToUse}`));
  L.push("");

  L.push(`## Recent portfolio activity (since ${b.meta.windowStart})`);
  if (!b.portfolioActivity.length) L.push("No verified deals found in the last 90 days.");
  b.portfolioActivity.forEach((d) =>
    L.push(`- **${d.company}** (${d.type}${d.round ? `, ${d.round}` : ""}${d.amount ? `, ${d.amount}` : ""}) ${d.date || "date unverified"}. ${d.sector ? d.sector + ". " : ""}${d.note}${cite(d.sourceIds)}`)
  );
  if (a.activity.sectorMix.length) L.push("", "Sector mix, last 12 months: " + a.activity.sectorMix.map((s) => `${s.sector} (${s.count})`).join(", "));
  L.push("");

  L.push("## Comparable brands in their portfolio");
  if (!a.comparables.length) L.push("None found.");
  a.comparables.forEach((c) => {
    const nums = [c.revenueCr ? `revenue ₹${c.revenueCr} Cr` : "", c.fundingCr ? `funding ₹${c.fundingCr} Cr` : ""].filter(Boolean).join(", ");
    L.push(`- **${c.company}** (${c.trajectory}${nums ? `; ${nums}` : ""}): ${c.whatTheyDo}. ${c.trajectoryNote}${cite(c.sourceIds)}`, `  - vs ${company}: ${c.vsUs}`);
  });
  L.push("");

  L.push("## Investment thesis");
  if (b.thesis.summary) L.push(b.thesis.summary, "");
  b.thesis.themes.forEach((t) => L.push(`- **${t.theme}:** ${t.evidence}${cite(t.sourceIds)}`));
  L.push("");

  L.push("## Context to know");
  if (!b.context.length) L.push("Nothing notable found.");
  b.context.forEach((c) => L.push(`- **[${c.severity}] ${c.title}:** ${c.detail}${cite(c.sourceIds)}`));
  L.push("");

  L.push("## Likely objections");
  b.objections.forEach((o) => L.push(`- **"${o.objection}"**: ${o.response}`));
  L.push("");

  if (b.gaps.length) L.push("## What we couldn't verify", ...b.gaps.map((g) => `- ${g}`), "");

  L.push("## Sources");
  b.sources.forEach((s) => L.push(`${s.id}. [${s.title}](${s.url})`));
  return L.join("\n");
}
