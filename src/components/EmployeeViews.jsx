import React, { useState, useMemo } from 'react';
import { Search, Filter, LayoutGrid, List, AlertCircle, Phone, MapPin, Briefcase, Download } from 'lucide-react';
import * as XLSX from 'xlsx';

export default function EmployeeViews({ forcaData, onDoubleClickEmployee }) {
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'grid'
  const [searchTerm, setSearchTerm] = useState('');

  const filteredData = useMemo(() => {
    if (!searchTerm) return forcaData;
    const term = searchTerm.toLowerCase();
    return forcaData.filter(emp => 
      (emp.nome && emp.nome.toLowerCase().includes(term)) ||
      (emp.matricula && String(emp.matricula).toLowerCase().includes(term)) ||
      (emp.cpf && emp.cpf.includes(term)) ||
      (emp.equipe && emp.equipe.toLowerCase().includes(term)) ||
      (emp.funcao && emp.funcao.toLowerCase().includes(term)) ||
      (emp.base_ut && emp.base_ut.toLowerCase().includes(term))
    );
  }, [forcaData, searchTerm]);

  const getInitials = (name) => {
    if (!name) return '??';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  const formatTime = (val) => {
    if (val === undefined || val === null || val === '') return '---';
    if (typeof val === 'number') {
      if (val > 0 && val <= 1) {
        const hours = Math.round(val * 24);
        return `Das ${String(hours).padStart(2, '0')}:00`;
      }
      const hours = Math.round(val);
      return `Das ${String(hours).padStart(2, '0')}:00`;
    }
    if (typeof val === 'string') {
      const str = val.trim();
      if (str.toLowerCase().includes('das')) return str;
      if (str.includes(':')) return `Das ${str}`;
      const num = parseFloat(str);
      if (!isNaN(num)) {
        if (num > 0 && num <= 1) {
          const hours = Math.round(num * 24);
          return `Das ${String(hours).padStart(2, '0')}:00`;
        }
        return `Das ${String(Math.round(num)).padStart(2, '0')}:00`;
      }
      return str;
    }
    return String(val);
  };

  const handleExportColaboradores = () => {
    if (!filteredData || filteredData.length === 0) return;
    const exportData = filteredData.map(e => ({
      'Matrícula': e.matricula || '',
      'Nome': e.nome || '',
      'CPF': e.cpf || '',
      'RG': e.rg || '',
      'PIS': e.pis || '',
      'Função': e.funcao || '',
      'Base UT': e.base_ut || '',
      'Equipe': e.equipe || '',
      'Cód Equipe': e.cod_equipe || '',
      'Tipo de Equipe': e.tipo_equipe || e.veiculo || '',
      'Turno': e.turno || '',
      'Horário': formatTime(e.horario),
      'Status Força': e.status_forca || '',
      'Status Falta': e.status_falta || '',
      'Qtd Faltas Atual': e.qtd_faltas_atual || 0,
      'Área de Atuação': e.area_atuacao || '',
      'Subgrupo': e.subgrupo || '',
      'Grupo Folga': e.grupo_folga || '',
      'Supervisor': e.supervisor || '',
      'BR0': e.br0 || '',
      'CNH': e.cnh || '',
      'Validade CNH': e.validade_cnh || '',
      'Dt. Admissao': e.dt_admissao || '',
      'Senha Eorder': e.senha_eorder || '',
      'Login Eorder': e.login_eorder || '',
      'Ação a ser Feita': e.acao_a_ser_feita || '',
      'Commessa': e.commessa || '',
      'Placa Veículo': e.placa_veiculo || e.placa || '',
      'Telefone Equipe': e.telefone_equipe || e.telefone || '',
      'Status Câmera': e.status_camera || e.camera || '',
      'Chave Primária': e.chave_primaria || ''
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Colaboradores');
    XLSX.writeFile(wb, `Colaboradores_Forca_Trabalho_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const isSobra = (equipe) => {
    return String(equipe || '').trim().toUpperCase() === 'SOBRA';
  };

  return (
    <div className="w-full flex flex-col gap-4">
      {/* Top Controls */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white/80 dark:bg-slate-900/50 p-3 rounded-2xl border border-slate-200 dark:border-slate-800/60 shadow-sm">
        <div className="relative w-full md:w-96">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text" 
            placeholder="Buscar por nome, matrícula, equipe, CPF, Base UT..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-4 py-2 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all placeholder:text-slate-400"
          />
        </div>
        
        <div className="flex items-center gap-3 flex-wrap">
          <button 
            onClick={handleExportColaboradores}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all flex items-center gap-2 shadow-sm active:scale-95"
            title="Exportar lista de colaboradores em planilha Excel (100% das colunas)"
          >
            <Download size={15} /> Exportar Excel
          </button>

          <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700/50">
            <button 
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg flex items-center gap-2 text-sm font-bold transition-colors ${viewMode === 'list' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700'}`}
            >
              <List size={16} /> Lista
            </button>
            <button 
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg flex items-center gap-2 text-sm font-bold transition-colors ${viewMode === 'grid' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700'}`}
            >
              <LayoutGrid size={16} /> Cards
            </button>
          </div>
        </div>
      </div>

      {/* Content Area */}
      {viewMode === 'list' ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
          <div className="overflow-x-auto w-full max-h-[70vh]">
            <table className="w-full text-left border-collapse min-w-[950px]">
              <thead className="sticky top-0 bg-slate-50/95 dark:bg-slate-900/95 backdrop-blur-md z-10 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="p-4 text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">Colaborador</th>
                  <th className="p-4 text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">Base UT</th>
                  <th className="p-4 text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">Função</th>
                  <th className="p-4 text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">Equipe / Base</th>
                  <th className="p-4 text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">Turno / Horário</th>
                  <th className="p-4 text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status Força</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                {filteredData.map((emp, idx) => {
                  const isEmpSobra = isSobra(emp.equipe);
                  return (
                    <tr 
                      key={emp.matricula || idx} 
                      onDoubleClick={() => onDoubleClickEmployee(emp)}
                      className={`transition-colors cursor-pointer group ${
                        isEmpSobra 
                          ? 'bg-orange-50/50 hover:bg-orange-100/50 dark:bg-orange-950/20 dark:hover:bg-orange-900/30' 
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800/30'
                      }`}
                      title="Dê um duplo-clique para editar o colaborador"
                    >
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-sm border group-hover:scale-105 transition-transform ${
                            isEmpSobra 
                              ? 'bg-orange-100 text-orange-600 border-orange-200 dark:bg-orange-900/50 dark:text-orange-400 dark:border-orange-800/50' 
                              : 'bg-indigo-50 text-indigo-600 border-indigo-100 dark:bg-indigo-500/20 dark:text-indigo-400 dark:border-indigo-500/30'
                          }`}>
                            {getInitials(emp.nome)}
                          </div>
                          <div>
                            <div className="font-bold text-slate-800 dark:text-slate-200">{emp.nome || '---'}</div>
                            <div className="text-xs text-slate-500 font-mono">MAT: {emp.matricula || '---'} | CPF: {emp.cpf || '---'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300">
                          <MapPin size={12} className="text-indigo-500" /> {emp.base_ut || '---'}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="text-sm font-semibold text-slate-700 dark:text-slate-300">{emp.funcao || '---'}</div>
                        <div className="text-xs text-slate-500">{emp.area_atuacao || '---'}</div>
                      </td>
                      <td className="p-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-bold font-mono ${
                          isEmpSobra
                            ? 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/40 dark:text-orange-400 dark:border-orange-800/50'
                            : 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-indigo-500/10 dark:text-indigo-400 dark:border-indigo-500/20'
                        }`}>
                          <Briefcase size={12} /> {emp.equipe || '---'}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="text-sm font-semibold text-slate-700 dark:text-slate-300">{emp.turno || '---'}</div>
                        <div className="text-xs text-slate-500">{formatTime(emp.horario)}</div>
                      </td>
                      <td className="p-4">
                        <span className={`inline-flex items-center px-2 py-1 rounded-lg text-xs font-bold ${
                          String(emp.status_forca).toUpperCase().includes('ATIVO') 
                            ? 'bg-emerald-50 text-emerald-600 border border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20'
                            : 'bg-rose-50 text-rose-600 border border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20'
                        }`}>
                          {emp.status_forca || '---'}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {filteredData.length === 0 && (
              <div className="p-10 text-center text-slate-500 font-medium">Nenhum colaborador encontrado.</div>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 max-h-[70vh] overflow-y-auto p-2">
          {filteredData.map((emp, idx) => {
            const isEmpSobra = isSobra(emp.equipe);
            return (
              <div 
                key={emp.matricula || idx}
                onDoubleClick={() => onDoubleClickEmployee(emp)}
                className={`bg-white dark:bg-slate-900 border rounded-2xl p-5 transition-all cursor-pointer group relative overflow-hidden ${
                  isEmpSobra
                    ? 'border-orange-200 hover:border-orange-400 hover:shadow-orange-500/10 dark:border-orange-900/50 dark:hover:border-orange-500/50'
                    : 'border-slate-200 hover:border-indigo-400 hover:shadow-indigo-500/10 dark:border-slate-800 dark:hover:border-indigo-500/50'
                } hover:shadow-lg`}
                title="Dê um duplo-clique para editar o colaborador"
              >
                {/* Highlight bar for active/inactive */}
                <div className={`absolute top-0 left-0 w-full h-1 ${
                  String(emp.status_forca).toUpperCase().includes('ATIVO') ? 'bg-emerald-500' : 'bg-rose-500'
                }`} />
                
                <div className="flex items-start gap-4">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-xl shrink-0 border group-hover:scale-110 group-hover:rotate-3 transition-transform ${
                    isEmpSobra
                      ? 'bg-orange-50 text-orange-600 border-orange-100 dark:bg-orange-500/10 dark:text-orange-400 dark:border-orange-500/20'
                      : 'bg-indigo-50 text-indigo-600 border-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-400 dark:border-indigo-500/20'
                  }`}>
                    {getInitials(emp.nome)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-slate-800 dark:text-slate-200 truncate" title={emp.nome}>{emp.nome || '---'}</h3>
                    <p className="text-xs text-slate-500 font-mono truncate">MAT: {emp.matricula}</p>
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-400 dark:text-slate-500 text-xs uppercase font-bold tracking-wider">Base UT</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300 truncate max-w-[150px]" title={emp.base_ut}>{emp.base_ut || '---'}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-400 dark:text-slate-500 text-xs uppercase font-bold tracking-wider">Função</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300 truncate max-w-[150px]" title={emp.funcao}>{emp.funcao || '---'}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-400 dark:text-slate-500 text-xs uppercase font-bold tracking-wider">Equipe</span>
                    <span className={`px-2 py-0.5 rounded-md font-mono font-bold text-xs truncate max-w-[150px] ${
                      isEmpSobra
                        ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400'
                        : 'bg-slate-100 text-slate-700 dark:bg-indigo-500/10 dark:text-indigo-400'
                    }`}>
                      {emp.equipe || '---'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-400 dark:text-slate-500 text-xs uppercase font-bold tracking-wider">Horário</span>
                    <span className="font-semibold text-slate-600 dark:text-slate-400 truncate max-w-[150px] text-xs">{formatTime(emp.horario)}</span>
                  </div>
                  
                  {(emp.qtd_faltas_atual > 0 || emp.status_falta) && (
                    <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2 text-xs font-bold text-amber-500">
                      <AlertCircle size={14} /> 
                      Faltas: {emp.qtd_faltas_atual || 0} ({emp.status_falta || '---'})
                    </div>
                  )}
                </div>
              </div>
            )
          })}
          {filteredData.length === 0 && (
            <div className="col-span-full p-10 text-center text-slate-500 font-medium bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
              Nenhum colaborador encontrado.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
