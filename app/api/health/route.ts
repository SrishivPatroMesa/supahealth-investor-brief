import { groundedResearch, MODEL, SourceRegistry } from "@/lib/gemini";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Open /api/health to confirm the key, model and live search grounding all work. */
export async function GET() {
  const started = Date.now();
  try {
    const reg = new SourceRegistry();
    const r = await groundedResearch(
      "In one sentence: name one Indian venture capital deal announced in the last 30 days, with its date.",
      reg,
      { timeoutMs: 40_000, label: "Health check" }
    );
    return Response.json({
      ok: true,
      model: MODEL,
      grounding: reg.count() > 0 ? "working" : "no sources returned",
      sources: reg.count(),
      sample: r.text.slice(0, 300),
      ms: Date.now() - started,
    });
  } catch (e) {
    return Response.json({ ok: false, model: MODEL, error: (e as Error).message }, { status: 500 });
  }
}
