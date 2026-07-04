import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useLocation } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, X, Check, Camera } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCases } from '@/contexts/CasesContext';
import { useToast } from '@/components/ds/Toast';
import { Case, CasePriority, caseNid, makeTimeline, AIAssessment } from '@/store/cases';
import {
  CASE_TYPES, CASE_TYPE_CONFIG,
} from '@/config/caseCategories';
import type { CaseType } from '@/store/cases';
import { type Priority } from '@/store/events';
import PriorityModal from '@/components/ai/PriorityModal';
import AppShell from '@/components/layout/AppShell';
import SafeArea from '@/components/layout/SafeArea';

// ─── Animation ────────────────────────────────────────────────────────────────

const slideRight = {
  initial: { x: '100%', opacity: 0 },
  animate: { x: 0, opacity: 1, transition: { duration: 0.32, ease: [0.22, 1, 0.36, 1] as const } },
  exit:    { x: '100%', opacity: 0, transition: { duration: 0.22, ease: 'easeIn' as const } },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload  = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

// ─── Field atoms ──────────────────────────────────────────────────────────────

function FLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5 px-0.5">
      {children}{required && <span className="text-destructive ml-0.5">*</span>}
    </p>
  );
}

function FInput({ placeholder, value, onChange, autoFocus }: {
  placeholder: string; value: string; onChange: (v: string) => void; autoFocus?: boolean;
}) {
  return (
    <input type="text" value={value} onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder} autoFocus={autoFocus}
      className="w-full h-[52px] bg-card border border-border rounded-2xl text-[15px] font-medium text-foreground px-4 placeholder:text-muted-foreground/40 placeholder:font-normal focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/12 transition-all"
    />
  );
}

function FTextarea({ placeholder, value, onChange }: {
  placeholder: string; value: string; onChange: (v: string) => void;
}) {
  return (
    <textarea value={value} onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder} rows={3}
      className="w-full bg-card border border-border rounded-2xl text-[15px] font-medium text-foreground px-4 py-3.5 placeholder:text-muted-foreground/40 placeholder:font-normal focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/12 transition-all resize-none leading-relaxed"
    />
  );
}

// ─── Type picker screen ───────────────────────────────────────────────────────

function TypePicker({
  onPick, onClose,
}: {
  onPick: (t: CaseType) => void;
  onClose: () => void;
}) {
  return (
    <motion.div key="pick" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, x: -32 }}
      transition={{ duration: 0.22 }} className="flex flex-col min-h-[100dvh]">
      <SafeArea className="flex flex-col flex-1 pt-6 pb-10">

        {/* Header */}
        <div className="flex items-center justify-between px-6 mb-8">
          <div>
            <h1 className="text-[26px] font-black text-foreground tracking-tight leading-tight">Новое дело</h1>
            <p className="text-[14px] text-muted-foreground mt-0.5">Выберите тип ситуации</p>
          </div>
          <button type="button" onClick={onClose}
            className="w-10 h-10 bg-card border border-border rounded-full flex items-center justify-center shadow-[var(--shadow-card)] active:scale-95">
            <X size={17} className="text-foreground" />
          </button>
        </div>

        {/* 2 × 4 grid */}
        <div className="px-6 grid grid-cols-2 gap-3">
          {CASE_TYPES.map((key, i) => {
            const cfg  = CASE_TYPE_CONFIG[key];
            const Icon = cfg.icon;
            return (
              <motion.button key={key} type="button" onClick={() => onPick(key)}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04, duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                whileTap={{ scale: 0.96 }}
                className="bd-card flex flex-col items-start p-4 gap-3 hover:shadow-[var(--shadow-elevated)] transition-all min-h-[110px]"
              >
                <div className={cn('w-10 h-10 rounded-[13px] flex items-center justify-center', cfg.iconBg)}>
                  <Icon size={19} className={cfg.iconColor} />
                </div>
                <div>
                  <p className="text-[14px] font-bold text-foreground leading-tight">{cfg.label}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{cfg.desc}</p>
                </div>
              </motion.button>
            );
          })}
        </div>
      </SafeArea>
    </motion.div>
  );
}

// ─── Case form screen ─────────────────────────────────────────────────────────

function CaseForm({
  type, onSaved, onBack,
}: {
  type: CaseType;
  onSaved: (c: Case) => void;
  onBack: () => void;
}) {
  const { addCase } = useCases();
  const { toast }   = useToast();
  const cfg         = CASE_TYPE_CONFIG[type];
  const Icon        = cfg.icon;

  const [title,       setTitle]       = useState('');
  const [description, setDescription] = useState('');
  const [responsible, setResponsible] = useState('');
  const [dueDate,     setDueDate]     = useState('');
  const [photos,      setPhotos]      = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const canSave = title.trim().length > 0;

  async function handlePhotos(files: FileList | null) {
    if (!files) return;
    const toAdd   = Array.from(files).slice(0, 3 - photos.length);
    const dataUrls = await Promise.all(toAdd.map(readFileAsDataUrl));
    setPhotos((p) => [...p, ...dataUrls].slice(0, 3));
  }

  function handleSave() {
    if (!canSave) return;
    const now  = new Date().toISOString();
    const id   = caseNid();
    const initEntry = makeTimeline('created', 'Дело создано');
    const newCase: Case = {
      id, type,
      title:            title.trim(),
      description:      description.trim(),
      priority:         'low',   // AI Priority Engine sets real priority
      status:           'open',
      responsible:      responsible.trim(),
      dueDate,
      photos,
      files:            [],
      comments:         [],
      timeline:         [initEntry],
      relatedTasks:     [],
      relatedEquipment: [],
      createdAt:        now,
      updatedAt:        now,
    };
    const ok = addCase(newCase);
    if (!ok) toast({ variant: 'warning', title: 'Мало памяти', description: 'Дело добавлено в сессию, но не сохранено постоянно.' });
    onSaved(newCase);
  }

  return (
    <motion.div key="form" {...slideRight} className="flex flex-col min-h-[100dvh]">
      <SafeArea className="flex flex-col flex-1 pt-5 pb-10">

        {/* Header */}
        <div className="flex items-center gap-3 px-6 mb-5">
          <button type="button" onClick={onBack}
            className="w-9 h-9 rounded-full bg-card border border-border flex items-center justify-center shadow-[var(--shadow-card)] active:scale-95 flex-shrink-0">
            <ChevronLeft size={18} className="text-foreground" />
          </button>
          <div className="flex items-center gap-2.5">
            <div className={cn('w-8 h-8 rounded-[10px] flex items-center justify-center flex-shrink-0', cfg.iconBg)}>
              <Icon size={15} className={cfg.iconColor} />
            </div>
            <h1 className="text-[18px] font-bold text-foreground tracking-tight">{cfg.label}</h1>
          </div>
        </div>

        {/* Accent line */}
        <div className="h-px mx-6 mb-6 rounded-full opacity-25" style={{ backgroundColor: cfg.color }} />

        {/* Fields */}
        <div className="flex-1 overflow-y-auto px-6 flex flex-col gap-5">

          <div>
            <FLabel required>Заголовок</FLabel>
            <FInput placeholder="Кратко опишите ситуацию" value={title} onChange={setTitle} autoFocus />
          </div>

          <div>
            <FLabel>Описание</FLabel>
            <FTextarea placeholder="Подробности — что произошло, когда, при каких обстоятельствах…" value={description} onChange={setDescription} />
          </div>

          <div>
            <FLabel>Ответственный</FLabel>
            <FInput placeholder="Имя сотрудника или роль" value={responsible} onChange={setResponsible} />
          </div>

          <div>
            <FLabel>Дедлайн</FLabel>
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)}
              className="w-full h-[52px] bg-card border border-border rounded-2xl text-[15px] font-medium text-foreground px-4 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/12 transition-all appearance-none"
            />
          </div>

          <div>
            <FLabel>Фото (до 3)</FLabel>
            <div className="flex gap-2.5 flex-wrap">
              {photos.map((src, i) => (
                <div key={i} className="relative w-20 h-20 rounded-2xl overflow-hidden flex-shrink-0 border border-border">
                  <img src={src} alt="" className="w-full h-full object-cover" />
                  <button type="button" onClick={() => setPhotos((p) => p.filter((_, j) => j !== i))}
                    className="absolute top-1 right-1 w-5 h-5 rounded-full bg-foreground/70 flex items-center justify-center">
                    <X size={10} className="text-white" />
                  </button>
                </div>
              ))}
              {photos.length < 3 && (
                <>
                  <input ref={fileRef} type="file" accept="image/*" multiple className="hidden"
                    onChange={(e) => handlePhotos(e.target.files)} />
                  <button type="button" onClick={() => fileRef.current?.click()}
                    className="w-20 h-20 rounded-2xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-1 hover:border-primary/50 hover:bg-primary/4 transition-colors flex-shrink-0">
                    <Camera size={18} className="text-muted-foreground" />
                    <span className="text-[10px] font-medium text-muted-foreground">Фото</span>
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Save */}
          <button type="button" onClick={handleSave} disabled={!canSave}
            className={cn(
              'w-full h-14 rounded-2xl text-[16px] font-bold tracking-tight transition-all mt-2 mb-2',
              canSave
                ? 'bg-primary text-white shadow-[0_4px_20px_rgba(91,92,235,0.30)] active:scale-[0.98] hover:opacity-90'
                : 'bg-muted text-muted-foreground cursor-not-allowed',
            )}
          >
            Создать дело
          </button>
        </div>
      </SafeArea>
    </motion.div>
  );
}

// ─── Success screen ───────────────────────────────────────────────────────────

function SuccessScreen({ typeLabel }: { typeLabel: string }) {
  return (
    <motion.div key="success"
      initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
      transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
      className="flex flex-col items-center justify-center flex-1 px-8 text-center py-16 min-h-[100dvh]"
    >
      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
        transition={{ delay: 0.08, type: 'spring', stiffness: 280, damping: 20 }}
        className="w-20 h-20 rounded-full bg-[#22C55E]/12 flex items-center justify-center mb-6">
        <Check size={36} strokeWidth={2.5} className="text-[#16A34A]" />
      </motion.div>
      <motion.p initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }}
        className="text-[12px] font-bold uppercase tracking-widest text-[#16A34A] mb-2">
        Создано
      </motion.p>
      <motion.h2 initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.24 }}
        className="text-[22px] font-black text-foreground tracking-tight mb-2">
        Дело открыто
      </motion.h2>
      <motion.p initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
        className="text-[14px] text-muted-foreground max-w-[240px] leading-relaxed">
        «{typeLabel}» добавлено в список дел. Открываем детальный просмотр…
      </motion.p>
    </motion.div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

type Screen = 'pick' | 'form' | 'assess' | 'success';

export default function AddCase() {
  const [, setLocation]         = useLocation();
  const { updateCase }          = useCases();
  const [screen, setScreen]     = useState<Screen>('pick');
  const [type,   setType]       = useState<CaseType | null>(null);
  const [savedCase, setSavedCase] = useState<Case | null>(null);
  const navTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (navTimerRef.current) clearTimeout(navTimerRef.current); }, []);

  function handlePick(t: CaseType) { setType(t); setScreen('form'); }

  function handleSaved(c: Case) {
    setSavedCase(c);
    setScreen('assess');
  }

  function navigateToCase(id: string) {
    navTimerRef.current = setTimeout(() => setLocation(`/cases/${id}`), 400);
  }

  return (
    <AppShell>
      <AnimatePresence mode="wait">
        {screen === 'pick' && (
          <TypePicker key="pick" onPick={handlePick} onClose={() => setLocation('/cases')} />
        )}
        {screen === 'form' && type && (
          <CaseForm key={`form-${type}`} type={type} onSaved={handleSaved}
            onBack={() => { setScreen('pick'); setType(null); }} />
        )}
        {screen === 'assess' && savedCase && (
          <PriorityModal
            key="assess"
            itemType="case"
            category={savedCase.type}
            title={savedCase.title}
            description={savedCase.description}
            onConfirm={(priority: Priority, assessment: AIAssessment) => {
              updateCase(savedCase.id, { priority: priority as CasePriority, aiAssessment: assessment });
              navigateToCase(savedCase.id);
            }}
            onSkip={() => {
              updateCase(savedCase.id, { priority: 'medium' as CasePriority });
              navigateToCase(savedCase.id);
            }}
          />
        )}
        {screen === 'success' && type && (
          <SuccessScreen key="success" typeLabel={CASE_TYPE_CONFIG[type].label} />
        )}
      </AnimatePresence>
    </AppShell>
  );
}
