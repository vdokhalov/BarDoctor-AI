import { barDoctorResponse } from "../bar-doctor-response";
import { canonicalUserShellAssets } from "../../lib/bardoctor/app-shell";

const HTML = `<!doctype html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
  <meta name="robots" content="noindex,nofollow">
  <title>Продажи и склад — BarDoctor</title>
  <link rel="stylesheet" href="/sales-import.css?v=20260811-navigation-v85">
  <link rel="stylesheet" href="/venue-switcher.css?v=20260813-venue-v174">
  <link rel="stylesheet" href="/modern-polish.css?v=20260811-modern-v87">
  ${canonicalUserShellAssets()}
  <script src="/bd-route-context.js?v=20260814-navigation-v185" defer></script>
  <script src="/venue-switcher.js?v=20260813-venue-v174" defer></script>
  <script src="/sales-import.js?v=20260808-v1" defer></script>
  <script src="/modern-polish.js?v=20260811-modern-v87" defer></script>
</head>
<body data-bd-parent-route="/warehouse">
  <header class="topbar">
    <a href="/warehouse" aria-label="Назад на склад" data-bd-back>←</a>
    <div><b>Продажи и склад</b><span id="venue">BarDoctor</span></div>
    <div class="bd-standalone-venue-host" data-bd-venue-host></div>
  </header>
  <main>
    <section class="hero">
      <small>АВТОМАТИЧЕСКИЙ РАСХОД</small>
      <h1>Загрузите отчёт продаж — склад спишется по техкартам</h1>
      <p>Подойдёт отчёт из кассы или POS с названиями позиций и количеством продаж. BarDoctor ничего не спишет, пока вы не проверите сопоставление.</p>
      <button id="choose" type="button">Загрузить отчёт продаж</button>
      <input id="file" type="file" accept="image/*,.pdf,.csv,.tsv,.xls,.xlsx" hidden>
      <span>Фото, PDF, Excel или CSV · до 12 МБ</span>
    </section>

    <ol class="steps" aria-label="Этапы импорта">
      <li class="active"><b>1</b><span><strong>Загрузить</strong><small>отчёт из кассы</small></span></li>
      <li><b>2</b><span><strong>Проверить</strong><small>позиции и техкарты</small></span></li>
      <li><b>3</b><span><strong>Провести</strong><small>списание со склада</small></span></li>
    </ol>

    <div id="status" role="status" aria-live="polite"></div>
    <section id="review" hidden></section>

    <section class="stock">
      <div class="section-head"><div><small>ТЕКУЩИЙ СКЛАД</small><h2>Остатки по закупочным позициям</h2></div><span id="stock-count">—</span></div>
      <p class="stock-note">Закупка увеличивает остаток. Подтверждённый отчёт продаж уменьшает его строго по нормам техкарт.</p>
      <div id="stock-list" class="stock-list"></div>
    </section>
  </main>
</body>
</html>`;

export function GET(request: Request): Response {
  if (new URL(request.url).searchParams.get("embedded") !== "1") return barDoctorResponse();
  return new Response(HTML, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "Content-Security-Policy": "default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self' data: blob:; frame-ancestors 'self'",
    },
  });
}
