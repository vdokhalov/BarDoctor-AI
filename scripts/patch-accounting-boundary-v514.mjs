import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const start = '/* accounting-boundary-v514:start */', end = '/* accounting-boundary-v514:end */';
const originalEffect = 'S.useEffect(()=>{let active=true;setState(null);setError(null);setBusy(false);if(props.open&&Number.isSafeInteger(venueId))bdMonthRequestPhase3a8("/api/month-close?monthKey="+encodeURIComponent(props.monthKey)+"&venueId="+venueId).then(value=>{if(active)setState({key,...value})}).catch(value=>{if(active)setError(value.message)});return()=>{active=false}},[props.open,key]);';
const revisedEffect = 'S.useEffect(()=>{let active=true,sequence=0;setState(null);setError(null);setBusy(false);const refresh=()=>{if(!props.open||!Number.isSafeInteger(venueId))return;const request=++sequence;setBusy(true);setError(null);bdMonthRequestPhase3a8("/api/month-close?monthKey="+encodeURIComponent(props.monthKey)+"&venueId="+venueId).then(value=>{if(active&&request===sequence)setState({key,...value})}).catch(value=>{if(active&&request===sequence){setState(null);setError(value.message)}}).finally(()=>{if(active&&request===sequence)setBusy(false)})};const saved=event=>{if(event.detail?.venueId===venueId&&[props.monthKey+"-01",bdMonthMeta(props.monthKey).nextStart].includes(event.detail.date))refresh()};refresh();window.addEventListener("bd:accounting-boundary-saved",saved);return()=>{active=false;++sequence;window.removeEventListener("bd:accounting-boundary-saved",saved)}},[props.open,key]);';
function replaceOnce(source, before, after) {
  if (source.includes(after)) return source;
  if (source.split(before).length !== 2) throw Error('Accounting boundary unique target missing');
  return source.replace(before, after);
}
export function patchAccountingBoundaryV514(source) {
  const fragment = fs.readFileSync(path.join(root, 'scripts/fragments/accounting-boundary-v514.fragment.txt'), 'utf8').trim();
  if (source.includes(start)) {
    if (source.split(start).length !== 2 || source.split(end).length !== 2) throw Error('Ambiguous accounting editor block');
    source = source.slice(0, source.indexOf(start)) + source.slice(source.indexOf(end) + end.length).replace(/^\n/, '');
  }
  const declaration = 'function bdMonthClosingStepBody('; const index = source.indexOf(declaration);
  if (index < 0 || source.indexOf(declaration, index + 1) >= 0) throw Error('Unique closing step required');
  source = source.slice(0, index) + fragment + '\n' + source.slice(index);
  const from = source.indexOf('if(e===2||e===3){', index + fragment.length);
  const to = source.indexOf('if(e===4){', from);
  if (from < 0 || to < 0) throw Error('Closing boundary steps missing');
  source = source.slice(0, from) + 'if(e===2||e===3){return i.jsx(bdAccountingBoundaryStepV514,{report:t,step:e,settings:a},t.meta.key+":"+e)}' + source.slice(to);
  return replaceOnce(source, originalEffect, revisedEffect);
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const file = path.join(root, 'public/assets/index-BQGspy0I.js'); const source = fs.readFileSync(file, 'utf8');
  const output = patchAccountingBoundaryV514(source);
  if (patchAccountingBoundaryV514(output) !== output) throw Error('Accounting patch replay unstable');
  if (source !== output) fs.writeFileSync(file, output);
}
