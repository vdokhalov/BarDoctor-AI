export function normalizeStaffLogin(value:unknown):string|null{
 if(typeof value!=='string')return null;
 const normalized=value.trim().toLowerCase();
 return /^[a-z0-9][a-z0-9._-]{2,31}$/.test(normalized)?normalized:null;
}
