/** Presentation only. Current recipe costing is independent of historical sales snapshots. */
export function assortmentReadinessView(analytics: any, status?: string | null) {
 const items=Array.isArray(analytics?.menuItems)?analytics.menuItems:[];
 const verified=!status&&analytics?.version==='assortment-analytics-v1';
 const incomplete=items.filter((item:any)=>typeof item.recipeCost!=='number'||!Number.isFinite(item.recipeCost));
 return {verified,total:items.length,incomplete:incomplete.length,known:items.length-incomplete.length,
  score:verified?String(analytics?.readiness?.score??0)+'%':'—',
  costLabel:!verified?(status==='error'?'Себестоимость не проверена':'Проверяем себестоимость…'):!items.length?'Меню пустое':`Себестоимость рассчитана: ${items.length-incomplete.length} из ${items.length}`,
  noIssuesLabel:!verified?'Проверка не завершена':incomplete.length?'Себестоимость неполная':'Текущие данные меню проверены',
 };
}
