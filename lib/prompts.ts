import type { ParsedFirm, ParsedInvestor } from "./parse-input";
import type { Profile } from "./startup-profile";
import { CHEQUE_BUCKETS } from "./types";

export type Ctx = {
  name: string;
  firm: string;
  today: string;
  windowStart: string;
  yearStart: string;
};

const RULES = `Rules:
- Use live web search. State the date of each fact.
- Report only what sources say. Never guess amounts, dates or names. If something is not found, say "not found".
- Write compact factual notes, one fact per line. No preamble.
- Indian startup media (Inc42, Entrackr, YourStory, Economic Times, Mint, VCCircle, The Ken, The Arc) and global media (TechCrunch, Bloomberg) both count.`;

export function identityPrompt(inv: ParsedInvestor, firm: ParsedFirm, today: string): string {
  const who =
    inv.kind === "linkedin"
      ? `The investor's LinkedIn profile is ${inv.url}. The name in the URL appears to be "${inv.name || "unclear"}". You cannot open LinkedIn; use web search to confirm who this is.`
      : inv.kind === "url"
        ? `The investor is described by this page: ${inv.url}.`
        : `The investor's name is "${inv.name}".`;
  const where =
    firm.kind === "url" ? `Their firm's website is ${firm.url} (domain ${firm.domain}).` : `Their firm is "${firm.name}".`;

  return `Today is ${today}. Identify a venture investor before a fundraising meeting.
${who}
${where}

Find and report:
- Full name and current title at the firm; whether they currently work there (and any recent move)
- What the firm is: type (VC, angel network, family office, CVC), fund size and latest fund with date, stage focus, typical cheque size, geography
- Where the investor is based
- If several people share this name, explain how you picked the right one

${RULES}

End your answer with exactly these three lines:
RESOLVED_NAME: <full name, or UNKNOWN>
RESOLVED_FIRM: <firm name, or UNKNOWN>
MATCH: <yes | no | unclear>`;
}

export function portfolioPrompt(c: Ctx): string {
  return `Today is ${c.today}. Research the portfolio activity of ${c.name} at ${c.firm}.

PART A — last 90 days (${c.windowStart} to ${c.today}):
Every new investment, follow-on and exit (acquisition, IPO, secondary, shutdown). For each: company, what it does, sector, round, amount, announcement date, and whether ${c.name} personally led it or joined the board.
If none, say so clearly and list the 3 most recent deals with dates.

PART B — last 12 months (${c.yearStart} to ${c.today}):
A compact list of every deal by ${c.firm} you can find, one per line as: YYYY-MM | company | sector | round | amount.
Also give the typical cheque size in these deals, with examples.

${RULES}`;
}

export function thesisPrompt(c: Ctx): string {
  return `Today is ${c.today}. Research the publicly stated investment thesis of ${c.name} (${c.firm}).

Look at interviews, podcasts, conference talks, blog posts, newsletters, LinkedIn or X posts, and the firm's thesis pages.
Report:
- Sectors and themes they are excited about, with the date and where it was said
- What they look for in founders and companies (metrics, stage, traits); any numeric bars they mention (repeat rate, margins, CAC payback)
- Anything said about consumer brands, D2C, health, wellness, nutrition, supplements, food, or quick commerce
- Short paraphrases of notable opinions (no long quotes)

${RULES}`;
}

export function contextPrompt(c: Ctx): string {
  return `Today is ${c.today}. A founder is about to pitch ${c.name} at ${c.firm}. Find context she should know.

Report:
- Sectors or themes they have moved away from or turned cautious on (especially D2C or consumer brands)
- Controversies involving the investor or firm (legal, governance, public disputes)
- Portfolio companies that shut down, pivoted, had layoffs, down rounds or governance issues in the last 18 months
- Fund status: actively deploying, raising a new fund, or late in the fund cycle? Fund vintage and size.
- Recent partner departures or strategy changes

Only report what you find with sources. If nothing notable exists, say "No notable issues found".

${RULES}`;
}

export function comparablesPrompt(c: Ctx, firm: ParsedFirm): string {
  return `Today is ${c.today}. Research brands in the portfolio of ${c.firm}${firm.domain ? ` (${firm.domain})` : ""} and of ${c.name} that are comparable to a seed-stage Indian D2C protein supplement brand.

Comparable means: consumer health, nutrition, supplements, sports nutrition, protein foods, healthy snacks, wellness, fitness, personal care D2C, or other D2C consumer brands.
For each comparable brand (aim for up to 6, most relevant first) report:
- Company, what it sells
- When the firm invested and at what stage/round
- Scale today: latest reported revenue (₹ Cr, with fiscal year), total funding raised (₹ Cr), valuation if public
- Trajectory: growing fast, steady, struggling (layoffs, down round, falling revenue), acquired/exited, or shut down — with the evidence and date
- Whether it competes directly with a protein supplement brand
Also note anything on the firm's own website about its consumer portfolio.

Convert USD to ₹ at roughly ₹84 per USD when needed, and say you converted.

${RULES}`;
}

export function personPrompt(c: Ctx): string {
  return `Today is ${c.today}. Build a personal profile of the investor ${c.name} (${c.firm}) to help a founder connect with them as a person.

Report:
- Education (schools, colleges, degrees, years) and career before investing (companies, roles); companies they founded or operated
- Their best-known investments and outcomes (big wins, notable losses) across their whole career, and which they talk about most
- What they write or speak about: recurring ideas, frameworks, pet topics, books they recommend
- Personal side: hobbies, sports, causes, side projects, places they grew up or lived, languages, awards
- Little-known facts that most founders would not find on page one of Google: early career surprises, older interviews, alumni magazine profiles, conference bios, personal blogs, podcasts appearances, books or papers they wrote, unusual hobbies or achievements. List 2–4 candidates with sources.

Be careful: only include facts clearly about this specific person. Avoid anything private, family-related or sensitive.

${RULES}`;
}

export function networkPrompt(c: Ctx, p: Profile): string {
  return `Today is ${c.today}. Find public connection points between investor ${c.name} (${c.firm}) and founder ${p.founderName} of ${p.company}.

The founder's background:
- Education: ${p.founderEducation}
- Career: ${p.founderCareer}
- Network and communities: ${p.founderNetwork}
- Location: ${p.location}

Search for evidence that the investor:
- Studied at the same institutions (check the investor's education)
- Worked at the same companies, or backed founders who came from them
- Is active in the same communities, alumni networks, accelerators, angel networks or events
- Regularly co-invests with angels or funds that sit in the founder's network
- Is based in or often invests in the same city
Also list the investor's most frequent co-investors, and any public communities, accelerators or events they mentor at or speak at.

Report each overlap with the evidence. If there is no overlap for an item, say "no overlap found" — do not invent links.

${RULES}`;
}

/* ---------------- Synthesis ---------------- */

export const SYNTHESIS_SYSTEM = `You are a senior fundraising analyst preparing a pre-meeting investor brief for a founder.

Hard rules:
- Use ONLY facts present in the research notes. Never add facts from memory.
- Research notes contain citation markers like [S3]. For every factual item, put the matching numbers in sourceIds (e.g. [S3] -> 3). An item with no supporting marker gets an empty sourceIds list.
- Dates: YYYY-MM-DD when the day is known, YYYY-MM when only the month is known, otherwise an empty string.
- If a section has no findings, return an empty list and explain what is missing in "gaps" (where available).
- Clear, direct English. No hype. Keep each field short and specific.`;

type Notes = Record<string, string>;

function notesBlock(n: Notes): string {
  return Object.entries(n)
    .map(([k, v]) => `RESEARCH NOTES — ${k.toUpperCase()}\n${v || "No findings."}`)
    .join("\n\n");
}

export function briefPrompt(c: Ctx, profile: string, notes: Notes, match: string): string {
  return `Build the factual investor brief.

Investor: ${c.name}
Firm: ${c.firm}
Today: ${c.today}
90-day window for portfolio activity: ${c.windowStart} to ${c.today}
Identity check result: ${match}

FOUNDER'S STARTUP
${profile}

${notesBlock(notes)}

Guidance:
- "summary": 2–3 sentences a founder can read in 15 seconds: who they are, what they back now, how to approach them.
- "identity.confidence": high if clearly confirmed at this firm, medium if likely, low if unclear or contradicted.
- "portfolioActivity": only deals announced inside the 90-day window.
- "context.severity": "flag" could derail the meeting, "watch" handle carefully, "info" background.
- "fit.overlaps": where the investor and the startup overlap; "fit.conflicts": competing brands in their portfolio.
- "talkingPoints": exactly 3. Each connects a specific fact about this investor to a specific fact about the startup. "opener" is a sentence the founder can say in the room.
- "objections": exactly 3 likely pushbacks with crisp answers using the startup's real numbers.`;
}

export function analysisPrompt(c: Ctx, p: Profile, profile: string, notes: Notes, match: string): string {
  return `Build the analysis layer of the investor brief.

Investor: ${c.name}
Firm: ${c.firm}
Today: ${c.today}
Identity check result: ${match}

FOUNDER AND STARTUP
${profile}

${notesBlock(notes)}

Produce:

1. "verdict": "headline" is a one-line call on this meeting (e.g. "Strong fit, but expect hard questions on marketplace dependence"). "meetingGoal" is the single outcome to aim for. "recommendedAsk" is what to ask for, sized to their cheque and the ₹${p.raiseAmountCr} Cr round. "likelyRole": lead, co-lead, follow, or unlikely.

2. "factors": score EACH of these 8 ids from 0 to 10, with one line of evidence and sourceIds:
   stage (do they invest at ${p.stage}?), sector (consumer/D2C/health/nutrition), thesis (stated thesis vs this startup), cheque (their typical cheque vs ₹${p.raiseAmountCr} Cr round), deployment (are they actively investing now), conflict (10 = no competing brand in portfolio, 0 = direct competitor), geography (India/${p.location}), warmth (public connection paths to the founder).
   Be calibrated: 5 means neutral or unknown. Do not inflate.

3. "cheque.distribution": probability (0–100) that their cheque into this round falls in each bucket: ${CHEQUE_BUCKETS.map((b) => `"${b}"`).join(", ")}. Base it on their actual past cheques. "typical" is their typical cheque in words; "rationale" explains in one sentence.

4. "comparables": up to 6 brands from their portfolio most comparable to ${p.company}. revenueCr and fundingCr are numbers in ₹ Cr (use 0 if unknown). "scale" in words. "trajectory": scaling, steady, struggling, exited, shut-down or unknown. "vsUs": one sentence comparing that company to ${p.company} (stage, scale, positioning) — what the investor will likely benchmark against.

5. "person": "background" facts (education, career); "keyBets" (their most important past investments with outcome and why it matters for this pitch); "insights" (how they think and decide, useful for the pitch).

6. "hooks": 3 conversation openers grounded in the person's interests, writing or bets. "line" is what the founder can actually say.

7. "connections": public connection paths between the investor and the founder (alma mater, ex-employer, co-investor, portfolio founder, community, location). "strength": strong (clear shared link), possible (indirect), weak (same city etc). "howToUse": how to use it for a warm intro or rapport. Only include links supported by the notes. Return an empty list if none.

8. "funFact": one little-known, positive, non-sensitive fact about the investor that shows deep research, and how to mention it naturally. Empty strings if nothing reliable was found.

9. "activity": "monthly" is the count of the firm's deals per month (month as YYYY-MM) from the 12-month deal list. "sectorMix" is the count of those deals by broad sector (max 6 sectors).`;
}
