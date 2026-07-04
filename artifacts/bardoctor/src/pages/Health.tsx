import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useLocation } from 'wouter';
import {
  ArrowLeft, Wrench, MessageSquare, Users,
  BarChart2, DollarSign, Settings2, CheckSquare,
  AlertCircle, TrendingUp, Info,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import AppShell from '@/components/layout/AppShell';
import SafeArea from '@/components/layout/SafeArea';
import { useEvents } from '@/contexts/EventsContext';
import { useCases } from '@/contexts/CasesContext';
import { useEmployees } from '@/contexts/EmployeesContext';
import {
  computeHealth, scoreVisual,
  CATEGORY_META, CATEGORY_ORDER,
  type CategoryId, type CategoryScore,
} from '@/store/healthEngine';

// ─── Icon map ─────────────────────────────────────────────────────────────────

const CAT_ICON: Record<CategoryId, React.ElementType> = {
  equipment:   Wrench,
  guests:      MessageSquare,
  staff:       Users,
  operations:  BarChart2,
  finance:     DollarSign,
  maintenance: Settings2,
  tasks:       CheckSquare,
};

// ─── SVG arc helpers ──────────────────────────────────────────────────────────

const LARGE = { r: 60, cx: 80, cy: 80, sw: 10, size: 160 } as const;
const MINI  = { r: 28, cx: 38, cy: 38, sw:  5, size:  76 } as const;

function arcProps(cfg: typeof LARGE | typeof MINI) {
  const circ   = 2 * Math.PI * cfg.r;
  const arc270 = circ * 0.75;
  return { circ, arc270 };
}

// ─── Large gauge (overall) ────────────────────────────────────────────────────

function LargeGauge({ score }: { score: number | null }) {
  const { circ, arc270 } = arcProps(LARGE);
  const { cx, cy, r, sw, size } = LARGE;
  const fill = score !== null ? arc270 * (score / 100) : 0;
  const vis  = score !== null ? scoreVisual(score) : null;

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} fill="none" aria-hidden>
        {/* Track */}
        <circle
          cx={cx} cy={cy} r={r}
          stroke="rgba(255,255,255,0.10)"
          strokeWidth={sw}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${arc270} ${circ}`}
          transform={`rotate(135 ${cx} ${cy})`}
        />
        {/* Fill */}
        {score !== null && (
          <motion.circle
            cx={cx} cy={cy} r={r}
            stroke={vis!.stroke}
            strokeWidth={sw}
            strokeLinecap="round"
            fill="none"
            transform={`rotate(135 ${cx} ${cy})`}
            initial={{ strokeDasharray: `0 ${circ}` }}
            animate={{ strokeDasharray: `${fill} ${circ}` }}
            transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
          />
        )}
        {score === null && (
          <motion.circle
            cx={cx} cy={cy} r={r}
            stroke="rgba(91,92,235,0.4)"
            strokeWidth={sw}
            strokeLinecap="round"
            fill="none"
            strokeDasharray={`${arc270} ${circ}`}
            transform={`rotate(135 ${cx} ${cy})`}
            animate={{ opacity: [0.3, 0.7, 0.3] }}
            transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
          />
        )}
      </svg>
      {/* Centre content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5">
        {score !== null ? (
          <>
            <motion.span
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="text-[42px] font-black leading-none text-white"
            >
              {score}
            </motion.span>
            <span className="text-[11px] font-bold uppercase tracking-widest text-white/40">балл</span>
          </>
        ) : (
          <span className="text-[38px] font-black leading-none text-white/30">—</span>
        )}
      </div>
    </div>
  );
}

// ─── Mini gauge (per category) ────────────────────────────────────────────────

function MiniGauge({
  score, delay = 0, Icon,
}: {
  score: number | null;
  delay?: number;
  Icon: React.ElementType;
}) {
  const { circ, arc270 } = arcProps(MINI);
  const { cx, cy, r, sw, size } = MINI;
  const fill = score !== null ? arc270 * (score / 100) : 0;
  const vis  = score !== null ? scoreVisual(score) : null;
  const iconColor = vis ? vis.color : 'rgba(255,255,255,0.3)';

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} fill="none" aria-hidden>
        {/* Track */}
        <circle
          cx={cx} cy={cy} r={r}
          stroke="rgba(255,255,255,0.10)"
          strokeWidth={sw}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${arc270} ${circ}`}
          transform={`rotate(135 ${cx} ${cy})`}
        />
        {/* Fill */}
        {score !== null && (
          <motion.circle
            cx={cx} cy={cy} r={r}
            stroke={vis!.stroke}
            strokeWidth={sw}
            strokeLinecap="round"
            fill="none"
            transform={`rotate(135 ${cx} ${cy})`}
            initial={{ strokeDasharray: `0 ${circ}` }}
            animate={{ strokeDasharray: `${fill} ${circ}` }}
            transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1], delay: delay + 0.3 }}
          />
        )}
        {score === null && (
          <motion.circle
            cx={cx} cy={cy} r={r}
            stroke="rgba(255,255,255,0.15)"
            strokeWidth={sw}
            strokeLinecap="round"
            fill="none"
            strokeDasharray={`${arc270} ${circ}`}
            transform={`rotate(135 ${cx} ${cy})`}
            animate={{ opacity: [0.4, 0.8, 0.4] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut', delay }}
          />
        )}
      </svg>
      {/* Icon overlay */}
      <div className="absolute inset-0 flex items-center justify-center">
        <Icon size={16} style={{ color: iconColor }} />
      </div>
    </div>
  );
}

// ─── Category card ────────────────────────────────────────────────────────────

function CategoryCard({ cat, delay }: { cat: CategoryScore; delay: number }) {
  const Icon    = CAT_ICON[cat.id];
  const meta    = CATEGORY_META[cat.id];
  const vis     = cat.score !== null ? scoreVisual(cat.score) : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
      className="rounded-[20px] overflow-hidden flex flex-col items-center pt-5 pb-4 px-3"
      style={{
        background: 'linear-gradient(160deg, #1E2340 0%, #181D35 55%, #1A1638 100%)',
        boxShadow: '0 4px 20px rgba(16,20,48,0.32)',
      }}
    >
      {/* Mini arc */}
      <MiniGauge score={cat.score} delay={delay} Icon={Icon} />

      {/* Score or dash */}
      <div className="mt-1 mb-0.5">
        {cat.score !== null ? (
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: delay + 0.5 }}
            className="text-[22px] font-black text-white leading-none"
          >
            {cat.score}
          </motion.span>
        ) : (
          <span className="text-[22px] font-black text-white/25 leading-none">—</span>
        )}
      </div>

      {/* Label */}
      <p className="text-[11px] font-semibold text-white/50 text-center leading-tight mt-1">
        {meta.labelShort}
      </p>

      {/* Status chip */}
      <div className="mt-2">
        {vis ? (
          <span
            className="text-[10px] font-bold px-2 py-0.5 rounded-full"
            style={{ color: vis.color, background: vis.bg }}
          >
            {vis.label}
          </span>
        ) : (
          <span className="text-[10px] font-medium text-white/25 px-2 py-0.5 rounded-full bg-white/5">
            Нет данных
          </span>
        )}
      </div>

      {/* Open issues indicator */}
      {cat.hasData && cat.openCount > 0 && (
        <div className="flex items-center gap-1 mt-2">
          <AlertCircle size={9} className="text-white/30" />
          <span className="text-[9px] text-white/30 font-medium">
            {cat.openCount} открыт{cat.openCount === 1 ? 'о' : 'о'}
          </span>
        </div>
      )}
      {cat.hasData && cat.resolvedCount > 0 && cat.openCount === 0 && (
        <div className="flex items-center gap-1 mt-2">
          <TrendingUp size={9} className="text-[#22C55E]/60" />
          <span className="text-[9px] text-[#22C55E]/60 font-medium">
            {cat.resolvedCount} закрыт{cat.resolvedCount === 1 ? 'о' : 'о'}
          </span>
        </div>
      )}
      {!cat.hasData && (
        <div className="flex items-center gap-1 mt-2">
          <Info size={9} className="text-white/20" />
          <span className="text-[9px] text-white/20 font-medium">Добавьте данные</span>
        </div>
      )}
    </motion.div>
  );
}

// ─── Empty / calibration state ────────────────────────────────────────────────

function CalibrationState({ totalRecords }: { totalRecords: number }) {
  return (
    <div className="flex flex-col items-center text-center px-8 py-10">
      <motion.div
        initial={{ scale: 0.85, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 220, damping: 22 }}
        className="w-28 h-28 rounded-[32px] flex items-center justify-center mb-6 relative"
        style={{
          background: 'linear-gradient(160deg, #1A1F38, #161B2E)',
          boxShadow: '0 8px 32px rgba(22,27,46,0.30)',
        }}
      >
        {/* Pulsing ring */}
        <motion.div
          className="absolute inset-0 rounded-[32px]"
          animate={{ opacity: [0, 0.35, 0] }}
          transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
          style={{ boxShadow: '0 0 0 14px rgba(91,92,235,0.13)' }}
        />
        {/* Mini arc (decorative) */}
        <svg width="80" height="80" viewBox="0 0 80 80" aria-hidden>
          {(() => {
            const r = 30, cx = 40, cy = 40, sw = 6;
            const circ = 2 * Math.PI * r;
            const arc270 = circ * 0.75;
            return (
              <>
                <circle cx={cx} cy={cy} r={r} stroke="rgba(91,92,235,0.15)" strokeWidth={sw}
                  strokeLinecap="round" fill="none"
                  strokeDasharray={`${arc270} ${circ}`}
                  transform={`rotate(135 ${cx} ${cy})`} />
                <motion.circle cx={cx} cy={cy} r={r}
                  stroke="rgba(91,92,235,0.55)" strokeWidth={sw}
                  strokeLinecap="round" fill="none"
                  strokeDasharray={`${arc270 * 0.1} ${circ}`}
                  transform={`rotate(135 ${cx} ${cy})`}
                  animate={{ strokeDashoffset: [-arc270, 0] }}
                  transition={{ repeat: Infinity, duration: 2.2, ease: 'linear' }} />
              </>
            );
          })()}
        </svg>
      </motion.div>

      <motion.h2
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="text-[20px] font-black text-foreground tracking-tight mb-3 leading-tight"
      >
        Калибровка системы
      </motion.h2>
      <motion.p
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.16 }}
        className="text-[14px] text-muted-foreground leading-relaxed max-w-[280px]"
      >
        Health Score станет доступен после накопления достаточного количества операционных данных.
      </motion.p>

      {totalRecords > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.22 }}
          className="mt-6 px-4 py-3 rounded-2xl bg-primary/8 border border-primary/15 flex items-center gap-2"
        >
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <p className="text-[13px] font-semibold text-primary">
            {totalRecords} {totalRecords === 1 ? 'запись' : totalRecords < 5 ? 'записи' : 'записей'} — нужно минимум 3
          </p>
        </motion.div>
      )}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const rise = {
  hidden: { opacity: 0, y: 16 },
  show: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.07, duration: 0.42, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

export default function Health() {
  const [, setLocation] = useLocation();
  const { events }      = useEvents();
  const { cases }       = useCases();
  const { employees }   = useEmployees();

  const report = useMemo(
    () => computeHealth(events, cases, employees),
    [events, cases, employees],
  );

  const vis = report.overall !== null ? scoreVisual(report.overall) : null;
  const orderedCats = CATEGORY_ORDER.map((id) => report.categories[id]);

  return (
    <AppShell showBottomNav>
      <SafeArea className="pt-0 pb-28">

        {/* ── Sticky header ── */}
        <div className="sticky top-0 z-20 bg-[#F8F9FC]/95 backdrop-blur-md border-b border-border/60 px-6 py-4 flex items-center gap-3">
          <button
            type="button"
            onClick={() => setLocation('/home')}
            className="w-8 h-8 rounded-full bg-card border border-border flex items-center justify-center hover:bg-muted transition-colors flex-shrink-0"
          >
            <ArrowLeft size={15} className="text-foreground" />
          </button>
          <h1 className="text-[17px] font-black text-foreground tracking-tight">
            Здоровье заведения
          </h1>
        </div>

        {/* ── Hero — overall score ── */}
        <motion.div custom={0} variants={rise} initial="hidden" animate="show" className="px-6 pt-5">
          <div
            className="rounded-[24px] overflow-hidden relative"
            style={{
              background: 'linear-gradient(160deg, #1A1F38 0%, #161B2E 55%, #1D1440 100%)',
              boxShadow: '0 8px 32px rgba(22,27,46,0.28)',
            }}
          >
            <div
              aria-hidden
              className="absolute inset-0 pointer-events-none"
              style={{
                background: 'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(91,92,235,0.20) 0%, transparent 70%)',
              }}
            />
            <div className="relative z-10 px-6 pt-6 pb-6 flex flex-col items-center">
              {/* Top row */}
              <div className="w-full flex items-center justify-between mb-5">
                <p className="text-[11px] font-bold uppercase tracking-widest text-white/40">
                  Общий балл
                </p>
                {vis && (
                  <motion.span
                    initial={{ opacity: 0, scale: 0.85 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.5, duration: 0.4 }}
                    className="text-[12px] font-bold px-3 py-1 rounded-full"
                    style={{ color: vis.color, background: vis.bg }}
                  >
                    {vis.label}
                  </motion.span>
                )}
              </div>

              {/* Large gauge */}
              <LargeGauge score={report.overall} />

              {/* Sub-label */}
              {!report.hasEnoughData && (
                <p className="text-[12px] text-white/35 font-medium text-center mt-4 max-w-[220px] leading-snug">
                  Добавляйте события и дела — балл появится по мере накопления данных
                </p>
              )}

              {/* Category mini-dots row */}
              {report.hasEnoughData && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 }}
                  className="flex items-center gap-3 mt-5"
                >
                  {orderedCats.map((cat) => {
                    const catVis = cat.score !== null ? scoreVisual(cat.score) : null;
                    return (
                      <div
                        key={cat.id}
                        className="w-2 h-2 rounded-full"
                        style={{ background: catVis ? catVis.stroke : 'rgba(255,255,255,0.15)' }}
                        title={CATEGORY_META[cat.id].label}
                      />
                    );
                  })}
                </motion.div>
              )}
            </div>
          </div>
        </motion.div>

        {/* ── Content: categories or calibration ── */}
        {!report.hasEnoughData ? (
          <CalibrationState totalRecords={report.totalRecords} />
        ) : (
          <motion.div custom={1} variants={rise} initial="hidden" animate="show" className="px-6 pt-5">
            {/* Section title */}
            <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-4 px-1">
              По категориям
            </p>

            {/* 2-column grid */}
            <div className="grid grid-cols-2 gap-3">
              {orderedCats.map((cat, i) => (
                <CategoryCard key={cat.id} cat={cat} delay={0.1 + i * 0.07} />
              ))}
            </div>

            {/* Legend */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.9 }}
              className="mt-5 bd-card px-5 py-4"
            >
              <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-3">
                Как считается балл
              </p>
              <div className="flex flex-col gap-2.5">
                {[
                  'Каждая категория считается из открытых и решённых событий и дел',
                  'Критические проблемы снижают балл сильнее, давние — вполовину',
                  'Решённые проблемы за последние 14 дней дают бонус',
                  'Общий балл — среднее по категориям с данными',
                ].map((text, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary/50 mt-1.5 flex-shrink-0" />
                    <p className="text-[12px] text-muted-foreground leading-snug">{text}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}

      </SafeArea>
    </AppShell>
  );
}
