import { useMemo } from 'react';
import { useLocation } from 'wouter';
import {
  Bell, Sparkles, Plus, CheckSquare, Wrench,
  Clock, ChevronRight, ArrowRight,
} from 'lucide-react';
import { motion } from 'framer-motion';
import AppShell from '@/components/layout/AppShell';
import SafeArea from '@/components/layout/SafeArea';
import { useRestaurant } from '@/contexts/RestaurantContext';
import { useEvents } from '@/contexts/EventsContext';
import { formatRelative } from '@/store/events';
import { CATEGORY_CONFIG, PRIORITY_CONFIG } from '@/config/eventCategories';

// ─── Animation ────────────────────────────────────────────────────────────────

const rise = {
  hidden: { opacity: 0, y: 16 },
  show: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.08, duration: 0.42, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

// ─── 1. Health Score card ─────────────────────────────────────────────────────

const ARC_R  = 52;
const ARC_CX = 72;
const ARC_CY = 72;
const CIRC   = 2 * Math.PI * ARC_R;
const ARC270 = (270 / 360) * CIRC;

function GaugeArc({ eventCount }: { eventCount: number }) {
  // Fill grows from 0 to ~40% as the user adds their first events (max at 20)
  const fillFraction = Math.min(eventCount / 20, 1) * 0.4;
  const fillLength   = ARC270 * fillFraction;

  return (
    <svg width="144" height="144" viewBox="0 0 144 144" fill="none" aria-hidden>
      {/* Track */}
      <circle
        cx={ARC_CX} cy={ARC_CY} r={ARC_R}
        stroke="rgba(255,255,255,0.10)" strokeWidth="8" strokeLinecap="round" fill="none"
        strokeDasharray={`${ARC270} ${CIRC}`}
        transform={`rotate(135 ${ARC_CX} ${ARC_CY})`}
      />
      {/* Fill (grows with data) */}
      {fillLength > 0 && (
        <motion.circle
          cx={ARC_CX} cy={ARC_CY} r={ARC_R}
          stroke="rgba(91,92,235,0.8)" strokeWidth="8" strokeLinecap="round" fill="none"
          strokeDasharray={`${fillLength} ${CIRC}`}
          strokeDashoffset={0}
          transform={`rotate(135 ${ARC_CX} ${ARC_CY})`}
          initial={{ strokeDasharray: `0 ${CIRC}` }}
          animate={{ strokeDasharray: `${fillLength} ${CIRC}` }}
          transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
        />
      )}
      {/* Pulse shimmer when no data */}
      {fillLength === 0 && (
        <motion.circle
          cx={ARC_CX} cy={ARC_CY} r={ARC_R}
          stroke="rgba(91,92,235,0.45)" strokeWidth="8" strokeLinecap="round" fill="none"
          strokeDasharray={`${ARC270} ${CIRC}`}
          transform={`rotate(135 ${ARC_CX} ${ARC_CY})`}
          animate={{ opacity: [0.35, 0.75, 0.35] }}
          transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}
      {/* Center: dash or event count */}
      <text x={ARC_CX} y={ARC_CY - 6} textAnchor="middle" dominantBaseline="middle"
        fontSize="28" fontWeight="800" fill="rgba(255,255,255,0.9)"
        fontFamily="-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif">
        {eventCount > 0 ? eventCount : '—'}
      </text>
      <text x={ARC_CX} y={ARC_CY + 18} textAnchor="middle" dominantBaseline="middle"
        fontSize="10" fontWeight="600" fill="rgba(255,255,255,0.40)" letterSpacing="0.04em"
        fontFamily="-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif">
        {eventCount > 0 ? 'СОБЫТИЙ' : 'СБОР ДАННЫХ'}
      </text>
    </svg>
  );
}

function HealthCard({ eventCount }: { eventCount: number }) {
  const label = eventCount === 0 ? 'Калибровка' : `${eventCount} ${eventCount === 1 ? 'событие' : eventCount < 5 ? 'события' : 'событий'}`;
  return (
    <div
      className="rounded-[24px] overflow-hidden relative"
      style={{
        background: 'linear-gradient(160deg, #1A1F38 0%, #161B2E 55%, #1D1440 100%)',
        boxShadow: '0 8px 32px rgba(22,27,46,0.28), 0 2px 8px rgba(22,27,46,0.14)',
      }}
    >
      <div aria-hidden className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(91,92,235,0.18) 0%, transparent 70%)' }} />

      <div className="relative z-10 px-6 pt-6 pb-5">
        <div className="flex items-center justify-between mb-5">
          <p className="text-[12px] font-bold uppercase tracking-widest text-white/40">Здоровье заведения</p>
          <span className="text-[11px] font-semibold bg-white/8 text-white/50 px-2.5 py-1 rounded-full border border-white/10">
            {label}
          </span>
        </div>
        <div className="flex flex-col items-center">
          <GaugeArc eventCount={eventCount} />
          <p className="text-[13px] text-white/45 font-medium text-center mt-3 max-w-[220px] leading-snug">
            {eventCount === 0
              ? 'Добавьте первые события, чтобы BarDoctor рассчитал балл здоровья'
              : 'Продолжайте добавлять события для точного анализа'}
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── 2. Today's Focus ─────────────────────────────────────────────────────────

function getTodayFocus(hour: number, eventCount: number): { headline: string; body: string } {
  if (eventCount === 0) return {
    headline: 'Начните вести историю ресторана.',
    body: 'Добавьте первое событие — поломку, жалобу гостя, идею или что-то ещё. BarDoctor запомнит всё.',
  };
  if (hour >= 5  && hour < 12) return {
    headline: 'Проверьте оборудование при открытии.',
    body: 'Утренний осмотр помогает предотвратить инциденты. Зафиксируйте любые отклонения.',
  };
  if (hour >= 12 && hour < 16) return {
    headline: 'Зафиксируйте события первой половины дня.',
    body: 'Обеденная смена — источник данных для AI. Каждое событие делает анализ точнее.',
  };
  if (hour >= 16 && hour < 21) return {
    headline: 'Оцените состояние команды перед вечерней сменой.',
    body: 'Конфликты и замечания, зафиксированные сейчас, помогут AI выявить паттерны.',
  };
  return {
    headline: 'Подведите итоги дня перед закрытием.',
    body: 'Вечерние записи — самые ценные. Пока детали свежи, добавьте ключевые события дня.',
  };
}

function FocusCard({ hour, eventCount, onAdd }: { hour: number; eventCount: number; onAdd: () => void }) {
  const { headline, body } = getTodayFocus(hour, eventCount);
  return (
    <div className="bd-card overflow-hidden relative">
      <div className="absolute left-0 top-4 bottom-4 w-[3px] rounded-full bg-primary" aria-hidden />
      <div className="px-5 py-4 pl-6">
        <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Сегодняшний приоритет</p>
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-[15px] font-bold text-foreground leading-snug mb-1.5">{headline}</p>
            <p className="text-[13px] text-muted-foreground leading-relaxed">{body}</p>
          </div>
          <div className="w-9 h-9 rounded-[12px] bg-primary/8 flex items-center justify-center flex-shrink-0 mt-0.5">
            <Sparkles size={16} className="text-primary" />
          </div>
        </div>
        <button
          type="button"
          onClick={onAdd}
          className="mt-3.5 flex items-center gap-1 text-[13px] font-semibold text-primary hover:opacity-75 active:opacity-60 transition-opacity"
        >
          Добавить событие <ChevronRight size={14} className="mt-px" />
        </button>
      </div>
    </div>
  );
}

// ─── 3. Quick Actions ─────────────────────────────────────────────────────────

const ACTIONS = [
  { label: 'Событие',      sublabel: 'Записать',    icon: Plus,        iconBg: 'bg-primary',         iconColor: 'text-white',            href: '/add'       },
  { label: 'Задача',       sublabel: 'Создать',     icon: CheckSquare, iconBg: 'bg-foreground',      iconColor: 'text-white',            href: '/tasks'     },
  { label: 'Спросить AI',  sublabel: 'BarDoctor',   icon: Sparkles,    iconBg: 'bg-[#5B5CEB]',       iconColor: 'text-white',            href: '/analysis'  },
  { label: 'Оборудование', sublabel: 'Добавить',    icon: Wrench,      iconBg: 'bg-[#22C55E]/15',    iconColor: 'text-[#16A34A]',        href: '/equipment' },
] as const;

function QuickActions({ onNavigate }: { onNavigate: (href: string) => void }) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground px-1">
        Быстрые действия
      </p>
      <div className="grid grid-cols-2 gap-3">
        {ACTIONS.map((a) => (
          <motion.button
            key={a.label}
            type="button"
            onClick={() => onNavigate(a.href)}
            whileTap={{ scale: 0.97 }}
            className="bd-card p-4 flex flex-col items-start gap-3 text-left hover:shadow-[var(--shadow-elevated)] transition-shadow"
          >
            <div className={`w-9 h-9 rounded-[11px] flex items-center justify-center flex-shrink-0 ${a.iconBg}`}>
              <a.icon size={16} className={a.iconColor} />
            </div>
            <div>
              <p className="text-[14px] font-bold text-foreground leading-tight">{a.label}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{a.sublabel}</p>
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
}

// ─── 4. Recent Activity ───────────────────────────────────────────────────────

function ActivitySection({ onAdd, onViewAll }: { onAdd: () => void; onViewAll: () => void }) {
  const { events } = useEvents();
  const recent = useMemo(() => events.slice(0, 5), [events]);
  const hasEvents = recent.length > 0;

  return (
    <div className="flex flex-col gap-3">
      {/* Section header */}
      <div className="flex items-center justify-between px-1">
        <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
          Последние события
        </p>
        {hasEvents && (
          <button
            type="button"
            onClick={onViewAll}
            className="flex items-center gap-1 text-[12px] font-semibold text-primary hover:opacity-75 transition-opacity"
          >
            Все <ArrowRight size={12} />
          </button>
        )}
      </div>

      {hasEvents ? (
        <div className="bg-card rounded-2xl border border-card-border shadow-[var(--shadow-card)] overflow-hidden divide-y divide-border">
          {recent.map((ev, i) => {
            const cfg  = CATEGORY_CONFIG[ev.category];
            const Icon = cfg.icon;
            const pri  = PRIORITY_CONFIG[ev.priority];
            return (
              <motion.button
                key={ev.id}
                type="button"
                onClick={onViewAll}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05, duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                className="w-full flex items-start gap-3 px-4 py-3.5 text-left hover:bg-muted/50 transition-colors"
              >
                {/* Category dot */}
                <div className={`w-7 h-7 rounded-[9px] flex items-center justify-center flex-shrink-0 mt-0.5 ${cfg.iconBg}`}>
                  <Icon size={13} className={cfg.iconColor} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-[13px] font-semibold text-foreground leading-snug line-clamp-1 flex-1">
                      {ev.title}
                    </p>
                    <span className="text-[11px] text-muted-foreground flex-shrink-0">
                      {formatRelative(ev.eventDate)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className={`text-[11px] font-medium ${pri.color}`}>
                      {pri.label}
                    </span>
                    <span className="text-muted-foreground text-[10px]">·</span>
                    <span className="text-[11px] text-muted-foreground">{cfg.label}</span>
                  </div>
                </div>
              </motion.button>
            );
          })}
        </div>
      ) : (
        /* Empty state */
        <div className="bd-card px-5 py-8 flex flex-col items-center text-center">
          <div className="w-11 h-11 rounded-[14px] bg-muted flex items-center justify-center mb-4">
            <Clock size={20} className="text-muted-foreground/50" />
          </div>
          <p className="text-[15px] font-bold text-foreground mb-1.5">Событий пока нет</p>
          <p className="text-[13px] text-muted-foreground leading-relaxed max-w-[220px] mb-5">
            Начните с записи первого события в вашем ресторане — это займёт меньше минуты.
          </p>
          <button
            type="button"
            onClick={onAdd}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-primary/8 text-primary rounded-2xl text-[13px] font-semibold hover:bg-primary/14 active:scale-[0.97] transition-all"
          >
            <Plus size={14} />
            Добавить событие
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function Home() {
  const { profile }        = useRestaurant();
  const { events }         = useEvents();
  const [, setLocation]    = useLocation();

  const restaurantName = profile?.name ?? '';
  const hour = new Date().getHours();
  const greeting =
    hour >= 5  && hour < 12 ? 'Доброе утро'  :
    hour >= 12 && hour < 17 ? 'Добрый день'  :
    hour >= 17 && hour < 22 ? 'Добрый вечер' : 'Доброй ночи';

  return (
    <AppShell showBottomNav>
      <SafeArea className="pt-5 pb-36">
        <div className="px-6 flex flex-col gap-6">

          {/* ── Header ── */}
          <motion.div
            custom={0} variants={rise} initial="hidden" animate="show"
            className="flex items-start justify-between"
          >
            <div>
              <h1 className="text-[24px] font-black text-foreground tracking-tight leading-tight">
                {greeting}.
              </h1>
              {restaurantName && (
                <button
                  type="button"
                  onClick={() => setLocation('/more')}
                  className="mt-1.5 text-[14px] font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  {restaurantName}
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={() => setLocation('/notifications')}
              className="w-10 h-10 bg-card border border-border rounded-full flex items-center justify-center shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-elevated)] active:scale-[0.94] transition-all mt-0.5"
            >
              <Bell size={17} className="text-foreground" />
            </button>
          </motion.div>

          {/* ── Health Score ── */}
          <motion.div custom={1} variants={rise} initial="hidden" animate="show">
            <HealthCard eventCount={events.length} />
          </motion.div>

          {/* ── Today's Focus ── */}
          <motion.div custom={2} variants={rise} initial="hidden" animate="show">
            <FocusCard
              hour={hour}
              eventCount={events.length}
              onAdd={() => setLocation('/add')}
            />
          </motion.div>

          {/* ── Quick Actions ── */}
          <motion.div custom={3} variants={rise} initial="hidden" animate="show">
            <QuickActions onNavigate={setLocation} />
          </motion.div>

          {/* ── Activity Timeline ── */}
          <motion.div custom={4} variants={rise} initial="hidden" animate="show">
            <ActivitySection
              onAdd={() => setLocation('/add')}
              onViewAll={() => setLocation('/events')}
            />
          </motion.div>

        </div>
      </SafeArea>
    </AppShell>
  );
}
