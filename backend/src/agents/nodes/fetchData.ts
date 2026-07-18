import type { RunnableConfig } from "@langchain/core/runnables";
import {
  resolveSymbol,
  fetchProfile,
  fetchRawFinancials,
  formatFinancials,
} from "../../services/finnhub.ts";
import { fetchHistory } from "../../services/twelvedata.ts";
import { fetchNews } from "../../services/news.ts";
import { computeTechnicals } from "../../services/technicals.ts";
import type { ResearchState } from "../state.ts";

/**
 * fetchData.ts (Node 1 — NO LLM)
 *
 * Resolves the company name to a ticker (hard failure if this fails — no
 * hallucinated data downstream), then fetches profile/financials/history/
 * news in parallel via Promise.allSettled so one provider's outage never
 * kills the run. Technicals is derived synchronously from the history
 * result afterward (it cannot run in true parallel — it depends on candles
 * — but is still counted as one of the 5 data sources per your spec).
 *
 * Change from previous version: switched the data source from Yahoo
 * Finance (yahoo-finance2, an unofficial scraper that Yahoo aggressively
 * rate-limits from datacenter IPs like Render's) to Finnhub, a documented
 * API with a real key. Since finnhub.ts's calls go through axios (like
 * news.ts), the AbortSignal from /api/research's AbortController now
 * propagates mid-request for every one of these calls, not just news —
 * an in-flight request is actually cancelled instead of just left to
 * complete after the signal fires.
 */

function describeError(reason: unknown): string {
  return reason instanceof Error ? reason.message : String(reason);
}

export async function fetchDataNode(
  state: ResearchState,
  config?: RunnableConfig
): Promise<Partial<ResearchState>> {
  const signal = config?.signal;

  if (signal?.aborted) {
    return {
      step: "error",
      errors: ["fetchData aborted before starting."],
    };
  }

  let symbol: string;
  try {
    symbol = await resolveSymbol(state.companyName, signal);
  } catch (error) {
    // resolveSymbol's error message is already the exact user-facing string
    // ("Could not find ticker for X. Try the exact company name or ticker
    // symbol.") — pass it through directly instead of wrapping it, so the
    // frontend can show it verbatim without noise.
    return {
      step: "error",
      errors: [describeError(error)],
    };
  }

  if (signal?.aborted) {
    return {
      step: "error",
      errors: ["fetchData aborted after ticker resolution."],
    };
  }

  const [profileResult, rawFinancialsResult, historyResult, newsResult] = await Promise.allSettled([
    fetchProfile(symbol, signal),
    fetchRawFinancials(symbol, signal),
    fetchHistory(symbol, signal),
    fetchNews(state.companyName, signal),
  ]);

  const dataSources: string[] = [];
  const errors: string[] = [];

  const profile = profileResult.status === "fulfilled" ? profileResult.value : null;
  if (profileResult.status === "fulfilled") {
    dataSources.push("finnhub-profile");
  } else {
    errors.push(`Profile fetch failed: ${describeError(profileResult.reason)}`);
  }

  const rawFinancials = rawFinancialsResult.status === "fulfilled" ? rawFinancialsResult.value : null;
  if (rawFinancialsResult.status === "fulfilled") {
    dataSources.push("finnhub-financials");
  } else {
    errors.push(`Financials fetch failed: ${describeError(rawFinancialsResult.reason)}`);
  }

  const candles = historyResult.status === "fulfilled" ? historyResult.value : [];
  if (historyResult.status === "fulfilled" && candles.length > 0) {
    dataSources.push("finnhub-history");
  } else if (historyResult.status === "rejected") {
    errors.push(`History fetch failed: ${describeError(historyResult.reason)}`);
  } else {
    errors.push("History fetch returned no candles.");
  }

  // news.ts is deliberately graceful (never rejects) — an empty array just
  // means "no news available" (missing key, zero results, or cancelled),
  // not an error.
  const rawNews = newsResult.status === "fulfilled" ? newsResult.value : [];
  if (newsResult.status === "fulfilled" && rawNews.length > 0) {
    dataSources.push("newsapi");
  } else if (newsResult.status === "rejected") {
    errors.push(`News fetch failed: ${describeError(newsResult.reason)}`);
  }

  const technicals = candles.length > 0 ? computeTechnicals(candles) : null;
  if (technicals) {
    dataSources.push("technicalindicators");
  } else {
    errors.push("Technicals skipped: no candle data available.");
  }

  const financials = rawFinancials ? formatFinancials(rawFinancials) : null;

  return {
    profile,
    rawFinancials,
    financials,
    candles,
    rawNews,
    technicals,
    dataSources,
    errors,
    step: "synthesizing",
  };
}
