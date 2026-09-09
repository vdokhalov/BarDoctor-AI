import { canonicalUserShellAssets } from "../../lib/bardoctor/app-shell";

export function GET(): Response {
  return new Response(`<!doctype html><html lang="ru"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>Начальные остатки — BarDoctor</title>
    ${canonicalUserShellAssets()}<link rel="stylesheet" href="/inventory-onboarding.css?v=phase5"><script src="/inventory-onboarding.js?v=phase5" defer></script></head>
    <body data-bd-parent-route="/warehouse"><header><a href="/warehouse" aria-label="Вернуться на склад">← Склад</a><h1>Начальные остатки и импорт</h1></header>
    <main><p>Можно начать без закупок и без известной стоимости. Начальная стоимость хранится отдельно и не становится ценой последней закупки.</p>
    <p id="notice" role="status" aria-live="polite">Загрузка…</p><section id="work" hidden>
    <form id="manual"><h2>Добавить позицию</h2><div class="grid">
      <label>Номенклатура<select id="product"><option value="">Новый товар</option></select></label>
      <label>Название<input id="name" maxlength="240"></label>
      <label>В чём учитывать остаток?<select id="stockUnit"><option value="pcs">Штуки</option><option value="l">Литры</option><option value="kg">Килограммы</option></select></label>
      <label>Раздел<select id="section"></select></label><label>Категория<select id="category"></select></label><label>Подкатегория<select id="subcategory"></select></label>
      <label>Начальное количество (необязательно)<input id="quantity" inputmode="decimal" placeholder="Нет данных"></label>
      <label>Единица количества<select id="unit"><option value="pcs">шт.</option><option value="l">л</option><option value="ml">мл</option><option value="kg">кг</option><option value="g">г</option></select></label>
    </div><label class="check"><input type="checkbox" id="packaged"> Остаток указан упаковками</label>
    <div class="grid" id="package-fields" hidden><label>Количество в одной упаковке<input id="packageQuantity" inputmode="decimal"></label><label>Единица содержимого<select id="packageUnit"><option value="pcs">шт.</option><option value="l">л</option><option value="ml">мл</option><option value="kg">кг</option><option value="g">г</option></select></label></div>
    <div class="grid"><label>Начальная стоимость за <span id="cost-unit">шт.</span> (необязательно)<input id="openingUnitCost" inputmode="decimal" placeholder="Неизвестна"></label><label>Источник начальной стоимости<input id="costSource" maxlength="240" placeholder="Например, акт передачи остатков"></label></div>
    <button type="submit">Проверить перед сохранением</button></form>
    <section id="import-section"><h2>Массовый импорт CSV</h2><p>До 500 строк. Сопоставьте столбцы, проверьте результат и явно исключите строки, которые не нужно сохранять. Excel-файл можно сохранить как CSV UTF-8.</p>
      <label>Файл CSV<input id="csv" type="file" accept=".csv,text/csv"></label><div id="mapping" class="grid"></div><button id="preview-csv" hidden>Проверить строки</button></section>
    <section id="preview" hidden><h2>Проверка перед сохранением</h2><p id="selection-summary"></p><div id="rows"></div><div class="actions"><button id="confirm">Подтвердить выбранные строки</button><button id="discard" type="button">Не сохранять</button></div></section>
    <section><h2>Подтверждённые начальные документы</h2><div id="history"></div></section></section></main></body></html>`, { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "Content-Security-Policy": "default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self' data:; frame-ancestors 'self'" } });
}
