"use client";

import { useEffect, useRef, useState } from "react";
import { Hero } from "@/components/hero";
import { PipelineTimeline } from "@/components/pipeline-timeline";
import { DataCoverageBadge } from "@/components/data-coverage-badge";
import { DataGaps } from "@/components/data-gaps";
import { SearchHistory, recordSearchHistory } from "@/components/search-history";
import { VerdictBanner } from "@/components/verdict-banner";
import { MetricsGrid } from "@/components/metrics-grid";
import { PriceChart } from "@/components/price-chart";
import { ScoreRadar } from "@/components/score-radar";
import { BullBear } from "@/components/bull-bear";
import { NewsFeed } from "@/components/news-feed";
import { RiskCards } from "@/components/risk-cards";
import { Reasoning } from "@/components/reasoning";
import { ExportButton } from "@/components/export-button";
import { useResearchStream } from "@/lib/use-research-stream";

export default function HomePage() {
  const { phase, companyName, steps, dataSources, report, errorMessage, run } = useResearchStream();
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0);
  const reportRef = useRef<HTMLDivElement | null>(null);

  // Record to search history once the pipeline reaches a terminal state
  // (done with a report, or errored). Running state is intentionally not
  // recorded — only a real outcome belongs in history.
  useEffect(() => {
    if (phase === "done" && report) {
      recordSearchHistory({
        companyName: report.companyName,
        symbol: report.symbol,
        decision: report.verdict.decision,
        timestamp: new Date().toISOString(),
      });
      setHistoryRefreshKey((key) => key + 1);
    } else if (phase === "error" && companyName) {
      recordSearchHistory({
        companyName,
        symbol: null,
        decision: null,
        timestamp: new Date().toISOString(),
      });
      setHistoryRefreshKey((key) => key + 1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only re-run on terminal phase changes
  }, [phase]);

  const isRunning = phase === "running";

  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-6 px-4 py-8 text-neutral-100 sm:px-6 sm:py-10 lg:px-8">
      <Hero onSearch={run} disabled={isRunning} />

      {phase !== "idle" && (
        <section className="flex flex-col gap-3 rounded-lg border border-neutral-800 bg-neutral-900/50 p-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-sm text-neutral-300">{companyName}</span>
            {dataSources.length > 0 && <DataCoverageBadge dataSources={dataSources} />}
          </div>
          <PipelineTimeline steps={steps} />
        </section>
      )}

      {phase === "error" && errorMessage && (
        <section
          role="alert"
          className="rounded-lg border border-red-800 bg-red-950/40 p-4 text-sm text-red-300"
        >
          {errorMessage}
        </section>
      )}

      {phase === "done" && report && (
        <div className="flex flex-col gap-6">
          <div className="flex justify-end">
            <ExportButton reportRef={reportRef} />
          </div>

          <div
            ref={reportRef}
            data-report-title={`${report.companyName}-${report.symbol}`}
            className="flex flex-col gap-6"
          >
            <VerdictBanner report={report} />

            <DataGaps errors={report.errors} />

            <MetricsGrid report={report} />

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.4fr_1fr]">
              <PriceChart report={report} />
              <ScoreRadar report={report} />
            </div>

            <BullBear bullCase={report.verdict.bullCase} bearCase={report.verdict.bearCase} />

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <NewsFeed report={report} />
              <RiskCards report={report} />
            </div>

            {report.verdict.reasoning && <Reasoning memo={report.verdict.reasoning} />}
          </div>
        </div>
      )}

      <SearchHistory onSelect={run} refreshKey={historyRefreshKey} />
    </main>
  );
}
