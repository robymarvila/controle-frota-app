import React, { useState, useMemo, useEffect } from 'react';
import { 
  Search, Wrench, Home, Truck, CheckCircle2, ClipboardCheck, 
  AlertCircle, X, ChevronRight, PlayCircle, Eye, ShieldAlert,
  Clock, Info, FileText, Check, MessageSquarePlus, MessageSquare, 
  History, User, LayoutGrid, List, LayoutTemplate, EyeOff, LogOut
} from 'lucide-react';

const LISTA_OFICINAS_BASE = [
  'UNION FLEX', 'DANNIL', 'HIDROCAM', 'LOCALIZA RENT A CAR', 'LOCALIZA FLEET',
  'HALVA REMOCOES E TRANSPORTE', 'OFICINA AUTOCAR', 'OFICINA APICE',
  'OFICINA BORRACHARIA VEMAG', 'OFICINA CHAMPION', 'OFICINA GENESIS AUTOVIDRO',
  'OFICINA PAULO NEVES', 'OFICINA NOVA JUCAR AUTO ESTUFA', 'OFICINA MOTORNORTE',
  'OFICINA SAMUEL AUTO CAR', 'OFICINA POPEYES', 'OFICINA VAMOS', 'FROTA MANUTENÇÃO',
  'OFICINA MB', 'DIBRACAM', 'AEROBRASIL MECANICA', 'DENIGRIS - MERCEDES', 'O CARRO AUTO CENTER'
];

const getListaOficinasAtualizada = () => {
  try {
    const cached = localStorage.getItem('fleet_oficinas_cadastradas_v1');
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const activeOrPre = parsed
          .filter(o => {
            const status = (o.status || '').trim().toUpperCase();
            return status === 'ATIVO' || status === 'ATIVA' || status === 'PRÉ-CADASTRO' || status === 'PRE-CADASTRO' || o.is_pre_cadastro || !status;
          })
          .map(o => String(o.nome_fantasia || o.razao_social || '').trim().toUpperCase())
          .filter(Boolean);

        if (activeOrPre.length > 0) {
          return Array.from(new Set(activeOrPre)).sort((a, b) => a.localeCompare(b, 'pt-BR'));
        }
      }
    }
  } catch (e) {
    console.warn('Erro ao ler oficinas cadastradas em MecanicoView:', e);
  }
  return LISTA_OFICINAS_BASE;
};

export default function MecanicoView({ chamados, vehicles, onWorkflowTransition, onSubmit, currentUser, listaOficinas }) {
  const [activeTab, setActiveTab] = useState('ANALISE'); // 'ANALISE', 'INTERNA', 'USUARIO'
  const [activeType, setActiveType] = useState('TODOS');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('CARD'); // 'CARD', 'LISTA', 'AGRUPADO'
  
  const optionsOficinas = useMemo(() => {
    if (Array.isArray(listaOficinas) && listaOficinas.length > 0) return listaOficinas;
    return getListaOficinasAtualizada();
  }, [listaOficinas]);
  
  // Modals state
  const [selectedChamado, setSelectedChamado] = useState(null); // For 'Iniciar Diagnóstico'
  const [detailChamado, setDetailChamado] = useState(null); // For 'Detalhes e Comentários'
  const [liberarChamado, setLiberarChamado] = useState(null); // For 'Liberar Veículo'
  
  // Forms state
  const [modalMode, setModalMode] = useState('Interna');
  const [diagnostico, setDiagnostico] = useState('');
  const [pecas, setPecas] = useState('');
  const [oficinaExterna, setOficinaExterna] = useState('');
  const [comentarioExterna, setComentarioExterna] = useState('');
  const [novoComentario, setNovoComentario] = useState('');
  const [comentarioLiberacao, setComentarioLiberacao] = useState('');

  // User Profile State
  const [showSenha, setShowSenha] = useState(false);

  // Helper
  const vehiclesMap = useMemo(() => new Map(vehicles.map(v => [v.placa, v])), [vehicles]);
  const getVehicle = (placa) => vehiclesMap.get(placa) || {};

  // Filters
  const processedChamados = useMemo(() => {
    return chamados.filter(c => {
      const etapa = c.etapaWorkflow || 'Análise Frota';
      const isTargetEtapa = ['Análise Frota', 'Aguardando Manutenção', 'Oficina Interna'].includes(etapa);
      if (!isTargetEtapa) return false;

      const matchSearch = c.placa.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (c.codigoChamado || '').toLowerCase().includes(searchTerm.toLowerCase());

      const v = getVehicle(c.placa);
      const vehicleType = String(v.tipo || '').toUpperCase();
      const matchType = activeType === 'TODOS' || 
                        (activeType === 'PESADO' && vehicleType === 'PESADO') ||
                        (activeType === 'LEVE' && vehicleType === 'LEVE') ||
                        (activeType === 'MOTO' && vehicleType === 'MOTO');

      return matchSearch && matchType;
    });
  }, [chamados, vehicles, searchTerm, activeType]);

  const analiseChamados = useMemo(() => processedChamados.filter(c => ['Análise Frota', 'Aguardando Manutenção'].includes(c.etapaWorkflow || 'Análise Frota')), [processedChamados]);
  const oficinaInternaChamados = useMemo(() => processedChamados.filter(c => c.etapaWorkflow === 'Oficina Interna'), [processedChamados]);

  // Actions - Iniciar Diagnóstico
  const handleOpenAction = (chamado) => {
    setSelectedChamado(chamado);
    setDiagnostico(''); setPecas(''); setOficinaExterna(''); setComentarioExterna('');
    setModalMode('Interna');
  };

  const handleConfirmAnalise = (e) => {
    e.preventDefault();
    if (!selectedChamado) return;

    if (modalMode === 'Interna') {
      if (!diagnostico.trim()) return alert('Por favor, informe o que precisa ser feito.');
      const log = `Mecânico direcionou para Oficina Interna. Diagnóstico: ${diagnostico.trim()}${pecas.trim() ? ' | Peças: ' + pecas.trim() : ''}`;
      onWorkflowTransition(selectedChamado.id, 'Oficina Interna', log, {
        dadosWorkflow: { ...selectedChamado.dadosWorkflow, tipoOficina: 'Interna', pecasNecessarias: pecas.trim(), diagnosticoMecanico: diagnostico.trim() }
      });
    } else {
      if (!oficinaExterna) return alert('Por favor, selecione a oficina externa.');
      const log = `Mecânico sinalizou necessidade de Oficina Externa (${oficinaExterna}). Motivo: ${comentarioExterna.trim() || 'Não informado'}`;
      onSubmit({
        ...selectedChamado,
        oficinaDestino: oficinaExterna,
        oficinaExterna: 'SIM',
        dadosWorkflow: {
          ...selectedChamado.dadosWorkflow, sugestaoMecanico: 'Externa', tipoOficina: 'Externa',
          oficinaDestino: oficinaExterna, diagnosticoMecanico: comentarioExterna.trim()
        },
        historicoModificacoes: [{ id: Date.now(), dataHora: new Date().toISOString(), usuario: currentUser?.nome || 'Mecânico', descricao: log }, ...(selectedChamado.historicoModificacoes || [])]
      });
    }
    setSelectedChamado(null);
  };

  // Actions - Detalhes e Comentários
  const handleOpenDetails = (chamado) => {
    setDetailChamado(chamado);
    setNovoComentario('');
  };

  const handleAddComment = () => {
    if (!novoComentario.trim()) return;
    const log = `Comentário do Mecânico: ${novoComentario.trim()}`;
    const updated = {
      ...detailChamado,
      historicoModificacoes: [{ id: Date.now(), dataHora: new Date().toISOString(), usuario: currentUser?.nome || 'Mecânico', descricao: log }, ...(detailChamado.historicoModificacoes || [])]
    };
    onSubmit(updated);
    setDetailChamado(updated);
    setNovoComentario('');
  };

  // Actions - Liberar Veículo
  const handleOpenLiberar = (chamado) => {
    setLiberarChamado(chamado);
    setComentarioLiberacao('');
  };

  const handleToggleDefeito = (defeitoId) => {
    if (!liberarChamado) return;
    const updatedDefeitos = (liberarChamado.defeitos || []).map(d =>
      d.id === defeitoId ? { ...d, status: d.status === 'RESOLVIDO' ? 'PENDENTE' : 'RESOLVIDO', dataResolucao: d.status === 'RESOLVIDO' ? null : new Date().toISOString() } : d
    );
    const updated = { ...liberarChamado, defeitos: updatedDefeitos, silentSave: true };
    setLiberarChamado(updated);
    onSubmit(updated);
  };

  const handleConfirmLiberacao = () => {
    if (!liberarChamado) return;
    const unresolved = (liberarChamado.defeitos || []).filter(d => d.status !== 'RESOLVIDO');
    if (unresolved.length > 0) {
      return alert('Não é possível liberar. Conclua todos os defeitos selecionando-os na lista.');
    }
    let log = 'Mecânico concluiu a manutenção interna e liberou o veículo para Operação.';
    if (comentarioLiberacao.trim()) log += ` Obs: ${comentarioLiberacao.trim()}`;
    
    onWorkflowTransition(liberarChamado.id, 'Liberado Operação', log);
    setLiberarChamado(null);
  };

  const handleSystemLogout = () => {
    if (window.confirm('Deseja realmente sair do sistema?')) {
      sessionStorage.removeItem('currentUser');
      window.location.reload();
    }
  };

  // UI Components
  const CardVeiculo = ({ c, tab, view = 'CARD' }) => {
    const vec = getVehicle(c.placa);
    const hasSugestao = c.dadosWorkflow?.sugestaoMecanico === 'Externa';
    const totalDef = (c.defeitos || []).length;
    const resolvedDef = (c.defeitos || []).filter(d => d.status === 'RESOLVIDO').length;

    if (view === 'LISTA') {
      return (
        <div className="bg-white/80 backdrop-blur-md border border-white shadow-sm hover:shadow-md transition-all rounded-2xl p-4 flex items-center justify-between gap-4">
          <div className="flex-1 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6">
            <div>
              <h4 className="text-xl font-black text-slate-800">{c.placa}</h4>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{vec.marca || '--'} • {vec.subTipo || vec.tipo || '--'}</p>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex flex-col">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Defeitos</span>
                <span className="text-sm font-black text-slate-700">{resolvedDef}/{totalDef}</span>
              </div>
              
              {hasSugestao && (
                <div className="bg-amber-50 text-amber-700 p-1.5 rounded-lg" title="Sinalizado p/ Externa">
                  <Info size={16} />
                </div>
              )}
            </div>
          </div>
          
          <div className="flex gap-2">
            <button onClick={() => handleOpenDetails(c)} className="p-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all">
              <Eye size={18}/>
            </button>
            {tab === 'ANALISE' ? (
              <button onClick={() => handleOpenAction(c)} className="p-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-all shadow-md shadow-emerald-200">
                <Wrench size={18}/>
              </button>
            ) : (
              <button onClick={() => handleOpenLiberar(c)} className="p-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl transition-all shadow-md shadow-emerald-200">
                <PlayCircle size={18}/>
              </button>
            )}
          </div>
        </div>
      );
    }

    // Default CARD view
    return (
      <div className="bg-white/80 backdrop-blur-xl border border-white shadow-lg shadow-slate-200/50 p-6 rounded-[2rem] space-y-5 animate-in slide-in-from-bottom-4 duration-500 hover:shadow-xl transition-all">
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h4 className="text-3xl font-black text-slate-800 tracking-tight">{c.placa}</h4>
              {vec.regional && (
                <span className="px-2.5 py-1 bg-emerald-100/80 text-emerald-800 rounded-full text-[10px] font-black uppercase tracking-wider">{vec.regional}</span>
              )}
            </div>
            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">{vec.marca || '--'} • {vec.subTipo || vec.tipo || '--'}</p>
          </div>
          <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider shadow-sm ${
            c.situacaoVeiculo === 'RODANDO' ? 'bg-emerald-100/80 text-emerald-800' : 'bg-rose-100/80 text-rose-800'
          }`}>
            {c.situacaoVeiculo || 'RODANDO'}
          </span>
        </div>

        {/* Defeitos Preview */}
        {totalDef > 0 && (
          <div className="bg-slate-50/70 rounded-2xl p-4 border border-slate-100/80 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Defeitos Reportados</span>
              <span className="text-[10px] font-black text-slate-700 bg-white px-2 py-1 rounded-lg shadow-sm">{totalDef}</span>
            </div>
            {tab === 'INTERNA' && (
              <div className="mt-2 space-y-1.5">
                <div className="flex justify-between text-[10px] font-bold text-slate-500">
                  <span>Progresso da Manutenção</span>
                  <span>{resolvedDef}/{totalDef} concluídos</span>
                </div>
                <div className="bg-slate-200/60 h-2 rounded-full overflow-hidden">
                  <div className="bg-emerald-500 h-full rounded-full transition-all duration-500" style={{ width: `${(resolvedDef / Math.max(1, totalDef)) * 100}%` }} />
                </div>
              </div>
            )}
          </div>
        )}

        {hasSugestao && (
          <div className="bg-amber-50/80 border border-amber-200/50 text-amber-800 p-3.5 rounded-2xl text-xs font-bold flex items-center gap-2 backdrop-blur-sm">
            <Info size={16} className="shrink-0 text-amber-500" />
            Sinalizado p/ Externa ({c.oficinaDestino})
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 pt-2">
          <button
            onClick={() => handleOpenDetails(c)}
            className="w-full py-4 bg-slate-100/80 hover:bg-slate-200 text-slate-700 rounded-[1.5rem] text-xs font-black transition-all active:scale-95 flex flex-col items-center justify-center gap-1.5"
          >
            <Eye size={18}/>
            <span>Detalhes / Histórico</span>
          </button>
          
          {tab === 'ANALISE' ? (
            <button
              onClick={() => handleOpenAction(c)}
              className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-[1.5rem] text-xs font-black shadow-lg shadow-emerald-200/50 transition-all active:scale-95 flex flex-col items-center justify-center gap-1.5"
            >
              <Wrench size={18}/>
              <span>Diagnóstico</span>
            </button>
          ) : (
            <button
              onClick={() => handleOpenLiberar(c)}
              className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-[1.5rem] text-xs font-black shadow-lg shadow-emerald-200/50 transition-all active:scale-95 flex flex-col items-center justify-center gap-1.5"
            >
              <PlayCircle size={18}/>
              <span>Liberar para Operação</span>
            </button>
          )}
        </div>
      </div>
    );
  };

  const renderChamados = (chamadosList, tab) => {
    if (chamadosList.length === 0) {
      return (
        <div className="text-center py-16 px-6 bg-white/60 backdrop-blur-xl rounded-[2.5rem] border-2 border-dashed border-slate-200">
          <div className="w-16 h-16 mx-auto bg-white rounded-full flex items-center justify-center text-slate-400 mb-4 shadow-sm">
            <CheckCircle2 size={32}/>
          </div>
          <h3 className="text-lg font-black text-slate-700">Tudo limpo por aqui!</h3>
          <p className="text-sm font-medium text-slate-500 mt-2">Nenhum veículo nesta etapa no momento.</p>
        </div>
      );
    }

    if (viewMode === 'AGRUPADO') {
      const pesados = chamadosList.filter(c => getVehicle(c.placa)?.tipo?.toUpperCase() === 'PESADO');
      const leves = chamadosList.filter(c => getVehicle(c.placa)?.tipo?.toUpperCase() === 'LEVE');
      const motos = chamadosList.filter(c => getVehicle(c.placa)?.tipo?.toUpperCase() === 'MOTO');
      const outros = chamadosList.filter(c => {
        const t = getVehicle(c.placa)?.tipo?.toUpperCase();
        return !['PESADO', 'LEVE', 'MOTO'].includes(t);
      });

      return (
        <div className="space-y-8">
          {pesados.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-black text-slate-800 flex items-center gap-2 px-2"><Truck size={20} className="text-emerald-500"/> Veículos Pesados ({pesados.length})</h3>
              <div className="space-y-4">{pesados.map(c => <CardVeiculo key={c.id} c={c} tab={tab} view="CARD" />)}</div>
            </div>
          )}
          {leves.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-black text-slate-800 flex items-center gap-2 px-2"><Home size={20} className="text-emerald-500"/> Veículos Leves ({leves.length})</h3>
              <div className="space-y-4">{leves.map(c => <CardVeiculo key={c.id} c={c} tab={tab} view="CARD" />)}</div>
            </div>
          )}
          {motos.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-black text-slate-800 flex items-center gap-2 px-2"><PlayCircle size={20} className="text-amber-500"/> Motocicletas ({motos.length})</h3>
              <div className="space-y-4">{motos.map(c => <CardVeiculo key={c.id} c={c} tab={tab} view="CARD" />)}</div>
            </div>
          )}
          {outros.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-black text-slate-800 flex items-center gap-2 px-2"><Info size={20} className="text-slate-500"/> Outros ({outros.length})</h3>
              <div className="space-y-4">{outros.map(c => <CardVeiculo key={c.id} c={c} tab={tab} view="CARD" />)}</div>
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {chamadosList.map(c => (
          <CardVeiculo key={c.id} c={c} tab={tab} view={viewMode} />
        ))}
      </div>
    );
  };

  return (
    <div className="bg-[#F8FAFC] min-h-screen pb-28 font-sans relative selection:bg-emerald-200">
      
      {/* Dynamic Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[0%] left-[-10%] w-[50%] h-[50%] bg-emerald-200/30 rounded-full blur-[120px]" />
        <div className="absolute bottom-[20%] right-[-10%] w-[60%] h-[60%] bg-teal-200/30 rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 max-w-2xl mx-auto p-4 md:p-6 space-y-6">
        
        {activeTab === 'USUARIO' ? (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Header Banner - Like screenshot */}
            <div className="bg-[#0eb981] p-6 pt-8 text-white rounded-[2rem] shadow-lg relative overflow-hidden shrink-0 min-h-[160px] flex items-center">
              <div className="absolute -top-10 -left-10 w-28 h-28 bg-white/10 rounded-full blur-2xl pointer-events-none" />
              <div className="flex items-center gap-4 relative z-10 w-full">
                <div className="w-20 h-20 rounded-[1.2rem] bg-white/20 backdrop-blur-md text-white flex items-center justify-center font-black text-3xl shadow-inner border border-white/30 uppercase">
                  {currentUser?.nome?.charAt(0) || 'M'}
                </div>
                <div>
                  <h2 className="text-2xl font-black tracking-tight uppercase leading-tight text-white mb-1">{currentUser?.nome || 'Mecânico'}</h2>
                  <span className="inline-block bg-white/25 backdrop-blur-sm border border-white/20 text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full shadow-sm text-white">
                    {currentUser?.perfil || 'Mecânico'}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-[2rem] shadow-[0_8px_30px_rgba(0,0,0,0.02)] border border-slate-200/60 space-y-5">
              <h3 className="font-black text-slate-800 text-xs uppercase tracking-wider mb-2 border-b border-slate-100 pb-3 flex items-center gap-2">
                <User size={16} className="text-[#0eb981]" /> Meus Dados Cadastrais
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 mb-1.5 tracking-wider">Nome Completo</label>
                  <input 
                    readOnly
                    type="text" 
                    value={currentUser?.nome?.toUpperCase() || ''} 
                    className="w-full p-4 bg-slate-50/70 rounded-xl font-bold text-slate-700 outline-none border border-slate-200 focus:ring-2 focus:ring-emerald-500 transition-all text-xs uppercase"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 mb-1.5 tracking-wider">Login / Usuário</label>
                  <input 
                    readOnly
                    type="text" 
                    value={currentUser?.login?.toLowerCase() || ''} 
                    className="w-full p-4 bg-slate-50/70 rounded-xl font-bold text-slate-700 outline-none border border-slate-200 focus:ring-2 focus:ring-emerald-500 transition-all text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 mb-1.5 tracking-wider">Senha do Sistema</label>
                  <div className="relative">
                    <input 
                      readOnly
                      type={showSenha ? "text" : "password"} 
                      value={currentUser?.senha || '********'} 
                      className="w-full p-4 bg-slate-50/70 rounded-xl font-bold text-slate-700 outline-none border border-slate-200 focus:ring-2 focus:ring-emerald-500 transition-all pr-12 text-xs"
                    />
                    <button 
                      type="button" 
                      onClick={() => setShowSenha(!showSenha)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-emerald-600 transition-colors"
                    >
                      {showSenha ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-400 mb-1.5 tracking-wider">Telefone</label>
                    <input 
                      readOnly
                      type="text" 
                      value={currentUser?.telefone || ''} 
                      className="w-full p-4 bg-slate-50/70 rounded-xl font-bold text-slate-700 outline-none border border-slate-200 focus:ring-2 focus:ring-emerald-500 transition-all text-xs"
                      placeholder="DDD 99999-9999"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-400 mb-1.5 tracking-wider">Matrícula</label>
                    <input 
                      readOnly
                      type="text" 
                      value={currentUser?.matricula || ''} 
                      className="w-full p-4 bg-slate-50/70 rounded-xl font-bold text-slate-700 outline-none border border-slate-200 focus:ring-2 focus:ring-emerald-500 transition-all text-xs"
                      placeholder="Nº da Matrícula"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-200">
                    <span className="block text-[9px] font-black uppercase text-slate-400 tracking-wider">Setor</span>
                    <span className="text-sm font-bold text-slate-700 block mt-1">{currentUser?.setor || 'Operações'}</span>
                  </div>
                  <div className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-200">
                    <span className="block text-[9px] font-black uppercase text-slate-400 tracking-wider">Regional</span>
                    <span className="text-sm font-bold text-slate-700 block mt-1">{currentUser?.regional || 'Norte'}</span>
                  </div>
                </div>
              </div>

              <button 
                type="button" 
                className="w-full py-4 bg-[#088c60] hover:bg-[#06724e] text-white font-black rounded-xl text-sm uppercase tracking-wider shadow-md shadow-emerald-500/20 active:scale-95 duration-200 transition-all flex items-center justify-center gap-2 mt-6"
              >
                Salvar Alterações <Check size={18} />
              </button>
            </div>

            <div className="bg-white p-8 rounded-[2rem] shadow-[0_8px_30px_rgba(0,0,0,0.02)] border border-rose-100 flex flex-col items-center justify-center text-center mt-6">
              <div className="w-14 h-14 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mb-4">
                <LogOut size={24} />
              </div>
              <h3 className="font-black text-slate-800 text-lg uppercase tracking-tight mb-1">Encerrar Sessão</h3>
              <p className="text-xs font-medium text-slate-400 mb-6">Você sairá da sua conta neste dispositivo.</p>
              <button 
                onClick={handleSystemLogout}
                className="w-full py-4 bg-rose-50 hover:bg-rose-100 text-rose-600 font-black rounded-xl text-sm uppercase tracking-wider transition-all active:scale-95"
              >
                Sair do Sistema
              </button>
            </div>

          </div>
        ) : (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Header Rich Welcome Card */}
            <div className="bg-gradient-to-br from-emerald-600 to-teal-800 text-white shadow-xl shadow-emerald-900/20 rounded-[2.5rem] p-8 relative overflow-hidden">
               <div className="absolute top-0 right-0 p-4 opacity-10"><Wrench size={140} /></div>
               <div className="relative z-10">
                  <h1 className="text-4xl font-black tracking-tight mb-2">Painel de Oficina</h1>
                  <p className="text-lg text-emerald-100 font-medium">Bem-vindo, <span className="text-white font-black">{currentUser?.nome?.split(' ')[0] || 'Mecânico'}</span>!</p>
                  <div className="mt-6 flex flex-wrap gap-3">
                     <span className="bg-white/20 backdrop-blur-md px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border border-white/20">
                       {analiseChamados.length + oficinaInternaChamados.length} Veículos na fila
                     </span>
                  </div>
               </div>
            </div>

            {/* Search & Filters */}
            <div className="bg-white/70 backdrop-blur-xl border border-white rounded-[2rem] p-4 shadow-lg shadow-slate-200/30 space-y-4">
              <div className="relative">
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={22} />
                <input 
                  type="text" 
                  placeholder="Buscar placa..." 
                  value={searchTerm} 
                  onChange={(e) => setSearchTerm(e.target.value)} 
                  className="w-full pl-14 pr-5 py-4 bg-white/50 border border-slate-200/50 rounded-[1.5rem] font-bold text-slate-700 outline-none focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-base placeholder:text-slate-400" 
                />
              </div>
              
              {/* Bloco 1 & Bloco 2: Filtros de Categoria e Modos de Visualização */}
              <div className="space-y-3 pt-1">
                {/* Bloco 1: Categoria de Veículo */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Categoria de Veículo</span>
                  <div className="grid grid-cols-4 gap-1.5 p-1 bg-slate-100/80 rounded-2xl">
                    {['TODOS', 'PESADO', 'LEVE', 'MOTO'].map(t => (
                      <button
                        key={t}
                        onClick={() => setActiveType(t)}
                        className={`py-2.5 rounded-xl text-[10px] sm:text-xs font-black tracking-wider transition-all active:scale-95 text-center ${
                          activeType === t 
                            ? 'bg-slate-800 text-white shadow-md' 
                            : 'text-slate-500 hover:bg-white/60 hover:text-slate-700'
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
                
                {/* Bloco 2: Modos de Visualização */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Modo de Visualização</span>
                    <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-md">
                      {viewMode === 'CARD' ? 'Cards' : viewMode === 'LISTA' ? 'Lista' : 'Agrupado'}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100/80 rounded-2xl">
                    <button 
                      onClick={() => setViewMode('CARD')} 
                      className={`flex items-center justify-center gap-2 py-2.5 rounded-xl font-black text-xs transition-all active:scale-95 ${
                        viewMode === 'CARD' 
                          ? 'bg-white shadow-sm text-emerald-600 font-extrabold' 
                          : 'text-slate-500 hover:text-slate-700'
                      }`}
                      title="Visão por Cards"
                    >
                      <LayoutGrid size={16}/>
                      <span>Cards</span>
                    </button>

                    <button 
                      onClick={() => setViewMode('LISTA')} 
                      className={`flex items-center justify-center gap-2 py-2.5 rounded-xl font-black text-xs transition-all active:scale-95 ${
                        viewMode === 'LISTA' 
                          ? 'bg-white shadow-sm text-emerald-600 font-extrabold' 
                          : 'text-slate-500 hover:text-slate-700'
                      }`}
                      title="Visão em Lista"
                    >
                      <List size={16}/>
                      <span>Lista</span>
                    </button>

                    <button 
                      onClick={() => setViewMode('AGRUPADO')} 
                      className={`flex items-center justify-center gap-2 py-2.5 rounded-xl font-black text-xs transition-all active:scale-95 ${
                        viewMode === 'AGRUPADO' 
                          ? 'bg-white shadow-sm text-emerald-600 font-extrabold' 
                          : 'text-slate-500 hover:text-slate-700'
                      }`}
                      title="Visão Agrupada por Tipo"
                    >
                      <LayoutTemplate size={16}/>
                      <span>Agrupado</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Content List */}
            <div className="space-y-5">
              <div className="flex items-center gap-3 px-2">
                <div className={`p-2.5 rounded-2xl ${activeTab === 'ANALISE' ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'}`}>
                  {activeTab === 'ANALISE' ? <Clock size={20}/> : <Home size={20}/>}
                </div>
                <h2 className="text-xl font-black text-slate-800">
                  {activeTab === 'ANALISE' ? 'Aguardando Análise' : 'Oficina Interna'}
                </h2>
                <span className="ml-auto bg-slate-200/50 text-slate-600 px-3 py-1 rounded-full text-xs font-black shadow-sm border border-slate-100">
                  {activeTab === 'ANALISE' ? analiseChamados.length : oficinaInternaChamados.length}
                </span>
              </div>

              <div className="pb-8">
                {renderChamados(activeTab === 'ANALISE' ? analiseChamados : oficinaInternaChamados, activeTab)}
              </div>
            </div>
          </div>
        )}

      </div>

      {/* ── BOTTOM NAVIGATION (WhatsApp / Apple Glass Style) ── */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/85 dark:bg-slate-900/85 backdrop-blur-2xl border-t border-white/50 dark:border-slate-800 shadow-[0_-8px_30px_rgba(0,0,0,0.08)] px-2 pt-2 pb-[calc(8px+env(safe-area-inset-bottom,0px))]">
        <div className="max-w-md mx-auto grid grid-cols-3 gap-1 items-center">
          <button 
            onClick={() => setActiveTab('ANALISE')}
            className={`flex flex-col items-center justify-center gap-1 py-1.5 px-2 rounded-2xl transition-all active:scale-95 ${
              activeTab === 'ANALISE' 
                ? 'text-emerald-600 dark:text-emerald-400 font-extrabold' 
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <div className={`p-2 rounded-xl transition-all ${
              activeTab === 'ANALISE' 
                ? 'bg-emerald-100/90 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 shadow-sm scale-105' 
                : 'bg-transparent'
            }`}>
              <Clock size={22} strokeWidth={activeTab === 'ANALISE' ? 2.5 : 2} />
            </div>
            <span className="text-[11px] font-black tracking-tight leading-none">Análise</span>
          </button>
          
          <button 
            onClick={() => setActiveTab('INTERNA')}
            className={`flex flex-col items-center justify-center gap-1 py-1.5 px-2 rounded-2xl transition-all active:scale-95 ${
              activeTab === 'INTERNA' 
                ? 'text-emerald-600 dark:text-emerald-400 font-extrabold' 
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <div className={`p-2 rounded-xl transition-all ${
              activeTab === 'INTERNA' 
                ? 'bg-emerald-100/90 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 shadow-sm scale-105' 
                : 'bg-transparent'
            }`}>
              <Home size={22} strokeWidth={activeTab === 'INTERNA' ? 2.5 : 2} />
            </div>
            <span className="text-[11px] font-black tracking-tight leading-none">Interna</span>
          </button>

          <button 
            onClick={() => setActiveTab('USUARIO')}
            className={`flex flex-col items-center justify-center gap-1 py-1.5 px-2 rounded-2xl transition-all active:scale-95 ${
              activeTab === 'USUARIO' 
                ? 'text-emerald-600 dark:text-emerald-400 font-extrabold' 
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <div className={`p-2 rounded-xl transition-all ${
              activeTab === 'USUARIO' 
                ? 'bg-emerald-100/90 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 shadow-sm scale-105' 
                : 'bg-transparent'
            }`}>
              <User size={22} strokeWidth={activeTab === 'USUARIO' ? 2.5 : 2} />
            </div>
            <span className="text-[11px] font-black tracking-tight leading-none truncate max-w-full">
              {currentUser?.nome?.split(' ')[0] || 'Perfil'}
            </span>
          </button>
        </div>
      </div>

      {/* ── MODAL DE DETALHES E COMENTÁRIOS ── */}
      {detailChamado && (
        <div className="fixed inset-0 z-50 flex justify-center items-end sm:items-center bg-slate-900/40 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-300">
          <div className="bg-white/95 backdrop-blur-2xl w-full sm:max-w-lg rounded-t-[2.5rem] sm:rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col max-h-[90vh] animate-in slide-in-from-bottom-8">
            <div className="p-6 bg-white/80 border-b border-slate-100 flex justify-between items-center sticky top-0 z-10 backdrop-blur-xl">
              <div>
                <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest block mb-1">Detalhes do Chamado</span>
                <h3 className="text-3xl font-black text-slate-800 tracking-tight">{detailChamado.placa}</h3>
              </div>
              <button onClick={() => setDetailChamado(null)} className="p-2.5 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-500 transition-colors"><X size={24}/></button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-6 flex-1 hide-scrollbar">
              {/* Defeitos */}
              <div className="space-y-4">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <AlertCircle size={16}/> Defeitos Reportados
                </h4>
                {detailChamado.defeitos?.length > 0 ? (
                  <div className="space-y-3">
                    {detailChamado.defeitos.map((d, i) => (
                      <div key={d.id || i} className="p-4 bg-slate-50/80 border border-slate-100 rounded-[1.5rem]">
                        <p className="text-sm font-bold text-slate-800">{d.descricao}</p>
                        <div className="flex gap-2 mt-2">
                          <span className="text-[10px] font-black bg-white px-2.5 py-1 rounded-lg shadow-sm text-slate-500 uppercase tracking-wider">{d.categoria}</span>
                          {d.status === 'RESOLVIDO' && <span className="text-[10px] font-black bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-lg uppercase tracking-wider">Resolvido</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm font-medium text-slate-400 italic">Nenhum defeito listado neste chamado.</p>
                )}
              </div>

              {/* Comentários */}
              <div className="space-y-3">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <MessageSquare size={16}/> Adicionar Comentário na OS
                </h4>
                <textarea 
                  value={novoComentario}
                  onChange={e => setNovoComentario(e.target.value)}
                  placeholder="Peças a comprar, serviços realizados, observações gerais..."
                  className="w-full p-4 bg-slate-50/80 border border-slate-200 rounded-[1.5rem] font-medium text-slate-700 outline-none focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 min-h-[120px] resize-none text-sm"
                />
                <button 
                  onClick={handleAddComment}
                  disabled={!novoComentario.trim()}
                  className="w-full py-4 bg-slate-800 hover:bg-slate-900 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-[1.5rem] text-sm font-black shadow-lg shadow-slate-200 transition-all active:scale-95 flex justify-center items-center gap-2"
                >
                  <MessageSquarePlus size={18}/> Salvar Comentário
                </button>
              </div>

              {/* Histórico Recente */}
              {detailChamado.historicoModificacoes?.length > 0 && (
                <div className="space-y-4 pt-4 border-t border-slate-100">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Histórico Recente</h4>
                  <div className="space-y-4">
                    {detailChamado.historicoModificacoes.slice(0, 5).map((h, i) => (
                      <div key={h.id || i} className="flex gap-3 text-sm">
                        <div className="w-2 h-2 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                        <div>
                          <p className="font-bold text-slate-700">{h.descricao}</p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase mt-1 tracking-wider">{h.usuario} • {new Date(h.dataHora).toLocaleDateString('pt-BR')} {new Date(h.dataHora).toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'})}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL DE INICIAR DIAGNÓSTICO (Ação Análise) ── */}
      {selectedChamado && (
        <div className="fixed inset-0 z-50 flex justify-center items-end sm:items-center bg-slate-900/40 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-300">
          <div className="bg-white/95 backdrop-blur-2xl w-full sm:max-w-lg rounded-t-[2.5rem] sm:rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col max-h-[90vh] animate-in slide-in-from-bottom-8">
            <div className="p-6 bg-slate-900 flex justify-between items-center sticky top-0 z-10">
              <div>
                <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest block mb-1">Processamento de Chamado</span>
                <h3 className="text-3xl font-black text-white tracking-tight">{selectedChamado.placa}</h3>
              </div>
              <button onClick={() => setSelectedChamado(null)} className="p-2.5 bg-white/10 rounded-full text-white hover:bg-rose-500 transition-colors"><X size={24}/></button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 hide-scrollbar">
              <form onSubmit={handleConfirmAnalise} className="space-y-6">
                <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1.5 rounded-[1.8rem]">
                  <button type="button" onClick={() => setModalMode('Interna')} className={`py-4 rounded-[1.5rem] text-sm font-black transition-all flex items-center justify-center gap-2 ${modalMode === 'Interna' ? 'bg-white shadow-sm text-emerald-600' : 'text-slate-500 hover:text-slate-800'}`}>
                    <Home size={18}/> Interna
                  </button>
                  <button type="button" onClick={() => setModalMode('Externa')} className={`py-4 rounded-[1.5rem] text-sm font-black transition-all flex items-center justify-center gap-2 ${modalMode === 'Externa' ? 'bg-white shadow-sm text-emerald-600' : 'text-slate-500 hover:text-slate-800'}`}>
                    <Truck size={18}/> Externa
                  </button>
                </div>

                {modalMode === 'Interna' ? (
                  <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
                    <div>
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-2">Diagnóstico / O que precisa ser feito? <span className="text-rose-500">*</span></label>
                      <textarea required value={diagnostico} onChange={e => setDiagnostico(e.target.value)} placeholder="Ex: Troca de óleo, reparo no sistema hidráulico..." className="w-full p-4 bg-slate-50 border border-slate-200 rounded-[1.5rem] font-medium text-slate-700 outline-none focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 min-h-[120px] resize-none text-sm" />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-2">Peças Necessárias (Se houver)</label>
                      <textarea value={pecas} onChange={e => setPecas(e.target.value)} placeholder="Ex: 2L óleo hidráulico, filtro..." className="w-full p-4 bg-slate-50 border border-slate-200 rounded-[1.5rem] font-medium text-slate-700 outline-none focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 min-h-[80px] resize-none text-sm" />
                    </div>
                    <button type="submit" className="w-full py-5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-[1.5rem] text-sm font-black shadow-lg shadow-emerald-200/50 transition-all active:scale-95 mt-4">
                      Confirmar Entrada na Oficina Interna
                    </button>
                  </div>
                ) : (
                  <div className="space-y-5 animate-in fade-in slide-in-from-left-4 duration-300">
                    <div>
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-2">Selecione a Oficina Externa <span className="text-rose-500">*</span></label>
                      <select required value={oficinaExterna} onChange={e => setOficinaExterna(e.target.value)} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-[1.5rem] font-black text-slate-700 outline-none focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm">
                        <option value="">Selecione a Oficina...</option>
                        {optionsOficinas.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-2">Motivo / Defeito</label>
                      <textarea value={comentarioExterna} onChange={e => setComentarioExterna(e.target.value)} placeholder="Descreva o motivo pelo qual o reparo não pode ser feito internamente..." className="w-full p-4 bg-slate-50 border border-slate-200 rounded-[1.5rem] font-medium text-slate-700 outline-none focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 min-h-[120px] resize-none text-sm" />
                    </div>
                    <button type="submit" className="w-full py-5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-[1.5rem] text-sm font-black shadow-lg shadow-emerald-200/50 transition-all active:scale-95 mt-4">
                      Sinalizar Necessidade de Oficina Externa
                    </button>
                  </div>
                )}
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL DE LIBERAR VEÍCULO (Ação Interna) ── */}
      {liberarChamado && (
        <div className="fixed inset-0 z-50 flex justify-center items-end sm:items-center bg-slate-900/40 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-300">
          <div className="bg-white/95 backdrop-blur-2xl w-full sm:max-w-lg rounded-t-[2.5rem] sm:rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col max-h-[90vh] animate-in slide-in-from-bottom-8">
            <div className="p-6 bg-slate-900 flex justify-between items-center sticky top-0 z-10">
              <div>
                <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest block mb-1">Liberação de Veículo</span>
                <h3 className="text-3xl font-black text-white tracking-tight">{liberarChamado.placa}</h3>
              </div>
              <button onClick={() => setLiberarChamado(null)} className="p-2.5 bg-white/10 rounded-full text-white hover:bg-rose-500 transition-colors"><X size={24}/></button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 space-y-6 hide-scrollbar pb-8">
              
              <div className="bg-slate-50/80 rounded-[2rem] p-5 border border-slate-100 space-y-4">
                <h4 className="text-[10px] font-black uppercase text-slate-500 tracking-widest flex items-center gap-2">
                  <ClipboardCheck size={16} className="text-emerald-500"/>
                  Checklist de Manutenção
                </h4>
                <p className="text-xs text-slate-500 font-medium">Você precisa selecionar os defeitos abaixo para confirmar a conclusão e liberar o veículo.</p>
                <div className="space-y-3 mt-2">
                  {(liberarChamado.defeitos || []).map((def, idx) => (
                    <div 
                      key={def.id || idx}
                      onClick={() => handleToggleDefeito(def.id)}
                      className={`flex items-center justify-between p-4 bg-white rounded-[1.5rem] border cursor-pointer shadow-sm hover:shadow-md active:scale-[0.98] transition-all ${
                        def.status === 'RESOLVIDO' ? 'border-emerald-300 bg-emerald-50/30' : 'border-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-[11px] font-black shrink-0 transition-all ${
                          def.status === 'RESOLVIDO' ? 'bg-emerald-500 scale-110 shadow-md shadow-emerald-200' : 'bg-slate-200 text-slate-500'
                        }`}>
                          {def.status === 'RESOLVIDO' ? <Check size={16}/> : idx + 1}
                        </div>
                        <div>
                          <p className={`text-sm font-bold transition-colors ${
                            def.status === 'RESOLVIDO' ? 'text-slate-400 line-through' : 'text-slate-700'
                          }`}>
                            {def.descricao}
                          </p>
                          <span className="text-[9px] font-black text-slate-400 uppercase mt-1 block tracking-wider">{def.categoria}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                  {(liberarChamado.defeitos || []).length === 0 && (
                    <p className="text-sm font-medium text-slate-400 italic">Nenhum defeito listado no checklist.</p>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Comentário de Liberação (Opcional)</h4>
                <textarea 
                  value={comentarioLiberacao}
                  onChange={e => setComentarioLiberacao(e.target.value)}
                  placeholder="Informações adicionais sobre o serviço executado (irá para o histórico)..."
                  className="w-full p-4 bg-slate-50/80 border border-slate-200 rounded-[1.5rem] font-medium text-slate-700 outline-none focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 min-h-[120px] resize-none text-sm"
                />
              </div>

              {(liberarChamado.defeitos || []).some(d => d.status !== 'RESOLVIDO') ? (
                <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-[1.5rem] text-xs font-bold flex gap-3 shadow-sm mt-4">
                  <AlertCircle size={18} className="shrink-0 mt-0.5 text-amber-500" />
                  Resolva todos os defeitos do checklist acima para prosseguir com a liberação.
                </div>
              ) : (
                <button
                  onClick={handleConfirmLiberacao}
                  className="w-full py-5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-[1.5rem] text-sm font-black shadow-lg shadow-emerald-200/50 transition-all active:scale-95 flex justify-center items-center gap-2 mt-4"
                >
                  <CheckCircle2 size={20}/>
                  Liberar para Operação
                </button>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
