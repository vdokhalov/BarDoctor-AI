import { readFile, writeFile } from "node:fs/promises";

const target = new URL("../public/assets/index-BQGspy0I.js", import.meta.url);
let source = await readFile(target, "utf8");

const marker = "/* bd-widget-boundaries-v405 */";
if (source.includes(marker)) {
  console.log("bd-widget-boundaries-v405: already applied");
  process.exit(0);
}

const boundary = `${marker} class bdWidgetBoundaryV405 extends S.Component{constructor(e){super(e);this.state={failed:false}}static getDerivedStateFromError(){return{failed:true}}componentDidCatch(e){try{window.dispatchEvent(new CustomEvent("bd:widget-error",{detail:{widget:this.props.name}}))}catch{}console.error("[BarDoctor widget]",this.props.name,e instanceof Error?e.message:"render failure")}render(){return this.state.failed?i.jsxs("section",{className:"bd-widget-fallback-v405",role:"alert","data-bd-widget-fallback":this.props.name,children:[i.jsx("strong",{children:"Раздел временно недоступен"}),i.jsx("p",{children:"Остальная часть BarDoctor продолжает работать."}),i.jsx("button",{type:"button",onClick:()=>this.setState({failed:false}),children:"Повторить"})]}):this.props.children}} function bdWidgetFailureProbeV405({name:e,children:t}){if(new URLSearchParams(window.location.search).get("bd-widget-failure")===e)throw new Error("BD_WIDGET_FAILURE_PROBE:"+e);return t} function bdGuardWidgetV405(e,t){return i.jsx(bdWidgetBoundaryV405,{name:e,children:i.jsx(bdWidgetFailureProbeV405,{name:e,children:t})})} `;

const insertion = "function bdHomeHealthIndexV200(";
if (source.split(insertion).length - 1 !== 1) throw new Error("Home widget insertion point changed");
source = source.replace(insertion, boundary + insertion);

const replacements = [
  [
    "i.jsx(bdHomeHealthIndexV200,{snapshot:bdHealthSnapshot,diagnosis:f,loading:bdHealthLoading,onNavigate:g})",
    "bdGuardWidgetV405(\"business-health\",i.jsx(bdHomeHealthIndexV200,{snapshot:bdHealthSnapshot,diagnosis:f,loading:bdHealthLoading,onNavigate:g}))",
  ],
  [
    "i.jsx(bdHomeFreshAi,{diagnosis:f,health:m,latestDataAt:h,onNavigate:g})",
    "bdGuardWidgetV405(\"ai-doctor\",i.jsx(bdHomeFreshAi,{diagnosis:f,health:m,latestDataAt:h,onNavigate:g}))",
  ],
  [
    "function bdIntegrationsPage(){return i.jsx(bdEmbeddedPage,{source:\"/integrations\",title:\"Интеграции BarDoctor\"})}",
    "function bdIntegrationsPage(){return bdGuardWidgetV405(\"integrations\",i.jsx(bdEmbeddedPage,{source:\"/integrations\",title:\"Интеграции BarDoctor\"}))}",
  ],
  [
    "function bdNotificationsPage(){return i.jsx(bdEmbeddedPage,{source:\"/notifications\",title:\"Уведомления BarDoctor\"})}",
    "function bdNotificationsPage(){return bdGuardWidgetV405(\"notifications\",i.jsx(bdEmbeddedPage,{source:\"/notifications\",title:\"Уведомления BarDoctor\"}))}",
  ],
  [
    "function bdReviewsPage(){return i.jsx(bdEmbeddedPage,{source:\"/reviews\",title:\"Отзывы гостей\"})}",
    "function bdReviewsPage(){return bdGuardWidgetV405(\"reviews\",i.jsx(bdEmbeddedPage,{source:\"/reviews\",title:\"Отзывы гостей\"}))}",
  ],
];

for (const [before, after] of replacements) {
  const matches = source.split(before).length - 1;
  if (matches !== 1) throw new Error(`Expected one widget call site, found ${matches}: ${before.slice(0, 80)}`);
  source = source.replace(before, after);
}

await writeFile(target, source);
console.log("bd-widget-boundaries-v405: five critical surfaces isolated");
