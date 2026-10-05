import type { EvidenceReference } from './evidence-contracts';

export const CURATED_QUESTIONS = [
  { id: 'attention', label: 'Что требует внимания сейчас?', group: 'Сейчас' },
  { id: 'cost', label: 'Где проблемы с себестоимостью?', group: 'Операции' },
  { id: 'stock', label: 'Что происходит со складом?', group: 'Операции' },
  { id: 'shifts', label: 'Есть ли проблемы со сменами?', group: 'Операции' },
  { id: 'expenses', label: 'Что происходит с зарегистрированными расходами?', group: 'Операции' },
  { id: 'tasks', label: 'Какие задачи просрочены или критичны?', group: 'Операции' },
  { id: 'next', label: 'Что делать дальше?', group: 'Сейчас' },
] as const;
export type CuratedQuestionId = typeof CURATED_QUESTIONS[number]['id'];
export function isCuratedQuestion(value: unknown): value is CuratedQuestionId {
  return CURATED_QUESTIONS.some(question => question.id === value);
}
export type CuratedAction = { id: string; label: string; path: string; verification: 'EXISTING_DOMAIN_READ' | 'CANONICAL_SERVER_REREAD' };
export type CuratedFact = {
  id: string; kind: 'FACT' | 'DERIVED_FACT' | 'UNKNOWN'; label: string;
  detail: string; value: number | string | null; unit?: string; currency?: string | null;
  reasonCodes?: string[]; priority?: string; deadline?: string | null; status?: string; action?: CuratedAction | null;
  evidence: EvidenceReference[];
};
export type CuratedAnswer = {
  version: 'curated-doctor-v1'; question: { id: CuratedQuestionId; label: string };
  authority: 'DETERMINISTIC_CANONICAL_SERVER'; causalClaim: 'NONE';
  scope: { venueId: number; workspaceId: number; dataAccountId: number };
  asOf: string; inputRevision: string; availability: 'AVAILABLE' | 'PARTIAL' | 'UNAVAILABLE';
  answer: string; facts: CuratedFact[]; limitations: string[]; nextActions: CuratedAction[];
  period: { startDate: string | null; endDate: string | null; label: string; timezone: string };
  coverage: { shown: number; total: number | null; complete: boolean };
  sources: { label: string; key: string; state: string; updatedAt: string | null; revision: string | null }[];
  canonicalPriorityIds: string[]; suggestedQuestion: CuratedQuestionId;
};
