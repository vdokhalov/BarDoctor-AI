import { useLocation } from 'wouter';
import {
  Bell, ChevronDown, Store, Sparkles,
  ShieldAlert, TrendingUp, Activity,
  Wrench, CheckSquare, ChevronRight,
} from 'lucide-react';
import { motion } from 'framer-motion';
import AppShell from '@/components/layout/AppShell';
import SafeArea from '@/components/layout/SafeArea';
import { useRestaurant } from '@/contexts/RestaurantContext';
import { cn } from '@/lib/utils';

// ─── Animation ────────────────────────────────────────────────────────────────

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.08, duration: 0.4, ease: [0.22, 1, 0.36, 1] as [number,number,number,number] },
  }),
};

// ─── Welcome hero ─────────────────────────────────────────────────────────────

function WelcomeCard({ name, onEquipment, onTasks }: {
  name: string;
  onEquipment: () => void;
  onTasks: () => void;
}) {
  return (
    <div className="bd-card p-6 flex flex-col items-center text-center relative overflow-hidden">
      {/* Glow */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at 50% 0%, rgba(91,92,235,0.07) 0%, transparent 70%)',
        }}
      />

      {/* Icon */}
      <div className="w-14 h-14 rounded-[18px] bg-foreground flex items-center justify-center mb-4 shadow-[0_4px_20px_rgba(22,27,46,0.16)] relative z-10">
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
          <rect x="12.5" y="4" width="3" height="20" rx="1.5" fill="white" />
          <rect x="4" y="12.5" width="20" height="3" rx="1.5" fill="white" />
          <circle cx="14" cy="14" r="3" fill="#5B5CEB" />
        </svg>
      </div>

      <h2 className="text-[20px] font-black text-foreground tracking-tight mb-2 relative z-10">
        Добро пожаловать в BarDoctor
      </h2>
      <p className="text-[14px] text-muted-foreground leading-relaxed mb-6 max-w-[260px] relative z-10">
        {name ? `«${name}» подключён.` : 'Ваш AI-советник готов.'}{' '}
        Добавьте данные о заведении, чтобы начать получать рекомендации.
      </p>

      <div className="flex flex-col gap-2.5 w-full relative z-10">
        <button
          type="button"
          onClick={onEquipment}
          className="w-full h-12 rounded-2xl bg-primary text-white text-[14px] font-bold flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98] transition-all shadow-[0_4px_16px_rgba(91,92,235,0.28)]"
        >
          <Wrench size={16} />
          Добавить оборудование
        </button>
        <button
          type="button"
          onClick={onTasks}
          className="w-full h-12 rounded-2xl bg-muted text-foreground text-[14px] font-semibold flex items-center justify-center gap-2 hover:bg-border/60 active:scale-[0.98] transition-all"
        >
          <CheckSquare size={16} className="text-muted-foreground" />
          Создать первую задачу
        </button>
      </div>
    </div>
  );
}

// ─── Preview card (locked section teaser) ────────────────────────────────────

function PreviewCard({
  icon: Icon,
  iconColor,
  iconBg,
  title,
  description,
  href,
  onNavigate,
}: {
  icon: React.ElementType;
  iconColor: string;
  iconBg: string;
  title: string;
  description: string;
  href: string;
  onNavigate: (href: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onNavigate(href)}
      className="bd-card p-4 flex items-start gap-3.5 text-left w-full hover:shadow-[var(--shadow-elevated)] active:scale-[0.99] transition-all"
    >
      <div className={cn('w-10 h-10 rounded-[12px] flex items-center justify-center flex-shrink-0', iconBg)}>
        <Icon size={18} className={iconColor} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[14px] font-semibold text-foreground mb-0.5">{title}</p>
        <p className="text-[12px] text-muted-foreground leading-snug">{description}</p>
      </div>
      <ChevronRight size={16} className="text-muted-foreground/50 flex-shrink-0 mt-1" />
    </button>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function Home() {
  const { profile } = useRestaurant();
  const [, setLocation] = useLocation();

  const restaurantName = profile?.name ?? '';
  const hour = new Date().getHours();
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

          {/* ── Welcome card ── */}
          <motion.div custom={1} variants={fadeUp} initial="hidden" animate="visible" className="mb-7">
            <WelcomeCard
              name={restaurantName}
              onEquipment={() => setLocation('/equipment')}
              onTasks={() => setLocation('/tasks')}
            />
          </motion.div>

          {/* ── What you'll see section ── */}
          <motion.div custom={2} variants={fadeUp} initial="hidden" animate="visible" className="mb-4">
            <p className="text-[12px] font-bold text-muted-foreground uppercase tracking-wide px-1 mb-3">
              Что появится после добавления данных
            </p>
            <div className="flex flex-col gap-3">
              <PreviewCard
                icon={ShieldAlert}
                iconBg="bg-destructive/8"
                iconColor="text-destructive"
                title="Критические уведомления"
                description="Срочные задачи, сломанное оборудование и пропущенные события появятся здесь."
                href="/add"
                onNavigate={setLocation}
              />
              <PreviewCard
                icon={Activity}
                iconBg="bg-primary/8"
                iconColor="text-primary"
                title="Оперативное здоровье"
                description="Общий балл состояния заведения на основе ваших реальных данных."
                href="/analysis"
                onNavigate={setLocation}
              />
              <PreviewCard
                icon={TrendingUp}
                iconBg="bg-[#22C55E]/10"
                iconColor="text-[#16A34A]"
                title="Возможности роста"
                description="AI-рекомендации на основе ваших задач, оборудования и активности."
                href="/analysis"
                onNavigate={setLocation}
              />
            </div>
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
          transition={{ delay: 0.4, duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
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
