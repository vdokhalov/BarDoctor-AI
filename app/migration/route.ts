import { authenticateIdentityRequest } from "../../lib/bardoctor/auth";

const headers: HeadersInit = {
  "Content-Type": "text/html; charset=utf-8",
  "Cache-Control": "no-store",
  "Pragma": "no-cache",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "no-referrer",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=()",
  "Content-Security-Policy": "default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'; object-src 'none'",
  "X-Robots-Tag": "noindex, nofollow, noarchive",
};

function page(): string {
  return `<!doctype html>
<html lang="ru">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover" />
  <meta name="robots" content="noindex,nofollow,noarchive" />
  <title>Перенос данных заведения — BarDoctor</title>
  <link rel="stylesheet" href="/venue-migration-capture-v267.css?v=20260824" />
  <script src="/venue-migration-capture-v267.js?v=20260827" defer></script>
</head>
<body>
  <main class="capture-shell">
    <a class="back" href="/home">← Вернуться в BarDoctor</a>
    <p class="kicker">CONTROLLED MIGRATION</p>
    <h1>Перенос данных заведения</h1>
    <p class="lead">Экран проверяет старые данные только выбранного заведения, сохраняет неизменяемую резервную копию на сервере и выполняет dry-run. Рабочие данные пока не изменяются.</p>
    <section id="venue-card" class="card" aria-live="polite">
      <span>Проверяю активное заведение…</span>
    </section>
    <section id="source-card" class="card" hidden>
      <h2>Найденные источники</h2>
      <div id="source-list" class="store-list"></div>
    </section>
    <button id="capture-run" type="button" disabled>Сохранить копию и проверить перенос</button>
    <div id="capture-status" role="status" aria-live="polite"></div>
    <section id="capture-result" class="card" hidden></section>
  </main>
</body>
</html>`;
}

export async function GET(request: Request): Promise<Response> {
  const identity = await authenticateIdentityRequest(request);
  if (!identity) return Response.redirect(new URL("/", request.url), 302);
  return new Response(page(), { headers });
}
