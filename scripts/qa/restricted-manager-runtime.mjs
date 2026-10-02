import { createServer } from 'node:http';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve, extname } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { build } from 'esbuild';

/** Exact tree handlers/client assets; disposable migrated SQLite, no production bindings. */
export async function restrictedManagerRuntime(root = process.cwd()) {
  const runtimeBundle = await build({stdin:{contents:"export { lifecycleRuntime } from './tests/helpers/lifecycle-runtime.ts'",resolveDir:root},bundle:true,format:'cjs',platform:'node',write:false,define:{'import.meta.url':JSON.stringify(pathToFileURL(resolve(root,'tests/helpers/lifecycle-runtime.ts')).href)},external:['cloudflare:workers','esbuild'],logLevel:'silent'});
  const loaded={exports:{}};const require=createRequire(resolve(root,'package.json'));
  new Function('require','module','exports','__filename','__dirname',runtimeBundle.outputFiles[0].text)(require,loaded,loaded.exports,resolve(root,'tests/helpers/lifecycle-runtime.ts'),resolve(root,'tests/helpers'));
  const files=readdirSync(resolve(root,'app/api'),{recursive:true}).filter(p=>p.endsWith('route.ts'));
  const routes={};const names={};for(const [i,file] of files.entries()){const name='route'+i;routes[name]='./app/api/'+file;names[file.slice(0,-'/route.ts'.length)] = name;}
  routes.shell='./app/bar-doctor-startup-v411';routes.journal='./app/sales-import/route';routes.cashier='./app/cashier/route';routes.manual='./app/sales-entry/route';routes.overview='./app/assortment/route';routes.reviewsPage='./app/reviews/route';routes.integrationPage='./app/integrations/route';
  // lifecycleRuntime resolves migrations and modules from its own exact tree.
  const r=await loaded.exports.lifecycleRuntime(routes);
  const owner=await r.register('owner@isolated.test'),foreign=await r.register('foreign@isolated.test');
  const venueId=owner.activeVenueId;
  const workspaceId=Number(r.sqlite.prepare('SELECT workspace_id id FROM venues WHERE id=?').get(venueId).id);
  const profile={name:'Isolated Restricted Manager QA',currency:'MDL',timezone:'UTC',trackingStartDate:'2026-10-01'};
  r.sqlite.prepare('UPDATE accounts SET restaurant_json=? WHERE id=?').run(JSON.stringify(profile),owner.userId);
  const invited=async(email,deny)=>{
    const request=r.request(owner,'/api/access','POST',{role:'manager',permissions:{deny}});request.headers.set('X-Venue-Id',String(venueId));
    const invitation=await r.api[names.access].POST(request);const body=await invitation.json();if(invitation.status!==201)throw Error(JSON.stringify(body));
    const registered=await r.api.register.POST(new Request('http://isolated.test/api/auth/register',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password:'Isolated-Test-Password-123!',firstName:'QA manager',invitationCode:body.invite.code,registrationMode:'join'})}));
    const user=await registered.json();if(registered.status!==201)throw Error(JSON.stringify(user));if(user.activeVenueId!==venueId)throw Error('Invited user must have only the primary QA venue');return user;
  };
  const manager=await invited('restricted@isolated.test',['finance.view']),permitted=await invited('permitted@isolated.test',[]);
  const put=(key,value)=>r.sqlite.prepare('INSERT INTO domain_data(account_id,store_key,data_json,updated_at) VALUES (?,?,?,?) ON CONFLICT(account_id,store_key) DO UPDATE SET data_json=excluded.data_json,updated_at=excluded.updated_at').run(owner.userId,key,JSON.stringify(value),'2026-10-02T09:00:00Z');
  put('bd_finance_expenses',[{id:'private-expense',venueId,date:'2026-10-02',amount:98765,currency:'MDL',category:'other',description:'FINANCE PRIVATE SENTINEL'}]);
  put('bd_finance_revenue',[]);put('bd_finance_gap_reasons',[]);put('bd_assortment_v1',{menuItems:[],recipes:[],nomenclature:[],stockBalances:[]});put('bd_stock_movements',[]);put('bd_employees',[]);put('bd_guest_reviews',[]);put('bd_equipment',[]);
  const network=[];let inject=null;
  const routePatterns=Object.entries(names).filter(([path])=>!path.includes('[...')).sort(([a],[b])=>Number(a.includes('['))-Number(b.includes('['))).map(([path,name])=>({name,regex:new RegExp('^/api/'+path.replace(/\[([^\]]+)\]/g,'([^/]+)')+'$'),params:[...path.matchAll(/\[([^\]]+)\]/g)].map(m=>m[1])}));
  const server=createServer(async(req,res)=>{
    try{
      const url=new URL(req.url||'/','http://127.0.0.1'),chunks=[];for await(const c of req)chunks.push(Buffer.from(c));const bytes=Buffer.concat(chunks);
      const request=new Request(url,{method:req.method,headers:req.headers,...(bytes.length?{body:bytes}:{})});let response;
      if(inject&&url.pathname===inject.path)response=Response.json(inject.body,{status:inject.status});
      else if(url.pathname.startsWith('/api/')){
        const match=routePatterns.map(p=>({p,m:url.pathname.match(p.regex)})).find(x=>x.m);const fn=match&&r.api[match.p.name]?.[req.method||'GET'];
        response=fn?await fn(request,{params:Promise.resolve(Object.fromEntries(match.p.params.map((p,i)=>[p,match.m[i+1]])))}):Response.json({ok:false,code:'QA_ROUTE_MISSING',path:url.pathname},{status:404});
      }else if(url.pathname==='/__qa_api_probe')response=new Response('<!doctype html><title>Isolated API authorization probe</title>',{headers:{'Content-Type':'text/html'}});
      else if(url.pathname==='/cashier')response=await r.api.cashier.GET(request);
      else if(url.pathname==='/sales-entry')response=await r.api.manual.GET(request);
      else if(url.pathname==='/sales-import')response=await r.api.journal.GET(request);
      else if(url.pathname==='/assortment')response=await r.api.overview.GET(request);
      else if(url.pathname==='/reviews')response=await r.api.reviewsPage.GET(request);
      else if(url.pathname==='/integrations')response=await r.api.integrationPage.GET(request);
      else if(extname(url.pathname)){
        const path=resolve(root,'public','.'+url.pathname);response=path.startsWith(resolve(root,'public')+'/')&&existsSync(path)?new Response(readFileSync(path),{headers:{'Content-Type':({'.js':'application/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.webmanifest':'application/json','.json':'application/json','.woff2':'font/woff2'})[extname(path)]||'application/octet-stream'}}):new Response(null,{status:404});
      }else response=await r.api.shell.barDoctorStartupResponseV411();
      if(url.pathname.startsWith('/api/'))network.push({path:url.pathname,status:response.status,method:req.method,body:response.status>=400?await response.clone().json().catch(()=>null):undefined});
      res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));
    }catch(error){console.error(error);res.writeHead(500);res.end('Isolated QA runtime failure');}
  });
  await new Promise(done=>server.listen(0,'127.0.0.1',done));
  return {...r,owner,manager,permitted,foreign,venueId,workspaceId,profile,put,network,base:'http://127.0.0.1:'+server.address().port,inject:next=>{inject=next},close:async()=>{await new Promise(done=>server.close(done));r.close()}};
}
