/** Sequential working shifts share a business date, never an identity. No writes. */
type Row=Record<string,unknown>;
const row=(x:unknown):Row=>x&&typeof x==='object'&&!Array.isArray(x)?x as Row:{};
const round=(n:number)=>Math.round(n*100)/100;
export function workShiftRows(values:unknown[],venueId:number,date:string):Row[]{return values.map(row).filter(r=>r.venueId===venueId&&r.date===date);}
export function selectWorkShift(values:Row[],id?:unknown){if(id)return values.find(r=>r.id===id);return values.find(r=>r.workdayStatus==='OPEN')??[...values].sort((a,b)=>Number(b.workdaySequence||1)-Number(a.workdaySequence||1))[0];}
export function shiftRevenues(revenues:Row[],reports:Row[],shift:Row):Row[]{
 const same=workShiftRows(reports,Number(shift.venueId),String(shift.date));
 const first=Number(shift.workdaySequence||1)===1&&same.filter(r=>Number(r.workdaySequence||1)===1).length<=1;
 return revenues.filter(r=>r.venueId===shift.venueId&&r.date===shift.date&&(r.workdayId===shift.id||r.workdayId==null&&first));
}
/** Daily compatibility projection. Stored closed shift reports remain immutable. */
export function aggregateShiftReports(values:Row[]):Row|undefined{
 if(values.length<2)return values[0];
 // A legacy daily report cannot be mixed with multiple unknown owners of a day.
 if(values.some(r=>!r.workdayStatus)||new Set(values.map(r=>r.id)).size!==values.length)return {...values[0],workdayStatus:'OPEN',closingStatus:'open',payrollBreakdown:null};
 const closed=values.every(r=>r.workdayStatus==='CLOSED');
 const known=closed&&values.every(r=>typeof row(r.payrollBreakdown).total==='number'&&Number.isFinite(row(r.payrollBreakdown).total));
 const perEmployee:Record<string,number>={},perDepartment:Record<string,number>={};
 for(const r of values)for(const [name,target]of [['perEmployee',perEmployee],['perDepartment',perDepartment]] as const)for(const [id,amount]of Object.entries(row(row(r.payrollBreakdown)[name])))if(typeof amount==='number'&&Number.isFinite(amount))target[id]=round((target[id]||0)+amount);
 const staffing=new Map<string,Row>();for(const r of values)for(const s of (Array.isArray(r.staffing)?r.staffing:[]).map(row)){const id=String(s.employeeId);const prior=staffing.get(id)||{employeeId:id};for(const k of ['hours','personalSales','units'])if(typeof s[k]==='number')prior[k]=Number(prior[k]||0)+Number(s[k]);staffing.set(id,prior);}
 return {...values[0],workdayStatus:closed?'CLOSED':'OPEN',closingStatus:closed?'closed':'open',staffing:[...staffing.values()],payrollBreakdown:known?{total:round(values.reduce((n,r)=>n+Number(row(r.payrollBreakdown).total),0)),perEmployee,perDepartment}:null,workdayShiftIds:values.map(r=>r.id)};
}
