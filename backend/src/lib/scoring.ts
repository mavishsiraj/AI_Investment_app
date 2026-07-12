import type { RawFinancials, ScoreBreakdown, Verdict } from "../agents/types.ts";
import type { RiskFactor, CompetitorResult, SentimentResult } from "./schemas.ts";

/**
 * scoring.ts
 *
 * The deterministic core of the pipeline. No LLM calls here — every
 * function is a pure, reproducible transformation of already-fetched or
 * already-synthesized data into a 0-100 score. See computeVerdict() for
 * the weighted-sum formula and INVEST/PASS threshold.
 */

const WEIGHTS = {
  growth: 0.25,
  valuation: 0.2,
  leverage: 0.15,
  sentiment: 0.1,
  risk: 0.2,
  competition: 0.1,
} as const;

const NEUTRAL = 50;
const INVEST_THRESHOLD = 60;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Linearly maps `value` from [inMin, inMax] to [outMin, outMax], then clamps to the output range. */
function normalize(
  value: number,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number
): number {
  const t = (value - inMin) / (inMax - inMin);
  const mapped = outMin + t * (outMax - outMin);
  return clamp(mapped, Math.min(outMin, outMax), Math.max(outMin, outMax));
}

/** Growth (weight 0.25): revenueGrowth preferred, earningsGrowth as fallback. -20% → 0, +40% → 100. */
export function scoreGrowth(raw: RawFinancials | null): number {
  const growthDecimal = raw?.revenueGrowth ?? raw?.earningsGrowth ?? null;
  if (growthDecimal === null) return NEUTRAL;
  const growthPct = growthDecimal * 100;
  return Math.round(normalize(growthPct, -20, 40, 0, 100));
}

/** Valuation (weight 0.20): trailing P/E, INVERTED. P/E 5 → 100, P/E 50 → 0, negative P/E → 25. */
export function scoreValuation(raw: RawFinancials | null): number {
  const pe = raw?.trailingPE ?? null;
  if (pe === null) return NEUTRAL;
  if (pe < 0) return 25;
  return Math.round(normalize(pe, 5, 50, 100, 0));
}

/** Leverage (weight 0.15): debt-to-equity. D/E 0 → 100, D/E 200 → 0. */
export function scoreLeverage(raw: RawFinancials | null): number {
  const de = raw?.debtToEquity ?? null;
  if (de === null) return NEUTRAL;
  return Math.round(normalize(de, 0, 200, 100, 0));
}

/** Sentiment (weight 0.10): LLM sentiment score (1-10) × 10 → 10-100. */
export function scoreSentiment(sentiment: SentimentResult | null): number {
  if (!sentiment) return NEUTRAL;
  return Math.round(clamp(sentiment.score * 10, 10, 100));
}

/**
 * The severity → 1-10 mapping below is a deliberate design decision, not
 * part of your original spec: the LLM outputs a list of discrete risk
 * factors (severity: h/m/l) rather than a single 1-10 risk score, because
 * "math in code, reasoning in LLM" means the aggregate number should be
 * computed deterministically from those factors rather than asked of the
 * model directly. This function is that aggregation step.
 */
const SEVERITY_VALUE: Record<RiskFactor["severity"], number> = {
  h: 9,
  m: 5.5,
  l: 2,
};

export function computeRiskScore(risks: RiskFactor[]): number {
  if (risks.length === 0) return 5; // neutral midpoint on a 1-10 scale
  const total = risks.reduce((sum, risk) => sum + SEVERITY_VALUE[risk.severity], 0);
  return clamp(total / risks.length, 1, 10);
}

/** Risk (weight 0.20): aggregate risk score (1-10), INVERTED. (10 - risk) × 10 → low risk = high score. */
export function scoreRisk(risks: RiskFactor[] | null): number {
  if (!risks || risks.length === 0) return NEUTRAL;
  const riskScore = computeRiskScore(risks);
  return Math.round((10 - riskScore) * 10);
}

const COMPETITION_SCORE: Record<CompetitorResult["position"], number> = {
  leader: 90,
  challenger: 70,
  niche: 50,
  laggard: 25,
};

/** Competition (weight 0.10): leader=90, challenger=70, niche=50, laggard=25. */
export function scoreCompetition(competition: CompetitorResult | null): number {
  if (!competition) return NEUTRAL;
  return COMPETITION_SCORE[competition.position];
}

export interface ComputeVerdictInputs {
  rawFinancials: RawFinancials | null;
  sentiment: SentimentResult | null;
  competition: CompetitorResult | null;
  risks: RiskFactor[] | null;
}

export type PartialVerdict = Pick<Verdict, "decision" | "confidence" | "scores">;

/**
 * Combines all six dimension scores into a weighted verdict. Deterministic:
 * identical inputs always produce an identical decision, confidence, and
 * score breakdown. Does not include narration fields — those are added
 * later by the narrate node and are never influenced by this function.
 */
export function computeVerdict(inputs: ComputeVerdictInputs): PartialVerdict {
  const growth = scoreGrowth(inputs.rawFinancials);
  const valuation = scoreValuation(inputs.rawFinancials);
  const leverage = scoreLeverage(inputs.rawFinancials);
  const sentiment = scoreSentiment(inputs.sentiment);
  const risk = scoreRisk(inputs.risks);
  const competition = scoreCompetition(inputs.competition);

  const weighted =
    growth * WEIGHTS.growth +
    valuation * WEIGHTS.valuation +
    leverage * WEIGHTS.leverage +
    sentiment * WEIGHTS.sentiment +
    risk * WEIGHTS.risk +
    competition * WEIGHTS.competition;

  const scores: ScoreBreakdown = {
    growth,
    valuation,
    leverage,
    sentiment,
    risk,
    competition,
    weighted: Math.round(weighted),
  };

  const decision: Verdict["decision"] = weighted >= INVEST_THRESHOLD ? "INVEST" : "PASS";
  const confidence = Math.round(weighted);

  return { decision, confidence, scores };
}
