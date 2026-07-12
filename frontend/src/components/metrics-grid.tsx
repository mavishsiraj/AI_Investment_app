"use client";

import { Activity, Building2, DollarSign, Landmark, LineChart, Percent, ShieldCheck, TrendingUp } from "lucide-react";
import type { ResearchReport } from "@/agents/types";
import { Card, CardLabel } from "@/components/ui/card";
import { StatusIndicator, type StatusLevel } from "@/components/ui/status-indicator";

interface MetricsGridProps {
  report: ResearchReport;
}

/** Thresholds unchanged from the original implementation — only the visual treatment changed. */
function getStatusLevel(metric: string, value: string | number): StatusLevel {
  const numericValue = Number(String(value).replace(/[^0-9.-]/g, ""));

  if (metric === "peRatio") {
    if (Number.isNaN(numericValue)) return "warning";
    if (numericValue < 25) return "positive";
    if (numericValue < 40) return "warning";
    return "negative";
  }

  if (metric === "returnOnEquity") {
    if (Number.isNaN(numericValue)) return "warning";
    if (numericValue > 15) return "positive";
    if (numericValue > 8) return "warning";
    return "negative";
  }

  if (metric === "debtToEquity") {
    if (Number.isNaN(numericValue)) return "warning";
    if (numericValue < 0.5) return "positive";
    if (numericValue < 1) return "warning";
    return "negative";
  }

  return "neutral";
}

const metrics = [
  { label: "Sector", value: "sector", icon: Building2 },
  { label: "Market Cap", value: "marketCap", icon: Landmark },
  { label: "Revenue", value: "revenueGrowth", icon: TrendingUp },
  { label: "Growth", value: "earningsGrowth", icon: LineChart },
  { label: "P/E", value: "peRatio", icon: DollarSign },
  { label: "ROE", value: "returnOnEquity", icon: ShieldCheck },
  { label: "D/E", value: "debtToEquity", icon: Activity },
  { label: "Margin", value: "profitMargin", icon: Percent },
] as const;

export function MetricsGrid({ report }: MetricsGridProps) {
  const financials = report.financials;
  const profile = report.profile;

  const metricValues = {
    sector: profile.sector ?? "N/A",
    marketCap: financials.marketCap,
    revenueGrowth: financials.revenueGrowth,
    earningsGrowth: financials.earningsGrowth,
    peRatio: financials.peRatio,
    returnOnEquity: financials.returnOnEquity,
    debtToEquity: financials.debtToEquity,
    profitMargin: financials.profitMargin,
  };

  return (
    <Card>
      <CardLabel>Metrics</CardLabel>
      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {metrics.map((metric) => {
          const value = metricValues[metric.value as keyof typeof metricValues];
          const Icon = metric.icon;
          const isQualitative = metric.value === "sector";
          const level = getStatusLevel(metric.value, value);

          return (
            <div
              key={metric.label}
              className="flex h-full flex-col justify-between gap-3 rounded-md border border-border bg-white/[0.02] p-3"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-xs text-foreground-muted">
                  <Icon className="h-3.5 w-3.5 text-foreground-faint" aria-hidden="true" />
                  {metric.label}
                </div>
                {!isQualitative && <StatusIndicator level={level} />}
              </div>
              <div className="font-mono text-sm tabular-nums text-foreground">{value}</div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
