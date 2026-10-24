/** Literal substring search: D1 limits LIKE/GLOB pattern complexity even when
 * the user supplies ordinary text. Parameters remain bound, never SQL text.
 * SQLite lower retains the existing LIKE ASCII case-insensitive semantics.
 */
export function auditTextSearch(query: string): { sql: string; bindings: string[] } {
  return {
    sql: "(instr(lower(COALESCE(actor_name, '')), lower(?)) > 0 OR instr(lower(COALESCE(entity_label, '')), lower(?)) > 0 OR instr(lower(COALESCE(reason, '')), lower(?)) > 0)",
    bindings: [query, query, query],
  };
}
