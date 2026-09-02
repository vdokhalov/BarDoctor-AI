const DEFAULT_MAX_SPREADSHEET_BYTES = 12 * 1024 * 1024;

function hasPrefix(bytes: Uint8Array, prefix: readonly number[]): boolean {
  return prefix.every((byte, index) => bytes[index] === byte);
}

function isSpreadsheetContainer(bytes: Uint8Array): boolean {
  return hasPrefix(bytes, [0x50, 0x4b, 0x03, 0x04])
    || hasPrefix(bytes, [0x50, 0x4b, 0x05, 0x06])
    || hasPrefix(bytes, [0x50, 0x4b, 0x07, 0x08])
    || hasPrefix(bytes, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
}

function looksLikeBoundedText(bytes: Uint8Array): boolean {
  const sample = bytes.subarray(0, Math.min(bytes.byteLength, 8 * 1024));
  let controls = 0;
  for (const byte of sample) {
    if (byte === 0) return false;
    if (byte < 0x09 || (byte > 0x0d && byte < 0x20)) controls += 1;
  }
  return controls <= Math.max(2, Math.floor(sample.byteLength / 100));
}

export function assertSpreadsheetInput(
  bytes: Uint8Array,
  maxBytes = DEFAULT_MAX_SPREADSHEET_BYTES,
): void {
  if (bytes.byteLength === 0) throw new Error("SPREADSHEET_EMPTY");
  if (bytes.byteLength > maxBytes) throw new Error("SPREADSHEET_TOO_LARGE");
  if (!isSpreadsheetContainer(bytes) && !looksLikeBoundedText(bytes)) {
    throw new Error("SPREADSHEET_SIGNATURE_INVALID");
  }
}
