import {
  Wrench, MessageCircle, Users, Truck,
  Package, CalendarClock, Lightbulb, DollarSign, Settings,
} from 'lucide-react';
import type { EventCategory, Priority, EventStatus } from '@/store/events';

// ─── Category visual config ───────────────────────────────────────────────────

export interface CategoryMeta {
  label:     string;
  desc:      string;
  icon:      React.ElementType;
  color:     string;          // hex accent
  iconBg:    string;          // Tailwind class for icon container bg
  iconColor: string;          // Tailwind class for icon stroke color
  dot:       string;          // Tailwind class for timeline dot bg
  extraLabel:   string;       // label for category-specific extra field
  extraPlaceholder: string;
}

export const CATEGORY_CONFIG: Record<EventCategory, CategoryMeta> = {
  equipment: {
    label: 'Оборудование', desc: 'Поломка или неисправность',
    icon: Wrench, color: '#EF4444',
    iconBg: 'bg-destructive/10', iconColor: 'text-destructive',
    dot: 'bg-destructive',
    extraLabel: 'Название оборудования', extraPlaceholder: 'Кофемашина, холодильник…',
  },
  complaint: {
    label: 'Жалоба гостя', desc: 'Обратная связь от гостя',
    icon: MessageCircle, color: '#F97316',
    iconBg: 'bg-[#F97316]/10', iconColor: 'text-[#EA580C]',
    dot: 'bg-[#F97316]',
    extraLabel: 'Место гостя', extraPlaceholder: 'Стол №, зона, терраса…',
  },
  conflict: {
    label: 'Конфликт', desc: 'Инцидент в коллективе',
    icon: Users, color: '#F59E0B',
    iconBg: 'bg-[#F59E0B]/10', iconColor: 'text-[#B45309]',
    dot: 'bg-[#F59E0B]',
    extraLabel: 'Участники', extraPlaceholder: 'Имена сотрудников или гостей',
  },
  supplier: {
    label: 'Поставщик', desc: 'Проблема или событие с поставщиком',
    icon: Truck, color: '#8B5CF6',
    iconBg: 'bg-[#8B5CF6]/10', iconColor: 'text-[#7C3AED]',
    dot: 'bg-[#8B5CF6]',
    extraLabel: 'Поставщик', extraPlaceholder: 'Название компании',
  },
  inventory: {
    label: 'Инвентарь', desc: 'Склад, приход или расход',
    icon: Package, color: '#0EA5E9',
    iconBg: 'bg-[#0EA5E9]/10', iconColor: 'text-[#0369A1]',
    dot: 'bg-[#0EA5E9]',
    extraLabel: 'Позиция', extraPlaceholder: 'Название товара или позиции',
  },
  maintenance: {
    label: 'Обслуживание', desc: 'Плановое ТО или ремонт',
    icon: CalendarClock, color: '#3B82F6',
    iconBg: 'bg-[#3B82F6]/10', iconColor: 'text-[#1D4ED8]',
    dot: 'bg-[#3B82F6]',
    extraLabel: 'Оборудование', extraPlaceholder: 'Что обслуживалось',
  },
  idea: {
    label: 'Идея', desc: 'Предложение по улучшению',
    icon: Lightbulb, color: '#5B5CEB',
    iconBg: 'bg-primary/10', iconColor: 'text-primary',
    dot: 'bg-primary',
    extraLabel: 'Ожидаемый эффект', extraPlaceholder: 'Что улучшится и как измерить…',
  },
  finance: {
    label: 'Финансы', desc: 'Расход, доход, штраф',
    icon: DollarSign, color: '#22C55E',
    iconBg: 'bg-[#22C55E]/10', iconColor: 'text-[#16A34A]',
    dot: 'bg-[#22C55E]',
    extraLabel: 'Сумма', extraPlaceholder: '0 ₽',
  },
  operations: {
    label: 'Операции', desc: 'Общие процессы и процедуры',
    icon: Settings, color: '#64748B',
    iconBg: 'bg-[#64748B]/10', iconColor: 'text-[#475569]',
    dot: 'bg-[#64748B]',
    extraLabel: 'Зона / Отдел', extraPlaceholder: 'Бар, кухня, зал…',
  },
};

// ─── Priority config ──────────────────────────────────────────────────────────

export interface PriorityMeta {
  label: string;
  color: string;   // Tailwind text class
  bg:    string;   // Tailwind bg class
  dot:   string;   // hex
}

export const PRIORITY_CONFIG: Record<Priority, PriorityMeta> = {
  critical: { label: 'Критическая', color: 'text-destructive',  bg: 'bg-destructive/10',  dot: '#EF4444' },
  high:     { label: 'Высокая',     color: 'text-[#EA580C]',    bg: 'bg-[#F97316]/10',    dot: '#F97316' },
  medium:   { label: 'Средняя',     color: 'text-[#B45309]',    bg: 'bg-[#F59E0B]/10',    dot: '#F59E0B' },
  low:      { label: 'Низкая',      color: 'text-muted-foreground', bg: 'bg-muted',        dot: '#9CA3AF' },
};

// ─── Status config ────────────────────────────────────────────────────────────

export interface StatusMeta {
  label: string;
  color: string;
  bg:    string;
}

export const STATUS_CONFIG: Record<EventStatus, StatusMeta> = {
  open:        { label: 'Открыт',    color: 'text-[#0369A1]',       bg: 'bg-[#0EA5E9]/10' },
  in_progress: { label: 'В работе',  color: 'text-[#B45309]',       bg: 'bg-[#F59E0B]/10' },
  resolved:    { label: 'Решён',     color: 'text-[#16A34A]',       bg: 'bg-[#22C55E]/10' },
  closed:      { label: 'Закрыт',    color: 'text-muted-foreground', bg: 'bg-muted' },
};

// ─── Ordered arrays for iteration ─────────────────────────────────────────────

export const CATEGORIES = Object.entries(CATEGORY_CONFIG) as [EventCategory, CategoryMeta][];
export const PRIORITIES: Priority[]    = ['critical', 'high', 'medium', 'low'];
export const STATUSES:   EventStatus[] = ['open', 'in_progress', 'resolved', 'closed'];
