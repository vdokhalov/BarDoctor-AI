export function findLineStartBeforeMarker(source, marker, fromIndex = 0) {
  const markerIndex = source.indexOf(marker, fromIndex);
  if (markerIndex < 0) return -1;
  if (markerIndex === 0) return 0;
  if (source[markerIndex - 1] !== "\n") return -1;
  return markerIndex > 1 && source[markerIndex - 2] === "\r"
    ? markerIndex - 2
    : markerIndex - 1;
}

export function findBlankLineStartBeforeMarker(source, marker, fromIndex = 0) {
  const markerIndex = source.indexOf(marker, fromIndex);
  if (markerIndex < 0) return -1;

  let cursor = markerIndex;
  const lineStarts = [];
  while (cursor > 0 && source[cursor - 1] === "\n") {
    cursor -= 1;
    if (cursor > 0 && source[cursor - 1] === "\r") cursor -= 1;
    lineStarts.push(cursor);
  }

  return lineStarts.length >= 2 ? lineStarts[1] : -1;
}

export function findUniquePatternStart(source, pattern) {
  const flags = pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`;
  const matcher = new RegExp(pattern.source, flags);
  const first = matcher.exec(source);
  if (!first || matcher.exec(source)) return -1;
  return first.index;
}
