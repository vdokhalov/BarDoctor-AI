import { hasPosSession,posAllowedRequest,validPosSession } from './staff-pin-session';
/** Defense in depth for HTML routes and APIs which do not use scoped auth. */
export async function staffPinGateway(request:Request):Promise<Response|null>{
 const url=new URL(request.url),path=url.pathname;
 if(!hasPosSession(request)){
  return null;
 }
 if(path.startsWith('/api/'))return posAllowedRequest(request)?null:Response.json({ok:false,code:'ACCESS_DENIED'},{status:403,headers:{'Cache-Control':'no-store'}});
 if(/\.(?:js|css|svg|png|webp|ico|woff2?|json)$/.test(path))return null;
 const session=await validPosSession(request);
 if(path==='/login')return session?Response.redirect(new URL('/cashier?embedded=1',url),303):null;
 if(path==='/cashier'&&session)return null;
 return Response.redirect(new URL(session?'/cashier?embedded=1':'/login',url),303);
}
