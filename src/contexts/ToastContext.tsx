import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, X, AlertTriangle } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';

type ToastVariant = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: string;
  message: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  toast: {
    success: (message: string) => void;
    error: (message: string) => void;
    info: (message: string) => void;
    warning: (message: string) => void;
  };
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

const TOAST_DURATION_MS = 3500;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts(current => current.filter(t => t.id !== id));
  }, []);

  const push = useCallback((message: string, variant: ToastVariant) => {
    const id = crypto.randomUUID();
    setToasts(current => [...current, { id, message, variant }]);
    setTimeout(() => dismiss(id), TOAST_DURATION_MS);
  }, [dismiss]);

  const value: ToastContextValue = {
    toast: {
      success: (m) => push(m, 'success'),
      error: (m) => push(m, 'error'),
      info: (m) => push(m, 'info'),
      warning: (m) => push(m, 'warning'),
    }
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

function ToastViewport({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: string) => void }) {
  return (
    <div className="fixed top-4 right-4 left-4 sm:left-auto sm:bottom-6 sm:right-6 sm:top-auto z-[100] flex flex-col gap-2 pointer-events-none">
      <AnimatePresence>
        {toasts.map(t => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, x: 40, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="pointer-events-auto"
          >
            <ToastItem toast={t} onDismiss={() => onDismiss(t.id)} />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const styles = {
    success: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-900', icon: <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" /> },
    error: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-900', icon: <AlertCircle className="w-5 h-5 text-red-600 shrink-0" /> },
    info: { bg: 'bg-stone-50', border: 'border-stone-200', text: 'text-stone-900', icon: <Info className="w-5 h-5 text-stone-600 shrink-0" /> },
    warning: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-900', icon: <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" /> },
  }[toast.variant];

  return (
    <div className={`${styles.bg} ${styles.border} border rounded-xl shadow-lg px-4 py-3 flex items-start gap-3 min-w-[280px] max-w-md`}>
      {styles.icon}
      <p className={`${styles.text} text-sm font-medium flex-1`}>{toast.message}</p>
      <button onClick={onDismiss} className={`${styles.text} opacity-40 hover:opacity-100 transition-opacity shrink-0`}>
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a ToastProvider');
  return ctx;
}
