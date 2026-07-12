"use client";

import { useEffect, useRef, useState } from "react";
import { createChart, ColorType, CandlestickSeries, LineSeries, type UTCTimestamp } from "lightweight-charts";
import type { ResearchReport } from "@/agents/types";

interface PriceChartProps {
  report: ResearchReport;
}

/**
 * price-chart.tsx
 *
 * Renders report.candles — real OHLCV history fetched from Yahoo Finance —
 * never mock/placeholder data. If history failed to fetch (Yahoo down, or
 * this ticker has no history), candles is an empty array and we show an
 * explicit "no history available" state instead of fabricating a chart.
 * Support/resistance/SMA overlay lines are derived from report.technicals
 * (already computed server-side), not invented client-side.
 */
export function PriceChart({ report }: PriceChartProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isReady, setIsReady] = useState(false);
  const candles = report.candles;

  useEffect(() => {
    if (!containerRef.current || candles.length === 0) return;

    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height: 400,
      layout: {
        background: { type: ColorType.Solid, color: "#0d1117" },
        textColor: "#e6edf3",
        fontFamily: "IBM Plex Mono, monospace",
      },
      grid: {
        vertLines: { color: "rgba(255,255,255,0.05)" },
        horzLines: { color: "rgba(255,255,255,0.05)" },
      },
      rightPriceScale: { borderColor: "rgba(255,255,255,0.1)" },
      timeScale: { borderColor: "rgba(255,255,255,0.1)" },
      crosshair: { mode: 0 },
    });

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: "#3fb950",
      downColor: "#f85149",
      borderVisible: false,
      wickUpColor: "#3fb950",
      wickDownColor: "#f85149",
    });

    const data = candles.map((item) => ({
      time: (new Date(item.date).getTime() / 1000) as UTCTimestamp,
      open: item.open,
      high: item.high,
      low: item.low,
      close: item.close,
    }));
    candleSeries.setData(data);

    // Technicals only give us a single current support/resistance/SMA value
    // (not a full historical series), so overlays are drawn as flat
    // reference lines across the visible range rather than fabricated
    // per-point curves. Omitted entirely when a level is null.
    const { support, resistance, sma50: sma50Value, sma200: sma200Value } = report.technicals;
    const firstTime = data[0]?.time;
    const lastTime = data[data.length - 1]?.time;

    if (support !== null && firstTime !== undefined && lastTime !== undefined) {
      const supportLine = chart.addSeries(LineSeries, { color: "#3fb950", lineWidth: 2, lineStyle: 2 });
      supportLine.setData([
        { time: firstTime, value: support },
        { time: lastTime, value: support },
      ]);
    }

    if (resistance !== null && firstTime !== undefined && lastTime !== undefined) {
      const resistanceLine = chart.addSeries(LineSeries, { color: "#f85149", lineWidth: 2, lineStyle: 2 });
      resistanceLine.setData([
        { time: firstTime, value: resistance },
        { time: lastTime, value: resistance },
      ]);
    }

    if (sma50Value !== null && firstTime !== undefined && lastTime !== undefined) {
      const sma50 = chart.addSeries(LineSeries, { color: "#d29922", lineWidth: 2 });
      sma50.setData([
        { time: firstTime, value: sma50Value },
        { time: lastTime, value: sma50Value },
      ]);
    }

    if (sma200Value !== null && firstTime !== undefined && lastTime !== undefined) {
      const sma200 = chart.addSeries(LineSeries, { color: "#58a6ff", lineWidth: 2 });
      sma200.setData([
        { time: firstTime, value: sma200Value },
        { time: lastTime, value: sma200Value },
      ]);
    }

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        chart.applyOptions({ width: entry.contentRect.width });
      }
    });
    resizeObserver.observe(containerRef.current);
    setIsReady(true);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
    };
  }, [report.symbol, candles, report.technicals]);

  return (
    <section className="rounded-[24px] border border-white/10 bg-[#0d1117]/80 p-5">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-sm font-medium uppercase tracking-[0.3em] text-[#8b949e]">Price action</div>
          <div className="mt-1 text-lg font-semibold text-[#e6edf3]">{report.companyName} · ~1Y view</div>
        </div>
        {candles.length > 0 && (
          <div className="flex flex-wrap gap-2 text-xs uppercase tracking-[0.25em] text-[#8b949e]">
            <span className="rounded-full border border-[#3fb950]/20 bg-[#3fb950]/10 px-2.5 py-1">Support</span>
            <span className="rounded-full border border-[#f85149]/20 bg-[#f85149]/10 px-2.5 py-1">Resistance</span>
            <span className="rounded-full border border-amber-400/20 bg-amber-500/10 px-2.5 py-1">SMA 50</span>
            <span className="rounded-full border border-[#58a6ff]/20 bg-[#58a6ff]/10 px-2.5 py-1">SMA 200</span>
          </div>
        )}
      </div>

      {candles.length === 0 ? (
        <div className="flex h-[240px] w-full items-center justify-center rounded-2xl border border-dashed border-white/10 text-center text-sm text-[#8b949e]">
          Price history is unavailable for this symbol right now — the chart is skipped rather than showing
          placeholder data.
        </div>
      ) : (
        <>
          <div ref={containerRef} className="h-[280px] w-full sm:h-[400px]" />
          {!isReady && <div className="mt-2 text-sm text-[#8b949e]">Preparing chart…</div>}
        </>
      )}
    </section>
  );
}
