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
    <div className={cn("bg-white rounded-2xl p-4 shadow-card border border-[#E8E8EC] flex flex-col gap-3", className)}>
      <div className="flex items-start justify-between">
        <div className="w-8 h-8 rounded-full bg-[#F2F2F7] flex items-center justify-center text-[#8E8E9A]">
          {icon}
        </div>
        {trend && (
          <span className={cn(
            "text-[12px] font-medium tracking-tight",
            trendPositive ? "text-[#22C55E]" : "text-[#EF4444]"
          )}>
            {trend}
          </span>
        )}
      </div>
      <div>
        <div className="text-[24px] font-bold text-[#1A1A2E] leading-tight mb-1">{value}</div>
        <div className="text-[13px] text-[#8E8E9A] font-medium">{label}</div>
      </div>
    </div>
  );
}
