import { StateGraph, START, END } from "@langchain/langgraph";
import { ResearchStateAnnotation } from "./state.ts";
import { fetchDataNode } from "./nodes/fetchData.ts";
import { synthesizeNode } from "./nodes/synthesize.ts";
import { scoreNode } from "./nodes/score.ts";
import { narrateNode } from "./nodes/narrate.ts";

/**
 * graph.ts
 *
 * START → fetchData → synthesize → score → narrate → END, exactly as
 * specified — no conditional branching. One consequence worth flagging:
 * if fetchData sets step="error" (ticker resolution failure), the graph
 * still runs synthesize/score/narrate on empty/null data rather than
 * short-circuiting to END. That's a straightforward addConditionalEdges
 * change after fetchData if you want a hard stop on resolution failure —
 * not added here since it wasn't in the requested wiring.
 */
const graph = new StateGraph(ResearchStateAnnotation)
  .addNode("fetchData", fetchDataNode)
  .addNode("synthesize", synthesizeNode)
  .addNode("score", scoreNode)
  .addNode("narrate", narrateNode)
  .addEdge(START, "fetchData")
  .addEdge("fetchData", "synthesize")
  .addEdge("synthesize", "score")
  .addEdge("score", "narrate")
  .addEdge("narrate", END);

export const researchGraph = graph.compile();
