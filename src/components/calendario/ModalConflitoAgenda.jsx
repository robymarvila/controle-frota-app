import React from 'react';
import { AlertTriangle, CalendarPlus, X, CopyPlus, ArrowRightLeft } from 'lucide-react';

export default function ModalConflitoAgenda({ 
    isOpen, 
    conflicts, // Array de atividades conflitantes
    newActivity, // { tipo, assunto }
    onClose, 
    onAddBoth, 
    onReplace 
}) {
    if (!isOpen || conflicts.length === 0) return null;

    // Pega as datas distintas que deram conflito para exibir um resumo
    const datasConflito = [...new Set(conflicts.map(c => c.data_programada))];
    const qtdAntigos = conflicts.length;

    return (
        <>
            <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[60] animate-in fade-in duration-300" onClick={onClose}></div>
            <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl bg-slate-900 text-white rounded-2xl shadow-2xl z-[70] overflow-hidden border border-slate-700 animate-in fade-in zoom-in-95 duration-300">
                
                {/* Header de Alerta */}
                <div className="bg-amber-500/10 border-b border-amber-500/20 p-5 flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0 ring-4 ring-amber-500/10">
                        <AlertTriangle size={24} className="text-amber-500" />
                    </div>
                    <div className="flex-grow">
                        <h3 className="text-xl font-extrabold text-amber-500 tracking-tight">Conflito de Agendamento</h3>
                        <p className="text-sm text-slate-300 font-medium mt-1">
                            Você está tentando agendar uma atividade em dias ou turnos que já possuem programação ativa.
                        </p>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition"><X size={20} /></button>
                </div>

                {/* Exibição Sobreposta (Visual Premium) */}
                <div className="p-6 relative bg-slate-800/50">
                    <div className="flex justify-between items-center relative gap-6">
                        
                        {/* Evento Antigo (Fundo / Esquerda) */}
                        <div className="w-1/2 bg-slate-800 border border-slate-700 rounded-xl p-4 opacity-80 shadow-inner relative z-0 transform scale-95 origin-right">
                            <span className="absolute -top-3 left-4 bg-slate-700 text-slate-300 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">Eventos Atuais</span>
                            <div className="mt-2 text-xs font-bold text-slate-400 mb-1">{qtdAntigos} atividade(s) em {datasConflito.length} dia(s)</div>
                            <div className="font-bold text-slate-200 text-sm truncate">{conflicts[0]?.tipo}</div>
                            <div className="text-slate-400 text-xs truncate mt-0.5">{conflicts[0]?.assunto}</div>
                            {qtdAntigos > 1 && <div className="text-[10px] text-slate-500 italic mt-2">+ outras programações...</div>}
                        </div>

                        {/* Ícone de Conflito no Meio */}
                        <div className="w-10 h-10 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center absolute left-1/2 -translate-x-1/2 z-30 shadow-xl">
                            <span className="text-slate-400 font-extrabold text-xs">VS</span>
                        </div>

                        {/* Novo Evento (Frente / Direita) */}
                        <div className="w-1/2 bg-blue-600 border border-blue-500 rounded-xl p-4 shadow-2xl relative z-10 transform scale-105 origin-left">
                            <span className="absolute -top-3 left-4 bg-blue-400 text-blue-950 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider shadow-sm">Sua Nova Atividade</span>
                            <div className="mt-2 text-xs font-bold text-blue-200 mb-1">A ser programada:</div>
                            <div className="font-extrabold text-white text-base truncate pr-2">{newActivity?.tipo}</div>
                            <div className="text-blue-100 text-xs truncate mt-1 pr-2">{newActivity?.assunto}</div>
                        </div>

                    </div>
                </div>

                {/* Ações */}
                <div className="p-5 border-t border-slate-800 bg-slate-900 flex flex-col sm:flex-row gap-3">
                    <button 
                        onClick={onAddBoth} 
                        className="flex-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-bold py-3 px-4 rounded-xl text-sm transition-all flex flex-col items-center justify-center gap-1 group"
                    >
                        <div className="flex items-center gap-2"><CopyPlus size={18} className="text-slate-400 group-hover:text-white" /> Manter Ambos</div>
                        <span className="text-[10px] text-slate-400 font-normal">Irá adicionar à programação existente</span>
                    </button>
                    
                    <button 
                        onClick={onReplace} 
                        className="flex-1 bg-amber-500 hover:bg-amber-600 text-amber-950 border border-amber-400 font-bold py-3 px-4 rounded-xl text-sm transition-all shadow-[0_0_15px_rgba(245,158,11,0.3)] hover:shadow-[0_0_25px_rgba(245,158,11,0.5)] flex flex-col items-center justify-center gap-1"
                    >
                        <div className="flex items-center gap-2"><ArrowRightLeft size={18} /> Substituir Atual</div>
                        <span className="text-[10px] text-amber-900/80 font-normal">Apaga os velhos e salva o novo</span>
                    </button>
                </div>

            </div>
        </>
    );
}
