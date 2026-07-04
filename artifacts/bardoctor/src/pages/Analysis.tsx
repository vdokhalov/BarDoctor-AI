import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Sparkles, Mic, Send, Clock, ChevronRight,
  AlertCircle, Info, Activity, Lightbulb, ArrowRight,
  MicOff, X,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import AppShell from '@/components/layout/AppShell';
import { cn } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

interface UserMessage {
  type: 'user';
  id: string;
  text: string;
}

interface AIMessage {
  type: 'ai';
  id: string;
  problem: string;
  reason: string;
  confidence: number; // 0-100
  recommendation: string;
  nextStep: string;
}

type ChatMessage = UserMessage | AIMessage;

// ─── Mock AI logic ────────────────────────────────────────────────────────────

// Returns an honest "no data connected" response — never invents restaurant data.
function generateResponse(_query: string): AIMessage {
  return {
    type: 'ai',
    id: uid(),
    problem: 'Нет подключённых данных для анализа',
    reason: 'BarDoctor AI анализирует реальные операционные данные вашего заведения — задачи, оборудование, инциденты и историю работы. На данный момент данные ещё не добавлены.',
    confidence: -1, // special: means "no data", not a real confidence value
    recommendation: 'Добавьте оборудование, создайте первые задачи и зафиксируйте инциденты. Чем больше реальных данных в системе — тем точнее анализ.',
    nextStep: 'Перейдите в раздел «Оборудование» или «Задачи», чтобы начать наполнение.',
  };
}

function uid() {
  return Math.random().toString(36).slice(2);
}

// ─── Static data ──────────────────────────────────────────────────────────────

const SUGGESTED = [
  'Почему упала выручка в пятницу?',
  'Как снизить food cost?',
  'Какие позиции меню самые прибыльные?',
  'Почему гости не возвращаются?',
  'Когда проводить инвентаризацию?',
];

const RECENT_INITIAL: string[] = [];

// ─── Sub-components ───────────────────────────────────────────────────────────

function TypingIndicator() {
  return (
    <div className="flex items-end gap-3 px-6">
      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
        <Sparkles size={14} className="text-primary" />
      </div>
      <div className="bd-card px-4 py-3 flex items-center gap-1.5">
        {[0, 0.18, 0.36].map((delay, i) => (
          <motion.span
            key={i}
            className="w-2 h-2 rounded-full bg-muted-foreground/50"
            animate={{ y: [0, -5, 0] }}
            transition={{ repeat: Infinity, duration: 0.7, delay, ease: 'easeInOut' }}
          />
        ))}
      </div>
    </div>
  );
}

function UserBubble({ text }: { text: string }) {
  return (
    <div className="flex justify-end px-6">
      <div className="max-w-[78%] bg-primary text-primary-foreground px-4 py-3 rounded-[18px] rounded-tr-[6px] text-[15px] leading-snug font-medium shadow-[var(--shadow-card)]">
        {text}
      </div>
    </div>
  );
}

function AICard({ msg }: { msg: AIMessage }) {
  const hasData = msg.confidence >= 0;
  const pct = hasData ? msg.confidence : 0;
  const confColor =
    pct >= 80 ? '#16A34A' : pct >= 60 ? '#B45309' : '#DC2626';
  const confBg =
    pct >= 80 ? '#22C55E' : pct >= 60 ? '#F59E0B' : '#EF4444';
  const confLabel =
    pct >= 80 ? 'Высокая' : pct >= 60 ? 'Средняя' : 'Низкая';

  const sections = [
    {
      icon: AlertCircle,
      iconColor: 'text-destructive',
      iconBg: 'bg-destructive/10',
      label: 'Проблема',
      text: msg.problem,
    },
    {
      icon: Info,
      iconColor: 'text-[#1D4ED8]',
      iconBg: 'bg-[#3B82F6]/10',
      label: 'Причина',
      text: msg.reason,
    },
    {
      icon: Lightbulb,
      iconColor: 'text-primary',
      iconBg: 'bg-primary/10',
      label: 'Рекомендация',
      text: msg.recommendation,
    },
    {
      icon: ArrowRight,
      iconColor: 'text-foreground',
      iconBg: 'bg-muted',
      label: 'Следующий шаг',
      text: msg.nextStep,
    },
  ];

  return (
    <div className="px-6">
      <div className="flex items-center gap-2 mb-2 pl-1">
        <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
          <Sparkles size={13} className="text-primary" />
        </div>
        <span className="text-[13px] font-semibold text-muted-foreground">BarDoctor</span>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="bd-card overflow-hidden"
      >
        {/* Sections */}
        {sections.map((sec, idx) => {
          const Icon = sec.icon;
          return (
            <div
              key={sec.label}
              className={cn('px-4 py-3.5', idx < sections.length - 1 && 'border-b border-border')}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <div className={cn('w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0', sec.iconBg)}>
                  <Icon size={11} className={sec.iconColor} />
                </div>
                <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                  {sec.label}
                </span>
              </div>
              <p className="text-[14px] text-foreground leading-snug pl-7">{sec.text}</p>
            </div>
          );
        })}

        {/* Confidence bar — only shown when real data is present */}
        {hasData && (
          <div className="px-4 py-3.5 border-t border-border bg-muted/30">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center">
                  <Activity size={11} className="text-muted-foreground" />
                </div>
                <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                  Уверенность
                </span>
              </div>
              <span className="text-[13px] font-bold" style={{ color: confColor }}>
                {confLabel} · {pct}%
              </span>
            </div>
            <div className="h-1.5 bg-border rounded-full overflow-hidden ml-7">
              <motion.div
                className="h-full rounded-full"
                style={{ backgroundColor: confBg }}
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.7, delay: 0.2, ease: 'easeOut' }}
              />
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({
  recent,
  onSelect,
}: {
  recent: string[];
  onSelect: (q: string) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="flex flex-col px-6 pt-4 pb-4"
    >
      {/* Hero */}
      <div className="flex flex-col items-center text-center py-8">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4 shadow-[0_0_0_8px_rgba(91,92,235,0.06)]">
          <Sparkles size={28} className="text-primary" />
        </div>
        <h2 className="text-[20px] font-bold text-foreground tracking-tight mb-1.5">
          BarDoctor AI
        </h2>
        <p className="text-[14px] text-muted-foreground leading-relaxed max-w-[260px]">
          Задайте любой вопрос о вашем ресторане — получите структурированный анализ
        </p>
      </div>

      {/* Suggested */}
      <div className="mb-6">
        <p className="text-[12px] font-bold uppercase tracking-widest text-muted-foreground mb-3">
          Предложения
        </p>
        <div className="flex flex-wrap gap-2">
          {SUGGESTED.map((q) => (
            <button
              key={q}
              onClick={() => onSelect(q)}
              className="px-3.5 py-2 bg-card border border-border rounded-full text-[13px] font-medium text-foreground hover:border-primary hover:text-primary transition-colors active:scale-[0.97]"
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      {/* Recent */}
      {recent.length > 0 && (
        <div>
          <p className="text-[12px] font-bold uppercase tracking-widest text-muted-foreground mb-3">
            Недавние вопросы
          </p>
          <div className="bd-card overflow-hidden">
            {recent.map((q, idx) => (
              <button
                key={q}
                onClick={() => onSelect(q)}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-muted/50 transition-colors active:bg-muted',
                  idx < recent.length - 1 && 'border-b border-border',
                )}
              >
                <Clock size={14} className="text-muted-foreground flex-shrink-0" />
                <span className="flex-1 text-[14px] text-foreground truncate">{q}</span>
                <ChevronRight size={14} className="text-muted-foreground flex-shrink-0" />
              </button>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function Analysis() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recent, setRecent] = useState<string[]>(RECENT_INITIAL);
  const endRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom when new message arrives
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
  }, [query]);

  const submit = useCallback(
    (text: string) => {
      const q = text.trim();
      if (!q || loading) return;

      // Add user message
      const userMsg: UserMessage = { type: 'user', id: uid(), text: q };
      setMessages((prev) => [...prev, userMsg]);
      setQuery('');
      setLoading(true);

      // Add to recent
      setRecent((prev) => [q, ...prev.filter((r) => r !== q)].slice(0, 5));

      // Simulate AI response after delay
      setTimeout(() => {
        const aiMsg = generateResponse(q);
        setMessages((prev) => [...prev, aiMsg]);
        setLoading(false);
      }, 1600 + Math.random() * 600);
    },
    [loading],
  );

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit(query);
    }
  };

  const clearChat = () => {
    setMessages([]);
    setQuery('');
    setLoading(false);
  };

  const isEmpty = messages.length === 0 && !loading;

  return (
    <AppShell showBottomNav className="pb-[168px]">
      {/* Sticky header */}
      <div className="sticky top-0 z-30 bg-background/90 backdrop-blur-md border-b border-border px-6 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
            <Sparkles size={13} className="text-primary" />
          </div>
          <span className="text-[16px] font-bold text-foreground tracking-tight">BarDoctor AI</span>
        </div>
        {!isEmpty && (
          <button
            onClick={clearChat}
            className="flex items-center gap-1.5 text-[13px] font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <X size={14} />
            Очистить
          </button>
        )}
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        {isEmpty ? (
          <EmptyState key="empty" recent={recent} onSelect={submit} />
        ) : (
          <motion.div
            key="chat"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col gap-5 py-5"
          >
            {messages.map((msg) =>
              msg.type === 'user' ? (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                >
                  <UserBubble text={msg.text} />
                </motion.div>
              ) : (
                <AICard key={msg.id} msg={msg} />
              ),
            )}
            {loading && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.28 }}
              >
                <TypingIndicator />
              </motion.div>
            )}
            <div ref={endRef} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Fixed input bar ── */}
      <div className="fixed bottom-[80px] left-0 right-0 z-40 flex justify-center pointer-events-none">
        <div
          className="pointer-events-auto w-full max-w-[430px] px-4 pb-3 pt-2 bg-background/95 backdrop-blur-md border-t border-border"
        >
          <div className="bd-card p-0 overflow-hidden flex items-end gap-0">
            {/* Textarea */}
            <textarea
              ref={textareaRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Спросите что угодно о ресторане…"
              rows={1}
              className="flex-1 resize-none bg-transparent text-[15px] text-foreground placeholder:text-muted-foreground outline-none px-4 py-3.5 leading-snug max-h-[120px] overflow-y-auto"
              style={{ minHeight: 52 }}
            />

            {/* Voice button */}
            <button
              type="button"
              onClick={() => setRecording((r) => !r)}
              className={cn(
                'flex-shrink-0 w-10 h-10 m-1.5 rounded-[12px] flex items-center justify-center transition-all',
                recording
                  ? 'bg-destructive text-white shadow-[0_0_0_4px_rgba(239,68,68,0.2)]'
                  : 'bg-muted text-muted-foreground hover:bg-border',
              )}
            >
              {recording ? <MicOff size={16} /> : <Mic size={16} />}
            </button>

            {/* Send button */}
            <button
              type="button"
              onClick={() => submit(query)}
              disabled={!query.trim() || loading}
              className={cn(
                'flex-shrink-0 w-10 h-10 m-1.5 rounded-[12px] flex items-center justify-center transition-all',
                query.trim() && !loading
                  ? 'bg-primary text-primary-foreground shadow-[var(--shadow-fab)] hover:opacity-90 active:scale-95'
                  : 'bg-muted text-muted-foreground opacity-40',
              )}
            >
              <Send size={16} />
            </button>
          </div>

          {/* Mic recording indicator */}
          <AnimatePresence>
            {recording && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="flex items-center gap-2 pt-2 pl-1 overflow-hidden"
              >
                <motion.span
                  className="w-2 h-2 rounded-full bg-destructive"
                  animate={{ opacity: [1, 0.3, 1] }}
                  transition={{ repeat: Infinity, duration: 1 }}
                />
                <span className="text-[12px] text-muted-foreground font-medium">
                  Запись голоса… нажмите ещё раз чтобы остановить
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </AppShell>
  );
}
