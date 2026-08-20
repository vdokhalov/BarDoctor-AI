import { getD1 } from "../../../db";
import type { AuthenticatedAccount } from "../access-control";
import { ASSORTMENT_STORE_KEY, inventoryProductKey } from "../inventory";
import type {
  CanonicalEntityMap,
  CanonicalEnvelope,
  CanonicalPurchaseDocument,
  CanonicalSale,
  ExternalProductReference,
  IntegrationEntityType,
  SyncStatus,
} from "./contracts";
import {
  candidatesFromAssortment,
  decideMapping,
  type MappingCandidate,
  type MappingEntityType,
} from "./mapping";
import {
  claimEntityLink,
  connectionForTenant,
  createSyncItem,
  createSyncRun,
  entityLink,
  finishSyncRun,
  mappingForExternal,
  markMappingConflict,
  restoreEntityLinkAfterFailedUpdate,
  saveMappingProposal,
  updateEntityLinkStatus,
} from "./repository";
import { validateCanonicalEnvelope } from "./validation";

type JsonRecord = Record<string, unknown>;

export type BusinessWriteResult = {
  ok: boolean;
  internalId?: string;
  duplicate?: boolean;
  code?: string;
  error?: string;
};

export type BusinessWriteInput = {
  entityType: IntegrationEntityType;
  data: CanonicalEntityMap[IntegrationEntityType];
  envelope: CanonicalEnvelope;
  internalId: string;
  isUpdate: boolean;
};

export interface IntegrationBusinessWriter {
  write(input: BusinessWriteInput): Promise<BusinessWriteResult>;
  writeBatch?(inputs: BusinessWriteInput[]): Promise<BusinessWriteResult[]>;
}

export type SyncRunResult = {
  runId: string;
  status: SyncStatus;
  received: number;
  created: number;
  updated: number;
  skipped: number;
  errors: Array<{ externalId: string; code: string; message: string }>;
  mappingIssues: number;
};

function record(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as JsonRecord
    : {};
}

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue);
  if (!value || typeof value !== "object") return value;
  const ignored = new Set(["id", "internalId", "syncStatus", "createdAt", "updatedAt", "confirmedAt"]);
  return Object.fromEntries(
    Object.entries(value as JsonRecord)
      .filter(([key]) => !ignored.has(key))
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => [key, stableValue(item)]),
  );
}

async function payloadHash(value: unknown): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(JSON.stringify(stableValue(value))),
  );
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function deterministicEntityInternalId(
  connectionId: string,
  entityType: string,
  externalId: string,
): Promise<string> {
  const hash = await payloadHash(`${connectionId}|${entityType}|${externalId}`);
  return `integration-${entityType}-${hash.slice(0, 28)}`;
}

async function currentAssortment(accountId: number): Promise<unknown> {
  const row = await getD1().prepare(`
    SELECT data_json FROM domain_data WHERE account_id = ? AND store_key = ? LIMIT 1
  `).bind(accountId, ASSORTMENT_STORE_KEY).first<{ data_json: string }>();
  if (!row) return {};
  try {
    return JSON.parse(row.data_json) as unknown;
  } catch {
    return {};
  }
}

async function resolveProduct(input: {
  account: AuthenticatedAccount;
  connectionId: string;
  mappingEntityType: MappingEntityType;
  external: ExternalProductReference;
  candidates: MappingCandidate[];
  autoCreate?: boolean;
}): Promise<{ internalId: string | null; mappingId: string; issue: boolean }> {
  const type = input.mappingEntityType;
  const saved = await mappingForExternal({
    tenant: input.account,
    connectionId: input.connectionId,
    entityType: type,
    externalId: input.external.externalId,
  });
  if (saved?.status === "confirmed" && saved.internal_id) {
    const targetExists = input.candidates.some((candidate) => candidate.id === saved.internal_id);
    const intentionalCreate = type === "stock_product"
      && saved.reason?.includes("создать складскую позицию");
    if (targetExists || intentionalCreate) {
      return { internalId: saved.internal_id, mappingId: saved.id, issue: false };
    }
    await markMappingConflict({
      tenant: input.account,
      mappingId: saved.id,
      reason: "Связанная позиция удалена или больше недоступна в этом заведении",
    });
    return { internalId: null, mappingId: saved.id, issue: true };
  }

  const decision = decideMapping({
    id: input.external.externalId,
    name: input.external.name,
    unit: input.external.unit,
    packageSize: input.external.packageSize,
    barcode: input.external.barcode,
  }, input.candidates);
  if (input.autoCreate && type === "stock_product" && decision.status !== "confirmed") {
    const sourceHash = await payloadHash(`${input.connectionId}|${input.external.externalId}`);
    const internalId = `integration-${sourceHash.slice(0, 32)}`;
    const mapping = await saveMappingProposal({
      tenant: input.account,
      connectionId: input.connectionId,
      entityType: type,
      externalId: input.external.externalId,
      externalName: input.external.name,
      externalUnit: input.external.packageSize ?? input.external.unit,
      internalId,
      internalName: input.external.name,
      status: "confirmed",
      confidence: 100,
      reason: "Автоматически: создать складскую позицию из доверенного Local Connector",
      externalPayload: input.external,
    });
    return { internalId, mappingId: mapping.id, issue: false };
  }
  const mapping = await saveMappingProposal({
    tenant: input.account,
    connectionId: input.connectionId,
    entityType: type,
    externalId: input.external.externalId,
    externalName: input.external.name,
    externalUnit: input.external.packageSize ?? input.external.unit,
    internalId: decision.candidate?.id,
    internalName: decision.candidate?.name,
    status: decision.status,
    confidence: decision.confidence,
    reason: decision.reason,
    externalPayload: input.external,
  });
  return {
    internalId: mapping.status === "confirmed" ? mapping.internal_id : null,
    mappingId: mapping.id,
    issue: mapping.status !== "confirmed",
  };
}

function externalFromProduct(data: unknown, fallbackId: string): ExternalProductReference {
  const value = record(data);
  return {
    externalId: typeof value.externalId === "string" && value.externalId.trim()
      ? value.externalId.trim()
      : fallbackId,
    name: typeof value.name === "string" && value.name.trim() ? value.name.trim() : "Без названия",
    unit: typeof value.unit === "string" ? value.unit : undefined,
    packageSize: typeof value.packageSize === "string" ? value.packageSize : undefined,
    barcode: typeof value.barcode === "string" ? value.barcode : undefined,
  };
}

async function mappedData(input: {
  account: AuthenticatedAccount;
  connectionId: string;
  envelope: CanonicalEnvelope;
  stockCandidates: MappingCandidate[];
  menuCandidates: MappingCandidate[];
  autoCreateProducts: boolean;
}): Promise<{
  data: CanonicalEntityMap[IntegrationEntityType] | null;
  directInternalId?: string;
  mappingIds: string[];
}> {
  const mappingIds: string[] = [];
  if (input.envelope.entityType === "product") {
    const mapping = await resolveProduct({
      account: input.account,
      connectionId: input.connectionId,
      mappingEntityType: "stock_product",
      external: externalFromProduct(input.envelope.data, input.envelope.externalId),
      candidates: input.stockCandidates,
      autoCreate: input.autoCreateProducts,
    });
    mappingIds.push(mapping.mappingId);
    return {
      data: mapping.internalId ? input.envelope.data : null,
      directInternalId: mapping.internalId ?? undefined,
      mappingIds,
    };
  }
  if (input.envelope.entityType === "purchase_document") {
    const document = input.envelope.data as CanonicalPurchaseDocument;
    let supplierId = document.supplierId;
    if (document.supplierExternalId) {
      const linkedSupplier = await entityLink(
        input.account,
        input.connectionId,
        "supplier",
        document.supplierExternalId,
      );
      supplierId = linkedSupplier?.sync_status === "success" && linkedSupplier.internal_id
        ? linkedSupplier.internal_id
        : await deterministicEntityInternalId(
            input.connectionId,
            "supplier",
            document.supplierExternalId,
          );
    }
    const items = [];
    for (const item of document.items) {
      const mapping = await resolveProduct({
        account: input.account,
        connectionId: input.connectionId,
        mappingEntityType: "stock_product",
        external: item.externalProduct,
        candidates: input.stockCandidates,
        autoCreate: input.autoCreateProducts,
      });
      mappingIds.push(mapping.mappingId);
      if (!mapping.internalId) continue;
      items.push({ ...item, purchaseProductKey: mapping.internalId });
    }
    return {
      data: items.length === document.items.length
        ? { ...document, supplierId, items }
        : null,
      mappingIds,
    };
  }
  if (input.envelope.entityType === "sale") {
    const document = input.envelope.data as CanonicalSale;
    const items = [];
    for (const item of document.items) {
      const mapping = await resolveProduct({
        account: input.account,
        connectionId: input.connectionId,
        mappingEntityType: "menu_item",
        external: item.externalProduct,
        candidates: input.menuCandidates,
      });
      mappingIds.push(mapping.mappingId);
      if (!mapping.internalId) continue;
      items.push({ ...item, menuItemId: mapping.internalId });
    }
    return {
      data: items.length === document.items.length
        ? { ...document, items }
        : null,
      mappingIds,
    };
  }
  if (input.envelope.entityType === "stock_balance") {
    const value = record(input.envelope.data);
    const mapping = await resolveProduct({
      account: input.account,
      connectionId: input.connectionId,
      mappingEntityType: "stock_product",
      external: {
        externalId: String(value.productExternalId ?? ""),
        name: String(value.productName ?? value.name ?? "Товар"),
        unit: typeof value.unit === "string" ? value.unit : undefined,
      },
      candidates: input.stockCandidates,
      autoCreate: input.autoCreateProducts,
    });
    mappingIds.push(mapping.mappingId);
    return {
      data: mapping.internalId ? { ...value, productKey: mapping.internalId } as never : null,
      mappingIds,
    };
  }
  if (input.envelope.entityType === "write_off" || input.envelope.entityType === "return") {
    const value = record(input.envelope.data);
    const originalItems = Array.isArray(value.items) ? value.items : [];
    const items: JsonRecord[] = [];
    for (const original of originalItems) {
      const item = record(original);
      const mapping = await resolveProduct({
        account: input.account,
        connectionId: input.connectionId,
        mappingEntityType: "stock_product",
        external: {
          externalId: String(item.productExternalId ?? ""),
          name: String(item.name ?? "Товар"),
          unit: typeof item.unit === "string" ? item.unit : undefined,
        },
        candidates: input.stockCandidates,
      });
      mappingIds.push(mapping.mappingId);
      if (mapping.internalId) items.push({ ...item, productKey: mapping.internalId });
    }
    return {
      data: items.length === originalItems.length ? { ...value, items } as never : null,
      mappingIds,
    };
  }
  if (input.envelope.entityType === "recipe") {
    const value = record(input.envelope.data);
    const menuMapping = await resolveProduct({
      account: input.account,
      connectionId: input.connectionId,
      mappingEntityType: "menu_item",
      external: {
        externalId: String(value.menuItemExternalId ?? ""),
        name: String(value.name ?? "Позиция меню"),
      },
      candidates: input.menuCandidates,
    });
    mappingIds.push(menuMapping.mappingId);
    const originalIngredients = Array.isArray(value.ingredients) ? value.ingredients : [];
    const ingredients: JsonRecord[] = [];
    for (const original of originalIngredients) {
      const ingredient = record(original);
      const mapping = await resolveProduct({
        account: input.account,
        connectionId: input.connectionId,
        mappingEntityType: "stock_product",
        external: {
          externalId: String(ingredient.productExternalId ?? ""),
          name: String(ingredient.name ?? "Ингредиент"),
          unit: typeof ingredient.unit === "string" ? ingredient.unit : undefined,
        },
        candidates: input.stockCandidates,
      });
      mappingIds.push(mapping.mappingId);
      if (mapping.internalId) ingredients.push({
        ...ingredient,
        purchaseProductKey: mapping.internalId,
      });
    }
    return {
      data: menuMapping.internalId && ingredients.length === originalIngredients.length
        ? { ...value, menuItemId: menuMapping.internalId, ingredients } as never
        : null,
      mappingIds,
    };
  }
  return { data: input.envelope.data, mappingIds };
}

function runStatus(input: {
  received: number;
  created: number;
  updated: number;
  skipped: number;
  errors: number;
  mappingIssues: number;
}): SyncStatus {
  const completed = input.created + input.updated + input.skipped;
  const issues = input.errors + input.mappingIssues;
  if (!issues) return "success";
  return completed > 0 ? "partial" : "failed";
}

export async function runIntegrationSync(input: {
  account: AuthenticatedAccount;
  connectionId: string;
  trigger: "file" | "webhook" | "polling" | "retry" | "local_agent";
  dataType: IntegrationEntityType;
  sourceName?: string;
  records: CanonicalEnvelope[];
  writer: IntegrationBusinessWriter;
  retryOfRunId?: string;
}): Promise<SyncRunResult> {
  const connection = await connectionForTenant(input.account, input.connectionId);
  if (!connection) throw new Error("INTEGRATION_CONNECTION_NOT_FOUND");
  if (!connection.sync_enabled || connection.status === "paused") {
    throw new Error("INTEGRATION_CONNECTION_PAUSED");
  }
  let connectionCapabilities: IntegrationEntityType[] = [];
  let enabledEntities: IntegrationEntityType[] = [];
  let sourcePriority = 0;
  let updatePolicy: "review_documents" | "safe_upsert" = "review_documents";
  let autoCreateProducts = false;
  try {
    const parsed = JSON.parse(connection.capabilities_json) as unknown;
    connectionCapabilities = Array.isArray(parsed) ? parsed as IntegrationEntityType[] : [];
  } catch {
    connectionCapabilities = [];
  }
  try {
    const parsed = record(JSON.parse(connection.config_json));
    enabledEntities = Array.isArray(parsed.enabledEntities)
      ? parsed.enabledEntities as IntegrationEntityType[]
      : connectionCapabilities;
    const requestedPriority = Number((parsed as { sourcePriority?: unknown }).sourcePriority);
    sourcePriority = Number.isFinite(requestedPriority)
      ? Math.max(-100, Math.min(100, Math.round(requestedPriority)))
      : 0;
    updatePolicy = parsed.updatePolicy === "safe_upsert" ? "safe_upsert" : "review_documents";
    autoCreateProducts = parsed.autoCreateProducts === true;
  } catch {
    enabledEntities = connectionCapabilities;
  }
  if (!connectionCapabilities.includes(input.dataType) || !enabledEntities.includes(input.dataType)) {
    throw new Error("INTEGRATION_CAPABILITY_DISABLED");
  }
  const runId = await createSyncRun({
    tenant: input.account,
    connectionId: input.connectionId,
    trigger: input.trigger,
    dataType: input.dataType,
    sourceName: input.sourceName,
    receivedCount: input.records.length,
    retryOfRunId: input.retryOfRunId,
  });
  const assortment = await currentAssortment(input.account.id);
  const stockCandidates = candidatesFromAssortment(assortment, "stock_product");
  const menuCandidates = candidatesFromAssortment(assortment, "menu_item");
  const errors: SyncRunResult["errors"] = [];
  const seen = new Set<string>();
  let created = 0;
  let updated = 0;
  let skipped = 0;
  let mappingIssues = 0;
  const reviewOnChange = new Set<IntegrationEntityType>([
    ...(updatePolicy === "review_documents" ? ["purchase_document"] as IntegrationEntityType[] : []),
    "sale",
    "write_off",
    "return",
  ]);
  type PendingWrite = {
    envelope: CanonicalEnvelope;
    payloadJson: string;
    hash: string;
    existingLink: Awaited<ReturnType<typeof entityLink>>;
    requestedInternalId: string;
    mappedData: CanonicalEntityMap[IntegrationEntityType];
    writeInput: BusinessWriteInput;
  };
  const pendingWrites: PendingWrite[] = [];
  const batchSimpleLists = Boolean(
    input.writer.writeBatch
      && (input.dataType === "supplier" || input.dataType === "warehouse" || input.dataType === "employee"),
  );

  const recordWriteResult = async (
    item: PendingWrite,
    writeResult: BusinessWriteResult,
  ): Promise<void> => {
    const { envelope, payloadJson, hash, existingLink, requestedInternalId } = item;
    if (!writeResult.ok || !writeResult.internalId) {
      if (existingLink?.sync_status === "success" && existingLink.payload_hash !== hash) {
        await restoreEntityLinkAfterFailedUpdate({
          tenant: input.account,
          connectionId: input.connectionId,
          entityType: envelope.entityType,
          externalId: envelope.externalId,
          claimedPayloadHash: hash,
          previousPayloadHash: existingLink.payload_hash,
          previousExternalUpdatedAt: existingLink.external_updated_at,
          previousRunId: existingLink.last_sync_run_id,
        });
      } else {
        await updateEntityLinkStatus({
          tenant: input.account,
          connectionId: input.connectionId,
          entityType: envelope.entityType,
          externalId: envelope.externalId,
          payloadHash: hash,
          internalId: requestedInternalId,
          syncStatus: "failed",
          runId,
        });
      }
      const code = writeResult.code || "BUSINESS_VALIDATION_FAILED";
      const message = writeResult.error || "Запись не прошла проверку BarDoctor";
      errors.push({ externalId: envelope.externalId, code, message });
      await createSyncItem({
        tenant: input.account,
        connectionId: input.connectionId,
        runId,
        entityType: envelope.entityType,
        externalId: envelope.externalId,
        internalId: requestedInternalId,
        status: "failed",
        payloadHash: hash,
        payloadJson,
        errorCode: code,
        errorMessage: message,
      });
      return;
    }
    await updateEntityLinkStatus({
      tenant: input.account,
      connectionId: input.connectionId,
      entityType: envelope.entityType,
      externalId: envelope.externalId,
      payloadHash: hash,
      internalId: writeResult.internalId,
      syncStatus: "success",
      runId,
    });
    if (writeResult.duplicate) skipped += 1;
    else if (existingLink?.sync_status === "success") updated += 1;
    else created += 1;
    if (envelope.entityType === "product") {
      const product = record(item.mappedData);
      if (!stockCandidates.some((candidate) => candidate.id === writeResult.internalId)) {
        stockCandidates.push({
          id: writeResult.internalId,
          name: String(product.name ?? "Товар"),
          unit: typeof product.unit === "string" ? product.unit : undefined,
          packageSize: typeof product.packageSize === "string" ? product.packageSize : undefined,
          barcode: typeof product.barcode === "string" ? product.barcode : undefined,
        });
      }
    }
    await createSyncItem({
      tenant: input.account,
      connectionId: input.connectionId,
      runId,
      entityType: envelope.entityType,
      externalId: envelope.externalId,
      internalId: writeResult.internalId,
      status: writeResult.duplicate ? "skipped" : "success",
      payloadHash: hash,
      payloadJson,
    });
  };

  const failPendingWrite = async (item: PendingWrite, error: unknown): Promise<void> => {
    const message = error instanceof Error ? error.message : "Не удалось обработать запись";
    if (item.existingLink?.sync_status === "success" && item.existingLink.payload_hash !== item.hash) {
      await restoreEntityLinkAfterFailedUpdate({
        tenant: input.account,
        connectionId: input.connectionId,
        entityType: item.envelope.entityType,
        externalId: item.envelope.externalId,
        claimedPayloadHash: item.hash,
        previousPayloadHash: item.existingLink.payload_hash,
        previousExternalUpdatedAt: item.existingLink.external_updated_at,
        previousRunId: item.existingLink.last_sync_run_id,
      });
    } else {
      await updateEntityLinkStatus({
        tenant: input.account,
        connectionId: input.connectionId,
        entityType: item.envelope.entityType,
        externalId: item.envelope.externalId,
        payloadHash: item.hash,
        internalId: item.requestedInternalId,
        syncStatus: "failed",
        runId,
      });
    }
    errors.push({ externalId: item.envelope.externalId, code: "SYNC_ITEM_FAILED", message });
    await createSyncItem({
      tenant: input.account,
      connectionId: input.connectionId,
      runId,
      entityType: item.envelope.entityType,
      externalId: item.envelope.externalId,
      internalId: item.requestedInternalId,
      status: "failed",
      payloadHash: item.hash,
      payloadJson: item.payloadJson,
      errorCode: "SYNC_ITEM_FAILED",
      errorMessage: message,
    });
  };

  const flushPendingWrites = async (): Promise<void> => {
    if (!pendingWrites.length || !input.writer.writeBatch) return;
    const items = pendingWrites.splice(0, pendingWrites.length);
    let results: BusinessWriteResult[];
    try {
      results = await input.writer.writeBatch(items.map((item) => item.writeInput));
      if (results.length !== items.length) throw new Error("INTEGRATION_BATCH_RESULT_MISMATCH");
    } catch (error) {
      for (const item of items) await failPendingWrite(item, error);
      return;
    }
    for (let index = 0; index < items.length; index += 1) {
      try {
        await recordWriteResult(items[index], results[index]);
      } catch (error) {
        await failPendingWrite(items[index], error);
      }
    }
  };

  for (const envelope of input.records) {
    const payloadJson = JSON.stringify(envelope);
    const hash = await payloadHash(envelope);
    const dedupeKey = `${envelope.entityType}:${envelope.externalId}`;
    if (seen.has(dedupeKey)) {
      skipped += 1;
      await createSyncItem({
        tenant: input.account,
        connectionId: input.connectionId,
        runId,
        entityType: envelope.entityType,
        externalId: envelope.externalId,
        status: "skipped",
        payloadHash: hash,
        payloadJson,
        errorCode: "DUPLICATE_IN_BATCH",
        errorMessage: "Повтор записи внутри одного импорта пропущен",
      });
      continue;
    }
    seen.add(dedupeKey);

    try {
      if (envelope.venueId !== input.account.venueId) {
        const message = "Запись относится к другому заведению и была отклонена.";
        errors.push({ externalId: envelope.externalId, code: "TENANT_MISMATCH", message });
        await createSyncItem({
          tenant: input.account,
          connectionId: input.connectionId,
          runId,
          entityType: envelope.entityType,
          externalId: envelope.externalId,
          status: "failed",
          payloadHash: hash,
          payloadJson,
          errorCode: "TENANT_MISMATCH",
          errorMessage: message,
        });
        continue;
      }
      if (envelope.entityType !== input.dataType) {
        const message = "В одном запуске нельзя смешивать разные типы данных.";
        errors.push({ externalId: envelope.externalId, code: "MIXED_ENTITY_TYPES", message });
        await createSyncItem({
          tenant: input.account,
          connectionId: input.connectionId,
          runId,
          entityType: envelope.entityType,
          externalId: envelope.externalId,
          status: "failed",
          payloadHash: hash,
          payloadJson,
          errorCode: "MIXED_ENTITY_TYPES",
          errorMessage: message,
        });
        continue;
      }
      const validationIssues = validateCanonicalEnvelope(envelope);
      if (validationIssues.length) {
        const message = validationIssues.slice(0, 5).map((issue) => issue.message).join("; ");
        errors.push({ externalId: envelope.externalId, code: "VALIDATION_FAILED", message });
        await createSyncItem({
          tenant: input.account,
          connectionId: input.connectionId,
          runId,
          entityType: envelope.entityType,
          externalId: envelope.externalId,
          status: "failed",
          payloadHash: hash,
          payloadJson,
          errorCode: "VALIDATION_FAILED",
          errorMessage: message,
        });
        continue;
      }
      const existingLink = await entityLink(
        input.account,
        input.connectionId,
        envelope.entityType,
        envelope.externalId,
      );
      if (existingLink?.payload_hash === hash && existingLink.sync_status === "success") {
        skipped += 1;
        await createSyncItem({
          tenant: input.account,
          connectionId: input.connectionId,
          runId,
          entityType: envelope.entityType,
          externalId: envelope.externalId,
          internalId: existingLink.internal_id,
          status: "skipped",
          payloadHash: hash,
          payloadJson,
        });
        continue;
      }
      if (envelope.operation === "cancel" || envelope.operation === "delete") {
        const message = existingLink
          ? "Источник отменил или удалил запись. Изменение сохранено как конфликт и требует безопасной корректировки в BarDoctor."
          : "Получена отмена для записи, которая ещё не проводилась в BarDoctor.";
        errors.push({ externalId: envelope.externalId, code: "EXTERNAL_CANCELLATION_REVIEW", message });
        await createSyncItem({
          tenant: input.account,
          connectionId: input.connectionId,
          runId,
          entityType: envelope.entityType,
          externalId: envelope.externalId,
          internalId: existingLink?.internal_id,
          status: "conflict",
          payloadHash: hash,
          payloadJson,
          errorCode: "EXTERNAL_CANCELLATION_REVIEW",
          errorMessage: message,
        });
        continue;
      }
      if (existingLink && existingLink.payload_hash !== hash && reviewOnChange.has(envelope.entityType)) {
        const message = "Внешний документ изменён после проведения. Автоматическая перепроводка заблокирована; создайте корректировку после проверки.";
        errors.push({ externalId: envelope.externalId, code: "IMPORTED_DOCUMENT_CHANGED", message });
        await createSyncItem({
          tenant: input.account,
          connectionId: input.connectionId,
          runId,
          entityType: envelope.entityType,
          externalId: envelope.externalId,
          internalId: existingLink.internal_id,
          status: "conflict",
          payloadHash: hash,
          payloadJson,
          errorCode: "IMPORTED_DOCUMENT_CHANGED",
          errorMessage: message,
        });
        continue;
      }
      if (existingLink?.sync_status === "syncing") {
        const message = "Эта запись уже обрабатывается другим запуском.";
        errors.push({ externalId: envelope.externalId, code: "SYNC_IN_PROGRESS", message });
        await createSyncItem({
          tenant: input.account,
          connectionId: input.connectionId,
          runId,
          entityType: envelope.entityType,
          externalId: envelope.externalId,
          internalId: existingLink.internal_id,
          status: "failed",
          payloadHash: hash,
          payloadJson,
          errorCode: "SYNC_IN_PROGRESS",
          errorMessage: message,
        });
        continue;
      }

      const mapped = await mappedData({
        account: input.account,
        connectionId: input.connectionId,
        envelope,
        stockCandidates,
        menuCandidates,
        autoCreateProducts,
      });
      if (!mapped.data) {
        mappingIssues += 1;
        await createSyncItem({
          tenant: input.account,
          connectionId: input.connectionId,
          runId,
          entityType: envelope.entityType,
          externalId: envelope.externalId,
          status: "mapping_required",
          payloadHash: hash,
          payloadJson,
          mappingId: mapped.mappingIds[0],
          errorCode: "MAPPING_REQUIRED",
          errorMessage: "Не все позиции документа сопоставлены",
        });
        continue;
      }

      const deterministicId = !existingLink
        && !mapped.directInternalId
        && (envelope.entityType === "supplier" || envelope.entityType === "warehouse")
        ? await deterministicEntityInternalId(
            input.connectionId,
            envelope.entityType,
            envelope.externalId,
          )
        : undefined;
      const requestedInternalId = existingLink?.internal_id
        || mapped.directInternalId
        || deterministicId
        || (typeof record(mapped.data).id === "string" ? String(record(mapped.data).id) : crypto.randomUUID());
      const claimed = await claimEntityLink({
        tenant: input.account,
        connectionId: input.connectionId,
        entityType: envelope.entityType,
        externalId: envelope.externalId,
        internalId: requestedInternalId,
        payloadHash: hash,
        externalUpdatedAt: envelope.externalUpdatedAt,
        runId,
        allowPayloadUpdate: Boolean(existingLink && !reviewOnChange.has(envelope.entityType)),
      });
      if (!claimed.claimed) throw new Error("Запись была занята другим запуском синхронизации");

      const metadata: JsonRecord = {
        id: requestedInternalId,
        internalId: requestedInternalId,
        externalId: envelope.externalId,
        externalSystem: envelope.externalSystem,
        venueId: input.account.venueId,
        externalUpdatedAt: envelope.externalUpdatedAt,
        syncStatus: "syncing" as const,
        sourceLabel: `Импорт · ${envelope.externalSystem}`,
        sourceType: envelope.sourceType,
        sourcePriority,
      };
      const data = { ...record(mapped.data), ...metadata } as CanonicalEntityMap[IntegrationEntityType];
      const writeEnvelope = { ...envelope, sourcePriority, data } as CanonicalEnvelope;
      const pendingWrite: PendingWrite = {
        envelope,
        payloadJson,
        hash,
        existingLink,
        requestedInternalId,
        mappedData: mapped.data,
        writeInput: {
          entityType: envelope.entityType,
          data,
          envelope: writeEnvelope,
          internalId: requestedInternalId,
          isUpdate: Boolean(existingLink && existingLink.payload_hash !== hash),
        },
      };
      if (batchSimpleLists) {
        pendingWrites.push(pendingWrite);
        if (pendingWrites.length >= 250) await flushPendingWrites();
        continue;
      }
      try {
        const writeResult = await input.writer.write(pendingWrite.writeInput);
        await recordWriteResult(pendingWrite, writeResult);
      } catch (error) {
        await failPendingWrite(pendingWrite, error);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Не удалось обработать запись";
      errors.push({ externalId: envelope.externalId, code: "SYNC_ITEM_FAILED", message });
      await createSyncItem({
        tenant: input.account,
        connectionId: input.connectionId,
        runId,
        entityType: envelope.entityType,
        externalId: envelope.externalId,
        status: "failed",
        payloadHash: hash,
        payloadJson,
        errorCode: "SYNC_ITEM_FAILED",
        errorMessage: message,
      });
    }
  }
  await flushPendingWrites();

  const status = runStatus({
    received: input.records.length,
    created,
    updated,
    skipped,
    errors: errors.length,
    mappingIssues,
  });
  await finishSyncRun({
    tenant: input.account,
    connectionId: input.connectionId,
    runId,
    status,
    created,
    updated,
    skipped,
    errors,
    mappingIssues,
  });
  return {
    runId,
    status,
    received: input.records.length,
    created,
    updated,
    skipped,
    errors,
    mappingIssues,
  };
}

export function newStockProductId(external: ExternalProductReference): string {
  return inventoryProductKey({
    name: external.name,
    packageSize: external.packageSize,
    unit: external.unit,
  });
}
