import { barDoctorResponse } from "../bar-doctor-response";
import { canonicalUserShellAssets } from "../../lib/bardoctor/app-shell";

const MARKET_HTML = `<!doctype html>
<html lang="ru">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <meta name="robots" content="noindex, nofollow, noarchive" />
    <meta name="theme-color" content="#11152f" />
    <title>Локальный рынок — BarDoctor</title>
    <link rel="stylesheet" href="/market.css?v=20260811-navigation-v85" />
    <link rel="stylesheet" href="/venue-switcher.css?v=20260813-venue-v174" />
    <link rel="stylesheet" href="/brand-identity-v159.css?v=20260812-brand-v159" />
    <link rel="stylesheet" href="/modern-polish.css?v=20260811-modern-v87" />
    ${canonicalUserShellAssets()}
    <script src="/bd-route-context.js?v=20260814-navigation-v185" defer></script>
    <script src="/venue-switcher.js?v=20260813-venue-v174" defer></script>
    <script src="/market.js?v=20260802-embedded-nav-v30" defer></script>
    <script src="/modern-polish.js?v=20260811-modern-v87" defer></script>
  </head>
  <body data-bd-parent-route="/home">
    <header class="market-topbar">
      <a class="icon-button" href="/home" aria-label="Вернуться на главную" data-bd-back>←</a>
      <div class="topbar-brand">
        <img class="brand-mark" src="/icons/bardoctor-mark-v159.svg" alt="" aria-hidden="true" />
        <div>
          <p>BARDOCTOR</p>
          <strong id="venue-name">Локальный рынок</strong>
        </div>
      </div>
      <div class="bd-standalone-venue-host" data-bd-venue-host></div>
    </header>

    <main class="market-page">
      <section class="market-hero">
        <div class="hero-grid" aria-hidden="true"></div>
        <div class="hero-orbit orbit-one" aria-hidden="true"></div>
        <div class="hero-orbit orbit-two" aria-hidden="true"></div>
        <div class="hero-content">
          <p class="hero-kicker"><span></span> РЫНОК ВОКРУГ ВАС</p>
          <h1>Локальный рынок<br />и конкуренты</h1>
          <p>BarDoctor изучает реальную локацию, соседние заведения и открытые источники — затем переводит выводы в конкретные действия.</p>
          <div class="hero-pills">
            <span>⌖ Геолокация</span>
            <span>◎ Актуальные источники</span>
            <span>✓ Конкретные рекомендации</span>
          </div>
        </div>
        <div class="hero-radar" aria-hidden="true">
          <span class="radar-core"></span>
          <span class="radar-dot dot-a"></span>
          <span class="radar-dot dot-b"></span>
          <span class="radar-dot dot-c"></span>
        </div>
      </section>

      <section class="market-control-card" aria-labelledby="control-title">
        <div class="section-heading compact-heading">
          <span class="section-icon blue">⌖</span>
          <div>
            <p class="eyebrow">ОСНОВА АНАЛИЗА</p>
            <h2 id="control-title">Где находится заведение</h2>
          </div>
        </div>
        <label class="field-label" for="market-address">Адрес, район или ориентир</label>
        <div class="location-row">
          <input id="market-address" type="text" maxlength="240" placeholder="Например: Бендеры, улица Калинина" />
          <button id="use-location" class="location-button" type="button" aria-describedby="location-status">⌖</button>
        </div>
        <p id="location-status" class="field-help">Можно использовать геолокацию телефона — только после вашего нажатия.</p>
        <label class="field-label" for="market-focus">Что проверить особенно <span>необязательно</span></label>
        <textarea id="market-focus" maxlength="500" rows="3" placeholder="Например: ночные бары, цены на коктейли, аудитория после 23:00"></textarea>
        <button id="run-analysis" class="primary-button" type="button">
          <span class="button-icon">↻</span>
          <span id="run-label">Провести анализ</span>
        </button>
        <div class="control-meta">
          <span id="analysis-date">Анализ ещё не запускался</span>
          <span>Используется 1 AI-запрос</span>
        </div>
      </section>

      <section id="notice" class="notice hidden" role="status" aria-live="polite"></section>

      <section id="loading" class="loading-card hidden" aria-live="polite">
        <div class="radar-loader" aria-hidden="true"><span></span></div>
        <p class="eyebrow">BARDOCTOR ИССЛЕДУЕТ РАЙОН</p>
        <h2>Собираю рыночную картину</h2>
        <div class="loading-steps">
          <span class="active">Определяю локацию</span>
          <span>Ищу реальные заведения рядом</span>
          <span>Сравниваю форматы и цены</span>
          <span>Формирую действия</span>
        </div>
        <p>Обычно это занимает до одной минуты.</p>
      </section>

      <section id="empty-state" class="empty-card">
        <span class="empty-icon">◎</span>
        <h2>Конкуренты ещё не найдены</h2>
        <p>Уточните локацию и запустите анализ. BarDoctor соберёт список реальных заведений рядом, а вы подтвердите тех, с кем действительно конкурируете.</p>
      </section>

      <div id="market-results" class="market-results hidden">
        <section class="result-overview">
          <div>
            <p class="eyebrow">СВОДКА ПО ЛОКАЦИИ</p>
            <h2 id="result-location">—</h2>
            <p id="result-meta">—</p>
          </div>
          <div class="overview-metrics">
            <div><strong id="competitor-count">0</strong><span>найдено</span></div>
            <div><strong id="confirmed-competitor-count">0</strong><span>подтверждено</span></div>
            <div><strong id="source-count">0</strong><span>источников</span></div>
          </div>
        </section>

        <section id="competitors-card" class="result-card"></section>
        <section id="location-card" class="result-card"></section>
        <section id="economy-card" class="result-card"></section>
        <div class="two-column-results">
          <section id="opportunities-card" class="result-card accent-green"></section>
          <section id="risks-card" class="result-card accent-orange"></section>
        </div>
        <section id="pricing-card" class="result-card"></section>
        <section id="marketing-card" class="result-card"></section>
        <section id="actions-card" class="result-card action-card"></section>
        <details id="assumptions-card" class="result-card assumptions-card">
          <summary>Что требует проверки</summary>
          <div id="assumptions-content"></div>
        </details>
        <section id="sources-card" class="result-card sources-card"></section>
      </div>
    </main>

    <nav class="market-bottom-nav" aria-label="Основная навигация">
      <a class="active" href="/home"><span>⌂</span>Главная</a>
      <a href="/shifts"><span>▥</span>Смены</a>
      <a href="/finance"><span>₽</span>Финансы</a>
      <button id="market-quick-add" class="market-add-action" type="button" aria-expanded="false" aria-controls="market-quick-sheet"><span>＋</span>Добавить</button>
      <a href="/employees"><span>♙</span>Команда</a>
      <a href="/more"><span>•••</span>Ещё</a>
    </nav>

    <button id="market-quick-backdrop" class="market-quick-backdrop hidden" type="button" aria-label="Закрыть меню добавления"></button>
    <section id="market-quick-sheet" class="market-quick-sheet hidden" aria-labelledby="market-quick-title" aria-hidden="true">
      <div class="market-quick-heading">
        <div>
          <h2 id="market-quick-title">Добавить</h2>
          <p>Выберите действие</p>
        </div>
        <button id="market-quick-close" type="button" aria-label="Закрыть">×</button>
      </div>
      <div class="market-quick-list">
        <button type="button" data-route="/shifts?closeShift=1"><span>▥</span><b>Закрыть смену<small>Внести выручку и состав команды</small></b><i>›</i></button>
        <button type="button" data-route="/suppliers?create=1&returnTo=market"><span>₽</span><b>Добавить покупку<small>Чек, файл или ручной ввод</small></b><i>›</i></button>
        <button type="button" data-route="/add"><span>!</span><b>Сообщить о происшествии<small>Зафиксировать проблему или жалобу</small></b><i>›</i></button>
        <button type="button" data-route="/tasks?new=1"><span>✓</span><b>Создать поручение<small>Назначить задачу сотруднику</small></b><i>›</i></button>
      </div>
    </section>
  </body>
</html>`;

export function GET(request: Request): Response {
  const embedded = new URL(request.url).searchParams.get("embedded") === "1";
  if (!embedded) return barDoctorResponse();
  const html = MARKET_HTML.replace('<html lang="ru">', '<html lang="ru" data-bd-embedded="true">');

  return new Response(html, {
    status: 200,
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "text/html; charset=utf-8",
      "Content-Security-Policy": "default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self' data:; base-uri 'none'; form-action 'self'; frame-ancestors 'self'",
      "Permissions-Policy": "camera=(), microphone=(), geolocation=(self)",
      "Referrer-Policy": "strict-origin-when-cross-origin",
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "SAMEORIGIN",
    },
  });
}
