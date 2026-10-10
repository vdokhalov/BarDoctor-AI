import { finiteBusinessNumber as finite, businessRecord as record, scopedBusinessRows } from "./business-day-rows";
import { payrollForOperationalEdit } from "./finance-inputs";
type Row=Record<string,unknown>;
const weekdays=["mon","tue","wed","thu","fri","sat","sun"];
export function workdayPayrollRequirements(employee:Row,rules:Row[]) {
  const rule=rules.find(row=>row.id===employee.payrollRuleId);
  const blocks=(Array.isArray(rule?.blocks)?rule.blocks:[]).map(record).filter(block=>block.enabled);
  return { rulePresent:Boolean(rule), hours:blocks.some(b=>b.type==="hourly_rate"),personalSales:blocks.some(b=>b.type==="personal_sales_percent"),units:blocks.some(b=>b.type==="per_unit"),venueSales:blocks.some(b=>b.type==="venue_sales_percent"),departments:[...new Set(blocks.filter(b=>b.type==="department_sales_percent").map(b=>String(b.department||employee.department||"Отдел не указан")))] };
}
/** TC/Jse's existing monthly divisor: scheduled days plus recorded dates, less
 * explicitly cancelled scheduled days. UTC is used for date keys, not instants. */
export function workdaySalaryDivisor(profile:Row,date:string,revenues:Row[],gaps:Row[]) {
  const month=date.slice(0,7),recorded=new Set([date,...revenues.filter(r=>String(r.date).slice(0,7)===month).map(r=>String(r.date).slice(0,10))]);
  const cancelled=new Set(gaps.filter(r=>r.resolved&&r.reason==="closed").map(r=>r.date));
  let count=0;
  for(let d=new Date(month+"-01T12:00:00Z");d.toISOString().slice(0,7)===month;d.setUTCDate(d.getUTCDate()+1)){
    const key=d.toISOString().slice(0,10),weekday=d.getUTCDay()||7;
    if(recorded.has(key)||(!profile.trackingStartDate||key>=String(profile.trackingStartDate))&&record(profile.workingDays)[weekday]!==false&&!cancelled.has(key))count++;
  }
  return count||1;
}
/** Same enabled-block arithmetic and per-employee rounding as Wz/Kz/m7.
 * Unlike the legacy editor, this new path refuses to certify missing inputs. */
export function calculateWorkdayPayroll(input:{date:string;staffing:Row[];employees:unknown[];rules:unknown[];profile:Row;revenues:Row[];gaps:Row[];venueId:number;shiftVenueSales?:unknown;shiftDepartmentSales?:unknown;previous?:unknown}) {
  const employees=scopedBusinessRows(input.employees,{venueId:input.venueId}),rules=scopedBusinessRows(input.rules,{venueId:input.venueId});
  const missing:{employeeId:unknown;field:string;message:string}[]=[];
  const divisor=workdaySalaryDivisor(input.profile,input.date,input.revenues,input.gaps),perEmployee:Record<string,number>={},perDepartment:Record<string,number>={};
  if(!input.staffing.length)missing.push({employeeId:null,field:"team",message:"Выберите работавших сотрудников"});
  for(const staff of input.staffing){
    const employee=employees.find(e=>e.id===staff.employeeId),rule=rules.find(r=>r.id===employee?.payrollRuleId);
    const add=(field:string,message:string)=>missing.push({employeeId:staff.employeeId,field,message});
    if(!employee){add("employee","Карточка сотрудника недоступна");continue;}
    if(!rule){add("rule","Не задано правило оплаты");continue;}
    if(!Array.isArray(rule.blocks)){add("rule","Правило оплаты требует проверки");continue;}
    let sum=0;
    for(const b of rule.blocks.map(record).filter(b=>b.enabled)){
      const amount=finite(b.amount),percent=finite(b.percent);
      const fact=(field:string,value:unknown)=>{const n=finite(value);if(n==null||n<0){add(field,"Не заполнено: "+({hours:"часы",personalSales:"личные продажи",units:"количество единиц",venueSales:"база процента от выручки",departmentSales:"база процента от выручки отдела"}[field]||field));return 0;}return n;};
      if(["monthly_salary","shift_rate","hourly_rate","per_unit","manual_bonus","manual_adjustment"].includes(String(b.type))&&amount==null){add("rule","Сумма в правиле оплаты требует проверки");continue;}
      if(["personal_sales_percent","department_sales_percent","venue_sales_percent"].includes(String(b.type))&&percent==null){add("rule","Процент в правиле оплаты требует проверки");continue;}
      switch(b.type){
        case "monthly_salary":sum+=amount!/divisor;break;
        case "shift_rate":case "manual_bonus":case "manual_adjustment":sum+=amount!;break;
        case "hourly_rate":sum+=amount!*fact("hours",staff.hours);break;
        case "per_unit":sum+=amount!*fact("units",staff.units);break;
        case "personal_sales_percent":sum+=percent!/100*fact("personalSales",staff.personalSales);break;
        case "venue_sales_percent":sum+=percent!/100*fact("venueSales",input.shiftVenueSales);break;
        case "department_sales_percent":sum+=percent!/100*fact("departmentSales",record(input.shiftDepartmentSales)[String(b.department||employee.department||"Отдел не указан")]);break;
        case "weekday_rates":sum+=finite(record(b.rates)[weekdays[(new Date(input.date+"T12:00:00Z").getUTCDay()+6)%7]])??0;break;
        default:add("rule","Неизвестный тип правила оплаты");
      }
    }
    if(!Number.isFinite(sum)){add("calculation","Сумма ФОТ требует проверки");continue;}
    const value=Math.round(sum);perEmployee[String(staff.employeeId)]=value;const department=String(employee.department||"Без отдела");perDepartment[department]=(perDepartment[department]||0)+value;
  }
  if(!Number.isFinite(Object.values(perEmployee).reduce((sum,value)=>sum+value,0)))missing.push({employeeId:null,field:"calculation",message:"Сумма ФОТ требует проверки"});
  const estimate=missing.length?undefined:{perEmployee,perDepartment,total:Object.values(perEmployee).reduce((sum,value)=>sum+value,0),monthlySalaryShiftsInMonth:divisor};
  const result=payrollForOperationalEdit({previous:input.previous,businessDate:input.date,staffing:input.staffing,shiftDepartmentSales:input.shiftDepartmentSales,shiftVenueSales:input.shiftVenueSales,estimate});
  const recorded=result.basis==="RECORDED";
  return {status:recorded||!missing.length?"COMPLETE":"INCOMPLETE",missing:recorded?[]:missing,notes:recorded&&missing.length?["Сохранённый ФОТ сохранён без пересчёта; текущие правила или исходные данные требуют проверки"]:[],payrollBreakdown:result.payrollBreakdown??null,basis:result.basis};
}
