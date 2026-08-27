import { authenticateRequest, unauthorized } from "../../../lib/bardoctor/auth";

const VENUE_ID = 1;
const DATA_ACCOUNT_ID = 1;

export async function GET(request: Request): Promise<Response> {
  const account = await authenticateRequest(request);
  if (!account) return unauthorized();
  if (account.role !== "owner" || account.id !== DATA_ACCOUNT_ID || account.venueId !== VENUE_ID) {
    return Response.json(
      { ok: false, code: "INVOICE_DIAGNOSTICS_OWNER_REQUIRED" },
      { status: 403, headers: { "Cache-Control": "private, no-store" } },
    );
  }
  return new Response(`<!doctype html>
<html lang="ru">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover" />
    <meta name="robots" content="noindex,nofollow" />
    <meta name="theme-color" content="#080b18" />
    <title>Invoice Recognition · Диагностика</title>
    <link rel="icon" type="image/svg+xml" href="/favicon-v159.svg" />
    <link rel="stylesheet" href="/invoice-diagnostic-v319.css" />
    <link rel="stylesheet" href="/invoice-diagnostic-blocks-v319.css" />
    <script src="/invoice-diagnostic-v319.js" defer></script>
  </head>
  <body>
    <main class="diag-shell" data-invoice-diagnostic-surface="owner-v1">
      <header class="diag-header">
        <a href="/purchases" class="diag-back" aria-label="Вернуться в закупки">← Закупки</a>
        <div>
          <p class="diag-kicker">Owner QA · shadow only</p>
          <h1>Invoice Recognition V2</h1>
          <p>Проверка OCR, parser, Hybrid Matching и persistent learning без проведения документов.</p>
        </div>
        <span class="diag-lock">Только владелец</span>
      </header>

      <section id="diag-context" class="diag-context" aria-live="polite">
        <div class="diag-loading">Загружаем authoritative context…</div>
      </section>

      <section class="diag-control-card" aria-labelledby="diag-run-title">
        <div>
          <p class="diag-kicker">Controlled production validation</p>
          <h2 id="diag-run-title">Реальная накладная</h2>
        </div>
        <label class="diag-field">
          <span>Документ</span>
          <select id="diag-document" disabled><option>Загрузка…</option></select>
        </label>
        <div class="diag-actions">
          <button id="diag-run" class="diag-primary" type="button" disabled>Запустить V2 shadow validation</button>
          <button id="diag-repeat" class="diag-secondary" type="button" hidden>Новый независимый repeat run</button>
          <button id="diag-export" class="diag-secondary" type="button" disabled>Экспорт JSON</button>
        </div>
        <p class="diag-safety">3 независимых OCR/parser run + persisted Hybrid run. Purchase, склад, расходы и долг поставщику не изменяются.</p>
      </section>

      <section id="diag-status" class="diag-status" role="status" aria-live="polite" hidden></section>
      <section id="diag-summary" class="diag-summary" aria-label="Сводка результата"></section>
      <section id="diag-determinism" class="diag-panel" hidden></section>
      <section id="diag-learning" class="diag-panel" hidden></section>
      <section id="diag-lines" class="diag-lines" aria-label="Результаты по строкам"></section>

      <dialog id="diag-export-dialog" class="diag-dialog">
        <form method="dialog" class="diag-dialog-card">
          <header><div><p class="diag-kicker">Без secrets</p><h2>Диагностический экспорт</h2></div><button value="close" aria-label="Закрыть">×</button></header>
          <textarea id="diag-export-text" readonly spellcheck="false"></textarea>
          <footer><button id="diag-copy" type="button" class="diag-primary">Копировать JSON</button><button value="close" class="diag-secondary">Закрыть</button></footer>
        </form>
      </dialog>
    </main>
  </body>
</html>`, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "private, no-store",
      "X-Robots-Tag": "noindex, nofollow",
      "X-BarDoctor-Data-Mode": "owner-only-invoice-shadow-diagnostics",
    },
  });
}
