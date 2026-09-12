// Upgrade the editor only. Server cost snapshots and stock units are unchanged.
const oldAdapter = 'I=bdCatToBase(p.quantity,p.unit),R=Number(c?.unitPrice),W=c?.complete===!0&&Number.isFinite(R)&&I.unit!=="unknown"&&(!c?.unit||c.unit===I.unit),J=W?Math.round(I.amount*R*100)/100:null;return[String(p.id),{...c,id:p.id,complete:W,amount:I.amount,unit:I.unit,unitPrice:Number.isFinite(R)?R:null,cost:J,currency:c?.currency||"",costStatus:c?.costStatus||(W&&R===0?"KNOWN_ZERO":"UNKNOWN")}]';

// Both quantities use g/ml/pcs only for dimension comparison. Divide by the
// price-unit factor before multiplying: 1000g / (1000g/kg) *10MDL/kg =10MDL.
const newAdapter = 'I=bdCatToBase(p.quantity,p.unit),bdRecipePriceBasisPhase7=bdTechCostUnitV376(c?.unit),R=typeof c?.unitPrice==="number"||typeof c?.unitPrice==="string"&&c.unitPrice.trim()!==""?Number(c.unitPrice):NaN,bdRecipePriceQuantityPhase7=I.amount/bdRecipePriceBasisPhase7.factor,W=c?.complete===!0&&Number.isFinite(R)&&R>=0&&Number.isFinite(bdRecipePriceQuantityPhase7)&&bdRecipePriceBasisPhase7.factor>0&&I.unit!=="unknown"&&I.unit===bdRecipePriceBasisPhase7.unit,J=W?Math.round(bdRecipePriceQuantityPhase7*R*100)/100:null;return[String(p.id),{...c,id:p.id,complete:W,amount:bdRecipePriceQuantityPhase7,unit:c?.unit||I.unit,unitPrice:Number.isFinite(R)?R:null,cost:J,currency:c?.currency||"",costStatus:c?.costStatus||(W&&R===0?"KNOWN_ZERO":"UNKNOWN")}]';

function replaceSupported(source, before, after, label) {
  const oldCount = source.split(before).length - 1;
  const newCount = source.split(after).length - 1;
  if (oldCount === 1 && newCount === 0) return source.replace(before, after);
  if (oldCount === 0 && newCount === 1) return source;
  throw new Error(`recipe authoritative units: unexpected ${label} anchors (${oldCount}/${newCount})`);
}

export function patchRecipeAuthoritativeUnits(source) {
  const startMarker = "function bdCatRecipeEditor";
  const endMarker = "function bdCatImportReview";
  if (source.split(startMarker).length !== 2 || source.split(endMarker).length !== 2) {
    throw new Error("recipe authoritative units: unique editor boundaries required");
  }
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start);
  if (end <= start) throw new Error("recipe authoritative units: invalid editor boundaries");
  let editor = replaceSupported(source.slice(start, end), oldAdapter, newAdapter, "cost adapter");
  editor = replaceSupported(editor, "bdCatUnitLabel(bdLineCostV418.unit)", "bdAssortmentUnitLabelV293(bdLineCostV418.unit)", "price unit label");
  return source.slice(0, start) + editor + source.slice(end);
}
