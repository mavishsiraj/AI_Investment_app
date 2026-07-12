import { CheckCircle2, Circle, Loader2, XCircle } from "lucide-react";
import { STEP_ORDER, type StepId, type StepState } from "@/lib/use-research-stream";

interface PipelineTimelineProps {
  steps: Record<StepId, StepState>;
}

/**
 * pipeline-timeline.tsx
 *
 * Deliberately only reacts to the server's explicit failed: true flag for
 * red/crashed styling. A pipeline that completes normally with decision
 * PASS still shows all-green checkmarks here — PASS is a legitimate
 * outcome of the scoring engine, not a failure, and the verdict banner
 * (not this timeline) is the right place to communicate "PASS, low
 * confidence" to the user without borrowing error styling for it.
 */
export function PipelineTimeline({ steps }: PipelineTimelineProps) {
  return (
    <ol className="flex flex-col gap-2">
      {STEP_ORDER.map((stepId) => {
        const step = steps[stepId];
        return (
          <li key={stepId} className="flex items-center gap-3 text-sm">
            <StepIcon status={step.status} failed={step.failed} />
            <span
              className={
                step.failed
                  ? "text-red-400"
                  : step.status === "done"
                    ? "text-neutral-200"
                    : step.status === "running"
                      ? "text-amber-300"
                      : "text-neutral-600"
              }
            >
              {step.label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function StepIcon({ status, failed }: { status: StepState["status"]; failed: boolean }) {
  if (failed) return <XCircle className="h-4 w-4 shrink-0 text-red-500" aria-hidden="true" />;
  if (status === "running") {
    return <Loader2 className="h-4 w-4 shrink-0 animate-spin text-amber-500" aria-hidden="true" />;
  }
  if (status === "done") return <CheckCircle2 className="h-4 w-4 shrink-0 text-green-500" aria-hidden="true" />;
  return <Circle className="h-4 w-4 shrink-0 text-neutral-700" aria-hidden="true" />;
}
