const ownedComments = [
  "/* bd-unit-product-costing-v384 */",
  "/* bd-unit-product-costing-v385 bd-unit-product-costing-v386 bd-unit-product-costing-v387 bd-unit-product-costing-v389 bd-unit-product-costing-v390 bd-unit-product-costing-v391 bd-unit-product-costing-v392 bd-unit-product-costing-v393 */",
];

/** Replace the generated block together with its own preceding markers. */
export function replaceLegacyCostingSegment(input, start, end, replacement, label) {
  const startIndex = input.indexOf(start);
  if (startIndex < 0) throw new Error(label + ": start marker not found");
  if (input.indexOf(start, startIndex + start.length) !== -1) throw new Error(label + ": duplicate start marker");
  const endIndex = input.indexOf(end, startIndex + start.length);
  if (endIndex < 0) throw new Error(label + ": end marker not found");
  let prefix = input.slice(0, startIndex);
  const seen = new Set();
  for (;;) {
    const trimmed = prefix.replace(/[\r\n]+$/, "");
    const comment = ownedComments.find(value => trimmed.endsWith(value));
    if (!comment) break;
    seen.add(comment);
    prefix = trimmed.slice(0, -comment.length);
  }
  const retained = ownedComments.filter(comment => seen.has(comment) && !replacement.startsWith(comment));
  return prefix + retained.map(comment => comment + "\n").join("") + replacement + input.slice(endIndex);
}
