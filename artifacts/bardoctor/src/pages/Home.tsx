import { useState, useEffect } from 'react';
import {
  Bell, ChevronDown, Store, AlertTriangle,
  Users, Package, Sparkles, TrendingUp,
  ShoppingCart, Star, MessageSquare, Wrench, ArrowRight,
} from 'lucide-react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import AppShell from '@/components/layout/AppShell';
import SafeArea from '@/components/layout/SafeArea';
import { cn } from '@/lib/utils';

// ─── Health Score config ──────────────────────────────────────────────────────

const SCORE = 91;

function scoreColor(s: number) {
  if (s >= 90) return { color: '#22C55E', label: 'Отлично',   bg: 'rgba(34,197,94,0.10)',  ring: '#22C55E' };
  if (s >= 70) return { color: '#F59E0B', label: 'Хорошо',    bg: 'rgba(245,158,11,0.10)', ring: '#F59E0B' };
  if (s >= 50) return { color: '#F97316', label: 'Средне',    bg: 'rgba(249,115,22,0.10)', ring: '#F97316' };
  return               { color: '#EF4444', label: 'Критично',  bg: 'rgba(239,68,68,0.10)',  ring: '#EF4444' };
}

// ─── Data ─────────────────────────────────────────────────────────────────────

const CRITICAL = [
  {
    id: 1,
    icon: Wrench,
    title: 'Кофемашина требует очистки',
    insight: 'Фильтры не менялись 18 дней — давление упало на 12%. Без вмешательства качество напитков снизится сегодня в пиковые часы.',
    tag: 'Оборудование',
    time: 'Сейчас',
    action: 'Назначить',
    tagColor: 'text-destructive',
    tagBg: 'bg-destructive/8',
  },
  {
    id: 2,
    icon: Users,
    title: 'Два сотрудника не вышли',
    insight: 'Иванов и Петрова не подтвердили явку на смену в 14:00. Если не решить до 12:00 — смена будет под угрозой.',
    tag: 'Персонал',
    time: 'До 12:00',
    action: 'Связаться',
    tagColor: 'text-destructive',
    tagBg: 'bg-destructive/8',
  },
];

const ATTENTION = [
  {
    id: 1,
    icon: Package,
    title: 'Молоко заканчивается',
    insight: 'Остаток 2,4 л — этого хватит примерно до 13:00. При текущем темпе продаж нужно срочно дозаказать.',
    tag: 'Склад',
    time: 'Сегодня',
    action: 'Заказать',
    tagColor: 'text-[#B45309]',
    tagBg: 'bg-[#F59E0B]/10',
  },
  {
    id: 2,
    icon: Star,
    title: '3 отзыва без ответа',
    insight: 'Два из трёх — негативные (3 звезды). Отзывы без ответа снижают рейтинг в выдаче и отталкивают новых гостей.',
    tag: 'Репутация',
    time: 'Вчера',
    action: 'Ответить',
    tagColor: 'text-[#B45309]',
    tagBg: 'bg-[#F59E0B]/10',
  },
  {
    id: 3,
    icon: AlertTriangle,
    title: '4 задачи просрочено',
    insight: 'Три задачи из прошлой недели остались невыполненными. Рекомендую делегировать или закрыть.',
    tag: 'Задачи',
    time: '3 дня',
    action: 'Посмотреть',
    tagColor: 'text-[#B45309]',
    tagBg: 'bg-[#F59E0B]/10',
  },
];

const GROWTH = [
  {
    id: 1,
    icon: TrendingUp,
    title: 'Комбо к кофе увеличит чек',
    insight: 'Гости берут кофе без десерта в 78% случаев. Добавление простого комбо может поднять средний чек на 12% уже в этом месяце.',
    metric: '+12%',
    metricSub: 'к среднему чеку',
    metricColor: 'text-primary',
    action: 'Подробнее',
  },
  {
    id: 2,
    icon: ShoppingCart,
    title: 'Смените поставщика сиропов',
    insight: 'Routin 1883 стоит на 22% дешевле Monin при схожем качестве по отзывам похожих заведений. Экономия — 6 500 ₽ в месяц.',
    metric: '6 500 ₽',
    metricSub: 'экономия/мес',
    metricColor: 'text-[#16A34A]',
    action: 'Сравнить',
  },
  {
    id: 3,
    icon: MessageSquare,
    title: 'Запустите программу лояльности',
    insight: 'Заведения аналогичного профиля отмечают рост повторных визитов на 34% после запуска простой карты гостя.',
    metric: '+34%',
    metricSub: 'повторных визитов',
    metricColor: 'text-primary',
    action: 'Узнать',
  },
];

// ─── Health Score Card ────────────────────────────────────────────────────────

function HealthScoreCard({ score }: { score: number }) {
  const cfg = scoreColor(score);

  // Animated counter
  const count = useMotionValue(0);
  const rounded = useTransform(count, (v) => Math.round(v));
  const [displayVal, setDisplayVal] = useState(0);

  useEffect(() => {
    const controls = animate(count, score, { duration: 1.4, ease: 'easeOut' });
    const unsub = rounded.on('change', (v) => setDisplayVal(v));
    return () => { controls.stop(); unsub(); };
  }, [score]);

  // SVG arc — partial ring (270° sweep, starting from bottom-left)
  const size = 144;
  const strokeW = 9;
  const r = (size - strokeW) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;
  const arcFraction = 0.75; // 270° of the full circle
  const trackDash = circumference * arcFraction;
  const fillDash = trackDash * (score / 100);
  // Rotate so arc starts at bottom-left (135°)
  const rotationDeg = 135;

  return (
    <div
      className="bd-card p-6 flex flex-col items-center relative overflow-hidden"
      style={{ background: `linear-gradient(145deg, #ffffff 0%, ${cfg.bg} 100%)` }}
    >
      {/* Subtle AI label */}
      <div className="absolute top-4 right-4 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/8">
        <Sparkles size={11} className="text-primary" />
        <span className="text-[11px] font-semibold text-primary tracking-wide">BarDoctor AI</span>
      </div>

      {/* Ring */}
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="overflow-visible">
          {/* Track */}
          <circle
            cx={cx} cy={cy} r={r}
            fill="none"
            stroke="hsl(228 20% 92%)"
            strokeWidth={strokeW}
            strokeDasharray={`${trackDash} ${circumference}`}
            strokeLinecap="round"
            transform={`rotate(${rotationDeg} ${cx} ${cy})`}
          />
          {/* Fill */}
          <motion.circle
            cx={cx} cy={cy} r={r}
            fill="none"
            stroke={cfg.ring}
            strokeWidth={strokeW}
            strokeLinecap="round"
            strokeDasharray={`${fillDash} ${circumference}`}
            transform={`rotate(${rotationDeg} ${cx} ${cy})`}
            initial={{ strokeDasharray: `0 ${circumference}` }}
            animate={{ strokeDasharray: `${fillDash} ${circumference}` }}
            transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
          />
        </svg>

        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="flex items-baseline gap-0.5">
            <span className="text-[38px] font-black tracking-tighter text-foreground leading-none">
              {displayVal}
            </span>
            <span className="text-[16px] font-semibold text-muted-foreground">/100</span>
          </div>
          <span
            className="text-[12px] font-bold mt-1 px-2 py-0.5 rounded-full"
            style={{ color: cfg.color, background: cfg.bg }}
          >
            {cfg.label}
          </span>
        </div>
      </div>

      {/* Indicator bar */}
      <div className="w-full mt-5">
        <div className="relative h-2 rounded-full overflow-hidden bg-muted">
          <div
            className="absolute inset-y-0 left-0 rounded-full"
            style={{
              width: '49%',
              background: 'linear-gradient(90deg, #EF4444, #F97316)',
            }}
          />
          <div
            className="absolute inset-y-0 rounded-full"
            style={{
              left: '49%',
              width: '20%',
              background: '#F97316',
            }}
          />
          <div
            className="absolute inset-y-0 rounded-full"
            style={{
              left: '69%',
              width: '20%',
              background: '#F59E0B',
            }}
          />
          <div
            className="absolute inset-y-0 right-0 rounded-full"
            style={{
              left: '89%',
              background: '#22C55E',
            }}
          />
          {/* Score marker */}
          <motion.div
            className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-[2.5px] border-white shadow-sm"
            style={{ background: cfg.color }}
            initial={{ left: '0%' }}
            animate={{ left: `calc(${score}% - 6px)` }}
            transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
          />
        </div>
        <div className="flex justify-between mt-1.5">
          <span className="text-[10px] text-muted-foreground font-medium">0</span>
          <span className="text-[10px] text-muted-foreground font-medium">50</span>
          <span className="text-[10px] text-muted-foreground font-medium">70</span>
          <span className="text-[10px] text-muted-foreground font-medium">90</span>
          <span className="text-[10px] text-muted-foreground font-medium">100</span>
        </div>
      </div>

      {/* Sub-label */}
      <p className="text-[12px] text-muted-foreground text-center mt-3 leading-snug">
        Операционное здоровье вашего заведения на сегодня
      </p>
    </div>
  );
}

// ─── Critical / Attention card ────────────────────────────────────────────────

type AlertCardItem = typeof CRITICAL[number];

function AlertCard({ item, urgency }: { item: AlertCardItem; urgency: 'critical' | 'attention' }) {
  const Icon = item.icon;
  const borderColor = urgency === 'critical' ? 'border-l-destructive' : 'border-l-[#F59E0B]';
  const iconBg = urgency === 'critical' ? 'bg-destructive/10' : 'bg-[#F59E0B]/10';
  const iconColor = urgency === 'critical' ? 'text-destructive' : 'text-[#B45309]';
  const actionColor = urgency === 'critical' ? 'text-destructive' : 'text-[#B45309]';

  return (
    <div className={cn('bd-card p-4 border-l-[3px]', borderColor)}>
      <div className="flex items-start gap-3">
        <div className={cn(
          'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5',
          iconBg,
        )}>
          <Icon size={15} className={iconColor} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1.5">
            <p className="text-[14px] font-semibold text-foreground leading-snug">{item.title}</p>
            <span className={cn(
              'text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 mt-0.5',
              item.tagColor, item.tagBg,
            )}>
              {item.time}
            </span>
          </div>
          <p className="text-[13px] text-muted-foreground leading-relaxed mb-3">
            {item.insight}
          </p>
          <button className={cn(
            'flex items-center gap-1 text-[13px] font-semibold transition-opacity hover:opacity-75',
            actionColor,
          )}>
            {item.action}
            <ArrowRight size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Growth card ──────────────────────────────────────────────────────────────

type GrowthItem = typeof GROWTH[number];

function GrowthCard({ item }: { item: GrowthItem }) {
  const Icon = item.icon;
  return (
    <div className="bd-card p-4">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
          <Icon size={15} className="text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 mb-0.5">
            <span className={cn('text-[17px] font-black leading-none', item.metricColor)}>
              {item.metric}
            </span>
            <span className="text-[11px] text-muted-foreground">{item.metricSub}</span>
          </div>
          <p className="text-[14px] font-semibold text-foreground mb-1.5">{item.title}</p>
          <p className="text-[13px] text-muted-foreground leading-relaxed mb-3">
            {item.insight}
          </p>
          <button className="flex items-center gap-1 text-[13px] font-semibold text-primary hover:opacity-75 transition-opacity">
            {item.action}
            <ArrowRight size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Section header ───────────────────────────────────────────────────────────

function SectionHeader({
  title,
  count,
  dot,
}: {
  title: string;
  count: number;
  dot: 'red' | 'amber' | 'green';
}) {
  const dotColor = dot === 'red' ? 'bg-destructive' : dot === 'amber' ? 'bg-[#F59E0B]' : 'bg-[#22C55E]';
  const countColor = dot === 'red'
    ? 'bg-destructive/10 text-destructive'
    : dot === 'amber'
    ? 'bg-[#F59E0B]/10 text-[#B45309]'
    : 'bg-[#22C55E]/10 text-[#16A34A]';

  return (
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2">
        <span className={cn('w-2 h-2 rounded-full', dotColor)} />
        <h2 className="text-[16px] font-bold text-foreground tracking-tight">{title}</h2>
      </div>
      <span className={cn('text-[11px] font-bold px-2 py-0.5 rounded-full', countColor)}>
        {count}
      </span>
    </div>
  );
}

// ─── Animation ────────────────────────────────────────────────────────────────

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.09, duration: 0.42, ease: [0.22, 1, 0.36, 1] as [number,number,number,number] },
  }),
};

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function Home() {
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
              <button className="flex items-center gap-1.5 mt-2 pl-2.5 pr-3 py-1.5 bg-muted rounded-full hover:bg-border/60 transition-colors active:scale-[0.97]">
                <Store size={13} className="text-muted-foreground" />
                <span className="text-[13px] font-semibold text-foreground">Гранд Кафе</span>
                <ChevronDown size={13} className="text-muted-foreground" />
              </button>
            </div>
            <button className="relative w-10 h-10 bg-card border border-border rounded-full flex items-center justify-center shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-elevated)] transition-shadow">
              <Bell size={18} className="text-foreground" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-destructive rounded-full border-[2px] border-card" />
            </button>
          </motion.div>

          {/* ── Health Score ── */}
          <motion.div custom={1} variants={fadeUp} initial="hidden" animate="visible" className="mb-7">
            <HealthScoreCard score={SCORE} />
          </motion.div>

          {/* ── Critical Today ── */}
          <motion.div custom={2} variants={fadeUp} initial="hidden" animate="visible" className="mb-7">
            <SectionHeader title="Критично сегодня" count={CRITICAL.length} dot="red" />
            <div className="flex flex-col gap-3">
              {CRITICAL.map((item) => (
                <AlertCard key={item.id} item={item} urgency="critical" />
              ))}
            </div>
          </motion.div>

          {/* ── Needs Attention ── */}
          <motion.div custom={3} variants={fadeUp} initial="hidden" animate="visible" className="mb-7">
            <SectionHeader title="Требует внимания" count={ATTENTION.length} dot="amber" />
            <div className="flex flex-col gap-3">
              {ATTENTION.map((item) => (
                <AlertCard key={item.id} item={item} urgency="attention" />
              ))}
            </div>
          </motion.div>

          {/* ── Growth Opportunities ── */}
          <motion.div custom={4} variants={fadeUp} initial="hidden" animate="visible">
            <SectionHeader title="Возможности роста" count={GROWTH.length} dot="green" />
            <div className="flex flex-col gap-3">
              {GROWTH.map((item) => (
                <GrowthCard key={item.id} item={item} />
              ))}
            </div>
          </motion.div>

        </div>
      </SafeArea>

      {/* ── Floating AI pill ── */}
      <div className="fixed bottom-[92px] left-0 right-0 flex justify-center z-40 pointer-events-none">
        <motion.button
          initial={{ opacity: 0, y: 12, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: 0.5, duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
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
