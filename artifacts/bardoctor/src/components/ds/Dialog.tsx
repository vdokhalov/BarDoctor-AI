import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md';
}

export default function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
}: DialogProps) {
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
          <div className="fixed inset-0 pointer-events-none z-[60] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 16 }}
              transition={{ type: "spring", bounce: 0, duration: 0.3 }}
              className={cn(
                "w-full bg-card rounded-[24px] shadow-[var(--shadow-dialog)] pointer-events-auto relative",
                size === 'sm' ? "max-w-[320px]" : "max-w-[360px]"
              )}
            >
              <div className="px-6 pt-6 pb-0">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-[18px] font-bold text-foreground tracking-tight">{title}</h2>
                    {description && (
                      <p className="text-[14px] text-muted-foreground mt-1">{description}</p>
                    )}
                  </div>
                  <button
                    onClick={onClose}
                    className="w-8 h-8 -mr-2 -mt-2 flex items-center justify-center rounded-full text-muted-foreground hover:bg-muted transition-colors shrink-0"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
              
              {children && <div className="px-6 py-5">{children}</div>}
              {!children && <div className="h-5" />}

              {footer && (
                <div className="px-6 pb-6 flex gap-3">
                  {footer}
                </div>
              )}
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
