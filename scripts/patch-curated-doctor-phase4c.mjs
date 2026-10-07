import fs from 'node:fs';
import path from 'node:path';
import { build } from 'esbuild';
import { patchReferenceSlice } from './patch-reference-slice-v1.mjs';
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
if(process.argv.includes('--restore')){fs.writeFileSync(file,source);process.exit(0);}
for(const[before,after]of patches){if(source.split(before).length!==2)throw Error('Unique Phase 4C anchor required: '+before);source=source.replace(before,after);}
source=source.replaceAll('navigate:path=>window.bdNavigate(path)','navigate:path=>window.bdNavigate(bdCuratedClientPhase4c.returnPath(path))');
const bundle=await build({entryPoints:[path.join(root,'lib/bardoctor/client/curated-doctor.tsx')],bundle:true,format:'iife',platform:'browser',globalName:'bdCuratedModulePhase4c',jsx:'transform',jsxFactory:'React.createElement',tsconfigRaw:{compilerOptions:{jsx:'react'}},minify:true,write:false});
const client=`const bdCuratedClientPhase4c=bdCuratedModulePhase4c.createCuratedDoctorClient(S,{headers:()=>ca(Ot()),venue:()=>Number(localStorage.getItem("bd_active_venue_id")),navigate:path=>window.bdNavigate(path)});function bdCuratedDoctorPhase4c(props){const venue=Number(bdUseProcVenueContextV168().activeVenueId);return i.jsx(bdCuratedClientPhase4c.Panel,{venue,ready:props.ready})}function bdCuratedHealthSuggestionPhase4c(props){return i.jsx(bdCuratedClientPhase4c.Suggestion,props)}function bdCuratedReturnPhase4c(){const venue=Number(bdUseProcVenueContextV168().activeVenueId);return i.jsx(bdCuratedClientPhase4c.Return,{venue,onlyAction:true})}`;
const anchor='function bdShiftDateLabelV156(';if(source.split(anchor).length!==2)throw Error('Unique Phase 4C insertion required');
source=source.replace(anchor,`${start}\n${bundle.outputFiles[0].text}\n${client}\n${end}\n${anchor}`);fs.writeFileSync(file,source);await patchReferenceSlice();console.info('Seven curated Doctor questions and approved reference slice applied over canonical sources.');
