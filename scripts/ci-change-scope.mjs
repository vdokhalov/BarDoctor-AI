import {execFileSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {appendFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
const require=createRequire(process.cwd()+'/package.json');
const postcss=require('postcss');
const localCss='public/sales-journal.css';
const properties=new Set(['color','background-color','border-color','border-top-color','border-bottom-color','font-size','font-weight','line-height','letter-spacing','padding','padding-top','padding-right','padding-bottom','padding-left','margin','margin-top','margin-right','margin-bottom','margin-left','gap','row-gap','column-gap','border-radius','max-width','min-width','width','min-height','max-height','height']);

// Only existing declaration values may change. New selectors, at-rules,
// imports, URLs, custom properties or structural changes require full CI.
function presentationValuesOnly(before,after){
  let changed=false;
  function compare(a,b){
    if(a.type!==b.type)return false;
    if(a.type==='decl'){
      if(a.prop!==b.prop||a.important!==b.important)return false;
      if(a.value!==b.value){
        if(!properties.has(a.prop)||/url\s*\(|@import|expression\s*\(/i.test(a.value+' '+b.value))return false;
        changed=true;
      }
    }else if(a.type==='rule'&&a.selector!==b.selector)return false;
    else if(a.type==='atrule'&&(a.name!==b.name||a.params!==b.params))return false;
    else if(a.type==='comment'&&a.text!==b.text)return false;
    const x=a.nodes||[],y=b.nodes||[];
    return x.length===y.length&&x.every((n,i)=>compare(n,y[i]));
  }
  try{return compare(postcss.parse(before),postcss.parse(after))&&changed;}catch{return false;}
}
export function classifyChanges(changes){
  const c=changes.find(c=>c.path===localCss);
  if(!c||changes.length>2)return {mode:'full',reason:'empty, mixed or multiple-file diff'};
  if(changes.length===2){
    const companion=changes.find(item=>item!==c);
    if(companion.path!=='tests/fixtures/p0-release-amendment-v517.json'||companion.status!=='M'||companion.oldMode!=='100644'||companion.newMode!=='100644')return {mode:'full',reason:'unclassified companion file'};
    try{
      const before=JSON.parse(companion.before),after=JSON.parse(companion.after);
      const digest=value=>createHash('sha256').update(value).digest('hex');
      if(before.files[localCss].after!==digest(c.before)||after.files[localCss].after!==digest(c.after))throw Error('unbound approval');
      before.files[localCss].after=after.files[localCss].after;
      if(JSON.stringify(before)!==JSON.stringify(after))throw Error('other approval changes');
    }catch{return {mode:'full',reason:'release manifest change is not exactly the local CSS digest'};}
  }
  if(c.path!==localCss||c.status!=='M'||c.oldMode!=='100644'||c.newMode!=='100644')return {mode:'full',reason:'path, operation or file mode is outside the reviewed local CSS boundary'};
  return presentationValuesOnly(c.before,c.after)?{mode:'sales-css',reason:'existing presentation values only; journal and manual-entry consumers'}:{mode:'full',reason:'CSS structure or unclassified value changed'};
}
export function classifyRange(base,head){
  const git=args=>execFileSync('git',args,{encoding:'utf8',maxBuffer:64*1024*1024});
  try{
    if(!/^[0-9a-f]{40}$/.test(base)||! /^[0-9a-f]{40}$/.test(head))throw Error('missing immutable revisions');
    git(['merge-base','--is-ancestor',base,head]);
    const raw=git(['diff','--raw','--no-renames','-z',base,head]).split('\0');
    const changes=[];
    for(let i=0;i<raw.length-1;i+=2){
      const [oldMode,newMode,,,status]=raw[i].slice(1).split(' '),path=raw[i+1];
      const read=status==='M'&&[localCss,'tests/fixtures/p0-release-amendment-v517.json'].includes(path);
      changes.push({path,status,oldMode,newMode,before:read?git(['show',base+':'+path]):'',after:read?git(['show',head+':'+path]):''});
    }
    return classifyChanges(changes);
  }catch{return {mode:'full',reason:'revision or diff could not be verified'};}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const result=classifyRange(process.env.SCOPE_BASE||'',process.env.SCOPE_HEAD||'');
  console.log(JSON.stringify(result));
  if(process.env.GITHUB_OUTPUT)appendFileSync(process.env.GITHUB_OUTPUT,'mode='+result.mode+'\n');
}
