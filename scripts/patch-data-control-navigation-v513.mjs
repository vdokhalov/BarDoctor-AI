import { readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const originalPage = 'function bdDataControlPage(){return i.jsx(bdEmbeddedPage,{source:"/data-control",title:"Контроль данных"})}';
const reactivePage = 'function bdDataControlPage(){const search=ste();return i.jsx(bdEmbeddedPage,{source:"/data-control",title:"Контроль данных",search})}';
const originalFrame = 'function bdEmbeddedPage({source:e,title:t}){\n  const[,n]=bt(),r=new URLSearchParams(window.location.search);';
const reactiveFrame = 'function bdEmbeddedPage({source:e,title:t,search:querySearch}){\n  const[,n]=bt(),r=new URLSearchParams(querySearch===undefined?window.location.search:querySearch);';

export function patchDataControlNavigation(source) {
  for (const [before, after] of [[originalPage, reactivePage], [originalFrame, reactiveFrame]]) {
    if (source.includes(after)) continue;
    const index = source.indexOf(before);
    if (index < 0 || source.indexOf(before, index + before.length) >= 0) throw new Error('Data Control navigation patch target missing or not unique');
    source = source.slice(0, index) + after + source.slice(index + before.length);
  }
  return source;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const path = new URL('../public/assets/index-BQGspy0I.js', import.meta.url);
  const before = await readFile(path, 'utf8');
  const after = patchDataControlNavigation(before);
  if (after !== before) await writeFile(path, after);
}
