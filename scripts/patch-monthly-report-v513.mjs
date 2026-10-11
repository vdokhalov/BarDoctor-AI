import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export function patchMonthlyReportV513(source, fragment = fs.readFileSync(path.join(root, 'scripts/fragments/monthly-report-v165.fragment.txt'), 'utf8')) {
  const start = '/* bd-monthly-report-v165:start */', end = '/* bd-monthly-report-v165:end */';
  if (source.split(start).length !== 2 || source.split(end).length !== 2 || !fragment.includes('function bdMonthlyReadControllerV513')) throw new Error('Unique monthly report block and v513 fragment required');
  const from = source.indexOf(start), to = source.indexOf(end, from);
  source = source.slice(0, from) + fragment.trim() + source.slice(to + end.length);
  for (const [before, after] of [
    ['function bdFinanceQuickActionsV160({navigate:e,onCloseMonth:t})', 'function bdFinanceQuickActionsV160({navigate:e,onCloseMonth:t,monthKey})'],
    ['action:()=>e("/reports")', 'action:()=>e("/reports?month="+encodeURIComponent(monthKey))'],
    ['onReport:()=>navigate("/reports")', 'onReport:()=>navigate("/reports?month="+encodeURIComponent(monthKey))'],
    ['i.jsx(bdFinanceQuickActionsV160,{navigate,onCloseMonth:', 'i.jsx(bdFinanceQuickActionsV160,{navigate,monthKey,onCloseMonth:'],
  ]) {
    if (source.includes(before)) {
      if (source.split(before).length !== 2) throw new Error('Ambiguous Finance navigation anchor');
      source = source.replace(before, after);
    } else if (!source.includes(after)) throw new Error('Missing Finance navigation anchor');
  }
  return source;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const file = path.join(root, 'public/assets/index-BQGspy0I.js');
  const source = fs.readFileSync(file, 'utf8'), output = patchMonthlyReportV513(source);
  if (patchMonthlyReportV513(output) !== output) throw new Error('Monthly v513 replay is not stable');
  if (source !== output) fs.writeFileSync(file, output);
  console.log('Monthly v513 scoped server report and period navigation applied');
}
