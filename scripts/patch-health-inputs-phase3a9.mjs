import fs from 'node:fs';
const file = new URL('../public/assets/index-BQGspy0I.js', import.meta.url);
let source = fs.readFileSync(file, 'utf8');
const before = 'bdBusinessHealthCalculationVersionV284="business-health-engine-v4"';
const after = 'bdBusinessHealthCalculationVersionV284="business-health-engine-v5"';
source = source.replace(after, before);
if (!process.argv.includes('--restore')) {
  if (source.split(before).length !== 2) throw new Error('Unique canonical Health calculation version required');
  source = source.replace(before, after);
}
fs.writeFileSync(file, source);
