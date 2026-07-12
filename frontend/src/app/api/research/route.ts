import { NextRequest } from "next/server";
import { z } from "zod";
import type { RunnableConfig } from "@langchain/core/runnables";
import { createInitialResearchState } from "@/agents/state";
import type { ResearchState } from "@/agents/state";
import { fetchDataNode } from "@/agents/nodes/fetchData";
import { synthesizeNode } from "@/agents/nodes/synthesize";
import { scoreNode } from "@/agents/nodes/score";
import { narrateNode } from "@/agents/nodes/narrate";
import type { ResearchReport } from "@/agents/types";
import type { StreamChunk } from "@/lib/stream-types";

/**
 * route.ts — POST /api/research
 *
 * Streams NDJSON progress chunks while running the 4-node pipeline. This
 * intentionally calls fetchDataNode / synthesizeNode / scoreNode /
 * narrateNode directly rather than researchGraph.stream(): the compiled
 * graph only yields AFTER a node finishes, so it can't cleanly express
 * "running" the moment a step starts (which this endpoint's contract
 * requires) without additional event-stream plumbing. The node functions
 * are the single source of truth for pipeline logic either way — this
 * route just controls when each one's "running"/"done" chunk is emitted.
 */

export const runtime = "nodejs";
export const maxDuration = 120;

const PIPELINE_TIMEOUT_MS = 120_000;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 5;

const requestBodySchema = z.object({
  companyName: z
    .string()
    .trim()
    .min(1, "companyName is required.")
    .max(100, "companyName must be 100 characters or fewer."),
});

/**
 * In-memory rate-limit store: IP -> recent request timestamps.
 *
 * Known limitation: this resets on server restart and is NOT shared across
 * multiple instances/processes, so it only enforces the limit correctly on
 * a single-node deployment. Behind a load balancer or on serverless with
 * multiple cold-started instances, swap this for Redis/Upstash or similar.
 * Stale IP keys with empty arrays are not swept, which is an acceptable
 * bounded leak for a single long-running Node process but worth revisiting
 * before high-traffic production use.
 */
const requestLog = new Map<string, number[]>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (requestLog.get(ip) ?? []).filter(
    (timestamp) => now - timestamp < RATE_LIMIT_WINDOW_MS
  );
  recent.push(now);
  requestLog.set(ip, recent);
  return recent.length > RATE_LIMIT_MAX_REQUESTS;
}

function getClientIp(request: NextRequest): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return (forwardedFor.split(",")[0] ?? forwardedFor).trim();
  }
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp;
  return "unknown";
}

function jsonError(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export async function POST(request: NextRequest): Promise<Response> {
  const ip = getClientIp(request);
  if (isRateLimited(ip)) {
    return jsonError(
      `Rate limit exceeded: max ${RATE_LIMIT_MAX_REQUESTS} requests per ${
        RATE_LIMIT_WINDOW_MS / 60_000
      } minutes.`,
      429
    );
  }

  let companyName: string;
  try {
    const body: unknown = await request.json();
    companyName = requestBodySchema.parse(body).companyName;
  } catch (error) {
    const message =
      error instanceof z.ZodError
        ? error.errors.map((issue) => issue.message).join("; ")
        : "Request body must be JSON: { companyName: string }.";
    return jsonError(message, 400);
  }

  const encoder = new TextEncoder();
  const abortController = new AbortController();
  const timeoutId = setTimeout(() => {
    abortController.abort(new Error(`Pipeline timed out after ${PIPELINE_TIMEOUT_MS / 1000}s.`));
  }, PIPELINE_TIMEOUT_MS);

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (chunk: StreamChunk): void => {
        try {
          controller.enqueue(encoder.encode(`${JSON.stringify(chunk)}\n`));
        } catch {
          // Controller already closed (client disconnected) — drop silently.
        }
      };

      const runnableConfig: RunnableConfig = { signal: abortController.signal };
      let state: ResearchState = createInitialResearchState(companyName);

      try {
        // -- fetchData --------------------------------------------------
        send({ step: "fetchData", status: "running", label: "Fetching live market data" });
        const fetchUpdate = await fetchDataNode(state, runnableConfig);
        state = { ...state, ...fetchUpdate };

        if (state.step === "error") {
          send({
            step: "fetchData",
            status: "done",
            failed: true,
            label: "Fetching live market data",
            data: { errors: state.errors },
          });
          send({
            step: "error",
            status: "done",
            failed: true,
            label: "Pipeline stopped: could not resolve company to a ticker.",
            data: { errors: state.errors },
          });
          return;
        }

        send({
          step: "fetchData",
          status: "done",
          label: "Fetching live market data",
          data: {
            profile: state.profile,
            financials: state.financials,
            technicals: state.technicals,
            dataSources: state.dataSources,
            errors: state.errors,
          },
        });

        // -- synthesize ---------------------------------------------------
        send({ step: "synthesize", status: "running", label: "AI analyzing research" });
        const synthesizeUpdate = await synthesizeNode(state, runnableConfig);
        state = { ...state, ...synthesizeUpdate };
        send({
          step: "synthesize",
          status: "done",
          label: "AI analyzing research",
          data: {
            sentiment: state.sentiment,
            competitors: state.competitors,
            risks: state.risks,
            riskAnalysis: state.riskAnalysis,
          },
        });

        // -- score ----------------------------------------------------------
        send({ step: "score", status: "running", label: "Computing deterministic score" });
        const scoreUpdate = scoreNode(state);
        state = { ...state, ...scoreUpdate };
        send({
          step: "score",
          status: "done",
          label: "Computing deterministic score",
          data: { verdict: state.verdict },
        });

        // -- narrate ------------------------------------------------------
        send({ step: "narrate", status: "running", label: "Drafting investment memo" });
        const narrateUpdate = await narrateNode(state, runnableConfig);
        state = { ...state, ...narrateUpdate };
        send({
          step: "narrate",
          status: "done",
          label: "Drafting investment memo",
          data: { verdict: state.verdict },
        });

        // -- complete -------------------------------------------------------
        if (!state.profile || !state.financials || !state.technicals || !state.verdict) {
          send({
            step: "error",
            status: "done",
            failed: true,
            label: "Pipeline finished without enough data to build a report.",
            data: { errors: state.errors },
          });
          return;
        }

        const report: ResearchReport = {
          companyName: state.companyName,
          symbol: state.profile.symbol,
          profile: state.profile,
          financials: state.financials,
          technicals: state.technicals,
          candles: state.candles,
          rawNews: state.rawNews,
          sentiment: state.sentiment,
          competitors: state.competitors,
          risks: state.risks,
          riskAnalysis: state.riskAnalysis,
          verdict: state.verdict,
          dataSources: state.dataSources,
          errors: state.errors,
          generatedAt: new Date().toISOString(),
        };

        send({ step: "complete", status: "done", label: "Research complete", data: report });
      } catch (error) {
        send({
          step: "error",
          status: "done",
          failed: true,
          label: abortController.signal.aborted
            ? "Pipeline timed out or was cancelled."
            : "Pipeline failed unexpectedly.",
          data: { error: describeError(error), partial: state },
        });
      } finally {
        clearTimeout(timeoutId);
        try {
          controller.close();
        } catch {
          // Already closed — nothing to do.
        }
      }
    },

    cancel() {
      // Client disconnected (e.g. closed the tab or navigated away).
      // Stop any further work and let in-flight signal checks short-circuit.
      clearTimeout(timeoutId);
      abortController.abort(new Error("Client disconnected."));
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
