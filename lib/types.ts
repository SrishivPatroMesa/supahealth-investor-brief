import { z } from "zod";

export const Source = z.object({
  id: z.number(),
  title: z.string(),
  url: z.string(),
  domain: z.string().optional(),
});
export type Source = z.infer<typeof Source>;

const ids = z.array(z.number()).default([]);
const num = z.coerce.number().default(0);

/* ---------- Synthesis A: the factual brief ---------- */

export const PortfolioItem = z.object({
  company: z.string(),
  type: z.enum(["investment", "follow-on", "exit", "other"]),
  round: z.string().default(""),
  amount: z.string().default(""),
  date: z.string().default(""),
  sector: z.string().default(""),
  note: z.string().default(""),
  sourceIds: ids,
  dateUnverified: z.boolean().optional(),
});

export const BriefCore = z.object({
  investor: z.object({
    name: z.string(),
    role: z.string().default(""),
    firm: z.string(),
    firmDescription: z.string().default(""),
    stageFocus: z.string().default(""),
    checkSize: z.string().default(""),
    location: z.string().default(""),
  }),
  identity: z.object({
    confidence: z.enum(["high", "medium", "low"]),
    note: z.string().default(""),
  }),
  summary: z.string(),
  portfolioActivity: z.array(PortfolioItem).default([]),
  thesis: z.object({
    summary: z.string().default(""),
    themes: z.array(z.object({ theme: z.string(), evidence: z.string(), sourceIds: ids })).default([]),
  }),
  context: z
    .array(
      z.object({
        category: z.enum(["sector-shift", "controversy", "portfolio-pivot", "portfolio-risk", "fund-status", "other"]),
        title: z.string(),
        detail: z.string(),
        severity: z.enum(["info", "watch", "flag"]),
        sourceIds: ids,
      })
    )
    .default([]),
  fit: z.object({
    overlaps: z.array(z.string()).default([]),
    conflicts: z.array(z.object({ company: z.string(), reason: z.string() })).default([]),
  }),
  talkingPoints: z.array(z.object({ title: z.string(), opener: z.string(), why: z.string(), sourceIds: ids })).default([]),
  objections: z.array(z.object({ objection: z.string(), response: z.string() })).default([]),
  gaps: z.array(z.string()).default([]),
});
export type BriefCore = z.infer<typeof BriefCore>;

/* ---------- Synthesis B: analysis and prediction inputs ---------- */

export const FACTOR_IDS = [
  "stage", "sector", "thesis", "cheque", "deployment", "conflict", "geography", "warmth",
] as const;
export type FactorId = (typeof FACTOR_IDS)[number];

export const CHEQUE_BUCKETS = ["< ₹2 Cr", "₹2–5 Cr", "₹5–10 Cr", "₹10–20 Cr", "₹20 Cr+"] as const;

export const Trajectory = z.enum(["scaling", "steady", "struggling", "exited", "shut-down", "unknown"]);

export const Analysis = z.object({
  verdict: z.object({
    headline: z.string(),
    meetingGoal: z.string(),
    recommendedAsk: z.string(),
    likelyRole: z.enum(["lead", "co-lead", "follow", "unlikely"]),
  }),
  factors: z
    .array(z.object({ id: z.enum(FACTOR_IDS), score: num, evidence: z.string().default(""), sourceIds: ids }))
    .default([]),
  cheque: z.object({
    distribution: z.array(z.object({ bucket: z.string(), probability: num })).default([]),
    typical: z.string().default(""),
    rationale: z.string().default(""),
    sourceIds: ids,
  }),
  comparables: z
    .array(
      z.object({
        company: z.string(),
        whatTheyDo: z.string().default(""),
        invested: z.string().default(""),
        revenueCr: num,
        fundingCr: num,
        scale: z.string().default(""),
        trajectory: Trajectory,
        trajectoryNote: z.string().default(""),
        vsUs: z.string().default(""),
        sourceIds: ids,
      })
    )
    .default([]),
  person: z.object({
    background: z.array(z.object({ fact: z.string(), sourceIds: ids })).default([]),
    keyBets: z
      .array(z.object({ company: z.string(), outcome: z.string().default(""), whyItMatters: z.string().default(""), sourceIds: ids }))
      .default([]),
    insights: z.array(z.object({ insight: z.string(), sourceIds: ids })).default([]),
  }),
  hooks: z.array(z.object({ hook: z.string(), line: z.string(), sourceIds: ids })).default([]),
  connections: z
    .array(
      z.object({
        type: z.enum(["alma-mater", "ex-employer", "co-investor", "portfolio-founder", "community", "location", "other"]),
        detail: z.string(),
        strength: z.enum(["strong", "possible", "weak"]),
        howToUse: z.string().default(""),
        sourceIds: ids,
      })
    )
    .default([]),
  funFact: z.object({ fact: z.string().default(""), howToUse: z.string().default(""), sourceIds: ids }),
  activity: z.object({
    monthly: z.array(z.object({ month: z.string(), deals: num })).default([]),
    sectorMix: z.array(z.object({ sector: z.string(), count: num })).default([]),
  }),
});
export type Analysis = z.infer<typeof Analysis>;

/* ---------- Computed prediction (in code, not by the model) ---------- */

export type Prediction = {
  index: number; // 0–100 weighted fit index
  probability: number; // estimated chance of a term sheet, 0–100
  band: "Strong" | "Promising" | "Long shot" | "Unlikely";
  funnel: { stage: string; probability: number }[];
  factors: { id: FactorId; label: string; weight: number; score: number; evidence: string; sourceIds: number[] }[];
  capped?: string;
};

export type Brief = BriefCore & {
  analysis: Analysis;
  prediction: Prediction;
  sources: Source[];
  meta: {
    generatedAt: string;
    windowStart: string;
    durationMs: number;
    model: string;
    company: string;
    raiseAmountCr: number;
    revenueCr: number;
    input: { investor: string; firm: string };
    tracks: { id: TrackId; ok: boolean; sources: number }[];
    identityFailed?: boolean;
    removed: { stale: number; uncited: number };
  };
};

export type TrackId = "portfolio" | "thesis" | "context" | "comparables" | "person" | "network";

export type StageId = "parse" | "identity" | "research" | "synthesis" | "validate";

export type ProgressEvent =
  | { type: "stage"; stage: StageId; status: "active" | "done" | "error"; detail?: string }
  | { type: "track"; track: TrackId; status: "active" | "done" | "error"; sources?: number; detail?: string }
  | { type: "result"; brief: Brief }
  | { type: "error"; message: string };
