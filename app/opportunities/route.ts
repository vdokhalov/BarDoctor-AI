import { barDoctorResponse } from "../bar-doctor-response";
import { canonicalUserShellAssets } from "../../lib/bardoctor/app-shell";

const OPPORTUNITIES_HTML = `<!doctype html>
<html lang="ru">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <meta name="robots" content="noindex, nofollow, noarchive" />
    <meta name="theme-color" content="#f7f8fc" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="default" />
    <meta name="apple-mobile-web-app-title" content="BarDoctor" />
    <title>Календарь возможностей — BarDoctor</title>
    <link rel="icon" type="image/svg+xml" href="/favicon-v159.svg" />
    <link rel="manifest" href="/manifest.json?v=20260812-brand-v159" />
    <link rel="apple-touch-icon" sizes="180x180" href="/icons/bardoctor-v159-apple-180.png" />
    <link rel="stylesheet" href="/opportunities.css?v=20260828-opportunity-calendar-v327" />
    <link rel="stylesheet" href="/venue-switcher.css?v=20260826-venue-identity-v297" />
    <link rel="stylesheet" href="/brand-identity-v159.css?v=20260812-brand-v159" />
    <link rel="stylesheet" href="/modern-polish.css?v=20260811-modern-v87" />
    ${canonicalUserShellAssets()}
    <script src="/bd-route-context.js?v=20260822-navigation-v247" defer></script>
    <script src="/venue-switcher.js?v=20260826-venue-identity-v297" defer></script>
    <script src="/opportunity-calendar-qa-v327.js?v=20260828-opportunity-calendar-v328" defer></script>
    <script src="/opportunity-calendar-client-v327.js?v=20260828-opportunity-calendar-v327" defer></script>
    <script src="/opportunities.js?v=20260828-opportunity-calendar-v328" defer></script>
    <script src="/modern-polish.js?v=20260811-modern-v87" defer></script>
  </head>
  <body data-bd-parent-route="/home">
    <header class="opportunity-topbar">
      <a class="icon-button" href="/home" aria-label="Вернуться на главную" data-bd-back>←</a>
      <h1>Календарь возможностей</h1>
      <div class="bd-standalone-header-actions">
        <div class="bd-standalone-venue-host" data-bd-venue-host></div>
      </div>
    </header>

    <main class="opportunity-page">
      <section class="calendar-status-row" aria-live="polite">
        <p id="calendar-status"><i aria-hidden="true"></i><span>Загружаю сохранённые данные…</span></p>
        <button id="refresh-calendar" class="secondary-button" type="button"><span aria-hidden="true">↻</span><b>Обновить</b></button>
      </section>

      <section id="notice" class="notice hidden" role="status" aria-live="polite"></section>

      <section id="calendar-summary" class="calendar-summary hidden" aria-label="Кратко о календаре">
        <article>
          <p>Ближайшее событие</p>
          <strong id="summary-nearest-value">—</strong>
          <span id="summary-nearest-title">Событий пока нет</span>
        </article>
        <article>
          <p>Высокий потенциал</p>
          <strong id="summary-high-value">—</strong>
          <span>с потенциалом 70+</span>
        </article>
        <article>
          <p>Период анализа</p>
          <strong id="summary-period-value">—</strong>
          <span id="summary-period-range">—</span>
        </article>
      </section>

      <section id="loading" class="loading-card hidden" aria-live="polite">
        <div class="calendar-loader" aria-hidden="true"></div>
        <p>Загружаю сохранённый календарь…</p>
      </section>

      <section id="empty-state" class="empty-card hidden">
        <h2>Календарь ещё не собран</h2>
        <p>BarDoctor возьмёт город и формат из профиля и сохранит найденные события на сервере.</p>
        <button id="empty-refresh" class="secondary-button" type="button"><b>Найти возможности</b></button>
      </section>

      <div id="calendar-content" class="calendar-content hidden">
        <section class="calendar-toolbar" aria-labelledby="calendar-title">
          <h2 id="calendar-title">События</h2>
          <button id="filter-toggle" class="filter-toggle" type="button" aria-expanded="false" aria-controls="filters">Фильтры <span id="visible-count">0</span></button>
        </section>

        <div id="filters" class="filter-row" role="group" aria-label="Фильтр календаря">
          <button class="active" type="button" data-filter="all" aria-pressed="true">Все</button>
          <button type="button" data-filter="high" aria-pressed="false">Высокий потенциал</button>
          <button type="button" data-filter="sport" aria-pressed="false">Спорт</button>
          <button type="button" data-filter="concert" aria-pressed="false">Концерты</button>
          <button type="button" data-filter="holiday" aria-pressed="false">Праздники</button>
          <button type="button" data-filter="festival" aria-pressed="false">Фестивали</button>
          <button type="button" data-filter="planned" aria-pressed="false">В работе</button>
        </div>

        <section id="event-list" class="event-list" aria-live="polite"></section>

        <p class="auto-update-info"><i aria-hidden="true">i</i><span>Календарь возможностей обновляется автоматически каждые 7 дней и сохраняет последние результаты.</span></p>

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
  const url = new URL(request.url);
  const params = url.searchParams;
  const qaEnabled = ["terminal.local", "127.0.0.1", "localhost"].includes(url.hostname)
    && params.get("qaOpportunity") === "v327";
  const qaViewport = params.get("qaViewport");
  if (qaEnabled && ["390", "430"].includes(qaViewport || "")) {
    const refresh = params.get("qaRefresh") === "fail" ? "&qaRefresh=fail" : "";
    const qaGet = ["hang", "fail"].includes(params.get("qaGet") || "") ? `&qaGet=${params.get("qaGet")}` : "";
    const frame = `<!doctype html><html lang="ru"><head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /><meta name="robots" content="noindex,nofollow" /><link rel="stylesheet" href="/opportunity-calendar-qa-frame-v327.css" /></head><body><div class="qa-device w${qaViewport}"><iframe title="QA Календарь возможностей" src="/opportunities?standaloneQa=1&qaOpportunity=v327${refresh}${qaGet}"></iframe></div></body></html>`;
    return new Response(frame, { status: 200, headers: { "Cache-Control": "no-store", "Content-Type": "text/html; charset=utf-8", "Content-Security-Policy": "default-src 'none'; style-src 'self'; frame-src 'self'; base-uri 'none'", "X-Robots-Tag": "noindex, nofollow" } });
  }
  const embedded = params.get("embedded") === "1";
  const standaloneQa = qaEnabled && params.get("standaloneQa") === "1";
  if (!embedded && !standaloneQa) return barDoctorResponse();
  const html = embedded ? OPPORTUNITIES_HTML.replace('<html lang="ru">', '<html lang="ru" data-bd-embedded="true">') : OPPORTUNITIES_HTML;

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
