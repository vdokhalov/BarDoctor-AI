import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  snapPoint?: 'half' | 'full' | 'auto';
  showHandle?: boolean;
}

export default function BottomSheet({
  open,
  onClose,
  title,
  children,
  snapPoint = 'auto',
  showHandle = true,
}: BottomSheetProps) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-foreground/40 backdrop-blur-[2px] z-[60]"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
            className={cn(
              "fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-card rounded-t-[28px] shadow-[var(--shadow-dialog)] z-[60] flex flex-col max-h-[90dvh]",
              snapPoint === 'full' && "h-[90dvh]",
              snapPoint === 'half' && "h-[50dvh]"
            )}
          >
            {showHandle && (
              <div className="w-10 h-1 bg-border rounded-full mx-auto mt-3 mb-1 shrink-0" />
            )}
            
            {title && (
              <div className="px-6 pt-4 pb-2 shrink-0">
                <h3 className="text-[18px] font-semibold text-foreground">{title}</h3>
              </div>
            )}
            
            <div className="px-6 pb-8 overflow-y-auto flex-1">
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
