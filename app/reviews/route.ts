import { canonicalAppNavigationForRequest, isEmbeddedApplicationRoute } from "../../lib/bardoctor/standalone-navigation";
import { canonicalUserShellAssets } from "../../lib/bardoctor/app-shell";
import { barDoctorResponse } from "../bar-doctor-response";

function reviewsHtml(request: Request): string {
return `<!doctype html>
<html lang="ru">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <meta name="robots" content="noindex, nofollow, noarchive" />
    <meta name="theme-color" content="#f7f8fc" />
    <title>Отзывы гостей — BarDoctor</title>
    <link rel="stylesheet" href="/integrations.css?v=20260813-navigation-v180" />
    <link rel="stylesheet" href="/reviews.css?v=20260813-reviews-v179" />
    <link rel="stylesheet" href="/venue-switcher.css?v=20260826-venue-identity-v297" />
    <link rel="stylesheet" href="/navigation.css?v=20260811-navigation-v85" />
    <link rel="stylesheet" href="/modern-polish.css?v=20260811-modern-v87" />
    ${canonicalUserShellAssets()}
    <script src="/bd-route-context.js?v=20260822-navigation-v247" defer></script>
    <script src="/venue-switcher.js?v=20260826-venue-identity-v297" defer></script>
    <script src="/reviews.js?v=20260813-reviews-v179" defer></script>
    <script src="/google-business-oauth-setup.js?v=20260902-google-oauth-v401" defer></script>
    <script src="/modern-polish.js?v=20260811-modern-v87" defer></script>
  </head>
  <body data-bd-parent-route="/integrations">
    <header class="integration-header">
      <a class="icon-button" href="/integrations" aria-label="Вернуться в Интеграции" data-bd-back>
        <img src="/integration-icons/arrow-left.svg" alt="" aria-hidden="true" />
      </a>
      <div class="module-identity">
        <span class="module-identity-mark"><img src="/integration-icons/activity.svg" alt="" aria-hidden="true" /></span>
        <div><p>BARDOCTOR</p><h1>Отзывы гостей</h1></div>
      </div>
      <div class="bd-standalone-header-actions"><div class="bd-standalone-venue-host" data-bd-venue-host></div></div>
    </header>

    <main class="integration-page reviews-page">
      <div id="reviews-loading" class="page-state" role="status" aria-live="polite"><span class="spinner" aria-hidden="true"></span><div><strong>Загружаю отзывы</strong><p>Собираю данные выбранного заведения из всех источников.</p></div></div>
      <div id="reviews-auth" class="page-state error hidden"><div><strong>Нужно войти в BarDoctor</strong><p>После входа вернитесь к отзывам гостей.</p></div><a class="button secondary" href="/login">Перейти ко входу</a></div>
      <div id="reviews-error" class="page-state error hidden" role="alert"><div><strong>Не удалось загрузить отзывы</strong><p id="reviews-error-copy">Повторите попытку.</p></div><button id="reviews-retry" class="button secondary" type="button">Повторить</button></div>
      <div id="reviews-message" class="toast hidden" role="status" aria-live="polite"></div>

      <div id="reviews-content" class="reviews-content hidden">
        <section class="reviews-hero">
          <div><p class="section-label">ЕДИНЫЙ REVIEW LAYER</p><h2>Голос гостей в одном месте</h2><p>Отзывы из Google, ручного ввода и файлов проходят единый анализ BarDoctor.</p></div>
          <div class="reviews-hero-actions"><button id="add-review" class="button primary" type="button">Добавить отзыв</button><button id="import-reviews" class="button secondary" type="button">Импортировать</button></div>
        </section>

        <section class="review-kpis" aria-label="Сводка отзывов">
          <article><span>Всего отзывов</span><strong id="reviews-total">—</strong><small id="reviews-sources-count">—</small></article>
          <article><span>Средний рейтинг</span><strong id="reviews-rating">—</strong><small id="reviews-rated-count">—</small></article>
          <article><span>Динамика 30 дней</span><strong id="reviews-trend">—</strong><small id="reviews-trend-note">Недостаточно данных</small></article>
          <article><span>Последние данные</span><strong id="reviews-last">—</strong><small>по выбранному заведению</small></article>
        </section>

        <section class="reviews-dashboard-grid">
          <section class="reviews-panel" aria-labelledby="reviews-ai-title">
            <div class="panel-heading"><div><p class="section-label">AI-АНАЛИЗ</p><h2 id="reviews-ai-title">Что говорят гости</h2></div><span id="reviews-confidence" class="confidence-pill">—</span></div>
            <p id="reviews-confidence-note" class="panel-note">Выводы появятся после анализа отзывов.</p>
            <div id="reviews-analysis-state" class="analysis-state"></div>
            <div id="reviews-topics" class="topic-grid"></div>
            <div id="reviews-doctor" class="doctor-block"></div>
          </section>

          <section id="sources" class="reviews-panel" aria-labelledby="review-sources-title">
            <div class="panel-heading"><div><p class="section-label">ИСТОЧНИКИ ОТЗЫВОВ</p><h2 id="review-sources-title">Получение данных</h2></div></div>
            <div id="review-sources-list" class="review-source-list"></div>
          </section>
        </section>

        <section class="reviews-panel review-history" aria-labelledby="review-history-title">
          <div class="review-toolbar">
            <div><p class="section-label">ИСТОРИЯ</p><h2 id="review-history-title">Все отзывы</h2></div>
            <label class="review-search"><span class="sr-only">Поиск</span><input id="review-search" type="search" placeholder="Поиск по отзывам…" /></label>
          </div>
          <div id="review-source-filters" class="review-filter-row" role="group" aria-label="Фильтр по источнику"></div>
          <div id="review-list" class="review-list"></div>
        </section>
      </div>
    </main>

    <dialog id="manual-review-dialog" class="review-dialog">
      <form id="manual-review-form" method="dialog">
        <div class="dialog-heading"><div><p class="section-label">РУЧНОЙ ВВОД</p><h2>Добавить отзыв</h2></div><button class="dialog-close" type="button" data-close-dialog="manual-review-dialog" aria-label="Закрыть">×</button></div>
        <div class="form-grid">
          <label>Источник<select name="source"><option value="other">Другой источник</option><option value="google">Google</option><option value="yandex">Яндекс Карты</option><option value="2gis">2ГИС</option><option value="tripadvisor">TripAdvisor</option><option value="survey">Анкета</option></select></label>
          <label>Дата<input name="publishedAt" type="date" required /></label>
          <label>Рейтинг<select name="rating"><option value="">Без оценки</option><option value="5">5 — отлично</option><option value="4">4 — хорошо</option><option value="3">3 — нормально</option><option value="2">2 — плохо</option><option value="1">1 — очень плохо</option></select></label>
          <label>Автор<input name="authorName" type="text" maxlength="300" placeholder="Если известен" /></label>
        </div>
        <label>Текст отзыва<textarea name="text" required maxlength="20000" rows="6" placeholder="Введите отзыв гостя"></textarea></label>
        <div class="dialog-actions"><button class="button secondary" type="button" data-close-dialog="manual-review-dialog">Отмена</button><button class="button primary" type="submit">Сохранить</button></div>
      </form>
    </dialog>

    <dialog id="review-import-dialog" class="review-dialog wide-dialog">
      <form id="review-import-form" method="dialog">
        <div class="dialog-heading"><div><p class="section-label">ИМПОРТ</p><h2>Импортировать отзывы</h2></div><button class="dialog-close" type="button" data-close-dialog="review-import-dialog" aria-label="Закрыть">×</button></div>
        <p class="dialog-copy">CSV, Excel или JSON · до 6 МБ. Перед импортом BarDoctor покажет сопоставление полей.</p>
        <label>Источник по умолчанию<select name="source"><option value="other">Другой источник</option><option value="google">Google</option><option value="yandex">Яндекс Карты</option><option value="2gis">2ГИС</option><option value="tripadvisor">TripAdvisor</option><option value="survey">Анкета</option></select></label>
        <label class="file-drop"><img src="/integration-icons/file-up.svg" alt="" aria-hidden="true" /><span><strong>Выберите файл</strong><small>CSV, XLSX, XLS или JSON</small></span><input name="file" type="file" required accept=".csv,.xlsx,.xls,.json,text/csv,application/json" /></label>
        <button id="review-import-preview" class="button secondary" type="button">Проверить структуру</button>
        <section id="review-import-mapping" class="field-mapping hidden"><div class="mapping-heading"><strong>Сопоставление столбцов</strong><small id="review-import-summary"></small></div><div id="review-import-fields" class="field-mapping-list"></div><input name="fieldMapping" type="hidden" /></section>
        <div id="review-import-result" class="result-box hidden" role="status" aria-live="polite"></div>
        <div class="dialog-actions"><button class="button secondary" type="button" data-close-dialog="review-import-dialog">Отмена</button><button id="review-import-submit" class="button primary" type="submit" disabled>Импортировать</button></div>
      </form>
    </dialog>

    <dialog id="review-reply-dialog" class="review-dialog">
      <div class="dialog-heading"><div><p class="section-label">ОТВЕТ ГОСТЮ</p><h2>Черновик ответа</h2></div><button class="dialog-close" type="button" data-close-dialog="review-reply-dialog" aria-label="Закрыть">×</button></div>
      <p id="review-reply-copy" class="reply-copy"></p>
      <div class="dialog-actions"><button class="button secondary" type="button" data-close-dialog="review-reply-dialog">Закрыть</button><button id="copy-review-reply" class="button primary" type="button">Скопировать</button></div>
    </dialog>

    ${canonicalAppNavigationForRequest(request, "more")}
  </body>
</html>`;
}

export function GET(request: Request): Response {
  if (!isEmbeddedApplicationRoute(request)) return barDoctorResponse();
  return new Response(reviewsHtml(request), {
    status: 200,
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "text/html; charset=utf-8",
      "Content-Security-Policy": "default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self' data: https:; base-uri 'none'; form-action 'self'; frame-ancestors 'self'",
      "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
      "Referrer-Policy": "no-referrer",
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "SAMEORIGIN",
    },
  });
}
