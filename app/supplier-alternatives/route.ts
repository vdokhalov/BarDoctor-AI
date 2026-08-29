import { barDoctorResponse } from "../bar-doctor-response";
import { canonicalUserShellAssets } from "../../lib/bardoctor/app-shell";

const HTML = `<!doctype html>
<html lang="ru"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>Новые поставщики — BarDoctor</title>
<link rel="stylesheet" href="/supplier-alternatives.css?v=20260828-navigation-v331">
<link rel="stylesheet" href="/venue-switcher.css?v=20260826-venue-identity-v297">
<link rel="stylesheet" href="/modern-polish.css?v=20260811-modern-v87">
${canonicalUserShellAssets()}
<script src="/bd-route-context.js?v=20260822-navigation-v247" defer></script><script src="/venue-switcher.js?v=20260826-venue-identity-v297" defer></script><script src="/supplier-alternatives.js?v=20260828-navigation-v331" defer></script><script src="/modern-polish.js?v=20260811-modern-v87" defer></script></head>
<body data-bd-parent-route="/suppliers"><header class="top"><a id="back" href="/suppliers" aria-label="Назад" data-bd-back>‹</a><b id="page-title">Новые поставщики</b><div class="bd-standalone-venue-host" data-bd-venue-host></div></header>
<main><section class="snapshot-bar"><div><i aria-hidden="true"></i><span id="snapshot-status">Загружаю сохранённые данные…</span></div><button id="refresh" type="button">Обновить <span aria-hidden="true">↻</span></button></section><div id="search-progress" role="status" aria-live="polite" hidden></div><section id="results" aria-live="polite"></section></main></body></html>`;

export function GET(request: Request): Response {
  if (new URL(request.url).searchParams.get("embedded") !== "1") return barDoctorResponse();
  return new Response(HTML, { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "Content-Security-Policy": "default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self' data:; frame-ancestors 'self'" } });
}
