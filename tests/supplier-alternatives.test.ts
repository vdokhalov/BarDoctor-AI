import assert from "node:assert/strict";
import test from "node:test";
import {
  isPackagedProcurementItem,
  isSameSupplierMenuProduct,
  isSupplierProcurementSource,
  supplierTargetSignature,
} from "../lib/bardoctor/supplier-alternative-rules";
import {
  canonicalSupplierOfferUrl,
  deduplicateSupplierOffers,
  groupSupplierOffers,
  sortSupplierOffers,
  supplierPackageIdentity,
} from "../lib/bardoctor/supplier-alternative-view";

test("supplier search targets packaged drinks from the active menu", () => {
  for (const item of [
    "Coca-Cola 1,25 л · газировка",
    "Sprite 0.5L",
    "Сок Rich апельсин 1 л",
    "Пиво Kozel светлое 0,5 л",
    "Martini Bianco 1 л · вермут",
  ]) {
    assert.equal(isPackagedProcurementItem(item), true, item);
  }
  assert.equal(isPackagedProcurementItem("Шашлык из свинины"), false);
});

test("supplier result must match the exact menu brand and product line", () => {
  assert.equal(isSameSupplierMenuProduct("Coca-Cola 1,25 л", "Coca-Cola Classic 1.25L"), true);
  assert.equal(isSameSupplierMenuProduct("Кока-Кола 1,25 л", "Coca-Cola Classic 1.25L"), true);
  assert.equal(isSameSupplierMenuProduct("Coca-Cola Zero 1,25 л", "Coca-Cola Zero 1.25L"), true);
  assert.equal(isSameSupplierMenuProduct("Coca-Cola 1,25 л", "Coca-Cola Zero 1.25L"), false);
  assert.equal(isSameSupplierMenuProduct("Martini Bianco 1 л", "Martini Fiero 1L"), false);
  assert.equal(isSameSupplierMenuProduct("Finlandia Vodka 0,7 л", "Absolut Vodka 0.7L"), false);
});

test("nightclub, restaurant, menu, and booking pages are rejected as procurement sources", () => {
  const accepted = [{ title: "Оптовый каталог напитков", url: "https://supplier.example/coca-cola" }];
  assert.equal(isSupplierProcurementSource([accepted[0].url], accepted), true);

  for (const source of [
    { title: "Меню ночного клуба", url: "https://club.example/drinks" },
    { title: "Restaurant drink menu", url: "https://restaurant.example/menu" },
    { title: "Забронировать стол", url: "https://booking.example/reservation" },
  ]) {
    assert.equal(isSupplierProcurementSource([source.url], [source]), false, source.title);
  }
});

test("menu target signature is stable but changes when assortment changes", () => {
  assert.equal(
    supplierTargetSignature(["Sprite 0.5L", "Coca-Cola 1.25L"]),
    supplierTargetSignature(["Coca-Cola 1.25L", "Sprite 0.5L"]),
  );
  assert.notEqual(
    supplierTargetSignature(["Coca-Cola 1.25L"]),
    supplierTargetSignature(["Coca-Cola Zero 1.25L"]),
  );
});

const olmecaOffers = [
  {
    id: "offer-alcohall",
    matchedTo: "OLMECA SILVER",
    product: "Tequila OLMECA Silver 35% 0.7L",
    supplierName: "AlcoHall",
    candidatePrice: 356,
    currency: "MDL",
    packageSize: "0.7 L",
    unit: "за упаковку",
    sourceUrls: ["https://alco.example/olmeca?utm_source=search"],
    decision: "confirmed",
    verifiedAt: "2026-08-25",
  },
  {
    id: "offer-winetime",
    matchedTo: "OLMECA SILVER",
    product: "Olmeca Silver Tequila 700 ml",
    supplierName: "WineTime",
    candidatePrice: 369,
    currency: "MDL",
    packageSize: "700 ml",
    unit: "за упаковку",
    sourceUrls: ["https://wine.example/olmeca"],
    decision: "checking",
    verifiedAt: "2026-08-25",
  },
] satisfies Array<Record<string, unknown>>;

test("supplier offers are grouped by canonical internal position without renaming either side", () => {
  const [group] = groupSupplierOffers(olmecaOffers);
  assert.equal(group.internalPosition, "OLMECA SILVER");
  assert.equal(group.offerCount, 2);
  assert.equal(group.offers[0].product, "Tequila OLMECA Silver 35% 0.7L");
  assert.equal(group.bestOfferId, "offer-alcohall");
  assert.equal(group.bestCurrency, "MDL");
  assert.equal(group.mixedPackages, false);
});

test("package normalization compares 0.7 L with 700 ml but not 1 L", () => {
  assert.equal(supplierPackageIdentity(olmecaOffers[0]).key, "700ml");
  assert.equal(supplierPackageIdentity(olmecaOffers[1]).key, "700ml");
  const mixed = groupSupplierOffers([...olmecaOffers, {
    ...olmecaOffers[0],
    id: "offer-one-litre",
    supplierName: "Metro",
    candidatePrice: 330,
    packageSize: "1 L",
    sourceUrls: ["https://metro.example/olmeca"],
  }])[0];
  assert.equal(mixed.mixedPackages, true);
  assert.equal(mixed.bestOfferId, "offer-alcohall", "cheaper 1 L amount must not become the 0.7 L best offer");
});

test("original supplier currency is preserved and different currencies are not price-ranked together", () => {
  const eur = { ...olmecaOffers[0], id: "eur", supplierName: "EU Supplier", candidatePrice: 20, currency: "EUR", sourceUrls: ["https://eu.example/olmeca"] };
  const sorted = sortSupplierOffers([olmecaOffers[0], eur], "MDL|700ml");
  assert.equal(sorted[0].currency, "MDL");
  assert.equal(eur.currency, "EUR");
});

test("canonical source URL deduplicates localization and tracking variants without changing the retained id", () => {
  const duplicate = {
    ...olmecaOffers[0],
    id: "legacy-stable-id",
    sourceUrls: ["https://alco.example/olmeca?lang=ro&utm_campaign=bar"],
    decision: "checking",
  };
  assert.equal(canonicalSupplierOfferUrl(duplicate.sourceUrls[0]), "https://alco.example/olmeca");
  const result = deduplicateSupplierOffers([olmecaOffers[0], duplicate]);
  assert.equal(result.length, 1);
  assert.equal(result[0].id, "offer-alcohall", "higher-priority persisted decision keeps its existing offer id");
});

test("a persisted review decision keeps its stable id while refreshed supplier facts win", () => {
  const refreshed = { ...olmecaOffers[0], id: "canonical-new-id", candidatePrice: 351, decision: "new" };
  const storedReview = { ...olmecaOffers[0], id: "legacy-reviewed-id", candidatePrice: 356, decision: "checking" };
  const [result] = deduplicateSupplierOffers([refreshed, storedReview]);
  assert.equal(result.id, "legacy-reviewed-id");
  assert.equal(result.decision, "checking");
  assert.equal(result.candidatePrice, 351);
});

test("review decisions stay attached to supplier offers, not internal positions", () => {
  const grouped = groupSupplierOffers(olmecaOffers)[0];
  assert.equal(grouped.offers.find(offer => offer.id === "offer-alcohall")?.decision, "confirmed");
  assert.equal(grouped.offers.find(offer => offer.id === "offer-winetime")?.decision, "checking");
  assert.equal(grouped.internalPosition, "OLMECA SILVER");
});
