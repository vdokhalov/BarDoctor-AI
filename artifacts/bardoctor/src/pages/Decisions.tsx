import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'wouter';
import {
  Check, Clock, X, ChevronDown, ChevronUp,
  Wrench, MessageSquare, Users, BarChart2,
  DollarSign, Settings2, ShieldCheck, Sparkles,
  ExternalLink, Inbox,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import AppShell from '@/components/layout/AppShell';
import SafeArea from '@/components/layout/SafeArea';
import { useDecisions } from '@/contexts/DecisionsContext';
import { useCases } from '@/contexts/CasesContext';
import {
  Decision, DecisionPriority,
  PRIORITY_DISPLAY, EFFORT_DISPLAY, CATEGORY_LABEL,
  categoryToCaseType,
} from '@/store/decisions';
import { caseNid, makeTimeline } from '@/store/cases';
import { useToast } from '@/components/ds/Toast';
import type { Case, CaseType, CasePriority } from '@/store/cases';

// ─── Category icon map ────────────────────────────────────────────────────────

const CAT_ICON: Record<string, React.ElementType> = {
  equipment:   Wrench,
  guests:      MessageSquare,
  staff:       Users,
  operations:  BarChart2,
  finance:     DollarSign,
  maintenance: Settings2,
  hygiene:     ShieldCheck,
  default:     Sparkles,
};

// ─── Effort dots ──────────────────────────────────────────────────────────────

function EffortDots({ count }: { count: number }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className={cn(
            'w-1.5 h-1.5 rounded-full transition-colors',
            i <= count ? 'bg-foreground/60' : 'bg-foreground/15',
          )}
        />
      ))}
    </div>
  );
}

// ─── Section label ────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-black uppercase tracking-[0.12em] text-muted-foreground/60 mb-1">
      {children}
    </p>
  );
}

// ─── Single decision card ─────────────────────────────────────────────────────

function DecisionCard({
  decision,
  onAccept,
  onDismiss,
  onLater,
}: {
  decision: Decision;
  onAccept: () => void;
  onDismiss: () => void;
  onLater: () => void;
}) {
  const priCfg    = PRIORITY_DISPLAY[decision.priority];
  const effortCfg = EFFORT_DISPLAY[decision.estimatedEffort];
  const CatIcon   = CAT_ICON[decision.category] ?? CAT_ICON.default;
  const catLabel  = CATEGORY_LABEL[decision.category] ?? decision.category;
  const isLater   = decision.status === 'later';

  const dateStr = new Date(decision.createdAt).toLocaleDateString('ru-RU', {
    day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit',
  });

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8, scale: 0.97 }}
      transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
      className="bg-card border border-card-border rounded-[20px] overflow-hidden shadow-[var(--shadow-card)]"
    >
      {/* Priority stripe */}
      <div className="h-[3px] w-full" style={{ backgroundColor: priCfg.stripe }} />

      {/* Card header */}
      <div className="px-5 pt-4 pb-3 flex items-center justify-between border-b border-border/60">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
            <CatIcon size={12} className="text-muted-foreground" />
          </div>
          <span className="text-[10px] font-black uppercase tracking-[0.10em] text-muted-foreground">
            {catLabel}
          </span>
          {isLater && (
            <span className="text-[9px] font-bold bg-[#F59E0B]/10 text-[#D97706] px-1.5 py-0.5 rounded-full uppercase tracking-wide">
              Отложено
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className="text-[10px] font-black uppercase tracking-[0.08em]"
            style={{ color: priCfg.color }}
          >
            {priCfg.label}
          </span>
        </div>
      </div>

      {/* Card body */}
      <div className="px-5 py-4 flex flex-col gap-4">

        {/* Recommendation */}
        <div>
          <SectionLabel>Рекомендация</SectionLabel>
          <p className="text-[16px] font-black text-foreground leading-snug tracking-tight">
            {decision.recommendation}
          </p>
        </div>

        {/* Divider */}
        <div className="h-px bg-border/50" />

        {/* Reason */}
        <div>
          <SectionLabel>Причина</SectionLabel>
          <p className="text-[13px] text-foreground/80 leading-relaxed">
            {decision.reason}
          </p>
        </div>

        {/* Expected impact */}
        <div>
          <SectionLabel>Ожидаемый результат</SectionLabel>
          <p className="text-[13px] text-foreground/80 leading-relaxed">
            {decision.expectedImpact}
          </p>
        </div>

        {/* Effort row */}
        <div className="flex items-center justify-between py-2 border-t border-b border-border/50">
          <span className="text-[10px] font-black uppercase tracking-[0.10em] text-muted-foreground/60">
            Трудозатраты
          </span>
          <div className="flex items-center gap-2">
            <EffortDots count={effortCfg.dots} />
            <span className="text-[11px] font-semibold text-foreground/70">
              {effortCfg.label}
            </span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2.5 pt-0.5">
          {/* Accept */}
          <button
            type="button"
            onClick={onAccept}
            className="flex-1 h-11 rounded-[14px] bg-primary text-white text-[13px] font-bold flex items-center justify-center gap-1.5 hover:opacity-90 active:scale-[0.97] transition-all shadow-[0_2px_12px_rgba(91,92,235,0.24)]"
          >
            <Check size={14} strokeWidth={2.5} />
            Принять
          </button>

          {/* Later */}
          {!isLater && (
            <button
              type="button"
              onClick={onLater}
              className="h-11 px-4 rounded-[14px] bg-muted text-foreground/60 text-[13px] font-semibold flex items-center justify-center gap-1.5 hover:bg-border active:scale-[0.97] transition-all"
            >
              <Clock size={13} />
              Позже
            </button>
          )}

          {/* Dismiss */}
          <button
            type="button"
            onClick={onDismiss}
            className="h-11 px-4 rounded-[14px] bg-destructive/8 text-destructive text-[13px] font-semibold flex items-center justify-center gap-1.5 hover:bg-destructive/14 active:scale-[0.97] transition-all"
          >
            <X size={13} />
            {isLater ? 'Закрыть' : 'Отклонить'}
          </button>
        </div>
      </div>

      {/* Footer stamp */}
      <div className="px-5 pb-3 flex items-center justify-between">
        <span className="text-[10px] text-muted-foreground/40 font-medium">{dateStr}</span>
        <div className="flex items-center gap-1">
          <Sparkles size={9} className="text-primary/40" />
          <span className="text-[10px] text-primary/40 font-medium">AI Doctor</span>
        </div>
      </div>
    </motion.div>
  );
}

// ─── History card (compact read-only) ────────────────────────────────────────

function HistoryCard({ decision, onNavigateCase }: { decision: Decision; onNavigateCase: (id: string) => void }) {
  const priCfg   = PRIORITY_DISPLAY[decision.priority];
  const CatIcon  = CAT_ICON[decision.category] ?? CAT_ICON.default;
  const catLabel = CATEGORY_LABEL[decision.category] ?? decision.category;
  const isAccepted = decision.status === 'accepted';

  const dateStr = decision.actionAt
    ? new Date(decision.actionAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
    : '';

  return (
    <div className="flex items-start gap-3 px-5 py-3.5 border-b border-border/40 last:border-b-0">
      {/* Status dot */}
      <div
        className={cn(
          'w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0',
          isAccepted ? 'bg-[#22C55E]' : 'bg-border',
        )}
      />

      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold text-foreground/70 leading-snug line-clamp-2">
          {decision.recommendation}
        </p>
        <div className="flex items-center gap-2 mt-1">
          <CatIcon size={10} className="text-muted-foreground/50 flex-shrink-0" />
          <span className="text-[10px] text-muted-foreground/50 font-medium">{catLabel}</span>
          <span className="text-muted-foreground/25">·</span>
          <span
            className={cn('text-[10px] font-semibold', isAccepted ? 'text-[#16A34A]' : 'text-muted-foreground/50')}
          >
            {isAccepted ? 'Принято' : 'Отклонено'}
          </span>
          {dateStr && (
            <>
              <span className="text-muted-foreground/25">·</span>
              <span className="text-[10px] text-muted-foreground/40">{dateStr}</span>
            </>
          )}
        </div>
      </div>

      {/* If accepted and has a case, show link */}
      {isAccepted && decision.caseId && (
        <button
          type="button"
          onClick={() => onNavigateCase(decision.caseId!)}
          className="flex-shrink-0 w-7 h-7 rounded-full bg-muted flex items-center justify-center hover:bg-border transition-colors"
        >
          <ExternalLink size={11} className="text-muted-foreground" />
        </button>
      )}
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ onNavigateAnalysis }: { onNavigateAnalysis: () => void }) {
  return (
    <div className="flex flex-col items-center text-center px-8 py-12">
      <motion.div
        initial={{ scale: 0.85, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 220, damping: 22 }}
        className="w-20 h-20 rounded-[24px] bg-card border border-card-border flex items-center justify-center mb-5 shadow-[var(--shadow-card)]"
      >
        <Inbox size={28} className="text-muted-foreground/40" />
      </motion.div>
      <motion.h2
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="text-[18px] font-black text-foreground tracking-tight mb-2"
      >
        Нет ожидающих решений
      </motion.h2>
      <motion.p
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.16 }}
        className="text-[14px] text-muted-foreground leading-relaxed max-w-[260px] mb-6"
      >
        Запустите диагностику AI Доктора — рекомендации автоматически появятся здесь
      </motion.p>
      <motion.button
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.22 }}
        type="button"
        onClick={onNavigateAnalysis}
        whileTap={{ scale: 0.97 }}
        className="flex items-center gap-2 px-5 py-3 bg-primary text-white rounded-2xl text-[14px] font-semibold hover:opacity-90 active:scale-[0.97] transition-all shadow-[0_2px_12px_rgba(91,92,235,0.24)]"
      >
        <Sparkles size={14} />
        Открыть AI Доктор
      </motion.button>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function Decisions() {
  const [, setLocation]  = useLocation();
  const { decisions, acceptDecision, dismissDecision, snoozeDecision } = useDecisions();
  const { addCase }      = useCases();
  const { toast }        = useToast();
  const [historyOpen, setHistoryOpen] = useState(false);

  const pending  = useMemo(() => decisions.filter((d) => d.status === 'pending'), [decisions]);
  const later    = useMemo(() => decisions.filter((d) => d.status === 'later'),   [decisions]);
  const history  = useMemo(
    () => decisions.filter((d) => d.status === 'accepted' || d.status === 'dismissed'),
    [decisions],
  );

  const activeFeed = [...pending, ...later];
  const pendingCount = pending.length;

  // ── Date header ───────────────────────────────────────────────────────────

  const today = new Date().toLocaleDateString('ru-RU', {
    weekday: 'long', day: 'numeric', month: 'long',
  });
  const todayCap = today.charAt(0).toUpperCase() + today.slice(1);

  // ── Accept handler ────────────────────────────────────────────────────────

  const handleAccept = (decision: Decision) => {
    const now = new Date().toISOString();

    const newCase: Case = {
      id:               caseNid(),
      type:             categoryToCaseType(decision.category) as CaseType,
      title:            decision.recommendation,
      description:      [
        decision.reason,
        '',
        `Ожидаемый результат: ${decision.expectedImpact}`,
        `Трудозатраты: ${EFFORT_DISPLAY[decision.estimatedEffort].label}`,
      ].join('\n'),
      priority:         decision.priority as CasePriority,
      status:           'open',
      responsible:      '',
      dueDate:          '',
      photos:           [],
      files:            [],
      comments:         [],
      timeline:         [makeTimeline('created', 'Создано из ленты решений AI Doctor')],
      relatedTasks:     [],
      relatedEquipment: [],
      createdAt:        now,
      updatedAt:        now,
    };

    const ok = addCase(newCase);
    if (ok) {
      acceptDecision(decision.id, newCase.id);
      toast({
        variant: 'success',
        title:   'Задача создана',
        description: `«${decision.recommendation.slice(0, 50)}${decision.recommendation.length > 50 ? '…' : ''}» добавлена в дела`,
      });
    } else {
      toast({ variant: 'error', title: 'Ошибка хранилища', description: 'Не удалось сохранить задачу' });
    }
  };

  return (
    <AppShell showBottomNav>
      <SafeArea className="pt-0 pb-28">

        {/* ── Sticky header ── */}
        <div className="sticky top-0 z-20 bg-[#F8F9FC]/95 backdrop-blur-md border-b border-border/60 px-6 py-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.12em] text-muted-foreground/50 mb-0.5">
                Оперативная сводка
              </p>
              <h1 className="text-[17px] font-black text-foreground tracking-tight leading-tight">
                {todayCap}
              </h1>
            </div>
            {pendingCount > 0 && (
              <div className="flex items-center gap-1.5 mt-1">
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                <span className="text-[12px] font-bold text-primary">
                  {pendingCount} {pendingCount === 1 ? 'решение' : pendingCount < 5 ? 'решения' : 'решений'}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* ── Content ── */}
        {activeFeed.length === 0 && history.length === 0 ? (
          <EmptyState onNavigateAnalysis={() => setLocation('/analysis')} />
        ) : (
          <div className="px-6 py-5 flex flex-col gap-4">

            {/* Active feed */}
            {activeFeed.length > 0 && (
              <div className="flex flex-col gap-3">
                <AnimatePresence mode="popLayout">
                  {activeFeed.map((decision) => (
                    <DecisionCard
                      key={decision.id}
                      decision={decision}
                      onAccept={() => handleAccept(decision)}
                      onDismiss={() => {
                        dismissDecision(decision.id);
                        toast({ variant: 'default', title: 'Отклонено', description: 'Рекомендация перемещена в историю' });
                      }}
                      onLater={() => {
                        snoozeDecision(decision.id);
                        toast({ variant: 'default', title: 'Отложено', description: 'Рекомендация перемещена в конец списка' });
                      }}
                    />
                  ))}
                </AnimatePresence>
              </div>
            )}

            {/* No active but has history */}
            {activeFeed.length === 0 && history.length > 0 && (
              <div className="bd-card px-5 py-6 flex flex-col items-center text-center">
                <div className="w-10 h-10 rounded-[12px] bg-[#22C55E]/10 flex items-center justify-center mb-3">
                  <Check size={18} className="text-[#16A34A]" />
                </div>
                <p className="text-[15px] font-bold text-foreground mb-1">
                  Все решения обработаны
                </p>
                <p className="text-[13px] text-muted-foreground max-w-[230px] leading-relaxed">
                  Запустите AI Доктора снова для получения новых рекомендаций
                </p>
              </div>
            )}

            {/* History section */}
            {history.length > 0 && (
              <div className="mt-2">
                <button
                  type="button"
                  onClick={() => setHistoryOpen((v) => !v)}
                  className="w-full flex items-center justify-between px-1 py-2 group"
                >
                  <p className="text-[10px] font-black uppercase tracking-[0.12em] text-muted-foreground/50 group-hover:text-muted-foreground transition-colors">
                    История · {history.length}
                  </p>
                  {historyOpen
                    ? <ChevronUp size={14} className="text-muted-foreground/50" />
                    : <ChevronDown size={14} className="text-muted-foreground/50" />}
                </button>

                <AnimatePresence>
                  {historyOpen && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                      className="overflow-hidden"
                    >
                      <div className="bd-card overflow-hidden mt-2">
                        {history.slice(0, 20).map((d) => (
                          <HistoryCard
                            key={d.id}
                            decision={d}
                            onNavigateCase={(caseId) => setLocation(`/cases/${caseId}`)}
                          />
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

          </div>
        )}

      </SafeArea>
    </AppShell>
  );
}
