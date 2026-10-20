import { canonicalUserShellAssets } from "./app-shell";

export function salesAccountingPage(settings: boolean) {
  const title = settings ? "Как учитывать продажи" : "Итоги дня";
  return `<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
  <meta name="robots" content="noindex,nofollow"><title>${title} — BarDoctor</title>
  ${canonicalUserShellAssets()}<link rel="stylesheet" href="/sales-import.css?v=sales-ux1"><link rel="stylesheet" href="/sales-accounting.css?v=1">
  <script src="/sales-accounting.js?v=1" defer></script></head>
  <body data-sales-accounting="${settings ? "settings" : "totals"}" data-bd-parent-route="${settings ? "/settings" : "/sales-import"}">
  <header class="sales-topbar"><a href="${settings ? "/settings" : "/sales-import"}" data-bd-back aria-label="Назад"><img src="/integration-icons/arrow-left.svg" alt=""></a>
  <div class="sales-topbar-copy"><b>${settings ? "Настройки заведения" : title}</b><span>BarDoctor</span></div></header>
  <main class="accounting-page">
  <p id="accounting-status" role="status" aria-live="polite">Загрузка…</p><button id="accounting-retry" class="secondary" hidden>Повторить загрузку</button>
  <section id="accounting-settings" ${settings ? "" : "hidden"}>
    <h1>Как учитывать продажи</h1><p class="accounting-muted">Выберите удобный способ работы для вашего заведения.</p>
    <div class="accounting-options" role="group" aria-label="Способ учёта">
      <button class="accounting-option" data-mode="POS" disabled><span class="accounting-icon">▤</span><span><strong>Касса BarDoctor</strong><small>Заказы, оплата и списание по проданным позициям.</small><em>По умолчанию для новых заведений</em></span><span class="accounting-radio"></span></button>
      <button class="accounting-option" data-mode="MANUAL" disabled><span class="accounting-icon">✎</span><span><strong>Ввод итогов вручную</strong><small>Выручка за день одной суммой, без учёта отдельных продаж.</small></span><span class="accounting-radio"></span></button>
    </div>
    <p class="accounting-hint">Режим меняется со следующего рабочего дня, после закрытия текущего дня, всех кассовых смен и заказов.</p>
    <p id="accounting-pending" class="accounting-notice" hidden></p>
    <a class="accounting-link" href="/sales-totals">Открыть итоги дня →</a>
  </section>
  <form id="accounting-totals" ${settings ? "hidden" : ""}>
    <span class="accounting-badge">Ручной ввод</span>
    <label>Рабочий день<input id="totals-date" name="date" type="date" required disabled></label>
    <div class="accounting-pair"><label>Наличные<span class="accounting-input"><input id="totals-cash" name="cash" inputmode="decimal" type="number" min="0" step=".01" required disabled><span data-accounting-currency></span></span></label>
    <label>Безналичные<span class="accounting-input"><input id="totals-card" name="card" inputmode="decimal" type="number" min="0" step=".01" required disabled><span data-accounting-currency></span></span></label></div>
    <div class="accounting-total"><span>Выручка за день</span><strong id="totals-sum">—</strong></div>
    <label>Количество чеков <small>Необязательно</small><input id="totals-receipts" name="receipts" type="number" inputmode="numeric" min="0" step="1" placeholder="Не указано" disabled></label>
    <label>Себестоимость проданного <small>Необязательно</small><span class="accounting-input"><input id="totals-cogs" name="cogs" type="number" inputmode="decimal" min="0" step=".01" placeholder="Не указана" disabled><span data-accounting-currency></span></span></label>
    <p class="accounting-help">Если сумма неизвестна, оставьте поле пустым. Она нужна для расчёта результата после себестоимости. Введённая сумма сохраняется как заявленная владельцем.</p>
    <label id="totals-reason-label" hidden>Причина исправления<textarea id="totals-reason" maxlength="500" disabled></textarea></label>
    <p class="accounting-hint">Склад не списывается. Расходы и зарплаты учитываются в своих разделах.</p>
    <button type="submit" id="totals-save" class="primary" disabled>Сохранить итоги дня</button>
    <p class="accounting-help accounting-center">Суммы попадут в финансовый отчёт.</p>
    <a class="accounting-link" href="/settings/sales-accounting">Настройки учёта продаж →</a>
    <details id="totals-history" hidden><summary>История исправлений</summary><div></div></details>
  </form>
  <section id="accounting-imports" hidden><h2>Импорт для сверки</h2><p class="accounting-help">Эти отчёты сохранены отдельно. В выручку и склад они ещё не включены.</p><div></div></section>
  </main>
  <dialog id="accounting-confirm" aria-labelledby="accounting-confirm-title"><form method="dialog"><span class="accounting-handle"></span><span class="accounting-icon">✎</span>
    <h2 id="accounting-confirm-title">Перейти на ручной ввод?</h2>
    <p id="accounting-confirm-copy">Вы вводите итоги смены самостоятельно. Продажи по позициям и автоматическое списание со склада в этом режиме не ведутся. История сохраняется.</p>
    <p class="accounting-notice">Со следующего рабочего дня<br><span id="accounting-effective"></span></p>
    <label id="import-reason-label" hidden>Причина замены<textarea id="import-reason" maxlength="500"></textarea></label>
    <p id="accounting-confirm-error" role="alert"></p>
    <button type="button" id="accounting-confirm-save" class="primary">Перейти на ручной ввод</button>
    <button id="accounting-confirm-cancel" class="secondary" value="cancel">Оставить кассу</button>
  </form></dialog></body></html>`;
}
