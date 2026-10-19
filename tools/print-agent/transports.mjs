import net from 'node:net';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
export function beforeSend(message){return Object.assign(Error(message),{beforeSend:true})}
export function endpoint(value){
 if(!value||!['tcp','windows-raw'].includes(value.type)||!Number.isInteger(value.codePage)||value.codePage<0||value.codePage>255||![32,42,48].includes(value.columns)||typeof value.cut!=='boolean')throw beforeSend('Invalid printer profile');
 if(value.type==='tcp'&&(!net.isIP(value.host)||!Number.isInteger(value.port)||value.port<1||value.port>65535))throw beforeSend('TCP requires a locally configured literal IP and port');
 if(value.type==='windows-raw'&&(typeof value.queue!=='string'||!value.queue||value.queue.length>200||/[\x00-\x1f]/.test(value.queue)))throw beforeSend('Invalid Windows queue');
 return value.type==='tcp'?{type:value.type,host:value.host,port:value.port,codePage:value.codePage,columns:value.columns,cut:value.cut}:{type:value.type,queue:value.queue,codePage:value.codePage,columns:value.columns,cut:value.cut};
}
export function render(t,profile,isCopy=false){
 const p=endpoint(profile),text=[isCopy?'КОПИЯ':t.kind==='TEST'?'ТЕСТ ПЕЧАТИ':t.kind==='CANCELLATION'?'ОТМЕНА':'КУХНЯ / БАР',t.id,t.createdAt,'Стол: '+t.tableNumber,t.sectionName,...t.lines.map(l=>`${l.quantity} x ${l.name}`),...(t.reason?['Причина: '+t.reason]:[]),...(t.originalTicketId?['Исходный: '+t.originalTicketId]:[])].join('\n');
 const wrapped=text.split('\n').flatMap(line=>{const out=[];for(let i=0;i<line.length;i+=p.columns)out.push(line.slice(i,i+p.columns));return out}).join('\n')+'\n\n\n';
 const bytes=[];
 for(const c of wrapped){const n=c.charCodeAt(0);if(n===10||n>=32&&n<=126)bytes.push(n);else if(n>=0x410&&n<=0x43f)bytes.push(n-0x410+0x80);else if(n>=0x440&&n<=0x44f)bytes.push(n-0x440+0xe0);else if(c==='Ё')bytes.push(0xf0);else if(c==='ё')bytes.push(0xf1);else throw beforeSend('Character unsupported by CP866: '+c)}
 return Buffer.concat([Buffer.from([27,64,27,116,p.codePage]),Buffer.from(bytes),p.cut?Buffer.from([29,86,0]):Buffer.alloc(0)]);
}
export function tcpSend(p,bytes,timeout=10000){return new Promise((resolve,reject)=>{
 let connected=false,settled=false;const socket=net.createConnection({host:p.host,port:p.port});
 const fail=e=>{if(settled)return;settled=true;socket.destroy();reject(connected?e:beforeSend(e.message))};
 socket.setTimeout(timeout,()=>fail(Error('TCP timeout; inspect device')));socket.on('error',fail);
 socket.on('connect',()=>{connected=true;socket.end(bytes,()=>{if(settled)return;settled=true;socket.destroy();resolve('TCP write completed; physical output unverified')})});
 socket.on('close',()=>{if(!settled)fail(Error('TCP closed before completion'))});
})}
export function windowsSend(p,bytes,{platform=process.platform,spawnProcess=spawn}={}){
 if(platform!=='win32')return Promise.reject(beforeSend('Windows spool transport requires Windows'));
 return new Promise((resolve,reject)=>{
  const child=spawnProcess('powershell.exe',['-NoLogo','-NoProfile','-NonInteractive','-File',fileURLToPath(new URL('./spool.ps1',import.meta.url))],{stdio:['pipe','pipe','pipe'],windowsHide:true});
  let stdout='',stderr='',settled=false;const done=(error,result)=>{if(settled)return;settled=true;clearTimeout(timer);error?reject(error):resolve(result)};
  const timer=setTimeout(()=>{child.kill();done(Error('Spooler timed out; physical outcome unknown'))},30000);
  child.stdout.on('data',b=>{stdout+=b.toString();if(stdout.length>8192){child.kill();done(Error('Unexpected spooler response'))}});child.stderr.on('data',b=>{stderr=(stderr+b.toString()).slice(0,2000)});
  child.on('error',e=>done(beforeSend(e.message)));child.stdin.on('error',()=>{});
  child.on('close',code=>{if(code!==0)return done(Error('Spooler failed; inspect queue: '+stderr));try{const r=JSON.parse(stdout);if(r.status!=='accepted_by_transport')throw Error('Invalid spooler response');done(null,'Windows spool job '+r.jobId+' accepted; physical output unverified')}catch(e){done(e)}});
  child.stdin.end(JSON.stringify({queue:p.queue,bytes:bytes.toString('base64')}));
 });
}
export async function send(profile,t,isCopy){const p=endpoint(profile),bytes=render(t,p,isCopy);return p.type==='tcp'?tcpSend(p,bytes):windowsSend(p,bytes)}
