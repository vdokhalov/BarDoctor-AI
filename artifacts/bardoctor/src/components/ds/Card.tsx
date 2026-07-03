import React from 'react';
import { cn } from '@/lib/utils';

export interface CardProps {
  children: React.ReactNode;
  padding?: boolean;
  hoverable?: boolean;
  onClick?: () => void;
  className?: string;
  header?: React.ReactNode;
  footer?: React.ReactNode;
}

export default function Card({
  children,
  padding = true,
  hoverable = false,
  onClick,
  className,
  header,
  footer,
}: CardProps) {
  return (
    <div
      onClick={hoverable ? onClick : undefined}
      className={cn(
        "bd-card overflow-hidden",
        hoverable && "cursor-pointer hover:shadow-[var(--shadow-elevated)] hover:-translate-y-0.5 transition-all duration-200",
        className
      )}
    >
      {header && (
        <div className="px-5 pt-5 pb-4 border-b border-border">
          {header}
        </div>
      )}
      
      <div className={cn(padding && "p-5")}>
        {children}
      </div>

      {footer && (
        <div className="px-5 pb-5 pt-4 border-t border-border bg-muted/30 rounded-b-[20px]">
          {footer}
        </div>
      )}
    </div>
  );
}
