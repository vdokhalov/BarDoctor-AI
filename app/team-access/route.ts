import { barDoctorResponse } from "../bar-doctor-response";
import { canonicalUserShellAssets } from "../../lib/bardoctor/app-shell";

const TEAM_ACCESS_HTML = `<!doctype html>
<html lang="ru">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <meta name="robots" content="noindex, nofollow, noarchive" />
    <meta name="theme-color" content="#f7f7fb" />
    <title>Роли и доступ — BarDoctor</title>
    <link rel="stylesheet" href="/team-access.css?v=20260813-access-v171" />
    <link rel="stylesheet" href="/venue-switcher.css?v=20260813-venue-v174" />
    <link rel="stylesheet" href="/brand-identity-v159.css?v=20260812-brand-v159" />
    <link rel="stylesheet" href="/modern-polish.css?v=20260811-modern-v87" />
    ${canonicalUserShellAssets()}
    <script src="/bd-route-context.js?v=20260814-navigation-v185" defer></script>
    <script src="/venue-switcher.js?v=20260813-venue-v174" defer></script>
    <script src="/team-access.js?v=20260813-access-v171" defer></script>
    <script src="/modern-polish.js?v=20260811-modern-v87" defer></script>
  </head>
  <body data-bd-parent-route="/employees">
    <header class="access-header">
      <a href="/employees" data-bd-back aria-label="Назад">←</a>
      <div class="access-brand">
        <img src="/icons/bardoctor-mark-v159.svg" alt="" aria-hidden="true" />
        <div><small>КОМАНДА</small><strong>Роли и доступ</strong></div>
      </div>
      <div data-bd-venue-host></div>
    </header>
    <main class="access-main">
      <div id="access-notice" class="access-notice hidden" role="status" aria-live="polite"></div>
      <section class="access-intro">
        <div><p>ЕДИНОЕ МЕСТО УПРАВЛЕНИЯ</p><h1>Кто и что может делать</h1><span>Роли и права действуют только внутри выбранного заведения. Все изменения доступа фиксируются в журнале «Контроля данных».</span></div>
        <b id="current-role">Загрузка…</b>
      </section>
      <div id="access-loading" class="access-loading">Загружаю участников и права…</div>
      <div id="access-content" class="hidden">
        <section>
          <div class="section-title"><div><p>РОЛИ</p><h2>Уровни доступа</h2></div></div>
          <div id="role-cards" class="role-grid"></div>
        </section>
        <section id="invite-section" class="access-card hidden">
          <div class="card-title"><div><p>ПРИГЛАШЕНИЕ</p><h2>Добавить участника</h2></div></div>
          <p class="help">Создайте одноразовый код. Пароль сотрудника вам не показывается и не передаётся.</p>
          <div class="invite-controls">
            <label>Роль<select id="invite-role"><option value="manager">Управляющий</option><option value="shift_manager">Менеджер</option></select></label>
            <button id="create-invite" type="button">Создать код</button>
          </div>
          <div id="invite-result" class="invite-result hidden">
            <small>ОДНОРАЗОВЫЙ КОД</small><strong id="invite-code">—</strong><p id="invite-expiry"></p>
            <div><button id="copy-invite-code" type="button">Копировать код</button><button id="copy-invite-link" type="button">Копировать ссылку</button></div>
          </div>
          <div id="active-invites" class="compact-list"></div>
        </section>
        <section class="access-card">
          <div class="card-title"><div><p>УЧАСТНИКИ</p><h2>Доступ к заведению</h2></div><b id="member-count">0</b></div>
          <div id="member-list" class="member-list"></div>
        </section>
        <section class="access-card join-card">
          <div class="card-title"><div><p>ДРУГОЕ ЗАВЕДЕНИЕ</p><h2>Присоединиться по коду</h2></div></div>
          <p class="help">Если вас пригласили в другое заведение, введите код владельца. Данные заведений не объединяются.</p>
          <div class="join-controls"><input id="join-code" type="text" autocomplete="one-time-code" placeholder="BD-XXXX-XXXX" maxlength="14" /><button id="join-venue" type="button">Подключить</button></div>
        </section>
      </div>
    </main>
    <div id="permission-sheet" class="permission-shell hidden" role="dialog" aria-modal="true" aria-labelledby="permission-title">
      <button class="permission-backdrop" type="button" data-close-permissions aria-label="Закрыть"></button>
      <aside class="permission-panel">
        <header><div><p>ИНДИВИДУАЛЬНЫЕ ПРАВА</p><h2 id="permission-title">Настройка доступа</h2><span id="permission-subtitle"></span></div><button type="button" data-close-permissions aria-label="Закрыть">×</button></header>
        <div id="permission-list" class="permission-list"></div>
        <footer><button id="reset-permissions" type="button">По роли</button><button id="save-permissions" type="button">Сохранить права</button></footer>
      </aside>
    </div>
  </body>
</html>`;

export function GET(request: Request): Response {
  if (new URL(request.url).searchParams.get("embedded") !== "1") return barDoctorResponse();
  return new Response(TEAM_ACCESS_HTML, {
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "text/html; charset=utf-8",
      "Content-Security-Policy": "default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self' data:; base-uri 'none'; form-action 'self'; frame-ancestors 'self'",
      "Referrer-Policy": "no-referrer",
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "SAMEORIGIN",
    },
  });
}
