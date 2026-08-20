import {
  INTEGRATION_ENTITY_TYPES,
  type ConnectorCapabilities,
  type IntegrationAdapter,
  type IntegrationChannel,
  type IntegrationEntityType,
} from "./contracts";

export type AdapterAvailability = "ready" | "requires_adapter" | "requires_local_agent";

export type AdapterDescriptor = {
  key: string;
  label: string;
  availability: AdapterAvailability;
  channels: IntegrationChannel[];
  capabilities: IntegrationEntityType[];
  plannedCapabilities: IntegrationEntityType[];
  capabilityMatrix: ConnectorCapabilities;
  description: string;
};

function capabilityMatrix(
  supported: readonly IntegrationEntityType[],
  options: { webhooks?: boolean; polling?: boolean } = {},
): ConnectorCapabilities {
  const supportedSet = new Set(supported);
  return Object.fromEntries([
    ...INTEGRATION_ENTITY_TYPES.map((type) => [
      type,
      supportedSet.has(type) ? "supported" : "unsupported",
    ]),
    ["webhooks", options.webhooks ? "supported" : "unsupported"],
    ["polling", options.polling ? "supported" : "unsupported"],
  ]) as ConnectorCapabilities;
}

const everyEntity = [...INTEGRATION_ENTITY_TYPES];
const localConnectorMvp: IntegrationEntityType[] = [
  "product",
  "supplier",
  "warehouse",
  "purchase_document",
  "stock_balance",
];

const descriptors: AdapterDescriptor[] = [
  {
    key: "universal-file-v1",
    label: "Импорт файла",
    availability: "ready",
    channels: ["file"],
    capabilities: everyEntity,
    plannedCapabilities: [],
    capabilityMatrix: capabilityMatrix(everyEntity),
    description: "CSV, Excel, JSON и XML через единый Sync Engine и сохраняемые шаблоны колонок.",
  },
  {
    key: "universal-api-v1",
    label: "Universal API",
    availability: "ready",
    channels: ["rest", "webhook"],
    capabilities: everyEntity,
    plannedCapabilities: [],
    capabilityMatrix: capabilityMatrix(everyEntity, { webhooks: true }),
    description: "Защищённый вход для любой системы, способной передать стандартный контракт BarDoctor.",
  },
  {
    key: "local-connector-v1",
    label: "Local Connector",
    availability: "ready",
    channels: ["local_agent"],
    capabilities: localConnectorMvp,
    plannedCapabilities: ["sale", "write_off", "return", "recipe", "employee"],
    capabilityMatrix: capabilityMatrix(localConnectorMvp),
    description: "Windows-агент читает локальную 1С через штатное COM-соединение и передаёт данные в общий Sync Engine.",
  },
  {
    key: "1c",
    label: "1С",
    availability: "requires_local_agent",
    channels: [],
    capabilities: [],
    plannedCapabilities: localConnectorMvp,
    capabilityMatrix: capabilityMatrix([]),
    description: "Подключается через BarDoctor Local Connector for Windows. Поддержан первый профиль: 1С:Общепит 2.0 на платформе 8.2.",
  },
  {
    key: "iiko",
    label: "iiko",
    availability: "requires_adapter",
    channels: [],
    capabilities: [],
    plannedCapabilities: everyEntity,
    capabilityMatrix: capabilityMatrix([]),
    description: "Коннектор ещё не реализован. Карточка не имитирует подключение к API iiko.",
  },
  {
    key: "poster",
    label: "Poster",
    availability: "requires_adapter",
    channels: [],
    capabilities: [],
    plannedCapabilities: everyEntity,
    capabilityMatrix: capabilityMatrix([]),
    description: "Коннектор ещё не реализован. До его появления доступны Universal API и файл‑импорт.",
  },
  {
    key: "r_keeper",
    label: "r_keeper",
    availability: "requires_local_agent",
    channels: [],
    capabilities: [],
    plannedCapabilities: everyEntity,
    capabilityMatrix: capabilityMatrix([]),
    description: "Готового r_keeper‑адаптера нет. Будущий адаптер будет работать через Local Connector в сети заведения.",
  },
];

const adapters = new Map<string, IntegrationAdapter>();

export function registerIntegrationAdapter(adapter: IntegrationAdapter): void {
  if (adapters.has(adapter.key)) throw new Error(`Adapter already registered: ${adapter.key}`);
  adapters.set(adapter.key, adapter);
}

export function integrationAdapter(key: string): IntegrationAdapter | null {
  return adapters.get(key) ?? null;
}

export function integrationAdapterDescriptors(): AdapterDescriptor[] {
  return descriptors.map((item) => ({
    ...item,
    channels: [...item.channels],
    capabilities: [...item.capabilities],
    plannedCapabilities: [...item.plannedCapabilities],
    capabilityMatrix: { ...item.capabilityMatrix },
  }));
}
