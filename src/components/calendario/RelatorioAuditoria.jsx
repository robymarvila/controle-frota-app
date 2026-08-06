import React, { useState } from 'react';
import { Filter, Sun, Camera, Eraser, FolderOpen, Check, Lock, Clock, Image as ImageIcon, Download, Eye, Trash2, Users } from 'lucide-react';
import * as XLSX from 'xlsx';
import ModalDetalheEvento from './ModalDetalheEvento';

export default function RelatorioAuditoria({ activities, catConfig, isAdminOrCoord, onDelete, presencas = [] }) {
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterTurno, setFilterTurno] = useState('all');
  const [filterEvidencia, setFilterEvidencia] = useState('all');
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [selectedActivityIds, setSelectedActivityIds] = useState([]);

  const isExpired = (dateStr, timeStr) => {
    const [yy, mm, dd] = dateStr.split('-');
    const [h, min] = timeStr.split(':');
    const taskDate = new Date(yy, mm - 1, dd, h, min);
    const limitDate = new Date(taskDate.getTime() + 24 * 60 * 60 * 1000);
    return new Date() > limitDate;
  };

  const filtered = activities.filter(t => {
    const expired = t.status !== 'EXECUTADO' && isExpired(t.data_programada, t.horario_programado);
    const isCompleted = t.status === 'EXECUTADO';

    if (filterStatus === 'concluido' && !isCompleted) return false;
    if (filterStatus === 'pendente' && (isCompleted || expired)) return false;
    if (filterStatus === 'vencida' && (isCompleted || !expired)) return false;
    
    if (filterTurno !== 'all' && t.turno !== filterTurno) return false;
    
    const hasEvid = !!t.evidencia_url;
    if (filterEvidencia === 'sim' && !hasEvid) return false;
    if (filterEvidencia === 'nao' && hasEvid) return false;
    
    return true;
  }).sort((a,b) => {
    if(a.data_programada === b.data_programada) return b.horario_programado.localeCompare(a.horario_programado);
    return b.data_programada.localeCompare(a.data_programada);
  });

  const clearFilters = () => {
    setFilterStatus('all');
    setFilterTurno('all');
    setFilterEvidencia('all');
    setSelectedActivityIds([]);
  };

  const calcTotalTime = (t) => {
    if (!t.hora_inicio_execucao || !t.hora_fim_execucao) return '-';
    const [h1, m1] = t.hora_inicio_execucao.split(':').map(Number);
    const [h2, m2] = t.hora_fim_execucao.split(':').map(Number);
    
    let d1 = new Date(2000, 1, 1, h1, m1);
    let d2 = new Date(2000, 1, 1, h2, m2);
    
    if (d2 < d1) {
      d2 = new Date(2000, 1, 2, h2, m2);
    }
    
    const diffMs = d2 - d1;
    const diffMins = Math.floor(diffMs / 60000);
    
    const h = Math.floor(diffMins / 60);
    const m = diffMins % 60;
    
    if (h > 0) {
      return `${h}h ${m > 0 ? m + 'm' : ''}`;
    }
    return `${m} min`;
  };

  const getAuditLabel = (p) => {
    if (p.flag_duplicata) return 'Duplicata';
    if (p.geo_lat && p.geo_lng && p.fingerprint_hash) return 'Verificado';
    if (p.fingerprint_hash && !p.geo_lat) return 'Sem GPS';
    return 'Parcial';
  };

  const handleExportExcel = () => {
    if (filtered.length === 0) {
      alert('Nenhum dado para exportar.');
      return;
    }

    const exportData = filtered.map(t => {
      const eventPresData = presencas.filter(p => p.atividade_id === t.id);
      return {
        'Data Programada': t.data_programada,
        'Turno': t.turno,
        'Tipo de Programa': t.tipo,
        'Assunto': t.assunto,
        'Status': t.status,
        'Início Real': t.hora_inicio_execucao || '-',
        'Fim Real': t.hora_fim_execucao || '-',
        'Quantidade de Presença': eventPresData.length,
        'Tempo Estimado': catConfig[t.tipo]?.duration || 'N/I',
        'Tempo Executado': calcTotalTime(t),
        'Observação': t.execucao_observacao || '-',
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Eventos");
    XLSX.writeFile(workbook, "Relatorio_Eventos_Calendario.xlsx");
  };

  const handleExportPresencas = () => {
    if (selectedActivityIds.length === 0) {
      alert('Selecione pelo menos um evento para exportar as presenças.');
      return;
    }

    const selectedActivities = filtered.filter(t => selectedActivityIds.includes(t.id));
    const exportData = [];

    selectedActivities.forEach(t => {
      const eventPresencas = presencas.filter(p => p.atividade_id === t.id);
      eventPresencas.forEach(p => {
        const [y, m, d] = t.data_programada.split('-');
        exportData.push({
          'Data do Evento': `${d}/${m}/${y}`,
          'Turno': t.turno,
          'Tipo': t.tipo,
          'Assunto Técnico': t.assunto,
          'Nome Completo': p.nome_completo,
          'Código da Equipe': p.codigo_equipe,
          'Matrícula': p.matricula_br0,
          'CPF': p.cpf || '-',
          'Data/Hora do Check-in': p.data_hora ? new Date(p.data_hora).toLocaleString('pt-BR') : '-',
          'Fingerprint (Hash)': p.fingerprint_hash || '-',
          'IP de Origem': p.ip_address || '-',
          'User-Agent': p.user_agent || '-',
          'Latitude': p.geo_lat || '-',
          'Longitude': p.geo_lng || '-',
          'Session UUID': p.session_uuid || '-',
          'Duplicata Detectada': p.flag_duplicata ? 'SIM' : 'NÃO',
          'Suspeita Fingerprint': p.flag_suspeita_fingerprint ? 'SIM' : 'NÃO',
          'Fingerprint - Nome Anterior': p.fingerprint_nome_anterior || '-',
          'Status Auditoria': getAuditLabel(p)
        });
      });
    });

    if (exportData.length === 0) {
      alert('Nenhuma presença registrada para os eventos selecionados.');
      return;
    }

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Presenças");
    XLSX.writeFile(workbook, "Relatorio_Presencas_Eventos.xlsx");
  };

  return (
    <div className="flex flex-col gap-6 flex-grow animate-in fade-in duration-300">
      <div className="bg-white rounded-3xl shadow-lg border border-slate-200/60 p-6 flex flex-wrap lg:flex-nowrap gap-5 items-end backdrop-blur-xl bg-white/90">
          <div className="w-full sm:w-auto flex-grow">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5 flex items-center gap-1"><Filter size={14} /> Status</label>
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="w-full border border-slate-300 rounded-lg py-2.5 px-3 text-sm focus:ring-2 focus:ring-blue-600 outline-none font-semibold text-slate-700 bg-slate-50">
                  <option value="all">Todos os Status</option>
                  <option value="concluido">Executados</option>
                  <option value="pendente">Pendentes</option>
                  <option value="vencida">Vencidas</option>
              </select>
          </div>
          <div className="w-full sm:w-auto flex-grow">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5 flex items-center gap-1"><Sun size={14} /> Turno</label>
              <select value={filterTurno} onChange={e => setFilterTurno(e.target.value)} className="w-full border border-slate-300 rounded-lg py-2.5 px-3 text-sm focus:ring-2 focus:ring-blue-600 outline-none font-semibold text-slate-700 bg-slate-50">
                  <option value="all">Todos os Turnos</option>
                  <option value="manha">Manhã</option>
                  <option value="tarde">Tarde</option>
                  <option value="noite">Noite</option>
              </select>
          </div>
          <div className="w-full sm:w-auto flex-grow">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5 flex items-center gap-1"><Camera size={14} /> Evidência</label>
              <select value={filterEvidencia} onChange={e => setFilterEvidencia(e.target.value)} className="w-full border border-slate-300 rounded-lg py-2.5 px-3 text-sm focus:ring-2 focus:ring-blue-600 outline-none font-semibold text-slate-700 bg-slate-50">
                  <option value="all">Todas as Atividades</option>
                  <option value="sim">Com Evidência Anexada</option>
                  <option value="nao">Sem Evidência Anexada</option>
              </select>
          </div>
          <div className="w-full sm:w-auto flex flex-wrap gap-2">
              <button onClick={clearFilters} className="flex-grow sm:flex-none bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-2.5 px-4 rounded-lg transition-colors text-sm border border-slate-200 flex items-center justify-center gap-2 shadow-sm">
                  <Eraser size={16} /> Limpar
              </button>
              <button onClick={handleExportExcel} className="flex-grow sm:flex-none bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 px-4 rounded-lg transition-colors text-sm border border-emerald-600 flex items-center justify-center gap-2 shadow-sm active:scale-95">
                  <Download size={16} /> Exportar Excel
              </button>
              <button 
                  onClick={handleExportPresencas} 
                  disabled={selectedActivityIds.length === 0}
                  className="flex-grow sm:flex-none bg-blue-600 hover:bg-blue-500 disabled:bg-slate-200 disabled:border-slate-200 disabled:text-slate-400 text-white font-bold py-2.5 px-4 rounded-lg transition-colors text-sm border border-blue-600 flex items-center justify-center gap-2 shadow-sm active:scale-95"
              >
                  <Users size={16} /> Exportar Presenças ({selectedActivityIds.length})
              </button>
          </div>
      </div>

      <div className="bg-white rounded-3xl shadow-lg border border-slate-200/60 overflow-hidden flex-grow flex flex-col backdrop-blur-xl bg-white/90">
          <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm min-w-[1100px]">
                  <thead>
                      <tr className="bg-blue-950 text-white text-[11px] uppercase tracking-wider font-bold">
                           <th className="p-4 border-r border-slate-700 text-center w-12">
                             <input 
                               type="checkbox" 
                               checked={filtered.length > 0 && selectedActivityIds.length === filtered.length}
                               onChange={(e) => {
                                 if (e.target.checked) {
                                   setSelectedActivityIds(filtered.map(t => t.id));
                                 } else {
                                   setSelectedActivityIds([]);
                                 }
                               }}
                               className="rounded border-slate-400 text-blue-600 focus:ring-blue-500"
                             />
                           </th>
                           <th className="p-4 border-r border-slate-700">Data de Execução</th>
                           <th className="p-4 border-r border-slate-700">Turno / Horário</th>
                           <th className="p-4 border-r border-slate-700">Tipo de Programa</th>
                           <th className="p-4 border-r border-slate-700">Assunto Técnico</th>
                           <th className="p-4 border-r border-slate-700 text-center">Status</th>
                           <th className="p-4 border-r border-slate-700 text-center">Presença</th>
                           <th className="p-4 border-r border-slate-700 text-center">Evidências</th>
                           <th className="p-4 text-center">Ações</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filtered.map(t => {
                      const cfg = catConfig[t.tipo] || { badge: 'bg-slate-100 text-slate-600' };
                      const expired = t.status !== 'EXECUTADO' && isExpired(t.data_programada, t.horario_programado);
                      const isCompleted = t.status === 'EXECUTADO';
                      const [y, m, d] = t.data_programada.split('-');
                      const eventPresData = presencas.filter(p => p.atividade_id === t.id);
                      
                      return (
                        <tr key={t.id} className="hover:bg-slate-50/80 transition-colors">
                             <td className="p-4 border-r border-slate-100 text-center">
                               <input 
                                 type="checkbox"
                                 checked={selectedActivityIds.includes(t.id)}
                                 onChange={(e) => {
                                   if (e.target.checked) {
                                     setSelectedActivityIds(prev => [...prev, t.id]);
                                   } else {
                                     setSelectedActivityIds(prev => prev.filter(id => id !== t.id));
                                   }
                                 }}
                                 className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                               />
                             </td>
                             <td className="p-4 border-r border-slate-100 font-bold text-slate-700">{d}/{m}/{y}</td>
                             <td className="p-4 border-r border-slate-100 font-semibold text-slate-600 capitalize">{t.turno} <span className="text-slate-400 text-xs font-normal">({t.horario_programado.substring(0,5)})</span></td>
                             <td className="p-4 border-r border-slate-100">
                                 <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[10px] font-bold uppercase ${isCompleted ? cfg.badge : (expired ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-600')}`}>
                                     {t.tipo}
                                 </span>
                             </td>
                             <td className="p-4 border-r border-slate-100 font-bold text-slate-800">{t.assunto}</td>
                             <td className="p-4 border-r border-slate-100 text-center">
                               {isCompleted ? (
                                 <span className="bg-emerald-100 text-emerald-800 font-bold px-2.5 py-1 rounded-md text-[11px] flex items-center justify-center gap-1 w-24 mx-auto"><Check size={12} /> Executado</span>
                               ) : expired ? (
                                 <span className="bg-rose-100 text-rose-800 font-bold px-2.5 py-1 rounded-md text-[11px] flex items-center justify-center gap-1 w-24 mx-auto"><Lock size={12} /> Vencida</span>
                               ) : (
                                 <span className="bg-slate-100 text-slate-600 font-bold px-2.5 py-1 rounded-md text-[11px] flex items-center justify-center gap-1 w-24 mx-auto"><Clock size={12} /> Pendente</span>
                               )}
                             </td>
                             <td className="p-4 border-r border-slate-100 text-center">
                               <span className={`font-bold px-2.5 py-1 rounded-md text-[11px] flex items-center justify-center gap-1 w-28 mx-auto ${eventPresData.length > 0 ? 'bg-blue-100 text-blue-800 border border-blue-200' : 'bg-slate-100 text-slate-500 border border-slate-200'}`}>
                                 <Users size={12} /> {eventPresData.length} Presente{eventPresData.length !== 1 ? 's' : ''}
                               </span>
                             </td>
                             <td className="p-4 border-r border-slate-100 text-center">
                               {isCompleted && t.evidencia_url ? (
                                 <a href={t.evidencia_url} target="_blank" rel="noreferrer" className="text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded text-xs font-bold transition flex items-center justify-center gap-1 mx-auto border border-transparent hover:border-blue-200 w-max"><ImageIcon size={14} /> Ver Evidência</a>
                               ) : expired ? (
                                 <span className="text-rose-400 text-xs italic">Bloqueado</span>
                               ) : (
                                 <span className="text-slate-400 text-xs italic">Sem Anexo</span>
                               )}
                             </td>
                             <td className="p-4 text-center">
                                 <div className="flex items-center justify-center gap-2">
                                   <button 
                                       onClick={() => setSelectedActivity(t)} 
                                       className="bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold px-3 py-1.5 rounded-xl text-xs transition-colors border border-blue-200 shadow-sm flex items-center justify-center gap-1.5 active:scale-95"
                                   >
                                       <Eye size={14} /> Detalhes
                                   </button>
                                   {!isCompleted && isAdminOrCoord && (
                                     <button 
                                         onClick={() => {
                                             if(window.confirm("Deseja realmente excluir esta programação pendente?")) {
                                                 onDelete(t.id);
                                             }
                                         }} 
                                         className="bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold w-8 h-8 rounded-xl transition-colors border border-rose-200 shadow-sm flex items-center justify-center active:scale-95"
                                         title="Excluir Programação"
                                     >
                                         <Trash2 size={14} />
                                     </button>
                                   )}
                                 </div>
                             </td>
                        </tr>
                      )
                    })}
                  </tbody>
              </table>
          </div>
          {filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400 flex-grow">
                <FolderOpen size={48} className="mb-3 opacity-30" />
                <p className="font-bold text-lg text-slate-500">Nenhuma programação localizada</p>
                <p className="text-sm">Modifique os parâmetros dos filtros acima.</p>
            </div>
          )}
      </div>

      {selectedActivity && (
        <ModalDetalheEvento 
          atividade={selectedActivity}
          catConfig={catConfig}
          onClose={() => setSelectedActivity(null)}
        />
      )}

    </div>
  );
}
