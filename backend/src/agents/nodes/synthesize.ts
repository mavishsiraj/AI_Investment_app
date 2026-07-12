import type { RunnableConfig } from "@langchain/core/runnables";
import { structuredCall } from "../../lib/llm.ts";
import { synthesisSchema } from "../../lib/schemas.ts";
import type { ResearchState } from "../state.ts";

/**
 * synthesize.ts (Node 2 — LLM Call 1, "fast" model)
 *
 * Interprets the real data fetched in Node 1 into sentiment, competitive
 * position, and risk factors. Never invents headlines or numbers — the
 * prompt only contains data actually present on state. On failure, falls
 * back to neutral-scoring defaults so the pipeline can still reach a
 * verdict rather than aborting the whole run over one LLM call.
 *
 * Change from previous version: accepts an optional RunnableConfig,
 * forwarding config.signal to structuredCall so this call can be cancelled
 * by /api/research's timeout or client-disconnect handling.
 */

const SYSTEM_PROMPT = `You are a senior equity research analyst. You receive REAL data fetched from Yahoo Finance and NewsAPI. Your job is SYNTHESIS — interpret the data, don't recall facts from memory. Do NOT fabricate headlines or numbers not in the data.`;

function buildUserPrompt(state: ResearchState): string {
  const { companyName, profile, financials, technicals, rawNews } = state;

  const articlesBlock =
    rawNews.length > 0
      ? rawNews
          .map(
            (article, index) =>
              `[${index}] "${article.title}" (${article.source}, ${article.publishedAt})${
                article.description ? `: ${article.description}` : ""
              }`
          )
          .join("\n")
      : "No news articles were available for this company.";

  return `Company: ${companyName}
Profile: ${
    profile
      ? `${profile.companyName} — ${profile.sector ?? "unknown sector"} / ${profile.industry ?? "unknown industry"}`
      : "Not available"
  }

Financials:
- P/E: ${financials?.peRatio ?? "N/A"}
- Revenue growth: ${financials?.revenueGrowth ?? "N/A"}
- Earnings growth: ${financials?.earningsGrowth ?? "N/A"}
- Debt/Equity: ${financials?.debtToEquity ?? "N/A"}
- Profit margin: ${financials?.profitMargin ?? "N/A"}

Technicals:
- Trend: ${technicals?.trend ?? "unknown"}
- RSI(14): ${technicals?.rsi14 ?? "N/A"}
- Breakout: ${technicals?.breakout ?? false}

News articles (reference by the exact index shown when filling perArticle):
${articlesBlock}

Synthesize sentiment, competitive position, and risk factors strictly from the data above. If data is missing, say so rather than guessing.`;
}

const FALLBACK_SYNTHESIS = {
  sentiment: {
    overall: "neutral" as const,
    score: 5,
    themes: [] as string[],
    perArticle: [] as { index: number; sentiment: "bullish" | "bearish" | "neutral" }[],
    analysis: "Synthesis unavailable; defaulted to neutral sentiment.",
  },
  competition: {
    position: "niche" as const,
    peers: [] as string[],
    comparison: "Synthesis unavailable; defaulted to a neutral competitive position.",
  },
  risks: [
    {
      name: "Synthesis unavailable",
      severity: "m" as const,
      category: "company" as const,
      detail: "The synthesis LLM call failed; this is a placeholder neutral risk entry.",
    },
  ],
  riskAnalysis: "Synthesis unavailable; risk analysis could not be generated.",
};

export async function synthesizeNode(
  state: ResearchState,
  config?: RunnableConfig
): Promise<Partial<ResearchState>> {
  try {
    const result = await structuredCall(synthesisSchema, SYSTEM_PROMPT, buildUserPrompt(state), {
      model: "fast",
      label: "synthesis",
      signal: config?.signal,
    });

    return {
      sentiment: result.sentiment,
      competitors: result.competition,
      risks: result.risks,
      riskAnalysis: result.riskAnalysis,
      step: "scoring",
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      sentiment: FALLBACK_SYNTHESIS.sentiment,
      competitors: FALLBACK_SYNTHESIS.competition,
      risks: FALLBACK_SYNTHESIS.risks,
      riskAnalysis: FALLBACK_SYNTHESIS.riskAnalysis,
      errors: [`Synthesis failed, using neutral fallback: ${message}`],
      step: "scoring",
    };
  }
}
