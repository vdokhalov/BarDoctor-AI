import {
  collectIngredientMatchCandidates,
  rankIngredientCandidates,
  reconcileIngredientQuantity,
  rememberConfirmedIngredientAliases,
  type IngredientMatchCandidate,
  type IngredientUnitResolution,
} from "./tech-card-ingredient-matching";

type JsonRecord = Record<string, unknown>;

export type TechCardOwnerState =
  | "linked"
  | "auto_linked"
  | "ambiguous"
  | "orphan"
  | "wrong_venue"
  | "superseded";

export type TechCardReviewState =
  | "approved"
  | "ai_draft"
  | "requires_review"
  | "superseded";

export type IngredientLinkState =
  | "linked"
  | "auto_linked"
  | "linked_unit_review"
  | "linked_packaging_review"
  | "ambiguous"
  | "missing"
  | "archived_source"
  | "invalid_unit"
  | "wrong_venue";

export type TechCardReconciliationReport = {
  version: "tech-card-reconciliation-v2";
  venueId: number | null;
  totalCards: number;
  correctlyLinked: number;
  autoLinked: number;
  ambiguous: number;
  orphan: number;
  wrongVenue: number;
  duplicateCandidates: number;
  approvedManualProtected: number;
  aiDrafts: number;
  requiresReview: number;
  superseded: number;
  ingredientLines: number;
  linkedIngredientLines: number;
  autoLinkedIngredientLines: number;
  ambiguousIngredientLines: number;
  missingIngredientLinks: number;
  invalidUnitConversions: number;
  linkedReadyIngredientLines: number;
  linkedUnitReviewIngredientLines: number;
  linkedPackagingReviewIngredientLines: number;
  candidateReviewIngredientLines: number;
  invalidOrCrossVenueIngredientLines: number;
  highIdentityPreviouslyUnmatched: number;
  costRecoveredIngredientLines: number;
  highConfidenceAutoLinked: number;
  mediumConfidenceNeedsReview: number;
  unmatchedIngredientLines: number;
  manualLinksProtected: number;
  crossVenueIngredientLinksRejected: number;
  unitMismatchCases: number;
  duplicateIngredientCandidateCases: number;
  autoLinkRate: number;
  reviewRate: number;
  unmatchedRate: number;
  changedCards: number;
  changedIngredientLines: number;
};

export type TechCardReconciliationResult = {
  assortment: JsonRecord;
  report: TechCardReconciliationReport;
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

function number(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = typeof value === "string" ? Number(value) : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizedName(value: unknown): string {
  return text(value, "", 300)
    .toLocaleLowerCase("ru")
    .replace(/[^a-zа-яё0-9]+/gi, " ")
    .trim();
}

function stableId(prefix: string, ...values: unknown[]): string {
  const source = values.map((value) => text(value, "", 500)).join("|");
  let hash = 2_166_136_261;
  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }
  return `${prefix}-${(hash >>> 0).toString(36)}`;
}

function stamp(value: JsonRecord): string {
  return text(
    value.updatedAt ?? value.confirmedAt ?? value.createdAt ?? value.importedAt,
    "",
    50,
  );
}

function sameVenue(value: JsonRecord, venueId?: number): boolean {
  if (!venueId || value.venueId == null || value.venueId === "") return true;
  return number(value.venueId) === venueId;
}

const APPROVED_STATUS_ALIASES = new Set(["approved", "confirmed", "published", "ready"]);

/** Keep legacy status labels readable while emitting one canonical lifecycle value. */
export function canonicalTechCardLifecycleStatus(value: unknown): "confirmed" | "draft" | "superseded" {
  const status = text(value, "draft", 40).toLocaleLowerCase("en-US");
  if (status === "superseded") return "superseded";
  if (APPROVED_STATUS_ALIASES.has(status)) return "confirmed";
  return "draft";
}

function sourceId(value: JsonRecord): string {
  return text(
    value.sourceId
      ?? value.externalId
      ?? value.externalItemId
      ?? value.importItemId
      ?? value.sourceItemId,
    "",
    200,
  );
}

function itemType(value: JsonRecord): string {
  return text(value.ownerType ?? value.menuItemType ?? value.type, "", 50);
}

function itemDepartment(value: JsonRecord): string {
  return text(value.department ?? value.section ?? value.groupId, "", 120);
}

function itemCategory(value: JsonRecord): string {
  return text(value.category ?? value.subgroupId, "", 120);
}

function ownerId(value: JsonRecord): string {
  return text(
    value.menuItemId
      ?? value.ownerId
      ?? value.ownerItemId
      ?? value.sellableItemId
      ?? value.preparedItemId,
    "",
    160,
  );
}

function ownerSourceId(value: JsonRecord): string {
  return text(
    value.menuItemSourceId
      ?? value.ownerSourceId
      ?? value.externalOwnerId
      ?? value.sourceItemId,
    "",
    200,
  );
}

function ownerName(value: JsonRecord): string {
  return text(value.menuItemName ?? value.ownerName ?? value.recipeName, "", 300);
}

function ownerCandidates(recipe: JsonRecord, menuItems: JsonRecord[]): JsonRecord[] {
  const requestedName = normalizedName(ownerName(recipe));
  if (!requestedName) return [];
  return menuItems.filter((item) => normalizedName(item.name) === requestedName);
}

function findOwner(recipe: JsonRecord, menuItems: JsonRecord[], venueId?: number): {
  owner?: JsonRecord;
  state: TechCardOwnerState;
} {
  if (!sameVenue(recipe, venueId)) return { state: "wrong_venue" };
  const requestedId = ownerId(recipe);
  if (requestedId) {
    const matched = menuItems.find((item) => text(item.id, "", 160) === requestedId);
    if (!matched) return { state: "orphan" };
    if (!sameVenue(matched, venueId)) return { state: "wrong_venue" };
    return { owner: matched, state: "linked" };
  }

  const requestedSourceId = ownerSourceId(recipe);
  if (requestedSourceId) {
    const matches = menuItems.filter((item) => sourceId(item) === requestedSourceId);
    if (matches.length === 1 && sameVenue(matches[0], venueId)) {
      return { owner: matches[0], state: "auto_linked" };
    }
    if (matches.length > 1) return { state: "ambiguous" };
  }

  const candidates = ownerCandidates(recipe, menuItems)
    .filter((candidate) => sameVenue(candidate, venueId));
  if (!candidates.length) return { state: "orphan" };
  if (candidates.length > 1) return { state: "ambiguous" };

  const candidate = candidates[0];
  const typeSignal = itemType(recipe) && itemType(candidate)
    && itemType(recipe) === itemType(candidate);
  const departmentSignal = itemDepartment(recipe) && itemDepartment(candidate)
    && itemDepartment(recipe) === itemDepartment(candidate);
  const categorySignal = itemCategory(recipe) && itemCategory(candidate)
    && itemCategory(recipe) === itemCategory(candidate);
  if (typeSignal || departmentSignal || categorySignal) {
    return { owner: candidate, state: "auto_linked" };
  }
  return { state: "ambiguous" };
}

function productKey(value: JsonRecord): string {
  return text(
    value.purchaseProductKey ?? value.productKey ?? value.key ?? value.nomenclatureItemId,
    "",
    320,
  );
}

function canonicalProductKey(assortment: JsonRecord, initial: string): string {
  const aliases = new Map([
    ...array(assortment.canonicalProductAliases),
    ...array(assortment.inventoryProductAliases),
  ].map(record)
    .map((alias) => [text(alias.from, "", 320), text(alias.to, "", 320)] as const)
    .filter(([from, to]) => Boolean(from && to && from !== to)));
  for (const product of [...array(assortment.nomenclature), ...array(assortment.stockBalances)].map(record)) {
    const canonical = text(product.productKey ?? product.key ?? product.id, "", 320);
    if (!canonical) continue;
    for (const identity of [product.id, product.nomenclatureItemId, product.key, product.productKey]) {
      const from = text(identity, "", 320);
      if (from && from !== canonical) aliases.set(from, canonical);
    }
  }
  let current = initial;
  const seen = new Set<string>();
  while (aliases.has(current) && !seen.has(current)) {
    seen.add(current);
    current = aliases.get(current)!;
  }
  return current;
}

function ingredientExternalId(value: JsonRecord): string {
  return text(
    value.nomenclatureSourceId
      ?? value.productSourceId
      ?? value.externalProductId
      ?? value.sourceItemId
      ?? value.externalId,
    "",
    200,
  );
}

function resolvedIngredient(
  ingredient: JsonRecord,
  candidate: IngredientMatchCandidate,
  baseLinkStatus: "linked" | "auto_linked",
): {
  ingredient: JsonRecord;
  state: IngredientLinkState;
  resolution: IngredientUnitResolution;
  costRecovered: boolean;
} {
  const resolution = reconcileIngredientQuantity({ ingredient, candidate });
  const state: IngredientLinkState = resolution.status === "packaging_review"
    ? "linked_packaging_review"
    : ["entity_matched_unit_unknown", "unit_incompatible"].includes(resolution.status)
      ? "linked_unit_review"
      : resolution.status === "invalid"
        ? "invalid_unit"
        : baseLinkStatus;
  const resolutionStatus = state === "linked_packaging_review"
    ? "linked_packaging_review"
    : state === "linked_unit_review"
      ? "linked_unit_review"
      : state === "invalid_unit"
        ? "invalid"
        : "linked_ready";
  const after: JsonRecord = {
    ...ingredient,
    purchaseProductKey: candidate.productKey,
    nomenclatureItemId: text(candidate.id, "", 160) || ingredient.nomenclatureItemId,
    matchedName: text(candidate.name, "", 300) || ingredient.matchedName,
    matchedBaseUnit: candidate.baseUnit,
    linkStatus: state,
    resolutionStatus,
    unitResolutionStatus: resolution.status,
    unitResolutionScore: resolution.score,
    unitResolutionReason: resolution.reason,
    unitResolutionEvidence: resolution.evidence,
    unitPackageOptions: resolution.packageOptions,
    normalizedQuantity: resolution.normalizedAmount,
    normalizedUnit: resolution.normalizedUnit,
    plausibilityWarnings: resolution.plausibilityWarning ? [resolution.plausibilityWarning] : [],
  };
  const costBasis = Number(candidate.averageUnitCost) > 0 || candidate.purchaseCount > 0;
  return {
    ingredient: after,
    state,
    resolution,
    costRecovered: resolutionStatus === "linked_ready" && costBasis,
  };
}

function reconcileIngredient(
  ingredient: JsonRecord,
  candidates: IngredientMatchCandidate[],
  assortment: JsonRecord,
  venueId?: number,
  protectAutoLink = false,
  crossVenueProductKeys = new Set<string>(),
): {
  ingredient: JsonRecord;
  state: IngredientLinkState;
  changed: boolean;
  tier: "high" | "medium" | "low" | "linked";
  manualProtected: boolean;
  unitMismatch: boolean;
  duplicateCandidateCase: boolean;
  resolutionStatus: string;
  highIdentityPreviouslyUnmatched: boolean;
  costRecovered: boolean;
} {
  const before = JSON.stringify(ingredient);

  const requestedKey = canonicalProductKey(assortment, productKey(ingredient));
  if (requestedKey) {
    if (crossVenueProductKeys.has(requestedKey) || !sameVenue(ingredient, venueId)) {
      const after = { ...ingredient, linkStatus: "wrong_venue" };
      return { ingredient: after, state: "wrong_venue", changed: JSON.stringify(after) !== before, tier: "low", manualProtected: true, unitMismatch: false, duplicateCandidateCase: false, resolutionStatus: "wrong_venue", highIdentityPreviouslyUnmatched: false, costRecovered: false };
    }
    const matched = candidates.find((candidate) =>
      canonicalProductKey(assortment, productKey(candidate)) === requestedKey,
    );
    if (!matched) {
      const after = { ...ingredient, linkStatus: "missing" };
      return { ingredient: after, state: "missing", changed: JSON.stringify(after) !== before, tier: "low", manualProtected: true, unitMismatch: false, duplicateCandidateCase: false, resolutionStatus: "manual_protected", highIdentityPreviouslyUnmatched: false, costRecovered: false };
    }
    if (!sameVenue(matched, venueId) || !sameVenue(ingredient, venueId)) {
      const after = { ...ingredient, linkStatus: "wrong_venue" };
      return { ingredient: after, state: "wrong_venue", changed: JSON.stringify(after) !== before, tier: "low", manualProtected: true, unitMismatch: false, duplicateCandidateCase: false, resolutionStatus: "invalid", highIdentityPreviouslyUnmatched: false, costRecovered: false };
    }
    const archived = matched.active === false || text(matched.status) === "archived";
    const semanticAutoLink = text(ingredient.linkSource) === "semantic_match"
      && text(ingredient.matchTier) === "high";
    const preservedState: IngredientLinkState = archived
      ? "archived_source"
      : semanticAutoLink
        ? "auto_linked"
        : "linked";
    const resolved = resolvedIngredient(ingredient, matched, preservedState === "auto_linked" ? "auto_linked" : "linked");
    return {
      ingredient: resolved.ingredient,
      state: resolved.state,
      changed: JSON.stringify(resolved.ingredient) !== before,
      tier: semanticAutoLink ? "high" : "linked",
      manualProtected: ingredient.linkConfirmedByUser === true || text(ingredient.linkSource) === "manual",
      unitMismatch: !["exact_compatible", "packaging_compatible"].includes(resolved.resolution.status),
      duplicateCandidateCase: false,
      resolutionStatus: text(resolved.ingredient.resolutionStatus),
      highIdentityPreviouslyUnmatched: false,
      costRecovered: false,
    };
  }

  const externalId = ingredientExternalId(ingredient);
  if (externalId) {
    const matches = candidates.filter((candidate) => sourceId(candidate) === externalId);
    if (matches.length === 1 && sameVenue(matches[0], venueId)) {
      const after = {
        ...ingredient,
        matchTier: "high",
        matchScore: 100,
        matchEvidence: ["совпадение stable source ID"],
      };
      const resolved = resolvedIngredient(after, matches[0], "auto_linked");
      return {
        ingredient: resolved.ingredient,
        state: resolved.state,
        changed: JSON.stringify(resolved.ingredient) !== before,
        tier: "high",
        manualProtected: false,
        unitMismatch: !["exact_compatible", "packaging_compatible"].includes(resolved.resolution.status),
        duplicateCandidateCase: false,
        resolutionStatus: text(resolved.ingredient.resolutionStatus),
        highIdentityPreviouslyUnmatched: true,
        costRecovered: resolved.costRecovered,
      };
    }
    if (matches.length > 1) {
      const after = { ...ingredient, linkStatus: "ambiguous" };
      return { ingredient: after, state: "ambiguous", changed: JSON.stringify(after) !== before, tier: "medium", manualProtected: false, unitMismatch: false, duplicateCandidateCase: true, resolutionStatus: "candidates_review", highIdentityPreviouslyUnmatched: false, costRecovered: false };
    }
  }

  const decision = rankIngredientCandidates({ ingredient, candidates, assortment, venueId });
  if (decision.tier === "high" && decision.candidate) {
    if (protectAutoLink) {
      const protectedIngredient = {
        ...ingredient,
        linkStatus: "missing",
        matchTier: "high",
        matchScore: decision.score,
        matchEvidence: decision.candidate.evidence,
        matchReason: "Утверждённая ручная техкарта защищена — связь доступна для подтверждения",
        matchSuggestions: [decision.candidate],
        manualCardProtected: true,
      };
      return {
        ingredient: protectedIngredient,
        state: "missing",
        changed: JSON.stringify(protectedIngredient) !== before,
        tier: "linked",
        manualProtected: true,
        unitMismatch: false,
        duplicateCandidateCase: decision.duplicateCandidateCase,
        resolutionStatus: "manual_protected",
        highIdentityPreviouslyUnmatched: false,
        costRecovered: false,
      };
    }
    const entity = {
      ...ingredient,
      linkSource: "semantic_match",
      entityMatchTier: "high",
      entityMatchScore: decision.score,
      matchTier: "high",
      matchScore: decision.score,
      matchEvidence: decision.candidate.evidence,
      matchReason: decision.reason,
      matchedName: decision.candidate.name,
      matchSuggestions: [],
    };
    const matched = candidates.find((candidate) => candidate.productKey === decision.candidate?.productKey)!;
    const resolved = resolvedIngredient(entity, matched, "auto_linked");
    return {
      ingredient: resolved.ingredient,
      state: resolved.state,
      changed: JSON.stringify(resolved.ingredient) !== before,
      tier: "high",
      manualProtected: false,
      unitMismatch: !["exact_compatible", "packaging_compatible"].includes(resolved.resolution.status),
      duplicateCandidateCase: decision.duplicateCandidateCase,
      resolutionStatus: text(resolved.ingredient.resolutionStatus),
      highIdentityPreviouslyUnmatched: true,
      costRecovered: resolved.costRecovered,
    };
  }
  const state: IngredientLinkState = decision.tier === "medium" ? "ambiguous" : "missing";
  const after = {
    ...ingredient,
    linkStatus: state,
    matchTier: decision.tier,
    matchScore: decision.score,
    matchReason: decision.reason,
    matchSuggestions: decision.suggestions,
  };
  return {
    ingredient: after,
    state,
    changed: JSON.stringify(after) !== before,
    tier: decision.tier,
    manualProtected: false,
    unitMismatch: decision.unitMismatch,
    duplicateCandidateCase: decision.duplicateCandidateCase,
    resolutionStatus: decision.tier === "medium" ? "candidates_review" : "unmatched",
    highIdentityPreviouslyUnmatched: false,
    costRecovered: false,
  };
}

function reviewState(recipe: JsonRecord, ownerState: TechCardOwnerState): TechCardReviewState {
  if (ownerState === "superseded") return "superseded";
  if (text(recipe.lifecycleStatus).toLocaleLowerCase("en-US") === "superseded"
    || canonicalTechCardLifecycleStatus(recipe.status) === "superseded") {
    return "superseded";
  }
  if (canonicalTechCardLifecycleStatus(recipe.status) === "confirmed"
    && ["linked", "auto_linked"].includes(ownerState)) {
    return "approved";
  }
  if (text(recipe.source) === "ai") return "ai_draft";
  return "requires_review";
}

function recipePriority(recipe: JsonRecord): number {
  const review = text(recipe.reviewStatus);
  if (review === "approved" && text(recipe.source) !== "ai") return 50;
  if (review === "approved") return 40;
  if (review === "requires_review" && text(recipe.source) !== "ai") return 30;
  if (review === "ai_draft") return 20;
  return 0;
}

function annotateVersions(recipes: JsonRecord[]): { recipes: JsonRecord[]; duplicates: number } {
  const grouped = new Map<string, JsonRecord[]>();
  for (const recipe of recipes) {
    const key = text(recipe.menuItemId, "", 160);
    if (!key || !["linked", "auto_linked"].includes(text(recipe.ownerLinkStatus))) continue;
    grouped.set(key, [...(grouped.get(key) ?? []), recipe]);
  }
  const replacements = new Map<string, JsonRecord>();
  let duplicates = 0;
  for (const [owner, values] of grouped) {
    const ordered = [...values].sort((left, right) => {
      const priority = recipePriority(right) - recipePriority(left);
      return priority || stamp(right).localeCompare(stamp(left)) || text(right.id).localeCompare(text(left.id));
    });
    const approved = ordered.filter((recipe) => text(recipe.reviewStatus) === "approved");
    const drafts = ordered.filter((recipe) => ["ai_draft", "requires_review"].includes(text(recipe.reviewStatus)));
    duplicates += Math.max(0, approved.length - 1) + Math.max(0, drafts.length - 1);
    let version = ordered.length;
    ordered.forEach((recipe, index) => {
      const current = approved.length ? recipe === approved[0] : recipe === ordered[0];
      const currentDraft = drafts.length ? recipe === drafts[0] : false;
      const superseded = !current && !currentDraft;
      const id = text(recipe.id, stableId("recipe", owner, index), 160);
      replacements.set(id, {
        ...recipe,
        id,
        version: Math.max(1, number(recipe.version) ?? version--),
        current,
        currentDraft,
        lifecycleStatus: superseded ? "superseded" : current ? "current" : "draft",
        reviewStatus: superseded ? "superseded" : recipe.reviewStatus,
        ownerLinkStatus: superseded ? "superseded" : recipe.ownerLinkStatus,
      });
    });
  }
  return {
    recipes: recipes.map((recipe) => replacements.get(text(recipe.id)) ?? recipe),
    duplicates,
  };
}

export function reconcileTechCards(input: {
  assortment: unknown;
  purchaseDocuments?: unknown[];
  venueId?: number;
  now?: Date;
}): TechCardReconciliationResult {
  const source = record(input.assortment);
  const aliases = rememberConfirmedIngredientAliases({
    assortment: source,
    venueId: input.venueId,
    now: input.now,
  });
  const workingSource = { ...source, techCardIngredientAliases: aliases };
  const menuItems = array(source.menuItems).map(record);
  const candidateCollection = collectIngredientMatchCandidates({
    assortment: workingSource,
    purchaseDocuments: input.purchaseDocuments,
    venueId: input.venueId,
  });
  const candidates = candidateCollection.candidates;
  const crossVenueProductKeys = new Set(candidateCollection.crossVenueProductKeys);
  const counters = {
    correctlyLinked: 0,
    autoLinked: 0,
    ambiguous: 0,
    orphan: 0,
    wrongVenue: 0,
    approvedManualProtected: 0,
    aiDrafts: 0,
    requiresReview: 0,
    superseded: 0,
    ingredientLines: 0,
    linkedIngredientLines: 0,
    autoLinkedIngredientLines: 0,
    ambiguousIngredientLines: 0,
    missingIngredientLinks: 0,
    invalidUnitConversions: 0,
    linkedReadyIngredientLines: 0,
    linkedUnitReviewIngredientLines: 0,
    linkedPackagingReviewIngredientLines: 0,
    candidateReviewIngredientLines: 0,
    invalidOrCrossVenueIngredientLines: 0,
    highIdentityPreviouslyUnmatched: 0,
    costRecoveredIngredientLines: 0,
    highConfidenceAutoLinked: 0,
    mediumConfidenceNeedsReview: 0,
    unmatchedIngredientLines: 0,
    manualLinksProtected: 0,
    crossVenueIngredientLinksRejected: candidateCollection.crossVenueRejected,
    unitMismatchCases: 0,
    duplicateIngredientCandidateCases: 0,
    changedCards: 0,
    changedIngredientLines: 0,
  };

  let recipes = array(source.recipes).map(record).map((recipe, recipeIndex) => {
    const before = JSON.stringify(recipe);
    const owner = findOwner(recipe, menuItems, input.venueId);
    if (owner.state === "linked") counters.correctlyLinked += 1;
    if (owner.state === "auto_linked") counters.autoLinked += 1;
    if (owner.state === "ambiguous") counters.ambiguous += 1;
    if (owner.state === "orphan") counters.orphan += 1;
    if (owner.state === "wrong_venue") counters.wrongVenue += 1;

    const ingredients = array(recipe.ingredients).map(record).map((ingredient, ingredientIndex) => {
      counters.ingredientLines += 1;
      const identified = {
        ...ingredient,
        id: text(
          ingredient.id,
          stableId("ingredient", recipe.id ?? recipeIndex, ingredient.name, ingredientIndex),
          160,
        ),
      };
      const protectAutoLink = canonicalTechCardLifecycleStatus(recipe.status) === "confirmed"
        && text(recipe.source, "manual") !== "ai";
      const result = reconcileIngredient(
        identified,
        candidates,
        workingSource,
        input.venueId,
        protectAutoLink,
        crossVenueProductKeys,
      );
      if (["linked", "linked_unit_review", "linked_packaging_review", "archived_source"].includes(result.state)) counters.linkedIngredientLines += 1;
      if (["auto_linked", "linked_unit_review", "linked_packaging_review"].includes(result.state)) counters.autoLinkedIngredientLines += 1;
      if (result.state === "ambiguous") counters.ambiguousIngredientLines += 1;
      if (["missing", "wrong_venue"].includes(result.state)) counters.missingIngredientLinks += 1;
      if (result.state === "invalid_unit") counters.invalidUnitConversions += 1;
      if (result.tier === "high") counters.highConfidenceAutoLinked += 1;
      if (result.tier === "medium") counters.mediumConfidenceNeedsReview += 1;
      if (result.tier === "low" && result.state !== "wrong_venue") counters.unmatchedIngredientLines += 1;
      if (result.manualProtected) counters.manualLinksProtected += 1;
      if (result.state === "wrong_venue") counters.crossVenueIngredientLinksRejected += 1;
      if (result.unitMismatch) counters.unitMismatchCases += 1;
      if (result.duplicateCandidateCase) counters.duplicateIngredientCandidateCases += 1;
      if (result.resolutionStatus === "linked_ready") counters.linkedReadyIngredientLines += 1;
      if (result.resolutionStatus === "linked_unit_review") counters.linkedUnitReviewIngredientLines += 1;
      if (result.resolutionStatus === "linked_packaging_review") counters.linkedPackagingReviewIngredientLines += 1;
      if (result.resolutionStatus === "candidates_review") counters.candidateReviewIngredientLines += 1;
      if (["invalid", "wrong_venue"].includes(result.resolutionStatus) || result.state === "wrong_venue") counters.invalidOrCrossVenueIngredientLines += 1;
      if (result.highIdentityPreviouslyUnmatched) counters.highIdentityPreviouslyUnmatched += 1;
      if (result.costRecovered) counters.costRecoveredIngredientLines += 1;
      if (result.changed) counters.changedIngredientLines += 1;
      return result.ingredient;
    });

    const baseReviewState = reviewState(recipe, owner.state);
    const ingredientNeedsReview = ingredients.some((ingredient) =>
      ["ambiguous", "archived_source", "invalid_unit", "wrong_venue", "linked_unit_review", "linked_packaging_review"]
        .includes(text(ingredient.linkStatus))
    );
    const finalReviewState = baseReviewState === "approved"
      && (ingredientNeedsReview || !ingredients.length)
      ? "requires_review"
      : baseReviewState;
    if (canonicalTechCardLifecycleStatus(recipe.status) === "confirmed"
      && text(recipe.source, "manual") !== "ai") {
      counters.approvedManualProtected += 1;
    }
    if (finalReviewState === "ai_draft") counters.aiDrafts += 1;
    if (finalReviewState === "requires_review") counters.requiresReview += 1;

    const identifiedOwnerId = owner.owner ? text(owner.owner.id, "", 160) : ownerId(recipe);
    const after: JsonRecord = {
      ...recipe,
      status: canonicalTechCardLifecycleStatus(recipe.status),
      id: text(recipe.id, stableId("recipe", identifiedOwnerId, recipeIndex), 160),
      menuItemId: identifiedOwnerId || undefined,
      ownerId: identifiedOwnerId || undefined,
      ownerType: "menu_item",
      ownerLinkStatus: owner.state,
      reviewStatus: finalReviewState,
      version: Math.max(1, number(recipe.version) ?? 1),
      source: text(recipe.source, "manual", 30),
      ingredients,
      reconciliationVersion: "tech-card-reconciliation-v2",
    };
    if (JSON.stringify(after) !== before) counters.changedCards += 1;
    return after;
  });

  const versioned = annotateVersions(recipes);
  recipes = versioned.recipes;
  counters.aiDrafts = recipes.filter((recipe) => text(recipe.reviewStatus) === "ai_draft").length;
  counters.requiresReview = recipes.filter((recipe) => text(recipe.reviewStatus) === "requires_review").length;
  counters.superseded = recipes.filter((recipe) => text(recipe.reviewStatus) === "superseded").length;

  const report: TechCardReconciliationReport = {
    version: "tech-card-reconciliation-v2",
    venueId: input.venueId ?? null,
    totalCards: recipes.length,
    duplicateCandidates: versioned.duplicates,
    autoLinkRate: counters.ingredientLines
      ? counters.highConfidenceAutoLinked / counters.ingredientLines
      : 0,
    reviewRate: counters.ingredientLines
      ? counters.mediumConfidenceNeedsReview / counters.ingredientLines
      : 0,
    unmatchedRate: counters.ingredientLines
      ? counters.unmatchedIngredientLines / counters.ingredientLines
      : 0,
    ...counters,
  };

  return {
    assortment: {
      ...source,
      recipes,
      techCardIngredientAliases: aliases,
      techCardReconciliation: {
        ...report,
        generatedAt: (input.now ?? new Date()).toISOString(),
        mode: "safe_additive_read_model",
      },
    },
    report,
  };
}

export function validateTechCardVenueIsolation(
  assortment: unknown,
  venueId?: number,
  purchaseDocuments: unknown[] = [],
): Array<{ code: string; recipeId: string; ingredientId?: string }> {
  if (!venueId) return [];
  const source = record(assortment);
  const menuItems = array(source.menuItems).map(record);
  const collection = collectIngredientMatchCandidates({
    assortment: source,
    purchaseDocuments,
    venueId,
  });
  const candidates = collection.candidates;
  const crossVenueProductKeys = new Set(collection.crossVenueProductKeys);
  const issues: Array<{ code: string; recipeId: string; ingredientId?: string }> = [];
  for (const recipe of array(source.recipes).map(record)) {
    const recipeId = text(recipe.id, "unknown", 160);
    if (!sameVenue(recipe, venueId)) {
      issues.push({ code: "TECH_CARD_WRONG_VENUE", recipeId });
      continue;
    }
    const linkedOwner = menuItems.find((item) => text(item.id) === ownerId(recipe));
    if (linkedOwner && !sameVenue(linkedOwner, venueId)) {
      issues.push({ code: "TECH_CARD_OWNER_WRONG_VENUE", recipeId });
    }
    for (const ingredient of array(recipe.ingredients).map(record)) {
      const key = productKey(ingredient);
      const linked = key ? candidates.find((candidate) => productKey(candidate) === key) : undefined;
      if (
        !sameVenue(ingredient, venueId)
        || crossVenueProductKeys.has(key)
        || (linked && !sameVenue(linked, venueId))
      ) {
        issues.push({
          code: "TECH_CARD_INGREDIENT_WRONG_VENUE",
          recipeId,
          ingredientId: text(ingredient.id, "unknown", 160),
        });
      }
    }
  }
  return issues;
}

export function canonicalTechCardForOwner(
  ownerIdValue: unknown,
  recipesValue: unknown,
): JsonRecord | undefined {
  const requestedOwnerId = text(ownerIdValue, "", 160);
  return array(recipesValue)
    .map(record)
    .filter((recipe) => text(recipe.menuItemId ?? recipe.ownerId, "", 160) === requestedOwnerId)
    .sort((left, right) => {
      const current = Number(right.current === true) - Number(left.current === true);
      if (current) return current;
      const draft = Number(right.currentDraft === true) - Number(left.currentDraft === true);
      if (draft) return draft;
      const priority = recipePriority(right) - recipePriority(left);
      return priority || stamp(right).localeCompare(stamp(left));
    })[0];
}
