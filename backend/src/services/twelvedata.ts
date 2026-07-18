import axios from "axios";
import type { CandleData } from "../agents/types.ts";

/**
 * twelvedata.ts
 *
 * Finnhub's free tier returns 403 on /stock/candle — historical bars are
 * a paid-plan feature there. Yahoo's chart endpoint (query1.finance.
 * yahoo.com/v8/finance/chart) was tested directly and confirmed to
 * return 403 from a datacenter IP even without going through the
 * crumb/cookie flow — Yahoo is blocked at the IP/bot-detection layer
 * itself, not just on the crumb endpoint. So there's no free workaround
 * left within either Finnhub or Yahoo; Twelve Data's free ("Basic") tier
 * is the one that actually serves historical daily OHLCV with no credit
 * card (800 calls/day, 8/min) via /time_series.
 *
 * Profile, financials, and quote all stay on finnhub.ts — this only
 * covers fetchHistory.
 *
 * Known limitation, stated plainly rather than hidden: Twelve Data's
 * free tier is documented as full data for US exchanges but only "trial
 * symbols" for international exchanges (India, Europe, Canada, Turkey,
 * Brazil). So this reliably fixes charts for US tickers (Tesla,
 * Microsoft, NVIDIA, AMD, etc.) but may still come back empty for
 * non-US names like Infosys unless the Twelve Data plan is upgraded.
 * When that happens it throws the same way fetchHistory always has, and
 * fetchData.ts's Promise.allSettled already treats a rejected/empty
 * history fetch as "candles: [], error noted, rest of report renders" —
 * so it degrades the same way it always did for those specific tickers,
 * it just no longer does so for the majority of tickers that it used to.
 */

const BASE_URL = "https://api.twelvedata.com";
const REQUEST_TIMEOUT_MS = 8000;

function requireApiKey(): string {
  const apiKey = process.env.TWELVEDATA_API_KEY;
  if (!apiKey) {
    throw new Error("TWELVEDATA_API_KEY is not set. Add it to .env.local (see .env.example).");
  }
  return apiKey;
}

const client = axios.create({
  baseURL: BASE_URL,
  timeout: REQUEST_TIMEOUT_MS,
});

interface TwelveDataValue {
  datetime: string;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
}

interface TwelveDataTimeSeriesResponse {
  values?: TwelveDataValue[];
  status?: string;
  code?: number;
  message?: string;
}

/** Fetches ~1 year of daily OHLCV candles from Twelve Data. */
export async function fetchHistory(symbol: string, signal?: AbortSignal): Promise<CandleData[]> {
  const apiKey = requireApiKey();

  const { data } = await client.get<TwelveDataTimeSeriesResponse>("/time_series", {
    params: {
      symbol,
      interval: "1day",
      outputsize: 365,
      apikey: apiKey,
    },
    signal,
  });

  // Twelve Data returns HTTP 200 with a JSON error body ({status: "error",
  // code, message}) rather than an HTTP error status for bad symbols or
  // plan restrictions, so the payload has to be checked, not just the
  // status code axios saw.
  if (data.status === "error" || !data.values || data.values.length === 0) {
    throw new Error(
      `No candle data available for ${symbol}${data.message ? `: ${data.message}` : "."}`
    );
  }

  // Twelve Data returns newest-first; flip to chronological order to match
  // the CandleData[] contract the rest of the pipeline expects.
  return data.values
    .map((v) => ({
      date: v.datetime.slice(0, 10),
      open: parseFloat(v.open),
      high: parseFloat(v.high),
      low: parseFloat(v.low),
      close: parseFloat(v.close),
      volume: parseInt(v.volume, 10) || 0,
    }))
    .reverse();
}
