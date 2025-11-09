import { Connection, PublicKey } from '@solana/web3.js';
import { ChainConfig } from '../config/chains.js';
import { BlockData } from '../types/metrics.js';

export class SolanaCollector {
  private connection: Connection;

  constructor(config: ChainConfig) {
    this.connection = new Connection(config.rpcUrl, 'confirmed');
  }

  async getLatestBlock(): Promise<BlockData> {
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
  }

  async getBlockByNumber(slot: number): Promise<BlockData> {
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
  }
}

