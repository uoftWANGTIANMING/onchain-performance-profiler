import { PerformanceMetrics } from '../types/metrics.js';

interface CacheEntry {
  data: PerformanceMetrics;
  timestamp: number;
}

export class MetricsCache {
  private cache: Map<string, CacheEntry> = new Map();
  private ttl: number;

  constructor(ttlMs: number = 60000) {
    this.ttl = ttlMs;
  }

  get(chain: string): PerformanceMetrics | null {
    const entry = this.cache.get(chain);
    if (!entry) {
      return null;
    }

    const now = Date.now();
    if (now - entry.timestamp > this.ttl) {
      this.cache.delete(chain);
      return null;
    }

    return entry.data;
  }

  set(chain: string, data: PerformanceMetrics): void {
    this.cache.set(chain, {
      data,
      timestamp: Date.now()
    });
  }

  clear(): void {
    this.cache.clear();
  }

  invalidate(chain: string): void {
    this.cache.delete(chain);
  }
}

