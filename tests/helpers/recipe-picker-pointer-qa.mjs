import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

// This fixture isolates the real catalog.css interaction contract. It does not
// substitute a stylesheet rule or exercise recipe matching/cost calculations.
const markup = `<!doctype html>
<html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0">
  <div class="bd-catalog-sheet-backdrop bd-tech-card-workspace-v354">
    <section class="bd-catalog-sheet bd-tech-card-editor-v354" role="dialog" aria-label="Техкарта" tabindex="-1">
      <header class="bd-catalog-sheet-head">
        <div><span class="bd-tech-card-context-v354">Меню → Техкарта</span><h2>Редактирование техкарты</h2><p>TEST · нормы на одну продажу</p></div>
        <button class="bd-catalog-close" type="button" aria-label="Закрыть техкарту">×</button>
      </header>
      <div class="bd-catalog-form">
        <div class="bd-catalog-workflow-status-v353"><strong>Завершите обязательные связи</strong><span>Связано 0 из 1 ингредиентов</span></div>
        <div class="bd-catalog-review-note">Техкарта пока не подтверждена.</div>
        <div class="bd-catalog-ingredient-list"><article class="bd-catalog-ingredient">
          <div class="bd-catalog-ingredient-head"><b>Ингредиент 1</b><button type="button" class="bd-catalog-remove">Удалить</button></div>
          <label class="bd-catalog-field"><span>Название</span><input value="TEST Крупа"></label>
          <div class="bd-catalog-grid">
            <label class="bd-catalog-field"><span>Количество на порцию</span><input type="number" value="1"></label>
            <label class="bd-catalog-field"><span>Единица</span><select><option>кг</option></select></label>
          </div>
          <label class="bd-catalog-field"><span>Связь с номенклатурой</span>
            <div class="bd-ingredient-full-search-v258 bd-ingredient-selector-v299 bd-tech-card-picker-v375 is-searching">
              <input id="recipe-picker-search" type="search" aria-label="Поиск по всей номенклатуре" value="TEST Крупа">
              <div class="bd-tech-card-picker-summary-v375"><strong>Найдено: 1</strong><span>Поиск по всему справочнику</span></div>
              <div class="bd-tech-card-groups-v375"><section><h4>Кухня → Продукты</h4><div>
                <button id="recipe-picker-product" type="button"><span><strong>TEST Крупа</strong><small>1 kg · TEST Поставщик</small></span><b>Выбрать</b></button>
              </div></section></div>
              <button type="button" class="bd-tech-card-filter-toggle-v375">Фильтры по разделам</button>
              <button type="button" class="bd-ingredient-show-all-v258">Закрыть поиск</button>
            </div>
          </label>
          <div class="bd-tech-cost-row-v418"><span>Текущая стоимость: нет подтверждённых данных</span><strong>Стоимость строки: —</strong></div>
        </article></div>
        <button type="button" class="bd-catalog-secondary">+ Добавить ингредиент</button>
        <div class="bd-tech-card-total-v418"><span>Текущая себестоимость техкарты</span><strong>Недостаточно подтверждённых данных</strong></div>
        <div class="bd-catalog-sheet-actions">
          <button type="button" class="bd-catalog-secondary">Сохранить черновик</button>
          <button type="button" class="bd-catalog-primary" disabled>Подтвердить техкарту</button>
        </div>
      </div>
    </section>
  </div>
</body></html>`;

async function footerState(page) {
  return page.locator('.bd-catalog-sheet-actions').evaluate(element => {
    const style = getComputedStyle(element);
    return {
      visible: style.display !== 'none' && style.visibility !== 'hidden' && style.visibility !== 'collapse'
        && Number(style.opacity) !== 0 && element.getClientRects().length > 0,
      display: style.display,
      visibility: style.visibility,
    };
  });
}

export async function verifyRecipePickerPointerTarget({ browser, css }) {
  assert.ok(browser && typeof browser.newContext === 'function', 'An existing Playwright browser is required');
  assert.equal(typeof css, 'string', 'Pass the actual complete public/catalog.css contents');
  assert.ok(css.length > 0, 'Catalog stylesheet must not be empty');
  const results = [];
  for (const input of ['mouse', 'touch']) {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    try {
      const page = await context.newPage();
      await page.setContent(markup, { waitUntil: 'domcontentloaded' });
      await page.addStyleTag({ content: css });
      await page.evaluate(() => {
        window.__recipePickerPointerProof = { clicks: 0, targets: [] };
        document.getElementById('recipe-picker-product').addEventListener('click', event => {
          window.__recipePickerPointerProof.clicks += 1;
          window.__recipePickerPointerProof.targets.push({
            currentTargetId: event.currentTarget.id,
            targetInsideProduct: event.target instanceof Element && Boolean(event.target.closest('#recipe-picker-product')),
            trusted: event.isTrusted,
          });
        });
      });
      const search = page.locator('#recipe-picker-search');
      const product = page.locator('#recipe-picker-product');
      await search.focus();
      assert.equal((await footerState(page)).visible, false, `${input}: footer is hidden during picker search`);

      // Native mousedown transfers focus before mouseup. Check that transition
      // deterministically, without timing-sensitive event instrumentation.
      await product.focus();
      assert.equal(await product.evaluate(element => document.activeElement === element), true);
      const afterBlur = await footerState(page);
      assert.equal(afterBlur.visible, false,
        `${input}: search blur must not reveal the sticky footer while the picker remains open; ${JSON.stringify(afterBlur)}`);

      await search.focus();
      if (input === 'touch') await product.tap();
      else await product.click();
      const proof = await page.evaluate(() => window.__recipePickerPointerProof);
      assert.equal(proof.clicks, 1, `${input}: one native action must select the result exactly once`);
      assert.equal(proof.targets.length, 1);
      assert.deepEqual(proof.targets[0], { currentTargetId: 'recipe-picker-product', targetInsideProduct: true, trusted: true },
        `${input}: the actual trusted click must reach the product button`);
      assert.equal((await footerState(page)).visible, false, `${input}: open picker keeps footer hidden after selection event`);

      // Collapse the fixture picker as the application does after choosing a
      // product. Do not click a second time or invoke the selection handler.
      await page.locator('.bd-tech-card-picker-v375').evaluate(element => element.remove());
      assert.equal((await footerState(page)).visible, true, `${input}: footer returns when the picker closes`);
      results.push({ input, viewport: '390x844', clicks: proof.clicks, focusTransferKeepsFooterHidden: true, footerRestoredAfterPickerClose: true });
    } finally {
      await context.close();
    }
  }
  return { cssSha256: createHash('sha256').update(css).digest('hex'), results };
}
