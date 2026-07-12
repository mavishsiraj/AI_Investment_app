import type { SentimentResult, CompetitorResult, RiskFactor } from "../lib/schemas";

/**
 * types.ts
 *
 * Canonical domain types for the research pipeline. Per project rule #4,
 * every interface here exists in exactly one location — import from here,
 * never redeclare. LLM-output types (SentimentResult, CompetitorResult,
 * RiskFactor, NarrationResult) live in src/lib/schemas.ts instead, since
 * their shape is defined by the Zod schema the model is constrained to.
 */

export interface CompanyProfile {
  symbol: string;
  companyName: string;
  sector: string | null;
  industry: string | null;
  description: string | null;
  website: string | null;
  employees: number | null;
  exchange: string | null;
  currency: string | null;
}

/**
 * Raw numeric fields straight from Yahoo Finance, used as scoring engine
 * input. Growth/margin fields are decimals (0.15 = 15%), not percentages.
 */
export interface RawFinancials {
  trailingPE: number | null;
  forwardPE: number | null;
  revenueGrowth: number | null;
  earningsGrowth: number | null;
  debtToEquity: number | null;
  marketCap: number | null;
  currentPrice: number | null;
  fiftyTwoWeekHigh: number | null;
  fiftyTwoWeekLow: number | null;
  profitMargin: number | null;
  returnOnEquity: number | null;
}

/** Human-readable, pre-formatted counterpart to RawFinancials for display. */
export interface FinancialMetrics {
  peRatio: string;
  revenueGrowth: string;
  earningsGrowth: string;
  debtToEquity: string;
  marketCap: string;
  profitMargin: string;
  returnOnEquity: string;
}

export interface CandleData {
  date: string; // ISO date, e.g. "2026-07-11"
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface TechnicalSnapshot {
  sma50: number | null;
  sma200: number | null;
  rsi14: number | null;
  macdSignal: "bullish" | "bearish" | "neutral";
  support: number | null;
  resistance: number | null;
  breakout: boolean;
  trend: "bullish" | "bearish" | "neutral";
  currentPrice: number | null;
}

export interface NewsArticle {
  title: string;
  source: string;
  url: string;
  publishedAt: string; // ISO datetime
  description: string | null;
}

export interface ScoreBreakdown {
  growth: number;
  valuation: number;
  leverage: number;
  sentiment: number;
  risk: number;
  competition: number;
  weighted: number;
}

/**
 * Narration fields (bullCase, bearCase, reasoning, horizon, entryPrice,
 * targetPrice, stopLoss) start as empty defaults when score.ts creates the
 * partial verdict, and are filled in by narrate.ts. They are NOT optional —
 * every Verdict is always a complete, valid object — but they may be empty
 * if narration failed, per the "keep the verdict, empty prose" contract.
 */
export interface Verdict {
  decision: "INVEST" | "PASS";
  confidence: number;
  scores: ScoreBreakdown;
  bullCase: string[];
  bearCase: string[];
  reasoning: string;
  horizon: "short-term" | "medium-term" | "long-term" | null;
  entryPrice: number | null;
  targetPrice: number | null;
  stopLoss: number | null;
}

/**
 * ResearchReport is the final payload sent to the client in the "complete"
 * stream chunk. Fields below beyond the original core five were added so
 * the frontend never has to fall back to sample/mock data to render the
 * price chart, news feed, or risk cards — every one of these is either
 * real fetched/synthesized data or an explicit empty state (never
 * fabricated). candles/rawNews/risks may legitimately be empty arrays
 * (a data source was unavailable) — components must render an empty
 * state for that case, not placeholder content.
 */
export interface ResearchReport {
  companyName: string;
  symbol: string;
  profile: CompanyProfile;
  financials: FinancialMetrics;
  technicals: TechnicalSnapshot;
  candles: CandleData[];
  rawNews: NewsArticle[];
  sentiment: SentimentResult | null;
  competitors: CompetitorResult | null;
  risks: RiskFactor[];
  riskAnalysis: string;
  verdict: Verdict;
  /** Which of the 5 data sources returned data: yahoo-profile, yahoo-financials, yahoo-history, newsapi, technicalindicators. */
  dataSources: string[];
  /** Non-fatal errors/gaps accumulated across the pipeline (e.g. "News fetch failed: ..."). */
  errors: string[];
  generatedAt: string; // ISO datetime
}
