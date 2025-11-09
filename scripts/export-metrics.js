import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const METRICS_HISTORY_DIR = path.join(__dirname, '..', 'metrics-history');
const EXPORT_DIR = path.join(__dirname, '..', 'exported-data');

async function exportMetrics() {
  try {
    const filePath = path.join(METRICS_HISTORY_DIR, 'metrics-history.json');
    const content = await fs.readFile(filePath, 'utf-8');
    const history = JSON.parse(content);
    
    await fs.mkdir(EXPORT_DIR, { recursive: true });
    const exportPath = path.join(EXPORT_DIR, `metrics-${Date.now()}.json`);
    await fs.writeFile(exportPath, JSON.stringify(history, null, 2));
    
    console.log(`Metrics exported to: ${exportPath}`);
    console.log(`Chains: ${Object.keys(history).join(', ')}`);
    for (const [chain, data] of Object.entries(history)) {
      console.log(`  ${chain}: ${data.length} data points`);
    }
  } catch (error) {
    console.error('Failed to export metrics:', error);
    process.exit(1);
  }
}

exportMetrics();

