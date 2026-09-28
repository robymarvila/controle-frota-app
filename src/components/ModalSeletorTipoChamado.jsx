import React from 'react';
import { Wrench, Droplets, X, ChevronRight, Sparkles, AlertCircle } from 'lucide-react';

/**
 * Modal Seletor de Tipo de Chamado
 * Permite ao usuário escolher entre a abertura tradicional de OS
 * ou o novo fluxo especializado de Registro de Nível de Óleo do Motor.
 */
export default function ModalSeletorTipoChamado({
  isOpen,
  onClose,
  onSelectNovoChamado,
  onSelectNivelOleo
}) {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.35)] border border-slate-100 dark:border-slate-800 overflow-hidden flex flex-col animate-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Glow Superior */}
        <div className="absolute top-0 left-0 right-0 h-28 bg-gradient-to-b from-emerald-500/15 via-teal-500/5 to-transparent pointer-events-none" />

        {/* Header */}
        <div className="relative p-6 pb-4 flex items-start justify-between">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 text-[11px] font-black uppercase tracking-wider mb-2">
              <Sparkles size={12} />
              <span>Abertura Operacional</span>
            </div>
            <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
              O que você deseja registrar?
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
              Escolha uma das opções para prosseguir com a solicitação da frota.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Opções */}
        <div className="p-6 pt-2 space-y-3.5">
          {/* Opção 1: Novo Chamado Tradicional */}
          <button
            type="button"
            onClick={() => {
              onClose();
              onSelectNovoChamado();
            }}
            className="group w-full p-4 rounded-2xl border-2 border-slate-200/90 dark:border-slate-800 hover:border-emerald-500 dark:hover:border-emerald-500 bg-white dark:bg-slate-850 hover:bg-emerald-50/30 dark:hover:bg-emerald-950/20 transition-all duration-200 flex items-center gap-4 text-left shadow-sm hover:shadow-md active:scale-[0.99]"
          >
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-emerald-500/25 group-hover:scale-105 transition-transform duration-200">
              <Wrench size={24} />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">
                  Opção 1
                </span>
                <h4 className="text-base font-black text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                  Novo Chamado
                </h4>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1 leading-relaxed line-clamp-2">
                Abertura de ordem de serviço E-CAR para oficina, mecânica, avarias ou manutenções gerais.
              </p>
            </div>

            <ChevronRight size={20} className="text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-1 transition-all shrink-0" />
          </button>

          {/* Opção 2: Óleo do Motor */}
          <button
            type="button"
            onClick={() => {
              onClose();
              onSelectNivelOleo();
            }}
            className="group w-full p-4 rounded-2xl border-2 border-slate-200/90 dark:border-slate-800 hover:border-amber-500 dark:hover:border-amber-500 bg-white dark:bg-slate-850 hover:bg-amber-50/40 dark:hover:bg-amber-950/20 transition-all duration-200 flex items-center gap-4 text-left shadow-sm hover:shadow-md active:scale-[0.99]"
          >
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-amber-500/25 group-hover:scale-105 transition-transform duration-200">
              <Droplets size={24} />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 uppercase tracking-wider">
                  Opção 2
                </span>
                <h4 className="text-base font-black text-slate-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                  Óleo do Motor
                </h4>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1 leading-relaxed line-clamp-2">
                Aferição preventiva da vareta de óleo, registro fotográfico das evidências e validação do hodômetro.
              </p>
            </div>

            <ChevronRight size={20} className="text-slate-400 group-hover:text-amber-600 group-hover:translate-x-1 transition-all shrink-0" />
          </button>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-850/60 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
          <span className="flex items-center gap-1.5 font-medium">
            <AlertCircle size={13} className="text-slate-400" />
            Ambos os registros integram o fluxo oficial da frota
          </span>
          <button
            type="button"
            onClick={onClose}
            className="font-bold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white px-3 py-1.5 rounded-lg hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
