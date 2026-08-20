import { env } from "cloudflare:workers";

export function runtimeEnv(name: string): string | null {
  const bindings = env as unknown as Record<string, unknown>;
  const boundValue = bindings[name];
  if (typeof boundValue === "string" && boundValue.trim()) return boundValue.trim();

  const processValue = typeof process !== "undefined" ? process.env[name] : undefined;
  return processValue?.trim() || null;
}
