import {getD1} from '../../../db';
import {authenticateReadOnlyRequest} from '../../../lib/bardoctor/auth';
import {hasPermission,permissionPayload,isAccessRole} from '../../../lib/bardoctor/access-control';
import {readStoreSnapshots,runStoreCasBatch,StoreWriteConflictError} from '../../../lib/bardoctor/store-cas';
import {closedMonthsFromStore} from '../../../lib/bardoctor/data-trust';
import {accountingCurrencyFromRestaurantJson} from '../../../lib/bardoctor/currency';
import {venueDate,venueTimeFromJson} from '../../../lib/bardoctor/venue-time';
import {UTILITY_KEY,parseUtilities,changeUtilities,utilityView} from '../../../lib/bardoctor/utility-state';
import {UtilityInputError} from '../../../lib/bardoctor/utility-meter';
const json=(value:unknown,status=200)=>Response.json(value,{status,headers:{'Cache-Control':'private, no-store'}});
async function hash(value:unknown){const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(value)));return Array.from(new Uint8Array(bytes),x=>x.toString(16).padStart(2,'0')).join('')}
async function handle(request:Request){
 const account=await authenticateReadOnlyRequest(request);if(!account)return json({error:'Войдите в приложение'},401);
 const write=request.method==='POST';if(!hasPermission(account,'finance.view')||write&&!hasPermission(account,'finance.manage'))return json({error:'Недостаточно прав'},403);
 const url=new URL(request.url);if(url.searchParams.has('venue')&&Number(url.searchParams.get('venue'))!==account.venueId)return json({error:'Заведение изменилось'},409);
 const currency=accountingCurrencyFromRestaurantJson(account.restaurantJson);if(!currency)return json({error:'Укажите валюту заведения'},422);
 const today=venueDate(new Date().toISOString(),venueTimeFromJson(account.restaurantJson).timezone),month=url.searchParams.get('month')||today.slice(0,7);
 if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(month))return json({error:'Некорректный месяц'},400);
 const db=getD1();const membership=await db.prepare('SELECT role,permissions_json FROM venue_memberships WHERE id=?').bind(account.membershipId).first<{role:typeof account.role;permissions_json:string|null}>();if(!membership||!isAccessRole(membership.role)||!hasPermission({...account,...permissionPayload(membership.role,membership.permissions_json)},write?'finance.manage':'finance.view'))return json({error:'Недостаточно прав'},403);const snapshots=await readStoreSnapshots(db,account.id,[UTILITY_KEY,'bd_month_closings']);
 const state=parseUtilities(snapshots[0].dataJson,{venueId:account.venueId,dataAccountId:account.id});
 const closed=[...closedMonthsFromStore(JSON.parse(snapshots[1].dataJson||'[]'))];
 if(!write)return json({ok:true,...utilityView(state,month,currency),canManage:hasPermission(account,'finance.manage'),today});
 const raw=await request.text();if(raw.length>20000)return json({error:'Слишком большой запрос'},413);
 const body=JSON.parse(raw),command=body.command;if(!command||typeof command!=='object'||Array.isArray(command)||typeof body.operationId!=='string'||!body.operationId||body.operationId.length>100)return json({error:'Некорректная операция'},400);
 if(body.venueId!==account.venueId)return json({error:'Заведение изменилось'},409);
 const fingerprint=await hash(command),duplicate=state.operations.find(x=>x.id===body.operationId);
 if(duplicate)return duplicate.hash===fingerprint?json({ok:true,duplicate:true,...utilityView(state,month,currency),today,canManage:true}):json({error:'Идентификатор операции уже использован'},409);
 if(body.revision!==state.revision)return json({error:'Данные изменились. Обновите страницу.',code:'REVISION_CONFLICT'},409);
 if(state.operations.length>=5000)return json({error:'Достигнут предел журнала. Сохранение остановлено.'},422);
 const next=changeUtilities(state,command,currency,closed,today),previewToken=await hash([next,closed,body.operationId]);
 if(body.preview===true)return json({ok:true,previewToken,before:utilityView(state,month,currency),after:utilityView(next,month,currency)});
 if(body.previewToken!==previewToken)return json({error:'Сначала проверьте результат изменения',code:'PREVIEW_REQUIRED'},409);
 next.operations.push({id:body.operationId,hash:fingerprint});const now=new Date().toISOString();
 // Recheck membership, permissions and profile at the atomic write boundary.
 const access=db.prepare(`INSERT INTO domain_data(account_id,store_key,data_json) SELECT ?,'__utility_access_guard__',NULL WHERE NOT EXISTS(SELECT 1 FROM venue_memberships vm JOIN venues v ON v.id=vm.venue_id JOIN workspace_memberships wm ON wm.workspace_id=v.workspace_id AND wm.account_id=vm.account_id JOIN workspaces w ON w.id=v.workspace_id JOIN accounts a ON a.id=v.data_account_id WHERE vm.id=? AND vm.account_id=? AND vm.venue_id=? AND vm.status='active' AND v.status='active' AND wm.status='active' AND w.status='active' AND vm.role=? AND vm.permissions_json IS ? AND a.id=? AND a.restaurant_json IS ?)`).bind(account.id,account.membershipId,account.actorAccountId,account.venueId,membership.role,membership?.permissions_json??null,account.id,account.restaurantJson);
 await runStoreCasBatch(db,account.id,snapshots,[access,db.prepare('INSERT INTO domain_data(account_id,store_key,data_json,updated_at) VALUES(?,?,?,?) ON CONFLICT(account_id,store_key) DO UPDATE SET data_json=excluded.data_json,updated_at=excluded.updated_at').bind(account.id,UTILITY_KEY,JSON.stringify([next]),now),db.prepare('INSERT INTO audit_log(account_id,store_key,action,entity_id,after_json,actor_name,actor_role,created_at) VALUES(?,?,?,?,?,?,?,?)').bind(account.id,UTILITY_KEY,String(command.action),String(command.meterId),JSON.stringify({revision:next.revision,operationId:body.operationId}),String(account.actorAccountId),account.role,now)],now);
 return json({ok:true,...utilityView(next,month,currency),today,canManage:true});
}
async function safe(request:Request){try{return await handle(request)}catch(e){if(e instanceof StoreWriteConflictError)return json({error:'Данные изменились. Обновите страницу.'},409);if(e instanceof UtilityInputError)return json({error:e.message,code:e.message},422);if(e instanceof SyntaxError)return json({error:'Некорректные данные'},400);console.error('Utilities request failed',e instanceof Error?e.name:'Error');return json({error:'Не удалось выполнить операцию. Данные не подтверждены.'},500)}}
export const GET=safe;export const POST=safe;
