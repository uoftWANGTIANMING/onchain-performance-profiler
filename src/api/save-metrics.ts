import fs from 'fs/promises';
import path from 'path';
import { PerformanceMetrics } from '../types/metrics.js';

const METRICS_HISTORY_DIR = path.join(process.cwd(), 'metrics-history');

export async function saveMetricsHistory(history: Record<string, PerformanceMetrics[]>): Promise<void> {
  await fs.mkdir(METRICS_HISTORY_DIR, { recursive: true });
  
  const twoMinutesAgo = Date.now() - 2 * 60 * 1000;
  const filteredHistory: Record<string, PerformanceMetrics[]> = {};
  
  for (const [chain, data] of Object.entries(history)) {
    const recentData = data.filter(m => m.timestamp >= twoMinutesAgo);
    if (recentData.length > 0) {
      filteredHistory[chain] = recentData;
    }
  }
  
  const filePath = path.join(METRICS_HISTORY_DIR, 'metrics-history.json');
  await fs.writeFile(filePath, JSON.stringify(filteredHistory, null, 2));
}

export async function loadMetricsHistory(): Promise<Record<string, PerformanceMetrics[]>> {
  const filePath = path.join(METRICS_HISTORY_DIR, 'metrics-history.json');
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content);
  } catch {
    return {};
  }
}

