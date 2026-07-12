"use client";

import type { ResearchReport } from "@/agents/types";
import { Card, CardLabel, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface RiskCardsProps {
  report: ResearchReport;
}

const severityLabel: Record<string, string> = { h: "High", m: "Medium", l: "Low" };

const severityClass: Record<string, string> = {
  h: "border-negative/25 bg-negative-muted",
  m: "border-warning/25 bg-warning-muted",
  l: "border-positive/20 bg-positive-muted",
};

const severityTextClass: Record<string, string> = {
  h: "text-negative",
  m: "text-warning",
  l: "text-positive",
};

/**
 * risk-cards.tsx
 *
 * Renders report.risks (real risk factors from the synthesis step, or the
 * "Synthesis unavailable" placeholder risk if that call failed) plus the
 * deterministic risk score — never hardcoded sample risks. Severity maps
 * consistently to the same positive/warning/negative tokens used
 * everywhere else in the app, instead of its own one-off palette.
 */
export function RiskCards({ report }: RiskCardsProps) {
  const { risks, riskAnalysis } = report;
  // verdict.scores.risk is 0-100 (high = low risk); display as an X/10
  // risk level for readability, inverted so higher = riskier.
  const riskOutOf10 = Math.round((100 - report.verdict.scores.risk) / 10);

  return (
    <Card>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <CardLabel>Risk profile</CardLabel>
          <CardTitle>{report.companyName}</CardTitle>
        </div>
        <Badge variant="neutral" className="font-mono tabular-nums">
          {riskOutOf10}/10
        </Badge>
      </div>

      {risks.length === 0 ? (
        <div className="rounded-md border border-dashed border-border p-4 text-sm text-foreground-muted">
          No specific risk factors were identified for this report.
        </div>
      ) : (
        <div className="space-y-3">
          {risks.map((item) => (
            <div key={item.name} className={cn("rounded-md border p-4", severityClass[item.severity])}>
              <div className="flex items-center justify-between gap-3">
                <div className="font-medium text-foreground">{item.name}</div>
                <span
                  className={cn(
                    "rounded-full border border-current/25 px-2.5 py-0.5 text-xs font-medium uppercase tracking-label",
                    severityTextClass[item.severity]
                  )}
                >
                  {severityLabel[item.severity]}
                </span>
              </div>
              <div className="mt-2 text-sm leading-6 text-foreground-muted">{item.detail}</div>
            </div>
          ))}
        </div>
      )}

      {riskAnalysis && (
        <p className="mt-4 rounded-md border border-border bg-surface-elevated p-4 text-sm leading-7 text-foreground-muted">
          {riskAnalysis}
        </p>
      )}
    </Card>
  );
}
