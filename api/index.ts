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
    
    const validMetrics = metrics.filter(m => m.tps > 0 || m.blockTime > 0);
    const hasData = validMetrics.length > 0;
    
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
            
            if (chain === 'solana' && chainCollector.getRecentSlots) {
              try {
                const slots = await chainCollector.getRecentSlots(20);
                const slotPromises = slots.slice(1).map(slot => 
                  chainCollector.getBlockByNumber(slot).catch(() => null)
                );
                const slotResults = await Promise.all(slotPromises);
                for (const result of slotResults.reverse()) {
                  if (result) blocks.unshift(result);
                }
              } catch (error) {
                console.error(`Error fetching Solana slots:`, error);
              }
            } else if (chainCollector.getBlockByNumber) {
              const blockCounts: Record<string, number> = {
                ethereum: 20,
                arbitrum: 30,
                base: 20
              };
              const count = blockCounts[chain] || 20;
              let currentBlock = blockData.blockNumber;
              const batchSize = 10;
              
              for (let batch = 0; batch < Math.ceil(count / batchSize); batch++) {
                const promises: Promise<any>[] = [];
                const start = batch * batchSize + 1;
                const end = Math.min(start + batchSize, count + 1);
                
                for (let i = start; i < end; i++) {
                  const targetBlock = currentBlock - i;
                  if (targetBlock < 0) break;
                  promises.push(
                    chainCollector.getBlockByNumber(targetBlock).catch(() => null)
                  );
                }
                
                const results = await Promise.all(promises);
                for (const result of results.reverse()) {
                  if (result) blocks.unshift(result);
                }
              }
            }
            
            if (blocks.length >= 2) {
              const calculated = {
                chain,
                timestamp: Date.now(),
                tps: processor.calculateTPS(blocks),
                blockTime: processor.calculateBlockTime(blocks),
                confirmationDelay: processor.calculateConfirmationDelay(blocks)
              };
              
              if (calculated.tps > 0 || calculated.blockTime > 0) {
                return calculated;
              }
            }
          } catch (error) {
            console.error(`Error collecting ${chain}:`, error);
          }
          
          const existingMetric = metrics.find(m => m.chain === chain);
          if (existingMetric && (existingMetric.tps > 0 || existingMetric.blockTime > 0)) {
            return existingMetric;
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
      
      const finalMetrics = realtimeMetrics.map(newMetric => {
        const existing = metrics.find(m => m.chain === newMetric.chain);
        if (newMetric.tps === 0 && newMetric.blockTime === 0 && existing && (existing.tps > 0 || existing.blockTime > 0)) {
          return existing;
        }
        return newMetric;
      });
      
      metrics = finalMetrics;
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

