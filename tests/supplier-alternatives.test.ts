import assert from "node:assert/strict";
import test from "node:test";
import {
  isPackagedProcurementItem,
  isSameSupplierMenuProduct,
  isSupplierProcurementSource,
  supplierTargetSignature,
} from "../lib/bardoctor/supplier-alternative-rules";

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
