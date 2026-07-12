"use client";

import type { ResearchReport } from "@/agents/types";

interface RiskCardsProps {
  report: ResearchReport;
}

/**
 * risk-cards.tsx
 *
 * Renders report.risks (real risk factors from synthesize.ts, or the
 * "Synthesis unavailable" placeholder risk if that LLM call failed) plus
 * the deterministic risk score from report.verdict.scores.risk — never
 * hardcoded sample risks.
 */

const severityLabel: Record<string, string> = { h: "High", m: "Medium", l: "Low" };

const severityStyles: Record<string, string> = {
  h: "border-[#f85149]/40 bg-[#f85149]/10 text-[#f85149]",
  m: "border-amber-400/30 bg-amber-500/10 text-amber-300",
  l: "border-[#3fb950]/20 bg-[#3fb950]/10 text-[#3fb950]",
};

export function RiskCards({ report }: RiskCardsProps) {
  const { risks, riskAnalysis } = report;
  // verdict.scores.risk is 0-100 (high = low risk); display as an X/10
  // risk level for readability, inverted back so higher = riskier.
  const riskOutOf10 = Math.round((100 - report.verdict.scores.risk) / 10);

  return (
    <section className="rounded-[24px] border border-white/10 bg-[#0d1117]/80 p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-medium uppercase tracking-[0.3em] text-[#8b949e]">Risk profile</div>
          <div className="mt-1 text-lg font-semibold text-[#e6edf3]">{report.companyName}</div>
        </div>
        <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm font-medium text-[#8b949e]">
          {riskOutOf10}/10
        </div>
      </div>

      {risks.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-4 text-sm text-[#8b949e]">
          No specific risk factors were identified for this report.
        </div>
      ) : (
        <div className="space-y-3">
          {risks.map((item) => (
            <div key={item.name} className={`rounded-2xl border p-4 ${severityStyles[item.severity]}`}>
              <div className="flex items-center justify-between gap-3">
                <div className="font-medium text-[#e6edf3]">{item.name}</div>
                <span className="rounded-full border border-current/20 px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.25em]">
                  {severityLabel[item.severity]}
                </span>
              </div>
              <div className="mt-2 text-sm leading-6 text-[#8b949e]">{item.detail}</div>
            </div>
          ))}
        </div>
      )}

      {riskAnalysis && (
        <div className="mt-4 rounded-2xl border border-white/8 bg-[#161b22]/70 p-4 text-sm leading-7 text-[#8b949e]">
          {riskAnalysis}
        </div>
      )}
    </section>
  );
}
