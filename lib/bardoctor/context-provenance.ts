import type { EvidenceScope } from "./evidence-contracts";

export const CONTEXT_AUTHORITIES = ["CANONICAL_INTERNAL_FACT", "OWNER_PROVIDED_CONTEXT", "OWNER_CONFIRMED_CONTEXT", "EXTERNAL_OBSERVATION", "HYPOTHESIS", "LEGACY_CONTEXT"] as const;
export type ContextAuthority = typeof CONTEXT_AUTHORITIES[number];
export type ContextProvenance = { authority: ContextAuthority; sourceKey: string; identity: string | null; scope?: EvidenceScope; ownerConfirmed: boolean; sourceUrls: string[]; independentVerification: "NOT_ESTABLISHED"; identityConflict?: "SAME_NAME_DIFFERENT_SOURCE" };
/** Confirmation of context does not certify external facts or provider identity. */
export function contextProvenance(value: Record<string, unknown>, sourceKey: string, legacy = false, scope?: EvidenceScope): ContextProvenance {
  const sourceUrls = Array.isArray(value.sourceUrls) ? value.sourceUrls.filter((url): url is string => typeof url === "string" && /^https?:\/\//i.test(url)).slice(0, 8) : [];
  const ownerConfirmed = value.confirmed === true || value.ownerConfirmed === true;
  const authority = legacy ? "LEGACY_CONTEXT" : ownerConfirmed ? "OWNER_CONFIRMED_CONTEXT"
    : value.origin === "manual" || value.source === "owner" ? "OWNER_PROVIDED_CONTEXT"
    : value.origin === "web" && sourceUrls.length ? "EXTERNAL_OBSERVATION" : "HYPOTHESIS";
  return { authority, sourceKey, identity: typeof value.key === "string" ? value.key : typeof value.id === "string" ? value.id : null,
    ...(scope ? { scope } : {}), ownerConfirmed, sourceUrls, independentVerification: "NOT_ESTABLISHED" };
}
