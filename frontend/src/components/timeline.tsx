"use client";

import { CheckCircle2, Circle, Loader2, XCircle } from "lucide-react";

export interface TimelineItem {
  id: string;
  label: string;
  status: "pending" | "running" | "done";
  failed?: boolean;
}

interface TimelineProps {
  steps: TimelineItem[];
  title?: string;
}

export function Timeline({ steps, title = "Research pipeline" }: TimelineProps) {
  return (
    <section className="rounded-[24px] border border-white/10 bg-[#0d1117]/80 p-5">
      <div className="mb-4 text-sm font-medium uppercase tracking-[0.3em] text-[#8b949e]">{title}</div>
      <ol className="space-y-3">
        {steps.map((step) => (
          <li key={step.id} className="flex items-start gap-3 rounded-2xl border border-white/8 bg-white/5 px-4 py-3">
            <div className="mt-0.5">
              {step.failed ? (
                <XCircle className="h-4 w-4 text-[#f85149]" />
              ) : step.status === "running" ? (
                <Loader2 className="h-4 w-4 animate-spin text-amber-400" />
              ) : step.status === "done" ? (
                <CheckCircle2 className="h-4 w-4 text-[#3fb950]" />
              ) : (
                <Circle className="h-4 w-4 text-[#484f58]" />
              )}
            </div>
            <div>
              <div className="font-mono text-sm text-[#e6edf3]">{step.label}</div>
              <div className="text-sm text-[#8b949e]">
                {step.failed
                  ? "Encountered an issue"
                  : step.status === "done"
                    ? "Completed"
                    : step.status === "running"
                      ? "In progress"
                      : "Queued"}
              </div>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
