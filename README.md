# SupaHealth Investor Briefs

**Live app:** https://supahealth-investor-brief.vercel.app

An AI agent that prepares a sourced pre-meeting investor brief for Priya, founder of SupaHealth (a seed-stage D2C protein supplement brand). Enter an investor's name (or LinkedIn URL) and their firm (or website), and in about 90 seconds you get a brief researched live from the web, with a source on every claim.

All AI tasks use **Gemini Flash**. Live data comes from Gemini's **Google Search grounding** and **URL context** tools. The app is deployed on **Vercel**.

## Try it in two minutes

1. Open the live app. On the dashboard, click **Load sample meetings** to fill this week's calendar.
2. Click **Prepare** next to a meeting (or a **Try** example under the form). The brief runs live in about 90 seconds.
3. Return to the dashboard: the meeting turns green and the coverage, outlook and best-fit panels update.

Only the meetings are samples. Every brief is researched live.

## What a brief contains

| Assignment requirement | Where it is |
|---|---|
| Recent portfolio activity (investments and exits, last 90 days) | **Portfolio** tab: dated deals table, 12-month deal chart, sector mix |
| Publicly stated investment thesis | **Thesis and context** tab |
| Context: sectors moved away from, controversies, pivots | **Thesis and context** tab, flagged by severity |
| Three talking points tailored to SupaHealth's stage and sector | **Playbook** tab |

Beyond the brief:

- **The odds:** a 0–100 fit index from 8 weighted factors, turned into stage-by-stage odds (follow-up, partner meeting, term sheet), a radar chart, and a likely cheque-size distribution. The percentages are computed in code, not written by the model.
- **Comparable brands** they've backed, with scale, trajectory and how each compares to SupaHealth.
- **The person:** background timeline, defining bets, how they think, and a little-known fact.
- **Playbook:** conversation hooks, talking points, public warm-intro paths, likely objections with answers.
- **Export:** save as PDF, copy or download Markdown.

## Workspace features

- **Dashboard:** stats, meeting calendar, next actions, round coverage (term-sheet odds × expected cheque vs the ₹10 Cr target), pipeline by outlook, best fits.
- **Meetings:** planner with countdowns, `.ics` import from Cal.com, Google Calendar or Outlook, "Add to calendar" export with a reminder the day before, and a Cal.com booking link.
- **Compare:** rank investors by odds and compare up to three side by side.
- **Investor directory:** a starter list of 16 Indian consumer-relevant investors with filters and one-click briefs.
- **Workspace profile:** edit SupaHealth's numbers and the founder's background from the top bar.
- **Dark mode.**

## How a brief is built (5 layers, 9 Gemini calls)

| Layer | What happens |
|---|---|
| 0. Parse | Each field accepts a name or a URL. LinkedIn URLs are reduced to a name (LinkedIn is never fetched). Firm websites are read directly. |
| 1. Identity | A grounded Gemini call confirms the person, role and firm. |
| 2. Research | Six grounded Gemini calls in parallel: deals (12 months), thesis, context and red flags, comparable brands (plus firm website), the person, and connections to the founder. |
| 3. Synthesis | Two Gemini calls with strict JSON schemas: the factual brief, and the analysis (verdict, factor scores, cheque distribution, comparables, hooks, connections, fun fact). Only facts from the research notes may be used. |
| 4. Validation and scoring | Code drops deals outside the 90-day window and any unsourced claim, keeps exactly 3 talking points, and computes the prediction score. If a research track doesn't finish, the brief says so and offers to run again. |

## Prediction model (`lib/predict.ts`)

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

Fit index `x` = weighted sum (0–1). Follow-up = 0.20 + 0.65x; partner meeting = follow-up × (0.15 + 0.55x); term sheet = partner × (0.20 + 0.55x). A direct competitor or a stage mismatch cuts the odds sharply. It's a directional estimate, not a forecast.

## Run locally

```bash
npm install
cp .env.example .env.local     # add your Gemini key
npm run test:gemini            # checks key, model and live search grounding
npm run dev                    # http://localhost:3000
```

Health check: `/api/health`.

## Deploy

Import the repo in Vercel and add `GEMINI_API_KEY` (and optionally `GEMINI_MODEL`, default `gemini-3.8-flash`, and `GEMINI_THINKING`, default `low`) under Environment Variables.

## Assumptions and limits

- SupaHealth's profile and Priya's background are assumptions for this assignment: Bengaluru, seed stage, ₹2.4 Cr ARR, raising ₹10 Cr, 45% repeat rate, 55/25/20 channel split; ex-HUL, NIT Trichy, IIM Bangalore. Both are editable in the app.
- LinkedIn pages and mutual connections can't be read; connections are public paths only.
- Briefs, meetings and the profile are saved in the browser only.
- The investor directory is a static starter list; a brief verifies it live.
- Each brief makes 9 Gemini calls, so back-to-back runs on a free key can hit rate limits.

See `COMPONENTS_MAP.md` for the full component breakdown.
