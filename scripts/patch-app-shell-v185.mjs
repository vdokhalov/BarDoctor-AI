import { readFile, writeFile } from "node:fs/promises";

const bundlePath = new URL("../public/assets/index-BQGspy0I.js", import.meta.url);
let source = await readFile(bundlePath, "utf8");

function replaceOnce(before, after, label) {
  const first = source.indexOf(before);
  if (first < 0) throw new Error(`Missing ${label}`);
  if (source.indexOf(before, first + before.length) >= 0) throw new Error(`Ambiguous ${label}`);
  source = source.slice(0, first) + after + source.slice(first + before.length);
}

replaceOnce(
  'const bdEmbeddedPagePaths=["/market","/opportunities","/data-control","/team-access","/integrations","/notifications"];',
  'const bdEmbeddedPagePaths=["/market","/opportunities","/data-control","/team-access","/integrations","/notifications","/reviews","/sales-import","/supplier-alternatives","/venues/new"];',
  "embedded route inventory",
);

replaceOnce(
  'd.textContent=".market-bottom-nav,.opportunity-bottom-nav,.trust-bottom-nav,.push-bottom-nav{display:none!important}.market-page,.opportunity-page,.trust-page,.push-page{padding-bottom:28px!important}html[data-bd-embedded],html[data-bd-embedded] body{min-height:100%!important}";',
  'd.textContent=".market-bottom-nav,.opportunity-bottom-nav,.trust-bottom-nav,.push-bottom-nav,.bd-canonical-navigation,.market-topbar,.opportunity-topbar,.trust-header,.access-header,.integration-header,.notification-header,.topbar,.venue-topbar,header.top{display:none!important}.market-page,.opportunity-page,.trust-page,.push-page,.integration-page,.notification-page{padding-top:0!important;padding-bottom:28px!important}html[data-bd-embedded],html[data-bd-embedded] body{min-height:100%!important}";',
  "embedded shell ownership",
);

replaceOnce(
  'height:"calc(100dvh - 84px - env(safe-area-inset-bottom))"',
  'height:"calc(100dvh - var(--bd-header-total, 64px) - 84px - env(safe-area-inset-bottom))"',
  "embedded frame height",
);

replaceOnce(
  '  if(a.documentElement.dataset.bdNavigationBound==="true")return;',
  `  if(a.documentElement.dataset.bdOuterHistoryBound!=="true"){
    a.documentElement.dataset.bdOuterHistoryBound="true";
    const d=function(v){return v.pathname==="/data-control"&&v.searchParams.has("event")||v.pathname==="/integrations"&&(v.searchParams.has("view")&&v.searchParams.get("view")!=="overview"||v.searchParams.has("flow")&&v.searchParams.get("flow")!=="overview")||v.pathname==="/notifications"&&v.searchParams.has("view")&&v.searchParams.get("view")!=="overview"},f=function(v){
      let b;
      try{b=new URL(r.location.href)}catch{return}
      b.searchParams.delete("embedded");
      const g=new URL(window.location.href),y=g.searchParams.get("venue");
      y&&!b.searchParams.has("venue")&&b.searchParams.set("venue",y);
      const j=b.pathname+b.search+b.hash,k=g.pathname+g.search+g.hash;
      if(j===k)return;
      const q=d(g),z=d(b);
      if(q&&!z&&v==="replace"){window.history.back();return}
      if(v==="push"||!q&&z){
        if(typeof window.bdNavigate==="function")window.bdNavigate(j);
        else{window.history.pushState(window.history.state,"",j);window.dispatchEvent(new PopStateEvent("popstate",{state:window.history.state}))}
        return
      }
      window.history.replaceState(window.history.state,"",j);
      window.dispatchEvent(new PopStateEvent("popstate",{state:window.history.state}))
    },m=r.history.pushState.bind(r.history),h=r.history.replaceState.bind(r.history);
    r.history.pushState=function(){const v=m.apply(null,arguments);f("push");return v};
    r.history.replaceState=function(){const v=h.apply(null,arguments);f("replace");return v};
    r.addEventListener("popstate",function(){f("replace")})
  }
  if(a.documentElement.dataset.bdNavigationBound==="true")return;`,
  "embedded history bridge",
);

replaceOnce(
  'function bdNotificationsPage(){return i.jsx(bdEmbeddedPage,{source:"/notifications",title:"Уведомления BarDoctor"})}',
  'function bdNotificationsPage(){return i.jsx(bdEmbeddedPage,{source:"/notifications",title:"Уведомления BarDoctor"})}\nfunction bdReviewsPage(){return i.jsx(bdEmbeddedPage,{source:"/reviews",title:"Отзывы гостей"})}\nfunction bdSalesImportPage(){return i.jsx(bdEmbeddedPage,{source:"/sales-import",title:"Продажи и склад"})}\nfunction bdSupplierAlternativesPage(){return i.jsx(bdEmbeddedPage,{source:"/supplier-alternatives",title:"Новые поставщики"})}\nfunction bdVenueCreatePage(){return i.jsx(bdEmbeddedPage,{source:"/venues/new",title:"Новое заведение"})}',
  "embedded page components",
);

replaceOnce(
  'path:"/reviews",component:()=>i.jsx(pt,{component:q_e})',
  'path:"/reviews",component:()=>i.jsx(pt,{component:bdReviewsPage})',
  "reviews shell route",
);

replaceOnce(
  'i.jsx(Xe,{path:"/notifications",component:()=>i.jsx(pt,{component:bdNotificationsPage})}),i.jsx(Xe,{path:"/settings"',
  'i.jsx(Xe,{path:"/notifications",component:()=>i.jsx(pt,{component:bdNotificationsPage})}),i.jsx(Xe,{path:"/sales-import",component:()=>i.jsx(pt,{component:bdSalesImportPage})}),i.jsx(Xe,{path:"/supplier-alternatives",component:()=>i.jsx(pt,{component:bdSupplierAlternativesPage})}),i.jsx(Xe,{path:"/venues/new",component:()=>i.jsx(pt,{component:bdVenueCreatePage})}),i.jsx(Xe,{path:"/settings"',
  "additional user routes",
);

await writeFile(bundlePath, source);
console.log("Canonical application shell v185 applied");
