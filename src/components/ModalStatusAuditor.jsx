import React from 'react';
import { X, UserCheck } from 'lucide-react';
import StatusAuditoresView from './StatusAuditoresView';

export default function ModalStatusAuditor({ auditor, initialDate, onClose, currentUser }) {
  if (!auditor) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[120] flex items-center justify-center p-0 sm:p-4 animate-in fade-in zoom-in-95 select-text">
      <div className="bg-white rounded-none sm:rounded-3xl w-full max-w-7xl h-dvh sm:h-[94vh] overflow-hidden shadow-2xl border border-slate-200 flex flex-col relative">
        {/* Header com botão de fechar */}
        <div className="h-14 bg-slate-50 border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between shrink-0 pt-safe sm:pt-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center shadow-xs shrink-0">
              <UserCheck size={18} />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-black text-slate-900 leading-none truncate">
                Vida do Auditor — {auditor.nome || auditor.login}
              </h3>
              <p className="text-[10px] font-bold text-slate-500 mt-0.5 truncate">
                Painel individual de status, escalas, trajetos e telemetria
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-200/60 rounded-xl text-slate-400 hover:text-slate-700 transition-colors shrink-0"
          >
            <X size={20} />
          </button>
        </div>

        {/* Corpo da Visão */}
        <div className="flex-1 overflow-y-auto bg-slate-50 pb-safe">
          <StatusAuditoresView 
            currentUser={currentUser} 
            activeRegional="Todas" 
            initialAuditor={auditor}
            initialDate={initialDate}
          />
        </div>
      </div>
    </div>
  );
}
