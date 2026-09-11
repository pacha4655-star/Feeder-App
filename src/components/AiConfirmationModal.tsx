import React from 'react';
import { Camera, ShieldCheck, AlertCircle, Sparkles, Check, X } from 'lucide-react';
import { AI_CONFIRMATION_TITLE, AI_CONFIRMATION_PROMPT, AI_CONFIRMATION_SUBTITLE } from '../utils/aiMediaGuard';

interface AiConfirmationModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  isPublishing?: boolean;
}

export const AiConfirmationModal: React.FC<AiConfirmationModalProps> = ({
  isOpen,
  onConfirm,
  onCancel,
  isPublishing = false,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150 font-sans">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 flex flex-col text-slate-800 animate-in zoom-in-95 duration-200">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-11 h-11 rounded-2xl bg-green-50 border border-green-200 flex items-center justify-center text-green-700 flex-shrink-0">
            <Camera className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
              {AI_CONFIRMATION_TITLE}
            </h3>
            <span className="text-[11px] font-bold text-green-700 bg-green-50 px-2 py-0.5 rounded-full border border-green-200">
              Community Authenticity Policy
            </span>
          </div>
        </div>

        <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 mb-4">
          <p className="text-sm font-semibold text-slate-800 leading-snug">
            {AI_CONFIRMATION_PROMPT}
          </p>
          <p className="text-xs text-slate-500 mt-2 leading-relaxed">
            {AI_CONFIRMATION_SUBTITLE}
          </p>
        </div>

        <div className="flex items-center gap-2 text-[11px] text-amber-700 bg-amber-50/70 border border-amber-200 rounded-xl px-3 py-2 mb-5">
          <AlertCircle className="w-4 h-4 flex-shrink-0 text-amber-600" />
          <span>Only real photos of animals and feeding spots are allowed.</span>
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onCancel}
            disabled={isPublishing}
            className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold transition-all disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isPublishing}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-green-700 to-green-600 hover:from-green-800 hover:to-green-700 text-white text-xs font-bold shadow-md shadow-green-700/20 active:scale-95 transition-all flex items-center gap-1.5 disabled:opacity-50"
          >
            <Check className="w-3.5 h-3.5 stroke-[3]" />
            <span>Confirm & Publish</span>
          </button>
        </div>
      </div>
    </div>
  );
};
