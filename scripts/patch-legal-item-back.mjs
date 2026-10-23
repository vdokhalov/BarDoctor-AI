import fs from'node:fs';import{transformSync}from'esbuild';const file='public/assets/index-BQGspy0I.js',restore=process.argv.includes('--restore');let s=fs.readFileSync(file,'utf8');
const changes=[
 ['window.location.assign(bdNomenclatureRelationUrlV369("menu",menuUsage,e))','window.bdNavigate(bdNomenclatureRelationUrlV369("menu",menuUsage,e))'],
 ['href:"/terms",className:"h-12 rounded-xl', 'href:bdTermsEntryUrl(),onClick:event=>{event.preventDefault();window.bdNavigate(bdTermsEntryUrl())},className:"h-12 rounded-xl'],
 ['i.jsx("a",{href:"/login","aria-label":"Назад",style:{display:"grid"', 'i.jsx("a",{href:t?"/login":bdTermsBackUrl(),"aria-label":"Назад",style:{display:"grid"'],
 ['function bdNomenclatureRelationUrlV369(e,t,n){const r=', 'function bdNomenclatureRelationUrlV369(e,t,n){if(e==="menu")return bdMenuFromNomenclature(n);const r=']
];for(const[a,b]of changes)s=s.replace(b,a);s=s.replace(/\/\* legal-item-back:start \*\/[\s\S]*?\/\* legal-item-back:end \*\//g,'');if(!restore){for(const[a,b]of changes){if(!s.includes(a))throw Error('Missing anchor '+a);s=s.replace(a,b)}s+='\n/* legal-item-back:start */\n'+fs.readFileSync('scripts/fragments/legal-item-back.js','utf8')+'\n/* legal-item-back:end */\n'}transformSync(s,{loader:'js',logLevel:'silent'});fs.writeFileSync(file,s);
