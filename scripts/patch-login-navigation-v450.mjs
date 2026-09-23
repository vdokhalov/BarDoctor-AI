import fs from 'node:fs';

const file = new URL('../public/assets/index-BQGspy0I.js', import.meta.url);
const source = fs.readFileSync(file, 'utf8');
const anchor = 'function bdAuthCompleteLoginV248(){const e=bdAuthHomeTargetV248();';
const replacement = anchor + 'window.bdMarkNavigationClean?.(document.querySelector(".bd-auth-login form"));';
if (source.includes(replacement)) {
  console.log('Login navigation v450 already applied');
} else {
  if (source.split(anchor).length - 1 !== 1) {
    throw new Error('Login navigation anchor changed');
  }
  fs.writeFileSync(file, source.replace(anchor, replacement));
  console.log('Login navigation v450 applied');
}