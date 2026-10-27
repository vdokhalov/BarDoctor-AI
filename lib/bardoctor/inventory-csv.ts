import {parseOnboardingCsv} from './onboarding-csv';
export function parseInventoryCsv(source:string){
 const header=source.replace(/^\uFEFF/,'').split(/\r?\n/,1)[0];
 const parsed=parseOnboardingCsv(source,header.includes('\t')?'\t':undefined);
 const normalize=(s:string)=>s.toLowerCase().replace(/[\s._-]+/g,'');
 const aliases=[['name','product','наименование','название','товар'],['quantity','actual','count','количество','факт','остаток','фактическийостаток'],['unit','ед','едизм','единица','единицаизмерения']];
 const indexes=aliases.map(names=>parsed.columns.map((s,i)=>names.includes(normalize(s))?i:-1).filter(i=>i>=0));
 if(indexes.some(i=>i.length!==1))throw new Error('Нужны столбцы: наименование, количество, единица.');
 const [name,quantity,unit]=indexes.map(i=>i[0]);
 return {date:'',items:parsed.rows.map(row=>({name:row[name],quantity:row[quantity],unit:row[unit]})),warnings:[]};
}
