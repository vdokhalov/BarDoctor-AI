/** Strict calendar date, not an inferred accounting period. */
export function validExpenseDate(value: unknown): value is string {
 if(typeof value!=="string"||!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;
 const instant=new Date(value+"T12:00:00Z");return Number.isFinite(instant.getTime())&&instant.toISOString().slice(0,10)===value;
}
export function blockUnknownExpensePeriod(report:Record<string,unknown>,issues:unknown[]):Record<string,unknown> {
 if(!issues.length)return report;
 return {...report,expenseDateIssues:issues,emptyPeriod:false,financeInputsKnown:false,resultStatus:"PARTIAL",expenses:null,operatingExpenses:null,otherExpenses:null,periodExpenses:null,...(report.inputContract&&typeof report.inputContract==="object"?{inputContract:blockUnknownExpensePeriod(report.inputContract as Record<string,unknown>,issues)}:{}),resultBeforeCost:null,resultAfterCost:null,provisionalResultBeforeCost:null,provisionalResultAfterCost:null,operatingResult:null,finalProfit:null,preliminaryResult:null,result:null,cashResult:null,
 missing:[...new Set([...(Array.isArray(report.missing)?report.missing:[]),'EXPENSE_DATE_UNKNOWN'])],
 financeAssessmentMissing:[...new Set([...(Array.isArray(report.financeAssessmentMissing)?report.financeAssessmentMissing:[]),'EXPENSE_DATE_UNKNOWN'])],
 missingInformation:[...(Array.isArray(report.missingInformation)?report.missingInformation:[]),'У расхода не указана корректная дата. Прибыль пока неизвестна.']};
}
