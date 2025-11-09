export interface ChainConfig {
  name: string;
  rpcUrl: string;
  chainId?: number;
  type: 'evm' | 'solana';
}

export const CHAINS: Record<string, ChainConfig> = {
  ethereum: {
    name: 'Ethereum',
    rpcUrl: 'https://eth.llamarpc.com',
    chainId: 1,
    type: 'evm'
  },
  arbitrum: {
    name: 'Arbitrum',
    rpcUrl: 'https://arb1.arbitrum.io/rpc',
    chainId: 42161,
    type: 'evm'
  },
  base: {
    name: 'Base',
    rpcUrl: 'https://mainnet.base.org',
    chainId: 8453,
    type: 'evm'
  },
  solana: {
    name: 'Solana',
    rpcUrl: 'https://api.mainnet-beta.solana.com',
    type: 'solana'
  }
};

