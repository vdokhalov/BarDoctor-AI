import { readyProductLink, resolveReadyProductConsumption } from "./menu-sale-size";

export type ConsumptionMode = "DIRECT_ITEM" | "FIXED_QUANTITY" | "RECIPE" | "NONE";
type JsonRecord = Record<string, unknown>;

function record(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : {};
}
function array(value: unknown): unknown[] { return Array.isArray(value) ? value : []; }
function text(value: unknown): string { return typeof value === "string" ? value.trim() : ""; }

function activeRecipes(assortment: JsonRecord, menuItemId: string): JsonRecord[] {
  return array(assortment.recipes).map(record).filter((recipe) =>
    text(recipe.menuItemId ?? recipe.ownerId) === menuItemId
    && text(recipe.status) === "confirmed"
    && text(recipe.reviewStatus) === "approved"
    && text(recipe.lifecycleStatus) !== "superseded"
    && recipe.current !== false
  );
}

export type ConsumptionModeResolution = {
  ok: boolean;
  mode?: ConsumptionMode;
  code?: "CONSUMPTION_MODE_CONFLICT";
  error?: string;
};

export function resolveConsumptionMode(menuItemValue: unknown, assortmentValue: unknown): ConsumptionModeResolution {
  const menuItem = record(menuItemValue);
  const assortment = record(assortmentValue);
  const menuItemId = text(menuItem.id);
  const recipes = activeRecipes(assortment, menuItemId);
  const directLink = readyProductLink(menuItem);
  const service = text(menuItem.type) === "service";
  const activeCount = Number(Boolean(directLink)) + Number(recipes.length > 0);
  if (recipes.length > 1 || activeCount > 1 || (service && activeCount > 0)) {
    return {
      ok: false,
      code: "CONSUMPTION_MODE_CONFLICT",
      error: "Для позиции меню задано более одного активного способа списания. Требуется ручная проверка.",
    };
  }
  if (service) return { ok: true, mode: "NONE" };
  if (recipes.length === 1) return { ok: true, mode: "RECIPE" };
  if (!directLink) return { ok: true, mode: "NONE" };
  const consumption = resolveReadyProductConsumption(menuItem, assortment);
  return {
    ok: true,
    mode: consumption && consumption.baseUnit === "pcs" && consumption.quantityPerSale === 1
      ? "DIRECT_ITEM"
      : "FIXED_QUANTITY",
  };
}

export function changedConsumptionModeIssues(beforeValue: unknown, afterValue: unknown): Array<{
  menuItemId: string;
  code: "CONSUMPTION_MODE_CONFLICT";
  error: string;
}> {
  const before = record(beforeValue);
  const after = record(afterValue);
  const changedOwners = new Set<string>();
  const markChanges = (collection: string, owner: (value: JsonRecord) => string) => {
    const previous = new Map(array(before[collection]).map((value) => {
      const item = record(value);
      return [text(item.id), item] as const;
    }));
    const next = new Map(array(after[collection]).map((value) => {
      const item = record(value);
      return [text(item.id), item] as const;
    }));
    for (const id of new Set([...previous.keys(), ...next.keys()])) {
      if (JSON.stringify(previous.get(id)) === JSON.stringify(next.get(id))) continue;
      const beforeOwner = previous.get(id) ? owner(previous.get(id)!) : "";
      const afterOwner = next.get(id) ? owner(next.get(id)!) : "";
      if (beforeOwner) changedOwners.add(beforeOwner);
      if (afterOwner) changedOwners.add(afterOwner);
    }
  };
  markChanges("menuItems", (item) => text(item.id));
  markChanges("recipes", (recipe) => text(recipe.menuItemId ?? recipe.ownerId));
  const menuItems = new Map(array(after.menuItems).map((value) => {
    const item = record(value);
    return [text(item.id), item] as const;
  }));
  return [...changedOwners].flatMap((menuItemId) => {
    const item = menuItems.get(menuItemId);
    if (!item) return [];
    const result = resolveConsumptionMode(item, after);
    return result.ok ? [] : [{ menuItemId, code: result.code!, error: result.error! }];
  });
}
