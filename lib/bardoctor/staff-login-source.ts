import { env } from 'cloudflare:workers';
import { isIP } from 'node:net';
/** Optional additional source throttle, never the authority for login admission.
 * Enable only after end-to-end platform provenance is verified. Without a
 * verified policy, ignore all client-supplied IP headers. */
export function staffLoginSource(request:Request):string|null {
 if((env as unknown as {STAFF_PIN_SOURCE_POLICY?:string}).STAFF_PIN_SOURCE_POLICY!=='verified-cloudflare')return null;
 const source=request.headers.get('cf-connecting-ip')||'';
 const kind=isIP(source);if(!kind)throw Error('PIN_SOURCE_UNAVAILABLE');
 // Canonicalize IPv6 textual aliases to one budget. IPv4 is strictly validated.
 return kind===6?new URL('http://['+source+']/').hostname.toLowerCase():source;
}
