export interface BlockData {
  chain: string;
  blockNumber: number;
  timestamp: number;
  transactionCount: number;
}

export interface PerformanceMetrics {
  chain: string;
  timestamp: number;
  tps: number;
  blockTime: number;
  confirmationDelay: number;
}

export interface ChainSnapshot {
  chain: string;
  currentBlock: number;
  timestamp: number;
  metrics: PerformanceMetrics;
}

