import React, { useState } from 'react';
import {
  Bell, ChevronDown, Store, AlertCircle, AlertTriangle,
  Users, Package, Check, Sparkles, TrendingUp,
  ShoppingCart, Star, Clock, ChevronRight, Zap,
} from 'lucide-react';
import { motion } from 'framer-motion';
import AppShell from '@/components/layout/AppShell';
import SafeArea from '@/components/layout/SafeArea';
import Badge from '@/components/ds/Badge';
import { cn } from '@/lib/utils';

// ─── Data ────────────────────────────────────────────────────────────────────

const ATTENTION_CARDS = [
  {
    id: 1,
    icon: AlertCircle,
    iconBg: 'bg-destructive/10',
    iconColor: 'text-destructive',
    borderColor: 'border-l-destructive',
    title: 'Кофемашина',
    subtitle: 'Требуется немедленная очистка фильтров',
    badge: { label: 'Срочно', variant: 'danger' as const },
    time: '10:15',
    action: 'Назначить',
  },
  {
    id: 2,
    icon: Package,
    iconBg: 'bg-[#F59E0B]/10',
    iconColor: 'text-[#B45309]',
    borderColor: 'border-l-[#F59E0B]',
    title: 'Молоко цельное',
    subtitle: 'Остаток менее 20% — осталось 2,4 л',
    badge: { label: 'Запас', variant: 'warning' as const },
    time: 'Вчера',
    action: 'Заказать',
  },
  {
    id: 3,
    icon: Users,
    iconBg: 'bg-primary/10',
    iconColor: 'text-primary',
    borderColor: 'border-l-primary',
    title: 'Выход на смену',
    subtitle: '2 сотрудника не подтвердили явку сегодня в 14:00',
    badge: { label: 'Сегодня', variant: 'primary' as const },
    time: '14:00',
    action: 'Связаться',
  },
];

const INITIAL_TASKS = [
  { id: 1, text: 'Провести инвентаризацию бара', time: 'Сегодня',  tag: 'Склад',       done: false },
  { id: 2, text: 'Заказать сиропы Monin',         time: 'До 15:00', tag: 'Закупки',     done: false },
  { id: 3, text: 'Очистить кофемашину',            time: 'Готово',   tag: 'Оборудование', done: true  },
  { id: 4, text: 'Составить отчёт за месяц',       time: 'Завтра',   tag: 'Управление',  done: false },
];

const OPPORTUNITIES = [
  {
    id: 1,
    icon: TrendingUp,
    iconBg: 'bg-primary/10',
    iconColor: 'text-primary',
    metric: '+12%',
    metricLabel: 'к среднему чеку',
    title: 'Добавьте комбо к кофе',
    subtitle: 'Гости берут кофе без десерта в 78% случаев — есть точка роста',
    color: 'text-primary',
  },
  {
    id: 2,
    icon: ShoppingCart,
    iconBg: 'bg-[#22C55E]/10',
    iconColor: 'text-[#16A34A]',
    metric: '6 500 ₽',
    metricLabel: 'экономия в месяц',
    title: 'Смените поставщика сиропов',
    subtitle: 'Monin vs Routin 1883 — при схожем качестве разница 22% в цене',
    color: 'text-[#16A34A]',
  },
  {
    id: 3,
    icon: Star,
    iconBg: 'bg-[#F59E0B]/10',
    iconColor: 'text-[#B45309]',
    metric: '3',
    metricLabel: 'отзыва без ответа',
    title: 'Улучшите рейтинг на картах',
    subtitle: 'Ответ на негативные отзывы повышает доверие новых гостей',
    color: 'text-[#B45309]',
  },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function AttentionCard({ card }: { card: typeof ATTENTION_CARDS[number] }) {
  const Icon = card.icon;
  return (
    <div className={cn(
      'bd-card p-4 flex gap-3.5 border-l-[3px]',
      card.borderColor,
    )}>
      <div className={cn(
        'w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5',
        card.iconBg,
      )}>
        <Icon className={cn('w-4.5 h-4.5', card.iconColor)} size={18} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-2 justify-between mb-1">
          <p className="text-[15px] font-semibold text-foreground leading-snug">{card.title}</p>
          <Badge label={card.badge.label} variant={card.badge.variant} size="sm" />
        </div>
        <p className="text-[13px] text-muted-foreground leading-snug mb-3">
          {card.subtitle}
        </p>
        <div className="flex items-center justify-between">
          <span className="text-[12px] text-muted-foreground flex items-center gap-1">
            <Clock size={11} className="opacity-60" />
            {card.time}
          </span>
          <button className="flex items-center gap-1 text-[13px] font-semibold text-primary hover:opacity-80 transition-opacity">
            {card.action}
            <ChevronRight size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}

function TaskRow({
  task,
  onToggle,
  isLast,
}: {
  task: typeof INITIAL_TASKS[number];
  onToggle: () => void;
  isLast: boolean;
}) {
  return (
    <div className={cn(
      'flex items-center gap-3.5 py-3.5 px-5',
      !isLast && 'border-b border-border',
    )}>
      {/* Checkbox */}
      <button
        type="button"
        onClick={onToggle}
        aria-label={task.done ? 'Отметить не выполненным' : 'Отметить выполненным'}
        className={cn(
          'w-5.5 h-5.5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all duration-200',
          task.done
            ? 'bg-primary border-primary'
            : 'border-border hover:border-primary/50',
        )}
        style={{ width: 22, height: 22 }}
      >
        {task.done && <Check size={11} strokeWidth={3} className="text-primary-foreground" />}
      </button>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <p className={cn(
          'text-[15px] font-medium leading-snug truncate',
          task.done ? 'line-through text-muted-foreground' : 'text-foreground',
        )}>
          {task.text}
        </p>
        <p className="text-[12px] text-muted-foreground mt-0.5">{task.tag}</p>
      </div>

      {/* Time / status */}
      <span className={cn(
        'text-[12px] font-medium flex-shrink-0',
        task.done ? 'text-[#16A34A]' : task.time === 'До 15:00' ? 'text-[#B45309]' : 'text-muted-foreground',
      )}>
        {task.time}
      </span>
    </div>
  );
}

function OpportunityCard({ card }: { card: typeof OPPORTUNITIES[number] }) {
  const Icon = card.icon;
  return (
    <div className="bd-card p-4 flex gap-3.5">
      <div className={cn(
        'w-10 h-10 rounded-[12px] flex items-center justify-center flex-shrink-0',
        card.iconBg,
      )}>
        <Icon size={18} className={card.iconColor} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 mb-0.5">
          <span className={cn('text-[18px] font-bold leading-none', card.color)}>
            {card.metric}
          </span>
          <span className="text-[12px] text-muted-foreground">{card.metricLabel}</span>
        </div>
        <p className="text-[14px] font-semibold text-foreground mb-0.5">{card.title}</p>
        <p className="text-[12px] text-muted-foreground leading-snug">{card.subtitle}</p>
      </div>

      <button className="flex-shrink-0 self-center w-7 h-7 rounded-full bg-muted flex items-center justify-center hover:bg-border transition-colors">
        <ChevronRight size={14} className="text-muted-foreground" />
      </button>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.07, duration: 0.38, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
  }),
};

export default function Home() {
  const [tasks, setTasks] = useState(INITIAL_TASKS);

  const toggleTask = (id: number) =>
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));

  const doneCount = tasks.filter((t) => t.done).length;

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? 'Доброе утро' : hour < 17 ? 'Добрый день' : 'Добрый вечер';

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
                {greeting}, Алексей 👋
              </h1>
              {/* Restaurant selector */}
              <button className="flex items-center gap-1.5 mt-2 pl-2.5 pr-3 py-1.5 bg-muted rounded-full hover:bg-border/60 transition-colors active:scale-[0.97]">
                <Store size={13} className="text-muted-foreground" />
                <span className="text-[13px] font-semibold text-foreground">Гранд Кафе</span>
                <ChevronDown size={13} className="text-muted-foreground" />
              </button>
            </div>

            {/* Notification bell */}
            <button className="relative w-10 h-10 bg-card border border-border rounded-full flex items-center justify-center shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-elevated)] transition-shadow">
              <Bell size={18} className="text-foreground" />
              {/* Unread dot */}
              <span className="absolute top-2 right-2 w-2 h-2 bg-destructive rounded-full border-[2px] border-card" />
            </button>
          </motion.div>

          {/* ── Section: Requires attention ── */}
          <motion.div custom={1} variants={fadeUp} initial="hidden" animate="visible">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[17px] font-bold text-foreground tracking-tight">
                Сегодня требует внимания
              </h2>
              <span className="text-[12px] font-semibold bg-destructive/10 text-destructive px-2.5 py-0.5 rounded-full">
                {ATTENTION_CARDS.length}
              </span>
            </div>
            <div className="flex flex-col gap-3">
              {ATTENTION_CARDS.map((card) => (
                <AttentionCard key={card.id} card={card} />
              ))}
            </div>
          </motion.div>

          {/* ── Section: Tasks checklist ── */}
          <motion.div custom={2} variants={fadeUp} initial="hidden" animate="visible" className="mt-7">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[17px] font-bold text-foreground tracking-tight">
                Сегодняшние задачи
              </h2>
              <span className="text-[13px] font-medium text-muted-foreground">
                {doneCount}/{tasks.length} выполнено
              </span>
            </div>

            {/* Progress bar */}
            <div className="h-1 bg-border rounded-full overflow-hidden mb-4">
              <motion.div
                className="h-full bg-primary rounded-full"
                animate={{ width: `${(doneCount / tasks.length) * 100}%` }}
                transition={{ duration: 0.4, ease: 'easeInOut' }}
              />
            </div>

            {/* Task list card */}
            <div className="bd-card overflow-hidden">
              {tasks.map((task, idx) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  onToggle={() => toggleTask(task.id)}
                  isLast={idx === tasks.length - 1}
                />
              ))}
            </div>

            <button className="flex items-center gap-1.5 mt-3 text-[13px] font-semibold text-primary hover:opacity-80 transition-opacity self-start">
              Все задачи
              <ChevronRight size={14} />
            </button>
          </motion.div>

          {/* ── Section: Opportunities ── */}
          <motion.div custom={3} variants={fadeUp} initial="hidden" animate="visible" className="mt-7">
            <div className="flex items-center gap-2 mb-3">
              <h2 className="text-[17px] font-bold text-foreground tracking-tight">
                Возможности
              </h2>
              <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center">
                <Zap size={11} className="text-primary" />
              </div>
            </div>
            <div className="flex flex-col gap-3">
              {OPPORTUNITIES.map((card) => (
                <OpportunityCard key={card.id} card={card} />
              ))}
            </div>
          </motion.div>

        </div>
      </SafeArea>

      {/* ── Floating AI button ── */}
      <div className="fixed bottom-[92px] left-0 right-0 flex justify-center z-40 pointer-events-none">
        <motion.button
          initial={{ opacity: 0, y: 12, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: 0.4, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
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
