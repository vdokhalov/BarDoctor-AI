import { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, RefreshCw, AlertCircle, Brain,
  Lightbulb, CheckCircle2, TrendingUp, ChevronRight,
  Wrench, Users, MessageSquare, Truck, DollarSign,
  ShieldCheck, BarChart2, Stethoscope, Plus, FolderOpen,
  Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import AppShell from '@/components/layout/AppShell';
import SafeArea from '@/components/layout/SafeArea';
import { useRestaurant } from '@/contexts/RestaurantContext';
import { useEvents } from '@/contexts/EventsContext';
import { useCases } from '@/contexts/CasesContext';
import { useEmployees } from '@/contexts/EmployeesContext';
import { useDecisions } from '@/contexts/DecisionsContext';
import { hasTodayDecision } from '@/store/decisions';
import { useToast } from '@/components/ds/Toast';
import { useLocation } from 'wouter';

// ─── Types ────────────────────────────────────────────────────────────────────

interface PriorityIssue {
  title: string;
  category: string;
  urgency: 'critical' | 'high' | 'medium';
}

interface DiagnosisData {
  insufficientData?: boolean;
  insufficientReason?: string;
  dailyDiagnosis?: string;
  priorityIssue?: PriorityIssue;
  why?: string;
  actionPlan?: string[];
  expectedResult?: string;
  estimatedEffort?: 'low' | 'medium' | 'high';
}

interface DiagnosisResponse {
  success: boolean;
  data: DiagnosisData;
  generatedAt: string;
}

type ScreenState = 'idle' | 'loading' | 'ready' | 'insufficient' | 'error';

// ─── Category visual config ───────────────────────────────────────────────────

const CATEGORY_ICON: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  equipment:   { icon: Wrench,       color: 'text-destructive',  bg: 'bg-destructive/10' },
  staff:       { icon: Users,        color: 'text-[#B45309]',    bg: 'bg-[#F59E0B]/10'  },
  guests:      { icon: MessageSquare,color: 'text-[#EA580C]',    bg: 'bg-[#F97316]/10'  },
  suppliers:   { icon: Truck,        color: 'text-[#7C3AED]',    bg: 'bg-[#8B5CF6]/10'  },
  finance:     { icon: DollarSign,   color: 'text-[#16A34A]',    bg: 'bg-[#22C55E]/10'  },
  operations:  { icon: BarChart2,    color: 'text-primary',      bg: 'bg-primary/10'     },
  hygiene:     { icon: ShieldCheck,  color: 'text-[#0369A1]',    bg: 'bg-[#0EA5E9]/10'  },
  default:     { icon: AlertCircle,  color: 'text-muted-foreground', bg: 'bg-muted'     },
};

const URGENCY_COLOR: Record<string, string> = {
  critical: 'text-destructive',
  high:     'text-[#EA580C]',
  medium:   'text-[#B45309]',
};
const URGENCY_BG: Record<string, string> = {
  critical: 'bg-destructive/10',
  high:     'bg-[#F97316]/10',
  medium:   'bg-[#F59E0B]/10',
};
const URGENCY_LABEL: Record<string, string> = {
  critical: 'Критично',
  high:     'Высокий',
  medium:   'Средний',
};

// ─── Animation variants ───────────────────────────────────────────────────────

const rise = {
  hidden: { opacity: 0, y: 18 },
  show:   (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.09, duration: 0.44, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function LoadingState() {
  return (
    <div className="flex flex-col gap-5 px-6 pt-6 pb-10">
      {/* Big shimmer card */}
      <div className="rounded-[24px] overflow-hidden h-44 relative"
        style={{ background: 'linear-gradient(160deg, #1A1F38 0%, #161B2E 55%, #1D1440 100%)' }}>
        <motion.div className="absolute inset-0"
          animate={{ backgroundPosition: ['200% 0', '-200% 0'] }}
          transition={{ repeat: Infinity, duration: 2.4, ease: 'linear' }}
          style={{ background: 'linear-gradient(90deg, transparent 0%, rgba(91,92,235,0.12) 40%, transparent 100%)', backgroundSize: '200% 100%' }}
        />
        <div className="px-6 pt-6 flex flex-col gap-3">
          <div className="h-3 w-24 rounded-full bg-white/10" />
          <div className="h-4 w-4/5 rounded-full bg-white/15" />
          <div className="h-4 w-3/5 rounded-full bg-white/10" />
          <div className="h-4 w-2/3 rounded-full bg-white/8 mt-1" />
        </div>
      </div>
      {[0, 1, 2, 3].map((i) => (
        <motion.div key={i} animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ repeat: Infinity, duration: 1.6, delay: i * 0.15, ease: 'easeInOut' }}
          className="bd-card p-5 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-muted" />
            <div className="h-2.5 w-20 rounded-full bg-muted" />
          </div>
          <div className="h-4 w-full rounded-full bg-muted" />
          <div className="h-4 w-4/5 rounded-full bg-muted" />
        </motion.div>
      ))}
    </div>
  );
}

// ─── Idle state ───────────────────────────────────────────────────────────────

function IdleState({ onRun, dataCount }: { onRun: () => void; dataCount: number }) {
  return (
    <div className="flex flex-col items-center text-center px-8 py-12">
      <motion.div
        initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 240, damping: 20 }}
        className="w-24 h-24 rounded-[28px] flex items-center justify-center mb-6 relative"
        style={{ background: 'linear-gradient(160deg, #1A1F38, #1D1440)', boxShadow: '0 8px 32px rgba(91,92,235,0.28)' }}
      >
        <Stethoscope size={38} className="text-white" />
        <motion.div className="absolute inset-0 rounded-[28px]"
          animate={{ opacity: [0, 0.4, 0] }}
          transition={{ repeat: Infinity, duration: 2.8, ease: 'easeInOut' }}
          style={{ boxShadow: '0 0 0 12px rgba(91,92,235,0.15)' }}
        />
      </motion.div>

      <motion.h2 initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="text-[24px] font-black text-foreground tracking-tight mb-2 leading-tight">
        AI Доктор
      </motion.h2>
      <motion.p initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }}
        className="text-[14px] text-muted-foreground leading-relaxed max-w-[260px] mb-8">
        Анализирует реальные данные вашего ресторана — события, дела, персонал — и выдаёт операционный диагноз.
      </motion.p>

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22 }}
        className="w-full mb-6">
        <div className="bd-card px-5 py-4 flex items-center gap-3 mb-3 text-left">
          <div className="w-9 h-9 rounded-[11px] bg-primary/10 flex items-center justify-center flex-shrink-0">
            <BarChart2 size={16} className="text-primary" />
          </div>
          <div>
            <p className="text-[14px] font-bold text-foreground">Данных для анализа</p>
            <p className="text-[12px] text-muted-foreground mt-0.5">
              {dataCount === 0 ? 'Нет данных — добавьте события или дела' : `${dataCount} ${dataCount === 1 ? 'запись' : dataCount < 5 ? 'записи' : 'записей'}`}
            </p>
          </div>
          <span className={cn('ml-auto text-[14px] font-black',
            dataCount === 0 ? 'text-muted-foreground' : dataCount < 3 ? 'text-[#B45309]' : 'text-[#16A34A]')}>
            {dataCount}
          </span>
        </div>
      </motion.div>

      <motion.button type="button" onClick={onRun}
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28 }}
        whileTap={{ scale: 0.97 }}
        className="w-full h-14 rounded-2xl text-[16px] font-bold text-white flex items-center justify-center gap-2.5 shadow-[0_4px_24px_rgba(91,92,235,0.32)] hover:opacity-90 active:opacity-80 transition-all"
        style={{ background: 'linear-gradient(135deg, #5B5CEB 0%, #4A4BC9 100%)' }}
      >
        <Stethoscope size={18} />
        Запустить диагностику
      </motion.button>
    </div>
  );
}

// ─── Insufficient data state ──────────────────────────────────────────────────

function InsufficientState({
  reason, onNavigate,
}: {
  reason: string;
  onNavigate: (path: string) => void;
}) {
  const tips = [
    { icon: Plus, label: 'Добавить событие', href: '/add', desc: 'Инцидент, поломка, жалоба' },
    { icon: FolderOpen, label: 'Создать дело', href: '/cases/add', desc: 'Важная ситуация' },
  ];

  return (
    <div className="px-6 py-6 flex flex-col gap-5">
      <div className="bd-card px-5 py-5 flex flex-col items-center text-center">
        <div className="w-16 h-16 rounded-[20px] bg-[#F59E0B]/10 flex items-center justify-center mb-4">
          <Brain size={28} className="text-[#B45309]" />
        </div>
        <h3 className="text-[18px] font-black text-foreground tracking-tight mb-2">
          Недостаточно данных
        </h3>
        <p className="text-[14px] text-muted-foreground leading-relaxed max-w-[280px]">
          {reason}
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground px-1 mb-1">
          Начните здесь
        </p>
        {tips.map((t) => (
          <button key={t.href} type="button" onClick={() => onNavigate(t.href)}
            className="bd-card flex items-center gap-3 px-4 py-3.5 text-left hover:shadow-[var(--shadow-elevated)] active:scale-[0.985] transition-all">
            <div className="w-9 h-9 rounded-[11px] bg-primary/10 flex items-center justify-center flex-shrink-0">
              <t.icon size={15} className="text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-[14px] font-bold text-foreground">{t.label}</p>
              <p className="text-[12px] text-muted-foreground mt-0.5">{t.desc}</p>
            </div>
            <ChevronRight size={15} className="text-muted-foreground/40" />
          </button>
        ))}
      </div>

      <div className="bd-card px-5 py-4">
        <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-2.5">Почему важно добавлять данные</p>
        <div className="flex flex-col gap-3">
          {[
            'AI анализирует только реальные данные вашего заведения',
            'Чем больше событий и дел — тем точнее диагноз',
            'Минимум 3 записи для первого полноценного анализа',
          ].map((text, i) => (
            <div key={i} className="flex items-start gap-2.5">
              <CheckCircle2 size={14} className="text-primary mt-0.5 flex-shrink-0" />
              <p className="text-[13px] text-foreground leading-snug">{text}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Error state ──────────────────────────────────────────────────────────────

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="px-6 py-8 flex flex-col items-center text-center">
      <div className="w-14 h-14 rounded-[18px] bg-destructive/10 flex items-center justify-center mb-4">
        <AlertCircle size={24} className="text-destructive" />
      </div>
      <h3 className="text-[18px] font-bold text-foreground mb-2">Ошибка диагностики</h3>
      <p className="text-[14px] text-muted-foreground mb-6 max-w-[240px] leading-relaxed">
        Не удалось получить диагноз. Проверьте подключение и попробуйте снова.
      </p>
      <button type="button" onClick={onRetry}
        className="flex items-center gap-2 px-5 py-3 bg-primary text-white rounded-2xl text-[14px] font-semibold hover:opacity-90 active:scale-[0.97] transition-all">
        <RefreshCw size={14} />
        Попробовать снова
      </button>
    </div>
  );
}

// ─── Diagnosis display ────────────────────────────────────────────────────────

function DiagnosisDisplay({
  data, generatedAt, onRefresh,
}: {
  data: DiagnosisData;
  generatedAt: string;
  onRefresh: () => void;
}) {
  const catCfg = CATEGORY_ICON[data.priorityIssue?.category ?? ''] ?? CATEGORY_ICON.default;
  const CatIcon = catCfg.icon;
  const urgency = data.priorityIssue?.urgency ?? 'medium';

  const genDate = new Date(generatedAt);
  const genLabel = genDate.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) +
    ' · ' + genDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });

  return (
    <div className="flex flex-col gap-5 px-6 pt-4 pb-10">

      {/* ── 1. Daily Diagnosis — dark hero card ── */}
      <motion.div custom={0} variants={rise} initial="hidden" animate="show">
        <div className="rounded-[24px] overflow-hidden relative"
          style={{ background: 'linear-gradient(160deg, #1A1F38 0%, #161B2E 55%, #1D1440 100%)', boxShadow: '0 8px 32px rgba(22,27,46,0.28)' }}>
          <div aria-hidden className="absolute inset-0 pointer-events-none"
            style={{ background: 'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(91,92,235,0.20) 0%, transparent 70%)' }} />
          <div className="relative z-10 px-6 pt-6 pb-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center">
                <Stethoscope size={13} className="text-white/80" />
              </div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-white/40">Диагноз дня</p>
            </div>
            <p className="text-[15px] text-white/85 leading-relaxed font-medium">
              {data.dailyDiagnosis}
            </p>
            <div className="flex items-center gap-1.5 mt-4">
              <Clock size={11} className="text-white/30" />
              <p className="text-[11px] text-white/30 font-medium">{genLabel}</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── 2. Priority issue ── */}
      {data.priorityIssue && (
        <motion.div custom={1} variants={rise} initial="hidden" animate="show">
          <div className="bd-card overflow-hidden">
            <div className="h-[3px] w-full" style={{
              background: urgency === 'critical' ? '#EF4444' : urgency === 'high' ? '#F97316' : '#F59E0B'
            }} />
            <div className="px-5 py-4">
              <div className="flex items-center gap-2 mb-3">
                <div className={cn('w-5 h-5 rounded-full flex items-center justify-center', catCfg.bg)}>
                  <CatIcon size={10} className={catCfg.color} />
                </div>
                <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                  Приоритет №1
                </p>
                <span className={cn('ml-auto text-[11px] font-bold px-2 py-0.5 rounded-full',
                  URGENCY_COLOR[urgency], URGENCY_BG[urgency])}>
                  {URGENCY_LABEL[urgency]}
                </span>
              </div>
              <h2 className="text-[18px] font-black text-foreground tracking-tight leading-snug">
                {data.priorityIssue.title}
              </h2>
            </div>
          </div>
        </motion.div>
      )}

      {/* ── 3. Why ── */}
      {data.why && (
        <motion.div custom={2} variants={rise} initial="hidden" animate="show">
          <div className="bd-card px-5 py-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded-full bg-[#F59E0B]/10 flex items-center justify-center">
                <Brain size={12} className="text-[#B45309]" />
              </div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Почему это важно</p>
            </div>
            <p className="text-[14px] text-foreground leading-relaxed">{data.why}</p>
          </div>
        </motion.div>
      )}

      {/* ── 4. Action plan ── */}
      {data.actionPlan && data.actionPlan.length > 0 && (
        <motion.div custom={3} variants={rise} initial="hidden" animate="show">
          <div className="bd-card px-5 py-4">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                <Lightbulb size={12} className="text-primary" />
              </div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Что делать</p>
            </div>
            <div className="flex flex-col gap-3.5">
              {data.actionPlan.map((step, i) => (
                <motion.div key={i}
                  initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + i * 0.08, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                  className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-[11px] font-black text-primary">{i + 1}</span>
                  </div>
                  <p className="text-[14px] text-foreground leading-snug flex-1 pt-0.5">{step}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* ── 5. Expected result ── */}
      {data.expectedResult && (
        <motion.div custom={4} variants={rise} initial="hidden" animate="show">
          <div className="bd-card px-5 py-4"
            style={{ background: 'linear-gradient(135deg, rgba(34,197,94,0.05) 0%, rgba(16,185,129,0.05) 100%)' }}>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded-full bg-[#22C55E]/12 flex items-center justify-center">
                <TrendingUp size={12} className="text-[#16A34A]" />
              </div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Ожидаемый результат</p>
            </div>
            <p className="text-[14px] text-foreground leading-relaxed">{data.expectedResult}</p>
          </div>
        </motion.div>
      )}

      {/* ── Refresh row ── */}
      <motion.div custom={5} variants={rise} initial="hidden" animate="show">
        <button type="button" onClick={onRefresh}
          className="w-full h-12 rounded-2xl border border-border text-[14px] font-semibold text-muted-foreground flex items-center justify-center gap-2 hover:text-foreground hover:border-foreground/30 active:scale-[0.98] transition-all">
          <RefreshCw size={14} />
          Обновить диагноз
        </button>
      </motion.div>

    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const CACHE_KEY = 'bd_ai_diagnosis';
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

interface CachedDiagnosis {
  data: DiagnosisData;
  generatedAt: string;
  cachedAt: number;
}

function loadCache(): CachedDiagnosis | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed: CachedDiagnosis = JSON.parse(raw);
    if (Date.now() - parsed.cachedAt > CACHE_TTL) return null;
    return parsed;
  } catch { return null; }
}

function saveCache(data: DiagnosisData, generatedAt: string) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ data, generatedAt, cachedAt: Date.now() }));
  } catch { /* quota */ }
}

export default function Analysis() {
  const { profile }    = useRestaurant();
  const { events }     = useEvents();
  const { cases }      = useCases();
  const { employees }  = useEmployees();
  const { decisions, addDecision } = useDecisions();
  const { toast }      = useToast();
  const [, setLocation] = useLocation();

  const cached = useMemo(() => loadCache(), []);
  const [screen, setScreen] = useState<ScreenState>(() => {
    if (!cached) return 'idle';
    return cached.data.insufficientData ? 'insufficient' : 'ready';
  });
  const [diagnosis, setDiagnosis] = useState<{ data: DiagnosisData; generatedAt: string } | null>(cached);

  const dataCount = events.length + cases.length;

  const buildPayload = useCallback(() => {
    const empStats = {
      total:     employees.length,
      active:    employees.filter((e) => e.status === 'active').length,
      onLeave:   employees.filter((e) => e.status === 'on_leave').length,
      dismissed: employees.filter((e) => e.status === 'dismissed').length,
    };

    // Active cases only (open / in_progress / waiting)
    const activeCasesForAI = cases
      .filter((c) => ['open', 'in_progress', 'waiting'].includes(c.status))
      .map((c) => ({
        type:        c.type,
        title:       c.title,
        priority:    c.priority,
        status:      c.status,
        dueDate:     c.dueDate,
        responsible: c.responsible,
      }));

    const eventsForAI = [...events]
      .sort((a, b) => b.eventDate.localeCompare(a.eventDate))
      .slice(0, 30)
      .map((e) => ({
        title:       e.title,
        category:    e.category,
        priority:    e.priority,
        status:      e.status,
        eventDate:   e.eventDate,
        description: e.description?.slice(0, 120),
      }));

    return {
      profile: {
        name:         profile?.name ?? '',
        businessType: profile?.businessType,
        seats:        profile?.seats,
        avgCheck:     profile?.avgCheck,
        areas:        profile?.areas,
        openTime:     profile?.openTime,
        closeTime:    profile?.closeTime,
      },
      events:    eventsForAI,
      cases:     activeCasesForAI,
      employees: empStats,
    };
  }, [profile, events, cases, employees]);

  const runDiagnosis = useCallback(async () => {
    setScreen('loading');
    try {
      const payload = buildPayload();
      const res = await fetch('/api/ai/diagnosis', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: DiagnosisResponse = await res.json();

      if (!json.success) throw new Error('API returned failure');

      const result = json.data;
      setDiagnosis({ data: result, generatedAt: json.generatedAt });
      saveCache(result, json.generatedAt);

      if (result.insufficientData) {
        setScreen('insufficient');
      } else {
        setScreen('ready');
        // Auto-publish to Decision Feed — one card per day per diagnosis run
        if (result.priorityIssue && !hasTodayDecision(decisions)) {
          const urgency = result.priorityIssue.urgency;
          const saved = addDecision({
            recommendation: result.priorityIssue.title,
            reason:         result.why          ?? '',
            expectedImpact: result.expectedResult ?? '',
            estimatedEffort: result.estimatedEffort ?? 'medium',
            priority:       urgency === 'critical' ? 'critical'
                          : urgency === 'high'     ? 'high'
                          : urgency === 'medium'   ? 'medium'
                          : 'low',
            category: result.priorityIssue.category ?? 'operations',
            source:   'ai_doctor',
          });
          if (saved) {
            toast({
              variant:     'success',
              title:       'Рекомендация добавлена',
              description: 'Открыть в ленте решений →',
            });
          } else {
            toast({
              variant:     'error',
              title:       'Ошибка хранилища',
              description: 'Не удалось сохранить рекомендацию',
            });
          }
        }
      }
    } catch (err) {
      console.error('[AI Doctor]', err);
      setScreen('error');
    }
  }, [buildPayload, decisions, addDecision, toast]);

  return (
    <AppShell showBottomNav>
      <SafeArea className="pt-0 pb-28">

        {/* ── Sticky header ── */}
        <div className="sticky top-0 z-20 bg-[#F8F9FC]/95 backdrop-blur-md border-b border-border/60 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #5B5CEB, #4A4BC9)' }}>
              <Stethoscope size={13} className="text-white" />
            </div>
            <h1 className="text-[17px] font-black text-foreground tracking-tight">AI Доктор</h1>
          </div>
          {screen === 'ready' && (
            <button type="button" onClick={runDiagnosis}
              className="flex items-center gap-1.5 text-[13px] font-semibold text-primary hover:opacity-75 transition-opacity">
              <RefreshCw size={13} />
              Обновить
            </button>
          )}
        </div>

        {/* ── Content ── */}
        <AnimatePresence mode="wait">
          {screen === 'idle' && (
            <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <IdleState onRun={runDiagnosis} dataCount={dataCount} />
            </motion.div>
          )}

          {screen === 'loading' && (
            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="px-6 pt-8 pb-4 text-center mb-2">
                <motion.div className="inline-flex items-center gap-2.5 px-4 py-2.5 bg-primary/8 rounded-full"
                  animate={{ opacity: [0.7, 1, 0.7] }} transition={{ repeat: Infinity, duration: 1.8, ease: 'easeInOut' }}>
                  <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.4, ease: 'linear' }}>
                    <Sparkles size={14} className="text-primary" />
                  </motion.div>
                  <p className="text-[13px] font-semibold text-primary">Анализируем данные…</p>
                </motion.div>
              </div>
              <LoadingState />
            </motion.div>
          )}

          {screen === 'insufficient' && diagnosis && (
            <motion.div key="insufficient" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <InsufficientState
                reason={diagnosis.data.insufficientReason ?? 'Добавьте больше событий и дел для анализа.'}
                onNavigate={setLocation}
              />
            </motion.div>
          )}

          {screen === 'error' && (
            <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <ErrorState onRetry={runDiagnosis} />
            </motion.div>
          )}

          {screen === 'ready' && diagnosis && !diagnosis.data.insufficientData && (
            <motion.div key="ready" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <DiagnosisDisplay
                data={diagnosis.data}
                generatedAt={diagnosis.generatedAt}
                onRefresh={runDiagnosis}
              />
            </motion.div>
          )}
        </AnimatePresence>

      </SafeArea>
    </AppShell>
  );
}
