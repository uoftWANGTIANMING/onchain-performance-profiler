import fs from 'fs/promises';
import path from 'path';
import { BlockData, PerformanceMetrics } from '../types/metrics.js';

const DATA_DIR = path.join(process.cwd(), 'data');

export class Processor {
  async loadBlockData(chain: string): Promise<BlockData[]> {
    const filePath = path.join(DATA_DIR, `${chain}.json`);
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(content);
    } catch {
      return [];
    }
  }

  calculateTPS(blocks: BlockData[]): number {
    if (blocks.length < 2) return 0;

    const sorted = blocks.sort((a, b) => a.blockNumber - b.blockNumber);
    const first = sorted[0];
    const last = sorted[sorted.length - 1];

    const timeDiff = last.timestamp - first.timestamp;
    if (timeDiff === 0) return 0;

    const totalTxs = sorted.reduce((sum, b) => sum + b.transactionCount, 0);
    return totalTxs / timeDiff;
  }

  calculateBlockTime(blocks: BlockData[]): number {
    if (blocks.length < 2) return 0;

    const sorted = blocks.sort((a, b) => a.blockNumber - b.blockNumber);
    const first = sorted[0];
    const last = sorted[sorted.length - 1];

    const blockDiff = last.blockNumber - first.blockNumber;
    const timeDiff = last.timestamp - first.timestamp;

    if (blockDiff === 0) return 0;
    return timeDiff / blockDiff;
  }

  calculateConfirmationDelay(blocks: BlockData[]): number {
    if (blocks.length < 2) return 0;

    const sorted = blocks.sort((a, b) => a.timestamp - b.timestamp);
    const delays: number[] = [];

    for (let i = 1; i < sorted.length; i++) {
      const delay = sorted[i].timestamp - sorted[i - 1].timestamp;
      delays.push(delay);
    }

    if (delays.length === 0) return 0;
    return delays.reduce((a, b) => a + b, 0) / delays.length;
  }

  async processChain(chain: string): Promise<PerformanceMetrics> {
    const blocks = await this.loadBlockData(chain);
    
    if (blocks.length === 0) {
      return {
        chain,
        timestamp: Date.now(),
        tps: 0,
        blockTime: 0,
        confirmationDelay: 0
      };
    }

    const recentBlocks = blocks.slice(-100);

    return {
      chain,
      timestamp: Date.now(),
      tps: this.calculateTPS(recentBlocks),
      blockTime: this.calculateBlockTime(recentBlocks),
      confirmationDelay: this.calculateConfirmationDelay(recentBlocks)
    };
  }

  async processAllChains(): Promise<PerformanceMetrics[]> {
    const chains = ['ethereum', 'arbitrum', 'base', 'solana'];
    const results = await Promise.all(
      chains.map(chain => this.processChain(chain))
    );
    return results;
  }
}

