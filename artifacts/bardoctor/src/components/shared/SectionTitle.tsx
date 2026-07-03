import React from 'react';
import { cn } from '@/lib/utils';

interface SectionTitleProps {
  title: string;
  action?: React.ReactNode;
  className?: string;
}

export default function SectionTitle({ title, action, className }: SectionTitleProps) {
  return (
    <div className={cn("flex items-center justify-between mb-4 mt-6", className)}>
      <h3 className="text-[18px] font-semibold text-[#1A1A2E] tracking-tight">{title}</h3>
      {action && <div className="text-[14px] text-[#4F46E5] font-medium">{action}</div>}
    </div>
  );
}
