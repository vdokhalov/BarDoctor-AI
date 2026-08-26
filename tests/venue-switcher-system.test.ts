import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

class MemoryStorage {
  private values = new Map<string, string>();

  get length() { return this.values.size; }
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, String(value)); }
  removeItem(key: string) { this.values.delete(key); }
  key(index: number) { return [...this.values.keys()][index] ?? null; }
}

type VenueRuntime = {
  window: {
    bdVenueSwitcher: {
      currentVenueId(): number | null;
      safeTargetForVenue(venueId: number, href?: string): string;
      switchVenue(venue: Record<string, unknown>): Promise<boolean>;
    };
    fetch: typeof fetch;
    location: { href: string; origin: string; pathname: string; search: string; hash: string; replace(value: string): void };
  };
  localStorage: MemoryStorage;
  events: Map<string, Array<(event: unknown) => void>>;
  replacements: string[];
  messages: string[];
};

async function createRuntime(
  nativeFetch: typeof fetch,
  href = "https://bardoctor.test/equipment/shared-id?tab=history&q=ice&venue=101#event",
): Promise<VenueRuntime> {
  const source = await readFile(new URL("../public/venue-switcher.js", import.meta.url), "utf8");
  const localStorage = new MemoryStorage();
  const sessionStorage = new MemoryStorage();
  localStorage.setItem("bd_session", "owner@example.test");
  localStorage.setItem("bd_session_token", "token");
  localStorage.setItem("bd_active_venue_id", "101");
  localStorage.setItem("bd_active_role", "owner");
  localStorage.setItem("bd_active_permissions", JSON.stringify(["finance.view"]));
  localStorage.setItem("bd_venue_context__owner@example.test", JSON.stringify({
    activeVenueId: 101,
    activeWorkspaceId: 1,
    canCreateVenues: true,
    venues: [
      { id: 101, name: "Кёльн", role: "owner", permissions: ["finance.view"] },
      { id: 202, name: "Причал", role: "manager", permissions: ["inventory.view"] },
      { id: 303, name: "Склад", role: "manager", permissions: ["inventory.view"] },
    ],
  }));

  const parsed = new URL(href);
  const replacements: string[] = [];
  const messages: string[] = [];
  const events = new Map<string, Array<(event: unknown) => void>>();
  const classList = { add() {}, remove() {} };
  const location = {
    href: parsed.href,
    origin: parsed.origin,
    pathname: parsed.pathname,
    search: parsed.search,
    hash: parsed.hash,
    replace(value: string) { replacements.push(value); },
  };
  const history = {
    __bdVenueAware: false,
    pushState() {},
    replaceState() {},
  };
  const window = {
    fetch: nativeFetch,
    location,
    history,
    __bdBootstrapPending: false,
    addEventListener(name: string, listener: (event: unknown) => void) {
      events.set(name, [...(events.get(name) ?? []), listener]);
    },
    dispatchEvent(event: { type: string }) {
      for (const listener of events.get(event.type) ?? []) listener(event);
      return true;
    },
    requestAnimationFrame() { return 1; },
    setTimeout() { return 1; },
  };
  const document = {
    body: { classList, appendChild() {} },
    documentElement: {},
    querySelector() { return null; },
    addEventListener() {},
    createElement() {
      return {
        className: "",
        isConnected: false,
        innerHTML: "",
        setAttribute() {},
        remove() {},
        querySelector(selector: string) {
          return {
            set textContent(value: string) { if (selector === "span") messages.push(value); },
          };
        },
      };
    },
  };
  class FakeMutationObserver { observe() {} }
  class FakeCustomEvent {
    type: string;
    detail: unknown;
    constructor(type: string, init?: { detail?: unknown }) { this.type = type; this.detail = init?.detail; }
  }

  vm.runInNewContext(source, {
    window,
    fetch: (...args: Parameters<typeof fetch>) => window.fetch(...args),
    document,
    localStorage,
    sessionStorage,
    MutationObserver: FakeMutationObserver,
    CustomEvent: FakeCustomEvent,
    URL,
    URLSearchParams,
    Headers,
    Request,
    Response,
    DOMException,
    Set,
    Promise,
    JSON,
    Number,
    String,
    Array,
    Object,
  });

  return { window: window as unknown as VenueRuntime["window"], localStorage, events, replacements, messages };
}

function switchResponse(venueId: number) {
  return new Response(JSON.stringify({
    ok: true,
    activeVenueId: venueId,
    activeWorkspaceId: 1,
    activeVenueIsPrimary: venueId === 101,
    role: venueId === 101 ? "owner" : "manager",
    permissions: venueId === 101 ? ["finance.view"] : ["inventory.view"],
  }), { status: 200, headers: { "Content-Type": "application/json" } });
}

test("canonical sheet uses the requested copy and the whole inactive card is the switch target", async () => {
  const source = await readFile(new URL("../public/venue-switcher.js", import.meta.url), "utf8");
  assert.match(source, /После переключения все данные и инструменты откроются для выбранного заведения\./);
  assert.match(source, /selected \? "Текущее" : "Перейти"/);
  assert.match(source, /button\.disabled = selected/);
  assert.match(source, /button\.setAttribute\("aria-current", "true"\)/);
  assert.match(source, /button\.addEventListener\("click", function \(\) \{ switchVenue\(venue\); \}\)/);
  assert.match(source, /class="bd-add-venue" href="\/venues\/new"/);
  assert.doesNotMatch(source, /selected \? "Открыто"/);
});

test("a successful A to B switch commits context once and clears entity, filters and hash", async () => {
  let calls = 0;
  const runtime = await createRuntime(async () => {
    calls += 1;
    return switchResponse(202);
  });
  const result = await runtime.window.bdVenueSwitcher.switchVenue({
    id: 202,
    role: "manager",
    permissions: ["inventory.view"],
  });

  assert.equal(result, true, runtime.messages.join(" | "));
  assert.equal(calls, 1);
  assert.equal(runtime.localStorage.getItem("bd_active_venue_id"), "202");
  assert.equal(runtime.localStorage.getItem("bd_active_role"), "manager");
  assert.deepEqual(JSON.parse(runtime.localStorage.getItem("bd_active_permissions") ?? "[]"), ["inventory.view"]);
  assert.deepEqual(runtime.replacements, ["/equipment?venue=202"]);
});

test("tapping the current venue is a no-op and rapid taps cannot start competing switches", async () => {
  let resolveSwitch: ((response: Response) => void) | null = null;
  let calls = 0;
  const runtime = await createRuntime((async () => {
    calls += 1;
    return new Promise<Response>((resolve) => { resolveSwitch = resolve; });
  }) as typeof fetch);

  assert.equal(await runtime.window.bdVenueSwitcher.switchVenue({ id: 101 }), false);
  assert.equal(calls, 0);

  const first = runtime.window.bdVenueSwitcher.switchVenue({ id: 202, role: "manager" });
  assert.equal(await runtime.window.bdVenueSwitcher.switchVenue({ id: 303, role: "manager" }), false);
  assert.equal(calls, 1);
  assert.ok(resolveSwitch);
  (resolveSwitch as ((response: Response) => void) | null)?.(switchResponse(202));
  assert.equal(await first, true, runtime.messages.join(" | "));
  assert.deepEqual(runtime.replacements, ["/equipment?venue=202"]);
});

test("a response started in A is rejected once an A to B switch begins", async () => {
  let resolveOld: ((response: Response) => void) | null = null;
  const runtime = await createRuntime((async (input: RequestInfo | URL) => {
    const pathname = new URL(String(input), "https://bardoctor.test").pathname;
    if (pathname === "/api/access/active-venue") return switchResponse(202);
    return new Promise<Response>((resolve) => { resolveOld = resolve; });
  }) as typeof fetch);

  const oldResponse = runtime.window.fetch("/api/store/bd_employees", {
    headers: { "X-Venue-Id": "101" },
  });
  assert.equal(
    await runtime.window.bdVenueSwitcher.switchVenue({ id: 202, role: "manager" }),
    true,
    runtime.messages.join(" | "),
  );
  assert.ok(resolveOld);
  (resolveOld as ((response: Response) => void) | null)?.(
    new Response(JSON.stringify({ ok: true }), { status: 200 }),
  );
  await assert.rejects(oldResponse, (error: unknown) =>
    error instanceof DOMException && error.name === "AbortError"
  );
});

test("a cross-tab venue commit reloads the current module without stale query state", async () => {
  const runtime = await createRuntime(
    async () => switchResponse(202),
    "https://bardoctor.test/suppliers?documentId=same-id&q=cola&venue=101#document",
  );
  const listener = runtime.events.get("storage")?.[0];
  assert.ok(listener);
  listener({ key: "bd_active_venue_id", newValue: "202" });
  assert.deepEqual(runtime.replacements, ["/suppliers?venue=202"]);
});

test("every standalone venue-scoped module mounts the canonical switcher asset", async () => {
  const routes = [
    "app/data-control/route.ts",
    "app/team-access/route.ts",
    "app/integrations/route.ts",
    "app/market/route.ts",
    "app/opportunities/route.ts",
    "app/notifications/route.ts",
    "app/sales-import/route.ts",
    "app/supplier-alternatives/route.ts",
  ];
  for (const route of routes) {
    const source = await readFile(new URL(`../${route}`, import.meta.url), "utf8");
    assert.match(source, /venue-switcher\.css\?v=20260826-venue-identity-v297/, route);
    assert.match(source, /venue-switcher\.js\?v=20260826-venue-identity-v297/, route);
    assert.match(source, /data-bd-venue-host/, route);
  }
});

test("production clients cannot change the venue by copying an unverified query parameter", async () => {
  const files = [
    "public/bardoctor-preview.js",
    "public/integrations.js",
    "public/market.js",
    "public/opportunities.js",
    "public/notifications.js",
  ];
  for (const file of files) {
    const source = await readFile(new URL(`../${file}`, import.meta.url), "utf8");
    assert.doesNotMatch(source, /venueFromLink/, file);
  }
  const auth = await readFile(new URL("../lib/bardoctor/auth.ts", import.meta.url), "utf8");
  assert.match(auth, /eq\(venueMemberships\.accountId, account\.id\)/);
  assert.match(auth, /requestedHeader != null/);
  assert.match(auth, /return selectVenueMembership\(memberships, requestedVenueId, account\.id\)/);
});
