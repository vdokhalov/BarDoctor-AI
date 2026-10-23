async function bdSaveSupplierConfirmed({supplier,base,venue,headers}) {
  const data=base.some(row=>String(row.id)===String(supplier.id))?base.map(row=>String(row.id)===String(supplier.id)?supplier:row):[supplier,...base];
  const response=await fetch('/api/store/bd_suppliers',{method:'PUT',headers:{...headers,'Content-Type':'application/json','x-venue-id':String(venue)},body:JSON.stringify({data,baseData:base})});
  const result=await response.json();
  if(!response.ok||!result.ok||!Array.isArray(result.data))throw new Error('Supplier save failed');
  return result.data;
}
function bdSupplierListMetrics(suppliers,analytics,fallback){
  const saved=new Map(suppliers.map(row=>[String(row.id),row]));
  const metrics=new Map((analytics.supplierMetrics||[]).filter(row=>saved.has(String(row.id))).map(row=>[String(row.id),row]));
  return (fallback.supplierMetrics||[]).map(row=>{const metric=metrics.get(String(row.id));return metric?{...metric,name:row.name,categories:row.categories,contacts:row.contacts,conditions:row.conditions}:row}).sort((a,b)=>b.periodTotal-a.periodTotal);
}
