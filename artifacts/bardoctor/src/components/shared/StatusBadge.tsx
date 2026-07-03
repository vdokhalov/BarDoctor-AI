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
    success: 'bg-success/10 text-success',
    warning: 'bg-warning/10 text-warning',
    danger: 'bg-destructive/10 text-destructive',
    neutral: 'bg-muted text-muted-foreground',
    primary: 'bg-primary/10 text-primary',
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
