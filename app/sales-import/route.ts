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
  <link rel="stylesheet" href="/sales-import.css?v=sales-ux1">
  <link rel="stylesheet" href="/modern-polish.css?v=20260811-modern-v87">
  <link rel="stylesheet" href="/venue-switcher.css?v=20260826-venue-identity-v297">
  ${canonicalUserShellAssets()}
  <script src="/bd-route-context.js?v=20260822-navigation-v247" defer></script>
  <script src="/venue-switcher.js?v=20260826-venue-identity-v297" defer></script>
  <script src="/modern-polish.js?v=20260811-modern-v87" defer></script>
  <link rel="stylesheet" href="/sales-journal.css?v=sales-ux1">
  <script src="/pos-draft.js?v=pos1-hardening" defer></script>
  <script src="/sales-journal.js?v=sales-ux1" defer></script>
  <script src="/sales-import.js?v=sales-ux1" defer></script>
</head>
<body data-bd-parent-route="/warehouse" data-sales-experience="v278">
  <header class="sales-topbar">
    <a href="/warehouse" aria-label="Вернуться на склад" data-bd-back><img src="/integration-icons/arrow-left.svg" alt=""></a>
    <div class="sales-topbar-copy"><b>Продажи</b><span>Журнал и касса</span></div>
    <div class="bd-standalone-venue-host" data-bd-venue-host></div>
  </header>

  <main class="sales-shell">
    <section class="journal-command">
      <div><p class="journal-eyebrow" id="journal-venue">Ваше заведение</p><h1>Продажи</h1><p id="pos-shift-status">Загружаем кассовые смены…</p></div>
      <div class="journal-primary"><a class="primary-action" id="open-cashier" href="/cashier">Открыть кассу</a><div id="pos-drafts"></div></div>
    </section>
    <nav class="sales-navigation" aria-label="Разделы продаж">
      <button type="button" data-sales-view="journal" aria-current="page">Журнал</button><a href="/cashier">Касса</a><a href="/sales-entry?view=shifts">Смены</a><button type="button" data-sales-view="manual">Ручной ввод</button><button type="button" data-sales-view="import">Импорт</button>
    </nav>
    <section id="journal-metrics" class="journal-metrics" aria-label="Продажи за выбранный период">
      <article><span>Выручка</span><strong id="journal-revenue">—</strong></article><article><span>Чеки</span><strong id="journal-receipts">—</strong></article><article><span>Средний чек</span><strong id="journal-average">—</strong></article>
    </section>
    <p id="journal-metric-note" class="journal-help">По проведённым чекам POS и ручного ввода. Импортные отчёты учитываются отдельно.</p>
    <section id="manual-entry" class="workspace-card journal-entry" hidden><h2>Ручной ввод</h2><p>Внесите операцию через существующую проверку и подтверждение продажи.</p><a class="primary-action" id="manual-sale-link" href="/sales-entry">Добавить продажу вручную</a><hr><h3>Итоги по меню</h3><p>Внесите количество проданных порций для складской обработки. Этот документ не заменяет чек с выручкой.</p><button type="button" data-source="manual">Ввести итоги по меню</button></section>
    <section id="import-entry" class="journal-entry workspace-card" hidden><h2>Импорт</h2><p>Загрузите внешний отчёт: файл, фото, текст или диктовку. Проверьте сопоставление и складской расход перед проведением.</p><button id="add-sales" class="primary-action" type="button">Импортировать продажи</button><h3 id="coverage-title">Обработка импорта</h3><p id="coverage-copy"></p></section>
    <section id="import-metrics" hidden class="sales-kpis" aria-label="Статус отражения продаж">
      <article><span>Загружено</span><strong id="kpi-loaded">0</strong><small>проданных порций</small></article>
      <article class="positive"><span>Отражено на складе</span><strong id="kpi-posted">0</strong><small>порций</small></article>
      <article class="warning"><span>Требуют внимания</span><strong id="kpi-mapping">0</strong><small>позиций</small></article>
      <article class="warning"><span>Без техкарты</span><strong id="kpi-recipe">0</strong><small>позиций</small></article>
      <article class="danger"><span>Ошибки</span><strong id="kpi-errors">0</strong><small>единицы / склад</small></article>
      <article><span>Себестоимость продаж</span><strong id="kpi-cost">—</strong><small>предварительно</small></article>
    </section>

    <div id="notice" class="notice" role="status" aria-live="polite" hidden></div>

    <div class="sales-layout" id="journal-layout">
      <section class="workspace-card">
        <header class="section-heading">
          <div><h2>Журнал продаж</h2><p id="journal-count" role="status" aria-live="polite">Загрузка…</p></div>
          <button id="refresh" class="text-button" type="button" aria-label="Обновить документы">Обновить</button>
        </header>
        <div class="journal-filters">
          <label class="journal-search">Поиск<input id="journal-query" type="search" placeholder="Номер, товар или комментарий"></label>
          <div class="journal-period"><label>С даты<input type="date" id="journal-from"></label><label>По дату<input type="date" id="journal-to"></label></div>
          <details><summary>Фильтры <span id="journal-filter-count"></span></summary><div class="journal-filter-grid">
            <label>Смена<select id="journal-shift"><option value="">Все смены</option></select></label><label>Сотрудник<select id="journal-actor"><option value="">Все сотрудники</option></select></label>
            <label>Оплата<select id="journal-payment"><option value="">Любая</option><option value="CASH">Наличные</option><option value="CARD_EXTERNAL">Карта</option><option value="NONE">Не указан</option></select></label>
            <label>Источник<select id="journal-source"><option value="">Все источники</option><option value="POS">POS</option><option value="MANUAL">Ручной ввод</option><option value="IMPORT">Импорт</option></select></label>
            <label>Статус<select id="journal-status"><option value="">Все статусы</option><option value="POSTED">Проведено</option><option value="REVERSED">Возвращено / отменено проведение</option><option value="DRAFT">Черновик</option><option value="READY">Готово к проведению</option><option value="PARTIALLY_BLOCKED">Требует внимания</option><option value="CANCELLED">Отменено</option></select></label>
          </div></details><button id="journal-reset" type="button" class="text-button">Сбросить фильтры</button>
        </div><div id="active-draft" hidden></div>
        <div id="batch-list" class="batch-list"></div>
      </section>

      <aside id="import-quality" hidden class="quality-card">
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
      <header><div><p class="eyebrow">НОВЫЙ ДОКУМЕНТ</p><h2>Импортировать продажи</h2></div><button value="cancel" aria-label="Закрыть окно"><img class="close-icon" src="/integration-icons/plus.svg" alt=""></button></header>
      <div class="source-grid">
        <button type="button" data-source="file"><span class="source-icon"><img src="/integration-icons/file-up.svg" alt=""></span><span class="source-copy"><b>Загрузить файл / фото</b><small>CSV, Excel, PDF или снимок отчёта</small></span><img class="source-chevron" src="/integration-icons/chevron-right.svg" alt=""></button>
        <button type="button" data-source="text"><span class="source-icon"><img src="/integration-icons/clipboard-list.svg" alt=""></span><span class="source-copy"><b>Вставить текст</b><small>Например: Мохито 12 · Апероль 9</small></span><img class="source-chevron" src="/integration-icons/chevron-right.svg" alt=""></button>
        <button type="button" data-source="voice"><span class="source-icon"><img src="/integration-icons/activity.svg" alt=""></span><span class="source-copy"><b>Продиктовать</b><small>Голосом или через диктовку телефона</small></span><img class="source-chevron" src="/integration-icons/chevron-right.svg" alt=""></button>

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
