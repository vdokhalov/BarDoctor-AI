import assert from "node:assert/strict";
import vm from "node:vm";
import { createRequire } from "node:module";
import { createHash } from "node:crypto";

/**
 * Extract actual top-level financial functions and ALL reassignment wrappers.
 * @param {string} bundle Actual packaged client source.
 * @param {(key: string) => unknown} getStore Venue-scoped fixture reader.
 * @param {{ localStorage?: { getItem(key: string): string | null }, now?: string }} options Native VM environment boundaries only.
 */
export function compileFinancialClient(bundle, getStore, options = {}) {
  const req = createRequire(new URL("../../package.json", import.meta.url));
  const clone = structuredClone, sha = value => createHash("sha256").update(value).digest("hex");
  const required = (label, condition) => assert.ok(condition, label), log = [];
  const timestamp = options.now ?? "2026-10-02T12:00:00.000Z";
  class FixtureDate extends Date {
    constructor(...args) { super(...(args.length ? args : [timestamp])); }
    static now() { return new Date(timestamp).getTime(); }
  }
  const acorn = req('acorn');
  const ast = acorn.parse(bundle, { ecmaVersion: 'latest', sourceType: 'module' });
  const units = [], definitions = new Map();
  function add(name, node, code) {
    const unit = { name, node, start: node.start, code };
    units.push(unit); definitions.set(name, [...(definitions.get(name) || []), unit]);
  }
  for (const top of ast.body) {
    const node = top.type === 'ExportNamedDeclaration' ? top.declaration : top;
    if (!node) continue;
    if (node.type === 'FunctionDeclaration' && node.id) add(node.id.name, node, bundle.slice(node.start, node.end));
    if (node.type === 'VariableDeclaration') for (const declaration of node.declarations) {
      if (declaration.id.type === 'Identifier') add(declaration.id.name, declaration, `${node.kind} ${bundle.slice(declaration.start, declaration.end)};`);
    }
    if (node.type === 'ExpressionStatement' && node.expression.type === 'AssignmentExpression' && node.expression.left.type === 'Identifier') {
      add(node.expression.left.name, node, bundle.slice(node.start, node.end));
    }
  }
  function walk(node, fn, parent, key) {
    if (!node || typeof node !== 'object') return;
    if (node.type) fn(node, parent, key);
    for (const [childKey, value] of Object.entries(node)) {
      if (childKey === 'start' || childKey === 'end') continue;
      if (Array.isArray(value)) for (const child of value) walk(child, fn, node, childKey);
      else if (value && typeof value === 'object') walk(value, fn, node, childKey);
    }
  }
  function bindings(pattern, set) {
    if (!pattern) return;
    if (pattern.type === 'Identifier') set.add(pattern.name);
    else if (pattern.type === 'RestElement') bindings(pattern.argument, set);
    else if (pattern.type === 'AssignmentPattern') bindings(pattern.left, set);
    else if (pattern.type === 'ObjectPattern') for (const p of pattern.properties) bindings(p.value || p.argument, set);
    else if (pattern.type === 'ArrayPattern') for (const p of pattern.elements) bindings(p, set);
  }
  function references(unit) {
    const locals = new Set(), identifiers = new Set();
    walk(unit.node, (node, parent, key) => {
      if (/Function/.test(node.type) || node.type === 'ArrowFunctionExpression') {
        for (const p of node.params || []) bindings(p, locals);
        if (node.id && node !== unit.node) bindings(node.id, locals);
      }
      if (node.type === 'VariableDeclarator' && node !== unit.node) bindings(node.id, locals);
      if (node.type === 'CatchClause') bindings(node.param, locals);
      if (node.type !== 'Identifier') return;
      if (parent && ((parent.type === 'MemberExpression' && key === 'property' && !parent.computed)
        || (parent.type === 'Property' && key === 'key' && !parent.computed && !parent.shorthand)
        || key === 'id' || key === 'label')) return;
      identifiers.add(node.name);
    });
    return [...identifiers].filter(name => !locals.has(name));
  }
  const boundary = new Set(['xr', 'bdCurrentAccountingCurrencyV243']);
  const selected = new Set();
  function include(name) {
    if (boundary.has(name)) return;
    for (const unit of definitions.get(name) || []) {
      if (selected.has(unit)) continue;
      selected.add(unit);
      for (const ref of references(unit)) include(ref);
    }
  }
  for (const name of ['bdBuildMonthlyReport', 'bdMonthClosingSnapshot', 'wn']) {
    required(`client function exists ${name}`, definitions.has(name), name);
    include(name);
  }
  const ordered = [...selected].sort((a, b) => a.start - b.start);
  const source = ordered.map(u => u.code).join('\n');
  const context = vm.createContext({ Date: FixtureDate, Intl, Math, JSON, Map, Set, structuredClone, localStorage: options.localStorage,
    xr: key => clone(getStore(key) ?? null), bdCurrentAccountingCurrencyV243: () => 'MDL',
    console: { warn: (...v) => log.push({ clientWarning: v.map(String) }) },
  });
  const script = new vm.Script(`${source}\nglobalThis.financialClient={report:bdBuildMonthlyReport,closeSnapshot:bdMonthClosingSnapshot,finance:wn};`, { filename: 'actual-final-client-financial-extract.js' });
  script.runInContext(context, { timeout: 15000 });
  const extraction = { source, bundleSha256: sha(bundle), extractedSha256: sha(source),
    units: ordered.map(u => ({ name: u.name, offset: u.start, sha256: sha(u.code) })),
    reportBindings: (definitions.get('bdBuildMonthlyReport') || []).length,
    reportRuntimeSha256: sha(String(context.financialClient.report)),
    boundaries: [...boundary], scope: 'Actual final report including all detected top-level reassignment wrappers' };
  return { ...context.financialClient, extraction };
}
