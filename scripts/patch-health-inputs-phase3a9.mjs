import fs from 'node:fs';
import { patchCurrentHealthClient } from './lib/health-current-v538.mjs';
const file = new URL('../public/assets/index-BQGspy0I.js', import.meta.url);
let source = fs.readFileSync(file, 'utf8');
const before = 'bdBusinessHealthCalculationVersionV284="business-health-engine-v4"';
const after = 'bdBusinessHealthCalculationVersionV284="business-health-engine-v7"';
source = source.replace(after, before).replace('bdBusinessHealthCalculationVersionV284="business-health-engine-v6"', before).replace('bdBusinessHealthCalculationVersionV284="business-health-engine-v5"', before);
if (!process.argv.includes('--restore')) {
  if (source.split(before).length !== 2) throw new Error('Unique canonical Health calculation version required');
  source = patchCurrentHealthClient(source.replace(before, after));
}
fs.writeFileSync(file, source);
