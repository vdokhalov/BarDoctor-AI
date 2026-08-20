type PrimaryRoute = "home" | "shifts" | "finance" | "add" | "employees" | "more";

const ITEMS: Array<{ route: PrimaryRoute; href: string; label: string; icon: string; add?: boolean }> = [
  { route: "home", href: "/home", label: "Главная", icon: "house" },
  { route: "shifts", href: "/shifts", label: "Смены", icon: "clipboard-list" },
  { route: "finance", href: "/finance", label: "Финансы", icon: "circle-dollar-sign" },
  { route: "add", href: "/add", label: "Добавить", icon: "plus", add: true },
  { route: "employees", href: "/employees", label: "Команда", icon: "users-round" },
  { route: "more", href: "/more", label: "Ещё", icon: "grid-2x2" },
];

export function canonicalAppNavigation(active: PrimaryRoute = "more"): string {
  const links = ITEMS.map((item) => {
    const selected = item.route === active;
    return `<a href="${item.href}"${item.add ? ' class="nav-add"' : selected ? ' class="active"' : ""}${selected ? ' aria-current="page"' : ""}><img src="/integration-icons/${item.icon}.svg" alt="" aria-hidden="true" /><span>${item.label}</span></a>`;
  }).join("");
  return `<nav id="bd-canonical-bottom-nav" class="integration-bottom-nav bd-canonical-navigation" aria-label="Основная навигация" data-bd-bottom-nav="canonical-standalone-v1">
      <div class="integration-nav-brand" data-bd-desktop-brand="canonical-standalone-v1"><img src="/icons/bardoctor-mark-v159.svg" alt="" aria-hidden="true" /><strong>BarDoctor</strong></div>
      <div class="integration-primary-nav" data-bd-primary-navigation="canonical-standalone-v1">${links}</div>
    </nav>`;
}

export function isEmbeddedApplicationRoute(request: Request): boolean {
  return new URL(request.url).searchParams.get("embedded") === "1";
}

export function canonicalAppNavigationForRequest(
  request: Request,
  active: PrimaryRoute = "more",
): string {
  return isEmbeddedApplicationRoute(request) ? "" : canonicalAppNavigation(active);
}
