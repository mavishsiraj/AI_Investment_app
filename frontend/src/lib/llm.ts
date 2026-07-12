import { ChatOpenAI } from "@langchain/openai";
import type { z } from "zod";
import type { BaseMessageLike } from "@langchain/core/messages";

/**
 * llm.ts
 *
 * Two model instances, both configured for guaranteed-typed output via
 * withStructuredOutput(). Everything downstream (synthesis + narration
 * nodes) should go through structuredCall() rather than instantiating a
 * ChatOpenAI client directly, so retry/backoff/cancellation behavior stays
 * consistent.
 *
 * Change from previous version: structuredCall() now accepts an optional
 * AbortSignal, added so the /api/research route's 2-minute timeout and
 * client-disconnect handling can actually cancel an in-flight OpenAI call
 * rather than just stop listening to it.
 */

function requireApiKey(): string {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error("GROQ_API_KEY is not set. Add it to .env.local (see .env.example).");
  }
  return apiKey;
}

let fastModelInstance: ChatOpenAI | null = null;
let smartModelInstance: ChatOpenAI | null = null;

function getModelInstance(choice: ModelChoice): ChatOpenAI {
  const modelName = process.env.GROQ_MODEL || "llama-3.1-8b-instant";
  const temperature = choice === "fast" ? 0.1 : 0.3;

  if (choice === "fast") {
    if (!fastModelInstance) {
      fastModelInstance = new ChatOpenAI({
        model: modelName,
        temperature,
        apiKey: requireApiKey(),
        configuration: {
          baseURL: "https://api.groq.com/openai/v1",
        },
      });
    }
    return fastModelInstance;
  }

  if (!smartModelInstance) {
    smartModelInstance = new ChatOpenAI({
      model: modelName,
      temperature,
      apiKey: requireApiKey(),
      configuration: {
        baseURL: "https://api.groq.com/openai/v1",
      },
    });
  }
  return smartModelInstance;
}

export type ModelChoice = "fast" | "smart";

function resolveModel(choice: ModelChoice): ChatOpenAI {
  return getModelInstance(choice);
}

export interface StructuredCallOptions {
  /** Which model instance to use. Defaults to "fast". */
  model?: ModelChoice;
  /** Max retry attempts on retryable errors. Defaults to 2 (3 total attempts). */
  retries?: number;
  /** Base backoff in ms. Actual wait is base * 2^attempt. Defaults to 500. */
  baseDelayMs?: number;
  /** Optional label used only in thrown error messages, for easier debugging. */
  label?: string;
  /** Optional cancellation signal, forwarded to the underlying model call. */
  signal?: AbortSignal;
}

const RETRYABLE_STATUS_CODES = new Set([429, 500, 502, 503]);

/**
 * Extracts an HTTP status code from the various shapes OpenAI-client errors
 * can take (the SDK wraps fetch errors inconsistently across versions).
 */
function getStatusCode(error: unknown): number | undefined {
  if (typeof error !== "object" || error === null) return undefined;
  const err = error as Record<string, unknown>;
  if (typeof err.status === "number") return err.status;
  if (typeof err.statusCode === "number") return err.statusCode;
  const response = err.response as Record<string, unknown> | undefined;
  if (response && typeof response.status === "number") return response.status;
  return undefined;
}

function isAbortError(error: unknown): boolean {
  return (
    error instanceof Error &&
    (error.name === "AbortError" || /aborted/i.test(error.message))
  );
}

function isRetryable(error: unknown): boolean {
  if (isAbortError(error)) return false; // cancellation should never be retried
  const status = getStatusCode(error);
  return status !== undefined && RETRYABLE_STATUS_CODES.has(status);
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new Error("Aborted during backoff wait."));
      return;
    }
    const timeoutId = setTimeout(resolve, ms);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(timeoutId);
        reject(new Error("Aborted during backoff wait."));
      },
      { once: true }
    );
  });
}

/**
 * Calls a chat model with a Zod-validated structured output, retrying on
 * transient errors (429/500/502/503) with exponential backoff. Honors an
 * optional AbortSignal for cancellation (timeouts, client disconnects) —
 * an already-aborted signal fails fast without making a network call.
 *
 * @param schema        Zod schema the model output must conform to.
 * @param systemPrompt  System message content.
 * @param userPrompt    User message content (already interpolated with data).
 * @param options       Model choice, retry count, backoff base, debug label, signal.
 */
export async function structuredCall<T extends z.ZodTypeAny>(
  schema: T,
  systemPrompt: string,
  userPrompt: string,
  options: StructuredCallOptions = {}
): Promise<z.infer<T>> {
  const { model = "fast", retries = 2, baseDelayMs = 500, label, signal } = options;

  if (signal?.aborted) {
    throw new Error(`structuredCall${label ? ` [${label}]` : ""} aborted before starting.`);
  }

  const baseModel = resolveModel(model);
  const structuredModel = baseModel.withStructuredOutput(schema, {
    name: label ?? "structured_output",
  });

  const messages: BaseMessageLike[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ];

  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const result = await structuredModel.invoke(messages, { signal });
      return schema.parse(result);
    } catch (error) {
      lastError = error;

      const attemptsRemaining = retries - attempt;
      if (attemptsRemaining <= 0 || !isRetryable(error)) {
        break;
      }

      const delay = baseDelayMs * 2 ** attempt;
      await sleep(delay, signal);
    }
  }

  const context = label ? ` [${label}]` : "";
  const message =
    lastError instanceof Error ? lastError.message : String(lastError);
  throw new Error(`structuredCall${context} failed after retries: ${message}`);
}
