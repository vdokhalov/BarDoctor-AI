import { env } from 'cloudflare:workers';
import { isIP } from 'node:net';
/** Deployment approval switch, NOT proof supplied by a request. Remains unset
 * until Sites Dispatch's end-to-end header provenance is independently verified.
 * No request header, request.cf field or client-selected flag enables this mode.
 */
export function staffLoginSource(request:Request):string {
 if((env as unknown as {STAFF_PIN_SOURCE_POLICY?:string}).STAFF_PIN_SOURCE_POLICY!=='verified-cloudflare')throw Error('PIN_SOURCE_UNAVAILABLE');
 const source=request.headers.get('cf-connecting-ip')||'';
 const kind=isIP(source);if(!kind)throw Error('PIN_SOURCE_UNAVAILABLE');
 // Canonicalize IPv6 textual aliases to one budget. IPv4 is strictly validated.
 return kind===6?new URL('http://['+source+']/').hostname.toLowerCase():source;
}
