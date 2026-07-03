import React from 'react';
import { cn } from '@/lib/utils';
import NavBar from '@/components/ds/NavBar';

interface AppShellProps {
  children: React.ReactNode;
  showBottomNav?: boolean;
  className?: string;
}

export default function AppShell({ children, showBottomNav = false, className }: AppShellProps) {
  return (
    <div className="min-h-[100dvh] w-full bg-background flex justify-center text-foreground">
      <div className="w-full max-w-[430px] relative bg-background shadow-xl overflow-hidden flex flex-col">
        <main
          className={cn(
            'flex-1 overflow-y-auto w-full scroll-smooth',
            showBottomNav && 'pb-[96px]',
            className
          )}
        >
          {children}
        </main>
        {showBottomNav && <NavBar />}
      </div>
    </div>
  );
}
