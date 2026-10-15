import { getD1 } from '../../../../db';
import { authenticateRequest } from '../../../../lib/bardoctor/auth';
import { posSameOrigin } from '../../../../lib/bardoctor/staff-pin-session';
import { issueStaffPin,revokeStaffPin } from '../../../../lib/bardoctor/staff-pin-credentials';
import { createPinStaff,setStaffLogin } from '../../../../lib/bardoctor/staff-pin-members';
import { readJsonRequest } from '../../../../lib/bardoctor/http';
async function manager(request:Request){const actor=await authenticateRequest(request);return actor&&!actor.posSession&&['owner','manager'].includes(actor.role)?actor:null;}
export async function GET(request:Request){
 const actor=await manager(request);if(!actor)return new Response(null,{status:403});
 const members=await getD1().prepare(`SELECT m.id,m.status,l.login,a.first_name AS name,p.revoked_at,p.revision,
 CASE WHEN p.membership_id IS NOT NULL AND p.revoked_at IS NULL THEN 1 ELSE 0 END AS pin_active
 FROM venue_memberships m JOIN accounts a ON a.id=m.account_id LEFT JOIN staff_pin_credentials p ON p.membership_id=m.id LEFT JOIN staff_logins l ON l.membership_id=m.id
 WHERE m.venue_id=? AND m.role='cashier' ORDER BY a.first_name,m.id`).bind(actor.venueId).all();
 return Response.json({ok:true,members:members.results},{headers:{'Cache-Control':'no-store'}});
}
export async function POST(request:Request){
 if(!posSameOrigin(request))return new Response(null,{status:403});
 const actor=await manager(request);if(!actor)return new Response(null,{status:403});
 const parsed=await readJsonRequest<{action?:string;membershipId?:number;name?:string;jobTitle?:string;login?:string}>(request,{maxBytes:4096});if(!parsed.ok)return parsed.response;
 try{
  const data=parsed.data;
  if(data.action==='create')return Response.json({ok:true,...await createPinStaff(actor,data.name||'',data.jobTitle,data.login)},{status:201,headers:{'Cache-Control':'no-store'}});
  if(!Number.isSafeInteger(data.membershipId))return new Response(null,{status:400});
  const result=data.action==='login'?await setStaffLogin(actor,data.membershipId!,data.login):data.action==='issue'?await issueStaffPin(actor,data.membershipId!):data.action==='revoke'?await revokeStaffPin(actor,data.membershipId!):null;
  if(!result)return new Response(null,{status:400});
  return Response.json({ok:true,...result},{headers:{'Cache-Control':'no-store'}});
 }catch(error){const code=error instanceof Error?error.message:'';if(code==='PIN_INVALID_LOGIN'||code==='PIN_INVALID_MEMBER')return Response.json({ok:false,error:code==='PIN_INVALID_LOGIN'?'Логин: 3–32 символа, латинские буквы, цифры, точка, дефис или подчёркивание.':'Проверьте имя и должность.'},{status:400,headers:{'Cache-Control':'no-store'}});if(code.includes('UNIQUE constraint failed: staff_logins.login'))return Response.json({ok:false,error:'Логин уже занят.'},{status:409});return Response.json({ok:false,error:code==='PIN_NOT_CONFIGURED'?'PIN-вход ещё не настроен.':code==='PIN_ACCESS_DENIED'?'Доступ запрещён.':'Операция не выполнена.'},{status:code==='PIN_ACCESS_DENIED'?403:503,headers:{'Cache-Control':'no-store'}});}
}
