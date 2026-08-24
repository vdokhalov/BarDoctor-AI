import { internalAdminRouteState } from "../../../lib/bardoctor/platform-admin";

const headers: HeadersInit = {
  "Content-Type": "text/html; charset=utf-8",
  "Cache-Control": "no-store",
  "Pragma": "no-cache",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "no-referrer",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=()",
  "Content-Security-Policy": "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'; object-src 'none'",
  "X-Robots-Tag": "noindex, nofollow, noarchive",
};

const denied = `<!doctype html><html lang="ru"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Страница не найдена</title></head><body><main><h1>404</h1><a href="/home">Вернуться в BarDoctor</a></main></body></html>`;

function page(): string {
  return `<!doctype html>
<html lang="ru">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover" />
  <meta name="robots" content="noindex,nofollow,noarchive" />
  <title>Контролируемая миграция — BarDoctor</title>
  <link rel="stylesheet" href="/admin-migrations-v265.css?v=20260824" />
  <script src="/admin-migrations-v265.js?v=20260824" defer></script>
</head>
<body>
  <main class="migration-shell">
    <a class="back" href="/admin">← Internal Admin</a>
    <p class="kicker">PHASE A · PRODUCTION</p>
    <h1>Контролируемая миграция данных</h1>
    <p class="lead">Создаёт и проверяет неизменяемую резервную копию каждого заведения, затем выполняет только dry-run. Данные заведений не изменяются.</p>
    <button id="phase-a-run" type="button">Создать backups и выполнить dry-run</button>
    <div id="phase-a-status" role="status" aria-live="polite"></div>
    <section id="phase-a-result" hidden>
      <div id="phase-a-kpis" class="kpis"></div>
      <h2>Классификация заведений</h2>
      <div id="phase-a-venues" class="venues"></div>
    </section>
  </main>
</body>
</html>`;
}

export async function GET(request: Request): Promise<Response> {
  const state = await internalAdminRouteState(request);
  if (state !== "admin") return new Response(denied, { status: 404, headers });
  return new Response(page(), { headers });
}
