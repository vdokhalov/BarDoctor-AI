import { barDoctorResponse } from "../bar-doctor-response";
import { canonicalUserShellAssets } from "../../lib/bardoctor/app-shell";

const DATA_CONTROL_HTML = `<!doctype html>
<html lang="ru">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <meta name="robots" content="noindex, nofollow, noarchive" />
    <meta name="theme-color" content="#f7f7fb" />
    <title>Контроль данных — BarDoctor</title>
    <link rel="stylesheet" href="/data-control.css?v=20260813-trust-v172" />
    <link rel="stylesheet" href="/venue-switcher.css?v=20260813-venue-v174" />
    <link rel="stylesheet" href="/brand-identity-v159.css?v=20260812-brand-v159" />
    <link rel="stylesheet" href="/modern-polish.css?v=20260811-modern-v87" />
    ${canonicalUserShellAssets()}
    <script src="/bd-route-context.js?v=20260814-navigation-v185" defer></script>
    <script src="/venue-switcher.js?v=20260813-venue-v174" defer></script>
    <script src="/data-control.js?v=20260813-trust-v172" defer></script>
    <script src="/modern-polish.js?v=20260811-modern-v87" defer></script>
  </head>
  <body data-bd-parent-route="/more">
    <header class="trust-header">
      <a class="trust-back" href="/more" aria-label="Назад" data-bd-back>
        <span aria-hidden="true">←</span>
      </a>
      <div class="trust-identity">
        <img src="/icons/bardoctor-mark-v159.svg" alt="" aria-hidden="true" />
        <div><small>BARDOCTOR</small><strong>Контроль данных</strong></div>
      </div>
      <div class="trust-venue-host" data-bd-venue-host></div>
    </header>

    <nav class="trust-tabs" role="tablist" aria-label="Контроль данных">
      <button type="button" role="tab" aria-selected="true" data-tab="overview">Обзор</button>
      <button type="button" role="tab" aria-selected="false" data-tab="journal">Журнал</button>
      <button type="button" role="tab" aria-selected="false" data-tab="periods">Периоды</button>
    </nav>

    <div id="trust-notice" class="trust-notice hidden" role="status" aria-live="polite"></div>

    <main class="trust-main">
      <section id="trust-loading" class="trust-loading" aria-label="Загрузка">
        <div class="skeleton skeleton-state"></div>
        <div class="skeleton-grid"><div class="skeleton"></div><div class="skeleton"></div></div>
        <div class="skeleton skeleton-list"></div>
      </section>

      <section class="trust-panel hidden" data-panel="overview" role="tabpanel" aria-label="Обзор">
        <div class="overview-layout">
          <div class="overview-primary">
            <article id="integrity-state" class="trust-card state-card"></article>
            <section aria-labelledby="activity-title">
              <div class="section-title">
                <div><p>АКТИВНОСТЬ</p><h2 id="activity-title">За последние 30 дней</h2></div>
              </div>
              <div id="activity-metrics" class="metric-grid"></div>
            </section>
            <article class="trust-card attention-card">
              <div class="card-heading">
                <div><p>ЦЕЛОСТНОСТЬ</p><h2 id="integrity-heading">Проверка проблем</h2></div>
                <span id="issue-count" class="count-pill"></span>
              </div>
              <div id="integrity-issues"></div>
            </article>
          </div>

          <aside class="overview-secondary">
            <article class="trust-card recent-card">
              <div class="card-heading">
                <div><p>ИСТОРИЯ</p><h2>Последние изменения</h2></div>
                <button id="open-journal" type="button" class="text-action">Смотреть все</button>
              </div>
              <div id="recent-events" class="compact-events"></div>
            </article>
            <article class="trust-card period-summary-card">
              <div class="card-heading">
                <div><p>ЗАЩИТА</p><h2>Состояние периодов</h2></div>
                <button id="open-periods" type="button" class="text-action">Все периоды</button>
              </div>
              <div id="period-summary"></div>
            </article>
            <article id="coverage-note" class="trust-card coverage-card"></article>
          </aside>
        </div>
      </section>

      <section class="trust-panel hidden" data-panel="journal" role="tabpanel" aria-label="Журнал">
        <div class="journal-toolbar">
          <label class="search-field">
            <span class="sr-only">Поиск в журнале</span>
            <span aria-hidden="true">⌕</span>
            <input id="audit-search" type="search" placeholder="Поиск в журнале" autocomplete="off" />
            <button id="clear-search" class="hidden" type="button" aria-label="Очистить поиск">×</button>
          </label>
          <button id="toggle-filters" class="filter-button" type="button" aria-expanded="false" aria-controls="journal-filters">
            Фильтры <span id="active-filter-count" class="hidden">0</span>
          </button>
        </div>
        <div id="module-chips" class="filter-chips" aria-label="Фильтр по модулю"></div>
        <div id="journal-filters" class="advanced-filters hidden">
          <label>Период с<input id="filter-from" type="date" /></label>
          <label>по<input id="filter-to" type="date" /></label>
          <label>Источник<select id="filter-source"><option value="">Все источники</option></select></label>
          <label id="actor-filter-wrap">Пользователь<select id="filter-actor"><option value="">Все пользователи</option></select></label>
          <button id="reset-filters" type="button">Сбросить</button>
        </div>
        <div class="journal-meta">
          <div><p>ХРОНОЛОГИЯ</p><strong id="journal-result-count">—</strong></div>
          <button id="refresh-journal" type="button">Обновить</button>
        </div>
        <div id="journal-error" class="inline-state hidden"></div>
        <div id="journal-list" class="journal-list"></div>
        <button id="load-more" class="load-more hidden" type="button">Показать ещё</button>
        <a id="export-audit" class="export-button" href="/api/audit?format=csv" download>
          Экспортировать журнал
        </a>
      </section>

      <section class="trust-panel hidden" data-panel="periods" role="tabpanel" aria-label="Периоды">
        <article class="trust-card period-intro">
          <div>
            <p>ЗАЩИТА ПЕРИОДОВ</p>
            <h2>Закрытые данные не меняются</h2>
            <span>Статусы совпадают с действующим закрытием месяца и не дублируются в отдельном списке.</span>
          </div>
          <span class="semantic-mark" aria-hidden="true"></span>
        </article>
        <div id="period-permission" class="inline-state hidden"></div>
        <section id="current-period-section" aria-labelledby="current-period-title">
          <div class="section-title"><div><p>ТЕКУЩИЙ</p><h2 id="current-period-title">Открытый период</h2></div></div>
          <div id="current-period"></div>
        </section>
        <section id="closed-periods-section" aria-labelledby="closed-periods-title">
          <div class="section-title"><div><p>ИСТОРИЯ</p><h2 id="closed-periods-title">Закрытые и повторно открытые</h2></div></div>
          <div id="period-list" class="period-list"></div>
        </section>
        <article class="trust-card period-help">
          <h3>Как защищается период?</h3>
          <p>После закрытия изменения финансовых данных блокируются во всех разделах и интеграциях. Для исправления период нужно открыть с соответствующим правом, внести изменения и закрыть снова.</p>
        </article>
        <a id="close-current-period" class="primary-action hidden" href="/reports?closeMonth=1">Закрыть текущий период</a>
      </section>
    </main>

    <div id="event-detail" class="detail-shell hidden" role="dialog" aria-modal="true" aria-labelledby="event-detail-title">
      <button class="detail-backdrop" type="button" data-close-detail aria-label="Закрыть"></button>
      <aside class="detail-panel">
        <header>
          <div><p>ДЕТАЛИ СОБЫТИЯ</p><h2 id="event-detail-title">Изменение данных</h2></div>
          <button type="button" data-close-detail aria-label="Закрыть">×</button>
        </header>
        <div id="event-detail-content" class="detail-content"></div>
      </aside>
    </div>
  </body>
</html>`;

export function GET(request: Request): Response {
  if (new URL(request.url).searchParams.get("embedded") !== "1") return barDoctorResponse();
  return new Response(DATA_CONTROL_HTML, {
    status: 200,
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "text/html; charset=utf-8",
      "Content-Security-Policy": "default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self' data:; base-uri 'none'; form-action 'self'; frame-ancestors 'self'",
      "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
      "Referrer-Policy": "no-referrer",
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "SAMEORIGIN",
    },
  });
}
