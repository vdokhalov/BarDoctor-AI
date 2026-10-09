import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdirSync,writeFileSync} from 'node:fs';
import {lifecycleRuntime} from '../tests/helpers/lifecycle-runtime.ts';
import {HEALTH_OPERATIONS_KEYS} from '../lib/bardoctor/health-operations-inputs.ts';
import {VENUE_CONTEXT_SOURCES} from '../lib/bardoctor/venue-context-access.ts';
const HEALTH_INPUT_KEYS=[...new Set([...HEALTH_OPERATIONS_KEYS,...Object.values(VENUE_CONTEXT_SOURCES).flat(),'bd_tasks','bd_action_tasks','bd_decisions'])];
const baseline=process.env.BD_RECOVERY_BASELINE;
const plugins=baseline?[{name:'exact-baseline',setup(build){build.onLoad({filter:/\/lib\/bardoctor\/.*\.ts$/},args=>({contents:execFileSync('git',['show',baseline+':'+args.path.split('/BarDoctor-AI/')[1]],{encoding:'utf8'}),loader:'ts'}));}}]:[];
const r=await lifecycleRuntime({health:'./app/api/business-health/route',doctor:'./app/api/ai/[action]/route'},{plugins,now:'2026-10-08T12:00:00Z'});
const out=process.env.BD_RECOVERY_OUTPUT??'outputs/health-doctor-recovery';mkdirSync(out,{recursive:true});
try{
 const user=await r.register('cpu@isolated.test'),venue=user.activeVenueId;
 const account=r.sqlite.prepare('SELECT data_account_id FROM venues WHERE id=?').get(venue).data_account_id;
 const seed=(key,value)=>{const json=JSON.stringify(value);assert.ok(Buffer.byteLength(json)<2000000,'QA store exceeds production source budget: '+key);return r.sqlite.prepare('INSERT INTO domain_data(account_id,store_key,data_json,updated_at) VALUES(?,?,?,?) ON CONFLICT(account_id,store_key) DO UPDATE SET data_json=excluded.data_json').run(account,key,json,'2026-10-08T12:00:00Z');};
 r.sqlite.prepare('UPDATE accounts SET restaurant_json=? WHERE id=?').run(JSON.stringify({name:'Isolated CPU QA',currency:'MDL',timezone:'UTC'}),account);
 for(const key of HEALTH_INPUT_KEYS)seed(key,[]);
 const results=[];
 for(const scenario of (process.env.BD_RECOVERY_SCENARIOS??'linked,unlinked').split(',')){
  const count=Number(process.env.BD_RECOVERY_PRODUCTS??500),menus=Number(process.env.BD_RECOVERY_MENUS??30);
  const nomenclature=Array.from({length:count},(_,i)=>({id:'n'+i,key:'p'+i,productKey:'p'+i,name:'Product '+i,unit:'pcs',unitModelVersion:4,active:true,venueId:venue}));
  const menuItems=Array.from({length:menus},(_,i)=>({id:'m'+i,name:'Menu '+i,venueId:venue,active:true,consumptionMode:'RECIPE',type:'composite',currency:'MDL',salePrice:40}));
  const recipes=menuItems.map((item,i)=>({id:'r'+i,menuItemId:item.id,ownerId:item.id,ownerType:'menu_item',venueId:venue,status:'confirmed',reviewStatus:'approved',current:true,version:1,ingredients:Array.from({length:3},(_,j)=>({id:'i'+i+'-'+j,name:scenario==='linked'?'Product '+((i*3+j)%count):'Unmatched '+i+' '+j,quantity:1,unit:'pcs',...(scenario==='linked'?{purchaseProductKey:'p'+((i*3+j)%count),nomenclatureItemId:'n'+((i*3+j)%count),linkSource:'manual',linkConfirmedByUser:true,linkStatus:'linked'}:{}),venueId:venue}))}));
  const movements=Array.from({length:Number(process.env.BD_RECOVERY_MOVEMENTS??4000)},(_,i)=>({id:'receipt'+i,type:'receipt',productKey:'p'+(i%count),amount:10,unit:'pcs',costAmount:i%7===0?0:20,costStatus:'KNOWN_VALUE',currency:'MDL',date:'2026-10-01',createdAt:'2026-10-01T12:00:00Z',status:'confirmed',venueId:venue}));
  const assortment={menuItems,recipes,nomenclature,stockBalances:[]};seed('bd_assortment_v1',assortment);seed('bd_stock_movements',movements);
  const days=Array.from({length:1000},(_,i)=>({id:'day'+i,venueId:venue,date:new Date(Date.UTC(2026,9,8)-(999-i)*86400000).toISOString().slice(0,10),revenue:100,currency:'MDL',receipts:5,guests:5,closingStatus:'closed',closedVia:'guided-v17',payrollBreakdown:{total:0}}));seed('bd_finance_revenue',days);seed('bd_operational_reports_v1',days);
  const before=r.sqlite.prepare('SELECT * FROM domain_data ORDER BY id').all();
  for(const question of (process.env.BD_RECOVERY_QUESTIONS??'health,attention,cost').split(',')){
   const path=question==='health'?'/api/business-health':question==='diagnosis'?'/api/ai/diagnosis':'/api/ai/curated?question='+question+'&venueId='+venue;
   if(question==='diagnosis')for(const key of ['OPENAI_API_KEY','ANTHROPIC_API_KEY','AI_INTEGRATIONS_ANTHROPIC_API_KEY'])assert.equal(Boolean(process.env[key]),false,'CPU QA must not use any AI credential');
   const request=r.request(user,path,question==='diagnosis'?'POST':'GET',question==='diagnosis'?{profile:{}}:undefined);request.headers.set('X-Venue-Id',String(venue));
   const started=process.cpuUsage(),wall=performance.now();
   const response=question==='health'?await r.api.health.GET(request):question==='diagnosis'?await r.api.doctor.POST(request,{params:Promise.resolve({action:'diagnosis'})}):await r.api.doctor.GET(request,{params:Promise.resolve({action:'curated'})});
   const body=await response.json(),cpu=process.cpuUsage(started),cpuMs=(cpu.user+cpu.system)/1000;
   assert.equal(response.status,200);if(question==='diagnosis')assert.equal(body.context.provider.available,false);assert.deepEqual(r.sqlite.prepare('SELECT * FROM domain_data ORDER BY id').all(),before);
   const result={mode:baseline??'candidate',scenario,question,products:count,menus,movements:movements.length,financialDays:days.length,cpuMs,wallMs:performance.now()-wall,status:cpuMs<5000?'PASS':cpuMs<10000?'TARGET_MISSED':'FAIL',actualHandlers:true,production:false};results.push(result);console.log(JSON.stringify(result));
   writeFileSync(`${out}/${baseline?'baseline':'candidate'}-cpu.json`,JSON.stringify(results,null,2));
   writeFileSync(`${out}/${baseline?'baseline':'candidate'}-${scenario}-${question}.json`,JSON.stringify(body,null,2));
  }
 }
 writeFileSync(`${out}/${baseline?'baseline':'candidate'}-cpu.json`,JSON.stringify(results,null,2));
 if(!baseline)assert.ok(results.every(result=>result.cpuMs<10000),'Hard CPU budget exceeded; see recorded measurements');
}finally{r.close();}
