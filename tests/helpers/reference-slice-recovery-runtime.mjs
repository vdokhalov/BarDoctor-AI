import {createServer} from 'node:http';
import {readFileSync,existsSync,readdirSync,mkdtempSync,rmSync} from 'node:fs';
import {resolve,extname} from 'node:path';
import {tmpdir} from 'node:os';
import {execFileSync} from 'node:child_process';
import {isolatedForgotPasswordDocument} from './reference-slice-recovery-ssr.mjs';
import {curatedDoctorFixture} from './curated-doctor-fixture.ts';

export const BASELINE='b7708cadb01ff8e8ee11c1bcfdab448c15068878';

export function baselinePublicRoot(){
  const root=mkdtempSync(resolve(tmpdir(),'bardoctor-v489-parity-'));
  const archive=execFileSync('git',['archive',BASELINE,'public','app/bar-doctor-response.ts','lib/bardoctor/version.ts','lib/bardoctor/app-shell.ts'],{maxBuffer:128*1024*1024});
  execFileSync('tar',['-x','-C',root],{input:archive});
  return {root,close:()=>rmSync(root,{recursive:true,force:true})};
}

/** Actual unchanged handlers, migrations and embedded documents; all data is local SQLite. */
export async function recoveryRuntime(root=process.cwd()){
  const routes=readdirSync('app',{recursive:true}).filter(p=>p.endsWith('/route.ts'));
  const definitions=routes.map((p,i)=>({name:'recoveryRoute'+i,path:'/'+p.slice(0,-9),file:'./app/'+p}));
  const r=await curatedDoctorFixture(Object.fromEntries(definitions.map(d=>[d.name,d.file])));
  r.seed('bd_cases',[{id:'qa-critical',venueId:r.venueId,title:'Проверить критическое происшествие',description:'Isolated recovery fixture',photos:[],files:[],comments:[],history:[],timeline:[],responsible:'QA Бариста',type:'inspection',priority:'critical',status:'open',createdAt:'2026-10-01T12:00:00Z'}]);
  r.seed('bd_events',[{id:'qa-event',venueId:r.venueId,title:'QA событие',text:'Isolated recovery event',description:'QA',type:'incident',category:'operations',priority:'low',status:'open',responsible:'',participantIds:[],voiceNote:null,extraField:'',eventDate:'2026-10-02T12:00:00Z',date:'2026-10-02',createdAt:'2026-10-02T12:00:00Z',photos:[],files:[],comments:[],history:[],timeline:[]}]);
  r.seed('bd_equipment',[{id:'qa-equipment',venueId:r.venueId,name:'QA оборудование',category:'coffee',status:'active',photos:[],history:[],maintenance:[],purchaseDate:'2026-09-01',purchasePrice:100,currency:'MDL'}]);
  r.seed('bd_equipment_history',[]);r.seed('bd_equipment_work_orders',[]);
  const html=await import(root+'/app/bar-doctor-response.ts');
  const requests=[];
  const server=createServer(async(req,res)=>{
    try{
      const url=new URL(req.url||'/',`http://${req.headers.host}`),chunks=[];
      for await(const chunk of req)chunks.push(Buffer.from(chunk));const body=Buffer.concat(chunks);
      const request=new Request(url,{method:req.method,headers:req.headers,...(body.length?{body}:{})});
      let response;
      if(url.pathname.startsWith('/api/')){
        const candidates=definitions.filter(d=>d.path.startsWith('/api/')).sort((a,b)=>a.path.includes('[')-b.path.includes('['));
        const route=candidates.find(d=>new RegExp('^'+d.path.replace(/\[([^\]]+)\]/g,'([^/]+)')+'$').test(url.pathname));
        if(route){
          const names=[...route.path.matchAll(/\[([^\]]+)\]/g)].map(m=>m[1]);
          const match=url.pathname.match(new RegExp('^'+route.path.replace(/\[([^\]]+)\]/g,'([^/]+)')+'$'));
          const params=Object.fromEntries(names.map((name,i)=>[name,decodeURIComponent(match[i+1])]));
          const handler=r.api[route.name]?.[req.method||'GET'];
          response=handler?await handler(request,{params:Promise.resolve(params)}):new Response(null,{status:405});
        }else response=Response.json({error:'No actual API route'},{status:404});
      }else if(url.pathname==='/forgot-password'){response=await isolatedForgotPasswordDocument();
      }else if(!extname(url.pathname)){
        const doc=definitions.find(d=>d.path===url.pathname&&!d.path.startsWith('/api/'));
        response=doc&&url.searchParams.get('embedded')==='1'?await r.api[doc.name].GET(request):html.barDoctorResponse();
      }else{
        let file=resolve(root,'public','.'+url.pathname);
        if(!existsSync(file)&&/\/assets\/index-BQGspy0I-[a-f0-9]+\.js$/.test(file))file=resolve(root,'public/assets/index-BQGspy0I.js');
        response=file.startsWith(root+'/public/')&&existsSync(file)?new Response(readFileSync(file),{headers:{'Content-Type':({'.html':'text/html; charset=utf-8','.js':'application/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.woff2':'font/woff2'})[extname(file)]||'application/octet-stream'}}):new Response(null,{status:404});
      }
      requests.push({method:req.method,path:url.pathname,status:response.status,venue:req.headers['x-venue-id']??null});
      res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));
    }catch(error){requests.push({method:req.method,path:req.url,status:500,error:String(error)});res.writeHead(500);res.end('Isolated recovery fixture error');}
  });
  await new Promise(done=>server.listen(0,'127.0.0.1',done));
  return {fixture:r,requests,base:`http://127.0.0.1:${server.address().port}`,close:async()=>{await new Promise(done=>server.close(()=>done()));r.close();}};
}
