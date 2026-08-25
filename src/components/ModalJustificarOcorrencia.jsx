import React, { useState } from 'react';
import { X, AlertCircle, FileText, CheckCircle2, Trash2, Calendar, User, Info, Check } from 'lucide-react';
import { supabase } from '../supabaseClient';

const OCORRENCIAS_TIPOS = [
  { id: 'FOLGA', label: 'Folga Compensatória / Escala', icon: '🌴', badgeClass: 'bg-slate-100 text-slate-700 border-slate-300' },
  { id: 'FALTA', label: 'Falta Não Justificada', icon: '❌', badgeClass: 'bg-rose-50 text-rose-700 border-rose-200' },
  { id: 'ATESTADO', label: 'Atestado Médico / Licença', icon: '🩺', badgeClass: 'bg-amber-50 text-amber-700 border-amber-200' },
  { id: 'TREINAMENTO', label: 'Treinamento / Reunião Interna', icon: '🎓', badgeClass: 'bg-blue-50 text-blue-700 border-blue-200' },
  { id: 'OUTROS', label: 'Outros (Descrever)', icon: '📝', badgeClass: 'bg-purple-50 text-purple-700 border-purple-200' },
];

export default function ModalJustificarOcorrencia({
  auditor,
  dateStr,
  existingOcorrencia,
  currentUser,
  onSuccess,
  onClose
}) {
  const [tipo, setTipo] = useState(existingOcorrencia?.tipo || 'FOLGA');
  const [descricao, setDescricao] = useState(existingOcorrencia?.descricao || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const formattedDate = dateStr 
    ? new Date(dateStr + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })
    : 'Data';

  const auditorLogin = (auditor.login || auditor.nome || '').toLowerCase().trim();

  const handleSave = async () => {
    if (tipo === 'OUTROS' && !descricao.trim()) {
      alert('Por favor, descreva o motivo da ocorrência.');
      return;
    }

    setIsSubmitting(true);
    try {
      const ocorrenciaData = {
        auditor: auditorLogin,
        date: dateStr,
        tipo,
        descricao: descricao.trim(),
        registrado_por: currentUser?.nome || 'Operador WFM',
        registrado_em: new Date().toISOString()
      };

      // Salvar em cache local de ocorrências
      try {
        const cacheKey = `fleet_ocorrencias_auditores`;
        const stored = JSON.parse(localStorage.getItem(cacheKey) || '[]');
        const filtered = stored.filter(o => !(o.auditor === auditorLogin && o.date === dateStr));
        filtered.push(ocorrenciaData);
        localStorage.setItem(cacheKey, JSON.stringify(filtered));
      } catch (e) {}

      // Tentar salvar no Supabase (se a tabela ou campo existir)
      try {
        await supabase
          .from('wfm_calendario_escalas')
          .update({ observacao: `[OCORRENCIA: ${tipo}] ${descricao.trim()}` })
          .eq('auditor', auditorLogin)
          .eq('date', dateStr);
      } catch (e) {}

      if (onSuccess) onSuccess(ocorrenciaData);
      onClose();
    } catch (err) {
      console.error('Erro ao registrar ocorrência:', err);
      alert('Erro ao registrar ocorrência: ' + (err.message || 'Falha de comunicação.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClear = async () => {
    if (!window.confirm('Tem certeza que deseja remover esta ocorrência/justificativa?')) return;
    setIsSubmitting(true);
    try {
      try {
        const cacheKey = `fleet_ocorrencias_auditores`;
        const stored = JSON.parse(localStorage.getItem(cacheKey) || '[]');
        const filtered = stored.filter(o => !(o.auditor === auditorLogin && o.date === dateStr));
        localStorage.setItem(cacheKey, JSON.stringify(filtered));
      } catch (e) {}

      try {
        await supabase
          .from('wfm_calendario_escalas')
          .update({ observacao: null })
          .eq('auditor', auditorLogin)
          .eq('date', dateStr);
      } catch (e) {}

      if (onSuccess) onSuccess({ deleted: true, auditor: auditorLogin, date: dateStr });
      onClose();
    } catch (err) {
      console.error('Erro ao limpar ocorrência:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[150] flex items-center justify-center p-4 animate-in fade-in zoom-in-95">
      <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl border border-slate-200 flex flex-col">
        {/* Header Claro */}
        <div className="p-5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shadow-sm">
              <FileText size={20} />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 leading-tight">
                Registrar Ocorrência / Justificativa
              </h3>
              <p className="text-xs font-semibold text-slate-500 capitalize">
                {formattedDate}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-200/60 rounded-xl text-slate-400 hover:text-slate-700 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Corpo do Formulário */}
        <div className="p-6 space-y-5 select-text">
          {/* Card de Identificação */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold text-sm">
              {auditor.nome?.charAt(0) || 'A'}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-900 truncate">{auditor.nome}</p>
              <p className="text-[11px] font-mono text-slate-500 truncate">{auditor.login}</p>
            </div>
          </div>

          {/* Seleção do Tipo de Ocorrência */}
          <div>
            <label className="text-xs font-black text-slate-700 uppercase tracking-wider block mb-2">
              Tipo de Ocorrência
            </label>
            <div className="grid grid-cols-1 gap-2">
              {OCORRENCIAS_TIPOS.map((item) => {
                const isSelected = tipo === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setTipo(item.id)}
                    className={`w-full p-3 rounded-2xl border text-left flex items-center justify-between transition-all ${
                      isSelected
                        ? 'border-amber-500 bg-amber-50/80 ring-2 ring-amber-400/30 text-amber-950 font-bold'
                        : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-medium'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-base">{item.icon}</span>
                      <span className="text-xs">{item.label}</span>
                    </div>
                    {isSelected && (
                      <div className="w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center">
                        <Check size={12} strokeWidth={3} />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Descrição / Observações */}
          <div>
            <label className="text-xs font-black text-slate-700 uppercase tracking-wider block mb-1.5">
              Observação / Descrição da Justificativa {tipo === 'OUTROS' && <span className="text-rose-500">*</span>}
            </label>
            <textarea
              rows={3}
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Descreva detalhes adicionais, número de atestado ou motivo operacional..."
              className="w-full p-3 bg-white border border-slate-300 rounded-2xl text-xs text-slate-800 focus:border-amber-500 focus:ring-2 focus:ring-amber-100 outline-none transition-all resize-none shadow-sm"
            />
          </div>
        </div>

        {/* Footer com Ações */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          {existingOcorrencia ? (
            <button
              onClick={handleClear}
              disabled={isSubmitting}
              className="px-3.5 py-2 rounded-xl text-rose-600 hover:bg-rose-50 border border-rose-200 text-xs font-bold transition-all flex items-center gap-1.5 disabled:opacity-50"
            >
              <Trash2 size={14} /> Remover Ocorrência
            </button>
          ) : (
            <div></div>
          )}

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-200/60 text-xs font-bold transition-all"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition-all shadow-md shadow-amber-500/20 flex items-center gap-1.5 disabled:opacity-50"
            >
              <CheckCircle2 size={15} />
              {isSubmitting ? 'Salvando...' : 'Registrar Ocorrência'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
