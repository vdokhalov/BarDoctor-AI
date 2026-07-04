// ─── Domain types ─────────────────────────────────────────────────────────────

export type Shift          = 'morning' | 'evening' | 'night' | 'flexible' | 'full';
export type EmployeeStatus = 'active' | 'on_leave' | 'dismissed';

export interface Employee {
  id:         string;
  name:       string;
  position:   string;
  phone:      string;
  email:      string;
  department: string;
  shift:      Shift;
  hireDate:   string;         // "YYYY-MM-DD"
  notes:      string;
  status:     EmployeeStatus;
  createdAt:  string;
  updatedAt:  string;
}

// ─── Persistence ──────────────────────────────────────────────────────────────

const KEY = 'bd_employees';

export function loadEmployees(): Employee[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Employee[]) : [];
  } catch {
    return [];
  }
}

/** Returns true on success, false if localStorage quota was exceeded. */
export function saveEmployees(employees: Employee[]): boolean {
  try {
    localStorage.setItem(KEY, JSON.stringify(employees));
    return true;
  } catch {
    console.warn('[BarDoctor] Employees storage quota exceeded.');
    return false;
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function sortByName(employees: Employee[]): Employee[] {
  return [...employees].sort((a, b) => a.name.localeCompare(b.name, 'ru'));
}

export function formatHireDate(iso: string): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('ru-RU', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
}
