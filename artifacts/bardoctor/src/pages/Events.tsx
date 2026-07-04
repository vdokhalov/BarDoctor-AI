import { useState, useMemo } from 'react';
import { useLocation } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search, Clock, X } from 'lucide-react';
import AppShell from '@/components/layout/AppShell';
import SafeArea from '@/components/layout/SafeArea';
import { useEvents } from '@/contexts/EventsContext';
import { groupByDate, formatTime, EventStatus, Priority, RestaurantEvent } from '@/store/events';
import { CATEGORY_CONFIG, PRIORITY_CONFIG, STATUS_CONFIG } from '@/config/eventCategories';
import { cn } from '@/lib/utils';

// ─── Filter tabs ──────────────────────────────────────────────────────────────

type FilterKey = 'all' | 'open' | 'critical' | 'resolved';

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all',      label: 'Все' },
  { key: 'open',     label: 'Открытые' },
  { key: 'critical', label: 'Критические' },
  { key: 'resolved', label: 'Решённые' },
];

function applyFilter(events: RestaurantEvent[], filter: FilterKey): RestaurantEvent[] {
  switch (filter) {
    case 'open':     return events.filter((e) => e.status === 'open' || e.status === 'in_progress');
    case 'critical': return events.filter((e) => e.priority === 'critical');
    case 'resolved': return events.filter((e) => e.status === 'resolved' || e.status === 'closed');
    default:         return events;
  }
}

// ─── Badge atoms ──────────────────────────────────────────────────────────────

function PriorityBadge({ priority }: { priority: Priority }) {
  const cfg = PRIORITY_CONFIG[priority];
  return (
    <span className={cn('text-[11px] font-semibold px-2 py-0.5 rounded-full', cfg.color, cfg.bg)}>
      {cfg.label}
    </span>
  );
}

function StatusBadge({ status }: { status: EventStatus }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span className={cn('text-[11px] font-semibold px-2 py-0.5 rounded-full', cfg.color, cfg.bg)}>
      {cfg.label}
    </span>
  );
}

// ─── Event card ───────────────────────────────────────────────────────────────

function EventCard({ event, onClick }: { event: RestaurantEvent; onClick: () => void }) {
  const cfg  = CATEGORY_CONFIG[event.category];
  const Icon = cfg.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      onClick={onClick}
      className="bg-card rounded-2xl border border-card-border shadow-[var(--shadow-card)] overflow-hidden cursor-pointer active:scale-[0.98] transition-transform"
    >
      {/* Top color accent line */}
      <div className="h-[3px] w-full" style={{ backgroundColor: cfg.color }} />

      <div className="px-4 pt-3.5 pb-4">
        {/* Category + time row */}
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-2">
            <div className={cn('w-6 h-6 rounded-[8px] flex items-center justify-center flex-shrink-0', cfg.iconBg)}>
              <Icon size={12} className={cfg.iconColor} />
            </div>
            <span className={cn('text-[12px] font-bold', cfg.iconColor)}>{cfg.label}</span>
          </div>
          <span className="text-[12px] text-muted-foreground font-medium">
            {formatTime(event.eventDate)}
          </span>
        </div>

        {/* Title */}
        <h3 className="text-[15px] font-bold text-foreground leading-snug mb-1">
          {event.title}
        </h3>

        {/* Extra field */}
        {event.extraField && (
          <p className="text-[12px] text-muted-foreground mb-1.5 font-medium">
            {event.extraField}
          </p>
        )}

        {/* Description */}
        {event.description && (
          <p className="text-[13px] text-muted-foreground leading-snug line-clamp-2 mb-3">
            {event.description}
          </p>
        )}

        {/* Badges + responsible */}
        <div className="flex items-center gap-2 flex-wrap">
          <PriorityBadge priority={event.priority} />
          <StatusBadge   status={event.status} />
          {event.responsible && (
            <span className="text-[11px] text-muted-foreground font-medium ml-auto">
              {event.responsible}
            </span>
          )}
        </div>

        {/* Attachments indicator */}
        {(event.photos.length > 0 || event.voiceNote) && (
          <div className="flex items-center gap-2.5 mt-3 pt-3 border-t border-border">
            {event.photos.length > 0 && (
              <div className="flex gap-1">
                {event.photos.slice(0, 3).map((src, i) => (
                  <img
                    key={i}
                    src={src}
                    alt=""
                    className="w-10 h-10 rounded-xl object-cover border border-border"
                  />
                ))}
              </div>
            )}
            {event.voiceNote && (
              <span className="text-[11px] font-medium text-muted-foreground bg-muted px-2.5 py-1 rounded-full">
                🎙 Голосовая заметка
              </span>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ─── Date group header ────────────────────────────────────────────────────────

function DateHeader({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 py-2">
      <span className="text-[13px] font-bold text-foreground">{label}</span>
      <div className="flex-1 h-px bg-border" />
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ filter, onAdd }: { filter: FilterKey; onAdd: () => void }) {
  const isFiltered = filter !== 'all';
  return (
    <div className="flex flex-col items-center text-center py-16 px-8">
      <div className="w-14 h-14 rounded-[18px] bg-muted flex items-center justify-center mb-4">
        <Clock size={24} className="text-muted-foreground/50" />
      </div>
      <p className="text-[16px] font-bold text-foreground mb-2">
        {isFiltered ? 'Нет событий по фильтру' : 'Событий пока нет'}
      </p>
      <p className="text-[13px] text-muted-foreground leading-relaxed max-w-[220px] mb-6">
        {isFiltered
          ? 'Попробуйте выбрать другой фильтр или снять его.'
          : 'Начните фиксировать события ресторана — каждая запись помогает AI понять ваш бизнес.'}
      </p>
      {!isFiltered && (
        <button
          type="button"
          onClick={onAdd}
          className="flex items-center gap-1.5 px-5 py-2.5 bg-primary text-white rounded-2xl text-[13px] font-semibold shadow-[0_4px_14px_rgba(91,92,235,0.24)] hover:opacity-90 active:scale-[0.97] transition-all"
        >
          <Plus size={14} />
          Добавить первое событие
        </button>
      )}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function Events() {
  const { events }           = useEvents();
  const [, setLocation]      = useLocation();
  const [filter, setFilter]  = useState<FilterKey>('all');
  const [search, setSearch]  = useState('');

  const filtered = useMemo(() => {
    let list = applyFilter(events, filter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (e) =>
          e.title.toLowerCase().includes(q) ||
          e.description.toLowerCase().includes(q) ||
          e.extraField.toLowerCase().includes(q) ||
          CATEGORY_CONFIG[e.category].label.toLowerCase().includes(q),
      );
    }
    return list;
  }, [events, filter, search]);

  const groups = useMemo(() => groupByDate(filtered), [filtered]);

  return (
    <AppShell showBottomNav>
      <SafeArea className="pt-5 pb-32">

        {/* ── Header ── */}
        <div className="px-6 flex items-center justify-between mb-5">
          <div>
            <h1 className="text-[24px] font-black text-foreground tracking-tight">События</h1>
            {events.length > 0 && (
              <p className="text-[13px] text-muted-foreground mt-0.5">
                {events.length} {events.length === 1 ? 'запись' : events.length < 5 ? 'записи' : 'записей'}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => setLocation('/add')}
            className="w-10 h-10 bg-primary rounded-full flex items-center justify-center shadow-[var(--shadow-fab)] active:scale-95 transition-transform"
          >
            <Plus size={18} className="text-white" />
          </button>
        </div>

        {/* ── Search ── */}
        <div className="px-6 mb-4">
          <div className="relative">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              placeholder="Поиск по событиям…"
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
        <div className="px-6 mb-5 flex gap-2 overflow-x-auto scrollbar-none -mx-0">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={cn(
                'px-4 py-2 rounded-full text-[13px] font-semibold whitespace-nowrap transition-all flex-shrink-0',
                filter === f.key
                  ? 'bg-primary text-white shadow-[0_2px_10px_rgba(91,92,235,0.28)]'
                  : 'bg-card border border-border text-foreground hover:border-primary/40',
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* ── Timeline ── */}
        <div className="px-6">
          <AnimatePresence mode="popLayout">
            {groups.length === 0 ? (
              <EmptyState key="empty" filter={filter} onAdd={() => setLocation('/add')} />
            ) : (
              groups.map((group) => (
                <div key={group.key} className="mb-6">
                  <DateHeader label={group.label} />
                  <div className="flex flex-col gap-3 mt-2">
                    {group.items.map((ev) => (
                      <EventCard key={ev.id} event={ev} onClick={() => setLocation(`/events/${ev.id}`)} />
                    ))}
                  </div>
                </div>
              ))
            )}
          </AnimatePresence>
        </div>

      </SafeArea>
    </AppShell>
  );
}
