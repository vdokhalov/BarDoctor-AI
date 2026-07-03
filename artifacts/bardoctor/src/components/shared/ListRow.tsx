import React from 'react';
import { cn } from '@/lib/utils';
import { ChevronRight } from 'lucide-react';

interface ListRowProps {
  icon?: React.ReactNode;
  title: string;
  subtitle?: string;
  meta?: React.ReactNode;
  showChevron?: boolean;
  onClick?: () => void;
  className?: string;
  destructive?: boolean;
}

export default function ListRow({ 
  icon, 
  title, 
  subtitle, 
  meta, 
  showChevron, 
  onClick, 
  className,
  destructive = false
}: ListRowProps) {
  return (
    <div 
      onClick={onClick}
      className={cn(
        "flex items-center justify-between py-3", 
        onClick && "cursor-pointer active:opacity-70 transition-opacity",
        className
      )}
    >
      <div className="flex items-center gap-4">
        {icon && (
          <div className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
            destructive ? "bg-destructive/10 text-destructive" : "bg-muted text-foreground"
          )}>
            {icon}
          </div>
        )}
        <div className="flex flex-col">
          <span className={cn(
            "text-[16px] font-medium",
            destructive ? "text-destructive" : "text-foreground"
          )}>
            {title}
          </span>
          {subtitle && (
            <span className="text-[13px] text-muted-foreground mt-0.5">{subtitle}</span>
          )}
        </div>
      </div>
      
      <div className="flex items-center gap-3">
        {meta && <div className="text-[14px] text-muted-foreground font-medium">{meta}</div>}
        {showChevron && <ChevronRight className="w-5 h-5 text-muted-foreground" />}
      </div>
    </div>
  );
}
