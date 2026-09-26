import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  title?: string;
}

interface ToastContextType {
  showToast: (type: ToastType, message: string, title?: string) => void;
  success: (message: string, title?: string) => void;
  error: (message: string, title?: string) => void;
  info: (message: string, title?: string) => void;
  warning: (message: string, title?: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((type: ToastType, message: string, title?: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, message, title }]);

    setTimeout(() => {
      removeToast(id);
    }, 4500);
  }, [removeToast]);

  const success = useCallback((message: string, title?: string) => showToast('success', message, title), [showToast]);
  const error = useCallback((message: string, title?: string) => showToast('error', message, title), [showToast]);
  const info = useCallback((message: string, title?: string) => showToast('info', message, title), [showToast]);
  const warning = useCallback((message: string, title?: string) => showToast('warning', message, title), [showToast]);

  return (
    <ToastContext.Provider value={{ showToast, success, error, info, warning }}>
      {children}
      {/* Toast Notification Container */}
      <div style={{ position: 'fixed', top: '24px', right: '24px', zIndex: 9999, display: 'flex', flexDirection: 'column', gap: '10px', pointerEvents: 'none' }}>
        {toasts.map((t) => {
          let bgColor = 'rgba(15, 23, 42, 0.95)';
          let borderColor = 'var(--border-medium)';
          let icon = <Info size={20} color="var(--primary-400)" />;

          if (t.type === 'success') {
            borderColor = 'var(--emerald-500)';
            icon = <CheckCircle2 size={20} color="var(--emerald-400)" />;
          } else if (t.type === 'error') {
            borderColor = 'var(--rose-500)';
            icon = <AlertCircle size={20} color="var(--rose-400)" />;
          } else if (t.type === 'warning') {
            borderColor = 'var(--amber-500)';
            icon = <AlertTriangle size={20} color="var(--amber-400)" />;
          }

          return (
            <div
              key={t.id}
              className="glass-card animate-fade-in"
              style={{
                pointerEvents: 'auto',
                background: bgColor,
                borderColor: borderColor,
                padding: '14px 18px',
                borderRadius: 'var(--radius-md)',
                minWidth: '320px',
                maxWidth: '420px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px',
                boxShadow: 'var(--shadow-lg)',
              }}
            >
              <div style={{ flexShrink: 0, marginTop: '2px' }}>{icon}</div>
              <div style={{ flex: 1 }}>
                {t.title && <div style={{ fontWeight: 600, fontSize: '13px', marginBottom: '2px', color: 'var(--text-primary)' }}>{t.title}</div>}
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>{t.message}</div>
              </div>
              <button
                onClick={() => removeToast(t.id)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '2px' }}
              >
                <X size={16} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within a ToastProvider');
  return context;
};
