import fs from 'node:fs';
import path from 'node:path';
import {randomUUID,randomBytes} from 'node:crypto';
import {Queue} from './queue.mjs';
import {endpoint,send} from './transports.mjs';
import {cloudClient,syncOnce} from './cloud.mjs';
import {credential} from './credentials.mjs';
const [configFile,command,...args]=process.argv.slice(2);
if(!configFile||!['import','status','run','retry','confirm','copy','test','pair','watch','sync'].includes(command)){console.error('Usage: node cli.mjs config.json import|status|run|retry|confirm|copy|test [file / jobId / printerId] [reason]');process.exit(1)}
const config=JSON.parse(fs.readFileSync(configFile,'utf8'));
if(config.site&&['run','import','test'].includes(command))throw Error('Cloud node uses sync/watch only; manual delivery cannot bypass cloud authorization');
const dbPath=path.resolve(path.dirname(configFile),config.database);
fs.mkdirSync(path.dirname(dbPath),{recursive:true});
let q;
try{
 q=new Queue(dbPath,config.venueId);q.recover();
 const route=id=>endpoint(config.printers?.[id]);
 const credentialFile=path.resolve(path.dirname(configFile),config.credentialFile||'state/node.dpapi');
 if(command==='pair'){
  // Pairing JSON goes through stdin; token is generated locally and never printed.
  let input='';for await(const chunk of process.stdin){input+=chunk;if(input.length>4096)throw Error('Pairing input too large')}
  const pairing=JSON.parse(input);if(pairing.accountId!==config.accountId||pairing.venueId!==config.venueId)throw Error('Pairing scope mismatch');
  if(pairing.replacement&&q.list().length)throw Error('Replacement requires a NEW empty state directory; preserve the old journal');
  let token;if(fs.existsSync(credentialFile))token=await credential('unprotect',fs.readFileSync(credentialFile,'utf8'));else{token=randomBytes(32).toString('hex');const protectedValue=await credential('protect',token);fs.mkdirSync(path.dirname(credentialFile),{recursive:true});const fd=fs.openSync(credentialFile,'wx',0o600);try{fs.writeFileSync(fd,protectedValue);fs.fsyncSync(fd)}finally{fs.closeSync(fd)}}
  for(const id of Object.keys(config.printers||{}))route(id);
  await cloudClient(config,null)('pair',{code:pairing.code,token,printers:Object.keys(config.printers).map(id=>({id,name:config.printers[id].name||id}))});console.log('Node paired; credential protected for this Windows user');
 }
 if(command==='watch'||command==='sync'){
  const token=await credential('unprotect',fs.readFileSync(credentialFile,'utf8')),api=cloudClient(config,token);let stop=false;
  process.on('SIGINT',()=>{stop=true});process.on('SIGTERM',()=>{stop=true});
  do{try{console.log(JSON.stringify(await syncOnce(q,config,api)))}catch(e){console.error(e.message);if(e.status===401||e.status===403||command==='sync')throw e}if(command==='watch'&&!stop)await new Promise(r=>setTimeout(r,5000));}while(command==='watch'&&!stop);
 }

 if(command==='import'){const stat=fs.statSync(args[0]);if(stat.size>2_000_000)throw Error('Import too large');q.import(JSON.parse(fs.readFileSync(args[0],'utf8')))}
 if(command==='test'){route(args[0]);q.import({version:1,venueId:config.venueId,tickets:[{id:'test:'+randomUUID(),venueId:config.venueId,orderId:'TEST',tableNumber:'TEST',sectionId:'TEST',sectionName:'Проверка принтера',printerId:args[0],routeRevision:0,kind:'TEST',createdAt:new Date().toISOString(),lines:[{name:'Тест: АБВГД абвгд Ёё 123',quantity:1}]}]})}
 if(command==='run'){while(await q.runOne(route,send)){} }
 if(command==='retry')q.retry(args[0]);
 if(command==='confirm')q.confirm(args[0],args[1]);
 if(command==='copy')console.log('Copy job:',q.copy(args[0],args[1]));
 console.log(JSON.stringify(q.list().map(({id,printer,status,copy_of,detail})=>({id,printer,status,copyOf:copy_of,detail})),null,2));
}catch(e){console.error(e.message);process.exitCode=1}finally{q?.close()}
