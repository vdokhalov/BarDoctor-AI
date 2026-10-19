import {menuTaxonomyPresentation} from './nomenclature-taxonomy';
type Row=Record<string,unknown>;
export function menuSectionLabel(assortment:unknown,item:unknown){return menuTaxonomyPresentation(assortment,item).department;}
export function writeoffSourceLabel(document:Row){
 return document.source==='pos_cancellation'?'Отмена позиции POS':document.source==='shift_close'?'Закрытие смены':document.source==='warehouse'?'Склад':document.source==='integration'?'Интеграция':'Источник не указан';
}
export function writeoffLocationLabel(document:Row){
 const value=String(document.location||document.warehouseExternalId||'').trim();
 return value?value.split(',').map(id=>id.trim()==='__venue__'?'Склад заведения':id.trim()).join(', '):'Основной склад';
}
