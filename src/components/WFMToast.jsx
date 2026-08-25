import React, { useEffect, useState } from 'react';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X, Trash2, RotateCcw, HelpCircle } from 'lucide-react';

/**
 * Ultra-Premium Toast Notification System
 */
export function WFMToastList({ toasts = [], onDismiss }) {
  if (!toasts || toasts.length === 0) return null;

  return (
    <div className="fixed top-5 right-5 z-[9999] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => (
        <WFMToastItem key={toast.id} toast={toast} onDismiss={() => onDismiss(toast.id)} />
      ))}
    </div>
  );
}

function WFMToastItem({ toast, onDismiss }) {
  const { type = 'success', title, message, duration = 4000 } = toast;
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    if (duration <= 0) return;
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
      setProgress(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
        onDismiss();
      }
    }, 40);

    return () => clearInterval(interval);
  }, [duration, onDismiss]);

  const config = {
    success: {
      bg: 'bg-slate-900/95 border-emerald-500/50 shadow-emerald-950/40',
      icon: <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />,
      titleColor: 'text-emerald-400',
      barColor: 'bg-gradient-to-r from-emerald-500 to-teal-400',
      glow: 'shadow-[0_8px_30px_rgb(16,185,129,0.15)]'
    },
    error: {
      bg: 'bg-slate-900/95 border-rose-500/50 shadow-rose-950/40',
      icon: <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />,
      titleColor: 'text-rose-400',
      barColor: 'bg-gradient-to-r from-rose-500 to-red-400',
      glow: 'shadow-[0_8px_30px_rgb(244,63,94,0.15)]'
    },
    warning: {
      bg: 'bg-slate-900/95 border-amber-500/50 shadow-amber-950/40',
      icon: <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />,
      titleColor: 'text-amber-400',
      barColor: 'bg-gradient-to-r from-amber-500 to-yellow-400',
      glow: 'shadow-[0_8px_30px_rgb(245,158,11,0.15)]'
    },
    info: {
      bg: 'bg-slate-900/95 border-sky-500/50 shadow-sky-950/40',
      icon: <Info className="w-5 h-5 text-sky-400 shrink-0" />,
      titleColor: 'text-sky-400',
      barColor: 'bg-gradient-to-r from-sky-500 to-blue-400',
      glow: 'shadow-[0_8px_30px_rgb(14,165,233,0.15)]'
    }
  }[type] || {
    bg: 'bg-slate-900/95 border-slate-700 shadow-slate-950/40',
    icon: <Info className="w-5 h-5 text-slate-400 shrink-0" />,
    titleColor: 'text-slate-200',
    barColor: 'bg-blue-500',
    glow: 'shadow-xl'
  };

  return (
    <div
      className={`pointer-events-auto relative overflow-hidden rounded-2xl border backdrop-blur-xl p-4 text-white transition-all animate-in slide-in-from-right-8 fade-in-50 duration-300 ${config.bg} ${config.glow}`}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5">{config.icon}</div>
        <div className="flex-1 min-w-0 pr-2">
          {title && <h4 className={`text-xs font-black uppercase tracking-wider ${config.titleColor}`}>{title}</h4>}
          <p className="text-xs font-medium text-slate-200 leading-snug break-words mt-0.5">{message}</p>
        </div>
        <button
          onClick={onDismiss}
          className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors -mr-1 -mt-1 cursor-pointer"
        >
          <X size={14} />
        </button>
      </div>

      {duration > 0 && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-800/80">
          <div
            className={`h-full transition-all duration-75 ${config.barColor}`}
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  );
}

/**
 * Ultra-Premium Confirm Dialog System (Replaces window.confirm)
 */
export function WFMConfirmModal({
  isOpen,
  title = 'Confirmação',
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  variant = 'danger',
  icon: CustomIcon,
  onConfirm,
  onCancel
}) {
  if (!isOpen) return null;

  const variantStyles = {
    danger: {
      iconBg: 'bg-rose-500/10 text-rose-500 border border-rose-500/20 ring-4 ring-rose-500/10',
      btnBg: 'bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-600/30',
      defaultIcon: <Trash2 size={24} className="text-rose-500" />
    },
    warning: {
      iconBg: 'bg-amber-500/10 text-amber-500 border border-amber-500/20 ring-4 ring-amber-500/10',
      btnBg: 'bg-amber-500 hover:bg-amber-600 text-slate-950 font-black shadow-lg shadow-amber-500/30',
      defaultIcon: <AlertTriangle size={24} className="text-amber-500" />
    },
    primary: {
      iconBg: 'bg-blue-500/10 text-blue-500 border border-blue-500/20 ring-4 ring-blue-500/10',
      btnBg: 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/30',
      defaultIcon: <RotateCcw size={24} className="text-blue-500" />
    }
  }[variant] || {
    iconBg: 'bg-blue-500/10 text-blue-500',
    btnBg: 'bg-blue-600 hover:bg-blue-700 text-white',
    defaultIcon: <HelpCircle size={24} />
  };

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onCancel}
    >
      <div
        className="bg-white rounded-3xl shadow-2xl border border-slate-150 overflow-hidden w-full max-w-md p-6 text-slate-800 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-4">
          <div className={`p-3.5 rounded-2xl shrink-0 ${variantStyles.iconBg}`}>
            {CustomIcon ? <CustomIcon size={24} /> : variantStyles.defaultIcon}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-black text-slate-900 tracking-tight leading-tight">{title}</h3>
            <p className="text-xs font-semibold text-slate-500 mt-2 leading-relaxed">{message}</p>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
          <button
            onClick={onCancel}
            className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-black uppercase tracking-wider text-slate-600 hover:bg-slate-100 hover:text-slate-800 transition-all cursor-pointer"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all active:scale-98 cursor-pointer ${variantStyles.btnBg}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
