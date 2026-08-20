import { internalAdminRouteState } from "../../lib/bardoctor/platform-admin";

function securityHeaders(contentType = "text/html; charset=utf-8"): HeadersInit {
  return {
    "Content-Type": contentType,
    "Cache-Control": "no-store",
    "Pragma": "no-cache",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "no-referrer",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=()",
    "Content-Security-Policy": "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'; object-src 'none'",
    "X-Robots-Tag": "noindex, nofollow, noarchive",
  };
}

function bootstrapHtml(): string {
  return `<!doctype html>
<html lang="ru">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <meta name="robots" content="noindex, nofollow, noarchive" />
    <meta name="theme-color" content="#111827" />
    <title>Активация Internal Admin — BarDoctor</title>
    <link rel="stylesheet" href="/admin-v175.css?v=20260813-admin-bootstrap-v176" />
    <script src="/admin-bootstrap-v176.js?v=20260813-admin-bootstrap-v176" defer></script>
  </head>
  <body class="admin-bootstrap-page">
    <main class="admin-bootstrap-shell">
      <header class="admin-bootstrap-brand">
        <span class="admin-brand-mark">BD</span>
        <span><strong>BarDoctor</strong><small>Internal Admin v2</small></span>
      </header>
      <section class="admin-activation" aria-labelledby="admin-bootstrap-title">
        <span class="admin-lock" aria-hidden="true">◆</span>
        <p class="admin-bootstrap-kicker">УПРАВЛЕНИЕ ПЛАТФОРМОЙ</p>
        <h1 id="admin-bootstrap-title">Активировать Internal Admin</h1>
        <p>Доступ будет привязан к текущему аккаунту BarDoctor как отдельное platform-level permission. Права внутри заведений не изменятся.</p>
        <button id="admin-bootstrap-claim" type="button">Активировать Internal Admin</button>
        <p class="admin-bootstrap-note">После активации откроется системная панель. Действие будет записано в отдельный журнал платформы.</p>
      </section>
      <a class="admin-bootstrap-back" href="/home">← Вернуться в BarDoctor</a>
    </main>
    <div id="admin-toast" class="admin-toast" role="status" aria-live="polite"></div>
  </body>
</html>`;
}

const DENIED_HTML = `<!doctype html>
<html lang="ru"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex,nofollow"><title>Страница не найдена</title>
<link rel="stylesheet" href="/admin-v175.css?v=20260813-admin-v175"></head>
<body class="admin-denied" data-access-pending="true"><main><span>404</span><h1>Страница не найдена</h1><a href="/home">Вернуться в BarDoctor</a></main>
<script src="/admin-session-bridge-v176.js?v=20260813-admin-bootstrap-v176" defer></script></body></html>`;

function adminHtml(): string {
  return `<!doctype html>
<html lang="ru">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <meta name="robots" content="noindex, nofollow, noarchive" />
    <meta name="theme-color" content="#111827" />
    <title>Internal Admin — BarDoctor</title>
    <link rel="stylesheet" href="/admin-v175.css?v=20260813-admin-v179" />
    <script src="/admin-v175.js?v=20260813-admin-v179" defer></script>
  </head>
  <body>
    <div class="admin-shell">
      <aside class="admin-sidebar" aria-label="Навигация Internal Admin">
        <a class="admin-brand" href="/admin" aria-label="Главная Internal Admin">
          <span class="admin-brand-mark">BD</span>
          <span><strong>BarDoctor</strong><small>Internal Admin v2</small></span>
        </a>
        <nav id="admin-nav">
          <button type="button" data-section="dashboard" class="active"><span>▦</span>Обзор</button>
          <button type="button" data-section="users"><span>◎</span>Пользователи</button>
          <button type="button" data-section="venues"><span>⌂</span>Заведения</button>
          <button type="button" data-section="integrations"><span>⇄</span>Интеграции</button>
          <button type="button" data-section="reviews"><span>★</span>Отзывы</button>
          <button type="button" data-section="ai"><span>✦</span>AI</button>
          <button type="button" data-section="push"><span>◉</span>Push</button>
          <button type="button" data-section="system"><span>◇</span>Система</button>
          <button type="button" data-section="audit"><span>≡</span>Журнал</button>
        </nav>
        <div class="admin-sidebar-foot">
          <span class="admin-environment">ПРОДАКШЕН</span>
          <a href="/home">Открыть BarDoctor ↗</a>
        </div>
      </aside>

      <section class="admin-workspace">
        <header class="admin-topbar">
          <button id="admin-menu" type="button" aria-label="Открыть навигацию">☰</button>
          <div><small>УПРАВЛЕНИЕ ПЛАТФОРМОЙ</small><h1 id="admin-title">Обзор</h1></div>
          <div id="admin-identity" class="admin-identity"><span></span><strong>Проверка доступа…</strong></div>
        </header>
        <main id="admin-main" tabindex="-1">
          <div class="admin-loading"><span></span><p>Загружаю реальные сигналы платформы…</p></div>
        </main>
      </section>
    </div>
    <button id="admin-backdrop" class="admin-backdrop" type="button" aria-label="Закрыть навигацию" hidden></button>
    <div id="admin-detail" class="admin-detail" hidden aria-hidden="true"></div>
    <div id="admin-toast" class="admin-toast" role="status" aria-live="polite"></div>
  </body>
</html>`;
}

export async function GET(request: Request): Promise<Response> {
  const state = await internalAdminRouteState(request);
  if (state === "denied") return new Response(DENIED_HTML, { status: 404, headers: securityHeaders() });
  if (state === "bootstrap") return new Response(bootstrapHtml(), { headers: securityHeaders() });
  return new Response(adminHtml(), { headers: securityHeaders() });
}
