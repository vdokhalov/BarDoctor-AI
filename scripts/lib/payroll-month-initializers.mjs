/** Owner-approved recovery exception: restore the existing lazy month initializer. */
export function repairPayrollMonthInitializers(source) {
  const before='window.bdReadNavigationQuery("month",bdPayrollInitialMonth)';
  const after='window.bdReadNavigationQuery("month",bdPayrollInitialMonth())';
  const oldCount=source.split(before).length-1,newCount=source.split(after).length-1;
  if(oldCount===0&&newCount===2)return source;
  if(oldCount!==2||newCount!==0)throw Error('Expected the two existing Payroll month initializers');
  return source.replaceAll(before,after);
}
