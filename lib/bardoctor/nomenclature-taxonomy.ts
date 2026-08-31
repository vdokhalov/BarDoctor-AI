type JsonRecord = Record<string, unknown>;

export type TaxonomyLevel = "section" | "category" | "subcategory";

export type CanonicalTaxonomyNode = {
  id: string;
  name: string;
  parentId?: string;
  order: number;
  active: boolean;
  system?: boolean;
  createdAt?: string;
  updatedAt?: string;
  archivedAt?: string;
};

export type CanonicalTaxonomy = {
  version: "v336";
  sections: CanonicalTaxonomyNode[];
  categories: CanonicalTaxonomyNode[];
  subcategories: CanonicalTaxonomyNode[];
  locations: CanonicalTaxonomyNode[];
};

export type LegacyMenuTaxonomyPath = {
  groupId: string;
  subgroupId: string;
  sectionId: string;
  taxonomyCategoryId: string;
  subcategoryId: string;
};

export type TaxonomyMutation = {
  action: "create" | "rename" | "move" | "reorder" | "archive" | "restore" | "delete";
  level: TaxonomyLevel;
  id?: string;
  name?: string;
  parentId?: string;
  direction?: "up" | "down";
  strategy?: "move" | "unassign";
  targetId?: string;
};

function record(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : {};
}

function array(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function text(value: unknown, fallback = "", max = 200): string {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, max) : fallback;
}

function number(value: unknown, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function slug(value: string): string {
  return value.toLocaleLowerCase("ru-RU")
    .replace(/ё/g, "е")
    .replace(/[^a-zа-я0-9]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "node";
}

function normalizedName(value: unknown): string {
  return text(value).toLocaleLowerCase("ru-RU").replace(/ё/g, "е").replace(/\s+/g, " ");
}

function nodes(value: unknown): CanonicalTaxonomyNode[] {
  const ids = new Set<string>();
  return array(value).map(record).flatMap((item, index) => {
    const id = text(item.id, "", 120);
    const name = text(item.name ?? item.label, "", 160);
    if (!id || !name || ids.has(id)) return [];
    ids.add(id);
    return [{
      id,
      name,
      ...(text(item.parentId, "", 120) ? { parentId: text(item.parentId, "", 120) } : {}),
      order: number(item.order ?? item.sortOrder, (index + 1) * 10),
      active: item.active !== false,
      ...(item.system === true ? { system: true } : {}),
      ...(text(item.createdAt) ? { createdAt: text(item.createdAt) } : {}),
      ...(text(item.updatedAt) ? { updatedAt: text(item.updatedAt) } : {}),
      ...(text(item.archivedAt) ? { archivedAt: text(item.archivedAt) } : {}),
    }];
  }).sort((left, right) => left.order - right.order || left.name.localeCompare(right.name, "ru"));
}

/**
 * The existing structure inside bd_assortment_v1 is the canonical source.
 * Defaults are used only for a genuinely new venue. Existing structures are
 * normalized without re-inserting removed or renamed business categories.
 */
export function normalizeCanonicalTaxonomy(value: unknown, fallback?: CanonicalTaxonomy): CanonicalTaxonomy {
  const root = record(value);
  const hasExistingStructure = [root.sections, root.categories, root.subcategories]
    .some((candidate) => Array.isArray(candidate));
  const source = hasExistingStructure ? root : record(fallback);
  return {
    version: "v336",
    sections: nodes(source.sections),
    categories: nodes(source.categories),
    subcategories: nodes(source.subcategories),
    locations: nodes(source.locations),
  };
}

/**
 * Legacy menu groups are read as an additive compatibility source until the
 * venue persists the canonical tree. GET callers can use this projection
 * without writing production data; a later user-authorized save can persist
 * the same stable IDs through materializeMenuTaxonomy().
 */
export function canonicalTaxonomyForAssortment(
  assortment: unknown,
  fallback?: CanonicalTaxonomy,
): {
  taxonomy: CanonicalTaxonomy;
  legacyMenuPaths: LegacyMenuTaxonomyPath[];
  derivedFromMenu: boolean;
} {
  const root = record(assortment);
  let taxonomy = normalizeCanonicalTaxonomy(root.nomenclatureStructure, fallback);
  const structuralCount = taxonomy.sections.length + taxonomy.categories.length + taxonomy.subcategories.length;
  if (structuralCount === 0 && fallback) taxonomy = normalizeCanonicalTaxonomy(fallback);

  taxonomy = {
    ...taxonomy,
    sections: taxonomy.sections.map((node) => ({ ...node })),
    categories: taxonomy.categories.map((node) => ({ ...node })),
    subcategories: taxonomy.subcategories.map((node) => ({ ...node })),
    locations: taxonomy.locations.map((node) => ({ ...node })),
  };
  const groups = array(root.groups).map(record).filter((group) =>
    text(group.id, "", 120) && text(group.name ?? group.label, "", 160) && group.active !== false
  );
  const subgroups = array(root.subgroups).map(record).filter((subgroup) =>
    text(subgroup.id, "", 120) && text(subgroup.groupId, "", 120)
      && text(subgroup.name ?? subgroup.label, "", 160) && subgroup.active !== false
  );
  const paths: LegacyMenuTaxonomyPath[] = [];
  let derivedFromMenu = structuralCount === 0 && groups.length > 0;

  const ensureGenericPath = (group: JsonRecord, subgroup?: JsonRecord): LegacyMenuTaxonomyPath => {
    const groupId = text(group.id, "", 120);
    const subgroupId = text(subgroup?.id, "", 120);
    const groupName = text(group.name ?? group.label, "Раздел", 160);
    const subgroupName = text(subgroup?.name ?? subgroup?.label, "Общее", 160);
    let section = taxonomy.sections.find((node) => normalizedName(node.name) === normalizedName(groupName));
    if (!section) {
      section = { id: `menu-section:${groupId}`, name: groupName, order: number(group.sortOrder, taxonomy.sections.length * 10 + 10), active: true };
      taxonomy.sections.push(section);
      derivedFromMenu = true;
    }

    const existingSubcategory = taxonomy.subcategories.find((node) => {
      if (normalizedName(node.name) !== normalizedName(subgroupName)) return false;
      const category = taxonomy.categories.find((candidate) => candidate.id === node.parentId);
      return category?.parentId === section?.id;
    });
    if (existingSubcategory) {
      const category = taxonomy.categories.find((node) => node.id === existingSubcategory.parentId)!;
      return { groupId, subgroupId, sectionId: section.id, taxonomyCategoryId: category.id, subcategoryId: existingSubcategory.id };
    }

    let category = taxonomy.categories.find((node) =>
      node.parentId === section?.id && normalizedName(node.name) === normalizedName(subgroupName)
    );
    if (!category) {
      category = {
        id: `menu-category:${subgroupId || groupId}`,
        name: subgroupName,
        parentId: section.id,
        order: number(subgroup?.sortOrder, taxonomy.categories.filter((node) => node.parentId === section?.id).length * 10 + 10),
        active: true,
      };
      taxonomy.categories.push(category);
      derivedFromMenu = true;
    }
    let subcategory = taxonomy.subcategories.find((node) =>
      node.parentId === category?.id && normalizedName(node.name) === "без подкатегории"
    ) ?? taxonomy.subcategories.find((node) => node.parentId === category?.id && node.active);
    if (!subcategory) {
      subcategory = {
        id: `menu-subcategory:${subgroupId || groupId}`,
        name: "Без подкатегории",
        parentId: category.id,
        order: 999,
        active: true,
      };
      taxonomy.subcategories.push(subcategory);
      derivedFromMenu = true;
    }
    return { groupId, subgroupId, sectionId: section.id, taxonomyCategoryId: category.id, subcategoryId: subcategory.id };
  };

  for (const group of groups) {
    const children = subgroups.filter((subgroup) => text(subgroup.groupId, "", 120) === text(group.id, "", 120));
    if (!children.length) paths.push(ensureGenericPath(group));
    else children.forEach((subgroup) => paths.push(ensureGenericPath(group, subgroup)));
  }
  taxonomy.sections.sort((left, right) => left.order - right.order || left.name.localeCompare(right.name, "ru"));
  taxonomy.categories.sort((left, right) => left.order - right.order || left.name.localeCompare(right.name, "ru"));
  taxonomy.subcategories.sort((left, right) => left.order - right.order || left.name.localeCompare(right.name, "ru"));
  return { taxonomy, legacyMenuPaths: paths, derivedFromMenu };
}

export function materializeMenuTaxonomy(assortment: unknown, fallback?: CanonicalTaxonomy): JsonRecord {
  const root = { ...record(assortment) };
  const effective = canonicalTaxonomyForAssortment(root, fallback);
  root.nomenclatureStructure = effective.taxonomy;
  root.nomenclatureTaxonomyMigration = {
    ...record(root.nomenclatureTaxonomyMigration),
    menuGroupsAdopted: true,
    version: "v350",
  };
  return root;
}

export function taxonomyArrays(level: TaxonomyLevel): keyof Pick<CanonicalTaxonomy, "sections" | "categories" | "subcategories"> {
  return level === "section" ? "sections" : level === "category" ? "categories" : "subcategories";
}

export function taxonomyItemCount(assortment: unknown, level: TaxonomyLevel, id: string): number {
  const root = record(assortment);
  const field = level === "section" ? "sectionId" : level === "category" ? "taxonomyCategoryId" : "subcategoryId";
  const keys = new Set<string>();
  // Nomenclature is authoritative for identity and archive state. Stock balances
  // are only a compatibility fallback for legacy products that do not yet have a
  // canonical nomenclature row. Menu items are consumers, not extra positions.
  const canonicalKeys = new Set(array(root.nomenclature).map((item) => {
    const row = record(item);
    return text(row.productKey ?? row.key ?? row.id, "", 300);
  }).filter(Boolean));
  const items = [
    ...array(root.nomenclature),
    ...array(root.stockBalances).filter((item) => {
      const row = record(item);
      const key = text(row.productKey ?? row.key ?? row.id, "", 300);
      return key && !canonicalKeys.has(key);
    }),
    ...array(root.internalItems).filter((item) => {
      const row = record(item);
      const key = text(row.productKey ?? row.key ?? row.id, "", 300);
      return key && !canonicalKeys.has(key);
    }),
  ];
  for (const item of items) {
    const row = record(item);
    if (row.active === false || row.archived === true) continue;
    if (text(row[field], "", 120) !== id) continue;
    const key = text(row.productKey ?? row.key ?? row.id, "", 300);
    if (key) keys.add(key);
  }
  return keys.size;
}

export function taxonomyUsage(assortment: unknown, taxonomy: CanonicalTaxonomy): JsonRecord[] {
  return (["section", "category", "subcategory"] as TaxonomyLevel[]).flatMap((level) => {
    const list = taxonomy[taxonomyArrays(level)];
    return list.map((node) => ({ level, id: node.id, count: taxonomyItemCount(assortment, level, node.id) }));
  });
}

function sectionDescendantIds(taxonomy: CanonicalTaxonomy, sectionId: string): Set<string> {
  const descendants = new Set<string>();
  let frontier = [sectionId];
  while (frontier.length) {
    const parents = new Set(frontier);
    frontier = taxonomy.sections
      .filter((node) => node.parentId && parents.has(node.parentId) && !descendants.has(node.id))
      .map((node) => node.id);
    for (const id of frontier) descendants.add(id);
  }
  return descendants;
}

function validateParent(
  taxonomy: CanonicalTaxonomy,
  level: TaxonomyLevel,
  parentId: string,
  currentId?: string,
): boolean {
  if (level === "section") {
    if (!parentId) return true;
    if (parentId === currentId) return false;
    const parent = taxonomy.sections.find((node) => node.id === parentId && node.active);
    if (!parent) return false;
    return !currentId || !sectionDescendantIds(taxonomy, currentId).has(parentId);
  }
  const parents = level === "category" ? taxonomy.sections : taxonomy.categories;
  return parents.some((node) => node.id === parentId && node.active);
}

function replaceReferences(
  assortment: JsonRecord,
  taxonomy: CanonicalTaxonomy,
  level: TaxonomyLevel,
  sourceId: string,
  targetId: string | null,
): JsonRecord {
  const field = level === "section" ? "sectionId" : level === "category" ? "taxonomyCategoryId" : "subcategoryId";
  const clearFields = level === "section"
    ? ["sectionId", "taxonomyCategoryId", "subcategoryId"]
    : level === "category"
      ? ["taxonomyCategoryId", "subcategoryId"]
      : ["subcategoryId"];
  const update = (value: unknown): JsonRecord[] => array(value).map(record).map((item) => {
    if (text(item[field], "", 120) !== sourceId) return item;
    const next = { ...item };
    if (targetId) {
      for (const key of clearFields) delete next[key];
      if (level === "section") {
        next.sectionId = targetId;
      } else if (level === "category") {
        const target = taxonomy.categories.find((node) => node.id === targetId);
        next.sectionId = target?.parentId;
        next.taxonomyCategoryId = targetId;
      } else {
        const target = taxonomy.subcategories.find((node) => node.id === targetId);
        const category = taxonomy.categories.find((node) => node.id === target?.parentId);
        next.sectionId = category?.parentId;
        next.taxonomyCategoryId = target?.parentId;
        next.subcategoryId = targetId;
      }
      next.classificationStatus = "classified";
      next.classificationConfidence = 1;
      next.classificationSource = "manual";
    } else {
      for (const key of clearFields) delete next[key];
      next.classificationStatus = "unassigned";
      next.classificationConfidence = 0;
      next.classificationSource = "manual";
    }
    return next;
  });
  return {
    ...assortment,
    nomenclature: update(assortment.nomenclature),
    stockBalances: update(assortment.stockBalances),
    menuItems: update(assortment.menuItems),
  };
}

function moveReferencePath(
  assortment: JsonRecord,
  taxonomy: CanonicalTaxonomy,
  level: Exclude<TaxonomyLevel, "section">,
  sourceId: string,
  parentId: string,
): JsonRecord {
  const field = level === "category" ? "taxonomyCategoryId" : "subcategoryId";
  const category = level === "category"
    ? taxonomy.categories.find((node) => node.id === sourceId)
    : taxonomy.categories.find((node) => node.id === parentId);
  const update = (value: unknown): JsonRecord[] => array(value).map(record).map((item) => {
    if (text(item[field], "", 120) !== sourceId) return item;
    return {
      ...item,
      sectionId: level === "category" ? parentId : category?.parentId,
      ...(level === "subcategory" ? { taxonomyCategoryId: parentId } : {}),
      classificationStatus: "classified",
      classificationConfidence: 1,
      classificationSource: "manual",
    };
  });
  return {
    ...assortment,
    nomenclature: update(assortment.nomenclature),
    stockBalances: update(assortment.stockBalances),
    menuItems: update(assortment.menuItems),
  };
}

export function mutateCanonicalTaxonomy(input: {
  assortment: unknown;
  mutation: TaxonomyMutation;
  fallback?: CanonicalTaxonomy;
  now?: string;
}): { ok: true; assortment: JsonRecord; taxonomy: CanonicalTaxonomy; affectedItems: number; node?: CanonicalTaxonomyNode }
  | { ok: false; code: string; error: string; itemCount?: number; childCount?: number } {
  const now = input.now ?? new Date().toISOString();
  const root = { ...record(input.assortment) };
  const taxonomy = normalizeCanonicalTaxonomy(root.nomenclatureStructure, input.fallback);
  const mutation = input.mutation;
  const key = taxonomyArrays(mutation.level);
  const list = taxonomy[key];
  const index = list.findIndex((node) => node.id === mutation.id);

  if (mutation.action === "create") {
    const name = text(mutation.name, "", 160);
    const parentId = text(mutation.parentId, "", 120);
    if (!name) return { ok: false, code: "TAXONOMY_NAME_REQUIRED", error: "Укажите название" };
    if (!validateParent(taxonomy, mutation.level, parentId)) {
      return { ok: false, code: "TAXONOMY_PARENT_INVALID", error: "Сначала выберите активного родителя" };
    }
    const duplicate = list.find((node) => node.parentId === (parentId || undefined)
      && node.name.localeCompare(name, "ru", { sensitivity: "base" }) === 0);
    if (duplicate) return { ok: false, code: "TAXONOMY_EXISTS", error: "Такой элемент уже существует" };
    const id = `${mutation.level}:${slug(name)}:${crypto.randomUUID().slice(0, 8)}`;
    const siblings = list.filter((node) => (node.parentId ?? "") === parentId);
    const node: CanonicalTaxonomyNode = {
      id,
      name,
      ...(parentId ? { parentId } : {}),
      order: Math.max(0, ...siblings.map((item) => item.order)) + 10,
      active: true,
      createdAt: now,
      updatedAt: now,
    };
    taxonomy[key] = [...list, node];
    root.nomenclatureStructure = taxonomy;
    root.updatedAt = now;
    return { ok: true, assortment: root, taxonomy, affectedItems: 0, node };
  }

  if (index < 0) return { ok: false, code: "TAXONOMY_NOT_FOUND", error: "Элемент структуры не найден" };
  const current = list[index];
  const itemCount = taxonomyItemCount(root, mutation.level, current.id);
  const children = mutation.level === "section"
    ? [
        ...taxonomy.sections.filter((node) => node.parentId === current.id),
        ...taxonomy.categories.filter((node) => node.parentId === current.id),
      ]
    : mutation.level === "category"
      ? taxonomy.subcategories.filter((node) => node.parentId === current.id)
      : [];

  if (mutation.action === "rename") {
    const name = text(mutation.name, "", 160);
    if (!name) return { ok: false, code: "TAXONOMY_NAME_REQUIRED", error: "Укажите название" };
    taxonomy[key] = list.map((node) => node.id === current.id ? { ...node, name, updatedAt: now } : node);
  } else if (mutation.action === "move") {
    const parentId = text(mutation.parentId, "", 120);
    if (!validateParent(taxonomy, mutation.level, parentId, current.id)) {
      return { ok: false, code: "TAXONOMY_PARENT_INVALID", error: "Нельзя переместить в выбранный раздел" };
    }
    taxonomy[key] = list.map((node) => {
      if (node.id !== current.id) return node;
      const next = { ...node, updatedAt: now };
      if (parentId) next.parentId = parentId;
      else delete next.parentId;
      return next;
    });
    if (mutation.level !== "section") {
      Object.assign(root, moveReferencePath(root, taxonomy, mutation.level, current.id, parentId));
    }
  } else if (mutation.action === "reorder") {
    const siblings = list.filter((node) => (node.parentId ?? "") === (current.parentId ?? ""))
      .sort((left, right) => left.order - right.order);
    const siblingIndex = siblings.findIndex((node) => node.id === current.id);
    const otherIndex = mutation.direction === "up" ? siblingIndex - 1 : siblingIndex + 1;
    if (otherIndex >= 0 && otherIndex < siblings.length) {
      const other = siblings[otherIndex];
      taxonomy[key] = list.map((node) => node.id === current.id
        ? { ...node, order: other.order, updatedAt: now }
        : node.id === other.id ? { ...node, order: current.order, updatedAt: now } : node);
    }
  } else if (mutation.action === "archive" || mutation.action === "restore") {
    const active = mutation.action === "restore";
    taxonomy[key] = list.map((node) => node.id === current.id
      ? { ...node, active, updatedAt: now, ...(active ? { archivedAt: undefined } : { archivedAt: now }) }
      : node);
  } else if (mutation.action === "delete") {
    if (children.length) {
      return { ok: false, code: "TAXONOMY_HAS_CHILDREN", error: "Сначала перенесите или архивируйте вложенные элементы", childCount: children.length };
    }
    if (itemCount && !mutation.strategy) {
      return { ok: false, code: "TAXONOMY_NOT_EMPTY", error: `В категории находится ${itemCount} позиций`, itemCount };
    }
    if (itemCount && mutation.strategy === "move") {
      const targetId = text(mutation.targetId, "", 120);
      const target = list.find((node) => node.id === targetId && node.id !== current.id && node.active);
      if (!target) return { ok: false, code: "TAXONOMY_TARGET_INVALID", error: "Выберите активную категорию для переноса" };
      Object.assign(root, replaceReferences(root, taxonomy, mutation.level, current.id, target.id));
    } else if (itemCount && mutation.strategy === "unassign") {
      Object.assign(root, replaceReferences(root, taxonomy, mutation.level, current.id, null));
    }
    taxonomy[key] = list.filter((node) => node.id !== current.id);
  }

  root.nomenclatureStructure = taxonomy;
  root.updatedAt = now;
  return { ok: true, assortment: root, taxonomy, affectedItems: itemCount, node: current };
}

export function taxonomyPath(taxonomy: CanonicalTaxonomy, item: unknown): string[] {
  const row = record(item);
  const section = taxonomy.sections.find((node) => node.id === row.sectionId);
  const category = taxonomy.categories.find((node) => node.id === row.taxonomyCategoryId);
  const subcategory = taxonomy.subcategories.find((node) => node.id === row.subcategoryId);
  const sectionPath: string[] = [];
  const visited = new Set<string>();
  let current = section;
  while (current && !visited.has(current.id)) {
    visited.add(current.id);
    sectionPath.unshift(current.name);
    current = current.parentId ? taxonomy.sections.find((node) => node.id === current?.parentId) : undefined;
  }
  return [...sectionPath, category?.name, subcategory?.name].filter(Boolean) as string[];
}
