export const LIFECYCLE_HTML = `<!doctype html><html lang="ru"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="robots" content="noindex,nofollow"><title>Заведения и аккаунт — BarDoctor</title>
<link rel="stylesheet" href="/account-lifecycle.css?v=1"><script src="/account-lifecycle.js?v=1" defer></script>
</head><body><main class="lifecycle">
<header><a href="/settings" id="back">← Настройки</a><span>BARDOCTOR</span></header>
<h1>Заведения и аккаунт</h1><p>Архив хранит данные. Удаление необратимо.</p>
<div id="notice" role="status" aria-live="polite"></div><button id="retry" hidden>Повторить загрузку</button>
<section aria-labelledby="active-title"><h2 id="active-title">Управление заведениями</h2><div id="active">Загрузка…</div><a class="button primary" href="/venues/new" id="create">Создать заведение</a><a class="button" href="/home" id="home" hidden>Открыть активное заведение</a></section>
<section id="archive" aria-labelledby="archive-title"><h2 id="archive-title">Архив заведений</h2><p>Архивные заведения скрыты из обычного переключателя. Восстановление возвращает то же заведение со всеми связями.</p><div id="archived">Загрузка…</div></section>
<section aria-labelledby="account-title"><h2 id="account-title">Удаление аккаунта</h2><p>Удалить собственную учётную запись BarDoctor. Позже можно зарегистрироваться заново с той же почтой — без старых ролей и данных.</p><button id="delete-account" class="danger" disabled>Удалить мой аккаунт</button></section>
</main>
<dialog id="confirmation" aria-labelledby="dialog-title"><form id="confirmation-form">
<header><h2 id="dialog-title"></h2><button type="button" id="close" aria-label="Закрыть">×</button></header>
<div id="dialog-content"></div><p id="dialog-error" role="alert"></p>
<footer><button type="button" id="cancel">Отмена</button><button type="submit" id="confirm" class="primary">Подтвердить</button></footer>
</form></dialog></body></html>`;
export async function GET(): Promise<Response> {
  return new Response(LIFECYCLE_HTML, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'private, no-store' } });
}
