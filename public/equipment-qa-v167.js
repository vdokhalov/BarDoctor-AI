(function () {
  "use strict";
  if (window.location.hostname !== "terminal.local") return;
  var state = new URLSearchParams(window.location.search).get("qaEquipment");
  if (!state) return;

  var email = "equipment-v167-qa@bardoctor.local";
  var venueId = state === "venue-b" ? 302 : 301;
  var scope = "__" + email + "__venue_" + venueId;
  var venueName = state === "long"
    ? "Кёльн · Центральная площадка с очень длинным названием"
    : state === "venue-b" ? "Причал" : "Кёльн";
  var profile = {
    id: "primary",
    name: venueName,
    businessType: "Бар",
    city: "Бендеры",
    areas: ["Бар", "Кухня", "Зал", "Администрация"],
  };
  var equipment = state === "empty" ? [] : state === "venue-b" ? [
    { id: "eq-b-1", name: "Кофемашина", category: "bar", zone: "Бар", area: "Бар", quantity: 1, status: "working", maintenancePolicy: { mode: "as_needed" }, createdAt: "2026-08-01T10:00:00.000Z", updatedAt: "2026-08-01T10:00:00.000Z" },
  ] : [
    { id: "eq-air-group", name: "Кондиционеры", category: "dining", zone: "Зал", area: "Зал", quantity: 4, recordType: "group", status: "working", criticality: "high", maintenancePolicy: { mode: "interval_months", interval: 6, nextDate: "2026-09-10" }, nextMaintenance: "2026-09-10", createdAt: "2023-03-12T10:00:00.000Z", updatedAt: "2026-08-10T10:00:00.000Z" },
    { id: "eq-air-3", parentGroupId: "eq-air-group", unitIndex: 3, name: "Кондиционер №3", category: "dining", zone: "Зал · Ночная зона", area: "Зал · Ночная зона", quantity: 1, recordType: "item", status: "broken", criticality: "critical", internalId: "EQ-00023", model: "Daikin FTXF50A", installationDate: "2023-03-12", maintenancePolicy: { mode: "interval_months", interval: 6, nextDate: "2026-07-25" }, nextMaintenance: "2026-07-25", createdAt: "2023-03-12T10:00:00.000Z", updatedAt: "2026-08-12T08:00:00.000Z" },
    { id: "eq-ice", name: "Льдогенератор", category: "bar", zone: "Бар", area: "Бар", quantity: 1, status: "needs_maintenance", criticality: "high", maintenancePolicy: { mode: "interval_days", interval: 90, nextDate: "2026-07-25" }, lastMaintenance: "2026-04-26", nextMaintenance: "2026-07-25", createdAt: "2025-01-04T10:00:00.000Z", updatedAt: "2026-08-11T10:00:00.000Z" },
    { id: "eq-fridge", name: "Барные холодильники", category: "bar", zone: "Бар", area: "Бар", quantity: 3, recordType: "group", status: "working", maintenancePolicy: { mode: "interval_months", interval: 3, nextDate: "2026-08-18" }, nextMaintenance: "2026-08-18", createdAt: "2024-02-10T10:00:00.000Z", updatedAt: "2026-08-05T10:00:00.000Z" },
    { id: "eq-kitchen-fridge", name: "Холодильник кухни", category: "kitchen", zone: "Кухня", area: "Кухня", quantity: 1, status: "unknown", criticality: "not_assessed", createdAt: "2026-07-10T10:00:00.000Z", updatedAt: "2026-07-10T10:00:00.000Z" },
    { id: "eq-camera", name: "Камеры видеонаблюдения", category: "admin", zone: "Зал", area: "Зал", quantity: 4, status: "working", maintenancePolicy: { mode: "not_required" }, createdAt: "2024-08-01T10:00:00.000Z", updatedAt: "2026-08-01T10:00:00.000Z" },
  ];
  if (state === "unconfigured") {
    equipment = equipment.map(function (item) {
      var copy = Object.assign({}, item);
      delete copy.maintenancePolicy;
      delete copy.nextMaintenance;
      return copy;
    });
  }

  var workOrders = state === "empty" || state === "venue-b" ? [] : [
    {
      id: "wo-air-3",
      equipmentId: "eq-air-3",
      kind: "problem",
      title: "Не охлаждает помещение",
      description: "Температура остаётся выше установленной.",
      impact: "Нельзя поддерживать заданную температуру в ночной зоне",
      priority: "critical",
      equipmentStatus: "broken",
      status: "assigned",
      dueDate: "2026-08-12",
      responsibleEmployeeId: "emp-1",
      responsibleName: "Андрей П.",
      detectedAt: "2026-08-12T08:00:00.000Z",
      assignedAt: "2026-08-12T08:30:00.000Z",
      timeline: [
        { id: "wo-air-3:detected", status: "detected", label: "Обнаружено", at: "2026-08-12T08:00:00.000Z" },
        { id: "wo-air-3:assigned", status: "assigned", label: "Назначено", at: "2026-08-12T08:30:00.000Z", responsibleName: "Андрей П." },
      ],
      createdAt: "2026-08-12T08:00:00.000Z",
      updatedAt: "2026-08-12T08:30:00.000Z",
    },
    {
      id: "wo-ice-maintenance",
      equipmentId: "eq-ice",
      kind: "maintenance",
      title: "Плановая чистка и диагностика",
      priority: "high",
      status: "detected",
      dueDate: "2026-07-25",
      createdAt: "2026-07-20T10:00:00.000Z",
      updatedAt: "2026-07-20T10:00:00.000Z",
      timeline: [{ id: "wo-ice-maintenance:detected", status: "detected", label: "Обнаружено", at: "2026-07-20T10:00:00.000Z" }],
    },
    { id: "wo-air-old-1", equipmentId: "eq-air-3", kind: "repair", title: "Замена датчика", priority: "high", status: "verified", cost: 2200, costDate: "2026-06-10", verifiedAt: "2026-06-11T10:00:00.000Z", createdAt: "2026-06-09T10:00:00.000Z", updatedAt: "2026-06-11T10:00:00.000Z" },
    { id: "wo-air-old-2", equipmentId: "eq-air-3", kind: "repair", title: "Диагностика блока", priority: "high", status: "verified", cost: 1200, costDate: "2026-07-14", verifiedAt: "2026-07-15T10:00:00.000Z", createdAt: "2026-07-13T10:00:00.000Z", updatedAt: "2026-07-15T10:00:00.000Z" },
  ];
  var history = state === "empty" || state === "venue-b" ? [] : [
    { id: "wo-air-3:detected", equipmentId: "eq-air-3", workOrderId: "wo-air-3", type: "breakdown", workflowStatus: "detected", date: "2026-08-12", problem: "Не охлаждает помещение", createdAt: "2026-08-12T08:00:00.000Z" },
    { id: "wo-air-3:assigned", equipmentId: "eq-air-3", workOrderId: "wo-air-3", type: "repair", workflowStatus: "assigned", date: "2026-08-12", problem: "Не охлаждает помещение", performedBy: "Андрей П.", createdAt: "2026-08-12T08:30:00.000Z" },
  ];
  var expenses = state === "empty" || state === "venue-b" ? [] : [
    { id: "equipment-work-order:wo-air-old-1", equipmentWorkOrderId: "wo-air-old-1", equipmentId: "eq-air-3", equipmentCostType: "repair", category: "repairs", amount: 2200, date: "2026-06-10", description: "Ремонт: Кондиционер №3" },
    { id: "equipment-work-order:wo-air-old-2", equipmentWorkOrderId: "wo-air-old-2", equipmentId: "eq-air-3", equipmentCostType: "repair", category: "repairs", amount: 1200, date: "2026-07-14", description: "Ремонт: Кондиционер №3" },
    { id: "equipment-maintenance:ice", equipmentId: "eq-ice", equipmentCostType: "maintenance", category: "repairs", amount: 900, date: "2026-05-02", description: "ТО: Льдогенератор" },
  ];
  var employees = [
    { id: "emp-1", name: "Андрей П.", position: "administrator", status: "active" },
    { id: "emp-2", name: "Мария К.", position: "bartender", status: "active" },
  ];
  var permissions = ["equipment.view", "equipment.manage", "expenses.create", "finance.view", "finance.manage", "team.view"];

  localStorage.setItem("bd_session", email);
  localStorage.setItem("bd_session_token", "qa-local-token");
  localStorage.setItem("bd_session_userid", "qa-equipment-user");
  localStorage.setItem("bd_active_venue_id", String(venueId));
  localStorage.setItem("bd_active_venue_is_primary", "1");
  localStorage.setItem("bd_active_role", "owner");
  localStorage.setItem("bd_active_permissions", JSON.stringify(permissions));
  localStorage.setItem("bd_restaurant_profile__" + email, JSON.stringify(profile));
  localStorage.setItem("bd_restaurant_cache" + scope, JSON.stringify(profile));
  localStorage.setItem("bd_equipment_cache" + scope, JSON.stringify(equipment));
  localStorage.setItem("bd_equipment_history_cache" + scope, JSON.stringify(history));
  localStorage.setItem("bd_equipment_work_orders_cache" + scope, JSON.stringify(workOrders));
  localStorage.setItem("bd_finance_expenses_cache" + scope, JSON.stringify(expenses));
  localStorage.setItem("bd_employees_cache" + scope, JSON.stringify(employees));
  localStorage.setItem("bd_venue_context__" + email, JSON.stringify({
    activeVenueId: venueId,
    activeWorkspaceId: "qa-equipment-workspace",
    canCreateVenues: true,
    venues: [
      { id: 301, name: venueName, role: "owner", isPrimary: true, permissions: permissions },
      { id: 302, name: "Причал", role: "owner", isPrimary: false, permissions: permissions },
    ],
  }));
})();
