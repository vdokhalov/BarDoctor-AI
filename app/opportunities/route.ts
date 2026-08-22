import { barDoctorResponse } from "../bar-doctor-response";
import { canonicalUserShellAssets } from "../../lib/bardoctor/app-shell";

const OPPORTUNITIES_HTML = `<!doctype html>
<html lang="ru">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <meta name="robots" content="noindex, nofollow, noarchive" />
    <meta name="theme-color" content="#11162f" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <meta name="apple-mobile-web-app-title" content="BarDoctor" />
    <title>Календарь возможностей — BarDoctor</title>
    <link rel="icon" type="image/svg+xml" href="/favicon-v159.svg" />
    <link rel="manifest" href="/manifest.json?v=20260812-brand-v159" />
    <link rel="apple-touch-icon" sizes="180x180" href="/icons/bardoctor-v159-apple-180.png" />
    <link rel="stylesheet" href="/opportunities.css?v=20260808-desktop-v55" />
    <link rel="stylesheet" href="/venue-switcher.css?v=20260813-venue-v174" />
    <link rel="stylesheet" href="/brand-identity-v159.css?v=20260812-brand-v159" />
    <link rel="stylesheet" href="/modern-polish.css?v=20260811-modern-v87" />
    ${canonicalUserShellAssets()}
    <script src="/bd-route-context.js?v=20260822-navigation-v247" defer></script>
    <script src="/venue-switcher.js?v=20260813-venue-v174" defer></script>
    <script src="/opportunities.js?v=20260808-rc-v67" defer></script>
    <script src="/modern-polish.js?v=20260811-modern-v87" defer></script>
  </head>
  <body data-bd-parent-route="/home">
    <header class="opportunity-topbar">
      <a class="icon-button" href="/home" aria-label="Вернуться на главную" data-bd-back>←</a>
      <div class="topbar-brand">
        <img class="brand-mark" src="/icons/bardoctor-mark-v159.svg" alt="" aria-hidden="true" />
        <div><p>BARDOCTOR</p><strong id="venue-name">Календарь возможностей</strong></div>
      </div>
      <div class="bd-standalone-header-actions">
        <div class="bd-standalone-venue-host" data-bd-venue-host></div>
        <a class="icon-button bell-button" href="/notifications" aria-label="Настройки уведомлений">♢</a>
      </div>
    </header>

    <main class="opportunity-page">
      <section class="opportunity-hero">
        <div class="hero-grid" aria-hidden="true"></div>
        <div class="hero-glow" aria-hidden="true"></div>
        <div class="hero-copy">
          <p class="hero-kicker"><span></span> СОБЫТИЯ, КОТОРЫЕ МОГУТ ДАТЬ РЕЗУЛЬТАТ</p>
          <h1>Календарь<br />возможностей</h1>
          <p>BarDoctor сам находит праздники, концерты, матчи, фестивали и городские события — затем оценивает пользу именно для вашего заведения.</p>
        </div>
        <div class="hero-score" aria-label="Главная оценка календаря">
          <span>ВЫСОКИЙ ПОТЕНЦИАЛ</span>
          <strong id="hero-high-count">—</strong>
          <small id="hero-window">проверяю события</small>
        </div>
      </section>

      <section class="scan-card" aria-labelledby="scan-title">
        <div class="scan-heading">
          <span class="scan-icon" aria-hidden="true"><i></i></span>
          <div>
            <p class="eyebrow">ЛОКАЛЬНЫЙ СКАНЕР</p>
            <h2 id="scan-title">Что происходит вокруг</h2>
            <p id="scan-location">Определяю город из профиля заведения…</p>
          </div>
        </div>
        <div class="scan-meta">
          <span><b id="scan-updated">—</b><small>последнее обновление</small></span>
          <span><b id="scan-period">365 дней</b><small>горизонт поиска</small></span>
          <span><b id="scan-push">—</b><small>уведомления</small></span>
        </div>
        <button id="refresh-calendar" class="primary-button" type="button"><span>↻</span><b>Обновить возможности</b></button>
        <p class="request-note">Обновляется автоматически раз в 7 дней · ручное обновление использует 1 AI‑запрос</p>
      </section>

      <section id="notice" class="notice hidden" role="status" aria-live="polite"></section>

      <section id="loading" class="loading-card hidden" aria-live="polite">
        <div class="calendar-loader" aria-hidden="true"><i></i><b></b><span></span></div>
        <p class="eyebrow">BARDOCTOR ИЩЕТ РЕАЛЬНЫЕ ПОВОДЫ</p>
        <h2 id="loading-title">Собираю календарь для вашего города</h2>
        <div class="loading-steps">
          <span class="active">Проверяю праздники и городские события</span>
          <span>Ищу концерты, фестивали и спорт</span>
          <span>Сверяю с форматом и графиком заведения</span>
          <span>Рассчитываю потенциал и рекомендации</span>
        </div>
        <p>Поиск по открытым источникам может занять до минуты.</p>
      </section>

      <section id="empty-state" class="empty-card hidden">
        <span class="empty-icon" aria-hidden="true">◷</span>
        <h2>Календарь ещё не собран</h2>
        <p>BarDoctor возьмёт город и формат из профиля, найдёт подтверждённые события и сам оценит, какие из них стоит использовать.</p>
        <button id="empty-refresh" class="primary-button" type="button"><span>⌖</span><b>Найти возможности</b></button>
      </section>

      <div id="calendar-content" class="calendar-content hidden">
        <section id="spotlight" class="spotlight-card"></section>

        <section class="calendar-toolbar" aria-labelledby="calendar-title">
          <div>
            <p id="events-window-label" class="eyebrow">БЛИЖАЙШИЕ 365 ДНЕЙ</p>
            <h2 id="calendar-title">События по дате</h2>
          </div>
          <span id="visible-count" class="count-badge">0 событий</span>
        </section>

        <div id="filters" class="filter-row" role="group" aria-label="Фильтр календаря">
          <button class="active" type="button" data-filter="all" aria-pressed="true">Все</button>
          <button type="button" data-filter="high" aria-pressed="false">Высокий потенциал</button>
          <button type="button" data-filter="sport" aria-pressed="false">Спорт</button>
          <button type="button" data-filter="concert" aria-pressed="false">Концерты</button>
          <button type="button" data-filter="holiday" aria-pressed="false">Праздники и даты</button>
          <button type="button" data-filter="festival" aria-pressed="false">Фестивали</button>
          <button type="button" data-filter="planned" aria-pressed="false">В работе</button>
        </div>

        <section id="event-list" class="event-list" aria-live="polite"></section>

        <details class="method-card">
          <summary>Как BarDoctor оценивает пользу <span>?</span></summary>
          <div>
            <p>Сначала BarDoctor проверяет четыре уровня: официальный календарь страны, даты региона, календарь города и актуальную локальную афишу.</p>
            <p>Если город новый для системы, BarDoctor самостоятельно определяет его административный регион по подтверждённым источникам.</p>
            <p>Для локальных событий действует радиус до 35 км. Удалённый фестиваль или марафон не попадёт в рекомендации без доказанной связи с гостями заведения.</p>
            <p>Оценка из 100 складывается из пяти факторов: соответствие аудитории, совпадение с графиком, близость события, коммерческий потенциал и реалистичность подготовки.</p>
            <p>Проценты роста не выдумываются. Если данных для прогноза мало, приложение прямо показывает, что эффект пока является гипотезой.</p>
          </div>
        </details>
      </div>
    </main>

    <nav class="opportunity-bottom-nav" aria-label="Основная навигация">
      <a class="active" href="/home"><span>⌂</span>Главная</a>
      <a href="/shifts"><span>▥</span>Смены</a>
      <a href="/finance"><span>₽</span>Финансы</a>
      <button id="opportunity-quick-add" class="quick-add-action" type="button" aria-expanded="false" aria-controls="opportunity-quick-sheet"><span>＋</span>Добавить</button>
      <a href="/employees"><span>♙</span>Команда</a>
      <a href="/more"><span>•••</span>Ещё</a>
    </nav>

    <button id="opportunity-quick-backdrop" class="quick-backdrop hidden" type="button" aria-label="Закрыть меню добавления"></button>
    <section id="opportunity-quick-sheet" class="quick-sheet hidden" aria-labelledby="opportunity-quick-title" aria-hidden="true">
      <div class="quick-heading"><div><h2 id="opportunity-quick-title">Добавить</h2><p>Выберите действие</p></div><button id="opportunity-quick-close" type="button" aria-label="Закрыть">×</button></div>
      <div class="quick-list">
        <button type="button" data-route="/shifts?closeShift=1"><span>▥</span><b>Закрыть смену<small>Внести выручку и состав команды</small></b><i>›</i></button>
        <button type="button" data-route="/suppliers?create=1&returnTo=opportunities"><span>₽</span><b>Добавить покупку<small>Чек, файл или ручной ввод</small></b><i>›</i></button>
        <button type="button" data-route="/add"><span>!</span><b>Сообщить о происшествии<small>Зафиксировать проблему или жалобу</small></b><i>›</i></button>
        <button type="button" data-route="/tasks?new=1"><span>✓</span><b>Создать поручение<small>Назначить задачу сотруднику</small></b><i>›</i></button>
      </div>
    </section>
  </body>
</html>`;

export function GET(request: Request): Response {
  const embedded = new URL(request.url).searchParams.get("embedded") === "1";
  if (!embedded) return barDoctorResponse();
  const html = OPPORTUNITIES_HTML.replace('<html lang="ru">', '<html lang="ru" data-bd-embedded="true">');

  return new Response(html, {
    status: 200,
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "text/html; charset=utf-8",
      "Content-Security-Policy": "default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self' data:; base-uri 'none'; form-action 'self'; frame-ancestors 'self'",
      "Referrer-Policy": "strict-origin-when-cross-origin",
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "SAMEORIGIN",
    },
  });
}
