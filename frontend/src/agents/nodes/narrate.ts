import type { RunnableConfig } from "@langchain/core/runnables";
import { structuredCall } from "../../lib/llm";
import { narrationSchema } from "../../lib/schemas";
import type { ResearchState } from "../state";

/**
 * narrate.ts (Node 4 — LLM Call 2, "smart" model)
 *
 * Writes the final investment memo around the ALREADY-COMPUTED verdict.
 * The decision and confidence from score.ts are passed into the prompt as
 * fixed facts, not questions — the schema has no field for them, so the
 * model structurally cannot override them. On failure, the verdict from
 * Node 3 is kept exactly as-is; only the (already-empty) prose fields stay
 * empty.
 *
 * Change from previous version: accepts an optional RunnableConfig,
 * forwarding config.signal to structuredCall so this call can be cancelled
 * by /api/research's timeout or client-disconnect handling.
 */

const SYSTEM_PROMPT = `You are the CIO writing the final investment memo. The INVEST/PASS decision and confidence are computed by a scoring engine — do NOT change them. Explain WHY with 3 bull points, 3 bear points, 2-3 paragraph reasoning (Goldman Sachs style), and price targets from technical levels.`;

function buildUserPrompt(state: ResearchState): string {
  const { companyName, verdict, technicals, sentiment, competitors, risks, riskAnalysis } = state;

  if (!verdict) {
    throw new Error("narrateNode called before a verdict was computed on state.");
  }

  const riskLines =
    risks.length > 0
      ? risks.map((risk) => `- ${risk.name} (${risk.severity}, ${risk.category}): ${risk.detail}`).join("\n")
      : "- No specific risk factors identified.";

  return `Company: ${companyName}

Decision (fixed — do not change): ${verdict.decision}
Confidence (fixed — do not change): ${verdict.confidence}

Score breakdown (0-100 each):
- Growth: ${verdict.scores.growth}
- Valuation: ${verdict.scores.valuation}
- Leverage: ${verdict.scores.leverage}
- Sentiment: ${verdict.scores.sentiment}
- Risk: ${verdict.scores.risk}
- Competition: ${verdict.scores.competition}
- Weighted total: ${verdict.scores.weighted}

Sentiment analysis: ${sentiment?.analysis ?? "N/A"}
Competitive position: ${competitors?.position ?? "unknown"} — ${competitors?.comparison ?? "N/A"}

Risk factors:
${riskLines}
Risk analysis: ${riskAnalysis || "N/A"}

Technical levels:
- Current price: ${technicals?.currentPrice ?? "N/A"}
- Support: ${technicals?.support ?? "N/A"}
- Resistance: ${technicals?.resistance ?? "N/A"}
- Trend: ${technicals?.trend ?? "N/A"}

Write the memo: exactly 3 bull points, exactly 3 bear points, 2-3 paragraphs of reasoning explaining how the score breakdown above supports the ${verdict.decision} decision, an investment horizon, and entry/target/stop-loss prices derived from the technical levels (null if the levels don't support a specific number).`;
}

export async function narrateNode(
  state: ResearchState,
  config?: RunnableConfig
): Promise<Partial<ResearchState>> {
  if (!state.verdict) {
    return {
      step: "error",
      errors: ["narrateNode reached with no verdict on state; score node must run first."],
    };
  }

  try {
    const result = await structuredCall(narrationSchema, SYSTEM_PROMPT, buildUserPrompt(state), {
      model: "smart",
      label: "narration",
      signal: config?.signal,
    });

    return {
      verdict: {
        ...state.verdict,
        bullCase: result.bullCase,
        bearCase: result.bearCase,
        reasoning: result.reasoning,
        horizon: result.horizon,
        entryPrice: result.entryPrice,
        targetPrice: result.targetPrice,
        stopLoss: result.stopLoss,
      },
      step: "done",
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      // Verdict intentionally untouched: decision/confidence/scores stay
      // exactly as score.ts computed them; narration fields remain the
      // empty defaults set there.
      errors: [`Narration failed, verdict kept without prose: ${message}`],
      step: "done",
    };
  }
}
