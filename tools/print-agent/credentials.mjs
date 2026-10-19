import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
export function credential(action,value){
 if(process.platform!=='win32')throw Error('Persistent credentials require Windows DPAPI; no plaintext fallback');
 return new Promise((resolve,reject)=>{const child=spawn('powershell.exe',['-NoLogo','-NoProfile','-NonInteractive','-File',fileURLToPath(new URL('./credential.ps1',import.meta.url))],{stdio:['pipe','pipe','pipe'],windowsHide:true});let output='',done=false;const finish=(e)=>{if(done)return;done=true;clearTimeout(timer);e?reject(e):resolve(output)};const timer=setTimeout(()=>{child.kill();finish(Error('Credential protection timed out'))},15000);child.stdout.on('data',b=>{output+=b;if(output.length>8192){child.kill();finish(Error('Credential response too large'))}});child.stderr.resume();child.on('error',()=>finish(Error('Credential protection unavailable')));child.stdin.on('error',()=>{});child.on('close',code=>finish(code?Error('Credential protection failed'):null));child.stdin.end(JSON.stringify({action,value}));});
}
