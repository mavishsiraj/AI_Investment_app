/**
 * stream-types.ts
 *
 * The NDJSON chunk shape streamed by POST /api/research. Lives here (not
 * duplicated in route.ts and the client hook) so both sides of the wire
 * stay in sync — per project rule #4, this interface exists in exactly
 * one location.
 */
export interface StreamChunk {
  step: "fetchData" | "synthesize" | "score" | "narrate" | "complete" | "error";
  status: "running" | "done";
  label: string;
  data?: unknown;
  failed?: boolean;
}
