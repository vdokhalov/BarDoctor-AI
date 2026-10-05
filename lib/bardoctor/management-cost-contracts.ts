import type { EvidenceReference } from "./evidence-contracts";

export type CostScope = { workspaceId: number; venueId: number; dataAccountId: number };
/** Current correction operands, not another price source or signal family. */
export type CostIngredientBlockerV1 = {
  ingredientId: string | null; name: string;
  nomenclatureItemId: string | null; productKey: string | null; unit: string | null;
  reason: "NOMENCLATURE_MISSING" | "LINK_MISSING" | "PRICE_UNKNOWN" | "UNIT_UNKNOWN";
};
export type CostReason = "RECIPE_MISSING" | "RECIPE_EMPTY" | "RECIPE_UNAPPROVED" | "SOURCE_MISSING" | "SOURCE_INVALID" | "SOURCE_CHANGED" | "SCOPE_CONFLICT" | "PRICE_UNKNOWN" | "UNIT_UNKNOWN" | "CURRENCY_UNKNOWN" | "RECIPE_AMBIGUOUS" | "ACCESS_UNAVAILABLE";
export type CostObservationV1 = {
  metric: "current_recipe_unit_cost";
  status: "UNKNOWN" | "KNOWN_VALUE" | "KNOWN_ZERO";
  value: number | null; currency: string | null; asOf: string; calculationVersion: string;
  recipeId: string | null; recipeVersion: number | null; reasonCodes: CostReason[];
  quality: { availability: "AVAILABLE" | "PARTIAL" | "UNAVAILABLE"; scopeValid: boolean; freshness: "CURRENT_READ" | "STALE" | "UNAVAILABLE" };
  sourceManifest: { sourceKey: string; present: boolean; updatedAt: string | null; contentRevision: string }[];
  profileRevision: string; observationRevision: string; evidence: EvidenceReference[];
  blockingIngredients?: CostIngredientBlockerV1[];
  blockingIngredientsTotal?: number;
};
export type CostVerificationV1 = {
  kind: "CURRENT_RECIPE_COST_VERIFICATION"; version: 1; verificationId: string;
  signalId: string; checkedAt: string; before: CostObservationV1; after: CostObservationV1;
  result: "COST_CALCULATED"; resolutionAuthority: "CANONICAL_SERVER_REREAD";
  causalClaim: "NONE"; trigger: "OWNER_CHECK" | "VIEW_REEVALUATION" | "ACCEPTED_SAVE"; checkedBy: number;
};
export type CostEpisodeV1 = {
  contractVersion: 1; scope: CostScope; signalId: string; fingerprint: string; generation: number;
  ruleId: "active_recipe_cost_unknown"; ruleVersion: 1; menuItemId: string;
  previousEpisodeId: string | null; detectedAt: string; lastObservedAt: string;
  category: "DATA_QUALITY"; severity: "IMPORTANT"; severityBasis: "CURRENT_ITEM_COST_NOT_CALCULABLE";
  before: CostObservationV1; latest: CostObservationV1;
  condition: "ACTIVE" | "VERIFIED_RESOLVED" | "NOT_APPLICABLE";
  verificationStatus: "NOT_CHECKED" | "CANNOT_VERIFY" | "VERIFIED";
  dispositionReason: string | null; verificationResult: CostVerificationV1 | null;
};
export type CostStateV1 = {
  version: 1; scope: CostScope; menuItemId: string; fingerprint: string; generation: number;
  activeEpisodeId: string | null; lastEpisodeId: string | null;
  lastObservationRevision: string; stateVersion: number;
};
export const COST_WHY: Record<CostReason, string> = {
  RECIPE_MISSING: "Для позиции с расходом по рецепту нет текущей техкарты.",
  RECIPE_EMPTY: "В текущей техкарте нет ингредиентов.",
  RECIPE_UNAPPROVED: "Текущая техкарта ещё не подтверждена.",
  SOURCE_MISSING: "Не загружен необходимый источник расчёта.",
  SOURCE_INVALID: "Данные расчёта требуют проверки.",
  SOURCE_CHANGED: "Источники изменились. Повторите проверку.",
  SCOPE_CONFLICT: "Не удалось подтвердить принадлежность данных заведению.",
  PRICE_UNKNOWN: "Не подтверждена стоимость всех ингредиентов.",
  UNIT_UNKNOWN: "Проверьте единицы, количество и связь ингредиентов.",
  CURRENCY_UNKNOWN: "Не подтверждена единая валюта расчёта.",
  RECIPE_AMBIGUOUS: "Найдено несколько текущих техкарт или конфликт владельца.",
  ACCESS_UNAVAILABLE: "Нет доступа к необходимым данным.",
};
