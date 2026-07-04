import React, { useState, useRef, useCallback } from 'react';
import {
  Plus, Clock, User, Check, Trash2, ChevronDown,
  AlertCircle, Calendar, X, CheckSquare,
} from 'lucide-react';
import {
  motion, AnimatePresence, useMotionValue,
  animate as fmAnimate,
} from 'framer-motion';
import AppShell from '@/components/layout/AppShell';
import SafeArea from '@/components/layout/SafeArea';
import Input from '@/components/ds/Input';
import Button from '@/components/ds/Button';
import { cn } from '@/lib/utils';

// ─── Types & constants ────────────────────────────────────────────────────────

type Priority = 'critical' | 'high' | 'medium' | 'low';
type Tab = 'today' | 'week' | 'overdue' | 'done';

interface Task {
  id: string;
  title: string;
  category: string;
  priority: Priority;
  deadline: string;
  responsible: string;
  tab: Tab;
}

const PRIORITY_CONFIG: Record<Priority, {
  label: string; color: string; bg: string; dot: string; border: string;
}> = {
  critical: {
    label: 'Критично',
    color: 'text-destructive',
    bg: 'bg-destructive/10',
    dot: 'bg-destructive',
    border: 'border-l-destructive',
  },
  high: {
    label: 'Высокий',
    color: 'text-[#B45309]',
    bg: 'bg-[#F59E0B]/10',
    dot: 'bg-[#F59E0B]',
    border: 'border-l-[#F59E0B]',
  },
  medium: {
    label: 'Средний',
    color: 'text-[#1D4ED8]',
    bg: 'bg-[#3B82F6]/10',
    dot: 'bg-[#3B82F6]',
    border: 'border-l-[#3B82F6]',
  },
  low: {
    label: 'Низкий',
    color: 'text-muted-foreground',
    bg: 'bg-muted',
    dot: 'bg-muted-foreground/50',
    border: 'border-l-border',
  },
};

const TABS: { key: Tab; label: string }[] = [
  { key: 'today', label: 'Сегодня' },
  { key: 'week', label: 'На неделе' },
  { key: 'overdue', label: 'Просрочено' },
  { key: 'done', label: 'Выполнено' },
];

// ─── Seed data ────────────────────────────────────────────────────────────────

let _id = 0;
const uid = () => String(++_id);

// No seed data — tasks are entered by the user only.
const SEED: Task[] = [];

// ─── Priority pill ─────────────────────────────────────────────────────────────

function PriorityPill({ priority }: { priority: Priority }) {
  const cfg = PRIORITY_CONFIG[priority];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wide',
        cfg.color, cfg.bg,
      )}
    >
      <span className={cn('w-1.5 h-1.5 rounded-full', cfg.dot)} />
      {cfg.label}
    </span>
  );
}

// ─── Swipeable task card ───────────────────────────────────────────────────────

const REVEAL_W = 132; // px — width of the revealed actions zone

interface SwipeableTaskProps {
  task: Task;
  isDone?: boolean;
  onComplete: (id: string) => void;
  onDelete: (id: string) => void;
}

function SwipeableTask({ task, isDone = false, onComplete, onDelete }: SwipeableTaskProps) {
  const x = useMotionValue(0);
  const [isOpen, setIsOpen] = useState(false);
  const cfg = PRIORITY_CONFIG[task.priority];

  const snapClose = useCallback(() => {
    fmAnimate(x, 0, { type: 'spring', stiffness: 400, damping: 36 });
    setIsOpen(false);
  }, [x]);

  const snapOpen = useCallback(() => {
    fmAnimate(x, -REVEAL_W, { type: 'spring', stiffness: 400, damping: 36 });
    setIsOpen(true);
  }, [x]);

  const handleDragEnd = (_: unknown, info: { offset: { x: number }; velocity: { x: number } }) => {
    if (info.offset.x < -48 || info.velocity.x < -300) {
      snapOpen();
    } else {
      snapClose();
    }
  };

  const handleComplete = () => {
    snapClose();
    setTimeout(() => onComplete(task.id), 180);
  };

  const handleDelete = () => {
    snapClose();
    setTimeout(() => onDelete(task.id), 180);
  };

  return (
    <div className="relative rounded-[20px] overflow-hidden mb-3">
      {/* Action backdrop */}
      <div
        className="absolute right-0 top-0 bottom-0 flex items-center justify-end gap-2 pr-3"
        style={{ width: REVEAL_W }}
      >
        <button
          onClick={handleComplete}
          className="w-[52px] h-[52px] rounded-2xl bg-[#22C55E] flex flex-col items-center justify-center gap-0.5 shadow-md active:scale-95 transition-transform"
        >
          <Check size={18} strokeWidth={2.5} className="text-white" />
          <span className="text-[9px] font-bold text-white uppercase tracking-wide">Готово</span>
        </button>
        <button
          onClick={handleDelete}
          className="w-[52px] h-[52px] rounded-2xl bg-destructive flex flex-col items-center justify-center gap-0.5 shadow-md active:scale-95 transition-transform"
        >
          <Trash2 size={16} strokeWidth={2} className="text-white" />
          <span className="text-[9px] font-bold text-white uppercase tracking-wide">Удалить</span>
        </button>
      </div>

      {/* Card */}
      <motion.div
        drag="x"
        dragConstraints={{ left: -REVEAL_W, right: isOpen ? 0 : 4 }}
        dragElastic={{ left: 0.08, right: 0.04 }}
        style={{ x }}
        onDragEnd={handleDragEnd}
        onClick={() => isOpen && snapClose()}
        className={cn(
          'relative z-10 bg-card border border-border rounded-[20px] cursor-grab active:cursor-grabbing',
          'border-l-[3px]', cfg.border,
          'shadow-[var(--shadow-card)]',
          isDone && 'opacity-60',
        )}
      >
        <div className="px-4 py-4">
          {/* Top row */}
          <div className="flex items-center justify-between mb-2.5">
            <PriorityPill priority={task.priority} />
            <span className="text-[11px] font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
              {task.category}
            </span>
          </div>

          {/* Title */}
          <p className={cn(
            'text-[15px] font-semibold text-foreground leading-snug mb-3',
            isDone && 'line-through text-muted-foreground',
          )}>
            {task.title}
          </p>

          {/* Meta row */}
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
              <Clock size={12} className="opacity-70" />
              {task.deadline}
            </span>
            <span className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
              <User size={12} className="opacity-70" />
              {task.responsible}
            </span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Empty state ───────────────────────────────────────────────────────────────

function EmptyState({ tab, onAdd }: { tab: Tab; onAdd?: () => void }) {
  const MSGS: Record<Tab, { title: string; body: string; cta?: string }> = {
    today:   { title: 'Задач на сегодня нет',       body: 'Добавьте первую задачу — она сразу появится здесь.',        cta: 'Добавить задачу' },
    week:    { title: 'На этой неделе всё спокойно', body: 'Нет задач на ближайшие дни. Самое время спланировать.',     cta: 'Добавить задачу' },
    overdue: { title: 'Просроченных задач нет',      body: 'Отличный результат — всё выполняется вовремя.',             cta: undefined },
    done:    { title: 'Выполненных задач пока нет',  body: 'Здесь будут отмечены завершённые задачи.',                  cta: undefined },
  };
  const { title, body, cta } = MSGS[tab];
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="flex flex-col items-center justify-center py-16 text-center px-8"
    >
      <div className="w-14 h-14 rounded-[18px] bg-muted flex items-center justify-center mb-4">
        {tab === 'overdue'
          ? <span className="text-2xl">🎉</span>
          : tab === 'done'
          ? <span className="text-2xl">📋</span>
          : <CheckSquare size={26} className="text-muted-foreground/60" />}
      </div>
      <p className="text-[16px] font-bold text-foreground mb-1.5">{title}</p>
      <p className="text-[13px] text-muted-foreground leading-relaxed mb-5">{body}</p>
      {cta && onAdd && (
        <button
          type="button"
          onClick={onAdd}
          className="px-5 py-2.5 bg-primary text-white rounded-2xl text-[14px] font-semibold hover:opacity-90 active:scale-[0.97] transition-all shadow-[0_4px_14px_rgba(91,92,235,0.22)]"
        >
          {cta}
        </button>
      )}
    </motion.div>
  );
}

// ─── Add Task sheet ────────────────────────────────────────────────────────────

interface AddSheetProps {
  onClose: () => void;
  onAdd: (t: Omit<Task, 'id'>) => void;
  defaultTab: Tab;
}

function AddSheet({ onClose, onAdd, defaultTab }: AddSheetProps) {
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState<Priority>('medium');
  const [deadline, setDeadline] = useState('');
  const [responsible, setResponsible] = useState('');

  const handleSave = () => {
    if (!title.trim()) return;
    onAdd({
      title: title.trim(),
      category: 'Общее',
      priority,
      deadline: deadline || 'Без срока',
      responsible: responsible || 'Вы',
      tab: defaultTab === 'done' || defaultTab === 'overdue' ? 'today' : defaultTab,
    });
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ backdropFilter: 'blur(4px)', backgroundColor: 'rgba(22,27,46,0.32)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 320, damping: 34 }}
        className="w-full max-w-[430px] bg-background rounded-t-[28px] pt-3 pb-8 px-6 shadow-[var(--shadow-dialog)]"
      >
        {/* Handle */}
        <div className="w-10 h-1 bg-border rounded-full mx-auto mb-5" />

        <div className="flex items-center justify-between mb-6">
          <h2 className="text-[18px] font-bold text-foreground tracking-tight">Новая задача</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
            <X size={15} className="text-muted-foreground" />
          </button>
        </div>

        <div className="flex flex-col gap-4">
          <Input
            label="Название"
            placeholder="Что нужно сделать?"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />

          {/* Priority chips */}
          <div>
            <p className="text-[14px] font-semibold text-foreground mb-2">Приоритет</p>
            <div className="flex gap-2">
              {(['critical', 'high', 'medium', 'low'] as Priority[]).map((p) => {
                const cfg = PRIORITY_CONFIG[p];
                return (
                  <button
                    key={p}
                    onClick={() => setPriority(p)}
                    className={cn(
                      'flex-1 py-2 rounded-xl text-[12px] font-bold border transition-all active:scale-95',
                      priority === p
                        ? `${cfg.bg} ${cfg.color} border-current`
                        : 'border-border text-muted-foreground bg-card hover:border-border/80',
                    )}
                  >
                    {cfg.label}
                  </button>
                );
              })}
            </div>
          </div>

          <Input
            label="Срок выполнения"
            type="date"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
          />

          <Input
            label="Ответственный"
            placeholder="Имя сотрудника"
            value={responsible}
            onChange={(e) => setResponsible(e.target.value)}
          />

          <Button fullWidth onClick={handleSave} disabled={!title.trim()} className="mt-1">
            Добавить задачу
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Main ──────────────────────────────────────────────────────────────────────

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.28, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
};

export default function Tasks() {
  const [activeTab, setActiveTab] = useState<Tab>('today');
  const [tasks, setTasks] = useState<Task[]>(SEED);
  const [showAdd, setShowAdd] = useState(false);

  const tabTasks = tasks.filter((t) => t.tab === activeTab);

  const counts: Record<Tab, number> = {
    today: tasks.filter((t) => t.tab === 'today').length,
    week: tasks.filter((t) => t.tab === 'week').length,
    overdue: tasks.filter((t) => t.tab === 'overdue').length,
    done: tasks.filter((t) => t.tab === 'done').length,
  };

  const handleComplete = (id: string) =>
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, tab: 'done' } : t)),
    );

  const handleDelete = (id: string) =>
    setTasks((prev) => prev.filter((t) => t.id !== id));

  const handleAdd = (t: Omit<Task, 'id'>) =>
    setTasks((prev) => [{ ...t, id: uid() }, ...prev]);

  return (
    <>
      <AppShell showBottomNav className="pb-[168px]">
        {/* Sticky header + tabs */}
        <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-md border-b border-border">
          <SafeArea className="pt-5 pb-0">
            <div className="px-6 mb-4">
              <h1 className="text-[22px] font-bold text-foreground tracking-tight">Задачи</h1>
            </div>

            {/* Tab bar */}
            <div className="flex overflow-x-auto no-scrollbar px-6 pb-0 gap-1">
              {TABS.map(({ key, label }) => {
                const isActive = activeTab === key;
                const count = counts[key];
                return (
                  <button
                    key={key}
                    onClick={() => setActiveTab(key)}
                    className={cn(
                      'flex items-center gap-1.5 px-3.5 py-2 rounded-full whitespace-nowrap text-[13px] font-semibold transition-all shrink-0',
                      isActive
                        ? key === 'overdue'
                          ? 'bg-destructive text-white shadow-sm'
                          : 'bg-primary text-primary-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    {label}
                    {count > 0 && (
                      <span
                        className={cn(
                          'min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold flex items-center justify-center',
                          isActive
                            ? 'bg-white/20 text-white'
                            : key === 'overdue'
                              ? 'bg-destructive/10 text-destructive'
                              : 'bg-muted text-muted-foreground',
                        )}
                      >
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Overdue warning bar */}
            <AnimatePresence>
              {activeTab === 'overdue' && counts.overdue > 0 && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="flex items-center gap-2 px-6 py-2.5 bg-destructive/5 border-t border-destructive/10">
                    <AlertCircle size={13} className="text-destructive flex-shrink-0" />
                    <p className="text-[12px] text-destructive font-medium">
                      {counts.overdue} {counts.overdue === 1 ? 'задача просрочена' : 'задачи просрочены'} — требуют внимания
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Bottom spacer */}
            <div className="h-3" />
          </SafeArea>
        </div>

        {/* Task list */}
        <div className="px-6 pt-4">
          <AnimatePresence mode="wait">
            <motion.div key={activeTab} {...fadeUp}>
              {tabTasks.length === 0 ? (
                <EmptyState tab={activeTab} onAdd={() => setShowAdd(true)} />
              ) : (
                tabTasks.map((task) => (
                  <SwipeableTask
                    key={task.id}
                    task={task}
                    isDone={task.tab === 'done'}
                    onComplete={handleComplete}
                    onDelete={handleDelete}
                  />
                ))
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </AppShell>

      {/* Floating Add Task button */}
      <div className="fixed bottom-[92px] left-0 right-0 flex justify-center z-40 pointer-events-none">
        <motion.button
          initial={{ opacity: 0, y: 12, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: 0.25, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          onClick={() => setShowAdd(true)}
          className="pointer-events-auto flex items-center gap-2.5 pl-4 pr-5 py-3 bg-foreground text-white rounded-full shadow-[0_8px_32px_rgba(22,27,46,0.28),0_2px_8px_rgba(22,27,46,0.14)] hover:opacity-90 active:scale-[0.97] transition-all"
        >
          <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
            <Plus size={14} strokeWidth={2.5} className="text-white" />
          </div>
          <span className="text-[14px] font-semibold tracking-tight">Добавить задачу</span>
        </motion.button>
      </div>

      {/* Add Task sheet */}
      <AnimatePresence>
        {showAdd && (
          <AddSheet
            key="add-sheet"
            onClose={() => setShowAdd(false)}
            onAdd={handleAdd}
            defaultTab={activeTab}
          />
        )}
      </AnimatePresence>
    </>
  );
}
