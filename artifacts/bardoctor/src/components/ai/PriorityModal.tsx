/**
 * PriorityModal — AI Priority Engine screen.
 *
 * Slides in from the right (consistent with Add.tsx / AddCase.tsx screens).
 * Phases: analyzing → questions (if needsMoreInfo) → assessed.
 * Users never choose priority manually — the AI decides.
 */
import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain, AlertCircle, RefreshCw, ChevronRight, X,
  Zap, TrendingDown, ListChecks, Clock, SkipForward,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import SafeArea from '@/components/layout/SafeArea';
import { useRestaurant } from '@/contexts/RestaurantContext';
import type { Priority } from '@/store/events';
import type { AIAssessment } from '@/store/events';

// ─── Types ────────────────────────────────────────────────────────────────────

interface AssessedResult {
  needsMoreInfo: false;
  priority: Priority;
  explanation: string;
  businessImpact: string;
  recommendedAction: string[];
  recommendedDeadline: string;
}

interface QuestionResult {
  needsMoreInfo: true;
  followUpQuestions: string[];
}

type APIResult = AssessedResult | QuestionResult;

export interface PriorityModalProps {
  itemType:     'event' | 'case';
  category:     string;
  title:        string;
  description?: string;
  extraField?:  string;
  onConfirm:    (priority: Priority, assessment: AIAssessment) => void;
  onSkip:       () => void;
}

// ─── Priority visual config ───────────────────────────────────────────────────

const PRI: Record<Priority, { label: string; stripe: string; textColor: string; bg: string; faint: string }> = {
  critical: { label: 'Критично',  stripe: '#EF4444', textColor: '#DC2626', bg: 'rgba(220,38,38,0.10)', faint: 'rgba(239,68,68,0.06)' },
  high:     { label: 'Высокий',  stripe: '#F97316', textColor: '#EA580C', bg: 'rgba(234,88,12,0.10)', faint: 'rgba(249,115,22,0.06)' },
  medium:   { label: 'Средний',  stripe: '#F59E0B', textColor: '#D97706', bg: 'rgba(217,119,6,0.10)',  faint: 'rgba(245,158,11,0.06)' },
  low:      { label: 'Низкий',   stripe: '#22C55E', textColor: '#16A34A', bg: 'rgba(22,163,74,0.10)',  faint: 'rgba(34,197,94,0.06)'  },
};

// ─── Slide animation (matches Add.tsx pattern) ────────────────────────────────

const slideRight = {
  initial:  { x: '100%', opacity: 0 },
  animate:  { x: 0, opacity: 1, transition: { duration: 0.32, ease: [0.22, 1, 0.36, 1] as const } },
  exit:     { x: '100%', opacity: 0, transition: { duration: 0.22, ease: 'easeIn' as const } },
};

// ─── Section label ────────────────────────────────────────────────────────────

function SLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-black uppercase tracking-[0.14em] text-muted-foreground/55 mb-2">
      {children}
    </p>
  );
}

// ─── Analyzing phase ──────────────────────────────────────────────────────────

function AnalyzingState() {
  return (
    <div className="flex flex-col items-center justify-center flex-1 px-6 py-12">
      {/* Dark hero shimmer card */}
      <div className="w-full rounded-[24px] overflow-hidden relative mb-8"
        style={{ background: 'linear-gradient(160deg, #1A1F38 0%, #161B2E 55%, #1D1440 100%)', height: 200 }}>
        <motion.div className="absolute inset-0"
          animate={{ backgroundPosition: ['200% 0', '-200% 0'] }}
          transition={{ repeat: Infinity, duration: 2.2, ease: 'linear' }}
          style={{ background: 'linear-gradient(90deg, transparent, rgba(91,92,235,0.14), transparent)', backgroundSize: '200% 100%' }}
        />
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
          <motion.div
            animate={{ scale: [1, 1.12, 1], opacity: [0.7, 1, 0.7] }}
            transition={{ repeat: Infinity, duration: 2.4, ease: 'easeInOut' }}
            className="w-16 h-16 rounded-[20px] bg-white/10 flex items-center justify-center"
          >
            <Brain size={28} className="text-white/80" />
          </motion.div>
          <div className="text-center">
            <motion.p
              animate={{ opacity: [0.6, 1, 0.6] }}
              transition={{ repeat: Infinity, duration: 1.8, ease: 'easeInOut' }}
              className="text-[15px] font-bold text-white/80"
            >
              Операционный директор AI анализирует…
            </motion.p>
            <p className="text-[12px] text-white/40 mt-1">Оцениваем критичность и бизнес-риски</p>
          </div>
        </div>
      </div>

      {/* Skeleton content */}
      {[80, 60, 70, 50].map((w, i) => (
        <motion.div
          key={i}
          animate={{ opacity: [0.4, 0.8, 0.4] }}
          transition={{ repeat: Infinity, duration: 1.6, delay: i * 0.15, ease: 'easeInOut' }}
          className="h-3 bg-muted rounded-full mb-3 w-full"
          style={{ maxWidth: `${w}%` }}
        />
      ))}
    </div>
  );
}

// ─── Questions phase ──────────────────────────────────────────────────────────

function QuestionsState({
  questions, onSubmit, onSkip,
}: {
  questions: string[];
  onSubmit: (answers: Array<{ question: string; answer: string }>) => void;
  onSkip: () => void;
}) {
  const [answers, setAnswers] = useState<string[]>(() => questions.map(() => ''));

  const hasAny = answers.some((a) => a.trim().length > 0);

  function handleSubmit() {
    const pairs = questions
      .map((q, i) => ({ question: q, answer: answers[i].trim() }))
      .filter((qa) => qa.answer.length > 0);
    onSubmit(pairs);
  }

  return (
    <motion.div key="questions" {...slideRight} className="flex flex-col min-h-[100dvh]">
      <SafeArea className="flex flex-col flex-1 pt-5 pb-10">

        <div className="px-6 mb-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-[13px] bg-[#F59E0B]/10 flex items-center justify-center flex-shrink-0">
              <Brain size={18} className="text-[#D97706]" />
            </div>
            <div>
              <p className="text-[12px] font-black uppercase tracking-widest text-[#D97706]">Нужны уточнения</p>
              <h2 className="text-[20px] font-black text-foreground tracking-tight leading-tight">Помогите оценить ситуацию</h2>
            </div>
          </div>
          <p className="text-[14px] text-muted-foreground leading-relaxed">
            Для точной оценки критичности ответьте на несколько вопросов — это займёт меньше минуты.
          </p>
        </div>

        <div className="flex-1 overflow-y-auto px-6 flex flex-col gap-5">
          {questions.map((q, i) => (
            <div key={i}>
              <p className="text-[11px] font-black uppercase tracking-widest text-muted-foreground mb-2">
                Вопрос {i + 1}
              </p>
              <p className="text-[15px] font-semibold text-foreground mb-3 leading-snug">{q}</p>
              <textarea
                value={answers[i]}
                onChange={(e) => setAnswers((prev) => {
                  const next = [...prev];
                  next[i] = e.target.value;
                  return next;
                })}
                placeholder="Ваш ответ…"
                rows={2}
                className="w-full bg-card border border-border rounded-2xl text-[15px] font-medium text-foreground px-4 py-3.5 placeholder:text-muted-foreground/40 placeholder:font-normal focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/12 transition-all resize-none leading-relaxed"
              />
            </div>
          ))}

          {/* Continue */}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!hasAny}
            className={cn(
              'w-full h-14 rounded-2xl text-[16px] font-bold tracking-tight transition-all flex items-center justify-center gap-2 mt-2',
              hasAny
                ? 'bg-primary text-white shadow-[0_4px_20px_rgba(91,92,235,0.30)] active:scale-[0.98] hover:opacity-90'
                : 'bg-muted text-muted-foreground cursor-not-allowed',
            )}
          >
            Продолжить анализ
            <ChevronRight size={18} />
          </button>

          {/* Escape hatch */}
          <button
            type="button"
            onClick={onSkip}
            className="w-full flex items-center justify-center gap-1.5 text-[13px] font-semibold text-muted-foreground hover:text-foreground transition-colors py-2"
          >
            <SkipForward size={13} />
            Пропустить — назначить средний приоритет
          </button>
        </div>
      </SafeArea>
    </motion.div>
  );
}

// ─── Assessment phase ─────────────────────────────────────────────────────────

function AssessedState({
  result, onConfirm, onReanalyze,
}: {
  result: AssessedResult;
  onConfirm: () => void;
  onReanalyze: () => void;
}) {
  const pri = PRI[result.priority];

  return (
    <motion.div key="assessed" {...slideRight} className="flex flex-col min-h-[100dvh]">
      <SafeArea className="flex flex-col flex-1 pt-0 pb-8">

        {/* Priority hero card */}
        <div className="relative mb-0"
          style={{ background: 'linear-gradient(160deg, #1A1F38 0%, #161B2E 60%, #1D1440 100%)' }}>
          <div aria-hidden className="absolute inset-0 pointer-events-none"
            style={{ background: 'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(91,92,235,0.16) 0%, transparent 70%)' }} />

          {/* Priority stripe */}
          <div className="h-1 w-full" style={{ backgroundColor: pri.stripe }} />

          <div className="relative z-10 px-6 pt-6 pb-6 flex flex-col items-center text-center">
            <div className="w-11 h-11 rounded-[14px] flex items-center justify-center mb-3"
              style={{ backgroundColor: pri.bg }}>
              <Zap size={20} style={{ color: pri.textColor }} />
            </div>
            <p className="text-[11px] font-black uppercase tracking-[0.14em] text-white/40 mb-1.5">
              Приоритет установлен
            </p>
            <p className="text-[32px] font-black text-white tracking-tight leading-none mb-0.5"
              style={{ color: pri.stripe }}>
              {pri.label}
            </p>
          </div>
        </div>

        {/* Assessment body */}
        <div className="flex-1 overflow-y-auto px-6 pt-5 flex flex-col gap-5">

          {/* Explanation */}
          <div className="bd-card px-5 py-4">
            <SLabel>Объяснение</SLabel>
            <p className="text-[14px] text-foreground leading-relaxed">{result.explanation}</p>
          </div>

          {/* Business impact */}
          <div className="bd-card px-5 py-4 overflow-hidden"
            style={{ background: `linear-gradient(135deg, ${pri.faint}, transparent)` }}>
            <div className="flex items-center gap-2 mb-2">
              <TrendingDown size={13} style={{ color: pri.textColor }} />
              <SLabel>Бизнес-риск при бездействии</SLabel>
            </div>
            <p className="text-[14px] text-foreground leading-relaxed">{result.businessImpact}</p>
          </div>

          {/* Action plan */}
          <div className="bd-card px-5 py-4">
            <div className="flex items-center gap-2 mb-3">
              <ListChecks size={13} className="text-primary" />
              <SLabel>План действий</SLabel>
            </div>
            <div className="flex flex-col gap-3">
              {result.recommendedAction.map((step, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.07, duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                  className="flex items-start gap-3"
                >
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-[11px] font-black text-primary">{i + 1}</span>
                  </div>
                  <p className="text-[14px] text-foreground leading-snug flex-1 pt-0.5">{step}</p>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Deadline */}
          <div className="flex items-center gap-3 px-5 py-4 rounded-[16px] border border-border bg-card">
            <Clock size={16} className="text-muted-foreground flex-shrink-0" />
            <div>
              <SLabel>Рекомендуемый срок</SLabel>
              <p className="text-[15px] font-bold text-foreground -mt-0.5">{result.recommendedDeadline}</p>
            </div>
          </div>

          {/* Confirm */}
          <button
            type="button"
            onClick={onConfirm}
            className="w-full h-14 rounded-2xl text-[16px] font-bold text-white flex items-center justify-center gap-2 shadow-[0_4px_20px_rgba(91,92,235,0.30)] hover:opacity-90 active:scale-[0.98] transition-all"
            style={{ background: 'linear-gradient(135deg, #5B5CEB 0%, #4A4BC9 100%)' }}
          >
            Принять оценку
          </button>

          <button
            type="button"
            onClick={onReanalyze}
            className="w-full flex items-center justify-center gap-1.5 text-[13px] font-semibold text-muted-foreground hover:text-foreground transition-colors py-2"
          >
            <RefreshCw size={12} />
            Переанализировать
          </button>
        </div>
      </SafeArea>
    </motion.div>
  );
}

// ─── Error phase ──────────────────────────────────────────────────────────────

function ErrorState({ onRetry, onSkip }: { onRetry: () => void; onSkip: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center flex-1 px-6 py-12 text-center">
      <div className="w-14 h-14 rounded-[18px] bg-destructive/10 flex items-center justify-center mb-4">
        <AlertCircle size={24} className="text-destructive" />
      </div>
      <h3 className="text-[18px] font-black text-foreground tracking-tight mb-2">Ошибка анализа</h3>
      <p className="text-[14px] text-muted-foreground mb-6 max-w-[240px] leading-relaxed">
        Не удалось получить оценку AI. Проверьте подключение и попробуйте снова.
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="flex items-center gap-2 px-5 py-3 bg-primary text-white rounded-2xl text-[14px] font-semibold hover:opacity-90 active:scale-[0.97] transition-all mb-3"
      >
        <RefreshCw size={14} />
        Попробовать снова
      </button>
      <button
        type="button"
        onClick={onSkip}
        className="flex items-center gap-1.5 text-[13px] font-semibold text-muted-foreground hover:text-foreground transition-colors"
      >
        <SkipForward size={13} />
        Пропустить — назначить средний приоритет
      </button>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

type Phase = 'analyzing' | 'questions' | 'assessed' | 'error';

export default function PriorityModal({
  itemType, category, title, description, extraField,
  onConfirm, onSkip,
}: PriorityModalProps) {
  const { profile } = useRestaurant();

  const [phase,     setPhase]     = useState<Phase>('analyzing');
  const [result,    setResult]    = useState<AssessedResult | null>(null);
  const [questions, setQuestions] = useState<string[]>([]);

  const analyze = useCallback(async (followUpAnswers?: Array<{ question: string; answer: string }>) => {
    setPhase('analyzing');
    try {
      const res = await fetch('/api/priority/assess', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          type:     itemType,
          category,
          title,
          description,
          extraField,
          followUpAnswers,
          restaurantContext: {
            name:         profile?.name,
            businessType: profile?.businessType,
            seats:        profile?.seats,
          },
        }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json() as { success: boolean; data: APIResult };
      if (!json.success) throw new Error('API failure');

      const data = json.data;
      if (data.needsMoreInfo) {
        const qs = data.followUpQuestions ?? [];
        if (qs.length === 0) throw new Error('Empty questions from server');
        setQuestions(qs);
        setPhase('questions');
      } else {
        // Defensive: verify all required assessed fields before rendering
        const a = data as AssessedResult;
        const valid =
          a.priority &&
          typeof a.explanation    === 'string' && a.explanation.trim().length > 0 &&
          typeof a.businessImpact === 'string' && a.businessImpact.trim().length > 0 &&
          Array.isArray(a.recommendedAction)   && a.recommendedAction.length > 0 &&
          typeof a.recommendedDeadline === 'string' && a.recommendedDeadline.trim().length > 0;
        if (!valid) throw new Error('Incomplete assessment shape from server');
        setResult(a);
        setPhase('assessed');
      }
    } catch (err) {
      console.error('[PriorityModal]', err);
      setPhase('error');
    }
  }, [itemType, category, title, description, extraField, profile]);

  // Auto-run on mount
  useEffect(() => { analyze(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function handleConfirm() {
    if (!result) return;
    const assessment: AIAssessment = {
      priority:            result.priority,
      explanation:         result.explanation,
      businessImpact:      result.businessImpact,
      recommendedAction:   result.recommendedAction,
      recommendedDeadline: result.recommendedDeadline,
      analyzedAt:          new Date().toISOString(),
    };
    onConfirm(result.priority, assessment);
  }

  return (
    <motion.div key="priority-modal" {...slideRight} className="flex flex-col min-h-[100dvh] bg-background">
      {/* Top bar */}
      <SafeArea className="pt-0 pb-0 flex-none">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/60">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
              <Brain size={13} className="text-primary" />
            </div>
            <p className="text-[16px] font-black text-foreground tracking-tight">AI Приоритет</p>
          </div>
          <button
            type="button"
            onClick={onSkip}
            className="w-9 h-9 rounded-full bg-muted flex items-center justify-center hover:bg-border transition-colors active:scale-95"
            title="Пропустить анализ"
          >
            <X size={15} className="text-muted-foreground" />
          </button>
        </div>
      </SafeArea>

      {/* Phase content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <AnimatePresence mode="wait">
          {phase === 'analyzing' && (
            <motion.div key="analyzing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex-1 flex flex-col">
              <AnalyzingState />
            </motion.div>
          )}

          {phase === 'questions' && (
            <QuestionsState
              questions={questions}
              onSubmit={(answers) => analyze(answers)}
              onSkip={onSkip}
            />
          )}

          {phase === 'assessed' && result && (
            <AssessedState
              result={result}
              onConfirm={handleConfirm}
              onReanalyze={() => analyze()}
            />
          )}

          {phase === 'error' && (
            <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex-1 flex flex-col">
              <ErrorState onRetry={() => analyze()} onSkip={onSkip} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
