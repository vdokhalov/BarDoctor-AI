import fs from 'node:fs';
import {parse} from 'acorn';
import {transformSync} from 'esbuild';
const file='public/assets/index-BQGspy0I.js';let source=fs.readFileSync(file,'utf8');
const start='/* shift-cases:start */',end='/* shift-cases:end */';
if(source.includes(start)){const a=source.indexOf(start),b=source.indexOf(end,a);if(b<a)throw Error('Shift cases marker missing');source=source.slice(0,a)+source.slice(b+end.length).replace(/^\n/,'');}
function edit(name, changes){const tree=parse(source,{ecmaVersion:'latest',sourceType:'module'}),node=tree.body.find(n=>n.type==='FunctionDeclaration'&&n.id.name===name);if(!node)throw Error(name+' missing');let body=source.slice(node.start,node.end);for(const [old,next]of changes){if(body.includes(next))continue;else if(body.includes(old))body=body.replaceAll(old,next);else throw Error(name+' anchor missing: '+old);}source=source.slice(0,node.start)+body+source.slice(node.end);}
edit('_Ce',[
 ['const{cases:e}=za(),','const bdShiftCases=bdUseShiftCases(),{cases:bdAllCases}=za(),e=bdShiftCases.enabled?bdShiftCases.cases:bdAllCases,'],
 ['h=e.length>0;return','h=e.length>0;if(bdShiftCases.enabled&&bdShiftCases.message)return i.jsx(bdShiftCasesState,{context:bdShiftCases});return'],
 ['onClick:()=>window.bdNavigateBack("/home")','onClick:()=>bdShiftCases.enabled?t(bdShiftCases.back):window.bdNavigateBack("/home")'],
 ['children:"Дела"','children:bdShiftCases.enabled?"Происшествия смены · "+bdShiftCases.date:"Дела"'],
 ['h&&i.jsx(W.button','h&&!bdShiftCases.enabled&&i.jsx(W.button'],
 ['onTap:()=>t(`/cases/${g.id}`)','onTap:()=>t(bdShiftCases.enabled?bdShiftCases.detail(g.id):`/cases/${g.id}`)'],
 ['i.jsx(ACe,{onAdd:()=>t("/cases/add")})','bdShiftCases.enabled?i.jsx("p",{className:"px-6 py-6",children:"За эту смену происшествий нет."}):i.jsx(ACe,{onAdd:()=>t("/cases/add")})']
]);
edit('zCe',[
 ['function zCe(){const[,e]','function zCe(){const bdShiftCases=bdUseShiftCases();const[,e]'],
 ['cases:n,changeStatus:r','cases:bdAllCases,changeStatus:r'],
 ['{toast:f}=sn(),m=e?.id','{toast:f}=sn(),n=bdShiftCases.enabled?bdShiftCases.cases:bdAllCases,m=e?.id'],
 ['if(S.useEffect','if(S.useEffect'],
 ['},[]),!h)return','},[]),bdShiftCases.enabled&&bdShiftCases.message)return i.jsx(bdShiftCasesState,{context:bdShiftCases});if(!h)return'],
 ['t("/cases")','t(bdShiftCases.enabled?bdShiftCases.list:"/cases")'],
 ['onClick:()=>window.bdNavigateBack("/cases")','onClick:()=>bdShiftCases.enabled?t(bdShiftCases.list):window.bdNavigateBack("/cases")']
]);
const compiled=transformSync(fs.readFileSync('scripts/fragments/shift-cases.jsx','utf8'),{loader:'jsx',jsxFactory:'S.createElement',jsxFragment:'S.Fragment'}).code;
source=start+'\n'+compiled+end+'\n'+source;fs.writeFileSync(file,source);
console.log('Shift cases: scoped existing list/detail/back');
