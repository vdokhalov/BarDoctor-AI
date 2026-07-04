import React, { useState } from 'react';
import {
  Wrench, Users, MessageCircle, Package,
  CalendarClock, Lightbulb, X, ChevronLeft, Check,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import AppShell from '@/components/layout/AppShell';
import SafeArea from '@/components/layout/SafeArea';
import Input from '@/components/ds/Input';
import Textarea from '@/components/ds/Textarea';
import Button from '@/components/ds/Button';
import { useNavigation } from '@/hooks/useNavigation';
import { cn } from '@/lib/utils';

// ─── Event type config ────────────────────────────────────────────────────────

const EVENT_TYPES = [
  {
    key: 'breakdown',
    label: 'Поломка',
    desc: 'Неисправность оборудования',
    icon: Wrench,
    iconBg: 'bg-destructive/10',
    iconColor: 'text-destructive',
    accent: '#EF4444',
  },
  {
    key: 'conflict',
    label: 'Конфликт',
    desc: 'Межличностный инцидент',
    icon: Users,
    iconBg: 'bg-[#F59E0B]/10',
    iconColor: 'text-[#B45309]',
    accent: '#F59E0B',
  },
  {
    key: 'complaint',
    label: 'Жалоба гостя',
    desc: 'Обратная связь от гостя',
    icon: MessageCircle,
    iconBg: 'bg-[#F97316]/10',
    iconColor: 'text-[#EA580C]',
    accent: '#F97316',
  },
  {
    key: 'equipment',
    label: 'Новое оборудование',
    desc: 'Поступление техники',
    icon: Package,
    iconBg: 'bg-[#22C55E]/10',
    iconColor: 'text-[#16A34A]',
    accent: '#22C55E',
  },
  {
    key: 'maintenance',
    label: 'Плановое обслуживание',
    desc: 'Регулярное ТО',
    icon: CalendarClock,
    iconBg: 'bg-[#3B82F6]/10',
    iconColor: 'text-[#1D4ED8]',
    accent: '#3B82F6',
  },
  {
    key: 'idea',
    label: 'Идея',
    desc: 'Предложение по улучшению',
    icon: Lightbulb,
    iconBg: 'bg-primary/10',
    iconColor: 'text-primary',
    accent: '#5B5CEB',
  },
] as const;

type EventKey = typeof EVENT_TYPES[number]['key'];

// ─── ChipGroup ────────────────────────────────────────────────────────────────

function ChipGroup({
  label,
  options,
  value,
  onChange,
  multi = false,
}: {
  label: string;
  options: string[];
  value: string | string[];
  onChange: (v: string | string[]) => void;
  multi?: boolean;
}) {
  const isSelected = (opt: string) =>
    multi ? (value as string[]).includes(opt) : value === opt;

  const toggle = (opt: string) => {
    if (multi) {
      const arr = value as string[];
      onChange(arr.includes(opt) ? arr.filter((x) => x !== opt) : [...arr, opt]);
    } else {
      onChange(opt === value ? '' : opt);
    }
  };

  return (
    <div>
      <p className="text-[14px] font-semibold text-foreground mb-2">{label}</p>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => toggle(opt)}
            className={cn(
              'px-3.5 py-2 rounded-full text-[13px] font-medium border transition-all active:scale-[0.97]',
              isSelected(opt)
                ? 'bg-primary text-primary-foreground border-primary shadow-[0_2px_8px_rgba(91,92,235,0.25)]'
                : 'bg-card border-border text-foreground hover:border-primary/50',
            )}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Individual forms ─────────────────────────────────────────────────────────

function BreakdownForm({ onSave }: { onSave: () => void }) {
  const [name, setName] = useState('');
  const [urgency, setUrgency] = useState('');
  const [desc, setDesc] = useState('');
  const [responsible, setResponsible] = useState('');
  return (
    <div className="flex flex-col gap-5">
      <Input
        label="Название оборудования"
        placeholder="Кофемашина, холодильник…"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <ChipGroup
        label="Срочность"
        options={['Критическая', 'Высокая', 'Средняя', 'Низкая']}
        value={urgency}
        onChange={(v) => setUrgency(v as string)}
      />
      <Textarea
        label="Описание проблемы"
        placeholder="Подробно опишите, что произошло…"
        rows={3}
        value={desc}
        onChange={(e) => setDesc(e.target.value)}
      />
      <Input
        label="Ответственный"
        placeholder="Имя сотрудника"
        value={responsible}
        onChange={(e) => setResponsible(e.target.value)}
      />
      <Button fullWidth onClick={onSave}>
        Сохранить
      </Button>
    </div>
  );
}

function ConflictForm({ onSave }: { onSave: () => void }) {
  const [type, setType] = useState('');
  const [desc, setDesc] = useState('');
  const [participants, setParticipants] = useState('');
  const [resolution, setResolution] = useState('');
  return (
    <div className="flex flex-col gap-5">
      <ChipGroup
        label="Тип конфликта"
        options={['Персонал–Персонал', 'Гость–Персонал', 'Персонал–Поставщик', 'Другое']}
        value={type}
        onChange={(v) => setType(v as string)}
      />
      <Textarea
        label="Описание ситуации"
        placeholder="Что произошло, где, при каких обстоятельствах…"
        rows={3}
        value={desc}
        onChange={(e) => setDesc(e.target.value)}
      />
      <Input
        label="Участники"
        placeholder="Имена сотрудников или гостей"
        value={participants}
        onChange={(e) => setParticipants(e.target.value)}
      />
      <Textarea
        label="Принятые меры"
        placeholder="Как ситуация была урегулирована…"
        rows={2}
        value={resolution}
        onChange={(e) => setResolution(e.target.value)}
      />
      <Button fullWidth onClick={onSave}>
        Сохранить
      </Button>
    </div>
  );
}

function ComplaintForm({ onSave }: { onSave: () => void }) {
  const [topic, setTopic] = useState('');
  const [details, setDetails] = useState('');
  const [table, setTable] = useState('');
  const [resolution, setResolution] = useState<string[]>([]);
  return (
    <div className="flex flex-col gap-5">
      <Input
        label="Тема жалобы"
        placeholder="Долгое ожидание, качество блюда…"
        value={topic}
        onChange={(e) => setTopic(e.target.value)}
      />
      <Textarea
        label="Подробности"
        placeholder="Что именно не устроило гостя…"
        rows={3}
        value={details}
        onChange={(e) => setDetails(e.target.value)}
      />
      <Input
        label="Стол / Место"
        placeholder="Стол №5, терраса…"
        value={table}
        onChange={(e) => setTable(e.target.value)}
      />
      <ChipGroup
        label="Решение"
        options={['Скидка', 'Замена блюда', 'Извинения', 'Компенсация']}
        value={resolution}
        onChange={(v) => setResolution(v as string[])}
        multi
      />
      <Button fullWidth onClick={onSave}>
        Сохранить
      </Button>
    </div>
  );
}

function EquipmentForm({ onSave }: { onSave: () => void }) {
  const [name, setName] = useState('');
  const [supplier, setSupplier] = useState('');
  const [serial, setSerial] = useState('');
  const [installDate, setInstallDate] = useState('');
  const [notes, setNotes] = useState('');
  return (
    <div className="flex flex-col gap-5">
      <Input
        label="Название оборудования"
        placeholder="Модель и марка"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <Input
        label="Поставщик"
        placeholder="Название компании"
        value={supplier}
        onChange={(e) => setSupplier(e.target.value)}
      />
      <Input
        label="Серийный номер"
        placeholder="SN-XXXXXXXX"
        value={serial}
        onChange={(e) => setSerial(e.target.value)}
      />
      <Input
        label="Дата установки"
        type="date"
        value={installDate}
        onChange={(e) => setInstallDate(e.target.value)}
      />
      <Textarea
        label="Примечания"
        placeholder="Гарантия, особенности эксплуатации…"
        rows={2}
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
      />
      <Button fullWidth onClick={onSave}>
        Сохранить
      </Button>
    </div>
  );
}

function MaintenanceForm({ onSave }: { onSave: () => void }) {
  const [equipment, setEquipment] = useState('');
  const [kind, setKind] = useState('');
  const [date, setDate] = useState('');
  const [responsible, setResponsible] = useState('');
  const [notes, setNotes] = useState('');
  return (
    <div className="flex flex-col gap-5">
      <Input
        label="Оборудование"
        placeholder="Название техники"
        value={equipment}
        onChange={(e) => setEquipment(e.target.value)}
      />
      <ChipGroup
        label="Вид обслуживания"
        options={['ТО', 'Очистка', 'Замена фильтров', 'Калибровка']}
        value={kind}
        onChange={(v) => setKind(v as string)}
      />
      <Input
        label="Дата"
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
      />
      <Input
        label="Ответственный"
        placeholder="Имя сотрудника"
        value={responsible}
        onChange={(e) => setResponsible(e.target.value)}
      />
      <Textarea
        label="Заметки"
        placeholder="Дополнительная информация…"
        rows={2}
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
      />
      <Button fullWidth onClick={onSave}>
        Сохранить
      </Button>
    </div>
  );
}

function IdeaForm({ onSave }: { onSave: () => void }) {
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [category, setCategory] = useState('');
  const [effect, setEffect] = useState('');
  return (
    <div className="flex flex-col gap-5">
      <Input
        label="Название идеи"
        placeholder="Краткое, ёмкое название"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <Textarea
        label="Описание"
        placeholder="Как это работает, что изменится…"
        rows={3}
        value={desc}
        onChange={(e) => setDesc(e.target.value)}
      />
      <ChipGroup
        label="Категория"
        options={['Меню', 'Сервис', 'Интерьер', 'Маркетинг', 'Операции']}
        value={category}
        onChange={(v) => setCategory(v as string)}
      />
      <Textarea
        label="Ожидаемый результат"
        placeholder="Что улучшится, как это измерить…"
        rows={2}
        value={effect}
        onChange={(e) => setEffect(e.target.value)}
      />
      <Button fullWidth onClick={onSave}>
        Сохранить
      </Button>
    </div>
  );
}

const FORM_MAP: Record<EventKey, React.ComponentType<{ onSave: () => void }>> = {
  breakdown: BreakdownForm,
  conflict: ConflictForm,
  complaint: ComplaintForm,
  equipment: EquipmentForm,
  maintenance: MaintenanceForm,
  idea: IdeaForm,
};

// ─── Success overlay ──────────────────────────────────────────────────────────

function SuccessScreen({ eventLabel, onDone }: { eventLabel: string; onDone: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.94 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.94 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="flex flex-col items-center justify-center flex-1 px-8 text-center py-16"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.1, type: 'spring', stiffness: 260, damping: 18 }}
        className="w-20 h-20 rounded-full bg-[#22C55E]/10 flex items-center justify-center mb-6"
      >
        <Check size={36} className="text-[#16A34A]" strokeWidth={2.5} />
      </motion.div>
      <motion.h2
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="text-[22px] font-bold text-foreground tracking-tight mb-2"
      >
        Сохранено
      </motion.h2>
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.27 }}
        className="text-[15px] text-muted-foreground mb-10"
      >
        {eventLabel} зафиксирован
      </motion.p>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.34 }}
        className="w-full"
      >
        <Button fullWidth onClick={onDone} variant="secondary">
          Добавить ещё
        </Button>
      </motion.div>
    </motion.div>
  );
}

// ─── Slide animation helpers ──────────────────────────────────────────────────

const slideIn = {
  initial: { x: '100%', opacity: 0 },
  animate: { x: 0, opacity: 1 },
  exit: { x: '100%', opacity: 0 },
  transition: { duration: 0.32, ease: [0.22, 1, 0.36, 1] as [number,number,number,number] },
};

const fadeUp = (i: number) => ({
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
  transition: { delay: i * 0.06, duration: 0.36, ease: [0.22, 1, 0.36, 1] as [number,number,number,number] },
});

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function Add() {
  const { goBack } = useNavigation();
  const [selected, setSelected] = useState<EventKey | null>(null);
  const [saved, setSaved] = useState(false);

  const eventConfig = selected ? EVENT_TYPES.find((e) => e.key === selected)! : null;
  const FormComponent = selected ? FORM_MAP[selected] : null;

  const handleSave = () => setSaved(true);
  const handleDone = () => {
    setSelected(null);
    setSaved(false);
  };

  return (
    <AppShell>
      {/* ── Selection screen ── */}
      <AnimatePresence mode="wait">
        {!selected && (
          <motion.div
            key="select"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.25 }}
            className="flex flex-col min-h-[100dvh]"
          >
            <SafeArea className="flex flex-col flex-1 pt-6 pb-10">
              {/* Header */}
              <div className="flex justify-end mb-8 px-6">
                <button
                  onClick={goBack}
                  className="w-10 h-10 bg-card border border-border rounded-full flex items-center justify-center shadow-[var(--shadow-card)] active:scale-95 transition-transform"
                >
                  <X size={18} className="text-foreground" />
                </button>
              </div>

              <div className="px-6 mb-8">
                <motion.h1
                  {...fadeUp(0)}
                  className="text-[28px] font-bold text-foreground tracking-tight mb-1"
                >
                  Что произошло?
                </motion.h1>
                <motion.p {...fadeUp(1)} className="text-[15px] text-muted-foreground">
                  Выберите тип события
                </motion.p>
              </div>

              {/* 2 × 3 card grid */}
              <div className="px-6 grid grid-cols-2 gap-3">
                {EVENT_TYPES.map((ev, idx) => {
                  const Icon = ev.icon;
                  return (
                    <motion.button
                      key={ev.key}
                      {...fadeUp(idx * 0.5 + 2)}
                      onClick={() => setSelected(ev.key)}
                      className="bd-card flex flex-col items-center justify-center text-center p-5 gap-3.5 active:scale-[0.96] hover:shadow-[var(--shadow-elevated)] hover:-translate-y-0.5 transition-all duration-200 cursor-pointer min-h-[130px]"
                    >
                      <div
                        className={cn(
                          'w-12 h-12 rounded-2xl flex items-center justify-center',
                          ev.iconBg,
                        )}
                      >
                        <Icon size={22} className={ev.iconColor} />
                      </div>
                      <div>
                        <p className="text-[14px] font-bold text-foreground leading-snug mb-0.5">
                          {ev.label}
                        </p>
                        <p className="text-[11px] text-muted-foreground leading-snug">
                          {ev.desc}
                        </p>
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            </SafeArea>
          </motion.div>
        )}

        {/* ── Form screen ── */}
        {selected && (
          <motion.div
            key={`form-${selected}`}
            {...slideIn}
            className="flex flex-col min-h-[100dvh]"
          >
            <SafeArea className="flex flex-col flex-1 pt-5 pb-10">
              {/* Form header */}
              <div className="flex items-center gap-3 px-6 mb-7">
                <button
                  onClick={() => { setSelected(null); setSaved(false); }}
                  className="w-9 h-9 rounded-full bg-card border border-border flex items-center justify-center shadow-[var(--shadow-card)] flex-shrink-0 active:scale-95 transition-transform"
                >
                  <ChevronLeft size={18} className="text-foreground" />
                </button>

                {eventConfig && (() => {
                  const Icon = eventConfig.icon;
                  return (
                    <div className="flex items-center gap-2.5">
                      <div className={cn('w-8 h-8 rounded-[10px] flex items-center justify-center', eventConfig.iconBg)}>
                        <Icon size={16} className={eventConfig.iconColor} />
                      </div>
                      <h1 className="text-[18px] font-bold text-foreground tracking-tight">
                        {eventConfig.label}
                      </h1>
                    </div>
                  );
                })()}
              </div>

              {/* Accent divider */}
              {eventConfig && (
                <div
                  className="h-0.5 mx-6 mb-7 rounded-full opacity-30"
                  style={{ backgroundColor: eventConfig.accent }}
                />
              )}

              <AnimatePresence mode="wait">
                {saved ? (
                  <SuccessScreen
                    key="success"
                    eventLabel={eventConfig?.label ?? ''}
                    onDone={handleDone}
                  />
                ) : (
                  <motion.div
                    key="form"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="flex-1 px-6"
                  >
                    {FormComponent && <FormComponent onSave={handleSave} />}
                  </motion.div>
                )}
              </AnimatePresence>
            </SafeArea>
          </motion.div>
        )}
      </AnimatePresence>
    </AppShell>
  );
}
