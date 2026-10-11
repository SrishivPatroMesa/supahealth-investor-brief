import type { Brief } from "./types";
import type { CalMeeting } from "./calendar";

const MID: Record<string, number> = { "< ₹2 Cr": 1, "₹2–5 Cr": 3.5, "₹5–10 Cr": 7.5, "₹10–20 Cr": 15, "₹20 Cr+": 25 };

/** Expected cheque (₹ Cr) from the cheque-size distribution, capped at the round size. */
export function expectedCheque(b: Brief, raise: number): number {
  const d = b.analysis.cheque.distribution;
  const total = d.reduce((s, x) => s + x.probability, 0) || 1;
  const ev = d.reduce((s, x) => s + (x.probability / total) * (MID[x.bucket] ?? 0), 0);
  return Math.min(ev, raise);
}

/** Expected commitments across the pipeline = Σ term-sheet odds × expected cheque. */
export function roundCoverage(briefs: Brief[], raise: number) {
  const rows = briefs
    .map((b) => ({ b, cheque: expectedCheque(b, raise), p: b.prediction.probability / 100 }))
    .map((r) => ({ ...r, expected: r.cheque * r.p }))
    .sort((x, y) => y.expected - x.expected);
  const expected = rows.reduce((s, r) => s + r.expected, 0);
  return { rows, expected, pct: Math.min(100, (expected / raise) * 100) };
}

export function bandCounts(briefs: Brief[]) {
  const order = ["Strong", "Promising", "Long shot", "Unlikely"] as const;
  return order.map((band) => ({ band, count: briefs.filter((b) => b.prediction.band === band).length }));
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z]/g, "");
export const findBrief = (briefs: Brief[], investor: string) =>
  briefs.find((b) => norm(b.investor.name) === norm(investor) || norm(b.meta.input.investor) === norm(investor));

export type Action = { tone: "rose" | "amber" | "indigo" | "teal"; title: string; detail: string; cta?: { label: string; kind: "prepare" | "open" | "meetings" | "directory"; investor?: string; firm?: string; brief?: Brief } };

export function nextActions(briefs: Brief[], meetings: CalMeeting[], raise: number): Action[] {
  const out: Action[] = [];
  const now = Date.now();
  const soon = meetings.filter((m) => { const t = new Date(m.when).getTime(); return t > now && t - now < 4 * 86_400_000; })
    .sort((a, b) => a.when.localeCompare(b.when));
  for (const m of soon) {
    const days = Math.max(0, Math.round((new Date(m.when).getTime() - now) / 86_400_000));
    const brief = findBrief(briefs, m.investor);
    if (!brief) out.push({ tone: "rose", title: `Prepare the brief for ${m.investor}`, detail: `Meeting ${days === 0 ? "today" : `in ${days} day${days === 1 ? "" : "s"}`}, no brief yet.`, cta: { label: "Prepare", kind: "prepare", investor: m.investor, firm: m.firm } });
    else out.push({ tone: "teal", title: `Review ${m.investor}'s playbook`, detail: `Meeting ${days === 0 ? "today" : `in ${days} day${days === 1 ? "" : "s"}`}. Fit ${brief.prediction.index}, ${brief.prediction.probability}% odds.`, cta: { label: "Open", kind: "open", brief } });
  }
  for (const b of briefs.filter((x) => x.identity.confidence !== "high").slice(0, 2)) {
    out.push({ tone: "amber", title: `Double-check who ${b.investor.name} is`, detail: b.identity.note || "Identity wasn't fully confirmed in public sources.", cta: { label: "Open", kind: "open", brief: b } });
  }
  const strongNoMeeting = briefs.filter((b) => (b.prediction.band === "Strong" || b.prediction.band === "Promising") && !meetings.some((m) => norm(m.investor) === norm(b.investor.name)));
  for (const b of strongNoMeeting.slice(0, 2)) {
    out.push({ tone: "indigo", title: `Book a meeting with ${b.investor.name}`, detail: `${b.prediction.band} fit (${b.prediction.index}) and no meeting planned yet.`, cta: { label: "Plan", kind: "meetings" } });
  }
  const cov = roundCoverage(briefs, raise);
  if (briefs.length > 0 && cov.expected < raise) {
    out.push({ tone: "indigo", title: "Widen the pipeline", detail: `Expected commitments are ₹${cov.expected.toFixed(1)} Cr of ₹${raise} Cr. Add more consumer-focused investors.`, cta: { label: "Directory", kind: "directory" } });
  }
  return out.slice(0, 6);
}
