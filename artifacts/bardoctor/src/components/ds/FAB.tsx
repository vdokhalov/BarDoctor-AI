import React from 'react';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface FABProps {
  icon?: React.ReactNode;
  onClick?: () => void;
  label?: string;
  position?: 'bottom-right' | 'bottom-center';
  className?: string;
}

export default function FAB({
  icon = <Plus className="w-6 h-6" />,
  onClick,
  label,
  position = 'bottom-right',
  className,
}: FABProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "bg-primary text-primary-foreground flex items-center justify-center shadow-[var(--shadow-fab)] hover:scale-105 active:scale-95 transition-transform duration-150 z-40",
        label ? "h-14 px-6 rounded-full gap-2" : "w-14 h-14 rounded-full",
        position === 'bottom-right' && "fixed bottom-24 right-6",
        position === 'bottom-center' && "fixed bottom-24 left-1/2 -translate-x-1/2",
        className
      )}
    >
      {icon}
      {label && <span className="text-[16px] font-semibold">{label}</span>}
    </button>
  );
}
