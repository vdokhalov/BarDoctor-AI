import {pathToFileURL} from 'node:url';
export const fullGates=['auth-recovery-p0','verify-core','verify-browser','sales-navigation','sales-scroll-layout'];
export function assertRequiredGates(jobs){
  if(jobs.changes?.result!=='success')throw Error('classification must succeed');
  const mode=jobs.changes.outputs?.mode;
  if(!['full','sales-css','storage-migration'].includes(mode))throw Error('unknown classification');
  for(const name of [...fullGates,'sales-presentation','storage-migration']){
    const selected=mode==='full'?fullGates.includes(name):name===(mode==='sales-css'?'sales-presentation':'storage-migration');
    const expected=selected?'success':'skipped';
    if(jobs[name]?.result!==expected)throw Error(name+' must be '+expected+', got '+jobs[name]?.result);
  }
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)assertRequiredGates(JSON.parse(process.env.REQUIRED_RESULTS||'{}'));
