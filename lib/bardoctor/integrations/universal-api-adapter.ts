import {
  INTEGRATION_ENTITY_TYPES,
  type AdapterContext,
  type AdapterInput,
  type AdapterResult,
  type IntegrationAdapter,
  type IntegrationChannel,
  type PullCursor,
} from "./contracts";
import { UniversalFileAdapter } from "./universal-file-adapter";

class JsonIngressAdapter implements IntegrationAdapter {
  readonly key: string;
  readonly channels: readonly IntegrationChannel[];
  readonly capabilities = INTEGRATION_ENTITY_TYPES;
  private cursor: PullCursor | null = null;

  constructor(key: string, channels: readonly IntegrationChannel[]) {
    this.key = key;
    this.channels = channels;
  }

  async normalize(input: AdapterInput, context: AdapterContext): Promise<AdapterResult> {
    if (!input.entityType) throw new Error("ENTITY_TYPE_REQUIRED");
    if (input.json === undefined) throw new Error("JSON_PAYLOAD_REQUIRED");
    const adapter = new UniversalFileAdapter();
    const result = await adapter.normalize({
      json: input.json,
      entityType: input.entityType,
      fieldMapping: input.fieldMapping,
    }, context);
    this.cursor = adapter.getLastSyncCursor();
    return result;
  }

  async healthCheck(): Promise<{ ok: boolean; message?: string }> {
    return { ok: true, message: "JSON ingress готов принимать канонические пакеты" };
  }

  getLastSyncCursor(): PullCursor | null {
    return this.cursor;
  }
}

export class UniversalApiAdapter extends JsonIngressAdapter {
  constructor() {
    super("universal-api-v1", ["rest", "webhook"]);
  }
}

export class LocalConnectorAdapter extends JsonIngressAdapter {
  constructor() {
    super("local-connector-v1", ["local_agent"]);
  }
}
