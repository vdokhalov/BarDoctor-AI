import * as XLSX from "xlsx";

/** Keep one SheetJS parser and the existing extraction limits for menu uploads. */
export function menuSpreadsheetText(bytes: Uint8Array, source: { filename: string; mimeType: string }): string {
  const delimitedText = /\.(csv|tsv)$/i.test(source.filename)
    || ["text/csv", "text/tab-separated-values"].includes(source.mimeType.split(";")[0].trim().toLowerCase());
  // Preserve SheetJS's existing explicit UTF-16LE BOM path; forcing UTF-8
  // there would decode its already-decoded text a second time.
  const utf16Bom = bytes[0] === 0xff && bytes[1] === 0xfe;
  // SheetJS's array CSV path otherwise maps each UTF-8 byte to one character
  // unless a BOM is present. Declare UTF-8 before parsing; keep BOM handling,
  // delimiters/quoting and binary workbook codepages in the existing parser.
  const workbook = XLSX.read(bytes, { type: "array", cellDates: true, ...(delimitedText && !utf16Bom ? { codepage: 65001 } : {}) });
  const blocks: string[] = [];
  for (const sheetName of workbook.SheetNames.slice(0, 8)) {
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
      header: 1,
      raw: false,
      defval: "",
      blankrows: false,
    }).slice(0, 900);
    blocks.push(
      `Лист: ${sheetName}\n${rows
        .map((row) => row.slice(0, 30).map((cell) => String(cell ?? "").trim()).join("\t"))
        .join("\n")}`,
    );
  }
  return blocks.join("\n\n").slice(0, 350_000);
}
