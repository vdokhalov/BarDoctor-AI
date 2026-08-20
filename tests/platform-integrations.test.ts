import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path: string) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("OpenAI and OneSignal credentials remain platform-managed and are absent from venue integration UI", async () => {
  const [schema, secrets, integrationsApi, integrationsPage] = await Promise.all([
    read("db/schema.ts"),
    read("lib/bardoctor/integration-secrets.ts"),
    read("app/api/integrations/route.ts"),
    read("app/integrations/route.ts"),
  ]);

  assert.match(schema, /export const platformSecrets = sqliteTable/);
  assert.match(schema, /"platform_secrets"/);
  assert.match(secrets, /"OPENAI_API_KEY",\s+"OPENAI_MODEL",\s+"ONESIGNAL_REST_API_KEY"/);
  assert.match(secrets, /migrateLegacyPlatformValue/);
  assert.match(secrets, /additionalData\(accountId, key\)/);
  assert.match(secrets, /platformAdditionalData\(key\)/);
  assert.match(secrets, /if \(isPlatformIntegrationKey\(key\)\) return getPlatformIntegrationValue\(key\)/);
  assert.match(integrationsApi, /selectedService === "openai" \|\| selectedService === "onesignal"/);
  assert.match(integrationsApi, /source: oneSignalSource === "environment" \|\| oneSignalSource === "platform_store"/);
  assert.doesNotMatch(integrationsPage, /OpenAI|OneSignal|API[‑-]ключ.*AI|Push[‑-]уведомления.*provider/i);
  assert.doesNotMatch(integrationsPage, /name="apiKey"[^>]*placeholder="os_v2_app_/);
});
