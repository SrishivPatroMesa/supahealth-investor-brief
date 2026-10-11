/** JSON Schemas passed to Gemini (responseJsonSchema) for the two synthesis calls. */
import { CHEQUE_BUCKETS, FACTOR_IDS } from "./types";

const str = { type: "string" };
const num = { type: "number" };
const ids = { type: "array", items: { type: "integer" } };
const obj = (properties: Record<string, object>) => ({
  type: "object",
  properties,
  required: Object.keys(properties),
});
const arr = (items: object, extra: object = {}) => ({ type: "array", items, ...extra });
const en = (values: readonly string[]) => ({ type: "string", enum: values });

export const briefJsonSchema = obj({
  investor: obj({
    name: str, role: str, firm: str, firmDescription: str, stageFocus: str, checkSize: str, location: str,
  }),
  identity: obj({ confidence: en(["high", "medium", "low"]), note: str }),
  summary: str,
  portfolioActivity: arr(
    obj({
      company: str, type: en(["investment", "follow-on", "exit", "other"]),
      round: str, amount: str, date: str, sector: str, note: str, sourceIds: ids,
    })
  ),
  thesis: obj({ summary: str, themes: arr(obj({ theme: str, evidence: str, sourceIds: ids })) }),
  context: arr(
    obj({
      category: en(["sector-shift", "controversy", "portfolio-pivot", "portfolio-risk", "fund-status", "other"]),
      title: str, detail: str, severity: en(["info", "watch", "flag"]), sourceIds: ids,
    })
  ),
  fit: obj({ overlaps: arr(str), conflicts: arr(obj({ company: str, reason: str })) }),
  talkingPoints: arr(obj({ title: str, opener: str, why: str, sourceIds: ids }), { minItems: 3, maxItems: 3 }),
  objections: arr(obj({ objection: str, response: str }), { minItems: 3, maxItems: 3 }),
  gaps: arr(str),
});

export const analysisJsonSchema = obj({
  verdict: obj({
    headline: str, meetingGoal: str, recommendedAsk: str,
    likelyRole: en(["lead", "co-lead", "follow", "unlikely"]),
  }),
  factors: arr(obj({ id: en(FACTOR_IDS), score: num, evidence: str, sourceIds: ids }), { minItems: 8, maxItems: 8 }),
  cheque: obj({
    distribution: arr(obj({ bucket: en(CHEQUE_BUCKETS), probability: num }), { minItems: 5, maxItems: 5 }),
    typical: str, rationale: str, sourceIds: ids,
  }),
  comparables: arr(
    obj({
      company: str, whatTheyDo: str, invested: str, revenueCr: num, fundingCr: num, scale: str,
      trajectory: en(["scaling", "steady", "struggling", "exited", "shut-down", "unknown"]),
      trajectoryNote: str, vsUs: str, sourceIds: ids,
    }),
    { maxItems: 6 }
  ),
  person: obj({
    background: arr(obj({ fact: str, sourceIds: ids })),
    keyBets: arr(obj({ company: str, outcome: str, whyItMatters: str, sourceIds: ids })),
    insights: arr(obj({ insight: str, sourceIds: ids })),
  }),
  hooks: arr(obj({ hook: str, line: str, sourceIds: ids }), { maxItems: 3 }),
  connections: arr(
    obj({
      type: en(["alma-mater", "ex-employer", "co-investor", "portfolio-founder", "community", "location", "other"]),
      detail: str, strength: en(["strong", "possible", "weak"]), howToUse: str, sourceIds: ids,
    })
  ),
  funFact: obj({ fact: str, howToUse: str, sourceIds: ids }),
  activity: obj({
    monthly: arr(obj({ month: str, deals: num })),
    sectorMix: arr(obj({ sector: str, count: num }), { maxItems: 6 }),
  }),
});
