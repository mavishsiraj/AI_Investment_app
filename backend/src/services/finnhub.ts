import axios from "axios";
import type { CompanyProfile, RawFinancials, FinancialMetrics} from "../agents/types.ts";

/**
 * finnhub.ts
 *
 * Replaces yahoo.ts. yahoo-finance2 scrapes Yahoo's unofficial web
 * endpoints (not a real API), and Yahoo's crumb/anti-bot layer
 * aggressively rate-limits requests from shared datacenter IPs — exactly
 * what a Render-hosted backend uses. That's a permanent, unfixable-on-our-
 * end problem, not a bug in our code, so we're moving to Finnhub: a
 * documented API with a real key and a real (60 req/min) rate limit we
 * can plan around.
 *
 * Same contract as yahoo.ts: every function throws on failure rather than
 * swallowing errors, so fetchData.ts's Promise.allSettled can accurately
 * count which of the 5 data sources actually returned data.
 *
 * Known limitation (confirmed against the live API, not assumed): Finnhub's
 * free tier returns 403 ("You don't have access to this resource") on
 * /stock/candle — historical candles are a paid-plan feature now, this
 * isn't a bug on our side. fetchHistory() still throws on that 403, and
 * fetchData.ts already treats a rejected history fetch as "candles: [],
 * error noted, everything else still renders" — so this degrades
 * gracefully rather than breaking the whole report.
 */

const BASE_URL = "https://finnhub.io/api/v1";
const REQUEST_TIMEOUT_MS = 8000;

function requireApiKey(): string {
  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) {
    throw new Error("FINNHUB_API_KEY is not set. Add it to .env.local (see .env.example).");
  }
  return apiKey;
}

const client = axios.create({
  baseURL: BASE_URL,
  timeout: REQUEST_TIMEOUT_MS,
});

interface FinnhubSearchResult {
  count: number;
  result: Array<{
    description: string;
    displaySymbol: string;
    symbol: string;
    type: string;
  }>;
}

interface FinnhubProfile2 {
  country?: string;
  currency?: string;
  exchange?: string;
  finnhubIndustry?: string;
  ipo?: string;
  logo?: string;
  marketCapitalization?: number; // in millions
  name?: string;
  phone?: string;
  shareOutstanding?: number;
  ticker?: string;
  weburl?: string;
}

interface FinnhubQuote {
  c: number; // current price
  d: number | null; // change
  dp: number | null; // percent change
  h: number; // day high
  l: number; // day low
  o: number; // day open
  pc: number; // previous close
  t: number; // timestamp
}

interface FinnhubMetricResponse {
  metric?: Record<string, number | string | undefined>;
}

/** Resolves a free-text company name to a tradeable equity ticker symbol. */
export async function resolveSymbol(companyName: string, signal?: AbortSignal): Promise<string> {
  const trimmed = companyName.trim();
  if (!trimmed) {
    throw new Error("Company name is empty.");
  }

  const apiKey = requireApiKey();
  const { data } = await client.get<FinnhubSearchResult>("/search", {
    params: { q: trimmed, token: apiKey },
    signal,
  });

  const equity = data.result?.find((item) => item.type === "Common Stock");

  if (!equity) {
    throw new Error(
      `Could not find ticker for ${companyName}. Try the exact company name or ticker symbol.`
    );
  }

  return equity.symbol;
}

export async function fetchProfile(symbol: string, signal?: AbortSignal): Promise<CompanyProfile> {
  const apiKey = requireApiKey();
  const { data } = await client.get<FinnhubProfile2>("/stock/profile2", {
    params: { symbol, token: apiKey },
    signal,
  });

  if (!data.name) {
    throw new Error(`No profile data returned for ${symbol}.`);
  }

  return {
    symbol,
    companyName: data.name ?? symbol,
    // Finnhub's free-tier profile2 endpoint doesn't return GICS sector or a
    // company description — only industry. Leave these null rather than
    // fabricating them; downstream UI already treats null as an empty state.
    sector: null,
    industry: data.finnhubIndustry ?? null,
    description: null,
    website: data.weburl ?? null,
    employees: null,
    exchange: data.exchange ?? null,
    currency: data.currency ?? null,
  };
}

export async function fetchRawFinancials(symbol: string, signal?: AbortSignal): Promise<RawFinancials> {
  const apiKey = requireApiKey();

  const [quoteRes, metricRes] = await Promise.all([
    client.get<FinnhubQuote>("/quote", { params: { symbol, token: apiKey }, signal }),
    client.get<FinnhubMetricResponse>("/stock/metric", {
      params: { symbol, metric: "all", token: apiKey },
      signal,
    }),
  ]);

  const quote = quoteRes.data;
  const metric = metricRes.data.metric ?? {};

  // Finnhub returns growth/margin/ROE metrics as whole-number percentages
  // (e.g. 23.4 meaning 23.4%), not decimals — our RawFinancials contract
  // (per agents/types.ts) expects decimals (0.234), so we divide by 100.
  // debtToEquity is a plain ratio already, no conversion needed.
  const asDecimal = (value: unknown): number | null =>
    typeof value === "number" ? value / 100 : null;
  const asNumber = (value: unknown): number | null => (typeof value === "number" ? value : null);

  if (quote.c === 0 && quote.pc === 0) {
    // Finnhub returns all-zero quotes for symbols it doesn't actually cover
    // rather than an HTTP error, so we have to detect that case ourselves.
    throw new Error(`No quote data returned for ${symbol}.`);
  }

  return {
    trailingPE: asNumber(metric.peTTM ?? metric.peBasicExclExtraTTM),
    forwardPE: null, // not available on Finnhub's free tier
    revenueGrowth: asDecimal(metric.revenueGrowthTTMYoy),
    earningsGrowth: asDecimal(metric.epsGrowthTTMYoy),
    debtToEquity: asNumber(metric["totalDebt/totalEquityQuarterly"] ?? metric.totalDebtToEquity),
    marketCap: asNumber(metric.marketCapitalization) !== null
      ? (metric.marketCapitalization as number) * 1e6
      : null,
    currentPrice: asNumber(quote.c),
    fiftyTwoWeekHigh: asNumber(metric["52WeekHigh"]),
    fiftyTwoWeekLow: asNumber(metric["52WeekLow"]),
    profitMargin: asDecimal(metric.netMarginTTM ?? metric.netMargin),
    returnOnEquity: asDecimal(metric.roeTTM),
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

/**
 * Fetches ~1 year of daily OHLCV candles.
 *
 * NOTE: as of this writing, Finnhub's free tier returns 403 ("You don't
 * have access to this resource") for /stock/candle — it's a paid-plan-only
 * endpoint now. This still throws on that failure rather than silently
 * returning [] itself, keeping it consistent with every other function in
 * this file; fetchData.ts's Promise.allSettled already handles a rejected
 * history fetch by recording the error and continuing with an empty
 * candles array, so the rest of the report still renders normally.
 */
export async function fetchHistory(symbol: string, signal?: AbortSignal): Promise<CandleData[]> {
  const apiKey = requireApiKey();
  const to = Math.floor(Date.now() / 1000);
  const from = to - 365 * 24 * 60 * 60;

  const { data } = await client.get<{
    s: string;
    t?: number[];
    o?: number[];
    h?: number[];
    l?: number[];
    c?: number[];
    v?: number[];
  }>("/stock/candle", {
    params: { symbol, resolution: "D", from, to, token: apiKey },
    signal,
  });

  if (data.s !== "ok" || !data.t) {
    throw new Error(`No candle data available for ${symbol} (status: ${data.s}).`);
  }

  return data.t.map((timestamp, i) => ({
    date: new Date(timestamp * 1000).toISOString().slice(0, 10),
    open: data.o![i],
    high: data.h![i],
    low: data.l![i],
    close: data.c![i],
    volume: data.v?.[i] ?? 0,
  }));
}
