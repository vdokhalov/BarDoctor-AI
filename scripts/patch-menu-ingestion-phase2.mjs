import fs from 'node:fs';
import { parse } from 'acorn';
const path='public/assets/index-BQGspy0I.js';
let source=fs.readFileSync(path,'utf8').replaceAll('\r\n','\n');
const ast=()=>parse(source,{ecmaVersion:'latest',sourceType:'module'});
const fn=(name,change)=>{const node=ast().body.find(n=>n.type==='FunctionDeclaration'&&n.id?.name===name);if(!node)throw Error('Missing Phase 2 function: '+name);source=source.slice(0,node.start)+change(source.slice(node.start,node.end))+source.slice(node.end)};
const fragment=fs.readFileSync('scripts/fragments/menu-ingestion-phase2.fragment.txt','utf8');
for(const node of parse(fragment,{ecmaVersion:'latest',sourceType:'module'}).body){if(node.type!=='FunctionDeclaration')continue;const code=fragment.slice(node.start,node.end);if(ast().body.some(n=>n.id?.name===node.id.name))fn(node.id.name,()=>code);else source=code+'\n'+source;}
fn('bdAssortmentSourceChoiceV170',code=>{
 code=code.replace('onClose:e,onCamera:t,','onClose:e,onManual:manual,onCamera:t,');
 if(!code.includes('title:"Добавить вручную"'))code=code.replace('const s=[','const s=[{icon:kX,title:"Добавить вручную",copy:"Заполнить одну позицию",action:manual},');
 return code.replace('title:"Камера"','title:"Распознать · камера"').replace('title:"Галерея"','title:"Распознать · галерея"').replace('title:"PDF, Excel или CSV"','title:"Импорт · PDF, Excel или CSV"').replace('title:"Публичная ссылка"','title:"Импорт · публичная ссылка"');
});
fn('bdAssortmentCommandPageV170',code=>{
 const marker='/* menu-ingestion-phase2 */';
 if(code.includes(marker))return code.replace('bdPhase3VenueRefV418.current===s.activeVenueId','Number(bdPhase3VenueRefV418.current)===Number(s.activeVenueId)').replaceAll('canManage:me})','canManage:me&&n&&Number(s.activeVenueId)>0})').replace('source,items:source===','source,provenance:{sourceFileIds:raw.sourceFileIds||[raw.sourceFileId].filter(Boolean),sourceUrl:raw.sourceUrl,name:raw.sourceFileName||raw.venueName},items:source===').replace('Ae=async(w,activeRecipeId="")=>{await bdStartMenuDraft({...w,activeRecipeId},"MANUAL");return true}','Ae=async(w,activeRecipeId="",baseline=null)=>{await bdStartMenuDraft({...w,activeRecipeId,baseline},"MANUAL");return true}');
 code=code.replace('bdPhase3VenueRefV418.current===s.activeVenueId','Number(bdPhase3VenueRefV418.current)===Number(s.activeVenueId)').replaceAll('canManage:me})','canManage:me&&n&&Number(s.activeVenueId)>0})');
 code=code.replace('function bdAssortmentCommandPageV170(){',`function bdAssortmentCommandPageV170(){${marker}const bdManualDraftRefPhase2=S.useRef(null);const bdStartMenuDraft=async(raw,source)=>{const venueId=Number(s.activeVenueId),id=source==="MANUAL"?(bdManualDraftRefPhase2.current||=("draft:"+crypto.randomUUID())):"draft:"+(raw.id||crypto.randomUUID());const result=await bdMenuIngestionRequest({action:"create",draftId:id,venueId,source,provenance:{sourceFileIds:raw.sourceFileIds||[raw.sourceFileId].filter(Boolean),sourceUrl:raw.sourceUrl,name:raw.sourceFileName||raw.venueName},items:source==="MANUAL"?[raw]:raw.menuItems});if(Number(bdPhase3VenueRefV418.current)!==venueId)return false;k(result);if(source==="MANUAL"){bdManualDraftRefPhase2.current=null;M(null)}return result};const bdMenuConfirmedPhase2=result=>{if(Number(s.activeVenueId)!==Number(result.draft.venueId))throw new Error("Заведение изменилось. Обновите меню.");const state=bdCatState(result.data);_(state);Kse(bdCatalogStoreKey,state);jm();k(null);a({variant:"success",title:"Меню подтверждено",description:"Проверенные изменения сохранены."});if(result.draft.source==="MANUAL"){const item=state.menuItems.find(row=>row.id===result.draft.resultIds?.[0]);if(item?.consumptionMode==="RECIPE"){f("recipes");v("all");z(item)}}};`);
 for(const [from,to] of [
  ['k({...p,venueId:bdImportVenueV418})','await bdStartMenuDraft(p,"SCAN")'],
  ['k({...ie.draft,venueId:bdImportVenueV418})','await bdStartMenuDraft(ie.draft,"IMPORT")'],
  ['k({...P.draft,venueId:bdImportVenueV418})','await bdStartMenuDraft(P.draft,"IMPORT")'],
 ]){if(!code.includes(from))throw Error('Missing Phase 2 source adapter: '+from);code=code.replace(from,to);}
 const start=code.indexOf('Te=async()=>{'),end=code.indexOf(',ke=async',start);
 if(start<0||end<0)throw Error('Missing Phase 2 save boundaries');
 code=code.slice(0,start)+'Te=()=>{},Ae=async(w,activeRecipeId="",baseline=null)=>{await bdStartMenuDraft({...w,activeRecipeId,baseline},"MANUAL");return true}'+code.slice(end);
 const review='A&&i.jsx(bdAssortmentImportReviewV170,{draft:A,current:E,onChange:k,onCancel:xe,onConfirm:Te,saving:J,products:bdCatMatchingProductsV258(E,bdCatPurchaseProducts(C))})';
 if(!code.includes(review))throw Error('Missing Phase 2 review anchor');
 code=code.replace(review,'A&&i.jsx(bdMenuIngestionReview,{entry:A,current:E,onChange:k,onCancel:()=>{k(null)},onConfirmed:bdMenuConfirmedPhase2,products:bdCatMatchingProductsV258(E,bdCatPurchaseProducts(C))})');
 code=code.replace('ze=()=>{M({}),e(bdAssortmentQueryUrlV170({tab:"menu",itemId:null}))}','ze=()=>{ee(true)}');
 code=code.replace('onClose:()=>ee(!1),onCamera:','onClose:()=>ee(!1),onManual:()=>{ee(false);M({});e(bdAssortmentQueryUrlV170({tab:"menu",itemId:null}))},onCamera:');
 // Removal of blind import writer also removes its unused confirmation state bindings.
 code=code.replace('[J,G]=S.useState(!1),','').replace('},Te=()=>{},Ae=', '},Ae=');
 const cancelStart=code.indexOf('xe=async()=>{'),cancelEnd=code.indexOf(',Ae=async',cancelStart);
 if(cancelStart>=0&&cancelEnd>cancelStart)code=code.slice(0,cancelStart)+code.slice(cancelEnd+1);
 return code;
});
const menuEditorChange=code=>code.replace('s(ce,bdActiveRecipeIdV418||"")','s(ce,bdActiveRecipeIdV418||"",e)').replace('salePrice:Math.max(0,bdCatNumber(h.salePrice))','salePrice:h.salePrice').replace('plannedSales:Math.max(0,bdCatNumber(h.plannedSales))','plannedSales:h.plannedSales').replace('saveLabel:"Сохранить",mobileTitle:"Позиция меню"','saveLabel:"Проверить",mobileTitle:"Позиция меню"');
fn('bdCatMenuEditor',menuEditorChange);
const editorFragment='scripts/fragments/menu-consumption-sot-v418.fragment.txt';fs.writeFileSync(editorFragment,menuEditorChange(fs.readFileSync(editorFragment,'utf8')));
parse(source,{ecmaVersion:'latest',sourceType:'module'});fs.writeFileSync(path,source);
const responsePath='app/bar-doctor-response.ts';let response=fs.readFileSync(responsePath,'utf8');if(!response.includes('/menu-ingestion-phase2.css')){const anchor='<link rel="stylesheet" href="/assortment-command-v170.css';const pos=response.indexOf(anchor);if(pos<0)throw Error('Missing Phase 2 stylesheet anchor');response=response.slice(0,pos)+'<link rel="stylesheet" href="/menu-ingestion-phase2.css?v=20260930-phase2" />\n    '+response.slice(pos);fs.writeFileSync(responsePath,response)}
console.log('Phase 2 unified menu ingestion applied');
