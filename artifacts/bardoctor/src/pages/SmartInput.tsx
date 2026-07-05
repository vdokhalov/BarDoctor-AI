/**
 * SmartInput — Universal "Сообщить BarDoctor" entry point.
 *
 * Four input methods (Voice / Text / Photo / Document) all feed the same
 * AI pipeline. The AI extracts category, type, priority and all other fields
 * automatically. Users never choose anything structural.
 *
 * Phases: pick → input → processing → conversation → confirm → done
 */
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useLocation } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain, Mic, MicOff, Keyboard, Camera, Paperclip,
  ChevronLeft, Send, Check, AlertCircle, RefreshCw,
  Zap, X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import AppShell from '@/components/layout/AppShell';
import SafeArea from '@/components/layout/SafeArea';
import { useRestaurant } from '@/contexts/RestaurantContext';
import { useEvents }     from '@/contexts/EventsContext';
import { useCases }      from '@/contexts/CasesContext';
import { CATEGORY_CONFIG }      from '@/config/eventCategories';
import { CASE_TYPE_CONFIG }     from '@/config/caseCategories';
import type { EventCategory, Priority } from '@/store/events';
import type { CaseType, CasePriority }  from '@/store/cases';
import { caseNid, makeTimeline } from '@/store/cases';
import type { RestaurantEvent }  from '@/store/events';
import type { Case }             from '@/store/cases';

// ─── Types ────────────────────────────────────────────────────────────────────

type Phase       = 'pick' | 'input' | 'processing' | 'conversation' | 'confirm' | 'done';
type InputMethod = 'voice' | 'text' | 'photo' | 'document';

interface Message { role: 'user' | 'ai'; content: string }

interface SmartExtracted {
  title:        string;
  description:  string;
  priority:     Priority;
  category?:    EventCategory;
  type?:        CaseType;
  responsible?: string;
  eventDate?:   string;
  dueDate?:     string;
  extraField?:  string;
}

interface SmartResult {
  needsMoreInfo:      boolean;
  followUpQuestions?: string[];
  partialSummary?:    string;
  outputType?:        'event' | 'case';
  summary?:           string;
  extracted?:         SmartExtracted;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function nid() {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload  = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload  = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsText(file);
  });
}

// ─── Slide animation ──────────────────────────────────────────────────────────

const slideRight = {
  initial:  { x: '100%', opacity: 0 },
  animate:  { x: 0, opacity: 1, transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] as const } },
  exit:     { x: '100%', opacity: 0, transition: { duration: 0.2, ease: 'easeIn' as const } },
};

const fadeIn = {
  initial:  { opacity: 0 },
  animate:  { opacity: 1 },
  exit:     { opacity: 0 },
};

// ─── Priority style ───────────────────────────────────────────────────────────

const PRI: Record<Priority, { label: string; stripe: string; textColor: string; bg: string }> = {
  critical: { label: 'Критично', stripe: '#EF4444', textColor: '#DC2626', bg: 'rgba(220,38,38,0.10)' },
  high:     { label: 'Высокий',  stripe: '#F97316', textColor: '#EA580C', bg: 'rgba(234,88,12,0.10)' },
  medium:   { label: 'Средний',  stripe: '#F59E0B', textColor: '#D97706', bg: 'rgba(217,119,6,0.10)'  },
  low:      { label: 'Низкий',   stripe: '#22C55E', textColor: '#16A34A', bg: 'rgba(22,163,74,0.10)'  },
};

// ─── Input method config ──────────────────────────────────────────────────────

const INPUT_METHODS: Array<{
  id: InputMethod; Icon: React.ElementType; label: string; desc: string;
  color: string; bg: string; iconColor: string;
}> = [
  { id: 'voice',    Icon: Mic,       label: 'Голос',    desc: 'Продиктуйте ситуацию',       color: '#5B5CEB', bg: 'rgba(91,92,235,0.10)',  iconColor: '#5B5CEB' },
  { id: 'text',     Icon: Keyboard,  label: 'Текст',    desc: 'Опишите письменно',           color: '#0EA5E9', bg: 'rgba(14,165,233,0.10)', iconColor: '#0EA5E9' },
  { id: 'photo',    Icon: Camera,    label: 'Фото',     desc: 'Сфотографируйте проблему',    color: '#22C55E', bg: 'rgba(34,197,94,0.10)',  iconColor: '#16A34A' },
  { id: 'document', Icon: Paperclip, label: 'Документ', desc: 'Прикрепите файл или акт',     color: '#F59E0B', bg: 'rgba(245,158,11,0.10)', iconColor: '#D97706' },
];

// ─── Chat bubble ──────────────────────────────────────────────────────────────

function ChatBubble({ role, content }: { role: 'user' | 'ai'; content: string }) {
  const isUser = role === 'user';
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      className={cn('flex mb-4', isUser ? 'justify-end' : 'justify-start')}
    >
      {!isUser && (
        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center mr-2.5 flex-shrink-0 mt-0.5">
          <Brain size={14} className="text-primary" />
        </div>
      )}
      <div className={cn(
        'max-w-[82%] px-4 py-3 text-[14px] leading-relaxed font-medium',
        isUser
          ? 'bg-primary text-white rounded-[20px] rounded-br-[6px]'
          : 'bg-card border border-border text-foreground rounded-[20px] rounded-bl-[6px] shadow-[var(--shadow-card)]',
      )}>
        {content}
      </div>
    </motion.div>
  );
}

// ─── Extraction card ──────────────────────────────────────────────────────────

function ExtractionCard({
  outputType, extracted,
}: {
  outputType: 'event' | 'case';
  extracted:  SmartExtracted;
}) {
  const pri      = PRI[extracted.priority] ?? PRI.medium;
  const isEvent  = outputType === 'event';

  let catLabel = '';
  let CatIcon: React.ElementType | null = null;
  if (isEvent && extracted.category && CATEGORY_CONFIG[extracted.category]) {
    catLabel = CATEGORY_CONFIG[extracted.category].label;
    CatIcon  = CATEGORY_CONFIG[extracted.category].icon;
  } else if (!isEvent && extracted.type && CASE_TYPE_CONFIG[extracted.type]) {
    catLabel = CASE_TYPE_CONFIG[extracted.type].label;
    CatIcon  = CASE_TYPE_CONFIG[extracted.type].icon;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.12, duration: 0.3 }}
      className="bd-card overflow-hidden"
    >
      {/* Priority stripe */}
      <div className="h-1 w-full" style={{ backgroundColor: pri.stripe }} />

      <div className="px-5 py-4">
        {/* Type + category row */}
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <span className="text-[10px] font-black uppercase tracking-[0.12em] px-2 py-1 rounded-full"
            style={{ backgroundColor: pri.bg, color: pri.textColor }}>
            {isEvent ? 'Событие' : 'Дело'}
          </span>
          {CatIcon && catLabel && (
            <div className="flex items-center gap-1.5">
              <CatIcon size={12} className="text-muted-foreground" />
              <span className="text-[12px] font-semibold text-muted-foreground">{catLabel}</span>
            </div>
          )}
          <div className="ml-auto flex items-center gap-1.5">
            <Zap size={11} style={{ color: pri.textColor }} />
            <span className="text-[11px] font-black" style={{ color: pri.textColor }}>{pri.label}</span>
          </div>
        </div>

        {/* Title */}
        <p className="text-[17px] font-black text-foreground tracking-tight mb-2 leading-snug">
          {extracted.title}
        </p>

        {/* Description */}
        <p className="text-[13px] text-muted-foreground leading-relaxed">
          {extracted.description}
        </p>

        {/* Metadata */}
        {(extracted.responsible || extracted.dueDate || extracted.extraField) && (
          <div className="mt-4 pt-3 border-t border-border/50 flex flex-col gap-1.5">
            {extracted.responsible && (
              <p className="text-[12px] text-muted-foreground">
                <span className="font-semibold text-foreground/60">Ответственный:</span> {extracted.responsible}
              </p>
            )}
            {extracted.dueDate && (
              <p className="text-[12px] text-muted-foreground">
                <span className="font-semibold text-foreground/60">Дедлайн:</span>{' '}
                {new Date(extracted.dueDate).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}
              </p>
            )}
            {extracted.extraField && (
              <p className="text-[12px] text-muted-foreground">
                <span className="font-semibold text-foreground/60">Детали:</span> {extracted.extraField}
              </p>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ─── Processing screen ────────────────────────────────────────────────────────

function ProcessingScreen() {
  return (
    <motion.div key="processing" {...fadeIn} className="flex flex-col min-h-[100dvh]">
      <SafeArea className="flex flex-col flex-1 items-center justify-center px-6 py-16">
        <div className="w-full rounded-[28px] relative overflow-hidden mb-8"
          style={{ background: 'linear-gradient(160deg, #1A1F38 0%, #161B2E 55%, #1D1440 100%)', height: 220 }}>
          <motion.div className="absolute inset-0"
            animate={{ backgroundPosition: ['200% 0', '-200% 0'] }}
            transition={{ repeat: Infinity, duration: 2.4, ease: 'linear' }}
            style={{ background: 'linear-gradient(90deg, transparent, rgba(91,92,235,0.16), transparent)', backgroundSize: '200% 100%' }}
          />
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
            <motion.div
              animate={{ scale: [1, 1.12, 1], opacity: [0.7, 1, 0.7] }}
              transition={{ repeat: Infinity, duration: 2.4, ease: 'easeInOut' }}
              className="w-16 h-16 rounded-[20px] bg-white/10 flex items-center justify-center"
            >
              <Brain size={28} className="text-white/80" />
            </motion.div>
            <div className="text-center px-4">
              <motion.p
                animate={{ opacity: [0.6, 1, 0.6] }}
                transition={{ repeat: Infinity, duration: 1.8, ease: 'easeInOut' }}
                className="text-[15px] font-bold text-white/80"
              >
                BarDoctor анализирует ситуацию…
              </motion.p>
              <p className="text-[12px] text-white/40 mt-1">Определяю категорию и приоритет</p>
            </div>
          </div>
        </div>

        {[75, 55, 65, 45].map((w, i) => (
          <motion.div key={i}
            animate={{ opacity: [0.35, 0.7, 0.35] }}
            transition={{ repeat: Infinity, duration: 1.6, delay: i * 0.18, ease: 'easeInOut' }}
            className="h-3 bg-muted rounded-full mb-3"
            style={{ width: `${w}%` }}
          />
        ))}
      </SafeArea>
    </motion.div>
  );
}

// ─── Voice input ──────────────────────────────────────────────────────────────

function VoiceInput({
  onSubmit, onBack,
}: { onSubmit: (text: string) => void; onBack: () => void }) {
  const [transcript,   setTranscript]   = useState('');
  const [isRecording,  setIsRecording]  = useState(false);
  const [isSupported,  setIsSupported]  = useState(true);
  const [textFallback, setTextFallback] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recRef = useRef<any | null>(null);

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SRClass = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SRClass) { setIsSupported(false); return; }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const r: any = new SRClass();
    r.lang = 'ru-RU';
    r.continuous = true;
    r.interimResults = true;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    r.onresult = (e: any) => {
      const t = Array.from(e.results as ArrayLike<ArrayLike<{ transcript: string }>>)
        .map((res) => res[0].transcript).join(' ');
      setTranscript(t);
    };
    r.onerror = () => { setIsRecording(false); };
    r.onend   = () => { setIsRecording(false); };
    recRef.current = r;
    return () => { r.abort(); };
  }, []);

  function toggle() {
    if (!recRef.current) return;
    if (isRecording) {
      recRef.current.stop();
      setIsRecording(false);
    } else {
      setTranscript('');
      recRef.current.start();
      setIsRecording(true);
    }
  }

  if (!isSupported || textFallback) {
    return (
      <motion.div key="voice-fallback" {...slideRight} className="flex flex-col min-h-[100dvh]">
        <SafeArea className="flex flex-col flex-1 pt-5 pb-10">
          <div className="flex items-center gap-3 px-6 mb-6">
            <button type="button" onClick={onBack}
              className="w-9 h-9 rounded-full bg-card border border-border flex items-center justify-center active:scale-95">
              <ChevronLeft size={18} />
            </button>
            <p className="text-[17px] font-black tracking-tight">Голос → Текст</p>
          </div>
          {!isSupported && (
            <div className="mx-6 mb-4 px-4 py-3 rounded-2xl bg-[#F59E0B]/10 border border-[#F59E0B]/30">
              <p className="text-[13px] text-[#D97706] font-medium">
                Диктовка недоступна в этом браузере. Напишите ситуацию вручную:
              </p>
            </div>
          )}
          <div className="px-6 flex-1">
            <textarea
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              placeholder="Опишите ситуацию…"
              rows={6}
              autoFocus
              className="w-full bg-card border border-border rounded-2xl text-[15px] font-medium text-foreground px-4 py-3.5 placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/12 transition-all resize-none leading-relaxed"
            />
          </div>
          <div className="px-6 mt-4">
            <button type="button" onClick={() => onSubmit(transcript)} disabled={!transcript.trim()}
              className={cn('w-full h-14 rounded-2xl text-[16px] font-bold flex items-center justify-center gap-2 transition-all',
                transcript.trim() ? 'bg-primary text-white shadow-[0_4px_20px_rgba(91,92,235,0.30)] active:scale-[0.98]' : 'bg-muted text-muted-foreground cursor-not-allowed')}>
              Отправить <Send size={16} />
            </button>
          </div>
        </SafeArea>
      </motion.div>
    );
  }

  return (
    <motion.div key="voice" {...slideRight} className="flex flex-col min-h-[100dvh]">
      <SafeArea className="flex flex-col flex-1 pt-5 pb-10">
        <div className="flex items-center justify-between px-6 mb-6">
          <div className="flex items-center gap-3">
            <button type="button" onClick={onBack}
              className="w-9 h-9 rounded-full bg-card border border-border flex items-center justify-center active:scale-95">
              <ChevronLeft size={18} />
            </button>
            <p className="text-[17px] font-black tracking-tight">Голос</p>
          </div>
          <button type="button" onClick={() => setTextFallback(true)}
            className="text-[12px] font-semibold text-muted-foreground hover:text-foreground transition-colors px-2 py-1">
            Текстом
          </button>
        </div>

        {/* Transcript area */}
        <div className="mx-6 flex-1 min-h-[120px] max-h-[200px] overflow-y-auto rounded-2xl border border-border bg-card px-4 py-3.5 mb-6">
          {transcript
            ? <p className="text-[15px] font-medium text-foreground leading-relaxed">{transcript}</p>
            : <p className="text-[14px] text-muted-foreground/50 italic">Текст появится здесь…</p>
          }
        </div>

        {/* Record button */}
        <div className="flex flex-col items-center gap-4 mb-8">
          <button type="button" onClick={toggle}
            className={cn(
              'w-24 h-24 rounded-full flex items-center justify-center transition-all active:scale-95 shadow-xl',
              isRecording
                ? 'bg-destructive shadow-[0_0_0_8px_rgba(239,68,68,0.18),0_8px_32px_rgba(239,68,68,0.40)]'
                : 'bg-primary shadow-[0_8px_32px_rgba(91,92,235,0.40)]',
            )}>
            {isRecording
              ? <motion.div animate={{ scale: [1, 0.85, 1] }} transition={{ repeat: Infinity, duration: 0.8 }}>
                  <MicOff size={32} className="text-white" />
                </motion.div>
              : <Mic size={32} className="text-white" />
            }
          </button>
          <p className="text-[13px] font-semibold text-muted-foreground">
            {isRecording ? 'Говорите… нажмите ещё раз, чтобы остановить' : 'Нажмите, чтобы говорить'}
          </p>
          {isRecording && (
            <motion.div className="flex gap-1 items-center">
              {[1,2,3,4,5].map((i) => (
                <motion.div key={i} className="w-1 rounded-full bg-destructive"
                  animate={{ height: [6, 20, 6] }}
                  transition={{ repeat: Infinity, duration: 0.6, delay: i * 0.1 }} />
              ))}
            </motion.div>
          )}
        </div>

        {/* Send */}
        <div className="px-6">
          <button type="button" onClick={() => onSubmit(transcript)} disabled={!transcript.trim()}
            className={cn('w-full h-14 rounded-2xl text-[16px] font-bold flex items-center justify-center gap-2 transition-all',
              transcript.trim() ? 'bg-primary text-white shadow-[0_4px_20px_rgba(91,92,235,0.30)] active:scale-[0.98]' : 'bg-muted text-muted-foreground cursor-not-allowed')}>
            Отправить <Send size={16} />
          </button>
        </div>
      </SafeArea>
    </motion.div>
  );
}

// ─── Text input ───────────────────────────────────────────────────────────────

function TextInput({ onSubmit, onBack }: { onSubmit: (text: string) => void; onBack: () => void }) {
  const [text, setText] = useState('');
  return (
    <motion.div key="text-input" {...slideRight} className="flex flex-col min-h-[100dvh]">
      <SafeArea className="flex flex-col flex-1 pt-5 pb-10">
        <div className="flex items-center gap-3 px-6 mb-6">
          <button type="button" onClick={onBack}
            className="w-9 h-9 rounded-full bg-card border border-border flex items-center justify-center active:scale-95">
            <ChevronLeft size={18} />
          </button>
          <p className="text-[17px] font-black tracking-tight">Что произошло?</p>
        </div>

        <div className="px-6 flex-1 flex flex-col">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Опишите ситуацию кратко или подробно — AI разберётся сам. Можно написать как угодно."
            rows={7}
            autoFocus
            className="w-full flex-1 bg-card border border-border rounded-2xl text-[15px] font-medium text-foreground px-4 py-4 placeholder:text-muted-foreground/40 placeholder:font-normal placeholder:text-[14px] focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/12 transition-all resize-none leading-relaxed"
          />
        </div>

        <div className="px-6 mt-4">
          <button type="button" onClick={() => onSubmit(text)} disabled={!text.trim()}
            className={cn('w-full h-14 rounded-2xl text-[16px] font-bold flex items-center justify-center gap-2 transition-all',
              text.trim() ? 'bg-primary text-white shadow-[0_4px_20px_rgba(91,92,235,0.30)] active:scale-[0.98]' : 'bg-muted text-muted-foreground cursor-not-allowed')}>
            Отправить <Send size={16} />
          </button>
        </div>
      </SafeArea>
    </motion.div>
  );
}

// ─── Photo input ──────────────────────────────────────────────────────────────

function PhotoInput({
  onSubmit, onBack,
}: { onSubmit: (text: string, base64: string, mediaType: string) => void; onBack: () => void }) {
  const [preview,   setPreview]   = useState<string | null>(null);
  const [base64,    setBase64]    = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<string | null>(null);
  const [caption,   setCaption]   = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const dataUrl = await readFileAsDataUrl(file);
    setPreview(dataUrl);
    setMediaType(file.type || 'image/jpeg');
    // Strip data URL prefix for API
    setBase64(dataUrl.split(',')[1] || dataUrl);
  }

  return (
    <motion.div key="photo-input" {...slideRight} className="flex flex-col min-h-[100dvh]">
      <SafeArea className="flex flex-col flex-1 pt-5 pb-10">
        <div className="flex items-center gap-3 px-6 mb-6">
          <button type="button" onClick={onBack}
            className="w-9 h-9 rounded-full bg-card border border-border flex items-center justify-center active:scale-95">
            <ChevronLeft size={18} />
          </button>
          <p className="text-[17px] font-black tracking-tight">Фото</p>
        </div>

        <div className="px-6 flex-1 flex flex-col gap-4">
          {/* Photo area */}
          <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFile} />
          <button type="button" onClick={() => fileRef.current?.click()}
            className={cn(
              'w-full rounded-[24px] overflow-hidden border-2 flex items-center justify-center transition-all active:scale-[0.98]',
              preview ? 'border-primary/40 h-64' : 'border-dashed border-border h-52 bg-card hover:border-primary/50 hover:bg-primary/4',
            )}>
            {preview
              ? <img src={preview} alt="" className="w-full h-full object-cover" />
              : <div className="flex flex-col items-center gap-3 text-muted-foreground">
                  <div className="w-14 h-14 rounded-[18px] bg-[#22C55E]/10 flex items-center justify-center">
                    <Camera size={24} className="text-[#16A34A]" />
                  </div>
                  <div className="text-center">
                    <p className="text-[14px] font-bold text-foreground">Сфотографировать проблему</p>
                    <p className="text-[12px] text-muted-foreground mt-0.5">Нажмите, чтобы выбрать или снять</p>
                  </div>
                </div>
            }
          </button>

          {preview && (
            <button type="button" onClick={() => fileRef.current?.click()}
              className="text-[13px] font-semibold text-primary text-center py-1">
              Изменить фото
            </button>
          )}

          {/* Optional caption */}
          {preview && (
            <div>
              <p className="text-[11px] font-black uppercase tracking-widest text-muted-foreground mb-2 px-0.5">
                Комментарий (необязательно)
              </p>
              <textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Что именно не работает? Когда заметили?"
                rows={3}
                className="w-full bg-card border border-border rounded-2xl text-[15px] font-medium text-foreground px-4 py-3.5 placeholder:text-muted-foreground/40 placeholder:font-normal focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/12 transition-all resize-none leading-relaxed"
              />
            </div>
          )}
        </div>

        <div className="px-6 mt-4">
          <button type="button"
            onClick={() => base64 && mediaType && onSubmit(caption, base64, mediaType)}
            disabled={!base64}
            className={cn('w-full h-14 rounded-2xl text-[16px] font-bold flex items-center justify-center gap-2 transition-all',
              base64 ? 'bg-primary text-white shadow-[0_4px_20px_rgba(91,92,235,0.30)] active:scale-[0.98]' : 'bg-muted text-muted-foreground cursor-not-allowed')}>
            Отправить <Send size={16} />
          </button>
        </div>
      </SafeArea>
    </motion.div>
  );
}

// ─── Document input ───────────────────────────────────────────────────────────

function DocumentInput({
  onSubmit, onBack,
}: { onSubmit: (text: string, base64?: string, mediaType?: string) => void; onBack: () => void }) {
  const [fileName,   setFileName]   = useState<string | null>(null);
  const [content,    setContent]    = useState<string | null>(null);   // text for text files
  const [base64,     setBase64]     = useState<string | null>(null);   // for image docs
  const [mediaType,  setMediaType]  = useState<string | null>(null);
  const [comment,    setComment]    = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const isImage = file.type.startsWith('image/');
    const isText  = file.type.startsWith('text/') || file.name.endsWith('.txt') || file.name.endsWith('.md') || file.name.endsWith('.csv');
    if (isImage) {
      const dataUrl = await readFileAsDataUrl(file);
      setBase64(dataUrl.split(',')[1] || dataUrl);
      setMediaType(file.type);
      setContent(null);
    } else if (isText) {
      const text = await readFileAsText(file);
      setContent(text.slice(0, 8000)); // cap size
      setBase64(null);
      setMediaType(null);
    } else {
      // Unsupported file — just use filename as context
      setContent(`Файл: ${file.name}`);
      setBase64(null);
      setMediaType(null);
    }
  }

  function handleSubmit() {
    if (!fileName) return;
    const textToSend = [comment, content].filter(Boolean).join('\n\n');
    if (base64 && mediaType) {
      onSubmit(textToSend || `Документ: ${fileName}`, base64, mediaType);
    } else {
      onSubmit(textToSend || `Документ: ${fileName}`);
    }
  }

  return (
    <motion.div key="doc-input" {...slideRight} className="flex flex-col min-h-[100dvh]">
      <SafeArea className="flex flex-col flex-1 pt-5 pb-10">
        <div className="flex items-center gap-3 px-6 mb-6">
          <button type="button" onClick={onBack}
            className="w-9 h-9 rounded-full bg-card border border-border flex items-center justify-center active:scale-95">
            <ChevronLeft size={18} />
          </button>
          <p className="text-[17px] font-black tracking-tight">Документ</p>
        </div>

        <div className="px-6 flex-1 flex flex-col gap-4">
          <input ref={fileRef} type="file"
            accept="image/*,.txt,.md,.csv,.pdf,.doc,.docx" className="hidden" onChange={handleFile} />

          <button type="button" onClick={() => fileRef.current?.click()}
            className={cn(
              'w-full rounded-[24px] border-2 flex items-center justify-center gap-3 transition-all active:scale-[0.98] py-8',
              fileName ? 'border-primary/40 bg-primary/4' : 'border-dashed border-border bg-card hover:border-primary/50',
            )}>
            <div className={cn('w-12 h-12 rounded-[16px] flex items-center justify-center',
              fileName ? 'bg-primary/10' : 'bg-[#F59E0B]/10')}>
              <Paperclip size={22} className={fileName ? 'text-primary' : 'text-[#D97706]'} />
            </div>
            <div className="text-left">
              {fileName
                ? <>
                    <p className="text-[14px] font-bold text-primary">{fileName}</p>
                    <p className="text-[12px] text-muted-foreground mt-0.5">Нажмите, чтобы изменить</p>
                  </>
                : <>
                    <p className="text-[14px] font-bold text-foreground">Выбрать документ</p>
                    <p className="text-[12px] text-muted-foreground mt-0.5">Фото, текст, таблица…</p>
                  </>
              }
            </div>
          </button>

          <div>
            <p className="text-[11px] font-black uppercase tracking-widest text-muted-foreground mb-2 px-0.5">
              Пояснение (необязательно)
            </p>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Что именно в документе требует внимания?"
              rows={3}
              className="w-full bg-card border border-border rounded-2xl text-[15px] font-medium text-foreground px-4 py-3.5 placeholder:text-muted-foreground/40 placeholder:font-normal focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/12 transition-all resize-none leading-relaxed"
            />
          </div>
        </div>

        <div className="px-6 mt-4">
          <button type="button" onClick={handleSubmit} disabled={!fileName}
            className={cn('w-full h-14 rounded-2xl text-[16px] font-bold flex items-center justify-center gap-2 transition-all',
              fileName ? 'bg-primary text-white shadow-[0_4px_20px_rgba(91,92,235,0.30)] active:scale-[0.98]' : 'bg-muted text-muted-foreground cursor-not-allowed')}>
            Отправить <Send size={16} />
          </button>
        </div>
      </SafeArea>
    </motion.div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function SmartInput() {
  const [, setLocation] = useLocation();
  const { profile }     = useRestaurant();
  const { addEvent, updateEvent } = useEvents();
  const { addCase, updateCase }   = useCases();

  const [phase,       setPhase]       = useState<Phase>('pick');
  const [method,      setMethod]      = useState<InputMethod | null>(null);
  const [messages,    setMessages]    = useState<Message[]>([]);
  const [questions,   setQuestions]   = useState<string[]>([]);
  const [answer,      setAnswer]      = useState('');
  const [extracted,   setExtracted]   = useState<SmartExtracted | null>(null);
  const [outputType,  setOutputType]  = useState<'event' | 'case'>('event');
  const [createdId,   setCreatedId]   = useState<string | null>(null);
  const [error,       setError]       = useState(false);
  const [pendingImg,  setPendingImg]  = useState<{ base64: string; mediaType: string } | null>(null);
  const navTimerRef   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const chatEndRef    = useRef<HTMLDivElement>(null);

  useEffect(() => () => { if (navTimerRef.current) clearTimeout(navTimerRef.current); }, []);
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  // ── API call ────────────────────────────────────────────────────────────────

  const callAPI = useCallback(async (opts: {
    text:             string;
    imageBase64?:     string;
    imageMediaType?:  string;
    followUpAnswers?: Array<{ question: string; answer: string }>;
  }) => {
    setPhase('processing');
    setError(false);
    try {
      const res  = await fetch('/api/smart/process', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          inputType:  method ?? 'text',
          text:       opts.text || undefined,
          imageBase64:   opts.imageBase64,
          imageMediaType: opts.imageMediaType,
          followUpAnswers: opts.followUpAnswers,
          restaurantContext: {
            name:         profile?.name,
            businessType: profile?.businessType,
            seats:        profile?.seats,
          },
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json() as { success: boolean; data: SmartResult };
      if (!json.success) throw new Error('API failure');

      const data = json.data;
      if (data.needsMoreInfo) {
        const qs   = data.followUpQuestions ?? [];
        const aiMsg = data.partialSummary
          ? `${data.partialSummary}\n\n${qs.join('\n')}`
          : qs.join('\n');
        setMessages((prev) => [...prev, { role: 'ai', content: aiMsg }]);
        setQuestions(qs);
        setPhase('conversation');
      } else {
        setMessages((prev) => [...prev, { role: 'ai', content: data.summary ?? 'Понял, фиксирую.' }]);
        setExtracted(data.extracted! as SmartExtracted);
        setOutputType(data.outputType ?? 'event');
        setPhase('confirm');
      }
    } catch (e) {
      console.error('[SmartInput]', e);
      setError(true);
      setPhase('conversation');
    }
  }, [method, profile]);

  // ── Submit initial input ────────────────────────────────────────────────────

  function handleInitialSubmit(text: string, imageBase64?: string, imageMediaType?: string) {
    const userMsg = text.trim() || (imageBase64 ? '(фото)' : '');
    setMessages([{ role: 'user', content: userMsg }]);
    if (imageBase64) setPendingImg({ base64: imageBase64, mediaType: imageMediaType! });
    callAPI({ text, imageBase64, imageMediaType });
  }

  // ── Submit follow-up answer ─────────────────────────────────────────────────

  function handleAnswerSubmit() {
    if (!answer.trim()) return;
    const followUpAnswers = questions.map((q, i) => ({
      question: q,
      answer:   i === 0 ? answer.trim() : '',
    })).filter((qa) => qa.answer);

    setMessages((prev) => [...prev, { role: 'user', content: answer.trim() }]);
    setAnswer('');
    setQuestions([]);

    const originalText = messages[0]?.content ?? '';
    callAPI({
      text:            originalText,
      imageBase64:     pendingImg?.base64,
      imageMediaType:  pendingImg?.mediaType,
      followUpAnswers,
    });
  }

  // ── Create event or case ────────────────────────────────────────────────────

  function handleConfirm() {
    if (!extracted) return;
    const now = new Date().toISOString();

    if (outputType === 'event') {
      const ev: RestaurantEvent = {
        id:          nid(),
        category:    (extracted.category ?? 'operations') as EventCategory,
        title:       extracted.title,
        description: extracted.description,
        priority:    extracted.priority,
        status:      'open',
        responsible: extracted.responsible ?? '',
        eventDate:   extracted.eventDate ?? now,
        photos:      [],
        voiceNote:   null,
        extraField:  extracted.extraField ?? '',
        createdAt:   now,
        updatedAt:   now,
      };
      addEvent(ev);
      setCreatedId(ev.id);
      setPhase('done');
      navTimerRef.current = setTimeout(() => setLocation('/events'), 1800);
    } else {
      const id        = caseNid();
      const initEntry = makeTimeline('created', 'Дело создано через Smart Input');
      const newCase: Case = {
        id, type: (extracted.type ?? 'other') as CaseType,
        title:       extracted.title,
        description: extracted.description,
        priority:    extracted.priority as CasePriority,
        status:      'open',
        responsible: extracted.responsible ?? '',
        dueDate:     extracted.dueDate ?? '',
        photos: [], files: [], comments: [],
        timeline:         [initEntry],
        relatedTasks:     [],
        relatedEquipment: [],
        createdAt: now,
        updatedAt: now,
      };
      addCase(newCase);
      setCreatedId(id);
      setPhase('done');
      navTimerRef.current = setTimeout(() => setLocation(`/cases/${id}`), 1800);
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <AppShell>
      <AnimatePresence mode="wait">

        {/* ── Pick screen ── */}
        {phase === 'pick' && (
          <motion.div key="pick" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="flex flex-col min-h-[100dvh]">
            <SafeArea className="flex flex-col flex-1 pt-6 pb-10">

              {/* Header */}
              <div className="px-6 mb-8">
                <div className="flex items-center justify-between mb-5">
                  <button type="button" onClick={() => setLocation('/home')}
                    className="w-10 h-10 bg-card border border-border rounded-full flex items-center justify-center shadow-[var(--shadow-card)] active:scale-95">
                    <X size={17} className="text-foreground" />
                  </button>
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Brain size={15} className="text-primary" />
                  </div>
                </div>

                <h1 className="text-[28px] font-black text-foreground tracking-tight leading-tight mb-2">
                  Сообщить BarDoctor
                </h1>
                <p className="text-[14px] text-muted-foreground leading-relaxed">
                  Опишите ситуацию любым способом — AI определит категорию, приоритет и зафиксирует всё сам.
                </p>
              </div>

              {/* 2×2 grid */}
              <div className="px-6 grid grid-cols-2 gap-3 flex-1">
                {INPUT_METHODS.map(({ id, Icon, label, desc, color, bg, iconColor }, i) => (
                  <motion.button key={id} type="button"
                    onClick={() => { setMethod(id); setPhase('input'); }}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.06, duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                    whileTap={{ scale: 0.96 }}
                    className="bd-card flex flex-col items-start p-5 gap-3 hover:shadow-[var(--shadow-elevated)] transition-all min-h-[130px]"
                  >
                    <div className="w-12 h-12 rounded-[16px] flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: bg }}>
                      <Icon size={22} style={{ color: iconColor }} />
                    </div>
                    <div>
                      <p className="text-[16px] font-black text-foreground tracking-tight">{label}</p>
                      <p className="text-[12px] text-muted-foreground mt-0.5 leading-snug">{desc}</p>
                    </div>
                  </motion.button>
                ))}
              </div>
            </SafeArea>
          </motion.div>
        )}

        {/* ── Input screens ── */}
        {phase === 'input' && method === 'voice' && (
          <VoiceInput key="voice"
            onSubmit={(text) => handleInitialSubmit(text)}
            onBack={() => { setMethod(null); setPhase('pick'); }}
          />
        )}
        {phase === 'input' && method === 'text' && (
          <TextInput key="text"
            onSubmit={(text) => handleInitialSubmit(text)}
            onBack={() => { setMethod(null); setPhase('pick'); }}
          />
        )}
        {phase === 'input' && method === 'photo' && (
          <PhotoInput key="photo"
            onSubmit={(text, b64, mt) => handleInitialSubmit(text, b64, mt)}
            onBack={() => { setMethod(null); setPhase('pick'); }}
          />
        )}
        {phase === 'input' && method === 'document' && (
          <DocumentInput key="document"
            onSubmit={(text, b64, mt) => handleInitialSubmit(text, b64, mt)}
            onBack={() => { setMethod(null); setPhase('pick'); }}
          />
        )}

        {/* ── Processing ── */}
        {phase === 'processing' && <ProcessingScreen key="processing" />}

        {/* ── Conversation (follow-up or error) ── */}
        {phase === 'conversation' && (
          <motion.div key="conversation" {...slideRight} className="flex flex-col min-h-[100dvh]">
            <SafeArea className="flex flex-col flex-1 pt-5 pb-4">

              {/* Top bar */}
              <div className="flex items-center gap-3 px-6 mb-4">
                <button type="button" onClick={() => { setMethod(null); setPhase('pick'); setMessages([]); }}
                  className="w-9 h-9 rounded-full bg-card border border-border flex items-center justify-center active:scale-95 flex-shrink-0">
                  <ChevronLeft size={18} />
                </button>
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                    <Brain size={13} className="text-primary" />
                  </div>
                  <p className="text-[15px] font-black text-foreground">BarDoctor</p>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-6 py-2">
                {messages.map((m, i) => <ChatBubble key={i} role={m.role} content={m.content} />)}

                {error && (
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                    className="flex items-start gap-2.5 mb-4">
                    <div className="w-8 h-8 rounded-full bg-destructive/10 flex items-center justify-center mr-0.5 flex-shrink-0">
                      <AlertCircle size={14} className="text-destructive" />
                    </div>
                    <div className="bg-destructive/8 border border-destructive/20 rounded-[20px] rounded-bl-[6px] px-4 py-3 max-w-[82%]">
                      <p className="text-[13px] text-destructive font-medium">Не удалось получить ответ. Проверьте соединение.</p>
                      <button type="button" onClick={() => {
                        const lastUser = [...messages].reverse().find((m) => m.role === 'user');
                        if (lastUser) { setMessages((prev) => prev.slice(0, -1 * (messages.length - messages.indexOf(lastUser) - 1))); callAPI({ text: lastUser.content }); }
                      }} className="flex items-center gap-1 mt-2 text-[12px] font-semibold text-destructive">
                        <RefreshCw size={11} /> Попробовать снова
                      </button>
                    </div>
                  </motion.div>
                )}

                <div ref={chatEndRef} />
              </div>

              {/* Answer input */}
              {questions.length > 0 && !error && (
                <div className="px-6 pt-3 border-t border-border/60">
                  <div className="flex gap-2.5 items-end">
                    <textarea
                      value={answer}
                      onChange={(e) => setAnswer(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAnswerSubmit(); } }}
                      placeholder="Ваш ответ…"
                      rows={2}
                      className="flex-1 bg-card border border-border rounded-2xl text-[15px] font-medium text-foreground px-4 py-3 placeholder:text-muted-foreground/40 placeholder:font-normal focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/12 transition-all resize-none leading-relaxed"
                    />
                    <button type="button" onClick={handleAnswerSubmit} disabled={!answer.trim()}
                      className={cn('w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 transition-all active:scale-95',
                        answer.trim() ? 'bg-primary text-white' : 'bg-muted text-muted-foreground cursor-not-allowed')}>
                      <Send size={18} />
                    </button>
                  </div>
                </div>
              )}
            </SafeArea>
          </motion.div>
        )}

        {/* ── Confirm ── */}
        {phase === 'confirm' && extracted && (
          <motion.div key="confirm" {...slideRight} className="flex flex-col min-h-[100dvh]">
            <SafeArea className="flex flex-col flex-1 pt-5 pb-8">

              {/* Top bar */}
              <div className="flex items-center gap-3 px-6 mb-4">
                <button type="button" onClick={() => setPhase('conversation')}
                  className="w-9 h-9 rounded-full bg-card border border-border flex items-center justify-center active:scale-95 flex-shrink-0">
                  <ChevronLeft size={18} />
                </button>
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                    <Brain size={13} className="text-primary" />
                  </div>
                  <p className="text-[15px] font-black text-foreground">BarDoctor</p>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-6 py-2">
                {/* Last AI message */}
                {messages.length > 0 && (
                  <ChatBubble role="ai" content={messages[messages.length - 1].content} />
                )}

                {/* Extraction card */}
                <div className="mt-2 mb-4">
                  <ExtractionCard outputType={outputType} extracted={extracted} />
                </div>

                <div ref={chatEndRef} />
              </div>

              {/* Confirm buttons */}
              <div className="px-6 flex flex-col gap-2.5">
                <button type="button" onClick={handleConfirm}
                  className="w-full h-14 rounded-2xl text-[16px] font-bold text-white flex items-center justify-center gap-2 shadow-[0_4px_20px_rgba(91,92,235,0.30)] hover:opacity-90 active:scale-[0.98] transition-all"
                  style={{ background: 'linear-gradient(135deg, #5B5CEB 0%, #4A4BC9 100%)' }}>
                  <Check size={18} />
                  Подтвердить
                </button>
                <button type="button" onClick={() => { setQuestions([]); setPhase('input'); }}
                  className="w-full h-12 rounded-2xl text-[14px] font-semibold text-muted-foreground bg-muted hover:bg-border transition-all active:scale-[0.98]">
                  Изменить ввод
                </button>
              </div>
            </SafeArea>
          </motion.div>
        )}

        {/* ── Done ── */}
        {phase === 'done' && extracted && (
          <motion.div key="done"
            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col items-center justify-center flex-1 px-8 text-center py-16 min-h-[100dvh]"
          >
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
              transition={{ delay: 0.06, type: 'spring', stiffness: 280, damping: 20 }}
              className="w-20 h-20 rounded-full bg-[#22C55E]/12 flex items-center justify-center mb-6">
              <Check size={36} strokeWidth={2.5} className="text-[#16A34A]" />
            </motion.div>
            <motion.p initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }}
              className="text-[12px] font-black uppercase tracking-widest text-[#16A34A] mb-2">
              Зафиксировано
            </motion.p>
            <motion.h2 initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22 }}
              className="text-[22px] font-black text-foreground tracking-tight mb-2">
              {outputType === 'event' ? 'Событие добавлено' : 'Дело открыто'}
            </motion.h2>
            <motion.p initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28 }}
              className="text-[14px] text-muted-foreground max-w-[240px] leading-relaxed">
              {extracted.title}
            </motion.p>
          </motion.div>
        )}

      </AnimatePresence>
    </AppShell>
  );
}
