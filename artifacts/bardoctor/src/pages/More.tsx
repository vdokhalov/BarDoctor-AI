import { useLocation } from 'wouter';
import {
  Wrench, Users, Truck, Package, FileText,
  Bell, Settings, Info, ChevronRight, User,
} from 'lucide-react';
import { motion } from 'framer-motion';
import AppShell from '@/components/layout/AppShell';
import SafeArea from '@/components/layout/SafeArea';
import { useRestaurant } from '@/contexts/RestaurantContext';
import { initials } from '@/store/restaurant';
import { cn } from '@/lib/utils';

// ─── Data ─────────────────────────────────────────────────────────────────────

const MANAGE_ITEMS = [
  { icon: Wrench,   label: 'Оборудование', href: '/equipment',    badge: null },
  { icon: Users,    label: 'Сотрудники',   href: '/employees',    badge: null },
  { icon: Truck,    label: 'Поставщики',   href: '/suppliers',    badge: null },
  { icon: Package,  label: 'Склад',        href: '/warehouse',    badge: null },
  { icon: FileText, label: 'Отчёты',       href: '/reports',      badge: null },
];

const APP_ITEMS = [
  { icon: Bell,     label: 'Уведомления',  href: '/notifications', badge: null },
  { icon: Settings, label: 'Настройки',    href: '/settings',      badge: null },
  { icon: Info,     label: 'О приложении', href: '/about',         badge: null },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function MenuRow({
  icon: Icon,
  label,
  href,
  badge,
  onClick,
}: {
  icon: React.ElementType;
  label: string;
  href: string;
  badge: string | null;
  onClick: (href: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onClick(href)}
      className="w-full flex items-center gap-3.5 px-4 py-3.5 hover:bg-muted/60 active:bg-muted transition-colors"
    >
      <div className="w-9 h-9 rounded-[11px] bg-primary/8 flex items-center justify-center flex-shrink-0">
        <Icon size={17} className="text-primary" />
      </div>
      <span className="flex-1 text-left text-[15px] font-semibold text-foreground">{label}</span>
      {badge && (
        <span className="text-[11px] font-bold bg-destructive text-white px-2 py-0.5 rounded-full mr-1">
          {badge}
        </span>
      )}
      <ChevronRight size={16} className="text-muted-foreground/50 flex-shrink-0" />
    </button>
  );
}

function SectionCard({
  children,
  delay,
}: {
  children: React.ReactNode;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.36, ease: [0.22, 1, 0.36, 1] }}
      className="bg-card border border-card-border rounded-2xl overflow-hidden shadow-[var(--shadow-card)]"
    >
      {children}
    </motion.div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function More() {
  const [, setLocation] = useLocation();
  const { profile } = useRestaurant();

  const name = profile?.name ?? 'Моё заведение';
  const sub  = profile ? `${profile.businessType} · ${profile.city}` : '';
  const abbr = initials(name);

  function go(href: string) {
    setLocation(href);
  }

  return (
    <AppShell showBottomNav>
      <SafeArea className="pt-5 pb-10">
        {/* ── Page title ── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
          className="px-6 mb-5"
        >
          <h1 className="text-[22px] font-bold text-foreground tracking-tight">Ещё</h1>
        </motion.div>

        <div className="px-6 flex flex-col gap-4">

          {/* ── Profile card ── */}
          <motion.button
            type="button"
            onClick={() => go('/profile')}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.04, duration: 0.36, ease: [0.22, 1, 0.36, 1] }}
            className="w-full bg-card border border-card-border rounded-2xl shadow-[var(--shadow-card)] p-4 flex items-center gap-3.5 hover:bg-muted/30 active:bg-muted/50 transition-colors text-left"
          >
            <div className="w-12 h-12 rounded-full bg-indigo-50 border border-border flex items-center justify-center flex-shrink-0">
              <span className="text-[16px] font-bold text-primary">{abbr}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[15px] font-bold text-foreground leading-snug truncate">{name}</p>
              {sub && (
                <p className="text-[13px] text-muted-foreground font-medium truncate">{sub}</p>
              )}
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <span className="text-[13px] font-semibold text-primary">Профиль</span>
              <ChevronRight size={15} className="text-primary" />
            </div>
          </motion.button>

          {/* ── Manage section ── */}
          <div>
            <p className="text-[12px] font-bold text-muted-foreground uppercase tracking-wide mb-2 px-1">
              Управление
            </p>
            <SectionCard delay={0.10}>
              {MANAGE_ITEMS.map((item, idx) => (
                <div key={item.href} className={cn(idx < MANAGE_ITEMS.length - 1 && 'border-b border-border')}>
                  <MenuRow {...item} onClick={go} />
                </div>
              ))}
            </SectionCard>
          </div>

          {/* ── App section ── */}
          <div>
            <p className="text-[12px] font-bold text-muted-foreground uppercase tracking-wide mb-2 px-1">
              Приложение
            </p>
            <SectionCard delay={0.16}>
              {APP_ITEMS.map((item, idx) => (
                <div key={item.href} className={cn(idx < APP_ITEMS.length - 1 && 'border-b border-border')}>
                  <MenuRow {...item} onClick={go} />
                </div>
              ))}
            </SectionCard>
          </div>

          {/* ── Version ── */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.28, duration: 0.4 }}
            className="text-center text-[12px] text-muted-foreground/50 font-medium pt-2"
          >
            BarDoctor · Версия 1.0.0
          </motion.p>

        </div>
      </SafeArea>
    </AppShell>
  );
}
