declare const __BARDOCTOR_APP_VERSION__: string;
declare const __BARDOCTOR_BUILD_NUMBER__: string;
declare const __BARDOCTOR_BUILD_TIMESTAMP__: string;
declare const __BARDOCTOR_SCHEMA_VERSION__: string;

function compiledValue(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

export const BARDOCTOR_APP_VERSION = compiledValue(
  typeof __BARDOCTOR_APP_VERSION__ === "string" ? __BARDOCTOR_APP_VERSION__ : undefined,
  "app-version-unavailable",
);
export const BARDOCTOR_BUILD_NUMBER = compiledValue(
  typeof __BARDOCTOR_BUILD_NUMBER__ === "string" ? __BARDOCTOR_BUILD_NUMBER__ : undefined,
  "build-number-unavailable",
);
export const BARDOCTOR_BUILD_TIMESTAMP = compiledValue(
  typeof __BARDOCTOR_BUILD_TIMESTAMP__ === "string" ? __BARDOCTOR_BUILD_TIMESTAMP__ : undefined,
  "build-timestamp-unavailable",
);
export const BARDOCTOR_SCHEMA_VERSION = compiledValue(
  typeof __BARDOCTOR_SCHEMA_VERSION__ === "string" ? __BARDOCTOR_SCHEMA_VERSION__ : undefined,
  "schema-version-unavailable",
);

// Compatibility aliases for the existing UI. Both values are now derived from
// the canonical build metadata instead of hand-maintained release constants.
export const BARDOCTOR_BUILD_VERSION = BARDOCTOR_APP_VERSION;
export const BARDOCTOR_BUILD_ID = `${BARDOCTOR_APP_VERSION}+${BARDOCTOR_BUILD_NUMBER}`;
