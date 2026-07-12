import { createInitialResearchState } from './src/agents/state.ts';
import { fetchDataNode } from './src/agents/nodes/fetchData.ts';
import { synthesizeNode } from './src/agents/nodes/synthesize.ts';
import { scoreNode } from './src/agents/nodes/score.ts';
import { narrateNode } from './src/agents/nodes/narrate.ts';

export async function runResearchPipeline(companyName) {
  const state = createInitialResearchState(companyName);

  const fetchUpdate = await fetchDataNode(state, {});
  const nextState = { ...state, ...fetchUpdate };

  if (nextState.step === 'error') {
    return {
      ok: false,
      error: nextState.errors?.[0] || 'Could not resolve the company.',
    };
  }

  const synthesizeUpdate = await synthesizeNode(nextState, {});
  const scoredState = { ...nextState, ...synthesizeUpdate };

  const scoreUpdate = scoreNode(scoredState);
  const narratedState = { ...scoredState, ...scoreUpdate };

  const narrateUpdate = await narrateNode(narratedState, {});
  const finalState = { ...narratedState, ...narrateUpdate };

  if (!finalState.profile || !finalState.financials || !finalState.technicals || !finalState.verdict) {
    return {
      ok: false,
      error: 'The pipeline did not produce a complete report.',
    };
  }

  return {
    ok: true,
    report: {
      companyName: finalState.companyName,
      symbol: finalState.profile.symbol,
      profile: finalState.profile,
      financials: finalState.financials,
      technicals: finalState.technicals,
      candles: finalState.candles,
      rawNews: finalState.rawNews,
      sentiment: finalState.sentiment,
      competitors: finalState.competitors,
      risks: finalState.risks,
      riskAnalysis: finalState.riskAnalysis,
      verdict: finalState.verdict,
      dataSources: finalState.dataSources,
      errors: finalState.errors,
      generatedAt: new Date().toISOString(),
    },
  };
}
