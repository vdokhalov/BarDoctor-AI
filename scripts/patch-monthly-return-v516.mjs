import fs from 'node:fs';
export function patchMonthlyReturnV516(source) {
 const changes=[
 ['closure:h,onClose:()=>m(!1),onNavigate:', 'closure:h,onClose:()=>{m(!1);window.bdSyncNavigationQuery({closeMonth:null})},onNavigate:'],
 ];
 for(const [before,after] of changes){if(source.includes(after))continue;if(source.split(before).length!==2)throw Error('Monthly return anchor missing or ambiguous: '+before);source=source.replace(before,after)}
 return source;
}
if(process.argv[1]?.endsWith('/patch-monthly-return-v516.mjs')){const p=new URL('../public/assets/index-BQGspy0I.js',import.meta.url);fs.writeFileSync(p,patchMonthlyReturnV516(fs.readFileSync(p,'utf8')))}

export function patchMonthlyReturnRuntimeV516(){
 const paths=[['../public/navigation-contract-v247.js','    return null;\n  }\n\n  function routeScreen(path)',`    if (path === "/reports") { var finance = new URL("/finance", url.origin); ["month", "venue"].forEach(function(key) { if (query.has(key)) finance.searchParams.set(key, query.get(key)); }); return { type: "report", title: "Месячный отчёт", parent: finance.pathname + finance.search }; }
    return null;
  }

  function routeScreen(path)`],['../public/bardoctor-preview-v397.js','var parentUrl = queryParentUrl || bdLogicalParentRoute(path);',`var parentUrl = queryParentUrl || bdLogicalParentRoute(path);
    if (path === "/reports") {
      var reportParentV516 = new URL(currentUrl, window.location.origin);
      if (reportParentV516.searchParams.has("closeMonth")) reportParentV516.searchParams.delete("closeMonth");
      else { var reportQueryV516 = reportParentV516.searchParams; reportParentV516 = new URL("/finance", window.location.origin); ["month", "venue"].forEach(function(key) { if (reportQueryV516.has(key)) reportParentV516.searchParams.set(key, reportQueryV516.get(key)); }); }
      parentUrl = reportParentV516.pathname + reportParentV516.search;
    }`]];
 for(const [name,before,after] of paths)for(const target of [name,name.replace('../public/','../dist/client/')]){const path=new URL(target,import.meta.url);if(!fs.existsSync(path))continue;let source=fs.readFileSync(path,'utf8');if(source.includes(after))continue;if(source.split(before).length!==2)throw Error('Monthly runtime return anchor missing: '+target);source=source.replace(before,after);fs.writeFileSync(path,source)}
}
