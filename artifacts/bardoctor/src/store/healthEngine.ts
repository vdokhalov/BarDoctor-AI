/**
 * Restaurant Health Engine
 *
 * Pure functions — no side-effects, no randomness.
 * All scores are derived exclusively from real operational data
 * (events, cases, employees). Returns null when data is absent.
 */

import type { RestaurantEvent } from './events';
import type { Case } from './cases';
import type { Employee } from './employees';

// ─── Public types ─────────────────────────────────────────────────────────────

export type CategoryId =
  | 'equipment'
  | 'guests'
  | 'staff'
  | 'operations'
  | 'finance'
  | 'maintenance'
  | 'tasks';

export interface CategoryScore {
  id:            CategoryId;
  score:         number | null; // null = no data yet
  hasData:       boolean;
  openCount:     number;        // currently active/open issues
  resolvedCount: number;        // resolved in last 14 days
}

export interface HealthReport {
  categories:    Record<CategoryId, CategoryScore>;
  overall:       number | null; // null = insufficient data
  hasEnoughData: boolean;
  totalRecords:  number;        // events + cases total
}

export interface ScoreVisual {
  color:  string;
  label:  string;
  bg:     string;
  stroke: string;               // for SVG arc
}

// ─── Scoring constants ────────────────────────────────────────────────────────

const OPEN_PENALTY: Record<string, number> = {
  critical: 30,
  high:     18,
  medium:    9,
  low:       4,
};
const OVERDUE_PENALTY        = 12;
const RESOLVE_BONUS_PER_ITEM =  5;
const MAX_RESOLVE_BONUS      = 25;

/** Issues older than this get half the penalty weight (they're being managed). */
const RECENCY_CUTOFF_MS = 60 * 24 * 60 * 60 * 1000; // 60 days

/** Resolution only counts as a bonus if done within this window. */
const RECENT_RESOLVE_MS = 14 * 24 * 60 * 60 * 1000; // 14 days

/**
 * Minimum total records (events + cases) before ANY score is shown.
 * Below this the restaurant is still in "calibration" mode.
 */
const MIN_RECORDS_TOTAL = 3;

/**
 * Minimum number of categories that must have data for the overall
 * score to be meaningful.
 */
const MIN_CATEGORIES_FOR_OVERALL = 2;

// ─── Internal helpers ─────────────────────────────────────────────────────────

type IssueInput = {
  priority:  string;
  status:    string;
  createdAt: string;
  updatedAt: string;
  dueDate?:  string;
};

function isActive(status: string): boolean {
  return ['open', 'in_progress', 'waiting', 'new', 'acknowledged'].includes(status);
}

function isResolved(status: string): boolean {
  return ['resolved', 'closed'].includes(status);
}

function ageFactor(createdAt: string): number {
  const ageMs = Date.now() - new Date(createdAt).getTime();
  return ageMs > RECENCY_CUTOFF_MS ? 0.5 : 1.0;
}

function isRecentlyResolved(updatedAt: string): boolean {
  return Date.now() - new Date(updatedAt).getTime() < RECENT_RESOLVE_MS;
}

function isDueOverdue(dueDate: string | undefined, status: string): boolean {
  if (!dueDate) return false;
  return isActive(status) && new Date(dueDate).getTime() < Date.now();
}

/**
 * Core scorer. Returns 0–100 or null if issues array is empty.
 */
function scoreIssues(issues: IssueInput[]): number | null {
  if (issues.length === 0) return null;

  const openItems     = issues.filter((i) => isActive(i.status));
  const recentResolve = issues.filter(
    (i) => isResolved(i.status) && isRecentlyResolved(i.updatedAt),
  ).length;

  let penalties = 0;
  for (const item of openItems) {
    const factor = ageFactor(item.createdAt);
    penalties += (OPEN_PENALTY[item.priority] ?? 8) * factor;
    if (isDueOverdue(item.dueDate, item.status)) {
      penalties += OVERDUE_PENALTY * factor;
    }
  }

  const bonus = Math.min(recentResolve * RESOLVE_BONUS_PER_ITEM, MAX_RESOLVE_BONUS);
  return Math.round(Math.max(0, Math.min(100, 100 - penalties + bonus)));
}

function buildResult(
  id: CategoryId,
  issues: IssueInput[],
  hasData: boolean,
): CategoryScore {
  return {
    id,
    hasData,
    score:         hasData ? scoreIssues(issues) : null,
    openCount:     issues.filter((i) => isActive(i.status)).length,
    resolvedCount: issues.filter(
      (i) => isResolved(i.status) && isRecentlyResolved(i.updatedAt),
    ).length,
  };
}

// ─── Per-category scorers ─────────────────────────────────────────────────────

function scoreEquipment(events: RestaurantEvent[], cases: Case[]): CategoryScore {
  const relE = events.filter((e) => e.category === 'equipment');
  const relC = cases.filter((c) => c.type === 'equipment');
  const issues: IssueInput[] = [
    ...relE.map((e) => ({ priority: e.priority, status: e.status, createdAt: e.createdAt, updatedAt: e.updatedAt })),
    ...relC.map((c) => ({ priority: c.priority, status: c.status, createdAt: c.createdAt, updatedAt: c.updatedAt, dueDate: c.dueDate || undefined })),
  ];
  return buildResult('equipment', issues, issues.length > 0);
}

function scoreGuests(events: RestaurantEvent[], cases: Case[]): CategoryScore {
  const relE = events.filter((e) => e.category === 'complaint');
  const relC = cases.filter((c) => c.type === 'complaint');
  const issues: IssueInput[] = [
    ...relE.map((e) => ({ priority: e.priority, status: e.status, createdAt: e.createdAt, updatedAt: e.updatedAt })),
    ...relC.map((c) => ({ priority: c.priority, status: c.status, createdAt: c.createdAt, updatedAt: c.updatedAt, dueDate: c.dueDate || undefined })),
  ];
  return buildResult('guests', issues, issues.length > 0);
}

function scoreStaff(events: RestaurantEvent[], cases: Case[], employees: Employee[]): CategoryScore {
  const relE = events.filter((e) => e.category === 'conflict');
  const relC = cases.filter((c) => c.type === 'conflict');
  const hasData = relE.length > 0 || relC.length > 0 || employees.length > 0;

  const issues: IssueInput[] = [
    ...relE.map((e) => ({ priority: e.priority, status: e.status, createdAt: e.createdAt, updatedAt: e.updatedAt })),
    ...relC.map((c) => ({ priority: c.priority, status: c.status, createdAt: c.createdAt, updatedAt: c.updatedAt, dueDate: c.dueDate || undefined })),
  ];

  // For staff, even if no conflict events/cases, employee presence is a data point
  // Use a synthetic "baseline 100" if only employee data exists (no incidents = healthy)
  let base = issues.length > 0 ? (scoreIssues(issues) ?? 100) : (employees.length > 0 ? 100 : null);

  if (base !== null && employees.length > 0) {
    const dismissed      = employees.filter((e) => e.status === 'dismissed').length;
    const dismissalRate  = dismissed / employees.length;
    // A high dismissal rate implies instability — penalise up to 20 pts
    const dismissPenalty = Math.round(dismissalRate * 20);
    base = Math.max(0, base - dismissPenalty);
  }

  return {
    id:            'staff',
    hasData,
    score:         base,
    openCount:     issues.filter((i) => isActive(i.status)).length,
    resolvedCount: issues.filter((i) => isResolved(i.status) && isRecentlyResolved(i.updatedAt)).length,
  };
}

function scoreOperations(events: RestaurantEvent[], cases: Case[]): CategoryScore {
  // 'supplier' events/cases map here — no dedicated Suppliers category in the 7-category model
  const relE = events.filter((e) => ['operations', 'inventory', 'supplier'].includes(e.category));
  const relC = cases.filter((c) => ['inspection', 'supplier', 'other'].includes(c.type));
  const issues: IssueInput[] = [
    ...relE.map((e) => ({ priority: e.priority, status: e.status, createdAt: e.createdAt, updatedAt: e.updatedAt })),
    ...relC.map((c) => ({ priority: c.priority, status: c.status, createdAt: c.createdAt, updatedAt: c.updatedAt, dueDate: c.dueDate || undefined })),
  ];
  return buildResult('operations', issues, issues.length > 0);
}

function scoreFinance(events: RestaurantEvent[], cases: Case[]): CategoryScore {
  const relE = events.filter((e) => e.category === 'finance');
  const relC = cases.filter((c) => c.type === 'finance');
  const issues: IssueInput[] = [
    ...relE.map((e) => ({ priority: e.priority, status: e.status, createdAt: e.createdAt, updatedAt: e.updatedAt })),
    ...relC.map((c) => ({ priority: c.priority, status: c.status, createdAt: c.createdAt, updatedAt: c.updatedAt, dueDate: c.dueDate || undefined })),
  ];
  return buildResult('finance', issues, issues.length > 0);
}

function scoreMaintenance(events: RestaurantEvent[], cases: Case[]): CategoryScore {
  const relE = events.filter((e) => e.category === 'maintenance');
  const relC = cases.filter((c) => c.type === 'maintenance');
  const issues: IssueInput[] = [
    ...relE.map((e) => ({ priority: e.priority, status: e.status, createdAt: e.createdAt, updatedAt: e.updatedAt })),
    ...relC.map((c) => ({ priority: c.priority, status: c.status, createdAt: c.createdAt, updatedAt: c.updatedAt, dueDate: c.dueDate || undefined })),
  ];
  return buildResult('maintenance', issues, issues.length > 0);
}

function scoreTasks(cases: Case[]): CategoryScore {
  const hasData = cases.length > 0;
  if (!hasData) {
    return { id: 'tasks', hasData: false, score: null, openCount: 0, resolvedCount: 0 };
  }
  const issues: IssueInput[] = cases.map((c) => ({
    priority:  c.priority,
    status:    c.status,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
    dueDate:   c.dueDate || undefined,
  }));
  return buildResult('tasks', issues, true);
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function computeHealth(
  events:    RestaurantEvent[],
  cases:     Case[],
  employees: Employee[],
): HealthReport {
  // 'idea' events are positive suggestions — exclude them from calibration threshold
  // so they don't inflate the record count without contributing to any category score.
  const totalRecords = events.filter((e) => e.category !== 'idea').length + cases.length;

  const categories: Record<CategoryId, CategoryScore> = {
    equipment:   scoreEquipment(events, cases),
    guests:      scoreGuests(events, cases),
    staff:       scoreStaff(events, cases, employees),
    operations:  scoreOperations(events, cases),
    finance:     scoreFinance(events, cases),
    maintenance: scoreMaintenance(events, cases),
    tasks:       scoreTasks(cases),
  };

  const withData = (Object.values(categories) as CategoryScore[]).filter((c) => c.score !== null);

  const hasEnoughData =
    totalRecords >= MIN_RECORDS_TOTAL &&
    withData.length >= MIN_CATEGORIES_FOR_OVERALL;

  const overall: number | null = hasEnoughData
    ? Math.round(withData.reduce((sum, c) => sum + (c.score ?? 0), 0) / withData.length)
    : null;

  return { categories, overall, hasEnoughData, totalRecords };
}

// ─── Visual helpers ───────────────────────────────────────────────────────────

export function scoreVisual(score: number): ScoreVisual {
  if (score >= 85) return { color: '#16A34A', label: 'Отлично',  bg: 'rgba(22,163,74,0.12)',   stroke: '#22C55E' };
  if (score >= 70) return { color: '#22C55E', label: 'Хорошо',   bg: 'rgba(34,197,94,0.10)',   stroke: '#22C55E' };
  if (score >= 55) return { color: '#D97706', label: 'Внимание', bg: 'rgba(245,158,11,0.12)',  stroke: '#F59E0B' };
  if (score >= 40) return { color: '#EA580C', label: 'Проблемы', bg: 'rgba(249,115,22,0.12)',  stroke: '#F97316' };
  return               { color: '#DC2626', label: 'Критично',  bg: 'rgba(239,68,68,0.12)',   stroke: '#EF4444' };
}

export const CATEGORY_META: Record<CategoryId, { label: string; labelShort: string }> = {
  equipment:   { label: 'Оборудование',  labelShort: 'Оборуд.' },
  guests:      { label: 'Гости',         labelShort: 'Гости'   },
  staff:       { label: 'Персонал',      labelShort: 'Персонал'},
  operations:  { label: 'Операции',      labelShort: 'Операции'},
  finance:     { label: 'Финансы',       labelShort: 'Финансы' },
  maintenance: { label: 'Обслуживание',  labelShort: 'Обслуж.' },
  tasks:       { label: 'Задачи',        labelShort: 'Задачи'  },
};

export const CATEGORY_ORDER: CategoryId[] = [
  'equipment', 'guests', 'staff', 'operations', 'finance', 'maintenance', 'tasks',
];
