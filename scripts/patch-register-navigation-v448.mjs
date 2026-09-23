import fs from 'node:fs';

const file = new URL('../public/assets/index-BQGspy0I.js', import.meta.url);
const source = fs.readFileSync(file, 'utf8');
const anchor = 'window.location.replace(M+"/setup")';
const replacement = 'window.bdMarkNavigationClean?.();window.location.replace(M+"/setup")';
const count = source.split(anchor).length - 1;
if (source.includes(replacement)) {
  console.log('Registration navigation v448 already applied');
} else {
  if (count !== 1 || !source.includes('function Dle()')) {
    throw new Error('Registration navigation anchor changed');
  }
  fs.writeFileSync(file, source.replace(anchor, replacement));
  console.log('Registration navigation v448 applied');
}