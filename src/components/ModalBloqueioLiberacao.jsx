import React from 'react';
import { ShieldAlert, AlertTriangle, CheckCircle2, X, Wrench, ArrowRight, Clock, AlertCircle } from 'lucide-react';

/**
 * Modal Ultra-Premium de Bloqueio de Liberação (Liquid Glass)
 * Bloqueia a liberação para a operação ou envio para validação da frota quando
 * houver defeitos que ainda não foram marcados como RESOLVIDO no checklist.
 */
export default function ModalBloqueioLiberacao({ 
  isOpen, 
  onClose, 
  chamado, 
  defeitosPendentes = [], 
  origem = 'frota', // 'frota' ou 'mecanico'
  onIrParaChecklist 
}) {
  if (!isOpen || !chamado) return null;

  const totalPendentes = defeitosPendentes.length;
  const isMecanico = origem === 'mecanico';
  const placa = chamado.placa || 'N/A';
  const codigoOS = chamado.numero || chamado.codigoChamado || chamado.codigo_chamado || 'OS-' + chamado.id;

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center p-3 sm:p-6 md:p-8 bg-slate-950/80 backdrop-blur-xl animate-in fade-in duration-300">
      {/* Liquid Glass Container */}
      <div className="relative w-full max-w-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl rounded-[2.5rem] shadow-[0_25px_70px_rgba(0,0,0,0.5)] border border-rose-500/30 dark:border-rose-500/20 flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
        
        {/* Ambient Glows */}
        <div className="absolute -top-24 -left-24 w-80 h-80 bg-rose-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-80 h-80 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="relative z-10 p-6 sm:p-7 border-b border-rose-100 dark:border-slate-800/80 flex items-start justify-between gap-4 shrink-0 bg-gradient-to-r from-rose-50/70 via-white/50 to-amber-50/50 dark:from-rose-950/30 dark:via-slate-900/50 dark:to-amber-950/20 backdrop-blur-md">
          <div className="flex items-center gap-4">
            <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-rose-500 via-rose-600 to-amber-600 text-white flex items-center justify-center shadow-lg shadow-rose-500/30 shrink-0 animate-pulse">
              <ShieldAlert size={28} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="px-3 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                  Validação de Segurança
                </span>
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  Placa: {placa}
                </span>
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                  • {codigoOS}
                </span>
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                {isMecanico ? 'Solicitação Bloqueada' : 'Liberação Bloqueada'}
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-rose-100 dark:hover:bg-rose-950/50 text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-300 flex items-center justify-center transition-all shrink-0 cursor-pointer"
            title="Fechar aviso"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="relative z-10 p-6 sm:p-7 overflow-y-auto max-h-[60vh] space-y-5">
          {/* Alerta de Regra Corporativa */}
          <div className="p-4 sm:p-5 rounded-2xl bg-rose-50/80 dark:bg-rose-950/40 border border-rose-200/80 dark:border-rose-800/60 flex items-start gap-3.5">
            <AlertTriangle className="text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" size={20} />
            <div className="space-y-1">
              <h4 className="text-xs font-black text-rose-950 dark:text-rose-200 uppercase tracking-wider">
                100% dos Defeitos Devem Estar Concluídos
              </h4>
              <p className="text-xs text-rose-800/90 dark:text-rose-300 font-medium leading-relaxed">
                {isMecanico
                  ? `Para solicitar a liberação do veículo para a Análise da Frota, todos os defeitos reportados devem ser marcados como resolvidos no checklist técnico após a realização dos reparos.`
                  : `Não é permitido colocar o veículo no status "Liberado Operação" enquanto houver defeitos pendentes de resolução no checklist da ordem de serviço.`}
              </p>
            </div>
          </div>

          {/* Lista de Defeitos Pendentes */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-slate-700 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
                <Wrench size={14} className="text-amber-500" />
                Defeito(s) Pendente(s) ({totalPendentes})
              </span>
              <span className="text-[11px] font-bold text-rose-600 dark:text-rose-400">
                Ação Obrigatória
              </span>
            </div>

            <div className="space-y-2.5">
              {defeitosPendentes.map((def, idx) => (
                <div 
                  key={def.id || idx}
                  className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 flex items-start justify-between gap-3 transition-all hover:border-amber-400/50"
                >
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-[10px] font-black uppercase tracking-wider">
                        {def.categoria || 'Defeito Reportado'}
                      </span>
                      {def.isImpeditivo && (
                        <span className="px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 text-[10px] font-black uppercase tracking-wider">
                          Impeditivo
                        </span>
                      )}
                      {def.numeroSolicitacao && (
                        <span className="text-[10px] font-bold text-slate-400">
                          {def.numeroSolicitacao}
                        </span>
                      )}
                    </div>

                    <p className="text-xs font-bold text-slate-800 dark:text-slate-100 leading-snug">
                      {def.descricao || def.defeitoEncontrado || 'Descrição não informada'}
                    </p>
                  </div>

                  <div className="shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800 text-[10px] font-black uppercase tracking-wider">
                    <Clock size={12} className="animate-spin" />
                    Pendente
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="relative z-10 p-5 sm:p-6 border-t border-slate-200/60 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 backdrop-blur-md flex flex-col-reverse sm:flex-row items-center justify-end gap-3 shrink-0">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-3.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-black text-xs uppercase tracking-wider rounded-2xl transition-all cursor-pointer"
          >
            Voltar
          </button>

          {onIrParaChecklist && (
            <button
              onClick={() => {
                onClose();
                onIrParaChecklist(chamado);
              }}
              className="w-full sm:w-auto px-7 py-3.5 bg-gradient-to-r from-rose-600 via-rose-700 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg shadow-rose-600/25 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Wrench size={16} /> Ir para o Checklist de Defeitos <ArrowRight size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
