import { runBrief } from "@/lib/pipeline";
import type { ProgressEvent } from "@/lib/types";
import { resolveProfile } from "@/lib/startup-profile";

export const runtime = "nodejs";
export const maxDuration = 150; // safety ceiling; the pipeline is budgeted to finish in under 2 minutes
export const dynamic = "force-dynamic";

function friendly(msg: string): string {
  if (/429|RESOURCE_EXHAUSTED|quota|rate limit/i.test(msg)) {
    return "Gemini is handling too many requests right now (rate limit). Wait about a minute, then try again.";
  }
  if (/API key|PERMISSION_DENIED|401|403/i.test(msg)) {
    return "The Gemini API key was rejected. Check GEMINI_API_KEY in the Vercel settings.";
  }
  if (/404|NOT_FOUND|no longer available/i.test(msg)) {
    return "The Gemini model name isn't available. Update GEMINI_MODEL in the Vercel settings.";
  }
  if (/timed out|deadline|504/i.test(msg)) {
    return "The research took too long this time. Try again; it usually completes on a second run.";
  }
  return msg || "Something went wrong. Try again.";
}

/** Streams progress as newline-delimited JSON, ending with the brief. */
export async function POST(req: Request) {
  let body: { investor?: string; firm?: string; profile?: unknown };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }
  const investor = (body.investor ?? "").toString().slice(0, 300);
  const firm = (body.firm ?? "").toString().slice(0, 300);
  if (!investor.trim() || !firm.trim()) {
    return Response.json({ error: "Enter both the investor and the firm." }, { status: 400 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (e: ProgressEvent) => controller.enqueue(encoder.encode(JSON.stringify(e) + "\n"));
      try {
        const brief = await runBrief({ investor, firm }, resolveProfile(body.profile), send);
        send({ type: "result", brief });
      } catch (e) {
        send({ type: "error", message: friendly((e as Error).message || "") });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Accel-Buffering": "no",
    },
  });
}
