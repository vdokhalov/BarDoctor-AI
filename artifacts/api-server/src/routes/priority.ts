import { Router, type IRouter } from "express";
import { anthropic } from "@workspace/integrations-anthropic-ai";

// ─── Rate limiter (20 req/min per IP) ─────────────────────────────────────────

const RL_WINDOW_MS = 60_000;
const RL_MAX       = 20;
const rlMap        = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(ip: string): boolean {
  const now   = Date.now();
  const entry = rlMap.get(ip);
  if (!entry || now > entry.resetAt) { rlMap.set(ip, { count: 1, resetAt: now + RL_WINDOW_MS }); return false; }
  if (entry.count >= RL_MAX) return true;
  entry.count++;
  return false;
}

const router: IRouter = Router();

// ─── Types ────────────────────────────────────────────────────────────────────

interface AssessRequest {
  type:         "event" | "case";
  category:     string;
  title:        string;
  description?: string;
  extraField?:  string;
  followUpAnswers?: Array<{ question: string; answer: string }>;
  restaurantContext?: { name?: string; businessType?: string; seats?: number };
}

interface AssessResult {
  needsMoreInfo: boolean;
  followUpQuestions?: string[];
  priority?: "critical" | "high" | "medium" | "low";
  explanation?: string;
  businessImpact?: string;
  recommendedAction?: string[];
  recommendedDeadline?: string;
}

// ─── Category labels ──────────────────────────────────────────────────────────

const CAT_RU: Record<string, string> = {
  equipment:   "Поломка/неисправность оборудования",
  complaint:   "Жалоба гостя",
  conflict:    "Конфликт в коллективе",
  supplier:    "Проблема с поставщиком",
  inventory:   "Инвентарь / запасы",
  maintenance: "Техническое обслуживание",
  finance:     "Финансовое событие",
  operations:  "Операционная проблема",
  idea:        "Идея / предложение",
  // case types
  inspection:  "Проверка / инспекция",
  other:       "Прочее",
};

// ─── System prompt ─────────────────────────────────────────────────────────────

const SYSTEM = `Ты — Операционный Директор ресторанного бизнеса с 20-летним опытом в премиум-сегменте. Тебе поступает информация о новом инциденте.

Твой стиль: прямой, конкретный, без лишних слов. Ты принимаешь решения сам — никогда не просишь сотрудника выбрать приоритет и не задаёшь общих вопросов.

КРИТЕРИИ ПРИОРИТЕТА:
• critical — прямая угроза безопасности людей или продуктов питания, остановка работы заведения, риск санитарного штрафа/закрытия, потери >50 тыс. ₽ в течение нескольких часов
• high — серьёзный бизнес-риск или ухудшение клиентского опыта при бездействии более суток, затрагивает несколько смен, заметно для гостей
• medium — рабочая проблема без острой срочности, нужно решить в ближайшие 1-2 дня
• low — плановая задача или несущественный инцидент, можно решить в течение недели

КОГДА НУЖНЫ УТОЧНЕНИЯ (needsMoreInfo: true):
- Заголовок ≤ 15 символов без описания — информации нет
- Оборудование вышло из строя, но неизвестно какое именно
- Жалоба гостя, но неясен масштаб и суть претензии
- Конфликт, но непонятно — локальный инцидент или системная проблема
- Любой инцидент, где нельзя оценить масштаб без дополнительных данных

ПРАВИЛО ВОПРОСОВ: 2-3 точных, операционно-релевантных вопроса. Каждый должен раскрывать конкретный операционный риск.

ДЕДЛАЙН — всегда конкретный, без расплывчатых формулировок:
- critical: "Немедленно" или "Сегодня до [ближайшее конкретное время]"
- high: "Сегодня до конца смены" или "Завтра до открытия"
- medium: "В течение 2 дней" или конкретный день недели
- low: "В течение текущей недели"

ВАЖНО: для БИЗНЕС-РИСКА используй конкретные последствия — потери выручки, количество затронутых гостей, риски проверок. Избегай общих фраз.

Отвечай ТОЛЬКО валидным JSON без markdown-обёртки:

Если нужны уточнения:
{"needsMoreInfo":true,"followUpQuestions":["Конкретный вопрос 1?","Конкретный вопрос 2?"]}

Если данных достаточно:
{"needsMoreInfo":false,"priority":"critical|high|medium|low","explanation":"Краткое объяснение приоритета (1-2 предложения)","businessImpact":"Конкретные последствия при бездействии (цифры, репутация, безопасность)","recommendedAction":["Шаг 1","Шаг 2","Шаг 3","Шаг 4"],"recommendedDeadline":"Конкретный срок"}`;

// ─── User message builder ─────────────────────────────────────────────────────

function buildUserMessage(r: AssessRequest): string {
  const lines: string[] = [
    `Тип события: ${CAT_RU[r.category] ?? r.category}`,
    `Заголовок: "${r.title}"`,
  ];

  if (r.description?.trim()) lines.push(`Описание: "${r.description.trim()}"`);
  if (r.extraField?.trim())  lines.push(`Дополнительно: "${r.extraField.trim()}"`);
  if (r.restaurantContext?.name)         lines.push(`Заведение: ${r.restaurantContext.name}`);
  if (r.restaurantContext?.businessType) lines.push(`Тип: ${r.restaurantContext.businessType}`);
  if (r.restaurantContext?.seats)        lines.push(`Посадочных мест: ${r.restaurantContext.seats}`);

  if (r.followUpAnswers?.length) {
    lines.push("", "Ответы на уточняющие вопросы:");
    for (const qa of r.followUpAnswers) {
      lines.push(`— ${qa.question} → ${qa.answer}`);
    }
  }

  return `Оцени этот инцидент:\n\n${lines.join("\n")}`;
}

// ─── POST /priority/assess ────────────────────────────────────────────────────

router.post("/assess", async (req, res) => {
  const ip = req.ip ?? req.socket?.remoteAddress ?? "unknown";
  if (isRateLimited(ip)) {
    res.status(429).json({ success: false, error: "Слишком много запросов. Подождите минуту." });
    return;
  }

  const body: AssessRequest = req.body ?? {};

  if (!body.title?.trim() || !body.category || !body.type) {
    res.status(400).json({ success: false, error: "title, category and type are required" });
    return;
  }

  if (JSON.stringify(body).length > 20_000) {
    res.status(413).json({ success: false, error: "Payload too large" });
    return;
  }

  try {
    const msg = await anthropic.messages.create({
      model:      "claude-sonnet-4-5",
      max_tokens: 1024,
      system:     SYSTEM,
      messages:   [{ role: "user", content: buildUserMessage(body) }],
    });

    const raw = (msg.content[0] as { type: string; text: string }).text ?? "";
    const cleaned = raw
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```\s*$/i, "")
      .trim();

    let result: AssessResult;
    try {
      result = JSON.parse(cleaned) as AssessResult;
    } catch {
      console.error("[Priority] Non-JSON response:", cleaned.slice(0, 200));
      res.status(422).json({ success: false, error: "Unexpected AI response format" });
      return;
    }

    // ── Normalise and harden the response shape ────────────────────────────────

    const VALID_PRI = new Set(["critical", "high", "medium", "low"]);

    if (result.needsMoreInfo) {
      // Questions shape: must have a non-empty followUpQuestions array
      if (!Array.isArray(result.followUpQuestions) || result.followUpQuestions.length === 0) {
        // Model asked for clarification but gave no questions → fall back to medium
        result = {
          needsMoreInfo:       false,
          priority:            "medium",
          explanation:         "Недостаточно данных для точной оценки. Назначен средний приоритет по умолчанию.",
          businessImpact:      "Рекомендуется уточнить детали и при необходимости пересмотреть оценку.",
          recommendedAction:   ["Собрать дополнительную информацию", "Оценить масштаб проблемы", "Принять меры по ситуации"],
          recommendedDeadline: "В течение 2 дней",
        };
      }
    } else {
      // Assessed shape: enforce every required field and coerce sensible defaults
      if (!result.priority || !VALID_PRI.has(result.priority)) result.priority = "medium";
      if (!result.explanation?.trim())
        result.explanation = "Приоритет назначен на основе предоставленных данных.";
      if (!result.businessImpact?.trim())
        result.businessImpact = "Рекомендуется своевременно устранить проблему.";
      if (!Array.isArray(result.recommendedAction) || result.recommendedAction.length === 0)
        result.recommendedAction = ["Проанализировать ситуацию", "Принять меры", "Документировать результат"];
      if (!result.recommendedDeadline?.trim())
        result.recommendedDeadline = result.priority === "critical" ? "Немедленно"
          : result.priority === "high" ? "Сегодня до конца смены"
          : result.priority === "medium" ? "В течение 2 дней"
          : "В течение недели";
    }

    res.json({ success: true, data: result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[Priority] Error:", message);
    res.status(500).json({ success: false, error: "Ошибка AI-анализа" });
  }
});

export default router;
