import { canonicalUserShellAssets } from "../../lib/bardoctor/app-shell";

export function GET(): Response {
  return new Response(`<!doctype html><html lang="ru"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>Ввести продажу — BarDoctor</title>
  ${canonicalUserShellAssets()}<link rel="stylesheet" href="/inventory-onboarding.css?v=phase5"><link rel="stylesheet" href="/venue-switcher.css?v=20260826-venue-identity-v297"><script src="/venue-switcher.js?v=20260826-venue-identity-v297" defer></script><script src="/sales-entry.js?v=phase5" defer></script></head>
  <body data-bd-parent-route="/sales-import"><header><a href="/sales-import">← Продажи</a><h1>Ввести продажу</h1><div class="bd-standalone-venue-host" data-bd-venue-host></div></header><main>
  <p id="notice" role="status" aria-live="polite">Загрузка…</p><div id="work" hidden>
  <form id="sale"><label>Смена<select id="shift"><option value="">Без смены</option></select></label><div id="lines"></div><div class="actions"><button id="add-line" type="button">Добавить позицию</button><button type="submit">Проверить продажу</button></div></form>
  <section id="preview" hidden><h2>Проверка продажи</h2><div id="quote"></div><div class="actions"><button id="post">Подтвердить продажу</button><button id="discard">Не сохранять</button></div></section>
  <section id="shift-actions"><h2>Смены</h2><form id="open-shift"><label>Название новой смены<input id="shift-name" required maxlength="160"></label><button type="submit">Открыть смену</button></form><p>Закрытие смены завершает ввод продаж и возвратов в неё.</p><div id="shifts"></div></section>
  <section><h2>Последние продажи</h2><div id="events"></div></section></div></main></body></html>`, {headers:{"Content-Type":"text/html; charset=utf-8","Cache-Control":"no-store","Content-Security-Policy":"default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self' data:; frame-ancestors 'self'"}});
}
