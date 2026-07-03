import React from 'react';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}

export default function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center py-12 px-6 text-center", className)}>
      <div className="w-16 h-16 rounded-full bg-[#F2F2F7] flex items-center justify-center text-[#8E8E9A] mb-4">
        {icon}
      </div>
      <h3 className="text-[18px] font-semibold text-[#1A1A2E] mb-2 tracking-tight">{title}</h3>
      <p className="text-[15px] text-[#8E8E9A] mb-6 max-w-[280px] leading-relaxed">
        {description}
      </p>
      {action && <div>{action}</div>}
    </div>
  );
}
