import React, { useState, useMemo } from 'react';
import { X, Activity, Search, ChevronRight, AlertTriangle, Car, Wrench } from 'lucide-react';

const formatarDataBR = (dataString) => {
  if (!dataString) return '--';
  const data = new Date(dataString);
  const dia = String(data.getDate()).padStart(2, '0');
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const ano = data.getFullYear();
  return `${dia}/${mes}/${ano}`;
};

export default function ModalPlacasDetalhe({ rawChamados, vehicles, onClose, onHistoricoClick }) {
  const [periodo, setPeriodo] = useState(30); // 30, 60, 90
  const [expandedPlaca, setExpandedPlaca] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Filtragem e Agrupamento
  const placasStats = useMemo(() => {
    const hoje = new Date();
    let dataCorte = null;
    if (periodo !== 'todos') {
      dataCorte = new Date();
      dataCorte.setDate(hoje.getDate() - Number(periodo));
    }

    const chamadosValidos = (rawChamados || []).filter(c => {
      if (!c.placa) return false;
      if (!dataCorte) return true;
      const dataAb = new Date(c.dataAbertura);
      return dataAb >= dataCorte;
    });

    const agrupado = {};

    chamadosValidos.forEach(c => {
      const placa = (c.placa || '').trim().toUpperCase();
      if (!agrupado[placa]) {
        agrupado[placa] = { placa, total: 0, defeitosRank: {}, chamados: [] };
      }
      agrupado[placa].total += 1;
      agrupado[placa].chamados.push(c);

      const defeito = c.defeitoPrincipal || 'Não Informado';
      if (!agrupado[placa].defeitosRank[defeito]) {
        agrupado[placa].defeitosRank[defeito] = 0;
      }
      agrupado[placa].defeitosRank[defeito] += 1;
    });

    return Object.values(agrupado)
      .sort((a, b) => b.total - a.total)
      .filter(p => p.placa.toUpperCase().includes(searchTerm.toUpperCase()));

  }, [rawChamados, periodo, searchTerm]);

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-50 flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-300">
      <div className="bg-white/95 dark:bg-slate-900/95 shadow-2xl rounded-[2rem] w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden border border-white/20">
        
        {/* HEADER */}
        <div className="px-8 py-6 bg-gradient-to-r from-blue-950 to-indigo-950 flex justify-between items-center text-white shrink-0 shadow-md z-10">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-sm shadow-inner">
              <Activity size={24} className="text-rose-400" />
            </div>
            <div>
              <h2 className="text-2xl font-black tracking-tight">Detalhamento por Placa</h2>
              <p className="text-xs text-indigo-200 font-medium mt-1">Análise de recorrência de defeitos por veículo</p>
            </div>
          </div>
          <button onClick={onClose} className="p-3 bg-white/5 hover:bg-rose-500/80 rounded-full transition-all duration-300 active:scale-95 shadow-sm hover:shadow-rose-500/50">
            <X size={20} />
          </button>
        </div>

        {/* CONTROLS */}
        <div className="p-6 bg-slate-50 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0">
          <div className="relative w-full sm:w-72 group">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-rose-500 transition-colors" />
            <input 
              type="text" 
              placeholder="Buscar placa..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value.toUpperCase())}
              className="w-full pl-11 pr-4 py-3 bg-white rounded-2xl border border-slate-200 outline-none focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10 transition-all font-bold text-slate-700 shadow-sm uppercase"
            />
          </div>

          <div className="flex bg-slate-200/50 p-1 rounded-2xl w-full sm:w-auto overflow-hidden shadow-inner">
            {[30, 60, 90, 'todos'].map(dias => (
              <button 
                key={dias}
                onClick={() => setPeriodo(dias)}
                className={`flex-1 sm:w-20 py-2.5 rounded-xl text-xs font-black transition-all duration-300 ${periodo === dias ? 'bg-white text-rose-600 shadow-md scale-105' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200'}`}
              >
                {dias === 'todos' ? 'Todos' : `${dias} Dias`}
              </button>
            ))}
          </div>
        </div>

        {/* LISTA DE PLACAS */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar bg-slate-50/50">
          {placasStats.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-4 opacity-70">
              <Car size={48} className="text-slate-300" />
              <p className="text-sm font-bold">Nenhuma placa com quebra no período selecionado.</p>
            </div>
          ) : (
            placasStats.map((item, idx) => {
              const isExpanded = expandedPlaca === item.placa;
              const vec = vehicles?.find(v => v.placa === item.placa);

              // Ordena defeitos por ocorrência
              const defeitosOrdenados = Object.entries(item.defeitosRank).sort((a, b) => b[1] - a[1]);

              return (
                <div key={item.placa} className={`bg-white rounded-3xl border transition-all duration-500 overflow-hidden ${isExpanded ? 'border-rose-200 shadow-xl shadow-rose-100/50 ring-1 ring-rose-50' : 'border-slate-100 shadow-sm hover:shadow-md hover:border-slate-200'}`}>
                  
                  {/* HEADER ROW */}
                  <div 
                    onClick={() => setExpandedPlaca(isExpanded ? null : item.placa)}
                    className="p-5 flex items-center justify-between cursor-pointer group"
                  >
                    <div className="flex items-center gap-5">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg transition-colors ${idx === 0 ? 'bg-rose-100 text-rose-600' : idx === 1 ? 'bg-orange-100 text-orange-600' : idx === 2 ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-500'}`}>
                        {idx + 1}º
                      </div>
                      <div>
                        <h3 className="font-black text-slate-800 text-lg group-hover:text-rose-600 transition-colors tracking-wide">{item.placa}</h3>
                        <p className="text-xs font-bold text-slate-400 mt-0.5 flex items-center gap-1">
                          <Car size={12}/> {vec?.marca || 'Desconhecido'} - {vec?.subTipo || 'Sem subtipo'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <span className="block text-2xl font-black text-blue-950 leading-none">{item.total}</span>
                        <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest mt-1 block">Aberturas</span>
                      </div>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center bg-slate-50 text-slate-400 transition-all duration-300 group-hover:bg-rose-50 group-hover:text-rose-500 ${isExpanded ? 'rotate-90 bg-rose-500 text-white shadow-md' : ''}`}>
                        <ChevronRight size={18} />
                      </div>
                    </div>
                  </div>

                  {/* EXPANDED CONTENT */}
                  <div className={`transition-all duration-500 ease-in-out origin-top ${isExpanded ? 'max-h-[800px] opacity-100' : 'max-h-0 opacity-0'}`}>
                    <div className="p-5 pt-0 bg-slate-50/50 border-t border-slate-100">
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-4">
                        
                        {/* RANK DE DEFEITOS DA PLACA */}
                        <div>
                          <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
                            <Wrench size={14}/> Principais Defeitos (Macro)
                          </h4>
                          <div className="space-y-4">
                            {defeitosOrdenados.map(([def, qtd], dIdx) => {
                              const perc = ((qtd / item.total) * 100).toFixed(0);
                              return (
                                <div key={def} className="animate-in slide-in-from-left-2 duration-300" style={{ animationDelay: `${dIdx * 50}ms`}}>
                                  <div className="flex justify-between items-end mb-1">
                                    <span className="text-xs font-bold text-slate-600 uppercase tracking-wide truncate pr-2">{def}</span>
                                    <span className="text-[10px] font-black text-slate-400">{qtd} ocorrências</span>
                                  </div>
                                  <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                                    <div className="h-full rounded-full bg-gradient-to-r from-amber-400 to-rose-400" style={{ width: `${perc}%` }}></div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* AÇÕES / INFORMAÇÕES EXTRAS */}
                        <div className="flex flex-col justify-center gap-4 border-t md:border-t-0 md:border-l border-slate-200 md:pl-8 pt-4 md:pt-0">
                           <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
                             <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                               <Activity size={20} />
                             </div>
                             <div>
                               <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Situação Atual</p>
                               <p className={`text-sm font-black mt-0.5 ${vec?.situacao === 'PARADO' ? 'text-rose-600' : 'text-emerald-600'}`}>{vec?.situacao || 'RODANDO'}</p>
                             </div>
                           </div>
                           
                           <button 
                             onClick={(e) => { e.stopPropagation(); if(onHistoricoClick) onHistoricoClick(item.placa); }}
                             className="w-full py-4 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 font-black rounded-2xl transition-colors border border-indigo-100 flex items-center justify-center gap-2 group shadow-sm active:scale-95"
                           >
                             <Search size={18} className="group-hover:scale-110 transition-transform"/>
                             Ver Histórico Completo
                           </button>
                        </div>

                      </div>

                    </div>
                  </div>

                </div>
              );
            })
          )}
        </div>

      </div>
    </div>
  );
}
