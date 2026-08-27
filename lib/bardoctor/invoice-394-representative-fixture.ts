import {
  normalizeInvoiceText,
  type NomenclatureCandidate,
  type ParsedInvoiceDocument,
} from "./invoice-recognition-v2";

export const INVOICE_394_VENUE_ID = 91_394;
export const INVOICE_394_SUPPLIER_ID = "qa-market-394";

const rows = [
  ["line-394-01", "Капуста пекинская", "target-cabbage", "кг"],
  ["line-394-02", "Сыр Российский", "target-cheese", "кг"],
  ["line-394-03", "Майонез", "target-mayo-provencal", "шт."],
  ["line-394-04", "Кетчуп", "target-ketchup-tomato", "шт."],
  ["line-394-05", "Специи в ассортименте", "target-spices", "шт."],
  ["line-394-06", "Апельсины", "target-oranges", "кг"],
  ["line-394-07", "Лимоны", "target-lemons", "кг"],
  ["line-394-08", "Лаваш", "target-lavash-thin", "шт."],
  ["line-394-09", "Шампиньоны", "target-mushrooms", "кг"],
  ["line-394-10", "Яблоки", "target-apples", "кг"],
  ["line-394-11", "Помидоры", "target-tomatoes", "кг"],
  ["line-394-12", "Огурцы", "target-cucumbers", "кг"],
  ["line-394-13", "Зелень пучок", "target-greens", "шт."],
  ["line-394-14", "Лист салата", "target-lettuce", "шт."],
  ["line-394-15", "Филе куриное", "target-chicken", "кг"],
] as const;

export const invoice394GroundTruth: Map<string, string> = new Map(rows.map(([lineId, , targetId]) => [lineId, targetId]));

function candidate(
  id: string,
  name: string,
  unit: string,
  packageSize = "",
  aliases: string[] = [],
): NomenclatureCandidate {
  return { id, key: `stock:${id}|${unit}`, name, unit, packageSize, aliases };
}

export function representativeNomenclature(): NomenclatureCandidate[] {
  const targets = [
    candidate("target-cabbage", "Капуста пекинская", "g"),
    candidate("target-cheese", "Сыр Российский", "g"),
    candidate("target-mayo-provencal", "Майонез Провансаль 67%", "pcs", "500 г"),
    candidate("target-ketchup-tomato", "Кетчуп томатный", "pcs", "500 г"),
    candidate("target-spices", "Специи в ассортименте", "pcs"),
    candidate("target-oranges", "Апельсины", "g"),
    candidate("target-lemons", "Лимоны", "g"),
    candidate("target-lavash-thin", "Лаваш тонкий", "pcs", "5 шт."),
    candidate("target-mushrooms", "Шампиньоны", "g"),
    candidate("target-apples", "Яблоки", "g"),
    candidate("target-tomatoes", "Помидоры", "g"),
    candidate("target-cucumbers", "Огурцы", "g"),
    candidate("target-greens", "Зелень пучок", "pcs", "1 шт.", ["Зелень ассорти пучок"]),
    candidate("target-lettuce", "Лист салата", "pcs", "1 шт.", ["Салат листовой"]),
    candidate("target-chicken", "Филе куриное", "g"),
    candidate("target-pepper", "Перец сладкий болгарский", "g", "", ["Перец болгарский"]),
  ];
  const hardNegatives = [
    candidate("decoy-cabbage-white", "Капуста белокочанная", "g"),
    candidate("decoy-cheese-rossiyskiy-200", "Сыр Российский", "pcs", "200 г"),
    candidate("decoy-cheese-gollandskiy", "Сыр Голландский", "g"),
    candidate("decoy-mayo-olive", "Майонез Оливковый 67%", "pcs", "500 г"),
    candidate("decoy-mayo-provencal-800", "Майонез Провансаль 67%", "pcs", "800 г"),
    candidate("decoy-ketchup-bbq", "Кетчуп шашлычный", "pcs", "500 г"),
    candidate("decoy-ketchup-tomato-1kg", "Кетчуп томатный", "pcs", "1 кг"),
    candidate("decoy-lavash-one", "Лаваш тонкий", "pcs", "1 шт."),
    candidate("decoy-mushrooms-oyster", "Грибы вешенки", "g"),
    candidate("decoy-tomatoes-cherry", "Помидоры черри", "g"),
    candidate("decoy-cucumbers-pickled", "Огурцы маринованные", "pcs", "720 г"),
    candidate("decoy-chicken-thigh", "Филе бедра куриное", "g"),
    candidate("decoy-cola-500", "Coca-Cola", "pcs", "0,5 л", ["Кока Кола ПЭТ 0.5"]),
    candidate("decoy-cola-1000", "Coca-Cola", "pcs", "1 л", ["Кока Кола ПЭТ 1.0"]),
    candidate("decoy-cola-1250", "Coca-Cola", "pcs", "1,25 л", ["Кока Кола ПЭТ 1.25"]),
    candidate("decoy-water-500", "Вода минеральная", "pcs", "0,5 л"),
    candidate("decoy-water-1500", "Вода минеральная", "pcs", "1,5 л"),
    candidate("decoy-pack-six", "Вода газированная коробка", "pcs", "6 шт."),
    candidate("decoy-pack-one", "Вода газированная бутылка", "pcs", "1 шт."),
    candidate("decoy-latin", "Shampinyony fresh", "g", "", ["Шампиньоны фреш"]),
  ];
  const background = Array.from({ length: 220 }, (_, index) => candidate(
    `background-${String(index + 1).padStart(3, "0")}`,
    `Фоновая номенклатура ${String(index + 1).padStart(3, "0")}`,
    index % 3 === 0 ? "pcs" : index % 3 === 1 ? "g" : "ml",
    index % 3 === 0 ? "1 шт." : index % 3 === 1 ? "1 кг" : "1 л",
  ));
  return [...targets, ...hardNegatives, ...background];
}

export function invoice394Document(): ParsedInvoiceDocument {
  return {
    documentType: "invoice",
    supplierId: INVOICE_394_SUPPLIER_ID,
    supplierName: "Рынок",
    supplierType: "wholesale",
    documentNumber: "394",
    date: "2026-08-26",
    currency: "RUB",
    paymentMethod: "unknown",
    total: 587.1,
    confidence: 0.96,
    warnings: [],
    items: rows.map(([id, rawName, , unit], index) => ({
      id,
      rawName,
      normalizedRawName: normalizeInvoiceText(rawName),
      name: rawName,
      quantity: index === 0 ? 1.09 : index === 1 ? 0.206 : 1,
      unit,
      unitPrice: index === 0 ? 44.95 : index === 1 ? 160 : 10 + index,
      lineTotal: index === 0 ? 49 : index === 1 ? 32.96 : 10 + index,
      confidence: 0.96,
      confidenceLevel: "high",
      requiresReview: false,
    })),
  };
}

export function changedInvoice394Document(): ParsedInvoiceDocument {
  const source = invoice394Document();
  return {
    ...source,
    documentNumber: "394-change",
    items: [
      ...source.items.slice(0, 12),
      {
        ...source.items[12], id: "line-change-greens", rawName: "Зелень ассорти пуч.",
        normalizedRawName: normalizeInvoiceText("Зелень ассорти пуч."), name: "Зелень ассорти пуч.",
      },
      {
        ...source.items[13], id: "line-change-lettuce", rawName: "Салат лист.",
        normalizedRawName: normalizeInvoiceText("Салат лист."), name: "Салат лист.",
      },
      {
        ...source.items[14], id: "line-new-pepper", rawName: "Перец болг.",
        normalizedRawName: normalizeInvoiceText("Перец болг."), name: "Перец болг.",
      },
    ],
  };
}
