import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle, CheckCircle2, Info, AlertTriangle, X } from 'lucide-react';
import { subscribeToasts, ToastMessage } from '../utils/toast';

export const ToastHost: React.FC = () => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    return subscribeToasts((toast) => {
      setToasts((prev) => [...prev.slice(-2), toast]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((item) => item.id !== toast.id));
      }, 3600);
    });
  }, []);

  const dismiss = (id: number) => {
    setToasts((prev) => prev.filter((item) => item.id !== id));
  };

  return (
    <div className="fixed top-4 left-4 right-4 z-[200] flex flex-col items-center gap-2 pointer-events-none">
      <AnimatePresence>
        {toasts.map((toast) => {
          const styleMap = {
            error: 'bg-bg-surface border-[#963F46] text-danger-text',
            warning: 'bg-bg-surface border-[#B49A62] text-primary-text',
            success: 'bg-bg-surface border-[#3E7B67] text-emerald-text',
            info: 'bg-bg-surface border-[#668F9A] text-cyan-text',
          }[toast.type];

          const Icon = {
            error: AlertCircle,
            warning: AlertTriangle,
            success: CheckCircle2,
            info: Info,
          }[toast.type];

          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: -12, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.96 }}
              className={`pointer-events-auto w-full max-w-md rounded-[12px] border px-4 py-3 shadow-[0_14px_36px_rgba(4,7,12,0.45)] backdrop-blur-md flex items-center justify-between gap-3 ${styleMap}`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Icon size={17} className="shrink-0" />
                <span className="text-xs sm:text-sm font-semibold text-text-main leading-snug">
                  {toast.text}
                </span>
              </div>
              <button
                onClick={() => dismiss(toast.id)}
                className="w-8 h-8 flex items-center justify-center rounded-[6px] text-text-muted hover:text-text-main hover:bg-bg-card transition-colors shrink-0"
                aria-label="Close"
              >
                <X size={15} />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};
