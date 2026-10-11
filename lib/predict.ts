import { CHEQUE_BUCKETS, FACTOR_IDS, type Analysis, type FactorId, type Prediction } from "./types";

/**
 * The prediction score is computed here, transparently, from eight factors
 * Gemini scores 0–10 with evidence. The model never outputs the final %.
 */
export const FACTOR_META: Record<FactorId, { label: string; weight: number; help: string }> = {
  stage: { label: "Stage match", weight: 0.16, help: "Do they invest at seed / pre-Series A?" },
  sector: { label: "Sector match", weight: 0.16, help: "Consumer, D2C, health or nutrition in their portfolio" },
  thesis: { label: "Thesis alignment", weight: 0.15, help: "What they say they want vs what SupaHealth is" },
  cheque: { label: "Cheque size match", weight: 0.12, help: "Their typical cheque vs the round" },
  deployment: { label: "Actively deploying", weight: 0.14, help: "Recent deals, fresh fund, pace" },
  conflict: { label: "No portfolio conflict", weight: 0.11, help: "10 = no competing brand; 0 = direct competitor" },
  geography: { label: "Geography", weight: 0.06, help: "Invests in Indian / Bengaluru companies" },
  warmth: { label: "Connection warmth", weight: 0.1, help: "Shared networks or a path to a warm intro" },
};

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));
const round1 = (n: number) => Math.round(n * 10) / 10;

export function computePrediction(a: Analysis, identity: "high" | "medium" | "low"): Prediction {
  const byId = new Map(a.factors.map((f) => [f.id, f]));
  const factors = FACTOR_IDS.map((id) => {
    const f = byId.get(id);
    return {
      id,
      label: FACTOR_META[id].label,
      weight: FACTOR_META[id].weight,
      score: clamp(Number.isFinite(f?.score) ? (f!.score as number) : 5, 0, 10),
      evidence: f?.evidence || "Not enough public information; scored neutral.",
      sourceIds: f?.sourceIds ?? [],
    };
  });

  const x = factors.reduce((s, f) => s + f.weight * (f.score / 10), 0); // 0..1
  let index = Math.round(x * 100);

  // Funnel: each step's conversion rises with the fit index.
  // Base rates are conservative; these are directional estimates, not forecasts.
  let p1 = 0.2 + 0.65 * x; // follow-up meeting
  let p2 = p1 * (0.15 + 0.55 * x); // partner / IC meeting
  let p3 = p2 * (0.2 + 0.55 * x); // term sheet

  // Hard gates: a direct competitor or a stage mismatch sharply lowers odds.
  const conflict = factors.find((f) => f.id === "conflict")!.score;
  const stage = factors.find((f) => f.id === "stage")!.score;
  let capped: string | undefined;
  if (conflict <= 2) { p2 *= 0.4; p3 *= 0.3; capped = "A direct competitor in their portfolio sharply lowers the odds."; }
  if (stage <= 2) { p3 *= 0.4; capped = (capped ? capped + " " : "") + "They rarely invest at this stage."; }
  if (identity === "low") { capped = (capped ? capped + " " : "") + "Identity is unconfirmed, so treat this score with caution."; }

  const probability = round1(p3 * 100);
  const band: Prediction["band"] =
    probability >= 20 ? "Strong" : probability >= 10 ? "Promising" : probability >= 4 ? "Long shot" : "Unlikely";

  return {
    index: clamp(index, 0, 100),
    probability,
    band,
    funnel: [
      { stage: "First meeting", probability: 100 },
      { stage: "Follow-up meeting", probability: round1(p1 * 100) },
      { stage: "Partner meeting", probability: round1(p2 * 100) },
      { stage: "Term sheet", probability },
    ],
    factors,
    capped,
  };
}

/** Normalise cheque-size probabilities across the fixed buckets to sum to 100. */
export function normaliseCheque(dist: { bucket: string; probability: number }[]) {
  const vals = CHEQUE_BUCKETS.map((b) => {
    const hit = dist.find((d) => d.bucket.replace(/\s/g, "") === b.replace(/\s/g, ""));
    return Math.max(0, hit?.probability ?? 0);
  });
  const sum = vals.reduce((s, v) => s + v, 0);
  return CHEQUE_BUCKETS.map((bucket, i) => ({
    bucket,
    probability: sum > 0 ? Math.round((vals[i] / sum) * 100) : 20,
  }));
}

/** Which bucket the founder's raise falls into. */
export function bucketFor(cr: number): string {
  if (cr < 2) return CHEQUE_BUCKETS[0];
  if (cr <= 5) return CHEQUE_BUCKETS[1];
  if (cr <= 10) return CHEQUE_BUCKETS[2];
  if (cr <= 20) return CHEQUE_BUCKETS[3];
  return CHEQUE_BUCKETS[4];
}

/** Fill the last 12 months, oldest first, with zero where no deals were reported. */
export function last12Months(monthly: { month: string; deals: number }[], now = new Date()) {
  const out: { month: string; label: string; deals: number }[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    const key = d.toISOString().slice(0, 7);
    const deals = monthly.filter((m) => m.month.slice(0, 7) === key).reduce((s, m) => s + (m.deals || 0), 0);
    out.push({ month: key, label: d.toLocaleDateString("en-IN", { month: "short", timeZone: "UTC" }), deals });
  }
  return out;
}
