import { groundedResearch, structuredCall, SourceRegistry, MODEL } from "./gemini";
import { parseFirm, parseInvestor } from "./parse-input";
import {
  analysisPrompt, briefPrompt, comparablesPrompt, contextPrompt, identityPrompt, networkPrompt,
  personPrompt, portfolioPrompt, SYNTHESIS_SYSTEM, thesisPrompt, type Ctx,
} from "./prompts";
import { analysisJsonSchema, briefJsonSchema } from "./brief-schema";
import { profileAsText, type Profile } from "./startup-profile";
import { Analysis, BriefCore, type Brief, type ProgressEvent, type TrackId } from "./types";
import { validateAnalysis, validateBrief } from "./validate";
import { computePrediction, normaliseCheque } from "./predict";

const iso = (d: Date) => d.toISOString().slice(0, 10);
const DAY = 24 * 3600 * 1000;

function readLine(text: string, key: string): string {
  const m = text.match(new RegExp(`${key}:\\s*(.+)`, "i"));
  const v = m?.[1]?.trim().replace(/[*_`]/g, "") ?? "";
  return /^unknown$/i.test(v) ? "" : v;
}

/**
 * The agent:
 * 0 parse → 1 identity → 2 six research tracks in parallel
 * → 3 two synthesis calls in parallel (facts + analysis)
 * → 4 validation and the prediction model, both in code.
 * Timeouts are budgeted to finish inside 2 minutes.
 */
export async function runBrief(
  input: { investor: string; firm: string },
  profile: Profile,
  emit: (e: ProgressEvent) => void
): Promise<Brief> {
  const started = Date.now();
  const now = new Date();
  const windowStartDate = new Date(now.getTime() - 90 * DAY);
  const ctxBase = { today: iso(now), windowStart: iso(windowStartDate), yearStart: iso(new Date(now.getTime() - 365 * DAY)) };
  const registry = new SourceRegistry();

  // 0 — parse
  emit({ type: "stage", stage: "parse", status: "active" });
  const inv = parseInvestor(input.investor);
  const firm = parseFirm(input.firm);
  if (!inv.raw || !firm.raw) throw new Error("Enter both the investor and the firm.");
  emit({
    type: "stage", stage: "parse", status: "done",
    detail: [
      inv.kind === "linkedin" ? `LinkedIn URL → ${inv.name || "name unclear"}` : inv.kind === "url" ? "Investor page URL" : inv.name,
      firm.kind === "url" ? `website ${firm.domain}` : firm.name,
    ].join(" at "),
  });

  // 1 — identity, and 2 — six research tracks.
  // When a plain name is given, identity runs alongside the tracks to save time.
  // When the investor is a URL, identity runs first so the tracks get a real name.
  let identityText = "";
  let name = inv.name || inv.raw;
  let firmName = firm.name;
  let match = "unclear";
  let identityFailed = false;

  const runIdentity = async (timeoutMs: number) => {
    emit({ type: "stage", stage: "identity", status: "active" });
    try {
      const r = await groundedResearch(identityPrompt(inv, firm, ctxBase.today), registry, {
        urls: [inv.kind === "url" ? inv.url : undefined, firm.url].filter(Boolean) as string[],
        label: "Identity check",
        timeoutMs,
      });
      identityText = r.text;
      const resolvedName = readLine(r.text, "RESOLVED_NAME");
      const resolvedFirm = readLine(r.text, "RESOLVED_FIRM");
      match = readLine(r.text, "MATCH").toLowerCase() || "unclear";
      emit({
        type: "stage", stage: "identity", status: "done",
        detail: match === "yes"
          ? `Confirmed: ${resolvedName || name}, ${resolvedFirm || firmName}`
          : `${resolvedName || name}, ${resolvedFirm || firmName} (match ${match})`,
      });
      return { resolvedName, resolvedFirm };
    } catch (e) {
      console.error("[brief] identity check failed:", (e as Error).message);
      identityFailed = true;
      emit({ type: "stage", stage: "identity", status: "error", detail: (e as Error).message });
      return { resolvedName: "", resolvedFirm: "" };
    }
  };

  const parallelIdentity = inv.kind === "name" && firm.kind === "name";
  let identityPromise: Promise<{ resolvedName: string; resolvedFirm: string }> | null = null;
  if (parallelIdentity) {
    identityPromise = runIdentity(45_000);
  } else {
    const r = await runIdentity(20_000);
    name = r.resolvedName || name;
    firmName = r.resolvedFirm || firmName;
  }
  if (!name || !firmName) throw new Error("Could not work out who the investor is. Try entering their full name.");

  emit({ type: "stage", stage: "research", status: "active" });
  const ctx: Ctx = { name, firm: firmName, ...ctxBase };
  const tracks: { id: TrackId; prompt: string; urls?: string[] }[] = [
    { id: "portfolio", prompt: portfolioPrompt(ctx) },
    { id: "thesis", prompt: thesisPrompt(ctx) },
    { id: "context", prompt: contextPrompt(ctx) },
    { id: "comparables", prompt: comparablesPrompt(ctx, firm), urls: firm.url ? [firm.url] : undefined },
    { id: "person", prompt: personPrompt(ctx) },
    { id: "network", prompt: networkPrompt(ctx, profile) },
  ];
  const notes: Record<TrackId, string> = { portfolio: "", thesis: "", context: "", comparables: "", person: "", network: "" };
  const trackMeta: Brief["meta"]["tracks"] = [];
  const trackTimeout = parallelIdentity ? 65_000 : 55_000;

  await Promise.all([
    ...tracks.map(async (t) => {
      emit({ type: "track", track: t.id, status: "active" });
      try {
        const r = await groundedResearch(t.prompt, registry, { urls: t.urls, label: `${t.id} research`, timeoutMs: trackTimeout });
        notes[t.id] = r.text;
        trackMeta.push({ id: t.id, ok: true, sources: r.sourceIds.length });
        emit({ type: "track", track: t.id, status: "done", sources: r.sourceIds.length });
      } catch (e) {
        console.error(`[brief] ${t.id} track failed:`, (e as Error).message);
        trackMeta.push({ id: t.id, ok: false, sources: 0 });
        emit({ type: "track", track: t.id, status: "error", detail: (e as Error).message });
      }
    }),
    identityPromise ?? Promise.resolve(),
  ]);
  // Retry failed tracks once if there is still time to synthesise afterwards.
  const failedTracks = tracks.filter((t) => trackMeta.some((m) => m.id === t.id && !m.ok));
  const remaining = 112_000 - (Date.now() - started) - 42_000;
  if (failedTracks.length && remaining >= 15_000) {
    await Promise.all(failedTracks.map(async (t) => {
      emit({ type: "track", track: t.id, status: "active", detail: "Retrying" });
      try {
        const r = await groundedResearch(t.prompt, registry, { urls: t.urls, label: `${t.id} retry`, timeoutMs: remaining });
        notes[t.id] = r.text;
        const m = trackMeta.find((x) => x.id === t.id)!;
        m.ok = true; m.sources = r.sourceIds.length;
        emit({ type: "track", track: t.id, status: "done", sources: r.sourceIds.length });
      } catch (e) {
        console.error(`[brief] ${t.id} retry failed:`, (e as Error).message);
        emit({ type: "track", track: t.id, status: "error", detail: (e as Error).message });
      }
    }));
  }
  if (identityPromise) {
    const r = await identityPromise;
    name = r.resolvedName || name;
    firmName = r.resolvedFirm || firmName;
    ctx.name = name;
    ctx.firm = firmName;
  }
  if (trackMeta.every((t) => !t.ok)) {
    throw new Error("All research tracks failed. Check the Gemini API key, quota and model name.");
  }
  emit({ type: "stage", stage: "research", status: "done", detail: `${registry.count()} sources collected` });

  // 3 — synthesis: facts and analysis in parallel
  emit({ type: "stage", stage: "synthesis", status: "active" });
  const profileText = profileAsText(profile);
  const factNotes = {
    identity: identityText, portfolio: notes.portfolio, thesis: notes.thesis,
    context: notes.context, "comparable brands": notes.comparables,
  };
  const allNotes = { ...factNotes, "the person": notes.person, "connections to the founder": notes.network };

  const [rawBrief, rawAnalysis] = await Promise.all([
    structuredCall(briefPrompt(ctx, profileText, factNotes, match), briefJsonSchema, { system: SYNTHESIS_SYSTEM, timeoutMs: 42_000 }),
    structuredCall(analysisPrompt(ctx, profile, profileText, allNotes, match), analysisJsonSchema, { system: SYNTHESIS_SYSTEM, timeoutMs: 42_000 })
      .catch((e) => { emit({ type: "stage", stage: "synthesis", status: "active", detail: `Analysis retry skipped: ${(e as Error).message}` }); return null; }),
  ]);
  const core = BriefCore.safeParse(rawBrief);
  if (!core.success) throw new Error("The brief came back in an unexpected shape. Run it again.");
  const analysisParsed = Analysis.safeParse(rawAnalysis ?? {});
  const analysisRaw: Analysis = analysisParsed.success
    ? analysisParsed.data
    : Analysis.parse({
        verdict: { headline: "Analysis unavailable for this run.", meetingGoal: "", recommendedAsk: "", likelyRole: "unlikely" },
        cheque: {}, person: {}, funFact: {}, activity: {},
      });
  emit({ type: "stage", stage: "synthesis", status: "done", detail: analysisParsed.success ? undefined : "Analysis layer failed; showing the factual brief" });

  // 4 — validation and prediction
  emit({ type: "stage", stage: "validate", status: "active" });
  const sources = registry.list();
  const valid = new Set(sources.map((s) => s.id));
  const removed = { stale: 0, uncited: 0 };
  const brief = validateBrief(core.data, windowStartDate, valid, removed);
  const analysis = validateAnalysis(analysisRaw, valid, removed);
  analysis.cheque.distribution = normaliseCheque(analysis.cheque.distribution);
  const prediction = computePrediction(analysis, brief.identity.confidence);
  emit({
    type: "stage", stage: "validate", status: "done",
    detail: removed.stale + removed.uncited
      ? `Removed ${removed.stale} out-of-window and ${removed.uncited} unsourced items`
      : "All items dated and sourced",
  });

  return {
    ...brief,
    analysis,
    prediction,
    sources,
    meta: {
      generatedAt: now.toISOString(),
      windowStart: ctxBase.windowStart,
      durationMs: Date.now() - started,
      model: MODEL,
      company: profile.company,
      raiseAmountCr: profile.raiseAmountCr,
      revenueCr: profile.revenueCr,
      input,
      tracks: trackMeta,
      identityFailed,
      removed,
    },
  };
}
