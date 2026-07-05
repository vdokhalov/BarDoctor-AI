import { useState } from 'react';
import { useLocation } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Check, Target, Zap, TrendingUp } from 'lucide-react';
import { useRestaurant } from '@/contexts/RestaurantContext';
import { RestaurantProfile } from '@/store/restaurant';
import { cn } from '@/lib/utils';

// ─── Static data ──────────────────────────────────────────────────────────────

const BUSINESS_TYPES = ['Ресторан', 'Кафе', 'Бар', 'Пекарня', 'Кофейня', 'Другое'];

const HOURS: string[] = [];
for (let h = 0; h < 24; h++) {
  HOURS.push(`${String(h).padStart(2, '0')}:00`);
}

const AREAS = [
  { label: 'Бар',      emoji: '🍸', desc: 'Коктейли, вино, крепкие напитки' },
  { label: 'Кухня',    emoji: '🍳', desc: 'Горячее, холодное, выпечка' },
  { label: 'Кофе',     emoji: '☕', desc: 'Эспрессо-бар, кофейная станция' },
  { label: 'Доставка', emoji: '🛵', desc: 'Курьеры или самовывоз' },
  { label: 'Кальяны',  emoji: '💨', desc: 'Кальянная зона' },
  { label: 'Терраса',  emoji: '🌿', desc: 'Открытая или летняя площадка' },
  { label: 'Банкет',   emoji: '🎪', desc: 'Банкетный зал, закрытые события' },
];

// ─── Draft ────────────────────────────────────────────────────────────────────

interface Draft {
  name: string;
  businessType: string;
  country: string;
  city: string;
  seats: string;
  avgCheck: string;
  employees: string;
  openTime: string;
  closeTime: string;
  areas: string[];
}

const EMPTY: Draft = {
  name: '', businessType: '', country: '', city: '',
  seats: '', avgCheck: '', employees: '',
  openTime: '10:00', closeTime: '23:00',
  areas: [],
};

// ─── Validation ───────────────────────────────────────────────────────────────
// step 1 = basics, step 2 = operations, step 3 = areas
function canAdvance(step: number, d: Draft): boolean {
  if (step === 1) return d.name.trim().length > 0 && d.businessType !== '' && d.city.trim().length > 0;
  if (step === 2) return true; // all optional
  if (step === 3) return true; // can select 0 areas
  return false;
}

// ─── Animation ────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const slide: Record<string, any> = {
  enter: (dir: number) => ({
    x: dir > 0 ? 48 : -48, opacity: 0,
  }),
  center: {
    x: 0, opacity: 1,
    transition: { duration: 0.36, ease: [0.22, 1, 0.36, 1] },
  },
  exit: (dir: number) => ({
    x: dir > 0 ? -48 : 48, opacity: 0,
    transition: { duration: 0.22, ease: 'easeIn' },
  }),
};

// ─── Shared field atoms ───────────────────────────────────────────────────────

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[12px] font-bold text-muted-foreground uppercase tracking-wider mb-2 px-1">
      {children}
    </p>
  );
}

function TextInput({
  placeholder, value, onChange, type = 'text', prefix, autoFocus,
}: {
  placeholder: string; value: string; onChange: (v: string) => void;
  type?: string; prefix?: string; autoFocus?: boolean;
}) {
  return (
    <div className="relative flex items-center">
      {prefix && (
        <span className="absolute left-4 text-[15px] font-semibold text-muted-foreground select-none pointer-events-none">
          {prefix}
        </span>
      )}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        inputMode={type === 'number' ? 'numeric' : undefined}
        className={cn(
          'w-full h-[54px] bg-card border border-border rounded-2xl text-[16px] font-medium text-foreground',
          'placeholder:text-muted-foreground/40 placeholder:font-normal',
          'focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/12 transition-all',
          prefix ? 'pl-9 pr-4' : 'px-4',
        )}
      />
    </div>
  );
}

function SelectInput({
  label, value, onChange, options,
}: { label: string; value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          'w-full h-[54px] bg-card border border-border rounded-2xl text-[16px] font-medium text-foreground',
          'px-4 pr-10 appearance-none focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/12 transition-all',
          !value && 'text-muted-foreground/40',
        )}
      >
        <option value="" disabled>{label}</option>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none text-[10px]">▼</span>
    </div>
  );
}

// ─── Step 1 — Restaurant basics ───────────────────────────────────────────────

function StepBasics({ d, upd }: {
  d: Draft;
  upd: (k: keyof Draft, v: Draft[keyof Draft]) => void;
}) {
  return (
    <div className="flex flex-col gap-5">
      {/* Name */}
      <div>
        <FieldLabel>Название заведения</FieldLabel>
        <TextInput
          placeholder="Например: Кафе «Берёза»"
          value={d.name}
          onChange={(v) => upd('name', v)}
          autoFocus
        />
      </div>

      {/* Business type */}
      <div>
        <FieldLabel>Тип бизнеса</FieldLabel>
        <div className="flex flex-wrap gap-2">
          {BUSINESS_TYPES.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => upd('businessType', t)}
              className={cn(
                'px-4 py-2.5 rounded-[14px] text-[14px] font-semibold border transition-all active:scale-[0.96]',
                d.businessType === t
                  ? 'bg-primary text-white border-primary shadow-[0_2px_14px_rgba(91,92,235,0.28)]'
                  : 'bg-card text-foreground border-border hover:border-primary/40',
              )}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Country + City */}
      <div className="flex gap-3">
        <div className="flex-1">
          <FieldLabel>Страна</FieldLabel>
          <TextInput placeholder="Россия" value={d.country} onChange={(v) => upd('country', v)} />
        </div>
        <div className="flex-1">
          <FieldLabel>Город</FieldLabel>
          <TextInput placeholder="Москва" value={d.city} onChange={(v) => upd('city', v)} />
        </div>
      </div>
    </div>
  );
}

// ─── Step 2 — Operations ──────────────────────────────────────────────────────

function StepOperations({ d, upd }: {
  d: Draft;
  upd: (k: keyof Draft, v: Draft[keyof Draft]) => void;
}) {
  return (
    <div className="flex flex-col gap-5">
      {/* Seats + Employees */}
      <div className="flex gap-3">
        <div className="flex-1">
          <FieldLabel>Мест в зале</FieldLabel>
          <TextInput placeholder="80" type="number" value={d.seats} onChange={(v) => upd('seats', v)} />
        </div>
        <div className="flex-1">
          <FieldLabel>Сотрудников</FieldLabel>
          <TextInput placeholder="15" type="number" value={d.employees} onChange={(v) => upd('employees', v)} />
        </div>
      </div>

      {/* Avg check */}
      <div>
        <FieldLabel>Средний чек</FieldLabel>
        <TextInput
          placeholder="1 200"
          type="number"
          prefix="₽"
          value={d.avgCheck}
          onChange={(v) => upd('avgCheck', v)}
        />
      </div>

      {/* Hours */}
      <div>
        <FieldLabel>Часы работы</FieldLabel>
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <SelectInput
              label="Открытие"
              value={d.openTime}
              onChange={(v) => upd('openTime', v)}
              options={HOURS}
            />
          </div>
          <span className="text-muted-foreground font-medium text-[14px] flex-shrink-0">—</span>
          <div className="flex-1">
            <SelectInput
              label="Закрытие"
              value={d.closeTime}
              onChange={(v) => upd('closeTime', v)}
              options={HOURS}
            />
          </div>
        </div>
      </div>

      <p className="text-[12px] text-muted-foreground px-1 -mt-1">
        Все поля необязательны — вы сможете добавить позже.
      </p>
    </div>
  );
}

// ─── Step 3 — Areas ───────────────────────────────────────────────────────────

function StepAreas({ d, upd }: {
  d: Draft;
  upd: (k: keyof Draft, v: Draft[keyof Draft]) => void;
}) {
  function toggle(label: string) {
    const current = d.areas;
    const next = current.includes(label)
      ? current.filter((a) => a !== label)
      : [...current, label];
    upd('areas', next);
  }

  return (
    <div className="flex flex-col gap-3">
      {AREAS.map((area) => {
        const selected = d.areas.includes(area.label);
        return (
          <motion.button
            key={area.label}
            type="button"
            onClick={() => toggle(area.label)}
            whileTap={{ scale: 0.98 }}
            className={cn(
              'w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl border text-left transition-all',
              selected
                ? 'bg-primary/6 border-primary/35 shadow-[0_0_0_1px_rgba(91,92,235,0.18)]'
                : 'bg-card border-border hover:border-primary/30',
            )}
          >
            {/* Abbreviation */}
            <span className={cn(
              'w-10 h-10 rounded-[13px] flex items-center justify-center text-[13px] font-bold flex-shrink-0 transition-colors',
              selected ? 'bg-primary/12 text-primary' : 'bg-muted text-muted-foreground',
            )}>
              {area.label.slice(0, 2)}
            </span>

            {/* Text */}
            <div className="flex-1 min-w-0">
              <p className={cn(
                'text-[15px] font-semibold leading-tight',
                selected ? 'text-primary' : 'text-foreground',
              )}>
                {area.label}
              </p>
              <p className="text-[12px] text-muted-foreground mt-0.5 leading-snug">{area.desc}</p>
            </div>

            {/* Check */}
            <motion.div
              animate={selected ? { scale: 1, opacity: 1 } : { scale: 0.7, opacity: 0 }}
              transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
              className="w-6 h-6 rounded-full bg-primary flex items-center justify-center flex-shrink-0"
            >
              <Check size={13} strokeWidth={3} className="text-white" />
            </motion.div>
          </motion.button>
        );
      })}

      {d.areas.length === 0 && (
        <p className="text-[12px] text-muted-foreground text-center pt-1">
          Можно не выбирать — добавите позже.
        </p>
      )}
    </div>
  );
}

// ─── Welcome screen ───────────────────────────────────────────────────────────

function WelcomeScreen({ onStart }: { onStart: () => void }) {
  return (
    <div className="min-h-[100dvh] w-full bg-white flex flex-col overflow-hidden relative">

      {/* Atmospheric glow */}
      <div
        aria-hidden
        className="absolute pointer-events-none"
        style={{
          width: 500,
          height: 500,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(91,92,235,0.10) 0%, rgba(91,92,235,0.03) 55%, transparent 75%)',
          top: '30%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
        }}
      />

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 relative z-10">

        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, scale: 0.88 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="mb-8"
          style={{
            width: 72,
            height: 72,
            borderRadius: 20,
            background: '#161B2E',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 24px rgba(22,27,46,0.18), 0 1px 4px rgba(22,27,46,0.10)',
          }}
        >
          <svg width="34" height="34" viewBox="0 0 34 34" fill="none">
            <rect x="15.5" y="5" width="3" height="24" rx="1.5" fill="white" />
            <rect x="5" y="15.5" width="24" height="3" rx="1.5" fill="white" />
            <circle cx="17" cy="17" r="3.5" fill="#5B5CEB" />
          </svg>
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.52, delay: 0.14, ease: [0.22, 1, 0.36, 1] }}
          className="text-[30px] font-black text-[#161B2E] tracking-tight text-center leading-tight mb-4"
        >
          Добро пожаловать<br />в BarDoctor
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.48, delay: 0.26, ease: [0.22, 1, 0.36, 1] }}
          className="text-[15px] text-[#6B7280] font-medium leading-relaxed text-center max-w-[280px] mb-2"
        >
          BarDoctor умнеет по мере того, как узнаёт ваш бизнес.
        </motion.p>
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.34, ease: [0.22, 1, 0.36, 1] }}
          className="text-[13px] text-[#9CA3AF] text-center max-w-[260px] leading-relaxed"
        >
          Расскажите о заведении — это займёт меньше минуты.
        </motion.p>

        {/* Feature list */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.44, delay: 0.44, ease: [0.22, 1, 0.36, 1] }}
          className="mt-8 flex flex-col gap-3 w-full max-w-[300px]"
        >
          {([
            { Icon: Target,      text: 'Точные рекомендации на основе данных' },
            { Icon: Zap,         text: 'Мгновенные предупреждения об инцидентах' },
            { Icon: TrendingUp,  text: 'Аналитика и возможности для роста' },
          ] as const).map(({ Icon, text }) => (
            <div key={text} className="flex items-center gap-3">
              <span className="w-9 h-9 rounded-[12px] bg-primary/8 flex items-center justify-center flex-shrink-0">
                <Icon size={17} className="text-primary" />
              </span>
              <p className="text-[13px] text-[#4B5563] font-medium leading-snug">{text}</p>
            </div>
          ))}
        </motion.div>
      </div>

      {/* CTA */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.55, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 px-6 pb-12 pt-4 flex-shrink-0"
      >
        <button
          type="button"
          onClick={onStart}
          className="w-full h-14 rounded-2xl bg-[#161B2E] text-white text-[16px] font-bold tracking-tight flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98] transition-all shadow-[0_6px_24px_rgba(22,27,46,0.22)]"
        >
          Начать
        </button>
        <p className="text-center text-[12px] text-[#9CA3AF] mt-3">
          Настройка займёт около 1 минуты
        </p>
      </motion.div>
    </div>
  );
}

// ─── Success screen ───────────────────────────────────────────────────────────

function SuccessScreen({ name }: { name: string }) {
  return (
    <div className="min-h-[100dvh] w-full bg-white flex flex-col items-center justify-center px-8 gap-0">

      {/* Check circle */}
      <motion.div
        initial={{ scale: 0.4, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 280, damping: 20 }}
        className="w-24 h-24 rounded-full bg-[#22C55E] flex items-center justify-center mb-6 shadow-[0_12px_40px_rgba(34,197,94,0.30)]"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 340, damping: 24 }}
        >
          <Check size={44} strokeWidth={3} className="text-white" />
        </motion.div>
      </motion.div>

      {/* Text */}
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.28, duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
        className="text-center"
      >
        <h2 className="text-[13px] font-bold uppercase tracking-widest text-[#22C55E] mb-2">
          Поздравляем!
        </h2>
        <h1 className="text-[26px] font-black text-[#161B2E] tracking-tight leading-tight mb-2">
          {name || 'Заведение создано'}
        </h1>
        <p className="text-[15px] text-[#6B7280] font-medium">
          Заведение успешно создано.<br />Открываем BarDoctor…
        </p>
      </motion.div>

      {/* Loading dots */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7, duration: 0.4 }}
        className="flex gap-1.5 mt-10"
      >
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-[#161B2E]/20"
            animate={{ opacity: [0.2, 1, 0.2] }}
            transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
          />
        ))}
      </motion.div>
    </div>
  );
}

// ─── Step meta ────────────────────────────────────────────────────────────────

const FORM_STEPS = [
  {
    step: 1,
    title: 'Ваше заведение',
    sub: 'Основные данные для настройки BarDoctor',
  },
  {
    step: 2,
    title: 'Операционные\nданные',
    sub: 'Помогает давать более точные рекомендации',
  },
  {
    step: 3,
    title: 'Зоны\nзаведения',
    sub: 'Выберите зоны, которые есть у вас',
  },
];

const TOTAL_FORM_STEPS = FORM_STEPS.length; // 3

// ─── Main component ───────────────────────────────────────────────────────────

export default function Onboarding() {
  const [, setLocation] = useLocation();
  const { save } = useRestaurant();

  // step 0 = welcome; step 1-3 = form; done = true = success
  const [step, setStep] = useState(0);
  const [dir, setDir]   = useState(1);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [done, setDone]   = useState(false);

  function upd(k: keyof Draft, v: Draft[keyof Draft]) {
    setDraft((prev) => ({ ...prev, [k]: v }));
  }

  function goForward() {
    if (step === 0) {
      // Welcome → first form step
      setDir(1);
      setStep(1);
      return;
    }
    if (step < TOTAL_FORM_STEPS) {
      setDir(1);
      setStep((s) => s + 1);
      return;
    }
    // Last form step → save & show success
    const profile: RestaurantProfile = {
      name:         draft.name.trim(),
      businessType: draft.businessType,
      country:      draft.country.trim() || 'Россия',
      city:         draft.city.trim(),
      seats:        Number(draft.seats)    || 0,
      avgCheck:     Number(draft.avgCheck) || 0,
      employees:    Number(draft.employees)|| 0,
      openTime:     draft.openTime,
      closeTime:    draft.closeTime,
      areas:        draft.areas,
    };
    save(profile);
    setDone(true);
    setTimeout(() => setLocation('/home'), 2000);
  }

  function goBack() {
    if (step <= 1) return; // can't go back from first form step or welcome
    setDir(-1);
    setStep((s) => s - 1);
  }

  // ── Screens ──

  if (step === 0) {
    return <WelcomeScreen onStart={() => { setDir(1); setStep(1); }} />;
  }

  if (done) {
    return <SuccessScreen name={draft.name.trim()} />;
  }

  const meta     = FORM_STEPS[step - 1];
  const ok       = canAdvance(step, draft);
  const isLast   = step === TOTAL_FORM_STEPS;
  const progress = step / TOTAL_FORM_STEPS; // 0.33 … 1.0

  return (
    <div className="min-h-[100dvh] w-full bg-[#F8F9FC] flex flex-col overflow-hidden">

      {/* ── Slim progress bar ── */}
      <div className="h-[3px] bg-border/60 w-full flex-shrink-0">
        <motion.div
          className="h-full bg-primary rounded-r-full"
          animate={{ width: `${progress * 100}%` }}
          transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>

      {/* ── Top chrome ── */}
      <div className="flex items-center justify-between px-6 pt-5 pb-2 flex-shrink-0">

        {/* Back button */}
        <button
          type="button"
          onClick={goBack}
          className={cn(
            'w-10 h-10 rounded-full flex items-center justify-center transition-all',
            step <= 1
              ? 'opacity-0 pointer-events-none'
              : 'bg-card border border-border hover:bg-muted active:scale-[0.94]',
          )}
        >
          <ChevronLeft size={18} className="text-foreground" />
        </button>

        {/* Step dots */}
        <div className="flex items-center gap-2">
          {[1, 2, 3].map((s) => (
            <motion.div
              key={s}
              animate={{
                width: s === step ? 22 : 7,
                opacity: s <= step ? 1 : 0.28,
              }}
              transition={{ duration: 0.28 }}
              className={cn('h-[6px] rounded-full', s <= step ? 'bg-primary' : 'bg-border')}
            />
          ))}
        </div>

        {/* Counter */}
        <span className="text-[13px] font-semibold text-muted-foreground w-10 text-right">
          {step}/{TOTAL_FORM_STEPS}
        </span>
      </div>

      {/* ── Scrollable content ── */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden px-6 pt-6 pb-6">
        <AnimatePresence mode="wait" custom={dir}>
          <motion.div
            key={`step-${step}`}
            custom={dir}
            variants={slide}
            initial="enter"
            animate="center"
            exit="exit"
          >
            {/* Step header */}
            <div className="mb-7">
              <h1
                className="text-[26px] font-black text-foreground tracking-tight leading-tight mb-2"
                style={{ whiteSpace: 'pre-line' }}
              >
                {meta.title}
              </h1>
              <p className="text-[14px] text-muted-foreground font-medium leading-snug">
                {meta.sub}
              </p>
            </div>

            {/* Step body */}
            {step === 1 && <StepBasics      d={draft} upd={upd} />}
            {step === 2 && <StepOperations  d={draft} upd={upd} />}
            {step === 3 && <StepAreas       d={draft} upd={upd} />}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── CTA ── */}
      <div className="flex-shrink-0 px-6 pb-10 pt-3 bg-[#F8F9FC]">
        <button
          type="button"
          onClick={goForward}
          disabled={!ok}
          className={cn(
            'w-full h-14 rounded-2xl text-[16px] font-bold tracking-tight transition-all flex items-center justify-center',
            ok
              ? 'bg-primary text-white shadow-[0_4px_20px_rgba(91,92,235,0.30)] active:scale-[0.98] hover:opacity-90'
              : 'bg-muted text-muted-foreground cursor-not-allowed',
          )}
        >
          {isLast ? 'Создать заведение' : 'Продолжить'}
        </button>

        {/* Skip hint for optional steps */}
        {(step === 2 || step === 3) && (
          <button
            type="button"
            onClick={goForward}
            className="w-full mt-3 text-center text-[13px] text-muted-foreground font-medium hover:text-foreground transition-colors active:opacity-70"
          >
            Пропустить
          </button>
        )}
      </div>
    </div>
  );
}
