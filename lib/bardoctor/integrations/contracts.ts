import type { PurchaseDocument, PurchaseItem } from "../purchases";
import type { SalesDocument, SalesItem } from "../sales";

export const INTEGRATION_ENTITY_TYPES = [
  "product",
  "warehouse",
  "purchase_document",
  "sale",
  "stock_balance",
  "write_off",
  "return",
  "recipe",
  "supplier",
  "employee",
] as const;

export const INTEGRATION_SOURCE_TYPES = [
  "manual",
  "scan",
  "file_import",
  "1c",
  "iiko",
  "poster",
  "rkeeper",
  "api",
  "local_connector",
] as const;

export type IntegrationEntityType = (typeof INTEGRATION_ENTITY_TYPES)[number];
export type IntegrationSourceType = (typeof INTEGRATION_SOURCE_TYPES)[number];
export type IntegrationChannel = "rest" | "webhook" | "polling" | "file" | "local_agent";
export type SyncStatus = "pending" | "syncing" | "success" | "partial" | "failed";
export type MappingStatus = "confirmed" | "suggested" | "unresolved" | "conflict";
export type IntegrationOperation = "upsert" | "cancel" | "delete";
export type ConnectorCapabilityState = "supported" | "unsupported";

export type ConnectorCapabilities = Record<IntegrationEntityType, ConnectorCapabilityState> & {
  webhooks: ConnectorCapabilityState;
  polling: ConnectorCapabilityState;
};

export type IntegrationConnectionStatus =
  | "not_configured"
  | "requires_setup"
  | "checking"
  | "connected"
  | "paused"
  | "error";

export type IntegrationConnectionConfig = {
  externalOrganizationId?: string;
  externalVenueId?: string;
  warehouseIds: string[];
  registerIds: string[];
  enabledEntities: IntegrationEntityType[];
  syncMode: "manual" | "webhook" | "polling" | "local_agent";
  pollingMinutes?: number;
  updatePolicy: "review_documents" | "safe_upsert";
  autoCreateProducts?: boolean;
  initialSyncDays?: number;
  sourcePriority?: number;
};

export type IntegrationMetadata = {
  internalId?: string;
  externalId: string;
  externalSystem: string;
  venueId: number;
  sourceType: IntegrationSourceType;
  operation?: IntegrationOperation;
  createdAt?: string;
  updatedAt?: string;
  externalUpdatedAt?: string;
  sourcePriority?: number;
  syncStatus: SyncStatus;
};

export type ExternalProductReference = {
  externalId: string;
  name: string;
  unit?: string;
  packageSize?: string;
  barcode?: string;
};

export type CanonicalPurchaseItem = PurchaseItem & {
  externalProduct: ExternalProductReference;
};

export type CanonicalPurchaseDocument = Omit<PurchaseDocument, "items"> & {
  items: CanonicalPurchaseItem[];
};

export type CanonicalSaleItem = SalesItem & {
  externalProduct: ExternalProductReference;
};

export type CanonicalSale = Omit<SalesDocument, "items"> & {
  items: CanonicalSaleItem[];
};

export type Product = {
  name: string;
  code?: string;
  article?: string;
  category?: string;
  groupExternalId?: string;
  unit?: string;
  packageSize?: string;
  barcode?: string;
  sku?: string;
  active?: boolean;
};

export type Warehouse = {
  code?: string;
  name: string;
  active?: boolean;
};

export type StockBalance = {
  productExternalId: string;
  productName?: string;
  warehouseExternalId?: string;
  quantity: number;
  unit: string;
  measuredAt: string;
  totalValue?: number;
  averageUnitCost?: number;
};

export type WriteOff = {
  date: string;
  reason?: string;
  warehouseExternalId?: string;
  total?: number;
  currency?: string;
  items: Array<{
    productExternalId: string;
    name?: string;
    quantity: number;
    unit: string;
    amount?: number;
  }>;
};

export type Return = {
  date: string;
  direction: "to_supplier" | "from_customer";
  supplierExternalId?: string;
  saleExternalId?: string;
  currency?: string;
  items: Array<{
    productExternalId: string;
    name?: string;
    quantity: number;
    unit: string;
    amount?: number;
  }>;
};

export type Recipe = {
  menuItemExternalId: string;
  name: string;
  portions?: number;
  ingredients: Array<{
    productExternalId: string;
    name?: string;
    quantity: number;
    unit: string;
  }>;
};

export type Supplier = {
  code?: string;
  name: string;
  taxId?: string;
  phone?: string;
  email?: string;
  active?: boolean;
};

export type Employee = {
  name: string;
  role?: string;
  phone?: string;
  email?: string;
  active?: boolean;
};

export type CanonicalEntityMap = {
  product: Product;
  warehouse: Warehouse;
  purchase_document: CanonicalPurchaseDocument;
  sale: CanonicalSale;
  stock_balance: StockBalance;
  write_off: WriteOff;
  return: Return;
  recipe: Recipe;
  supplier: Supplier;
  employee: Employee;
};

export type CanonicalEnvelope<T extends IntegrationEntityType = IntegrationEntityType> =
  IntegrationMetadata & {
    entityType: T;
    data: CanonicalEntityMap[T];
    raw?: unknown;
  };

export type AdapterContext = {
  venueId: number;
  externalSystem: string;
  sourceType: IntegrationSourceType;
  now: string;
};

export type FieldMapping = Record<string, string>;

export type AdapterInput = {
  fileName?: string;
  mediaType?: string;
  bytes?: Uint8Array;
  json?: unknown;
  entityType?: IntegrationEntityType;
  fieldMapping?: FieldMapping;
};

export type AdapterResult = {
  entityType: IntegrationEntityType;
  records: CanonicalEnvelope[];
  warnings: string[];
};

/** A vendor connector only authenticates, reads and normalizes. */
export interface IntegrationAdapter {
  readonly key: string;
  readonly channels: readonly IntegrationChannel[];
  readonly capabilities: readonly IntegrationEntityType[];
  normalize(input: AdapterInput, context: AdapterContext): Promise<AdapterResult>;
  healthCheck(context: AdapterContext): Promise<{ ok: boolean; message?: string }>;
  getLastSyncCursor(): PullCursor | null;
}

export type PullCursor = Record<string, string | number | boolean | null>;

export interface PullIntegrationAdapter extends IntegrationAdapter {
  pull(input: { cursor?: PullCursor; limit: number }, context: AdapterContext): Promise<{
    result: AdapterResult;
    nextCursor?: PullCursor;
  }>;
}

export type LocalConnectorMessage = {
  protocolVersion: "1.0";
  connectionId: string;
  deliveryId: string;
  sentAt: string;
  cursor?: PullCursor;
  entityType: IntegrationEntityType;
  records: unknown[];
};

export type UniversalApiMessage = {
  protocolVersion: "1.0";
  deliveryId: string;
  sentAt?: string;
  cursor?: PullCursor;
  entityType: IntegrationEntityType;
  records: unknown[];
};
