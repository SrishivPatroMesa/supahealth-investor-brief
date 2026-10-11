// Quick check that your Gemini key, model and Google Search grounding work.
// Run: npm run test:gemini   (reads GEMINI_API_KEY from .env.local)
import { GoogleGenAI } from "@google/genai";

const key = process.env.GEMINI_API_KEY;
const model = process.env.GEMINI_MODEL || "gemini-3.8-flash";
if (!key) { console.error("✗ GEMINI_API_KEY missing in .env.local"); process.exit(1); }

const ai = new GoogleGenAI({ apiKey: key });
const t = Date.now();
try {
  const res = await ai.models.generateContent({
    model,
    contents: "Name one Indian venture capital deal announced in the last 30 days, with its date.",
    config: { tools: [{ googleSearch: {} }] },
  });
  const chunks = res.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];
  console.log(`✓ Model ${model} responded in ${Date.now() - t} ms`);
  console.log(chunks.length ? `✓ Grounding works: ${chunks.length} live sources` : "✗ No grounding sources returned");
  console.log("\n" + res.text);
  chunks.slice(0, 5).forEach((c, i) => console.log(`  [${i + 1}] ${c.web?.title}`));
} catch (e) {
  console.error(`✗ ${e.message}`);
  process.exit(1);
}
