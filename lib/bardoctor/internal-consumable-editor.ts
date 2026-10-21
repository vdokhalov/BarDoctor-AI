import { convertStockQuantity, physicalUnit } from './stock-units';

const fields = ['currentStock', 'minimumStock', 'onOrder', 'packageAmount'] as const;
type Draft = Record<string, any>;

export function changeConsumableUnit(draft: Draft, unit: string): Draft {
  if (!physicalUnit(unit)) throw new Error('Выберите единицу измерения.');
  const result: Draft = { ...draft, unit };
  for (const field of fields) {
    const value = draft[field] ?? 0;
    const converted = convertStockQuantity(value, draft.unit, unit);
    if (converted === null) {
      if (Number(value) !== 0) throw new Error('Нельзя перевести штуки, массу и объём друг в друга. Сначала обнулите количества или выберите совместимую единицу.');
      result[field] = 0;
    } else result[field] = converted;
  }
  return result;
}

export function openConsumableDraft(item: Draft): Draft {
  const unit = physicalUnit(item.unit) || 'pcs';
  const draft = { ...item, unit };
  const display = physicalUnit(item.displayUnit);
  return display && convertStockQuantity(1, unit, display) !== null ? changeConsumableUnit(draft, display) : draft;
}

export function saveConsumableDraft(draft: Draft, now = new Date().toISOString()): Draft {
  if (!String(draft.name || '').trim()) throw new Error('Введите название расходника.');
  for (const field of fields) {
    const number = convertStockQuantity(draft[field], draft.unit, draft.unit);
    if (number === null || field !== 'currentStock' && number < 0) throw new Error('Введите корректные количества. Отрицательным может быть только текущий остаток.');
  }
  // Procurement calculations and linked purchase-product amounts use g/ml/pcs.
  const unit = draft.unit === 'kg' ? 'g' : draft.unit === 'l' ? 'ml' : draft.unit;
  return { ...changeConsumableUnit(draft, unit), name: draft.name.trim(), displayUnit: draft.unit, updatedAt: now, createdAt: draft.createdAt || now };
}
