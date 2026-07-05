import { useState, useMemo } from 'react';
import { useLocation } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Search, X, FolderOpen, ArrowUpDown, ChevronRight,
  AlertCircle, Camera, Paperclip, MessageSquare,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCases } from '@/contexts/CasesContext';
import { Case, CaseStatus, sortCases, sortByDate, sortByDeadline, isOverdue, formatDue } from '@/store/cases';
import {
  CASE_TYPE_CONFIG, CASE_PRIORITY_CONFIG, CASE_STATUS_CONFIG,
  CASE_STATUSES,
} from '@/config/caseCategories';
import AppShell from '@/components/layout/AppShell';
import SafeArea from '@/components/layout/SafeArea';

// ─── Sort ─────────────────────────────────────────────────────────────────────

type SortKey = 'date' | 'priority' | 'deadline';
const SORTS: { key: SortKey; label: string }[] = [
  { key: 'date',     label: 'По дате' },
  { key: 'priority', label: 'По приоритету' },
  { key: 'deadline', label: 'По дедлайну' },
];

function applySort(cases: Case[], sort: SortKey): Case[] {
  switch (sort) {
    case 'priority': return sortCases(cases);
    case 'deadline': return sortByDeadline(cases);
    default:         return sortByDate(cases);
  }
}

// ─── Filter ───────────────────────────────────────────────────────────────────

type FilterKey = 'all' | CaseStatus;

const FILTER_TABS: { key: FilterKey; label: string }[] = [
  { key: 'all',         label: 'Все' },
  { key: 'open',        label: 'Открытые' },
  { key: 'in_progress', label: 'В работе' },
  { key: 'waiting',     label: 'Ожидание' },
  { key: 'resolved',    label: 'Решённые' },
  { key: 'closed',      label: 'Закрытые' },
];

// ─── Premium Case Card ────────────────────────────────────────────────────────

function CaseCard({ c, onTap }: { c: Case; onTap: () => void }) {
  const typeCfg = CASE_TYPE_CONFIG[c.type];
  const priCfg  = CASE_PRIORITY_CONFIG[c.priority];
  const stsCfg  = CASE_STATUS_CONFIG[c.status];
  const Icon    = typeCfg.icon;
  const overdue = isOverdue(c.dueDate) && !['resolved', 'closed'].includes(c.status);

  return (
    <motion.button
      type="button"
      onClick={onTap}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      whileTap={{ scale: 0.985 }}
      className="w-full text-left flex bg-card rounded-2xl shadow-[var(--shadow-card)] overflow-hidden border border-card-border hover:shadow-[var(--shadow-elevated)] transition-shadow"
    >
      {/* Priority left bar */}
      <div
        className="w-1 flex-shrink-0 self-stretch"
        style={{ backgroundColor: priCfg.borderColor }}
      />

      {/* Content */}
      <div className="flex-1 min-w-0 px-4 py-3.5">

        {/* Row 1: type + priority */}
        <div className="flex items-center justify-between gap-2 mb-2.5">
          <div className="flex items-center gap-2">
            <div className={cn('w-6 h-6 rounded-[7px] flex items-center justify-center flex-shrink-0', typeCfg.iconBg)}>
              <Icon size={12} className={typeCfg.iconColor} />
            </div>
            <span className={cn('text-[12px] font-bold', typeCfg.iconColor)}>{typeCfg.label}</span>
          </div>
          <span className={cn('text-[11px] font-bold px-2 py-0.5 rounded-full flex-shrink-0', priCfg.color, priCfg.bg)}>
            {priCfg.label}
          </span>
        </div>

        {/* Row 2: title */}
        <h3 className="text-[15px] font-bold text-foreground leading-snug line-clamp-2 mb-1.5">
          {c.title}
        </h3>

        {/* Row 3: description */}
        {c.description ? (
          <p className="text-[13px] text-muted-foreground leading-snug line-clamp-1 mb-3">
            {c.description}
          </p>
        ) : <div className="mb-3" />}

        {/* Row 4: status + meta */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className={cn('text-[11px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1', stsCfg.color, stsCfg.bg)}>
            <span className={cn('w-1.5 h-1.5 rounded-full', stsCfg.dot)} />
            {stsCfg.label}
          </span>

          {c.responsible && (
            <span className="text-[12px] text-muted-foreground font-medium">{c.responsible}</span>
          )}

          <div className="ml-auto flex items-center gap-1">
            {overdue && <AlertCircle size={11} className="text-destructive" />}
            {c.dueDate && (
              <span className={cn('text-[12px] font-semibold', overdue ? 'text-destructive' : 'text-muted-foreground')}>
                {overdue ? 'Просрочено' : `До ${formatDue(c.dueDate)}`}
              </span>
            )}
            <ChevronRight size={14} className="text-muted-foreground/40 ml-1" />
          </div>
        </div>

        {/* Attachments indicator */}
        {(c.photos.length > 0 || c.files.length > 0 || c.comments.length > 0) && (
          <div className="flex items-center gap-3 mt-2.5 pt-2.5 border-t border-border">
            {c.photos.length > 0 && (
              <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <Camera size={11} className="opacity-60" /> {c.photos.length}
              </span>
            )}
            {c.files.length > 0 && (
              <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <Paperclip size={11} className="opacity-60" /> {c.files.length}
              </span>
            )}
            {c.comments.length > 0 && (
              <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <MessageSquare size={11} className="opacity-60" /> {c.comments.length}
              </span>
            )}
          </div>
        )}
      </div>
    </motion.button>
  );
}

// ─── Empty states ─────────────────────────────────────────────────────────────

function EmptyAll({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center text-center px-8 pt-14 pb-8">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 220, damping: 20 }}
        className="w-20 h-20 rounded-[24px] bg-primary/8 flex items-center justify-center mb-5"
      >
        <FolderOpen size={34} className="text-primary" />
      </motion.div>
      <motion.h2
        initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="text-[20px] font-black text-foreground tracking-tight mb-2"
      >
        Дел пока нет
      </motion.h2>
      <motion.p
        initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }}
        className="text-[14px] text-muted-foreground leading-relaxed max-w-[240px] mb-8"
      >
        Каждая важная ситуация становится Делом. Отслеживайте, решайте, анализируйте.
      </motion.p>
      <motion.button
        initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22 }}
        type="button" onClick={onAdd}
        className="flex items-center gap-2 px-6 py-3.5 bg-primary text-white rounded-2xl text-[15px] font-bold shadow-[0_4px_20px_rgba(91,92,235,0.30)] hover:opacity-90 active:scale-[0.97] transition-all"
      >
        <Plus size={16} />
        Создать первое дело
      </motion.button>
    </div>
  );
}

function EmptyFiltered({ onClear }: { onClear: () => void }) {
  return (
    <div className="flex flex-col items-center text-center py-14 px-8">
      <div className="w-12 h-12 rounded-[16px] bg-muted flex items-center justify-center mb-4">
        <FolderOpen size={20} className="text-muted-foreground/50" />
      </div>
      <p className="text-[15px] font-bold text-foreground mb-1.5">Нет дел по фильтру</p>
      <p className="text-[13px] text-muted-foreground mb-5">Попробуйте другой статус или очистите поиск.</p>
      <button type="button" onClick={onClear}
        className="text-[13px] font-semibold text-primary hover:opacity-75 transition-opacity">
        Сбросить фильтры
      </button>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function Cases() {
  const { cases }       = useCases();
  const [, setLocation] = useLocation();
  const [filter, setFilter] = useState<FilterKey>('all');
  const [search, setSearch] = useState('');
  const [sortIdx, setSortIdx] = useState(0);
  const sort = SORTS[sortIdx].key;

  const filtered = useMemo(() => {
    let list = filter === 'all' ? cases : cases.filter((c) => c.status === filter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((c) =>
        c.title.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q) ||
        c.responsible.toLowerCase().includes(q) ||
        CASE_TYPE_CONFIG[c.type].label.toLowerCase().includes(q),
      );
    }
    return applySort(list, sort);
  }, [cases, filter, search, sort]);

  const counts = useMemo(() => {
    const base: Record<string, number> = { all: cases.length };
    CASE_STATUSES.forEach((s) => { base[s] = cases.filter((c) => c.status === s).length; });
    return base;
  }, [cases]);

  const hasAny = cases.length > 0;

  return (
    <AppShell showBottomNav>
      <SafeArea className="pt-0 pb-28">

        {/* ── Sticky header ── */}
        <div className="sticky top-0 z-20 bg-[#F8F9FC]/95 backdrop-blur-md border-b border-border/60">
          <div className="px-6 pt-5 pb-3">

            {/* Title row */}
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-[24px] font-black text-foreground tracking-tight">Дела</h1>
                {hasAny && (
                  <p className="text-[13px] text-muted-foreground mt-0.5">
                    {cases.length} {cases.length === 1 ? 'дело' : cases.length < 5 ? 'дела' : 'дел'}
                  </p>
                )}
              </div>
              {hasAny && (
                <motion.button
                  whileTap={{ scale: 0.90 }}
                  type="button"
                  onClick={() => setLocation('/cases/add')}
                  className="w-10 h-10 bg-primary rounded-full flex items-center justify-center shadow-[var(--shadow-fab)]"
                >
                  <Plus size={18} className="text-white" />
                </motion.button>
              )}
            </div>

            {/* Search + Sort + Filter — shown only when there are cases */}
            {hasAny && (
              <>
                <div className="flex gap-2 mb-3">
                  <div className="relative flex-1">
                    <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Поиск по делам…"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="w-full h-10 bg-card border border-border rounded-2xl pl-9 pr-9 text-[14px] font-medium text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/12 transition-all"
                    />
                    {search && (
                      <button type="button" onClick={() => setSearch('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                        <X size={14} />
                      </button>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setSortIdx((i) => (i + 1) % SORTS.length)}
                    className="h-10 px-3 bg-card border border-border rounded-2xl flex items-center gap-1.5 text-[12px] font-semibold text-foreground whitespace-nowrap hover:border-primary/40 transition-colors"
                  >
                    <ArrowUpDown size={12} className="text-muted-foreground" />
                    {SORTS[sortIdx].label}
                  </button>
                </div>

                {/* Filter tabs */}
                <div className="flex gap-2 overflow-x-auto no-scrollbar">
                  {FILTER_TABS.map((f) => {
                    const count = counts[f.key] ?? 0;
                    return (
                      <button key={f.key} type="button" onClick={() => setFilter(f.key)}
                        className={cn(
                          'flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[13px] font-semibold whitespace-nowrap transition-all flex-shrink-0',
                          filter === f.key
                            ? 'bg-primary text-white shadow-[0_2px_10px_rgba(91,92,235,0.28)]'
                            : 'bg-card border border-border text-foreground hover:border-primary/40',
                        )}
                      >
                        {f.label}
                        {count > 0 && (
                          <span className={cn('text-[11px] font-bold px-1.5 py-0.5 rounded-full',
                            filter === f.key ? 'bg-white/20 text-white' : 'bg-muted text-muted-foreground')}>
                            {count}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>

        {/* ── Content ── */}
        {!hasAny ? (
          <EmptyAll onAdd={() => setLocation('/cases/add')} />
        ) : (
          <div className="px-6 pt-4 pb-4 flex flex-col gap-3">
            <AnimatePresence mode="popLayout">
              {filtered.length > 0
                ? filtered.map((c) => (
                    <CaseCard
                      key={c.id}
                      c={c}
                      onTap={() => setLocation(`/cases/${c.id}`)}
                    />
                  ))
                : <EmptyFiltered key="empty" onClear={() => { setFilter('all'); setSearch(''); }} />
              }
            </AnimatePresence>
          </div>
        )}

      </SafeArea>
    </AppShell>
  );
}
