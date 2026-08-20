(function () {
  "use strict";

  if (window.location.hostname !== "terminal.local") return;
  var params = new URLSearchParams(window.location.search);
  var state = params.get("qaReport");
  if (!state) return;

  var email = "monthly-report-qa@bardoctor.local";
  var venueId = "qa-monthly-venue";
  var scope = "__" + email + "__venue_" + venueId;
  var profile = {
    id: "primary",
    name: "Кёльн · QA",
    businessType: "Развлекательный комплекс",
    city: "Бендеры",
    region: "Приднестровье",
    areas: ["Бар", "Кухня", "Кальяны"],
    workingDays: { 1: false, 2: false, 3: false, 4: false, 5: true, 6: true, 7: true },
    openTime: "22:00",
    closeTime: "06:00",
  };

  var julyRevenue = [
    ["2026-07-03", 20000, 48, 4000],
    ["2026-07-04", 18000, 42, 4000],
    ["2026-07-05", 12000, 31, 3000],
    ["2026-07-10", 16000, 38, 4000],
    ["2026-07-11", 14000, 35, 3500],
    ["2026-07-12", 8000, 22, 2500],
    ["2026-07-17", 7000, 19, 2000],
    ["2026-07-18", 5000, 14, 2000],
  ].map(function (row, index) {
    return {
      id: "qa-july-" + index,
      date: row[0],
      revenue: row[1],
      receipts: row[2],
      guests: row[2] + Math.round(row[2] * 0.18),
      payrollBreakdown: { total: row[3], perDepartment: {} },
    };
  });

  var juneRevenue = [
    ["2026-06-05", 18000, 43, 4500],
    ["2026-06-06", 16000, 39, 4000],
    ["2026-06-12", 15000, 36, 4000],
    ["2026-06-13", 14000, 33, 3500],
    ["2026-06-19", 15000, 35, 3500],
    ["2026-06-20", 12000, 29, 3500],
  ].map(function (row, index) {
    return {
      id: "qa-june-" + index,
      date: row[0],
      revenue: row[1],
      receipts: row[2],
      guests: row[2] + 5,
      payrollBreakdown: { total: row[3], perDepartment: {} },
    };
  });

  var julyExpenses = [
    { id: "j-1", date: "2026-07-02", category: "alcohol", area: "Бар", amount: 20000 },
    { id: "j-2", date: "2026-07-02", category: "food", area: "Кухня", amount: 15000 },
    { id: "j-3", date: "2026-07-03", category: "hookah", area: "Кальяны", amount: 5000 },
    { id: "j-4", date: "2026-07-05", category: "writeoff", area: "Кухня", amount: 1500 },
    { id: "j-5", date: "2026-07-07", category: "repairs", amount: 4000 },
    { id: "j-6", date: "2026-07-08", category: "marketing", amount: 3000 },
    { id: "j-7", date: "2026-07-09", category: "household", amount: 2000 },
    { id: "j-8", date: "2026-07-10", category: "security", amount: 2860.71 },
    { id: "j-9", date: "2026-07-11", category: "cleaning", amount: 2000 },
    { id: "j-10", date: "2026-07-15", category: "taxes", amount: 5000 },
    { id: "j-11", date: "2026-07-16", category: "utilities", amount: 4500 },
  ];

  var juneExpenses = [
    { id: "u-1", date: "2026-06-02", category: "alcohol", area: "Бар", amount: 18000 },
    { id: "u-2", date: "2026-06-02", category: "food", area: "Кухня", amount: 12000 },
    { id: "u-3", date: "2026-06-03", category: "hookah", area: "Кальяны", amount: 5000 },
    { id: "u-4", date: "2026-06-06", category: "writeoff", area: "Бар", amount: 1000 },
    { id: "u-5", date: "2026-06-08", category: "repairs", amount: 4000 },
    { id: "u-6", date: "2026-06-09", category: "marketing", amount: 3000 },
    { id: "u-7", date: "2026-06-10", category: "household", amount: 2000 },
    { id: "u-8", date: "2026-06-11", category: "cleaning", amount: 3000 },
    { id: "u-9", date: "2026-06-15", category: "taxes", amount: 5000 },
    { id: "u-10", date: "2026-06-16", category: "utilities", amount: 4000 },
  ];

  var snapshots = [
    { id: "qa-snapshot-june", date: "2026-06-01", sections: { "Бар": 15000, "Кухня": 9000, "Кальяны": 4000 } },
    { id: "qa-snapshot-july", date: "2026-07-01", sections: { "Бар": 16000, "Кухня": 9500, "Кальяны": 4500 } },
    { id: "qa-snapshot-august", date: "2026-08-01", sections: { "Бар": 13500, "Кухня": 7500, "Кальяны": 4000 } },
  ];

  var settings = [{
    id: "primary",
    venueName: profile.name,
    inventoryFrequency: "monthly",
    customFrequencyDays: 30,
    inventorySections: ["Бар", "Кухня", "Кальяны"],
    taxModel: { mode: "manual", amount: 0, percent: 0 },
    utilityModel: { mode: "manual", amount: 0, percent: 0 },
    updatedAt: "2026-08-01T12:00:00.000Z",
  }];

  var closings = [
    {
      id: "qa-close-june",
      monthKey: "2026-06",
      venueId: "primary",
      status: "closed",
      closedAt: "2026-07-01T10:00:00.000Z",
      snapshot: {
        revenue: 90000,
        receipts: 215,
        purchases: 35000,
        periodExpenses: 47000,
        expenseBreakdown: [
          { label: "Бар", amount: 18000 },
          { label: "Кухня", amount: 12000 },
          { label: "Кальяны", amount: 5000 },
          { label: "Ремонт", amount: 4000 },
          { label: "Маркетинг", amount: 3000 },
          { label: "Уборка", amount: 3000 },
          { label: "Хоз.товары", amount: 2000 },
        ],
        otherExpenses: 12000,
        writeoffs: 1000,
        payroll: 23000,
        payrollSource: "По составу смен",
        taxes: 5000,
        utilities: 4000,
        openingInventory: 28000,
        closingInventory: 30000,
        costOfGoods: 32000,
        cashResult: 10000,
        resultBeforeCost: 45000,
        finalProfit: 13000,
        plannedShifts: 12,
        expectedShifts: 12,
        accountedShifts: 12,
        coveragePercent: 100,
      },
    },
  ];

  if (state === "closed") {
    closings.push({
      id: "qa-close-july",
      monthKey: "2026-07",
      venueId: "primary",
      status: "closed",
      closedAt: "2026-08-01T10:00:00.000Z",
      snapshot: {
        revenue: 100000,
        receipts: 249,
        purchases: 40000,
        periodExpenses: 53860.71,
        expenseBreakdown: [
          { label: "Бар", amount: 20000 },
          { label: "Кухня", amount: 15000 },
          { label: "Кальяны", amount: 5000 },
          { label: "Ремонт", amount: 4000 },
          { label: "Маркетинг", amount: 3000 },
          { label: "Охрана", amount: 2860.71 },
          { label: "Хоз.товары", amount: 2000 },
          { label: "Уборка", amount: 2000 },
        ],
        otherExpenses: 13860.71,
        writeoffs: 1500,
        payroll: 25000,
        payrollSource: "По составу смен",
        taxes: 5000,
        utilities: 4500,
        openingInventory: 30000,
        closingInventory: 25000,
        costOfGoods: 43500,
        cashResult: 10139.29,
        resultBeforeCost: 50139.29,
        finalProfit: 6639.29,
        plannedShifts: 14,
        expectedShifts: 14,
        accountedShifts: 14,
        coveragePercent: 100,
      },
    });
  }

  if (state === "missing") snapshots = snapshots.filter(function (row) { return row.date !== "2026-08-01"; });
  if (state === "empty") {
    julyRevenue = [];
    julyExpenses = [];
    snapshots = [];
    closings = [];
  }

  var stores = {
    bd_finance_revenue: juneRevenue.concat(julyRevenue),
    bd_finance_expenses: juneExpenses.concat(julyExpenses),
    bd_finance_gap_reasons: [],
    bd_inventory_snapshots: snapshots,
    bd_finance_settings: settings,
    bd_payroll_entries: [],
    bd_month_closings: closings,
  };

  localStorage.setItem("bd_session", email);
  localStorage.setItem("bd_session_token", "qa-local-token");
  localStorage.setItem("bd_session_userid", "qa-local-user");
  localStorage.setItem("bd_active_venue_id", venueId);
  localStorage.setItem("bd_active_venue_is_primary", "1");
  localStorage.setItem("bd_active_role", "owner");
  localStorage.setItem("bd_active_permissions", JSON.stringify(["reports.view", "finance.view", "finance.manage", "payroll.view"]));
  localStorage.setItem("bd_restaurant_profile__" + email, JSON.stringify(profile));
  localStorage.setItem("bd_restaurant_cache" + scope, JSON.stringify(profile));
  Object.keys(stores).forEach(function (storeKey) {
    localStorage.setItem(storeKey + "_cache" + scope, JSON.stringify(stores[storeKey]));
  });
})();
