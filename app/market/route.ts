import { barDoctorResponse } from "../bar-doctor-response";
import { canonicalUserShellAssets } from "../../lib/bardoctor/app-shell";

const MARKET_HTML = `<!doctype html>
<html lang="ru"><head>
<meta charset="UTF-8" /><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover" />
<meta name="robots" content="noindex,nofollow,noarchive" /><meta name="theme-color" content="#f7f8fc" />
<title>Конкуренты — BarDoctor</title>
<link rel="stylesheet" href="/market.css?v=20260828-competitors-v329" />
<link rel="stylesheet" href="/venue-switcher.css?v=20260826-venue-identity-v297" />
<link rel="stylesheet" href="/brand-identity-v159.css?v=20260812-brand-v159" />
<link rel="stylesheet" href="/modern-polish.css?v=20260811-modern-v87" />
${canonicalUserShellAssets()}
<script src="/bd-route-context.js?v=20260822-navigation-v247" defer></script>
<script src="/venue-switcher.js?v=20260826-venue-identity-v297" defer></script>
<script src="/competitor-market-qa-v329.js?v=20260828-competitors-v329" defer></script>
<script src="/competitor-market-client-v329.js?v=20260828-competitors-v329" defer></script>
<script src="/market.js?v=20260828-competitors-v329" defer></script>
<script src="/modern-polish.js?v=20260811-modern-v87" defer></script>
</head><body data-bd-parent-route="/home">
<header class="market-topbar"><a class="icon-button" href="/home" aria-label="Вернуться на главную" data-bd-back>‹</a><div class="topbar-title"><p>МОДУЛЬ BARDOCTOR</p><strong>Конкуренты</strong></div><div class="bd-standalone-venue-host" data-bd-venue-host></div></header>
<main class="market-page">
<section class="market-status-row" aria-label="Состояние анализа"><p id="market-status"><i aria-hidden="true"></i><span>Загружаю сохранённые данные…</span></p><button id="refresh-market" class="secondary-action" type="button"><span aria-hidden="true">↻</span><b>Обновить</b></button></section>
<section class="market-location-row" aria-label="Локация анализа"><strong id="location-summary">Локация заведения</strong><button id="edit-location" type="button">Изменить локацию</button></section>
<section id="market-summary" class="market-summary hidden" aria-label="Кратко о конкурентах"><article><span>Найдено</span><strong id="found-count">0</strong><small>заведений</small></article><article><span>Подтверждено</span><strong id="confirmed-count">0</strong><small>заведения</small></article><article class="attention"><span>Изменения</span><strong id="change-count">0</strong><small>требуют внимания</small></article><p><span id="source-count">0</span> источников</p></section>
<section id="notice" class="notice hidden" role="status" aria-live="polite"></section>
<section id="loading" class="loading-card" aria-live="polite"><i aria-hidden="true"></i><p>Загружаю сохранённый анализ рынка…</p></section>
<section id="empty-state" class="empty-card hidden"><h2>Конкуренты ещё не проанализированы</h2><p>BarDoctor использует локацию заведения и открытые источники, чтобы определить реальных соседних конкурентов.</p><button id="start-analysis" type="button">Начать анализ</button></section>
<div id="market-results" class="market-results hidden">
<section id="attention-section" class="attention-section hidden" aria-labelledby="attention-title"><div class="section-line"><div><h2 id="attention-title">Требуют внимания</h2><p><span id="attention-count">0</span> изменений</p></div><button id="show-all-changes" type="button">Посмотреть все</button></div><div id="attention-list" class="attention-list"></div></section>
<section class="competitors-section" aria-labelledby="competitors-title"><div class="section-line"><div><h2 id="competitors-title">Конкуренты рядом</h2><p id="competitor-summary"></p></div><button id="filter-toggle" type="button" aria-expanded="false" aria-controls="competitor-filters">Фильтры <span id="visible-count">0</span></button></div><div id="competitor-filters" class="competitor-filters" role="group" aria-label="Фильтры конкурентов"><button class="active" type="button" data-filter="all" aria-pressed="true">Все</button><button type="button" data-filter="confirmed" aria-pressed="false">Подтверждённые</button><button type="button" data-filter="review" aria-pressed="false">На проверке</button><button type="button" data-filter="changed" aria-pressed="false">С изменениями</button></div><div id="competitors-card" class="competitor-list"></div></section>
<details id="full-analysis" class="full-analysis"><summary>Полный анализ локального рынка</summary><div class="analysis-grid"><section id="location-card" class="analysis-card"></section><section id="economy-card" class="analysis-card"></section><section id="opportunities-card" class="analysis-card"></section><section id="risks-card" class="analysis-card"></section><section id="pricing-card" class="analysis-card"></section><section id="marketing-card" class="analysis-card"></section><section id="actions-card" class="analysis-card"></section><section id="sources-card" class="analysis-card"></section><section id="assumptions-card" class="analysis-card"><h3>Что требует проверки</h3><div id="assumptions-content"></div></section></div></details>
<p class="auto-update-info">Анализ рынка обновляется автоматически каждые 7 дней на основе открытых источников.</p></div>
</main>
<section id="competitor-detail" class="competitor-detail hidden" aria-hidden="true" aria-labelledby="detail-title"><header><button id="detail-close" type="button" aria-label="Закрыть карточку конкурента">‹</button><div><p id="detail-status">Конкурент</p><h2 id="detail-title">—</h2></div></header><nav id="detail-tabs" aria-label="Разделы конкурента"><button class="active" type="button" data-detail-tab="overview">Обзор</button><button type="button" data-detail-tab="changes">Изменения</button><button type="button" data-detail-tab="sources">Источники</button><button type="button" data-detail-tab="recommendations">Рекомендации</button></nav><div id="detail-content" class="detail-content"></div></section>
<button id="location-backdrop" class="sheet-backdrop hidden" type="button" aria-label="Закрыть редактирование локации"></button><section id="location-sheet" class="location-sheet hidden" aria-hidden="true" aria-labelledby="location-sheet-title"><div class="sheet-handle" aria-hidden="true"></div><header><h2 id="location-sheet-title">Изменить локацию</h2><button id="location-close" type="button" aria-label="Закрыть">×</button></header><label for="market-address">Адрес, район или ориентир</label><div class="location-input-row"><input id="market-address" type="text" maxlength="240" placeholder="Бендеры, Центр, Молдова" /><button id="use-location" type="button" aria-label="Использовать геолокацию">◎</button></div><button id="use-location-wide" class="geolocation-action" type="button">Использовать геолокацию</button><p id="location-status" class="field-help"></p><label for="market-focus">Что проверить особенно <span>необязательно</span></label><textarea id="market-focus" maxlength="500" rows="3" placeholder="Например: ночные бары, цены на коктейли, аудитория после 23:00"></textarea><button id="save-location" class="primary-action" type="button">Сохранить</button></section>
<nav class="market-bottom-nav" aria-label="Основная навигация"><a class="active" href="/home"><span>⌂</span>Главная</a><a href="/shifts"><span>▥</span>Смены</a><a href="/finance"><span>₽</span>Финансы</a><button id="market-quick-add" class="market-add-action" type="button" aria-expanded="false" aria-controls="market-quick-sheet"><span>＋</span>Добавить</button><a href="/employees"><span>♙</span>Команда</a><a href="/more"><span>•••</span>Ещё</a></nav>
<button id="market-quick-backdrop" class="market-quick-backdrop hidden" type="button" aria-label="Закрыть меню добавления"></button><section id="market-quick-sheet" class="market-quick-sheet hidden" aria-labelledby="market-quick-title" aria-hidden="true"><div class="market-quick-heading"><div><h2 id="market-quick-title">Добавить</h2><p>Выберите действие</p></div><button id="market-quick-close" type="button" aria-label="Закрыть">×</button></div><div class="market-quick-list"><button type="button" data-route="/shifts?closeShift=1"><span>▥</span><b>Закрыть смену<small>Внести выручку и состав команды</small></b><i>›</i></button><button type="button" data-route="/suppliers?create=1&returnTo=market"><span>₽</span><b>Добавить покупку<small>Чек, файл или ручной ввод</small></b><i>›</i></button><button type="button" data-route="/add"><span>!</span><b>Сообщить о происшествии<small>Зафиксировать проблему или жалобу</small></b><i>›</i></button><button type="button" data-route="/tasks?new=1"><span>✓</span><b>Создать поручение<small>Назначить задачу сотруднику</small></b><i>›</i></button></div></section>
</body></html>`;

export function GET(request: Request): Response {
  const url = new URL(request.url);
  const params = url.searchParams;
  const qaEnabled = ["terminal.local", "127.0.0.1", "localhost"].includes(url.hostname) && params.get("qaMarket") === "v329";
  const qaViewport = params.get("qaViewport");
  if (qaEnabled && ["390", "430"].includes(qaViewport || "")) {
    const qaGet = ["fail", "hang"].includes(params.get("qaGet") || "") ? `&qaGet=${params.get("qaGet")}` : "";
    const qaRefresh = params.get("qaRefresh") === "fail" ? "&qaRefresh=fail" : "";
    const qaStale = params.get("qaStale") === "1" ? "&qaStale=1" : "";
    const frame = `<!doctype html><html lang="ru"><head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /><meta name="robots" content="noindex,nofollow" /><link rel="stylesheet" href="/opportunity-calendar-qa-frame-v327.css" /></head><body><div class="qa-device w${qaViewport}"><iframe title="QA Конкуренты" src="/market?embedded=1&qaMarket=v329${qaGet}${qaRefresh}${qaStale}"></iframe></div></body></html>`;
    return new Response(frame, { status: 200, headers: { "Cache-Control": "no-store", "Content-Type": "text/html; charset=utf-8", "Content-Security-Policy": "default-src 'none'; style-src 'self'; frame-src 'self'; base-uri 'none'", "X-Robots-Tag": "noindex, nofollow" } });
  }
  const embedded = params.get("embedded") === "1";
  if (!embedded) return barDoctorResponse();
  const html = MARKET_HTML.replace('<html lang="ru">', '<html lang="ru" data-bd-embedded="true">');
  return new Response(html, { status: 200, headers: { "Cache-Control": "no-store", "Content-Type": "text/html; charset=utf-8", "Content-Security-Policy": "default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self' data:; base-uri 'none'; form-action 'self'; frame-ancestors 'self'", "Permissions-Policy": "camera=(), microphone=(), geolocation=(self)", "Referrer-Policy": "strict-origin-when-cross-origin", "X-Content-Type-Options": "nosniff", "X-Frame-Options": "SAMEORIGIN" } });
}
