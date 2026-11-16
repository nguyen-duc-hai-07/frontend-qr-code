import React, { createContext, useContext, useState, useCallback } from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
}

export interface AlertModalOptions {
  title?: string;
  message: string;
  type?: ToastType;
  confirmText?: string;
  onConfirm?: () => void;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType, title?: string) => void;
  showError: (message: string, title?: string) => void;
  showSuccess: (message: string, title?: string) => void;
  showWarning: (message: string, title?: string) => void;
  showAlertModal: (options: AlertModalOptions) => void;
  closeAlertModal: () => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [alertModal, setAlertModal] = useState<AlertModalOptions | null>(null);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, type: ToastType = 'info', title?: string) => {
      const id = Date.now().toString() + Math.random().toString(36).substring(2, 5);
      const newToast: ToastItem = { id, type, title, message };
      setToasts((prev) => [...prev, newToast]);

      setTimeout(() => {
        removeToast(id);
      }, 4500);
    },
    [removeToast]
  );

  const showError = useCallback(
    (message: string, title?: string) => {
      showToast(message, 'error', title || 'Có lỗi xảy ra');
    },
    [showToast]
  );

  const showSuccess = useCallback(
    (message: string, title?: string) => {
      showToast(message, 'success', title || 'Thành công');
    },
    [showToast]
  );

  const showWarning = useCallback(
    (message: string, title?: string) => {
      showToast(message, 'warning', title || 'Thông báo');
    },
    [showToast]
  );

  const showAlertModal = useCallback((options: AlertModalOptions) => {
    setAlertModal(options);
  }, []);

  const closeAlertModal = useCallback(() => {
    if (alertModal?.onConfirm) {
      alertModal.onConfirm();
    }
    setAlertModal(null);
  }, [alertModal]);

  return (
    <ToastContext.Provider
      value={{
        showToast,
        showError,
        showSuccess,
        showWarning,
        showAlertModal,
        closeAlertModal,
      }}
    >
      {children}

      {/* Floating Toasts */}
      <div className="fixed top-5 right-5 z-[9999] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-4 sm:px-0">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-2xl shadow-xl border backdrop-blur-md transition-all animate-in slide-in-from-top-2 duration-200 ${
              toast.type === 'error'
                ? 'bg-rose-50/95 border-rose-200 text-rose-950'
                : toast.type === 'warning'
                ? 'bg-amber-50/95 border-amber-200 text-amber-950'
                : toast.type === 'success'
                ? 'bg-emerald-50/95 border-emerald-200 text-emerald-950'
                : 'bg-white/95 border-stone-200 text-stone-900'
            }`}
          >
            <div className="shrink-0 mt-0.5">
              {toast.type === 'error' && <AlertCircle className="w-5 h-5 text-rose-600" />}
              {toast.type === 'warning' && <AlertTriangle className="w-5 h-5 text-amber-600" />}
              {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-600" />}
              {toast.type === 'info' && <Info className="w-5 h-5 text-blue-600" />}
            </div>

            <div className="flex-1 min-w-0">
              {toast.title && (
                <p className="text-xs font-bold leading-tight mb-0.5">{toast.title}</p>
              )}
              <p className="text-xs text-stone-600 leading-relaxed break-words">{toast.message}</p>
            </div>

            <button
              onClick={() => removeToast(toast.id)}
              className="shrink-0 p-1 text-stone-400 hover:text-stone-700 rounded-lg hover:bg-stone-200/50 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>

      {/* Beautiful Centered Alert Modal */}
      {alertModal && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-stone-950/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-stone-200/80 text-center space-y-4 animate-in zoom-in-95 duration-150">
            <div
              className={`w-14 h-14 rounded-2xl mx-auto flex items-center justify-center shadow-inner ${
                alertModal.type === 'error'
                  ? 'bg-rose-100 text-rose-600'
                  : alertModal.type === 'warning'
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-blue-100 text-blue-600'
              }`}
            >
              {alertModal.type === 'error' ? (
                <AlertCircle className="w-8 h-8" />
              ) : alertModal.type === 'warning' ? (
                <AlertTriangle className="w-8 h-8" />
              ) : (
                <Info className="w-8 h-8" />
              )}
            </div>

            <div>
              <h3 className="text-base font-black text-stone-900 tracking-tight">
                {alertModal.title || 'Thông báo'}
              </h3>
              <p className="text-xs text-stone-600 mt-2 leading-relaxed break-words">
                {alertModal.message}
              </p>
            </div>

            <button
              type="button"
              onClick={closeAlertModal}
              className="w-full py-2.5 bg-amber-700 hover:bg-amber-800 text-white font-bold text-xs rounded-xl shadow-md shadow-amber-900/10 transition-all active:scale-[0.98]"
            >
              {alertModal.confirmText || 'Đã hiểu'}
            </button>
          </div>
        </div>
      )}
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastContextType => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
