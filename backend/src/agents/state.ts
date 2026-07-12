import { Annotation } from "@langchain/langgraph";
import type {
  CompanyProfile,
  RawFinancials,
  FinancialMetrics,
  TechnicalSnapshot,
  CandleData,
  NewsArticle,
  Verdict,
} from "./types.ts";
import type { SentimentResult, CompetitorResult, RiskFactor } from "../lib/schemas.ts";

/**
 * state.ts
 *
 * The single LangGraph state definition for the research pipeline:
 *   fetchData → synthesize → score → narrate
 *
 * Every node reads/writes a subset of this state. Field types here must
 * match src/agents/types.ts (raw domain data) and src/lib/schemas.ts
 * (LLM-derived data) exactly — this file does not redefine those shapes.
 *
 * Change from previous version: added createInitialResearchState(), the
 * single canonical place that constructs a fresh ResearchState. Needed by
 * /api/research/route.ts, which orchestrates the 4 nodes directly (for
 * fine-grained NDJSON streaming control) rather than invoking the compiled
 * graph — so it needs a real starting state without going through
 * researchGraph.invoke().
 */

/** Human-readable pipeline step, surfaced to the frontend via streaming. */
export type PipelineStep =
  | "idle"
  | "resolving-symbol"
  | "fetching-profile"
  | "fetching-financials"
  | "fetching-technicals"
  | "fetching-news"
  | "synthesizing"
  | "scoring"
  | "narrating"
  | "done"
  | "error";

/**
 * Default reducer: last-writer-wins. Used for every field where a later
 * node's value should simply replace the earlier one.
 */
function replace<T>(_current: T, update: T): T {
  return update;
}

export const ResearchStateAnnotation = Annotation.Root({
  // -- Input --------------------------------------------------------------
  companyName: Annotation<string>({
    reducer: replace,
    default: () => "",
  }),

  // -- Raw fetched data (populated by services/*, no LLM involved) --------
  profile: Annotation<CompanyProfile | null>({
    reducer: replace,
    default: () => null,
  }),

  rawFinancials: Annotation<RawFinancials | null>({
    reducer: replace,
    default: () => null,
  }),

  financials: Annotation<FinancialMetrics | null>({
    reducer: replace,
    default: () => null,
  }),

  technicals: Annotation<TechnicalSnapshot | null>({
    reducer: replace,
    default: () => null,
  }),

  candles: Annotation<CandleData[]>({
    reducer: replace,
    default: () => [],
  }),

  rawNews: Annotation<NewsArticle[]>({
    reducer: replace,
    default: () => [],
  }),

  // -- LLM-derived data (synthesis node, "fast" model) ---------------------
  sentiment: Annotation<SentimentResult | null>({
    reducer: replace,
    default: () => null,
  }),

  competitors: Annotation<CompetitorResult | null>({
    reducer: replace,
    default: () => null,
  }),

  risks: Annotation<RiskFactor[]>({
    reducer: replace,
    default: () => [],
  }),

  /** Narrative summary of the risk picture, from synthesisSchema.riskAnalysis. */
  riskAnalysis: Annotation<string>({
    reducer: replace,
    default: () => "",
  }),

  // -- Deterministic scoring + LLM narration -------------------------------
  verdict: Annotation<Verdict | null>({
    reducer: replace,
    default: () => null,
  }),

  // -- Pipeline bookkeeping -------------------------------------------------
  step: Annotation<PipelineStep>({
    reducer: replace,
    default: () => "idle",
  }),

  /** Which of the 5 data sources (profile, financials, history, news, technicals) returned data. */
  dataSources: Annotation<string[]>({
    reducer: replace,
    default: () => [],
  }),

  /**
   * Non-fatal errors accumulated across nodes (e.g. a provider failed but
   * the pipeline continued with a sensible default). Concatenated so no
   * node's error report clobbers another's.
   */
  errors: Annotation<string[]>({
    reducer: (current: string[], update: string[]) => current.concat(update),
    default: () => [],
  }),
});

export type ResearchState = typeof ResearchStateAnnotation.State;
export type ResearchStateUpdate = typeof ResearchStateAnnotation.Update;

/**
 * Builds a fresh ResearchState for a new pipeline run. This is the only
 * place default values are constructed outside the Annotation spec itself
 * — callers that bypass researchGraph.invoke() (e.g. the streaming API
 * route) should use this rather than hand-building a state object.
 */
export function createInitialResearchState(companyName: string): ResearchState {
  return {
    companyName,
    profile: null,
    rawFinancials: null,
    financials: null,
    technicals: null,
    candles: [],
    rawNews: [],
    sentiment: null,
    competitors: null,
    risks: [],
    riskAnalysis: "",
    verdict: null,
    step: "idle",
    dataSources: [],
    errors: [],
  };
}
