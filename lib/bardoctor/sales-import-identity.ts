const SALES_IMPORT_PARSER_VERSION = "tabular-v1";

function hex(bytes: ArrayBuffer): string {
  return [...new Uint8Array(bytes)].map((value) => value.toString(16).padStart(2, "0")).join("");
}

export async function salesImportIdentity(input: {
  venueId: number;
  sourceType: string;
  content: Uint8Array;
  parserVersion?: string;
}): Promise<string> {
  const contentHash = hex(await crypto.subtle.digest("SHA-256", input.content.slice().buffer as ArrayBuffer));
  const namespace = `${input.venueId}:${input.sourceType}:${input.parserVersion ?? SALES_IMPORT_PARSER_VERSION}:${contentHash}`;
  const identityHash = hex(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(namespace)));
  return `sales-import:${identityHash}`;
}
