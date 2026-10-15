export const POS_DEVICE_COOKIE='bd_pos_device', POS_SESSION_COOKIE='bd_pos_session';
export const POS_LIFETIME_SECONDS=30*24*60*60;
export function posCookie(request:Request,name:string){
 const entry=(request.headers.get('cookie')||'').split(';').map(s=>s.trim()).find(s=>s.startsWith(name+'='));
 return entry?.slice(name.length+1)||null;
}
export function hasPosSession(request:Request){return posCookie(request,POS_SESSION_COOKIE)!==null;}
export function posSetCookie(name:string,value:string,request:Request,seconds=POS_LIFETIME_SECONDS){
 return `${name}=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${seconds}${new URL(request.url).protocol==='https:'?'; Secure':''}`;
}
export async function posDigest(value:string){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))),b=>b.toString(16).padStart(2,'0')).join('');}
export function posToken(){return Array.from(crypto.getRandomValues(new Uint8Array(32)),b=>b.toString(16).padStart(2,'0')).join('');}
export function posSameOrigin(request:Request){return request.headers.get('origin')===new URL(request.url).origin;}
