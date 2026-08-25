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
  <link rel="stylesheet" href="/sales-import.css?v=20260824-sales-consumption-v275">
  <link rel="stylesheet" href="/modern-polish.css?v=20260811-modern-v87">
  <link rel="stylesheet" href="/venue-switcher.css?v=20260813-venue-v174">
  ${canonicalUserShellAssets()}
  <script src="/bd-route-context.js?v=20260822-navigation-v247" defer></script>
  <script src="/venue-switcher.js?v=20260813-venue-v174" defer></script>
  <script src="/modern-polish.js?v=20260811-modern-v87" defer></script>
  <script src="/sales-import.js?v=20260824-sales-consumption-v275" defer></script>
</head>
<body data-bd-parent-route="/warehouse" data-sales-consumption="v275">
  <header class="sales-topbar">
    <a href="/warehouse" aria-label="Назад на склад" data-bd-back>←</a>
    <div class="sales-topbar-copy"><b>Продажи</b><span>Агрегированные продажи → склад</span></div>
    <div class="bd-standalone-venue-host" data-bd-venue-host></div>
  </header>

  <main class="sales-shell">
    <section class="sales-command">
      <div>
        <p class="eyebrow">SALES CONSUMPTION ENGINE</p>
        <h1 id="coverage-title">Продажи ещё не загружены</h1>
        <p id="coverage-copy">Добавьте итоги смены — BarDoctor разложит позиции по техкартам и покажет складской расход до проведения.</p>
      </div>
      <button id="add-sales" class="primary-action" type="button">+ Добавить продажи</button>
    </section>

    <section class="sales-kpis" aria-label="Статус отражения продаж">
      <article><span>Загружено</span><strong id="kpi-loaded">0</strong><small>проданных порций</small></article>
      <article class="positive"><span>Отражено</span><strong id="kpi-posted">0</strong><small>на складе</small></article>
      <article class="warning"><span>Сопоставление</span><strong id="kpi-mapping">0</strong><small>требуют внимания</small></article>
      <article class="warning"><span>Без техкарты</span><strong id="kpi-recipe">0</strong><small>позиций</small></article>
      <article class="danger"><span>Ошибки</span><strong id="kpi-errors">0</strong><small>единицы / склад</small></article>
      <article><span>Теор. себестоимость</span><strong id="kpi-cost">—</strong><small>по cost basis</small></article>
    </section>

    <div id="notice" class="notice" role="status" aria-live="polite" hidden></div>

    <div class="sales-layout">
      <section class="workspace-card">
        <header class="section-heading">
          <div><p class="eyebrow">ДОКУМЕНТЫ</p><h2>Продажи по сменам</h2></div>
          <button id="refresh" class="text-button" type="button">Обновить</button>
        </header>
        <div id="active-draft" hidden></div>
        <div id="batch-list" class="batch-list"></div>
      </section>

      <aside class="quality-card">
        <header class="section-heading">
          <div><p class="eyebrow">DATA QUALITY</p><h2>Что не попало на склад</h2></div>
          <span id="quality-count" class="quality-count">0</span>
        </header>
        <p id="quality-impact" class="quality-impact">Все продажи отражены корректно.</p>
        <div id="quality-list" class="quality-list"></div>
      </aside>
    </div>
  </main>

  <dialog id="source-dialog" class="sheet-dialog">
    <form method="dialog" class="sheet-panel">
      <header><div><p class="eyebrow">НОВЫЙ SALESBATCH</p><h2>Как добавить продажи?</h2></div><button value="cancel" aria-label="Закрыть">×</button></header>
      <div class="source-grid">
        <button type="button" data-source="file"><b>Загрузить файл / фото</b><span>CSV, Excel, PDF или снимок отчёта</span></button>
        <button type="button" data-source="text"><b>Вставить текст</b><span>Мохито 12 · Апероль 9</span></button>
        <button type="button" data-source="voice"><b>Продиктовать</b><span>Голос или системная диктовка</span></button>
        <button type="button" data-source="manual"><b>Ввести вручную</b><span>Быстрый grid по вашему меню</span></button>
      </div>
    </form>
  </dialog>

  <dialog id="editor-dialog" class="editor-dialog">
    <div class="editor-panel" data-bd-unsaved-changes="false">
      <header class="editor-header">
        <button id="editor-close" type="button" aria-label="Закрыть">←</button>
        <div><p class="eyebrow" id="editor-kicker">SALESBATCH</p><h2 id="editor-title">Продажи за смену</h2></div>
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
