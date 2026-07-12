# AI Investment Research Agent

**Live demo:** frontend → `https://aiinvestmentapp.netlify.app` · backend → `https://ai-investment-app-pbgo.onrender.com`
*(Backend runs on Render's free tier, which spins down after inactivity — the first request after idle time can take 30-50s to cold-start. Retry once if the first search seems to hang.)*

## Overview

Give it a public company name or ticker and it streams back a research report: live financials and technicals pulled from Yahoo Finance, an AI-synthesized read on news sentiment and competitive position, and a deterministic INVEST/PASS verdict with a supporting memo — bull case, bear case, entry/target/stop prices, and reasoning.

The core idea: **the verdict is math, not a guess.** The pipeline makes exactly two LLM calls per run — one to interpret news/competitive data, one to write prose around an already-computed score — and both are constrained to a Zod schema so the model can't return something the app doesn't expect. Everything financial (growth, valuation, leverage scoring, the final 0-100 verdict) is a deterministic function in plain code: same inputs always produce the same decision, and none of it depends on an LLM getting arithmetic right.

## How to Run It

The whole app lives in `frontend/` (a self-contained Next.js app — its own `/api/research` route runs the full pipeline, no separate server required locally):

```bash
git clone https://github.com/mavishsiraj/AI_Investment_app.git
cd AI_Investment_app/frontend
npm install
cp .env.example .env.local
# edit .env.local:
npm run dev
```

Then open `http://localhost:3000`.

**Env vars** (in `frontend/.env.example`):

| Variable | Required | Purpose |
|---|---|---|
| `GROQ_API_KEY` | Yes | Powers both LLM calls, via Groq's OpenAI-compatible endpoint |
| `GROQ_MODEL` | No | Defaults to `llama-3.1-8b-instant` |
| `NEWSAPI_KEY` | No | Enables news fetch + sentiment; omitted → sentiment defaults to neutral, nothing breaks |

There's also a standalone Express server in `backend/` that runs the identical pipeline (`npm run dev` inside `backend/`, port from `$PORT`/defaults to 4000). It exists so the pipeline can run somewhere that isn't serverless-function-shaped — that's what's actually deployed on Render for the live demo above, since Netlify's free-tier function timeout (10s) is too short for a run that legitimately takes 15-30+ seconds. The Netlify-hosted frontend talks to it via `NEXT_PUBLIC_BACKEND_URL`; running locally, you don't need it — the frontend's own API route handles everything.

## How It Works

```
fetchData (no LLM) → synthesize (LLM #1) → score (no LLM) → narrate (LLM #2)
```

**1. `fetchData`** — five independent, no-LLM data fetches, fired in parallel with `Promise.allSettled` so one failing doesn't take the others down: Yahoo Finance profile, financials, and ~1 year of daily price history; NewsAPI articles; and locally-computed technical indicators (SMA/RSI/MACD via the `technicalindicators` library). Ticker resolution happens here too — if the company name can't be resolved to a real symbol, the pipeline stops immediately with an explicit error, before any LLM call, rather than letting the model guess a profile for a company that doesn't exist.

**2. `synthesize`** (LLM call #1) — reads the fetched news and financials and returns structured sentiment, competitive positioning, and risk factors. This is the only place the model is allowed to interpret anything, and it's told explicitly to work only from the data it's handed, not from memory — an LLM asked to "tell me about Company X" will happily invent a plausible-sounding but wrong number.

**3. `score`** — a pure function, zero network calls, zero LLM calls. Combines growth, valuation, leverage, sentiment, risk, and competition into a weighted 0-100 score (weights: growth 25%, valuation 20%, leverage 15%, sentiment 10%, risk 20%, competition 10%; ≥60 → INVEST). Feed it the same inputs twice, get the same score twice.

**4. `narrate`** (LLM call #2) — takes the already-decided verdict as a fixed fact and writes the bull case, bear case, and memo explaining it. Its schema has no field that could override the decision — it explains, it doesn't decide.

Progress streams to the browser as NDJSON (one `{step, status, ...}` line per event) so the UI shows a live step-by-step timeline instead of a blank spinner for the run's duration.

## Key Decisions & Trade-offs

- **Two LLM calls, not five or six.** Every step that's arithmetic is code, not a prompt. This cuts latency and cost, and — more importantly for a *research* tool — means the score can't silently drift between two runs on identical data just because the model felt like phrasing something differently.
- **Deterministic scoring over an LLM verdict.** The trade-off: the scoring weights are reasoned priors (heavier on growth and risk), not fitted to historical outcomes. I'd rather ship a transparent, wrong-in-a-debuggable-way formula than a black-box number an LLM produced with no way to audit why.
- **Real data sources, never memorized facts.** Yahoo Finance and NewsAPI are queried live on every run. Slower and dependent on external uptime, but the alternative — letting the model answer from training data — means stale or fabricated numbers with no way for the user to tell the difference.
- **Zod schemas on both LLM calls.** `withStructuredOutput()` validates every model response against a schema before it's used; a malformed response fails validation and retries rather than silently corrupting the report.
- **Graceful degradation over hard failure.** A fake company name stops the pipeline immediately with an honest error. A real company with a data source down (Yahoo hiccup, missing `NEWSAPI_KEY`, LLM 5xx) still produces a report — with the gap explicitly shown (a "3/5 data sources" indicator, plus a documented-gaps section) rather than either crashing or quietly filling the hole with a guess.
- **Split deployment (Netlify + Render) over a single Vercel deploy.** The Next.js app is fully self-contained and would run as one deployment on Vercel (Hobby tier allows up to 300s function duration, comfortably covering this pipeline). Netlify's function timeout is too short for the same route, so the demo instead runs the frontend on Netlify and the pipeline as a persistent Express process on Render, connected via `NEXT_PUBLIC_BACKEND_URL`. More moving parts, but it's what got a working streaming demo onto Netlify specifically.
- **What I left out:** no caching layer (every search re-fetches everything, even for a symbol just searched), no auth/persistence beyond a local search history in `localStorage`, and the `backend/` and `frontend/src` pipeline code is currently duplicated rather than shared — see below.

## Example Runs

<img width="1920" height="1080" alt="image" src="https://github.com/user-attachments/assets/fe657ba7-355e-4786-9d70-1e855fe5bc53" />
<img width="1920" height="1080" alt="image" src="https://github.com/user-attachments/assets/0e4eddbe-48bf-4967-a22b-4a3ed5473e4b" />

<img width="1920" height="1080" alt="image" src="https://github.com/user-attachments/assets/4e39fcd3-9630-4dfe-a039-a5d317a18932" />

fake company search 
<img width="1920" height="1080" alt="image" src="https://github.com/user-attachments/assets/d795cf7e-0ffb-40e1-a5b4-541c08bce505" />



## What I'd Improve With More Time

- **Cache with stale-while-revalidate.** Yahoo/NewsAPI data doesn't change minute to minute; caching by symbol would cut latency and repeated API usage for the same search.
- **Backtest the scoring weights.** They're reasonable priors right now, not fitted to anything — running them against historical financials and forward returns would validate or recalibrate them with actual evidence instead of judgment calls.
- **RAG over SEC filings.** Pulling 10-K "Risk Factors" sections for the risk-synthesis step, instead of relying on recent news alone, which skews toward sentiment over structural risk.
- **Collapse the duplicated pipeline code.** `frontend/src` and `backend/src` currently contain near-identical copies of the same agent nodes and services, an artifact of splitting into two deployable services under time pressure. Worth extracting into a shared package before it drifts.
- **Multi-company comparison mode.** Run the pipeline for 2-3 tickers in parallel and show score breakdowns side by side — the scoring engine already returns a directly comparable structure.
- **Move rate limiting out of memory.** The current per-IP limiter is a `Map` in the route module, which resets on redeploy and isn't shared across instances — fine for a demo, not for real traffic.

## Tech Stack

| Choice | Why |
|---|---|
| Next.js 14 (App Router) | UI and the streaming API route in one project, no separate backend needed for the common case. |
| TypeScript (strict) | Caught real indexing bugs in the technicals math during development that loose TS would've let through. |
| LangChain (`@langchain/openai`) + Groq | `withStructuredOutput()` gives schema-enforced output for free; Groq serving Llama 3.1 8B keeps latency low enough for a synchronous multi-call pipeline. |
| Zod | The schema *is* the contract for LLM output — not a type that can silently drift from the prompt. |
| yahoo-finance2 | Free, no API key, covers profile/financials/history in one library. |
| NewsAPI | Simple REST search API; treated as optional since it's the one dependency without a generous free tier. |
| technicalindicators | Battle-tested SMA/RSI/MACD instead of hand-rolled indicator math. |
| lightweight-charts | Real candlestick rendering, smaller bundle than most React chart libraries. |
| Tailwind CSS | Fast, precise responsive breakpoints (2-col → 4-col grids, mobile stacking) without hand-written media queries. |
