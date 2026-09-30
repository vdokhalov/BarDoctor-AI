import { canonicalTaxonomyForAssortment } from "./nomenclature-taxonomy";
import { defaultNomenclatureStructure } from "./nomenclature";
import { normalizeMenuItemSaleSizeRecord, validateMenuItemSaleSize } from "./menu-sale-size";
import { normalizeExplicitConsumptionUpdates, resolveConsumptionMode, duplicateMenuItemIds } from "./consumption-mode";

export const MENU_INGESTION_STORE_KEY = "bd_menu_ingestion_v1";
export const MENU_SOURCES = ["MANUAL", "SCAN", "IMPORT"] as const;
export type MenuSource = typeof MENU_SOURCES[number];
type Row = Record<string, unknown>;
export type DraftLine = { id: string; item: Row; targetId: string | null; base: Row | null; decision: "pending" | "apply" | "skip"; reviewed: boolean; activeRecipeId?: string };
export type MenuDraft = { version: 1; id: string; venueId: number; source: MenuSource; revision: number; status: "DRAFT" | "VALIDATED" | "CONFIRMED" | "CANCELLED"; rows: DraftLine[]; createdAt: string; updatedAt: string; validationHash?: string; confirmedAt?: string; resultIds?: string[]; provenance?: { sourceFileIds: string[]; sourceUrl?: string; name?: string } };
export type DiffLine = { id: string; name: string; status: "ADDED" | "CHANGED" | "UNCHANGED" | "CONFLICT" | "INVALID" | "SKIPPED"; targetId: string | null; before: Row | null; after: Row; changes: { field: string; before: unknown; after: unknown }[]; issues: string[]; decision: DraftLine["decision"] };
const fields = ["name", "salePrice", "currency", "sectionId", "taxonomyCategoryId", "subcategoryId", "groupId", "subgroupId", "department", "category", "consumptionMode", "type", "active", "plannedSales", "readyProduct", "saleSize"];
export const object = (value: unknown): Row => value && typeof value === "object" && !Array.isArray(value) ? value as Row : {};
export const rows = (value: unknown): Row[] => Array.isArray(value) ? value.map(object) : [];
const text = (v: unknown) => typeof v === "string" ? v.trim() : "";
const sameVenue = (row: Row, venueId: number) => row.venueId == null || Number(row.venueId) === venueId;
const nameKey = (v: unknown) => text(v).normalize("NFKC").toLocaleLowerCase("ru").replace(/\s+/g, " ");
const nonnegativeNumber = (value: unknown) => (typeof value === "number" || typeof value === "string" && value.trim() !== "") && Number.isFinite(Number(value)) && Number(value) >= 0;
export function stable(value: unknown): string {
  if (Array.isArray(value)) return "[" + value.map(stable).join(",") + "]";
  if (value && typeof value === "object") return "{" + Object.entries(value).filter(([, v]) => v !== undefined).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => JSON.stringify(k) + ":" + stable(v)).join(",") + "}";
  return JSON.stringify(value ?? null);
}
export async function fingerprint(value: unknown) {
  return Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(stable(value)))), b => b.toString(16).padStart(2, "0")).join("");
}
function pick(item: Row): Row { return Object.fromEntries(fields.filter(key => key in item).map(key => [key, item[key]])); }
export function menuInput(value: unknown) { const raw = object(value); return { ...pick({ ...raw, ...object(raw.reviewInput) }), id: raw.id, confidence: raw.confidence, warnings: raw.warnings, activeRecipeId: raw.activeRecipeId, baseline: raw.baseline }; }
function editorBaseline(value: unknown, assortment: Row) {
  const item = normalizeMenuItemSaleSizeRecord(object(value), assortment);
  // bdCatState projects these four legacy presentation fields on reads.
  // Canonical classification and the underlying business fields remain exact.
  return Object.fromEntries([...fields.filter(key => !["groupId", "subgroupId", "department", "category"].includes(key)), "id", "venueId", "updatedAt"].map(key => [key, item[key]]));
}
export function menuDraft(input: { id: string; source: MenuSource; venueId: number; items: unknown[]; assortment: Row; now: string }): MenuDraft {
  const menu = rows(input.assortment.menuItems).filter(row => sameVenue(row, input.venueId));
  return { version: 1, id: input.id, source: input.source, venueId: input.venueId, revision: 1, status: "DRAFT", createdAt: input.now, updatedAt: input.now, rows: input.items.map((value, index) => {
    const raw = object(value), item = pick({ ...raw, ...object(raw.reviewInput) });
    // IDs from recognition belong to its response, not to the canonical menu.
    const byId = input.source !== "SCAN" ? menu.filter(row => row.id === raw.id) : [];
    const byName = menu.filter(row => nameKey(row.name) === nameKey(item.name));
    const base = byId.length === 1 ? byId[0] : input.source !== "MANUAL" && byName.length === 1 ? byName[0] : null;
    const candidates = byId.length ? byId : byName;
    return { id: `${input.id}:${index}`, item: { ...item, id: base?.id || `menu:${input.id}:${index}`, venueId: input.venueId, ...(raw.confidence != null ? { confidence: raw.confidence } : {}), ...(raw.warnings != null ? { warnings: raw.warnings } : {}), ...(candidates.length > 1 ? { matchingConflict: true } : {}), ...(input.source === "MANUAL" && raw.baseline && stable(editorBaseline(raw.baseline, input.assortment)) !== stable(editorBaseline(base, input.assortment)) ? { staleInput: true } : {}) }, targetId: base ? String(base.id) : null, base: base ? structuredClone(base) : null, decision: input.source === "MANUAL" ? "apply" : "pending", reviewed: input.source === "MANUAL", activeRecipeId: text(raw.activeRecipeId) || undefined };
  }) };
}
export function editMenuDraft(draft: MenuDraft, changes: unknown[], now: string): MenuDraft {
  if (draft.status === "CONFIRMED" || draft.status === "CANCELLED") throw Error("DRAFT_CLOSED");
  const ids = new Set<string>();
  const next = changes.map(value => {
    const change = object(value), id = text(change.id), old = draft.rows.find(row => row.id === id);
    if (!old || ids.has(id)) throw Error("DRAFT_ROW_INVALID"); ids.add(id);
    const decision = change.decision ?? old.decision;
    if (!["pending", "apply", "skip"].includes(String(decision))) throw Error("DRAFT_DECISION_INVALID");
    return { ...old, item: { ...old.item, ...pick(object(change.item)) }, decision: decision as DraftLine["decision"], reviewed: typeof change.reviewed === "boolean" ? change.reviewed : old.reviewed, activeRecipeId: change.activeRecipeId === undefined ? old.activeRecipeId : text(change.activeRecipeId) };
  });
  if (next.length !== draft.rows.length) throw Error("DRAFT_ROWS_REQUIRED");
  return { ...draft, rows: next, revision: draft.revision + 1, status: "DRAFT", validationHash: undefined, updatedAt: now };
}
function recipeLifecycle(root: Row, item: Row, line: DraftLine, now: string): Row[] {
  let recipes = rows(root.recipes);
  const owner = (recipe: Row) => String(recipe.menuItemId || recipe.ownerId) === String(item.id) && sameVenue(recipe, Number(item.venueId));
  let active = recipes.filter(recipe => owner(recipe) && !["inactive", "superseded"].includes(String(recipe.lifecycleStatus)) && recipe.current !== false);
  if (item.consumptionMode === "RECIPE") {
    if (active.length > 1 && line.activeRecipeId) {
      const selected = active.find((recipe, index) => String(recipe.id || `legacy:${index}`) === line.activeRecipeId);
      if (selected) { recipes = recipes.map(recipe => active.includes(recipe) ? recipe === selected ? { ...recipe, current: true, lifecycleStatus: "current" } : { ...recipe, current: false, currentDraft: false, lifecycleStatus: "inactive", inactiveReason: "consumption_mode_review", deactivatedAt: now } : recipe); active = [selected]; }
    }
    if (!active.length) {
      const restore = recipes.filter(recipe => owner(recipe) && recipe.lifecycleStatus === "inactive" && recipe.status !== "superseded" && recipe.reviewStatus !== "superseded").sort((a, b) => String(b.deactivatedAt || b.updatedAt || "").localeCompare(String(a.deactivatedAt || a.updatedAt || "")) || String(b.id).localeCompare(String(a.id)))[0];
      if (restore) recipes = recipes.map(recipe => recipe === restore ? { ...recipe, current: true, currentDraft: recipe.status !== "confirmed", lifecycleStatus: "current", inactiveReason: undefined, deactivatedAt: undefined, reactivatedAt: now } : recipe);
      else recipes = [...recipes, { id: `recipe:${line.id}`, menuItemId: item.id, ownerId: item.id, ownerType: "menu_item", venueId: item.venueId, version: 1, status: "draft", reviewStatus: "requires_review", lifecycleStatus: "current", current: true, currentDraft: true, source: "manual", ingredients: [], warnings: [], createdAt: now, updatedAt: now }];
    }
  } else if (line.base?.consumptionMode !== item.consumptionMode) {
    recipes = recipes.map(recipe => active.includes(recipe) ? { ...recipe, current: false, currentDraft: false, lifecycleStatus: "inactive", inactiveReason: "consumption_mode_switch", deactivatedAt: now } : recipe);
  }
  return recipes;
}
export function validateMenuDraft(draft: MenuDraft, assortment: Row, currency: string | null, now: string) {
  const taxonomy = canonicalTaxonomyForAssortment(assortment, defaultNomenclatureStructure()).taxonomy;
  const menu = rows(assortment.menuItems), scoped = menu.filter(row => sameVenue(row, draft.venueId));
  let after = { ...assortment, menuItems: [...menu] } as Row;
  const diff: DiffLine[] = [];
  const seenNames = new Set<string>(), seenIds = new Set<string>();
  for (const line of draft.rows) {
    const current = line.targetId ? scoped.filter(row => String(row.id) === line.targetId) : [];
    const previous = current[0] || null;
    const input = line.item;
    let item: Row = { ...previous, ...pick(input), id: previous?.id || input.id, venueId: draft.venueId };
    const issues: string[] = [];
    let conflict = false;
    if (line.decision === "skip") { diff.push({ id: line.id, name: String(item.name || "Позиция"), status: "SKIPPED", targetId: line.targetId, before: previous, after: item, changes: [], issues: [], decision: line.decision }); continue; }
    const name = nameKey(item.name);
    if (!name) issues.push("Укажите название.");
    if (seenNames.has(name) || seenIds.has(String(item.id))) { issues.push("Повторяющаяся позиция в черновике. Исключите дубликат."); conflict = true; }
    seenNames.add(name); seenIds.add(String(item.id));
    if (input.matchingConflict || current.length > 1) { issues.push("Несколько существующих позиций совпадают. Требуется отдельная сверка меню; исключите строку."); conflict = true; }
    if (input.staleInput) { issues.push("Позиция изменилась во время редактирования. Исключите строку и откройте актуальную позицию заново."); conflict = true; }
    if (line.targetId && (!previous || stable(previous) !== stable(line.base))) { issues.push("Позиция изменилась после получения черновика. Исключите строку и начните новую сверку."); conflict = true; }
    if (scoped.some(row => nameKey(row.name) === name && String(row.id) !== String(item.id))) { issues.push("Название совпадает с другой существующей позицией."); conflict = true; }
    if (!previous && menu.some(row => String(row.id) === String(item.id))) { issues.push("Идентификатор уже используется."); conflict = true; }
    const price = item.salePrice;
    if (!nonnegativeNumber(price)) issues.push("Укажите корректную неотрицательную цену."); else item.salePrice = Number(price);
    if (item.plannedSales != null && !nonnegativeNumber(item.plannedSales)) issues.push("План продаж должен быть неотрицательным числом.");
    else if (item.plannedSales != null) item.plannedSales = Number(item.plannedSales);
    if (!currency || (item.currency && item.currency !== currency)) issues.push("Валюта должна совпадать с валютой учёта заведения.");
    item.currency = currency;
    const section = taxonomy.sections.find(node => node.id === item.sectionId && node.active);
    const category = taxonomy.categories.find(node => node.id === item.taxonomyCategoryId && node.active && node.parentId === section?.id);
    const subcategory = item.subcategoryId ? taxonomy.subcategories.find(node => node.id === item.subcategoryId && node.active && node.parentId === category?.id) : null;
    if (!section || !category || (item.subcategoryId && !subcategory)) issues.push("Выберите существующий раздел и категорию; подкатегория должна принадлежать категории.");
    if (!["DIRECT_ITEM", "FIXED_QUANTITY", "RECIPE", "NONE"].includes(String(item.consumptionMode))) issues.push("Выберите способ списания.");
    if (!line.reviewed) issues.push("Проверьте значения и подтвердите проверку строки.");
    if (line.decision === "pending") issues.push(previous ? "Подтвердите изменение существующей позиции или исключите строку." : "Подтвердите добавление или исключите строку.");
    // Explicit mode changes retain the existing recipe lifecycle; ingestion never adopts AI ingredients.
    item.type = item.consumptionMode === "RECIPE" ? "composite" : item.consumptionMode === "NONE" ? "service" : "ready";
    const root = { ...after, recipes: recipeLifecycle(after, item, line, now), menuItems: [...rows(after.menuItems).filter(row => String(row.id) !== String(item.id) || !sameVenue(row, draft.venueId)), item] };
    const normalizedResult = object(normalizeExplicitConsumptionUpdates(after, root, draft.venueId, new Date(now)).data);
    const normalized = { ...normalizedResult, recipes: root.recipes };
    item = rows(object(normalized).menuItems).find(row => String(row.id) === String(item.id) && sameVenue(row, draft.venueId)) || item;
    item = normalizeMenuItemSaleSizeRecord(item, normalized);
    const candidate = { ...object(normalized), menuItems: rows(object(normalized).menuItems).map(row => row.id === item.id && sameVenue(row, draft.venueId) ? item : row) };
    const size = validateMenuItemSaleSize(item, candidate);
    if (!size.ok) issues.push(size.error || "Некорректная единица продажи.");
    const mode = resolveConsumptionMode(item, candidate, draft.venueId);
    if (!mode.ok) issues.push(mode.error || "Некорректный способ списания.");
    // An unchanged historical size is compared semantically after the same
    // normalization, so ingestion does not rewrite it merely to add metadata.
    const comparison = previous ? normalizeMenuItemSaleSizeRecord(previous, assortment) : null;
    const changes = fields.filter(field => stable(comparison?.[field]) !== stable(item[field])).map(field => ({ field, before: previous?.[field] ?? null, after: item[field] ?? null }));
    const recipeState = (root: Row) => rows(root.recipes).filter(row => String(row.menuItemId || row.ownerId) === String(item.id) && sameVenue(row, draft.venueId)).map(row => ({ id: row.id, status: row.status, lifecycleStatus: row.lifecycleStatus, current: row.current }));
    if (stable(recipeState(after)) !== stable(recipeState(candidate))) changes.push({ field: "recipeLifecycle", before: recipeState(after), after: recipeState(candidate) });
    const status = conflict ? "CONFLICT" : issues.length ? "INVALID" : !previous ? "ADDED" : changes.length ? "CHANGED" : "UNCHANGED";
    diff.push({ id: line.id, name: String(item.name || "Позиция"), status, targetId: line.targetId, before: previous, after: item, changes, issues: [...new Set(issues)], decision: line.decision });
    if (!issues.length && line.decision === "apply" && status !== "UNCHANGED") {
      item = { ...item, createdAt: previous?.createdAt || now, updatedAt: now };
      after = { ...candidate, menuItems: rows(candidate.menuItems).map(row => row.id === item.id && sameVenue(row, draft.venueId) ? item : row) };
      if (previous && Number(previous.salePrice) !== Number(item.salePrice)) after.priceHistory = [...rows(after.priceHistory), { id: `price:${line.id}`, menuItemId: item.id, venueId: draft.venueId, oldPrice: previous.salePrice, newPrice: item.salePrice, currency, source: draft.source === "MANUAL" ? "manual" : "menu_import", changedAt: now }];
    }
  }
  const untouched = scoped.filter(row => !draft.rows.some(line => line.targetId === String(row.id) && line.decision !== "skip"));
  const duplicateIds = duplicateMenuItemIds(after);
  return { ok: !duplicateIds.length && diff.every(line => !["CONFLICT", "INVALID"].includes(line.status)), diff, untouched: untouched.map(row => ({ id: row.id, name: row.name })), duplicateIds, after, taxonomy };
}
