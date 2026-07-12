import { z } from "zod";

/**
 * schemas.ts
 *
 * Zod schemas that constrain the two LLM calls in the pipeline:
 *   1. synthesisSchema — sentiment + competitive position + risks, derived
 *      from real fetched data (news articles, financials, technicals).
 *   2. narrationSchema — the final bull/bear memo, derived from the
 *      deterministic verdict produced by src/lib/scoring.ts.
 *
 * These schemas are the single source of truth for the shape of LLM output.
 * Do not redefine SentimentResult / CompetitorResult / RiskResult elsewhere —
 * import the inferred types from this file instead.
 */

// ---------------------------------------------------------------------------
// Synthesis schema (LLM call #1 — "fast" model)
// ---------------------------------------------------------------------------

export const sentimentSchema = z.object({
  overall: z.enum(["bullish", "bearish", "neutral"]).describe(
    "Overall market sentiment toward the company based on the supplied news articles."
  ),
  score: z
    .number()
    .min(1)
    .max(10)
    .describe("Sentiment strength on a 1 (very negative) to 10 (very positive) scale."),
  themes: z
    .array(z.string())
    .min(1)
    .max(6)
    .describe("Short recurring themes across the news coverage, e.g. 'margin pressure'."),
  perArticle: z
    .array(
      z.object({
        index: z.number().int().nonnegative().describe(
          "Zero-based index into the news articles array that was supplied in the prompt."
        ),
        sentiment: z.enum(["bullish", "bearish", "neutral"]),
      })
    )
    .describe("Per-article sentiment classification, one entry per supplied article."),
  analysis: z
    .string()
    .min(1)
    .describe("2-4 sentence synthesis of why sentiment landed where it did."),
});

export const competitionSchema = z.object({
  position: z
    .enum(["leader", "challenger", "niche", "laggard"])
    .describe("Competitive position used directly by the scoring engine's competition dimension."),
  peers: z.array(z.string()).min(0).max(8).describe("Named direct competitors, if identifiable."),
  comparison: z
    .string()
    .min(1)
    .describe("2-4 sentence explanation of the competitive position relative to peers."),
});

export const riskFactorSchema = z.object({
  name: z.string().min(1).describe("Short risk label, e.g. 'Customer concentration'."),
  severity: z.enum(["h", "m", "l"]).describe("High, medium, or low severity."),
  category: z.enum(["company", "financial", "technical", "macro", "sentiment"]),
  detail: z.string().min(1).describe("1-2 sentence explanation grounded in the supplied data."),
});

export const synthesisSchema = z.object({
  sentiment: sentimentSchema,
  competition: competitionSchema,
  risks: z
    .array(riskFactorSchema)
    .min(1)
    .max(8)
    .describe("Distinct, non-redundant risk factors, ordered most to least severe."),
  riskAnalysis: z
    .string()
    .min(1)
    .describe("2-4 sentence summary of the overall risk picture used to derive the risk score."),
});

export type SentimentResult = z.infer<typeof sentimentSchema>;
export type CompetitorResult = z.infer<typeof competitionSchema>;
export type RiskFactor = z.infer<typeof riskFactorSchema>;
export type SynthesisResult = z.infer<typeof synthesisSchema>;

/**
 * RiskResult bundles the individual risk factors with the narrative summary.
 * Kept as a distinct type because scoring.ts consumes { risks, riskAnalysis }
 * together, while state.ts stores risks and risk analysis as separate fields.
 */
export const riskResultSchema = z.object({
  risks: z.array(riskFactorSchema).min(1).max(8),
  riskAnalysis: z.string().min(1),
});
export type RiskResult = z.infer<typeof riskResultSchema>;

// ---------------------------------------------------------------------------
// Narration schema (LLM call #2 — "smart" model)
// ---------------------------------------------------------------------------

export const narrationSchema = z.object({
  bullCase: z
    .array(z.string().min(1))
    .length(3)
    .describe("Exactly three concise, data-grounded bull points."),
  bearCase: z
    .array(z.string().min(1))
    .length(3)
    .describe("Exactly three concise, data-grounded bear points."),
  reasoning: z
    .string()
    .min(1)
    .describe("Paragraph explaining how the verdict follows from the scoring breakdown."),
  horizon: z.enum(["short-term", "medium-term", "long-term"]),
  entryPrice: z
    .number()
    .positive()
    .nullable()
    .describe("Suggested entry price, or null if the data doesn't support a specific level."),
  targetPrice: z.number().positive().nullable(),
  stopLoss: z.number().positive().nullable(),
});

export type NarrationResult = z.infer<typeof narrationSchema>;

// ---------------------------------------------------------------------------
// Schema registry — used by structuredCall() call sites for logging/errors
// ---------------------------------------------------------------------------

export const SCHEMA_NAMES = {
  synthesis: "synthesisSchema",
  narration: "narrationSchema",
} as const;

export type SchemaName = (typeof SCHEMA_NAMES)[keyof typeof SCHEMA_NAMES];
