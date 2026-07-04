import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { useRoute, useLocation } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft, Plus, Camera, MessageSquare, Clock, CheckCircle2,
  RefreshCw, AlertTriangle, Paperclip, X, Trash2, Edit3,
  User, CalendarDays, Flag, Tag, Send,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCases } from '@/contexts/CasesContext';
import { useToast } from '@/components/ds/Toast';
import {
  Case, CaseStatus, CasePriority, TimelineType,
  caseNid, isOverdue, formatDue,
} from '@/store/cases';
import {
  CASE_TYPE_CONFIG, CASE_PRIORITY_CONFIG, CASE_STATUS_CONFIG,
  CASE_STATUSES, CASE_PRIORITIES,
} from '@/config/caseCategories';
import AppShell from '@/components/layout/AppShell';
import SafeArea from '@/components/layout/SafeArea';

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
function relativeTime(iso: string): string {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return 'только что';
  if (m < 60) return `${m} мин. назад`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} ч. назад`;
  const days = Math.floor(h / 24);
  if (days < 7) return `${days} д. назад`;
  return fmtDateTime(iso);
}

// ─── Timeline icon ────────────────────────────────────────────────────────────

const TIMELINE_ICON: Record<TimelineType, { icon: React.ElementType; color: string; bg: string }> = {
  created:          { icon: Plus,           color: 'text-[#16A34A]', bg: 'bg-[#22C55E]/12' },
  status_changed:   { icon: RefreshCw,      color: 'text-[#0369A1]', bg: 'bg-[#0EA5E9]/12' },
  priority_changed: { icon: AlertTriangle,  color: 'text-[#B45309]', bg: 'bg-[#F59E0B]/12' },
  comment_added:    { icon: MessageSquare,  color: 'text-[#7C3AED]', bg: 'bg-[#8B5CF6]/12' },
  photo_added:      { icon: Camera,         color: 'text-primary',   bg: 'bg-primary/12' },
  file_added:       { icon: Paperclip,      color: 'text-[#475569]', bg: 'bg-[#64748B]/12' },
  updated:          { icon: Edit3,          color: 'text-[#475569]', bg: 'bg-[#64748B]/12' },
};

// ─── Edit sheet ───────────────────────────────────────────────────────────────

function EditSheet({
  c, onClose, onSave,
}: {
  c: Case;
  onClose: () => void;
  onSave: (patch: Partial<Case>) => void;
}) {
  const [title,       setTitle]       = useState(c.title);
  const [description, setDescription] = useState(c.description);
  const [priority,    setPriority]    = useState<CasePriority>(c.priority);
  const [responsible, setResponsible] = useState(c.responsible);
  const [dueDate,     setDueDate]     = useState(c.dueDate);

  const priLabels = Object.fromEntries(CASE_PRIORITIES.map((p) => [p, CASE_PRIORITY_CONFIG[p].label])) as Record<string, string>;

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
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Приоритет</p>
            <div className="flex flex-wrap gap-2">
              {CASE_PRIORITIES.map((p) => (
                <button key={p} type="button" onClick={() => setPriority(p)}
                  className={cn('px-3.5 py-2 rounded-full text-[13px] font-medium border transition-all',
                    priority === p ? 'bg-primary text-white border-primary' : 'bg-card border-border text-foreground')}>
                  {priLabels[p]}
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
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Дедлайн</p>
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)}
              className="w-full h-[48px] bg-[#F8F9FC] border border-border rounded-2xl text-[15px] font-medium text-foreground px-4 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/12 transition-all appearance-none"
            />
          </div>
        </div>
        <div className="flex-shrink-0 px-6 pb-8 pt-3 border-t border-border">
          <button type="button" disabled={!title.trim()}
            onClick={() => onSave({ title: title.trim(), description, priority, responsible, dueDate })}
            className={cn('w-full h-14 rounded-2xl text-[16px] font-bold transition-all',
              title.trim() ? 'bg-primary text-white shadow-[0_4px_20px_rgba(91,92,235,0.28)] hover:opacity-90 active:scale-[0.98]' : 'bg-muted text-muted-foreground cursor-not-allowed')}>
            Сохранить
          </button>
        </div>
      </motion.div>
    </>
  );
}

// ─── Photo grid ───────────────────────────────────────────────────────────────

function PhotoGrid({ photos, onAdd }: { photos: string[]; onAdd: (dataUrl: string) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => onAdd(reader.result as string);
    reader.readAsDataURL(file);
    e.target.value = '';
  }

  if (photos.length === 0) {
    return (
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => fileRef.current?.click()}
          className="flex items-center gap-2 px-4 py-2.5 bg-muted rounded-2xl text-[13px] font-semibold text-foreground hover:bg-border transition-colors active:scale-[0.97]">
          <Camera size={14} className="text-muted-foreground" />
          Добавить фото
        </button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
      </div>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-3 gap-2 mb-3">
        {photos.map((src, i) => (
          <div key={i} className="aspect-square rounded-2xl overflow-hidden border border-border">
            <img src={src} alt="" className="w-full h-full object-cover" />
          </div>
        ))}
      </div>
      <button type="button" onClick={() => fileRef.current?.click()}
        className="flex items-center gap-2 px-4 py-2.5 bg-muted rounded-2xl text-[13px] font-semibold text-foreground hover:bg-border transition-colors active:scale-[0.97]">
        <Camera size={14} className="text-muted-foreground" />
        Добавить фото
      </button>
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
    </div>
  );
}

// ─── Main detail page ─────────────────────────────────────────────────────────

export default function CaseDetail() {
  const [, params]      = useRoute('/cases/:id');
  const [, setLocation] = useLocation();
  const { cases, changeStatus, changePriority, updateCase, deleteCase, addComment, addPhoto } = useCases();
  const { toast } = useToast();

  const caseId   = params?.id ?? '';
  const caseData = useMemo(() => cases.find((c) => c.id === caseId), [cases, caseId]);

  const [commentText, setCommentText] = useState('');
  const [deleteStep,  setDeleteStep]  = useState(0);
  const [editOpen,    setEditOpen]    = useState(false);
  const deleteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset delete confirm after 3s
  useEffect(() => {
    if (deleteStep !== 1) return;
    deleteTimerRef.current = setTimeout(() => setDeleteStep(0), 3000);
    return () => { if (deleteTimerRef.current) clearTimeout(deleteTimerRef.current); };
  }, [deleteStep]);

  // Cleanup on unmount
  useEffect(() => () => { if (deleteTimerRef.current) clearTimeout(deleteTimerRef.current); }, []);

  // Case not found
  if (!caseData) {
    return (
      <AppShell>
        <SafeArea className="flex flex-col items-center justify-center min-h-[100dvh] px-8 text-center">
          <div className="w-16 h-16 rounded-[20px] bg-muted flex items-center justify-center mb-5">
            <X size={28} className="text-muted-foreground/40" />
          </div>
          <h2 className="text-[20px] font-bold text-foreground mb-2">Дело не найдено</h2>
          <p className="text-[14px] text-muted-foreground mb-6">Возможно, оно было удалено или ссылка устарела.</p>
          <button type="button" onClick={() => setLocation('/cases')}
            className="px-6 py-3 bg-primary text-white rounded-2xl text-[14px] font-semibold">
            Вернуться к делам
          </button>
        </SafeArea>
      </AppShell>
    );
  }

  const c        = caseData;
  const typeCfg  = CASE_TYPE_CONFIG[c.type];
  const priCfg   = CASE_PRIORITY_CONFIG[c.priority];
  const stsCfg   = CASE_STATUS_CONFIG[c.status];
  const TypeIcon = typeCfg.icon;
  const overdue  = isOverdue(c.dueDate) && !['resolved', 'closed'].includes(c.status);

  const stsLabels = Object.fromEntries(CASE_STATUSES.map((s) => [s, CASE_STATUS_CONFIG[s].label])) as Record<string, string>;

  function handleSubmitComment() {
    if (!commentText.trim()) return;
    addComment(c.id, commentText.trim());
    setCommentText('');
  }

  function handleDelete() {
    if (deleteStep === 0) { setDeleteStep(1); return; }
    const title = c.title;
    deleteCase(c.id);
    setLocation('/cases');
    toast({ variant: 'success', title: 'Дело удалено', description: title });
  }

  function handleSaveEdit(patch: Partial<Case>) {
    updateCase(c.id, patch);
    setEditOpen(false);
    toast({ variant: 'success', title: 'Изменения сохранены' });
  }

  return (
    <AppShell>
      <div className="flex flex-col min-h-[100dvh] bg-[#F8F9FC]">
        <SafeArea className="pt-0 pb-0 flex flex-col flex-1">

          {/* ── Sticky header ── */}
          <div className="sticky top-0 z-20 bg-[#F8F9FC]/95 backdrop-blur-md pt-5 pb-3 px-6 border-b border-border/60">
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => setLocation('/cases')}
                className="w-9 h-9 rounded-full bg-card border border-border flex items-center justify-center shadow-[var(--shadow-card)] active:scale-95 flex-shrink-0">
                <ChevronLeft size={18} className="text-foreground" />
              </button>
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <div className={cn('w-7 h-7 rounded-[9px] flex items-center justify-center flex-shrink-0', typeCfg.iconBg)}>
                  <TypeIcon size={13} className={typeCfg.iconColor} />
                </div>
                <h1 className="text-[16px] font-bold text-foreground truncate flex-1">{c.title}</h1>
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

              {/* Status change */}
              <div className="bd-card px-5 py-4">
                <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-3">Статус</p>
                <div className="flex gap-2 flex-wrap">
                  {CASE_STATUSES.map((s) => {
                    const cfg = CASE_STATUS_CONFIG[s];
                    const active = c.status === s;
                    return (
                      <button key={s} type="button" onClick={() => changeStatus(c.id, s)}
                        className={cn(
                          'flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[13px] font-semibold border transition-all active:scale-[0.97]',
                          active ? `${cfg.color} ${cfg.bg} border-transparent shadow-[inset_0_0_0_1.5px_currentColor]` : 'bg-card border-border text-foreground',
                        )}
                      >
                        <span className={cn('w-1.5 h-1.5 rounded-full', active ? cfg.dot : 'bg-border')} />
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
                    {CASE_PRIORITIES.map((p) => (
                      <button key={p} type="button" onClick={() => changePriority(c.id, p)}
                        className={cn(
                          'text-[11px] font-semibold px-2 py-0.5 rounded-full transition-all active:scale-[0.97]',
                          c.priority === p
                            ? `${CASE_PRIORITY_CONFIG[p].color} ${CASE_PRIORITY_CONFIG[p].bg}`
                            : 'text-muted-foreground/60 hover:text-foreground',
                        )}
                      >
                        {CASE_PRIORITY_CONFIG[p].label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Type */}
                <div className="bd-card px-4 py-3.5">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Tag size={12} className="text-muted-foreground" />
                    <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Тип</p>
                  </div>
                  <div className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12px] font-semibold', typeCfg.iconBg)}>
                    <TypeIcon size={11} className={typeCfg.iconColor} />
                    <span className={typeCfg.iconColor}>{typeCfg.label}</span>
                  </div>
                </div>

                {/* Due date */}
                <div className="bd-card px-4 py-3.5">
                  <div className="flex items-center gap-1.5 mb-2">
                    <CalendarDays size={12} className="text-muted-foreground" />
                    <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Дедлайн</p>
                  </div>
                  {c.dueDate ? (
                    <p className={cn('text-[13px] font-bold', overdue ? 'text-destructive' : 'text-foreground')}>
                      {overdue && '⚠ '}
                      {new Date(c.dueDate).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}
                    </p>
                  ) : (
                    <p className="text-[13px] text-muted-foreground/50 font-medium">Не задан</p>
                  )}
                </div>

                {/* Responsible */}
                <div className="bd-card px-4 py-3.5">
                  <div className="flex items-center gap-1.5 mb-2">
                    <User size={12} className="text-muted-foreground" />
                    <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Ответственный</p>
                  </div>
                  <p className={cn('text-[13px] font-bold', c.responsible ? 'text-foreground' : 'text-muted-foreground/50')}>
                    {c.responsible || 'Не назначен'}
                  </p>
                </div>
              </div>

              {/* Description */}
              {c.description && (
                <div className="bd-card px-5 py-4">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-2.5">Описание</p>
                  <p className="text-[14px] text-foreground leading-relaxed">{c.description}</p>
                </div>
              )}

              {/* Photos */}
              <div className="bd-card px-5 py-4">
                <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-3.5">
                  Фото {c.photos.length > 0 && `(${c.photos.length})`}
                </p>
                <PhotoGrid photos={c.photos} onAdd={(url) => addPhoto(c.id, url)} />
              </div>

              {/* Timeline */}
              <div className="bd-card px-5 py-4">
                <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-4">
                  История · {c.timeline.length}
                </p>
                {c.timeline.length === 0 ? (
                  <p className="text-[13px] text-muted-foreground">История пуста.</p>
                ) : (
                  <div className="relative">
                    {/* Vertical connector */}
                    {c.timeline.length > 1 && (
                      <div className="absolute left-3.5 top-7 bottom-7 w-[1.5px] bg-border" aria-hidden />
                    )}
                    <div className="flex flex-col gap-4">
                      {c.timeline.map((entry) => {
                        const tlCfg = TIMELINE_ICON[entry.type];
                        const Icon  = tlCfg.icon;
                        return (
                          <div key={entry.id} className="flex items-start gap-3 relative">
                            <div className={cn('w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 relative z-10', tlCfg.bg)}>
                              <Icon size={13} className={tlCfg.color} />
                            </div>
                            <div className="flex-1 pt-0.5 min-w-0">
                              <p className="text-[13px] font-semibold text-foreground leading-snug">{entry.text}</p>
                              <p className="text-[11px] text-muted-foreground mt-0.5">{fmtDateTime(entry.createdAt)}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Comments */}
              <div className="bd-card px-5 py-4">
                <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-4">
                  Комментарии {c.comments.length > 0 && `· ${c.comments.length}`}
                </p>

                {c.comments.length > 0 && (
                  <div className="flex flex-col gap-3 mb-4">
                    {c.comments.map((comment) => (
                      <div key={comment.id} className="bg-muted rounded-2xl rounded-tl-sm px-4 py-3">
                        <p className="text-[14px] text-foreground leading-relaxed">{comment.text}</p>
                        <p className="text-[11px] text-muted-foreground mt-1.5">{fmtDateTime(comment.createdAt)}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Comment input */}
                <div className="flex gap-2">
                  <textarea
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Добавить комментарий…"
                    rows={2}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmitComment(); } }}
                    className="flex-1 bg-muted border border-border rounded-2xl text-[14px] font-medium text-foreground px-4 py-2.5 placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/12 transition-all resize-none leading-relaxed"
                  />
                  <button
                    type="button"
                    onClick={handleSubmitComment}
                    disabled={!commentText.trim()}
                    className={cn(
                      'w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 self-end transition-all',
                      commentText.trim() ? 'bg-primary text-white shadow-[0_2px_8px_rgba(91,92,235,0.28)] active:scale-95' : 'bg-muted text-muted-foreground/40 cursor-not-allowed',
                    )}
                  >
                    <Send size={15} />
                  </button>
                </div>
              </div>

              {/* Created date */}
              <p className="text-[12px] text-muted-foreground text-center px-4">
                Создано {fmtDate(c.createdAt)} в {fmtTime(c.createdAt)}
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
                {deleteStep === 1 ? 'Нажмите ещё раз для подтверждения' : 'Удалить дело'}
              </button>

            </div>
          </div>

        </SafeArea>
      </div>

      {/* Edit sheet */}
      <AnimatePresence>
        {editOpen && (
          <EditSheet key="edit" c={c} onClose={() => setEditOpen(false)} onSave={handleSaveEdit} />
        )}
      </AnimatePresence>
    </AppShell>
  );
}
