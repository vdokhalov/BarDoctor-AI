import { Router, type IRouter } from "express";
import { anthropic } from "@workspace/integrations-anthropic-ai";

// ─── Simple in-memory rate limiter ───────────────────────────────────────────
// Max 8 diagnosis calls per IP per 10 minutes — generous for a single-tenant
// restaurant app, tight enough to prevent cost amplification.

const RL_WINDOW_MS  = 10 * 60 * 1000; // 10 min
const RL_MAX_CALLS  = 8;

interface RLEntry { count: number; resetAt: number }
const rlStore = new Map<string, RLEntry>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rlStore.get(ip);
  if (!entry || now > entry.resetAt) {
    rlStore.set(ip, { count: 1, resetAt: now + RL_WINDOW_MS });
    return false;
  }
  if (entry.count >= RL_MAX_CALLS) return true;
  entry.count++;
  return false;
}

const router: IRouter = Router();

// ─── Types ────────────────────────────────────────────────────────────────────

interface RestaurantProfile {
  name: string;
  businessType?: string;
  seats?: number;
  avgCheck?: number;
  areas?: string[];
  openTime?: string;
  closeTime?: string;
}

interface EventSummary {
  title: string;
  category: string;
  priority: string;
  status: string;
  eventDate: string;
  description?: string;
}

interface CaseSummary {
  type: string;
  title: string;
  priority: string;
  status: string;
  dueDate?: string;
  responsible?: string;
}

interface EmployeeStats {
  total: number;
  active: number;
  onLeave: number;
  dismissed: number;
}

interface DiagnosisRequest {
  profile: RestaurantProfile;
  events: EventSummary[];
  cases: CaseSummary[];
  employees: EmployeeStats;
}

interface PriorityIssue {
  title: string;
  category: string;
  urgency: "critical" | "high" | "medium";
}

interface DiagnosisResult {
  insufficientData?: boolean;
  insufficientReason?: string;
  dailyDiagnosis?: string;
  priorityIssue?: PriorityIssue;
  why?: string;
  actionPlan?: string[];
  expectedResult?: string;
  estimatedEffort?: "low" | "medium" | "high";
}

// ─── Prompt builder ───────────────────────────────────────────────────────────

function buildPrompt(data: DiagnosisRequest): string {
  const { profile, events, cases, employees } = data;

  const categoryLabels: Record<string, string> = {
    incident: "Инцидент", equipment: "Оборудование", staff: "Персонал",
    guest: "Гость", supplier: "Поставщик", finance: "Финансы",
    hygiene: "Гигиена", idea: "Идея", other: "Прочее",
  };
  const caseTypeLabels: Record<string, string> = {
    equipment: "Оборудование", complaint: "Жалоба гостя", conflict: "Конфликт",
    supplier: "Поставщик", maintenance: "Обслуживание", finance: "Финансы",
    inspection: "Проверка", other: "Прочее",
  };
  const priorityLabels: Record<string, string> = {
    critical: "Критический", high: "Высокий", medium: "Средний", low: "Низкий",
  };
  const statusLabels: Record<string, string> = {
    open: "Открыто", in_progress: "В работе", waiting: "Ожидание",
    resolved: "Решено", closed: "Закрыто",
    new: "Новое", acknowledged: "Принято",
  };

  const eventLines = events
    .slice(0, 30)
    .map((e) => {
      const date = new Date(e.eventDate).toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
      const cat = categoryLabels[e.category] ?? e.category;
      const pri = priorityLabels[e.priority] ?? e.priority;
      const sts = statusLabels[e.status] ?? e.status;
      return `- [${date}] [${cat}] [${pri}] [${sts}] ${e.title}${e.description ? ` — ${e.description.slice(0, 80)}` : ""}`;
    })
    .join("\n");

  const caseLines = cases
    .map((c) => {
      const tp = caseTypeLabels[c.type] ?? c.type;
      const pri = priorityLabels[c.priority] ?? c.priority;
      const sts = statusLabels[c.status] ?? c.status;
      const due = c.dueDate ? `, дедлайн: ${new Date(c.dueDate).toLocaleDateString("ru-RU", { day: "numeric", month: "short" })}` : "";
      const resp = c.responsible ? `, ответственный: ${c.responsible}` : "";
      return `- [${tp}] [${pri}] [${sts}] ${c.title}${due}${resp}`;
    })
    .join("\n");

  const areasList = profile.areas?.length ? profile.areas.join(", ") : "не указаны";

  return `Ты — BarDoctor, оперативный AI-советник для ресторана. Твоя задача: проанализировать реальные данные заведения и дать структурированный операционный диагноз. Отвечай ТОЛЬКО на русском языке. Выдай ТОЛЬКО валидный JSON без markdown-обёртки.

ДАННЫЕ ЗАВЕДЕНИЯ:
Название: ${profile.name || "не указано"}
Тип: ${profile.businessType || "не указан"}
Мест: ${profile.seats ?? "не указано"}
Средний чек: ${profile.avgCheck ? `${profile.avgCheck} руб.` : "не указан"}
Зоны/Направления: ${areasList}
Режим работы: ${profile.openTime && profile.closeTime ? `${profile.openTime}–${profile.closeTime}` : "не указан"}

ПЕРСОНАЛ:
Всего: ${employees.total}, активных: ${employees.active}, в отпуске: ${employees.onLeave}, уволено: ${employees.dismissed}

СОБЫТИЯ (последние ${events.length}, от новых к старым):
${eventLines || "Событий нет"}

АКТИВНЫЕ ДЕЛА (${cases.length}):
${caseLines || "Активных дел нет"}

ПРАВИЛА АНАЛИЗА:
1. Опирайся ТОЛЬКО на предоставленные данные. Не придумывай ничего, чего нет в данных.
2. Если данных недостаточно (менее 3 событий И менее 1 дела), верни insufficientData: true.
3. Выдели ОДНУ самую важную проблему, которая требует немедленного внимания.
4. Шаги действий должны быть конкретными и выполнимыми сегодня.
5. Все тексты на русском языке.

ФОРМАТ ОТВЕТА (строго JSON):
Если данных достаточно:
{
  "dailyDiagnosis": "2-3 предложения об общем операционном состоянии заведения на основе данных",
  "priorityIssue": {
    "title": "Краткое название главной проблемы (до 60 символов)",
    "category": "одно из: equipment | staff | guests | suppliers | finance | operations | hygiene",
    "urgency": "одно из: critical | high | medium"
  },
  "why": "2-3 предложения о том, почему именно эта проблема самая важная и что будет если её не решить",
  "actionPlan": [
    "Конкретный шаг 1",
    "Конкретный шаг 2",
    "Конкретный шаг 3",
    "Конкретный шаг 4"
  ],
  "expectedResult": "1-2 предложения о том, что улучшится после решения этой проблемы",
  "estimatedEffort": "одно из: low | medium | high (low = до 2 ч работы, medium = 2–8 ч, high = свыше 8 ч или требует нескольких людей)"
}

Если данных недостаточно:
{
  "insufficientData": true,
  "insufficientReason": "Конкретное объяснение, каких данных не хватает"
}`;
}

// ─── POST /ai/diagnosis ───────────────────────────────────────────────────────

router.post("/diagnosis", async (req, res) => {
  // Rate limit by IP
  const ip = req.ip ?? req.socket?.remoteAddress ?? "unknown";
  if (isRateLimited(ip)) {
    res.status(429).json({ error: "Too many diagnosis requests. Please wait a few minutes." });
    return;
  }

  // Rough payload guard (express.json global limit is ~100kb; this is belt-and-suspenders)
  const payloadBytes = Buffer.byteLength(JSON.stringify(req.body ?? {}));
  if (payloadBytes > 80_000) {
    res.status(413).json({ error: "Request payload too large." });
    return;
  }

  try {
    const body = req.body as DiagnosisRequest;

    if (!body?.profile) {
      res.status(400).json({ error: "profile is required" });
      return;
    }

    const prompt = buildPrompt(body);

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 8192,
      messages: [{ role: "user", content: prompt }],
    });

    const raw = message.content[0];
    if (raw.type !== "text") {
      res.status(500).json({ error: "Unexpected response type from AI" });
      return;
    }

    // Strip any accidental markdown fences, then parse
    const cleaned = raw.text.replace(/^```json\s*/i, "").replace(/\s*```$/i, "").trim();

    let result: DiagnosisResult;
    try {
      result = JSON.parse(cleaned) as DiagnosisResult;
    } catch {
      console.error("[AI diagnosis] Model returned non-JSON:", cleaned.slice(0, 200));
      res.status(422).json({ error: "AI returned an unexpected format. Please try again." });
      return;
    }

    // Normalise enum values defensively
    const VALID_URGENCY = new Set(["critical", "high", "medium"]);
    if (result.priorityIssue && !VALID_URGENCY.has(result.priorityIssue.urgency)) {
      result.priorityIssue.urgency = "medium";
    }
    const VALID_EFFORT = new Set(["low", "medium", "high"]);
    if (result.estimatedEffort && !VALID_EFFORT.has(result.estimatedEffort)) {
      result.estimatedEffort = "medium";
    }

    res.json({ success: true, data: result, generatedAt: new Date().toISOString() });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[AI diagnosis]", message);
    res.status(500).json({ error: "Failed to generate diagnosis", detail: message });
  }
});

export default router;
