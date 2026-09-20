/** Compare every supplied ingredient identity before choosing a matching candidate. */
export function canonicalIngredientReference(assortment: Record<string, unknown>, initial: string): string {
 const rows=(value:unknown):Record<string,unknown>[]=>Array.isArray(value)?value.filter(x=>x&&typeof x==='object'):[];
 const text=(value:unknown)=>typeof value==='string'?value.trim():'';
 const aliases=new Map<string,string>();
 for(const alias of [...rows(assortment.canonicalProductAliases),...rows(assortment.inventoryProductAliases)]){
  const from=text(alias.from),to=text(alias.to);if(from&&to&&from!==to)aliases.set(from,to);
 }
 for(const product of [...rows(assortment.nomenclature),...rows(assortment.stockBalances)]){
  const canonical=text(product.productKey??product.key??product.id);if(!canonical)continue;
  for(const value of [product.id,product.nomenclatureItemId,product.key,product.productKey]){const from=text(value);if(from&&from!==canonical)aliases.set(from,canonical)}
 }
 let current=initial;const seen=new Set<string>();while(aliases.has(current)&&!seen.has(current)){seen.add(current);current=aliases.get(current)!}return current;
}
export function ingredientReferencesConflict(ingredient:Record<string,unknown>,assortment:Record<string,unknown>):boolean{
 const references=[ingredient.nomenclatureItemId,ingredient.purchaseProductKey,ingredient.productKey,ingredient.key]
  .filter((value):value is string=>typeof value==='string'&&!!value.trim())
  .map(value=>canonicalIngredientReference(assortment,value.trim()));
 return new Set(references).size>1;
}
