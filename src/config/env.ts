import dotenv from 'dotenv';

dotenv.config();

interface EnvConfig {
  ethereumRpcUrl: string;
  arbitrumRpcUrl: string;
  baseRpcUrl: string;
  solanaRpcUrl: string;
  port: number;
  nodeEnv: string;
}

function validateEnv(): EnvConfig {
  const ethereumRpcUrl = process.env.ETHEREUM_RPC_URL || 'https://eth.llamarpc.com';
  const arbitrumRpcUrl = process.env.ARBITRUM_RPC_URL || 'https://arb1.arbitrum.io/rpc';
  const baseRpcUrl = process.env.BASE_RPC_URL || 'https://mainnet.base.org';
  const solanaRpcUrl = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';

  if (!isValidUrl(ethereumRpcUrl)) {
    throw new Error(`Invalid ETHEREUM_RPC_URL: ${ethereumRpcUrl}`);
  }
  if (!isValidUrl(arbitrumRpcUrl)) {
    throw new Error(`Invalid ARBITRUM_RPC_URL: ${arbitrumRpcUrl}`);
  }
  if (!isValidUrl(baseRpcUrl)) {
    throw new Error(`Invalid BASE_RPC_URL: ${baseRpcUrl}`);
  }
  if (!isValidUrl(solanaRpcUrl)) {
    throw new Error(`Invalid SOLANA_RPC_URL: ${solanaRpcUrl}`);
  }

  const port = parseInt(process.env.PORT || '3001', 10);
  if (isNaN(port) || port < 1 || port > 65535) {
    throw new Error(`Invalid PORT: ${process.env.PORT}. Must be between 1 and 65535`);
  }

  return {
    ethereumRpcUrl,
    arbitrumRpcUrl,
    baseRpcUrl,
    solanaRpcUrl,
    port,
    nodeEnv: process.env.NODE_ENV || 'development'
  };
}

function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export const env = validateEnv();

