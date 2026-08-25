import { barDoctorResponse } from "../bar-doctor-response";
import { canonicalUserShellAssets } from "../../lib/bardoctor/app-shell";

const HTML = `<!doctype html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
  <meta name="robots" content="noindex,nofollow">
  <meta name="theme-color" content="#f5f6fb">
  <title>Продажи — BarDoctor</title>
  <link rel="stylesheet" href="/sales-import.css?v=20260825-sales-ux-v278">
  <link rel="stylesheet" href="/modern-polish.css?v=20260811-modern-v87">
  <link rel="stylesheet" href="/venue-switcher.css?v=20260813-venue-v174">
  ${canonicalUserShellAssets()}
  <script src="/bd-route-context.js?v=20260822-navigation-v247" defer></script>
  <script src="/venue-switcher.js?v=20260813-venue-v174" defer></script>
  <script src="/modern-polish.js?v=20260811-modern-v87" defer></script>
  <script src="/sales-import.js?v=20260825-sales-ux-v278" defer></script>
</head>
<body data-bd-parent-route="/warehouse" data-sales-experience="v278">
  <header class="sales-topbar">
    <a href="/warehouse" aria-label="Вернуться на склад" data-bd-back><img src="/integration-icons/arrow-left.svg" alt=""></a>
    <div class="sales-topbar-copy"><b>Продажи</b><span>Продажи смен → склад</span></div>
    <div class="bd-standalone-venue-host" data-bd-venue-host></div>
  </header>

  <main class="sales-shell">
    <section class="sales-command">
      <div>
        <h1 id="coverage-title">Продажи за смены</h1>
        <p id="coverage-copy">Загрузите итоги смены — BarDoctor сам разложит позиции по техкартам и покажет складской расход до проведения.</p>
      </div>
      <button id="add-sales" class="primary-action" type="button">+ Добавить продажи</button>
    </section>

    <section class="sales-kpis" aria-label="Статус отражения продаж">
      <article><span>Загружено</span><strong id="kpi-loaded">0</strong><small>проданных порций</small></article>
      <article class="positive"><span>Отражено на складе</span><strong id="kpi-posted">0</strong><small>порций</small></article>
      <article class="warning"><span>Требуют внимания</span><strong id="kpi-mapping">0</strong><small>позиций</small></article>
      <article class="warning"><span>Без техкарты</span><strong id="kpi-recipe">0</strong><small>позиций</small></article>
      <article class="danger"><span>Ошибки</span><strong id="kpi-errors">0</strong><small>единицы / склад</small></article>
      <article><span>Себестоимость продаж</span><strong id="kpi-cost">—</strong><small>предварительно</small></article>
    </section>

    <div id="notice" class="notice" role="status" aria-live="polite" hidden></div>

    <div class="sales-layout">
      <section class="workspace-card">
        <header class="section-heading">
          <div><h2>Документы</h2><p>Продажи по сменам</p></div>
          <button id="refresh" class="text-button" type="button" aria-label="Обновить документы">Обновить</button>
        </header>
        <div id="active-draft" hidden></div>
        <div id="batch-list" class="batch-list"></div>
      </section>

      <aside class="quality-card">
        <header class="section-heading">
          <div><h2>Что не попало на склад</h2><p>Позиции, которые требуют внимания</p></div>
          <span id="quality-count" class="quality-count">0</span>
        </header>
        <p id="quality-impact" class="quality-impact">После загрузки продаж здесь появятся позиции, которые требуют внимания.</p>
        <div id="quality-list" class="quality-list"></div>
      </aside>
    </div>
  </main>

  <dialog id="source-dialog" class="sheet-dialog">
    <form method="dialog" class="sheet-panel">
      <div class="sheet-handle" aria-hidden="true"></div>
      <header><div><p class="eyebrow">НОВЫЙ ДОКУМЕНТ</p><h2>Как добавить продажи?</h2></div><button value="cancel" aria-label="Закрыть окно"><img class="close-icon" src="/integration-icons/plus.svg" alt=""></button></header>
      <div class="source-grid">
        <button type="button" data-source="file"><span class="source-icon"><img src="/integration-icons/file-up.svg" alt=""></span><span class="source-copy"><b>Загрузить файл / фото</b><small>CSV, Excel, PDF или снимок отчёта</small></span><img class="source-chevron" src="/integration-icons/chevron-right.svg" alt=""></button>
        <button type="button" data-source="text"><span class="source-icon"><img src="/integration-icons/clipboard-list.svg" alt=""></span><span class="source-copy"><b>Вставить текст</b><small>Например: Мохито 12 · Апероль 9</small></span><img class="source-chevron" src="/integration-icons/chevron-right.svg" alt=""></button>
        <button type="button" data-source="voice"><span class="source-icon"><img src="/integration-icons/activity.svg" alt=""></span><span class="source-copy"><b>Продиктовать</b><small>Голосом или через диктовку телефона</small></span><img class="source-chevron" src="/integration-icons/chevron-right.svg" alt=""></button>
        <button type="button" data-source="manual"><span class="source-icon"><img src="/integration-icons/grid-2x2.svg" alt=""></span><span class="source-copy"><b>Ввести вручную</b><small>Быстрый ввод по меню</small></span><img class="source-chevron" src="/integration-icons/chevron-right.svg" alt=""></button>
      </div>
      <p class="draft-note"><img src="/integration-icons/shield-check.svg" alt=""> Данные сохраняются как черновик и доступны только вам.</p>
    </form>
  </dialog>

  <dialog id="editor-dialog" class="editor-dialog">
    <div class="editor-panel" data-bd-unsaved-changes="false">
      <header class="editor-header">
        <button id="editor-close" type="button" aria-label="Вернуться к продажам"><img src="/integration-icons/arrow-left.svg" alt=""></button>
        <div><p class="eyebrow" id="editor-kicker">ДОКУМЕНТ ПРОДАЖ</p><h2 id="editor-title">Продажи за смену</h2></div>
        <span id="editor-status" class="status-pill">Черновик</span>
      </header>
      <div id="editor-body" class="editor-body"></div>
      <footer id="editor-footer" class="editor-footer"></footer>
    </div>
  </dialog>

  <dialog id="confirm-dialog" class="confirm-dialog">
    <form method="dialog">
      <h2 id="confirm-title">Подтвердите действие</h2>
      <p id="confirm-copy"></p>
      <div><button value="cancel" class="secondary">Отмена</button><button id="confirm-action" value="default" class="primary">Продолжить</button></div>
    </form>
  </dialog>

  <input id="structured-file" type="file" accept=".csv,.tsv,.xls,.xlsx,image/*,.pdf" hidden>
  <input id="visual-file" type="file" accept="image/*,.pdf" hidden>
</body>
</html>`;

export function GET(request: Request): Response {
  if (new URL(request.url).searchParams.get("embedded") !== "1") return barDoctorResponse();
  return new Response(HTML, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "Content-Security-Policy": "default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self' data: blob:; frame-ancestors 'self'",
    },
  });
}
