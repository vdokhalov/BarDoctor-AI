import type { Page } from "playwright-core";

/** Read actual React context values without changing application gates/state. */
export async function menuActionReadiness(page: Page) {
  return page.evaluate(() => {
    type Value = { isReady?: boolean; financeReady?: boolean; profile?: { name?: string; currency?: string } };
    type Fiber = { type?: { name?: string }; return?: Fiber; memoizedProps?: { value?: Value }; dependencies?: { firstContext?: { memoizedValue?: Value; next?: unknown } } };
    const main = document.querySelector(".bd-assortment-command-v170");
    const key = main && Object.keys(main).find(key => key.startsWith("__reactFiber$"));
    let fiber = key && (main as unknown as Record<string, Fiber>)[key];
    let cloud: Value | undefined, restaurant: Value | undefined;
    while (fiber) {
      const value = fiber.memoizedProps?.value;
      if (value && "financeReady" in value) cloud = value;
      if (value && "profile" in value && "isReady" in value) restaurant = value;
      fiber = fiber.return;
    }
    const permission = (window as unknown as { bdHasClientPermission?: (key: string) => boolean }).bdHasClientPermission?.("inventory.manage") ?? false;
    const venueId = Number(localStorage.getItem("bd_active_venue_id"));
    return {
      role: localStorage.getItem("bd_active_role"), inventoryManage: permission,
      venueId, workspaceId: localStorage.getItem("bd_active_workspace_id"),
      cloudReady: cloud?.isReady, financeReady: cloud?.financeReady,
      profileReady: restaurant?.isReady, profilePresent: Boolean(restaurant?.profile),
      canManage: Boolean(permission && cloud?.isReady && venueId > 0),
      addButtons: Array.from(document.querySelectorAll("button")).filter(button => button.textContent?.trim() === "Добавить позицию").length,
    };
  });
}

export async function waitForMenuCloudReady(page: Page) {
  await page.waitForFunction(() => {
    type Fiber = { return?: Fiber; memoizedProps?: { value?: { isReady?: boolean; financeReady?: boolean } } };
    const main = document.querySelector(".bd-assortment-command-v170");
    const key = main && Object.keys(main).find(key => key.startsWith("__reactFiber$"));
    let fiber = key && (main as unknown as Record<string, Fiber>)[key];
    while (fiber) {
      const value = fiber.memoizedProps?.value;
      if (value && "financeReady" in value) return value.isReady === true;
      fiber = fiber.return;
    }
    return false;
  });
}
