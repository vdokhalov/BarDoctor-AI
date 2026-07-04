import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Search, X, Phone, Mail,
  Users, Trash2, ChevronRight, CalendarDays,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEmployees } from '@/contexts/EmployeesContext';
import { useToast } from '@/components/ds/Toast';
import { Employee, Shift, EmployeeStatus, formatHireDate } from '@/store/employees';
import AppShell from '@/components/layout/AppShell';
import SafeArea from '@/components/layout/SafeArea';

// ─── Visual config ────────────────────────────────────────────────────────────

const SHIFT_CONFIG: Record<Shift, { label: string; color: string; bg: string }> = {
  morning:  { label: 'Утренняя',    color: 'text-[#B45309]',        bg: 'bg-[#F59E0B]/12' },
  evening:  { label: 'Вечерняя',    color: 'text-[#7C3AED]',        bg: 'bg-[#8B5CF6]/12' },
  night:    { label: 'Ночная',      color: 'text-[#1D4ED8]',        bg: 'bg-[#3B82F6]/12' },
  flexible: { label: 'Гибкий',      color: 'text-[#0369A1]',        bg: 'bg-[#0EA5E9]/12' },
  full:     { label: 'Полный день', color: 'text-[#16A34A]',        bg: 'bg-[#22C55E]/12' },
};

const STATUS_CONFIG: Record<EmployeeStatus, { label: string; color: string; bg: string; dot: string }> = {
  active:    { label: 'Активен',   color: 'text-[#16A34A]',        bg: 'bg-[#22C55E]/12', dot: 'bg-[#22C55E]' },
  on_leave:  { label: 'В отпуске', color: 'text-[#B45309]',        bg: 'bg-[#F59E0B]/12', dot: 'bg-[#F59E0B]' },
  dismissed: { label: 'Уволен',    color: 'text-muted-foreground',  bg: 'bg-muted',        dot: 'bg-muted-foreground/40' },
};

const AVATAR_COLORS = ['#5B5CEB', '#EF4444', '#F97316', '#22C55E', '#8B5CF6', '#0EA5E9', '#F59E0B', '#EC4899'];
const SHIFTS:   Shift[]          = ['morning', 'evening', 'night', 'flexible', 'full'];
const STATUSES: EmployeeStatus[] = ['active', 'on_leave', 'dismissed'];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function nid() {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);
}

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}

function getAvatarColor(name: string): string {
  if (!name) return AVATAR_COLORS[0];
  const code = Array.from(name).reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return AVATAR_COLORS[code % AVATAR_COLORS.length];
}

// ─── Filter types ─────────────────────────────────────────────────────────────

type FilterKey = 'all' | EmployeeStatus;

const FILTER_TABS: { key: FilterKey; label: string }[] = [
  { key: 'all',       label: 'Все' },
  { key: 'active',    label: 'Активные' },
  { key: 'on_leave',  label: 'В отпуске' },
  { key: 'dismissed', label: 'Уволены' },
];

// ─── Atom components ──────────────────────────────────────────────────────────

function Avatar({ name, size = 48 }: { name: string; size?: number }) {
  const color    = getAvatarColor(name);
  const initials = getInitials(name) || '?';
  return (
    <div
      className="rounded-full flex items-center justify-center flex-shrink-0 select-none"
      style={{ width: size, height: size, backgroundColor: color }}
    >
      <span
        className="font-black text-white"
        style={{ fontSize: size * 0.36 }}
      >
        {initials}
      </span>
    </div>
  );
}

function ShiftBadge({ shift }: { shift: Shift }) {
  const cfg = SHIFT_CONFIG[shift];
  return (
    <span className={cn('text-[11px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap', cfg.color, cfg.bg)}>
      {cfg.label}
    </span>
  );
}

function StatusDot({ status }: { status: EmployeeStatus }) {
  return <span className={cn('w-2 h-2 rounded-full flex-shrink-0 mt-0.5', STATUS_CONFIG[status].dot)} />;
}

// ─── Form field primitives ────────────────────────────────────────────────────

function FLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5 px-0.5">
      {children}
    </p>
  );
}

function FInput({
  placeholder, value, onChange, type = 'text', autoFocus, list,
}: {
  placeholder: string; value: string; onChange: (v: string) => void;
  type?: string; autoFocus?: boolean; list?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      autoFocus={autoFocus}
      list={list}
      autoComplete="off"
      className="w-full h-[48px] bg-[#F8F9FC] border border-border rounded-2xl text-[15px] font-medium text-foreground px-4 placeholder:text-muted-foreground/40 placeholder:font-normal focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/12 transition-all"
    />
  );
}

function FTextarea({ placeholder, value, onChange }: {
  placeholder: string; value: string; onChange: (v: string) => void;
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={3}
      className="w-full bg-[#F8F9FC] border border-border rounded-2xl text-[15px] font-medium text-foreground px-4 py-3 placeholder:text-muted-foreground/40 placeholder:font-normal focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/12 transition-all resize-none leading-relaxed"
    />
  );
}

function ChipRow<T extends string>({
  options, labels, value, onChange,
}: {
  options: T[]; labels: Record<string, string>; value: T; onChange: (v: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(opt)}
          className={cn(
            'px-3.5 py-2 rounded-full text-[13px] font-medium border transition-all active:scale-[0.97]',
            value === opt
              ? 'bg-primary text-white border-primary shadow-[0_2px_8px_rgba(91,92,235,0.28)]'
              : 'bg-card border-border text-foreground hover:border-primary/40',
          )}
        >
          {labels[opt]}
        </button>
      ))}
    </div>
  );
}

// ─── Employee card ────────────────────────────────────────────────────────────

function EmployeeCard({
  employee, onEdit,
}: {
  employee: Employee;
  onEdit: (e: Employee) => void;
}) {
  return (
    <motion.button
      type="button"
      onClick={() => onEdit(employee)}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      className="w-full bg-card rounded-2xl border border-card-border shadow-[var(--shadow-card)] px-4 py-3.5 flex items-center gap-3 text-left hover:shadow-[var(--shadow-elevated)] active:scale-[0.985] transition-all"
    >
      {/* Avatar */}
      <div className="relative flex-shrink-0">
        <Avatar name={employee.name} size={48} />
        <StatusDot status={employee.status} />
        {/* Status dot overlay */}
        <span
          className={cn(
            'absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white',
            STATUS_CONFIG[employee.status].dot,
          )}
        />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-[15px] font-bold text-foreground leading-snug truncate">
              {employee.name}
            </p>
            <p className="text-[13px] text-muted-foreground leading-snug truncate mt-0.5">
              {employee.position}
              {employee.department ? <span className="text-muted-foreground/60"> · {employee.department}</span> : null}
            </p>
          </div>
          <ShiftBadge shift={employee.shift} />
        </div>

        {/* Contact row */}
        {(employee.phone || employee.email) && (
          <div className="flex items-center gap-3 mt-2">
            {employee.phone && (
              <a
                href={`tel:${employee.phone}`}
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-1 text-[12px] text-primary font-medium"
              >
                <Phone size={11} />
                {employee.phone}
              </a>
            )}
            {employee.email && (
              <a
                href={`mailto:${employee.email}`}
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-1 text-[12px] text-muted-foreground font-medium truncate"
              >
                <Mail size={11} />
                <span className="truncate">{employee.email}</span>
              </a>
            )}
          </div>
        )}
      </div>

      <ChevronRight size={16} className="text-muted-foreground/40 flex-shrink-0" />
    </motion.button>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center text-center px-8 pt-16 pb-8">
      {/* Decorative circles */}
      <div className="relative w-24 h-24 mb-6">
        <div className="absolute inset-0 rounded-full bg-primary/6 animate-pulse" />
        <div className="absolute inset-3 rounded-full bg-primary/10" />
        <div className="absolute inset-0 flex items-center justify-center">
          <Users size={32} className="text-primary" />
        </div>
        {/* Three small avatar dots */}
        {['#EF4444', '#22C55E', '#F59E0B'].map((color, i) => (
          <motion.div
            key={i}
            className="absolute w-7 h-7 rounded-full border-2 border-white flex items-center justify-center"
            style={{
              backgroundColor: color,
              top:   i === 0 ? -8  : i === 1 ? 4  : -4,
              right: i === 0 ? -8  : i === 1 ? -12 : 20,
            }}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.1 + i * 0.1, type: 'spring', stiffness: 260, damping: 18 }}
          >
            <span className="text-white text-[9px] font-black">
              {['А', 'И', 'М'][i]}
            </span>
          </motion.div>
        ))}
      </div>

      <motion.h2
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.12 }}
        className="text-[20px] font-black text-foreground tracking-tight mb-2"
      >
        Нет сотрудников
      </motion.h2>
      <motion.p
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.18 }}
        className="text-[14px] text-muted-foreground leading-relaxed max-w-[240px] mb-8"
      >
        Добавьте команду ресторана — сотрудников можно будет назначать на задачи, события и оборудование.
      </motion.p>
      <motion.button
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.24 }}
        type="button"
        onClick={onAdd}
        className="flex items-center gap-2 px-6 py-3.5 bg-primary text-white rounded-2xl text-[15px] font-bold shadow-[0_4px_20px_rgba(91,92,235,0.30)] hover:opacity-90 active:scale-[0.97] transition-all"
      >
        <Plus size={16} />
        Добавить первого сотрудника
      </motion.button>
    </div>
  );
}

function FilterEmpty({ onClear }: { onClear: () => void }) {
  return (
    <div className="flex flex-col items-center text-center py-14 px-8">
      <div className="w-12 h-12 rounded-[16px] bg-muted flex items-center justify-center mb-4">
        <Users size={20} className="text-muted-foreground/50" />
      </div>
      <p className="text-[15px] font-bold text-foreground mb-1.5">Никого не найдено</p>
      <p className="text-[13px] text-muted-foreground mb-5">Попробуйте другой фильтр или поисковый запрос.</p>
      <button
        type="button"
        onClick={onClear}
        className="text-[13px] font-semibold text-primary hover:opacity-75 transition-opacity"
      >
        Сбросить фильтры
      </button>
    </div>
  );
}

// ─── Add / Edit sheet ─────────────────────────────────────────────────────────

type SheetMode = 'add' | 'edit';

interface SheetProps {
  mode:     SheetMode;
  initial?: Employee;
  onClose:  () => void;
  onSave:   (data: Omit<Employee, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onDelete?: () => void;
}

function EmployeeSheet({ mode, initial, onClose, onSave, onDelete }: SheetProps) {
  const { toast } = useToast();

  // Form state — pre-fill for edit
  const [name,       setName]       = useState(initial?.name       ?? '');
  const [position,   setPosition]   = useState(initial?.position   ?? '');
  const [department, setDepartment] = useState(initial?.department ?? '');
  const [shift,      setShift]      = useState<Shift>(initial?.shift ?? 'morning');
  const [phone,      setPhone]      = useState(initial?.phone      ?? '');
  const [email,      setEmail]      = useState(initial?.email      ?? '');
  const [hireDate,   setHireDate]   = useState(initial?.hireDate   ?? '');
  const [notes,      setNotes]      = useState(initial?.notes      ?? '');
  const [status,     setStatus]     = useState<EmployeeStatus>(initial?.status ?? 'active');
  const [deleteStep, setDeleteStep] = useState(0); // 0=idle, 1=confirm

  const canSave = name.trim().length > 0 && position.trim().length > 0;

  const shiftLabels  = Object.fromEntries(SHIFTS.map((s) => [s, SHIFT_CONFIG[s].label]))   as Record<string, string>;
  const statusLabels = Object.fromEntries(STATUSES.map((s) => [s, STATUS_CONFIG[s].label])) as Record<string, string>;

  function handleSave() {
    if (!canSave) {
      toast({ variant: 'warning', title: 'Заполните обязательные поля', description: 'Имя и должность обязательны.' });
      return;
    }
    onSave({ name: name.trim(), position: position.trim(), department, shift, phone, email, hireDate, notes, status });
  }

  function handleDeleteClick() {
    if (deleteStep === 0) { setDeleteStep(1); return; }
    onDelete?.();
  }

  // Reset confirm on outside tap
  useEffect(() => {
    if (deleteStep !== 1) return;
    const t = setTimeout(() => setDeleteStep(0), 3000);
    return () => clearTimeout(t);
  }, [deleteStep]);

  return (
    <>
      {/* Backdrop */}
      <motion.div
        key="backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.22 }}
        className="fixed inset-0 bg-foreground/40 backdrop-blur-[2px] z-40"
        onClick={onClose}
      />

      {/* Sheet */}
      <motion.div
        key="sheet"
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ duration: 0.36, ease: [0.22, 1, 0.36, 1] }}
        className="fixed inset-x-0 bottom-0 z-50 bg-white rounded-t-[28px] shadow-[0_-8px_40px_rgba(0,0,0,0.14)] flex flex-col max-h-[94dvh]"
        style={{ maxWidth: 430, margin: '0 auto' }}
      >
        {/* Handle */}
        <div className="flex-shrink-0 flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 rounded-full bg-border" />
        </div>

        {/* Header */}
        <div className="flex-shrink-0 flex items-center justify-between px-6 pb-4">
          <div>
            <h2 className="text-[20px] font-black text-foreground tracking-tight">
              {mode === 'add' ? 'Новый сотрудник' : 'Редактировать'}
            </h2>
            {mode === 'edit' && initial && (
              <p className="text-[13px] text-muted-foreground mt-0.5">{initial.name}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-muted flex items-center justify-center hover:bg-border transition-colors active:scale-95"
          >
            <X size={16} className="text-foreground" />
          </button>
        </div>

        {/* Form (scrollable) */}
        <div className="flex-1 overflow-y-auto px-6 pb-4 flex flex-col gap-4">

          {/* Name */}
          <div>
            <FLabel>Имя *</FLabel>
            <FInput placeholder="Имя Фамилия" value={name} onChange={setName} autoFocus />
          </div>

          {/* Position */}
          <div>
            <FLabel>Должность *</FLabel>
            <FInput placeholder="Официант, повар, бармен…" value={position} onChange={setPosition} />
          </div>

          {/* Department */}
          <div>
            <FLabel>Отдел</FLabel>
            <FInput
              placeholder="Кухня, зал, бар…"
              value={department}
              onChange={setDepartment}
              list="dept-suggestions"
            />
            <datalist id="dept-suggestions">
              <option value="Кухня" />
              <option value="Зал" />
              <option value="Бар" />
              <option value="Управление" />
              <option value="Доставка" />
              <option value="Уборка" />
              <option value="Охрана" />
              <option value="Касса" />
            </datalist>
          </div>

          {/* Shift */}
          <div>
            <FLabel>Смена</FLabel>
            <ChipRow
              options={SHIFTS}
              labels={shiftLabels}
              value={shift}
              onChange={(v) => setShift(v)}
            />
          </div>

          {/* Phone */}
          <div>
            <FLabel>Телефон</FLabel>
            <FInput placeholder="+7 (999) 000-00-00" value={phone} onChange={setPhone} type="tel" />
          </div>

          {/* Email */}
          <div>
            <FLabel>Email</FLabel>
            <FInput placeholder="name@example.com" value={email} onChange={setEmail} type="email" />
          </div>

          {/* Hire date */}
          <div>
            <FLabel>Дата приёма</FLabel>
            <input
              type="date"
              value={hireDate}
              onChange={(e) => setHireDate(e.target.value)}
              className="w-full h-[48px] bg-[#F8F9FC] border border-border rounded-2xl text-[15px] font-medium text-foreground px-4 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/12 transition-all appearance-none"
            />
          </div>

          {/* Notes */}
          <div>
            <FLabel>Заметки</FLabel>
            <FTextarea
              placeholder="Дополнительная информация о сотруднике…"
              value={notes}
              onChange={setNotes}
            />
          </div>

          {/* Status (edit only) */}
          {mode === 'edit' && (
            <div>
              <FLabel>Статус</FLabel>
              <ChipRow
                options={STATUSES}
                labels={statusLabels}
                value={status}
                onChange={(v) => setStatus(v)}
              />
            </div>
          )}

        </div>

        {/* Actions */}
        <div className="flex-shrink-0 px-6 pb-8 pt-3 border-t border-border flex flex-col gap-2.5">
          <button
            type="button"
            onClick={handleSave}
            disabled={!canSave}
            className={cn(
              'w-full h-14 rounded-2xl text-[16px] font-bold tracking-tight transition-all',
              canSave
                ? 'bg-primary text-white shadow-[0_4px_20px_rgba(91,92,235,0.28)] hover:opacity-90 active:scale-[0.98]'
                : 'bg-muted text-muted-foreground cursor-not-allowed',
            )}
          >
            {mode === 'add' ? 'Добавить сотрудника' : 'Сохранить изменения'}
          </button>

          {mode === 'edit' && onDelete && (
            <button
              type="button"
              onClick={handleDeleteClick}
              className={cn(
                'w-full h-11 rounded-2xl text-[14px] font-semibold transition-all flex items-center justify-center gap-2',
                deleteStep === 1
                  ? 'bg-destructive/10 text-destructive border border-destructive/30'
                  : 'text-muted-foreground hover:text-destructive hover:bg-destructive/6',
              )}
            >
              <Trash2 size={14} />
              {deleteStep === 1 ? 'Нажмите ещё раз для подтверждения' : 'Удалить сотрудника'}
            </button>
          )}
        </div>
      </motion.div>
    </>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function Employees() {
  const { employees, addEmployee, updateEmployee, deleteEmployee } = useEmployees();
  const { toast } = useToast();

  const [filter,  setFilter]  = useState<FilterKey>('all');
  const [search,  setSearch]  = useState('');
  const [sheet,   setSheet]   = useState<{ mode: SheetMode; employee?: Employee } | null>(null);

  // Filtered + searched list
  const filtered = useMemo(() => {
    let list = employees;
    if (filter !== 'all') list = list.filter((e) => e.status === filter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (e) =>
          e.name.toLowerCase().includes(q) ||
          e.position.toLowerCase().includes(q) ||
          e.department.toLowerCase().includes(q),
      );
    }
    return list;
  }, [employees, filter, search]);

  // Counts per status for filter badges
  const counts = useMemo(() => ({
    all:       employees.length,
    active:    employees.filter((e) => e.status === 'active').length,
    on_leave:  employees.filter((e) => e.status === 'on_leave').length,
    dismissed: employees.filter((e) => e.status === 'dismissed').length,
  }), [employees]);

  function openAdd()            { setSheet({ mode: 'add' }); }
  function openEdit(e: Employee){ setSheet({ mode: 'edit', employee: e }); }
  function closeSheet()         { setSheet(null); }

  function handleSave(data: Omit<Employee, 'id' | 'createdAt' | 'updatedAt'>) {
    const now = new Date().toISOString();
    if (sheet?.mode === 'add') {
      const ok = addEmployee({ id: nid(), ...data, createdAt: now, updatedAt: now });
      if (!ok) toast({ variant: 'warning', title: 'Мало памяти', description: 'Сотрудник добавлен в текущую сессию, но не сохранён постоянно.' });
      else toast({ variant: 'success', title: 'Сотрудник добавлен', description: data.name });
    } else if (sheet?.employee) {
      updateEmployee(sheet.employee.id, data);
      toast({ variant: 'success', title: 'Изменения сохранены' });
    }
    closeSheet();
  }

  function handleDelete() {
    if (!sheet?.employee) return;
    const name = sheet.employee.name;
    deleteEmployee(sheet.employee.id);
    closeSheet();
    toast({ variant: 'success', title: 'Сотрудник удалён', description: name });
  }

  const hasAny     = employees.length > 0;
  const hasResults = filtered.length > 0;

  return (
    <AppShell showBottomNav>
      <SafeArea className="pt-5 pb-32">

        {/* ── Header ── */}
        <div className="px-6 flex items-center justify-between mb-5">
          <div>
            <h1 className="text-[24px] font-black text-foreground tracking-tight">Сотрудники</h1>
            {employees.length > 0 && (
              <p className="text-[13px] text-muted-foreground mt-0.5">
                {employees.length} {employees.length === 1 ? 'человек' : employees.length < 5 ? 'человека' : 'человек'}
              </p>
            )}
          </div>
          {hasAny && (
            <button
              type="button"
              onClick={openAdd}
              className="w-10 h-10 bg-primary rounded-full flex items-center justify-center shadow-[var(--shadow-fab)] active:scale-95 transition-transform"
            >
              <Plus size={18} className="text-white" />
            </button>
          )}
        </div>

        {/* ── Empty state (no employees at all) ── */}
        {!hasAny ? (
          <EmptyState onAdd={openAdd} />
        ) : (
          <>
            {/* ── Search ── */}
            <div className="px-6 mb-4">
              <div className="relative">
                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                <input
                  type="text"
                  placeholder="Поиск по имени, должности…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full h-11 bg-card border border-border rounded-2xl pl-10 pr-10 text-[14px] font-medium text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/12 transition-all"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X size={15} />
                  </button>
                )}
              </div>
            </div>

            {/* ── Filter tabs ── */}
            <div className="px-6 mb-5 flex gap-2 overflow-x-auto scrollbar-none">
              {FILTER_TABS.map((f) => {
                const count = counts[f.key];
                return (
                  <button
                    key={f.key}
                    type="button"
                    onClick={() => setFilter(f.key)}
                    className={cn(
                      'flex items-center gap-1.5 px-4 py-2 rounded-full text-[13px] font-semibold whitespace-nowrap transition-all flex-shrink-0',
                      filter === f.key
                        ? 'bg-primary text-white shadow-[0_2px_10px_rgba(91,92,235,0.28)]'
                        : 'bg-card border border-border text-foreground hover:border-primary/40',
                    )}
                  >
                    {f.label}
                    {count > 0 && (
                      <span className={cn(
                        'text-[11px] font-bold px-1.5 py-0.5 rounded-full',
                        filter === f.key ? 'bg-white/20 text-white' : 'bg-muted text-muted-foreground',
                      )}>
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* ── Employee list ── */}
            <div className="px-6 flex flex-col gap-3">
              <AnimatePresence mode="popLayout">
                {hasResults ? (
                  filtered.map((emp) => (
                    <EmployeeCard key={emp.id} employee={emp} onEdit={openEdit} />
                  ))
                ) : (
                  <FilterEmpty
                    key="empty"
                    onClear={() => { setFilter('all'); setSearch(''); }}
                  />
                )}
              </AnimatePresence>
            </div>
          </>
        )}

      </SafeArea>

      {/* ── Sheet overlay ── */}
      <AnimatePresence>
        {sheet && (
          <EmployeeSheet
            key="sheet"
            mode={sheet.mode}
            initial={sheet.employee}
            onClose={closeSheet}
            onSave={handleSave}
            onDelete={sheet.mode === 'edit' ? handleDelete : undefined}
          />
        )}
      </AnimatePresence>
    </AppShell>
  );
}
