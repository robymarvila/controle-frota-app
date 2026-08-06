import React, { useState, useEffect } from 'react';
import { X, CheckCircle, Lock, Camera, Paperclip, Trash2, Info, ChevronDown, ChevronUp, Download, Play, Square, User, Clock, FileText, CalendarPlus } from 'lucide-react';
import { supabase } from '../../supabaseClient';
import TelaApresentacao from './TelaApresentacao';

const meses = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

function ExpandableText({ text, limit = 100 }) {
  const [expanded, setExpanded] = useState(false);
  if (!text) return null;
  if (text.length <= limit) return <span className="text-slate-600">{text}</span>;
  
  return (
    <div>
      <span className="text-slate-600">{expanded ? text : text.substring(0, limit) + '...'}</span>
      <button onClick={() => setExpanded(!expanded)} className="text-blue-600 font-bold hover:underline ml-1 text-[11px] inline-flex items-center gap-0.5">
        {expanded ? <>Esconder <ChevronUp size={12} /></> : <>Mostrar mais <ChevronDown size={12} /></>}
      </button>
    </div>
  );
}

function TaskCard({ t, catConfig, isCompleted, expired, isAdminOrCoord, onDelete, onConcluir, onRegistrarLog }) {
    const [execFormOpen, setExecFormOpen] = useState(false);
    const [showApresentacao, setShowApresentacao] = useState(false);
    const [horaInicio, setHoraInicio] = useState('');
    const [horaFim, setHoraFim] = useState('');
    const [obs, setObs] = useState('');
    const [file, setFile] = useState(null);
    const [logs, setLogs] = useState([]);
    const [logsOpen, setLogsOpen] = useState(false);

    const cfg = catConfig[t.tipo] || { card: 'bg-white border-slate-200', badge: 'bg-slate-100 text-slate-600', duration: 'N/I' };
    const cStyle = isCompleted ? cfg.card : (expired ? 'bg-rose-50 border-rose-300' : 'bg-white border-blue-950');
    const bStyle = isCompleted ? cfg.badge : (expired ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-600');
    const statusTag = isCompleted ? '' : (expired ? '(Vencida)' : '(Pendente)');
    const circleColor = isCompleted ? 'bg-emerald-500 ring-emerald-200' : (expired ? 'bg-rose-500 ring-rose-200' : 'bg-slate-300 ring-white');

    const fetchLogs = async () => {
        const { data } = await supabase.from('calendario_logs').select('*').eq('atividade_id', t.id).order('data_hora', { ascending: true });
        if (data) setLogs(data);
    };

    useEffect(() => {
        if (logsOpen) fetchLogs();
    }, [logsOpen]);

    const handleIniciarApresentacao = async () => {
        if (!t.hora_inicio_execucao && t.status === 'PENDENTE') {
            const nowTime = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            
            const { error } = await supabase.from('calendario_atividades').update({
                hora_inicio_execucao: nowTime,
                status: 'EM_ANDAMENTO'
            }).eq('id', t.id);

            if (error) {
                alert("Erro ao comunicar com servidor. Tente novamente.");
                return;
            }
            
            // Atualiza estado local para refletir a persistência instantânea
            t.hora_inicio_execucao = nowTime;
            t.status = 'EM_ANDAMENTO';
            if (onRegistrarLog) {
                await onRegistrarLog(t.id, 'INICIOU', null);
                fetchLogs(); // refresh logs
            }
        } else if (t.status === 'EM_ANDAMENTO') {
            // Se já estava em andamento e ele apertar o play novamente, é uma retomada
            if (onRegistrarLog) {
                await onRegistrarLog(t.id, 'RETOMOU', null);
                fetchLogs();
            }
        }
        setShowApresentacao(true);
    };

    const handleExecutar = async (e) => {
        e.preventDefault();
        if (!file) { alert("A foto/evidência é obrigatória."); return; }
        if (!horaInicio || !horaFim) { alert("Preencha a hora de início e fim."); return; }
        await onConcluir(t, file, { horaInicio, horaFim, obs });
        setExecFormOpen(false);
    };

    return (
        <div className="relative">
            <div className={`absolute w-3 h-3 rounded-full ${circleColor} ring-4 -left-[27px] top-1`}></div>
            <div className="text-xs font-bold text-slate-500 mb-1">{t.horario_programado.substring(0,5)} <span className="font-normal">({cfg.duration})</span></div>
            
            <div className={`border border-l-4 rounded-xl p-4 shadow-sm ${cStyle} ${isCompleted ? '' : (expired ? 'border-l-rose-500' : 'border-l-blue-950')}`}>
                <div className="flex justify-between items-start mb-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${bStyle}`}>{t.tipo} {statusTag}</span>
                    <div className="flex items-center gap-2">
                        <button onClick={() => setLogsOpen(!logsOpen)} className={`text-xs font-bold flex items-center gap-1 transition ${logsOpen ? 'text-blue-700' : 'text-slate-400 hover:text-blue-600'}`}>
                            <History size={14} /> Histórico
                        </button>
                        {isAdminOrCoord && !isCompleted && (
                            <button onClick={() => onDelete(t.id)} className="text-slate-400 hover:text-rose-600 transition"><Trash2 size={16} /></button>
                        )}
                    </div>
                </div>
                
                <h4 className="font-bold text-slate-800 text-sm leading-tight mb-1">{t.assunto}</h4>
                {t.observacao && (
                    <div className="text-xs text-slate-500 mt-2 bg-slate-50 p-2 rounded-lg border border-slate-100 flex items-start gap-1.5">
                        <Info size={14} className="mt-0.5 shrink-0 text-blue-500" /> 
                        <ExpandableText text={t.observacao} limit={80} />
                    </div>
                )}
                
                {t.anexo_programacao_url && (
                    <a href={t.anexo_programacao_url} target="_blank" rel="noreferrer" className="mt-3 group flex items-center justify-between bg-blue-50 hover:bg-blue-600 border border-blue-100 hover:border-blue-700 p-2.5 rounded-lg transition-all duration-300">
                        <div className="flex items-center gap-2 text-blue-800 group-hover:text-white">
                            <div className="bg-white p-1.5 rounded-md shadow-sm"><FileText size={16} className="text-blue-600" /></div>
                            <div className="text-xs font-bold truncate max-w-[200px]">{t.anexo_nome || 'Material Técnico'}</div>
                        </div>
                        <div className="text-blue-600 group-hover:text-white"><Download size={16} /></div>
                    </a>
                )}
                
                {logsOpen && (
                    <div className="mt-3 pt-3 border-t border-slate-200 bg-slate-50 p-3 rounded-lg text-xs space-y-2">
                        <h5 className="font-bold text-slate-700 mb-2 flex items-center gap-1.5"><Clock size={14} /> Histórico de Ações</h5>
                        {logs.length === 0 ? <p className="text-slate-400 italic">Carregando histórico...</p> : logs.map(l => (
                            <div key={l.id} className="flex gap-2 text-slate-600 border-l-2 border-slate-300 pl-2">
                                <User size={12} className="mt-0.5 shrink-0 opacity-50" />
                                <div>
                                    <span className="font-bold text-slate-800">{l.nome_usuario}</span> {l.acao.toLowerCase()} esta atividade em {new Date(l.data_hora).toLocaleString('pt-BR')}.
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                <div className="mt-4 pt-3 border-t border-slate-100">
                    {isCompleted ? (
                        <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-3">
                            <div className="flex justify-between items-center text-sm text-emerald-800 font-bold mb-2">
                                <span className="flex items-center gap-1.5"><CheckCircle size={16} /> Executado com Sucesso</span>
                                {t.evidencia_url && <a href={t.evidencia_url} target="_blank" rel="noreferrer" className="text-emerald-700 bg-emerald-200/50 hover:bg-emerald-200 px-2 py-1 rounded text-xs transition">Ver Evidência</a>}
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-xs text-emerald-700 mb-2">
                                <div><span className="opacity-70">Início:</span> <strong>{t.hora_inicio_execucao || '--:--'}</strong></div>
                                <div><span className="opacity-70">Fim:</span> <strong>{t.hora_fim_execucao || '--:--'}</strong></div>
                            </div>
                            {t.execucao_observacao && (
                                <div className="text-xs text-emerald-700 bg-white/50 p-2 rounded">
                                    <span className="opacity-70 font-bold block mb-0.5">Observação do Executor:</span>
                                    <ExpandableText text={t.execucao_observacao} limit={80} />
                                </div>
                            )}
                        </div>
                    ) : (expired ? (
                        <div className="w-full bg-rose-50 border border-rose-200 text-rose-700 font-bold py-2.5 rounded-lg text-xs flex items-center justify-center gap-1.5 shadow-sm cursor-not-allowed">
                            <Lock size={16} /> Prazo Expirado (Vencida)
                        </div>
                    ) : (
                        execFormOpen ? (
                            <form onSubmit={handleExecutar} className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-3 animate-in fade-in zoom-in-95 duration-200">
                                <div className="flex justify-between items-center mb-1">
                                    <h5 className="font-bold text-slate-700 text-xs uppercase tracking-wide">Finalizar Programação</h5>
                                    <button type="button" onClick={() => setExecFormOpen(false)} className="text-slate-400 hover:text-slate-700"><X size={16} /></button>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1 flex items-center gap-1"><Play size={10} /> Hora Início</label>
                                        <input type="time" required value={horaInicio} onChange={e=>setHoraInicio(e.target.value)} className="w-full border border-slate-300 rounded-lg p-2 text-xs focus:ring-2 focus:ring-emerald-500 outline-none" />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1 flex items-center gap-1"><Square size={10} /> Hora Fim</label>
                                        <input type="time" required value={horaFim} onChange={e=>setHoraFim(e.target.value)} className="w-full border border-slate-300 rounded-lg p-2 text-xs focus:ring-2 focus:ring-emerald-500 outline-none" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Observações da Execução</label>
                                    <textarea rows="2" placeholder="Descreva como foi, participantes, etc..." value={obs} onChange={e=>setObs(e.target.value)} className="w-full border border-slate-300 rounded-lg p-2 text-xs focus:ring-2 focus:ring-emerald-500 outline-none resize-none"></textarea>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Foto / Evidência (Obrigatório)</label>
                                    <div className={`border-2 border-dashed rounded-lg p-3 text-center relative cursor-pointer transition-all ${file ? 'border-emerald-500 bg-emerald-50' : 'border-slate-300 bg-white hover:border-slate-400'}`}>
                                        <input type="file" accept="image/*" required className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={(e) => setFile(e.target.files[0])} />
                                        <Camera size={20} className={`mx-auto mb-1 ${file ? 'text-emerald-500' : 'text-slate-400'}`} />
                                        <p className={`text-[10px] font-bold ${file ? 'text-emerald-700' : 'text-slate-500'}`}>
                                          {file ? file.name : 'Tirar foto ou anexar galeria'}
                                        </p>
                                    </div>
                                </div>
                                <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-lg text-xs transition shadow-sm flex justify-center items-center gap-1.5">
                                    <CheckCircle size={16} /> Salvar Execução
                                </button>
                            </form>
                        ) : (
                            <button onClick={handleIniciarApresentacao} className="w-full bg-blue-600 text-white font-black py-3.5 rounded-2xl text-sm hover:bg-blue-500 transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/30 uppercase tracking-widest active:scale-95 group">
                                <Play fill="currentColor" size={16} className="group-hover:scale-110 transition-transform" /> 
                                {t.status === 'EM_ANDAMENTO' ? 'Retomar Evento' : 'Iniciar Evento'}
                            </button>
                        )
                    ))}
                </div>

                {showApresentacao && (
                    <TelaApresentacao 
                        atividade={t}
                        catConfig={catConfig}
                        onEncerrar={(inicio, fim) => {
                            setShowApresentacao(false);
                            setHoraInicio(inicio.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
                            setHoraFim(fim.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
                            setExecFormOpen(true);
                        }}
                        onClose={() => setShowApresentacao(false)}
                    />
                )}
            </div>
        </div>
    )
}

function History({ size, className }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/></svg>
    )
}

export default function ModalExecucao({
  isOpen,
  onClose,
  selectedDateStr,
  activities,
  catConfig,
  onDelete,
  onConcluir,
  isAdminOrCoord,
  onNewProgramacao,
  onRegistrarLog
}) {
  const [currentShift, setCurrentShift] = useState('manha');

  if (!isOpen) return null;

  const [y, m, d] = selectedDateStr.split('-');
  const dateObj = new Date(y, m - 1, d);
  const title = dateObj.toLocaleDateString('pt-BR', { weekday: 'long' });
  const subtitle = `${d} de ${meses[m - 1]} de ${y}`;

  const shiftTasks = activities
    .filter(a => a.data_programada === selectedDateStr && a.turno === currentShift)
    .sort((a, b) => a.horario_programado.localeCompare(b.horario_programado));

  const isExpired = (dateStr, timeStr) => {
    const [yy, mm, dd] = dateStr.split('-');
    const [h, min] = timeStr.split(':');
    const taskDate = new Date(yy, mm - 1, dd, h, min);
    const limitDate = new Date(taskDate.getTime() + 24 * 60 * 60 * 1000);
    return new Date() > limitDate;
  };

  return (
    <>
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 animate-in fade-in duration-200" onClick={onClose}></div>
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-3xl bg-slate-50 rounded-2xl shadow-2xl z-50 flex flex-col overflow-hidden max-h-[90vh] border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
        
        <div className="bg-blue-950 text-white p-5 flex justify-between items-center shadow-sm z-10 relative">
          <div>
            <h3 className="text-xl font-extrabold tracking-tight capitalize">{title}</h3>
            <p className="text-xs text-blue-200 font-bold uppercase tracking-wider mt-0.5">{subtitle}</p>
          </div>
          <div className="flex items-center gap-3">
            {isAdminOrCoord && (
              <button 
                onClick={onNewProgramacao} 
                className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-3 rounded-lg text-xs transition flex items-center gap-1.5 shadow-sm active:scale-95 border border-blue-500"
              >
                <CalendarPlus size={14} /> <span className="hidden sm:inline">Nova Programação</span>
              </button>
            )}
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition shrink-0"><X size={18} /></button>
          </div>
        </div>

        <div className="bg-white border-b border-slate-200 p-2 flex gap-2 justify-center shadow-sm z-0">
          {['manha', 'tarde', 'noite'].map(s => (
            <button 
              key={s}
              onClick={() => setCurrentShift(s)} 
              className={`px-8 py-2 text-sm font-bold rounded-xl transition capitalize ${currentShift === s ? 'bg-blue-900 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              Turno {s}
            </button>
          ))}
        </div>

        <div className="p-6 overflow-y-auto flex-grow bg-slate-100">
          {shiftTasks.length === 0 ? (
            <div className="py-16 text-center text-slate-400 bg-white rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex justify-center mb-3 text-slate-300">
                    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 8h1a4 4 0 1 1 0 8h-1"/><path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z"/><line x1="6" x2="6" y1="2" y2="4"/><line x1="10" x2="10" y1="2" y2="4"/><line x1="14" x2="14" y1="2" y2="4"/></svg>
                </div>
                <p className="font-bold text-base text-slate-500">Turno Sem Escala</p>
                <p className="text-xs">Nenhuma programação agendada para este horário.</p>
            </div>
          ) : (
            <div className="border-l-2 border-slate-300 ml-4 space-y-6 pl-6 relative">
              {shiftTasks.map(t => {
                const isCompleted = t.status === 'EXECUTADO';
                const expired = !isCompleted && isExpired(selectedDateStr, t.horario_programado);
                return (
                    <TaskCard 
                        key={t.id} 
                        t={t} 
                        catConfig={catConfig} 
                        isCompleted={isCompleted} 
                        expired={expired} 
                        isAdminOrCoord={isAdminOrCoord} 
                        onDelete={onDelete} 
                        onConcluir={onConcluir} 
                        onRegistrarLog={onRegistrarLog}
                    />
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
