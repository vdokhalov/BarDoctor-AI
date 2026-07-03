import React from 'react';
import { cn } from '@/lib/utils';

export type StatusVariant = 'success' | 'warning' | 'danger' | 'neutral' | 'primary';

interface StatusBadgeProps {
  label: string;
  variant?: StatusVariant;
  className?: string;
}

export default function StatusBadge({ label, variant = 'neutral', className }: StatusBadgeProps) {
  const variants: Record<StatusVariant, string> = {
    success: 'bg-[#22C55E]/10 text-[#22C55E]',
    warning: 'bg-[#F59E0B]/10 text-[#D97706]',
    danger: 'bg-[#EF4444]/10 text-[#EF4444]',
    neutral: 'bg-[#F2F2F7] text-[#8E8E9A]',
    primary: 'bg-[#4F46E5]/10 text-[#4F46E5]',
  };

  return (
    <span className={cn(
      "inline-flex items-center px-2.5 py-1 rounded-full text-[12px] font-medium tracking-wide uppercase",
      variants[variant],
      className
    )}>
      {label}
    </span>
  );
}
