import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { runInNewContext } from "node:vm";

const read = (path: string) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("diagnosis evidence and technical detail start collapsed and expand on demand", async () => {
  const bundle = await read("public/assets/index-BQGspy0I.js");

  assert.match(bundle, /className:"bd-ai-why"/);
  assert.match(bundle, /children:\["Почему\?"/);
  assert.match(bundle, /children:"Источники: "/);
  assert.match(bundle, /u\.fact\?" — "\+u\.fact:""/);
  assert.match(bundle, /children:\["Финансовый контекст закрытого периода"/);
  assert.match(bundle, /children:\["История AI Doctor"/);
  assert.doesNotMatch(bundle.slice(bundle.indexOf('className:"bd-ai-why"'), bundle.indexOf('className:"bd-ai-task-action"')), /\bopen:/);
});

test("diagnosis actions require an executable and measurable contract", async () => {
  const [handler, bundle] = await Promise.all([
    read("lib/bardoctor/ai-handlers.ts"),
    read("public/assets/index-BQGspy0I.js"),
  ]);

  for (const field of [
    "steps",
    "responsibleRole",
    "deadline",
    "successCriterion",
    "expectedEffect",
    "factPeriod",
    "dataSources",
    "hypothesisConfidence",
    "consequence",
    "baselineMetric",
    "targetMetric",
    "verificationDate",
    "actualResult",
  ]) {
    assert.match(handler, new RegExp(`${field}:`));
  }
  assert.match(handler, /Каждый элемент actions должен содержать 2–5 последовательных шагов/);
  assert.match(handler, /Каждая рекомендация — управленческий эксперимент/);
  assert.match(bundle, /children:"Что делать сегодня"/);
  assert.match(bundle, /children:"Проверка: "/);
  assert.match(bundle, /"Подготовить задачу"/);
  assert.match(bundle, /Проверка рекомендации:/);
  assert.match(bundle, /data-bd-recommendation-contract":"result-loop-v50"/);
  assert.match(bundle, /bdRecommendationOutcomeVersion="recommendation-outcomes-v50"/);
  assert.match(bundle, /bdRecommendationConfidenceVersion="confidence-reason-v51"/);
  assert.match(bundle, /bdAIDoctorAttentionVersion="attention-v196"/);
  assert.match(bundle, /bdAIDoctorFollowThroughVersion="attention-v197"/);
  assert.match(bundle, /bdAIDoctorUniversalVersion="attention-v198"/);
  assert.match(bundle, /bdAIDoctorRuntimeVersion="attention-v199"/);
  assert.match(bundle, /bdAIDoctorBriefingVersion="briefing-first-v253"/);
  assert.match(bundle, /bdAIManagementBriefingVersion="management-briefing-v254"/);
  assert.match(bundle, /bdAISelfServiceVersion="self-service-v255"/);
  assert.match(bundle, /verificationPlanId:e\.verificationPlanId/);
  assert.match(bundle, /Почему такая уверенность:/);
  assert.match(bundle, /IC="bd_ai_diagnosis_v9"/);
  assert.match(handler, /\.\.\.memory\.actionTasks/);
  assert.match(handler, /\.\.\.memory\.decisions/);
});

test("closed-month profit leads diagnosis without duplicating the financial report", async () => {
  const [handler, context, bundle] = await Promise.all([
    read("lib/bardoctor/ai-handlers.ts"),
    read("lib/bardoctor/venue-ai-context.ts"),
    read("public/assets/index-BQGspy0I.js"),
  ]);

  assert.match(context, /"bd_month_closings"/);
  assert.match(context, /latestClosedMonth/);
  assert.match(context, /closedMonthComparison/);
  assert.match(handler, /financialAssessment не должен дублировать вкладки «Финансы» и «Отчёты»/);
  assert.match(handler, /normaliseFinancialAssessment/);
  assert.match(bundle, /bdDiagnosisFinancialCoreVersion="closed-month-management-v48"/);
  assert.match(bundle, /bdDiagnosisFinancialFOTVersion="financial-fot-v49"/);
  assert.match(bundle, /data-bd-financial-assessment":"financial-fot-v49/);
  assert.match(bundle, /children:"Итог закрытого месяца"/);
  assert.match(bundle, /children:\["ФОТ · "/);
  assert.match(bundle, /payrollSharePercent/);
  assert.match(bundle, /children:"Управленческий вывод"/);
  assert.match(bundle, /полная расшифровка остаётся в отчёте/);
  assert.match(bundle, /children:"Открыть отчёт →"/);
});

test("diagnosis surfaces the server error and avoids retrying configuration failures", async () => {
  const bundle = await read("public/assets/index-BQGspy0I.js");

  assert.match(bundle, /role:"alert",children:t\|\|"Не удалось получить диагноз\. Попробуйте снова\."/);
  assert.match(bundle, /setBdAiErrorMessage\(z instanceof Error&&z\.message/);
  assert.match(bundle, /L\.status>=500&&L\.status!==503&&D<k/);
  assert.match(bundle, /q\?\.error\|\|`HTTP \$\{L\.status\}`/);
});

test("AI Doctor attention UI is linked and responsive on mobile and desktop", async () => {
  const [css, appHtml, response, bundle] = await Promise.all([
    read("public/ai-doctor-attention-v196.css"),
    read("public/app.html"),
    read("app/bar-doctor-response.ts"),
    read("public/assets/index-BQGspy0I.js"),
  ]);

  assert.match(appHtml, /ai-doctor-attention-v196\.css/);
  assert.match(response, /ai-doctor-attention-v196\.css/);
  assert.match(css, /@media \(min-width: 760px\)/);
  assert.match(css, /\.bd-ai-priority-grid\.bd-ai-priority-count-1/);
  assert.match(css, /\.bd-ai-priority-grid\.bd-ai-priority-count-2/);
  assert.match(css, /\.bd-ai-priority-grid\.bd-ai-priority-count-3/);
  assert.match(css, /@media \(max-width: 374px\)/);
  assert.match(css, /\.bd-ai-compact-row > div \{\n  min-width: 0;\n  flex: 1 1 0/);
  assert.match(css, /@media \(max-width: 759px\)[\s\S]*\.bd-ai-compact-row \{\n    align-items: stretch;\n    flex-direction: column/);
  assert.match(css, /\.bd-ai-compact-row > small \{\n    width: 100%;\n    max-width: none;\n    text-align: left/);
  assert.match(css, /\.bd-ai-owner-grid,\n  \.bd-ai-score \{\n    grid-template-columns: 1fr/);
  assert.match(css, /\.bd-ai-compact-action/);
  assert.match(bundle, /data-bd-home-ai":"attention-v197/);
  assert.match(bundle, /"Главный риск: "\+f/);
  assert.match(bundle, /"Главная возможность: "\+m/);
  assert.match(bundle, /mode:"opportunity"/);
  assert.match(bundle, /className:"bd-ai-compact-action"/);
  assert.match(bundle, /data-bd-ai-result":"self-service-v255/);
  assert.match(bundle, /data-bd-management-briefing":"self-service-v1/);
  assert.match(bundle, /function bdAIDoctorNormalizeV199\(/);
  assert.match(bundle, /className:"bd-ai-data-summary"/);
  assert.match(bundle, /className:"bd-ai-footer-actions"/);
  assert.match(bundle, /children:"После смены проверю"/);
  assert.match(bundle, /children:"Что AI уже выяснил"/);
  assert.match(bundle, /C\.message\?\?"Недостаточно внешних данных/);
  assert.match(bundle, /children:"Операционные проблемы"/);
  assert.match(css, /\.bd-ai-management-drivers/);
  assert.match(css, /\.bd-ai-operational-rows/);
  assert.match(bundle, /children:e\?"Открыть AI Doctor":"Запустить анализ"/);
});

test("runtime normalisation migrates legacy cold-start diagnoses before rendering", async () => {
  const bundle = await read("public/assets/index-BQGspy0I.js");
  const start = bundle.indexOf("function bdAIDoctorSearchV199(");
  const end = bundle.indexOf("function Fce(", start);
  assert.ok(start >= 0 && end > start);

  const scope: Record<string, unknown> = {};
  runInNewContext(`${bundle.slice(start, end)};globalThis.normalize=bdAIDoctorNormalizeV199;`, scope);
  const normalize = scope.normalize as (value: unknown) => {
    priorities: Array<{ title?: string }>;
    opportunities: Array<{ title?: string }>;
    dataQuality: { items: Array<{ title?: string }> };
    counts: { requiresAttention: number; important: number };
    diagnosticSentence: string;
  };

  const result = normalize({
    contextCoverage: [{ id: "performanceHistory", available: false }],
    attention: {
      priorities: [{ signalClass: "problem", priority: "high", title: "Закрыть незакрытые смены" }],
      opportunities: [
        { signalClass: "opportunity", title: "Добавить сотрудников и связать их со сменами" },
        { signalClass: "opportunity", title: "Подтвердить закупки и провести первую инвентаризацию" },
      ],
      dataQuality: { items: [{ signalClass: "data_quality", title: "Меню отсутствует" }] },
      counts: { requiresAttention: 1, important: 1 },
    },
  });

  assert.equal(result.priorities.length, 0);
  assert.equal(result.opportunities.length, 0);
  assert.equal(result.counts.requiresAttention, 0);
  assert.equal(result.counts.important, 0);
  assert.ok(result.dataQuality.items.some((item) => item.title === "Заполнить первые сменные отчёты"));
  assert.ok(result.dataQuality.items.some((item) => item.title?.includes("Добавить сотрудников")));
  assert.ok(result.dataQuality.items.some((item) => item.title?.includes("первую инвентаризацию")));
  assert.match(result.diagnosticSentence, /Срочных проблем нет/);
});
