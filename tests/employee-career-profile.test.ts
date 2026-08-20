import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

test("employee photos are private, venue scoped and permission protected", async () => {
  const [upload, photo] = await Promise.all([
    readFile("app/api/employees/photos/route.ts", "utf8"),
    readFile("app/api/employees/photos/[id]/route.ts", "utf8"),
  ]);
  assert.match(upload, /hasPermission\(account, "team\.manage"\)/);
  assert.match(upload, /employees\/\$\{account\.id\}\/\$\{id\}/);
  assert.match(upload, /MAX_PHOTO_BYTES = 700 \* 1024/);
  assert.match(photo, /hasPermission\(account, "team\.view"\)/);
  assert.match(photo, /eq\(domainData\.storeKey, "bd_employees"\)/);
  assert.match(photo, /Фото используется в карточке сотрудника/);
  assert.match(photo, /Cache-Control", "private/);
});

test("employee profile records contacts, dates, photo and career history", async () => {
  const [bundle, css, listCss, html, response] = await Promise.all([
    readFile("public/assets/index-BQGspy0I.js", "utf8"),
    readFile("public/employee-detail.css", "utf8"),
    readFile("public/employee-list.css", "utf8"),
    readFile("public/app.html", "utf8"),
    readFile("app/bar-doctor-response.ts", "utf8"),
  ]);
  assert.match(bundle, /const bdEmployeeCareerVersion="career-v204"/);
  assert.match(bundle, /birthDate:A,hireDate:O/);
  assert.match(bundle, /careerHistory:bdEmployeeCareerNextV204/);
  assert.match(bundle, /children:"Карьерное изменение"/);
  assert.match(bundle, /children:"История роста"/);
  assert.match(bundle, /fetch\("\/api\/employees\/photos"/);
  assert.match(bundle, /bdProcPrepareImage\(Z,\{targetBytes:524288,force:!0\}\)/);
  assert.match(bundle, /label:"Дата рождения"/);
  assert.match(bundle, /label:"Стаж"/);
  assert.match(bundle, /bdEmployeeAvatarV204/);
  assert.match(bundle, /"Добавить фото и анкетные данные"/);
  assert.match(bundle, /"Редактировать профиль"/);
  assert.match(bundle, /"Фото и данные сотрудника"/);
  assert.match(bundle, /function bdEmployeeEditPageV206/);
  assert.match(bundle, /path:"\/employees\/:id\/edit"/);
  assert.match(bundle, /data-bd-employee-edit":"page-v206"/);
  assert.match(bundle, /"Сохранить профиль"/);
  assert.match(css, /\.bd-employee-career-list/);
  assert.match(css, /\.bd-employee-photo-editor/);
  assert.match(css, /\.bd-employee-form-grid/);
  assert.match(listCss, /\.bd-team-avatar > img/);
  for (const document of [html, response]) {
    assert.match(document, /employee-detail\.css\?v=20260817-employee-edit-page-v206/);
    assert.match(document, /employee-list\.css\?v=20260817-employee-edit-page-v206/);
  }
});

test("a promotion preserves the previous role and opens a dated new stage", async () => {
  const bundle = await readFile("public/assets/index-BQGspy0I.js", "utf8");
  const start = bundle.indexOf("function bdEmployeeRoleV204(");
  const end = bundle.indexOf("function bdEmployeeAvatarV204(", start);
  assert.ok(start >= 0 && end > start);
  let sequence = 0;
  const context = {
    bo: { waiter: "Официант", manager: "Менеджер" },
    jo: (employee: { position?: string }) => employee.position === "waiter" ? "Официант" : "Менеджер",
    oCe: () => `career-${++sequence}`,
  };
  vm.runInNewContext(`${bundle.slice(start, end)}\nglobalThis.build=bdEmployeeCareerNextV204;`, context);
  const stages = (context as unknown as {
    build: (
      previous: Record<string, unknown>,
      next: Record<string, unknown>,
      effectiveDate: string,
      note: string,
    ) => Array<Record<string, string>>;
  }).build(
    { id: "employee-1", position: "waiter", department: "Зал", hireDate: "2024-02-10" },
    { position: "manager", department: "Управление", hireDate: "2024-02-10" },
    "2026-08-17",
    "Повышение по итогам аттестации",
  );
  assert.equal(stages.length, 2);
  assert.equal(stages[0].position, "Официант");
  assert.equal(stages[0].endDate, "2026-08-17");
  assert.equal(stages[1].position, "Менеджер");
  assert.equal(stages[1].startDate, "2026-08-17");
  assert.equal(stages[1].note, "Повышение по итогам аттестации");
});
