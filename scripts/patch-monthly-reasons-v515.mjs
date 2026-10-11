import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export function patchMonthlyReasonsV515(source) {
  const changes = [
    ['const closed=current?.closing||props.closure,report=current?.report||props.report,blocked=', 'const closed=current?.closing||props.closure,report=current?.report?{...current.report,...(closed?.status!=="closed"?{_verificationReasonsV515:current.reasons||[],_verificationReasonDetailsV515:current.reasonDetails||[],_verificationReasonDetailsTruncatedV515:current.reasonDetailsTruncated===true}:{})}:props.report,blocked='],
    ['children:[i.jsx("p",{style:{fontSize:10.5,fontWeight:900,letterSpacing:".1em",color:"#6366F1",textTransform:"uppercase"},children:"Шаг "+(h+1)+" из 8"})', 'children:[i.jsx(bdMonthlyPendingReasonsV513,{reasons:n._verificationReasonsV515||[],reasonDetails:n._verificationReasonDetailsV515||[],reasonDetailsTruncated:n._verificationReasonDetailsTruncatedV515,monthKey:t,venueId:bdMonthlyVenueIdPhase7(null,s)}),i.jsx("p",{style:{fontSize:10.5,fontWeight:900,letterSpacing:".1em",color:"#6366F1",textTransform:"uppercase"},children:"Шаг "+(h+1)+" из 8"})'],
  ];
  for (const [before, after] of changes) {
    if (source.includes(after)) continue;
    if (source.split(before).length !== 2) throw Error('Monthly reason wizard anchor missing or ambiguous');
    source = source.replace(before, after);
  }
  return source;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const file = path.join(root, 'public/assets/index-BQGspy0I.js'); const source = fs.readFileSync(file, 'utf8');
  const output = patchMonthlyReasonsV515(source);
  if (patchMonthlyReasonsV515(output) !== output) throw Error('Monthly reasons replay unstable');
  if (source !== output) fs.writeFileSync(file, output);
}
