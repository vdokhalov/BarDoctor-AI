import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

test("iPhone menu photos use the payload-safe preparation path", async () => {
  const bundle = await readFile(
    new URL("../public/assets/index-BQGspy0I.js", import.meta.url),
    "utf8",
  );
  const start = bundle.indexOf('const bdImageUploadVersion="payload-safe-v37"');
  const end = bundle.indexOf("function bdSuppliersPage", start);
  assert.ok(start >= 0 && end > start);
  const input = {
    name: "IMG_2048.JPG",
    type: "image/jpg",
    size: 200 * 1024,
  };
  const context = { input };
  vm.runInNewContext(
    `${bundle.slice(start, end)}
globalThis.result = bdProcPrepareImage(input);
globalThis.safeName = bdUploadFileName({ name: "menu/page\\n1.jpg" });`,
    context,
  );
  assert.equal(await context.result, input);
  assert.equal(context.safeName, "menu_page_1.jpg");
  assert.match(bundle.slice(start, end), /bdUploadPayloadBudgetBytes=7864320/);
  assert.match(bundle.slice(start, end), /async function bdProcPrepareImages/);
  assert.match(bundle.slice(start, end), /e\.status===413/);
});

test("large multi-page image sets can still be compressed for document uploads", async () => {
  const bundle = await readFile(
    new URL("../public/assets/index-BQGspy0I.js", import.meta.url),
    "utf8",
  );
  const start = bundle.indexOf('const bdImageUploadVersion="payload-safe-v37"');
  const end = bundle.indexOf("function bdSuppliersPage", start);
  const files = Array.from({ length: 4 }, (_, index) => ({
    name: `IMG_${2048 + index}.JPG`,
    type: "image/jpeg",
    size: 6.2 * 1024 * 1024,
  }));

  class MockFileReader {
    readAsDataURL() {
      this.result = "data:image/jpeg;base64,dGVzdA==";
      this.onload();
    }
  }

  class MockImage {
    naturalWidth = 4032;
    naturalHeight = 3024;

    set src(_value) {
      this.onload();
    }
  }

  class MockFile {
    constructor(parts, name, options) {
      this.name = name;
      this.type = options.type;
      this.lastModified = options.lastModified;
      this.size = parts.reduce((sum, part) => sum + Number(part.size || 0), 0);
    }
  }

  const context = {
    files,
    FileReader: MockFileReader,
    Image: MockImage,
    File: MockFile,
    document: {
      createElement(tag) {
        assert.equal(tag, "canvas");
        return {
          width: 0,
          height: 0,
          getContext() {
            return {
              fillStyle: "",
              fillRect() {},
              drawImage() {},
            };
          },
          toBlob(callback, _type, quality) {
            callback({
              size: Math.round(this.width * this.height * quality * 0.22),
              type: "image/jpeg",
            });
          },
        };
      },
    },
  };

  vm.runInNewContext(
    `${bundle.slice(start, end)}
globalThis.preparedPromise = bdProcPrepareImages(files);`,
    context,
  );
  const prepared = await context.preparedPromise;
  const totalBytes = prepared.reduce((sum, file) => sum + file.size, 0);

  assert.equal(prepared.length, 4);
  assert.ok(totalBytes < 7.5 * 1024 * 1024);
  assert.ok(prepared.every((file) => file.name.endsWith(".jpg")));
  assert.ok(prepared.every((file, index) => file.size < files[index].size));
});

test("gateway payload rejection is shown as a useful Russian message", async () => {
  const bundle = await readFile(
    new URL("../public/assets/index-BQGspy0I.js", import.meta.url),
    "utf8",
  );
  const start = bundle.indexOf('const bdImageUploadVersion="payload-safe-v37"');
  const end = bundle.indexOf("function bdSuppliersPage", start);
  const context = {
    response: {
      ok: false,
      status: 413,
      async text() {
        return "Payload Too Large";
      },
    },
  };

  vm.runInNewContext(
    `${bundle.slice(start, end)}
globalThis.errorPromise = bdUploadResponseJson(response, "fallback").catch(error => error.message);`,
    context,
  );

  assert.match(await context.errorPromise, /автоматического сжатия/);
});

test("purchase photos are uploaded separately and retried below the gateway limit", async () => {
  const bundle = await readFile(
    new URL("../public/assets/index-BQGspy0I.js", import.meta.url),
    "utf8",
  );
  const helperStart = bundle.indexOf('const bdPurchaseChunkUploadVersion="staged-purchase-v81"');
  const helperEnd = bundle.indexOf('const bdMenuChunkUploadVersion=', helperStart);
  const helperSource = bundle.slice(helperStart, helperEnd);
  assert.ok(helperStart >= 0 && helperEnd > helperStart);
  assert.match(helperSource, /bdPurchasePageTargetBytes=573440/);
  assert.match(helperSource, /bdPurchaseRetryTargetBytes=327680/);
  assert.match(helperSource, /fetch\("\/api\/purchases\/files"/);
  assert.match(helperSource, /bdPurchaseDeleteFiles/);

  class MockFormData {
    values = [];

    append(name, value, filename) {
      this.values.push({ name, value, filename });
    }
  }

  const targets = [];
  const calls = [];
  const progress = [];
  const context = {
    file: { name: "invoice.heic", type: "image/heic", size: 8 * 1024 * 1024 },
    targets,
    calls,
    progress,
    FormData: MockFormData,
    bdUploadFileName: (file, fallback) => file.name || fallback,
    bdProcPrepareImage: async (file, options) => {
      targets.push(options.targetBytes);
      return { ...file, name: "invoice.jpg", type: "image/jpeg", size: options.targetBytes };
    },
    bdUploadResponseJson: async (response) => JSON.parse(await response.text()),
    fetch: async (url, options) => {
      calls.push({ url, options });
      if (calls.length === 1) {
        return { ok: false, status: 413, async text() { return "Payload Too Large"; } };
      }
      return {
        ok: true,
        status: 200,
        async text() {
          return '{"ok":true,"file":{"id":"purchase-photo-id","name":"invoice.jpg"}}';
        },
      };
    },
  };

  vm.runInNewContext(
    `${helperSource}
globalThis.resultPromise = bdPurchaseStageImage(file, "camera", 1, 1, message => progress.push(message));`,
    context,
  );
  const result = await context.resultPromise;
  assert.equal(result.id, "purchase-photo-id");
  assert.deepEqual(targets, [573440, 327680]);
  assert.equal(calls.length, 2);
  assert.ok(calls.every((call) => call.url === "/api/purchases/files"));
  assert.ok(calls.every((call) => (
    call.options.body.values.filter((entry) => entry.name === "file").length === 1
  )));
  assert.ok(progress.some((message) => /Дополнительно сжимаю/.test(message)));
});

test("multi-page menus upload one prepared page at a time before recognition", async () => {
  const bundle = await readFile(
    new URL("../public/assets/index-BQGspy0I.js", import.meta.url),
    "utf8",
  );
  const helperStart = bundle.indexOf('const bdMenuChunkUploadVersion="background-menu-v41"');
  const helperEnd = bundle.indexOf("function bdSuppliersPage", helperStart);
  const catalogStart = bundle.indexOf("function bdCatalogPage");
  const catalogEnd = bundle.indexOf("const n_e=", catalogStart);

  assert.ok(helperStart >= 0 && helperEnd > helperStart);
  assert.ok(catalogStart >= 0 && catalogEnd > catalogStart);
  assert.match(bundle.slice(helperStart, helperEnd), /bdMenuPageTargetBytes=1572864/);
  assert.match(bundle.slice(helperStart, helperEnd), /bdMenuRecognitionBatchSize=1/);
  assert.match(bundle.slice(helperStart, helperEnd), /bdMenuRecognitionConcurrency=2/);
  assert.match(bundle.slice(helperStart, helperEnd), /bdMenuPollDeadlineMs=480000/);
  assert.match(bundle.slice(helperStart, helperEnd), /fetch\("\/api\/catalog\/files"/);
  assert.match(bundle.slice(helperStart, helperEnd), /Подготавливаю страницу/);
  assert.match(bundle.slice(helperStart, helperEnd), /action:"recognise-batch"/);
  assert.match(bundle.slice(helperStart, helperEnd), /action:"poll-recognition"/);
  assert.match(bundle.slice(helperStart, helperEnd), /action:"merge-batches"/);
  assert.match(bundle.slice(helperStart, helperEnd), /bdCatalogSplitRecognitionError/);
  assert.match(bundle.slice(catalogStart, catalogEnd), /bdCatalogRecogniseImages\(R,c,k\)/);
  assert.doesNotMatch(
    bundle.slice(catalogStart, catalogEnd),
    /G\.append\("files",Gee/,
  );
});

test("staged menu pages never share one multipart request and partial failures are cleaned up", async () => {
  const bundle = await readFile(
    new URL("../public/assets/index-BQGspy0I.js", import.meta.url),
    "utf8",
  );
  const helperStart = bundle.indexOf('const bdMenuChunkUploadVersion="background-menu-v41"');
  const helperEnd = bundle.indexOf("function bdSuppliersPage", helperStart);
  const helperSource = bundle.slice(helperStart, helperEnd);
  const files = [
    { name: "page-1.jpg", size: 8 * 1024 * 1024, type: "image/jpeg" },
    { name: "page-2.jpg", size: 7 * 1024 * 1024, type: "image/jpeg" },
    { name: "page-3.jpg", size: 6 * 1024 * 1024, type: "image/jpeg" },
  ];

  class MockFormData {
    values = [];

    append(name, value, filename) {
      this.values.push({ name, value, filename });
    }
  }

  const calls = [];
  const progress = [];
  const context = {
    files,
    calls,
    progress,
    FormData: MockFormData,
    encodeURIComponent,
    bdUploadFileName: (file, fallback) => file.name || fallback,
    bdProcPrepareImage: async (file, options) => ({
      ...file,
      size: options.targetBytes,
      prepared: true,
    }),
    fetch: async (url, options) => {
      calls.push({ url, options });
      return {
        ok: true,
        status: 200,
        async text() {
          return JSON.stringify({
            ok: true,
            file: { id: `file-${calls.length}`, name: files[calls.length - 1].name },
          });
        },
      };
    },
  };

  vm.runInNewContext(
    `${helperSource}
globalThis.stagePromise = bdCatalogStageImages(files, "gallery", message => progress.push(message));`,
    context,
  );
  const staged = await context.stagePromise;

  assert.equal(staged.length, 3);
  assert.equal(calls.length, 3);
  assert.ok(calls.every((call) => call.url === "/api/catalog/files"));
  assert.ok(calls.every((call) => (
    call.options.body.values.filter((entry) => entry.name === "file").length === 1
  )));
  assert.ok(calls.every((call) => (
    call.options.body.values.find((entry) => entry.name === "file").value.size
      === 1.5 * 1024 * 1024
  )));
  assert.match(progress.at(-1), /Загружаю страницу 3 из 3/);

  const cleanupCalls = [];
  const cleanupContext = {
    files,
    cleanupCalls,
    FormData: MockFormData,
    encodeURIComponent,
    bdUploadFileName: (file, fallback) => file.name || fallback,
    bdProcPrepareImage: async (file, options) => ({ ...file, size: options.targetBytes }),
    fetch: async (url, options) => {
      cleanupCalls.push({ url, options });
      const uploads = cleanupCalls.filter((call) => call.options.method === "POST").length;
      if (options.method === "DELETE") {
        return { ok: true, status: 200, async text() { return "{\"ok\":true}"; } };
      }
      if (uploads === 2) {
        return { ok: false, status: 413, async text() { return "Payload Too Large"; } };
      }
      return {
        ok: true,
        status: 200,
        async text() {
          return "{\"ok\":true,\"file\":{\"id\":\"file-first\",\"name\":\"page-1.jpg\"}}";
        },
      };
    },
  };

  vm.runInNewContext(
    `${helperSource}
globalThis.failurePromise = bdCatalogStageImages(files, "gallery", () => {})
  .catch(error => error.message);`,
    cleanupContext,
  );
  assert.match(await cleanupContext.failurePromise, /автоматической подготовки/);
  assert.ok(cleanupCalls.some((call) => (
    call.url === "/api/catalog/files/file-first" && call.options.method === "DELETE"
  )));
});

test("eleven-page menus are recognised as isolated jobs and merged once", async () => {
  const bundle = await readFile(
    new URL("../public/assets/index-BQGspy0I.js", import.meta.url),
    "utf8",
  );
  const helperStart = bundle.indexOf('const bdMenuChunkUploadVersion="background-menu-v41"');
  const helperEnd = bundle.indexOf("function bdSuppliersPage", helperStart);
  const helperSource = bundle.slice(helperStart, helperEnd);
  const files = Array.from({ length: 11 }, (_, index) => ({
    id: `file-${index + 1}`,
    name: `page-${index + 1}.jpg`,
  }));
  const calls = [];
  const progress = [];

  const context = {
    files,
    calls,
    progress,
    encodeURIComponent,
    fetch: async (url, options) => {
      assert.equal(url, "/api/catalog/import");
      const body = JSON.parse(options.body);
      calls.push(body);
      if (body.action === "merge-batches") {
        return {
          ok: true,
          status: 200,
          async text() {
            return JSON.stringify({
              ok: true,
              draft: { id: "merged", menuItems: [{ name: "Лагер" }] },
            });
          },
        };
      }
      return {
        ok: true,
        status: 200,
        async text() {
          return JSON.stringify({
            ok: true,
            part: {
              id: `part-${body.pageStart}`,
              menuItems: [{ name: `Страница ${body.pageStart}` }],
            },
          });
        },
      };
    },
  };

  vm.runInNewContext(
    `${helperSource}
globalThis.recognitionPromise = bdCatalogRecogniseImages(
  files,
  "gallery",
  message => progress.push(message),
);`,
    context,
  );
  const draft = await context.recognitionPromise;
  const batchCalls = calls.filter((call) => call.action === "recognise-batch");
  const mergeCall = calls.find((call) => call.action === "merge-batches");

  assert.equal(draft.id, "merged");
  assert.equal(batchCalls.length, 11);
  assert.deepEqual(
    batchCalls.map((call) => call.sourceFileIds.length).sort(),
    Array.from({ length: 11 }, () => 1),
  );
  assert.ok(batchCalls.every((call) => call.pageTotal === 11));
  assert.equal(mergeCall.sourceFileIds.length, 11);
  assert.equal(mergeCall.parts.length, 11);
  assert.match(progress.at(-1), /Объединяю 11 страниц/);
});

test("background page recognition polls until completion without losing the menu", async () => {
  const bundle = await readFile(
    new URL("../public/assets/index-BQGspy0I.js", import.meta.url),
    "utf8",
  );
  const helperStart = bundle.indexOf('const bdMenuChunkUploadVersion="background-menu-v41"');
  const helperEnd = bundle.indexOf("function bdSuppliersPage", helperStart);
  const helperSource = bundle.slice(helperStart, helperEnd);
  const files = [
    { id: "file-1", name: "page-1.jpg" },
    { id: "file-2", name: "page-2.jpg" },
  ];
  const calls = [];
  const progress = [];
  const polls = new Map();

  const context = {
    files,
    calls,
    progress,
    setTimeout(callback) {
      callback();
      return 0;
    },
    encodeURIComponent,
    fetch: async (url, options) => {
      assert.equal(url, "/api/catalog/import");
      const body = JSON.parse(options.body);
      calls.push(body);
      if (body.action === "merge-batches") {
        return {
          ok: true,
          status: 200,
          async text() {
            return JSON.stringify({
              ok: true,
              draft: { id: "merged", menuItems: [{ name: "Кофе" }] },
            });
          },
        };
      }
      if (body.action === "poll-recognition") {
        const count = (polls.get(body.jobId) ?? 0) + 1;
        polls.set(body.jobId, count);
        if (count === 1) {
          return {
            ok: true,
            status: 202,
            async text() {
              return JSON.stringify({ ok: true, jobId: body.jobId, status: "in_progress" });
            },
          };
        }
        return {
          ok: true,
          status: 200,
          async text() {
            return JSON.stringify({
              ok: true,
              status: "completed",
              part: {
                id: `part-${body.jobId}`,
                menuItems: [{ name: `Страница ${body.jobId}` }],
              },
            });
          },
        };
      }
      return {
        ok: true,
        status: 202,
        async text() {
          return JSON.stringify({
            ok: true,
            jobId: `job-${body.pageStart}`,
            status: "queued",
          });
        },
      };
    },
  };

  vm.runInNewContext(
    `${helperSource}
globalThis.recognitionPromise = bdCatalogRecogniseImages(
  files,
  "gallery",
  message => progress.push(message),
);`,
    context,
  );
  const draft = await context.recognitionPromise;
  const recognitionCalls = calls.filter((call) => call.action === "recognise-batch");
  const pollCalls = calls.filter((call) => call.action === "poll-recognition");
  const mergeCall = calls.find((call) => call.action === "merge-batches");

  assert.equal(draft.id, "merged");
  assert.deepEqual(recognitionCalls.map((call) => call.sourceFileIds.length), [1, 1]);
  assert.equal(pollCalls.length, 4);
  assert.equal(mergeCall.parts.length, 2);
  assert.ok(progress.some((message) => /Распознаю страницу 1 из 2/.test(message)));
  assert.match(progress.at(-1), /Объединяю 2 страниц/);
});

test("catalog sections and subsections move with their menu positions", async () => {
  const bundle = await readFile(
    new URL("../public/assets/index-BQGspy0I.js", import.meta.url),
    "utf8",
  );
  const helperStart = bundle.indexOf(
    'const bdCatalogWorkspaceVersion="catalog-move-controls-v44"',
  );
  const helperEnd = bundle.indexOf("function bdCatUnitLabel", helperStart);
  assert.ok(helperStart >= 0 && helperEnd > helperStart);

  const state = {
    version: 2,
    groups: [
      { id: "bar", name: "Бар", legacyDepartment: "bar", sortOrder: 0 },
      { id: "kitchen", name: "Кухня", legacyDepartment: "kitchen", sortOrder: 1 },
      { id: "hookah", name: "Кальяны", legacyDepartment: "hookah", sortOrder: 2 },
    ],
    subgroups: [
      { id: "cocktails", groupId: "bar", name: "Коктейли", sortOrder: 0 },
      { id: "beer", groupId: "bar", name: "Пиво", sortOrder: 1 },
      { id: "salads", groupId: "kitchen", name: "Салаты", sortOrder: 0 },
    ],
    menuItems: [
      {
        id: "mojito",
        groupId: "bar",
        subgroupId: "cocktails",
        department: "bar",
        category: "Коктейли",
        name: "Мохито",
      },
      {
        id: "lager",
        groupId: "bar",
        subgroupId: "beer",
        department: "bar",
        category: "Пиво",
        name: "Лагер",
      },
      {
        id: "caesar",
        groupId: "kitchen",
        subgroupId: "salads",
        department: "kitchen",
        category: "Салаты",
        name: "Цезарь",
      },
    ],
    recipes: [{ id: "recipe-mojito", menuItemId: "mojito" }],
  };
  const context = { state };

  vm.runInNewContext(
    `${bundle.slice(helperStart, helperEnd)}
globalThis.movedSubgroup = bdCatMoveSubgroupState(state, "cocktails", "kitchen");
globalThis.mergedSection = bdCatMergeGroupState(state, "bar", "kitchen");`,
    context,
  );

  const movedMojito = context.movedSubgroup.menuItems.find(
    (item) => item.id === "mojito",
  );
  assert.equal(movedMojito.groupId, "kitchen");
  assert.equal(movedMojito.department, "kitchen");
  assert.ok(context.movedSubgroup.recipes.some((recipe) => recipe.id === "recipe-mojito"));

  assert.ok(!context.mergedSection.groups.some((group) => group.id === "bar"));
  assert.ok(context.mergedSection.menuItems.every((item) => item.groupId !== "bar"));
  assert.equal(
    context.mergedSection.menuItems.find((item) => item.id === "lager").groupId,
    "kitchen",
  );
  assert.ok(context.mergedSection.recipes.some((recipe) => recipe.id === "recipe-mojito"));
});

test("month closing actions resolve to the working report flow", async () => {
  const [bundle, dataControlRoute] = await Promise.all([
    readFile(
      new URL("../public/assets/index-BQGspy0I.js", import.meta.url),
      "utf8",
    ),
    readFile(new URL("../app/data-control/route.ts", import.meta.url), "utf8"),
  ]);

  assert.ok(
    bundle.includes(
      'path:"/month-closing",component:()=>i.jsx(cS,{to:Ot()?"/reports?closeMonth=1":"/login"})',
    ),
  );
  assert.match(dataControlRoute, /href="\/reports\?closeMonth=1"/);
  assert.doesNotMatch(dataControlRoute, /href="\/month-closing"/);
});

test("purchase lifecycle is venue-scoped and preserves stock and payment history", async () => {
  const [remove, cancel, payment, reversePayment] = await Promise.all([
    readFile(new URL("../app/api/purchases/delete/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/purchases/cancel/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/purchases/payment/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/purchases/payment/reverse/route.ts", import.meta.url), "utf8"),
  ]);

  for (const route of [remove, cancel, payment, reversePayment]) {
    assert.match(route, /WHERE account_id = \?/);
    assert.match(route, /account\.venueId/);
  }
  assert.match(remove, /PURCHASE_MUST_BE_CANCELLED/);
  assert.match(remove, /PURCHASE_HAS_PAYMENTS/);
  assert.match(remove, /PURCHASE_HAS_STOCK_MOVEMENTS/);
  assert.match(remove, /VALUES \(\?, \?, 'delete'/);
  assert.match(remove, /bucket\.delete/);
  assert.doesNotMatch(remove, /expenses\.splice/);

  assert.match(cancel, /hasPermission\(account, "finance\.manage"\)/);
  assert.match(cancel, /removePurchaseFromInventory/);
  assert.match(cancel, /status: "cancelled"/);
  assert.match(cancel, /requiresReconciliation: true/);
  assert.match(cancel, /Складское влияние закупки отменено/);
  assert.match(payment, /source: "purchase_payment"/);
  assert.match(payment, /paymentKind: "supplier_payment"/);
  assert.match(payment, /IDEMPOTENCY_KEY_REQUIRED/);
  assert.match(reversePayment, /status: "voided"/);
  assert.match(reversePayment, /reversedAt/);
});

test("build contains the BarDoctor shell, local APIs, and D1 migrations", async () => {
  const [
    worker,
    bootstrap,
    integrationsClient,
    hosting,
    coreMigration,
    integrationsMigration,
    secretsMigration,
    aiUsageMigration,
    aiSubscriptionMigration,
    mainBundle,
    authCss,
    authVenueBackground,
    marketClient,
    marketCss,
    marketEntryCss,
    opportunitiesClient,
    opportunitiesCss,
    opportunitiesEntryCss,
    supplierAlternativesClient,
    salesImportClient,
    salesImportCss,
    warehouseCss,
    navigationCss,
    homeVisualCss,
    auditMigration,
    dataControlClient,
    dataControlCss,
    pushMigration,
    notificationAutomationMigration,
    workerConfig,
    notificationsClient,
    notificationsCss,
    oneSignalWorker,
    runtimeWorkerLoader,
    appIcon,
    authIsolationMigration,
    platformSecretsMigration,
    integrationHubMigration,
    integrationHubSourceMigration,
    universalIntegrationMigration,
    localConnectorMigration,
    deliveryRetryMigration,
  ] = await Promise.all([
    readFile(new URL("../dist/server/index.js", import.meta.url), "utf8"),
    readFile(new URL("../dist/client/bardoctor-preview.js", import.meta.url), "utf8"),
    readFile(new URL("../dist/client/integrations.js", import.meta.url), "utf8"),
    readFile(new URL("../dist/.openai/hosting.json", import.meta.url), "utf8"),
    readFile(
      new URL("../dist/.openai/drizzle/0000_skinny_nightshade.sql", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../dist/.openai/drizzle/0001_ambitious_klaw.sql", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../dist/.openai/drizzle/0002_tan_wendell_rand.sql", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../dist/.openai/drizzle/0003_long_grim_reaper.sql", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../dist/.openai/drizzle/0005_charming_jazinda.sql", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../dist/client/assets/index-BQGspy0I.js", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../dist/client/assets/index-D0AhgpbR.css", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../dist/client/assets/auth-venue-bg.png", import.meta.url),
    ),
    readFile(new URL("../dist/client/market.js", import.meta.url), "utf8"),
    readFile(new URL("../dist/client/market.css", import.meta.url), "utf8"),
    readFile(new URL("../dist/client/market-entry.css", import.meta.url), "utf8"),
    readFile(new URL("../dist/client/opportunities.js", import.meta.url), "utf8"),
    readFile(new URL("../dist/client/opportunities.css", import.meta.url), "utf8"),
    readFile(new URL("../dist/client/opportunities-entry.css", import.meta.url), "utf8"),
    readFile(new URL("../dist/client/supplier-alternatives.js", import.meta.url), "utf8"),
    readFile(new URL("../dist/client/sales-import.js", import.meta.url), "utf8"),
    readFile(new URL("../dist/client/sales-import.css", import.meta.url), "utf8"),
    readFile(new URL("../dist/client/warehouse.css", import.meta.url), "utf8"),
    readFile(new URL("../dist/client/navigation.css", import.meta.url), "utf8"),
    readFile(new URL("../dist/client/home-visual-v151.css", import.meta.url), "utf8"),
    readFile(
      new URL("../dist/.openai/drizzle/0004_gorgeous_magik.sql", import.meta.url),
      "utf8",
    ),
    readFile(new URL("../dist/client/data-control.js", import.meta.url), "utf8"),
    readFile(new URL("../dist/client/data-control.css", import.meta.url), "utf8"),
    readFile(
      new URL("../dist/.openai/drizzle/0006_panoramic_hiroim.sql", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../dist/.openai/drizzle/0007_noisy_madrox.sql", import.meta.url),
      "utf8",
    ),
    readFile(new URL("../dist/server/wrangler.json", import.meta.url), "utf8"),
    readFile(new URL("../dist/client/notifications.js", import.meta.url), "utf8"),
    readFile(new URL("../dist/client/notifications.css", import.meta.url), "utf8"),
    readFile(new URL("../dist/client/OneSignalSDKWorker.js", import.meta.url), "utf8"),
    readFile(new URL("../dist/client/runtime-worker.js", import.meta.url), "utf8"),
    readFile(new URL("../dist/client/icons/icon-192.png", import.meta.url)),
    readFile(
      new URL("../dist/.openai/drizzle/0008_misty_gorilla_man.sql", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../dist/.openai/drizzle/0009_careful_marvel_apes.sql", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../dist/.openai/drizzle/0011_dear_the_santerians.sql", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../dist/.openai/drizzle/0012_magenta_quentin_quire.sql", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../dist/.openai/drizzle/0013_youthful_dormammu.sql", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../dist/.openai/drizzle/0015_green_zaran.sql", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../dist/.openai/drizzle/0016_groovy_major_mapleleaf.sql", import.meta.url),
      "utf8",
    ),
  ]);

  assert.match(worker, /<div id="root">[\s\S]*data-bd-static-startup="v201"/);
  assert.match(worker, /bardoctor-preview\.js\?v=20260821-inventory-reconciliation-v224/);
  assert.match(worker, /health-score-experience-v152\.css\?v=20260815-home-health-v200/);
  assert.match(worker, /health-score-experience\.js\?v=20260811-health-v155/);
  assert.match(worker, /venue-switcher\.css\?v=20260813-venue-v174/);
  assert.match(worker, /venue-location-data\.js\?v=20260811-location-selects-v2/);
  assert.match(worker, /venue-create-selects\.css\?v=20260811-location-selects-v2/);
  assert.match(worker, /navigation\.css\?v=20260811-navigation-v85/);
  assert.match(worker, /employee-detail\.css\?v=20260817-employee-edit-page-v206/);
  assert.match(worker, /employee-list\.css\?v=20260817-employee-edit-page-v206/);
  assert.match(bootstrap, /index-BQGspy0I\.js\?v=20260821-inventory-reconciliation-v224/);
  assert.match(bootstrap, /function installProtectedOriginalLinks\(\)/);
  assert.match(bootstrap, /window\.open\("about:blank", "_blank"\)/);
  assert.match(bootstrap, /fetch\(targetUrl\.pathname \+ targetUrl\.search/);
  assert.match(bootstrap, /var blob = await response\.blob\(\)/);
  assert.match(bootstrap, /Оригинал недоступен/);
  assert.match(bootstrap, /function removeLegacyFinancePurchasePaymentEntryV195\(\)/);
  assert.doesNotMatch(bootstrap, /data-bd-purchase-payment-entry[^\n]*v186/);
  assert.match(mainBundle, /\/suppliers\?tab=purchases&payment=1&returnTo=finance/);
  assert.match(mainBundle, /children:"Оплатить поставщику"/);
  assert.doesNotMatch(bootstrap, /function installPurchaseDeletion\(\)/);
  assert.doesNotMatch(bootstrap, /Связанный расход будет удалён/);
  assert.match(worker, /route:\/api\/auth\/bootstrap/);
  assert.match(worker, /route:\/api\/auth\/logout/);
  assert.match(worker, /route:\/api\/store\/:key/);
  assert.match(worker, /bd_inventory_snapshots/);
  assert.match(worker, /bd_finance_settings/);
  assert.match(worker, /bd_payroll_entries/);
  assert.match(worker, /bd_month_closings/);
  assert.match(worker, /route:\/api\/ai\/:action/);
  assert.match(worker, /route:\/api\/priority\/assess/);
  assert.match(worker, /route:\/api\/smart\/process/);
  assert.match(worker, /route:\/api\/reviews\/:action/);
  assert.match(worker, /route:\/api\/reviews\/sources\/google\/:action/);
  assert.match(worker, /route:\/api\/purchases\/scan/);
  assert.match(worker, /route:\/api\/purchases\/confirm/);
  assert.match(worker, /route:\/api\/purchases\/update/);
  assert.match(worker, /route:\/api\/purchases\/delete/);
  assert.match(worker, /route:\/api\/purchases\/payment/);
  assert.match(worker, /route:\/api\/purchases\/payment\/reverse/);
  assert.match(worker, /route:\/api\/purchases\/cancel/);
  assert.match(worker, /route:\/api\/purchases\/repost/);
  assert.match(worker, /route:\/api\/purchases\/files/);
  assert.match(worker, /route:\/api\/purchases\/files\/:id/);
  assert.match(worker, /Оригинал открывается защищённо из карточки документа/);
  assert.match(worker, /Вернуться к документам/);
  assert.match(worker, /application\/json; charset=utf-8/);
  assert.match(worker, /route:\/api\/sales\/scan/);
  assert.match(worker, /route:\/api\/sales\/confirm/);
  assert.match(worker, /route:\/api\/sales\/files\/:id/);
  assert.match(worker, /route:\/api\/inventory\/counts/);
  assert.match(worker, /route:\/api\/inventory\/scan/);
  assert.match(worker, /route:\/sales-import/);
  assert.match(mainBundle, /window\.location\.assign\("\/sales-import"\)/);
  assert.doesNotMatch(mainBundle, /\/sales-import\.html/);
  assert.match(salesImportClient, /\/api\/sales\/scan/);
  assert.match(salesImportClient, /\/api\/sales\/confirm/);
  assert.match(salesImportClient, /Сопоставьте продажи с меню/);
  assert.match(salesImportClient, /bd_assortment_v1/);
  assert.match(salesImportCss, /\.sales-row\.blocked/);
  assert.match(salesImportCss, /@media \(max-width: 760px\)/);
  assert.match(warehouseCss, /\.bd-warehouse-stock-grid/);
  assert.match(warehouseCss, /\.bd-inventory-count-list/);
  assert.match(warehouseCss, /@media \(max-width: 760px\)/);
  assert.match(navigationCss, /grid-template-columns: repeat\(6, minmax\(0, 1fr\)\)/);
  assert.doesNotMatch(navigationCss, /data-bd-nav-key="warehouse"/);
  assert.match(
    navigationCss,
    /data-bd-desktop-brand="responsive-v54"[^}]+display: none/s,
  );
  assert.match(worker, /route:\/api\/catalog\/import/);
  assert.match(worker, /route:\/api\/catalog\/files/);
  assert.match(worker, /route:\/api\/catalog\/files\/:id/);
  assert.match(worker, /route:\/api\/competitors\/refresh/);
  assert.match(worker, /route:\/api\/market/);
  assert.match(worker, /route:\/market/);
  assert.match(worker, /bd_market_analysis_v1/);
  assert.match(worker, /route:\/api\/opportunities/);
  assert.match(worker, /route:\/opportunities/);
  assert.match(worker, /bd_opportunity_calendar_v1/);
  assert.match(worker, /BarDoctor Opportunity Intelligence/);
  assert.match(worker, /День города Бендеры/);
  assert.match(worker, /День Республики/);
  assert.match(worker, /Новогодняя ночь/);
  assert.match(worker, /calendar-core-v3/);
  assert.match(worker, /ближайшие 365 дней/);
  assert.match(worker, /не дальше 35 км/);
  assert.match(worker, /Обязательные уровни проверки для любого указанного региона/);
  assert.match(worker, /День Республики Башкортостан/);
  assert.match(worker, /День города Уфы/);
  assert.match(worker, /send_after/);
  assert.match(worker, /cancelScheduledPush/);
  assert.match(worker, /web_search/);
  assert.match(worker, /web_search_call\.action\.sources/);
  assert.match(worker, /route:\/api\/integrations/);
  assert.match(worker, /route:\/integrations/);
  assert.match(worker, /route:\/settings/);
  assert.match(worker, /integrations\.js\?v=20260814-connector-download-v187/);
  assert.match(worker, /route:\/api\/integration-hub\/import/);
  assert.match(worker, /route:\/api\/integration-hub\/import\/preview/);
  assert.match(worker, /route:\/api\/integration-hub\/connections/);
  assert.match(worker, /route:\/api\/integration-hub\/templates/);
  assert.match(worker, /route:\/api\/integration-hub\/mappings/);
  assert.match(worker, /route:\/api\/integration-hub\/retry/);
  assert.match(worker, /route:\/api\/integration\/v1\/ingest/);
  assert.match(worker, /route:\/api\/integration\/v1\/health/);
  assert.match(worker, /route:\/api\/integration\/v1\/heartbeat/);
  assert.match(integrationsClient, /\/api\/integration-hub\/import/);
  assert.match(integrationsClient, /\/api\/integration-hub\/connections/);
  assert.match(integrationsClient, /Проверить структуру/);
  assert.match(integrationsClient, /Повторить после исправления/);
  assert.match(worker, /market\.js\?v=20260802-embedded-nav-v30/);
  assert.doesNotMatch(integrationsClient, /AI уже входит в подписку|AI включён в подписку|Push‑уведомления — OneSignal/);
  assert.match(worker, /ONESIGNAL_REST_API_KEY/);
  assert.match(worker, /platform_secrets/);
  assert.match(worker, /gpt-5\.4-mini/);
  assert.match(worker, /json_schema/);
  assert.match(worker, /menu_import/);
  assert.match(worker, /AI временно недоступен из-за технического ограничения нагрузки/);
  assert.match(worker, /syncGoogleReviewsIfDue/);
  assert.match(worker, /confirmedCompetitors/);
  assert.match(worker, /set-competitor-confirmed/);
  assert.match(worker, /Локальный API \/api\/\$\{path\.join\("\/"\)\} не найден/);
  assert.match(bootstrap, /\/api\/auth\/bootstrap/);
  assert.match(authCss, /min-width:900px[^}]*\.bd-auth-login \.bd-auth-form-scroll/);
  assert.match(bootstrap, /\/assets\/index-BQGspy0I\.js/);
  assert.match(bootstrap, /randomUUIDFallback/);
  assert.match(bootstrap, /var standaloneRoutes = \["\/forgot-password"\]/);
  assert.match(bootstrap, /navigateInApplication/);
  assert.match(bootstrap, /greetingForCurrentTime/);
  assert.match(bootstrap, /bd_user_first_name/);
  assert.match(bootstrap, /Заведение:/);
  assert.match(bootstrap, /injectDataControlEntry/);
  assert.match(bootstrap, /\/data-control/);
  assert.match(bootstrap, /injectCompetitorsEntry/);
  assert.match(bootstrap, /data-bd-competitors-entry/);
  assert.match(bootstrap, /injectOpportunityEntry/);
  assert.match(bootstrap, /data-bd-opportunity-entry/);
  assert.match(bootstrap, /\/api\/opportunities/);
  assert.match(bootstrap, /\/api\/competitors\/me/);
  assert.match(bootstrap, /Найти конкурентов/);
  assert.doesNotMatch(bootstrap, /MARKET INTELLIGENCE/);
  assert.doesNotMatch(bootstrap, /bd-market-entry-v1/);
  assert.match(worker, /market-entry\.css/);
  assert.match(worker, /opportunities-entry\.css/);
  assert.match(worker, /suppliers\.css/);
  assert.match(worker, /catalog\.css/);
  assert.match(mainBundle, /bdSupplierWorkspaceVersion="procurement-v35"/);
  assert.match(mainBundle, /bd:store-updated/);
  assert.match(mainBundle, /Оплата сохранена/);
  assert.match(mainBundle, /Финансовая операция связана с накладной/);
  assert.match(mainBundle, /Удалить накладную/);
  assert.match(mainBundle, /Будет выполнено автоматически/);
  assert.match(mainBundle, /История операций сохранится/);
  assert.match(mainBundle, /Оплата автоматически отменена при удалении накладной/);
  assert.doesNotMatch(mainBundle, /Сначала отмените связанные платежи в блоке «Платежи»/);
  assert.match(mainBundle, /bdProcurementDeleteUiV191="v191"/);
  assert.match(mainBundle, /bdPurchaseDeleteEntryV192="v192"/);
  assert.match(mainBundle, /bdPurchaseDeleteVisibilityV193="v193"/);
  assert.match(mainBundle, /bdPurchaseDeleteOneStepV194="v194"/);
  assert.match(mainBundle, /bdFinancePurchaseDeleteFixV195="v195"/);
  assert.doesNotMatch(mainBundle, /Закупка и расход учтены/);
  assert.match(mainBundle, /function bdDocumentDetailSheet/);
  assert.match(mainBundle, /bd-document-detail-delete-v193/);
  assert.match(mainBundle, /bd-document-detail-sheet-v193/);
  assert.match(mainBundle, /bd-finance-document-open-v193/);
  assert.match(mainBundle, /async function deleteViewedPurchase\(\)/);
  assert.match(mainBundle, /function applyViewedPurchaseServerResultV195\(/);
  assert.match(mainBundle, /monthExpenses=S\.useMemo\(\(\)=>expenses\.filter\(e=>e\.date\.slice\(0,7\)===monthKey&&e\?\.status!=="voided"&&!e\?\.reversedAt\)/);
  assert.match(mainBundle, /for\(const payment of active\)/);
  assert.match(mainBundle, /fetch\("\/api\/purchases\/payment\/reverse"/);
  assert.match(mainBundle, /onDelete:viewedPurchaseDocument&&canManagePurchases\?deleteViewedPurchase:null/);
  assert.match(mainBundle, /Режим просмотра/);
  assert.match(mainBundle, /Купленные позиции/);
  assert.match(mainBundle, /\/api\/purchases\/update/);
  assert.match(mainBundle, /Редактировать накладную/);
  assert.match(mainBundle, /bdCanManageFinance/);
  assert.match(mainBundle, /maxWidth:n\?760:500/);
  assert.match(mainBundle, /!bdLinkedDocument&&bdCanManageFinance/);
  assert.match(mainBundle, /returnTo=finance/);
  assert.match(mainBundle, /bd_assortment_v1/);
  assert.match(mainBundle, /bd_stock_movements/);
  assert.match(mainBundle, /bdCatalogWorkspaceVersion="catalog-move-controls-v44"/);
  assert.match(mainBundle, /function bdCatMenuGroups/);
  assert.match(mainBundle, /function bdCatStructureManager/);
  assert.match(mainBundle, /function bdCatStableTaxId/);
  assert.match(mainBundle, /bd-catalog-department-toggle/);
  assert.match(mainBundle, /bd-catalog-subsection-toggle/);
  assert.match(mainBundle, /label:"Группа"/);
  assert.match(mainBundle, /label:"Подраздел"/);
  assert.match(mainBundle, /Настроить группы и подразделы/);
  assert.match(mainBundle, /Перенести весь раздел в/);
  assert.match(mainBundle, /Перенести подраздел в/);
  assert.match(mainBundle, /Перенести раздел/);
  assert.match(mainBundle, /Управление разделами/);
  assert.match(mainBundle, /function bdCatMoveSubgroupState/);
  assert.match(mainBundle, /function bdCatMergeGroupState/);
  assert.match(mainBundle, /Сохранить структуру/);
  assert.match(mainBundle, /Редактировать техкарту/);
  assert.match(mainBundle, /Изменить позицию/);
  assert.match(mainBundle, /bdPhotoGalleryVersion="background-menu-v41"/);
  assert.match(mainBundle, /bdImageUploadVersion="payload-safe-v37"/);
  assert.match(mainBundle, /bdMenuChunkUploadVersion="background-menu-v41"/);
  assert.match(mainBundle, /bdMenuRecognitionBatchSize=1/);
  assert.match(mainBundle, /action:"poll-recognition"/);
  assert.match(mainBundle, /bdCatalogPollJob/);
  assert.match(mainBundle, /bdUploadPayloadBudgetBytes=7864320/);
  assert.match(mainBundle, /bdCatalogStageImages\(I,c,k\)/);
  assert.match(mainBundle, /action:"recognise-batch"/);
  assert.match(mainBundle, /action:"merge-batches"/);
  assert.match(mainBundle, /function bdReadImageDataUrl/);
  const imagePreparationStart = mainBundle.indexOf("async function bdProcPrepareImage");
  const imagePreparationEnd = mainBundle.indexOf("function bdSuppliersPage", imagePreparationStart);
  assert.ok(imagePreparationStart >= 0 && imagePreparationEnd > imagePreparationStart);
  assert.doesNotMatch(
    mainBundle.slice(imagePreparationStart, imagePreparationEnd),
    /URL\.createObjectURL/,
  );
  assert.match(mainBundle, /u\.append\("file",l,bdUploadFileName/);
  assert.match(mainBundle, /Сфотографируйте чек/);
  assert.match(mainBundle, /Проверьте распознавание/);
  assert.match(mainBundle, /Сравнение собственных цен/);
  assert.match(mainBundle, /Ассортимент и техкарты/);
  assert.match(mainBundle, /Загрузите меню — BarDoctor соберёт ассортимент/);
  assert.match(mainBundle, /Выбрать несколько фото/);
  assert.match(mainBundle, /multiple:!0/);
  assert.match(mainBundle, /Распознать "\+e\.length\+" страниц/);
  assert.match(worker, /form\.getAll\("files"\)/);
  assert.match(worker, /poll-recognition/);
  assert.match(worker, /background:\s*!0|background:\s*true/);
  assert.match(mainBundle, /Техкарта пока не подтверждена/);
  assert.match(mainBundle, /Расчёт: план продаж × техкарта \+ резерв/);
  assert.match(worker, /bd_purchase_documents/);
  assert.match(worker, /bd_suppliers/);
  assert.match(worker, /bd_assortment_v1/);
  assert.match(marketClient, /\/api\/market/);
  assert.match(marketClient, /navigator\.geolocation/);
  assert.match(marketClient, /source-link/);
  assert.match(marketClient, /Анализ обновлён и сохранён/);
  assert.match(marketClient, /market-quick-add/);
  assert.match(marketClient, /market-quick-sheet/);
  assert.match(marketClient, /Подтвердить конкурента/);
  assert.match(marketClient, /set-competitor-confirmed/);
  assert.match(marketClient, /delete-competitor/);
  assert.match(marketClient, /Удалить конкурента/);
  assert.match(marketClient, /confirmed-competitor-count/);
  assert.match(marketClient, /#competitors-card/);
  assert.match(marketCss, /\.market-hero/);
  assert.match(marketCss, /html\[data-bd-embedded\] \.market-bottom-nav/);
  assert.match(marketCss, /\.competitor-item/);
  assert.match(marketCss, /\.competitor-delete-button/);
  assert.match(marketCss, /repeat\(6,minmax\(0,1fr\)\)/);
  assert.match(worker, /Закрыть смену/);
  assert.match(worker, /Добавить покупку/);
  assert.match(worker, /Сообщить о происшествии/);
  assert.match(worker, /Создать поручение/);
  assert.match(marketCss, /@media\(max-width:390px\)/);
  assert.match(marketEntryCss, /\.bd-market-entry-v1/);
  assert.match(marketEntryCss, /bd-market-radar-sweep/);
  assert.match(marketEntryCss, /\.bd-competitors-entry/);
  assert.match(marketEntryCss, /\.bd-data-control-entry/);
  assert.match(opportunitiesClient, /\/api\/opportunities/);
  assert.match(opportunitiesClient, /set-decision/);
  assert.match(opportunitiesClient, /delete-event/);
  assert.match(opportunitiesClient, /Удалить событие/);
  assert.match(opportunitiesClient, /Обновляется автоматически раз в 7 дней|bd_opportunities_auto_refresh/);
  assert.match(opportunitiesClient, /Берём в работу/);
  assert.match(opportunitiesClient, /ПОЧЕМУ ДЛЯ/);
  assert.match(opportunitiesClient, /Официальный календарь/);
  assert.match(opportunitiesClient, /Рекомендуемая смена/);
  assert.match(opportunitiesClient, /ожидают 30-дневного окна/);
  assert.match(opportunitiesClient, /OneSignal получит их автоматически за 30 дней/);
  assert.match(opportunitiesClient, /year: "numeric"/);
  assert.match(opportunitiesClient, /aria-pressed/);
  assert.match(opportunitiesCss, /\.opportunity-hero/);
  assert.match(opportunitiesCss, /html\[data-bd-embedded\] \.opportunity-bottom-nav/);
  assert.match(opportunitiesCss, /\.event-card/);
  assert.match(opportunitiesCss, /@media\(max-width:390px\)/);
  assert.match(opportunitiesEntryCss, /\.bd-opportunity-entry/);
  assert.match(supplierAlternativesClient, /Открыть меню/);
  assert.match(supplierAlternativesClient, /Сначала добавьте товары в меню/);
  assert.match(supplierAlternativesClient, /Подтверждённых предложений пока нет/);
  assert.match(supplierAlternativesClient, /Поиск по предложениям поставщиков/);
  assert.match(supplierAlternativesClient, /aria-busy/);
  assert.match(supplierAlternativesClient, /location\.href = "\/catalog"/);
  assert.doesNotMatch(supplierAlternativesClient, /location\.href = "\/assortment"/);
  assert.match(worker, /route:\/assortment/);
  assert.match(worker, /supplier-alternatives\.js\?v=20260808-rc-v70/);
  assert.match(worker, /bd_supplier_alternatives_v1/);
  assert.match(worker, /targetSignature/);
  assert.doesNotMatch(worker, /maximum-scale=1/);
  assert.match(worker, /route:\/api\/audit/);
  assert.match(worker, /route:\/api\/import\/preview/);
  assert.match(worker, /route:\/data-control/);
  assert.match(worker, /MONTH_LOCKED/);
  assert.match(worker, /ACCESS_DENIED/);
  assert.match(auditMigration, /CREATE TABLE `audit_log`/);
  assert.match(dataControlClient, /Проверенных проблем нет/);
  assert.match(dataControlClient, /БЫЛО → СТАЛО/);
  assert.match(dataControlClient, /BarDoctor-audit-/);
  assert.match(dataControlClient, /AbortController/);
  assert.match(dataControlCss, /overflow-wrap:\s*anywhere/);
  assert.match(worker, /route:\/notifications/);
  assert.match(worker, /route:\/manifest\.json/);
  assert.match(worker, /route:\/api\/notifications/);
  assert.match(worker, /route:\/api\/notifications\/test/);
  assert.match(worker, /route:\/api\/notifications\/run/);
  assert.match(worker, /ONESIGNAL_APP_ID/);
  assert.match(worker, /sendPushToAccount/);
  assert.match(
    worker,
    /script-src 'self' https:\/\/cdn\.onesignal\.com https:\/\/api\.onesignal\.com/,
  );
  assert.match(worker, /missing-shift:/);
  assert.match(worker, /incidentAlerts/);
  assert.match(worker, /finance-deviation:/);
  assert.match(worker, /НА ЭТОМ УСТРОЙСТВЕ/);
  assert.doesNotMatch(worker, /App API Key|dashboard\.onesignal\.com/);
  assert.match(worker, /async scheduled\(/);
  assert.match(worker, /searchParams\.get\("token"\)/);
  assert.deepEqual(JSON.parse(workerConfig).triggers?.crons, ["0 * * * *"]);
  assert.match(pushMigration, /CREATE TABLE `notification_preferences`/);
  assert.match(pushMigration, /CREATE TABLE `notification_deliveries`/);
  assert.match(notificationAutomationMigration, /incident_alerts/);
  assert.match(notificationAutomationMigration, /last_run_at/);
  assert.match(notificationsClient, /https:\/\/cdn\.onesignal\.com\/sdks\/web\/v16\/OneSignalSDK\.page\.js/);
  assert.match(notificationsClient, /id = "onesignal-sdk"/);
  assert.match(notificationsClient, /45_000/);
  assert.match(notificationsClient, /safeRequestMessage/);
  assert.match(notificationsClient, /ONESIGNAL_SCRIPT_LOAD_FAILED/);
  assert.match(notificationsClient, /isSdkAlreadyInitializedError/);
  assert.match(notificationsClient, /if \(!initStarted\) fail/);
  assert.match(notificationsClient, /if \(!isSdkAlreadyInitializedError\(error\)\)/);
  assert.match(notificationsClient, /Notification\.requestPermission/);
  const enablePushStart = notificationsClient.indexOf("async function enablePush");
  const enablePushEnd = notificationsClient.indexOf("async function disablePush", enablePushStart);
  const enablePushSource = notificationsClient.slice(enablePushStart, enablePushEnd);
  assert.ok(enablePushStart >= 0 && enablePushEnd > enablePushStart);
  assert.ok(
    enablePushSource.indexOf("Notification.requestPermission")
      < enablePushSource.indexOf("activatePushForAccount"),
    "the iOS permission request must run before asynchronous account activation",
  );
  assert.ok(
    enablePushSource.indexOf("Notification.requestPermission")
      < enablePushSource.indexOf("ensureSdk"),
    "the native iOS permission request must run before OneSignal initialization",
  );
  const activateStart = notificationsClient.indexOf("async function activatePushForAccount");
  const activateEnd = notificationsClient.indexOf("function ensureSdk", activateStart);
  const activateSource = notificationsClient.slice(activateStart, activateEnd);
  assert.ok(activateStart >= 0 && activateEnd > activateStart);
  assert.ok(
    activateSource.indexOf("OneSignal.login") < activateSource.indexOf("PushSubscription.optIn"),
    "the account must be identified before opting its push subscription in",
  );
  const inspectSdkStart = notificationsClient.indexOf("async function inspectSdkIfAvailable");
  const inspectSdkEnd = notificationsClient.indexOf("async function enablePush", inspectSdkStart);
  const inspectSdkSource = notificationsClient.slice(inspectSdkStart, inspectSdkEnd);
  assert.match(inspectSdkSource, /isIos\(\) && permissionState\(\) === "default"/);
  assert.match(inspectSdkSource, /shouldResumeConnection/);
  assert.match(inspectSdkSource, /activatePushForAccount/);
  assert.match(notificationsClient, /state\.config\.serverConfigured/);
  assert.match(notificationsClient, /ONESIGNAL_WEB_NOT_CONFIGURED/);
  assert.match(notificationsClient, /api\.onesignal\.com\/sync/);
  assert.match(notificationsClient, /display-mode: standalone/);
  assert.match(notificationsClient, /\/api\/notifications\/test/);
  assert.match(notificationsClient, /state\.categories/);
  assert.match(notificationsClient, /lastRunAt/);
  assert.match(notificationsClient, /OneSignal\.init/);
  assert.match(notificationsClient, /OneSignalSDKWorker\.js/);
  assert.match(notificationsCss, /overflow-wrap: anywhere/);
  assert.match(oneSignalWorker, /cdn\.onesignal\.com\/sdks\/web\/v16\/OneSignalSDK\.sw\.js/);
  assert.match(runtimeWorkerLoader, /cdn\.onesignal\.com\/sdks\/web\/v16\/OneSignalSDK\.sw\.js/);
  assert.ok(appIcon.byteLength > 5_000);
  assert.match(mainBundle, /data-bd-root-splash":"ai-pulse/);
  assert.match(mainBundle, /data-bd-splash":"ai-pulse/);
  assert.match(mainBundle, /Заведение под контролем/);
  assert.match(mainBundle, /data-bd-brand-splash":"v159/);
  assert.match(mainBundle, /data-bd-brand-mark":"cloche-pulse-v159/);
  assert.match(mainBundle, /"data-bd-health-startup-machine":"v155"/);
  assert.match(mainBundle, /setTimeout\(\(\)=>I\(!0\),2700\)/);
  assert.match(
    mainBundle,
    /textShadow:"0 0 22px rgba\(255,255,255,0\.16\)"},children:"Bar"/,
  );
  assert.match(mainBundle, /\/warehouse\?add=inventory/);
  assert.match(mainBundle, /data-bd-warehouse-version":"product-cards-v78/);
  assert.match(mainBundle, /function bdWarehouseProductSheet/);
  assert.match(mainBundle, /\/api\/inventory\/products/);
  assert.match(mainBundle, /Открыть карточку/);
  assert.match(warehouseCss, /\.bd-warehouse-product-sheet/);
  assert.match(mainBundle, /Провести инвентаризацию/);
  assert.match(mainBundle, /Корректировка по факту/);
  assert.match(mainBundle, /\/finance\/settings\?section=utilities/);
  assert.match(mainBundle, /children:e\+" — сумма за месяц \(₽\)"/);
  assert.match(mainBundle, /Фиксированная сумма за месяц/);
  assert.match(mainBundle, /Внести суммы остатков/);
  assert.match(mainBundle, /data-bd-health-index":"split-diagnostic-v19/);
  assert.match(mainBundle, /bdHomeVisualVersion="home-v151"/);
  assert.match(mainBundle, /data-bd-home-daily":"v151/);
  assert.match(mainBundle, /data-bd-opportunity-entry":"home-v151/);
  assert.match(mainBundle, /data-bd-competitors-entry":"home-v151/);
  assert.doesNotMatch(mainBundle, /data-bd-home-sections":"v18/);
  assert.match(
    mainBundle,
    /bdHealthQualityVersion="split-quality-and-state-v19"/,
  );
  assert.match(mainBundle, /children:"Качество данных"/);
  assert.match(mainBundle, /children:"Состояние заведения"/);
  assert.doesNotMatch(mainBundle, /Данные отдельно от оценки/);
  assert.match(mainBundle, /Количество гостей не ведётся — это необязательный показатель/);
  assert.match(mainBundle, /bdHealthWeights=\{finance:35,staff:20/);
  assert.match(mainBundle, /catalog-and-attendance-v9/);
  assert.match(mainBundle, /equipment:pce\(e,t,o\.equipment\)/);
  assert.match(mainBundle, /guests:hce\(e,t,r\)/);
  assert.match(mainBundle, /guests:\{label:"Посещаемость",labelShort:"Посещ\."\}/);
  assert.match(mainBundle, /bdQuickEventsVersion="structured-v10"/);
  assert.match(
    mainBundle,
    /bdQuickEventCategoryIds=\["equipment","complaint","conflict","supplier","inspection","idea"\]/,
  );
  assert.match(mainBundle, /Что хотите зафиксировать\?/);
  assert.match(mainBundle, /Выручка, расходы, закупки и списания/);
  assert.match(mainBundle, /Ответственный выбирается из сотрудников заведения/);
  assert.match(mainBundle, /participantIds:T,equipmentId:Y\?\.id/);
  const quickCategoryStart = mainBundle.indexOf("bdQuickEventCategoryIds=");
  const quickCategoryEnd = mainBundle.indexOf(",Zle=", quickCategoryStart);
  assert.ok(quickCategoryStart >= 0 && quickCategoryEnd > quickCategoryStart);
  assert.doesNotMatch(
    mainBundle.slice(quickCategoryStart, quickCategoryEnd),
    /finance|operations|inventory|maintenance|writeoff/,
  );
  assert.match(mainBundle, /bdEmployeeSelectorsVersion="team-v11"/);
  assert.match(mainBundle, /Сотрудники — участники/);
  assert.match(mainBundle, /Сотрудник заведения/);
  assert.match(mainBundle, /Нет активных сотрудников для назначения/);
  assert.doesNotMatch(mainBundle, /placeholder:"Имя сотрудника"/);
  assert.doesNotMatch(mainBundle, /placeholder:"Имя сотрудника или роль"/);
  assert.doesNotMatch(mainBundle, /placeholder:"Имя или должность"/);
  assert.match(mainBundle, /bdWorkflowVersion="daily-close-v17"/);
  assert.match(mainBundle, /bdWorkflowCopyVersion="daily-close-v17"/);
  assert.match(mainBundle, /bdTaskPersistenceVersion="cloud-v32"/);
  assert.match(mainBundle, /bdHomeDailyVersion="daily-v18"/);
  assert.match(mainBundle, /data-bd-home-daily":"v151/);
  assert.match(mainBundle, /data-bd-home-header":"v151/);
  assert.match(mainBundle, /data-bd-home-today":"v151/);
  assert.match(mainBundle, /label:"График работы"/);
  assert.match(mainBundle, /label:"Статус заведения"/);
  assert.match(mainBundle, /label:"Смена"/);
  assert.match(mainBundle, /label:"Отчёт за смену"/);
  assert.match(mainBundle, /Закрыть смену/);
  assert.match(mainBundle, /Проверить смену/);
  assert.match(mainBundle, /data-bd-home-money":"result-v151/);
  assert.match(mainBundle, /Финансовый результат/);
  assert.match(mainBundle, /Закупки и расходы/);
  assert.match(mainBundle, /data-bd-home-attention":"universal-v198/);
  assert.match(mainBundle, /bdPlanDistributionVersion="distribution-v31"/);
  assert.match(mainBundle, /Ошибки и риски в данных/);
  assert.doesNotMatch(mainBundle, /Зафиксируйте первый инцидент/);
  assert.match(mainBundle, /Не заполнены отчёты по сменам/);
  assert.match(mainBundle, /h\.length&&C&&j\.push/);
  assert.match(mainBundle, /Нужно обновить остатки/);
  assert.match(mainBundle, /!m\.ready&&C&&j\.push/);
  assert.match(mainBundle, /Оборудование требует внимания/);
  assert.match(mainBundle, /Есть просроченные поручения/);
  assert.doesNotMatch(mainBundle, /data-bd-setup-checklist":"open-v31/);
  assert.doesNotMatch(mainBundle, /data-bd-home-sections":"v18/);
  assert.doesNotMatch(mainBundle, /Основные разделы/);
  assert.match(mainBundle, /data-bd-home-ai":"attention-v197/);
  assert.match(mainBundle, /data-bd-home-context":"v151/);
  assert.match(mainBundle, /data-bd-opportunity-entry":"home-v151/);
  assert.match(mainBundle, /data-bd-competitors-entry":"home-v151/);
  const homeDailyStart = mainBundle.indexOf("function bdHomeDaily(");
  const homeDailyEnd = mainBundle.indexOf("function Dce()", homeDailyStart);
  assert.ok(homeDailyStart >= 0 && homeDailyEnd > homeDailyStart);
  const homeDailySource = mainBundle.slice(homeDailyStart, homeDailyEnd);
  const homeOrder = [
    "i.jsx(bdHomeHealthIndexV200",
    "i.jsx(bdHomeMoneyCard",
    "i.jsx(bdHomeTodayCard",
    "i.jsx(bdHomeAttention",
    "i.jsx(bdHomeFreshAi",
    "i.jsx(bdHomeContextCardsV151",
  ].map((token) => homeDailySource.indexOf(token));
  assert.ok(homeOrder.every((position) => position >= 0));
  assert.deepEqual([...homeOrder].sort((a, b) => a - b), homeOrder);
  assert.match(mainBundle, /bdAiEvidenceVersion="evidence-and-proposals-v32"/);
  assert.match(mainBundle, /bdUnifiedAiContextVersion="venue-ai-context-v45"/);
  assert.match(mainBundle, /bdDiagnosisSpecificityVersion="diagnosis-specificity-v46"/);
  assert.match(mainBundle, /bdDiagnosisFinancialCoreVersion="closed-month-management-v48"/);
  assert.match(mainBundle, /bdDiagnosisFinancialFOTVersion="financial-fot-v49"/);
  assert.match(mainBundle, /bdRecommendationOutcomeVersion="recommendation-outcomes-v50"/);
  assert.match(mainBundle, /bdRecommendationConfidenceVersion="confidence-reason-v51"/);
  assert.match(mainBundle, /bdAIDoctorAttentionVersion="attention-v196"/);
  assert.match(mainBundle, /bdAIDoctorFollowThroughVersion="attention-v197"/);
  assert.match(mainBundle, /bdAIDoctorUniversalVersion="attention-v198"/);
  assert.match(mainBundle, /bdAIDoctorRuntimeVersion="attention-v199"/);
  assert.match(mainBundle, /bdHomeHealthIndexVersion="home-health-v200"/);
  assert.match(mainBundle, /data-bd-home-health-index":"hero-v200/);
  assert.match(mainBundle, /children:"Индекс здоровья"/);
  assert.match(mainBundle, /onClick:\(\)=>t\("\/health"\)/);
  assert.match(mainBundle, /IC="bd_ai_diagnosis_v9"/);
  assert.match(mainBundle, /data-bd-diagnosis-loading":"guided-v47/);
  assert.match(mainBundle, /children:"Формируем диагноз"/);
  assert.match(mainBundle, /children:"Результат откроется автоматически"/);
  const diagnosisLoaderStart = mainBundle.indexOf("const WM=");
  const diagnosisLoaderEnd = mainBundle.indexOf("const $h=", diagnosisLoaderStart);
  assert.ok(diagnosisLoaderStart >= 0 && diagnosisLoaderEnd > diagnosisLoaderStart);
  const diagnosisLoaderSource = mainBundle.slice(diagnosisLoaderStart, diagnosisLoaderEnd);
  assert.doesNotMatch(diagnosisLoaderSource, /Analyzing restaurant data/);
  assert.doesNotMatch(diagnosisLoaderSource, /This usually takes only a few seconds/);
  assert.doesNotMatch(diagnosisLoaderSource, /bardoctor-logo\.png/);
  assert.match(diagnosisLoaderSource, /\.bd-sync-indicator\{display:none!important\}/);
  assert.match(mainBundle, /data-bd-ai-result":"attention-v199/);
  assert.match(mainBundle, /data-bd-ai-attention":"runtime-v199/);
  assert.match(mainBundle, /function bdAIDoctorNormalizeV199\(/);
  assert.match(mainBundle, /children:"Что делать сейчас"/);
  assert.match(mainBundle, /title:"В работе"/);
  assert.match(mainBundle, /title:"Возможности"/);
  assert.match(mainBundle, /children:"Качество данных"/);
  assert.match(mainBundle, /children:\["История AI Doctor"/);
  assert.match(mainBundle, /className:"bd-ai-why"/);
  assert.match(mainBundle, /children:\["Почему\?"/);
  assert.match(mainBundle, /children:"Факт: "/);
  assert.match(mainBundle, /children:"Причина: "/);
  assert.match(mainBundle, /children:"Подтверждённость: "/);
  assert.match(mainBundle, /children:"Проверка: "/);
  assert.match(mainBundle, /"Подготовить задачу"/);
  assert.match(mainBundle, /className:"bd-ai-compact-action"/);
  assert.match(mainBundle, /u\.fact\?" — "\+u\.fact:""/);
  assert.match(mainBundle, /data-bd-financial-assessment":"financial-fot-v49/);
  assert.match(mainBundle, /children:\["ФОТ · "/);
  assert.match(mainBundle, /Сопоставляем прибыль, ФОТ и расходы/);
  assert.match(mainBundle, /children:"Итог закрытого месяца"/);
  assert.match(mainBundle, /children:"Управленческий вывод"/);
  assert.match(mainBundle, /children:"Открыть отчёт →"/);
  assert.match(mainBundle, /children:"Обновить анализ"/);
  assert.match(bootstrap, /data-bd-review-recommendation-task/);
  assert.match(bootstrap, /Проверить предложение/);
  assert.match(mainBundle, /bdNextTasks=bdNormalizeTasks/);
  assert.match(mainBundle, /approvalStatus:"pending"/);
  assert.match(mainBundle, /qr\(IC,n\)\.catch/);
  assert.match(mainBundle, /bdSavedDiagnosis=WS\(\)/);
  assert.match(mainBundle, /bdHomeCloudReady&&bdSetHomeDiagnosis\(WS\(\)\)/);
  assert.match(mainBundle, /xr\(IC\)/);
  assert.match(mainBundle, /aiGenerated:!0/);
  assert.match(mainBundle, /knownEmployees:/);
  assert.match(mainBundle, /"Предложение агента":"Поручение от AI"/);
  assert.match(mainBundle, /bdReviewEvidenceUiVersion="review-evidence-v27"/);
  assert.match(mainBundle, /children:\["Основание: ",r\.basisSummary/);
  assert.match(mainBundle, /t\.hasEnoughData&&t\.coveragePercent>=60/);
  assert.match(mainBundle, /Number\(e\.cachedAt\|\|0\)>=n/);
  assert.match(mainBundle, /data-bd-bottom-nav":"responsive-v54/);
  assert.match(mainBundle, /gridTemplateColumns:"repeat\(6,minmax\(0,1fr\)\)"/);
  assert.match(
    homeVisualCss,
    /linear-gradient\(145deg, #11162f 0%, #1a234d 64%, #262f6a 100%\)/,
  );
  assert.match(mainBundle, /name:"Смены",href:"\/shifts"/);
  assert.match(mainBundle, /name:"Финансы",href:"\/finance"/);
  assert.match(mainBundle, /name:"Добавить",icon:Vt,action:!0/);
  assert.doesNotMatch(mainBundle, /name:"Склад",href:"\/warehouse",icon:PA/);
  assert.doesNotMatch(mainBundle, /m\.key==="warehouse"\?e==="\/warehouse"/);
  assert.match(mainBundle, /\["\/reports","\/warehouse"\]/);
  assert.match(
    mainBundle,
    /e\.startsWith\("\/salaries"\)&&window\.bdReadNavigationQuery\("return","team"\)==="finance"/,
  );
  assert.match(mainBundle, /"data-bd-nav-key":m\.key/);
  assert.match(mainBundle, /name:"Команда",href:"\/employees"/);
  assert.match(mainBundle, /name:"Ещё",href:"\/more"/);
  assert.match(
    mainBundle,
    /"aria-label":"Назад",className:"w-11 h-11 rounded-full bg-card/,
  );
  assert.match(
    mainBundle,
    /className:"bd-finance-quick-add-fab"/,
  );
  assert.match(mainBundle, /Открыть быстрые финансовые действия/);
  assert.doesNotMatch(mainBundle, /"aria-label":"Добавить операцию",className:"fixed bottom-24 right-6/);
  assert.match(mainBundle, /async function bdLogoutSession\(\)/);
  assert.match(mainBundle, /fetch\(`\$\{hz\}\/logout`/);
  assert.match(mainBundle, /path:"\/market".*component:bdMarketPage/);
  assert.match(mainBundle, /path:"\/opportunities".*component:bdOpportunitiesPage/);
  assert.match(mainBundle, /path:"\/data-control".*component:bdDataControlPage/);
  assert.match(mainBundle, /path:"\/integrations".*component:bdIntegrationsPage/);
  assert.match(mainBundle, /path:"\/notifications".*component:bdNotificationsPage/);
  assert.doesNotMatch(mainBundle, /path:"\/reset",component:iEe/);
  assert.doesNotMatch(mainBundle, /path:"\/design-system",component:rEe/);
  assert.match(mainBundle, /"aria-label":"Записать происшествие"/);
  assert.match(mainBundle, /"aria-label":"Назад к оборудованию"/);
  assert.doesNotMatch(mainBundle, /"aria-label":"Назад к диагностике"/);
  assert.match(worker, /frame-ancestors 'self'/);
  assert.match(worker, /X-Frame-Options[\s\S]*SAMEORIGIN/);
  assert.match(mainBundle, /name:"Добавить покупку",description:"Товары, услуги или другие затраты",href:"\/suppliers\?create=1"/);
  assert.match(mainBundle, /description:"Внести выручку и состав команды",href:"\/shifts\?closeShift=1"/);
  assert.match(mainBundle, /data-bd-shifts-page":"v158/);
  assert.match(mainBundle, /path:"\/shifts"/);
  assert.match(mainBundle, /Закрытие и история рабочих смен/);
  assert.match(mainBundle, /description:"Назначить задачу сотруднику",href:"\/tasks\?new=1"/);
  assert.doesNotMatch(mainBundle, /href:"\/decisions"/);
  assert.doesNotMatch(mainBundle, /path:"\/decisions"/);
  assert.match(bootstrap, /window\.location\.pathname === "\/decisions"/);
  assert.doesNotMatch(mainBundle, /children:\["Рынок рядом"/);
  assert.match(
    mainBundle,
    /const QI=\[\{icon:Dn,label:"Оборудование".*label:"Отзывы гостей".*label:"Поставщики"/,
  );
  const moreMenuStart = mainBundle.indexOf("const QI=");
  const moreMenuEnd = mainBundle.indexOf("function JI", moreMenuStart);
  assert.ok(moreMenuStart >= 0 && moreMenuEnd > moreMenuStart);
  const moreMenu = mainBundle.slice(moreMenuStart, moreMenuEnd);
  assert.doesNotMatch(moreMenu, /label:"Зарплаты"|label:"Правила оплаты"|label:"Склад"/);
  const homePageStart = mainBundle.indexOf("function Dce()");
  const homePageEnd = mainBundle.indexOf("const q7=", homePageStart);
  assert.ok(homePageStart >= 0 && homePageEnd > homePageStart);
  const homePage = mainBundle.slice(homePageStart, homePageEnd);
  assert.match(homePage, /bdHomeDaily/);
  assert.doesNotMatch(
    homePage,
    /wce|Sce|kce|Mce|Pce|bdHomeCommandCenter/,
  );
  assert.match(mainBundle, /Закройте завершённую смену/);
  assert.match(mainBundle, /Выручка, команда, списания и происшествия/);
  assert.match(mainBundle, /Сохранить факт в журнале и AI-анализе/);
  assert.match(mainBundle, /Журнал происшествий/);
  assert.match(mainBundle, /Создать поручение по этой записи/);
  assert.match(mainBundle, /bd_tasks:bdLoadTasks\(\)/);
  assert.match(mainBundle, /bdTaskLifecycleVersion="proposals-v32"/);
  assert.match(mainBundle, /data-bd-task-actions":"proposal-v32"/);
  assert.match(mainBundle, /label:"Предложенные"/);
  assert.match(mainBundle, /children:"Утвердить"/);
  assert.match(mainBundle, /children:"Редактировать"/);
  assert.match(mainBundle, /children:"Удалить"/);
  assert.match(mainBundle, /children:"В работу"/);
  assert.match(mainBundle, /children:"Выполнить"/);
  assert.match(mainBundle, /children:"Отменить"/);
  assert.match(mainBundle, /label:"История"/);
  assert.match(mainBundle, /actionTaskId:bdActionTask\.id/);
  assert.match(mainBundle, /bdTaskHydratedRef=S\.useRef\(!1\)/);
  assert.match(mainBundle, /onInput:b=>g\(b\.currentTarget\.value\)/);
  assert.match(mainBundle, /style:\{zIndex:75,backdropFilter:/);
  const taskLifecycleStart = mainBundle.indexOf(
    'const bdTaskLifecycleVersion="proposals-v32"',
  );
  const taskLifecycleEnd = mainBundle.indexOf("function So(", taskLifecycleStart);
  assert.ok(taskLifecycleStart >= 0 && taskLifecycleEnd > taskLifecycleStart);
  const taskLifecycle = mainBundle.slice(taskLifecycleStart, taskLifecycleEnd);
  assert.doesNotMatch(taskLifecycle, /drag:"x"/);
  assert.match(taskLifecycle, /approvalStatus:"deleted",hidden:!0/);
  assert.match(mainBundle, /Закройте смену или зафиксируйте отдельное происшествие/);
  const homeWorkflowStart = mainBundle.indexOf(
    'const bdWorkflowVersion="daily-close-v17"',
  );
  const homeWorkflowEnd = mainBundle.indexOf("function Pce(", homeWorkflowStart);
  assert.ok(homeWorkflowStart >= 0 && homeWorkflowEnd > homeWorkflowStart);
  const homeWorkflow = mainBundle.slice(homeWorkflowStart, homeWorkflowEnd);
  assert.doesNotMatch(homeWorkflow, /label:"Дело"|href:"\/cases\/add"|label:"Задача"/);
  assert.match(homeWorkflow, /label:"Закрыть смену"/);
  assert.match(homeWorkflow, /href:"\/shifts\?closeShift=1"/);
  assert.match(homeWorkflow, /label:"Происшествие"/);
  assert.doesNotMatch(homeWorkflow, /label:"Поручение"/);
  assert.match(mainBundle, /bdShiftClosingVersion="guided-v17"/);
  assert.match(mainBundle, /data-bd-shift-closing":"guided-v17/);
  assert.match(mainBundle, /Ежедневное закрытие смены/);
  assert.match(
    mainBundle,
    /steps=\["Выручка","Команда","Списания","Происшествия","Проверка"\]/,
  );
  assert.match(mainBundle, /ФОТ смены · автоматически/);
  assert.match(mainBundle, /Происшествий не указано/);
  assert.match(mainBundle, /Результат смены/);
  assert.match(mainBundle, /до себестоимости проданного товара/);
  assert.match(
    mainBundle,
    /Закупки и накопительные расходы не привязаны к смене/,
  );
  assert.match(
    mainBundle,
    /Налоги и коммунальные услуги распределяются автоматически по графику заведения/,
  );
  assert.match(mainBundle, /new CustomEvent\("bd:shift-closed"/);
  assert.match(mainBundle, /category:"writeoff"/);
  assert.match(mainBundle, /participantIds:ye\.participantIds/);
  assert.match(mainBundle, /\.get\("closeShift"\)==="1"/);
  assert.match(mainBundle, /title:[A-Za-z_$][\w$]*\?"Смена обновлена":"Смена закрыта"/);
  assert.match(mainBundle, /Отсутствующие категории не получают 50 или другой условный балл/);
  assert.match(mainBundle, /Состояние рассчитывается по реальным оценкам доступных направлений/);
  assert.match(mainBundle, /Настройка периодичности остатков/);
  assert.match(mainBundle, /Не внесены остатки на начало текущего месяца/);
  assert.match(mainBundle, /data-bd-finance-results":"unified-v16/);
  assert.match(mainBundle, /data-bd-finance-result-card/);
  assert.match(mainBundle, /Денежный результат после оплат/);
  assert.match(mainBundle, /Операционный результат до себестоимости/);
  assert.match(mainBundle, /Финансовый результат месяца/);
  assert.match(mainBundle, /data-bd-nowrap-money/);
  assert.doesNotMatch(mainBundle, /Денежный результат · 1 из 3/);
  assert.doesNotMatch(mainBundle, /[123] · (?:Денежный|Предварительный|Финальная)/);
  assert.match(mainBundle, /bdMonthClosingVersion="wizard-v20"/);
  assert.match(mainBundle, /data-bd-month-closing":"wizard-v20/);
  assert.match(mainBundle, /bd_month_closings/);
  assert.match(mainBundle, /Мастер закрытия месяца/);
  assert.match(mainBundle, /Проверка всех смен/);
  assert.match(mainBundle, /Оплаты и остальные расходы/);
  assert.match(mainBundle, /Начальные остатки/);
  assert.match(mainBundle, /Конечные остатки/);
  assert.match(mainBundle, /ФОТ, налоги и коммунальные услуги/);
  assert.match(mainBundle, /Подтверждение и закрытие периода/);
  assert.match(mainBundle, /Денежный результат после оплат/);
  assert.match(mainBundle, /Результат до себестоимости/);
  assert.match(mainBundle, /Финальная прибыль месяца/);
  assert.match(mainBundle, /Показать операции/);
  assert.match(mainBundle, /Подтвердить и закрыть период/);
  assert.match(
    mainBundle,
    /Выручка − оплаты поставщикам − начисленный ФОТ − списания − остальные расходы − налоги − коммунальные услуги/,
  );
  assert.match(
    mainBundle,
    /Начальные остатки \+ закупки − конечные остатки − списания/,
  );
  assert.match(mainBundle, /cashResult:tt-bdPurchaseCashOutflow/);
  assert.match(mainBundle, /data-bd-expense-breakdown":"period-v5/);
  assert.match(mainBundle, /data-bd-shift-result":"period-v4/);
  const shiftResultStart = mainBundle.indexOf('data-bd-shift-result":"period-v4');
  const shiftResultEnd = mainBundle.indexOf(",u.note&&i.jsx", shiftResultStart);
  assert.ok(shiftResultStart >= 0 && shiftResultEnd > shiftResultStart);
  assert.doesNotMatch(
    mainBundle.slice(shiftResultStart, shiftResultEnd),
    /Прочие расходы|Накопительные расходы/,
  );
  assert.match(mainBundle, /data-bd-recurring-impact":"current/);
  assert.match(mainBundle, /Результат смены/);
  assert.doesNotMatch(mainBundle, /Закупки запасов в расчёт этой смены не входят/);
  assert.doesNotMatch(mainBundle, /Закупки запасов — справочно/);
  assert.doesNotMatch(mainBundle, /Закупки — это пополнение общего запаса заведения/);
  assert.match(mainBundle, /Расходы за период/);
  assert.match(mainBundle, /function bdPeriodExpenseBreakdown/);
  assert.match(mainBundle, /function bdExpenseArea/);
  assert.match(mainBundle, /function bdExpenseArea\(e\).*repairs:"Ремонт"/);
  assert.match(mainBundle, /rent:"Аренда",repairs:"Ремонт",equipment:"Оборудование"/);
  assert.match(mainBundle, /household:"Хоз\.товары"/);
  assert.match(mainBundle, /hookah:"Кальяны"/);
  assert.match(mainBundle, /"consumables","hookah"/);
  const financeSummaryStart = mainBundle.indexOf("function B2(");
  const financeSummaryEnd = mainBundle.indexOf("function kAe(", financeSummaryStart);
  assert.ok(financeSummaryStart >= 0 && financeSummaryEnd > financeSummaryStart);
  assert.doesNotMatch(
    mainBundle.slice(financeSummaryStart, financeSummaryEnd),
    /Закупки за период/,
  );
  assert.match(mainBundle, /Dt=tt-vt-Ct-je/);
  assert.doesNotMatch(mainBundle, /Dt=tt-vt-Ct-Nt-je/);
  assert.match(mainBundle, /tt=y-k-q-O-\(ae\?B\+U:\$\)/);
  assert.match(mainBundle, /JSON\.stringify\(\{data:n,baseData:r\}\)/);
  assert.match(mainBundle, /Object\.prototype\.hasOwnProperty\.call\(a,"data"\)/);
  assert.match(mainBundle, /inventoryMismatch:bdInventoryMismatch/);
  assert.match(mainBundle, /Остатки не сходятся/);
  assert.match(mainBundle, /"aria-label":"Дата смены"/);
  assert.match(mainBundle, /"aria-label":"Количество чеков"/);
  assert.match(mainBundle, /Что списали и почему \*/);
  assert.match(mainBundle, /"aria-label":"Дата расхода"/);
  assert.match(mainBundle, /"aria-label":"Сумма расхода, ₽"/);
  assert.match(mainBundle, /"aria-label":d==="writeoff"\?"Причина списания":"Описание расхода"/);
  assert.match(mainBundle, /В результате завершённого месяца учтена полная сумма/);
  assert.match(mainBundle, /Операционный результат по сменам/);
  assert.doesNotMatch(mainBundle, /Ориентир по чистым деньгам смен/);
  assert.match(mainBundle, /function bdMonthClosingMoney\(e\)\{return bdMoney2\(Number\(e\)\|\|0\)\}/);
  assert.doesNotMatch(mainBundle, /function bdMonthClosingMoney\(e\)\{return bdMoney2\(Number\(e\)\|\|0\)\+" ₽"\}/);
  assert.match(mainBundle, /Открыть закрытый месяц\? После этого данные периода снова можно будет изменять\./);
  assert.match(mainBundle, /\+ Создать правило оплаты/);
  assert.match(mainBundle, /"aria-label":"Дата инвентаризации"/);
  assert.match(mainBundle, /"aria-label":"Сумма зарплатной операции, ₽"/);
  assert.match(mainBundle, /"aria-label":"Правило оплаты сотрудника"/);
  assert.match(mainBundle, /s\?"button":"div"/);
  assert.match(
    mainBundle,
    /e==="final"\|\|t\.periodPast\?t\.taxes:t\.allocatedTaxes/,
  );
  assert.match(
    mainBundle,
    /Себестоимость проданного товара ещё не вычтена/,
  );
  assert.doesNotMatch(mainBundle, /Общий балл — среднее по категориям, где есть данные/);
  assert.doesNotMatch(mainBundle, /r\.length<8/);
  assert.match(mainBundle, /Все завершённые смены текущего месяца учтены/);
  assert.doesNotMatch(mainBundle, /коммуналка/i);
  assert.doesNotMatch(mainBundle, /Diagnose\. Improve\. Grow\./);
  assert.match(mainBundle, /data-bd-auth":"split-v1/);
  assert.match(mainBundle, /function bdAuthField/);
  assert.match(mainBundle, /className:"bd-auth-trailing"/);
  assert.match(mainBundle, /Войдите в BarDoctor/);
  assert.match(mainBundle, /Создайте аккаунт/);
  const loginStart = mainBundle.indexOf("function kle()");
  const loginEnd = mainBundle.indexOf("function Gd(", loginStart);
  const registerStart = mainBundle.indexOf("function Dle()");
  const registerEnd = mainBundle.indexOf("const N7=", registerStart);
  assert.ok(loginStart >= 0 && loginEnd > loginStart);
  assert.ok(registerStart >= 0 && registerEnd > registerStart);
  assert.doesNotMatch(mainBundle.slice(loginStart, loginEnd), /leftIcon/);
  assert.doesNotMatch(mainBundle.slice(loginStart, loginEnd), /bdAuthBack/);
  assert.doesNotMatch(mainBundle.slice(registerStart, registerEnd), /leftIcon/);
  assert.match(authCss, /bd-auth-split-v1/);
  assert.match(authCss, /grid-template-columns:minmax\(520px,42%\)/);
  assert.match(authCss, /@media \(max-width:899px\)/);
  assert.match(authCss, /\.bd-auth-showcase\{display:block;order:-1/);
  assert.match(authCss, /\.bd-auth-form-panel\{min-height:calc\(100dvh - 200px\);margin-top:-28px/);
  assert.doesNotMatch(authCss, /\.bd-auth-showcase\{display:none\}/);
  assert.ok(authVenueBackground.byteLength > 100_000);
  assert.match(integrationsClient, /\/api\/integration-hub/);
  assert.match(integrationsClient, /\/api\/reviews\/sources/);
  assert.doesNotMatch(integrationsClient, /input\[type="password"\]/);
  assert.doesNotMatch(integrationsClient, /Включено в подписку/);
  assert.doesNotMatch(integrationsClient, /В этом месяце использовано|Осталось:|data\.aiUsage/);
  assert.doesNotMatch(integrationsClient, /Сохранить OneSignal/);
  assert.equal(JSON.parse(hosting).d1, "DB");
  assert.equal(JSON.parse(hosting).r2, "BUCKET");
  assert.match(coreMigration, /CREATE TABLE `accounts`/);
  assert.match(coreMigration, /CREATE TABLE `domain_data`/);
  assert.match(coreMigration, /CREATE TABLE `sessions`/);
  assert.match(integrationsMigration, /CREATE TABLE `google_connections`/);
  assert.match(integrationsMigration, /CREATE TABLE `oauth_states`/);
  assert.match(integrationsMigration, /CREATE TABLE `review_source_events`/);
  assert.match(secretsMigration, /CREATE TABLE `integration_secrets`/);
  assert.match(secretsMigration, /integration_secrets_account_key_uq/);
  assert.match(aiUsageMigration, /CREATE TABLE `ai_usage_limits`/);
  assert.match(aiUsageMigration, /`request_limit` integer DEFAULT 20 NOT NULL/);
  assert.match(aiSubscriptionMigration, /`request_limit` integer DEFAULT 250 NOT NULL/);
  assert.match(aiSubscriptionMigration, /`period_key` text DEFAULT 'legacy' NOT NULL/);
  assert.match(aiSubscriptionMigration, /SELECT "account_id", "used_requests", "request_limit", 'legacy'/);
  assert.match(authIsolationMigration, /DROP INDEX `accounts_chatgpt_email_uq`/);
  assert.match(authIsolationMigration, /ADD `password_hash` text/);
  assert.match(platformSecretsMigration, /CREATE TABLE `platform_secrets`/);
  assert.match(platformSecretsMigration, /ON DELETE set null/);
  assert.match(integrationHubMigration, /CREATE TABLE `integration_connections`/);
  assert.match(integrationHubMigration, /CREATE UNIQUE INDEX `integration_entity_links_external_uq`/);
  assert.match(integrationHubMigration, /CREATE TABLE `integration_sync_runs`/);
  assert.match(integrationHubSourceMigration, /CREATE UNIQUE INDEX `integration_connections_source_uq`/);
  assert.match(universalIntegrationMigration, /CREATE TABLE `integration_ingress_tokens`/);
  assert.match(universalIntegrationMigration, /CREATE TABLE `integration_ingress_deliveries`/);
  assert.match(universalIntegrationMigration, /CREATE TABLE `integration_field_mapping_templates`/);
  assert.match(universalIntegrationMigration, /INTEGRATION_TENANT_MISMATCH/);
  assert.match(localConnectorMigration, /CREATE TABLE `integration_connector_agents`/);
  assert.match(localConnectorMigration, /integration_connector_agents_tenant_guard/);
  assert.match(deliveryRetryMigration, /ADD `attempt_count` integer DEFAULT 1 NOT NULL/);
  assert.match(worker, /verifyPassword/);
  assert.match(worker, /hashPassword/);
});

function dateKey(date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function isWorkingDay(profile, date) {
  const day = date.getDay() === 0 ? 7 : date.getDay();
  return (profile.workingDays ?? {})[day] !== false;
}

function shiftBounds(profile, date) {
  const [openHour, openMinute] = profile.openTime.split(":").map(Number);
  const [closeHour, closeMinute] = profile.closeTime.split(":").map(Number);
  const start = new Date(date);
  start.setHours(openHour, openMinute, 0, 0);
  const end = new Date(date);
  if (closeHour * 60 + closeMinute <= openHour * 60 + openMinute) {
    end.setDate(end.getDate() + 1);
  }
  end.setHours(closeHour, closeMinute, 0, 0);
  return { operatingDate: dateKey(date), start, end };
}

function shiftState(profile, date, now) {
  const bounds = shiftBounds(profile, date);
  if (!isWorkingDay(profile, date)) {
    return { status: "non_working", bounds };
  }
  if (now < bounds.start) return { status: "upcoming", bounds };
  if (now < bounds.end) return { status: "active", bounds };
  return { status: "completed", bounds };
}

async function productionShiftHelpers() {
  const bundle = await readFile(
    new URL("../public/assets/index-BQGspy0I.js", import.meta.url),
    "utf8",
  );
  const start = bundle.indexOf("function Cz(");
  const end = bundle.indexOf("function _z(", start);
  assert.notEqual(start, -1);
  assert.notEqual(end, -1);
  const context = { Rg: isWorkingDay };
  vm.runInNewContext(
    `${bundle.slice(start, end)}\nglobalThis.helpers = { Ig, $g, wo };`,
    context,
  );
  return context.helpers;
}

test("an overnight shift keeps its opening business date through 06:00", async () => {
  const { Ig, $g, wo } = await productionShiftHelpers();
  const venue = {
    openTime: "22:00",
    closeTime: "06:00",
    workingDays: { 1: true, 2: true, 3: true, 4: true, 5: true, 6: true, 7: true },
  };
  const businessDay = new Date(2026, 5, 30, 12, 0, 0);
  const duringShift = new Date(2026, 6, 1, 2, 0, 0);
  const afterShift = new Date(2026, 6, 1, 6, 1, 0);
  const bounds = Ig(venue, businessDay);

  assert.equal(bounds.operatingDate, "2026-06-30");
  assert.equal(bounds.overnight, true);
  assert.equal(bounds.start.getDate(), 30);
  assert.equal(bounds.start.getHours(), 22);
  assert.equal(bounds.end.getDate(), 1);
  assert.equal(bounds.end.getHours(), 6);
  assert.equal($g(venue, businessDay, duringShift).status, "active");
  assert.equal($g(venue, businessDay, afterShift).status, "completed");

  const junePeriod = wo(venue, afterShift, 2026, 6);
  assert.equal(junePeriod.periodEnd.getMonth(), 6);
  assert.equal(junePeriod.periodEnd.getDate(), 1);
  assert.equal(junePeriod.periodEnd.getHours(), 6);
});

function weekStart(date) {
  const result = new Date(date);
  const offset = (date.getDay() + 6) % 7;
  result.setHours(0, 0, 0, 0);
  result.setDate(date.getDate() - offset);
  return result;
}

function inRange(value, start, end) {
  const key = value.slice(0, 10);
  return key >= dateKey(start) && key <= dateKey(end);
}

function summarize(revenue, expenses, start, end) {
  const revenueRows = revenue.filter((row) => inRange(row.date, start, end));
  const expenseRows = expenses.filter((row) => inRange(row.date, start, end));
  const revenueTotal = revenueRows.reduce((sum, row) => sum + row.revenue, 0);
  const receipts = revenueRows.reduce((sum, row) => sum + row.receipts, 0);
  const inventoryPurchases = expenseRows
    .filter((row) => ["products", "alcohol", "food", "consumables"].includes(row.category))
    .reduce((sum, row) => sum + row.amount, 0);
  const otherExpenses = expenseRows
    .filter((row) => !["products", "alcohol", "food", "consumables"].includes(row.category))
    .reduce((sum, row) => sum + row.amount, 0);

  return {
    revenue: revenueTotal,
    receipts,
    inventoryPurchases,
    otherExpenses,
    avgReceipt: receipts > 0 ? Math.round(revenueTotal / receipts) : null,
    cashMovement: revenueTotal - inventoryPurchases - otherExpenses,
    operatingDiff: revenueTotal - inventoryPurchases - otherExpenses,
    guests: null,
    daysWithData: revenueRows.length,
    hasRevenueData: revenueRows.length > 0,
  };
}

async function healthIndexReport(scores, context = {}) {
  const bundle = await readFile(
    new URL("../public/assets/index-BQGspy0I.js", import.meta.url),
    "utf8",
  );
  const start = bundle.indexOf("const jce=");
  const end = bundle.indexOf("function fc(", start);
  assert.notEqual(start, -1);
  assert.notEqual(end, -1);

  function category(id) {
    const score = scores[id] ?? null;
    return {
      id,
      hasData: score !== null,
      score,
      openCount: 0,
      resolvedCount: 0,
      factors: [],
    };
  }

  const sandbox = {
    dc(value) {
      return Math.round(Math.max(0, Math.min(100, value)));
    },
    ql(value) {
      const numeric = Number(value);
      return Number.isFinite(numeric) ? numeric : null;
    },
    Rg() {
      return false;
    },
    $g() {
      return { status: "non_working", bounds: { operatingDate: "" } };
    },
    pce() {
      return category("equipment");
    },
    hce() {
      return category("guests");
    },
    bce() {
      return category("guestExperience");
    },
    yce() {
      return category("staff");
    },
    mce() {
      return category("operations");
    },
    vce() {
      return category("finance");
    },
    xce() {
      return category("maintenance");
    },
    gce() {
      return category("tasks");
    },
  };

  const {
    events = [],
    cases = [],
    employees = [],
    revenue = [],
    expenses = [],
    reviews = [],
    ...inputContext
  } = context;
  const evaluationContext = {
    ...sandbox,
    inputContext,
    inputEvents: events,
    inputCases: cases,
    inputEmployees: employees,
    inputRevenue: revenue,
    inputExpenses: expenses,
    inputReviews: reviews,
  };
  vm.runInNewContext(
    `${bundle.slice(start, end)}\nglobalThis.output = zC(inputEvents, inputCases, inputEmployees, inputRevenue, inputExpenses, inputReviews, inputContext);`,
    evaluationContext,
  );
  return evaluationContext.output;
}

test("data quality is independent from the venue state", async () => {
  const report = await healthIndexReport(
    { finance: 97, staff: 97 },
    {
      employees: [{ id: "employee-1" }],
      revenue: [
        {
          date: "2026-07-18",
          revenue: 1_000,
          receipts: 10,
          staffing: [{ employeeId: "employee-1" }],
        },
      ],
    },
  );
  assert.equal(report.dataQualityPercent, 58);
  assert.equal(report.coveragePercent, 58);
  assert.equal(report.stateScore, null);
  assert.equal(report.overall, null);
  assert.equal(report.hasEnoughData, false);
  assert.match(report.confidenceNote, /качества данных/i);
});

test("missing categories receive no neutral score", async () => {
  const report = await healthIndexReport(
    {
      finance: 90,
      staff: 80,
      operations: 70,
      tasks: 60,
    },
    {
      events: [{ category: "operations" }],
      cases: [{ id: "task-1" }],
      employees: [{ id: "employee-1" }],
      revenue: [
        {
          date: "2026-07-18",
          revenue: 1_000,
          receipts: 10,
          staffing: [{ employeeId: "employee-1" }],
        },
      ],
    },
  );
  assert.equal(report.dataQualityPercent, 73);
  assert.equal(report.stateScore, 81);
  assert.equal(report.overall, 81);
  assert.equal(report.isPreliminary, true);
  assert.equal(report.stateDomainsCount, 3);
});

test("missing scheduled inventory lowers only data quality", async () => {
  const base = {
    events: [{ category: "operations" }],
    cases: [{ id: "task-1" }],
    employees: [{ id: "employee-1" }],
    revenue: [
      {
        date: "2026-07-18",
        revenue: 1_000,
        receipts: 10,
        staffing: [{ employeeId: "employee-1" }],
      },
    ],
  };
  const missingInventory = await healthIndexReport(
    {
      finance: 80,
      staff: 75,
      operations: 70,
      tasks: 65,
    },
    {
      ...base,
      settings: { inventoryFrequency: "monthly" },
      snapshots: [],
    },
  );
  const readyInventory = await healthIndexReport(
    {
      finance: 80,
      staff: 75,
      operations: 70,
      tasks: 65,
    },
    {
      ...base,
      settings: { inventoryFrequency: "monthly" },
      snapshots: [{ date: `${new Date().toISOString().slice(0, 7)}-01` }],
    },
  );
  assert.equal(missingInventory.inventoryReady, false);
  assert.equal(
    readyInventory.dataQualityPercent - missingInventory.dataQualityPercent,
    5,
  );
  assert.equal(readyInventory.stateScore, missingInventory.stateScore);
  assert.match(
    missingInventory.dataDomains.find((domain) => domain.id === "finance").missing.join(" "),
    /остатки/i,
  );
});

async function healthOperationalEvidence(equipment, revenue) {
  const bundle = await readFile(
    new URL("../public/assets/index-BQGspy0I.js", import.meta.url),
    "utf8",
  );
  const start = bundle.indexOf(
    'const bdHealthEvidenceVersion="catalog-and-attendance-v9"',
  );
  const end = bundle.indexOf("function mce(", start);
  assert.notEqual(start, -1);
  assert.notEqual(end, -1);

  const context = {
    equipment,
    revenue,
    ZS: 30 * 24 * 60 * 60 * 1_000,
    dc(value) {
      return Math.round(Math.max(0, Math.min(100, value)));
    },
    Kg() {
      return 70;
    },
    Yg(items) {
      return { openCount: items.length, resolvedCount: 0 };
    },
    ql(value) {
      return typeof value === "number" && Number.isFinite(value) ? value : null;
    },
  };
  vm.runInNewContext(
    `${bundle.slice(start, end)}\nglobalThis.output = { equipment: pce([], [], equipment), attendance: hce([], [], revenue) };`,
    context,
  );
  return context.output;
}

test("health index counts catalog equipment without requiring a maintenance date", async () => {
  const date = dateKey(new Date());
  const evidence = await healthOperationalEvidence(
    [
      {
        id: "speaker-1",
        name: "Аудио колонка",
        status: "working",
        archived: false,
        nextMaintenance: null,
      },
    ],
    [{ date, revenue: 4_834, receipts: 16 }],
  );

  assert.equal(evidence.equipment.hasData, true);
  assert.equal(evidence.equipment.equipmentCount, 1);
  assert.ok(evidence.equipment.score > 0);
  assert.match(evidence.equipment.factors[0].text, /исправное/i);
});

test("health index uses receipts as an attendance estimate when guest count is absent", async () => {
  const date = dateKey(new Date());
  const evidence = await healthOperationalEvidence(
    [],
    [{ date, revenue: 4_834, receipts: 16 }],
  );

  assert.equal(evidence.attendance.hasData, true);
  assert.equal(evidence.attendance.attendanceSource, "receipts");
  assert.equal(evidence.attendance.receiptCount, 16);
  assert.match(evidence.attendance.factors[0].text, /по 16 чекам/i);
});

async function healthShiftCoverage(profile, now, revenue) {
  const bundle = await readFile(
    new URL("../public/assets/index-BQGspy0I.js", import.meta.url),
    "utf8",
  );
  const start = bundle.indexOf("function bdHealthDateKey");
  const end = bundle.indexOf("function bdHealthInventoryStatus", start);
  assert.notEqual(start, -1);
  assert.notEqual(end, -1);

  const context = {
    Rg: isWorkingDay,
    $g: shiftState,
    profile,
    now,
    revenue,
  };
  vm.runInNewContext(
    `${bundle.slice(start, end)}\nglobalThis.output = bdHealthShiftCoverage(profile, revenue, now);`,
    context,
  );
  return context.output;
}

test("health index counts completed shifts only in the current month", async () => {
  const cologne = {
    openTime: "22:00",
    closeTime: "06:00",
    workingDays: {
      1: false,
      2: false,
      3: false,
      4: false,
      5: true,
      6: true,
      7: true,
    },
  };
  const now = new Date(2026, 6, 16, 17, 34);
  const revenue = [
    "2026-07-03",
    "2026-07-04",
    "2026-07-05",
    "2026-07-10",
    "2026-07-11",
    "2026-07-12",
  ].map((date) => ({ date, revenue: 1_000, receipts: 5 }));

  const coverage = await healthShiftCoverage(cologne, now, revenue);
  assert.deepEqual(
    {
      expected: coverage.expected,
      entered: coverage.entered,
      percent: coverage.percent,
    },
    { expected: 6, entered: 6, percent: 100 },
  );
});

async function financeWeekContext(profile, now, revenue, expenses) {
  const bundle = await readFile(
    new URL("../public/assets/index-BQGspy0I.js", import.meta.url),
    "utf8",
  );
  const start = bundle.indexOf("const bdFinanceDayShort=");
  const end = bundle.indexOf("function B2(", start);
  assert.notEqual(start, -1);
  assert.notEqual(end, -1);

  const context = {
    profile,
    now,
    revenue,
    expenses,
    Um: { 1: true, 2: true, 3: true, 4: true, 5: true, 6: true, 7: true },
    $se: [1, 2, 3, 4, 5, 6, 7],
    Rg: isWorkingDay,
    $g: shiftState,
    LS: dateKey,
    ec: weekStart,
    wn: summarize,
  };

  vm.runInNewContext(
    `${bundle.slice(start, end)}\nglobalThis.output = bdFinanceWeekContext(profile, now, revenue, expenses);`,
    context,
  );
  return context.output;
}

test("finance week uses the selected venue schedule and hides unfinished shifts", async () => {
  const cologne = {
    workingDays: {
      1: false,
      2: false,
      3: false,
      4: false,
      5: true,
      6: true,
      7: true,
    },
    openTime: "18:00",
    closeTime: "05:00",
  };
  const context = await financeWeekContext(
    cologne,
    new Date(2026, 6, 15, 15),
    [{ date: "2026-07-12", revenue: 4_834, receipts: 16 }],
    [{ date: "2026-07-15", category: "repairs", amount: 600 }],
  );

  assert.equal(context.scheduledShifts, 3);
  assert.equal(context.completedShifts, 0);
  assert.equal(context.week.hasRevenueData, false);
  assert.equal(context.week.otherExpenses, 600);
  assert.match(context.scheduleLabel, /пт, сб, вс/);
  assert.match(context.nextWorkingLabel, /17/);
});

test("finance week compares only the same completed shifts for any venue schedule", async () => {
  const weekdayVenue = {
    workingDays: {
      1: true,
      2: true,
      3: true,
      4: true,
      5: false,
      6: false,
      7: false,
    },
    openTime: "09:00",
    closeTime: "14:00",
  };
  const context = await financeWeekContext(
    weekdayVenue,
    new Date(2026, 6, 15, 15),
    [
      { date: "2026-07-13", revenue: 1_000, receipts: 5 },
      { date: "2026-07-14", revenue: 1_200, receipts: 6 },
      { date: "2026-07-15", revenue: 1_400, receipts: 7 },
      { date: "2026-07-06", revenue: 900, receipts: 5 },
      { date: "2026-07-07", revenue: 1_000, receipts: 5 },
      { date: "2026-07-08", revenue: 1_100, receipts: 5 },
      { date: "2026-07-09", revenue: 99_000, receipts: 99 },
    ],
    [],
  );

  assert.equal(context.scheduledShifts, 4);
  assert.equal(context.completedShifts, 3);
  assert.equal(context.week.revenue, 3_600);
  assert.equal(context.prevWeek.revenue, 3_000);
  assert.doesNotMatch(context.scheduleLabel, /пт|сб|вс/);
});

async function inventoryAccountingHelpers() {
  const bundle = await readFile(
    new URL("../public/assets/index-BQGspy0I.js", import.meta.url),
    "utf8",
  );
  const start = bundle.indexOf('const bdInventorySnapshotsKey="bd_inventory_snapshots"');
  const end = bundle.indexOf("function bdUseAccountingStore(", start);
  assert.notEqual(start, -1);
  assert.notEqual(end, -1);

  const purchaseDocuments = [];
  const context = {
    Gm(category) {
      return ["products", "alcohol", "food", "consumables", "hookah", "household"].includes(category)
        ? "inventory"
        : "operating";
    },
    bdProcArray(key) {
      return key === "bd_purchase_documents" ? purchaseDocuments : [];
    },
    Rg: isWorkingDay,
    Jl(year, month) {
      return `${year}-${month}`;
    },
  };

  vm.runInNewContext(
    `${bundle.slice(start, end)}\nglobalThis.helpers = { bdBuildMonthlyReport, bdDefaultFinanceSettings };`,
    context,
  );
  return {
    ...context.helpers,
    setPurchaseDocuments(values) {
      purchaseDocuments.splice(0, purchaseDocuments.length, ...values);
    },
  };
}

test("monthly report uses monetary inventory totals without double-counting writeoffs", async () => {
  const { bdBuildMonthlyReport, bdDefaultFinanceSettings, setPurchaseDocuments } =
    await inventoryAccountingHelpers();
  const cologne = {
    name: "Кёльн",
    areas: ["Бар", "Кухня", "Кальяны"],
    workingDays: {
      1: false,
      2: false,
      3: false,
      4: false,
      5: true,
      6: true,
      7: true,
    },
  };
  const settings = {
    ...bdDefaultFinanceSettings(cologne),
    taxModel: { mode: "fixed", amount: 3_000, percent: 0 },
    utilityModel: { mode: "fixed", amount: 1_500, percent: 0 },
  };
  const shiftDates = [
    "2026-06-05",
    "2026-06-06",
    "2026-06-07",
    "2026-06-12",
    "2026-06-13",
    "2026-06-14",
    "2026-06-19",
    "2026-06-20",
    "2026-06-21",
    "2026-06-26",
    "2026-06-27",
    "2026-06-28",
  ];
  const revenue = shiftDates.map((date, index) => ({
    date,
    revenue: index === 0 ? 30_000 : 0,
    receipts: index === 0 ? 100 : 0,
    payrollBreakdown: index === 0 ? { total: 6_000 } : undefined,
  }));
  const expenses = [
    { id: "pay-alcohol", source: "purchase_payment", paymentKind: "supplier_payment", sourceDocumentId: "purchase-alcohol", date: "2026-06-03", category: "alcohol", area: "Бар", amount: 5_000 },
    { id: "pay-food", source: "purchase_payment", paymentKind: "supplier_payment", sourceDocumentId: "purchase-food", date: "2026-06-04", category: "food", area: "Кухня", amount: 3_000 },
    { id: "pay-hookah", source: "purchase_payment", paymentKind: "supplier_payment", sourceDocumentId: "purchase-hookah", date: "2026-06-05", category: "hookah", amount: 1_000 },
    { date: "2026-06-20", category: "writeoff", area: "Кухня", amount: 500 },
    { date: "2026-06-22", category: "repairs", amount: 1_000 },
    { id: "pay-household", source: "purchase_payment", paymentKind: "supplier_payment", sourceDocumentId: "purchase-household", date: "2026-06-23", category: "household", amount: 500 },
    { id: "legacy-stock", source: "legacy_expense", legacy: true, legacyKind: "unlinked_purchase_expense", date: "2026-06-24", category: "products", amount: 250 },
  ];
  setPurchaseDocuments([
    { id: "purchase-alcohol", status: "confirmed", documentType: "invoice", date: "2026-06-03", expenseCategory: "alcohol", total: 5_000, area: "Бар" },
    { id: "purchase-food", status: "confirmed", documentType: "invoice", date: "2026-06-04", expenseCategory: "food", total: 3_000, area: "Кухня" },
    { id: "purchase-hookah", status: "confirmed", documentType: "invoice", date: "2026-06-05", expenseCategory: "hookah", total: 1_000 },
    { id: "purchase-household", status: "confirmed", documentType: "invoice", date: "2026-06-23", expenseCategory: "household", total: 500 },
  ]);
  const snapshots = [
    {
      date: "2026-06-01",
      sections: { Бар: 10_000, Кухня: 5_000, Кальяны: 2_000 },
    },
    {
      date: "2026-07-01",
      sections: { Бар: 8_000, Кухня: 4_000, Кальяны: 1_500 },
    },
  ];

  const report = bdBuildMonthlyReport(
    cologne,
    "2026-06",
    revenue,
    expenses,
    snapshots,
    settings,
    [],
  );

  assert.equal(report.isClosed, true);
  assert.equal(report.plannedShifts, 12);
  assert.equal(report.openingInventory, 17_000);
  assert.equal(report.closingInventory, 13_500);
  assert.equal(report.purchases, 9_500);
  assert.equal(report.purchasePayments, 9_500);
  assert.equal(report.legacyPurchaseExpenses, 250);
  assert.equal(report.periodExpenses, 10_750);
  assert.deepEqual(
    Array.from(report.expenseBreakdown, ({ label, amount }) => [label, amount]),
    [
      ["Бар", 5_000],
      ["Кухня", 3_000],
      ["Кальяны", 1_000],
      ["Ремонт", 1_000],
      ["Хоз.товары", 500],
      ["Продукты", 250],
    ],
  );
  assert.equal(report.writeoffs, 500);
  assert.equal(report.costOfGoods, 12_500);
  assert.equal(report.operatingResult, 5_500);
  assert.equal(report.resultBeforeCost, 18_000);
  assert.equal(report.cashResult, 8_250);
  assert.equal(Math.round(report.recurringPerShift * 100) / 100, 375);
  assert.equal(report.allocatedRecurring, 4_500);
  assert.equal(report.shiftEstimates.length, 12);
  assert.equal(
    report.shiftEstimates.reduce((sum, shift) => sum + shift.recurringAllocation, 0),
    4_500,
  );
});

test("RC controlled month matches the independent stock and net-profit calculation", async () => {
  const { bdBuildMonthlyReport, bdDefaultFinanceSettings, setPurchaseDocuments } =
    await inventoryAccountingHelpers();
  const venue = {
    name: "RC control",
    areas: ["Bar"],
    workingDays: {
      1: true,
      2: false,
      3: false,
      4: false,
      5: false,
      6: false,
      7: false,
    },
  };
  const settings = {
    ...bdDefaultFinanceSettings(venue),
    inventorySections: ["Bar"],
    taxModel: { mode: "manual", amount: 0, percent: 0 },
    utilityModel: { mode: "manual", amount: 0, percent: 0 },
  };
  setPurchaseDocuments([{
    id: "purchase-control",
    status: "confirmed",
    documentType: "invoice",
    date: "2026-06-10",
    expenseCategory: "products",
    total: 200,
    area: "Bar",
  }]);
  const report = bdBuildMonthlyReport(
    venue,
    "2026-06",
    [{
      date: "2026-06-15",
      revenue: 1_000,
      receipts: 20,
      guests: 25,
      payrollBreakdown: { total: 200 },
    }],
    [
      { id: "payment-control", source: "purchase_payment", paymentKind: "supplier_payment", sourceDocumentId: "purchase-control", status: "posted", date: "2026-06-10", category: "products", area: "Bar", amount: 120 },
      { date: "2026-06-20", category: "writeoff", area: "Bar", amount: 10 },
      { date: "2026-06-22", category: "other", amount: 30 },
      { date: "2026-06-23", category: "taxes", amount: 50 },
      { date: "2026-06-24", category: "utilities", amount: 40 },
    ],
    [
      { date: "2026-06-01", sections: { Bar: 0 }, total: 0 },
      { date: "2026-06-30", sections: { Bar: 160 }, total: 160 },
    ],
    settings,
    ["2026-06-01", "2026-06-08", "2026-06-22", "2026-06-29"].map(
      (date) => ({ date, resolved: true, reason: "Заведение было закрыто" }),
    ),
  );

  assert.equal(report.isClosed, true);
  assert.equal(report.revenue, 1_000);
  assert.equal(report.purchases, 200);
  assert.equal(report.purchasePayments, 120);
  assert.equal(report.closingInventory, 160);
  assert.equal(report.writeoffs, 10);
  assert.equal(report.costOfGoods, 30);
  assert.equal(report.payroll, 200);
  assert.equal(report.otherExpenses, 30);
  assert.equal(report.taxes, 50);
  assert.equal(report.utilities, 40);
  assert.equal(report.resultBeforeCost, 670);
  assert.equal(report.cashResult, 550);
  assert.equal(report.operatingResult, 640);
});

test("RC financial mutations update every canonical KPI and restore the 640 MDL baseline", async () => {
  const { bdBuildMonthlyReport, bdDefaultFinanceSettings, setPurchaseDocuments } =
    await inventoryAccountingHelpers();
  const venue = {
    name: "RC mutation control",
    areas: ["Bar"],
    workingDays: {
      1: true,
      2: false,
      3: false,
      4: false,
      5: false,
      6: false,
      7: false,
    },
  };
  const settings = {
    ...bdDefaultFinanceSettings(venue),
    inventorySections: ["Bar"],
    taxModel: { mode: "manual", amount: 0, percent: 0 },
    utilityModel: { mode: "manual", amount: 0, percent: 0 },
  };
  const resolvedShifts = ["2026-06-01", "2026-06-08", "2026-06-22", "2026-06-29"]
    .map((date) => ({ date, resolved: true, reason: "Заведение было закрыто" }));
  const baseline = {
    revenue: 1_000,
    purchases: 200,
    purchasePayments: 120,
    closingInventory: 160,
    writeoffs: 10,
    payroll: 200,
    otherExpenses: 30,
    taxes: 50,
    utilities: 40,
    supplierReturn: 0,
  };

  function independentExpected(state) {
    const costOfGoods = state.purchases - state.closingInventory - state.writeoffs;
    const otherExpenses = state.otherExpenses - state.supplierReturn;
    return {
      costOfGoods,
      otherExpenses,
      operatingResult: state.revenue
        - costOfGoods
        - state.writeoffs
        - state.payroll
        - otherExpenses
        - state.taxes
        - state.utilities,
    };
  }

  function reportFor(patch = {}) {
    const state = { ...baseline, ...patch };
    setPurchaseDocuments([{
      id: "purchase-mutation",
      status: "confirmed",
      documentType: "invoice",
      date: "2026-06-10",
      expenseCategory: "products",
      total: state.purchases,
      area: "Bar",
    }]);
    const expenses = [
      { id: "payment-mutation", source: "purchase_payment", paymentKind: "supplier_payment", sourceDocumentId: "purchase-mutation", status: "posted", date: "2026-06-10", category: "products", area: "Bar", amount: state.purchasePayments },
      { date: "2026-06-20", category: "writeoff", area: "Bar", amount: state.writeoffs },
      { date: "2026-06-22", category: "other", amount: state.otherExpenses },
      { date: "2026-06-23", category: "taxes", amount: state.taxes },
      { date: "2026-06-24", category: "utilities", amount: state.utilities },
    ];
    if (state.supplierReturn) {
      expenses.push({
        date: "2026-06-25",
        category: "returns",
        amount: -state.supplierReturn,
      });
    }
    const report = bdBuildMonthlyReport(
      venue,
      "2026-06",
      [{
        date: "2026-06-15",
        revenue: state.revenue,
        receipts: 20,
        guests: 25,
        payrollBreakdown: { total: state.payroll },
      }],
      expenses,
      [
        { date: "2026-06-01", sections: { Bar: 0 }, total: 0 },
        {
          date: "2026-06-30",
          sections: { Bar: state.closingInventory },
          total: state.closingInventory,
        },
      ],
      settings,
      resolvedShifts,
    );
    return { state, report, expected: independentExpected(state) };
  }

  const mutations = [
    ["закупочная цена", { purchases: 220 }, 620],
    ["количество закупки", { purchases: 220, closingInventory: 180 }, 640],
    ["продажа и складское списание", { revenue: 1_100, closingInventory: 140 }, 720],
    ["возврат поставщику", { closingInventory: 140, supplierReturn: 20 }, 640],
    ["списание", { closingInventory: 150, writeoffs: 20 }, 630],
    ["фактическая инвентаризация", { closingInventory: 180 }, 660],
    ["ФОТ", { payroll: 220 }, 620],
    ["оплата поставщику", { purchasePayments: 140 }, 640],
    ["аванс или выплата не являются повторным расходом", {}, 640],
    ["налог", { taxes: 60 }, 630],
    ["коммунальный расход", { utilities: 50 }, 630],
    ["прочий расход", { otherExpenses: 40 }, 630],
  ];

  for (const [label, patch, expectedProfit] of mutations) {
    const { state, report, expected } = reportFor(patch);
    assert.equal(report.isClosed, true, label);
    assert.equal(report.revenue, state.revenue, label);
    assert.equal(report.purchases, state.purchases, label);
    assert.equal(report.purchasePayments, state.purchasePayments, label);
    assert.equal(report.closingInventory, state.closingInventory, label);
    assert.equal(report.writeoffs, state.writeoffs, label);
    assert.equal(report.payroll, state.payroll, label);
    assert.equal(report.otherExpenses, expected.otherExpenses, label);
    assert.equal(report.taxes, state.taxes, label);
    assert.equal(report.utilities, state.utilities, label);
    assert.equal(report.costOfGoods, expected.costOfGoods, label);
    assert.equal(report.operatingResult, expected.operatingResult, label);
    assert.equal(report.operatingResult, expectedProfit, label);
  }

  const restored = reportFor().report;
  assert.equal(restored.costOfGoods, 30);
  assert.equal(restored.cashResult, 550);
  assert.equal(restored.operatingResult, 640);
});

test("current month stays preliminary until the closing inventory is entered", async () => {
  const { bdBuildMonthlyReport, bdDefaultFinanceSettings, setPurchaseDocuments } =
    await inventoryAccountingHelpers();
  const now = new Date();
  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const firstDay = `${monthKey}-01`;
  const venue = {
    name: "Другое заведение",
    areas: ["Kitchen", "Bar", "Hookah"],
    workingDays: { 1: true, 2: true, 3: true, 4: true, 5: false, 6: false, 7: false },
  };
  const settings = {
    ...bdDefaultFinanceSettings(venue),
    taxModel: { mode: "fixed", amount: 3_000, percent: 0 },
    utilityModel: { mode: "fixed", amount: 1_500, percent: 0 },
  };
  setPurchaseDocuments([{
    id: "purchase-current",
    status: "confirmed",
    documentType: "invoice",
    date: firstDay,
    expenseCategory: "food",
    total: 2_000,
    area: "Кухня",
  }]);
  const report = bdBuildMonthlyReport(
    venue,
    monthKey,
    [{ date: firstDay, revenue: 10_000, receipts: 20 }],
    [{ date: firstDay, category: "food", area: "Кухня", amount: 2_000 }],
    [{ date: firstDay, sections: { Бар: 1_000, Кухня: 1_000, Кальяны: 500 } }],
    settings,
    [],
  );

  const expectedRecurringPerShift = 4_500 / report.plannedShifts;

  assert.deepEqual([...settings.inventorySections], ["Кухня", "Бар", "Кальяны"]);
  assert.equal(report.status, "preliminary");
  assert.equal(report.closingInventory, null);
  assert.equal(report.costOfGoods, null);
  assert.equal(report.operatingResult, null);
  assert.ok(report.plannedShifts >= 16 && report.plannedShifts <= 19);
  assert.equal(report.recurringPerShift, expectedRecurringPerShift);
  assert.equal(report.allocatedRecurring, expectedRecurringPerShift);
  assert.ok(
    Math.abs(report.resultBeforeCost - (10_000 - expectedRecurringPerShift)) < 1e-9,
  );
  assert.ok(Math.abs(report.cashResult - (8_000 - expectedRecurringPerShift)) < 1e-9);
  assert.equal(report.shiftEstimates.length, 1);
  assert.ok(
    Math.abs(
      report.shiftEstimates[0].resultBeforeCost -
        (10_000 - expectedRecurringPerShift),
    ) < 1e-9,
  );
  assert.equal(report.shiftEstimates[0].estimatedCost, null);
  assert.equal(report.shiftEstimates[0].estimatedResult, null);
});

test("completed months include all recurring costs even when zero-revenue shifts are explained", async () => {
  const { bdBuildMonthlyReport, bdDefaultFinanceSettings } =
    await inventoryAccountingHelpers();
  const venue = {
    name: "Пять смен",
    areas: ["Бар"],
    workingDays: {
      1: true,
      2: false,
      3: false,
      4: false,
      5: false,
      6: false,
      7: false,
    },
  };
  const settings = {
    ...bdDefaultFinanceSettings(venue),
    taxModel: { mode: "fixed", amount: 3_000, percent: 0 },
    utilityModel: { mode: "fixed", amount: 1_500, percent: 0 },
  };
  const report = bdBuildMonthlyReport(
    venue,
    "2026-06",
    [{ date: "2026-06-01", revenue: 10_000, receipts: 20 }],
    [],
    [
      { date: "2026-06-01", sections: { Бар: 5_000 } },
      { date: "2026-07-01", sections: { Бар: 5_000 } },
    ],
    settings,
    ["2026-06-08", "2026-06-15", "2026-06-22", "2026-06-29"].map(
      (date) => ({ date, resolved: true, reason: "Заведение было закрыто" }),
    ),
  );

  assert.equal(report.periodPast, true);
  assert.equal(report.coveragePercent, 100);
  assert.equal(report.plannedShifts, 5);
  assert.equal(report.allocatedRecurring, 900);
  assert.equal(report.unallocatedRecurring, 3_600);
  assert.equal(report.resultBeforeCost, 5_500);
  assert.equal(report.cashResult, 5_500);
  assert.equal(report.operatingResult, 5_500);
});

test("an impossible inventory balance blocks the final monthly profit", async () => {
  const { bdBuildMonthlyReport, bdDefaultFinanceSettings } =
    await inventoryAccountingHelpers();
  const venue = {
    name: "Проверка остатков",
    areas: ["Бар", "Кухня"],
    workingDays: {
      1: true,
      2: false,
      3: false,
      4: false,
      5: false,
      6: false,
      7: false,
    },
  };
  const report = bdBuildMonthlyReport(
    venue,
    "2026-06",
    [{ date: "2026-06-01", revenue: 20_000, receipts: 40 }],
    [],
    [
      { date: "2026-06-01", sections: { Бар: 1_000, Кухня: 10_000 } },
      { date: "2026-07-01", sections: { Бар: 2_000, Кухня: 0 } },
    ],
    bdDefaultFinanceSettings(venue),
    ["2026-06-08", "2026-06-15", "2026-06-22", "2026-06-29"].map(
      (date) => ({ date, resolved: true, reason: "Заведение было закрыто" }),
    ),
  );

  assert.equal(report.rawCostOfGoods, 9_000);
  assert.equal(report.inventoryMismatch, true);
  assert.equal(report.costOfGoods, null);
  assert.equal(report.operatingResult, null);
  assert.equal(report.status, "preliminary");
  assert.equal(report.isClosed, false);
  assert.equal(report.sections.find((row) => row.section === "Бар").cost, -1_000);
});

async function payrollLedgerHelpers() {
  const bundle = await readFile(
    new URL("../public/assets/index-BQGspy0I.js", import.meta.url),
    "utf8",
  );
  const start = bundle.indexOf('const bdPayrollConfirmationVersion="approval-v25"');
  const end = bundle.indexOf("function bdPayrollMonthAudits(", start);
  assert.notEqual(start, -1);
  assert.notEqual(end, -1);

  const context = {};
  vm.runInNewContext(
    `${bundle.slice(start, end)}\nglobalThis.helpers = { bdPayrollEntryTotals, bdPayrollApplyLedger };`,
    context,
  );
  return context.helpers;
}

test("salary ledger separates earnings, deductions, and payments", async () => {
  const { bdPayrollEntryTotals, bdPayrollApplyLedger } =
    await payrollLedgerHelpers();
  const entries = [
    { type: "bonus", amount: 1_000 },
    { type: "order", amount: 500 },
    { type: "fine", amount: 250 },
    { type: "dishware", amount: 125 },
    { type: "other_deduction", amount: 75 },
    { type: "payment", amount: 4_000 },
  ];

  const totals = bdPayrollEntryTotals(entries);
  const salary = bdPayrollApplyLedger(10_000, entries);

  assert.equal(totals.deductions, 950);
  assert.equal(totals.paid, 4_000);
  assert.equal(salary.gross, 11_000);
  assert.equal(salary.netAccrued, 10_050);
  assert.equal(salary.balance, 6_050);

  const approvalTotals = bdPayrollEntryTotals([
    { type: "fine", amount: 1_000, confirmationStatus: "pending" },
    { type: "dishware", amount: 500, confirmationStatus: "rejected" },
    { type: "order", amount: 250, confirmationStatus: "confirmed" },
  ]);
  assert.equal(approvalTotals.deductions, 250);
});

test("monthly financial report includes payroll bonuses without treating payments as a second expense", async () => {
  const bundle = await readFile(
    new URL("../public/assets/index-BQGspy0I.js", import.meta.url),
    "utf8",
  );
  const start = bundle.indexOf(
    "const bdBuildMonthlyReportBeforePayroll=bdBuildMonthlyReport",
  );
  const end = bundle.indexOf("function BAe(", start);
  assert.notEqual(start, -1);
  assert.notEqual(end, -1);

  const entries = [
    { date: "2026-07-12", type: "bonus", amount: 1_000 },
    { date: "2026-07-12", type: "order", amount: 500 },
    { date: "2026-07-12", type: "payment", amount: 3_000 },
  ];
  const context = {
    bdMonthClosingsKey: "bd_month_closings",
    bdBuildMonthlyReport() {
      return {
        payroll: 10_000,
        operatingResult: 50_000,
        resultBeforeCost: 60_000,
        cashResult: 40_000,
        shiftEstimates: [
          {
            date: "2026-07-12",
            payroll: 10_000,
            resultBeforeCost: 60_000,
            estimatedResult: 50_000,
          },
        ],
      };
    },
    bdPayrollEntriesForVenue(_profile, rows) {
      return rows;
    },
    bdPayrollArrayStore() {
      return entries;
    },
    bdArrayStore() {
      return [];
    },
    bdPayrollEntryTotals(rows) {
      const bonus = rows
        .filter((row) => row.type === "bonus")
        .reduce((sum, row) => sum + row.amount, 0);
      const deductions = rows
        .filter((row) => ["order", "fine", "dishware", "other_deduction"].includes(row.type))
        .reduce((sum, row) => sum + row.amount, 0);
      const paid = rows
        .filter((row) => row.type === "payment")
        .reduce((sum, row) => sum + row.amount, 0);
      return { bonus, deductions, paid };
    },
  };

  vm.runInNewContext(
    `${bundle.slice(start, end)}\nglobalThis.result = bdBuildMonthlyReport(
      {},
      "2026-07",
      [{ date: "2026-07-12", payrollBreakdown: { total: 10000 } }],
      [],
      [],
      {},
      []
    );`,
    context,
  );

  assert.equal(context.result.payroll, 11_000);
  assert.equal(context.result.payrollDeductions, 500);
  assert.equal(context.result.payrollNet, 10_500);
  assert.equal(context.result.payrollPaid, 3_000);
  assert.equal(context.result.payrollBalance, 7_500);
  assert.equal(context.result.operatingResult, 49_000);
  assert.equal(context.result.resultBeforeCost, 59_000);
  assert.equal(context.result.cashResult, 39_000);
  assert.equal(context.result.shiftEstimates[0].payroll, 11_000);
  assert.equal(context.result.shiftEstimates[0].resultBeforeCost, 59_000);
  assert.equal(context.result.shiftEstimates[0].estimatedResult, 49_000);
});

test("registration clearly separates required and optional identity fields", async () => {
  const bundle = await readFile(
    new URL("../public/assets/index-BQGspy0I.js", import.meta.url),
    "utf8",
  );
  const start = bundle.indexOf("function Dle()");
  const end = bundle.indexOf("const N7=", start);
  assert.notEqual(start, -1);
  assert.notEqual(end, -1);
  const registration = bundle.slice(start, end);

  assert.match(registration, /label:"Имя \*"/);
  assert.match(registration, /label:"Фамилия \(необязательно\)"/);
  assert.match(registration, /children:"Телефон \(необязательно\)"/);
  assert.match(registration, /label:"Email \*"/);
  assert.match(registration, /id:"bd-register-password",label:"Пароль \*"/);
  assert.match(registration, /id:"bd-register-repeat",label:"Повторите пароль \*"/);
  assert.match(registration, /type:"submit",className:"bd-auth-primary",disabled:y/);
  assert.doesNotMatch(
    registration,
    /disabled:y\|\|!t\.name\.trim\(\)\|\|!t\.surname\.trim\(\)/,
  );
});

test("onboarding saves the venue before seeding equipment and exposes its controls", async () => {
  const bundle = await readFile(
    new URL("../public/assets/index-BQGspy0I.js", import.meta.url),
    "utf8",
  );
  const start = bundle.indexOf("function Rle(");
  const end = bundle.indexOf("function Wg(", start);
  assert.notEqual(start, -1);
  assert.notEqual(end, -1);
  const onboarding = bundle.slice(start, end);

  assert.match(onboarding, /await t\(A\),_\.length>0&&n\(_\),m\(!0\)/);
  assert.doesNotMatch(onboarding, /Failed to save onboarding equipment list/);
  assert.match(onboarding, /ariaLabel:"Название заведения"/);
  assert.match(onboarding, /ariaLabel:"Мест в зале"/);
  assert.match(onboarding, /"aria-label":"Назад"/);
  assert.match(onboarding, /"aria-label":\(h\.checked\?"Убрать ":"Добавить "\)\+m\.name/);
  assert.match(onboarding, /"aria-label":"Уменьшить количество: "\+n/);
  assert.match(onboarding, /"aria-label":"Увеличить количество: "\+n/);
});

test("only an explicit closing record marks a month closed and its snapshot stays immutable", async () => {
  const bundle = await readFile(
    new URL("../public/assets/index-BQGspy0I.js", import.meta.url),
    "utf8",
  );
  const start = bundle.indexOf('const bdReleaseCandidateVersion="rc-v163"');
  const end = bundle.indexOf("function bdShiftsPage(", start);
  assert.notEqual(start, -1);
  assert.notEqual(end, -1);

  let closings = [];
  const context = {
    bdMonthClosingsKey: "bd_month_closings",
    bdArrayStore() {
      return closings;
    },
    bdBuildMonthlyReport() {
      return {
        status: "closed",
        isClosed: true,
        revenue: 999_999,
        payroll: 88_888,
        taxes: 77_777,
        operatingResult: 66_666,
        cashResult: 55_555,
        resultBeforeCost: 44_444,
        sections: [],
      };
    },
  };
  vm.runInNewContext(
    `${bundle.slice(start, end)}\nglobalThis.build=bdBuildMonthlyReport;`,
    context,
  );

  const build = context.build;
  const openReport = build({}, "2026-07", [], [], [], { id: "primary" }, []);
  assert.equal(openReport.isClosed, false);
  assert.equal(openReport.status, "preliminary");

  closings = [{
    monthKey: "2026-07",
    venueId: "primary",
    status: "closed",
    closedAt: "2026-08-01T10:00:00.000Z",
    snapshot: {
      revenue: 100_000,
      payroll: 20_000,
      taxes: 5_000,
      finalProfit: 31_000,
      cashResult: 29_000,
      resultBeforeCost: 45_000,
    },
  }];
  const closedReport = build({}, "2026-07", [], [], [], { id: "primary" }, []);
  assert.equal(closedReport.isClosed, true);
  assert.equal(closedReport.status, "closed");
  assert.equal(closedReport.revenue, 100_000);
  assert.equal(closedReport.payroll, 20_000);
  assert.equal(closedReport.taxes, 5_000);
  assert.equal(closedReport.operatingResult, 31_000);
  assert.equal(closedReport.cashResult, 29_000);
});

test("employee list opens a read-only monthly profile before editing", async () => {
  const [bundle, css, listCss] = await Promise.all([
    readFile(
      new URL("../public/assets/index-BQGspy0I.js", import.meta.url),
      "utf8",
    ),
    readFile(new URL("../public/employee-detail.css", import.meta.url), "utf8"),
    readFile(new URL("../public/employee-list.css", import.meta.url), "utf8"),
  ]);
  const detailStart = bundle.indexOf("function bdEmployeeAttendanceForMonth(");
  const detailEnd = bundle.indexOf("function vCe()", detailStart);
  const listEnd = bundle.indexOf("function _Ce(", detailEnd);
  const rowStart = bundle.indexOf("function bdTeamEmployeeCount(");
  const rowEnd = bundle.indexOf("function xCe(", rowStart);
  assert.ok(
    detailStart >= 0
      && detailEnd > detailStart
      && listEnd > detailEnd
      && rowStart >= 0
      && rowEnd > rowStart,
  );
  const detail = bundle.slice(detailStart, detailEnd);
  const list = bundle.slice(detailEnd, listEnd);
  const row = bundle.slice(rowStart, rowEnd);

  assert.match(bundle, /path:"\/employees\/:id",component:\(\)=>i\.jsx\(pt,\{component:bdEmployeeDetailPage\}\)/);
  assert.match(detail, /data-bd-employee-detail":"career-v204"/);
  assert.match(detail, /bdHasClientPermission\("team\.manage"\)/);
  assert.match(detail, /bdHasClientPermission\("payroll\.view"\)/);
  assert.match(detail, /label:"Отработано смен"/);
  assert.match(detail, /label:"Отработано часов"/);
  assert.match(detail, /label:"Выплачено \/ авансы"/);
  assert.match(detail, /children:"Премии, удержания и выплаты"/);
  assert.match(detail, /children:"Финансовая информация скрыта"/);
  assert.match(list, /bdEmployeeNavigate\("\/employees\/"\+encodeURIComponent\(T\.id\)\)/);
  assert.doesNotMatch(list, /function j\(T\)\{m\(\{mode:"edit",employee:T\}\)\}/);
  assert.match(list, /data-bd-team-list":"directory-v163"/);
  assert.match(list, /data-bd-team-module":"v163"/);
  assert.match(list, /role:"tablist"/);
  assert.match(list, /className:"bd-team-directory"/);
  assert.match(row, /className:"bd-team-row"/);
  assert.match(row, /className:"bd-team-avatar"/);
  assert.doesNotMatch(row, /dCe,\{name:e\.name,size:48\}/);

  assert.match(css, /grid-template-columns:\s*minmax\(260px, 0\.75fr\) minmax\(0, 1\.5fr\)/);
  assert.match(css, /@media \(max-width: 860px\)/);
  assert.match(css, /@media \(max-width: 560px\)/);
  assert.match(listCss, /bd-professional-employee-directory-v84/);
  assert.match(listCss, /\.bd-team-directory\s*\{/);
  assert.match(listCss, /@media \(min-width: 840px\)/);
});

test("employee monthly attendance counts only that employee and does not invent hours", async () => {
  const bundle = await readFile(
    new URL("../public/assets/index-BQGspy0I.js", import.meta.url),
    "utf8",
  );
  const start = bundle.indexOf("function bdEmployeeAttendanceForMonth(");
  const end = bundle.indexOf("function bdEmployeeHoursLabel(", start);
  assert.ok(start >= 0 && end > start);
  const context = {
    rows: [
      {
        id: "shift-1",
        date: "2026-08-04",
        staffing: [{ employeeId: "employee-1", hours: 8 }],
      },
      {
        id: "shift-2",
        date: "2026-08-06",
        staffing: [{ employeeId: "employee-1" }],
      },
      {
        id: "shift-3",
        date: "2026-08-08",
        staffing: [{ employeeId: "employee-2", hours: 12 }],
      },
      {
        id: "shift-old",
        date: "2026-07-31",
        staffing: [{ employeeId: "employee-1", hours: 10 }],
      },
    ],
  };
  vm.runInNewContext(
    `${bundle.slice(start, end)}\nglobalThis.result=bdEmployeeAttendanceForMonth("employee-1","2026-08",rows);`,
    context,
  );

  assert.equal(context.result.shiftCount, 2);
  assert.equal(context.result.totalHours, 8);
  assert.equal(context.result.knownHours, 1);
  assert.equal(context.result.missingHours, 1);
  assert.deepEqual(
    Array.from(context.result.rows, (row) => row.id),
    ["shift-2", "shift-1"],
  );
});
