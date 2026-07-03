import React from 'react';
import { ChevronLeft } from 'lucide-react';
import { useNavigation } from '@/hooks/useNavigation';
import { cn } from '@/lib/utils';

interface PageHeaderProps {
  title?: string;
  showBack?: boolean;
  rightElement?: React.ReactNode;
  className?: string;
  onBack?: () => void;
}

export default function PageHeader({ title, showBack = false, rightElement, className, onBack }: PageHeaderProps) {
  const { goBack } = useNavigation();

  return (
    <div className={cn("flex items-center justify-between px-6 py-4 min-h-[60px] bg-background/80 backdrop-blur-sm sticky top-0 z-40", className)}>
      <div className="flex items-center gap-3">
        {showBack && (
          <button
            onClick={onBack || goBack}
            className="w-10 h-10 -ml-2 rounded-full flex items-center justify-center hover:bg-black/5 transition-colors"
          >
            <ChevronLeft className="w-6 h-6 text-foreground" />
          </button>
        )}
        {title && (
          <h1 className="text-[20px] font-semibold text-foreground tracking-tight">{title}</h1>
        )}
      </div>
      {rightElement && <div>{rightElement}</div>}
    </div>
  );
}
