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
            error: 'bg-rose-950/95 border-rose-500/70 text-rose-100',
            warning: 'bg-amber-950/95 border-amber-400/70 text-amber-100',
            success: 'bg-emerald-950/95 border-emerald-500/70 text-emerald-100',
            info: 'bg-slate-900/95 border-sky-400/60 text-slate-100',
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
              initial={{ opacity: 0, y: -16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -12, scale: 0.96 }}
              className={`pointer-events-auto w-full max-w-md rounded-2xl border-2 px-4 py-3 shadow-2xl backdrop-blur-md flex items-center justify-between gap-3 ${styleMap}`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Icon size={18} className="shrink-0" />
                <span className="text-xs sm:text-sm font-black leading-snug">{toast.text}</span>
              </div>
              <button
                onClick={() => dismiss(toast.id)}
                className="p-1 rounded-full hover:bg-white/10 transition-colors shrink-0"
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
