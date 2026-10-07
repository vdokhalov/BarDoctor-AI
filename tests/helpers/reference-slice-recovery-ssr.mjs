import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {build} from 'esbuild';
import {renderToStaticMarkup} from 'react-dom/server';
const require=createRequire(import.meta.url);
let render;
/** The actual unchanged Next page, with an empty native ChatGPT identity context. */
export async function isolatedForgotPasswordDocument(){
 if(!render){
  for(const path of ['app/forgot-password/page.tsx','app/forgot-password/reset-form.tsx','app/forgot-password/forgot-password.css','app/chatgpt-auth.ts'])if(!readFileSync(path).equals(execFileSync('git',['show','b7708cadb01ff8e8ee11c1bcfdab448c15068878:'+path])))throw Error('Auth SSR differs from v489: '+path);
  const compiled=await build({entryPoints:['app/forgot-password/page.tsx'],bundle:true,format:'cjs',platform:'node',write:false,jsx:'automatic',loader:{'.css':'empty'},external:['react','react/jsx-runtime'],plugins:[{name:'isolated-native-next-context',setup(b){b.onResolve({filter:/^next\/(image|link|headers|navigation)$/},a=>({path:a.path,namespace:'native-context'}));b.onLoad({filter:/.*/,namespace:'native-context'},a=>({contents:a.path==='next/headers'?'export async function headers(){return new Headers();}':a.path==='next/navigation'?'export function redirect(path){throw new Error("Unexpected native redirect: "+path)}':'import React from "react";export default function Element({children,...props}){return React.createElement("'+(a.path==='next/image'?'img':'a')+'",props,children)}',loader:'js'}));}}]});
  const loaded={exports:{}};new Function('require','module','exports',compiled.outputFiles[0].text)(require,loaded,loaded.exports);render=loaded.exports.default;
 }
 const body=renderToStaticMarkup(await render());
 return new Response('<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Восстановление BarDoctor</title><style>'+readFileSync('app/forgot-password/forgot-password.css','utf8')+'</style></head><body>'+body+'</body></html>',{headers:{'Content-Type':'text/html; charset=utf-8'}});
}
