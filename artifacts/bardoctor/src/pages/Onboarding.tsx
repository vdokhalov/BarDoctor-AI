import { useState } from 'react';
import { useLocation } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ArrowRight, Check } from 'lucide-react';
import { useRestaurant } from '@/contexts/RestaurantContext';
import { RestaurantProfile } from '@/store/restaurant';
import { cn } from '@/lib/utils';

// ─── Step definitions ─────────────────────────────────────────────────────────

const BUSINESS_TYPES = ['Ресторан', 'Кафе', 'Бар', 'Пекарня', 'Фастфуд', 'Другое'];

const CUISINES = [
  'Европейская', 'Итальянская', 'Японская', 'Русская',
  'Кофейня', 'Паназиатская', 'Американская', 'Другая',
];

const HOURS = [
  '06:00', '07:00', '08:00', '09:00', '10:00', '11:00', '12:00',
  '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00',
  '20:00', '21:00', '22:00', '23:00', '00:00', '01:00', '02:00', '03:00',
];

interface Draft {
  name: string;
  businessType: string;
  country: string;
  city: string;
  seats: string;
  avgCheck: string;
  employees: string;
  cuisine: string;
  hasBar: boolean;
  hasDelivery: boolean;
  openTime: string;
  closeTime: string;
}

const EMPTY: Draft = {
  name: '', businessType: '', country: '', city: '',
  seats: '', avgCheck: '', employees: '', cuisine: '',
  hasBar: false, hasDelivery: false, openTime: '10:00', closeTime: '23:00',
};

// ─── Small atoms ──────────────────────────────────────────────────────────────

function Chip({
  label, selected, onClick,
}: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'px-4 py-2.5 rounded-[14px] text-[14px] font-semibold border transition-all active:scale-[0.97]',
        selected
          ? 'bg-primary text-white border-primary shadow-[0_2px_12px_rgba(91,92,235,0.30)]'
          : 'bg-card text-foreground border-border hover:border-primary/50',
      )}
    >
      {label}
    </button>
  );
}

function Toggle({
  label, sub, value, onChange,
}: { label: string; sub: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className={cn(
        'w-full flex items-center justify-between p-4 rounded-2xl border transition-all active:scale-[0.99]',
        value
          ? 'bg-primary/6 border-primary/30'
          : 'bg-card border-border',
      )}
    >
      <div className="text-left">
        <p className={cn('text-[15px] font-semibold', value ? 'text-primary' : 'text-foreground')}>
          {label}
        </p>
        <p className="text-[12px] text-muted-foreground mt-0.5">{sub}</p>
      </div>
      <div className={cn(
        'w-12 h-6.5 rounded-full relative transition-colors flex-shrink-0',
        value ? 'bg-primary' : 'bg-muted',
      )} style={{ height: 26, width: 48 }}>
        <motion.div
          className="absolute top-[3px] w-5 h-5 rounded-full bg-white shadow-sm"
          animate={{ left: value ? 24 : 3 }}
          transition={{ type: 'spring', stiffness: 500, damping: 35 }}
        />
      </div>
    </button>
  );
}

function FieldBlock({
  label, children,
}: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wide px-1">
        {label}
      </span>
      {children}
    </div>
  );
}

function TextInput({
  placeholder, value, onChange, type = 'text', prefix,
}: {
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  prefix?: string;
}) {
  return (
    <div className="relative flex items-center">
      {prefix && (
        <span className="absolute left-4 text-[16px] font-semibold text-muted-foreground select-none">
          {prefix}
        </span>
      )}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        inputMode={type === 'number' ? 'numeric' : undefined}
        className={cn(
          'w-full h-14 bg-card border border-border rounded-2xl text-[16px] font-semibold text-foreground',
          'placeholder:text-muted-foreground/50 placeholder:font-normal',
          'focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all',
          prefix ? 'pl-9 pr-4' : 'px-4',
        )}
      />
    </div>
  );
}

function SelectRow({
  label, value, onChange, options,
}: { label: string; value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          'w-full h-14 bg-card border border-border rounded-2xl text-[16px] font-semibold text-foreground',
          'px-4 appearance-none focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all',
          !value && 'text-muted-foreground/50',
        )}
      >
        <option value="" disabled>{label}</option>
        {options.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
      <ChevronLeft
        size={16}
        className="absolute right-4 top-1/2 -translate-y-1/2 -rotate-90 text-muted-foreground pointer-events-none"
      />
    </div>
  );
}

// ─── Step content ─────────────────────────────────────────────────────────────

function Step1({ d, upd }: { d: Draft; upd: (k: keyof Draft, v: Draft[keyof Draft]) => void }) {
  return (
    <div className="flex flex-col gap-6">
      <FieldBlock label="Название заведения">
        <TextInput
          placeholder="Например: Кафе «Берёза»"
          value={d.name}
          onChange={(v) => upd('name', v)}
        />
      </FieldBlock>
      <FieldBlock label="Тип бизнеса">
        <div className="flex flex-wrap gap-2">
          {BUSINESS_TYPES.map((t) => (
            <Chip
              key={t}
              label={t}
              selected={d.businessType === t}
              onClick={() => upd('businessType', t)}
            />
          ))}
        </div>
      </FieldBlock>
    </div>
  );
}

function Step2({ d, upd }: { d: Draft; upd: (k: keyof Draft, v: Draft[keyof Draft]) => void }) {
  return (
    <div className="flex flex-col gap-5">
      <FieldBlock label="Страна">
        <TextInput placeholder="Россия" value={d.country} onChange={(v) => upd('country', v)} />
      </FieldBlock>
      <FieldBlock label="Город">
        <TextInput placeholder="Москва" value={d.city} onChange={(v) => upd('city', v)} />
      </FieldBlock>
    </div>
  );
}

function Step3({ d, upd }: { d: Draft; upd: (k: keyof Draft, v: Draft[keyof Draft]) => void }) {
  return (
    <div className="flex flex-col gap-5">
      <FieldBlock label="Количество мест">
        <TextInput placeholder="80" type="number" value={d.seats} onChange={(v) => upd('seats', v)} />
      </FieldBlock>
      <FieldBlock label="Средний чек">
        <TextInput placeholder="1 200" type="number" prefix="₽" value={d.avgCheck} onChange={(v) => upd('avgCheck', v)} />
      </FieldBlock>
      <FieldBlock label="Сотрудников">
        <TextInput placeholder="15" type="number" value={d.employees} onChange={(v) => upd('employees', v)} />
      </FieldBlock>
    </div>
  );
}

function Step4({ d, upd }: { d: Draft; upd: (k: keyof Draft, v: Draft[keyof Draft]) => void }) {
  return (
    <div className="flex flex-col gap-6">
      <FieldBlock label="Кухня">
        <div className="flex flex-wrap gap-2">
          {CUISINES.map((c) => (
            <Chip
              key={c}
              label={c}
              selected={d.cuisine === c}
              onClick={() => upd('cuisine', c)}
            />
          ))}
        </div>
      </FieldBlock>
      <FieldBlock label="Особенности">
        <div className="flex flex-col gap-2.5">
          <Toggle
            label="Есть бар"
            sub="Коктейли, вино, крепкие напитки"
            value={d.hasBar}
            onChange={(v) => upd('hasBar', v)}
          />
          <Toggle
            label="Есть доставка"
            sub="Курьерская или самовывоз"
            value={d.hasDelivery}
            onChange={(v) => upd('hasDelivery', v)}
          />
        </div>
      </FieldBlock>
    </div>
  );
}

function Step5({ d, upd }: { d: Draft; upd: (k: keyof Draft, v: Draft[keyof Draft]) => void }) {
  return (
    <div className="flex flex-col gap-5">
      <FieldBlock label="Открытие">
        <SelectRow
          label="Выберите время"
          value={d.openTime}
          onChange={(v) => upd('openTime', v)}
          options={HOURS}
        />
      </FieldBlock>
      <FieldBlock label="Закрытие">
        <SelectRow
          label="Выберите время"
          value={d.closeTime}
          onChange={(v) => upd('closeTime', v)}
          options={HOURS}
        />
      </FieldBlock>
    </div>
  );
}

// ─── Step meta ────────────────────────────────────────────────────────────────

const STEPS = [
  { emoji: '🏠', title: 'Как называется\nваше заведение?', sub: 'Это имя будет использоваться по всему приложению' },
  { emoji: '📍', title: 'Где вы\nнаходитесь?', sub: 'Укажите страну и город для точной аналитики' },
  { emoji: '📊', title: 'Расскажите\nо масштабе', sub: 'Помогает BarDoctor давать точные рекомендации' },
  { emoji: '🍽️', title: 'Концепция\nзаведения', sub: 'Кухня и ключевые особенности' },
  { emoji: '🕐', title: 'Часы\nработы', sub: 'Ежедневное расписание вашего заведения' },
];

// ─── Validation ───────────────────────────────────────────────────────────────

function canAdvance(step: number, d: Draft): boolean {
  if (step === 0) return d.name.trim().length > 0 && d.businessType !== '';
  if (step === 1) return d.country.trim().length > 0 && d.city.trim().length > 0;
  if (step === 2) return d.seats !== '' && d.avgCheck !== '' && d.employees !== '';
  if (step === 3) return d.cuisine !== '';
  if (step === 4) return d.openTime !== '' && d.closeTime !== '';
  return false;
}

// ─── Slide animation ──────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const slideVariants: Record<string, any> = {
  enter: (dir: number) => ({ x: dir > 0 ? 40 : -40, opacity: 0 }),
  center: { x: 0, opacity: 1, transition: { duration: 0.34, ease: [0.22, 1, 0.36, 1] } },
  exit:  (dir: number) => ({ x: dir > 0 ? -40 : 40, opacity: 0, transition: { duration: 0.22, ease: 'easeIn' } }),
};

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function Onboarding() {
  const [, setLocation] = useLocation();
  const { save } = useRestaurant();

  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [done, setDone] = useState(false);

  function upd(k: keyof Draft, v: Draft[keyof Draft]) {
    setDraft((prev) => ({ ...prev, [k]: v }));
  }

  function next() {
    if (step < STEPS.length - 1) {
      setDir(1);
      setStep((s) => s + 1);
    } else {
      // Save and finish
      const profile: RestaurantProfile = {
        name: draft.name.trim(),
        businessType: draft.businessType,
        country: draft.country.trim(),
        city: draft.city.trim(),
        seats: Number(draft.seats) || 0,
        avgCheck: Number(draft.avgCheck) || 0,
        employees: Number(draft.employees) || 0,
        cuisine: draft.cuisine,
        hasBar: draft.hasBar,
        hasDelivery: draft.hasDelivery,
        openTime: draft.openTime,
        closeTime: draft.closeTime,
      };
      save(profile);
      setDone(true);
      setTimeout(() => setLocation('/home'), 1600);
    }
  }

  function back() {
    if (step > 0) {
      setDir(-1);
      setStep((s) => s - 1);
    }
  }

  const meta = STEPS[step];
  const ok = canAdvance(step, draft);
  const isLast = step === STEPS.length - 1;

  // ── Success screen ──
  if (done) {
    return (
      <div className="min-h-[100dvh] w-full bg-[#F8F9FC] flex flex-col items-center justify-center gap-6 px-8">
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 280, damping: 22 }}
          className="w-24 h-24 rounded-full bg-[#22C55E] flex items-center justify-center shadow-[0_12px_40px_rgba(34,197,94,0.35)]"
        >
          <Check size={44} strokeWidth={3} className="text-white" />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.4 }}
          className="text-center"
        >
          <h2 className="text-[26px] font-black text-foreground tracking-tight mb-2">
            {draft.name}
          </h2>
          <p className="text-[15px] text-muted-foreground font-medium">
            Всё готово. Открываем BarDoctor…
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] w-full bg-[#F8F9FC] flex flex-col overflow-hidden">

      {/* ── Progress bar ── */}
      <div className="h-1 bg-border w-full flex-shrink-0">
        <motion.div
          className="h-full bg-primary rounded-r-full"
          animate={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>

      {/* ── Top bar ── */}
      <div className="flex items-center justify-between px-6 pt-5 pb-2 flex-shrink-0">
        <button
          type="button"
          onClick={back}
          className={cn(
            'w-10 h-10 rounded-full flex items-center justify-center transition-all',
            step === 0
              ? 'opacity-0 pointer-events-none'
              : 'bg-card border border-border hover:bg-muted active:scale-[0.94]',
          )}
        >
          <ChevronLeft size={18} className="text-foreground" />
        </button>

        {/* Step dots */}
        <div className="flex items-center gap-1.5">
          {STEPS.map((_, i) => (
            <motion.div
              key={i}
              animate={{ width: i === step ? 20 : 6, opacity: i <= step ? 1 : 0.3 }}
              transition={{ duration: 0.3 }}
              className={cn(
                'h-1.5 rounded-full',
                i <= step ? 'bg-primary' : 'bg-border',
              )}
            />
          ))}
        </div>

        <div className="w-10 flex items-center justify-end">
          <span className="text-[13px] font-semibold text-muted-foreground">
            {step + 1}/{STEPS.length}
          </span>
        </div>
      </div>

      {/* ── Scrollable content ── */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden px-6 pt-6 pb-8">

        {/* Step header */}
        <AnimatePresence mode="wait" custom={dir}>
          <motion.div
            key={`header-${step}`}
            custom={dir}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
          >
            <div className="mb-8">
              <span className="text-[44px] leading-none mb-3 block">{meta.emoji}</span>
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
            {step === 0 && <Step1 d={draft} upd={upd} />}
            {step === 1 && <Step2 d={draft} upd={upd} />}
            {step === 2 && <Step3 d={draft} upd={upd} />}
            {step === 3 && <Step4 d={draft} upd={upd} />}
            {step === 4 && <Step5 d={draft} upd={upd} />}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── Bottom button ── */}
      <div className="flex-shrink-0 px-6 pb-10 pt-4">
        <button
          type="button"
          onClick={next}
          disabled={!ok}
          className={cn(
            'w-full h-14 rounded-2xl flex items-center justify-center gap-2.5 text-[16px] font-bold tracking-tight transition-all',
            ok
              ? 'bg-primary text-white shadow-[0_4px_20px_rgba(91,92,235,0.35)] active:scale-[0.98] hover:opacity-90'
              : 'bg-muted text-muted-foreground cursor-not-allowed',
          )}
        >
          {isLast ? 'Начать работу' : 'Продолжить'}
          {ok && (
            <div className={cn(
              'w-6 h-6 rounded-full flex items-center justify-center',
              isLast ? 'bg-white/20' : 'bg-white/20',
            )}>
              <ArrowRight size={14} className="text-white" />
            </div>
          )}
        </button>
      </div>
    </div>
  );
}
