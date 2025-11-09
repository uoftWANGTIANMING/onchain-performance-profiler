import express from 'express';
import cors from 'cors';
import { Processor } from '../processor/index.js';
import { collector } from '../collector/index.js';

const app = express();
app.use(cors());
app.use(express.json());

const processor = new Processor();

app.get('/', (req, res) => {
  res.json({ 
    message: 'On-chain Performance Profiler API', 
    endpoints: ['/api/metrics', '/api/metrics/:chain', '/api/health'] 
  });
});

app.get('/api/health', async (req, res) => {
  try {
    const health = await collector.healthCheck();
    res.json({ status: 'ok', chains: health });
  } catch (error) {
    res.status(500).json({ status: 'error', error: 'Failed to check health' });
  }
});

app.get('/api/metrics', async (req, res) => {
  try {
    const metrics = await processor.processAllChains();
    res.json(metrics);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch metrics' });
  }
});

app.get('/api/metrics/:chain', async (req, res) => {
  try {
    const { chain } = req.params;
    const metrics = await processor.processChain(chain);
    res.json(metrics);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch metrics' });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`API server running on port ${PORT}`);
});

