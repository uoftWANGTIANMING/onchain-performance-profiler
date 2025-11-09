import { ethers } from 'ethers';
import { ChainConfig } from '../config/chains.js';
import { BlockData } from '../types/metrics.js';

export class EVMCollector {
  private provider: ethers.JsonRpcProvider;

  constructor(config: ChainConfig) {
    this.provider = new ethers.JsonRpcProvider(config.rpcUrl);
  }

  async getLatestBlock(): Promise<BlockData> {
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
  }

  async getBlockByNumber(blockNumber: number): Promise<BlockData> {
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
  }
}

