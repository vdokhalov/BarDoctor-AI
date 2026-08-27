import {
  AUTHORITATIVE_STORE_KEYS,
  type AuthoritativeStoreKey,
} from "./authoritative-persistence";

export const CAPTURE_ENABLED_VENUE_IDS = [1, 2088, 3280] as const;

export type CapturedCandidate = {
  source: "browser_local_storage";
  sourceKey: string;
  capturedAt: string;
  data: unknown;
};

export type CapturedCandidates = Partial<Record<AuthoritativeStoreKey, CapturedCandidate>>;

export function allowedLegacySourceKeys(input: {
  storeKey: AuthoritativeStoreKey;
  email: string;
  venueId: number;
  primaryVenue: boolean;
}): string[] {
  const exact = `${input.storeKey}__${input.email}__venue_${input.venueId}`;
  return input.primaryVenue
    ? [exact, `${input.storeKey}__${input.email}`, input.storeKey]
    : [exact];
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

export function validateCapturedCandidates(input: {
  value: unknown;
  email: string;
  venueId: number;
  primaryVenue: boolean;
}): { ok: true; candidates: CapturedCandidates } | { ok: false; error: string } {
  const root = record(input.value);
  const candidates: CapturedCandidates = {};
  for (const [key, rawCandidate] of Object.entries(root)) {
    if (!AUTHORITATIVE_STORE_KEYS.includes(key as AuthoritativeStoreKey)) {
      return { ok: false, error: `Неизвестное хранилище: ${key}` };
    }
    const storeKey = key as AuthoritativeStoreKey;
    const candidate = record(rawCandidate);
    if (candidate.source !== "browser_local_storage"
      || typeof candidate.sourceKey !== "string"
      || typeof candidate.capturedAt !== "string"
      || !("data" in candidate)) {
      return { ok: false, error: `Некорректное доказательство для ${storeKey}` };
    }
    const allowed = allowedLegacySourceKeys({
      storeKey,
      email: input.email,
      venueId: input.venueId,
      primaryVenue: input.primaryVenue,
    });
    if (!allowed.includes(candidate.sourceKey)) {
      return { ok: false, error: `Источник ${storeKey} не принадлежит выбранному заведению` };
    }
    if (!Number.isFinite(Date.parse(candidate.capturedAt))) {
      return { ok: false, error: `Некорректное время захвата для ${storeKey}` };
    }
    candidates[storeKey] = {
      source: "browser_local_storage",
      sourceKey: candidate.sourceKey,
      capturedAt: candidate.capturedAt,
      data: candidate.data,
    };
  }
  if (!Object.keys(candidates).length) return { ok: false, error: "Старые данные этого заведения в браузере не найдены" };
  return { ok: true, candidates };
}
