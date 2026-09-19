/** Only source classification needs these top-level fields, never the snapshots. */
export function auditSourceProjection(column: "before_json" | "after_json"): string {
  // Match sourceFromAudit: objects, or object members of an array; first non-null
  // field in array order. Invalid JSON and scalar roots contribute no metadata.
  const objects = `CASE WHEN json_valid(${column}) THEN CASE json_type(${column})
    WHEN 'object' THEN json_array(json(${column}))
    WHEN 'array' THEN ${column} ELSE '[]' END ELSE '[]' END`;
  // Last duplicate object key matches JSON.parse. REAL values need round-trip
  // precision; SQLite json_quote otherwise rounds them to 15 significant digits.
  const field = (name: "source" | "sourceType" | "externalSystem") => `(
    SELECT metadata FROM (
      SELECT CAST(item.key AS INTEGER) AS position, (
        SELECT CASE property.type
          WHEN 'true' THEN 'true' WHEN 'false' THEN 'false'
          WHEN 'null' THEN 'null' WHEN 'object' THEN property.value
          WHEN 'real' THEN CASE
            WHEN property.value > 1.7976931348623157e308 THEN '1e999'
            WHEN property.value < -1.7976931348623157e308 THEN '-1e999'
            ELSE printf('%!.17g', property.value) END
          WHEN 'array' THEN property.value ELSE json_quote(property.value) END
        FROM json_each(CASE WHEN item.type = 'object' THEN item.value ELSE '{}' END) AS property
        WHERE property.key = '${name}' ORDER BY property.id DESC LIMIT 1
      ) AS metadata
      FROM json_each(${objects}) AS item WHERE item.type = 'object'
    ) WHERE metadata IS NOT NULL AND metadata <> 'null' ORDER BY position LIMIT 1
  )`;
  return `json_object('source', json(${field("source")}),
    'sourceType', json(${field("sourceType")}),
    'externalSystem', json(${field("externalSystem")}))`;
}
