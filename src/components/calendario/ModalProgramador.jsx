import React, { useState } from 'react';
import { CalendarPlus, X, Info, UploadCloud } from 'lucide-react';

export default function ModalProgramador({
  isOpen,
  onClose,
  onSave,
  isAdminOrCoord,
  preSelectedDate
}) {
  const [selectedDates, setSelectedDates] = React.useState([]);
  const [selectedShifts, setSelectedShifts] = React.useState(['manha']);
  const [tipo, setTipo] = React.useState('DDS');
  const [regiao, setRegiao] = React.useState('');
  const [assunto, setAssunto] = React.useState('');
  const [obs, setObs] = React.useState('');
  const [file, setFile] = React.useState(null);

  const getStrDate = (y, m, d) => `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
  const limitDate = new Date();
  const minDateStr = getStrDate(limitDate.getFullYear(), limitDate.getMonth(), limitDate.getDate());

  React.useEffect(() => {
    if (isOpen) {
      if (preSelectedDate) {
        if (preSelectedDate < minDateStr) {
          alert("Não é permitido agendar atividades para dias passados.");
          setSelectedDates([]);
        } else {
          setSelectedDates([preSelectedDate]);
        }
      } else {
        setSelectedDates([]);
      }
      setSelectedShifts(['manha']);
      setTipo('DDS');
      setRegiao('');
      setAssunto('');
      setObs('');
      setFile(null);
    }
  }, [isOpen, preSelectedDate]);
  
  if (!isOpen || !isAdminOrCoord) return null;

  if (!isOpen || !isAdminOrCoord) return null;

  const handleDateChange = (e) => {
    const val = e.target.value;
    if (val) {
        if (val < minDateStr) {
            alert("Não é permitido agendar atividades para dias passados.");
            e.target.value = '';
            return;
        }
        if (!selectedDates.includes(val)) {
          setSelectedDates([...selectedDates, val]);
        }
        e.target.value = '';
    }
  };

  const removeDate = (idx) => {
    setSelectedDates(selectedDates.filter((_, i) => i !== idx));
  };

  const toggleShift = (shift) => {
    if (selectedShifts.includes(shift)) {
      if (selectedShifts.length > 1) {
        setSelectedShifts(selectedShifts.filter(s => s !== shift));
      }
    } else {
      setSelectedShifts([...selectedShifts, shift]);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (selectedDates.length === 0 || selectedShifts.length === 0) {
      alert("Selecione no mínimo uma data e um turno ativo.");
      return;
    }
    if (!regiao) {
      alert("Selecione a Região (Norte ou Leste).");
      return;
    }

    onSave({
      dates: selectedDates,
      shifts: selectedShifts,
      regiao,
      tipo,
      assunto,
      obs,
      file
    });
  };

  return (
    <>
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50" onClick={onClose}></div>
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl bg-white rounded-2xl shadow-2xl z-50 flex flex-col overflow-hidden max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
        <div className="bg-blue-950 text-white p-5 flex justify-between items-center">
            <div className="flex items-center gap-3">
                <CalendarPlus size={22} />
                <h3 className="text-lg font-extrabold">Programar Atividade Operacional</h3>
            </div>
            <button onClick={onClose} className="text-white/80 hover:text-white transition"><X size={20} /></button>
        </div>
        <div className="p-6 overflow-y-auto flex-grow bg-slate-50">
            <form className="space-y-5" onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Datas Planejadas</label>
                        <input type="date" min={minDateStr} onChange={handleDateChange} className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-600 outline-none" />
                        <div className="flex flex-wrap gap-2 mt-2">
                          {selectedDates.map((d, idx) => {
                            const [y, m, day] = d.split('-');
                            return (
                              <span key={d} className="bg-blue-900 text-white px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5">
                                {day}/{m} 
                                <button type="button" onClick={() => removeDate(idx)} className="hover:text-rose-300"><X size={12} /></button>
                              </span>
                            )
                          })}
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Turnos Vinculados</label>
                        <div className="flex gap-2">
                            {['manha', 'tarde', 'noite'].map(s => (
                              <button 
                                key={s} 
                                type="button" 
                                onClick={() => toggleShift(s)} 
                                className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-all border capitalize ${selectedShifts.includes(s) ? 'border-blue-900 bg-blue-900 text-white shadow-sm' : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50'}`}
                              >
                                {s}
                              </button>
                            ))}
                        </div>
                        <p className="text-[10px] text-slate-500 mt-1.5 flex items-center"><Info size={12} className="mr-1" />Manhã (06h, 08h, 10h) | Tarde (12h, 14h) | Noite (20h, 22h)</p>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Base / Região</label>
                        <select required value={regiao} onChange={e => setRegiao(e.target.value)} className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-600 outline-none bg-white font-medium text-slate-700">
                            <option value="">Selecione...</option>
                            <option value="Norte">Norte</option>
                            <option value="Leste">Leste</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Tipo de Programa</label>
                        <select value={tipo} onChange={e => setTipo(e.target.value)} className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-600 outline-none bg-white font-medium text-slate-700">
                            <option value="DDS">DDS (Diálogo Diário de Segurança)</option>
                            <option value="Momento ENEL">Momento ENEL</option>
                            <option value="Parada de Segurança">Parada de Segurança</option>
                            <option value="Repasse">Repasse Operacional</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Assunto / Tema</label>
                        <input type="text" required placeholder="Ex: APR" value={assunto} onChange={e => setAssunto(e.target.value)} className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-600 outline-none" />
                    </div>
                </div>
                <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Observações Orientativas (Opcional)</label>
                    <textarea rows="2" placeholder="Instruções adicionais para os líderes de base..." value={obs} onChange={e => setObs(e.target.value)} className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-600 outline-none resize-none"></textarea>
                </div>
                <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Material de Apoio Técnico</label>
                    <div className={`border-2 border-dashed rounded-xl p-5 text-center relative cursor-pointer transition-all ${file ? 'border-emerald-500 bg-emerald-50' : 'border-slate-300 bg-white hover:border-blue-900 hover:bg-slate-50'}`}>
                        <input type="file" accept=".pdf,image/*" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={(e) => setFile(e.target.files[0])} />
                        <UploadCloud size={28} className={`mx-auto mb-2 ${file ? 'text-emerald-500' : 'text-slate-400'}`} />
                        <p className={`text-xs font-bold ${file ? 'text-emerald-700' : 'text-blue-900'}`}>
                          {file ? `Anexado: ${file.name}` : 'Clique para anexar PDF ou Mídia instrutiva'}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-1">Formatos aceitos: PDF, PNG, JPG (Máx. 10MB)</p>
                    </div>
                </div>
                <div className="pt-4 mt-2 border-t border-slate-200 flex justify-end gap-3">
                    <button type="button" onClick={onClose} className="bg-slate-200 text-slate-700 hover:bg-slate-300 font-bold py-2.5 px-5 rounded-lg text-sm transition">Cancelar</button>
                    <button type="submit" className="bg-blue-900 text-white hover:bg-slate-800 font-bold py-2.5 px-6 rounded-lg text-sm transition shadow-md">Salvar Programação</button>
                </div>
            </form>
        </div>
      </div>
    </>
  );
}
