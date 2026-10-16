import { getD1 } from '../../../../db';
import { authenticateRequest } from '../../../../lib/bardoctor/auth';
import { posSameOrigin } from '../../../../lib/bardoctor/staff-pin-session';
import { issueStaffPin,revokeStaffPin } from '../../../../lib/bardoctor/staff-pin-credentials';
import { createPinStaff,setStaffLogin,linkPinStaff,activeRoster,linkedActiveEmployee } from '../../../../lib/bardoctor/staff-pin-members';
import { readJsonRequest } from '../../../../lib/bardoctor/http';
async function manager(request:Request){const actor=await authenticateRequest(request);return actor&&!actor.posSession&&['owner','manager'].includes(actor.role)?actor:null;}
export async function GET(request:Request){
 const actor=await manager(request);if(!actor)return new Response(null,{status:403});
 const members=await getD1().prepare(`SELECT m.id,m.employee_id,m.status,l.login,a.first_name AS name,p.revoked_at,p.revision,
 CASE WHEN p.membership_id IS NOT NULL AND p.revoked_at IS NULL THEN 1 ELSE 0 END AS pin_active
 FROM venue_memberships m JOIN accounts a ON a.id=m.account_id LEFT JOIN staff_pin_credentials p ON p.membership_id=m.id LEFT JOIN staff_logins l ON l.membership_id=m.id
 WHERE m.venue_id=? AND m.role='cashier' ORDER BY a.first_name,m.id`).bind(actor.venueId).all();
 const roster=await getD1().prepare(`SELECT (SELECT json_group_array(json_object('employee_id',employee_id,'name',name)) FROM (${activeRoster})) AS employees FROM venues v WHERE v.id=?`).bind(actor.venueId).first<{employees:string}>();
 const employees: {employee_id:string;name:string}[]=JSON.parse(roster?.employees||'[]');
 const uniqueEmployees=employees.filter(row=>employees.filter(other=>other.employee_id===row.employee_id).length===1);
 const eligible=await getD1().prepare(`SELECT target.id FROM venue_memberships target JOIN venues v ON v.id=target.venue_id
 WHERE v.id=? AND target.status='active' AND ${linkedActiveEmployee}`).bind(actor.venueId).all();
 const eligibleIds=new Set(eligible.results.map(row=>row.id));
 return Response.json({ok:true,employees:uniqueEmployees,members:members.results.map(row=>({...row,employee_active:eligibleIds.has(row.id)}))},{headers:{'Cache-Control':'no-store'}});
}
export async function POST(request:Request){
 if(!posSameOrigin(request))return new Response(null,{status:403});
 const actor=await manager(request);if(!actor)return new Response(null,{status:403});
 const parsed=await readJsonRequest<{action?:string;membershipId?:number;employeeId?:string;jobTitle?:string;login?:string}>(request,{maxBytes:4096});if(!parsed.ok)return parsed.response;
 try{
  const data=parsed.data;
  if(data.action==='create')return Response.json({ok:true,...await createPinStaff(actor,data.employeeId||'',data.jobTitle,data.login)},{status:201,headers:{'Cache-Control':'no-store'}});
  if(!Number.isSafeInteger(data.membershipId))return new Response(null,{status:400});
  const result=data.action==='link'?await linkPinStaff(actor,data.membershipId!,data.employeeId||''):data.action==='login'?await setStaffLogin(actor,data.membershipId!,data.login):data.action==='issue'?await issueStaffPin(actor,data.membershipId!):data.action==='revoke'?await revokeStaffPin(actor,data.membershipId!):null;
  if(!result)return new Response(null,{status:400});
  return Response.json({ok:true,...result},{headers:{'Cache-Control':'no-store'}});
 }catch(error){const code=error instanceof Error?error.message:'';if(code==='PIN_INVALID_LOGIN'||code==='PIN_INVALID_MEMBER')return Response.json({ok:false,error:code==='PIN_INVALID_LOGIN'?'Логин: 3–32 символа, латинские буквы, цифры, точка, дефис или подчёркивание.':'Выберите активного сотрудника этого заведения без другого доступа.'},{status:400,headers:{'Cache-Control':'no-store'}});if(code.includes('UNIQUE constraint failed: staff_logins.login'))return Response.json({ok:false,error:'Логин уже занят.'},{status:409});return Response.json({ok:false,error:code==='PIN_NOT_CONFIGURED'?'PIN-вход ещё не настроен.':code==='PIN_ACCESS_DENIED'?'Доступ запрещён.':'Операция не выполнена.'},{status:code==='PIN_ACCESS_DENIED'?403:503,headers:{'Cache-Control':'no-store'}});}
}
