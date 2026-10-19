import fs from 'node:fs';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {Queue} from './queue.mjs';
import {endpoint,send} from './transports.mjs';
const [configFile,command,...args]=process.argv.slice(2);
if(!configFile||!['import','status','run','retry','confirm','copy','test'].includes(command)){console.error('Usage: node cli.mjs config.json import|status|run|retry|confirm|copy|test [file / jobId / printerId] [reason]');process.exit(1)}
const config=JSON.parse(fs.readFileSync(configFile,'utf8'));
const dbPath=path.resolve(path.dirname(configFile),config.database);
fs.mkdirSync(path.dirname(dbPath),{recursive:true});
let q;
try{
 q=new Queue(dbPath,config.venueId);q.recover();
 const route=id=>endpoint(config.printers?.[id]);
 if(command==='import'){const stat=fs.statSync(args[0]);if(stat.size>2_000_000)throw Error('Import too large');q.import(JSON.parse(fs.readFileSync(args[0],'utf8')))}
 if(command==='test'){route(args[0]);q.import({version:1,venueId:config.venueId,tickets:[{id:'test:'+randomUUID(),venueId:config.venueId,orderId:'TEST',tableNumber:'TEST',sectionId:'TEST',sectionName:'Проверка принтера',printerId:args[0],routeRevision:0,kind:'TEST',createdAt:new Date().toISOString(),lines:[{name:'Тест: АБВГД абвгд Ёё 123',quantity:1}]}]})}
 if(command==='run'){while(await q.runOne(route,send)){} }
 if(command==='retry')q.retry(args[0]);
 if(command==='confirm')q.confirm(args[0],args[1]);
 if(command==='copy')console.log('Copy job:',q.copy(args[0],args[1]));
 console.log(JSON.stringify(q.list().map(({id,printer,status,copy_of,detail})=>({id,printer,status,copyOf:copy_of,detail})),null,2));
}catch(e){console.error(e.message);process.exitCode=1}finally{q?.close()}
