"use client";

import { motion } from "framer-motion";
import { Compass, LogIn, ShieldAlert, Target } from "lucide-react";
import type { ResearchReport } from "@/agents/types";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface VerdictBannerProps {
  report: ResearchReport;
}

/** report.verdict.decision is exactly "INVEST" | "PASS". */
export function VerdictBanner({ report }: VerdictBannerProps) {
  const decision = report.verdict.decision;
  const confidence = Math.max(0, Math.min(100, report.verdict.confidence));
  const isInvest = decision === "INVEST";

  return (
    <Card elevated className="overflow-hidden">
      <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-2xl space-y-4">
          <Badge variant={isInvest ? "positive" : "neutral"}>
            <Compass className="h-3.5 w-3.5" aria-hidden="true" />
            {isInvest ? "Bullish signal" : "Risk-adjusted pass"}
          </Badge>

          <div className="space-y-3">
            <div className="font-mono text-sm uppercase tracking-label text-foreground-muted">
              {report.companyName} · {report.symbol}
            </div>

            <div
              className={cn(
                "inline-flex items-baseline gap-3 rounded-md border px-5 py-3",
                isInvest ? "border-positive/30 bg-positive-muted" : "border-negative/30 bg-negative-muted"
              )}
            >
              <span
                className={cn(
                  "text-4xl font-semibold tracking-tight sm:text-5xl",
                  isInvest ? "text-positive" : "text-negative"
                )}
              >
                {decision}
              </span>
            </div>

            <p className="max-w-xl text-base leading-7 text-foreground-muted">
              {report.verdict.reasoning || "The synthesis is available and the memo is being assembled."}
            </p>
          </div>
        </div>

        <Card className="w-full max-w-md p-5" elevated>
          <div className="mb-3 flex items-center justify-between text-sm">
            <span className="font-mono uppercase tracking-label text-foreground-muted">Confidence</span>
            <span className="font-mono font-semibold tabular-nums text-foreground">{confidence}/100</span>
          </div>

          <div className="h-2 overflow-hidden rounded-full bg-white/[0.06]">
            <motion.div
              className={cn("h-full rounded-full", isInvest ? "bg-positive" : "bg-negative")}
              initial={{ width: 0 }}
              animate={{ width: `${confidence}%` }}
              transition={{ duration: 0.6, ease: "easeOut", delay: 0.1 }}
            />
          </div>

          <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
            <PriceStat icon={LogIn} label="Entry" value={report.verdict.entryPrice} tone="neutral" />
            <PriceStat icon={Target} label="Target" value={report.verdict.targetPrice} tone="positive" />
            <PriceStat icon={ShieldAlert} label="Stop" value={report.verdict.stopLoss} tone="negative" />
          </div>

          <div className="mt-3">
            <Badge variant="accent" className="capitalize">
              {report.verdict.horizon ?? "medium-term"}
            </Badge>
          </div>
        </Card>
      </div>
    </Card>
  );
}

function PriceStat({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof Target;
  label: string;
  value: number | null;
  tone: "neutral" | "positive" | "negative";
}) {
  const toneClass = tone === "positive" ? "text-positive" : tone === "negative" ? "text-negative" : "text-accent";
  return (
    <div className="flex items-center gap-2 rounded-md border border-border bg-white/[0.02] px-3 py-2">
      <Icon className={cn("h-4 w-4 shrink-0", toneClass)} aria-hidden="true" />
      <div className="leading-tight">
        <div className="text-xs text-foreground-faint">{label}</div>
        <div className="font-mono text-sm tabular-nums text-foreground">
          {value !== null ? `$${value.toFixed(2)}` : "N/A"}
        </div>
      </div>
    </div>
  );
}
