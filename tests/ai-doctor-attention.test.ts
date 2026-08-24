import assert from "node:assert/strict";
import test from "node:test";

import {
  buildAIDoctorAttention,
  classifyAIDoctorSignal,
  humanizeValue,
} from "../lib/bardoctor/ai-doctor-attention";
import type { VenueAIContext } from "../lib/bardoctor/venue-ai-context";

function context(): VenueAIContext {
  return {
    version: "venue-ai-context-v1",
    purpose: "diagnosis",
    generatedAt: "2026-08-15T08:24:00.000Z",
    accountingCurrency: "RUB",
    blocks: [
      { id: "performanceHistory", label: "История показателей", available: true, freshness: "fresh", updatedAt: "2026-08-15T07:00:00.000Z", detail: "4 смены без отчёта", missingAction: null, data: {} },
      { id: "menuAndRecipes", label: "Меню и техкарты", available: true, freshness: "fresh", updatedAt: "2026-08-14T07:00:00.000Z", detail: "100 позиций", missingAction: null, data: {} },
      { id: "guestFeedback", label: "Отзывы гостей", available: true, freshness: "fresh", updatedAt: "2026-08-15T07:00:00.000Z", detail: "Отзывы доступны", missingAction: null, data: {} },
      { id: "market", label: "Рынок", available: false, freshness: "missing", updatedAt: null, detail: "Нет анализа рынка", missingAction: "Обновить рынок", data: {} },
    ],
    promptData: {
      performanceHistory: {},
      menuAndRecipes: {
        activeItems: 100,
        confirmedRecipes: 37,
        qualityCounts: {
          missingRecipes: 63,
          unmappedIngredients: 234,
          missingPurchasePrices: 18,
        },
      },
      guestFeedback: {},
      market: {},
    },
  };
}

const reviewClimate = { id: "review:climate", source: "review", label: "Жалоба гостя", fact: "В основном зале жарко" };
const equipmentClimate = { id: "equipment:ac", source: "equipment", label: "Кондиционер", fact: "Статус: Неисправно" };
const reviewAudio = { id: "review:audio", source: "review", label: "Жалоба на звук", fact: "Микрофон караоке прерывается" };

function candidates() {
  return [
    {
      title: "Починить кондиционер",
      fact: "Гость пожаловался на жару",
      consequence: "Гости могут уйти раньше",
      action: "Проверить и восстановить кондиционер",
      responsibleRole: "технический специалист",
      deadline: "Сегодня, до следующей смены",
      successCriterion: "Кондиционер работает, новых жалоб нет",
      evidence: [reviewClimate, equipmentClimate],
    },
    {
      title: "Разобрать жалобу на жару",
      fact: "В основном зале жарко",
      action: "Проверить климат",
      responsibleRole: "управляющий",
      deadline: "Сегодня",
      successCriterion: "Температура комфортна",
      evidence: [reviewClimate],
    },
    {
      title: "Проверить караоке и микрофоны",
      fact: "Есть жалоба на звук",
      consequence: "Программа смены может пострадать",
      action: "Проверить микрофоны до открытия",
      responsibleRole: "технический специалист",
      deadline: "До следующей смены",
      successCriterion: "Микрофоны работают без обрывов",
      evidence: [reviewAudio],
    },
  ];
}

function build(overrides: Partial<Parameters<typeof buildAIDoctorAttention>[0]> = {}) {
  return buildAIDoctorAttention({
    candidates: candidates(),
    context: context(),
    evidenceCatalog: [reviewClimate, equipmentClimate, reviewAudio],
    operationalInput: { operatingCalendar: { unexplainedRevenueGapDates: ["2026-08-11", "2026-08-12", "2026-08-13", "2026-08-14"] } },
    memory: { tasks: [], actionTasks: [], decisions: [] },
    areas: [{ status: "stable" }, { status: "stable" }],
    now: new Date("2026-08-15T08:24:00.000Z"),
    ...overrides,
  });
}

test("groups related signals and keeps missing shift reports out of business priorities", () => {
  const result = build();

  assert.equal(result.priorities.length, 2);
  assert.deepEqual(result.priorities.map((item) => item.issueKey), ["climate", "audio"]);
  assert.ok(result.dataQuality.items.some((item) => item.issueKey === "unclosed-shifts"));
  assert.equal(result.priorities[0]?.recommendationId, "ai:climate");
  assert.equal(result.priorities[0]?.signalCount, 2);
  assert.ok(Number(result.priorities[0]?.priorityScore) > Number(result.priorities[1]?.priorityScore));
  assert.notEqual(result.priorities[0]?.priorityScore, result.priorities[0]?.confidenceScore);
  assert.equal(result.priorities[0]?.confidenceLevel, "high");
  assert.ok(Number(result.priorities[0]?.confidenceScore) >= 80);
  assert.equal(result.counts.moreSignals, 0);
});

test("keeps problems, opportunities and data quality separate", () => {
  const result = build({
    candidates: [
      ...candidates(),
      { title: "Пятница показывает потенциал роста среднего чека", action: "Проверить предложение кухни после 00:00", responsibleRole: "управляющий", deadline: "В пятницу", successCriterion: "Сравнить средний чек", evidence: [{ id: "finance:friday", source: "finance", label: "Продажи по пятницам", fact: "Посещаемость стабильна" }] },
      { title: "63 позиции без техкарт", action: "Заполнить техкарты", consequence: "Себестоимость неполна" },
    ],
  });

  assert.equal(result.opportunities[0]?.signalClass, "opportunity");
  assert.ok(result.dataQuality.items.some((item) => item.issueKey === "recipes" && String(item.title).includes("63")));
  assert.ok(result.dataQuality.items.some((item) => item.issueKey === "ingredient-mapping" && String(item.title).includes("234")));
  assert.ok(result.priorities.every((item) => item.signalClass === "problem"));
});

test("does not repeat one local event as both a risk and an opportunity", () => {
  const result = build({
    candidates: [
      {
        signalClass: "problem",
        title: "Подготовить план смен и запасов к двум ближайшим праздникам",
        consequence: "Без подготовки можно создать дефицит по сменам и запасам.",
      },
      {
        signalClass: "opportunity",
        title: "Составить отдельный план смен и запасов на две праздничные даты",
        consequence: "Подготовка поможет распределить персонал и запасы.",
      },
    ],
    evidenceCatalog: [],
  });

  assert.equal(result.timeBuckets.backlog[0]?.issueKey, "local-demand-event");
  assert.equal(result.opportunities.length, 0);
});

test("moves an accepted recommendation to in progress without creating a duplicate", () => {
  const result = build({
    memory: {
      tasks: [{ id: "task-climate", recommendationId: "ai:climate", title: "Починить кондиционер", aiGenerated: true, approvalStatus: "approved", status: "in_progress", deadline: "2026-08-15", updatedAt: "2026-08-15T08:00:00.000Z" }],
      actionTasks: [],
      decisions: [],
    },
  });

  assert.ok(!result.priorities.some((item) => item.issueKey === "climate"));
  assert.equal(result.inProgress.filter((item) => item.issueKey === "climate").length, 1);
  assert.equal(result.inProgress.find((item) => item.issueKey === "climate")?.lifecycle, "in_progress");
});

test("keeps an omitted active task visible but separates overdue work from Today", () => {
  const task = { id: "task-climate", recommendationId: "ai:climate", title: "Починить кондиционер", fact: "Кондиционер неисправен", aiGenerated: true, approvalStatus: "approved", status: "in_progress", deadline: "2026-08-14", updatedAt: "2026-08-14T08:00:00.000Z" };
  const result = build({
    candidates: [],
    evidenceCatalog: [],
    operationalInput: {},
    memory: { tasks: [task], actionTasks: [], decisions: [] },
  });

  assert.equal(result.priorities.some((item) => item.issueKey === "climate"), false);
  assert.equal(result.timeBuckets.overdue[0]?.issueKey, "climate");
  assert.equal(result.timeBuckets.overdue[0]?.lifecycle, "overdue");
  assert.equal(result.activeProblems.filter((item) => item.issueKey === "climate").length, 1);
});

test("does not reissue a closed recommendation without new evidence", () => {
  const result = build({
    memory: {
      tasks: [{ id: "task-climate", recommendationId: "ai:climate", title: "Починить кондиционер", aiGenerated: true, approvalStatus: "approved", status: "completed", deadline: "2026-08-14", actualResult: { status: "helped", summary: "Новых жалоб не было" }, updatedAt: "2026-08-14T22:00:00.000Z" }],
      actionTasks: [],
      decisions: [],
    },
  });

  assert.equal(result.priorities.some((item) => item.issueKey === "climate"), false);
  assert.equal(result.history.find((item) => item.recommendationId === "ai:climate")?.lifecycle, "closed");
});

test("reopens a completed problem only when a newer fact appears", () => {
  const newReview = { ...reviewClimate, observedAt: "2026-08-15T07:00:00.000Z" };
  const newEquipment = { ...equipmentClimate, observedAt: "2026-08-15T07:05:00.000Z" };
  const result = build({
    candidates: [{
      ...candidates()[0],
      evidence: [newReview, newEquipment],
    }],
    evidenceCatalog: [newReview, newEquipment],
    memory: {
      tasks: [{ id: "task-climate", recommendationId: "ai:climate", title: "Починить кондиционер", aiGenerated: true, approvalStatus: "approved", status: "completed", actualResult: { status: "not_helped" }, updatedAt: "2026-08-14T22:00:00.000Z" }],
      actionTasks: [],
      decisions: [],
    },
  });

  const climate = result.priorities.find((item) => item.issueKey === "climate");
  assert.equal(climate?.lifecycle, "reopened");
  assert.match(String(climate?.resultMessage), /новое измерение/i);
});

test("records rejected recommendations in history", () => {
  const result = build({
    candidates: [],
    evidenceCatalog: [],
    operationalInput: {},
    memory: {
      tasks: [{ id: "task-1", recommendationId: "ai:audio", title: "Проверить звук", aiGenerated: true, approvalStatus: "deleted", status: "cancelled", hidden: true, updatedAt: "2026-08-14T20:00:00.000Z" }],
      actionTasks: [],
      decisions: [],
    },
  });
  assert.equal(result.history[0]?.lifecycle, "rejected");
  assert.match(String(result.history[0]?.decidedAt), /август/);
});

test("classification and humanisation stay management-facing", () => {
  assert.equal(classifyAIDoctorSignal({ title: "63 позиции без техкарт" }), "data_quality");
  assert.equal(classifyAIDoctorSignal({ signalClass: "problem", title: "63 позиции без техкарт" }), "data_quality");
  assert.equal(classifyAIDoctorSignal({ title: "Потенциал роста среднего чека" }), "opportunity");
  assert.equal(classifyAIDoctorSignal({ signalClass: "problem", title: "Потенциал роста среднего чека" }), "opportunity");
  assert.equal(classifyAIDoctorSignal({ title: "4 смены без отчёта" }), "data_quality");
  assert.equal(classifyAIDoctorSignal({ signalClass: "opportunity", title: "Добавить сотрудников и связать их со сменами" }), "data_quality");
  assert.equal(classifyAIDoctorSignal({ signalClass: "opportunity", title: "Провести первую инвентаризацию" }), "data_quality");
  assert.equal(classifyAIDoctorSignal({ title: "Смены без отчёта блокируют выплату зарплаты из-за кассового расхождения" }), "problem");
  assert.equal(classifyAIDoctorSignal({ signalClass: "data_quality", title: "Остановить работу: риск безопасности и потеря данных" }), "problem");
  assert.match(humanizeValue("2026-07-11T11:25:00.000Z"), /11 июля/);
  assert.equal(humanizeValue("coveragePercent = 20"), "Заполнено только 20% смен");
  assert.match(humanizeValue("19063.3 monetary units"), /19\s063,3 ₽/);
  assert.match(
    humanizeValue("complaint · medium · open · 2026-07-12T11:22:00.000Z"),
    /^жалоба · средний приоритет · открыто · 12 июля/,
  );
});

test("treats a new venue as cold start instead of inventing a business risk", () => {
  const freshContext = context();
  freshContext.blocks = freshContext.blocks.map((block) => block.id === "performanceHistory"
    ? { ...block, available: false, freshness: "missing", updatedAt: null, detail: "Нет выручки и расходов для сравнения" }
    : block);
  freshContext.promptData.performanceHistory = {};

  const result = build({
    candidates: [],
    context: freshContext,
    evidenceCatalog: [],
    operationalInput: {
      operatingCalendar: {
        unexplainedRevenueGapDates: Array.from({ length: 14 }, (_, index) => `2026-08-${String(index + 1).padStart(2, "0")}`),
        coveragePercent: 0,
        scheduledCompletedShifts: 14,
      },
    },
    areas: [],
  });

  assert.equal(result.priorities.length, 0);
  assert.match(result.diagnosticSentence, /Критичных отклонений не обнаружено/);
  assert.doesNotMatch(result.diagnosticSentence, /гостевой опыт/);
  const onboarding = result.dataQuality.items.find((item) => String(item.title).includes("первые сменные отчёты"));
  assert.ok(onboarding);
  assert.equal(onboarding?.fact, "История фактических смен ещё не сформирована.");
  assert.doesNotMatch(String(onboarding?.fact), /14/);
});

test("uses the exact verification date when ranking urgency", () => {
  const result = build({
    candidates: [
      {
        title: "Проверить кассовую дисциплину",
        signalClass: "problem",
        deadline: "В течение недели",
        verificationDate: "2026-08-15",
        action: "Сверить кассовые документы",
        responsibleRole: "управляющий",
        successCriterion: "Расхождения зафиксированы",
        evidence: [{ id: "finance:cash", source: "finance", label: "Касса", fact: "Есть расхождение" }],
      },
      {
        title: "Проверить договор поставщика",
        signalClass: "problem",
        deadline: "В течение недели",
        verificationDate: "2026-08-25",
        action: "Сверить условия договора",
        responsibleRole: "управляющий",
        successCriterion: "Условия подтверждены",
        evidence: [{ id: "procurement:contract", source: "procurement", label: "Договор", fact: "Нужна сверка" }],
      },
    ],
    evidenceCatalog: [],
    operationalInput: {},
    areas: [],
  });

  const urgent = result.priorities.find((item) => item.title === "Проверить кассовую дисциплину");
  const later = result.timeBuckets.upcoming.find((item) => item.title === "Проверить договор поставщика");
  assert.equal((urgent?.priorityBreakdown as { urgency?: number } | undefined)?.urgency, 18);
  assert.equal((later?.priorityBreakdown as { urgency?: number } | undefined)?.urgency, 8);
});

test("shows missing menu and sales blocks as data quality and allows zero reliability", () => {
  const missingContext = context();
  missingContext.blocks = [
    { id: "menuAndRecipes", label: "Меню и техкарты", available: false, freshness: "missing", updatedAt: null, detail: "Меню ещё не загружено", missingAction: "Загрузить меню", data: {} },
    { id: "salesAndCost", label: "Продажи и себестоимость", available: false, freshness: "missing", updatedAt: null, detail: "Нет данных продаж и себестоимости", missingAction: "Внести продажи", data: {} },
  ];
  missingContext.promptData = {
    menuAndRecipes: { activeItems: 0, confirmedRecipes: 0, qualityCounts: {} },
    salesAndCost: { costDataAvailable: false },
  };

  const result = build({
    candidates: [{ signalClass: "problem", title: "Нет техкарт", action: "Заполнить техкарты" }],
    context: missingContext,
    evidenceCatalog: [],
    operationalInput: {},
    areas: [],
  });

  assert.ok(!result.priorities.some((item) => item.issueKey === "recipes"));
  assert.ok(result.dataQuality.items.some((item) => String(item.title).includes("Меню")));
  assert.ok(result.dataQuality.items.some((item) => String(item.title).includes("продаж")));
  assert.equal(result.dataQuality.reliabilityPercent, 0);
});

test("critical safety override bypasses normal ranking while UI still stays TOP-3", () => {
  const result = build({
    candidates: [
      ...candidates(),
      { title: "Остановить работу из-за короткого замыкания", fact: "Есть риск безопасности и задымление", action: "Обесточить линию и вызвать электрика", responsibleRole: "управляющий", deadline: "Немедленно", successCriterion: "Линия безопасна и проверена специалистом", evidence: [{ id: "event:fire", source: "operations", label: "Инцидент", fact: "Задымление" }] },
      { title: "Проверить остатки", action: "Провести пересчёт", responsibleRole: "кладовщик", deadline: "На неделе", successCriterion: "Остатки обновлены" },
    ],
  });

  assert.equal(result.priorities.length, 3);
  assert.equal(result.priorities[0]?.criticalOverride, true);
  assert.equal(result.priorities[0]?.priorityScore, 100);
  assert.ok(result.counts.moreSignals > 0);
});

test("corrective read-model shows one active problem for repeated climate and audio tasks", () => {
  const active = (id: string, recommendationId: string, title: string, updatedAt: string) => ({
    id,
    recommendationId,
    title,
    aiGenerated: true,
    approvalStatus: "approved",
    status: "in_progress",
    deadline: "2026-08-20",
    updatedAt,
  });
  const result = build({
    candidates: [],
    evidenceCatalog: [],
    operationalInput: {},
    memory: {
      tasks: [
        active("climate-1", "legacy-climate-1", "Починить кондиционер", "2026-08-13T10:00:00.000Z"),
        active("climate-2", "legacy-climate-2", "Восстановить климат в зале", "2026-08-14T10:00:00.000Z"),
        active("climate-3", "legacy-climate-3", "Разобрать жалобу на жару", "2026-08-15T10:00:00.000Z"),
        active("audio-1", "legacy-audio-1", "Проверить караоке", "2026-08-14T11:00:00.000Z"),
        active("audio-2", "legacy-audio-2", "Проверить микрофоны", "2026-08-15T11:00:00.000Z"),
      ],
      actionTasks: [],
      decisions: [],
    },
  });

  assert.equal(result.inProgress.filter((item) => item.issueKey === "climate").length, 1);
  assert.equal(result.inProgress.filter((item) => item.issueKey === "audio").length, 1);
  assert.equal(result.inProgress.find((item) => item.issueKey === "climate")?.historyCount, 3);
  assert.equal(result.inProgress.find((item) => item.issueKey === "audio")?.historyCount, 2);
  assert.equal(result.activeProblems.filter((item) => item.issueKey === "climate").length, 1);
  assert.equal(result.activeProblems.filter((item) => item.issueKey === "audio").length, 1);
});

test("management briefing read-model separates Today, Overdue, Upcoming and Backlog", () => {
  const active = (id: string, title: string, deadline?: string) => ({
    id,
    title,
    aiGenerated: true,
    approvalStatus: "approved",
    status: "in_progress",
    deadline,
    updatedAt: "2026-08-15T07:00:00.000Z",
  });
  const result = build({
    candidates: [],
    evidenceCatalog: [],
    operationalInput: {},
    memory: {
      tasks: [
        active("overdue", "Починить кондиционер", "2026-08-14"),
        active("today", "Проверить микрофоны", "2026-08-15"),
        active("upcoming", "Проверить остатки на складе", "2026-08-20"),
        active("backlog", "Провести плановый осмотр оборудования"),
      ],
      actionTasks: [],
      decisions: [],
    },
  });

  assert.equal(result.timeBuckets.overdue.length, 1);
  assert.equal(result.timeBuckets.today.length, 1);
  assert.equal(result.timeBuckets.upcoming.length, 1);
  assert.equal(result.timeBuckets.backlog.length, 1);
  assert.ok(result.priorities.every((item) => item.timeBucket === "today"));
});

test("management briefing keeps recommendation, task and verification deadlines explicitly labelled", () => {
  const result = build({
    candidates: [{
      title: "Проверить караоке и микрофоны",
      deadline: "До следующей смены",
      verificationDate: "2026-08-16",
      action: "Провести контрольный тест",
      evidence: [reviewAudio],
    }],
    memory: {
      tasks: [{
        id: "audio-deadlines",
        recommendationId: "ai:audio",
        title: "Проверить микрофоны",
        aiGenerated: true,
        approvalStatus: "approved",
        status: "in_progress",
        deadline: "2026-08-15",
        verificationDate: "2026-08-16",
        updatedAt: "2026-08-15T07:00:00.000Z",
      }],
      actionTasks: [],
      decisions: [],
    },
  });
  const audio = result.inProgress.find((item) => item.issueKey === "audio");
  const sources = audio?.deadlineSources as Array<{ kind: string; label: string; value: string }>;

  assert.deepEqual(sources.map((item) => item.label), ["Рекомендованный срок", "Срок задачи", "Дата проверки результата"]);
  assert.equal(new Set(sources.map((item) => item.kind)).size, 3);
});

test("corrective business-wide commercial impact ranks above repeated local climate signals", () => {
  const result = build({
    candidates: [
      ...candidates(),
      {
        title: "Восстановить трафик и средний чек",
        issueKey: "demand-and-average-check",
        fact: "Выручка -46%, чеки -35%, средний чек -17% за сопоставимую смену",
        consequence: "Просадка влияет на результат всего заведения",
        action: "До открытия выбрать канал привлечения и предложение для среднего чека",
        deadline: "До открытия ближайшей смены",
        successCriterion: "После смены сравнить checks, average check и revenue с baseline",
        financialImpact: "high",
        demandImpact: "high",
        guestImpact: "high",
        businessWideImpact: true,
        evidence: [{ id: "finance:demand", source: "finance", label: "Сопоставимая смена", fact: "Выручка -46%, чеки -35%, средний чек -17%" }],
      },
    ],
  });

  assert.equal(result.priorities[0]?.issueKey, "demand-and-average-check");
  assert.ok(Number(result.priorities[0]?.priorityScore) > Number(result.priorities.find((item) => item.issueKey === "climate")?.priorityScore));
});

test("stale and superseded operational problems stay in history but not in active problems", () => {
  const result = build({
    candidates: [],
    evidenceCatalog: [],
    operationalInput: {},
    memory: {
      tasks: [{
        id: "legacy-climate",
        recommendationId: "ai:climate",
        title: "Починить старый кондиционер",
        aiGenerated: true,
        approvalStatus: "approved",
        status: "superseded",
        supersededBy: "climate-current",
        updatedAt: "2026-08-14T08:00:00.000Z",
      }],
      actionTasks: [],
      decisions: [],
    },
  });
  assert.equal(result.activeProblems.some((item) => item.issueKey === "climate"), false);
  assert.ok(result.history.some((item) => item.recommendationId === "ai:climate"));
});
