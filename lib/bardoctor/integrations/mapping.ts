import { normalizeInventoryText } from "../inventory";

type JsonRecord = Record<string, unknown>;

export type MappingEntityType = "stock_product" | "menu_item";

export type MappingCandidate = {
  id: string;
  name: string;
  unit?: string;
  packageSize?: string;
  barcode?: string;
};

export type MappingDecision = {
  status: "confirmed" | "suggested" | "unresolved";
  confidence: number;
  candidate: MappingCandidate | null;
  alternatives: MappingCandidate[];
  reason: string;
};

function record(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as JsonRecord
    : {};
}

function list(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function text(value: unknown, fallback = "", max = 300): string {
  return typeof value === "string" && value.trim()
    ? value.trim().slice(0, max)
    : fallback;
}

const CYRILLIC_TO_LATIN: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh",
  з: "z", и: "i", й: "i", к: "k", л: "l", м: "m", н: "n", о: "o",
  п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f", х: "h", ц: "c",
  ч: "ch", ш: "sh", щ: "sh", ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya",
};

function matchingText(value: string): string {
  return [...normalizeInventoryText(value)]
    .map((character) => CYRILLIC_TO_LATIN[character] ?? character)
    .join("")
    // Brand exports mix phonetic Latin and Cyrillic spellings (for example,
    // `Кока-Кола` and `Coca-Cola`). Treat c/k as the same search sound; the
    // package/unit and uniqueness thresholds still prevent automatic guessing.
    .replace(/k/g, "c")
    .replace(/\s+/g, " ")
    .trim();
}

function grams(value: string): Set<string> {
  const normalized = ` ${matchingText(value)} `;
  const result = new Set<string>();
  for (let index = 0; index < normalized.length - 1; index += 1) {
    result.add(normalized.slice(index, index + 2));
  }
  return result;
}

function dice(left: string, right: string): number {
  const a = grams(left);
  const b = grams(right);
  if (!a.size || !b.size) return 0;
  let common = 0;
  for (const value of a) if (b.has(value)) common += 1;
  return (2 * common) / (a.size + b.size);
}

function volume(value: string): { amount: number; unit: "ml" | "g" | "pcs" } | null {
  const normalized = value.toLocaleLowerCase("ru").replace(/,/g, ".");
  const match = normalized.match(/(\d+(?:\.\d+)?)\s*(мл|ml|л|l|литр|г|гр|g|кг|kg|шт|pcs)/i);
  if (!match) return null;
  const amount = Number(match[1]);
  const unit = match[2].toLocaleLowerCase("ru");
  if (/^(л|l|литр)/.test(unit)) return { amount: amount * 1_000, unit: "ml" };
  if (/^(мл|ml)/.test(unit)) return { amount, unit: "ml" };
  if (/^(кг|kg)/.test(unit)) return { amount: amount * 1_000, unit: "g" };
  if (/^(г|гр|g)/.test(unit)) return { amount, unit: "g" };
  return { amount, unit: "pcs" };
}

function candidateScore(external: MappingCandidate, candidate: MappingCandidate): number {
  if (external.id && external.id === candidate.id) return 100;
  if (external.barcode && candidate.barcode && external.barcode === candidate.barcode) return 100;
  const externalVolume = volume(`${external.packageSize ?? ""} ${external.unit ?? ""} ${external.name}`);
  const internalVolume = volume(`${candidate.packageSize ?? ""} ${candidate.unit ?? ""} ${candidate.name}`);
  const withoutPackage = (value: string, hasPackage: boolean) => {
    const normalized = matchingText(
      value.replace(/\d+(?:[.,]\d+)?\s*(?:мл|ml|л|l|литр(?:а|ов)?|г|гр|g|кг|kg|шт|pcs)(?![a-zа-яё])/gi, " "),
    );
    return hasPackage ? normalized.replace(/\b\d+(?:\s+\d+)?\b/g, " ").replace(/\s+/g, " ").trim() : normalized;
  };
  const left = withoutPackage(external.name, Boolean(externalVolume));
  const right = withoutPackage(candidate.name, Boolean(internalVolume));
  if (!left || !right) return 0;
  let score = left === right ? 96 : Math.round(dice(left, right) * 88);
  if (externalVolume && internalVolume) {
    if (externalVolume.unit !== internalVolume.unit) score -= 25;
    else if (Math.abs(externalVolume.amount - internalVolume.amount) < 0.001) score += 4;
    else score -= 12;
  }
  return Math.max(0, Math.min(100, score));
}

export function candidatesFromAssortment(
  assortment: unknown,
  type: MappingEntityType,
): MappingCandidate[] {
  const root = record(assortment);
  const result = new Map<string, MappingCandidate>();
  if (type === "menu_item") {
    for (const value of list(root.menuItems)) {
      const item = record(value);
      if (item.active === false) continue;
      const id = text(item.id);
      const name = text(item.name);
      if (id && name) result.set(id, { id, name });
    }
    return [...result.values()].sort((a, b) => a.name.localeCompare(b.name, "ru"));
  }

  for (const value of list(root.stockBalances)) {
    const item = record(value);
    const id = text(item.key ?? item.productKey);
    const name = text(item.name);
    if (!id || !name) continue;
    result.set(id, {
      id,
      name,
      unit: text(item.unit) || undefined,
      packageSize: text(item.packageSize) || undefined,
      barcode: text(item.barcode) || undefined,
    });
  }
  for (const recipeValue of list(root.recipes)) {
    const recipe = record(recipeValue);
    for (const ingredientValue of list(recipe.ingredients)) {
      const ingredient = record(ingredientValue);
      const id = text(ingredient.purchaseProductKey);
      const name = text(ingredient.name);
      if (id && name && !result.has(id)) {
        result.set(id, {
          id,
          name,
          unit: text(ingredient.unit) || undefined,
          packageSize: text(ingredient.packageSize) || undefined,
        });
      }
    }
  }
  return [...result.values()].sort((a, b) => a.name.localeCompare(b.name, "ru"));
}

export function decideMapping(
  external: MappingCandidate,
  candidates: MappingCandidate[],
): MappingDecision {
  const ranked = candidates
    .map((candidate) => ({ candidate, score: candidateScore(external, candidate) }))
    .filter((item) => item.score >= 45)
    .sort((left, right) => right.score - left.score || left.candidate.name.localeCompare(right.candidate.name, "ru"));
  const best = ranked[0];
  const second = ranked[1];
  const alternatives = ranked.slice(0, 5).map((item) => item.candidate);
  if (!best) {
    return {
      status: "unresolved",
      confidence: 0,
      candidate: null,
      alternatives: [],
      reason: "Подходящей позиции BarDoctor не найдено",
    };
  }
  if (best.score >= 94 && (!second || best.score - second.score >= 8)) {
    return {
      status: "confirmed",
      confidence: best.score,
      candidate: best.candidate,
      alternatives,
      reason: best.score === 100 ? "Точное совпадение" : "Однозначное совпадение названия и фасовки",
    };
  }
  return {
    status: "suggested",
    confidence: best.score,
    candidate: best.candidate,
    alternatives,
    reason: second && best.score - second.score < 8
      ? "Найдено несколько похожих позиций — требуется выбор"
      : "Совпадение недостаточно надёжно для автоматического проведения",
  };
}
