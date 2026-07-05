/**
 * AIAssessmentCard — displays the full AI reasoning for an event or case.
 *
 * Shows all 5 assessment fields: priority badge, explanation, businessImpact,
 * recommendedAction[] (numbered steps), and recommendedDeadline + timestamp.
 * Matches the visual language of PriorityModal's AssessedState.
 */
import { motion } from 'framer-motion';
import { Brain, TrendingDown, ListChecks, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AIAssessment, Priority } from '@/store/events';

// ─── Priority visual config (matches PriorityModal) ───────────────────────────

const PRI: Record<Priority, {
  label:     string;
  stripe:    string;
  textColor: string;
  bg:        string;
  faint:     string;
}> = {
  critical: { label: 'Критично', stripe: '#EF4444', textColor: '#DC2626', bg: 'rgba(220,38,38,0.10)', faint: 'rgba(239,68,68,0.06)' },
  high:     { label: 'Высокий',  stripe: '#F97316', textColor: '#EA580C', bg: 'rgba(234,88,12,0.10)', faint: 'rgba(249,115,22,0.06)' },
  medium:   { label: 'Средний',  stripe: '#F59E0B', textColor: '#D97706', bg: 'rgba(217,119,6,0.10)',  faint: 'rgba(245,158,11,0.06)' },
  low:      { label: 'Низкий',   stripe: '#22C55E', textColor: '#16A34A', bg: 'rgba(22,163,74,0.10)',  faint: 'rgba(34,197,94,0.06)'  },
};

// ─── Section label ─────────────────────────────────────────────────────────────

function SLabel({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={cn('text-[10px] font-black uppercase tracking-[0.14em] text-muted-foreground/55 mb-2', className)}>
      {children}
    </p>
  );
}

// ─── Props ─────────────────────────────────────────────────────────────────────

interface AIAssessmentCardProps {
  assessment: AIAssessment;
}

// ─── Component ─────────────────────────────────────────────────────────────────

export default function AIAssessmentCard({ assessment }: AIAssessmentCardProps) {
  // Always derive the visual scheme from the AI's own priority, not the item's
  // current priority (which may have been changed manually after the assessment).
  const pri = PRI[assessment.priority as Priority] ?? PRI.medium;

  const analyzedDate = new Date(assessment.analyzedAt).toLocaleDateString('ru-RU', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
  const analyzedTime = new Date(assessment.analyzedAt).toLocaleTimeString('ru-RU', {
    hour: '2-digit', minute: '2-digit',
  });

  return (
    <div className="overflow-hidden rounded-[20px] border border-border bg-card shadow-[var(--shadow-card)]">

      {/* ── Header bar with priority stripe ── */}
      <div
        className="relative px-5 pt-4 pb-3"
        style={{ background: 'linear-gradient(135deg, #1A1F38 0%, #161B2E 100%)' }}
      >
        {/* Coloured priority stripe along the top edge */}
        <div className="absolute inset-x-0 top-0 h-[3px]" style={{ backgroundColor: pri.stripe }} />

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
              <Brain size={13} className="text-white/70" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-white/40">AI-оценка</p>
              <p
                className="text-[15px] font-black leading-none tracking-tight"
                style={{ color: pri.stripe }}
              >
                {pri.label}
              </p>
            </div>
          </div>
          <p className="text-[10px] text-white/30 text-right leading-relaxed">
            {analyzedDate}<br />{analyzedTime}
          </p>
        </div>
      </div>

      {/* ── Body sections ── */}
      <div className="flex flex-col gap-0 divide-y divide-border/60">

        {/* Explanation */}
        <div className="px-5 py-4">
          <SLabel>Объяснение</SLabel>
          <p className="text-[14px] text-foreground leading-relaxed">{assessment.explanation}</p>
        </div>

        {/* Business risk */}
        {assessment.businessImpact && (
          <div
            className="px-5 py-4"
            style={{ background: `linear-gradient(135deg, ${pri.faint}, transparent)` }}
          >
            <div className="flex items-center gap-1.5 mb-2">
              <TrendingDown size={12} style={{ color: pri.textColor }} />
              <SLabel className="mb-0">Бизнес-риск при бездействии</SLabel>
            </div>
            <p className="text-[14px] text-foreground leading-relaxed">{assessment.businessImpact}</p>
          </div>
        )}

        {/* Action plan */}
        {assessment.recommendedAction && assessment.recommendedAction.length > 0 && (
          <div className="px-5 py-4">
            <div className="flex items-center gap-1.5 mb-3">
              <ListChecks size={12} className="text-primary" />
              <SLabel className="mb-0">План действий</SLabel>
            </div>
            <div className="flex flex-col gap-3">
              {assessment.recommendedAction.map((step, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.06, duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                  className="flex items-start gap-3"
                >
                  <div
                    className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{ backgroundColor: pri.bg }}
                  >
                    <span className="text-[10px] font-black" style={{ color: pri.textColor }}>{i + 1}</span>
                  </div>
                  <p className="text-[13px] text-foreground leading-snug flex-1 pt-0.5">{step}</p>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Deadline */}
        {assessment.recommendedDeadline && (
          <div className="px-5 py-3.5 flex items-center gap-3">
            <Clock size={14} className="text-muted-foreground flex-shrink-0" />
            <div className="flex-1">
              <SLabel className="mb-0.5">Рекомендуемый срок</SLabel>
              <p className="text-[14px] font-bold text-foreground">{assessment.recommendedDeadline}</p>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
