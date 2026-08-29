(function () {
  "use strict";
  if (!["terminal.local", "127.0.0.1", "localhost"].includes(location.hostname)) return;
  var params = new URLSearchParams(location.search);
  if (params.get("qaOpportunity") !== "v327") return;
  var originalFetch = window.fetch.bind(window);
  var qaEmail = "opportunity-v327-qa@bardoctor.local";
  var qaPermissions = ["calendar.view", "calendar.manage", "finance.view", "inventory.view", "settings.manage"];
  localStorage.setItem("bd_session", qaEmail);
  localStorage.setItem("bd_session_token", "qa-opportunity-token");
  localStorage.setItem("bd_session_userid", "qa-opportunity-user");
  localStorage.setItem("bd_active_venue_id", "501");
  localStorage.setItem("bd_active_role", "owner");
  localStorage.setItem("bd_active_permissions", JSON.stringify(qaPermissions));
  var decisionKey = "bd_opportunity_qa_decisions_v327";
  var decisions;
  try { decisions = JSON.parse(sessionStorage.getItem(decisionKey) || "null"); } catch { decisions = null; }
  if (!decisions) decisions = { "city-day": "watching", "football": "watching", "concert": "watching", "halloween": "planned" };
  function event(id, title, category, startDate, score, summary) {
    return {
      id: id, title: title, category: category, calendarType: "discovered", origin: "web", startDate: startDate,
      endDate: null, activationDate: startDate, startTime: "19:00", location: "Бендеры", locality: "local",
      relation: { mode: "local_demand", distanceKm: 2, reason: "Событие связано с локальной аудиторией и графиком заведения." },
      audience: "Гости заведения", summary: summary, potentialScore: score, potentialLabel: score >= 75 ? "high" : score >= 55 ? "medium" : "low",
      confidence: "high", scoreReason: "Высокое соответствие аудитории, времени и локации заведения.",
      scoreBreakdown: { audienceFit: 25, scheduleFit: 17, proximity: 18, commercialPotential: 15, readiness: 7 },
      whyUseful: ["Повышенный локальный трафик", "Подходит вечернему формату"],
      impact: { level: "high", metric: "Посещаемость", range: "Требует проверки по фактическим данным", basis: "Афиша и профиль заведения" },
      recommendation: { format: "Тематическая смена", offer: "Специальное предложение", promotion: "Анонс за 10 дней", operations: "Проверить команду и запасы", decisionDeadline: "2026-09-01", leadDays: 14 },
      risks: ["Проверить фактический спрос"], sourceUrls: ["https://example.com/event"], decision: decisions[id], decisionUpdatedAt: null,
      notificationPlan: { status: "not_needed", count: 0, queuedCount: 0, nextAt: null, signature: id, messages: [] }
    };
  }
  function calendar() {
    return {
      version: 3, venueName: "Кёльн", locationLabel: "Бендеры, Молдова", profileSignature: "qa-koeln-v327", searchRadiusKm: 35,
      windowStart: "2026-08-28", windowEnd: "2027-08-28", generatedAt: "2026-08-28T13:21:00.000Z", model: "qa-v327",
      summary: "Безопасный QA calendar", deletedEventIds: [], sources: [{ url: "https://example.com/event", title: "Городская афиша" }],
      events: [
        event("city-day", "День города Бендеры с большой вечерней программой", "city", "2026-08-31", 82, "Высокий локальный трафик в вечерние часы."),
        event("football", "Матч сборной Молдовы", "sport", "2026-09-07", 74, "Подходит для тематического вечера и трансляции."),
        event("concert", "Концерт в Тирасполе", "concert", "2026-09-14", 63, "Можно собрать спрос после события."),
        event("halloween", "Halloween Weekend", "holiday", "2026-10-31", 88, "Сильный повод для специального предложения и промо.")
      ]
    };
  }
  function response(body, status) {
    return Promise.resolve(new Response(JSON.stringify(body), { status: status || 200, headers: { "Content-Type": "application/json" } }));
  }
  window.fetch = function (input, init) {
    var url = typeof input === "string" ? input : input && input.url;
    var path = new URL(url, location.href).pathname;
    if (path === "/api/auth/bootstrap") return response({ ok: true, email: qaEmail, userId: "qa-opportunity-user", token: "qa-opportunity-token", firstName: "QA", lastName: "Calendar", role: "owner", permissions: qaPermissions, activeVenueId: 501, activeWorkspaceId: "qa-opportunity-workspace", activeVenueIsPrimary: true, canCreateVenues: false, venues: [{ id: 501, name: "Кёльн", role: "owner", permissions: qaPermissions }], bootstrap: { state: "ready", reason: "active_venue_ready", membershipsLoaded: true, venuesLoaded: true, accessibleVenueCount: 1, confirmedOwnedVenueCount: 1, inaccessibleOwnedVenueCount: 0 } });
    if (path === "/api/restaurants/me") return response({ ok: true, restaurant: { id: "primary", name: "Кёльн", city: "Бендеры", country: "Молдова", currency: "PMR_RUB" } });
    if (path === "/api/users/me") return response({ ok: true, user: { firstName: "QA", lastName: "Calendar", email: qaEmail, role: "owner", permissions: qaPermissions, activeVenueId: 501 } });
    if (path === "/api/migrate") return response({ ok: true, imported: [], skipped: [] });
    if (path === "/api/store") return response({ ok: true, entries: {} });
    if (path !== "/api/opportunities") return originalFetch(input, init);
    var method = String(init && init.method || "GET").toUpperCase();
    if (method === "GET" && params.get("qaGet") === "hang") return new Promise(function () {});
    if (method === "GET" && params.get("qaGet") === "fail") return response({ ok: false, error: "QA calendar read failure" }, 503);
    if (method === "POST") {
      if (params.get("qaRefresh") === "fail") return response({ ok: false, error: "QA refresh failure" }, 503);
      var refreshed = calendar(); refreshed.generatedAt = new Date().toISOString();
      return response({ ok: true, calendar: refreshed, message: "Календарь обновлён." });
    }
    if (method === "PATCH") {
      var body = JSON.parse(init && init.body || "{}");
      if (body.action === "set-decision") decisions[body.eventId] = body.decision;
      try { sessionStorage.setItem(decisionKey, JSON.stringify(decisions)); } catch {}
      var updated = calendar();
      if (body.action === "delete-event") updated.events = updated.events.filter(function (item) { return item.id !== body.eventId; });
      return response({ ok: true, calendar: updated, message: "QA решение сохранено." });
    }
    return response({
      ok: true, restaurant: { name: "Кёльн", city: "Бендеры" }, calendar: calendar(), stale: params.get("qaStale") === "1",
      refreshIntervalDays: 7, horizonDays: 365, notificationStatus: { enabled: true, calendarAlerts: true, serverConfigured: true }
    });
  };
})();
