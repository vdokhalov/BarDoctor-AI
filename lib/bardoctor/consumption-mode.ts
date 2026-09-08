import {
  inventoryUnitDefinition,
  toInventoryBaseAmount,
  type BaseInventoryUnit,
  type InventoryUnitCode,
} from "./inventory";
import { readyProductLink, resolveReadyProductConsumption } from "./menu-sale-size";

export const CONSUMPTION_MODES = ["DIRECT_ITEM", "FIXED_QUANTITY", "RECIPE", "NONE"] as const;
export type ConsumptionMode = (typeof CONSUMPTION_MODES)[number];

export type ConsumptionIssueCode =
  | "CONSUMPTION_MODE_REQUIRED"
  | "CONSUMPTION_MODE_INVALID"
  | "CONSUMPTION_MODE_CONFLICT"
  | "CONSUMPTION_MODE_NEEDS_REVIEW"
  | "CONSUMPTION_REFERENCE_REQUIRED"
  | "CONSUMPTION_REFERENCE_NOT_FOUND"
  | "CONSUMPTION_REFERENCE_MISMATCH"
  | "CONSUMPTION_QUANTITY_INVALID"
  | "CONSUMPTION_UNIT_INVALID"
  | "CONSUMPTION_RECIPE_REQUIRED"
  | "CONSUMPTION_RECIPE_INCOMPLETE"
  | "CONSUMPTION_VENUE_MISMATCH"
  | "NO_RECIPE";

type JsonRecord = Record<string, unknown>;

export type ResolvedNomenclatureConsumption = {
  nomenclatureItemId: string;
  productKey: string;
  productName: string;
  quantityPerSale: number;
  inputQuantity: number;
  inputUnit: InventoryUnitCode;
  baseUnit: Exclude<BaseInventoryUnit, "unknown">;
};

export type ConsumptionResolution =
  | {
      ok: true;
      mode: "DIRECT_ITEM" | "FIXED_QUANTITY";
      source: "explicit" | "legacy";
      nomenclature: ResolvedNomenclatureConsumption;
    }
  | {
      ok: true;
      mode: "RECIPE";
      source: "explicit" | "legacy";
      recipe: JsonRecord;
    }
  | {
      ok: true;
      mode: "NONE";
      source: "explicit" | "legacy";
    }
  | {
      ok: false;
      status: "NEEDS_REVIEW" | "INVALID";
      code: ConsumptionIssueCode;
      error: string;
    };

export type ConsumptionModeResolution = {
  ok: boolean;
  mode?: ConsumptionMode;
  source?: "explicit" | "legacy";
  status?: "NEEDS_REVIEW" | "INVALID";
  code?: ConsumptionIssueCode;
  error?: string;
};

function record(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : {};
}

function array(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function text(value: unknown, fallback = "", max = 320): string {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, max) : fallback;
}

function numeric(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = typeof value === "string" ? Number(value.replace(/\s/g, "").replace(",", ".")) : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function rounded(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}

function rowVenueId(value: JsonRecord): number | null {
  const parsed = numeric(value.venueId);
  return parsed && parsed > 0 ? parsed : null;
}

function sameVenue(value: JsonRecord, expectedVenueId?: number): boolean {
  const actual = rowVenueId(value);
  return !expectedVenueId || actual === null || actual === expectedVenueId;
}

function productIds(value: JsonRecord): string[] {
  return [text(value.id, "", 320), text(value.nomenclatureItemId, "", 320)].filter(Boolean);
}

function productKey(value: JsonRecord): string {
  return text(value.productKey ?? value.key ?? value.id, "", 320);
}

function productBaseUnit(value: JsonRecord): Exclude<BaseInventoryUnit, "unknown"> | null {
  const definition = inventoryUnitDefinition(value.unit ?? value.baseUnit);
  const candidate = definition?.baseUnit ?? text(value.baseUnit ?? value.unit, "", 20);
  return (["ml", "g", "pcs"] as string[]).includes(candidate)
    ? candidate as Exclude<BaseInventoryUnit, "unknown">
    : null;
}

function exactNomenclature(
  assortment: JsonRecord,
  reference: string,
  options: { idOnly?: boolean; venueId?: number } = {},
): JsonRecord | undefined {
  const allNomenclature = array(assortment.nomenclature).map(record);
  const nomenclature = allNomenclature
    .filter((item) => sameVenue(item, options.venueId));
  const balances = array(assortment.stockBalances).map(record)
    .filter((item) => sameVenue(item, options.venueId));
  const live = (item: JsonRecord) => item.active !== false
    && item.archived !== true
    && text(item.status, "", 30) !== "archived";
  const exactNomenclatureRows = nomenclature.filter((item) =>
    productIds(item).includes(reference) && live(item)
  );
  if (exactNomenclatureRows.length > 1) return undefined;
  const canonicalIdExists = allNomenclature.some((item) =>
    productIds(item).includes(reference) && live(item)
  );
  const exactBalanceRows = balances.filter((item) => productIds(item).includes(reference) && live(item));
  if (!exactNomenclatureRows.length && !canonicalIdExists && exactBalanceRows.length > 1) return undefined;
  const idMatch = exactNomenclatureRows[0]
    ?? (!canonicalIdExists ? exactBalanceRows[0] : undefined);
  const keyRows = options.idOnly
    ? []
    : [...nomenclature, ...balances].filter((item) => productKey(item) === reference && live(item));
  const keyMatch = keyRows[0];
  const matched = idMatch ?? keyMatch;
  if (!matched) return undefined;
  const canonicalKey = productKey(matched);
  const canonicalItem = exactNomenclatureRows[0] ?? nomenclature.find((item) => live(item)
    && (productIds(item).includes(reference) || (canonicalKey && productKey(item) === canonicalKey)));
  const canonicalBalances = balances.filter((item) => live(item) && canonicalKey && productKey(item) === canonicalKey);
  const idLinkedBalances = canonicalBalances.filter((item) =>
    productIds(item).includes(reference)
  );
  // Posting indexes balances by productKey. Even when one duplicate carries the
  // selected nomenclature ID, a later row with the same key would win at
  // runtime, so every same-venue collision must remain a controlled review.
  if (canonicalBalances.length > 1) return undefined;
  const balance = idLinkedBalances[0] ?? canonicalBalances[0];
  return { ...balance, ...canonicalItem, ...matched };
}

function ownerId(recipe: JsonRecord): string {
  return text(recipe.menuItemId ?? recipe.ownerId, "", 160);
}

function recipeIsApproved(recipe: JsonRecord): boolean {
  const reviewStatus = text(recipe.reviewStatus, "", 40).toLocaleLowerCase("en-US");
  const status = text(recipe.status, "", 30).toLocaleLowerCase("en-US");
  return reviewStatus === "approved"
    || (!reviewStatus && ["approved", "confirmed", "published", "ready"].includes(status));
}

function recipeStamp(recipe: JsonRecord): string {
  return text(recipe.updatedAt ?? recipe.confirmedAt ?? recipe.createdAt ?? recipe.importedAt, "", 50);
}

function ownerRecipes(assortment: JsonRecord, menuItemId: string, venueId?: number): JsonRecord[] {
  const candidates = array(assortment.recipes).map(record).filter((recipe) =>
    ownerId(recipe) === menuItemId
    && sameVenue(recipe, venueId)
    && text(recipe.lifecycleStatus, "", 40) !== "superseded"
    && text(recipe.lifecycleStatus, "", 40) !== "inactive"
    && text(recipe.reviewStatus, "", 40) !== "superseded"
    && text(recipe.status, "", 30) !== "superseded"
    && recipe.current !== false
  );
  const explicitlyCurrent = candidates.filter((recipe) => recipe.current === true);
  if (explicitlyCurrent.length) return explicitlyCurrent;
  const approved = candidates.filter(recipeIsApproved);
  if (approved.length) return approved;
  if (candidates.length <= 1) return candidates;

  // Repeated delivery of one AI draft is one logical recipe object, not a
  // user-facing choice between independent recipes. Reconciliation can safely
  // retain the newest retry while genuinely distinct drafts stay ambiguous.
  const idempotencyKeys = new Set(candidates.map((recipe) => text(recipe.idempotencyKey, "", 320)));
  const sameAiDraft = idempotencyKeys.size === 1
    && !idempotencyKeys.has("")
    && candidates.every((recipe) => text(recipe.source, "", 30) === "ai" && !recipeIsApproved(recipe));
  if (!sameAiDraft) return candidates;
  return [[...candidates].sort((left, right) =>
    recipeStamp(right).localeCompare(recipeStamp(left))
      || text(right.id, "", 160).localeCompare(text(left.id, "", 160))
  )[0]];
}

/** Canonical active recipe candidates used by mutation paths before any first-win logic. */
export function consumptionRecipeCandidates(
  assortmentValue: unknown,
  menuItemId: string,
  venueId?: number,
): JsonRecord[] {
  return ownerRecipes(record(assortmentValue), menuItemId, venueId);
}

function postingRecipes(assortment: JsonRecord, menuItemId: string, venueId?: number): JsonRecord[] {
  return ownerRecipes(assortment, menuItemId, venueId).filter((recipe) =>
    text(recipe.status, "", 30) === "confirmed"
    && text(recipe.reviewStatus, "", 40) === "approved"
  );
}

export type ResolvedRecipeIngredientQuantity = {
  amount: number;
  unit: BaseInventoryUnit;
  source: "recipe_normalized" | "canonical_unit_conversion";
  factor: number;
};

export function resolveRecipeIngredientQuantity(value: unknown): ResolvedRecipeIngredientQuantity | null {
  const ingredient = record(value);
  const inputQuantity = numeric(ingredient.quantity);
  const normalizedQuantity = numeric(ingredient.normalizedQuantity);
  const normalizedUnit = text(ingredient.normalizedUnit, "", 20) as BaseInventoryUnit;
  if (
    normalizedQuantity !== null
    && normalizedQuantity > 0
    && ["ml", "g", "pcs"].includes(normalizedUnit)
    && ["exact_compatible", "packaging_compatible"].includes(text(ingredient.unitResolutionStatus, "", 50))
  ) {
    return {
      amount: rounded(normalizedQuantity),
      unit: normalizedUnit,
      source: "recipe_normalized",
      factor: inputQuantity !== null && inputQuantity > 0 ? normalizedQuantity / inputQuantity : 1,
    };
  }
  if (inputQuantity === null || inputQuantity <= 0) return null;
  const converted = toInventoryBaseAmount(inputQuantity, ingredient.unit);
  if (!(converted.amount > 0) || !["ml", "g", "pcs"].includes(converted.unit)) return null;
  return {
    amount: rounded(converted.amount),
    unit: converted.unit,
    source: "canonical_unit_conversion",
    factor: converted.amount / inputQuantity,
  };
}

function invalid(code: ConsumptionIssueCode, error: string): ConsumptionResolution {
  return { ok: false, status: "INVALID", code, error };
}

function needsReview(error: string): ConsumptionResolution {
  return { ok: false, status: "NEEDS_REVIEW", code: "CONSUMPTION_MODE_NEEDS_REVIEW", error };
}

function explicitMode(menuItem: JsonRecord): ConsumptionMode | null {
  const candidate = text(menuItem.consumptionMode, "", 40);
  return (CONSUMPTION_MODES as readonly string[]).includes(candidate) ? candidate as ConsumptionMode : null;
}

function hasExplicitMode(menuItem: JsonRecord): boolean {
  return Object.prototype.hasOwnProperty.call(menuItem, "consumptionMode");
}

function directOrFixed(input: {
  menuItem: JsonRecord;
  assortment: JsonRecord;
  mode: "DIRECT_ITEM" | "FIXED_QUANTITY";
  venueId?: number;
}): ConsumptionResolution {
  const configuration = record(input.menuItem.readyProduct ?? input.menuItem.readyProductLink);
  const nomenclatureItemId = text(configuration.nomenclatureItemId, "", 320);
  const configuredProductKey = text(configuration.productKey ?? configuration.key, "", 320);
  const packagesPerSale = numeric(configuration.packagesPerSale) ?? 1;
  if (!nomenclatureItemId) {
    return invalid("CONSUMPTION_REFERENCE_REQUIRED", "Выберите одну позицию номенклатуры.");
  }
  if (!(packagesPerSale > 0)) return invalid("CONSUMPTION_QUANTITY_INVALID", "Количество складских единиц должно быть больше нуля.");
  const product = exactNomenclature(input.assortment, nomenclatureItemId, {
    idOnly: true,
    venueId: input.venueId,
  });
  if (!product) {
    const foreign = exactNomenclature(input.assortment, nomenclatureItemId, { idOnly: true });
    if (foreign && !sameVenue(foreign, input.venueId)) {
      return invalid("CONSUMPTION_VENUE_MISMATCH", "Выбранная номенклатура относится к другому заведению.");
    }
    return invalid("CONSUMPTION_REFERENCE_NOT_FOUND", "Выбранная позиция номенклатуры не найдена.");
  }
  if (!sameVenue(product, input.venueId)) {
    return invalid("CONSUMPTION_VENUE_MISMATCH", "Выбранная номенклатура относится к другому заведению.");
  }
  const canonicalProductKey = productKey(product);
  if (!canonicalProductKey || (configuredProductKey && configuredProductKey !== canonicalProductKey)) {
    return invalid("CONSUMPTION_REFERENCE_MISMATCH", "ID номенклатуры и складской ключ указывают на разные товары.");
  }
  const baseUnit = productBaseUnit(product);
  if (!baseUnit) return invalid("CONSUMPTION_UNIT_INVALID", "У выбранной номенклатуры нет поддерживаемой складской единицы.");

  if (input.mode === "DIRECT_ITEM") {
    if (baseUnit !== "pcs" || packagesPerSale !== 1) {
      return invalid("CONSUMPTION_UNIT_INVALID", "Готовый товар списывается как 1 шт.; для объёма или веса выберите «Порция товара».");
    }
    return {
      ok: true,
      mode: input.mode,
      source: "explicit",
      nomenclature: {
        nomenclatureItemId,
        productKey: canonicalProductKey,
        productName: text(product.name, text(input.menuItem.name, "Складская позиция", 240), 240),
        quantityPerSale: 1,
        inputQuantity: 1,
        inputUnit: "pcs",
        baseUnit,
      },
    };
  }

  const saleSize = record(input.menuItem.saleSize);
  const quantity = numeric(saleSize.quantity);
  const definition = inventoryUnitDefinition(saleSize.unit);
  if (quantity === null || quantity <= 0) {
    return invalid("CONSUMPTION_QUANTITY_INVALID", "Количество списания должно быть больше нуля.");
  }
  if (!definition) return invalid("CONSUMPTION_UNIT_INVALID", "Выберите поддерживаемую единицу списания.");
  const converted = toInventoryBaseAmount(quantity, definition.code);
  if (converted.unit !== baseUnit || !(converted.amount > 0)) {
    return invalid("CONSUMPTION_UNIT_INVALID", "Единица порции несовместима со складской единицей выбранного товара.");
  }
  return {
    ok: true,
    mode: input.mode,
    source: "explicit",
    nomenclature: {
      nomenclatureItemId,
      productKey: canonicalProductKey,
      productName: text(product.name, text(input.menuItem.name, "Складская позиция", 240), 240),
      quantityPerSale: rounded(converted.amount),
      inputQuantity: rounded(quantity),
      inputUnit: definition.code,
      baseUnit,
    },
  };
}

function recipeConsumption(input: {
  menuItem: JsonRecord;
  assortment: JsonRecord;
  venueId?: number;
  forPosting?: boolean;
  source: "explicit" | "legacy";
}): ConsumptionResolution {
  const menuItemId = text(input.menuItem.id, "", 160);
  const configured = ownerRecipes(input.assortment, menuItemId, input.venueId);
  if (configured.length > 1) {
    return invalid("CONSUMPTION_MODE_CONFLICT", "Для позиции найдено несколько активных техкарт. Требуется ручная проверка.");
  }
  const active = configured.filter((recipe) =>
    text(recipe.status, "", 30) === "confirmed"
    && text(recipe.reviewStatus, "", 40) === "approved"
  );
  const candidates = input.forPosting ? active : configured;
  if (!candidates.length) {
    return invalid(input.forPosting ? "NO_RECIPE" : "CONSUMPTION_RECIPE_REQUIRED", input.forPosting
      ? "Нет подтверждённой техкарты для списания."
      : "Создайте техкарту для этой позиции меню.");
  }
  const recipe = candidates[0];
  if (!sameVenue(recipe, input.venueId)) {
    return invalid("CONSUMPTION_VENUE_MISMATCH", "Техкарта относится к другому заведению.");
  }
  const validateIngredients = Boolean(input.forPosting)
    || (text(recipe.status, "", 30) === "confirmed" && text(recipe.reviewStatus, "", 40) === "approved");
  if (validateIngredients) {
    const ingredients = array(recipe.ingredients).map(record);
    if (!ingredients.length) return invalid("NO_RECIPE", "В техкарте нет ингредиентов.");
    const ingredientIds = new Set<string>();
    for (const ingredient of ingredients) {
      const ingredientId = text(ingredient.id, "", 160);
      if (ingredientId && ingredientIds.has(ingredientId)) {
        return invalid("CONSUMPTION_RECIPE_INCOMPLETE", "В техкарте обнаружены повторяющиеся строки ингредиентов.");
      }
      if (ingredientId) ingredientIds.add(ingredientId);
      const explicitNomenclatureId = text(ingredient.nomenclatureItemId, "", 320);
      const reference = input.source === "explicit"
        ? explicitNomenclatureId
        : text(ingredient.nomenclatureItemId ?? ingredient.purchaseProductKey ?? ingredient.productKey, "", 320);
      if (!reference) {
        return invalid("CONSUMPTION_RECIPE_INCOMPLETE", `Ингредиент «${text(ingredient.name, "без названия", 180)}» не связан с номенклатурой.`);
      }
      const product = exactNomenclature(input.assortment, reference, {
        idOnly: input.source === "explicit",
        venueId: input.venueId,
      });
      if (!product) {
        const foreign = exactNomenclature(input.assortment, reference, { idOnly: input.source === "explicit" });
        if (foreign && !sameVenue(foreign, input.venueId)) {
          return invalid("CONSUMPTION_VENUE_MISMATCH", `Ингредиент «${text(ingredient.name, "без названия", 180)}» относится к другому заведению.`);
        }
        return invalid("CONSUMPTION_REFERENCE_NOT_FOUND", `Номенклатура ингредиента «${text(ingredient.name, "без названия", 180)}» не найдена.`);
      }
      if (!sameVenue(ingredient, input.venueId) || !sameVenue(product, input.venueId)) {
        return invalid("CONSUMPTION_VENUE_MISMATCH", `Ингредиент «${text(ingredient.name, "без названия", 180)}» относится к другому заведению.`);
      }
      const configuredKey = text(ingredient.purchaseProductKey ?? ingredient.productKey, "", 320);
      if (configuredKey && configuredKey !== productKey(product)) {
        return invalid("CONSUMPTION_REFERENCE_MISMATCH", `ID и складской ключ ингредиента «${text(ingredient.name, "без названия", 180)}» указывают на разные товары.`);
      }
      const quantity = resolveRecipeIngredientQuantity(ingredient);
      if (!quantity) {
        return invalid("CONSUMPTION_QUANTITY_INVALID", `Количество ингредиента «${text(ingredient.name, "без названия", 180)}» должно быть больше нуля.`);
      }
      if (quantity.unit !== productBaseUnit(product)) {
        return invalid("CONSUMPTION_UNIT_INVALID", `Единица ингредиента «${text(ingredient.name, "без названия", 180)}» несовместима с номенклатурой.`);
      }
    }
  }
  return { ok: true, mode: "RECIPE", source: input.source, recipe };
}

function legacyConsumption(input: {
  menuItem: JsonRecord;
  assortment: JsonRecord;
  venueId?: number;
  forPosting?: boolean;
}): ConsumptionResolution {
  const menuItemId = text(input.menuItem.id, "", 160);
  const configuredRecipes = ownerRecipes(input.assortment, menuItemId, input.venueId);
  const recipes = input.forPosting ? postingRecipes(input.assortment, menuItemId, input.venueId) : configuredRecipes;
  const directLink = readyProductLink(input.menuItem);
  const service = text(input.menuItem.type, "", 30) === "service";
  const configuredCount = Number(Boolean(directLink)) + Number(configuredRecipes.length > 0);
  if (configuredRecipes.length > 1 || configuredCount > 1 || (service && configuredCount > 0)) {
    return needsReview("Для позиции найдено несколько legacy-способов списания. Выберите правильный режим вручную.");
  }
  if (service) return { ok: true, mode: "NONE", source: "legacy" };
  if (recipes.length === 1) {
    return recipeConsumption({ ...input, source: "legacy" });
  }
  if (input.forPosting && configuredRecipes.length && !directLink) {
    return recipeConsumption({ ...input, source: "legacy" });
  }
  if (directLink) {
    const configuration = record(input.menuItem.readyProduct ?? input.menuItem.readyProductLink);
    const nomenclatureItemId = text(configuration.nomenclatureItemId ?? input.menuItem.nomenclatureItemId, "", 320);
    const configuredProductKey = text(
      configuration.productKey ?? configuration.key ?? input.menuItem.readyProductKey,
      "",
      320,
    );
    const reference = nomenclatureItemId || configuredProductKey;
    const scopedAssortment = {
      ...input.assortment,
      nomenclature: array(input.assortment.nomenclature).map(record).filter((item) => sameVenue(item, input.venueId)),
      stockBalances: array(input.assortment.stockBalances).map(record).filter((item) => sameVenue(item, input.venueId)),
    };
    const idOnly = Boolean(nomenclatureItemId);
    const product = exactNomenclature(scopedAssortment, reference, { idOnly });
    if (!product) {
      const foreign = exactNomenclature(input.assortment, reference, { idOnly });
      if (foreign && !sameVenue(foreign, input.venueId)) {
        return invalid("CONSUMPTION_VENUE_MISMATCH", "Legacy-связь указывает на номенклатуру другого заведения.");
      }
      return invalid("CONSUMPTION_REFERENCE_NOT_FOUND", "Legacy-связь с номенклатурой больше не разрешается однозначно.");
    }
    const canonicalProductKey = productKey(product);
    if (configuredProductKey && canonicalProductKey !== configuredProductKey) {
      return invalid("CONSUMPTION_REFERENCE_MISMATCH", "Legacy ID номенклатуры и складской ключ указывают на разные товары.");
    }
    const ready = resolveReadyProductConsumption(input.menuItem, scopedAssortment);
    if (!ready) return invalid("CONSUMPTION_REFERENCE_NOT_FOUND", "Legacy-связь с номенклатурой больше не разрешается однозначно.");
    const mode = ready.baseUnit === "pcs" && ready.quantityPerSale === 1 ? "DIRECT_ITEM" : "FIXED_QUANTITY";
    return {
      ok: true,
      mode,
      source: "legacy",
      nomenclature: {
        ...ready,
        inputQuantity: ready.quantityPerSale,
        inputUnit: inventoryUnitDefinition(ready.baseUnit)?.code ?? "pcs",
      },
    };
  }
  return needsReview("Способ списания не выбран. Укажите готовый товар, порцию, техкарту или отсутствие списания.");
}

export function resolveMenuConsumption(
  menuItemValue: unknown,
  assortmentValue: unknown,
  options: { venueId?: number; forPosting?: boolean } = {},
): ConsumptionResolution {
  const menuItem = record(menuItemValue);
  const assortment = record(assortmentValue);
  if (!sameVenue(menuItem, options.venueId)) {
    return invalid("CONSUMPTION_VENUE_MISMATCH", "Позиция меню относится к другому заведению.");
  }
  if (!hasExplicitMode(menuItem)) return legacyConsumption({ menuItem, assortment, ...options });
  const mode = explicitMode(menuItem);
  if (!mode) return invalid("CONSUMPTION_MODE_INVALID", "Выберите один способ списания со склада.");
  if (mode === "NONE") return { ok: true, mode, source: "explicit" };
  if (mode === "RECIPE") return recipeConsumption({ menuItem, assortment, ...options, source: "explicit" });
  return directOrFixed({ menuItem, assortment, mode, venueId: options.venueId });
}

export function resolveConsumptionMode(
  menuItemValue: unknown,
  assortmentValue: unknown,
  venueIdValue?: number,
): ConsumptionModeResolution {
  const result = resolveMenuConsumption(menuItemValue, assortmentValue, { venueId: venueIdValue });
  return result.ok
    ? { ok: true, mode: result.mode, source: result.source }
    : { ok: false, status: result.status, code: result.code, error: result.error };
}

function changedOwnerIds(before: JsonRecord, after: JsonRecord, venueId?: number): Set<string> {
  const owners = new Set<string>();
  const menuSignature = (item: JsonRecord) => JSON.stringify({
    id: item.id,
    venueId: item.venueId,
    active: item.active,
    type: item.type,
    consumptionMode: item.consumptionMode,
    readyProduct: item.readyProduct ?? item.readyProductLink,
    readyProductKey: item.readyProductKey,
    nomenclatureItemId: item.nomenclatureItemId,
    saleSize: item.saleSize,
  });
  const recipeSignature = (recipe: JsonRecord) => JSON.stringify({
    id: recipe.id,
    ownerId: ownerId(recipe),
    ownerType: recipe.ownerType,
    venueId: recipe.venueId,
    status: recipe.status,
    reviewStatus: recipe.reviewStatus,
    current: recipe.current,
    lifecycleStatus: recipe.lifecycleStatus,
    ingredients: array(recipe.ingredients).map((value) => {
      const ingredient = record(value);
      return {
        id: ingredient.id,
        quantity: ingredient.quantity,
        unit: ingredient.unit,
        normalizedQuantity: ingredient.normalizedQuantity,
        normalizedUnit: ingredient.normalizedUnit,
        nomenclatureItemId: ingredient.nomenclatureItemId,
        purchaseProductKey: ingredient.purchaseProductKey,
        productKey: ingredient.productKey,
        venueId: ingredient.venueId,
        unitResolutionStatus: ingredient.unitResolutionStatus,
        resolutionStatus: ingredient.resolutionStatus,
        linkStatus: ingredient.linkStatus,
      };
    }),
  });
  const previousMenus = new Map(array(before.menuItems).map(record).filter((item) => sameVenue(item, venueId)).map((item) => {
    return [text(item.id), item] as const;
  }));
  const nextMenus = new Map(array(after.menuItems).map(record).filter((item) => sameVenue(item, venueId)).map((item) => {
    return [text(item.id), item] as const;
  }));
  for (const id of new Set([...previousMenus.keys(), ...nextMenus.keys()])) {
    if (!id || menuSignature(previousMenus.get(id) ?? {}) === menuSignature(nextMenus.get(id) ?? {})) continue;
    owners.add(id);
  }

  const resolutionSignature = (source: JsonRecord, item: JsonRecord) => {
    const result = resolveMenuConsumption(item, source, { venueId });
    if (!result.ok) return JSON.stringify({ ok: false, status: result.status, code: result.code });
    if (result.mode === "DIRECT_ITEM" || result.mode === "FIXED_QUANTITY") {
      return JSON.stringify({
        ok: true,
        mode: result.mode,
        source: result.source,
        nomenclatureItemId: result.nomenclature.nomenclatureItemId,
        productKey: result.nomenclature.productKey,
        quantityPerSale: result.nomenclature.quantityPerSale,
        baseUnit: result.nomenclature.baseUnit,
      });
    }
    if (result.mode === "RECIPE") {
      return JSON.stringify({
        ok: true,
        mode: result.mode,
        source: result.source,
        recipeId: result.recipe.id,
      });
    }
    return JSON.stringify({ ok: true, mode: result.mode, source: result.source });
  };
  // Nomenclature is edited independently from menu/recipe rows. Revalidate a
  // menu owner whenever that external dependency changes its resolved posting
  // state, while allowing an unchanged legacy-invalid state to remain stored
  // for explicit review.
  for (const id of new Set([...previousMenus.keys(), ...nextMenus.keys()])) {
    const previous = previousMenus.get(id);
    const next = nextMenus.get(id);
    if (!id || !previous || !next) continue;
    if (resolutionSignature(before, previous) !== resolutionSignature(after, next)) owners.add(id);
  }

  const recipeSignaturesByOwner = (source: JsonRecord) => {
    const grouped = new Map<string, string[]>();
    for (const value of array(source.recipes)) {
      const recipe = record(value);
      if (!sameVenue(recipe, venueId)) continue;
      const owner = ownerId(recipe);
      if (!owner) continue;
      const signatures = grouped.get(owner) ?? [];
      signatures.push(recipeSignature(recipe));
      grouped.set(owner, signatures);
    }
    for (const signatures of grouped.values()) signatures.sort();
    return grouped;
  };
  const previousRecipes = recipeSignaturesByOwner(before);
  const nextRecipes = recipeSignaturesByOwner(after);
  for (const owner of new Set([...previousRecipes.keys(), ...nextRecipes.keys()])) {
    if (JSON.stringify(previousRecipes.get(owner) ?? []) !== JSON.stringify(nextRecipes.get(owner) ?? [])) {
      owners.add(owner);
    }
  }
  return owners;
}

export type ConsumptionMutationIssue = {
  menuItemId: string;
  code: ConsumptionIssueCode;
  error: string;
};

export function duplicateMenuItemIds(assortmentValue: unknown): string[] {
  const venuesById = new Map<string, Array<number | null>>();
  for (const value of array(record(assortmentValue).menuItems)) {
    const item = record(value);
    const id = text(item.id, "", 160);
    if (!id) continue;
    venuesById.set(id, [...(venuesById.get(id) ?? []), rowVenueId(item)]);
  }
  return [...venuesById]
    .filter(([, venues]) => {
      const unscoped = venues.filter((venueId) => venueId === null).length;
      if (unscoped) return venues.length > 1;
      return new Set(venues).size < venues.length;
    })
    .map(([id]) => id)
    .sort();
}

export function changedConsumptionModeIssues(
  beforeValue: unknown,
  afterValue: unknown,
  venueIdValue?: number,
): ConsumptionMutationIssue[] {
  const before = record(beforeValue);
  const after = record(afterValue);
  const items = new Map(array(after.menuItems).map(record).filter((item) => sameVenue(item, venueIdValue)).map((item) => {
    return [text(item.id), item] as const;
  }));
  const allAfterItems = array(after.menuItems).map(record);
  return [...changedOwnerIds(before, after, venueIdValue)].flatMap((menuItemId) => {
    const item = items.get(menuItemId);
    if (!item) {
      const movedToAnotherVenue = allAfterItems.some((candidate) =>
        text(candidate.id, "", 160) === menuItemId
        && !sameVenue(candidate, venueIdValue)
      );
      return movedToAnotherVenue
        ? [{
            menuItemId,
            code: "CONSUMPTION_VENUE_MISMATCH" as const,
            error: "Позиция меню относится к другому заведению.",
          }]
        : [];
    }
    const result = resolveMenuConsumption(item, after, { venueId: venueIdValue });
    return result.ok ? [] : [{ menuItemId, code: result.code, error: result.error }];
  });
}

export type LegacyConsumptionConflict = {
  menuItemId: string;
  name: string;
  status: "NEEDS_REVIEW";
  reasons: string[];
};

export function legacyConsumptionConflicts(
  assortmentValue: unknown,
  venueIdValue?: number,
): { total: number; items: LegacyConsumptionConflict[] } {
  const assortment = record(assortmentValue);
  const items = array(assortment.menuItems).map(record).flatMap((menuItem) => {
    if (hasExplicitMode(menuItem) || !sameVenue(menuItem, venueIdValue)) return [];
    const menuItemId = text(menuItem.id, "", 160);
    const recipes = ownerRecipes(assortment, menuItemId, venueIdValue);
    const direct = Boolean(readyProductLink(menuItem));
    const service = text(menuItem.type, "", 30) === "service";
    const reasons: string[] = [];
    if (direct && recipes.length) reasons.push("DIRECT_AND_RECIPE");
    if (recipes.length > 1) reasons.push("MULTIPLE_ACTIVE_RECIPES");
    if (service && (direct || recipes.length)) reasons.push("NONE_WITH_STOCK_CONFIGURATION");
    if (!reasons.length) return [];
    return [{
      menuItemId,
      name: text(menuItem.name, "Позиция меню", 240),
      status: "NEEDS_REVIEW" as const,
      reasons,
    }];
  });
  return { total: items.length, items };
}
