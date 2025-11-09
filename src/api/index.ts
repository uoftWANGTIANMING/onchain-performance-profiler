import '../config/env.js';
import express from 'express';
import cors from 'cors';
import { Processor } from '../processor/index.js';
import { collector } from '../collector/index.js';
import { rateLimiter, cacheMiddleware } from './middleware.js';
import { CHAINS } from '../config/chains.js';
import { env } from '../config/env.js';

const app = express();
app.use(cors());
app.use(express.json());
app.use(rateLimiter.middleware());

const processor = new Processor();

app.get('/', (req, res) => {
  res.json({ 
    message: 'On-chain Performance Profiler API', 
    version: '1.0.0',
    endpoints: ['/api/metrics', '/api/metrics/:chain', '/api/health'] 
  });
});

app.get('/api/health', async (req, res) => {
  try {
    const startTime = Date.now();
    const health = await collector.healthCheck();
    const responseTime = Date.now() - startTime;

    const allHealthy = Object.values(health).every(status => status === true);
    const status = allHealthy ? 'healthy' : 'degraded';

    res.json({ 
      status,
      timestamp: new Date().toISOString(),
      responseTime: `${responseTime}ms`,
      chains: health,
      uptime: process.uptime()
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    res.status(500).json({ 
      status: 'error',
      error: 'Failed to check health',
      message: errorMessage,
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/api/metrics', cacheMiddleware, async (req, res) => {
  try {
    const startTime = Date.now();
    const metrics = await processor.processAllChains();
    const responseTime = Date.now() - startTime;

    res.json({
      data: metrics,
      meta: {
        count: metrics.length,
        responseTime: `${responseTime}ms`,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    res.status(500).json({ 
      error: 'Failed to fetch metrics',
      message: errorMessage,
      timestamp: new Date().toISOString(),
      details: process.env.NODE_ENV === 'development' ? errorStack : undefined
    });
  }
});

app.get('/api/metrics/:chain', cacheMiddleware, async (req, res) => {
  try {
    const { chain } = req.params;
    
    if (!CHAINS[chain]) {
      return res.status(404).json({
        error: 'Chain not found',
        message: `Chain '${chain}' is not supported`,
        supportedChains: Object.keys(CHAINS),
        timestamp: new Date().toISOString()
      });
    }

    const startTime = Date.now();
    const metrics = await processor.processChain(chain);
    const responseTime = Date.now() - startTime;

    res.json({
      data: metrics,
      meta: {
        responseTime: `${responseTime}ms`,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    res.status(500).json({ 
      error: 'Failed to fetch metrics',
      message: errorMessage,
      chain: req.params.chain,
      timestamp: new Date().toISOString(),
      details: process.env.NODE_ENV === 'development' ? errorStack : undefined
    });
  }
});

app.use((req, res) => {
  res.status(404).json({
    error: 'Not found',
    message: `Route ${req.method} ${req.path} not found`,
    availableEndpoints: ['/api/metrics', '/api/metrics/:chain', '/api/health'],
    timestamp: new Date().toISOString()
  });
});

app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  const errorMessage = err.message || 'Internal server error';
  const errorStack = err.stack;

  res.status(500).json({
    error: 'Internal server error',
    message: errorMessage,
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString(),
    details: process.env.NODE_ENV === 'development' ? errorStack : undefined
  });
});

app.listen(env.port, () => {
  console.log(`API server running on port ${env.port}`);
});

