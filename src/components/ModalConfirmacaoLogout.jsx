import React from 'react';
import { LogOut, ShieldAlert, X } from 'lucide-react';

export default function ModalConfirmacaoLogout({ isOpen, onClose, onConfirm, currentUser }) {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xl animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/90 rounded-[2.5rem] shadow-2xl p-6 sm:p-7 text-center overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Subtle Ambient Decorative Gradient in Background */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-rose-500/15 dark:bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-amber-500/15 dark:bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button Top-Right */}
        <button 
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          title="Fechar"
        >
          <X size={18} />
        </button>

        {/* Floating Glowing Icon */}
        <div className="relative mb-4 mt-2 flex justify-center">
          <div className="absolute inset-0 w-20 h-20 mx-auto bg-gradient-to-tr from-rose-500/30 to-amber-500/20 rounded-3xl blur-xl animate-pulse" />
          <div className="relative w-18 h-18 rounded-3xl bg-gradient-to-br from-rose-500 via-rose-600 to-rose-700 text-white flex items-center justify-center shadow-xl shadow-rose-600/30 border border-rose-400/40">
            <LogOut size={32} className="translate-x-0.5" />
          </div>
        </div>

        {/* Badge & Title */}
        <div className="space-y-1.5 mb-5">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400 text-[10px] font-black uppercase tracking-widest border border-rose-200/60 dark:border-rose-800/60 shadow-xs">
            <ShieldAlert size={12} /> Encerramento de Sessão
          </span>
          <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Deseja realmente sair?
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed max-w-xs mx-auto">
            Sua sessão será encerrada com segurança no dispositivo.
          </p>
        </div>

        {/* User Card */}
        <div className="bg-slate-50/90 dark:bg-slate-950/70 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-3.5 flex items-center gap-3 text-left w-full mb-6 shadow-inner">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white font-black text-sm flex items-center justify-center shadow-sm shrink-0 uppercase border border-white/20">
            {currentUser?.nome?.charAt(0) || 'U'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-black text-slate-800 dark:text-slate-100 truncate">{currentUser?.nome || 'Usuário'}</p>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-mono truncate">{currentUser?.login || currentUser?.perfil || 'Conta Conectada'}</p>
          </div>
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/60 shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[9px] font-black uppercase">Ativo</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3 w-full">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-3.5 px-3 rounded-2xl font-black text-xs text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 transition-all active:scale-95 cursor-pointer shadow-xs"
          >
            Continuar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="w-full py-3.5 px-3 rounded-2xl font-black text-xs text-white bg-gradient-to-r from-rose-600 via-rose-600 to-red-700 hover:from-rose-500 hover:to-rose-600 transition-all active:scale-95 shadow-lg shadow-rose-600/30 flex items-center justify-center gap-1.5 cursor-pointer border border-rose-500/30"
          >
            <LogOut size={15} />
            Sair Agora
          </button>
        </div>
      </div>
    </div>
  );
}
