import React, {
  createContext, useContext, useState, useCallback, ReactNode,
} from 'react';
import {
  Decision, DecisionStatus,
  loadDecisions, saveDecisions,
  sortDecisions, decisionNid, todayKey,
} from '@/store/decisions';

interface DecisionsContextValue {
  decisions: Decision[];
  /** Returns false if localStorage quota exceeded. */
  addDecision:     (d: Omit<Decision, 'id' | 'status' | 'createdAt' | 'dayKey'>) => boolean;
  acceptDecision:  (id: string, caseId: string) => void;
  dismissDecision: (id: string) => void;
  snoozeDecision:  (id: string) => void;   // "Later"
  deleteDecision:  (id: string) => void;
}

const DecisionsContext = createContext<DecisionsContextValue | null>(null);

export function DecisionsProvider({ children }: { children: ReactNode }) {
  const [decisions, setDecisions] = useState<Decision[]>(
    () => sortDecisions(loadDecisions()),
  );

  const persist = useCallback((next: Decision[]) => {
    saveDecisions(next);
    setDecisions(sortDecisions(next));
  }, []);

  const addDecision = useCallback(
    (d: Omit<Decision, 'id' | 'status' | 'createdAt' | 'dayKey'>): boolean => {
      const now = new Date().toISOString();
      const newDecision: Decision = {
        ...d,
        id:        decisionNid(),
        status:    'pending',
        createdAt: now,
        dayKey:    todayKey(),
      };
      // Functional update — avoids stale-closure clobber on concurrent adds
      let ok = false;
      setDecisions((prev) => {
        const next = sortDecisions([newDecision, ...prev]);
        ok = saveDecisions(next);
        return ok ? next : prev;
      });
      return ok;
    },
    [],
  );

  const changeStatus = useCallback(
    (id: string, status: DecisionStatus, extra?: Partial<Decision>) => {
      setDecisions((prev) => {
        const now  = new Date().toISOString();
        const next = prev.map((d) =>
          d.id === id ? { ...d, ...extra, status, actionAt: now } : d,
        );
        saveDecisions(next);
        return sortDecisions(next);
      });
    },
    [],
  );

  const acceptDecision = useCallback(
    (id: string, caseId: string) => changeStatus(id, 'accepted', { caseId }),
    [changeStatus],
  );

  const dismissDecision = useCallback(
    (id: string) => changeStatus(id, 'dismissed'),
    [changeStatus],
  );

  const snoozeDecision = useCallback(
    (id: string) => changeStatus(id, 'later'),
    [changeStatus],
  );

  const deleteDecision = useCallback((id: string) => {
    setDecisions((prev) => {
      const next = prev.filter((d) => d.id !== id);
      saveDecisions(next);
      return next;
    });
  }, []);

  return (
    <DecisionsContext.Provider value={{
      decisions,
      addDecision,
      acceptDecision,
      dismissDecision,
      snoozeDecision,
      deleteDecision,
    }}>
      {children}
    </DecisionsContext.Provider>
  );
}

export function useDecisions(): DecisionsContextValue {
  const ctx = useContext(DecisionsContext);
  if (!ctx) throw new Error('useDecisions must be inside DecisionsProvider');
  return ctx;
}
