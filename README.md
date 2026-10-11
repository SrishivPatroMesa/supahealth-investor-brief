# SupaHealth Investor Briefs

An AI agent that prepares a sourced pre-meeting investor brief for Priya, founder of SupaHealth (D2C protein supplements). Enter an investor and their firm, and in 60–90 seconds you get:

- **Verdict**: a one-line call on the meeting, what to aim for, what to ask for, their likely role
- **Prediction score**: a 0–100 fit index from 8 weighted factors, converted into stage-by-stage odds (follow-up → partner meeting → term sheet)
- **Charts**: fit gauge, odds funnel, factor breakdown, likely cheque size distribution, deals per month (12 months), sector mix, comparable brand scale vs SupaHealth
- **Recent portfolio activity** in the last 90 days (investments, follow-ons, exits)
- **Comparable brands** they've backed: scale, revenue, funding, trajectory (scaling, struggling, shut down), and how each compares to SupaHealth
- **The person**: background, the bets that define them, how they think
- **How to open**: conversation hooks plus three tailored talking points
- **Connections**: public paths between the investor and the founder (alma mater, past employers, co-investors, communities)
- **A little-known fact** to show you did your research
- **Thesis, context and red flags, likely objections**
- **Sources** for every claim, plus export as PDF or Markdown

All AI tasks use **Gemini Flash**. Live data comes from Gemini's **Google Search grounding** and **URL context** tools.

## How it works (5 layers, 9 Gemini calls)

| Layer | What happens |
|---|---|
| 0. Parse | Each field accepts a name or a URL. LinkedIn URLs are reduced to a name (LinkedIn itself is never fetched). Firm URLs are read directly. |
| 1. Identity | One grounded Gemini call confirms the person, their role and that they're at this firm. |
| 2. Research | Six grounded Gemini calls run **in parallel**: deals (90 days + 12-month list), thesis, context/red flags, comparable brands (+ firm website), the person (background, bets, little-known facts), and connections to the founder. Each sentence Gemini grounds gets a source marker. |
| 3. Synthesis | Two Gemini Flash calls in parallel, each with a strict JSON schema: the factual brief, and the analysis (verdict, 8 factor scores, cheque distribution, comparables, person, hooks, connections, fun fact, activity). Only facts in the notes may be used. |
| 4. Validation and scoring | Code (not the model) drops deals outside the 90-day window, removes unsourced claims, comparables, connections and fun facts, and computes the prediction score. |

### Prediction model (`lib/predict.ts`)

Gemini scores 8 factors 0–10 with evidence. Code computes the rest:

| Factor | Weight |
|---|---|
| Stage match | 16% |
| Sector match | 16% |
| Thesis alignment | 15% |
| Actively deploying | 14% |
| Cheque size match | 12% |
| No portfolio conflict | 11% |
| Connection warmth | 10% |
| Geography | 6% |

Fit index `x` = weighted sum (0–1). Stage odds: follow-up = 0.20 + 0.65x; partner meeting = follow-up × (0.15 + 0.55x); term sheet = partner × (0.20 + 0.55x). A direct competitor (conflict ≤ 2) or stage mismatch (stage ≤ 2) cuts the odds sharply. The output is a directional estimate, not a forecast.

Progress streams to the UI live as each layer completes.

## Run locally

```bash
npm install
cp .env.example .env.local     # then paste your Gemini key
npm run test:gemini            # confirms key, model and live search grounding
npm run dev                    # open http://localhost:3000
```

Health check while running: open `/api/health`.

## Deploy to Vercel

1. Push this folder to a GitHub repo.
2. In Vercel: **Add New → Project → Import** the repo. Framework is detected as Next.js.
3. Under **Environment Variables** add `GEMINI_API_KEY` (and optionally `GEMINI_MODEL`).
4. Deploy, then open `https://<your-app>.vercel.app/api/health` to confirm grounding works.

## Configuration

- **Startup and founder profile**: edit in the app ("Edit profile", saved in the browser) or change the defaults in `lib/startup-profile.ts`. The founder's education, past roles and network power the connections section.
- **Model**: `GEMINI_MODEL` env var, default `gemini-2.5-flash`
- **Prompts**: `lib/prompts.ts`
- **Brief schema**: `lib/brief-schema.ts` (Gemini) and `lib/types.ts` (Zod)

## Assumptions

SupaHealth's profile is an assumption made for this assignment: Bengaluru-based seed-stage protein supplement brand, ₹2.4 Cr ARR, raising ₹10 Cr, 45% repeat rate, 55/25/20 channel split across website, Amazon and quick commerce. Priya's background (NIT Trichy, IIM Bangalore, ex-HUL) is also assumed and editable.

## Known limits

- LinkedIn pages and mutual connections can't be read (login required). The agent uses the name in the URL plus web search, and finds public connection paths only.
- Nine Gemini calls run per brief. On the free tier, back-to-back briefs can hit per-minute rate limits; wait a minute or enable billing.
- Investors with little public footprint produce thinner briefs; the brief says what couldn't be verified.
- Source links are Google grounding redirect links; they open the original article.
- Recent briefs are saved in the browser only (no database).
