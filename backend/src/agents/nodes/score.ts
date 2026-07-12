import { computeVerdict } from "../../lib/scoring.ts";
import type { ResearchState } from "../state.ts";
import type { Verdict } from "../types.ts";

/**
 * score.ts (Node 3 — NO LLM, pure function)
 *
 * Runs the deterministic scoring engine over rawFinancials + synthesis
 * results and produces a partial verdict: decision, confidence, and score
 * breakdown are final and will never be changed by narrate.ts. Narration
 * fields start as empty defaults, filled in (or left empty on failure) by
 * Node 4.
 */
export function scoreNode(state: ResearchState): Partial<ResearchState> {
  const { decision, confidence, scores } = computeVerdict({
    rawFinancials: state.rawFinancials,
    sentiment: state.sentiment,
    competition: state.competitors,
    risks: state.risks,
  });

  const verdict: Verdict = {
    decision,
    confidence,
    scores,
    bullCase: [],
    bearCase: [],
    reasoning: "",
    horizon: null,
    entryPrice: null,
    targetPrice: null,
    stopLoss: null,
  };

  return {
    verdict,
    step: "narrating",
  };
}
