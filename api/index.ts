import '../src/config/env.js';
import express from 'express';
import cors from 'cors';
import { Processor } from '../src/processor/index.js';
import { collector } from '../src/collector/index.js';
import { rateLimiter, cacheMiddleware } from '../src/api/middleware.js';
import { CHAINS } from '../src/config/chains.js';
import { env } from '../src/config/env.js';

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
    let metrics = await processor.processAllChains();
    
    const hasData = metrics.some(m => m.tps > 0 || m.blockTime > 0);
    if (!hasData) {
      const chains = Object.keys(CHAINS);
      const realtimeMetrics = await Promise.all(
        chains.map(async (chain) => {
          try {
            const blockData = await collector.collect(chain);
            const chainCollector = collector.collectors.get(chain);
            
            if (!chainCollector) {
              throw new Error(`Collector not found for ${chain}`);
            }
            
            const blocks: any[] = [blockData];
            const blockCounts: Record<string, number> = {
              ethereum: 10,
              arbitrum: 20,
              base: 10,
              solana: 10
            };
            const count = blockCounts[chain] || 10;
            
            if (chainCollector.getBlockByNumber) {
              let currentBlock = blockData.blockNumber;
              const promises: Promise<any>[] = [];
              
              for (let i = 1; i < count && i <= 5; i++) {
                currentBlock = currentBlock - 1;
                if (currentBlock < 0) break;
                promises.push(
                  chainCollector.getBlockByNumber(currentBlock).catch(() => null)
                );
              }
              
              const results = await Promise.all(promises);
              for (const result of results.reverse()) {
                if (result) blocks.unshift(result);
              }
            }
            
            if (blocks.length >= 2) {
              return {
                chain,
                timestamp: Date.now(),
                tps: processor.calculateTPS(blocks),
                blockTime: processor.calculateBlockTime(blocks),
                confirmationDelay: processor.calculateConfirmationDelay(blocks)
              };
            }
          } catch (error) {
            console.error(`Error collecting ${chain}:`, error);
          }
          return {
            chain,
            timestamp: Date.now(),
            tps: 0,
            blockTime: 0,
            confirmationDelay: 0
          };
        })
      );
      metrics = realtimeMetrics;
    }
    
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

export default app;

