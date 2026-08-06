import React, { useState, useMemo } from 'react';
import { X, User, Search, ChevronRight, Calendar, AlertTriangle, Activity, Car, Wrench } from 'lucide-react';

const formatarDataBR = (dataString) => {
  if (!dataString) return '--';
  const data = new Date(dataString);
  const dia = String(data.getDate()).padStart(2, '0');
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const ano = data.getFullYear();
  return `${dia}/${mes}/${ano}`;
};

export default function ModalMotoristasDetalhe({ rawChamados, vehicles, onClose, onPlacaClick }) {
  const [periodo, setPeriodo] = useState(60); // 30, 60, 90
  const [expandedMotorista, setExpandedMotorista] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Filtragem e Agrupamento
  const motoristasStats = useMemo(() => {
    const hoje = new Date();
    const dataCorte = new Date();
    dataCorte.setDate(hoje.getDate() - periodo);

    const chamadosValidos = (rawChamados || []).filter(c => {
      if (!c.motorista || c.motorista === 'OUTRO') return false;
      const dataAb = new Date(c.dataAbertura);
      return dataAb >= dataCorte;
    });

    const agrupado = {};

    chamadosValidos.forEach(c => {
      const mot = c.motorista;
      if (!agrupado[mot]) {
        agrupado[mot] = { motorista: mot, total: 0, placas: {}, chamados: [] };
      }
      agrupado[mot].total += 1;
      agrupado[mot].chamados.push(c);

      if (!agrupado[mot].placas[c.placa]) {
        agrupado[mot].placas[c.placa] = 0;
      }
      agrupado[mot].placas[c.placa] += 1;
    });

    return Object.values(agrupado)
      .sort((a, b) => b.total - a.total)
      .filter(m => m.motorista.toLowerCase().includes(searchTerm.toLowerCase()));

  }, [rawChamados, periodo, searchTerm]);

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-50 flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-300">
      <div className="bg-white/95 dark:bg-slate-900/95 shadow-2xl rounded-[2rem] w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden border border-white/20">
        
        {/* HEADER */}
        <div className="px-8 py-6 bg-gradient-to-r from-blue-950 to-indigo-950 flex justify-between items-center text-white shrink-0 shadow-md z-10">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-sm shadow-inner">
              <User size={24} className="text-purple-300" />
            </div>
            <div>
              <h2 className="text-2xl font-black tracking-tight">Detalhamento de Motoristas</h2>
              <p className="text-xs text-indigo-200 font-medium mt-1">Análise aprofundada de quebras por colaborador</p>
            </div>
          </div>
          <button onClick={onClose} className="p-3 bg-white/5 hover:bg-rose-500/80 rounded-full transition-all duration-300 active:scale-95 shadow-sm hover:shadow-rose-500/50">
            <X size={20} />
          </button>
        </div>

        {/* CONTROLS */}
        <div className="p-6 bg-slate-50 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0">
          <div className="relative w-full sm:w-72 group">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
            <input 
              type="text" 
              placeholder="Buscar motorista..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-white rounded-2xl border border-slate-200 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all font-bold text-slate-700 shadow-sm"
            />
          </div>

          <div className="flex bg-slate-200/50 p-1 rounded-2xl w-full sm:w-auto overflow-hidden shadow-inner">
            {[30, 60, 90].map(dias => (
              <button 
                key={dias}
                onClick={() => setPeriodo(dias)}
                className={`flex-1 sm:w-24 py-2.5 rounded-xl text-xs font-black transition-all duration-300 ${periodo === dias ? 'bg-white text-indigo-600 shadow-md scale-105' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200'}`}
              >
                {dias} Dias
              </button>
            ))}
          </div>
        </div>

        {/* LISTA DE MOTORISTAS */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar bg-slate-50/50">
          {motoristasStats.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-4 opacity-70">
              <Activity size={48} className="text-slate-300" />
              <p className="text-sm font-bold">Nenhum motorista com quebra no período selecionado.</p>
            </div>
          ) : (
            motoristasStats.map((mot, idx) => {
              const isExpanded = expandedMotorista === mot.motorista;
              const qtdPlacas = Object.keys(mot.placas).length;

              return (
                <div key={mot.motorista} className={`bg-white rounded-3xl border transition-all duration-500 overflow-hidden ${isExpanded ? 'border-indigo-200 shadow-xl shadow-indigo-100/50 ring-1 ring-indigo-50' : 'border-slate-100 shadow-sm hover:shadow-md hover:border-slate-200'}`}>
                  
                  {/* HEADER ROW */}
                  <div 
                    onClick={() => setExpandedMotorista(isExpanded ? null : mot.motorista)}
                    className="p-5 flex items-center justify-between cursor-pointer group"
                  >
                    <div className="flex items-center gap-5">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg transition-colors ${idx === 0 ? 'bg-amber-100 text-amber-600' : idx === 1 ? 'bg-slate-200 text-slate-600' : idx === 2 ? 'bg-orange-100 text-orange-700' : 'bg-indigo-50 text-indigo-500'}`}>
                        {idx + 1}º
                      </div>
                      <div>
                        <h3 className="font-black text-slate-800 text-lg group-hover:text-indigo-600 transition-colors uppercase">{mot.motorista}</h3>
                        <p className="text-xs font-bold text-slate-400 mt-0.5 flex items-center gap-1">
                          <Car size={12}/> Utilizou {qtdPlacas} veículo{qtdPlacas > 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <span className="block text-2xl font-black text-blue-950 leading-none">{mot.total}</span>
                        <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest mt-1 block">Quebras</span>
                      </div>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center bg-slate-50 text-slate-400 transition-all duration-300 group-hover:bg-indigo-50 group-hover:text-indigo-500 ${isExpanded ? 'rotate-90 bg-indigo-500 text-white shadow-md' : ''}`}>
                        <ChevronRight size={18} />
                      </div>
                    </div>
                  </div>

                  {/* EXPANDED CONTENT */}
                  <div className={`transition-all duration-500 ease-in-out origin-top ${isExpanded ? 'max-h-[800px] opacity-100' : 'max-h-0 opacity-0'}`}>
                    <div className="p-5 pt-0 bg-slate-50/50 border-t border-slate-100">
                      
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4 mt-4 flex items-center gap-2">
                        <Activity size={14}/> Detalhamento por Veículo (Placa)
                      </h4>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {Object.entries(mot.placas)
                          .sort((a, b) => b[1] - a[1])
                          .map(([placa, qtd]) => {
                            const vec = vehicles?.find(v => v.placa === placa);
                            return (
                              <div 
                                key={placa} 
                                onClick={(e) => { e.stopPropagation(); if(onPlacaClick) onPlacaClick(placa); }}
                                className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-300 transition-all cursor-pointer group"
                              >
                                <div className="flex justify-between items-start">
                                  <div>
                                    <span className="font-black text-slate-700 text-sm block group-hover:text-indigo-600 transition-colors">{placa}</span>
                                    <span className="text-[10px] font-bold text-slate-400 uppercase">{vec?.marca || 'Desconhecido'}</span>
                                  </div>
                                  <div className="px-2 py-1 bg-rose-50 rounded-lg border border-rose-100 text-center">
                                    <span className="block text-sm font-black text-rose-600 leading-none">{qtd}</span>
                                  </div>
                                </div>
                              </div>
                            );
                        })}
                      </div>

                      <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4 mt-6 flex items-center gap-2">
                        <AlertTriangle size={14}/> Histórico de Ocorrências ({periodo} Dias)
                      </h4>

                      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-50 text-slate-500 font-black uppercase tracking-wider text-[10px]">
                            <tr>
                              <th className="px-4 py-3">Abertura</th>
                              <th className="px-4 py-3">Placa</th>
                              <th className="px-4 py-3">Nº SOL</th>
                              <th className="px-4 py-3">Macro Defeito</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {mot.chamados.sort((a, b) => new Date(b.dataAbertura) - new Date(a.dataAbertura)).map((c, i) => (
                              <tr key={c.id || i} className="hover:bg-slate-50 transition-colors">
                                <td className="px-4 py-3 font-bold text-slate-600">{formatarDataBR(c.dataAbertura)}</td>
                                <td className="px-4 py-3 font-black text-indigo-600">{c.placa}</td>
                                <td className="px-4 py-3 font-mono text-slate-500">{c.numero || '--'}</td>
                                <td className="px-4 py-3">
                                  <span className="inline-flex items-center px-2 py-1 rounded-md text-[10px] font-black bg-amber-50 text-amber-700 border border-amber-100">
                                    {c.defeitoPrincipal || 'Não informado'}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
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
