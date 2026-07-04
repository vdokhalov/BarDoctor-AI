import React, {
  createContext, useContext, useState, useCallback,
  useRef, useEffect, ReactNode,
} from 'react';
import { Employee, loadEmployees, saveEmployees, sortByName } from '@/store/employees';

interface EmployeesContextValue {
  employees:      Employee[];
  /** Returns false if localStorage quota exceeded (employee still in session). */
  addEmployee:    (e: Employee) => boolean;
  updateEmployee: (id: string, patch: Partial<Employee>) => void;
  deleteEmployee: (id: string) => void;
}

const EmployeesContext = createContext<EmployeesContextValue | null>(null);

export function EmployeesProvider({ children }: { children: ReactNode }) {
  const [employees, setEmployees] = useState<Employee[]>(() => sortByName(loadEmployees()));
  const ref = useRef(employees);
  useEffect(() => { ref.current = employees; }, [employees]);

  const addEmployee = useCallback((emp: Employee): boolean => {
    const next = sortByName([emp, ...ref.current]);
    const ok   = saveEmployees(next);
    setEmployees(next);
    return ok;
  }, []);

  const updateEmployee = useCallback((id: string, patch: Partial<Employee>) => {
    const next = sortByName(
      ref.current.map((e) =>
        e.id === id ? { ...e, ...patch, updatedAt: new Date().toISOString() } : e,
      ),
    );
    saveEmployees(next);
    setEmployees(next);
  }, []);

  const deleteEmployee = useCallback((id: string) => {
    const next = ref.current.filter((e) => e.id !== id);
    saveEmployees(next);
    setEmployees(next);
  }, []);

  return (
    <EmployeesContext.Provider value={{ employees, addEmployee, updateEmployee, deleteEmployee }}>
      {children}
    </EmployeesContext.Provider>
  );
}

export function useEmployees(): EmployeesContextValue {
  const ctx = useContext(EmployeesContext);
  if (!ctx) throw new Error('useEmployees must be inside EmployeesProvider');
  return ctx;
}
