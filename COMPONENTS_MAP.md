# Components Map — Pre-Meeting Investor Brief (SupaHealth)

**Problem:** Priya spends ~45 minutes researching each investor before a meeting, 3–4 times a week.
**Solution:** An agent that takes an investor and firm and returns a sourced brief with a prediction score, charts and tailored openers in under 2 minutes.

## Flow

```
Input UI (+ editable founder profile) ──► /api/brief (streams progress)
                                                │
                                   Layer 0  Parse inputs (code)
                                                │
                                   Layer 1  Identity check (Gemini + Search)
                                                │
     ┌──────────┬──────────┬──────────┬────────┴─┬──────────┬──────────┐
   Deals      Thesis     Context   Comparables  Person    Network      Layer 2: six
  90d+12mo                flags    +firm site   +fun fact  links       grounded calls
     └──────────┴──────────┴──────────┴────────┬─┴──────────┴──────────┘  in parallel
                                                │
                    ┌───────────────────────────┴───────────────────────┐
           Synthesis A: factual brief                Synthesis B: analysis       Layer 3
           (Gemini, JSON schema)                     (Gemini, JSON schema)
                    └───────────────────────────┬───────────────────────┘
                                                │
                   Layer 4  Validation + prediction model (code)
                                                │
                        Brief UI with charts ──► PDF / Markdown export
```

## Components

| # | Component | Type | What it does | Tech | File |
|---|---|---|---|---|---|
| 1 | Input form | UI | Investor (name or LinkedIn URL) and firm (name or website) | Next.js, React | `components/BriefForm.tsx` |
| 2 | Founder profile editor | UI + config | Company, traction, round, and founder background (education, career, network); saved in browser and sent with each request | React, Zod, localStorage | `components/ProfilePanel.tsx`, `lib/startup-profile.ts` |
| 3 | API route | Orchestrator | Runs the pipeline and streams progress events (NDJSON) | Next.js route handler on Vercel Functions (`maxDuration` 120s) | `app/api/brief/route.ts` |
| 4 | Input parser | Logic | Detects names vs URLs; extracts names from LinkedIn URLs | TypeScript | `lib/parse-input.ts` |
| 5 | Identity agent | AI + live data | Confirms the person, role and firm; flags name clashes | Gemini Flash + Google Search grounding + URL context | `lib/pipeline.ts`, `lib/prompts.ts` |
| 6 | Portfolio agent | AI + live data | Deals and exits in the last 90 days; full 12-month deal list for charts | Gemini Flash + Search grounding | `lib/prompts.ts` |
| 7 | Thesis agent | AI + live data | Public statements, interviews, stated bars (repeat rate, margins) | Gemini Flash + Search grounding | `lib/prompts.ts` |
| 8 | Context agent | AI + live data | Sector shifts, controversies, portfolio trouble, fund status | Gemini Flash + Search grounding | `lib/prompts.ts` |
| 9 | Comparables agent | AI + live data | Similar brands they backed: revenue, funding, trajectory, competition; reads the firm website | Gemini Flash + Search grounding + URL context | `lib/prompts.ts` |
| 10 | Person agent | AI + live data | Education, career, defining bets, writing, interests, little-known facts | Gemini Flash + Search grounding | `lib/prompts.ts` |
| 11 | Network agent | AI + live data | Public overlaps with the founder: alma mater, employers, co-investors, communities | Gemini Flash + Search grounding | `lib/prompts.ts` |
| 12 | Citation mapper | Logic | Turns grounding metadata into numbered sources and inline [S#] markers | TypeScript | `lib/gemini.ts` |
| 13 | Brief synthesis | AI | Summary, 90-day activity, thesis, context, overlaps/conflicts, 3 talking points, 3 objections | Gemini Flash, `responseJsonSchema` | `lib/brief-schema.ts` |
| 14 | Analysis synthesis | AI | Verdict, 8 factor scores, cheque distribution, comparables, person, hooks, connections, fun fact, activity data | Gemini Flash, `responseJsonSchema` | `lib/brief-schema.ts` |
| 15 | Validator | Logic | 90-day window, drops unsourced facts/comparables/connections/fun fact, 3 talking points | TypeScript, Zod | `lib/validate.ts`, `lib/types.ts` |
| 16 | Prediction model | Logic | Weighted fit index, stage funnel odds, hard gates for conflicts/stage, cheque normalisation | TypeScript | `lib/predict.ts` |
| 17 | Progress ledger | UI | Live view of each layer and all six research tracks with source counts | React | `components/ResearchLedger.tsx` |
| 18 | Brief view | UI | Verdict, fun fact, odds, person, openers, connections, activity, comparables, thesis, context, objections, sources | React, CSS | `components/BriefView.tsx` |
| 19 | Charts | UI | Fit gauge, odds funnel, factor bars, cheque distribution, monthly deals, sector mix, comparable scale | SVG and CSS, no chart library | `components/charts.tsx` |
| 20 | Export | UI | Save as PDF (print stylesheet), copy or download Markdown | Browser print, Clipboard API | `lib/markdown.ts`, `app/globals.css` |
| 21 | Recent briefs | UI | Last 6 briefs saved in the browser | localStorage | `app/page.tsx` |
| 22 | Health check | Ops | Confirms key, model and grounding on the live deployment | Next.js route | `app/api/health/route.ts` |
| 23 | Hosting and secrets | Infra | Public URL; API key stored server-side only | Vercel, env vars, GitHub | `.env.example` |

## Prediction model

| Factor | Weight | Scored by |
|---|---|---|
| Stage match | 16% | Gemini, 0–10 with evidence |
| Sector match | 16% | Gemini |
| Thesis alignment | 15% | Gemini |
| Actively deploying | 14% | Gemini |
| Cheque size match | 12% | Gemini |
| No portfolio conflict | 11% | Gemini |
| Connection warmth | 10% | Gemini |
| Geography | 6% | Gemini |

Fit index and stage-by-stage odds are computed in code from these scores, so the method is transparent and repeatable.

## External services

| Service | Used for |
|---|---|
| Gemini API (Flash) | All AI tasks (9 calls per brief) |
| Google Search grounding (via Gemini) | Live web data with citations |
| Gemini URL context | Reading the firm's website directly |
| Vercel | Hosting and serverless functions |
| GitHub | Source code |

## Guarantees enforced in code

- Only deals dated within the last 90 days appear under recent activity.
- Factual items, comparables, connections and the fun fact must have a source or they are removed.
- Exactly three talking points.
- The prediction percentage is calculated in code, never written by the model.
- Identity uncertainty is shown on the brief and noted in the score.
