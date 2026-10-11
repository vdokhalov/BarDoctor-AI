import fs from 'node:fs';
export function patchReportsFinanceScopeV518(){
 const before='      if (url.origin === window.location.origin && url.pathname === "/decisions") {';
 const after=`      if (window.location.pathname === "/reports" && url.origin === window.location.origin && ["/finance", "/finance/settings"].includes(url.pathname)) {
        var reportScopeV518 = new URL(window.location.href);
        ["month", "venue"].forEach(function(key) { if (!url.searchParams.has(key) && reportScopeV518.searchParams.has(key)) url.searchParams.set(key, reportScopeV518.searchParams.get(key)); });
        return url.pathname + url.search + url.hash;
      }
${before}`;
 for(const dir of ['public','dist/client']){const path=new URL('../'+dir+'/bardoctor-preview-v397.js',import.meta.url);if(!fs.existsSync(path))continue;let s=fs.readFileSync(path,'utf8');if(s.includes(after))continue;if(s.split(before).length!==2)throw Error('Report finance scope anchor absent: '+dir);fs.writeFileSync(path,s.replace(before,after));}
}
