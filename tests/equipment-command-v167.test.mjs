import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const bundleUrl = new URL("../public/assets/index-BQGspy0I.js", import.meta.url);

function sliceBetween(source, startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start);
  assert.notEqual(start, -1, `Missing start marker: ${startMarker}`);
  assert.notEqual(end, -1, `Missing end marker: ${endMarker}`);
  return source.slice(start, end);
}

test("Equipment v167 replaces the catalog-first page with one command module", async () => {
  const bundle = await readFile(bundleUrl, "utf8");
  const equipment = sliceBetween(
    bundle,
    "/* bd-equipment-command-v167:start */",
    "/* bd-equipment-command-v167:end */",
  );

  assert.match(bundle, /function bdEquipmentLegacyPageV166\(\)/);
  assert.match(bundle, /function bdEquipmentLegacyDetailV166\(\)/);
  assert.equal((bundle.match(/function kue\(\)/g) || []).length, 1);
  assert.equal((bundle.match(/function JAe\(\)/g) || []).length, 1);
  assert.match(equipment, /data-bd-equipment-command/);
  assert.match(equipment, /Обзор/);
  assert.match(equipment, /Оборудование/);
  assert.match(equipment, /Обслуживание/);
  assert.match(equipment, /Техническое состояние/);
  assert.match(equipment, /Требует внимания/);
  assert.match(equipment, /Ближайшее обслуживание/);
  assert.match(equipment, /Фактические расходы/);
  assert.match(equipment, /Надёжность/);
  assert.doesNotMatch(equipment, /grid-cols-2|огромн/i);
});

test("Equipment v167 keeps unknown data neutral and derives real filters and costs", async () => {
  const bundle = await readFile(bundleUrl, "utf8");
  const equipment = sliceBetween(bundle, "/* bd-equipment-command-v167:start */", "/* bd-equipment-command-v167:end */");

  assert.match(equipment, /unknown:\{label:"Нет оценки",tone:"neutral"\}/);
  assert.match(equipment, /ТО не настроено/);
  assert.match(equipment, /interval_days/);
  assert.match(equipment, /interval_months/);
  assert.match(equipment, /not_required/);
  assert.match(equipment, /as_needed/);
  assert.match(equipment, /overdue/);
  assert.match(equipment, /today/);
  assert.match(equipment, /planned/);
  assert.match(equipment, /bd_finance_expenses/);
  assert.match(equipment, /equipmentWorkOrderId/);
  assert.match(equipment, /за 12 месяцев/);
  assert.doesNotMatch(equipment, /3 400|4 850|1 200|18 дней|27 единиц/);
});

test("Equipment v167 exposes a verified workflow and progressive technical passport", async () => {
  const bundle = await readFile(bundleUrl, "utf8");
  const equipment = sliceBetween(bundle, "/* bd-equipment-command-v167:start */", "/* bd-equipment-command-v167:end */");

  for (const stage of ["detected", "assigned", "in_progress", "fixed", "verified"]) {
    assert.match(equipment, new RegExp(stage));
  }
  assert.match(equipment, /проблема не считается закрытой до проверки результата/);
  assert.match(equipment, /Подтвердите результат после проверки|Проверка результата/);
  assert.match(equipment, /Ответственный/);
  assert.match(equipment, /Исполнитель \/ сервис/);
  assert.match(equipment, /Добавить фото \/ документ/);
  assert.match(equipment, /Создать карточку отдельной единицы/);
  assert.match(equipment, /История отдельной карточки не смешивается с историей группы/);
  assert.match(equipment, /equipment\.manage/);
  assert.match(equipment, /expenses\.create/);
});

test("Equipment work-order API is venue-scoped, sequential, idempotent and month-lock aware", async () => {
  const [route, domain, trust, constants] = await Promise.all([
    readFile(new URL("../app/api/equipment/work-orders/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../lib/bardoctor/equipment.ts", import.meta.url), "utf8"),
    readFile(new URL("../lib/bardoctor/data-trust.ts", import.meta.url), "utf8"),
    readFile(new URL("../lib/bardoctor/constants.ts", import.meta.url), "utf8"),
  ]);

  assert.match(route, /authenticateRequest/);
  assert.match(route, /hasPermission\(account, "equipment\.manage"\)/);
  assert.match(route, /Оборудование не найдено в текущем заведении/);
  assert.match(route, /Ответственный не найден в текущем заведении/);
  assert.match(route, /canAdvanceEquipmentWorkflow/);
  assert.match(route, /Подтвердите результат после проверки оборудования/);
  assert.match(route, /equipmentWorkOrderId/);
  assert.match(route, /MONTH_LOCKED/);
  assert.match(route, /Стоимость работы нельзя изменить через Equipment/);
  assert.match(route, /database\.batch/);
  assert.match(domain, /equipment-work-order:/);
  assert.match(domain, /finance/);
  assert.match(domain, /seenTuples/);
  assert.match(trust, /bd_equipment_work_orders/);
  assert.match(constants, /bd_equipment_work_orders/);
});

test("Equipment v167 is linked in both app documents and fixes mobile title overflow", async () => {
  const [css, appHtml, response, fixture, bootstrap] = await Promise.all([
    readFile(new URL("../public/equipment-command-v167.css", import.meta.url), "utf8"),
    readFile(new URL("../public/app.html", import.meta.url), "utf8"),
    readFile(new URL("../app/bar-doctor-response.ts", import.meta.url), "utf8"),
    readFile(new URL("../public/equipment-qa-v167.js", import.meta.url), "utf8"),
    readFile(new URL("../public/bardoctor-preview.js", import.meta.url), "utf8"),
  ]);

  for (const source of [appHtml, response]) {
    assert.match(source, /equipment-command-v167\.css\?v=20260812-equipment-v167/);
    assert.match(source, /equipment-qa-v167\.js\?v=20260812-equipment-v167/);
    assert.match(source, /bardoctor-preview\.js\?v=20260821-inventory-cache-reconciliation-v235/);
  }
  assert.match(css, /position: sticky/);
  assert.match(css, /white-space: nowrap/);
  assert.match(css, /word-break: normal/);
  assert.match(css, /writing-mode: horizontal-tb/);
  assert.match(css, /overflow-x: clip/);
  assert.match(css, /safe-area-inset-bottom/);
  assert.match(css, /@media \(min-width: 720px\)/);
  assert.match(css, /@media \(min-width: 1024px\)/);
  assert.match(fixture, /qaEquipment/);
  assert.match(fixture, /state === "venue-b"/);
  assert.match(fixture, /state === "long"/);
  assert.match(fixture, /state === "unconfigured"/);
  assert.match(bootstrap, /window\.bdNavigationContract\.parent/);
  assert.match(bootstrap, /window\.bdNavigationContract\.resolve/);
});

test("existing Home and Health signals consume Equipment state without a second alert system", async () => {
  const bundle = await readFile(bundleUrl, "utf8");

  assert.match(bundle, /function Qle\(/);
  assert.match(bundle, /function Ece\(/);
  assert.match(bundle, /Оборудование требует внимания/);
  assert.match(bundle, /Нет оценки состояния:/);
  assert.match(bundle, /y===0&&l\.every\(v=>v\.status==="working"\)/);
  assert.doesNotMatch(bundle, /equipmentHealthScoreV167|bd_equipment_alerts/);
});
