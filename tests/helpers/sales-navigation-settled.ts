import type { Page } from "playwright-core";

/** Only before test-forced document goto/reload, never inside measured UI navigation. */
export async function waitForSalesHostReads(page: Page) {
  await page.waitForFunction(() => {
    const state = (window as unknown as { __bdPerfFetchState?: { pending: number; lastStoreEnd: number; lastHealthEnd: number; healthStatus: number } }).__bdPerfFetchState;
    // Direct fixture Cashier/Sales documents have no SPA bootstrap or health hook.
    if (!document.querySelector("#root")) return state?.pending === 0;
    type Value = { isReady?: boolean; financeReady?: boolean; profile?: unknown };
    type Fiber = { return?: Fiber; memoizedProps?: { value?: Value } };
    let cloud: Value | undefined, restaurant: Value | undefined;
    const root = document.querySelector("#root");
    const node = root?.firstElementChild;
    const key = node && Object.keys(node).find(key => key.startsWith("__reactFiber$"));
    let fiber = key && (node as unknown as Record<string, Fiber>)[key];
    while (fiber) {
      const value = fiber.memoizedProps?.value;
      if (value && "financeReady" in value) cloud = value;
      if (value && "profile" in value && "isReady" in value) restaurant = value;
      fiber = fiber.return;
    }
    return restaurant?.isReady === true && Boolean(restaurant.profile) && cloud?.isReady === true
      && cloud.financeReady === true && state?.pending === 0 && state.healthStatus === 200
      && state.lastHealthEnd >= state.lastStoreEnd;
  });
}
