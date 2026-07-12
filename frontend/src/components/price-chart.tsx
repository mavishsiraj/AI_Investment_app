"use client";

import { useEffect, useRef, useState } from "react";
import { createChart, ColorType, CandlestickSeries, LineSeries, type UTCTimestamp } from "lightweight-charts";
import type { ResearchReport } from "@/agents/types";
import { Card, CardLabel, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

interface PriceChartProps {
  report: ResearchReport;
}

/**
 * Resolved hex values of the design tokens in globals.css. lightweight-charts
 * renders to <canvas>, so CSS custom properties can't be read directly here —
 * if a token color changes in globals.css, these need the matching hex
 * updated manually.
 */
const CHART_COLORS = {
  surface: "#0d1117",
  textMuted: "#9ca3af",
  gridLine: "rgba(255,255,255,0.05)",
  axisBorder: "rgba(255,255,255,0.1)",
  positive: "#34d399",
  negative: "#f87171",
  warning: "#fbbf24",
  accent: "#5b7cf0",
};

/**
 * price-chart.tsx
 *
 * Renders report.candles — real OHLCV history from Yahoo Finance — never
 * mock data. If history is unavailable, candles is empty and we show an
 * explicit empty state instead of fabricating a chart. Support/resistance/
 * SMA overlays come from report.technicals (server-computed), drawn as flat
 * reference lines since technicals only gives a single current value, not a
 * historical series.
 *
 * Mobile bug fix: the chart used to get a hardcoded height: 400 in JS
 * regardless of its actual CSS container height (280px on mobile). It now
 * reads the container's real clientHeight on mount, and the ResizeObserver
 * syncs both width AND height (it previously only synced width), so the
 * canvas can never outgrow its box again.
 */
export function PriceChart({ report }: PriceChartProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isReady, setIsReady] = useState(false);
  const candles = report.candles;

  useEffect(() => {
    if (!containerRef.current || candles.length === 0) return;

    setIsReady(false);

    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height: containerRef.current.clientHeight,
      layout: {
        background: { type: ColorType.Solid, color: CHART_COLORS.surface },
        textColor: CHART_COLORS.textMuted,
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
      },
      grid: {
        vertLines: { color: CHART_COLORS.gridLine },
        horzLines: { color: CHART_COLORS.gridLine },
      },
      rightPriceScale: { borderColor: CHART_COLORS.axisBorder },
      timeScale: { borderColor: CHART_COLORS.axisBorder },
      crosshair: { mode: 0 },
    });

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: CHART_COLORS.positive,
      downColor: CHART_COLORS.negative,
      borderVisible: false,
      wickUpColor: CHART_COLORS.positive,
      wickDownColor: CHART_COLORS.negative,
    });

    const data = candles.map((item) => ({
      time: (new Date(item.date).getTime() / 1000) as UTCTimestamp,
      open: item.open,
      high: item.high,
      low: item.low,
      close: item.close,
    }));
    candleSeries.setData(data);

    const { support, resistance, sma50: sma50Value, sma200: sma200Value } = report.technicals;
    const firstTime = data[0]?.time;
    const lastTime = data[data.length - 1]?.time;

    if (support !== null && firstTime !== undefined && lastTime !== undefined) {
      const supportLine = chart.addSeries(LineSeries, { color: CHART_COLORS.positive, lineWidth: 2, lineStyle: 2 });
      supportLine.setData([
        { time: firstTime, value: support },
        { time: lastTime, value: support },
      ]);
    }

    if (resistance !== null && firstTime !== undefined && lastTime !== undefined) {
      const resistanceLine = chart.addSeries(LineSeries, { color: CHART_COLORS.negative, lineWidth: 2, lineStyle: 2 });
      resistanceLine.setData([
        { time: firstTime, value: resistance },
        { time: lastTime, value: resistance },
      ]);
    }

    if (sma50Value !== null && firstTime !== undefined && lastTime !== undefined) {
      const sma50 = chart.addSeries(LineSeries, { color: CHART_COLORS.warning, lineWidth: 2 });
      sma50.setData([
        { time: firstTime, value: sma50Value },
        { time: lastTime, value: sma50Value },
      ]);
    }

    if (sma200Value !== null && firstTime !== undefined && lastTime !== undefined) {
      const sma200 = chart.addSeries(LineSeries, { color: CHART_COLORS.accent, lineWidth: 2 });
      sma200.setData([
        { time: firstTime, value: sma200Value },
        { time: lastTime, value: sma200Value },
      ]);
    }

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        chart.applyOptions({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
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
    <Card>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardLabel>Price action</CardLabel>
          <CardTitle>
            {report.companyName} · ~1Y view
          </CardTitle>
        </div>
        {candles.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <Badge variant="positive">Support</Badge>
            <Badge variant="negative">Resistance</Badge>
            <Badge variant="warning">SMA 50</Badge>
            <Badge variant="accent">SMA 200</Badge>
          </div>
        )}
      </div>

      {candles.length === 0 ? (
        <div className="flex h-[240px] w-full items-center justify-center rounded-md border border-dashed border-border text-center text-sm text-foreground-muted">
          Price history is unavailable for this symbol right now.
        </div>
      ) : (
        <div className="relative h-[280px] w-full sm:h-[400px]">
          {!isReady && (
            <div className="absolute inset-0 p-1">
              <Skeleton className="h-full w-full" />
            </div>
          )}
          <div ref={containerRef} className="h-full w-full" />
        </div>
      )}
    </Card>
  );
}
