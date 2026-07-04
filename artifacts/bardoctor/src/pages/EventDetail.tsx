import React, { useState, useMemo } from 'react';
import { useRoute, useLocation } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft, Camera, X, Trash2, Edit3,
  User, CalendarDays, Flag, Tag, Brain, RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEvents } from '@/contexts/EventsContext';
import { useToast } from '@/components/ds/Toast';
import {
  RestaurantEvent, EventStatus, Priority, AIAssessment,
} from '@/store/events';
import {
  CATEGORY_CONFIG, PRIORITY_CONFIG, STATUS_CONFIG,
  STATUSES, PRIORITIES,
} from '@/config/eventCategories';
import AppShell from '@/components/layout/AppShell';
import SafeArea from '@/components/layout/SafeArea';
import PriorityModal from '@/components/ai/PriorityModal';

// ─── Date helpers ─────────────────────────────────────────────────────────────

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
}
function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
}
function fmtDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }) + ' · ' +
    d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
}

// ─── Photo grid ───────────────────────────────────────────────────────────────

function PhotoGrid({ photos }: { photos: string[] }) {
  if (photos.length === 0) return null;
  return (
    <div className="grid grid-cols-3 gap-2">
      {photos.map((src, i) => (
        <div key={i} className="aspect-square rounded-2xl overflow-hidden border border-border">
          <img src={src} alt="" className="w-full h-full object-cover" />
        </div>
      ))}
    </div>
  );
}

// ─── Edit sheet ───────────────────────────────────────────────────────────────

function EditSheet({
  ev, onClose, onSave,
}: {
  ev: RestaurantEvent;
  onClose: () => void;
  onSave: (patch: Partial<RestaurantEvent>) => void;
}) {
  const [title,       setTitle]       = useState(ev.title);
  const [description, setDescription] = useState(ev.description);
  const [responsible, setResponsible] = useState(ev.responsible);
  const [status,      setStatus]      = useState<EventStatus>(ev.status);
  const [priority,    setPriority]    = useState<Priority>(ev.priority);

  return (
    <>
      <motion.div key="edit-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 bg-foreground/40 backdrop-blur-[2px] z-40" onClick={onClose} />
      <motion.div key="edit-sheet"
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ duration: 0.36, ease: [0.22, 1, 0.36, 1] }}
        className="fixed inset-x-0 bottom-0 z-50 bg-white rounded-t-[28px] shadow-[0_-8px_40px_rgba(0,0,0,0.14)] flex flex-col max-h-[90dvh]"
        style={{ maxWidth: 430, margin: '0 auto' }}>
        <div className="flex-shrink-0 flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 rounded-full bg-border" />
        </div>
        <div className="flex-shrink-0 flex items-center justify-between px-6 pb-4">
          <h2 className="text-[20px] font-black text-foreground tracking-tight">Редактировать</h2>
          <button type="button" onClick={onClose} className="w-9 h-9 rounded-full bg-muted flex items-center justify-center">
            <X size={16} className="text-foreground" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 pb-4 flex flex-col gap-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Заголовок *</p>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus
              className="w-full h-[48px] bg-[#F8F9FC] border border-border rounded-2xl text-[15px] font-medium text-foreground px-4 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/12 transition-all"
            />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Описание</p>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3}
              className="w-full bg-[#F8F9FC] border border-border rounded-2xl text-[15px] font-medium text-foreground px-4 py-3 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/12 transition-all resize-none leading-relaxed"
            />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Статус</p>
            <div className="flex flex-wrap gap-2">
              {STATUSES.map((s) => (
                <button key={s} type="button" onClick={() => setStatus(s)}
                  className={cn('px-3.5 py-2 rounded-full text-[13px] font-medium border transition-all',
                    status === s ? 'bg-primary text-white border-primary' : 'bg-card border-border text-foreground')}>
                  {STATUS_CONFIG[s].label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Приоритет</p>
            <div className="flex flex-wrap gap-2">
              {PRIORITIES.map((p) => (
                <button key={p} type="button" onClick={() => setPriority(p)}
                  className={cn('px-3.5 py-2 rounded-full text-[13px] font-medium border transition-all',
                    priority === p ? 'bg-primary text-white border-primary' : 'bg-card border-border text-foreground')}>
                  {PRIORITY_CONFIG[p].label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Ответственный</p>
            <input type="text" value={responsible} onChange={(e) => setResponsible(e.target.value)}
              placeholder="Имя или должность"
              className="w-full h-[48px] bg-[#F8F9FC] border border-border rounded-2xl text-[15px] font-medium text-foreground px-4 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/12 transition-all"
            />
          </div>
        </div>
        <div className="flex-shrink-0 px-6 pb-8 pt-3 border-t border-border">
          <button type="button" disabled={!title.trim()}
            onClick={() => onSave({ title: title.trim(), description, responsible, status, priority })}
            className={cn('w-full h-14 rounded-2xl text-[16px] font-bold transition-all',
              title.trim() ? 'bg-primary text-white shadow-[0_4px_20px_rgba(91,92,235,0.28)] hover:opacity-90 active:scale-[0.98]' : 'bg-muted text-muted-foreground cursor-not-allowed')}>
            Сохранить
          </button>
        </div>
      </motion.div>
    </>
  );
}

// ─── Main detail page ─────────────────────────────────────────────────────────

export default function EventDetail() {
  const [, params]      = useRoute('/events/:id');
  const [, setLocation] = useLocation();
  const { events, updateEvent, deleteEvent } = useEvents();
  const { toast } = useToast();

  const eventId   = params?.id ?? '';
  const eventData = useMemo(() => events.find((e) => e.id === eventId), [events, eventId]);

  const [deleteStep,     setDeleteStep]     = useState(0);
  const [editOpen,       setEditOpen]       = useState(false);
  const [showReanalyze,  setShowReanalyze]  = useState(false);
  const deleteTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    if (deleteStep !== 1) return;
    deleteTimerRef.current = setTimeout(() => setDeleteStep(0), 3000);
    return () => { if (deleteTimerRef.current) clearTimeout(deleteTimerRef.current); };
  }, [deleteStep]);

  React.useEffect(() => () => { if (deleteTimerRef.current) clearTimeout(deleteTimerRef.current); }, []);

  if (!eventData) {
    return (
      <AppShell>
        <SafeArea className="flex flex-col items-center justify-center min-h-[100dvh] px-8 text-center">
          <div className="w-16 h-16 rounded-[20px] bg-muted flex items-center justify-center mb-5">
            <X size={28} className="text-muted-foreground/40" />
          </div>
          <h2 className="text-[20px] font-bold text-foreground mb-2">Событие не найдено</h2>
          <p className="text-[14px] text-muted-foreground mb-6">Возможно, оно было удалено или ссылка устарела.</p>
          <button type="button" onClick={() => setLocation('/events')}
            className="px-6 py-3 bg-primary text-white rounded-2xl text-[14px] font-semibold">
            Вернуться к событиям
          </button>
        </SafeArea>
      </AppShell>
    );
  }

  const ev       = eventData;
  const catCfg   = CATEGORY_CONFIG[ev.category];
  const priCfg   = PRIORITY_CONFIG[ev.priority];
  const stsCfg   = STATUS_CONFIG[ev.status];
  const CatIcon  = catCfg.icon;

  function handleDelete() {
    if (deleteStep === 0) { setDeleteStep(1); return; }
    const title = ev.title;
    deleteEvent(ev.id);
    setLocation('/events');
    toast({ variant: 'success', title: 'Событие удалено', description: title });
  }

  function handleSaveEdit(patch: Partial<RestaurantEvent>) {
    updateEvent(ev.id, patch);
    setEditOpen(false);
    toast({ variant: 'success', title: 'Изменения сохранены' });
  }

  function handleReanalyzed(priority: Priority, assessment: AIAssessment) {
    updateEvent(ev.id, { priority, aiAssessment: assessment });
    setShowReanalyze(false);
    toast({ variant: 'success', title: 'Приоритет обновлён', description: `Новый приоритет: ${PRIORITY_CONFIG[priority].label}` });
  }

  return (
    <AppShell>
      <div className="flex flex-col min-h-[100dvh] bg-[#F8F9FC]">
        <SafeArea className="pt-0 pb-0 flex flex-col flex-1">

          {/* ── Sticky header ── */}
          <div className="sticky top-0 z-20 bg-[#F8F9FC]/95 backdrop-blur-md pt-5 pb-3 px-6 border-b border-border/60">
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => setLocation('/events')}
                className="w-9 h-9 rounded-full bg-card border border-border flex items-center justify-center shadow-[var(--shadow-card)] active:scale-95 flex-shrink-0">
                <ChevronLeft size={18} className="text-foreground" />
              </button>
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <div className={cn('w-7 h-7 rounded-[9px] flex items-center justify-center flex-shrink-0', catCfg.iconBg)}>
                  <CatIcon size={13} className={catCfg.iconColor} />
                </div>
                <h1 className="text-[16px] font-bold text-foreground truncate flex-1">{ev.title}</h1>
              </div>
              <button type="button" onClick={() => setEditOpen(true)}
                className="w-9 h-9 rounded-full bg-card border border-border flex items-center justify-center shadow-[var(--shadow-card)] active:scale-95 flex-shrink-0">
                <Edit3 size={14} className="text-foreground" />
              </button>
            </div>
          </div>

          {/* ── Scrollable content ── */}
          <div className="flex-1 overflow-y-auto">
            <div className="px-6 pt-5 pb-16 flex flex-col gap-6">

              {/* Status */}
              <div className="bd-card px-5 py-4">
                <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-3">Статус</p>
                <div className="flex gap-2 flex-wrap">
                  {STATUSES.map((s) => {
                    const cfg = STATUS_CONFIG[s];
                    const active = ev.status === s;
                    return (
                      <button key={s} type="button" onClick={() => updateEvent(ev.id, { status: s })}
                        className={cn(
                          'flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[13px] font-semibold border transition-all active:scale-[0.97]',
                          active ? `${cfg.color} ${cfg.bg} border-transparent shadow-[inset_0_0_0_1.5px_currentColor]` : 'bg-card border-border text-foreground',
                        )}>
                        <span className={cn('w-1.5 h-1.5 rounded-full', active ? 'bg-current' : 'bg-border')} />
                        {cfg.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Info grid */}
              <div className="grid grid-cols-2 gap-3">
                {/* Priority */}
                <div className="bd-card px-4 py-3.5 flex flex-col gap-1">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <Flag size={12} className="text-muted-foreground" />
                    <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Приоритет</p>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-0.5">
                    {PRIORITIES.map((p) => (
                      <button key={p} type="button" onClick={() => updateEvent(ev.id, { priority: p })}
                        className={cn(
                          'text-[11px] font-semibold px-2 py-0.5 rounded-full transition-all active:scale-[0.97]',
                          ev.priority === p
                            ? `${PRIORITY_CONFIG[p].color} ${PRIORITY_CONFIG[p].bg}`
                            : 'text-muted-foreground/60 hover:text-foreground',
                        )}>
                        {PRIORITY_CONFIG[p].label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Category */}
                <div className="bd-card px-4 py-3.5">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Tag size={12} className="text-muted-foreground" />
                    <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Категория</p>
                  </div>
                  <div className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12px] font-semibold', catCfg.iconBg)}>
                    <CatIcon size={11} className={catCfg.iconColor} />
                    <span className={catCfg.iconColor}>{catCfg.label}</span>
                  </div>
                </div>

                {/* Date */}
                <div className="bd-card px-4 py-3.5">
                  <div className="flex items-center gap-1.5 mb-2">
                    <CalendarDays size={12} className="text-muted-foreground" />
                    <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Дата</p>
                  </div>
                  <p className="text-[13px] font-bold text-foreground">
                    {new Date(ev.eventDate).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}
                    {' · '}
                    {new Date(ev.eventDate).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>

                {/* Responsible */}
                <div className="bd-card px-4 py-3.5">
                  <div className="flex items-center gap-1.5 mb-2">
                    <User size={12} className="text-muted-foreground" />
                    <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Ответственный</p>
                  </div>
                  <p className={cn('text-[13px] font-bold', ev.responsible ? 'text-foreground' : 'text-muted-foreground/50')}>
                    {ev.responsible || 'Не назначен'}
                  </p>
                </div>
              </div>

              {/* Extra field */}
              {ev.extraField && (
                <div className="bd-card px-5 py-4">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-2.5">
                    {catCfg.extraLabel}
                  </p>
                  <p className="text-[14px] text-foreground font-medium">{ev.extraField}</p>
                </div>
              )}

              {/* Description */}
              {ev.description && (
                <div className="bd-card px-5 py-4">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-2.5">Описание</p>
                  <p className="text-[14px] text-foreground leading-relaxed">{ev.description}</p>
                </div>
              )}

              {/* AI re-analyze button */}
              <button
                type="button"
                onClick={() => setShowReanalyze(true)}
                className="w-full flex items-center justify-center gap-2 h-12 rounded-2xl border border-primary/30 bg-primary/6 text-primary text-[14px] font-semibold transition-all hover:bg-primary/10 active:scale-[0.98]"
              >
                <Brain size={15} />
                {ev.aiAssessment ? 'Переоценить приоритет AI' : 'Оценить приоритет AI'}
              </button>

              {/* AI assessment card */}
              {ev.aiAssessment && (
                <div className="bd-card px-5 py-4 border-primary/20">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Brain size={12} className="text-primary" />
                    </div>
                    <p className="text-[11px] font-bold uppercase tracking-widest text-primary">AI-оценка</p>
                    <span className="ml-auto text-[10px] text-muted-foreground/60">
                      {fmtDateTime(ev.aiAssessment.analyzedAt)}
                    </span>
                  </div>
                  <p className="text-[14px] text-foreground leading-relaxed mb-3">{ev.aiAssessment.explanation}</p>
                  {ev.aiAssessment.recommendedDeadline && (
                    <p className="text-[12px] text-muted-foreground font-medium">
                      Срок: {ev.aiAssessment.recommendedDeadline}
                    </p>
                  )}
                </div>
              )}

              {/* Photos */}
              {ev.photos.length > 0 && (
                <div className="bd-card px-5 py-4">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-3.5">
                    Фото ({ev.photos.length})
                  </p>
                  <PhotoGrid photos={ev.photos} />
                </div>
              )}

              {/* Created date */}
              <p className="text-[12px] text-muted-foreground text-center px-4">
                Создано {fmtDate(ev.createdAt)} в {fmtTime(ev.createdAt)}
              </p>

              {/* Delete */}
              <button type="button" onClick={handleDelete}
                className={cn(
                  'w-full h-12 rounded-2xl text-[14px] font-semibold transition-all flex items-center justify-center gap-2',
                  deleteStep === 1
                    ? 'bg-destructive/10 text-destructive border border-destructive/30'
                    : 'text-muted-foreground hover:text-destructive hover:bg-destructive/6',
                )}
              >
                <Trash2 size={15} />
                {deleteStep === 1 ? 'Нажмите ещё раз для подтверждения' : 'Удалить событие'}
              </button>

            </div>
          </div>

        </SafeArea>
      </div>

      {/* Edit sheet */}
      <AnimatePresence>
        {editOpen && (
          <EditSheet key="edit" ev={ev} onClose={() => setEditOpen(false)} onSave={handleSaveEdit} />
        )}
      </AnimatePresence>

      {/* AI re-analyze modal */}
      <AnimatePresence>
        {showReanalyze && (
          <div key="reanalyze" className="fixed inset-0 z-50 bg-background">
            <PriorityModal
              itemType="event"
              category={ev.category}
              title={ev.title}
              description={ev.description}
              extraField={ev.extraField}
              onConfirm={handleReanalyzed}
              onSkip={() => setShowReanalyze(false)}
            />
          </div>
        )}
      </AnimatePresence>
    </AppShell>
  );
}
