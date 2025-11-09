import '../config/env.js';
import { CHAINS, ChainConfig } from '../config/chains.js';
import { EVMCollector } from './evm.js';
import { SolanaCollector } from './solana.js';
import { BlockData } from '../types/metrics.js';
import { RateLimiter } from './utils.js';
import fs from 'fs/promises';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');

export class Collector {
  public collectors: Map<string, EVMCollector | SolanaCollector> = new Map();
  private rateLimiter: RateLimiter;

  constructor() {
    this.rateLimiter = new RateLimiter(10, 1000);
    for (const [key, config] of Object.entries(CHAINS)) {
      if (config.type === 'evm') {
        this.collectors.set(key, new EVMCollector(config));
      } else if (config.type === 'solana') {
        this.collectors.set(key, new SolanaCollector(config));
      }
    }
  }

  async collect(chain: string): Promise<BlockData> {
    await this.rateLimiter.wait();
    
    const collector = this.collectors.get(chain);
    if (!collector) {
      throw new Error(`Unknown chain: ${chain}`);
    }

    const blockData = await collector.getLatestBlock();
    blockData.chain = chain;
    return blockData;
  }

  async saveBlockData(blockData: BlockData): Promise<void> {
    await fs.mkdir(DATA_DIR, { recursive: true });
    const filePath = path.join(DATA_DIR, `${blockData.chain}.json`);
    
    let data: BlockData[] = [];
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      data = JSON.parse(content);
    } catch {
      data = [];
    }

    data.push(blockData);
    
    if (data.length > 1000) {
      data = data.slice(-1000);
    }

    await fs.writeFile(filePath, JSON.stringify(data, null, 2));
  }

  async collectAll(): Promise<void> {
    const chains = Object.keys(CHAINS);
    const promises = chains.map(async (chain) => {
      try {
        const blockData = await this.collect(chain);
        await this.saveBlockData(blockData);
        console.log(`Collected ${chain}: block ${blockData.blockNumber}`);
      } catch (error) {
        console.error(`Error collecting ${chain}:`, error);
      }
    });

    await Promise.all(promises);
  }

  async healthCheck(): Promise<Record<string, boolean>> {
    const results: Record<string, boolean> = {};
    const chains = Object.keys(CHAINS);
    
    const promises = chains.map(async (chain) => {
      const collector = this.collectors.get(chain);
      if (collector && 'healthCheck' in collector) {
        results[chain] = await collector.healthCheck();
      } else {
        results[chain] = false;
      }
    });

    await Promise.all(promises);
    return results;
  }

  start(intervalMs: number = 5000): void {
    this.collectAll();
    setInterval(() => {
      this.collectAll();
    }, intervalMs);
  }
}

export const collector = new Collector();
collector.start(5000);

