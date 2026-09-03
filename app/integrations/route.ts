import {
  canonicalAppNavigationForRequest,
  isEmbeddedApplicationRoute,
} from "../../lib/bardoctor/standalone-navigation";
import { canonicalUserShellAssets } from "../../lib/bardoctor/app-shell";
import { barDoctorResponse } from "../bar-doctor-response";

function integrationsHtml(request: Request): string {
  const embedded = isEmbeddedApplicationRoute(request);
  const navigationOwner = embedded ? "parent-shell" : "standalone-route";

  return `<!doctype html>
<html lang="ru" data-bd-navigation-owner="${navigationOwner}"${embedded ? ' data-bd-embedded="true"' : ""}>
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <meta name="robots" content="noindex, nofollow, noarchive" />
    <meta name="theme-color" content="#f7f8fc" />
    <title>Интеграции — BarDoctor</title>
    <link rel="stylesheet" href="/integrations.css?v=20260903-home-reviews-ux-v409" />
    <link rel="stylesheet" href="/venue-switcher.css?v=20260826-venue-identity-v297" />
    <link rel="stylesheet" href="/navigation.css?v=20260811-navigation-v85" />
    <link rel="stylesheet" href="/modern-polish.css?v=20260811-modern-v87" />
    ${canonicalUserShellAssets()}
    <script src="/bd-route-context.js?v=20260822-navigation-v247" defer></script>
    <script src="/venue-switcher.js?v=20260826-venue-identity-v297" defer></script>
    <script src="/integrations.js?v=20260903-home-reviews-ux-v409" defer></script>
    <script src="/modern-polish.js?v=20260811-modern-v87" defer></script>
  </head>
  <body data-bd-parent-route="/more" data-bd-navigation-owner="${navigationOwner}">
    <header class="integration-header">
      <a id="integration-back" class="icon-button" href="/more" aria-label="Вернуться в раздел «Ещё»" data-bd-back>
        <img src="/integration-icons/arrow-left.svg" alt="" aria-hidden="true" />
      </a>
      <div class="module-identity">
        <span class="module-identity-mark"><img src="/integration-icons/link-2.svg" alt="" aria-hidden="true" /></span>
        <div><p>BARDOCTOR</p><h1 id="page-title">Интеграции</h1></div>
      </div>
      <div class="bd-standalone-header-actions"><div class="bd-standalone-venue-host" data-bd-venue-host></div></div>
    </header>

    <main class="integration-page">
      <div id="loading" class="page-state" role="status" aria-live="polite">
        <span class="spinner" aria-hidden="true"></span>
        <div><strong>Загружаю подключения</strong><p>Проверяю состояние выбранного заведения.</p></div>
      </div>
      <div id="auth-required" class="page-state error hidden">
        <div><strong>Нужно войти в BarDoctor</strong><p>После входа вернитесь в раздел «Интеграции».</p></div>
        <a class="button secondary" href="/login">Перейти ко входу</a>
      </div>
      <div id="load-error" class="page-state error hidden" role="alert">
        <div><strong>Не удалось загрузить подключения</strong><p id="load-error-copy">Повторите попытку.</p></div>
        <button id="retry-load" class="button secondary" type="button">Повторить</button>
      </div>
      <div id="global-message" class="toast hidden" role="status" aria-live="polite"></div>

      <section id="overview-view" class="integration-view hidden" data-integration-view="overview">
        <section class="overview-intro">
          <span class="overview-intro-icon"><img src="/integration-icons/link-2.svg" alt="" aria-hidden="true" /></span>
          <div>
            <h2>Подключайте системы и получайте данные</h2>
            <p>BarDoctor получает данные из систем вашего заведения и показывает их в знакомых разделах.</p>
          </div>
        </section>

        <section class="connection-summary" aria-labelledby="connection-summary-title">
          <div class="section-heading compact-heading">
            <div><p class="section-label">СОСТОЯНИЕ</p><h2 id="connection-summary-title">Подключения</h2></div>
            <p id="summary-note" class="section-note">Только подтверждённые состояния текущего заведения.</p>
          </div>
          <div class="summary-grid">
            <article class="summary-item success"><img src="/integration-icons/circle-check.svg" alt="" aria-hidden="true" /><strong id="status-working">—</strong><span>Работают</span></article>
            <article class="summary-item warning"><img src="/integration-icons/triangle-alert.svg" alt="" aria-hidden="true" /><strong id="status-attention">—</strong><span>Требуют настройки</span></article>
            <article class="summary-item waiting"><img src="/integration-icons/clock-3.svg" alt="" aria-hidden="true" /><strong id="status-waiting">—</strong><span>Ожидают подключения</span></article>
            <article class="summary-item neutral"><img src="/integration-icons/circle-off.svg" alt="" aria-hidden="true" /><strong id="status-not-connected">—</strong><span>Не подключены</span></article>
          </div>
        </section>

        <section class="integration-section" aria-labelledby="accounting-title">
          <div class="section-heading">
            <div><p class="section-label">УЧЁТ И ПРОДАЖИ</p><h2 id="accounting-title">Системы заведения</h2></div>
            <button id="open-catalog" class="text-action" type="button">Подключить систему</button>
          </div>
          <div id="accounting-connections" class="connection-stack"></div>
        </section>

        <section class="integration-section" aria-labelledby="reviews-title">
          <div class="section-heading"><div><p class="section-label">ОТЗЫВЫ И РЕПУТАЦИЯ</p><h2 id="reviews-title">Отзывы гостей</h2></div></div>
          <article id="review-layer-card" class="integration-card service-card" aria-busy="true"></article>
        </section>

        <section class="integration-section" aria-labelledby="file-import-title">
          <div class="section-heading"><div><p class="section-label">ИМПОРТ ИЗ ФАЙЛА</p><h2 id="file-import-title">Разовая загрузка</h2></div></div>
          <article id="file-import-card" class="integration-card service-card"></article>
        </section>

        <aside class="security-note">
          <img src="/integration-icons/shield-check.svg" alt="" aria-hidden="true" />
          <div><strong>Данные изолированы по заведению</strong><p>BarDoctor получает только разрешённые данные. Ключи и системные секреты не показываются в интерфейсе.</p></div>
        </aside>
      </section>

      <section id="catalog-view" class="integration-view hidden" data-integration-view="catalog">
        <div class="view-heading">
          <p class="section-label">НОВОЕ ПОДКЛЮЧЕНИЕ</p>
          <h2>Какую систему вы используете?</h2>
          <p>Выберите систему — способ подключения BarDoctor определит сам.</p>
        </div>
        <div class="catalog-list" role="list">
          <button class="catalog-row" type="button" data-system="onec">
            <span class="system-logo onec">1C</span><span><strong>1С:Предприятие</strong><small>Локальная файловая база 1С 8.2+</small></span><span class="catalog-state ready">Поддерживается</span><img src="/integration-icons/chevron-right.svg" alt="" aria-hidden="true" />
          </button>
          <div class="catalog-row unavailable" role="listitem" aria-disabled="true">
            <span class="system-logo text-logo">iiko</span><span><strong>iiko</strong><small>Облачная система автоматизации</small></span><span class="catalog-state">Скоро</span>
          </div>
          <div class="catalog-row unavailable" role="listitem" aria-disabled="true">
            <span class="system-logo text-logo small-text">r_keeper</span><span><strong>r_keeper</strong><small>Локальная система автоматизации</small></span><span class="catalog-state">Скоро</span>
          </div>
          <div class="catalog-row unavailable" role="listitem" aria-disabled="true">
            <span class="system-logo text-logo">Poster</span><span><strong>Poster</strong><small>Облачная система автоматизации</small></span><span class="catalog-state">Скоро</span>
          </div>
          <div class="catalog-row unavailable" role="listitem" aria-disabled="true">
            <span class="system-logo violet"><img src="/integration-icons/monitor-cog.svg" alt="" aria-hidden="true" /></span><span><strong>Другая локальная система</strong><small>Потребуется совместимый адаптер</small></span><span class="catalog-state">По запросу</span>
          </div>
          <button class="catalog-row" type="button" data-system="api">
            <span class="system-logo violet"><img src="/integration-icons/cloud.svg" alt="" aria-hidden="true" /></span><span><strong>Облачная система / API</strong><small>Подключение через API или вебхуки</small></span><span class="catalog-state ready">Доступно</span><img src="/integration-icons/chevron-right.svg" alt="" aria-hidden="true" />
          </button>
          <button class="catalog-row" type="button" data-system="api">
            <span class="system-logo violet"><img src="/integration-icons/code-2.svg" alt="" aria-hidden="true" /></span><span><strong>Собственная система / API</strong><small>Интеграция для разработчиков</small></span><span class="catalog-state ready">Доступно</span><img src="/integration-icons/chevron-right.svg" alt="" aria-hidden="true" />
          </button>
          <button class="catalog-row" type="button" data-system="file">
            <span class="system-logo violet"><img src="/integration-icons/file-up.svg" alt="" aria-hidden="true" /></span><span><strong>Импорт из файла</strong><small>CSV, Excel, JSON или XML</small></span><span class="catalog-state ready">Доступно</span><img src="/integration-icons/chevron-right.svg" alt="" aria-hidden="true" />
          </button>
        </div>
        <aside class="security-note compact-security"><img src="/integration-icons/shield-check.svg" alt="" aria-hidden="true" /><div><strong>Безопасность данных</strong><p>Каждый источник жёстко привязан к выбранному заведению.</p></div></aside>
      </section>

      <section id="onec-view" class="integration-view hidden" data-integration-view="onec">
        <div class="view-heading"><p class="section-label">УЧЁТ И ПРОДАЖИ</p><h2>Подключение 1С</h2><p>Пошаговая настройка локальной базы в режиме только чтения.</p></div>
        <p class="static-connector-note">Скачать Local Connector можно на первом шаге. Перед установкой запустите <strong>Check-BarDoctor-Compatibility.cmd</strong>, затем <strong>Install-BarDoctor-Local-Connector.cmd</strong>.</p>
        <div id="onec-detail"></div>
      </section>

      <section id="api-view" class="integration-view hidden" data-integration-view="api">
        <div class="view-heading"><p class="section-label">ДЛЯ РАЗРАБОТЧИКОВ</p><h2>Собственная система / API</h2><p>Подключите систему, которая умеет отправлять данные в BarDoctor API.</p></div>
        <div id="api-detail"></div>
      </section>

      <section id="google-view" class="integration-view hidden" data-integration-view="google">
        <div class="view-heading"><p class="section-label">ОТЗЫВЫ И РЕПУТАЦИЯ</p><h2>Google Business Profile</h2><p>Подключение, OAuth и техническое состояние источника. Работа с отзывами находится в отдельном модуле.</p></div>
        <section class="detail-card google-integration-detail">
          <div id="google-integration-status" class="google-integration-status" role="status"><strong>Проверяю подключение…</strong><p>Загружаю техническое состояние Google Business Profile.</p></div>
          <form id="google-integration-form" autocomplete="off">
            <div class="form-grid">
              <label>Google Client ID<input name="clientId" type="text" maxlength="8000" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="…apps.googleusercontent.com" /></label>
              <label>Google Client Secret<input name="clientSecret" type="password" maxlength="8000" autocomplete="new-password" autocapitalize="off" spellcheck="false" /></label>
            </div>
            <label>Google OAuth Callback / Redirect URL<span class="google-callback-row"><input id="google-integration-callback" type="text" readonly /><button id="google-copy-callback" class="button secondary small" type="button">Скопировать</button></span><small>Укажите этот адрес в Authorized redirect URIs вашего OAuth Client.</small></label>
            <div id="google-location-picker" class="google-location-picker hidden"></div>
            <div id="google-integration-error" class="result-box error hidden" role="alert"></div>
            <div class="detail-actions"><button id="google-save-settings" class="button primary" type="submit">Сохранить OAuth</button><button id="google-connect-profile" class="button secondary hidden" type="button">Подключить Google</button><button id="google-sync-reviews" class="button secondary hidden" type="button">Синхронизировать</button><a class="button secondary" href="/reviews">Открыть отзывы</a></div>
          </form>
        </section>
      </section>

      <section id="file-view" class="integration-view hidden" data-integration-view="file">
        <div class="view-heading"><p class="section-label">РАЗОВАЯ ЗАГРУЗКА</p><h2>Импорт из файла</h2><p>Выберите данные, проверьте структуру и подтвердите импорт.</p></div>
        <section class="flow-card">
          <ol class="flow-progress" aria-label="Этапы импорта"><li class="active">Данные</li><li>Файл</li><li>Проверка</li><li>Результат</li></ol>
          <form id="hub-import-form" class="import-form">
            <div class="form-grid">
              <label>Что импортируем
                <select name="entityType" required>
                  <option value="purchase_document">Приходные накладные</option><option value="sale">Продажи по позициям</option><option value="product">Номенклатура</option><option value="warehouse">Склады</option><option value="stock_balance">Остатки</option><option value="write_off">Списания</option><option value="return">Возвраты</option><option value="recipe">Техкарты</option><option value="supplier">Поставщики</option><option value="employee">Сотрудники</option>
                </select>
              </label>
              <label>Из какой системы<input name="externalSystem" type="text" required maxlength="100" placeholder="Например: 1С, iiko или Excel" /></label>
            </div>
            <label class="file-drop"><img src="/integration-icons/file-up.svg" alt="" aria-hidden="true" /><span><strong>Выберите файл до 6 МБ</strong><small>CSV, Excel, JSON или XML</small></span><input name="file" type="file" required accept=".csv,.xlsx,.xls,.json,.xml,text/csv,application/json,application/xml" /></label>
            <div class="template-actions"><button type="button" class="button secondary small" data-template="csv">Шаблон CSV</button><button type="button" class="button secondary small" data-template="json">Пример JSON</button></div>
            <button id="hub-preview-button" class="button secondary" type="button">Проверить структуру</button>
            <section id="hub-field-mapping" class="field-mapping hidden" aria-live="polite"><div class="mapping-heading"><strong>Сопоставление столбцов</strong><small id="hub-preview-summary"></small></div><div id="hub-field-mapping-list" class="field-mapping-list"></div><label class="template-save"><input name="saveTemplate" type="checkbox" /> Запомнить схему для таких файлов</label><input name="fieldMapping" type="hidden" /><input name="headerSignature" type="hidden" /><input name="fileKind" type="hidden" /><input name="connectionId" type="hidden" /></section>
            <button class="button primary" type="submit">Импортировать</button>
          </form>
          <div id="hub-import-result" class="result-box hidden" role="status" aria-live="polite"></div>
        </section>
      </section>
    </main>

    ${canonicalAppNavigationForRequest(request, "more")}
  </body>
</html>`;
}

export function GET(request: Request): Response {
  if (!isEmbeddedApplicationRoute(request)) return barDoctorResponse();
  return new Response(integrationsHtml(request), {
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
