"use client";

import { useCallback, useRef, useState } from "react";
import type { ResearchReport } from "@/agents/types";
import type { StreamChunk } from "@/lib/stream-types";

/**
 * use-research-stream.ts
 *
 * Owns the client side of the NDJSON contract from POST /api/research:
 * running/done per step, a final "complete" chunk with the full report, or
 * an "error" chunk (ticker not found, pipeline failure, or a chunk with
 * failed: true mid-stream). Malformed lines are skipped rather than
 * crashing the whole stream — a single corrupted chunk shouldn't lose
 * everything already received.
 */

export type StepId = "fetchData" | "synthesize" | "score" | "narrate";

export interface StepState {
  status: "pending" | "running" | "done";
  label: string;
  /** True only when the server sent failed: true for this step — never true for a normal PASS decision. */
  failed: boolean;
}

export type ResearchPhase = "idle" | "running" | "done" | "error";

export interface ResearchStreamState {
  phase: ResearchPhase;
  companyName: string;
  steps: Record<StepId, StepState>;
  dataSources: string[];
  report: ResearchReport | null;
  errorMessage: string | null;
}

export const STEP_ORDER: StepId[] = ["fetchData", "synthesize", "score", "narrate"];

const STEP_LABELS: Record<StepId, string> = {
  fetchData: "Fetching live market data",
  synthesize: "AI analyzing research",
  score: "Computing deterministic score",
  narrate: "Drafting investment memo",
};

function freshSteps(): Record<StepId, StepState> {
  return {
    fetchData: { status: "pending", label: STEP_LABELS.fetchData, failed: false },
    synthesize: { status: "pending", label: STEP_LABELS.synthesize, failed: false },
    score: { status: "pending", label: STEP_LABELS.score, failed: false },
    narrate: { status: "pending", label: STEP_LABELS.narrate, failed: false },
  };
}

function freshState(): ResearchStreamState {
  return {
    phase: "idle",
    companyName: "",
    steps: freshSteps(),
    dataSources: [],
    report: null,
    errorMessage: null,
  };
}

function isStepId(step: StreamChunk["step"]): step is StepId {
  return (STEP_ORDER as string[]).includes(step);
}

function applyChunk(
  chunk: StreamChunk,
  setState: React.Dispatch<React.SetStateAction<ResearchStreamState>>
): void {
  setState((prev) => {
    if (chunk.step === "error") {
      const data = chunk.data as { error?: string; errors?: string[] } | undefined;
      const message = data?.error ?? data?.errors?.[0] ?? chunk.label;
      return { ...prev, phase: "error", errorMessage: message };
    }

    if (chunk.step === "complete") {
      return { ...prev, phase: "done", report: chunk.data as ResearchReport };
    }

    if (!isStepId(chunk.step)) return prev;

    const nextSteps: Record<StepId, StepState> = {
      ...prev.steps,
      [chunk.step]: {
        status: chunk.status === "running" ? "running" : "done",
        label: chunk.label,
        failed: Boolean(chunk.failed),
      },
    };

    let dataSources = prev.dataSources;
    if (chunk.step === "fetchData" && chunk.status === "done") {
      const data = chunk.data as { dataSources?: string[] } | undefined;
      if (data?.dataSources) dataSources = data.dataSources;
    }

    return { ...prev, steps: nextSteps, dataSources };
  });
}

export function useResearchStream() {
  const [state, setState] = useState<ResearchStreamState>(freshState);
  const abortRef = useRef<AbortController | null>(null);

  const run = useCallback(async (companyName: string) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setState({ ...freshState(), phase: "running", companyName });

    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL?.replace(/\/+$/u, "") ?? "";
      const requestUrl = backendUrl ? `${backendUrl}/api/research` : "/api/research";
      const response = await fetch(requestUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyName }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const body: unknown = await response.json().catch(() => null);
        const message =
          body && typeof body === "object" && "error" in body
            ? String((body as { error: unknown }).error)
            : `Request failed with status ${response.status}.`;
        throw new Error(message);
      }
      if (!response.body) {
        throw new Error("No response stream received.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let newlineIndex = buffer.indexOf("\n");
        while (newlineIndex >= 0) {
          const line = buffer.slice(0, newlineIndex).trim();
          buffer = buffer.slice(newlineIndex + 1);
          newlineIndex = buffer.indexOf("\n");

          if (!line) continue;
          try {
            applyChunk(JSON.parse(line) as StreamChunk, setState);
          } catch {
            // Malformed NDJSON line — skip it rather than aborting the
            // whole stream over one bad chunk.
          }
        }
      }
    } catch (error) {
      if (controller.signal.aborted) return; // intentional cancellation, not a failure
      const message = error instanceof Error ? error.message : "Research request failed.";
      setState((prev) => ({ ...prev, phase: "error", errorMessage: message }));
    }
  }, []);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  return { ...state, run, cancel };
}
