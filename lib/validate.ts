import type { Analysis, BriefCore } from "./types";

/** Parse "2026-08-14", "2026-08", "Aug 2026" etc. Month-only dates resolve to month end. */
export function parseLooseDate(s: string): Date | null {
  const t = s.trim();
  if (!t) return null;
  const ym = t.match(/^(\d{4})-(\d{2})$/);
  if (ym) return new Date(Date.UTC(+ym[1], +ym[2], 0));
  const d = new Date(t);
  return isNaN(d.getTime()) ? null : d;
}

type Removed = { stale: number; uncited: number };

/**
 * Validation layer. Enforces the brief's guarantees in code rather than
 * trusting the model: 90-day window, no uncited facts, valid source ids,
 * exactly three talking points.
 */
export function validateBrief(b: BriefCore, windowStart: Date, validIds: Set<number>, removed: Removed): BriefCore {
  const clean = (ids: number[]) => [...new Set(ids.filter((i) => validIds.has(i)))];
  const cited = <T extends { sourceIds: number[] }>(xs: T[]) =>
    xs.map((x) => ({ ...x, sourceIds: clean(x.sourceIds) })).filter((x) => (x.sourceIds.length ? true : (removed.uncited++, false)));

  const portfolioActivity = cited(b.portfolioActivity)
    .filter((p) => {
      const d = parseLooseDate(p.date);
      if (d && d < windowStart) { removed.stale++; return false; }
      return true;
    })
    .map((p) => (parseLooseDate(p.date) ? p : { ...p, dateUnverified: true }))
    .sort((a, z) => (parseLooseDate(z.date)?.getTime() ?? 0) - (parseLooseDate(a.date)?.getTime() ?? 0));

  const order = { flag: 0, watch: 1, info: 2 } as const;
  const gaps = [...b.gaps];
  if (!portfolioActivity.length && !gaps.some((g) => /portfolio|deal|investment/i.test(g))) {
    gaps.push("No verified investments or exits found in the last 90 days.");
  }

  return {
    ...b,
    portfolioActivity,
    thesis: { ...b.thesis, themes: cited(b.thesis.themes) },
    context: cited(b.context).sort((a, z) => order[a.severity] - order[z.severity]),
    talkingPoints: b.talkingPoints.slice(0, 3).map((t) => ({ ...t, sourceIds: clean(t.sourceIds) })),
    objections: b.objections.slice(0, 3),
    gaps,
  };
}

export function validateAnalysis(a: Analysis, validIds: Set<number>, removed: Removed): Analysis {
  const clean = (ids: number[]) => [...new Set(ids.filter((i) => validIds.has(i)))];
  const cited = <T extends { sourceIds: number[] }>(xs: T[]) =>
    xs.map((x) => ({ ...x, sourceIds: clean(x.sourceIds) })).filter((x) => (x.sourceIds.length ? true : (removed.uncited++, false)));
  const loose = <T extends { sourceIds: number[] }>(xs: T[]) => xs.map((x) => ({ ...x, sourceIds: clean(x.sourceIds) }));

  const funIds = clean(a.funFact.sourceIds);
  const funFact = a.funFact.fact && funIds.length ? { ...a.funFact, sourceIds: funIds } : { fact: "", howToUse: "", sourceIds: [] };
  if (a.funFact.fact && !funIds.length) removed.uncited++;

  return {
    ...a,
    factors: loose(a.factors),
    cheque: { ...a.cheque, sourceIds: clean(a.cheque.sourceIds) },
    comparables: cited(a.comparables).slice(0, 6),
    person: {
      background: cited(a.person.background),
      keyBets: cited(a.person.keyBets),
      insights: loose(a.person.insights),
    },
    hooks: loose(a.hooks).slice(0, 3),
    connections: cited(a.connections).sort(
      (x, y) => ({ strong: 0, possible: 1, weak: 2 })[x.strength] - ({ strong: 0, possible: 1, weak: 2 })[y.strength]
    ),
    funFact,
    activity: {
      monthly: a.activity.monthly.filter((m) => /^\d{4}-\d{2}/.test(m.month) && m.deals >= 0),
      sectorMix: a.activity.sectorMix.filter((s) => s.count > 0).sort((x, y) => y.count - x.count).slice(0, 6),
    },
  };
}
