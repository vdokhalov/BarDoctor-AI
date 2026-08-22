import { barDoctorResponse } from "../bar-doctor-response";
import { canonicalUserShellAssets } from "../../lib/bardoctor/app-shell";

const HTML = `<!doctype html>
<html lang="ru"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>Новые поставщики — BarDoctor</title>
<link rel="stylesheet" href="/supplier-alternatives.css?v=20260811-navigation-v85">
<link rel="stylesheet" href="/supplier-alternatives-v2.css?v=20260802-v2">
<link rel="stylesheet" href="/venue-switcher.css?v=20260813-venue-v174">
<link rel="stylesheet" href="/modern-polish.css?v=20260811-modern-v87">
${canonicalUserShellAssets()}
<script src="/bd-route-context.js?v=20260822-navigation-v247" defer></script><script src="/venue-switcher.js?v=20260813-venue-v174" defer></script><script src="/supplier-alternatives.js?v=20260808-rc-v70" defer></script><script src="/modern-polish.js?v=20260811-modern-v87" defer></script></head>
<body data-bd-parent-route="/suppliers"><header class="top"><a href="/suppliers" aria-label="Назад" data-bd-back>←</a><div><b>Новые поставщики</b><span id="venue">BarDoctor</span></div><div class="bd-standalone-venue-host" data-bd-venue-host></div></header>
<main><section class="hero"><p>ЗАКУПОЧНАЯ РАЗВЕДКА</p><h1>Полный поиск по ассортименту</h1><span>Отдельные проходы для крепкого алкоголя, вина, пива, газировки, воды, соков и кухни. Каждая группа получает только свои товары.</span><button id="refresh">Запустить полный поиск</button><small>Обычно занимает несколько минут. Не закрывайте страницу до завершения.</small></section>
<section class="notice">Ищем только точные товары активного меню. Аналоги другой марки или линейки, позиции закупочных документов вне меню и черновые ингредиенты исключены.</section><div id="status" role="status" aria-live="polite"></div><section id="results"></section></main></body></html>`;

export function GET(request: Request): Response {
  if (new URL(request.url).searchParams.get("embedded") !== "1") return barDoctorResponse();
  return new Response(HTML, { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "Content-Security-Policy": "default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self' data:; frame-ancestors 'self'" } });
}
