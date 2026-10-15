import { authenticateRequest,clearSessionCookie,revokeAuthenticatedSession } from '../../../../lib/bardoctor/auth';
import { getD1 } from '../../../../db';
import { authorizePosDevice,posSameOrigin,posSetCookie,POS_DEVICE_COOKIE,POS_SESSION_COOKIE } from '../../../../lib/bardoctor/staff-pin-session';
import { readJsonRequest } from '../../../../lib/bardoctor/http';
async function manager(request:Request){const actor=await authenticateRequest(request);return actor&&!actor.posSession&&['owner','manager'].includes(actor.role)?actor:null;}
export async function POST(request:Request){
 if(!posSameOrigin(request))return new Response(null,{status:403});
 const actor=await manager(request);if(!actor)return new Response(null,{status:403});
 const device=await authorizePosDevice(actor);
 await revokeAuthenticatedSession(request,actor.actorAccountId);
 const headers=new Headers({'Cache-Control':'no-store'});
 headers.append('Set-Cookie',posSetCookie(POS_DEVICE_COOKIE,device.token,request));
 headers.append('Set-Cookie',posSetCookie(POS_SESSION_COOKIE,'',request,0));headers.append('Set-Cookie',clearSessionCookie(request));
 return Response.json({ok:true,deviceId:device.id,expiresAt:device.expires,landing:'/staff-login'},{headers});
}
export async function DELETE(request:Request){
 if(!posSameOrigin(request))return new Response(null,{status:403});
 const actor=await manager(request);if(!actor)return new Response(null,{status:403});
 const parsed=await readJsonRequest<{deviceId?:string}>(request,{maxBytes:2048});if(!parsed.ok)return parsed.response;
 const result=await getD1().prepare(`UPDATE staff_pos_devices SET revoked_at=? WHERE id=? AND venue_id=? AND EXISTS (
 SELECT 1 FROM venue_memberships WHERE id=? AND account_id=? AND venue_id=? AND status='active' AND role IN ('owner','manager')) RETURNING id`)
 .bind(new Date().toISOString(),parsed.data.deviceId||'',actor.venueId,actor.membershipId,actor.actorAccountId,actor.venueId).first();
 return Response.json({ok:!!result},{status:result?200:403,headers:{'Cache-Control':'no-store'}});
}
