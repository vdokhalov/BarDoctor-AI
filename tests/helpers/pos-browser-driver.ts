import type { Page } from "playwright-core";

/** Real recovered POS controls; no response stubs or synthetic success states. */
export async function posPane(page: Page, order = true) {
  if ((page.viewportSize()?.width ?? 1280) <= 600) {
    await page.locator(`.mobile-tabs [data-pane="${order ? "order" : "menu"}"]`).first().click();
  }
}

export async function posOpenShift(page: Page, name: string) {
  await page.locator('[data-action="open-shift"]').click();
  await page.locator('dialog [name="name"]').fill(name);
  await page.locator('dialog [name="float"]').fill("0");
  await page.locator("#dialog-submit").click();
  await page.locator("dialog").waitFor({ state: "hidden" });
  await page.locator('[data-action="payment"]').waitFor({ state: "attached" });
}

export async function posPay(page: Page, method?: string) {
  await posPane(page);
  await page.locator('[data-action="payment"]').click();
  if (method) await page.locator(`dialog [name="method"][value="${method}"]`).check();
  await page.locator("#dialog-submit").click();
}

export async function posNewQuick(page: Page) {
  await page.locator('[data-view="cashier"]').click();
  await page.locator('[data-action="quick"]').click();
  await posPane(page, false);
}

export async function posReceiptList(page: Page) {
  await page.locator("#receipts-view:not([hidden])").waitFor();
  await page.locator("#receipts-view .receipt-row").first().waitFor();
}
