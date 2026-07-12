"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Check, Loader2, X } from "lucide-react";
import { STEP_ORDER, type StepId, type StepState } from "@/lib/use-research-stream";
import { cn } from "@/lib/utils";

interface PipelineTimelineProps {
  steps: Record<StepId, StepState>;
}

/**
 * pipeline-timeline.tsx
 *
 * Deliberately only reacts to the server's explicit failed: true flag for
 * red/crashed styling. A pipeline that completes normally with decision
 * PASS still shows all-green checkmarks — PASS is a legitimate scoring
 * outcome, not a failure.
 */
export function PipelineTimeline({ steps }: PipelineTimelineProps) {
  return (
    <ol className="flex flex-col gap-1">
      {STEP_ORDER.map((stepId, index) => {
        const step = steps[stepId];
        const isLast = index === STEP_ORDER.length - 1;
        return (
          <li key={stepId} className="relative flex gap-3">
            <div className="flex flex-col items-center">
              <StepIcon status={step.status} failed={step.failed} />
              {!isLast && (
                <div
                  className={cn(
                    "my-1 w-px flex-1 transition-colors duration-300",
                    step.status === "done" ? "bg-accent/40" : "bg-border"
                  )}
                />
              )}
            </div>
            <div className="pb-4">
              <span
                className={cn(
                  "text-sm transition-colors duration-200",
                  step.failed
                    ? "text-negative"
                    : step.status === "done"
                    ? "text-foreground"
                    : step.status === "running"
                    ? "text-accent"
                    : "text-foreground-faint"
                )}
              >
                {step.label}
              </span>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function StepIcon({ status, failed }: { status: StepState["status"]; failed: boolean }) {
  return (
    <span
      className={cn(
        "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors duration-200",
        failed
          ? "border-negative bg-negative-muted"
          : status === "done"
          ? "border-accent bg-accent"
          : status === "running"
          ? "border-accent/60 bg-accent-muted"
          : "border-border bg-transparent"
      )}
    >
      <AnimatePresence mode="wait" initial={false}>
        {failed ? (
          <motion.span key="failed" initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
            <X className="h-3 w-3 text-negative" aria-hidden="true" />
          </motion.span>
        ) : status === "done" ? (
          <motion.span key="done" initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
            <Check className="h-3 w-3 text-white" aria-hidden="true" />
          </motion.span>
        ) : status === "running" ? (
          <Loader2 className="h-3 w-3 animate-spin text-accent" aria-hidden="true" />
        ) : null}
      </AnimatePresence>
      <span className="sr-only">{failed ? "Failed" : status}</span>
    </span>
  );
}
