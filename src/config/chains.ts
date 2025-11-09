import { env } from './env.js';

export interface ChainConfig {
  name: string;
  rpcUrl: string;
  chainId?: number;
  type: 'evm' | 'solana';
}

export const CHAINS: Record<string, ChainConfig> = {
  ethereum: {
    name: 'Ethereum',
    rpcUrl: env.ethereumRpcUrl,
    chainId: 1,
    type: 'evm'
  },
  arbitrum: {
    name: 'Arbitrum',
    rpcUrl: env.arbitrumRpcUrl,
    chainId: 42161,
    type: 'evm'
  },
  base: {
    name: 'Base',
    rpcUrl: env.baseRpcUrl,
    chainId: 8453,
    type: 'evm'
  },
  solana: {
    name: 'Solana',
    rpcUrl: env.solanaRpcUrl,
    type: 'solana'
  }
};

