import { useLocation } from 'wouter';
import {
  Bell, ChevronDown, Store, Sparkles,
  Wrench, MessageCircle, Users, Lightbulb,
  CalendarClock, Package, Truck,
} from 'lucide-react';
import { motion } from 'framer-motion';
import AppShell from '@/components/layout/AppShell';
import SafeArea from '@/components/layout/SafeArea';
import { useRestaurant } from '@/contexts/RestaurantContext';

// ─── Animation ────────────────────────────────────────────────────────────────

const fadeUp = {
  hidden:   { opacity: 0, y: 14 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.07, duration: 0.38, ease: [0.22, 1, 0.36, 1] as [number,number,number,number] },
  }),
};

// ─── Event example chips ──────────────────────────────────────────────────────

const EXAMPLES = [
  { label: 'Поломка оборудования', icon: Wrench },
  { label: 'Жалоба гостя',         icon: MessageCircle },
  { label: 'Конфликт',             icon: Users },
  { label: 'Идея',                 icon: Lightbulb },
  { label: 'Обслуживание',         icon: CalendarClock },
  { label: 'Инвентарь',           icon: Package },
  { label: 'Вопрос поставщика',    icon: Truck },
];

// ─── Teaching card ────────────────────────────────────────────────────────────

function TeachingCard({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="bd-card overflow-hidden relative">

      {/* Purple glow layer */}
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-48 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 80% 100% at 50% -10%, rgba(91,92,235,0.11) 0%, transparent 72%)',
        }}
      />

      {/* Top section */}
      <div className="relative z-10 flex flex-col items-center text-center px-6 pt-8 pb-6">

        {/* Icon cluster */}
        <motion.div
          initial={{ scale: 0.82, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.52, ease: [0.22, 1, 0.36, 1] }}
          className="relative mb-6"
        >
          {/* Outer glow ring */}
          <div className="absolute inset-0 rounded-full"
            style={{ boxShadow: '0 0 0 12px rgba(91,92,235,0.06), 0 0 0 24px rgba(91,92,235,0.03)' }} />

          {/* Core icon */}
          <div
            className="w-[68px] h-[68px] rounded-[22px] flex items-center justify-center relative"
            style={{
              background: 'linear-gradient(145deg, #161B2E 0%, #252D4A 100%)',
              boxShadow: '0 8px 28px rgba(22,27,46,0.22), 0 2px 6px rgba(22,27,46,0.12)',
            }}
          >
            {/* BarDoctor mark */}
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <rect x="14" y="5" width="4" height="22" rx="2" fill="white" fillOpacity="0.9" />
              <rect x="5" y="14" width="22" height="4" rx="2" fill="white" fillOpacity="0.9" />
              <circle cx="16" cy="16" r="4" fill="#5B5CEB" />
              {/* Pulse dot top-right */}
              <circle cx="25" cy="7" r="3" fill="#22C55E" />
            </svg>
          </div>
        </motion.div>

        {/* Headline */}
        <motion.h2
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="text-[22px] font-black text-foreground tracking-tight leading-tight mb-3"
        >
          Начните обучать BarDoctor
        </motion.h2>

        {/* Body text */}
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
          className="text-[14px] text-muted-foreground leading-relaxed max-w-[270px] mb-7"
        >
          Каждое событие помогает AI глубже понять ваш ресторан — и давать точные, своевременные советы.
        </motion.p>

        {/* Primary CTA */}
        <motion.button
          type="button"
          onClick={onAdd}
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.28, duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
          whileTap={{ scale: 0.97 }}
          className="w-full h-14 rounded-2xl flex items-center justify-center gap-2.5 text-[16px] font-bold text-white tracking-tight"
          style={{
            background: 'linear-gradient(135deg, #5B5CEB 0%, #7B7CF0 100%)',
            boxShadow: '0 6px 24px rgba(91,92,235,0.36), 0 2px 6px rgba(91,92,235,0.18)',
          }}
        >
          <div className="w-6 h-6 rounded-full bg-white/15 flex items-center justify-center flex-shrink-0">
            <span className="text-[14px]">+</span>
          </div>
          Добавить первое событие
        </motion.button>
      </div>

      {/* Divider */}
      <div className="h-px bg-border mx-6" />

      {/* Event examples */}
      <div className="px-5 pt-4 pb-5">
        <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-3 px-1">
          Что можно добавить
        </p>
        <div className="flex flex-wrap gap-2">
          {EXAMPLES.map(({ label, icon: Icon }, i) => (
            <motion.button
              key={label}
              type="button"
              onClick={onAdd}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + i * 0.04, duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              whileTap={{ scale: 0.96 }}
              className="flex items-center gap-1.5 pl-2.5 pr-3.5 py-2 bg-muted hover:bg-border/70 active:bg-border rounded-full transition-colors"
            >
              <Icon size={13} className="text-muted-foreground flex-shrink-0" />
              <span className="text-[13px] font-medium text-foreground">{label}</span>
            </motion.button>
          ))}
        </div>
      </div>

    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function Home() {
  const { profile } = useRestaurant();
  const [, setLocation] = useLocation();

  const restaurantName = profile?.name ?? '';
  const hour    = new Date().getHours();
  const greeting = hour < 12 ? 'Доброе утро' : hour < 17 ? 'Добрый день' : 'Добрый вечер';

  return (
    <AppShell showBottomNav>
      <SafeArea className="pt-5 pb-36">
        <div className="px-6 flex flex-col gap-0">

          {/* ── Header ── */}
          <motion.div
            custom={0} variants={fadeUp} initial="hidden" animate="visible"
            className="flex items-start justify-between mb-6"
          >
            <div>
              <h1 className="text-[22px] font-bold text-foreground tracking-tight leading-tight">
                {greeting} 👋
              </h1>
              <button
                type="button"
                onClick={() => setLocation('/more')}
                className="flex items-center gap-1.5 mt-2 pl-2.5 pr-3 py-1.5 bg-muted rounded-full hover:bg-border/60 transition-colors active:scale-[0.97]"
              >
                <Store size={13} className="text-muted-foreground" />
                <span className="text-[13px] font-semibold text-foreground">
                  {restaurantName || 'Моё заведение'}
                </span>
                <ChevronDown size={13} className="text-muted-foreground" />
              </button>
            </div>
            <button
              type="button"
              onClick={() => setLocation('/notifications')}
              className="relative w-10 h-10 bg-card border border-border rounded-full flex items-center justify-center shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-elevated)] active:scale-[0.94] transition-all"
            >
              <Bell size={18} className="text-foreground" />
            </button>
          </motion.div>

          {/* ── Teaching card ── */}
          <motion.div custom={1} variants={fadeUp} initial="hidden" animate="visible">
            <TeachingCard onAdd={() => setLocation('/add')} />
          </motion.div>

        </div>
      </SafeArea>

      {/* ── Floating AI pill ── */}
      <div className="fixed bottom-[92px] left-0 right-0 flex justify-center z-40 pointer-events-none">
        <motion.button
          type="button"
          onClick={() => setLocation('/analysis')}
          initial={{ opacity: 0, y: 12, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: 0.45, duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
          className="pointer-events-auto flex items-center gap-2.5 pl-4 pr-5 py-3 bg-foreground text-white rounded-full shadow-[0_8px_32px_rgba(22,27,46,0.28),0_2px_8px_rgba(22,27,46,0.14)] hover:opacity-90 active:scale-[0.97] transition-all"
        >
          <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
            <Sparkles size={13} className="text-white" />
          </div>
          <span className="text-[14px] font-semibold tracking-tight">Спросить BarDoctor</span>
        </motion.button>
      </div>
    </AppShell>
  );
}
