import { useState, useCallback } from 'react';

interface Toast {
  id: string;
  title: string;
  description?: string;
  duration?: number;
}

let toastCount = 0;

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback(
    ({ title, description, duration = 3000 }: Omit<Toast, 'id'>) => {
      const id = `toast-${toastCount++}`;
      const newToast: Toast = { id, title, description, duration };

      setToasts((prev) => [...prev, newToast]);

      // Simple console toast for now
      console.log(`[Toast] ${title}`, description);

      // Auto-remove after duration
      if (duration > 0) {
        setTimeout(() => {
          setToasts((prev) => prev.filter((t) => t.id !== id));
        }, duration);
      }

      return id;
    },
    []
  );

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return { toast, toasts, dismiss };
}
