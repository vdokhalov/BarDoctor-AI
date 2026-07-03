import React from 'react';
import { cn } from '@/lib/utils';

interface MetricCardProps {
  label: string;
  value: string;
  icon?: React.ReactNode;
  trend?: string;
  trendPositive?: boolean;
  className?: string;
}

export default function MetricCard({ label, value, icon, trend, trendPositive, className }: MetricCardProps) {
  return (
    <div className={cn("bd-card p-4 flex flex-col gap-3", className)}>
      <div className="flex items-start justify-between">
        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
          {icon}
        </div>
        {trend && (
          <span className={cn(
            "text-[12px] font-medium tracking-tight",
            trendPositive ? "text-success" : "text-destructive"
          )}>
            {trend}
          </span>
        )}
      </div>
      <div>
        <div className="text-[24px] font-bold text-foreground leading-tight mb-1">{value}</div>
        <div className="text-[13px] text-muted-foreground font-medium">{label}</div>
      </div>
    </div>
  );
}
