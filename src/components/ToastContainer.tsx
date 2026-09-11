import React from 'react';
import { useApp } from '../context/AppContext';
import { CheckCircle, AlertCircle } from 'lucide-react';

export const ToastContainer: React.FC = () => {
  const { toasts } = useApp();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 w-full max-w-sm px-4 pointer-events-none font-['Plus_Jakarta_Sans',sans-serif]">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className={`flex items-center gap-2.5 px-4 py-2.5 rounded-2xl shadow-xl text-xs font-bold text-white animate-in fade-in slide-in-from-top-2 duration-200 pointer-events-auto ${
            toast.type === 'error'
              ? 'bg-[#D32F2F]'
              : toast.type === 'warning'
              ? 'bg-[#F57C00]'
              : 'bg-[#2E7D32]'
          }`}
        >
          {toast.type === 'error' ? (
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
          ) : (
            <CheckCircle className="w-4 h-4 flex-shrink-0" />
          )}
          <span className="flex-1 leading-snug">{toast.message}</span>
        </div>
      ))}
    </div>
  );
};
