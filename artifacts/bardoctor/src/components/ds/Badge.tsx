import React from 'react';
import { cn } from '@/lib/utils';

export interface BadgeProps {
  label: string;
  variant?: 'primary' | 'success' | 'warning' | 'danger' | 'neutral' | 'info';
  dot?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

export default function Badge({
  label,
  variant = 'neutral',
  dot = false,
  size = 'md',
  className,
}: BadgeProps) {
  const variants = {
    primary: 'bg-primary/10 text-primary',
    success: 'bg-[#22C55E]/10 text-[#16A34A]',
    warning: 'bg-[#F59E0B]/10 text-[#B45309]',
    danger: 'bg-destructive/10 text-destructive',
    neutral: 'bg-muted text-muted-foreground',
    info: 'bg-[#3B82F6]/10 text-[#1D4ED8]',
  };

  const dotColors = {
    primary: 'bg-primary',
    success: 'bg-[#22C55E]',
    warning: 'bg-[#F59E0B]',
    danger: 'bg-destructive',
    neutral: 'bg-muted-foreground',
    info: 'bg-[#3B82F6]',
  };

  const sizes = {
    sm: 'text-[11px] px-2.5 py-0.5',
    md: 'text-[12px] px-3 py-1',
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full font-medium tracking-wide uppercase",
        variants[variant],
        sizes[size],
        className
      )}
    >
      {dot && (
        <span className={cn("w-1.5 h-1.5 rounded-full mr-1.5", dotColors[variant])} />
      )}
      {label}
    </span>
  );
}
