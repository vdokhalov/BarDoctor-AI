import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {createRequire} from 'node:module';
import {chromium} from 'playwright-core';
import {verifyClientRelease} from './lib/client-release-integrity.mjs';
const require=createRequire(import.meta.url);
const {resolveBrowserExecutable,chromiumArgs}=require('./browser-runtime.cjs');
const release=verifyClientRelease(process.cwd());
const root=path.resolve('dist/client');
const server=createServer((req,res)=>{
 const url=new URL(req.url,'http://localhost');
 if(url.pathname.startsWith('/api/')){res.writeHead(401,{'Content-Type':'application/json'});res.end('{"ok":false,"error":"Unauthorized"}');return;}
 const file=path.resolve(root,'.'+url.pathname);
 if(file.startsWith(root+'/')&&fs.existsSync(file)&&fs.statSync(file).isFile()){
  res.writeHead(200,{'Content-Type':({'.js':'application/javascript','.css':'text/css','.svg':'image/svg+xml','.html':'text/html'})[path.extname(file)]||'application/octet-stream'});res.end(fs.readFileSync(file));return;
 }
 res.writeHead(200,{'Content-Type':'text/html'});res.end(fs.readFileSync(path.join(root,'app.html')));
});
await new Promise(done=>server.listen(0,'127.0.0.1',done));
const browser=await chromium.launch({executablePath:await resolveBrowserExecutable(chromium.executablePath()),headless:true,args:chromiumArgs});
try {
 const page=await browser.newPage();const errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:'+server.address().port+'/home',{waitUntil:'networkidle'});
 await page.getByText('Войти',{exact:true}).first().waitFor({timeout:15000});
 assert.deepEqual(errors,[]);
 assert.equal(await page.getByText('BarDoctor не завершил загрузку',{exact:false}).count(),0);
 console.log(JSON.stringify({asset:release.name,boot:'PASS',screen:'login',pageErrors:errors,scope:'local emitted artifact, unauthenticated startup; no live requests'}));
} finally {await browser.close();await new Promise(done=>server.close(done));}
