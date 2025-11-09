import { ethers } from 'ethers';
import { ChainConfig } from '../config/chains.js';
import { BlockData } from '../types/metrics.js';
import { withRetry, withTimeout } from './utils.js';

export class EVMCollector {
  private provider: ethers.JsonRpcProvider;
  private timeoutMs: number;
  private maxRetries: number;

  constructor(config: ChainConfig, timeoutMs: number = 15000, maxRetries: number = 3) {
    this.provider = new ethers.JsonRpcProvider(config.rpcUrl);
    this.timeoutMs = timeoutMs;
    this.maxRetries = maxRetries;
  }

  async getLatestBlock(): Promise<BlockData> {
    return withRetry(async () => {
      return withTimeout(
        (async () => {
          const block = await this.provider.getBlock('latest');
          if (!block) {
            throw new Error('Failed to fetch block');
          }
          return {
            chain: '',
            blockNumber: Number(block.number),
            timestamp: block.timestamp,
            transactionCount: block.transactions.length
          };
        })(),
        this.timeoutMs
      );
    }, this.maxRetries);
  }

  async getBlockByNumber(blockNumber: number): Promise<BlockData> {
    return withRetry(async () => {
      return withTimeout(
        (async () => {
          const block = await this.provider.getBlock(blockNumber);
          if (!block) {
            throw new Error('Failed to fetch block');
          }
          return {
            chain: '',
            blockNumber: Number(block.number),
            timestamp: block.timestamp,
            transactionCount: block.transactions.length
          };
        })(),
        this.timeoutMs
      );
    }, this.maxRetries);
  }

  async healthCheck(): Promise<boolean> {
    try {
      await withTimeout(this.provider.getBlockNumber(), 5000);
      return true;
    } catch {
      return false;
    }
  }
}

