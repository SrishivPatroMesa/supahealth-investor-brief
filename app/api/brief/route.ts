import { runBrief } from "@/lib/pipeline";
import type { ProgressEvent } from "@/lib/types";
import { resolveProfile } from "@/lib/startup-profile";

export const runtime = "nodejs";
export const maxDuration = 120; // seconds; the brief must finish within 2 minutes
export const dynamic = "force-dynamic";

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
        send({ type: "error", message: (e as Error).message || "Something went wrong." });
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
