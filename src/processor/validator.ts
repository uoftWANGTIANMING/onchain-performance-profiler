import { BlockData } from '../types/metrics.js';

export function validateBlockData(block: BlockData): boolean {
  if (!block || typeof block !== 'object') {
    return false;
  }

  if (typeof block.blockNumber !== 'number' || block.blockNumber < 0) {
    return false;
  }

  if (typeof block.timestamp !== 'number' || block.timestamp <= 0) {
    return false;
  }

  if (typeof block.transactionCount !== 'number' || block.transactionCount < 0) {
    return false;
  }

  const now = Date.now() / 1000;
  const maxTimestamp = now + 3600;
  const minTimestamp = now - 86400 * 7;

  if (block.timestamp > maxTimestamp || block.timestamp < minTimestamp) {
    return false;
  }

  return true;
}

export function validateAndFilterBlocks(blocks: BlockData[]): BlockData[] {
  if (!Array.isArray(blocks)) {
    return [];
  }

  const validated = blocks.filter(validateBlockData);
  
  if (validated.length < 2) {
    return validated;
  }

  const sorted = validated.sort((a, b) => a.blockNumber - b.blockNumber);
  const filtered: BlockData[] = [sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    const prev = filtered[filtered.length - 1];
    const curr = sorted[i];

    if (curr.blockNumber <= prev.blockNumber) {
      continue;
    }

    const timeDiff = curr.timestamp - prev.timestamp;
    const blockDiff = curr.blockNumber - prev.blockNumber;

    if (timeDiff < 0 || timeDiff > 3600) {
      continue;
    }

    if (blockDiff > 1000) {
      continue;
    }

    filtered.push(curr);
  }

  return filtered;
}

