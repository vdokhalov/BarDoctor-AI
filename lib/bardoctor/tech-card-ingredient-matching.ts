import {
  inventoryPackageAmount,
  inventoryProductKey,
  normalizeInventoryText,
  toInventoryBaseAmount,
  type BaseInventoryUnit,
} from "./inventory";
import { classifyNomenclatureItem } from "./nomenclature";
import {
  canonicalSupplierMappings,
  supplierEvidenceForCanonical,
} from "./nomenclature-identity";

type JsonRecord = Record<string, unknown>;

export type IngredientMatchTier = "high" | "medium" | "low";

export type IngredientUnitResolutionStatus =
  | "exact_compatible"
  | "packaging_compatible"
  | "entity_matched_unit_unknown"
  | "packaging_review"
  | "unit_incompatible"
  | "invalid";

export type IngredientUnitResolution = {
  status: IngredientUnitResolutionStatus;
  score: number;
  ingredientUnit: BaseInventoryUnit;
  candidateUnit: BaseInventoryUnit;
  normalizedAmount?: number;
  normalizedUnit?: BaseInventoryUnit;
  packageOptions: Array<{ label: string; amount: number; unit: BaseInventoryUnit }>;
  evidence: string[];
  reason: string;
  plausibilityWarning?: string;
};

export type IngredientMatchSuggestion = {
  productKey: string;
  nomenclatureItemId?: string;
  name: string;
  score: number;
  unit: BaseInventoryUnit;
  category: string;
  supplierName?: string;
  purchased: boolean;
  evidence: string[];
};

export type IngredientMatchDecision = {
  tier: IngredientMatchTier;
  score: number;
  candidate: IngredientMatchSuggestion | null;
  suggestions: IngredientMatchSuggestion[];
  reason: string;
  unitResolution: IngredientUnitResolution | null;
  unitMismatch: boolean;
  duplicateCandidateCase: boolean;
};

export type IngredientMatchCandidate = JsonRecord & {
  productKey: string;
  name: string;
  baseUnit: BaseInventoryUnit;
  sectionId: string;
  categoryId: string;
  subcategoryId: string;
  purchaseCount: number;
  lastPurchasedAt: string;
  supplierName: string;
  supplierNames: string[];
  supplierAliases: string[];
  sourceRank: number;
};

function record(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as JsonRecord
    : {};
}

function array(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function text(value: unknown, fallback = "", max = 300): string {
  return typeof value === "string" && value.trim()
    ? value.trim().slice(0, max)
    : fallback;
}

function numericVenue(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function belongsToVenue(value: JsonRecord, venueId?: number): boolean {
  const candidateVenue = numericVenue(value.venueId);
  return !venueId || candidateVenue === null || candidateVenue === venueId;
}

const GENERIC_TYPE_TOKENS = new Set([
  "сыр", "сок", "соус", "вода", "молок", "сливк", "масл", "мяс",
  "рыб", "овощ", "фрукт", "напиток", "продукт", "ингредиент", "товар",
]);

const SAFE_SERVICE_TOKENS = new Set([
  "свеж", "охлажден", "заморожен", "пищев", "натуральн", "весов",
]);

function stemRussianToken(value: string): string {
  if (/^pct\d+(?:[.,]\d+)?$/.test(value) || /^\d+$/.test(value)) return value;
  const suffixes = [
    "иями", "ями", "ами", "ого", "ему", "ыми", "ими", "ской", "ского",
    "ский", "ская", "ское", "ские", "ов", "ев", "ом", "ем", "ах", "ях",
    "ый", "ий", "ая", "ое", "ые", "ую", "юю", "а", "я", "ы", "и", "у", "ю",
  ];
  for (const suffix of suffixes) {
    if (value.length - suffix.length >= 4 && value.endsWith(suffix)) {
      return value.slice(0, -suffix.length);
    }
  }
  return value;
}

export function normalizeIngredientIdentity(value: unknown): {
  normalized: string;
  tokens: string[];
  distinctiveTokens: string[];
} {
  const markedPercent = text(value, "", 400)
    .toLocaleLowerCase("ru")
    .replace(/(\d+(?:[.,]\d+)?)\s*%/g, " pct$1 ")
    .replace(/\b\d+(?:[.,]\d+)?\s*(?:мл|ml|л|l|литр(?:а|ов)?|г|гр|g|кг|kg|килограмм(?:а|ов)?|шт|pcs|уп|упак|пач|бут|бан)\b/gi, " ")
    .replace(/\b(?:упаковка|упаковки|пачка|пачки|бутылка|бутылки)\s*\d+\b/gi, " ");
  const tokens = normalizeInventoryText(markedPercent)
    .split(" ")
    .filter(Boolean)
    .map(stemRussianToken)
    .filter((token) => token.length > 1 && !SAFE_SERVICE_TOKENS.has(token));
  const unique = [...new Set(tokens)].sort((left, right) => left.localeCompare(right, "ru"));
  const distinctive = unique.filter((token) => !GENERIC_TYPE_TOKENS.has(token));
  return {
    normalized: unique.join(" "),
    tokens: unique,
    distinctiveTokens: distinctive,
  };
}

function jaccard(left: string[], right: string[]): number {
  const a = new Set(left);
  const b = new Set(right);
  if (!a.size || !b.size) return 0;
  let common = 0;
  for (const token of a) if (b.has(token)) common += 1;
  return common / (a.size + b.size - common);
}

function lexicalSimilarity(leftValue: unknown, rightValue: unknown): {
  score: number;
  exactTokens: boolean;
  semanticCore: boolean;
} {
  const left = normalizeIngredientIdentity(leftValue);
  const right = normalizeIngredientIdentity(rightValue);
  if (!left.tokens.length || !right.tokens.length) {
    return { score: 0, exactTokens: false, semanticCore: false };
  }
  if (left.normalized === right.normalized) {
    return { score: 1, exactTokens: true, semanticCore: false };
  }
  const semanticCore = Boolean(
    left.distinctiveTokens.length
    && right.distinctiveTokens.length
    && left.distinctiveTokens.join(" ") === right.distinctiveTokens.join(" ")
  );
  if (semanticCore) return { score: 0.96, exactTokens: false, semanticCore: true };
  return {
    score: jaccard(left.tokens, right.tokens),
    exactTokens: false,
    semanticCore: false,
  };
}

function productKey(value: JsonRecord): string {
  return text(
    value.purchaseProductKey ?? value.productKey ?? value.key ?? value.nomenclatureItemId,
    "",
    320,
  ) || inventoryProductKey(value);
}

function baseUnit(value: JsonRecord): BaseInventoryUnit {
  const direct = text(value.baseUnit, "", 30);
  if (["ml", "g", "pcs"].includes(direct)) return direct as BaseInventoryUnit;
  const packaged = inventoryPackageAmount(value.packageSize, value.unit);
  if (packaged.unit !== "unknown") return packaged.unit;
  return toInventoryBaseAmount(1, value.unit).unit;
}

function hierarchy(value: JsonRecord): {
  sectionId: string;
  categoryId: string;
  subcategoryId: string;
} {
  const inferred = classifyNomenclatureItem(value);
  return {
    sectionId: text(value.sectionId, inferred.sectionId, 100),
    categoryId: text(value.taxonomyCategoryId ?? value.categoryId, inferred.taxonomyCategoryId, 100),
    subcategoryId: text(value.subcategoryId, inferred.subcategoryId, 100),
  };
}

function candidateFrom(value: JsonRecord, sourceRank: number): IngredientMatchCandidate | null {
  const key = productKey(value);
  const name = text(value.name ?? value.productName, "", 300);
  if (!key || !name) return null;
  const classified = hierarchy(value);
  return {
    ...value,
    productKey: key,
    name,
    baseUnit: baseUnit(value),
    ...classified,
    purchaseCount: 0,
    lastPurchasedAt: "",
    supplierName: "",
    supplierNames: [],
    supplierAliases: [],
    sourceRank,
  };
}

export function collectIngredientMatchCandidates(input: {
  assortment: unknown;
  purchaseDocuments?: unknown[];
  venueId?: number;
}): {
  candidates: IngredientMatchCandidate[];
  crossVenueRejected: number;
  crossVenueProductKeys: string[];
} {
  const assortment = record(input.assortment);
  const byKey = new Map<string, IngredientMatchCandidate>();
  const crossVenueProductKeys = new Set<string>();
  let crossVenueRejected = 0;

  const add = (raw: JsonRecord, sourceRank: number, purchase?: JsonRecord) => {
    if (!belongsToVenue(raw, input.venueId)) {
      crossVenueRejected += 1;
      const rejectedKey = productKey(raw);
      if (rejectedKey) crossVenueProductKeys.add(rejectedKey);
      return;
    }
    const candidate = candidateFrom(raw, sourceRank);
    if (!candidate || candidate.active === false || text(candidate.status) === "archived") return;
    const existing = byKey.get(candidate.productKey);
    const canonical = !existing || candidate.sourceRank > existing.sourceRank ? candidate : existing;
    const purchaseCount = (existing?.purchaseCount ?? 0) + (purchase ? 1 : 0);
    const purchasedAt = text(purchase?.date ?? purchase?.confirmedAt ?? purchase?.updatedAt, "", 50);
    byKey.set(candidate.productKey, {
      ...canonical,
      purchaseCount,
      lastPurchasedAt: purchasedAt > (existing?.lastPurchasedAt ?? "")
        ? purchasedAt
        : existing?.lastPurchasedAt ?? "",
      supplierName: text(purchase?.supplierName, existing?.supplierName ?? "", 160),
    });
  };

  for (const value of array(assortment.nomenclature).map(record)) add(value, 3);
  for (const value of array(assortment.stockBalances).map(record)) add(value, 2);

  // Supplier/source rows enrich their canonical product with aliases and
  // purchasing evidence. They are deliberately never emitted as candidates.
  for (const [key, candidate] of byKey) {
    const evidence = supplierEvidenceForCanonical(assortment, key);
    byKey.set(key, {
      ...candidate,
      supplierNames: evidence.supplierNames,
      supplierAliases: evidence.aliases,
      supplierName: evidence.supplierNames.length > 1
        ? `${evidence.supplierNames[0]} + ещё ${evidence.supplierNames.length - 1}`
        : evidence.supplierNames[0] ?? "",
    });
  }
  const mappingByLine = new Map<string, string>();
  for (const mapping of canonicalSupplierMappings(assortment)) {
    for (const lineId of mapping.purchaseLineIds) mappingByLine.set(lineId, mapping.canonicalProductKey);
  }
  for (const document of (input.purchaseDocuments ?? []).map(record)) {
    if (text(document.status) !== "confirmed") continue;
    for (const value of array(document.items).map(record)) {
      if (!belongsToVenue({ ...value, venueId: value.venueId ?? document.venueId }, input.venueId)) {
        crossVenueRejected += 1;
        continue;
      }
      const key = text(value.purchaseProductKey ?? value.productKey ?? value.canonicalProductKey, "", 320)
        || mappingByLine.get(text(value.id, "", 120))
        || "";
      const existing = byKey.get(key);
      if (!existing) continue;
      const purchasedAt = text(document.date ?? document.confirmedAt ?? document.updatedAt, "", 50);
      const supplierName = text(document.supplierName, "", 160);
      const supplierNames = [...new Set([...existing.supplierNames, supplierName].filter(Boolean))];
      byKey.set(key, {
        ...existing,
        purchaseCount: existing.purchaseCount + 1,
        lastPurchasedAt: purchasedAt > existing.lastPurchasedAt ? purchasedAt : existing.lastPurchasedAt,
        supplierNames,
        supplierName: supplierNames.length > 1
          ? `${supplierNames[0]} + ещё ${supplierNames.length - 1}`
          : supplierNames[0] ?? "",
      });
    }
  }
  return {
    candidates: [...byKey.values()],
    crossVenueRejected,
    crossVenueProductKeys: [...crossVenueProductKeys],
  };
}

function aliasKey(value: unknown): string {
  return normalizeIngredientIdentity(value).normalized;
}

function confirmedAlias(
  assortment: unknown,
  ingredient: JsonRecord,
  venueId?: number,
): JsonRecord | undefined {
  const requested = aliasKey(ingredient.name);
  const source = text(ingredient.source ?? ingredient.importSource, "", 80);
  return array(record(assortment).techCardIngredientAliases)
    .map(record)
    .find((alias) =>
      text(alias.normalizedIngredientName) === requested
      && (!venueId || numericVenue(alias.venueId) === null || numericVenue(alias.venueId) === venueId)
      && (!text(alias.source) || !source || text(alias.source) === source)
      && alias.confirmedByUser === true
    );
}

function recencyEvidence(candidate: IngredientMatchCandidate, now: Date): number {
  if (!candidate.lastPurchasedAt) return 0;
  const timestamp = new Date(candidate.lastPurchasedAt).getTime();
  if (!Number.isFinite(timestamp)) return 0;
  const days = Math.max(0, (now.getTime() - timestamp) / 86_400_000);
  return days <= 45 ? 4 : days <= 180 ? 2 : 1;
}

const HARD_INCOMPATIBLE_SECTIONS = new Set(["household", "administration"]);

function scoreCandidate(input: {
  ingredient: JsonRecord;
  candidate: IngredientMatchCandidate;
  assortment: unknown;
  venueId?: number;
  now: Date;
}): IngredientMatchSuggestion & { hardCategoryMismatch: boolean } {
  const ingredientClass = hierarchy(input.ingredient);
  const lexicalOptions = [input.candidate.name, ...input.candidate.supplierAliases]
    .map((name) => lexicalSimilarity(input.ingredient.name, name));
  const lexical = lexicalOptions.sort((left, right) => right.score - left.score)[0]
    ?? lexicalSimilarity(input.ingredient.name, input.candidate.name);
  const hardCategoryMismatch = ingredientClass.sectionId === "kitchen"
    && HARD_INCOMPATIBLE_SECTIONS.has(input.candidate.sectionId);
  const alias = confirmedAlias(input.assortment, input.ingredient, input.venueId);
  const aliasMatch = alias && text(alias.productKey, "", 320) === input.candidate.productKey;
  const evidence: string[] = [];
  let score = lexical.score * 75;

  if (lexical.exactTokens) evidence.push("совпадение слов независимо от порядка");
  else if (lexical.semanticCore) evidence.push("совпадает товарная сущность");
  else if (lexical.score >= 0.5) evidence.push("похожее название");
  if (
    input.candidate.supplierAliases.some((alias) =>
      lexicalSimilarity(input.ingredient.name, alias).score === lexical.score
      && normalizeIngredientIdentity(alias).normalized !== normalizeIngredientIdentity(input.candidate.name).normalized
    )
  ) evidence.push("совпало закупочное название поставщика");

  if (ingredientClass.subcategoryId === input.candidate.subcategoryId) {
    score += 14;
    evidence.push("та же категория");
  } else if (ingredientClass.categoryId === input.candidate.categoryId) {
    score += 10;
    evidence.push("совместимый тип товара");
  } else if (ingredientClass.sectionId === input.candidate.sectionId) {
    score += 5;
  }
  if (hardCategoryMismatch) score -= 40;

  if (input.candidate.purchaseCount > 0) {
    score += Math.min(4, input.candidate.purchaseCount) + recencyEvidence(input.candidate, input.now);
    evidence.push("есть в закупках заведения");
  }
  if (aliasMatch) {
    score = 100;
    evidence.unshift("подтверждено пользователем ранее");
  }

  const rounded = Math.max(0, Math.min(100, Math.round(score)));
  return {
    productKey: input.candidate.productKey,
    nomenclatureItemId: text(input.candidate.id, "", 160) || undefined,
    name: input.candidate.name,
    score: rounded,
    unit: input.candidate.baseUnit,
    category: input.candidate.subcategoryId || input.candidate.categoryId || input.candidate.sectionId,
    supplierName: input.candidate.supplierName || undefined,
    purchased: input.candidate.purchaseCount > 0,
    evidence: [...new Set(evidence)].slice(0, 4),
    hardCategoryMismatch,
  };
}

export const INGREDIENT_MATCH_HIGH_THRESHOLD = 86;
export const INGREDIENT_MATCH_MEDIUM_THRESHOLD = 52;
export const INGREDIENT_MATCH_REQUIRED_LEAD = 8;

function publicSuggestion(
  candidate: IngredientMatchSuggestion & { hardCategoryMismatch: boolean },
): IngredientMatchSuggestion {
  return {
    productKey: candidate.productKey,
    nomenclatureItemId: candidate.nomenclatureItemId,
    name: candidate.name,
    score: candidate.score,
    unit: candidate.unit,
    category: candidate.category,
    supplierName: candidate.supplierName,
    purchased: candidate.purchased,
    evidence: candidate.evidence,
  };
}

function packageOptionLabels(candidate: IngredientMatchCandidate): string[] {
  const raw = [
    ...array(candidate.packageOptions),
    candidate.packageSize,
    candidate.displayPackageSize,
    candidate.purchasePackageSize,
  ];
  const values = raw.map((value) => {
    const source = record(value);
    return text(source.label ?? source.packageSize ?? value, "", 120);
  }).filter(Boolean);
  return [...new Set(values.filter((value) => /\d/.test(value)))];
}

function confirmedPieceConversionLabels(candidate: IngredientMatchCandidate): string[] {
  const labels: string[] = [];
  if (text(candidate.displayUnit) === "pcs") {
    labels.push(text(candidate.displayPackageSize, "", 120));
  }
  if (text(candidate.purchaseMode) === "package") {
    labels.push(text(candidate.purchasePackageSize, "", 120));
  }
  const conversion = record(candidate.unitConversion);
  if (conversion.confirmedByUser === true) {
    labels.push(text(conversion.label ?? conversion.packageSize, "", 120));
  }
  return [...new Set(labels.filter((value) => value && /\d/.test(value)))];
}

function explicitUnitConversion(ingredient: JsonRecord, candidateUnit: BaseInventoryUnit): {
  amount: number;
  unit: BaseInventoryUnit;
  label: string;
} | null {
  const conversion = record(ingredient.unitConversion);
  if (conversion.confirmedByUser !== true) return null;
  const amount = Number(conversion.amount);
  const unit = toInventoryBaseAmount(1, conversion.unit).unit;
  if (!(amount > 0) || unit !== candidateUnit) return null;
  return {
    amount,
    unit,
    label: text(conversion.label, `1 ${text(ingredient.unit, "шт.")} = ${amount} ${unit}`, 120),
  };
}

export function reconcileIngredientQuantity(input: {
  ingredient: unknown;
  candidate: IngredientMatchCandidate;
}): IngredientUnitResolution {
  const ingredient = record(input.ingredient);
  const ingredientAmount = toInventoryBaseAmount(ingredient.quantity ?? 1, ingredient.unit);
  const candidateUnit = input.candidate.baseUnit;
  const base = {
    ingredientUnit: ingredientAmount.unit,
    candidateUnit,
  };
  if (ingredientAmount.unit === "unknown") {
    return {
      ...base,
      status: "invalid",
      score: 0,
      packageOptions: [],
      evidence: [],
      reason: "Единица нормы не поддерживается",
      plausibilityWarning: "Проверьте единицу и норму ингредиента.",
    };
  }
  if (candidateUnit === "unknown") {
    return {
      ...base,
      status: "entity_matched_unit_unknown",
      score: 25,
      packageOptions: [],
      evidence: ["товар определён, его базовая единица не задана"],
      reason: "Товар найден, но его складская единица не определена",
      plausibilityWarning: "Нельзя безопасно рассчитать норму без базовой единицы товара.",
    };
  }
  if (ingredientAmount.unit === candidateUnit) {
    return {
      ...base,
      status: "exact_compatible",
      score: 100,
      normalizedAmount: ingredientAmount.amount,
      normalizedUnit: candidateUnit,
      packageOptions: [],
      evidence: ["единицы приводятся к одной базовой величине"],
      reason: "Норма совместима со складской единицей товара",
    };
  }

  const manual = explicitUnitConversion(ingredient, candidateUnit);
  if (manual && ingredientAmount.unit === "pcs") {
    return {
      ...base,
      status: "packaging_compatible",
      score: 100,
      normalizedAmount: ingredientAmount.amount * manual.amount,
      normalizedUnit: manual.unit,
      packageOptions: [manual],
      evidence: ["использована подтверждённая пользователем конверсия"],
      reason: manual.label,
    };
  }

  const packages = packageOptionLabels(input.candidate)
    .map((label) => ({ label, ...inventoryPackageAmount(label, input.candidate.unit) }))
    .filter((value) => value.amount > 0 && value.unit === candidateUnit);
  const uniquePackages = [...new Map(packages.map((value) => [
    `${value.unit}:${value.amount}`,
    value,
  ])).values()];
  const confirmedPackages = confirmedPieceConversionLabels(input.candidate)
    .map((label) => ({ label, ...inventoryPackageAmount(label, input.candidate.unit) }))
    .filter((value) => value.amount > 0 && value.unit === candidateUnit);
  const uniqueConfirmedPackages = [...new Map(confirmedPackages.map((value) => [
    `${value.unit}:${value.amount}`,
    value,
  ])).values()];
  if (ingredientAmount.unit === "pcs" && uniqueConfirmedPackages.length === 1) {
    const packageValue = uniqueConfirmedPackages[0];
    return {
      ...base,
      status: "packaging_compatible",
      score: 90,
      normalizedAmount: ingredientAmount.amount * packageValue.amount,
      normalizedUnit: packageValue.unit,
      packageOptions: uniqueConfirmedPackages,
      evidence: ["использована единственная известная фасовка товара"],
      reason: `Норма пересчитана по фасовке ${packageValue.label}`,
    };
  }
  if (ingredientAmount.unit === "pcs" && (uniquePackages.length > 0 || uniqueConfirmedPackages.length > 1)) {
    return {
      ...base,
      status: "packaging_review",
      score: 45,
      packageOptions: (uniqueConfirmedPackages.length ? uniqueConfirmedPackages : uniquePackages).slice(0, 5),
      evidence: ["у товара несколько подходящих фасовок"],
      reason: "Выберите фасовку для пересчёта нормы",
      plausibilityWarning: "Количество в штуках нельзя пересчитать без выбора фасовки.",
    };
  }
  if (ingredientAmount.unit === "pcs") {
    return {
      ...base,
      status: "entity_matched_unit_unknown",
      score: 35,
      packageOptions: [],
      evidence: ["товар найден независимо от единицы нормы"],
      reason: `Укажите вес или объём одной ${text(ingredient.unit, "штуки", 40)}`,
      plausibilityWarning: "Штучная норма необычна для весового или объёмного товара.",
    };
  }
  return {
    ...base,
    status: "unit_incompatible",
    score: 0,
    packageOptions: uniquePackages.slice(0, 5),
    evidence: ["единицы относятся к разным измерениям"],
    reason: "Товар найден, но единицы нормы и товара несовместимы",
    plausibilityWarning: "Проверьте единицу и количество в AI-техкарте.",
  };
}

export function rankIngredientCandidates(input: {
  ingredient: unknown;
  candidates: IngredientMatchCandidate[];
  assortment?: unknown;
  venueId?: number;
  now?: Date;
}): IngredientMatchDecision {
  const ingredient = record(input.ingredient);
  const ranked = input.candidates
    .filter((candidate) => belongsToVenue(candidate, input.venueId))
    .map((candidate) => scoreCandidate({
      ingredient,
      candidate,
      assortment: input.assortment,
      venueId: input.venueId,
      now: input.now ?? new Date(),
    }))
    .filter((candidate) => candidate.score >= 20 && !candidate.hardCategoryMismatch)
    .sort((left, right) => right.score - left.score || left.name.localeCompare(right.name, "ru"));
  const best = ranked[0];
  const second = ranked[1];
  const duplicateCandidateCase = Boolean(best && second && best.score - second.score < INGREDIENT_MATCH_REQUIRED_LEAD);
  const high = Boolean(
    best
    && best.score >= INGREDIENT_MATCH_HIGH_THRESHOLD
    && !duplicateCandidateCase
  );
  if (high && best) {
    const unitResolution = reconcileIngredientQuantity({
      ingredient,
      candidate: input.candidates.find((candidate) => candidate.productKey === best.productKey)!,
    });
    return {
      tier: "high",
      score: best.score,
      candidate: publicSuggestion(best),
      suggestions: [publicSuggestion(best)],
      reason: best.evidence.join(" · ") || "Однозначное соответствие",
      unitResolution,
      unitMismatch: !["exact_compatible", "packaging_compatible"].includes(unitResolution.status),
      duplicateCandidateCase,
    };
  }
  const suggestions = ranked
    .filter((candidate) => candidate.score >= INGREDIENT_MATCH_MEDIUM_THRESHOLD)
    .slice(0, 3)
    .map(publicSuggestion);
  if (suggestions.length) {
    const unitResolution = best
      ? reconcileIngredientQuantity({
          ingredient,
          candidate: input.candidates.find((candidate) => candidate.productKey === best.productKey)!,
        })
      : null;
    return {
      tier: "medium",
      score: suggestions[0].score,
      candidate: null,
      suggestions,
      reason: duplicateCandidateCase
        ? "Есть несколько близких вариантов — требуется выбор"
        : "Нужно подтвердить наиболее подходящий вариант",
      unitResolution,
      unitMismatch: Boolean(unitResolution && !["exact_compatible", "packaging_compatible"].includes(unitResolution.status)),
      duplicateCandidateCase,
    };
  }
  return {
    tier: "low",
    score: best?.score ?? 0,
    candidate: null,
    suggestions: [],
    reason: "Надёжного соответствия не найдено",
    unitResolution: null,
    unitMismatch: false,
    duplicateCandidateCase,
  };
}

export function rememberConfirmedIngredientAliases(input: {
  assortment: unknown;
  venueId?: number;
  now?: Date;
}): JsonRecord[] {
  const assortment = record(input.assortment);
  const aliases = array(assortment.techCardIngredientAliases).map(record);
  const byId = new Map(aliases.map((alias) => [text(alias.id), alias]));
  const now = (input.now ?? new Date()).toISOString();
  for (const recipe of array(assortment.recipes).map(record)) {
    for (const ingredient of array(recipe.ingredients).map(record)) {
      if (ingredient.linkConfirmedByUser !== true && text(ingredient.linkSource) !== "manual") continue;
      const key = productKey(ingredient);
      const normalizedIngredientName = aliasKey(ingredient.name);
      if (!key || !normalizedIngredientName) continue;
      const source = text(ingredient.source ?? ingredient.importSource, "", 80);
      const id = `ingredient-alias:${input.venueId ?? "account"}:${source || "any"}:${normalizedIngredientName}`;
      byId.set(id, {
        id,
        venueId: input.venueId ?? ingredient.venueId,
        source: source || undefined,
        normalizedIngredientName,
        productKey: key,
        canonicalName: text(ingredient.matchedName ?? ingredient.canonicalName, "", 300) || undefined,
        confirmedByUser: true,
        updatedAt: now,
      });
    }
  }
  return [...byId.values()].slice(0, 5_000);
}

export function evaluateIngredientMatching(
  cases: Array<{
    ingredient: unknown;
    candidates: IngredientMatchCandidate[];
    expectedProductKey?: string;
    expectedTier: IngredientMatchTier;
  }>,
): {
  total: number;
  highConfidence: number;
  correctHighConfidence: number;
  falsePositives: number;
  highPrecision: number;
  autoLinkRate: number;
  reviewRate: number;
  unmatchedRate: number;
} {
  const decisions = cases.map((value) => ({
    value,
    decision: rankIngredientCandidates({ ingredient: value.ingredient, candidates: value.candidates }),
  }));
  const high = decisions.filter((value) => value.decision.tier === "high");
  const correctHigh = high.filter((value) =>
    value.value.expectedTier === "high"
    && value.decision.candidate?.productKey === value.value.expectedProductKey
  ).length;
  const falsePositives = high.length - correctHigh;
  const total = cases.length;
  return {
    total,
    highConfidence: high.length,
    correctHighConfidence: correctHigh,
    falsePositives,
    highPrecision: high.length ? correctHigh / high.length : 1,
    autoLinkRate: total ? high.length / total : 0,
    reviewRate: total ? decisions.filter((value) => value.decision.tier === "medium").length / total : 0,
    unmatchedRate: total ? decisions.filter((value) => value.decision.tier === "low").length / total : 0,
  };
}
