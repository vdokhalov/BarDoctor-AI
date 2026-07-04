// ─── Domain types ─────────────────────────────────────────────────────────────

export type CaseType =
  | 'equipment' | 'complaint' | 'conflict' | 'supplier'
  | 'maintenance' | 'finance' | 'inspection' | 'other';

export type CasePriority = 'critical' | 'high' | 'medium' | 'low';
export type CaseStatus   = 'open' | 'in_progress' | 'waiting' | 'resolved' | 'closed';

export interface CaseComment {
  id:        string;
  text:      string;
  createdAt: string;
}

export type TimelineType =
  | 'created' | 'status_changed' | 'priority_changed'
  | 'comment_added' | 'photo_added' | 'file_added' | 'updated';

export interface CaseTimelineEntry {
  id:        string;
  type:      TimelineType;
  text:      string;
  createdAt: string;
}

export interface CaseFile {
  id:       string;
  name:     string;
  mimeType: string;
  size:     number;   // bytes (original, pre-base64)
  data:     string;   // base64 data URL
  addedAt:  string;
}

export interface Case {
  id:               string;
  type:             CaseType;
  title:            string;
  description:      string;
  priority:         CasePriority;
  status:           CaseStatus;
  responsible:      string;      // free text (employee name or role)
  dueDate:          string;      // "YYYY-MM-DD"
  photos:           string[];    // base64 data URLs
  files:            CaseFile[];
  comments:         CaseComment[];
  timeline:         CaseTimelineEntry[];
  relatedTasks:     string[];    // task IDs (future)
  relatedEquipment: string[];    // equipment IDs (future)
  createdAt:        string;
  updatedAt:        string;
}

// ─── Persistence ──────────────────────────────────────────────────────────────

const KEY = 'bd_cases';

export function loadCases(): Case[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Case[]) : [];
  } catch {
    return [];
  }
}

/** Returns true on success, false on localStorage quota exceeded. */
export function saveCases(cases: Case[]): boolean {
  try {
    localStorage.setItem(KEY, JSON.stringify(cases));
    return true;
  } catch {
    console.warn('[BarDoctor] Cases storage quota exceeded.');
    return false;
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function caseNid(): string {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);
}

export function makeTimeline(type: TimelineType, text: string): CaseTimelineEntry {
  return { id: caseNid(), type, text, createdAt: new Date().toISOString() };
}

export const PRIORITY_ORDER: Record<CasePriority, number> = {
  critical: 0, high: 1, medium: 2, low: 3,
};

/** Sort by priority desc, then by createdAt desc */
export function sortCases(cases: Case[]): Case[] {
  return [...cases].sort((a, b) => {
    const pd = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
    if (pd !== 0) return pd;
    return b.createdAt.localeCompare(a.createdAt);
  });
}

export function sortByDate(cases: Case[]): Case[] {
  return [...cases].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function sortByDeadline(cases: Case[]): Case[] {
  return [...cases].sort((a, b) => {
    if (!a.dueDate && !b.dueDate) return 0;
    if (!a.dueDate) return 1;
    if (!b.dueDate) return -1;
    return a.dueDate.localeCompare(b.dueDate);
  });
}

export function isOverdue(dueDate: string): boolean {
  if (!dueDate) return false;
  return new Date(dueDate) < new Date();
}

export function formatDue(dueDate: string): string {
  if (!dueDate) return '';
  const d = new Date(dueDate);
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}

export function activeCases(cases: Case[]): Case[] {
  return cases.filter((c) => ['open', 'in_progress', 'waiting'].includes(c.status));
}
