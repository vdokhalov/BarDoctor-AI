type Row=Record<string,unknown>;
const record=(v:unknown):Row=>v&&typeof v==='object'&&!Array.isArray(v)?v as Row:{};
export function validMaintenanceDate(value:unknown):value is string{
 if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;
 const date=new Date(value+'T12:00:00Z');return Number.isFinite(date.getTime())&&date.toISOString().slice(0,10)===value;
}
export function equipmentPlanDateMissing(value:unknown){const row=record(value),policy=record(row.maintenancePolicy);if(policy.mode!=='date')return false;const date=row.nextMaintenance||policy.nextDate;return !validMaintenanceDate(date)||!!(policy.nextDate&&!validMaintenanceDate(policy.nextDate));}
export function changedInvalidEquipmentPlans(before:unknown,after:unknown){
 const previous=new Map((Array.isArray(before)?before:[]).map(v=>{const row=record(v);return [row.id,row]}));
 return (Array.isArray(after)?after:[]).map(record).filter(row=>equipmentPlanDateMissing(row)&&JSON.stringify(previous.get(row.id))!==JSON.stringify(row)).map(row=>({id:row.id,name:row.name}));
}
