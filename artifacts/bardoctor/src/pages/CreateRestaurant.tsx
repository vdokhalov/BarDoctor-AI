import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { ChevronLeft, Minus, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import AppShell from '@/components/layout/AppShell';
import Button from '@/components/ds/Button';
import { cn } from '@/lib/utils';

// ─── Data ────────────────────────────────────────────────────────────────────

const BUSINESS_TYPES = [
  { value: 'restaurant', label: 'Ресторан',  emoji: '🍽️' },
  { value: 'bar',        label: 'Бар',        emoji: '🍺' },
  { value: 'cafe',       label: 'Кафе',       emoji: '☕' },
  { value: 'fastfood',   label: 'Фастфуд',    emoji: '🍔' },
  { value: 'coffee',     label: 'Кофейня',    emoji: '🫖' },
  { value: 'pizza',      label: 'Пиццерия',   emoji: '🍕' },
  { value: 'canteen',    label: 'Столовая',   emoji: '🥘' },
  { value: 'other',      label: 'Другое',     emoji: '✨' },
];

const COUNTRIES = [
  { value: 'ru', label: 'Россия',      emoji: '🇷🇺' },
  { value: 'kz', label: 'Казахстан',   emoji: '🇰🇿' },
  { value: 'by', label: 'Беларусь',    emoji: '🇧🇾' },
  { value: 'kg', label: 'Кыргызстан',  emoji: '🇰🇬' },
  { value: 'uz', label: 'Узбекистан',  emoji: '🇺🇿' },
  { value: 'ge', label: 'Грузия',      emoji: '🇬🇪' },
  { value: 'az', label: 'Азербайджан', emoji: '🇦🇿' },
  { value: 'xx', label: 'Другая',      emoji: '🌍' },
];

const CURRENCIES = [
  { value: 'RUB', label: '₽ Рубль',  symbol: '₽' },
  { value: 'USD', label: '$ Доллар', symbol: '$' },
  { value: 'EUR', label: '€ Евро',   symbol: '€' },
  { value: 'KZT', label: '₸ Тенге',  symbol: '₸' },
  { value: 'GEL', label: '₾ Лари',   symbol: '₾' },
  { value: 'UZS', label: 'сум',       symbol: 'с' },
];

const POS_SYSTEMS = [
  { value: 'iiko',    label: 'iiko' },
  { value: 'rkeeper', label: 'r_keeper' },
  { value: 'poster',  label: 'Poster' },
  { value: 'syrve',   label: 'Syrve' },
  { value: '1c',      label: '1С:Общепит' },
  { value: 'none',    label: 'Нет системы' },
  { value: 'other',   label: 'Другая' },
];

const GOALS = [
  { value: 'revenue',   label: 'Увеличить выручку',       emoji: '📈', hint: 'Больше гостей и продаж' },
  { value: 'costs',     label: 'Снизить расходы',          emoji: '💸', hint: 'Оптимизировать затраты' },
  { value: 'staff',     label: 'Контролировать персонал',  emoji: '👥', hint: 'Дисциплина и эффективность' },
  { value: 'service',   label: 'Улучшить сервис',          emoji: '⭐', hint: 'Скорость и качество' },
  { value: 'analytics', label: 'Анализировать данные',     emoji: '📊', hint: 'Принимать решения на фактах' },
];

// ─── Types ────────────────────────────────────────────────────────────────────

interface FormData {
  name: string;
  businessType: string;
  country: string;
  city: string;
  currency: string;
  seats: number;
  averageCheck: string;
  employees: number;
  posSystem: string;
  businessGoal: string;
}

type StepType = 'text' | 'chips-grid' | 'chips-flow' | 'chips-goal' | 'stepper' | 'amount';

interface StepDef {
  field: keyof FormData;
  emoji: string;
  title: string;
  subtitle: string;
  type: StepType;
  placeholder?: string;
  options?: { value: string; label: string; emoji?: string; hint?: string }[];
  cols?: number;
  min?: number;
}

const STEPS: StepDef[] = [
  {
    field: 'name',
    emoji: '🍽️',
    title: 'Как называется\nваше заведение?',
    subtitle: 'Это имя будет отображаться в системе',
    type: 'text',
    placeholder: 'Например, «Тёплое место»',
  },
  {
    field: 'businessType',
    emoji: '🏪',
    title: 'Тип заведения',
    subtitle: 'Выберите формат вашего бизнеса',
    type: 'chips-grid',
    options: BUSINESS_TYPES,
    cols: 2,
  },
  {
    field: 'country',
    emoji: '🌍',
    title: 'Страна',
    subtitle: 'Где работает заведение?',
    type: 'chips-grid',
    options: COUNTRIES,
    cols: 2,
  },
  {
    field: 'city',
    emoji: '📍',
    title: 'В каком городе?',
    subtitle: 'Введите название города',
    type: 'text',
    placeholder: 'Москва',
  },
  {
    field: 'currency',
    emoji: '💳',
    title: 'Валюта расчётов',
    subtitle: 'В какой валюте ведётся учёт?',
    type: 'chips-grid',
    options: CURRENCIES,
    cols: 3,
  },
  {
    field: 'seats',
    emoji: '🪑',
    title: 'Посадочных мест',
    subtitle: 'Сколько гостей вмещает зал?',
    type: 'stepper',
    min: 1,
  },
  {
    field: 'averageCheck',
    emoji: '💰',
    title: 'Средний чек',
    subtitle: 'Средняя сумма одного заказа',
    type: 'amount',
    placeholder: '0',
  },
  {
    field: 'employees',
    emoji: '👥',
    title: 'Сотрудников',
    subtitle: 'Общее количество персонала',
    type: 'stepper',
    min: 1,
  },
  {
    field: 'posSystem',
    emoji: '🖥️',
    title: 'Кассовая система',
    subtitle: 'Какую POS-систему вы используете?',
    type: 'chips-flow',
    options: POS_SYSTEMS,
  },
  {
    field: 'businessGoal',
    emoji: '🎯',
    title: 'Главная цель\nна этот год',
    subtitle: 'Что важнее всего для вашего бизнеса?',
    type: 'chips-goal',
    options: GOALS,
  },
];

// ─── Slide animation ──────────────────────────────────────────────────────────

const ease = [0.22, 1, 0.36, 1] as [number, number, number, number];

const slideVariants = {
  enter: (d: number) => ({ x: d * 56, opacity: 0 }),
  center: { x: 0, opacity: 1, transition: { duration: 0.32, ease } },
  exit:  (d: number) => ({ x: d * -56, opacity: 0, transition: { duration: 0.22, ease } }),
};

// ─── Step content renderers ───────────────────────────────────────────────────

function StepHeader({ emoji, title, subtitle }: { emoji: string; title: string; subtitle: string }) {
  return (
    <div className="text-center mb-8 px-2">
      <h2 className="text-[28px] font-bold text-foreground tracking-tight leading-tight mb-2 whitespace-pre-line">
        {title}
      </h2>
      <p className="text-[15px] text-muted-foreground leading-snug">{subtitle}</p>
    </div>
  );
}

// Text input step
function TextStep({
  def, value, onChange, error,
}: {
  def: StepDef; value: string; onChange: (v: string) => void; error?: string;
}) {
  return (
    <div className="px-6 pt-10 pb-4">
      <StepHeader emoji={def.emoji} title={def.title} subtitle={def.subtitle} />
      <div className="relative">
        <input
          type="text"
          placeholder={def.placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoFocus
          className={cn(
            'bd-input-base h-[56px] px-4 text-[17px] font-medium',
            error && 'border-destructive bg-destructive/5',
          )}
        />
        {error && <p className="text-[13px] text-destructive mt-2">{error}</p>}
      </div>
    </div>
  );
}

// Grid chip step (business type, country, currency)
function ChipsGridStep({
  def, value, onSelect,
}: {
  def: StepDef; value: string; onSelect: (v: string) => void;
}) {
  const cols = def.cols ?? 2;
  return (
    <div className="px-6 pt-10 pb-4">
      <StepHeader emoji={def.emoji} title={def.title} subtitle={def.subtitle} />
      <div
        className="grid gap-3"
        style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}
      >
        {def.options!.map((opt) => {
          const active = value === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onSelect(opt.value)}
              className={cn(
                'relative flex flex-col items-center justify-center gap-1.5 rounded-[16px] py-4 px-3',
                'border-2 text-[14px] font-semibold transition-all duration-150 active:scale-[0.97]',
                active
                  ? 'bg-primary/8 border-primary text-primary shadow-[0_0_0_4px_hsl(var(--primary)/0.08)]'
                  : 'bg-card border-border/60 text-foreground hover:border-border',
              )}
            >
              <span className="leading-tight text-center">{opt.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// Flow chip step (POS — mixed label widths)
function ChipsFlowStep({
  def, value, onSelect,
}: {
  def: StepDef; value: string; onSelect: (v: string) => void;
}) {
  return (
    <div className="px-6 pt-10 pb-4">
      <StepHeader emoji={def.emoji} title={def.title} subtitle={def.subtitle} />
      <div className="flex flex-wrap gap-2.5">
        {def.options!.map((opt) => {
          const active = value === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onSelect(opt.value)}
              className={cn(
                'px-5 py-3 rounded-[14px] border-2 text-[15px] font-semibold transition-all duration-150 active:scale-[0.97]',
                active
                  ? 'bg-primary/8 border-primary text-primary'
                  : 'bg-card border-border/60 text-foreground hover:border-border',
              )}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// Goal step — full-width vertical cards
function GoalStep({
  def, value, onSelect,
}: {
  def: StepDef; value: string; onSelect: (v: string) => void;
}) {
  return (
    <div className="px-6 pt-10 pb-4">
      <StepHeader emoji={def.emoji} title={def.title} subtitle={def.subtitle} />
      <div className="flex flex-col gap-3">
        {def.options!.map((opt) => {
          const active = value === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onSelect(opt.value)}
              className={cn(
                'flex items-center gap-4 w-full rounded-[16px] px-4 py-4',
                'border-2 text-left transition-all duration-150 active:scale-[0.98]',
                active
                  ? 'bg-primary/8 border-primary'
                  : 'bg-card border-border/60 hover:border-border',
              )}
            >
              <div>
                <p className={cn('text-[15px] font-semibold leading-tight', active ? 'text-primary' : 'text-foreground')}>
                  {opt.label}
                </p>
                {opt.hint && (
                  <p className="text-[13px] text-muted-foreground mt-0.5">{opt.hint}</p>
                )}
              </div>
              {active && (
                <div className="ml-auto w-5 h-5 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                  <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                    <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// Stepper step (seats, employees)
function StepperStep({
  def, value, onChange,
}: {
  def: StepDef; value: number; onChange: (v: number) => void;
}) {
  const min = def.min ?? 1;
  return (
    <div className="px-6 pt-10 pb-4">
      <StepHeader emoji={def.emoji} title={def.title} subtitle={def.subtitle} />
      <div className="flex items-center justify-center gap-6 mt-4">
        <button
          type="button"
          onClick={() => onChange(Math.max(min, value - 1))}
          disabled={value <= min}
          className={cn(
            'w-14 h-14 rounded-full border-2 border-border flex items-center justify-center transition-all active:scale-95',
            value <= min ? 'opacity-30' : 'hover:border-foreground/30',
          )}
        >
          <Minus className="w-5 h-5 text-foreground" />
        </button>

        <div className="w-28 text-center">
          <AnimatePresence mode="popLayout">
            <motion.span
              key={value}
              initial={{ opacity: 0, y: -12, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.9 }}
              transition={{ duration: 0.18, ease }}
              className="block text-[56px] font-bold text-foreground leading-none tracking-tight"
            >
              {value}
            </motion.span>
          </AnimatePresence>
        </div>

        <button
          type="button"
          onClick={() => onChange(value + 1)}
          className="w-14 h-14 rounded-full bg-primary flex items-center justify-center shadow-[0_4px_16px_hsl(var(--primary)/0.30)] transition-all active:scale-95"
        >
          <Plus className="w-5 h-5 text-primary-foreground" />
        </button>
      </div>
    </div>
  );
}

// Amount input step (average check)
function AmountStep({
  def, value, onChange, currencySymbol, error,
}: {
  def: StepDef; value: string; onChange: (v: string) => void; currencySymbol: string; error?: string;
}) {
  return (
    <div className="px-6 pt-10 pb-4">
      <StepHeader emoji={def.emoji} title={def.title} subtitle={def.subtitle} />
      <div className="relative flex items-center">
        <span className="absolute left-4 text-[17px] font-semibold text-muted-foreground pointer-events-none select-none z-10">
          {currencySymbol}
        </span>
        <input
          type="number"
          inputMode="numeric"
          placeholder={def.placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoFocus
          className={cn(
            'bd-input-base h-[56px] pl-9 pr-4 text-[17px] font-medium',
            error && 'border-destructive bg-destructive/5',
          )}
        />
      </div>
      {error && <p className="text-[13px] text-destructive mt-2">{error}</p>}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

const TOTAL = STEPS.length;

export default function CreateRestaurant() {
  const [, navigate] = useLocation();

  const [step, setStep]       = useState(0);
  const [direction, setDir]   = useState(1);
  const [error, setError]     = useState('');
  const [form, setForm]       = useState<FormData>({
    name:         '',
    businessType: '',
    country:      '',
    city:         '',
    currency:     'RUB',
    seats:        20,
    averageCheck: '',
    employees:    5,
    posSystem:    '',
    businessGoal: '',
  });

  const def    = STEPS[step];
  const isLast = step === TOTAL - 1;

  // Get current field value
  const fieldValue = form[def.field];

  // Currency symbol for amount step
  const currencySymbol = CURRENCIES.find((c) => c.value === form.currency)?.symbol ?? '₽';

  // Validate current step
  const validate = (): boolean => {
    const val = form[def.field];
    if (def.type === 'stepper') return true; // always has a default
    if (!val || (typeof val === 'string' && !val.trim())) {
      setError('Пожалуйста, заполните это поле');
      return false;
    }
    return true;
  };

  const goNext = () => {
    if (!validate()) return;
    setError('');
    if (step < TOTAL - 1) {
      setDir(1);
      setStep((s) => s + 1);
    } else {
      navigate('/home');
    }
  };

  const goBack = () => {
    setError('');
    if (step > 0) {
      setDir(-1);
      setStep((s) => s - 1);
    } else {
      navigate('/register');
    }
  };

  const setField = (field: keyof FormData, value: string | number) => {
    setError('');
    setForm((f) => ({ ...f, [field]: value }));
  };

  // For chip steps — auto-advance on selection
  const selectAndAdvance = (field: keyof FormData, value: string) => {
    setField(field, value);
    setError('');
    // Slight delay so the chip highlight is visible before transition
    setTimeout(() => {
      if (step < TOTAL - 1) {
        setDir(1);
        setStep((s) => s + 1);
      } else {
        navigate('/home');
      }
    }, 180);
  };

  // Render the inner content for current step
  const renderContent = () => {
    switch (def.type) {
      case 'text':
        return (
          <TextStep
            def={def}
            value={fieldValue as string}
            onChange={(v) => setField(def.field, v)}
            error={error}
          />
        );
      case 'chips-grid':
        return (
          <ChipsGridStep
            def={def}
            value={fieldValue as string}
            onSelect={(v) => selectAndAdvance(def.field, v)}
          />
        );
      case 'chips-flow':
        return (
          <ChipsFlowStep
            def={def}
            value={fieldValue as string}
            onSelect={(v) => selectAndAdvance(def.field, v)}
          />
        );
      case 'chips-goal':
        return (
          <GoalStep
            def={def}
            value={fieldValue as string}
            onSelect={(v) => selectAndAdvance(def.field, v)}
          />
        );
      case 'stepper':
        return (
          <StepperStep
            def={def}
            value={fieldValue as number}
            onChange={(v) => setField(def.field, v)}
          />
        );
      case 'amount':
        return (
          <AmountStep
            def={def}
            value={fieldValue as string}
            onChange={(v) => setField(def.field, v)}
            currencySymbol={currencySymbol}
            error={error}
          />
        );
    }
  };

  // Hide Next button for chip steps that auto-advance (but show for last chip step)
  const isChipStep = ['chips-grid', 'chips-flow', 'chips-goal'].includes(def.type);
  const showNextBtn = !isChipStep || isLast;

  return (
    <AppShell>
      <div className="flex flex-col h-[100dvh] overflow-hidden relative">

        {/* ── Header ── */}
        <div className="flex-shrink-0 px-6 pt-5 pb-0">
          <div className="flex items-center justify-between mb-5">
            {/* Back */}
            <button
              type="button"
              onClick={goBack}
              aria-label="Назад"
              className="w-9 h-9 -ml-1.5 rounded-full flex items-center justify-center hover:bg-foreground/5 active:bg-foreground/10 transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-foreground" strokeWidth={2.2} />
            </button>

            {/* Step counter */}
            <span className="text-[13px] font-semibold text-muted-foreground tracking-wide">
              {step + 1} / {TOTAL}
            </span>
          </div>

          {/* Progress bar */}
          <div className="h-1 rounded-full bg-border overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-primary"
              animate={{ width: `${((step + 1) / TOTAL) * 100}%` }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            />
          </div>
        </div>

        {/* ── Sliding content ── */}
        <div className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={step}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
            >
              {renderContent()}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* ── Bottom navigation ── */}
        <div className="flex-shrink-0 px-6 pb-10 pt-4">
          {showNextBtn ? (
            <Button variant="primary" fullWidth onClick={goNext}>
              {isLast ? 'Завершить' : 'Далее'}
            </Button>
          ) : (
            /* Hint for chip steps */
            <p className="text-center text-[14px] text-muted-foreground">
              Выберите вариант — перейдём дальше
            </p>
          )}
        </div>

      </div>
    </AppShell>
  );
}
