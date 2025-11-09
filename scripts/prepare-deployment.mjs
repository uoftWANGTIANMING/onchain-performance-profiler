import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const METRICS_HISTORY_DIR = path.join(__dirname, '..', 'metrics-history');
const PUBLIC_DIR = path.join(__dirname, '..', 'public');

async function prepareDeployment() {
  try {
    await fs.mkdir(PUBLIC_DIR, { recursive: true });
    
    const sourceFile = path.join(METRICS_HISTORY_DIR, 'metrics-history.json');
    const targetFile = path.join(PUBLIC_DIR, 'metrics-history.json');
    
    try {
      await fs.access(sourceFile);
      await fs.copyFile(sourceFile, targetFile);
      console.log(`✓ Copied metrics-history.json to public/`);
    } catch {
      console.log(`⚠ metrics-history.json not found, skipping copy`);
    }
    
    console.log(`  Ready for deployment!`);
  } catch (error) {
    console.error('Failed to prepare deployment:', error);
    process.exit(1);
  }
}

prepareDeployment();

