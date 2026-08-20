(function () {
  "use strict";
  if (window.location.hostname !== "terminal.local") return;
  var state = new URLSearchParams(window.location.search).get("qaMore");
  if (!state) return;

  var email = "more-hub-qa@bardoctor.local";
  var activeVenueId = state === "single" ? 11 : 21;
  var venues = state === "single"
    ? [{ id: 11, name: "Кёльн", role: "owner", isPrimary: true, permissions: [] }]
    : [
        { id: 21, name: state === "long" ? "Кёльн · Центральная площадка с очень длинным названием" : "Кёльн", role: state === "limited" ? "shift_manager" : "owner", isPrimary: true, permissions: [] },
        { id: 22, name: "Причал", role: state === "limited" ? "shift_manager" : "owner", isPrimary: false, permissions: [] },
      ];
  var role = state === "limited" ? "shift_manager" : "owner";
  var permissions = state === "limited"
    ? ["equipment.view", "reviews.view", "inventory.view"]
    : ["equipment.view", "reviews.view", "inventory.view", "settings.manage", "access.manage", "integrations.manage", "data.import", "finance.export"];
  var profile = {
    id: "primary",
    name: venues[0].name,
    businessType: "Бар",
    city: "Бендеры",
    areas: ["Бар", "Кухня"],
  };
  var scope = "__" + email + "__venue_" + activeVenueId;
  var equipment = state === "empty" ? [] : [
    { id: "qa-eq-1", name: "Льдогенератор", status: "broken", archived: false, createdAt: "2026-08-01T12:00:00.000Z" },
    { id: "qa-eq-2", name: "Холодильник", status: "working", archived: false, createdAt: "2026-08-01T11:00:00.000Z" },
  ];

  localStorage.setItem("bd_session", email);
  localStorage.setItem("bd_session_token", "qa-local-token");
  localStorage.setItem("bd_session_userid", "qa-local-user");
  localStorage.setItem("bd_active_venue_id", String(activeVenueId));
  localStorage.setItem("bd_active_venue_is_primary", "1");
  localStorage.setItem("bd_active_role", role);
  localStorage.setItem("bd_active_permissions", JSON.stringify(permissions));
  localStorage.setItem("bd_restaurant_profile__" + email, JSON.stringify(profile));
  localStorage.setItem("bd_restaurant_cache" + scope, JSON.stringify(profile));
  localStorage.setItem("bd_equipment_cache" + scope, JSON.stringify(equipment));
  localStorage.setItem("bd_guest_reviews_cache" + scope, JSON.stringify([]));
  localStorage.setItem("bd_venue_context__" + email, JSON.stringify({
    activeVenueId: activeVenueId,
    activeWorkspaceId: "qa-workspace",
    canCreateVenues: role === "owner",
    venues: venues,
  }));
})();
