import fs from "node:fs";
import { parse } from "acorn";

const bundlePath = new URL("../public/assets/index-BQGspy0I.js", import.meta.url);
const source = fs.readFileSync(bundlePath, "utf8");
const ast = parse(source, {
  ecmaVersion: "latest",
  sourceType: "module",
  locations: true,
});

const designSystemStart = source.indexOf("function rEe()");
const designSystemEnd = source.indexOf("function as(", designSystemStart);
if (designSystemStart < 0 || designSystemEnd <= designSystemStart) {
  throw new Error("Could not locate the internal design-system boundary");
}

function propertyName(property) {
  if (property.type !== "Property") return null;
  if (!property.computed && property.key.type === "Identifier") return property.key.name;
  if (property.key.type === "Literal") return String(property.key.value);
  return null;
}

function staticText(node) {
  if (!node) return [];
  if (node.type === "Literal" && typeof node.value === "string") return [node.value];
  if (node.type === "TemplateLiteral") return node.quasis.map((part) => part.value.cooked ?? "");
  if (node.type === "ArrayExpression") return node.elements.flatMap(staticText);
  if (node.type === "ObjectExpression") {
    return node.properties.flatMap((property) => {
      if (property.type !== "Property") return [];
      return propertyName(property) === "children" ? staticText(property.value) : [];
    });
  }
  if (node.type === "CallExpression") return node.arguments.flatMap(staticText);
  return [];
}

function slice(node) {
  if (!node || typeof node.start !== "number" || typeof node.end !== "number") return null;
  return source.slice(node.start, node.end);
}

const buttons = [];
const stack = [ast];
while (stack.length) {
  const node = stack.pop();
  if (!node || typeof node !== "object") continue;

  const jsxTarget = node.type === "CallExpression" ? node.arguments[0] : null;
  const buttonKind =
    jsxTarget?.type === "Literal" && jsxTarget.value === "button"
      ? "native"
      : jsxTarget?.type === "Identifier" && jsxTarget.name === "ke"
        ? "Button"
        : jsxTarget?.type === "Identifier" && jsxTarget.name === "$l"
          ? "ActionRow"
          : jsxTarget?.type === "Identifier" && jsxTarget.name === "Ln"
            ? "Card"
        : null;
  if (
    buttonKind &&
    node.callee?.type === "MemberExpression" &&
    !node.callee.computed &&
    ["jsx", "jsxs"].includes(node.callee.property?.name)
  ) {
    const propsNode = node.arguments[1];
    const props = new Map();
    if (propsNode?.type === "ObjectExpression") {
      for (const property of propsNode.properties) {
        const name = propertyName(property);
        if (name) props.set(name, property.value);
      }
    }
    const label = [
      ...staticText(props.get("children")),
      ...staticText(props.get("aria-label")),
      ...staticText(props.get("title")),
    ]
      .map((value) => value.trim())
      .filter(Boolean)
      .join(" | ") || "(dynamic label)";
    const type = slice(props.get("type"));
    const handlerNames = ["onClick", "onPointerDown", "onPointerUp", "onKeyDown"];
    const handlers = handlerNames
      .map((name) => [name, slice(props.get(name))])
      .filter(([, value]) => value);
    const handler = handlers.map(([name, value]) => `${name}:${value}`).join(", ") || null;
    const disabled = slice(props.get("disabled"));
    const showChevron = slice(props.get("showChevron"));
    const hoverable = slice(props.get("hoverable"));
    const misleadingAffordance =
      (buttonKind === "ActionRow" && showChevron && showChevron !== "!1" && !handler) ||
      (buttonKind === "Card" && hoverable && hoverable !== "!1" && !handler);
    const context = source.slice(
      Math.max(0, node.start - 320),
      Math.min(source.length, node.end + 320),
    );
    buttons.push({
      start: node.start,
      line: node.loc.start.line,
      column: node.loc.start.column,
      kind: buttonKind,
      label,
      type,
      handler,
      disabled,
      showChevron,
      hoverable,
      missingHandler:
        ["native", "Button"].includes(buttonKind) && !handler && type !== '"submit"',
      misleadingAffordance,
      delegatedTrigger: !handler && context.includes('trigger:i.jsxs("button"'),
      internalOnly: node.start >= designSystemStart && node.start < designSystemEnd,
      context,
    });
  }

  for (const value of Object.values(node)) {
    if (Array.isArray(value)) {
      for (let index = value.length - 1; index >= 0; index -= 1) stack.push(value[index]);
    } else if (value && typeof value === "object" && typeof value.type === "string") {
      stack.push(value);
    }
  }
}

const excluded = buttons.filter(
  (button) => button.internalOnly || button.delegatedTrigger,
);
const productionButtons = buttons.filter(
  (button) => !button.internalOnly && !button.delegatedTrigger,
);
const missing = productionButtons.filter((button) => button.missingHandler);
const misleadingAffordances = productionButtons.filter(
  (button) => button.misleadingAffordance,
);
const inertHandlers = buttons.filter((button) => {
  if (button.internalOnly) return false;
  if (!button.handler) return false;
  const compact = button.handler.replace(/\s+/g, "");
  return /=>\{\}$/.test(compact) || /=>void0$/.test(compact);
});

const report = {
  totalInteractiveConstructs: buttons.length,
  productionInteractiveConstructs: productionButtons.length,
  excludedDelegatedTriggers: excluded.filter((button) => button.delegatedTrigger).length,
  excludedInternalDesignSystemControls: excluded.filter((button) => button.internalOnly).length,
  missingCount: missing.length,
  misleadingAffordanceCount: misleadingAffordances.length,
  inertHandlerCount: inertHandlers.length,
  missing,
  misleadingAffordances,
  inertHandlers,
};

if (process.argv.includes("--all")) report.buttons = buttons;
console.log(JSON.stringify(report, null, 2));

if (missing.length || misleadingAffordances.length || inertHandlers.length) {
  process.exitCode = 1;
}
