import fs from 'node:fs';
import path from 'node:path';
import { patchReferenceSlice } from './patch-reference-slice-v1.mjs';
import { restoreStableUiV485 } from './lib/stable-ui-v485.mjs';
await patchReferenceSlice(true);
const root=path.resolve(import.meta.dirname,'..'),file=path.join(root,'public/assets/index-BQGspy0I.js');
const start='/* curated-doctor-phase4c:start */',end='/* curated-doctor-phase4c:end */';
let source=fs.readFileSync(file,'utf8');
const patches=[
 ['children:e}),t&&i.jsx(Tle,{})]','children:[i.jsx(bdCuratedReturnPhase4c,{}),e]}),t&&i.jsx(Tle,{})]'],
 ['i.jsxs(qe,{mode:"wait",children:[v==="idle"','i.jsx(bdCuratedDoctorPhase4c,{ready:bdAiCloudReady}),i.jsxs(qe,{mode:"wait",children:[v==="idle"'],
 ['i.jsx(bdManagementQueuePhase4b,{venue:Number(bdCostHealthVenue.activeVenueId),onNavigate:e}),','i.jsx(bdManagementQueuePhase4b,{venue:Number(bdCostHealthVenue.activeVenueId),onNavigate:e}),i.jsx(bdCuratedHealthSuggestionPhase4c,{venue:Number(bdCostHealthVenue.activeVenueId),snapshot:n,onNavigate:e}),'],
];
const at=source.indexOf(start);if(at>=0){const to=source.indexOf(end,at);if(to<0)throw Error('Incomplete Phase 4C client');source=source.slice(0,at)+source.slice(to+end.length).replace(/^\n/,'');}
for(const[before,after]of patches)source=source.replace(after,before);
source=source.replaceAll('navigate:path=>window.bdNavigate(bdCuratedClientPhase4c.returnPath(path))','navigate:path=>window.bdNavigate(path)');
source=source.replaceAll('i.jsx(bdManagementVerificationPhase4b,{venue:Number(bdCostHealthVenue.activeVenueId)}),','');
if(process.argv.includes('--restore')){fs.writeFileSync(file,source);process.exit(0);}
// Owner selected the interface before Phase 4B/C, not merely before V1.2.
// Retain all current server contracts and independent client fixes. The guard
// restores presentation only after the normal preparation pipeline finishes.
source=restoreStableUiV485(source);fs.writeFileSync(file,source);
console.info('Stable v485 Home, Health and legacy Doctor presentation restored; current APIs retained.');
