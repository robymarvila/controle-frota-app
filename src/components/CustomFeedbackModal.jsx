import React from 'react';
import { 
  CheckCircle2, AlertTriangle, AlertOctagon, Info, 
  Clock, ShieldAlert, X, ArrowRight, ShieldCheck, Sparkles 
} from 'lucide-react';

export default function CustomFeedbackModal({
  isOpen,
  type = 'info', // 'success' | 'warning' | 'error' | 'info' | 'pending' | 'blocked'
  title,
  message,
  confirmText = 'Entendido',
  cancelText = null,
  onConfirm,
  onCancel,
  showClose = false
}) {
  if (!isOpen) return null;

  const getThemeConfig = () => {
    switch (type) {
      case 'success':
        return {
          bgBadge: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 shadow-emerald-500/10',
          gradientBtn: 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-emerald-600/25',
          icon: <CheckCircle2 size={36} className="text-emerald-500 animate-in zoom-in-50 duration-300" />,
          glow: 'from-emerald-500/20 to-teal-500/0'
        };
      case 'warning':
        return {
          bgBadge: 'bg-amber-500/10 text-amber-600 border-amber-500/20 shadow-amber-500/10',
          gradientBtn: 'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 shadow-amber-600/25',
          icon: <AlertTriangle size={36} className="text-amber-500 animate-in zoom-in-50 duration-300" />,
          glow: 'from-amber-500/20 to-orange-500/0'
        };
      case 'error':
        return {
          bgBadge: 'bg-rose-500/10 text-rose-600 border-rose-500/20 shadow-rose-500/10',
          gradientBtn: 'bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 shadow-rose-600/25',
          icon: <AlertOctagon size={36} className="text-rose-500 animate-in zoom-in-50 duration-300" />,
          glow: 'from-rose-500/20 to-red-500/0'
        };
      case 'pending':
        return {
          bgBadge: 'bg-amber-500/10 text-amber-600 border-amber-500/20 shadow-amber-500/10',
          gradientBtn: 'bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 shadow-amber-600/25',
          icon: <Clock size={36} className="text-amber-500 animate-pulse" />,
          glow: 'from-amber-500/20 to-yellow-500/0'
        };
      case 'blocked':
        return {
          bgBadge: 'bg-rose-500/10 text-rose-600 border-rose-500/20 shadow-rose-500/10',
          gradientBtn: 'bg-gradient-to-r from-rose-600 to-slate-800 hover:from-rose-500 hover:to-slate-700 shadow-rose-600/25',
          icon: <ShieldAlert size={36} className="text-rose-500 animate-in zoom-in-50 duration-300" />,
          glow: 'from-rose-500/20 to-slate-900/0'
        };
      case 'info':
      default:
        return {
          bgBadge: 'bg-blue-500/10 text-blue-600 border-blue-500/20 shadow-blue-500/10',
          gradientBtn: 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-blue-600/25',
          icon: <Info size={36} className="text-blue-500 animate-in zoom-in-50 duration-300" />,
          glow: 'from-blue-500/20 to-indigo-500/0'
        };
    }
  };

  const theme = getThemeConfig();

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-[440px] bg-white rounded-[2rem] shadow-[0_25px_70px_-15px_rgba(0,0,0,0.3)] border border-slate-100 overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-300 font-sans"
        onClick={e => e.stopPropagation()}
      >
        {/* Glow Header */}
        <div className={`absolute top-0 left-0 right-0 h-32 bg-gradient-to-b ${theme.glow} pointer-events-none`} />

        {/* Close Button if requested */}
        {showClose && onCancel && (
          <button 
            onClick={onCancel}
            className="absolute top-5 right-5 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100/80 rounded-full transition-colors z-10"
          >
            <X size={18} />
          </button>
        )}

        <div className="relative p-8 text-center flex flex-col items-center">
          {/* Animated Icon Badge */}
          <div className={`w-20 h-20 rounded-2xl flex items-center justify-center border shadow-lg mb-6 ${theme.bgBadge}`}>
            {theme.icon}
          </div>

          {/* Title */}
          <h3 className="text-xl font-black text-slate-900 tracking-tight mb-2">
            {title || 'Aviso do Sistema'}
          </h3>

          {/* Message */}
          <p className="text-sm font-medium text-slate-600 leading-relaxed mb-8 max-w-[340px]">
            {message}
          </p>

          {/* Actions */}
          <div className="w-full flex flex-col sm:flex-row items-center gap-3">
            {cancelText && onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="w-full py-3.5 px-5 rounded-xl font-bold text-sm text-slate-600 bg-slate-100 hover:bg-slate-200 active:scale-[0.98] transition-all duration-150 order-2 sm:order-1"
              >
                {cancelText}
              </button>
            )}
            <button
              type="button"
              onClick={onConfirm || onCancel}
              className={`w-full py-3.5 px-6 rounded-xl font-black text-sm text-white shadow-lg active:scale-[0.98] transition-all duration-150 flex items-center justify-center gap-2 order-1 sm:order-2 ${theme.gradientBtn}`}
            >
              <span>{confirmText}</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
