import {
  canonicalAppNavigationForRequest,
  isEmbeddedApplicationRoute,
} from "../../lib/bardoctor/standalone-navigation";
import { canonicalUserShellAssets } from "../../lib/bardoctor/app-shell";
import { barDoctorResponse } from "../bar-doctor-response";

function notificationsHtml(request: Request): string {
  const embedded = isEmbeddedApplicationRoute(request);
  const navigationOwner = embedded ? "parent-shell" : "standalone-route";

  return `<!doctype html>
<html lang="ru" data-bd-navigation-owner="${navigationOwner}"${embedded ? ' data-bd-embedded="true"' : ""}>
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <meta name="robots" content="noindex, nofollow, noarchive" />
    <meta name="theme-color" content="#10152f" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <meta name="apple-mobile-web-app-title" content="BarDoctor" />
    <title>Уведомления — BarDoctor</title>
    <link rel="icon" type="image/svg+xml" href="/favicon-v159.svg" />
    <link rel="manifest" href="/manifest.json?v=20260812-brand-v159" />
    <link rel="apple-touch-icon" sizes="180x180" href="/icons/bardoctor-v159-apple-180.png" />
    <link rel="stylesheet" href="/integrations.css?v=20260813-navigation-v180" />
    <link rel="stylesheet" href="/notifications.css?v=20260814-notification-center-v184" />
    <link rel="stylesheet" href="/venue-switcher.css?v=20260826-venue-identity-v297" />
    <link rel="stylesheet" href="/brand-identity-v159.css?v=20260812-brand-v159" />
    <link rel="stylesheet" href="/modern-polish.css?v=20260811-modern-v87" />
    ${canonicalUserShellAssets()}
    <script src="/bd-route-context.js?v=20260822-navigation-v247" defer></script>
    <script src="/venue-switcher.js?v=20260826-venue-identity-v297" defer></script>
    <script src="/notifications.js?v=20260814-notification-center-v184" defer></script>
    <script src="/modern-polish.js?v=20260811-modern-v87" defer></script>
  </head>
  <body data-bd-parent-route="/more" data-bd-navigation-owner="${navigationOwner}">
    <header class="notification-header">
      <a id="notification-back" class="icon-button" href="/more" aria-label="Вернуться в раздел «Ещё»" data-bd-back>
        <img src="/integration-icons/arrow-left.svg" alt="" aria-hidden="true" />
      </a>
      <div class="notification-identity">
        <span class="notification-brand-mark"><img src="/icons/bardoctor-mark-v159.svg" alt="" aria-hidden="true" /></span>
        <div><p>BARDOCTOR</p><h1 id="notification-page-title">Уведомления</h1></div>
      </div>
      <div class="bd-standalone-header-actions"><div class="bd-standalone-venue-host" data-bd-venue-host></div></div>
    </header>

    <main class="notification-page">
      <div id="global-notice" class="notification-toast hidden" role="status" aria-live="polite"></div>
      <section id="notification-loading" class="notification-state" role="status" aria-live="polite">
        <span class="notification-spinner" aria-hidden="true"></span>
        <div><strong>Загружаю настройки</strong><p>Проверяю состояние этого устройства и ваши предпочтения.</p></div>
      </section>
      <section id="auth-required" class="notification-state error hidden">
        <div><strong>Нужно войти в BarDoctor</strong><p>После входа вернитесь к настройкам уведомлений.</p></div>
        <a class="notification-button secondary" href="/login">Перейти ко входу</a>
      </section>
      <section id="load-error" class="notification-state error hidden" role="alert">
        <div><strong>Не удалось загрузить уведомления</strong><p>Проверьте интернет и повторите попытку. Ваши настройки не изменены.</p></div>
        <button id="retry-load" class="notification-button secondary" type="button">Повторить</button>
      </section>

      <div id="notification-content" class="hidden">
        <section id="overview-view" class="notification-view" data-notification-view="overview">
          <article class="device-card">
            <span id="device-icon" class="device-icon unknown"><img src="/integration-icons/activity.svg" alt="" aria-hidden="true" /></span>
            <div class="device-copy">
              <p class="section-label">НА ЭТОМ УСТРОЙСТВЕ</p>
              <h2 id="device-status-title">Состояние неизвестно</h2>
              <p id="device-status-description">Проверяю разрешение и связь устройства.</p>
            </div>
            <button id="device-action" class="device-action" type="button" data-route="/notifications?view=device">
              <img src="/integration-icons/settings-2.svg" alt="" aria-hidden="true" />
              <span>Проверить настройки устройства</span>
              <img src="/integration-icons/chevron-right.svg" alt="" aria-hidden="true" />
            </button>
          </article>

          <section class="notification-section" aria-labelledby="categories-title">
            <div class="section-heading"><p class="section-label" id="categories-title">ЧТО ПРИСЫЛАТЬ</p></div>
            <div id="category-list" class="notification-list" aria-live="polite"></div>
            <p class="scope-note">Настройки действуют для вашего аккаунта во всех доступных заведениях.</p>
          </section>

          <section class="notification-section" aria-labelledby="schedule-title">
            <div class="section-heading"><p class="section-label" id="schedule-title">КОГДА ПРИСЫЛАТЬ</p></div>
            <div class="notification-list timing-list">
              <a class="notification-row quiet-row" href="/notifications?view=quiet" data-notification-link="quiet">
                <span class="row-icon violet"><img src="/integration-icons/clock-3.svg" alt="" aria-hidden="true" /></span>
                <span class="row-copy"><strong>Тихие часы</strong><small id="quiet-summary">23:00–08:00</small></span>
                <img class="row-chevron" src="/integration-icons/chevron-right.svg" alt="" aria-hidden="true" />
              </a>
              <div id="critical-policy-row" class="notification-row policy-row">
                <span class="row-icon critical"><img src="/integration-icons/shield-check.svg" alt="" aria-hidden="true" /></span>
                <span class="row-copy"><strong>Критические события</strong><small>Доставляются сразу даже в тихие часы</small></span>
                <span class="policy-state">Всегда</span>
              </div>
            </div>
          </section>

          <section class="notification-section history-entry-section">
            <a class="history-entry" href="/notifications?view=history" data-notification-link="history">
              <span class="row-icon violet"><img src="/integration-icons/activity.svg" alt="" aria-hidden="true" /></span>
              <span class="row-copy"><strong>История уведомлений</strong><small>Отправленные, запланированные и отменённые</small></span>
              <img class="row-chevron" src="/integration-icons/chevron-right.svg" alt="" aria-hidden="true" />
            </a>
          </section>

          <p class="privacy-note"><img src="/integration-icons/shield-check.svg" alt="" aria-hidden="true" />BarDoctor присылает только выбранные вами рабочие уведомления.</p>
        </section>

        <section id="category-view" class="notification-view hidden" data-notification-view="category">
          <div class="detail-intro">
            <span id="category-detail-icon" class="detail-icon"><img src="/integration-icons/activity.svg" alt="" aria-hidden="true" /></span>
            <div><p class="section-label">ЧТО ПРИСЫЛАТЬ</p><h2 id="category-detail-title">Категория</h2><p id="category-detail-description"></p></div>
          </div>
          <section class="detail-card">
            <label class="preference-switch-row">
              <span><strong>Получать уведомления</strong><small id="category-save-status">Изменения сохраняются автоматически</small></span>
              <input id="category-toggle" type="checkbox" role="switch" />
              <i aria-hidden="true"></i>
            </label>
          </section>
          <section class="notification-section">
            <div class="section-heading"><p class="section-label">СОБЫТИЯ В ЭТОЙ КАТЕГОРИИ</p></div>
            <div id="category-rule-list" class="rule-list"></div>
          </section>
          <aside class="detail-note"><img src="/integration-icons/shield-check.svg" alt="" aria-hidden="true" /><p>Показаны только события, которые BarDoctor действительно умеет определять.</p></aside>
        </section>

        <section id="quiet-view" class="notification-view hidden" data-notification-view="quiet">
          <div class="detail-intro compact"><span class="detail-icon violet"><img src="/integration-icons/clock-3.svg" alt="" aria-hidden="true" /></span><div><p class="section-label">КОГДА ПРИСЫЛАТЬ</p><h2>Тихие часы</h2><p>Обычные уведомления подождут до окончания этого периода.</p></div></div>
          <section class="detail-card quiet-editor">
            <label><span>Начало</span><input id="quiet-start" type="time" value="23:00" /></label>
            <span class="time-separator" aria-hidden="true">—</span>
            <label><span>Окончание</span><input id="quiet-end" type="time" value="08:00" /></label>
          </section>
          <p id="quiet-save-status" class="inline-save-status" role="status" aria-live="polite">Изменения сохраняются автоматически</p>
          <section class="detail-card quiet-policy-card">
            <span class="row-icon critical"><img src="/integration-icons/shield-check.svg" alt="" aria-hidden="true" /></span>
            <div><strong>Критические события приходят сразу</strong><p>Критическое происшествие или поломка важного оборудования не задерживаются тихими часами.</p></div>
          </section>
          <aside class="detail-note"><img src="/integration-icons/clock-3.svg" alt="" aria-hidden="true" /><p id="timezone-note">Время учитывается в часовом поясе вашего устройства.</p></aside>
        </section>

        <section id="history-view" class="notification-view hidden" data-notification-view="history">
          <div class="detail-intro compact history-intro"><span class="detail-icon violet"><img src="/integration-icons/activity.svg" alt="" aria-hidden="true" /></span><div><p class="section-label">ИСТОРИЯ</p><h2>Уведомления</h2><p>Подтверждённые состояния без технических данных сервиса доставки.</p></div><button id="refresh-history" class="icon-action" type="button" aria-label="Обновить историю"><img src="/integration-icons/refresh-cw.svg" alt="" aria-hidden="true" /></button></div>
          <div id="history-list" class="history-list"></div>
          <p class="scope-note">История относится к вашему аккаунту и может включать уведомления из разных доступных заведений.</p>
        </section>

        <section id="device-view" class="notification-view hidden" data-notification-view="device">
          <div class="detail-intro compact"><span id="device-detail-icon" class="detail-icon unknown"><img src="/integration-icons/activity.svg" alt="" aria-hidden="true" /></span><div><p class="section-label">НА ЭТОМ УСТРОЙСТВЕ</p><h2 id="device-detail-title">Состояние неизвестно</h2><p id="device-detail-description">Проверяю разрешение и связь устройства.</p></div></div>
          <section id="device-guidance" class="detail-card device-guidance"></section>
          <section id="ios-guidance" class="detail-card device-guidance hidden">
            <strong>На iPhone сначала добавьте BarDoctor на экран «Домой»</strong>
            <ol><li>Нажмите «Поделиться» в Safari.</li><li>Выберите «На экран “Домой”».</li><li>Откройте BarDoctor с новой иконки и вернитесь сюда.</li></ol>
          </section>
          <div class="device-actions">
            <button id="enable-push" class="notification-button primary" type="button">Включить уведомления</button>
            <button id="send-test" class="notification-button secondary hidden" type="button">Отправить проверочное уведомление</button>
            <button id="disable-push" class="notification-button quiet hidden" type="button">Отключить уведомления</button>
            <button id="refresh-device" class="notification-button secondary" type="button">Проверить снова</button>
          </div>
        </section>
      </div>
    </main>

    ${canonicalAppNavigationForRequest(request, "more")}
  </body>
</html>`;
}

export function GET(request: Request): Response {
  if (!isEmbeddedApplicationRoute(request)) return barDoctorResponse();
  return new Response(notificationsHtml(request), {
    status: 200,
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "text/html; charset=utf-8",
      "Content-Security-Policy": "default-src 'self'; script-src 'self' https://cdn.onesignal.com https://api.onesignal.com; style-src 'self'; connect-src 'self' https://api.onesignal.com https://*.onesignal.com wss://*.onesignal.com; img-src 'self' data: https://*.onesignal.com; worker-src 'self' blob:; manifest-src 'self'; base-uri 'none'; form-action 'self'; frame-ancestors 'self'",
      "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
      "Referrer-Policy": "strict-origin-when-cross-origin",
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "SAMEORIGIN",
    },
  });
}
