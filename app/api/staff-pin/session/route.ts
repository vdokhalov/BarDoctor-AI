import { getD1 } from '../../../../db';
import { authenticatePosRequest,loginStaffPin,posCookie,posDigest,posSameOrigin,posSetCookie,POS_SESSION_COOKIE } from '../../../../lib/bardoctor/staff-pin-session';
import { readJsonRequest } from '../../../../lib/bardoctor/http';
const failure=(status:number,error:string)=>Response.json({ok:false,error},{status,headers:{'Cache-Control':'no-store'}});
export async function GET(request:Request){
 const actor=await authenticatePosRequest(request);if(!actor)return failure(401,'Введите PIN');
 return Response.json({ok:true,venueId:actor.venueId,actorId:actor.actorAccountId,name:[actor.firstName,actor.lastName].filter(Boolean).join(' '),landing:'/cashier?embedded=1'},{headers:{'Cache-Control':'no-store'}});
}
export async function POST(request:Request){
 if(!posSameOrigin(request))return failure(403,'Доступ запрещён');
 const body=await readJsonRequest<{pin?:unknown;login?:unknown}>(request,{maxBytes:1024});if(!body.ok)return body.response;
 try{
  const result=await loginStaffPin(request,typeof body.data.pin==='string'?body.data.pin:'',body.data.login);
  return Response.json({ok:true,venueId:result.venueId,expiresAt:result.expiresAt,landing:'/cashier?embedded=1'},{headers:{'Cache-Control':'no-store','Set-Cookie':posSetCookie(POS_SESSION_COOKIE,result.token,request)}});
 }catch(error){
  const code=error instanceof Error?error.message:'';
  if(code==='PIN_RATE_LIMIT')return failure(429,'Слишком много попыток. Повторите позже.');
  if(code==='PIN_INVALID')return failure(401,'Неверный логин или PIN.');
  return failure(503,'Вход временно недоступен.');
 }
}
export async function DELETE(request:Request){
 if(!posSameOrigin(request))return failure(403,'Доступ запрещён');
 const token=posCookie(request,POS_SESSION_COOKIE);
 if(token)await getD1().prepare('DELETE FROM staff_login_sessions WHERE token_hash=?').bind(await posDigest(token)).run();
 return Response.json({ok:true},{headers:{'Cache-Control':'no-store','Set-Cookie':posSetCookie(POS_SESSION_COOKIE,'',request,0)}});
}
