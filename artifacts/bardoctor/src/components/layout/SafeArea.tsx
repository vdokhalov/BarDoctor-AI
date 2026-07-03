import React from 'react';
import { cn } from '@/lib/utils';

interface SafeAreaProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export default function SafeArea({ children, className, ...props }: SafeAreaProps) {
  return (
    <div className={cn("px-6 pb-6 pt-2 w-full", className)} {...props}>
      {children}
    </div>
  );
}
