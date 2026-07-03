import React from 'react';
import { cn } from '@/lib/utils';
import BottomNav from './BottomNav';

interface AppShellProps {
  children: React.ReactNode;
  showBottomNav?: boolean;
  className?: string;
}

export default function AppShell({ children, showBottomNav = false, className }: AppShellProps) {
  return (
    <div className="min-h-[100dvh] w-full bg-[#F9F9FB] flex justify-center text-[#1A1A2E]">
      <div className="w-full max-w-[430px] relative bg-[#F9F9FB] shadow-xl overflow-hidden flex flex-col">
        <main
          className={cn(
            'flex-1 overflow-y-auto w-full scroll-smooth',
            showBottomNav && 'pb-[96px]',
            className
          )}
        >
          {children}
        </main>
        {showBottomNav && <BottomNav />}
      </div>
    </div>
  );
}
