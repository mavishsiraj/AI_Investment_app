import { SMA, RSI, MACD } from "technicalindicators";
import type { CandleData, TechnicalSnapshot } from "../agents/types.ts";

/**
 * technicals.ts
 *
 * Pure function: candles in, snapshot out. No network calls, no LLM.
 * Requires at least 50 candles for SMA50/RSI/MACD to be meaningful; below
 * that, returns a snapshot of all-null indicators rather than computing
 * misleading values from too little data.
 *
 * Change from previous version: tsconfig has noUncheckedIndexedAccess on,
 * which a real `tsc --noEmit` run caught as 9 errors here — `array[i]`
 * types as `T | undefined` even right after an `array.length > 0` check,
 * since TS can't correlate the two. Switched to `.at(-1) ?? null`
 * throughout, which is both correct under strict indexing and reads
 * cleaner than the old length-checked ternaries.
 */

const MIN_CANDLES_FOR_INDICATORS = 50;
const SMA_LONG_PERIOD = 200;
const SUPPORT_RESISTANCE_WINDOW = 60;
const BREAKOUT_PROXIMITY = 0.97; // within 3% of resistance
const BREAKOUT_RSI_CEILING = 70;

export function computeTechnicals(candles: CandleData[]): TechnicalSnapshot {
  const currentPrice = candles.at(-1)?.close ?? null;

  if (candles.length < MIN_CANDLES_FOR_INDICATORS) {
    return {
      sma50: null,
      sma200: null,
      rsi14: null,
      macdSignal: "neutral",
      support: null,
      resistance: null,
      breakout: false,
      trend: "neutral",
      currentPrice,
    };
  }

  const closes = candles.map((candle) => candle.close);

  const sma50Series = SMA.calculate({ period: 50, values: closes });
  const sma200Series =
    candles.length >= SMA_LONG_PERIOD ? SMA.calculate({ period: 200, values: closes }) : [];
  const rsiSeries = RSI.calculate({ period: 14, values: closes });
  const macdSeries = MACD.calculate({
    values: closes,
    fastPeriod: 12,
    slowPeriod: 26,
    signalPeriod: 9,
    SimpleMAOscillator: false,
    SimpleMASignal: false,
  });

  const sma50 = sma50Series.at(-1) ?? null;
  const sma200 = sma200Series.at(-1) ?? null;
  const rsi14 = rsiSeries.at(-1) ?? null;
  const lastMacd = macdSeries.at(-1);

  let macdSignal: TechnicalSnapshot["macdSignal"] = "neutral";
  if (lastMacd?.MACD !== undefined && lastMacd?.signal !== undefined) {
    if (lastMacd.MACD > lastMacd.signal) macdSignal = "bullish";
    else if (lastMacd.MACD < lastMacd.signal) macdSignal = "bearish";
  }

  const window = candles.slice(-SUPPORT_RESISTANCE_WINDOW);
  const support = Math.min(...window.map((candle) => candle.low));
  const resistance = Math.max(...window.map((candle) => candle.high));

  const breakout =
    currentPrice !== null &&
    rsi14 !== null &&
    currentPrice >= resistance * BREAKOUT_PROXIMITY &&
    rsi14 < BREAKOUT_RSI_CEILING;

  let trend: TechnicalSnapshot["trend"] = "neutral";
  if (currentPrice !== null && sma50 !== null && sma200 !== null) {
    if (currentPrice > sma50 && sma50 > sma200) trend = "bullish";
    else if (currentPrice < sma50 && sma50 < sma200) trend = "bearish";
  }

  return {
    sma50,
    sma200,
    rsi14,
    macdSignal,
    support,
    resistance,
    breakout,
    trend,
    currentPrice,
  };
}
