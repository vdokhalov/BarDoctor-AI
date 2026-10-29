import {env} from 'cloudflare:workers';
/** Admission switch, not a distributed cancellation signal. Existing admitted work may finish. */
export function holidayAutoSyncPaused(){
 const raw=(env as unknown as {HOLIDAY_AUTO_SYNC_DISABLED?:string}).HOLIDAY_AUTO_SYNC_DISABLED;
 return raw!==undefined&&raw!==''&&raw.trim().toLowerCase()!=='false';
}
export const HOLIDAY_SYNC_PAUSED_MESSAGE='Автообновление приостановлено. Показан сохранённый календарь.';
