"use client";

import { Activity, Building2, DollarSign, Landmark, LineChart, Percent, ShieldCheck, TrendingUp } from "lucide-react";
import type { ResearchReport } from "@/agents/types";

interface MetricsGridProps {
  report: ResearchReport;
}

function getDotClass(metric: string, value: string | number) {
  const numericValue = Number(String(value).replace(/[^0-9.-]/g, ""));

  if (metric === "peRatio") {
    if (Number.isNaN(numericValue)) return "bg-amber-400";
    if (numericValue < 25) return "bg-[#3fb950]";
    if (numericValue < 40) return "bg-amber-400";
    return "bg-[#f85149]";
  }

  if (metric === "returnOnEquity") {
    if (Number.isNaN(numericValue)) return "bg-amber-400";
    if (numericValue > 15) return "bg-[#3fb950]";
    if (numericValue > 8) return "bg-amber-400";
    return "bg-[#f85149]";
  }

  if (metric === "debtToEquity") {
    if (Number.isNaN(numericValue)) return "bg-amber-400";
    if (numericValue < 0.5) return "bg-[#3fb950]";
    if (numericValue < 1) return "bg-amber-400";
    return "bg-[#f85149]";
  }

  return "bg-amber-400";
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
];

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
    <section className="rounded-[24px] border border-white/10 bg-[#0d1117]/80 p-5">
      <div className="mb-4 text-sm font-medium uppercase tracking-[0.3em] text-[#8b949e]">Metrics</div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {metrics.map((metric) => {
          const value = metricValues[metric.value as keyof typeof metricValues];
          const Icon = metric.icon;
          const dotClass = getDotClass(metric.value, value);

          return (
            <div key={metric.label} className="rounded-2xl border border-white/8 bg-white/5 p-3">
              <div className="mb-3 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-sm text-[#8b949e]">
                  <Icon className="h-4 w-4 text-[#58a6ff]" />
                  {metric.label}
                </div>
                <span className={`h-2.5 w-2.5 rounded-full ${dotClass}`} />
              </div>
              <div className="font-mono text-sm text-[#e6edf3]">{value}</div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
