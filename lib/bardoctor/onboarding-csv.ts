/** Bounded RFC4180-style CSV reader. No formulas or spreadsheet evaluation. */
export function parseOnboardingCsv(source: string) {
  if (typeof source !== "string" || new TextEncoder().encode(source).length > 512_000) throw new Error("OPENING_CSV_SIZE");
  const raw = source.replace(/^\uFEFF/, "");
  const header = raw.split(/\r?\n/, 1)[0];
  const separator = header.includes(";") ? ";" : ",";
  const records: string[][] = [];
  let row: string[] = [], value = "", quoted = false, closed = false;
  function cell() {
    if (value.length > 240 || row.length >= 20) throw new Error("OPENING_CSV_CELL_LIMIT");
    const normalized = value.trim();
    if (/^[=+@]/.test(normalized)) throw new Error("OPENING_CSV_FORMULA");
    row.push(normalized); value = ""; closed = false;
  }
  function finish() {
    cell();
    if (row.some(Boolean)) records.push(row);
    if (records.length > 501) throw new Error("OPENING_ROW_LIMIT");
    row = [];
  }
  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i];
    if (quoted) {
      if (ch === '"' && raw[i + 1] === '"') { value += '"'; i++; }
      else if (ch === '"') { quoted = false; closed = true; }
      else value += ch;
    } else if (ch === '"' && !value && !closed) quoted = true;
    else if (ch === separator) cell();
    else if (ch === "\r" || ch === "\n") { if (ch === "\r" && raw[i + 1] === "\n") i++; finish(); }
    else { if (closed && ch.trim()) throw new Error("OPENING_CSV_QUOTES"); value += ch; }
    if (value.length > 240) throw new Error("OPENING_CSV_CELL_LIMIT");
  }
  if (quoted) throw new Error("OPENING_CSV_QUOTES");
  if (value || row.length || closed) finish();
  const columns = records.shift();
  if (!columns?.length || columns.some(v => !v) || new Set(columns).size !== columns.length || !records.length) throw new Error("OPENING_CSV_HEADERS");
  if (records.some(v => v.length !== columns.length)) throw new Error("OPENING_CSV_COLUMNS");
  return { columns, rows: records };
}
