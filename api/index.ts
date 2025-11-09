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
    
    const chains = Object.keys(CHAINS);
    const realtimeMetrics = await Promise.allSettled(
      chains.map(async (chain) => {
        try {
          const chainCollector = collector.collectors.get(chain);
          if (!chainCollector) {
            throw new Error(`Collector not found for ${chain}`);
          }
          
          const blocks: any[] = [];
          
          if (chain === 'solana') {
            const solanaCollector = chainCollector as any;
            const currentSlot = await solanaCollector.connection.getSlot();
            const slotsToFetch = [currentSlot, currentSlot - 1, currentSlot - 2];
            
            const slotResults = await Promise.allSettled(
              slotsToFetch.map(slot => solanaCollector.getBlockByNumber(slot))
            );
            
            for (const result of slotResults) {
              if (result.status === 'fulfilled' && result.value && result.value.transactionCount !== undefined) {
                blocks.push(result.value);
              }
            }
          } else {
            const blockData = await collector.collect(chain);
            blocks.push(blockData);
            
            if (chainCollector.getBlockByNumber) {
              const prevBlock = await chainCollector.getBlockByNumber(blockData.blockNumber - 1).catch(() => null);
              if (prevBlock) {
                blocks.unshift(prevBlock);
              }
            }
          }
          
          if (blocks.length >= 2) {
            return {
              chain,
              timestamp: Date.now(),
              tps: processor.calculateTPS(blocks, chain),
              blockTime: processor.calculateBlockTime(blocks),
              confirmationDelay: processor.calculateConfirmationDelay(blocks)
            };
          }
          
          throw new Error(`Insufficient blocks: ${blocks.length}`);
        } catch (error: any) {
          console.error(`Error collecting ${chain}:`, error.message || error);
          throw error;
        }
      })
    );
    
    const metrics = realtimeMetrics.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      }
      return {
        chain: chains[index],
        timestamp: Date.now(),
        tps: 0,
        blockTime: 0,
        confirmationDelay: 0
      };
    });
    
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

