import React, {
  createContext, useContext, useState, useCallback, ReactNode,
} from 'react';
import {
  Case, CaseStatus, CasePriority, CaseComment, CaseFile,
  loadCases, saveCases, sortByDate, caseNid, makeTimeline,
} from '@/store/cases';
import { CASE_STATUS_CONFIG, CASE_PRIORITY_CONFIG } from '@/config/caseCategories';

interface CasesContextValue {
  cases: Case[];
  /** Returns false if localStorage quota exceeded. */
  addCase:        (c: Case) => boolean;
  updateCase:     (id: string, patch: Partial<Case>) => void;
  deleteCase:     (id: string) => void;
  changeStatus:   (id: string, status: CaseStatus) => void;
  changePriority: (id: string, priority: CasePriority) => void;
  addComment:     (id: string, text: string) => void;
  addPhoto:       (id: string, dataUrl: string) => void;
  addFile:        (id: string, file: Omit<CaseFile, 'id' | 'addedAt'>) => void;
}

const CasesContext = createContext<CasesContextValue | null>(null);

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Derive next cases list, save to localStorage, return it. */
function deriveNext(prev: Case[], id: string, produce: (c: Case, now: string) => Case): Case[] {
  const now  = new Date().toISOString();
  const next = sortByDate(prev.map((c) => (c.id === id ? produce(c, now) : c)));
  saveCases(next);
  return next;
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function CasesProvider({ children }: { children: ReactNode }) {
  const [cases, setCases] = useState<Case[]>(() => sortByDate(loadCases()));

  // ── CRUD ──────────────────────────────────────────────────────────────────

  const addCase = useCallback((c: Case): boolean => {
    const next = sortByDate([c, ...cases]);  // cases here is fine; addCase is called once
    const ok   = saveCases(next);
    setCases(next);
    return ok;
  }, [cases]);  // depends on cases intentionally — called at user gesture, not in rapid succession

  const updateCase = useCallback((id: string, patch: Partial<Case>) => {
    setCases((prev) => deriveNext(prev, id, (c, now) => ({ ...c, ...patch, updatedAt: now })));
  }, []);

  const deleteCase = useCallback((id: string) => {
    setCases((prev) => {
      const next = prev.filter((c) => c.id !== id);
      saveCases(next);
      return next;
    });
  }, []);

  // ── Compound actions — always use functional setState for atomicity ────────

  const changeStatus = useCallback((id: string, status: CaseStatus) => {
    setCases((prev) => deriveNext(prev, id, (c, now) => {
      if (c.status === status) return c;
      const entry = makeTimeline(
        'status_changed',
        `Статус изменён: «${CASE_STATUS_CONFIG[c.status].label}» → «${CASE_STATUS_CONFIG[status].label}»`,
      );
      return { ...c, status, timeline: [...c.timeline, entry], updatedAt: now };
    }));
  }, []);

  const changePriority = useCallback((id: string, priority: CasePriority) => {
    setCases((prev) => deriveNext(prev, id, (c, now) => {
      if (c.priority === priority) return c;
      const entry = makeTimeline(
        'priority_changed',
        `Приоритет изменён: «${CASE_PRIORITY_CONFIG[c.priority].label}» → «${CASE_PRIORITY_CONFIG[priority].label}»`,
      );
      return { ...c, priority, timeline: [...c.timeline, entry], updatedAt: now };
    }));
  }, []);

  const addComment = useCallback((id: string, text: string) => {
    setCases((prev) => deriveNext(prev, id, (c, now) => {
      const comment: CaseComment = { id: caseNid(), text, createdAt: now };
      const entry = makeTimeline('comment_added', 'Добавлен комментарий');
      return {
        ...c,
        comments: [...c.comments, comment],
        timeline: [...c.timeline, entry],
        updatedAt: now,
      };
    }));
  }, []);

  const addPhoto = useCallback((id: string, dataUrl: string) => {
    setCases((prev) => deriveNext(prev, id, (c, now) => {
      const entry = makeTimeline('photo_added', 'Добавлено фото');
      return { ...c, photos: [...c.photos, dataUrl], timeline: [...c.timeline, entry], updatedAt: now };
    }));
  }, []);

  const addFile = useCallback((id: string, file: Omit<CaseFile, 'id' | 'addedAt'>) => {
    setCases((prev) => deriveNext(prev, id, (c, now) => {
      const full: CaseFile = { id: caseNid(), addedAt: now, ...file };
      const entry = makeTimeline('file_added', `Добавлен файл: ${file.name}`);
      return { ...c, files: [...c.files, full], timeline: [...c.timeline, entry], updatedAt: now };
    }));
  }, []);

  return (
    <CasesContext.Provider value={{
      cases, addCase, updateCase, deleteCase,
      changeStatus, changePriority, addComment, addPhoto, addFile,
    }}>
      {children}
    </CasesContext.Provider>
  );
}

export function useCases(): CasesContextValue {
  const ctx = useContext(CasesContext);
  if (!ctx) throw new Error('useCases must be inside CasesProvider');
  return ctx;
}
