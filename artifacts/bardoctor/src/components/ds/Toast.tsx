import React, { createContext, useContext, useState, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

export interface Toast {
  id: string;
  variant: 'success' | 'error' | 'warning' | 'info' | 'default';
  title: string;
  description?: string;
  duration?: number;
}

export interface UseToast {
  toast: (options: Omit<Toast, 'id'>) => void;
  dismiss: (id: string) => void;
  toasts: Toast[];
}

const ToastContext = createContext<UseToast | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback((options: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substring(2, 9);
    const newToast: Toast = { ...options, id, duration: options.duration || 3500 };
    
    setToasts((prev) => [...prev, newToast]);

    if (newToast.duration !== Infinity) {
      setTimeout(() => {
        dismiss(id);
      }, newToast.duration);
    }
  }, [dismiss]);

  return (
    <ToastContext.Provider value={{ toast, dismiss, toasts }}>
      {children}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

export function ToastContainer() {
  const { toasts, dismiss } = useToast();

  return (
    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 w-[calc(100%-48px)] max-w-[380px] pointer-events-none">
      <AnimatePresence mode="popLayout">
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            layout
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ type: "spring", bounce: 0, duration: 0.4 }}
            className="bg-[#1E1F2E] text-white rounded-[16px] px-4 py-3.5 flex gap-3 items-start shadow-[var(--shadow-elevated)] pointer-events-auto"
          >
            <div className="shrink-0 mt-0.5">
              {t.variant === 'success' && <CheckCircle2 className="w-5 h-5 text-[#22C55E]" />}
              {t.variant === 'error' && <AlertCircle className="w-5 h-5 text-[#EF4444]" />}
              {t.variant === 'warning' && <AlertTriangle className="w-5 h-5 text-[#F59E0B]" />}
              {t.variant === 'info' && <Info className="w-5 h-5 text-[#3B82F6]" />}
            </div>
            <div className="flex-1 pr-2">
              <h4 className="text-[15px] font-semibold leading-snug">{t.title}</h4>
              {t.description && (
                <p className="text-[13px] text-white/70 mt-0.5 leading-relaxed">{t.description}</p>
              )}
            </div>
            <button
              onClick={() => dismiss(t.id)}
              className="shrink-0 text-white/50 hover:text-white transition-colors p-1 -mr-2 -mt-1 rounded-full hover:bg-white/10"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
