import YahooFinance from "yahoo-finance2";
import type { CompanyProfile, RawFinancials, FinancialMetrics, CandleData } from "../agents/types.ts";

/**
 * yahoo.ts
 *
 * Every function is PURE data access — no LLM involvement. Design note:
 * resolveSymbol() throws on failure by design (ticker resolution failing
 * means "don't hallucinate", handled explicitly by fetchData.ts). The other
 * functions here also throw rather than swallow errors, so that
 * fetchData.ts's Promise.allSettled can accurately count which of the 5
 * data sources actually returned data — silently returning defaults here
 * would make every source look "successful" even when it wasn't.
 *
 * Change from previous version: yahoo-finance2's default export is a
 * constructor, not a ready-to-use singleton — `yahooFinance.search(...)`
 * on the bare import doesn't compile (confirmed against the real installed
 * package, not assumed). Also bumped the dependency from ^2.13.0 to
 * ^4.0.0: the 2.x line installed here had search/quoteSummary/chart
 * stripped down to just quote()/autoc(), so this rewrite targets the
 * actual current API surface instead.
 */
const yahooFinance = new YahooFinance();

/** Resolves a free-text company name to a tradeable equity ticker symbol. */
export async function resolveSymbol(companyName: string): Promise<string> {
  const trimmed = companyName.trim();
  if (!trimmed) {
    throw new Error("Company name is empty.");
  }

  const results = await yahooFinance.search(trimmed);
  const equity = results.quotes.find(
    (quote): quote is typeof quote & { symbol: string; quoteType: "EQUITY" } =>
      "quoteType" in quote && quote.quoteType === "EQUITY"
  );

  if (!equity) {
    throw new Error(
      `Could not find ticker for ${companyName}. Try the exact company name or ticker symbol.`
    );
  }

  return equity.symbol;
}

export async function fetchProfile(symbol: string): Promise<CompanyProfile> {
  const data = await yahooFinance.quoteSummary(symbol, {
    modules: ["assetProfile", "price"],
  });

  return {
    symbol,
    companyName: data.price?.longName ?? data.price?.shortName ?? symbol,
    sector: data.assetProfile?.sector ?? null,
    industry: data.assetProfile?.industry ?? null,
    description: data.assetProfile?.longBusinessSummary ?? null,
    website: data.assetProfile?.website ?? null,
    employees: data.assetProfile?.fullTimeEmployees ?? null,
    exchange: data.price?.exchangeName ?? null,
    currency: data.price?.currency ?? null,
  };
}

export async function fetchRawFinancials(symbol: string): Promise<RawFinancials> {
  const data = await yahooFinance.quoteSummary(symbol, {
    modules: ["defaultKeyStatistics", "financialData", "summaryDetail"],
  });

  const stats = data.defaultKeyStatistics;
  const financialData = data.financialData;
  const summary = data.summaryDetail;

  return {
    trailingPE: summary?.trailingPE ?? null,
    forwardPE: stats?.forwardPE ?? null,
    revenueGrowth: financialData?.revenueGrowth ?? null,
    earningsGrowth: financialData?.earningsGrowth ?? null,
    debtToEquity: financialData?.debtToEquity ?? null,
    marketCap: summary?.marketCap ?? null,
    currentPrice: financialData?.currentPrice ?? null,
    fiftyTwoWeekHigh: summary?.fiftyTwoWeekHigh ?? null,
    fiftyTwoWeekLow: summary?.fiftyTwoWeekLow ?? null,
    profitMargin: financialData?.profitMargins ?? null,
    returnOnEquity: financialData?.returnOnEquity ?? null,
  };
}

/** Formats raw numeric financials into display-ready strings. Pure, synchronous, never throws. */
export function formatFinancials(raw: RawFinancials): FinancialMetrics {
  const asPercent = (value: number | null): string =>
    value === null ? "N/A" : `${(value * 100).toFixed(1)}%`;

  const asNumber = (value: number | null, digits = 2): string =>
    value === null ? "N/A" : value.toFixed(digits);

  const asMarketCap = (value: number | null): string => {
    if (value === null) return "N/A";
    if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
    if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
    if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
    return `$${value.toFixed(0)}`;
  };

  return {
    peRatio: asNumber(raw.trailingPE),
    revenueGrowth: asPercent(raw.revenueGrowth),
    earningsGrowth: asPercent(raw.earningsGrowth),
    debtToEquity: asNumber(raw.debtToEquity),
    marketCap: asMarketCap(raw.marketCap),
    profitMargin: asPercent(raw.profitMargin),
    returnOnEquity: asPercent(raw.returnOnEquity),
  };
}

/** Fetches ~1 year of daily OHLCV candles. */
export async function fetchHistory(symbol: string): Promise<CandleData[]> {
  const period2 = new Date();
  const period1 = new Date();
  period1.setFullYear(period1.getFullYear() - 1);

  const result = await yahooFinance.chart(symbol, {
    period1,
    period2,
    interval: "1d",
  });

  return result.quotes
    .filter(
      (quote): quote is typeof quote & {
        open: number;
        high: number;
        low: number;
        close: number;
      } => quote.open !== null && quote.high !== null && quote.low !== null && quote.close !== null
    )
    .map((quote) => ({
      date: quote.date.toISOString().slice(0, 10),
      open: quote.open,
      high: quote.high,
      low: quote.low,
      close: quote.close,
      volume: quote.volume ?? 0,
    }));
}
