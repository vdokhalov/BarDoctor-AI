type JsonRecord = Record<string, unknown>;

export type NomenclatureNode = {
  id: string;
  name: string;
  parentId?: string;
  order: number;
  active: boolean;
};

export type NomenclatureStructure = {
  version: "v209";
  sections: NomenclatureNode[];
  categories: NomenclatureNode[];
  subcategories: NomenclatureNode[];
  locations: NomenclatureNode[];
};

type Classification = {
  sectionId: string;
  taxonomyCategoryId: string;
  subcategoryId: string;
  storageLocationId: string;
  classificationStatus: "confirmed" | "auto" | "suggested" | "unassigned";
  classificationConfidence: number;
  classificationSource: "manual" | "name" | "purchase-category" | "fallback";
};

function record(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : {};
}

function text(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function node(id: string, name: string, order: number, parentId?: string): NomenclatureNode {
  return { id, name, order, active: true, ...(parentId ? { parentId } : {}) };
}

export function defaultNomenclatureStructure(): NomenclatureStructure {
  return {
    version: "v209",
    sections: [
      node("bar", "Бар", 10),
      node("kitchen", "Кухня", 20),
      node("hookah", "Кальянная", 30),
      node("household", "Хозчасть", 40),
      node("administration", "Администрация", 50),
      node("unassigned", "Требуют распределения", 999),
    ],
    categories: [
      node("alcohol", "Алкоголь", 10, "bar"),
      node("soft-drinks", "Безалкогольные напитки", 20, "bar"),
      node("bar-supplies", "Барные расходники", 30, "bar"),
      node("food", "Продукты", 10, "kitchen"),
      node("kitchen-supplies", "Кухонные расходники", 20, "kitchen"),
      node("hookah-tobacco", "Табак и смеси", 10, "hookah"),
      node("hookah-supplies", "Уголь и аксессуары", 20, "hookah"),
      node("cleaning", "Уборка и гигиена", 10, "household"),
      node("packaging", "Упаковка и одноразовая посуда", 20, "household"),
      node("office", "Офис и обслуживание", 10, "administration"),
      node("services", "Услуги", 20, "administration"),
      node("unassigned-category", "Без категории", 999, "unassigned"),
    ],
    subcategories: [
      node("cognac", "Коньяк и бренди", 10, "alcohol"),
      node("vodka", "Водка", 20, "alcohol"),
      node("beer", "Пиво", 30, "alcohol"),
      node("wine", "Вино и игристое", 40, "alcohol"),
      node("whisky", "Виски", 50, "alcohol"),
      node("strong-alcohol", "Ром, джин и текила", 60, "alcohol"),
      node("liqueurs", "Ликёры и вермуты", 70, "alcohol"),
      node("water-soda", "Вода и газировка", 10, "soft-drinks"),
      node("juice", "Соки", 20, "soft-drinks"),
      node("coffee-tea", "Кофе и чай", 30, "soft-drinks"),
      node("syrups", "Сиропы", 40, "soft-drinks"),
      node("meat", "Мясо и колбасы", 10, "food"),
      node("dairy", "Молочная продукция", 20, "food"),
      node("fish", "Рыба и морепродукты", 30, "food"),
      node("produce", "Овощи и фрукты", 40, "food"),
      node("grocery", "Бакалея", 50, "food"),
      node("sauces-spices", "Соусы и специи", 60, "food"),
      node("frozen", "Заморозка", 70, "food"),
      node("bakery", "Хлеб и выпечка", 80, "food"),
      node("canned", "Консервы", 90, "food"),
      node("tobacco", "Табак", 10, "hookah-tobacco"),
      node("coal", "Уголь", 10, "hookah-supplies"),
      node("detergents", "Моющие средства", 10, "cleaning"),
      node("hygiene", "Гигиена", 20, "cleaning"),
      node("disposables", "Одноразовая посуда", 10, "packaging"),
      node("containers", "Контейнеры и пакеты", 20, "packaging"),
      node("maintenance", "Ремонт и обслуживание", 10, "services"),
      node("software", "Связь и программное обеспечение", 20, "services"),
      node("unassigned-subcategory", "Без подкатегории", 999, "unassigned-category"),
    ],
    locations: [
      node("bar-store", "Склад бара", 10, "bar"),
      node("bar-fridge", "Холодильник бара", 20, "bar"),
      node("kitchen-store", "Склад кухни", 10, "kitchen"),
      node("kitchen-fridge", "Холодильник кухни", 20, "kitchen"),
      node("freezer", "Морозильник", 30, "kitchen"),
      node("hookah-store", "Кальянный склад", 10, "hookah"),
      node("household-store", "Хозяйственная кладовая", 10, "household"),
      node("office-store", "Администрация", 10, "administration"),
    ],
  };
}

function normalized(value: unknown): string {
  return text(value).toLocaleLowerCase("ru").replace(/ё/g, "е");
}

const RULES: Array<[RegExp, string, string, string, string]> = [
  [/коньяк|бренди|henness|хеннес|martell|мартел|courvoisier|курвуаз|арарат|metaxa|метакс/, "bar", "alcohol", "cognac", "bar-store"],
  [/водк|absolut|beluga|finlandia/, "bar", "alcohol", "vodka", "bar-store"],
  [/пиво|lager|stout|ipa|сидр|heineken|хайнекен|corona|корона|старопрамен/, "bar", "alcohol", "beer", "bar-fridge"],
  [/вино|просекко|шампан|игрист|каберне|шардоне|мерло|совиньон|pinot/, "bar", "alcohol", "wine", "bar-store"],
  [/виски|whisk|bourbon|бурбон|jack daniel|jameson|джемесон|chivas|ballantine|jim beam/, "bar", "alcohol", "whisky", "bar-store"],
  [/ром|джин|текил|bacardi|бакарди|havana club|captain morgan|beefeater|bombay|olmeca/, "bar", "alcohol", "strong-alcohol", "bar-store"],
  [/ликер|вермут|aperol|campari|jager|егермейстер|бейлис|baileys|самбук|лимончел/, "bar", "alcohol", "liqueurs", "bar-store"],
  [/вода|боржоми|borjomi|cola|coca|pepsi|sprite|спрайт|fanta|фанта|7up|тоник|schweppes|швепс|лимонад|газиров|энергет|red bull/, "bar", "soft-drinks", "water-soda", "bar-fridge"],
  [/сок|нектар|фреш|sandora|rich/, "bar", "soft-drinks", "juice", "bar-fridge"],
  [/кофе|эспрессо|капучин|lavazza|чай|earl grey/, "bar", "soft-drinks", "coffee-tea", "bar-store"],
  [/сироп|пюре|monin/, "bar", "soft-drinks", "syrups", "bar-store"],
  [/говядин|телятин|свинин|баранин|куриц|индейк|мяс|колбас|ветчин|бекон|салями|сосиск|сардельк|фарш|карбонад|буженин|грудк|голень|крыл/, "kitchen", "food", "meat", "kitchen-fridge"],
  [/молок|сливк|сыр|брынз|фет(?:а|\b)|сулугун|адыгей|моцарел|пармезан|гауд|творог|сметан|йогурт|кефир|масло слив/, "kitchen", "food", "dairy", "kitchen-fridge"],
  [/рыб|лосос|семг|тунец|кревет|мидии|кальмар|осьминог|морепродукт/, "kitchen", "food", "fish", "kitchen-fridge"],
  [/ананас.*консерв|консерв.*ананас|горошек|кукуруз|маслин|оливк/, "kitchen", "food", "canned", "kitchen-store"],
  [/томат|помидор|огур|картоф|лук|морков|капуст|свекл|чеснок|болгар.*перец|перец.*болгар|овощ|фрукт|ананас|апельсин|мандарин|банан|баклажан|кабач|авокадо|гриб|шампиньон|укроп|петруш|кинз|базилик|салат|руккол|персик|груш|лимон|лайм|яблок|ягод|виноград/, "kitchen", "food", "produce", "kitchen-store"],
  [/мука|круп|рис|греч|макарон|паст[аы]\b|сахар|соль|арахис|орех|семеч|яйц|крахмал|дрожж|паниров|сухар|чипс/, "kitchen", "food", "grocery", "kitchen-store"],
  [/соус|кетчуп|майонез|горчиц|аджик|уксус|масло раст|масло олив|приправ|паприк|специ|перец молот/, "kitchen", "food", "sauces-spices", "kitchen-store"],
  [/заморож|лед|морожен|фри|пельмен|вареник/, "kitchen", "food", "frozen", "freezer"],
  [/хлеб|батон|булоч|багет|лаваш|выпеч/, "kitchen", "food", "bakery", "kitchen-store"],
  [/табак|musthave|darkside|serbetli/, "hookah", "hookah-tobacco", "tobacco", "hookah-store"],
  [/уголь|калауд|мундштук|щипц/, "hookah", "hookah-supplies", "coal", "hookah-store"],
  [/моющ|чистящ|антижир|fairy|хлор|белизн|дезинф|губк|тряпк/, "household", "cleaning", "detergents", "household-store"],
  [/мыло|салфет|бумаг.*полот|туалет.*бумаг|перчат/, "household", "cleaning", "hygiene", "household-store"],
  [/стакан.*однораз|тарелк.*однораз|вилк.*однораз|трубочк/, "household", "packaging", "disposables", "household-store"],
  [/контейнер|пищев.*бокс|бокс(?:ы|ов|а)?(?:\s|$)|пакет|пленк|фольг/, "household", "packaging", "containers", "household-store"],
  [/ремонт|обслужив|сервис|клининг/, "administration", "services", "maintenance", "office-store"],
  [/интернет|телефон|связь|лицензи|подписк|касс/, "administration", "services", "software", "office-store"],
];

export function classifyNomenclatureItem(value: unknown): Classification {
  const item = record(value);
  const haystack = `${normalized(item.name)} ${normalized(item.category)}`;
  for (const [pattern, sectionId, taxonomyCategoryId, subcategoryId, storageLocationId] of RULES) {
    if (pattern.test(haystack)) {
      return { sectionId, taxonomyCategoryId, subcategoryId, storageLocationId, classificationStatus: "auto", classificationConfidence: 0.94, classificationSource: "name" };
    }
  }
  const kind = text(item.kind, "stock") === "service" ? "service" : "stock";
  const purchaseCategory = normalized(item.category);
  if (kind === "service" || ["services", "service", "rent", "utilities", "other"].includes(purchaseCategory)) {
    return { sectionId: "administration", taxonomyCategoryId: "services", subcategoryId: "maintenance", storageLocationId: "office-store", classificationStatus: "suggested", classificationConfidence: 0.72, classificationSource: "purchase-category" };
  }
  if (["alcohol", "bar", "drinks", "beverages"].includes(purchaseCategory)) {
    return { sectionId: "bar", taxonomyCategoryId: "alcohol", subcategoryId: "liqueurs", storageLocationId: "bar-store", classificationStatus: "suggested", classificationConfidence: 0.68, classificationSource: "purchase-category" };
  }
  if (["products", "food", "ingredients"].includes(purchaseCategory)) {
    return { sectionId: "kitchen", taxonomyCategoryId: "food", subcategoryId: "grocery", storageLocationId: "kitchen-store", classificationStatus: "suggested", classificationConfidence: 0.62, classificationSource: "purchase-category" };
  }
  if (["household", "supplies", "consumables"].includes(purchaseCategory)) {
    return { sectionId: "household", taxonomyCategoryId: "cleaning", subcategoryId: "detergents", storageLocationId: "household-store", classificationStatus: "suggested", classificationConfidence: 0.62, classificationSource: "purchase-category" };
  }
  return { sectionId: "unassigned", taxonomyCategoryId: "unassigned-category", subcategoryId: "unassigned-subcategory", storageLocationId: "", classificationStatus: "unassigned", classificationConfidence: 0, classificationSource: "fallback" };
}

export function classifyNomenclatureItemWithRules(value: unknown, rules: unknown): Classification {
  const item = record(value);
  const name = normalized(item.name);
  const matching = (Array.isArray(rules) ? rules : []).map(record).find((rule) =>
    normalized(rule.normalizedName) === name && name.length > 0
  );
  const manual = matching ? manualClassification(matching) : {};
  if (Object.keys(manual).length) return manual as Classification;
  return classifyNomenclatureItem(item);
}

export function rememberNomenclatureCorrection(
  rules: unknown,
  item: unknown,
  classification: unknown,
  now = new Date().toISOString(),
): JsonRecord[] {
  const name = normalized(record(item).name);
  const manual = manualClassification(classification);
  const current = (Array.isArray(rules) ? rules : []).map((value) => ({ ...record(value) }));
  if (!name || !Object.keys(manual).length) return current;
  const next = {
    id: `exact:${name}`,
    matchType: "exact-name",
    normalizedName: name,
    ...manual,
    updatedAt: now,
  };
  const existing = current.findIndex((rule) => normalized(rule.normalizedName) === name);
  if (existing >= 0) current[existing] = { ...current[existing], ...next };
  else current.unshift(next);
  return current.slice(0, 1_000);
}

export function ensureNomenclatureHierarchy(assortment: unknown, now = new Date().toISOString()): {
  assortment: JsonRecord;
  classified: number;
  suggested: number;
  unassigned: number;
} {
  const root = { ...record(assortment) };
  const currentStructure = record(root.nomenclatureStructure);
  const defaultStructure = defaultNomenclatureStructure();
  const mergeNodes = (current: unknown, defaults: NomenclatureNode[]): NomenclatureNode[] => {
    const currentNodes = (Array.isArray(current) ? current : []).map(record);
    const byId = new Map(currentNodes.map((value) => [text(value.id), value]));
    const builtIns = defaults.map((value) => ({ ...value, ...record(byId.get(value.id)) })) as NomenclatureNode[];
    const builtInIds = new Set(defaults.map((value) => value.id));
    return [
      ...builtIns,
      ...currentNodes.filter((value) => text(value.id) && !builtInIds.has(text(value.id))) as NomenclatureNode[],
    ];
  };
  root.nomenclatureStructure = {
    version: "v209",
    sections: mergeNodes(currentStructure.sections, defaultStructure.sections),
    categories: mergeNodes(currentStructure.categories, defaultStructure.categories),
    subcategories: mergeNodes(currentStructure.subcategories, defaultStructure.subcategories),
    locations: mergeNodes(currentStructure.locations, defaultStructure.locations),
  } satisfies NomenclatureStructure;
  let classified = 0;
  let suggested = 0;
  let unassigned = 0;
  const rules = Array.isArray(root.nomenclatureRules) ? root.nomenclatureRules : [];
  const existingItems = (Array.isArray(root.nomenclature) ? root.nomenclature : [])
    .map((raw) => ({ ...record(raw) }));
  const itemsByKey = new Map(existingItems.map((item) => [text(item.productKey ?? item.key), item]));
  const migratedFromBalances = (Array.isArray(root.stockBalances) ? root.stockBalances : [])
    .map((raw) => ({ ...record(raw) }))
    .flatMap((balance) => {
      const key = text(balance.productKey ?? balance.key);
      if (!key || itemsByKey.has(key)) return [];
      const item = {
        ...balance,
        id: text(balance.id, key),
        key,
        productKey: key,
        kind: "stock",
        source: text(balance.source, "legacy-stock"),
        active: balance.active !== false,
        createdAt: text(balance.createdAt, now),
        updatedAt: text(balance.updatedAt, now),
      };
      itemsByKey.set(key, item);
      return [item];
    });
  const sourceItems = [...existingItems, ...migratedFromBalances];
  const items = sourceItems.map((raw) => {
    const item = { ...record(raw) };
    const sectionId = text(item.sectionId);
    const categoryId = text(item.taxonomyCategoryId);
    const subcategoryId = text(item.subcategoryId);
    const status = text(item.classificationStatus);
    const hasUsablePath = sectionId
      && categoryId
      && subcategoryId
      && sectionId !== "unassigned"
      && categoryId !== "unassigned-category"
      && subcategoryId !== "unassigned-subcategory"
      && ["confirmed", "auto"].includes(status);
    if (hasUsablePath) {
      if (status === "suggested") suggested += 1;
      return item;
    }
    const result = classifyNomenclatureItemWithRules(item, rules);
    if (result.classificationStatus === "auto") classified += 1;
    if (result.classificationStatus === "suggested") suggested += 1;
    if (result.classificationStatus === "unassigned") unassigned += 1;
    return { ...item, ...result, classifiedAt: now, updatedAt: text(item.updatedAt, now) };
  });
  const byKey = new Map(items.map((item) => [text(item.productKey ?? item.key), item]));
  const balances = (Array.isArray(root.stockBalances) ? root.stockBalances : []).map((raw) => {
    const balance = { ...record(raw) };
    const linked = byKey.get(text(balance.productKey ?? balance.key));
    return linked ? {
      ...balance,
      sectionId: linked.sectionId,
      taxonomyCategoryId: linked.taxonomyCategoryId,
      subcategoryId: linked.subcategoryId,
      storageLocationId: linked.storageLocationId,
      classificationStatus: linked.classificationStatus,
      classificationConfidence: linked.classificationConfidence,
    } : balance;
  });
  root.nomenclature = items;
  root.stockBalances = balances;
  root.updatedAt = now;
  return { assortment: root, classified, suggested, unassigned };
}

export function manualClassification(input: unknown): Partial<Classification> {
  const value = record(input);
  const sectionId = text(value.sectionId);
  const taxonomyCategoryId = text(value.taxonomyCategoryId);
  const subcategoryId = text(value.subcategoryId);
  const storageLocationId = text(value.storageLocationId);
  if (!sectionId || !taxonomyCategoryId || !subcategoryId) return {};
  return {
    sectionId,
    taxonomyCategoryId,
    subcategoryId,
    storageLocationId,
    classificationStatus: "confirmed",
    classificationConfidence: 1,
    classificationSource: "manual",
  };
}
