// ─── Domain types ─────────────────────────────────────────────────────────────

export type EventCategory =
  | 'equipment'    // Оборудование
  | 'complaint'    // Жалоба гостя
  | 'conflict'     // Конфликт персонала
  | 'supplier'     // Поставщик
  | 'inventory'    // Инвентарь
  | 'maintenance'  // Обслуживание
  | 'idea'         // Идея
  | 'finance'      // Финансы
  | 'operations';  // Операции

export type Priority    = 'critical' | 'high' | 'medium' | 'low';
export type EventStatus = 'open' | 'in_progress' | 'resolved' | 'closed';

export interface RestaurantEvent {
  id: string;
  category: EventCategory;
  title: string;
  description: string;
  priority: Priority;
  status: EventStatus;
  responsible: string;
  eventDate: string;        // ISO datetime (when the event occurred)
  photos: string[];         // base64 data URLs, max 3
  voiceNote: string | null; // base64 audio/webm or null
  extraField: string;       // category-specific free-text
  createdAt: string;        // ISO timestamp (when logged)
  updatedAt: string;
}

// ─── localStorage persistence ─────────────────────────────────────────────────

const KEY = 'bd_events';

export function loadEvents(): RestaurantEvent[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as RestaurantEvent[]) : [];
  } catch {
    return [];
  }
}

/** Returns true if saved successfully, false if storage quota was exceeded. */
export function saveEvents(events: RestaurantEvent[]): boolean {
  try {
    localStorage.setItem(KEY, JSON.stringify(events));
    return true;
  } catch {
    console.warn('[BarDoctor] Events storage quota exceeded — consider clearing old data.');
    return false;
  }
}

// ─── Sorting ──────────────────────────────────────────────────────────────────

export function sortByEventDate(events: RestaurantEvent[]): RestaurantEvent[] {
  return [...events].sort((a, b) => b.eventDate.localeCompare(a.eventDate));
}

// ─── Display helpers ──────────────────────────────────────────────────────────

/** Group key → human-readable date header for timeline */
export function formatDateGroup(isoDate: string): string {
  const d    = new Date(isoDate);
  const now  = new Date();
  const yest = new Date(now);
  yest.setDate(now.getDate() - 1);

  if (d.toDateString() === now.toDateString())  return 'Сегодня';
  if (d.toDateString() === yest.toDateString()) return 'Вчера';

  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
}

/** "14:30" */
export function formatTime(isoDate: string): string {
  return new Date(isoDate).toLocaleTimeString('ru-RU', {
    hour: '2-digit', minute: '2-digit',
  });
}

/** "только что", "5 мин. назад", "2 ч. назад", "3 д. назад" */
export function formatRelative(isoDate: string): string {
  const diffMs  = Date.now() - new Date(isoDate).getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes <  1) return 'только что';
  if (minutes < 60) return `${minutes} мин. назад`;
  const hours = Math.floor(minutes / 60);
  if (hours  < 24) return `${hours} ч. назад`;
  const days  = Math.floor(hours / 24);
  if (days   <  7) return `${days} д. назад`;
  return formatDateGroup(isoDate);
}

/** Group events by event date (yyyy-mm-dd) */
export function groupByDate(events: RestaurantEvent[]): { key: string; label: string; items: RestaurantEvent[] }[] {
  const map = new Map<string, RestaurantEvent[]>();
  for (const ev of events) {
    const dayKey = ev.eventDate.slice(0, 10); // "2024-07-04"
    if (!map.has(dayKey)) map.set(dayKey, []);
    map.get(dayKey)!.push(ev);
  }
  return Array.from(map.entries()).map(([key, items]) => ({
    key,
    label: formatDateGroup(items[0].eventDate),
    items,
  }));
}
