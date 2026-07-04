import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useLocation } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, X, Check, Camera, Mic, MicOff, Play, Square, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEvents } from '@/contexts/EventsContext';
import { useToast } from '@/components/ds/Toast';
import { RestaurantEvent, EventCategory, Priority, EventStatus, AIAssessment } from '@/store/events';
import {
  CATEGORIES, CATEGORY_CONFIG,
  STATUSES, STATUS_CONFIG,
} from '@/config/eventCategories';
import PriorityModal from '@/components/ai/PriorityModal';
import AppShell from '@/components/layout/AppShell';
import SafeArea from '@/components/layout/SafeArea';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function nid() {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);
}

function localNow(): string {
  const d = new Date();
  d.setSeconds(0, 0);
  return d.toISOString().slice(0, 16); // "2024-07-04T14:30"
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload  = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

function fmtDuration(secs: number): string {
  const m = Math.floor(secs / 60).toString().padStart(2, '0');
  const s = (secs % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

// ─── Slide animation ──────────────────────────────────────────────────────────

const slideRight = {
  initial:    { x: '100%', opacity: 0 },
  animate:    { x: 0, opacity: 1, transition: { duration: 0.32, ease: [0.22, 1, 0.36, 1] as const } },
  exit:       { x: '100%', opacity: 0, transition: { duration: 0.22, ease: 'easeIn' as const } },
};

// ─── Chip group ───────────────────────────────────────────────────────────────

function ChipRow<T extends string>({
  options,
  labels,
  value,
  onChange,
}: {
  options: T[];
  labels: Record<T, string>;
  value: T | '';
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(opt)}
          className={cn(
            'px-3.5 py-2 rounded-full text-[13px] font-medium border transition-all active:scale-[0.97]',
            value === opt
              ? 'bg-primary text-white border-primary shadow-[0_2px_8px_rgba(91,92,235,0.28)]'
              : 'bg-card border-border text-foreground hover:border-primary/40',
          )}
        >
          {labels[opt]}
        </button>
      ))}
    </div>
  );
}

// ─── Field label ──────────────────────────────────────────────────────────────

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[12px] font-bold uppercase tracking-wider text-muted-foreground mb-2 px-0.5">
      {children}
    </p>
  );
}

function TextInput({
  placeholder, value, onChange, type = 'text', autoFocus, prefix,
}: {
  placeholder: string; value: string; onChange: (v: string) => void;
  type?: string; autoFocus?: boolean; prefix?: string;
}) {
  return (
    <div className="relative">
      {prefix && (
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[14px] font-medium text-muted-foreground pointer-events-none">
          {prefix}
        </span>
      )}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className={cn(
          'w-full h-[52px] bg-card border border-border rounded-2xl text-[15px] font-medium text-foreground',
          'placeholder:text-muted-foreground/40 placeholder:font-normal',
          'focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/12 transition-all',
          prefix ? 'pl-8 pr-4' : 'px-4',
        )}
      />
    </div>
  );
}

function TextArea({
  placeholder, value, onChange, rows = 3,
}: {
  placeholder: string; value: string; onChange: (v: string) => void; rows?: number;
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="w-full bg-card border border-border rounded-2xl text-[15px] font-medium text-foreground px-4 py-3.5 placeholder:text-muted-foreground/40 placeholder:font-normal focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/12 transition-all resize-none leading-relaxed"
    />
  );
}

// ─── Photo picker ─────────────────────────────────────────────────────────────

function PhotoPicker({
  photos, onAdd, onRemove,
}: {
  photos: string[];
  onAdd: (files: FileList) => void;
  onRemove: (i: number) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex gap-2.5 flex-wrap">
      {photos.map((src, i) => (
        <div key={i} className="relative w-20 h-20 rounded-2xl overflow-hidden flex-shrink-0 border border-border">
          <img src={src} alt="" className="w-full h-full object-cover" />
          <button
            type="button"
            onClick={() => onRemove(i)}
            className="absolute top-1 right-1 w-5 h-5 rounded-full bg-foreground/70 flex items-center justify-center backdrop-blur-sm"
          >
            <X size={10} className="text-white" />
          </button>
        </div>
      ))}

      {photos.length < 3 && (
        <>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => e.target.files && onAdd(e.target.files)}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="w-20 h-20 rounded-2xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-1 hover:border-primary/50 hover:bg-primary/4 transition-colors flex-shrink-0"
          >
            <Camera size={18} className="text-muted-foreground" />
            <span className="text-[10px] font-medium text-muted-foreground">Фото</span>
          </button>
        </>
      )}
    </div>
  );
}

// ─── Voice recorder ───────────────────────────────────────────────────────────

function VoiceRecorder({
  voiceNote, onRecorded, onClear,
}: {
  voiceNote: string | null;
  onRecorded: (dataUrl: string) => void;
  onClear: () => void;
}) {
  const { toast } = useToast();
  const [recording, setRecording] = useState(false);
  const [duration, setDuration]   = useState(0);
  const [playing,  setPlaying]    = useState(false);
  const mediaRef   = useRef<MediaRecorder | null>(null);
  const streamRef  = useRef<MediaStream | null>(null);
  const chunksRef  = useRef<BlobPart[]>([]);
  const timerRef   = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioRef   = useRef<HTMLAudioElement | null>(null);

  // ── Unmount cleanup ─────────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      // Stop active recording
      if (mediaRef.current && mediaRef.current.state === 'recording') {
        mediaRef.current.stop();
      }
      // Release microphone
      streamRef.current?.getTracks().forEach((t) => t.stop());
      // Clear duration timer
      if (timerRef.current) clearInterval(timerRef.current);
      // Stop any playing audio
      if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    };
  }, []);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';
      const mr = new MediaRecorder(stream, { mimeType });
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        const blob   = new Blob(chunksRef.current, { type: mimeType });
        const reader = new FileReader();
        reader.onloadend = () => onRecorded(reader.result as string);
        reader.readAsDataURL(blob);
        setRecording(false);
        if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
      };
      mr.start(100);
      mediaRef.current = mr;
      setRecording(true);
      setDuration(0);
      timerRef.current = setInterval(() => {
        setDuration((d) => {
          if (d >= 59) { mr.stop(); return 60; }
          return d + 1;
        });
      }, 1000);
    } catch {
      toast({ variant: 'warning', title: 'Нет доступа к микрофону', description: 'Разрешите доступ в настройках браузера.' });
    }
  }, [onRecorded, toast]);

  const stopRecording = useCallback(() => {
    mediaRef.current?.stop();
  }, []);

  const playNote = useCallback(() => {
    if (!voiceNote) return;
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    const audio = new Audio(voiceNote);
    audioRef.current = audio;
    audio.play();
    setPlaying(true);
    audio.onended = () => setPlaying(false);
  }, [voiceNote]);

  const stopPlay = useCallback(() => {
    audioRef.current?.pause();
    audioRef.current = null;
    setPlaying(false);
  }, []);

  if (voiceNote) {
    return (
      <div className="flex items-center gap-3 bg-card border border-border rounded-2xl px-4 py-3">
        <button
          type="button"
          onClick={playing ? stopPlay : playNote}
          className="w-10 h-10 rounded-full bg-primary flex items-center justify-center flex-shrink-0"
        >
          {playing
            ? <Square size={14} className="text-white" />
            : <Play  size={14} className="text-white ml-0.5" />
          }
        </button>
        <div className="flex-1 min-w-0">
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-primary rounded-full"
              animate={playing ? { width: '100%' } : { width: '0%' }}
              transition={playing ? { duration: 30, ease: 'linear' } : { duration: 0 }}
            />
          </div>
          <p className="text-[12px] text-muted-foreground mt-1">Голосовая заметка</p>
        </div>
        <button type="button" onClick={onClear} className="text-muted-foreground hover:text-destructive transition-colors">
          <Trash2 size={16} />
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onPointerDown={startRecording}
      onPointerUp={stopRecording}
      onPointerLeave={recording ? stopRecording : undefined}
      className={cn(
        'w-full flex items-center gap-3 border rounded-2xl px-4 py-3 transition-all',
        recording
          ? 'bg-destructive/8 border-destructive/40'
          : 'bg-card border-border hover:border-primary/40',
      )}
    >
      <div className={cn(
        'w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0',
        recording ? 'bg-destructive' : 'bg-muted',
      )}>
        {recording
          ? <MicOff size={16} className="text-white" />
          : <Mic    size={16} className="text-muted-foreground" />
        }
      </div>
      <div className="text-left">
        <p className={cn('text-[14px] font-semibold', recording ? 'text-destructive' : 'text-foreground')}>
          {recording ? `Запись… ${fmtDuration(duration)}` : 'Удержите, чтобы записать'}
        </p>
        <p className="text-[12px] text-muted-foreground">
          {recording ? 'Отпустите, чтобы остановить' : 'Голосовая заметка · макс. 60 сек.'}
        </p>
      </div>
      {recording && (
        <motion.div
          className="w-2 h-2 rounded-full bg-destructive ml-auto flex-shrink-0"
          animate={{ opacity: [1, 0.3, 1] }}
          transition={{ duration: 0.8, repeat: Infinity }}
        />
      )}
    </button>
  );
}

// ─── Event form ───────────────────────────────────────────────────────────────

function EventForm({
  category,
  onSaved,
  onBack,
}: {
  category: EventCategory;
  onSaved: (ev: RestaurantEvent) => void;
  onBack: () => void;
}) {
  const { addEvent } = useEvents();
  const { toast }    = useToast();
  const cfg = CATEGORY_CONFIG[category];
  const Icon = cfg.icon;

  // Form state
  const [title,       setTitle]       = useState('');
  const [extraField,  setExtraField]  = useState('');
  const [description, setDescription] = useState('');
  const [status,      setStatus]      = useState<EventStatus>('open');
  const [eventDate,   setEventDate]   = useState(localNow);
  const [responsible, setResponsible] = useState('');
  const [photos,      setPhotos]      = useState<string[]>([]);
  const [voiceNote,   setVoiceNote]   = useState<string | null>(null);

  const canSave = title.trim().length > 0;

  async function handlePhotoAdd(files: FileList) {
    const remaining = 3 - photos.length;
    const toProcess = Array.from(files).slice(0, remaining);
    const dataUrls  = await Promise.all(toProcess.map(readFileAsDataUrl));
    setPhotos((prev) => [...prev, ...dataUrls].slice(0, 3));
  }

  function handleSave() {
    if (!canSave) return;
    const now = new Date().toISOString();
    const ev: RestaurantEvent = {
      id:          nid(),
      category,
      title:       title.trim(),
      description: description.trim(),
      priority:    'low',   // AI Priority Engine will set the real priority
      status,
      responsible: responsible.trim(),
      eventDate:   new Date(eventDate).toISOString(),
      photos,
      voiceNote,
      extraField:  extraField.trim(),
      createdAt:   now,
      updatedAt:   now,
    };
    const persisted = addEvent(ev);
    if (!persisted) {
      toast({
        variant: 'warning',
        title: 'Мало памяти браузера',
        description: 'Событие добавлено в текущую сессию, но не сохранено постоянно. Очистите старые данные.',
      });
    }
    onSaved(ev);
  }

  const statusLabels = Object.fromEntries(
    STATUSES.map((s) => [s, STATUS_CONFIG[s].label]),
  ) as Record<EventStatus, string>;

  return (
    <motion.div key="form" {...slideRight} className="flex flex-col min-h-[100dvh]">
      <SafeArea className="flex flex-col flex-1 pt-5 pb-10">

        {/* Header */}
        <div className="flex items-center gap-3 px-6 mb-5">
          <button
            type="button"
            onClick={onBack}
            className="w-9 h-9 rounded-full bg-card border border-border flex items-center justify-center shadow-[var(--shadow-card)] active:scale-95 flex-shrink-0"
          >
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

        {/* Form fields */}
        <div className="flex-1 overflow-y-auto px-6 flex flex-col gap-5">

          {/* Title */}
          <div>
            <FieldLabel>Заголовок *</FieldLabel>
            <TextInput
              placeholder="Кратко опишите событие"
              value={title}
              onChange={setTitle}
              autoFocus
            />
          </div>

          {/* Category-specific field */}
          <div>
            <FieldLabel>{cfg.extraLabel}</FieldLabel>
            <TextInput
              placeholder={cfg.extraPlaceholder}
              value={extraField}
              onChange={setExtraField}
            />
          </div>

          {/* Description */}
          <div>
            <FieldLabel>Описание</FieldLabel>
            <TextArea
              placeholder="Подробности — что произошло, когда, при каких обстоятельствах…"
              value={description}
              onChange={setDescription}
              rows={3}
            />
          </div>

          {/* Status */}
          <div>
            <FieldLabel>Статус</FieldLabel>
            <ChipRow
              options={STATUSES}
              labels={statusLabels}
              value={status}
              onChange={setStatus}
            />
          </div>

          {/* Date & time */}
          <div>
            <FieldLabel>Дата и время</FieldLabel>
            <input
              type="datetime-local"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
              className="w-full h-[52px] bg-card border border-border rounded-2xl text-[15px] font-medium text-foreground px-4 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/12 transition-all appearance-none"
            />
          </div>

          {/* Responsible */}
          <div>
            <FieldLabel>Ответственный</FieldLabel>
            <TextInput
              placeholder="Имя сотрудника"
              value={responsible}
              onChange={setResponsible}
            />
          </div>

          {/* Photos */}
          <div>
            <FieldLabel>Фото (до 3)</FieldLabel>
            <PhotoPicker
              photos={photos}
              onAdd={handlePhotoAdd}
              onRemove={(i) => setPhotos((p) => p.filter((_, j) => j !== i))}
            />
          </div>

          {/* Voice note */}
          <div>
            <FieldLabel>Голосовая заметка</FieldLabel>
            <VoiceRecorder
              voiceNote={voiceNote}
              onRecorded={setVoiceNote}
              onClear={() => setVoiceNote(null)}
            />
          </div>

          {/* Save */}
          <button
            type="button"
            onClick={handleSave}
            disabled={!canSave}
            className={cn(
              'w-full h-14 rounded-2xl text-[16px] font-bold tracking-tight transition-all flex items-center justify-center mt-2 mb-2',
              canSave
                ? 'bg-primary text-white shadow-[0_4px_20px_rgba(91,92,235,0.30)] active:scale-[0.98] hover:opacity-90'
                : 'bg-muted text-muted-foreground cursor-not-allowed',
            )}
          >
            Сохранить событие
          </button>

        </div>
      </SafeArea>
    </motion.div>
  );
}

// ─── Success screen ───────────────────────────────────────────────────────────

function SuccessScreen({ categoryLabel, onAddAnother }: { categoryLabel: string; onAddAnother: () => void }) {
  return (
    <motion.div
      key="success"
      initial={{ opacity: 0, scale: 0.94 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
      className="flex flex-col items-center justify-center flex-1 px-8 text-center py-16 min-h-[100dvh]"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.08, type: 'spring', stiffness: 280, damping: 20 }}
        className="w-20 h-20 rounded-full bg-[#22C55E]/12 flex items-center justify-center mb-6"
      >
        <Check size={36} strokeWidth={2.5} className="text-[#16A34A]" />
      </motion.div>

      <motion.p
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.18 }}
        className="text-[12px] font-bold uppercase tracking-widest text-[#16A34A] mb-2"
      >
        Сохранено
      </motion.p>
      <motion.h2
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.24 }}
        className="text-[22px] font-black text-foreground tracking-tight mb-2"
      >
        Событие добавлено
      </motion.h2>
      <motion.p
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="text-[14px] text-muted-foreground mb-10 max-w-[240px] leading-relaxed"
      >
        «{categoryLabel}» попало в историю ресторана. BarDoctor учтёт его при анализе.
      </motion.p>

      <motion.button
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.36 }}
        type="button"
        onClick={onAddAnother}
        className="px-8 py-3 bg-muted text-foreground rounded-2xl text-[14px] font-semibold hover:bg-border transition-colors active:scale-[0.97]"
      >
        Добавить ещё
      </motion.button>
    </motion.div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

type Screen = 'pick' | 'form' | 'assess' | 'success';

export default function Add() {
  const [, setLocation]       = useLocation();
  const { updateEvent }       = useEvents();
  const [screen, setScreen]         = useState<Screen>('pick');
  const [category, setCategory]     = useState<EventCategory | null>(null);
  const [savedEvent, setSavedEvent] = useState<RestaurantEvent | null>(null);
  const navTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clear pending navigation on unmount
  useEffect(() => {
    return () => {
      if (navTimerRef.current) clearTimeout(navTimerRef.current);
    };
  }, []);

  function handleCategoryPick(cat: EventCategory) {
    setCategory(cat);
    setScreen('form');
  }

  function handleSaved(ev: RestaurantEvent) {
    setSavedEvent(ev);
    setScreen('assess');
  }

  function handleAssessed() {
    setScreen('success');
    navTimerRef.current = setTimeout(() => setLocation('/events'), 1800);
  }

  function handleAddAnother() {
    // Cancel pending auto-navigation before going back to picker
    if (navTimerRef.current) { clearTimeout(navTimerRef.current); navTimerRef.current = null; }
    setSavedEvent(null);
    setCategory(null);
    setScreen('pick');
  }

  return (
    <AppShell>
      <AnimatePresence mode="wait">

        {/* ── Category picker ── */}
        {screen === 'pick' && (
          <motion.div
            key="pick"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, x: -32 }}
            transition={{ duration: 0.24 }}
            className="flex flex-col min-h-[100dvh]"
          >
            <SafeArea className="flex flex-col flex-1 pt-6 pb-10">
              {/* Top bar */}
              <div className="flex items-center justify-between px-6 mb-8">
                <div>
                  <h1 className="text-[26px] font-black text-foreground tracking-tight leading-tight">
                    Что произошло?
                  </h1>
                  <p className="text-[14px] text-muted-foreground mt-0.5">Выберите категорию события</p>
                </div>
                <button
                  type="button"
                  onClick={() => setLocation('/home')}
                  className="w-10 h-10 bg-card border border-border rounded-full flex items-center justify-center shadow-[var(--shadow-card)] active:scale-95"
                >
                  <X size={17} className="text-foreground" />
                </button>
              </div>

              {/* 3 × 3 grid */}
              <div className="px-6 grid grid-cols-3 gap-3">
                {CATEGORIES.map(([key, cfg], i) => {
                  const Icon = cfg.icon;
                  return (
                    <motion.button
                      key={key}
                      type="button"
                      onClick={() => handleCategoryPick(key)}
                      initial={{ opacity: 0, y: 14 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04, duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
                      whileTap={{ scale: 0.95 }}
                      className="bd-card flex flex-col items-center justify-center text-center p-4 gap-2.5 hover:shadow-[var(--shadow-elevated)] hover:-translate-y-0.5 transition-all duration-200 min-h-[110px]"
                    >
                      <div className={cn('w-10 h-10 rounded-[13px] flex items-center justify-center', cfg.iconBg)}>
                        <Icon size={19} className={cfg.iconColor} />
                      </div>
                      <p className="text-[12px] font-bold text-foreground leading-tight">{cfg.label}</p>
                    </motion.button>
                  );
                })}
              </div>
            </SafeArea>
          </motion.div>
        )}

        {/* ── Form ── */}
        {screen === 'form' && category && (
          <EventForm
            key={`form-${category}`}
            category={category}
            onSaved={handleSaved}
            onBack={() => { setScreen('pick'); setCategory(null); }}
          />
        )}

        {/* ── AI Assessment ── */}
        {screen === 'assess' && savedEvent && (
          <PriorityModal
            key="assess"
            itemType="event"
            category={savedEvent.category}
            title={savedEvent.title}
            description={savedEvent.description}
            extraField={savedEvent.extraField}
            onConfirm={(priority: Priority, assessment: AIAssessment) => {
              updateEvent(savedEvent.id, { priority, aiAssessment: assessment });
              handleAssessed();
            }}
            onSkip={() => {
              updateEvent(savedEvent.id, { priority: 'medium' });
              handleAssessed();
            }}
          />
        )}

        {/* ── Success ── */}
        {screen === 'success' && category && savedEvent && (
          <SuccessScreen
            key="success"
            categoryLabel={CATEGORY_CONFIG[category].label}
            onAddAnother={handleAddAnother}
          />
        )}

      </AnimatePresence>
    </AppShell>
  );
}
