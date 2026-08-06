import React, { useState, useEffect } from 'react';
import { X, Clock, CalendarCheck, FileText, Download, Users, Image as ImageIcon, MapPin, Hash, Building, Shield, ShieldAlert, ShieldCheck, AlertTriangle, Fingerprint, Wifi, Eye } from 'lucide-react';
import { supabase } from '../../supabaseClient';
import * as XLSX from 'xlsx';

export default function ModalDetalheEvento({ atividade, catConfig, onClose }) {
  const [presencas, setPresencas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tooltipId, setTooltipId] = useState(null);

  const cfg = catConfig[atividade.tipo] || { badge: 'bg-slate-100 text-slate-600', duration: 'N/I' };
  const isCompleted = atividade.status === 'EXECUTADO';

  useEffect(() => {
    const fetchPresencas = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('calendario_presencas')
        .select('*')
        .eq('atividade_id', atividade.id)
        .order('data_hora', { ascending: true });
      
      if (!error && data) {
        setPresencas(data);
      }
      setLoading(false);
    };

    fetchPresencas();
  }, [atividade.id]);

  const calcTotalTime = () => {
    if (!atividade.hora_inicio_execucao || !atividade.hora_fim_execucao) return '--';
    const [h1, m1] = atividade.hora_inicio_execucao.split(':').map(Number);
    const [h2, m2] = atividade.hora_fim_execucao.split(':').map(Number);
    
    let d1 = new Date(2000, 1, 1, h1, m1);
    let d2 = new Date(2000, 1, 1, h2, m2);
    
    if (d2 < d1) {
      d2 = new Date(2000, 1, 2, h2, m2); // passou da meia noite
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

  const formatData = (dStr) => {
    if (!dStr) return '';
    const [y, m, d] = dStr.split('-');
    return `${d}/${m}/${y}`;
  };

  // Audit stats
  const duplicatas = presencas.filter(p => p.flag_duplicata === true).length;
  const comGeo = presencas.filter(p => p.geo_lat && p.geo_lng).length;
  const comFingerprint = presencas.filter(p => p.fingerprint_hash).length;

  // Determine audit badge for each presence
  const getAuditBadge = (p) => {
    if (p.flag_duplicata) {
      return { label: 'Duplicata', color: 'bg-rose-100 text-rose-700 border-rose-200', icon: <ShieldAlert size={11} /> };
    }
    if (p.geo_lat && p.geo_lng && p.fingerprint_hash) {
      return { label: 'Verificado', color: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: <ShieldCheck size={11} /> };
    }
    if (p.fingerprint_hash && !p.geo_lat) {
      return { label: 'Sem GPS', color: 'bg-amber-100 text-amber-700 border-amber-200', icon: <Shield size={11} /> };
    }
    return { label: 'Parcial', color: 'bg-slate-100 text-slate-600 border-slate-200', icon: <Shield size={11} /> };
  };

  const handleDownloadExcel = () => {
    if (presencas.length === 0) {
      alert("Não há presenças registradas para este evento.");
      return;
    }

    const exportData = presencas.map(p => ({
      'Nome Completo': p.nome_completo,
      'Código da Equipe': p.codigo_equipe,
      'Matrícula': p.matricula_br0,
      'CPF': p.cpf || '-',
      'Data/Hora do Check-in': new Date(p.data_hora).toLocaleString('pt-BR'),
      // Audit columns
      'Fingerprint (Hash)': p.fingerprint_hash || '-',
      'IP de Origem': p.ip_address || '-',
      'User-Agent': p.user_agent || '-',
      'Latitude': p.geo_lat || '-',
      'Longitude': p.geo_lng || '-',
      'Session UUID': p.session_uuid || '-',
      'Duplicata Detectada': p.flag_duplicata ? 'SIM' : 'NÃO',
      'Suspeita Fingerprint': p.flag_suspeita_fingerprint ? 'SIM' : 'NÃO',
      'Fingerprint - Nome Anterior': p.fingerprint_nome_anterior || '-',
      'Status Auditoria': getAuditBadge(p).label
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Presenças");

    const fileName = `Presenças_Auditoria_${atividade.tipo.replace(/\s+/g, '_')}_${atividade.data_programada}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
      
      <div className="w-full max-w-6xl h-[85vh] bg-slate-50 rounded-3xl shadow-2xl overflow-hidden flex flex-col border border-slate-200 animate-in fade-in zoom-in-95 duration-300" onClick={e => e.stopPropagation()}>
        
        {/* HEADER */}
        <div className="bg-blue-950 px-8 py-5 flex justify-between items-center text-white shrink-0">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h2 className="text-2xl font-black tracking-tight">Detalhes do Evento</h2>
              <span className={`px-2.5 py-0.5 rounded text-xs font-bold uppercase ${cfg.badge.replace('border-', '')}`}>{atividade.tipo}</span>
            </div>
            <p className="text-blue-200 text-sm font-medium">{atividade.assunto}</p>
          </div>
          <button onClick={onClose} className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* BODY (2 COLUNAS) */}
        <div className="flex flex-1 overflow-hidden">
          
          {/* COLUNA ESQUERDA: RESUMO OPERACIONAL */}
          <div className="w-1/2 p-8 border-r border-slate-200 overflow-y-auto bg-white custom-scrollbar">
            <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
              <CalendarCheck size={16} /> Resumo Operacional
            </h3>

            {/* BOX DE DATAS E TEMPOS */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 mb-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Data Planejada</p>
                  <p className="text-lg font-black text-slate-700">{formatData(atividade.data_programada)}</p>
                  <p className="text-sm font-semibold text-slate-500 capitalize">{atividade.turno} ({atividade.horario_programado?.substring(0,5)})</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Status</p>
                  <div className="mt-1">
                    {isCompleted ? (
                      <span className="bg-emerald-100 text-emerald-800 font-bold px-3 py-1.5 rounded-lg text-sm inline-flex items-center gap-1.5"><Clock size={14} /> Executado</span>
                    ) : (
                      <span className="bg-amber-100 text-amber-800 font-bold px-3 py-1.5 rounded-lg text-sm inline-flex items-center gap-1.5"><Clock size={14} /> Pendente</span>
                    )}
                  </div>
                </div>
              </div>

              {isCompleted && (
                <div className="mt-6 pt-6 border-t border-slate-200 grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Hora Início Real</p>
                    <p className="text-xl font-black text-slate-800">{atividade.hora_inicio_execucao || '--:--'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Hora Fim Real</p>
                    <p className="text-xl font-black text-slate-800">{atividade.hora_fim_execucao || '--:--'}</p>
                  </div>
                  <div className="bg-blue-50 -my-2 -mx-2 p-2 rounded-xl border border-blue-100">
                    <p className="text-[10px] font-bold text-blue-500 uppercase tracking-wide mb-1">Tempo Total</p>
                    <p className="text-xl font-black text-blue-700">{calcTotalTime()}</p>
                    <p className="text-[9px] font-bold text-blue-400 uppercase mt-0.5">Plan: {cfg.duration}</p>
                  </div>
                </div>
              )}
            </div>

            {/* OBSERVAÇÕES E EVIDÊNCIA */}
            <div className="space-y-6">
              <div>
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-1.5"><FileText size={14} /> Observação do Encarregado</h4>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-sm text-slate-600 font-medium whitespace-pre-wrap min-h-[80px]">
                  {atividade.execucao_observacao || <span className="italic opacity-50">Nenhuma observação registrada.</span>}
                </div>
              </div>

              {atividade.evidencia_url ? (
                <div>
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-1.5"><ImageIcon size={14} /> Evidência Anexada</h4>
                  <a href={atividade.evidencia_url} target="_blank" rel="noreferrer" className="flex items-center gap-3 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 p-4 rounded-xl transition-colors group">
                    <div className="w-10 h-10 bg-emerald-200 text-emerald-700 rounded-lg flex items-center justify-center shrink-0">
                      <ImageIcon size={20} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-emerald-800 truncate">Ver Fotografia/Documento</p>
                      <p className="text-[10px] uppercase font-bold text-emerald-600/70">Clique para abrir em nova aba</p>
                    </div>
                  </a>
                </div>
              ) : (
                <div className="flex items-center gap-2 p-4 bg-slate-50 border border-dashed border-slate-300 rounded-xl text-slate-400 text-sm font-bold">
                  <ImageIcon size={16} /> Sem evidência anexada
                </div>
              )}

              {/* PAINEL DE AUDITORIA */}
              {presencas.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                    <Fingerprint size={14} /> Resumo de Auditoria
                  </h4>
                  <div className="bg-violet-50 border border-violet-200 rounded-2xl p-5">
                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-center">
                        <p className="text-2xl font-black text-violet-700">{comFingerprint}</p>
                        <p className="text-[9px] font-bold text-violet-500 uppercase tracking-wide">Com Fingerprint</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-black text-blue-700">{comGeo}</p>
                        <p className="text-[9px] font-bold text-blue-500 uppercase tracking-wide">Com GPS</p>
                      </div>
                      <div className="text-center">
                        <p className={`text-2xl font-black ${duplicatas > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>{duplicatas}</p>
                        <p className={`text-[9px] font-bold uppercase tracking-wide ${duplicatas > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                          {duplicatas > 0 ? 'Duplicatas!' : 'Sem Duplicatas'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

          </div>

          {/* COLUNA DIREITA: PRESENÇAS */}
          <div className="w-1/2 flex flex-col bg-slate-100 relative">
            <div className="p-8 pb-4 shrink-0 flex justify-between items-end border-b border-slate-200 bg-white">
              <div>
                <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                  <Users size={16} /> Lista de Presença
                </h3>
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-black text-slate-800">{loading ? '-' : presencas.length}</span>
                  <span className="text-sm font-bold text-slate-500 uppercase tracking-wide">Colaboradores</span>
                </div>
                {duplicatas > 0 && (
                  <div className="mt-2 flex items-center gap-1.5 text-rose-600 text-xs font-bold bg-rose-50 px-3 py-1.5 rounded-lg border border-rose-200 w-max">
                    <AlertTriangle size={13} /> {duplicatas} duplicata{duplicatas > 1 ? 's' : ''} detectada{duplicatas > 1 ? 's' : ''}
                  </div>
                )}
              </div>
              <button 
                onClick={handleDownloadExcel}
                disabled={loading || presencas.length === 0}
                className="bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-300 disabled:text-slate-500 text-white font-bold py-2.5 px-5 rounded-xl transition-all flex items-center gap-2 shadow-sm text-sm active:scale-95"
              >
                <Download size={16} /> Baixar Auditoria (.xlsx)
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
              {loading ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-60">
                  <div className="w-10 h-10 border-4 border-slate-300 border-t-slate-600 rounded-full animate-spin mb-4"></div>
                  <p className="text-xs font-bold uppercase tracking-wider">Carregando presenças...</p>
                </div>
              ) : presencas.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-60 bg-white rounded-2xl border border-dashed border-slate-300 p-8 text-center">
                  <Users size={48} className="mb-4 text-slate-300" />
                  <p className="text-base font-bold text-slate-500">Nenhum check-in registrado.</p>
                  <p className="text-xs mt-1">Este evento não possui lista de presença preenchida.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-2">
                  {presencas.map((p, i) => {
                    const badge = getAuditBadge(p);
                    const isTooltipOpen = tooltipId === p.id;

                    return (
                      <div key={p.id} className={`bg-white border rounded-xl p-4 flex items-center gap-4 hover:border-blue-300 transition-colors shadow-sm relative ${p.flag_duplicata ? 'border-rose-300 bg-rose-50/30' : 'border-slate-200'}`}>
                        <div className={`w-10 h-10 rounded-full font-black flex items-center justify-center text-sm shrink-0 ${p.flag_duplicata ? 'bg-rose-100 text-rose-600' : 'bg-slate-100 text-slate-500'}`}>
                          {i + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-black text-slate-800 text-base truncate uppercase">{p.nome_completo}</p>
                          <div className="flex items-center gap-3 mt-1 text-[11px] font-bold text-slate-500">
                            <span className="flex items-center gap-1"><Hash size={12} className="text-slate-400" /> {p.matricula_br0}</span>
                            <span className="flex items-center gap-1"><Building size={12} className="text-slate-400" /> {p.codigo_equipe}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {/* Audit Badge */}
                          <button
                            onClick={() => setTooltipId(isTooltipOpen ? null : p.id)}
                            className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold border cursor-pointer hover:opacity-80 transition-opacity ${badge.color}`}
                          >
                            {badge.icon} {badge.label}
                          </button>

                          {/* Check-in time */}
                          <div className="text-right">
                            <p className="text-[10px] font-bold uppercase text-slate-400 mb-0.5">Check-in</p>
                            <span className="bg-blue-50 text-blue-700 font-black px-2 py-1 rounded-md text-xs border border-blue-100">
                              {new Date(p.data_hora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </div>

                        {/* Audit Tooltip */}
                        {isTooltipOpen && (
                          <div className="absolute right-0 top-full mt-2 z-30 bg-slate-900 text-white rounded-xl p-4 shadow-2xl w-80 text-xs animate-in fade-in slide-in-from-top-2 duration-200"
                               onClick={e => e.stopPropagation()}>
                            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-700">
                              <Fingerprint size={14} className="text-violet-400" />
                              <span className="font-black text-[10px] uppercase tracking-widest text-slate-300">Dados de Auditoria</span>
                            </div>
                            <div className="space-y-2">
                              <div className="flex justify-between">
                                <span className="text-slate-400">Fingerprint</span>
                                <span className="font-mono font-bold text-violet-300">{p.fingerprint_hash ? p.fingerprint_hash.substring(0, 16) + '...' : 'Não coletado'}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-400">IP Origem</span>
                                <span className="font-mono font-bold text-blue-300">{p.ip_address || 'Não coletado'}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-400">Geolocalização</span>
                                <span className="font-mono font-bold text-emerald-300">
                                  {p.geo_lat && p.geo_lng ? `${Number(p.geo_lat).toFixed(4)}, ${Number(p.geo_lng).toFixed(4)}` : 'Não autorizado'}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-400">Session ID</span>
                                <span className="font-mono font-bold text-amber-300">{p.session_uuid ? p.session_uuid.substring(0, 12) + '...' : '-'}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-400">Dispositivo</span>
                                <span className="font-bold text-slate-300 truncate max-w-[180px]" title={p.user_agent}>{p.user_agent ? (p.user_agent.length > 30 ? p.user_agent.substring(0, 30) + '...' : p.user_agent) : '-'}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-400">Duplicata</span>
                                <span className={`font-black ${p.flag_duplicata ? 'text-rose-400' : 'text-emerald-400'}`}>{p.flag_duplicata ? '⚠️ SIM' : '✅ NÃO'}</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
