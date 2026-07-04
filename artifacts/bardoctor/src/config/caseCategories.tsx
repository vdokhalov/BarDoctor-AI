import {
  Wrench, MessageSquare, Users, Truck, CalendarClock,
  DollarSign, ClipboardList, MoreHorizontal,
} from 'lucide-react';
import type { CaseType, CasePriority, CaseStatus } from '@/store/cases';

// ─── Case type visual config ──────────────────────────────────────────────────

export interface CaseTypeMeta {
  label:       string;
  desc:        string;
  icon:        React.ElementType;
  color:       string;    // hex
  iconBg:      string;    // Tailwind bg class
  iconColor:   string;    // Tailwind text class
  borderColor: string;    // Tailwind border-l class (for priority bars)
}

export const CASE_TYPE_CONFIG: Record<CaseType, CaseTypeMeta> = {
  equipment: {
    label: 'Оборудование', desc: 'Поломка или неисправность',
    icon: Wrench, color: '#EF4444',
    iconBg: 'bg-destructive/10', iconColor: 'text-destructive',
    borderColor: 'border-l-destructive',
  },
  complaint: {
    label: 'Жалоба гостя', desc: 'Обратная связь или инцидент с гостем',
    icon: MessageSquare, color: '#F97316',
    iconBg: 'bg-[#F97316]/10', iconColor: 'text-[#EA580C]',
    borderColor: 'border-l-[#F97316]',
  },
  conflict: {
    label: 'Конфликт', desc: 'Инцидент в коллективе',
    icon: Users, color: '#F59E0B',
    iconBg: 'bg-[#F59E0B]/10', iconColor: 'text-[#B45309]',
    borderColor: 'border-l-[#F59E0B]',
  },
  supplier: {
    label: 'Поставщик', desc: 'Проблема или событие с поставщиком',
    icon: Truck, color: '#8B5CF6',
    iconBg: 'bg-[#8B5CF6]/10', iconColor: 'text-[#7C3AED]',
    borderColor: 'border-l-[#8B5CF6]',
  },
  maintenance: {
    label: 'Обслуживание', desc: 'Плановое ТО или ремонт',
    icon: CalendarClock, color: '#3B82F6',
    iconBg: 'bg-[#3B82F6]/10', iconColor: 'text-[#1D4ED8]',
    borderColor: 'border-l-[#3B82F6]',
  },
  finance: {
    label: 'Финансы', desc: 'Штраф, претензия, расход',
    icon: DollarSign, color: '#22C55E',
    iconBg: 'bg-[#22C55E]/10', iconColor: 'text-[#16A34A]',
    borderColor: 'border-l-[#22C55E]',
  },
  inspection: {
    label: 'Проверка', desc: 'Аудит, инспекция, контроль',
    icon: ClipboardList, color: '#0EA5E9',
    iconBg: 'bg-[#0EA5E9]/10', iconColor: 'text-[#0369A1]',
    borderColor: 'border-l-[#0EA5E9]',
  },
  other: {
    label: 'Прочее', desc: 'Другой тип ситуации',
    icon: MoreHorizontal, color: '#64748B',
    iconBg: 'bg-[#64748B]/10', iconColor: 'text-[#475569]',
    borderColor: 'border-l-border',
  },
};

// ─── Priority config ──────────────────────────────────────────────────────────

export interface PriorityMeta {
  label:       string;
  color:       string;   // Tailwind text class
  bg:          string;   // Tailwind bg class
  borderColor: string;   // left border hex color (inline style)
}

export const CASE_PRIORITY_CONFIG: Record<CasePriority, PriorityMeta> = {
  critical: { label: 'Критический', color: 'text-destructive',     bg: 'bg-destructive/10',  borderColor: '#EF4444' },
  high:     { label: 'Высокий',     color: 'text-[#EA580C]',        bg: 'bg-[#F97316]/10',   borderColor: '#F97316' },
  medium:   { label: 'Средний',     color: 'text-[#B45309]',        bg: 'bg-[#F59E0B]/10',   borderColor: '#F59E0B' },
  low:      { label: 'Низкий',      color: 'text-muted-foreground', bg: 'bg-muted',           borderColor: '#E2E8F0' },
};

// ─── Status config ────────────────────────────────────────────────────────────

export interface StatusMeta {
  label: string;
  color: string;
  bg:    string;
  dot:   string;
}

export const CASE_STATUS_CONFIG: Record<CaseStatus, StatusMeta> = {
  open:        { label: 'Открыто',   color: 'text-[#0369A1]',        bg: 'bg-[#0EA5E9]/10', dot: 'bg-[#0EA5E9]' },
  in_progress: { label: 'В работе',  color: 'text-[#B45309]',        bg: 'bg-[#F59E0B]/10', dot: 'bg-[#F59E0B]' },
  waiting:     { label: 'Ожидание',  color: 'text-[#7C3AED]',        bg: 'bg-[#8B5CF6]/10', dot: 'bg-[#8B5CF6]' },
  resolved:    { label: 'Решено',    color: 'text-[#16A34A]',        bg: 'bg-[#22C55E]/10', dot: 'bg-[#22C55E]' },
  closed:      { label: 'Закрыто',   color: 'text-muted-foreground', bg: 'bg-muted',        dot: 'bg-muted-foreground/40' },
};

// ─── Ordered arrays ───────────────────────────────────────────────────────────

export const CASE_TYPES: CaseType[] = [
  'equipment', 'complaint', 'conflict', 'supplier',
  'maintenance', 'finance', 'inspection', 'other',
];

export const CASE_PRIORITIES: CasePriority[] = ['critical', 'high', 'medium', 'low'];
export const CASE_STATUSES:   CaseStatus[]   = ['open', 'in_progress', 'waiting', 'resolved', 'closed'];
