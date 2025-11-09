import { Connection } from '@solana/web3.js';
import { ChainConfig } from '../config/chains.js';
import { BlockData } from '../types/metrics.js';
import { withRetry, withTimeout } from './utils.js';

export class SolanaCollector {
  private connection: Connection;
  private timeoutMs: number;
  private maxRetries: number;

  constructor(config: ChainConfig, timeoutMs: number = 10000, maxRetries: number = 3) {
    this.connection = new Connection(config.rpcUrl, 'confirmed');
    this.timeoutMs = timeoutMs;
    this.maxRetries = maxRetries;
  }

  async getLatestBlock(): Promise<BlockData> {
    return withRetry(async () => {
      return withTimeout(
        (async () => {
          const slot = await this.connection.getSlot();
          const block = await this.connection.getBlock(slot, {
            maxSupportedTransactionVersion: 0
          });
          
          if (!block) {
            throw new Error('Failed to fetch block');
          }

          return {
            chain: '',
            blockNumber: slot,
            timestamp: block.blockTime || Date.now() / 1000,
            transactionCount: block.transactions.length
          };
        })(),
        this.timeoutMs
      );
    }, this.maxRetries);
  }

  async getBlockByNumber(slot: number): Promise<BlockData> {
    return withRetry(async () => {
      return withTimeout(
        (async () => {
          const block = await this.connection.getBlock(slot, {
            maxSupportedTransactionVersion: 0
          });
          
          if (!block) {
            throw new Error('Failed to fetch block');
          }

          return {
            chain: '',
            blockNumber: slot,
            timestamp: block.blockTime || Date.now() / 1000,
            transactionCount: block.transactions.length
          };
        })(),
        this.timeoutMs
      );
    }, this.maxRetries);
  }

  async healthCheck(): Promise<boolean> {
    try {
      await withTimeout(this.connection.getSlot(), 5000);
      return true;
    } catch {
      return false;
    }
  }
}

