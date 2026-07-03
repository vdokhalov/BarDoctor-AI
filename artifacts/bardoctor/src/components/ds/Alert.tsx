import React from 'react';
import { cn } from '@/lib/utils';
import { Info, CheckCircle2, AlertTriangle, AlertCircle, X } from 'lucide-react';

export interface AlertProps {
  variant?: 'info' | 'success' | 'warning' | 'danger';
  title: string;
  description?: string;
  onDismiss?: () => void;
  icon?: React.ReactNode;
  className?: string;
}

export default function Alert({
  variant = 'info',
  title,
  description,
  onDismiss,
  icon,
  className,
}: AlertProps) {
  const variants = {
    info: {
      container: 'border-l-[#3B82F6] bg-[#3B82F6]/8',
      icon: <Info className="w-5 h-5 text-[#3B82F6]" />,
    },
    success: {
      container: 'border-l-[#22C55E] bg-[#22C55E]/8',
      icon: <CheckCircle2 className="w-5 h-5 text-[#22C55E]" />,
    },
    warning: {
      container: 'border-l-[#F59E0B] bg-[#F59E0B]/8',
      icon: <AlertTriangle className="w-5 h-5 text-[#F59E0B]" />,
    },
    danger: {
      container: 'border-l-destructive bg-destructive/8',
      icon: <AlertCircle className="w-5 h-5 text-destructive" />,
    },
  };

  const activeVariant = variants[variant];

  return (
    <div
      className={cn(
        "flex gap-3 rounded-[16px] border-l-[4px] p-4 relative",
        activeVariant.container,
        className
      )}
    >
      <div className="shrink-0 mt-0.5">
        {icon || activeVariant.icon}
      </div>
      <div className="flex-1 pr-6">
        <h4 className="text-[15px] font-semibold text-foreground leading-snug">{title}</h4>
        {description && (
          <p className="text-[14px] text-muted-foreground mt-0.5 leading-relaxed">{description}</p>
        )}
      </div>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
