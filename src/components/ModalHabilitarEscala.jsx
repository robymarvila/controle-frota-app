import React, { useState } from 'react';
import { X, Calendar, Clock, CheckCircle2, Trash2, ShieldCheck, User } from 'lucide-react';
import { supabase } from '../supabaseClient';

export default function ModalHabilitarEscala({
  auditor,
  dateStr,
  existingEscala,
  currentUser,
  onSuccess,
  onClose
}) {
  const [shiftStart, setShiftStart] = useState(existingEscala?.shift_start || '08:00');
  const [shiftEnd, setShiftEnd] = useState(existingEscala?.shift_end || '18:00');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const formattedDate = dateStr 
    ? new Date(dateStr + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })
    : 'Data';

  const auditorLogin = (auditor.login || auditor.nome || '').toLowerCase().trim();

  const handleSave = async () => {
    if (!shiftStart || !shiftEnd) {
      alert('Por favor, informe os horários de início e término da escala.');
      return;
    }
    setIsSubmitting(true);
    try {
      const payload = {
        auditor: auditorLogin,
        date: dateStr,
        shift_start: shiftStart,
        shift_end: shiftEnd,
        created_by: currentUser?.nome || 'Operador WFM',
        created_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('wfm_calendario_escalas')
        .upsert(payload, { onConflict: 'auditor, date' });

      if (error) throw error;

      if (onSuccess) onSuccess(payload);
      onClose();
    } catch (err) {
      console.error('Erro ao salvar escala:', err);
      alert('Erro ao salvar escala no Supabase: ' + (err.message || 'Falha de comunicação.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Tem certeza que deseja desabilitar / remover a escala deste dia?')) return;
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('wfm_calendario_escalas')
        .delete()
        .eq('auditor', auditorLogin)
        .eq('date', dateStr);

      if (error) throw error;

      if (onSuccess) onSuccess({ deleted: true, auditor: auditorLogin, date: dateStr });
      onClose();
    } catch (err) {
      console.error('Erro ao excluir escala:', err);
      alert('Erro ao remover escala: ' + (err.message || 'Falha de comunicação.'));
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
            <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shadow-sm">
              <Calendar size={20} />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 leading-tight">
                {existingEscala ? 'Editar Escala de Trabalho' : 'Habilitar Escala de Trabalho'}
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
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-sm">
              {auditor.nome?.charAt(0) || 'A'}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-900 truncate">{auditor.nome}</p>
              <p className="text-[11px] font-mono text-slate-500 truncate">{auditor.login}</p>
            </div>
          </div>

          {/* Horários */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-black text-slate-700 uppercase tracking-wider block mb-1.5 flex items-center gap-1">
                <Clock size={14} className="text-blue-600" /> Início da Escala
              </label>
              <input
                type="time"
                value={shiftStart}
                onChange={(e) => setShiftStart(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-mono font-bold text-slate-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all shadow-sm"
              />
            </div>

            <div>
              <label className="text-xs font-black text-slate-700 uppercase tracking-wider block mb-1.5 flex items-center gap-1">
                <Clock size={14} className="text-blue-600" /> Término da Escala
              </label>
              <input
                type="time"
                value={shiftEnd}
                onChange={(e) => setShiftEnd(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-mono font-bold text-slate-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all shadow-sm"
              />
            </div>
          </div>

          {/* Presets Rápidos */}
          <div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-2">
              Horários Padrão (Presets)
            </span>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: '08:00 - 18:00', start: '08:00', end: '18:00' },
                { label: '07:00 - 17:00', start: '07:00', end: '17:00' },
                { label: '08:00 - 17:00', start: '08:00', end: '17:00' },
              ].map(p => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => {
                    setShiftStart(p.start);
                    setShiftEnd(p.end);
                  }}
                  className="px-2.5 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 text-xs font-mono font-bold text-slate-700 transition-all"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-200/80 text-[11px] text-blue-800 flex items-start gap-2">
            <ShieldCheck size={16} className="shrink-0 text-blue-600 mt-0.5" />
            <span>
              Ao habilitar a escala, o auditor estará autorizado e visível no painel do WFM Desktop e poderá registrar início de turno no aplicativo móvel nesta data.
            </span>
          </div>
        </div>

        {/* Footer com Ações */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          {existingEscala ? (
            <button
              onClick={handleDelete}
              disabled={isSubmitting}
              className="px-3.5 py-2 rounded-xl text-rose-600 hover:bg-rose-50 border border-rose-200 text-xs font-bold transition-all flex items-center gap-1.5 disabled:opacity-50"
            >
              <Trash2 size={14} /> Desabilitar
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
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-md shadow-blue-500/20 flex items-center gap-1.5 disabled:opacity-50"
            >
              <CheckCircle2 size={15} />
              {isSubmitting ? 'Salvando...' : 'Salvar Escala'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
