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
    
    if (validMetrics.length === 0) {
      const chains = Object.keys(CHAINS);
      const realtimeMetrics = await Promise.all(
        chains.map(async (chain) => {
          try {
            const chainCollector = collector.collectors.get(chain);
            if (!chainCollector) {
              console.error(`Collector not found for ${chain}`);
              return {
                chain,
                timestamp: Date.now(),
                tps: 0,
                blockTime: 0,
                confirmationDelay: 0
              };
            }
            
            const blocks: any[] = [];
            
            if (chain === 'solana') {
              try {
                const solanaCollector = chainCollector as any;
                const currentSlot = await solanaCollector.connection.getSlot().catch((err: any) => {
                  console.error(`Solana getSlot failed:`, err.message);
                  throw err;
                });
                const slotsToFetch = [currentSlot, currentSlot - 1, currentSlot - 2, currentSlot - 3];
                
                const slotPromises = slotsToFetch.map(slot => 
                  solanaCollector.getBlockByNumber(slot).catch((err: any) => {
                    console.error(`Solana slot ${slot} failed:`, err.message || err);
                    return null;
                  })
                );
                
                const slotResults = await Promise.all(slotPromises);
                let successCount = 0;
                for (const result of slotResults) {
                  if (result && result.transactionCount !== undefined) {
                    blocks.push(result);
                    successCount++;
                  }
                }
                
                if (blocks.length < 2) {
                  console.error(`Solana: Only got ${blocks.length}/${slotsToFetch.length} blocks. Current slot: ${currentSlot}`);
                } else {
                  console.log(`Solana: Successfully fetched ${successCount}/${slotsToFetch.length} blocks`);
                }
              } catch (error: any) {
                console.error(`Solana collection error:`, error.message || error, error.stack);
              }
            } else {
              try {
                const blockData = await collector.collect(chain);
                blocks.push(blockData);
                
                if (chainCollector.getBlockByNumber) {
                  const blockCounts: Record<string, number> = {
                    ethereum: 3,
                    arbitrum: 5,
                    base: 3
                  };
                  const count = blockCounts[chain] || 3;
                  let currentBlock = blockData.blockNumber;
                  
                  const promises: Promise<any>[] = [];
                  for (let i = 1; i <= count && i <= 3; i++) {
                    const targetBlock = currentBlock - i;
                    if (targetBlock >= 0) {
                      promises.push(
                        chainCollector.getBlockByNumber(targetBlock).catch((err: any) => {
                          console.error(`${chain} block ${targetBlock} failed:`, err.message || err);
                          return null;
                        })
                      );
                    }
                  }
                  
                  const results = await Promise.all(promises);
                  let successCount = 1;
                  for (const result of results.reverse()) {
                    if (result) {
                      blocks.unshift(result);
                      successCount++;
                    }
                  }
                  
                  if (blocks.length < 2) {
                    console.error(`${chain}: Only got ${blocks.length} blocks (expected at least 2). Latest block: ${currentBlock}`);
                  } else {
                    console.log(`${chain}: Successfully fetched ${successCount} blocks`);
                  }
                }
              } catch (error: any) {
                console.error(`${chain} collection error:`, error.message || error, error.stack);
                throw error;
              }
            }
            
            if (blocks.length >= 2) {
              const result = {
                chain,
                timestamp: Date.now(),
                tps: processor.calculateTPS(blocks),
                blockTime: processor.calculateBlockTime(blocks),
                confirmationDelay: processor.calculateConfirmationDelay(blocks)
              };
              
              if (chain === 'solana') {
                console.log(`Solana metrics: TPS=${result.tps}, BlockTime=${result.blockTime}, Blocks=${blocks.length}`);
              }
              
              return result;
            } else {
              console.error(`${chain}: Only got ${blocks.length} blocks, need at least 2`);
            }
          } catch (error: any) {
            console.error(`Error collecting ${chain}:`, error.message || error);
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

