import { and, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { domainData } from "../../../db/schema";
import { authenticateRequest, unauthorized } from "../../../lib/bardoctor/auth";
import { hasPermission } from "../../../lib/bardoctor/access-control";
import { AIServiceError, aiErrorResponse, parseAIJson } from "../../../lib/bardoctor/ai-provider";
import { openAIWebSearch, type OpenAIWebSource } from "../../../lib/bardoctor/openai";
import { readJsonRequest } from "../../../lib/bardoctor/http";
import {
  isPackagedProcurementItem,
  isSameSupplierMenuProduct,
  isSupplierProcurementSource,
  normalSupplierTargetKey,
  supplierTargetSignature,
} from "../../../lib/bardoctor/supplier-alternative-rules";
import {
  canonicalSupplierOfferUrl,
  deduplicateSupplierOffers,
  groupSupplierOffers,
} from "../../../lib/bardoctor/supplier-alternative-view";

type JsonRecord = Record<string, unknown>;
const STORE_KEY = "bd_supplier_alternatives_v1";
const STORE_VERSION = 10;
const SEARCH_BATCH_SIZE = 3;

function record(value: unknown): JsonRecord | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : null;
}
function text(value: unknown, fallback = "", limit = 500): string {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, limit) : fallback;
}
function numeric(value: unknown): number | null {
  if (value === null || value === undefined || value === "" || typeof value === "boolean") return null;
  const result = typeof value === "number" ? value : Number(String(value).replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(result) ? result : null;
}
function list(value: unknown, limit = 12): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string" && Boolean(v.trim())).map(v => v.trim().slice(0, 300)).slice(0, limit) : [];
}
function noStore(response: Response): Response {
  response.headers.set("Cache-Control", "no-store");
  return response;
}
async function loadStore(accountId: number, key: string): Promise<unknown> {
  const [row] = await getDb().select().from(domainData).where(and(eq(domainData.accountId, accountId), eq(domainData.storeKey, key))).limit(1);
  return row ? JSON.parse(row.dataJson) : null;
}
async function saveStore(accountId: number, data: JsonRecord): Promise<void> {
  const updatedAt = new Date().toISOString();
  await getDb().insert(domainData).values({ accountId, storeKey: STORE_KEY, dataJson: JSON.stringify(data), updatedAt }).onConflictDoUpdate({ target: [domainData.accountId, domainData.storeKey], set: { dataJson: JSON.stringify(data), updatedAt } });
}
function canonicalUrl(value: string): string {
  try {
    const url = new URL(value);
    url.hash = "";
    url.search = "";
    return `${url.origin}${url.pathname.replace(/\/$/, "")}`.toLocaleLowerCase("en");
  } catch {
    return value.trim().replace(/[?#].*$/, "").replace(/\/$/, "").toLocaleLowerCase("en");
  }
}
function sourceUrls(value: unknown, sources: OpenAIWebSource[]): string[] {
  const byCanonical = new Map(sources.map(source => [canonicalUrl(source.url), source.url]));
  return list(value, 5).map(url => byCanonical.get(canonicalUrl(url)) ?? "").filter(Boolean);
}
const ALLOWED_SELLER_TYPES = new Set(["manufacturer", "distributor", "wholesaler", "horeca_supplier", "retailer"]);
function rebuildCoverage(data: JsonRecord, targetNames: string[], totalPasses: number): JsonRecord {
  const deleted = new Set(list(data.deletedIds, 200));
  const targetMap = new Map(targetNames.map(name => [normalSupplierTargetKey(name), name]));
  const sources = (Array.isArray(data.sources) ? data.sources : []).map(record).filter(Boolean).map(source => ({
    title: text(source?.title, "", 300),
    url: text(source?.url, "", 1_500),
  })).filter((source): source is OpenAIWebSource => Boolean(source.url));
  const sameTargets = text(data.targetSignature, "", 20_000) === supplierTargetSignature(targetNames);
  const alternatives = deduplicateSupplierOffers((Array.isArray(data.alternatives) ? data.alternatives : []).map(record).filter((item): item is JsonRecord => Boolean(item)).filter(item => {
    const matchedTo = text(item?.matchedTo, "", 180);
    const urls = list(item?.sourceUrls, 5);
    const candidatePrice = numeric(item?.candidatePrice);
    return targetMap.has(normalSupplierTargetKey(matchedTo))
      && text(item?.matchType) === "exact_product"
      && isSameSupplierMenuProduct(matchedTo, text(item?.product, "", 180))
      && ALLOWED_SELLER_TYPES.has(text(item?.sellerType))
      && isSupplierProcurementSource(urls, sources)
      && urls.length > 0
      && candidatePrice !== null
      && candidatePrice > 0
      && Boolean(text(item?.currency, "", 12))
      && !deleted.has(text(item?.id, "", 600));
  }).map(item => ({ ...item, decision: ["new", "checking", "confirmed", "dismissed"].includes(text(item?.decision)) ? text(item?.decision) : "new" })));
  const visibleAlternatives = alternatives.filter(item => text(record(item)?.decision) !== "dismissed");
  const covered = new Set(visibleAlternatives.map(item => normalSupplierTargetKey(text(record(item)?.matchedTo))).filter(Boolean));
  const uncoveredTargets = targetNames.filter(name => !covered.has(normalSupplierTargetKey(name))).slice(0, 180);
  const hiddenCount = alternatives.length - visibleAlternatives.length;
  return {
    ...data,
    version: STORE_VERSION,
    targetSignature: supplierTargetSignature(targetNames),
    alternatives,
    positionGroups: groupSupplierOffers(alternatives),
    sources,
    scannedSegments: sameTargets ? list(data.scannedSegments, 200) : [],
    totalSegments: totalPasses,
    targetCount: targetNames.length,
    coveredTargetCount: covered.size,
    uncoveredTargets,
    summary: `Найдено подтверждённых предложений: ${visibleAlternatives.length}.${hiddenCount ? ` Скрыто как неподходящие: ${hiddenCount}.` : ""}`,
  };
}
function normalise(raw: unknown, sources: OpenAIWebSource[], previous: JsonRecord | null, segmentId: string, targetNames: string[], totalPasses: number): JsonRecord {
  const root = record(raw) ?? {};
  const deleted = new Set(list(previous?.deletedIds, 200));
  const decisions = new Map((Array.isArray(previous?.alternatives) ? previous.alternatives : []).map(record).filter(Boolean).map(item => [text(item?.id), text(item?.decision, "new")]));
  const targetMap = new Map(targetNames.map(name => [normalSupplierTargetKey(name), name]));
  const incoming = (Array.isArray(root.alternatives) ? root.alternatives : []).map(record).filter(Boolean).map(item => {
    const supplierName = text(item?.supplierName, "Поставщик", 160);
    const product = text(item?.product, "Товар", 180);
    const url = sourceUrls(item?.sourceUrls, sources)[0] ?? "";
    const id = `${supplierName}|${product}|${canonicalSupplierOfferUrl(url)}`.toLocaleLowerCase("ru").slice(0, 600);
    const currentPrice = numeric(item?.currentPrice);
    const candidatePrice = numeric(item?.candidatePrice);
    const matchedTo = targetMap.get(normalSupplierTargetKey(text(item?.matchedTo, "", 180))) ?? "";
    const urls = sourceUrls(item?.sourceUrls, sources);
    const sellerType = text(item?.sellerType, "", 40);
    const savingPercent = currentPrice && candidatePrice && currentPrice > candidatePrice
      ? Math.round((1 - candidatePrice / currentPrice) * 1000) / 10
      : null;
    return {
      id, supplierName, product,
      matchedTo,
      matchType: text(item?.matchType, "", 40), matchEvidence: text(item?.matchEvidence, "", 240),
      sellerType, sellerTypeEvidence: text(item?.sellerTypeEvidence, "", 240),
      offer: text(item?.offer, "Опубликованная товарная позиция", 500),
      currentPrice, candidatePrice,
      currency: text(item?.currency, "", 12), unit: text(item?.unit, "", 50),
      packageSize: text(item?.packageSize, "", 80),
      savingPercent, monthlySaving: null,
      minimumOrder: text(item?.minimumOrder, "Не указано", 160), delivery: text(item?.delivery, "Требует проверки", 240),
      paymentTerms: text(item?.paymentTerms, "Требует проверки", 240), verifiedAt: text(item?.verifiedAt, new Date().toISOString().slice(0, 10), 20),
      availability: text(item?.availability, "Уточнить", 80), offerType: text(item?.offerType, "Публичная цена", 80),
      sku: text(item?.sku, "", 120), barcode: text(item?.barcode, "", 120), imageUrl: text(item?.imageUrl, "", 1_500),
      phone: text(item?.phone, "", 80), email: text(item?.email, "", 160),
      address: text(item?.address, "", 240), contactName: text(item?.contactName, "", 120),
      caveats: list(item?.caveats, 6), sourceUrls: urls, decision: decisions.get(id) ?? "new",
    };
  }).filter(item => item.matchedTo && item.matchType === "exact_product" && isSameSupplierMenuProduct(item.matchedTo, item.product) && ALLOWED_SELLER_TYPES.has(item.sellerType) && isSupplierProcurementSource(item.sourceUrls, sources) && item.sourceUrls.length && item.candidatePrice !== null && item.candidatePrice > 0 && (!item.currentPrice || item.candidatePrice <= item.currentPrice) && Boolean(item.currency) && Boolean(item.product) && !deleted.has(item.id));
  const existing = (Array.isArray(previous?.alternatives) ? previous.alternatives : []).map(record).filter(Boolean).filter(item => targetMap.has(normalSupplierTargetKey(text(item?.matchedTo))) && text(item?.matchType) === "exact_product" && isSameSupplierMenuProduct(text(item?.matchedTo), text(item?.product)) && ALLOWED_SELLER_TYPES.has(text(item?.sellerType)) && !deleted.has(text(item?.id)));
  const alternatives = [...incoming, ...existing].filter((item, index, all) => all.findIndex(candidate => text(record(candidate)?.id) === text(record(item)?.id)) === index).slice(0, 250);
  const scannedSegments = [...new Set([...list(previous?.scannedSegments, 200), segmentId])];
  const covered = new Set(alternatives.filter(item => text(record(item)?.decision) !== "dismissed").map(item => normalSupplierTargetKey(text(record(item)?.matchedTo))).filter(Boolean));
  const allUncoveredTargets = targetNames.filter(name => !covered.has(normalSupplierTargetKey(name)));
  const uncoveredTargets = allUncoveredTargets.slice(0, 120);
  const combinedSources = [...sources, ...(Array.isArray(previous?.sources) ? previous.sources as OpenAIWebSource[] : [])].filter((source, index, all) => source?.url && all.findIndex(item => item?.url === source.url) === index).slice(0, 300);
  return rebuildCoverage({ version: STORE_VERSION, generatedAt: new Date().toISOString(), summary: text(root.summary, `Найдено конкретных предложений: ${alternatives.length}.`, 900), alternatives, sources: combinedSources, deletedIds: [...deleted], scannedSegments, totalSegments: totalPasses, targetCount: targetNames.length, coveredTargetCount: Math.max(0, targetNames.length - allUncoveredTargets.length), uncoveredTargets, lastSegment: segmentId, targetSignature: supplierTargetSignature(targetNames) }, targetNames, totalPasses);
}

async function procurementTargets(accountId: number): Promise<string[]> {
  const assortment = record(await loadStore(accountId, "bd_assortment_v1")) ?? {};
  const menuItems = (Array.isArray(assortment.menuItems) ? assortment.menuItems : []).map(record).filter(Boolean).filter(item => item?.active !== false).slice(0, 180);
  return [...new Set(menuItems
    .filter(item => isPackagedProcurementItem(`${text(item?.name, "", 160)} ${text(item?.category, "", 100)}`))
    .map(item => text(item?.name, "", 160))
    .filter(Boolean))];
}

function searchPlan(targetNames: string[]): Array<{ id: string; label: string }> {
  const result: Array<{ id: string; label: string }> = [];
  for (let offset = 0; offset < targetNames.length; offset += SEARCH_BATCH_SIZE) {
    const batch = targetNames.slice(offset, offset + SEARCH_BATCH_SIZE);
    result.push({ id: `batch-${result.length}`, label: batch.join(" · ") });
  }
  return result;
}

export async function GET(request: Request): Promise<Response> {
  const account = await authenticateRequest(request);
  if (!account) return noStore(unauthorized());
  if (!hasPermission(account, "inventory.view")) return noStore(Response.json({ ok: false, error: "Раздел поставщиков недоступен" }, { status: 403 }));
  const stored = record(await loadStore(account.id, STORE_KEY));
  const targetNames = await procurementTargets(account.id);
  const plan = searchPlan(targetNames);
  const data = stored ? rebuildCoverage(stored, targetNames, plan.length) : null;
  return noStore(Response.json({ ok: true, data, searchPlan: plan, restaurant: account.restaurantJson ? JSON.parse(account.restaurantJson) : null }));
}

export async function PATCH(request: Request): Promise<Response> {
  const account = await authenticateRequest(request);
  if (!account) return noStore(unauthorized());
  if (!hasPermission(account, "inventory.manage")) return noStore(Response.json({ ok: false, error: "Изменять предложения вам не разрешено" }, { status: 403 }));
  try {
    const parsed = await readJsonRequest<JsonRecord>(request, { maxBytes: 128 * 1024 });
    if (!parsed.ok) return noStore(parsed.response);
    const body = parsed.data;
    const stored = record(await loadStore(account.id, STORE_KEY));
    const targetNames = await procurementTargets(account.id);
    const plan = searchPlan(targetNames);
    const current = stored ? rebuildCoverage(stored, targetNames, plan.length) : null;
    if (!current) throw new AIServiceError("Сначала запустите поиск поставщиков.", 404);
    const id = text(body.id, "", 600);
    const alternatives = Array.isArray(current.alternatives) ? current.alternatives : [];
    if (body.action === "delete") {
      current.alternatives = alternatives.filter(value => text(record(value)?.id, "", 600) !== id);
      current.deletedIds = [...new Set([...list(current.deletedIds, 200), id])].slice(-200);
    } else if (body.action === "decision" && ["new", "checking", "confirmed", "dismissed"].includes(text(body.decision))) {
      current.alternatives = alternatives.map(value => text(record(value)?.id, "", 600) === id ? { ...record(value), decision: text(body.decision) } : value);
    } else throw new AIServiceError("Неизвестное действие.", 400);
    const updated = rebuildCoverage(current, targetNames, plan.length);
    await saveStore(account.id, updated);
    return noStore(Response.json({ ok: true, data: updated }));
  } catch (error) { return noStore(aiErrorResponse(error)); }
}

export async function POST(request: Request): Promise<Response> {
  const account = await authenticateRequest(request);
  if (!account) return noStore(unauthorized());
  if (!hasPermission(account, "analysis.run") || !hasPermission(account, "inventory.view")) return noStore(Response.json({ ok: false, error: "Запускать поиск вам не разрешено" }, { status: 403 }));
  try {
    const parsed = await readJsonRequest<JsonRecord>(request, { maxBytes: 128 * 1024 });
    if (!parsed.ok) return noStore(parsed.response);
    const body = parsed.data;
    const restaurant = account.restaurantJson ? record(JSON.parse(account.restaurantJson)) ?? {} : {};
    const assortment = record(await loadStore(account.id, "bd_assortment_v1")) ?? {};
    const documents = Array.isArray(await loadStore(account.id, "bd_purchase_documents")) ? await loadStore(account.id, "bd_purchase_documents") as unknown[] : [];
    const menuItems = (Array.isArray(assortment.menuItems) ? assortment.menuItems : []).map(record).filter(Boolean).filter(item => item?.active !== false).slice(0, 180).map(item => ({ name: text(item?.name, "", 160), category: text(item?.category, "", 100), department: text(item?.department, "other", 40), type: text(item?.type, "composite", 30), salePrice: numeric(item?.salePrice), plannedSales: numeric(item?.plannedSales) }));
    const purchases = documents.map(record).filter(Boolean).flatMap(doc => (Array.isArray(doc?.items) ? doc.items : []).map(record).filter(Boolean).map(item => ({ name: text(item?.name, "", 160), brand: text(item?.brand, "", 100), packageSize: text(item?.packageSize, "", 80), unitPrice: numeric(item?.unitPrice), supplier: text(doc?.supplierName, "", 160), currency: text(doc?.currency, "", 12), date: text(doc?.date, "", 20) }))).slice(-120);
    const city = text(restaurant.city, "", 120), region = text(restaurant.region, "", 120), country = text(restaurant.country, "", 120);
    const stored = record(await loadStore(account.id, STORE_KEY));
    const procurementMenuItems = menuItems.filter(item => isPackagedProcurementItem(`${item.name} ${item.category}`)).map(item => item.name);
    const targetNames = [...new Set(procurementMenuItems.filter(Boolean))].slice(0, 180);
    const previous = body.reset === true || text(stored?.targetSignature, "", 20_000) !== supplierTargetSignature(targetNames)
      ? { deletedIds: stored?.deletedIds ?? [] }
      : stored;
    if (!targetNames.length) throw new AIServiceError("В активном меню не распознаны точные товарные позиции напитков.", 400);
    const plan = searchPlan(targetNames);
    const requestedSegment = text(body.segment, plan[0]?.id ?? "batch-0", 40);
    const batchIndex = Math.max(0, Math.min(plan.length - 1, Number(requestedSegment.replace(/^batch-/, "")) || 0));
    const segment = plan[batchIndex] ?? plan[0];
    const segmentTargets = targetNames.slice(batchIndex * SEARCH_BATCH_SIZE, batchIndex * SEARCH_BATCH_SIZE + SEARCH_BATCH_SIZE);
    if (!segmentTargets.length) {
      const data = normalise({ summary: "В этом поисковом проходе нет позиций активного меню.", alternatives: [] }, [], previous, segment.id, targetNames, plan.length);
      await saveStore(account.id, data);
      return noStore(Response.json({ ok: true, data }));
    }
    const venueContext = JSON.stringify({ name: text(restaurant.name), city, region, country, businessType: text(restaurant.businessType), venueFormat: text(restaurant.venueFormat) });
    const searchSystem = `Ты — закупочный аналитик BarDoctor. Ищи закупочные предложения только для точных брендированных товаров активного меню. Разрешённые продавцы: manufacturer, distributor, wholesaler, horeca_supplier, retailer. Запрещены ночные клубы, бары, рестораны, кафе, караоке, гостиничные меню, сервисы бронирования и цены порции/бокала. Одна запись — один товар у одного продавца. matchedTo обязан быть дословной копией строки из «Целей текущего прохода». product обязан быть тем же брендом и той же продуктовой линейкой, что matchedTo; другая марка или просто аналог категории запрещены. Русское и латинское написание одного бренда считается совпадением. matchType всегда "exact_product" только при точном товарном совпадении. Допускается другая фасовка того же продукта, если она явно указана. Обязательны публичная цена за товар/упаковку, валюта и прямая URL-страница. Ищи отдельно по каждому товару: сначала молдавские интернет-магазины и дистрибьюторы, затем импортёров/оптовиков, затем магазины с доставкой по Молдове. Не выдумывай данные и не возвращай «цену по запросу». Верни только JSON: {"summary":"...","alternatives":[{"supplierName":"...","sellerType":"manufacturer|distributor|wholesaler|horeca_supplier|retailer","sellerTypeEvidence":"...","product":"точное название на странице продавца","matchedTo":"дословная позиция меню","matchType":"exact_product","matchEvidence":"совпавшие бренд и линейка","offer":"...","currentPrice":null,"candidatePrice":123.45,"currency":"MDL","unit":"за упаковку","packageSize":"1 л","minimumOrder":"...","delivery":"...","paymentTerms":"...","verifiedAt":"YYYY-MM-DD","phone":"...","email":"...","address":"...","contactName":"...","caveats":["..."],"sourceUrls":["https://прямая-страница-товара","https://страница-контактов"]}]}.`;
    const relevantPurchases = purchases.filter(purchase => segmentTargets.some(target => isSameSupplierMenuProduct(target, `${purchase.name} ${purchase.brand} ${purchase.packageSize}`))).slice(-20);
    const commonPrompt = `Заведение: ${venueContext}\nВ этом запросе разрешены только эти точные позиции активного меню: ${JSON.stringify(segmentTargets)}\nЗакупочные документы используются только для справки о текущей цене, но не создают новые цели: ${JSON.stringify(relevantPurchases)}`;
    const web = await openAIWebSearch({ accountId: account.id, observability: { actorAccountId: account.actorAccountId, venueId: account.venueId, feature: "supplier_alternatives" }, maxTokens: 9_000, location: { city: city || undefined, region: region || undefined }, system: searchSystem, prompt: `${commonPrompt}\nТекущий точечный проход: ${segment.label}.\nЦели именно этого прохода: ${JSON.stringify(segmentTargets)}\nДля КАЖДОЙ из этих ${segmentTargets.length} целей сделай несколько отдельных поисковых запросов с точным брендом и линейкой на русском, румынском и латинице. Проверь минимум: интернет-магазины Молдовы, каталоги дистрибьюторов/импортёров, HoReCa-поставщиков и крупные магазины с доставкой в ${city || region || country || "регион заведения"}. Верни до 5 разных продавцов на каждую цель, если есть подтверждённые страницы с ценой. Сначала покрой все цели хотя бы одним предложением, затем добавляй альтернативных продавцов.` });
    const data = normalise(parseAIJson(web.text), web.sources, previous, segment.id, targetNames, plan.length);
    await saveStore(account.id, data);
    return noStore(Response.json({ ok: true, data }));
  } catch (error) { return noStore(aiErrorResponse(error)); }
}
