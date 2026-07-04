/**
 * Decisions store — persisted to localStorage.
 * Each Decision card originates from an AI Doctor diagnosis run.
 * Accepted decisions are linked to a created Case.
 */

export type DecisionPriority = 'critical' | 'high' | 'medium' | 'low';
export type DecisionEffort   = 'low' | 'medium' | 'high';
export type DecisionStatus   = 'pending' | 'later' | 'accepted' | 'dismissed';

export interface Decision {
  id:                string;
  recommendation:    string;     // Short action statement
  reason:            string;     // Why this matters
  expectedImpact:    string;     // What will improve
  estimatedEffort:   DecisionEffort;
  priority:          DecisionPriority;
  category:          string;     // equipment | guests | staff | operations | finance | maintenance
  status:            DecisionStatus;
  createdAt:         string;     // ISO
  actionAt?:         string;     // When accepted / dismissed / snoozed
  caseId?:           string;     // Created Case ID on accept
  source:            'ai_doctor';
  /** Daily fingerprint so AI Doctor doesn't duplicate on the same day */
  dayKey:            string;     // "YYYY-MM-DD"
}

// ─── Persistence ──────────────────────────────────────────────────────────────

const KEY = 'bd_decisions';

export function loadDecisions(): Decision[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Decision[]) : [];
  } catch {
    return [];
  }
}

/** Returns true on success, false if quota exceeded. */
export function saveDecisions(decisions: Decision[]): boolean {
  try {
    localStorage.setItem(KEY, JSON.stringify(decisions));
    return true;
  } catch {
    console.warn('[BarDoctor] Decisions storage quota exceeded.');
    return false;
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function decisionNid(): string {
  return `dec_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

export function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * True if an UNACTED decision (pending or later) from today already exists.
 * Accepted cards are excluded — user can get a fresh recommendation after acting.
 * Dismissed cards are always excluded.
 */
export function hasTodayDecision(decisions: Decision[]): boolean {
  const k = todayKey();
  return decisions.some(
    (d) => d.dayKey === k && (d.status === 'pending' || d.status === 'later'),
  );
}

// ─── Sorting ──────────────────────────────────────────────────────────────────

const PRIORITY_RANK: Record<DecisionPriority, number> = {
  critical: 0, high: 1, medium: 2, low: 3,
};

export function sortDecisions(decisions: Decision[]): Decision[] {
  const STATUS_RANK: Record<DecisionStatus, number> = {
    pending: 0, later: 1, accepted: 2, dismissed: 3,
  };
  return [...decisions].sort((a, b) => {
    const sd = STATUS_RANK[a.status] - STATUS_RANK[b.status];
    if (sd !== 0) return sd;
    const pd = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
    if (pd !== 0) return pd;
    return b.createdAt.localeCompare(a.createdAt);
  });
}

// ─── Display helpers ──────────────────────────────────────────────────────────

export const PRIORITY_DISPLAY: Record<DecisionPriority, { label: string; color: string; stripe: string }> = {
  critical: { label: 'Критичный',  color: '#DC2626', stripe: '#EF4444' },
  high:     { label: 'Высокий',    color: '#EA580C', stripe: '#F97316' },
  medium:   { label: 'Средний',    color: '#D97706', stripe: '#F59E0B' },
  low:      { label: 'Низкий',     color: '#16A34A', stripe: '#22C55E' },
};

export const EFFORT_DISPLAY: Record<DecisionEffort, { label: string; dots: number }> = {
  low:    { label: 'Низкие · до 2 ч',    dots: 1 },
  medium: { label: 'Средние · 2–8 ч',    dots: 2 },
  high:   { label: 'Высокие · от 8 ч',   dots: 3 },
};

export const CATEGORY_LABEL: Record<string, string> = {
  equipment:   'Оборудование',
  guests:      'Гости',
  staff:       'Персонал',
  operations:  'Операции',
  finance:     'Финансы',
  maintenance: 'Обслуживание',
  suppliers:   'Поставщики',
  hygiene:     'Гигиена',
  default:     'Общее',
};

/** Map a decision category to the closest CaseType for task creation */
export function categoryToCaseType(cat: string): string {
  const map: Record<string, string> = {
    equipment:   'equipment',
    guests:      'complaint',
    staff:       'conflict',
    operations:  'inspection',
    finance:     'finance',
    maintenance: 'maintenance',
    suppliers:   'supplier',
    hygiene:     'inspection',
  };
  return map[cat] ?? 'other';
}
