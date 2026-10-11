import { GoogleGenAI } from "@google/genai";
import type { Source } from "./types";

export const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

let client: GoogleGenAI | null = null;
export function gemini(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY is not set. Add it to .env.local (local) or Vercel → Settings → Environment Variables."
    );
  }
  if (!client) client = new GoogleGenAI({ apiKey });
  return client;
}

/** Collects sources from every call so each gets one stable number [S1], [S2]… */
export class SourceRegistry {
  private byUrl = new Map<string, Source>();
  add(url: string, title?: string): number {
    const existing = this.byUrl.get(url);
    if (existing) return existing.id;
    const id = this.byUrl.size + 1;
    let domain: string | undefined;
    try {
      domain = new URL(url).hostname.replace(/^www\./, "");
    } catch {}
    // Grounding redirect links carry the real site in the title.
    const cleanTitle = title?.trim() || domain || url;
    if (domain?.includes("vertexaisearch")) domain = cleanTitle;
    this.byUrl.set(url, { id, title: cleanTitle, url, domain });
    return id;
  }
  list(): Source[] {
    return [...this.byUrl.values()];
  }
  count(): number {
    return this.byUrl.size;
  }
}

function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`${label} timed out after ${ms / 1000}s`)), ms);
    p.then(
      (v) => { clearTimeout(t); resolve(v); },
      (e) => { clearTimeout(t); reject(e); }
    );
  });
}

function isRetryable(err: unknown): boolean {
  const msg = String((err as Error)?.message ?? err);
  return /429|500|503|UNAVAILABLE|RESOURCE_EXHAUSTED|overloaded/i.test(msg);
}

async function withRetry<T>(fn: () => Promise<T>, attempts = 2): Promise<T> {
  let last: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (e) {
      last = e;
      if (!isRetryable(e) || i === attempts - 1) break;
      await new Promise((r) => setTimeout(r, 1500 * (i + 1)));
    }
  }
  throw last;
}

export type GroundedResult = { text: string; sourceIds: number[] };

/**
 * A research call with live Google Search grounding (and optionally URL context
 * for reading a specific page). Inline [S#] markers are inserted after every
 * sentence Gemini grounded, so the synthesis step can cite real sources.
 */
export async function groundedResearch(
  prompt: string,
  registry: SourceRegistry,
  opts: { urls?: string[]; timeoutMs?: number; label?: string } = {}
): Promise<GroundedResult> {
  const tools: Record<string, object>[] = [{ googleSearch: {} }];
  if (opts.urls?.length) tools.push({ urlContext: {} });

  const contents = opts.urls?.length
    ? `${prompt}\n\nRead these pages directly as primary sources:\n${opts.urls.join("\n")}`
    : prompt;

  const res = await withRetry(() =>
    withTimeout(
      gemini().models.generateContent({
        model: MODEL,
        contents,
        config: { tools, temperature: 0.2 },
      }),
      opts.timeoutMs ?? 50_000,
      opts.label ?? "Research call"
    )
  );

  let text = res.text ?? "";
  const cand = res.candidates?.[0];
  const meta = cand?.groundingMetadata;
  const chunks = meta?.groundingChunks ?? [];
  const localToGlobal = chunks.map((c) =>
    c.web?.uri ? registry.add(c.web.uri, c.web.title) : -1
  );

  // Insert citation markers. Locate each supported segment by its text
  // (index offsets can be byte-based, so text search is more reliable).
  const inserts: { at: number; mark: string }[] = [];
  let cursor = 0;
  for (const s of meta?.groundingSupports ?? []) {
    const seg = s.segment?.text;
    if (!seg) continue;
    let pos = text.indexOf(seg, cursor);
    if (pos === -1) pos = text.indexOf(seg);
    if (pos === -1) continue;
    const ids = [...new Set((s.groundingChunkIndices ?? []).map((i) => localToGlobal[i]).filter((i) => i > 0))];
    if (!ids.length) continue;
    const at = pos + seg.length;
    inserts.push({ at, mark: ` ${ids.map((i) => `[S${i}]`).join("")}` });
    cursor = at;
  }
  inserts.sort((a, b) => b.at - a.at);
  for (const { at, mark } of inserts) text = text.slice(0, at) + mark + text.slice(at);

  // Pages read via URL context become sources too.
  const urlMeta = cand?.urlContextMetadata?.urlMetadata ?? [];
  const pageIds: number[] = [];
  for (const m of urlMeta) {
    if (m.retrievedUrl && String(m.urlRetrievalStatus).includes("SUCCESS")) {
      pageIds.push(registry.add(m.retrievedUrl, `Firm website (${m.retrievedUrl})`));
    }
  }
  if (pageIds.length) {
    text += `\n\nPages read directly: ${pageIds.map((i) => `[S${i}]`).join(" ")}`;
  }

  const sourceIds = [...new Set([...localToGlobal.filter((i) => i > 0), ...pageIds])];
  return { text, sourceIds };
}

/** A non-grounded call that must return JSON matching the given schema. */
export async function structuredCall<T = unknown>(
  prompt: string,
  schema: object,
  opts: { timeoutMs?: number; system?: string } = {}
): Promise<T> {
  const res = await withRetry(() =>
    withTimeout(
      gemini().models.generateContent({
        model: MODEL,
        contents: prompt,
        config: {
          systemInstruction: opts.system,
          responseMimeType: "application/json",
          responseJsonSchema: schema,
          temperature: 0.3,
        },
      }),
      opts.timeoutMs ?? 50_000,
      "Synthesis"
    )
  );
  const raw = (res.text ?? "").replace(/^```json\s*|```$/g, "").trim();
  return JSON.parse(raw) as T;
}
