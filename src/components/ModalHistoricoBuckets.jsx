import React from 'react';
import { X, History, PlusCircle, Power, Trash2, Edit3, ArrowUpDown } from 'lucide-react';

export default function ModalHistoricoBuckets({ history = [], onClose }) {
  const getActionBadge = (action) => {
    const act = String(action || '').toUpperCase();
    if (act.includes('CRIAC') || act.includes('NOVO')) {
      return <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-600 border border-emerald-200 text-[10px] font-black uppercase flex items-center gap-1"><PlusCircle size={12}/> Criou</span>;
    }
    if (act.includes('INATIV')) {
      return <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-600 border border-amber-200 text-[10px] font-black uppercase flex items-center gap-1"><Power size={12}/> Inativou</span>;
    }
    if (act.includes('REATIV')) {
      return <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-600 border border-blue-200 text-[10px] font-black uppercase flex items-center gap-1"><Power size={12}/> Reativou</span>;
    }
    if (act.includes('EXCLU')) {
      return <span className="px-2 py-0.5 rounded-md bg-rose-50 text-rose-600 border border-rose-200 text-[10px] font-black uppercase flex items-center gap-1"><Trash2 size={12}/> Excluiu</span>;
    }
    if (act.includes('REORDEN')) {
      return <span className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-600 border border-purple-200 text-[10px] font-black uppercase flex items-center gap-1"><ArrowUpDown size={12}/> Reordenou</span>;
    }
    return <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200 text-[10px] font-black uppercase flex items-center gap-1"><Edit3 size={12}/> {action || 'Alterou'}</span>;
  };

  const formatDate = (iso) => {
    if (!iso) return 'N/A';
    try {
      const d = new Date(iso);
      return d.toLocaleString('pt-BR');
    } catch (e) {
      return iso;
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[90] flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-5 bg-slate-800 text-white flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2">
            <History size={20} className="text-blue-400" />
            <div>
              <h3 className="font-black text-base leading-none">Histórico de Alterações de Buckets</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">Rastreabilidade completa de ações e alterações</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-700 rounded-xl text-slate-300 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-3 bg-slate-50/50">
          {(!history || history.length === 0) ? (
            <div className="text-center py-12 text-slate-400">
              <History size={36} className="mx-auto mb-2 opacity-30" />
              <p className="font-bold text-sm">Nenhum histórico registrado até o momento.</p>
            </div>
          ) : (
            history.map((log, index) => (
              <div key={log.id || index} className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    {getActionBadge(log.acao)}
                    <span className="font-black text-xs text-slate-800">{log.bucket_nome || log.nome || 'Bucket'}</span>
                  </div>
                  <p className="text-xs text-slate-600 font-medium">{log.detalhes || log.observacao || 'Sem detalhes adicionais'}</p>
                </div>
                <div className="text-right shrink-0 text-[11px] space-y-0.5">
                  <span className="font-bold text-slate-700 block">{log.usuario || log.created_by || 'Sistema'}</span>
                  <span className="text-slate-400 font-medium block">{formatDate(log.created_at || log.data)}</span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-100 border-t border-slate-200/60 flex justify-end shrink-0">
          <button onClick={onClose} className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all">
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
