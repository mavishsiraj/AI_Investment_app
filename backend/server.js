import express from 'express';
import { createInitialResearchState } from './src/agents/state.ts';
import { fetchDataNode } from './src/agents/nodes/fetchData.ts';
import { synthesizeNode } from './src/agents/nodes/synthesize.ts';
import { scoreNode } from './src/agents/nodes/score.ts';
import { narrateNode } from './src/agents/nodes/narrate.ts';

const app = express();
const port = process.env.PORT || 4000;

app.use(express.json());
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') {
    res.sendStatus(204);
    return;
  }
  next();
});

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'backend' });
});

app.post('/api/research', async (req, res) => {
  const { companyName } = req.body || {};

  if (typeof companyName !== 'string' || !companyName.trim()) {
    res.status(400).json({ error: 'companyName is required.' });
    return;
  }

  res.setHeader('Content-Type', 'application/x-ndjson; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.flushHeaders?.();

  const encoder = new TextEncoder();
  const send = (chunk) => {
    res.write(`${JSON.stringify(chunk)}\n`);
  };

  const abortController = new AbortController();
  const timeoutId = setTimeout(() => {
    abortController.abort(new Error('Pipeline timed out after 120s.'));
  }, 120_000);

  let state = createInitialResearchState(companyName.trim());
  const runnableConfig = { signal: abortController.signal };

  try {
    send({ step: 'fetchData', status: 'running', label: 'Fetching live market data' });
    const fetchUpdate = await fetchDataNode(state, runnableConfig);
    state = { ...state, ...fetchUpdate };

    if (state.step === 'error') {
      send({
        step: 'fetchData',
        status: 'done',
        failed: true,
        label: 'Fetching live market data',
        data: { errors: state.errors },
      });
      send({
        step: 'error',
        status: 'done',
        failed: true,
        label: 'Pipeline stopped: could not resolve company to a ticker.',
        data: { errors: state.errors },
      });
      res.end();
      return;
    }

    send({
      step: 'fetchData',
      status: 'done',
      label: 'Fetching live market data',
      data: {
        profile: state.profile,
        financials: state.financials,
        technicals: state.technicals,
        dataSources: state.dataSources,
        errors: state.errors,
      },
    });

    send({ step: 'synthesize', status: 'running', label: 'AI analyzing research' });
    const synthesizeUpdate = await synthesizeNode(state, runnableConfig);
    state = { ...state, ...synthesizeUpdate };
    send({
      step: 'synthesize',
      status: 'done',
      label: 'AI analyzing research',
      data: {
        sentiment: state.sentiment,
        competitors: state.competitors,
        risks: state.risks,
        riskAnalysis: state.riskAnalysis,
      },
    });

    send({ step: 'score', status: 'running', label: 'Computing deterministic score' });
    const scoreUpdate = scoreNode(state);
    state = { ...state, ...scoreUpdate };
    send({
      step: 'score',
      status: 'done',
      label: 'Computing deterministic score',
      data: { verdict: state.verdict },
    });

    send({ step: 'narrate', status: 'running', label: 'Drafting investment memo' });
    const narrateUpdate = await narrateNode(state, runnableConfig);
    state = { ...state, ...narrateUpdate };
    send({
      step: 'narrate',
      status: 'done',
      label: 'Drafting investment memo',
      data: { verdict: state.verdict },
    });

   if (!state.profile || !state.financials || !state.verdict) {
      send({
        step: 'error',
        status: 'done',
        failed: true,
        label: 'Pipeline finished without enough data to build a report.',
        data: { errors: state.errors },
      });
      res.end();
      return;
    }

    const report = {
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

    send({ step: 'complete', status: 'done', label: 'Research complete', data: report });
  } catch (error) {
    send({
      step: 'error',
      status: 'done',
      failed: true,
      label: abortController.signal.aborted
        ? 'Pipeline timed out or was cancelled.'
        : 'Pipeline failed unexpectedly.',
      data: { error: error instanceof Error ? error.message : String(error), partial: state },
    });
  } finally {
    clearTimeout(timeoutId);
    res.end();
  }
});

app.listen(port, () => {
  console.log(`Backend listening on http://localhost:${port}`);
});
