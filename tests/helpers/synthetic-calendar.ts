import {lifecycleRuntime} from './lifecycle-runtime';
// Synthetic delta at the already-verified source boundary, NOT a signature test.
// No fixture is published; names/dates exercise the existing reviewed rule allowlist.
export async function syntheticDeltaRuntime(){
 let revision='synthetic-A',events=[{date:'2028-01-01',sourceName:'Новый год',category:'public'},{date:'2028-05-09',sourceName:'День Победы',category:'public'},{date:'2028-02-23',sourceName:'День защитника Отечества',category:'public'}];
 const source={signedSourceEnabled:()=>true,signedSourceStatus:async()=>({enabled:true,due:false,error:false,revision,lastSuccess:Date.parse('2027-07-01T10:00:00Z')}),refreshSignedSource:async()=>({status:'not_due'}),readSignedSource:async()=>({revision,checkedAt:'2027-07-01T10:00:00Z',feed:{years:[2027,2028],countries:{RU:{events}}}})};
 const r=await lifecycleRuntime({opportunities:'./app/api/opportunities/route',feed:'./lib/bardoctor/holiday-feed'},{now:'2027-07-01T10:00:00Z',plugins:[{name:'synthetic-verified-source-boundary',setup(b){b.onResolve({filter:/holiday-signed-source$/},()=>({path:'synthetic-signed-source',external:true}))}}],modules:{'synthetic-signed-source':source}});
 const user=await r.register('delta@local.test');r.sqlite.prepare('UPDATE accounts SET restaurant_json=? WHERE id=?').run(JSON.stringify({name:'Synthetic delta QA',country:'Россия',city:'Тест'}),user.userId);
 const api=r.api as any;
 async function open(){const before=await(await api.opportunities.GET(r.request(user,'/api/opportunities'))).json();return before.sync.due&&before.sync.allowed?await(await api.opportunities.POST(r.request(user,'/api/opportunities','POST',{action:'refresh',automatic:true}))).json():before;}
 function next(){revision='synthetic-B';events=[{date:'2028-01-01',sourceName:'Новогодние каникулы',category:'public'},{date:'2028-05-10',sourceName:'День Победы',category:'public'},{date:'2028-02-24',sourceName:'День защитника Отечества',category:'public'},{date:'2028-06-12',sourceName:'День России',category:'public'},{date:'2028-06-13',sourceName:'Неоднозначная поправка А',category:'public'},{date:'2028-06-13',sourceName:'Неоднозначная поправка Б',category:'public'},{date:'2028-06-14',sourceName:'Международный женский день',category:'public'},{date:'2028-06-15',sourceName:'Международный женский день',category:'public'}];}
 return {r,user,api,open,next};
}
