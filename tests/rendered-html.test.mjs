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
            jobI