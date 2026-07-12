"use client";

import { ArrowUpRight, BadgeDollarSign, Compass, TrendingUp } from "lucide-react";
import type { ResearchReport } from "@/agents/types";

interface VerdictBannerProps {
  report: ResearchReport;
}

export function VerdictBanner({ report }: VerdictBannerProps) {
  const decision = report.verdict.decision;
  const confidence = Math.max(0, Math.min(100, report.verdict.confidence));
  const isInvest = decision === "INVEST";
  const accent = isInvest ? "#3fb950" : "#f85149";
  const badgeText = isInvest ? "Bullish signal" : "Risk-adjusted pass";

  return (
    <section className="overflow-hidden rounded-[32px] border border-white/10 bg-[#0d1117]/90 p-6 shadow-[0_20px_80px_rgba(0,0,0,0.3)] sm:p-8">
      <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-2xl space-y-5">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.35em] text-[#8b949e]">
            <Compass className="h-3.5 w-3.5" />
            {badgeText}
          </div>

          <div className="space-y-3">
            <div className="text-sm font-mono uppercase tracking-[0.3em] text-[#8b949e]">
              {report.companyName} · {report.symbol}
            </div>
            <div className="text-5xl font-semibold tracking-[0.24em] text-[#e6edf3] sm:text-6xl">
              <span
                className="inline-block rounded-full border px-5 py-3 shadow-[0_0_40px_rgba(255,255,255,0.08)]"
                style={{ borderColor: `${accent}44`, boxShadow: `0 0 0 1px ${accent}33, 0 0 40px ${accent}22` }}
              >
                {decision}
              </span>
            </div>
            <p className="max-w-xl text-base leading-7 text-[#8b949e]">
              {report.verdict.reasoning || "The synthesis is available and the memo is being assembled."}
            </p>
          </div>
        </div>

        <div className="w-full max-w-md rounded-[24px] border border-white/10 bg-[#161b22]/90 p-5">
          <div className="mb-4 flex items-center justify-between text-sm text-[#8b949e]">
            <span className="font-mono uppercase tracking-[0.25em]">Confidence</span>
            <span className="font-semibold text-[#e6edf3]">{confidence}/100</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${confidence}%`, background: `linear-gradient(90deg, ${accent}, ${accent}CC)` }}
            />
          </div>

          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-3">
            <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm text-[#e6edf3]">
              <BadgeDollarSign className="h-4 w-4 text-[#58a6ff]" />
              Entry {report.verdict.entryPrice ? `$${report.verdict.entryPrice.toFixed(2)}` : "N/A"}
            </div>
            <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm text-[#e6edf3]">
              <TrendingUp className="h-4 w-4 text-[#3fb950]" />
              Target {report.verdict.targetPrice ? `$${report.verdict.targetPrice.toFixed(2)}` : "N/A"}
            </div>
            <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm text-[#e6edf3]">
              <ArrowUpRight className="h-4 w-4 text-[#f85149]" />
              Stop {report.verdict.stopLoss ? `$${report.verdict.stopLoss.toFixed(2)}` : "N/A"}
            </div>
            <div className="rounded-full border border-amber-400/20 bg-amber-500/10 px-3 py-2 text-sm font-medium uppercase tracking-[0.25em] text-amber-300">
              {report.verdict.horizon ?? "medium-term"}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
