export type ToastType = 'info' | 'success' | 'error' | 'warning';

export interface ToastMessage {
  id: number;
  text: string;
  type: ToastType;
}

type ToastListener = (toast: ToastMessage) => void;

const listeners = new Set<ToastListener>();
let nextToastId = 1;

export const subscribeToasts = (listener: ToastListener): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const showToast = (text: string, type: ToastType = 'info') => {
  const toast: ToastMessage = {
    id: nextToastId++,
    text,
    type,
  };
  listeners.forEach((listener) => listener(toast));
};
