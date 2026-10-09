/** Compare every supplied ingredient identity before choosing a matching candidate. */
export function createIngredientReferenceResolver(assortment: Record<string, unknown>) {
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
 const resolved=new Map<string,string>();
 const canonical=(initial:string):string=>{
  const cached=resolved.get(initial);if(cached!==undefined)return cached;
  let current=initial;const seen=new Set<string>();while(aliases.has(current)&&!seen.has(current)){seen.add(current);current=aliases.get(current)!}
  // Cache by starting identity: cycles deliberately retain their original winner.
  resolved.set(initial,current);return current;
 };
 const products=[assortment.nomenclature,assortment.stockBalances].flatMap(value=>Array.isArray(value)?value:[]);
 let known:Set<string>|undefined;
 return {canonical,conflicts(ingredient:Record<string,unknown>):boolean{
  known ??= new Set(products.flatMap(product=>[product.id,product.nomenclatureItemId,product.key,product.productKey])
   .filter((value):value is string=>typeof value==='string'&&!!value.trim()).map(value=>canonical(value.trim())));
  const references=[ingredient.nomenclatureItemId,ingredient.purchaseProductKey,ingredient.productKey,ingredient.key]
   .filter((value):value is string=>typeof value==='string'&&!!value.trim()).map(value=>canonical(value.trim()));
  return new Set(references.filter(reference=>known!.has(reference))).size>1;
 }};
}
/** Standalone calls always see current input; bulk callers own one immutable-read resolver. */
export function canonicalIngredientReference(assortment: Record<string, unknown>, initial: string): string {
 return createIngredientReferenceResolver(assortment).canonical(initial);
}
export function ingredientReferencesConflict(ingredient:Record<string,unknown>,assortment:Record<string,unknown>):boolean{
 return createIngredientReferenceResolver(assortment).conflicts(ingredient);
}
