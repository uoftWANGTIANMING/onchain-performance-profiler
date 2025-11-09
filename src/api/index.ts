import express from 'express';
import cors from 'cors';
import { Processor } from '../processor/index.js';

const app = express();
app.use(cors());
app.use(express.json());

const processor = new Processor();

app.get('/', (req, res) => {
  res.json({ message: 'On-chain Performance Profiler API', endpoints: ['/api/metrics', '/api/metrics/:chain'] });
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

