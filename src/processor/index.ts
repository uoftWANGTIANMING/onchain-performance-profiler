import fs from 'fs/promises';
import path from 'path';
import { BlockData, PerformanceMetrics } from '../types/metrics.js';
import { validateAndFilterBlocks } from './validator.js';
import { MetricsCache } from './cache.js';

const DATA_DIR = path.join(process.cwd(), 'data');

export class Processor {
  private cache: MetricsCache;

  constructor() {
    this.cache = new MetricsCache(5000);
  }

  async loadBlockData(chain: string): Promise<BlockData[]> {
    const filePath = path.join(DATA_DIR, `${chain}.json`);
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const data = JSON.parse(content);
      return validateAndFilterBlocks(data);
    } catch {
      return [];
    }
  }

  public calculateTPS(blocks: BlockData[]): number {
    if (blocks.length < 2) return 0;

    const sorted = blocks.sort((a, b) => a.timestamp - b.timestamp);
    const first = sorted[0];
    const last = sorted[sorted.length - 1];
    const timeDiff = last.timestamp - first.timestamp;
    
    if (timeDiff <= 0) return 0;
    
    const totalTxs = sorted.reduce((sum, b) => sum + b.transactionCount, 0);
    const tps = totalTxs / timeDiff;
    
    return Math.max(0, tps);
  }

  public calculateBlockTime(blocks: BlockData[]): number {
    if (blocks.length < 2) return 0;

    const sorted = blocks.sort((a, b) => a.blockNumber - b.blockNumber);
    const blockTimes: number[] = [];

    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1];
      const curr = sorted[i];
      
      const blockDiff = curr.blockNumber - prev.blockNumber;
      const timeDiff = curr.timestamp - prev.timestamp;

      if (blockDiff > 0 && timeDiff > 0 && timeDiff < 3600) {
        blockTimes.push(timeDiff / blockDiff);
      }
    }

    if (blockTimes.length === 0) {
      const first = sorted[0];
      const last = sorted[sorted.length - 1];
      const blockDiff = last.blockNumber - first.blockNumber;
      const timeDiff = last.timestamp - first.timestamp;
      if (blockDiff === 0) return 0;
      return timeDiff / blockDiff;
    }

    return blockTimes.reduce((a, b) => a + b, 0) / blockTimes.length;
  }

  public calculateConfirmationDelay(blocks: BlockData[]): number {
    if (blocks.length < 2) return 0;

    const sorted = blocks.sort((a, b) => a.timestamp - b.timestamp);
    const delays: number[] = [];

    for (let i = 1; i < sorted.length; i++) {
      const delay = sorted[i].timestamp - sorted[i - 1].timestamp;
      if (delay > 0 && delay < 3600) {
        delays.push(delay);
      }
    }

    if (delays.length === 0) return 0;
    
    const sortedDelays = delays.sort((a, b) => a - b);
    const medianIndex = Math.floor(sortedDelays.length / 2);
    return sortedDelays[medianIndex];
  }

  async processChain(chain: string): Promise<PerformanceMetrics> {
    const cached = this.cache.get(chain);
    if (cached) {
      return cached;
    }

    const blocks = await this.loadBlockData(chain);
    
    if (blocks.length === 0) {
      const result = {
        chain,
        timestamp: Date.now(),
        tps: 0,
        blockTime: 0,
        confirmationDelay: 0
      };
      this.cache.set(chain, result);
      return result;
    }

    const recentBlocks = blocks.slice(-100);

    const result = {
      chain,
      timestamp: Date.now(),
      tps: this.calculateTPS(recentBlocks),
      blockTime: this.calculateBlockTime(recentBlocks),
      confirmationDelay: this.calculateConfirmationDelay(recentBlocks)
    };

    this.cache.set(chain, result);
    return result;
  }

  async processAllChains(): Promise<PerformanceMetrics[]> {
    const chains = ['ethereum', 'arbitrum', 'base', 'solana'];
    const results = await Promise.all(
      chains.map(chain => this.processChain(chain))
    );
    return results;
  }
}

