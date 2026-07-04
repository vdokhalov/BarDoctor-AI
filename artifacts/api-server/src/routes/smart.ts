import { Router, type IRouter } from "express";
import { anthropic } from "@workspace/integrations-anthropic-ai";

// ─── Rate limiter (15 req/min per IP) ─────────────────────────────────────────

const RL_WINDOW_MS = 60_000;
const RL_MAX       = 15;
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

interface SmartRequest {
  inputType:      "text" | "voice" | "photo" | "document";
  text?:          string;
  imageBase64?:   string;          // raw base64, no data-URL prefix
  imageMediaType?: string;         // "image/jpeg" | "image/png" | "image/webp"
  followUpAnswers?: Array<{ question: string; answer: string }>;
  restaurantContext?: { name?: string; businessType?: string; seats?: number };
}

interface SmartExtracted {
  title:        string;
  description:  string;
  priority:     string;
  category?:    string;
  type?:        string;
  responsible?: string;
  eventDate?:   string;
  dueDate?:     string;
  extraField?:  string;
}

interface SmartResult {
  needsMoreInfo:     boolean;
  followUpQuestions?: string[];
  partialSummary?:   string;
  outputType?:       "event" | "case";
  summary?:          string;
  extracted?:        SmartExtracted;
}

// ─── System prompt ─────────────────────────────────────────────────────────────

const SYSTEM = `Ты — BarDoctor AI, Операционный Директор ресторана с 20-летним опытом.
Пользователи сообщают о ситуациях текстом, голосом или фотографиями.

ЗАДАЧА: понять ситуацию и создать структурированную запись — СОБЫТИЕ или ДЕЛО.

СОБЫТИЕ — мгновенная фиксация: что произошло (жалоба получена, оборудование сломалось, конфликт замечен, идея предложена).
ДЕЛО — отслеживаемая ситуация с активной работой: ремонт в процессе, жалоба расследуется, плановое ТО.

Выбирай ДЕЛО если: есть продолжение, нужен дедлайн, несколько людей вовлечены, несколько шагов решения.

КАТЕГОРИИ СОБЫТИЙ (поле category):
equipment — поломка или неисправность оборудования
complaint — жалоба или претензия гостя
conflict — конфликт в коллективе или с гостем
supplier — проблема с поставщиком
inventory — инвентарь, склад, недостача
maintenance — плановое или внеплановое обслуживание
idea — идея по улучшению
finance — финансовое событие
operations — операционная проблема

ТИПЫ ДЕЛ (поле type):
equipment — ремонт оборудования
complaint — жалоба на рассмотрении
conflict — конфликтная ситуация
supplier — переговоры с поставщиком
maintenance — задача по обслуживанию
finance — финансовая задача
inspection — проверка или аудит
other — прочее

ПРИОРИТЕТ — определяй всегда сам, никогда не спрашивай пользователя:
critical: угроза безопасности, остановка работы, санитарный риск, потери >50 тыс. ₽ за часы
high: серьёзный риск репутации или выручки при бездействии >24 ч
medium: локальная проблема, можно подождать 1-2 дня
low: плановое улучшение, минимальная срочность

ЕСЛИ ФОТО: детально опиши что изображено (поломки, несоответствия, состояние помещений). Используй описание как суть ситуации.

ЗАПРАШИВАТЬ УТОЧНЕНИЯ (needsMoreInfo: true) ТОЛЬКО ЕСЛИ:
— Сообщение < 15 символов без какого-либо контекста
— Совершенно неясно что произошло
— Не более 2 конкретных практических вопросов
— Никогда не спрашивай о приоритете, категории или типе — всё определяй сам

Отвечай ТОЛЬКО валидным JSON без markdown-обёртки:

Нужны уточнения:
{"needsMoreInfo":true,"followUpQuestions":["вопрос 1","вопрос 2"],"partialSummary":"что понял из сообщения"}

Готово:
{"needsMoreInfo":false,"outputType":"event"|"case","summary":"Понял. [что фиксирую и почему такой приоритет — 1-2 уверенных предложения от лица ОД]","extracted":{"title":"до 60 символов","description":"полное описание ситуации","priority":"critical|high|medium|low","category":"только для event","type":"только для case","responsible":"если упомянуто — иначе не включай поле","eventDate":"ISO datetime если явно указано","dueDate":"YYYY-MM-DD если явно указано","extraField":"специфичная деталь категории если есть"}}`;

// ─── Build Claude messages ─────────────────────────────────────────────────────

type ContentBlock =
  | { type: "text"; text: string }
  | { type: "image"; source: { type: "base64"; media_type: string; data: string } };

function buildMessages(r: SmartRequest): Array<{ role: "user"; content: string | ContentBlock[] }> {
  const lines: string[] = [];
  if (r.restaurantContext?.name)         lines.push(`Заведение: ${r.restaurantContext.name}`);
  if (r.restaurantContext?.businessType) lines.push(`Тип: ${r.restaurantContext.businessType}`);
  if (r.restaurantContext?.seats)        lines.push(`Мест: ${r.restaurantContext.seats}`);

  const hasContext = lines.length > 0;
  if (hasContext) lines.push("");

  const inputTypeLabel: Record<string, string> = {
    text: "Текстовое сообщение", voice: "Голосовое сообщение",
    photo: "Фотография", document: "Документ",
  };

  if (r.text?.trim()) {
    lines.push(`${inputTypeLabel[r.inputType] ?? "Сообщение"}: "${r.text.trim()}"`);
  } else if (r.imageBase64) {
    lines.push("(пользователь прикрепил фото — проанализируй что на нём)");
  }

  if (r.followUpAnswers?.length) {
    lines.push("", "Ответы на уточняющие вопросы:");
    for (const qa of r.followUpAnswers) {
      lines.push(`— ${qa.question}: ${qa.answer}`);
    }
  }

  const textContent = lines.join("\n");

  if (r.imageBase64 && r.imageMediaType) {
    return [{
      role: "user",
      content: [
        {
          type: "image",
          source: { type: "base64", media_type: r.imageMediaType, data: r.imageBase64 },
        },
        { type: "text", text: textContent },
      ],
    }];
  }

  return [{ role: "user", content: textContent }];
}

// ─── Response normaliser ──────────────────────────────────────────────────────

const VALID_PRIORITIES  = new Set(["critical", "high", "medium", "low"]);
const VALID_CATEGORIES  = new Set(["equipment","complaint","conflict","supplier","inventory","maintenance","idea","finance","operations"]);
const VALID_CASE_TYPES  = new Set(["equipment","complaint","conflict","supplier","maintenance","finance","inspection","other"]);

function normalise(result: SmartResult): SmartResult {
  if (result.needsMoreInfo) {
    if (!Array.isArray(result.followUpQuestions) || result.followUpQuestions.length === 0) {
      // Model asked for clarification but gave no questions → fall back to medium-priority creation
      return {
        needsMoreInfo: false,
        outputType:    "event",
        summary:       "Понял. Зафиксирую как операционный инцидент со средним приоритетом — уточните позже при необходимости.",
        extracted: {
          title:       "Операционный инцидент",
          description: "Требует уточнения. Создано через Smart Input.",
          priority:    "medium",
          category:    "operations",
        },
      };
    }
    return result;
  }

  // Assessed shape: coerce every required field
  const ex = result.extracted ?? {} as SmartExtracted;
  if (!VALID_PRIORITIES.has(ex.priority))  ex.priority    = "medium";
  if (!ex.title?.trim())                   ex.title       = "Инцидент";
  if (!ex.description?.trim())             ex.description = ex.title;
  if (!result.summary?.trim())             result.summary = "Зафиксировал ситуацию.";
  if (!["event", "case"].includes(result.outputType ?? "")) result.outputType = "event";

  if (result.outputType === "event") {
    if (!VALID_CATEGORIES.has(ex.category ?? "")) ex.category = "operations";
    delete ex.type;
  } else {
    if (!VALID_CASE_TYPES.has(ex.type ?? ""))  ex.type = "other";
    delete ex.category;
  }

  result.extracted = ex;
  return result;
}

// ─── POST /smart/process ──────────────────────────────────────────────────────

router.post("/process", async (req, res) => {
  const ip = req.ip ?? req.socket?.remoteAddress ?? "unknown";
  if (isRateLimited(ip)) {
    res.status(429).json({ success: false, error: "Слишком много запросов. Подождите минуту." });
    return;
  }

  const body: SmartRequest = req.body ?? {};
  if (!body.inputType) {
    res.status(400).json({ success: false, error: "inputType required" });
    return;
  }
  if (!body.text?.trim() && !body.imageBase64) {
    res.status(400).json({ success: false, error: "text or imageBase64 required" });
    return;
  }
  if (JSON.stringify(body).length > 500_000) {      // generous for images
    res.status(413).json({ success: false, error: "Payload too large" });
    return;
  }

  try {
    const messages = buildMessages(body);

    const msg = await anthropic.messages.create({
      model:      "claude-sonnet-4-5",
      max_tokens: 1500,
      system:     SYSTEM,
      messages:   messages as Parameters<typeof anthropic.messages.create>[0]["messages"],
    });

    const raw     = (msg.content[0] as { type: string; text: string }).text ?? "";
    const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "").trim();

    let result: SmartResult;
    try {
      result = JSON.parse(cleaned) as SmartResult;
    } catch {
      console.error("[Smart] Non-JSON response:", cleaned.slice(0, 200));
      res.status(422).json({ success: false, error: "Unexpected AI response format" });
      return;
    }

    result = normalise(result);
    res.json({ success: true, data: result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[Smart]", message);
    res.status(500).json({ success: false, error: "Ошибка AI-анализа" });
  }
});

export default router;
