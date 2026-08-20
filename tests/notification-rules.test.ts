import assert from "node:assert/strict";
import test from "node:test";
import {
  evaluateNotificationRules,
  type NotificationRulePreferences,
} from "../lib/bardoctor/notification-rules";

const preferences: NotificationRulePreferences = {
  shiftAlerts: true,
  taskAlerts: true,
  equipmentAlerts: true,
  incidentAlerts: true,
  calendarAlerts: true,
  financeAlerts: true,
  quietStart: "23:00",
  quietEnd: "08:00",
  timezone: "UTC",
};

const openEveryDay = {
  name: "Кёльн",
  openTime: "22:00",
  closeTime: "06:00",
  workingDays: { 1: true, 2: true, 3: true, 4: true, 5: true, 6: true, 7: true },
};

function stores(entries: Record<string, unknown> = {}) {
  return new Map<string, unknown>(Object.entries({
    bd_finance_revenue: [{ id: "shift", date: "2026-07-22", revenue: 10_000, receipts: 100 }],
    bd_finance_gap_reasons: [],
    bd_action_tasks: [],
    bd_equipment: [],
    bd_cases: [],
    bd_month_closings: [{ monthKey: "2026-06", status: "closed" }],
    bd_opportunity_calendar_v1: { events: [] },
    ...entries,
  }));
}

test("quiet hours suppress routine alerts but never hide a critical incident", () => {
  const messages = evaluateNotificationRules({
    restaurant: openEveryDay,
    stores: stores({
      bd_action_tasks: [{ id: "task-1", title: "Проверить кассу", dueDate: "2026-07-23", status: "not_started" }],
      bd_cases: [{ id: "case-1", title: "Угроза безопасности", priority: "critical", status: "open" }],
    }),
    preferences,
    now: new Date("2026-07-23T02:00:00.000Z"),
  });

  assert.deepEqual(messages.map((message) => message.category), ["incident"]);
  assert.equal(messages[0]?.urgent, true);
});

test("tasks alert one day before, on the due date, and once when overdue", () => {
  const messages = evaluateNotificationRules({
    restaurant: openEveryDay,
    stores: stores({
      bd_action_tasks: [
        { id: "tomorrow", title: "Заказать фильтр", dueDate: "2026-07-24", status: "not_started" },
        { id: "today", title: "Проверить холодильник", dueDate: "2026-07-23", status: "in_progress" },
        { id: "late", title: "Закрыть акт", dueDate: "2026-07-21", status: "not_started" },
      ],
    }),
    preferences,
    now: new Date("2026-07-23T10:00:00.000Z"),
  });

  const taskTitles = messages
    .filter((message) => message.category === "task")
    .map((message) => message.title);
  assert.deepEqual(taskTitles, [
    "Срок поручения завтра",
    "Срок поручения сегодня",
    "Поручение просрочено",
  ]);
});

test("manual tasks alert, while completed and mirrored AI tasks do not duplicate", () => {
  const messages = evaluateNotificationRules({
    restaurant: openEveryDay,
    stores: stores({
      bd_tasks: [
        {
          id: "manual",
          title: "Проверить витрину",
          deadline: "2026-07-23",
          status: "not_started",
        },
        {
          id: "closed",
          title: "Закрытое поручение",
          deadline: "2026-07-23",
          status: "completed",
        },
        {
          id: "mirror",
          actionTaskId: "action-1",
          sourcePlanId: "plan-1",
          recommendationId: "recommendation-1",
          title: "Проверить кондиционер",
          deadline: "2026-07-23",
          status: "in_progress",
        },
      ],
      bd_action_tasks: [
        {
          id: "action-1",
          planId: "plan-1",
          recommendationId: "recommendation-1",
          title: "Проверить кондиционер",
          dueDate: "2026-07-23",
          status: "in_progress",
        },
      ],
    }),
    preferences,
    now: new Date("2026-07-23T10:00:00.000Z"),
  });

  const taskMessages = messages.filter((message) => message.category === "task");
  assert.equal(taskMessages.length, 1);
  assert.equal(taskMessages[0]?.title, "Сегодня истекают поручения");
  assert.match(taskMessages[0]?.message ?? "", /2 поручения требуют контроля/);
});

test("agent proposals do not alert until a user approves them", () => {
  const pending = evaluateNotificationRules({
    restaurant: openEveryDay,
    stores: stores({
      bd_tasks: [
        {
          id: "proposal",
          title: "Проверить ФОТ",
          deadline: "2026-07-23",
          status: "not_started",
          approvalStatus: "pending",
          aiGenerated: true,
        },
      ],
      bd_action_tasks: [
        {
          id: "proposal-action",
          title: "Проверить ФОТ",
          dueDate: "2026-07-23",
          status: "proposed",
          approvalStatus: "pending",
        },
      ],
    }),
    preferences,
    now: new Date("2026-07-23T10:00:00.000Z"),
  });
  assert.equal(pending.filter((message) => message.category === "task").length, 0);

  const approved = evaluateNotificationRules({
    restaurant: openEveryDay,
    stores: stores({
      bd_tasks: [
        {
          id: "approved",
          title: "Проверить ФОТ",
          deadline: "2026-07-23",
          status: "not_started",
          approvalStatus: "approved",
        },
      ],
    }),
    preferences,
    now: new Date("2026-07-23T10:00:00.000Z"),
  });
  assert.equal(approved.filter((message) => message.category === "task").length, 1);
});

test("equipment warns before maintenance and immediately on a critical breakdown", () => {
  const messages = evaluateNotificationRules({
    restaurant: openEveryDay,
    stores: stores({
      bd_equipment: [
        {
          id: "fridge",
          name: "Холодильник",
          status: "working",
          nextMaintenance: "2026-07-30",
        },
        {
          id: "power",
          name: "Главный щит",
          status: "broken",
          criticality: "critical",
          updatedAt: "2026-07-23T09:30:00.000Z",
        },
      ],
    }),
    preferences,
    now: new Date("2026-07-23T10:00:00.000Z"),
  });

  const equipment = messages.filter((message) => message.category === "equipment");
  assert.ok(equipment.some((message) => message.title === "Обслуживание через 7 дней"));
  assert.ok(equipment.some((message) => message.title === "Оборудование неисправно" && message.urgent));
});

test("finance compares a shift only with the same weekday and requires a material drop", () => {
  const messages = evaluateNotificationRules({
    restaurant: openEveryDay,
    stores: stores({
      bd_finance_revenue: [
        { id: "latest", date: "2026-07-22", revenue: 600, receipts: 10 },
        { id: "w1", date: "2026-07-15", revenue: 1_000, receipts: 10 },
        { id: "w2", date: "2026-07-08", revenue: 1_100, receipts: 10 },
        { id: "w3", date: "2026-07-01", revenue: 900, receipts: 10 },
        { id: "other-day", date: "2026-07-21", revenue: 20_000, receipts: 10 },
      ],
    }),
    preferences,
    now: new Date("2026-07-23T10:00:00.000Z"),
  });

  const alert = messages.find((message) => message.dedupeKey.startsWith("finance-deviation:"));
  assert.ok(alert);
  assert.match(alert.message, /40%/);
  assert.match(alert.message, /3 такими же днями недели/);
});

test("month closing escalates after the fifth day", () => {
  const messages = evaluateNotificationRules({
    restaurant: {
      ...openEveryDay,
      workingDays: { 1: false, 2: false, 3: false, 4: false, 5: false, 6: false, 7: false },
    },
    stores: stores({ bd_month_closings: [] }),
    preferences,
    now: new Date("2026-07-05T10:00:00.000Z"),
  });

  assert.ok(messages.some((message) => message.title === "Закрытие месяца просрочено"));
});

test("a scheduled operating day without a report produces a missing-shift alert", () => {
  const messages = evaluateNotificationRules({
    restaurant: {
      ...openEveryDay,
      workingDays: { 1: false, 2: false, 3: true, 4: false, 5: false, 6: false, 7: false },
    },
    stores: stores({ bd_finance_revenue: [] }),
    preferences,
    now: new Date("2026-07-23T10:00:00.000Z"),
  });

  assert.ok(messages.some((message) => message.dedupeKey === "missing-shift:2026-07-22"));
});
