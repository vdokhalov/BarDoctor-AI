import { env } from 'cloudflare:workers';
import { hashPassword, verifyPassword } from './password';

/** Separate server binding; no fallback to a public salt or an application token. */
export async function pinLookupTag(venueId: number, pin: string): Promise<string> {
  if (!Number.isSafeInteger(venueId) || venueId <= 0 || !/^\d{6}$/.test(pin)) throw Error('PIN_INVALID');
  const secret = (env as unknown as { STAFF_PIN_LOOKUP_KEY?: string }).STAFF_PIN_LOOKUP_KEY;
  if (!secret || new TextEncoder().encode(secret).length < 32) throw Error('PIN_NOT_CONFIGURED');
  const key = await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
  const digest = await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(`bardoctor-staff-pin-v1:${venueId}:${pin}`));
  return Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');
}

export function generateStaffPin(): string {
  // Rejection sampling avoids modulo bias. Leading zeroes are significant.
  const value = new Uint32Array(1), limit = Math.floor(2 ** 32 / 1_000_000) * 1_000_000;
  do { crypto.getRandomValues(value); } while (value[0] >= limit);
  return String(value[0] % 1_000_000).padStart(6,'0');
}

export async function hashStaffPin(pin: string) {
  if (!/^\d{6}$/.test(pin)) throw Error('PIN_INVALID');
  return hashPassword(pin);
}
export async function verifyStaffPin(pin: string, record: Parameters<typeof verifyPassword>[1]) {
  return /^\d{6}$/.test(pin) && verifyPassword(pin,record);
}
