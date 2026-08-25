import React, { useState, useMemo } from 'react';
import { 
  Search, Filter, Plus, X, AlertTriangle, Eye, Truck, Home, Wrench, 
  CheckCircle2, PlayCircle, Clock, ClipboardCheck, CalendarDays, Users, 
  Boxes, ChevronRight, Briefcase, DollarSign, LayoutGrid, List, RefreshCcw, Building2, Check
} from 'lucide-react';

const calcularHorasParadas = (abertura, fechamento, hoje) => {
  const dataFechamento = fechamento ? new Date(fechamento) : (hoje ? new Date(hoje) : new Date());
  const diffMs = dataFechamento - new Date(abertura);
  const horas = diffMs / (1000 * 60 * 60);
  return horas > 0 ? horas : 0;
};

const formatarDataBR = (dataString) => {
  if (!dataString) return '--';
  const data = new Date(dataString);
  if (isNaN(data.getTime())) return String(dataString);
  const dia = String(data.getDate()).padStart(2, '0');
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const ano = data.getFullYear();
  const horas = String(data.getHours()).padStart(2, '0');
  const min = String(data.getMinutes()).padStart(2, '0');
  return `${dia}/${mes}/${ano} ${horas}:${min}`;
};

const getEtapaWorkflow = (c) => {
  if (!c) return 'Análise Frota';
  const stage = c.etapaWorkflow || '';
  if (stage === 'Aguardando Manutenção' || !stage) {
    return 'Análise Frota';
  }
  return stage;
};

export default function ChamadosView({ chamados, vehicles, hoje, onEditar, onLiberar, userPermissions, podeFinalizar, onNovoChamado }) {
  const vehiclesMap = useMemo(() => new Map((vehicles || []).map(v => [v.placa, v])), [vehicles]);

  // View Mode: 'executive' (Hub de Cards) vs 'classic' (2 Blocos Verticais)
  const [viewMode, setViewMode] = useState(() => {
    try {
      return localStorage.getItem('fleet_chamados_view_mode') || 'executive';
    } catch (e) {
      return 'executive';
    }
  });

  const handleSetViewMode = (mode) => {
    setViewMode(mode);
    try {
      localStorage.setItem('fleet_chamados_view_mode', mode);
    } catch (e) {}
  };

  const [filters, setFilters] = useState({ turno: '', tipoOp: '', subTipo: '', etapa: '', subFluxo: '' });
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [showChamadosFiltersModal, setShowChamadosFiltersModal] = useState(false);

  // Card Interactive Filter State
  const [cardFilter, setCardFilter] = useState({
    type: 'ALL', // 'ALL' | 'IMPEDITIVO' | 'NAO_IMPEDITIVO' | 'OFICINA_EXTERNA' | 'OFICINA_INTERNA'
    subTipo: '',  // 'Cesto Aéreo' | 'Munk' | 'Moto' | 'Fiorino' | 'Argo' | 'Outros'
    oficina: '',  // Nome da oficina externa
    subFluxo: ''  // 'DIRETA' | 'COMPRAS' | 'FINANCEIRO' | 'PAGO'
  });

  const activeChamadosFiltersCount = Object.values(filters).filter(v => v !== '').length;
  const isAnyFilterActive = cardFilter.type !== 'ALL' || activeChamadosFiltersCount > 0 || searchQuery.trim() !== '';

  const clearAllFilters = () => {
    setCardFilter({ type: 'ALL', subTipo: '', oficina: '', subFluxo: '' });
    setFilters({ turno: '', tipoOp: '', subTipo: '', etapa: '', subFluxo: '' });
    setSearchQuery('');
  };

  const clearChamadosModalFilters = () => setFilters({ turno: '', tipoOp: '', subTipo: '', etapa: '', subFluxo: '' });

  // Normalização de Sub-Tipos solicitados
  const normalizeSubTipoCategory = (subTipoRaw) => {
    const norm = String(subTipoRaw || '').trim().toUpperCase();
    if (norm.includes('CESTO') || norm.includes('AÉREO') || norm.includes('AEREO')) return 'Cesto Aéreo';
    if (norm.includes('MUNK') || norm.includes('MUNCK')) return 'Munk';
    if (norm.includes('MOTO') || norm.includes('MOTOCICLETA')) return 'Moto';
    if (norm.includes('FIORINO')) return 'Fiorino';
    if (norm.includes('ARGO')) return 'Argo';
    return 'Outros';
  };

  // 1. Base Geral de Chamados Abertos
  const chamadosAbertos = useMemo(() => {
    return (chamados || []).filter(c => c.status === 'ABERTO');
  }, [chamados]);

  // Busca Instantânea para Dropdown Flutuante (Resultados Instantâneos)
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.trim().toLowerCase();
    return chamadosAbertos.filter(c => {
      const matchPlaca = (c.placa || '').toLowerCase().includes(q);
      const matchNum = (c.numero || '').toLowerCase().includes(q);
      const matchCod = (c.codigoChamado || '').toLowerCase().includes(q);
      const matchDef = (c.defeitoPrincipal || c.defeitoEncontrado || '').toLowerCase().includes(q);
      const matchMotorista = (c.motorista || '').toLowerCase().includes(q);
      return matchPlaca || matchNum || matchCod || matchDef || matchMotorista;
    }).slice(0, 8);
  }, [chamadosAbertos, searchQuery]);

  // Agrupamentos e Contadores para Linha 1 (Criticidade & Sub-Tipos)
  const chamadosImpeditivosBase = useMemo(() => {
    return chamadosAbertos.filter(c => (c.situacaoVeiculo || 'RODANDO') === 'PARADO' && !c.naoImpeditivo);
  }, [chamadosAbertos]);

  const chamadosNaoImpeditivosBase = useMemo(() => {
    return chamadosAbertos.filter(c => (c.situacaoVeiculo || 'RODANDO') === 'RODANDO' || c.naoImpeditivo);
  }, [chamadosAbertos]);

  const impeditivosSubTipos = useMemo(() => {
    const counts = { 'Cesto Aéreo': 0, 'Munk': 0, 'Moto': 0, 'Fiorino': 0, 'Argo': 0, 'Outros': 0 };
    chamadosImpeditivosBase.forEach(c => {
      const v = vehiclesMap.get(c.placa);
      const cat = normalizeSubTipoCategory(v?.subTipo || v?.tipo);
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return counts;
  }, [chamadosImpeditivosBase, vehiclesMap]);

  const naoImpeditivosSubTipos = useMemo(() => {
    const counts = { 'Cesto Aéreo': 0, 'Munk': 0, 'Moto': 0, 'Fiorino': 0, 'Argo': 0, 'Outros': 0 };
    chamadosNaoImpeditivosBase.forEach(c => {
      const v = vehiclesMap.get(c.placa);
      const cat = normalizeSubTipoCategory(v?.subTipo || v?.tipo);
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return counts;
  }, [chamadosNaoImpeditivosBase, vehiclesMap]);

  // Agrupamentos e Contadores para Linha 2 (Oficinas & Suprimentos)
  const chamadosOficinaExternaBase = useMemo(() => {
    return chamadosAbertos.filter(c => c.etapaWorkflow === 'Oficina Externa' || c.oficinaExterna === 'SIM' || (c.dadosWorkflow?.tipoOficina === 'Externa' && c.etapaWorkflow !== 'RESOLVIDO'));
  }, [chamadosAbertos]);

  const oficinasExternasDistrib = useMemo(() => {
    const map = new Map();
    chamadosOficinaExternaBase.forEach(c => {
      const ofName = (c.oficinaDestino || c.dadosWorkflow?.oficinaDestino || 'Oficina Credenciada').trim();
      map.set(ofName, (map.get(ofName) || 0) + 1);
    });
    return Array.from(map.entries()).map(([nome, count]) => ({ nome, count })).sort((a, b) => b.count - a.count);
  }, [chamadosOficinaExternaBase]);

  const chamadosOficinaInternaBase = useMemo(() => {
    return chamadosAbertos.filter(c => c.etapaWorkflow === 'Oficina Interna' || c.dadosWorkflow?.tipoOficina === 'Interna');
  }, [chamadosAbertos]);

  const oficinaInternaSubFluxoDistrib = useMemo(() => {
    const counts = { DIRETA: 0, COMPRAS: 0, FINANCEIRO: 0, PAGO: 0 };
    chamadosOficinaInternaBase.forEach(c => {
      const sf = c.dadosWorkflow?.subFluxoOficina?.status;
      if (sf === 'COMPRAS') counts.COMPRAS++;
      else if (sf === 'FINANCEIRO') counts.FINANCEIRO++;
      else if (sf === 'PAGO') counts.PAGO++;
      else counts.DIRETA++;
    });
    return counts;
  }, [chamadosOficinaInternaBase]);

  // Toggle do Card Filter Interativo
  const handleCardFilterToggle = (type, subTipo = '', oficina = '', subFluxo = '') => {
    setCardFilter(prev => {
      const isSame = prev.type === type && prev.subTipo === subTipo && prev.oficina === oficina && prev.subFluxo === subFluxo;
      if (isSame) {
        return { type: 'ALL', subTipo: '', oficina: '', subFluxo: '' };
      }
      return { type, subTipo, oficina, subFluxo };
    });
  };

  // Filtragem Geral Aplicada
  const chamadosFiltrados = useMemo(() => {
    return chamadosAbertos.filter(c => {
      // 1. Busca por texto
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const matchPlaca = (c.placa || '').toLowerCase().includes(q);
        const matchNum = (c.numero || '').toLowerCase().includes(q);
        const matchCod = (c.codigoChamado || '').toLowerCase().includes(q);
        const matchDef = (c.defeitoPrincipal || c.defeitoEncontrado || '').toLowerCase().includes(q);
        const matchMotorista = (c.motorista || '').toLowerCase().includes(q);
        if (!matchPlaca && !matchNum && !matchCod && !matchDef && !matchMotorista) return false;
      }

      // 2. Filtros do Modal Avançado
      const veiculo = vehiclesMap.get(c.placa);
      if (filters.turno && String(veiculo?.turno || '').toUpperCase() !== String(filters.turno).toUpperCase()) return false;
      if (filters.tipoOp && String(veiculo?.tipoOp || '').toUpperCase() !== String(filters.tipoOp).toUpperCase()) return false;
      if (filters.subTipo && String(veiculo?.subTipo || '').toUpperCase() !== String(filters.subTipo).toUpperCase()) return false;
      if (filters.etapa && getEtapaWorkflow(c) !== filters.etapa) return false;
      if (filters.subFluxo && c.dadosWorkflow?.subFluxoOficina?.status !== filters.subFluxo) return false;

      // 3. Filtro Ativo do Card (Visão Executiva)
      if (cardFilter.type === 'IMPEDITIVO') {
        const isImp = (c.situacaoVeiculo || 'RODANDO') === 'PARADO' && !c.naoImpeditivo;
        if (!isImp) return false;
        if (cardFilter.subTipo) {
          const cat = normalizeSubTipoCategory(veiculo?.subTipo || veiculo?.tipo);
          if (cat !== cardFilter.subTipo) return false;
        }
      } else if (cardFilter.type === 'NAO_IMPEDITIVO') {
        const isNaoImp = (c.situacaoVeiculo || 'RODANDO') === 'RODANDO' || c.naoImpeditivo;
        if (!isNaoImp) return false;
        if (cardFilter.subTipo) {
          const cat = normalizeSubTipoCategory(veiculo?.subTipo || veiculo?.tipo);
          if (cat !== cardFilter.subTipo) return false;
        }
      } else if (cardFilter.type === 'OFICINA_EXTERNA') {
        const isExt = c.etapaWorkflow === 'Oficina Externa' || c.oficinaExterna === 'SIM' || (c.dadosWorkflow?.tipoOficina === 'Externa' && c.etapaWorkflow !== 'RESOLVIDO');
        if (!isExt) return false;
        if (cardFilter.oficina) {
          const ofName = (c.oficinaDestino || c.dadosWorkflow?.oficinaDestino || 'Oficina Credenciada').trim();
          if (ofName !== cardFilter.oficina) return false;
        }
      } else if (cardFilter.type === 'OFICINA_INTERNA') {
        const isInt = c.etapaWorkflow === 'Oficina Interna' || c.dadosWorkflow?.tipoOficina === 'Interna';
        if (!isInt) return false;
        if (cardFilter.subFluxo) {
          const sf = c.dadosWorkflow?.subFluxoOficina?.status;
          if (cardFilter.subFluxo === 'DIRETA' && (sf === 'COMPRAS' || sf === 'FINANCEIRO' || sf === 'PAGO')) return false;
          if (cardFilter.subFluxo !== 'DIRETA' && sf !== cardFilter.subFluxo) return false;
        }
      }

      return true;
    });
  }, [chamadosAbertos, searchQuery, filters, cardFilter, vehiclesMap]);

  // Divisões para a Visão Clássica
  const chamadosNormais = useMemo(() => {
    return chamadosFiltrados.filter(c => (c.situacaoVeiculo || 'RODANDO') === 'PARADO' && !c.naoImpeditivo);
  }, [chamadosFiltrados]);

  const chamadosAtencao = useMemo(() => {
    return chamadosFiltrados.filter(c => (c.situacaoVeiculo || 'RODANDO') === 'RODANDO' || c.naoImpeditivo);
  }, [chamadosFiltrados]);

  // Texto descritivo do filtro ativo para o banner
  const getActiveFilterDescription = () => {
    if (cardFilter.type === 'ALL') return null;
    let label = '';
    if (cardFilter.type === 'IMPEDITIVO') {
      label = 'Chamados Impeditivos (Veículo Parado)';
      if (cardFilter.subTipo) label += ` ➔ Sub-Tipo: ${cardFilter.subTipo}`;
    } else if (cardFilter.type === 'NAO_IMPEDITIVO') {
      label = 'Não Impeditivos / Atenção (Veículo Rodando)';
      if (cardFilter.subTipo) label += ` ➔ Sub-Tipo: ${cardFilter.subTipo}`;
    } else if (cardFilter.type === 'OFICINA_EXTERNA') {
      label = 'Oficina Externa';
      if (cardFilter.oficina) label += ` ➔ ${cardFilter.oficina}`;
    } else if (cardFilter.type === 'OFICINA_INTERNA') {
      label = 'Oficina Interna';
      if (cardFilter.subFluxo === 'DIRETA') label += ' ➔ Manutenção Direta (Sem Compras)';
      else if (cardFilter.subFluxo === 'COMPRAS') label += ' ➔ Aguardando Compras';
      else if (cardFilter.subFluxo === 'FINANCEIRO') label += ' ➔ Aguardando Financeiro';
      else if (cardFilter.subFluxo === 'PAGO') label += ' ➔ Peças Pagas / Liberadas';
    }
    return label;
  };

  // Helper de ícone por sub-tipo
  const getSubTipoIcon = (cat) => {
    switch (cat) {
      case 'Cesto Aéreo': return '🏗️';
      case 'Munk': return '🚜';
      case 'Moto': return '🏍️';
      case 'Fiorino': return '🚐';
      case 'Argo': return '🚗';
      default: return '📦';
    }
  };

  const renderWorkflowCardList = (list, isAttention = false) => {
    return (
      <div className="space-y-4 p-4 sm:p-6 bg-slate-50/50">
        {list.map(c => {
          const veiculoObj = vehiclesMap.get(c.placa);
          const equipeCod = veiculoObj?.equipes?.[0]?.codEquipe || 'Sem Equipe';
          const horas = calcularHorasParadas(c.dataAbertura, c.dataHoraFechamento, hoje);

          const isInternal = c.dadosWorkflow?.tipoOficina === 'Interna' || c.etapaWorkflow === 'Oficina Interna';

          const steps = isInternal 
            ? [
                { id: 'Análise Frota', label: 'Análise', icon: Wrench },
                { id: 'Oficina Interna', label: 'Oficina Int', icon: Home },
                { id: 'Liberado Operação', label: 'Liberado', icon: PlayCircle },
                { id: 'RESOLVIDO', label: 'Concluído', icon: CheckCircle2 }
              ]
            : [
                { id: 'Análise Frota', label: 'Análise', icon: Wrench },
                { id: 'Aguardando Desequipar', label: 'Desequipar', icon: Clock },
                { id: 'Desequipado - Entrada Oficina', label: 'Desequipado', icon: ClipboardCheck },
                { id: 'Oficina Externa', label: 'Oficina Ext', icon: Truck },
                { id: 'Liberado Operação', label: 'Liberado', icon: PlayCircle },
                { id: 'RESOLVIDO', label: 'Concluído', icon: CheckCircle2 }
              ];

          const currentIdx = steps.findIndex(s => s.id === getEtapaWorkflow(c));
          const isRejeitado = c.dadosWorkflow?.motivoRecusa && (c.etapaWorkflow === 'Análise Frota' || c.etapaWorkflow === 'Aguardando Manutenção');

          const getStepTimeStr = (stepId) => {
            let t = c.dadosWorkflow?.timestamps?.[stepId];
            if (!t) {
              if (stepId === 'Análise Frota' || stepId === 'Aguardando Manutenção') t = c.dataAbertura;
              if (stepId === 'Desequipado - Entrada Oficina') {
                t = c.dadosWorkflow?.timestamps?.['Oficina Externa'];
              }
            }
            if (t) {
              const dateObj = new Date(t);
              return `${String(dateObj.getDate()).padStart(2, '0')}/${String(dateObj.getMonth() + 1).padStart(2, '0')} ${String(dateObj.getHours()).padStart(2, '0')}:${String(dateObj.getMinutes()).padStart(2, '0')}`;
            }
            return null;
          };

          return (
            <div 
              key={c.id} 
              className="bg-white/90 backdrop-blur-md rounded-2xl p-5 sm:p-6 border border-slate-100 shadow-[0_8px_30px_rgba(0,0,0,0.02)] flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-5 transition-all duration-300 group hover:shadow-[0_12px_40px_rgba(16,185,129,0.05)] hover:border-emerald-100"
            >
              {/* Left Column: Ticket Identification */}
              <div className="flex flex-col gap-2 w-full lg:w-1/4 shrink-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span 
                    onClick={() => onEditar(c)} 
                    className="font-black text-blue-950 text-lg tracking-tight italic hover:text-emerald-600 transition-colors cursor-pointer select-none"
                  >
                    {c.placa}
                  </span>
                  {c.codigoChamado && <span className="text-[10px] font-mono font-black px-2 py-0.5 rounded-md bg-blue-50 text-blue-600 mr-1">{c.codigoChamado}</span>}
                  <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-md ${isAttention ? 'bg-amber-50 text-amber-700 border border-amber-200/60' : 'bg-rose-50 text-rose-700 border border-rose-200/60'}`}>
                    {c.numero || 'S/N'}
                  </span>
                </div>

                <div className="flex flex-col gap-1 text-slate-400 font-bold text-xs">
                  <span className="flex items-center gap-1.5 text-slate-500 font-medium" title="Data de Abertura">
                    <CalendarDays size={13} className="text-slate-400" />
                    {formatarDataBR(c.dataAbertura)}
                  </span>
                  {c.dataHoraFechamento && (
                    <span className="flex items-center gap-1.5 text-emerald-600 font-bold" title="Data de Conclusão">
                      <CheckCircle2 size={13} className="text-emerald-500" />
                      {formatarDataBR(c.dataHoraFechamento)}
                    </span>
                  )}
                  {c.defeitos && c.defeitos.length > 0 && (
                    <span className="flex items-center gap-1">
                      <ClipboardCheck size={12} className="text-slate-400"/>
                      <span className="text-emerald-600 font-black">{c.defeitos.filter(d => d.status === 'RESOLVIDO').length}</span>/<span className="text-slate-600 font-black">{c.defeitos.length}</span> defeitos
                    </span>
                  )}
                  <span className="flex items-center gap-1.5 text-slate-600 font-bold">
                    <Users size={13} className="text-slate-400" />
                    {equipeCod} {c.motorista ? `(${c.motorista.split(' ')[0]})` : ''}
                  </span>
                  <span className="text-[11px] text-rose-500 font-black flex items-center gap-1 mt-0.5">
                    <Clock size={12} className="text-rose-500" />
                    Parado: {horas.toFixed(1)}h
                  </span>
                </div>
              </div>

              {/* Mobile Compact 3-Step Stepper */}
              {(() => {
                const prevStep = currentIdx > 0 ? steps[currentIdx - 1] : null;
                const currStep = steps[currentIdx] || steps[0];
                const nextStep = currentIdx < steps.length - 1 ? steps[currentIdx + 1] : null;
                
                return (
                  <div className="flex md:hidden flex-col w-full bg-slate-50/80 p-3 rounded-2xl border border-slate-200/60 my-2">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 text-center">Etapa do Chamado</span>
                    <div className="flex items-center justify-between gap-1 text-center">
                      <div className="flex-1 flex flex-col items-center min-w-0 p-1.5 rounded-xl bg-white/60 border border-slate-100">
                        <span className="text-[8px] font-black text-slate-400 uppercase">Anterior</span>
                        <span className="text-[11px] font-bold text-slate-500 truncate w-full">
                          {prevStep ? prevStep.label : '—'}
                        </span>
                      </div>

                      <ChevronRight size={14} className="text-slate-300 shrink-0" />

                      <div className="flex-1 flex flex-col items-center min-w-0 p-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 shadow-xs">
                        <span className="text-[8px] font-black text-emerald-600 uppercase">Atual</span>
                        <span className="text-xs font-black text-emerald-900 truncate w-full">
                          {currStep ? currStep.label : 'Concluído'}
                        </span>
                      </div>

                      <ChevronRight size={14} className="text-slate-300 shrink-0" />

                      <div className="flex-1 flex flex-col items-center min-w-0 p-1.5 rounded-xl bg-white/60 border border-slate-100">
                        <span className="text-[8px] font-black text-slate-400 uppercase">Próximo</span>
                        <span className="text-[11px] font-bold text-slate-500 truncate w-full">
                          {nextStep ? nextStep.label : '—'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Desktop Full Graphic Stepper */}
              <div className="hidden md:flex flex-1 justify-between items-center relative w-full px-4 min-w-[320px] pb-16 overflow-visible">
                <div className="absolute top-[16px] left-[30px] right-[30px] h-[3px] bg-slate-100 z-0 rounded-full"></div>
                <div 
                  className="absolute top-[16px] left-[30px] h-[3px] bg-emerald-500 z-0 transition-all duration-500 rounded-full"
                  style={{
                    width: isRejeitado ? '0%' : `${(Math.max(0, currentIdx)) / (steps.length - 1) * 88}%`
                  }}
                ></div>

                {steps.map((step, idx) => {
                  const stepIdx = steps.findIndex(s => s.id === step.id);
                  const isCompleted = stepIdx < currentIdx;
                  const isActive = step.id === getEtapaWorkflow(c);
                  const timeStr = getStepTimeStr(step.id);

                  return (
                    <div key={step.id} className="flex flex-col items-center relative z-10 flex-1">
                      <div 
                        className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 shadow-sm border ${
                          isRejeitado && idx === 0
                            ? 'bg-rose-500 text-white border-rose-500 scale-105'
                            : isCompleted
                              ? 'bg-emerald-500 text-white border-emerald-500'
                              : isActive
                                ? 'bg-amber-500 text-white border-amber-500 ring-4 ring-amber-100 animate-pulse'
                                : 'bg-white text-slate-400 border-slate-200'
                        }`}
                        title={step.label}
                      >
                        {isRejeitado && idx === 0 ? (
                          <X size={14} className="font-bold" />
                        ) : isCompleted ? (
                          <Check size={14} />
                        ) : isActive ? (
                          <Clock size={14} />
                        ) : (
                          React.createElement(step.icon, { size: 14 })
                        )}
                      </div>

                      <span className={`text-[8px] font-black uppercase mt-1.5 tracking-wider ${
                        isRejeitado && idx === 0 ? 'text-rose-500' :
                        isCompleted ? 'text-emerald-600' :
                        isActive ? 'text-amber-600' : 'text-slate-400'
                      }`}>
                        {step.label}
                      </span>

                      {timeStr && (
                        <span className="text-[8px] text-slate-400 font-bold mt-0.5 whitespace-nowrap font-mono">
                          {timeStr}
                        </span>
                      )}

                      {/* BOLINHAS DO SUB-FLUXO */}
                      {step.id === 'Oficina Interna' && c.dadosWorkflow?.subFluxoOficina && ['COMPRAS', 'FINANCEIRO', 'PAGO'].includes(c.dadosWorkflow.subFluxoOficina.status) && (
                        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 flex flex-col items-center z-50">
                          <div className="w-0.5 h-3 bg-slate-200 mb-1"></div>
                          <div className={`w-4 h-4 rounded-full flex items-center justify-center mb-1 shadow-sm border ${c.dadosWorkflow.subFluxoOficina.status === 'COMPRAS' ? 'bg-amber-500 text-white border-amber-500 ring-2 ring-amber-100 animate-pulse' : 'bg-emerald-500 text-white border-emerald-500'}`}>
                            <Briefcase size={8} />
                          </div>
                          <span className={`text-[6px] font-black uppercase mb-1 ${c.dadosWorkflow.subFluxoOficina.status === 'COMPRAS' ? 'text-amber-600' : 'text-emerald-600'}`}>Compras</span>

                          {(c.dadosWorkflow.subFluxoOficina.status === 'FINANCEIRO' || c.dadosWorkflow.subFluxoOficina.status === 'PAGO') && (
                            <>
                              <div className="w-0.5 h-2 bg-slate-200 -mt-1 mb-1"></div>
                              <div className={`w-4 h-4 rounded-full flex items-center justify-center mb-1 shadow-sm border ${c.dadosWorkflow.subFluxoOficina.status === 'FINANCEIRO' ? 'bg-blue-500 text-white border-blue-500 ring-2 ring-blue-100 animate-pulse' : 'bg-emerald-500 text-white border-emerald-500'}`}>
                                <DollarSign size={8} />
                              </div>
                              <span className={`text-[6px] font-black uppercase ${c.dadosWorkflow.subFluxoOficina.status === 'FINANCEIRO' ? 'text-blue-600' : 'text-emerald-600'}`}>Finan</span>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Right Column: Actions */}
              <div className="flex items-center gap-2.5 shrink-0 w-full lg:w-auto justify-end border-t lg:border-t-0 pt-4 lg:pt-0 border-slate-100">
                <button 
                  onClick={() => onEditar(c)}
                  className="p-3 bg-slate-50 hover:bg-emerald-50 text-slate-400 hover:text-emerald-600 rounded-2xl transition-all shadow-xs active:scale-95 border border-slate-100 hover:border-emerald-100"
                  title="Visualizar Detalhes / Ações"
                >
                  <Eye size={18} />
                </button>

                {podeFinalizar && c.etapaWorkflow?.includes('Liberado Opera') ? (
                  isAttention ? (
                    <button 
                      onClick={() => onLiberar(c)}
                      className="px-5 py-2.5 bg-slate-100 text-slate-600 hover:bg-slate-700 hover:text-white rounded-full text-xs font-black transition-all active:scale-95 shadow-xs border border-slate-200 flex items-center gap-1.5"
                      title="Concluir Sem Restrição"
                    >
                      <CheckCircle2 size={13} />
                      Concluir
                    </button>
                  ) : (
                    <button 
                      onClick={() => onLiberar(c)}
                      className="px-5 py-2.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white rounded-full text-xs font-black transition-all active:scale-95 shadow-xs border border-emerald-200 flex items-center gap-1.5"
                      title="Liberar Operação"
                    >
                      <PlayCircle size={13} />
                      Liberar
                    </button>
                  )
                ) : null}
              </div>
            </div>
          );
        })}

        {list.length === 0 && (
          <div className="text-center py-12 text-slate-400 font-bold text-sm bg-white/60 rounded-3xl border border-dashed border-slate-200 flex flex-col items-center justify-center gap-2">
            <Boxes size={32} className="text-slate-300 mb-1" />
            <p className="text-slate-600 font-black">Nenhum chamado listado nesta categoria.</p>
            <p className="text-xs text-slate-400">Verifique os filtros selecionados ou restaure a visualização completa.</p>
            {isAnyFilterActive && (
              <button 
                onClick={clearAllFilters}
                className="mt-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all"
              >
                Limpar Filtros e Mostrar Todos
              </button>
            )}
          </div>
        )}
      </div>
    );
  };

  const activeFilterLabel = getActiveFilterDescription();

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in duration-300 pb-12">
      
      {/* 1. TOP ACTION & SEARCH BAR (Apple Liquid Glass + Material 3) */}
      <div className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-[0_8px_30px_rgba(0,0,0,0.03)] border border-slate-100 p-4 sm:p-5 relative z-40">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          
          {/* Fast Search input with Instant Floating Dropdown */}
          <div className="relative flex-1 max-w-lg">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text"
                placeholder="Buscar por Placa, SOL, Motorista ou Defeito..."
                value={searchQuery}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setTimeout(() => setIsSearchFocused(false), 250)}
                onChange={e => { setSearchQuery(e.target.value); setIsSearchFocused(true); }}
                className="w-full pl-11 pr-10 py-3 bg-slate-50/80 hover:bg-slate-50 rounded-2xl outline-none font-bold text-sm text-slate-800 border border-slate-200/80 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all placeholder-slate-400"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')} 
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-200 transition-colors"
                >
                  <X size={15} />
                </button>
              )}
            </div>

            {/* Instant Floating Dropdown Results */}
            {isSearchFocused && searchQuery.trim() && (
              <div className="absolute left-0 right-0 top-full mt-2 bg-white/95 backdrop-blur-2xl border border-slate-200/80 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] z-50 overflow-hidden max-h-80 overflow-y-auto animate-in fade-in zoom-in-95 duration-200 p-2 space-y-1">
                <div className="px-3 py-1.5 text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center justify-between">
                  <span>Resultados da busca ({searchResults.length})</span>
                  <span>Clique para abrir</span>
                </div>
                {searchResults.map(c => {
                  const veiculo = vehiclesMap.get(c.placa);
                  const subTipo = veiculo?.subTipo || veiculo?.tipo || 'Veículo';
                  const isImp = (c.situacaoVeiculo || 'RODANDO') === 'PARADO' && !c.naoImpeditivo;
                  return (
                    <div 
                      key={c.id}
                      onMouseDown={() => { onEditar(c); setIsSearchFocused(false); }}
                      className="p-3 rounded-xl hover:bg-slate-100/90 transition-all cursor-pointer border border-transparent hover:border-slate-200/60 group flex items-start justify-between gap-3"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-black text-sm text-blue-950 group-hover:text-emerald-600 transition-colors">
                            {c.placa}
                          </span>
                          <span className="text-[10px] font-bold text-slate-500 px-2 py-0.5 bg-slate-100 rounded-md">
                            {subTipo}
                          </span>
                          {c.codigoChamado && (
                            <span className="text-[10px] font-mono font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                              {c.codigoChamado}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-600 font-bold truncate">
                          {c.defeitoPrincipal || c.defeitoEncontrado || 'Sem descrição'}
                        </p>
                        {c.motorista && (
                          <span className="text-[11px] text-slate-400 font-medium">
                            Motorista: {c.motorista}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-col items-end shrink-0 gap-1">
                        <span className={`text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full ${
                          isImp ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {c.etapaWorkflow || 'Análise Frota'}
                        </span>
                        <span className="text-[10px] font-black text-slate-400">
                          {isImp ? '🔴 Parado' : '🟢 Rodando'}
                        </span>
                      </div>
                    </div>
                  );
                })}
                {searchResults.length === 0 && (
                  <div className="p-4 text-center text-xs font-bold text-slate-400">
                    Nenhum chamado encontrado para "{searchQuery}".
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Action Tools: View Switcher, Filter & Actions */}
          <div className="flex flex-wrap items-center gap-2.5 justify-end">
            
            {/* View Mode Segmented Control (Apple Liquid Glass Style) */}
            <div className="bg-slate-100/90 p-1 rounded-2xl border border-slate-200/70 flex items-center gap-1 shadow-inner">
              <button
                onClick={() => handleSetViewMode('executive')}
                className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all ${
                  viewMode === 'executive'
                    ? 'bg-white text-blue-950 shadow-sm shadow-slate-200'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
                title="Visão Hub Executiva com Cards"
              >
                <LayoutGrid size={14} className={viewMode === 'executive' ? 'text-emerald-600' : ''} />
                <span className="hidden sm:inline">Visão</span> Executiva
              </button>
              <button
                onClick={() => handleSetViewMode('classic')}
                className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all ${
                  viewMode === 'classic'
                    ? 'bg-white text-blue-950 shadow-sm shadow-slate-200'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
                title="Visão Clássica Completa"
              >
                <List size={14} className={viewMode === 'classic' ? 'text-blue-600' : ''} />
                <span className="hidden sm:inline">Visão</span> Clássica
              </button>
            </div>

            {/* Filter Drawer Button */}
            <button
              onClick={() => setShowChamadosFiltersModal(true)}
              className={`px-4 py-2.5 rounded-2xl font-black text-xs flex items-center gap-2 transition-all active:scale-95 border ${
                activeChamadosFiltersCount > 0
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300 ring-2 ring-emerald-200'
                  : 'bg-slate-50/80 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <Filter size={15} className={activeChamadosFiltersCount > 0 ? 'text-emerald-600' : 'text-slate-500'} />
              <span>Filtros</span>
              {activeChamadosFiltersCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-emerald-600 text-white text-[9px] font-black flex items-center justify-center">
                  {activeChamadosFiltersCount}
                </span>
              )}
            </button>

            {/* Reset / Mostrar Todos Button */}
            {isAnyFilterActive && (
              <button
                onClick={clearAllFilters}
                className="px-3.5 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200/80 rounded-2xl text-xs font-black transition-all flex items-center gap-1 active:scale-95"
                title="Limpar todos os filtros ativos"
              >
                <RefreshCcw size={13} />
                <span>Mostrar Todos</span>
              </button>
            )}

            {/* + Novo Chamado Contextual Button */}
            {(userPermissions?.permissoes_edicao?.pode_abrir_chamado !== false) && onNovoChamado && (
              <button
                onClick={onNovoChamado}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-2xl text-xs font-black transition-all shadow-md shadow-emerald-600/20 flex items-center gap-2 active:scale-95"
              >
                <Plus size={16} />
                <span>Novo Chamado</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 2. VISÃO HUB EXECUTIVA (CARDS INTERATIVOS LINHA 1 & LINHA 2) */}
      {viewMode === 'executive' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          
          {/* LINHA 1: CRITICIDADE & SUB-TIPOS */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* 🔴 CARD 1: CHAMADOS IMPEDITIVOS */}
            <div 
              className={`bg-white/90 backdrop-blur-xl rounded-3xl border p-6 transition-all duration-300 shadow-[0_8px_30px_rgba(0,0,0,0.03)] hover:shadow-[0_12px_40px_rgba(244,63,94,0.06)] ${
                cardFilter.type === 'IMPEDITIVO' && !cardFilter.subTipo
                  ? 'border-rose-400 ring-2 ring-rose-200 bg-rose-50/30'
                  : 'border-slate-100 hover:border-rose-200'
              }`}
            >
              {/* Header do Card */}
              <div 
                onClick={() => handleCardFilterToggle('IMPEDITIVO')}
                className="flex items-center justify-between cursor-pointer group pb-4 border-b border-slate-100 select-none"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform border border-rose-100">
                    <AlertTriangle size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-blue-950 group-hover:text-rose-600 transition-colors">
                      Chamados Impeditivos
                    </h3>
                    <p className="text-xs font-bold text-slate-400">
                      Veículos parados / imobilizados na frota
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-3.5 py-1.5 rounded-full bg-rose-100 text-rose-700 font-black text-xs flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping inline-block"></span>
                    {chamadosImpeditivosBase.length} Veículos
                  </span>
                </div>
              </div>

              {/* Sub-Tipos Grid */}
              <div className="pt-4 space-y-2">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Filtrar por Sub-Tipo de Veículo:</span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {['Cesto Aéreo', 'Munk', 'Moto', 'Fiorino', 'Argo', 'Outros'].map(sub => {
                    const count = impeditivosSubTipos[sub] || 0;
                    const isSelected = cardFilter.type === 'IMPEDITIVO' && cardFilter.subTipo === sub;
                    return (
                      <button
                        key={sub}
                        onClick={(e) => { e.stopPropagation(); handleCardFilterToggle('IMPEDITIVO', sub); }}
                        className={`px-3 py-2.5 rounded-2xl text-xs font-black flex items-center justify-between gap-1.5 transition-all border ${
                          isSelected
                            ? 'bg-rose-600 text-white border-rose-600 shadow-md shadow-rose-600/20 scale-[1.02]'
                            : 'bg-slate-50/80 hover:bg-rose-50 text-slate-700 hover:text-rose-700 border-slate-200/70 hover:border-rose-200'
                        }`}
                      >
                        <span className="flex items-center gap-1.5 truncate">
                          <span>{getSubTipoIcon(sub)}</span>
                          <span className="truncate">{sub}</span>
                        </span>
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-black ${
                          isSelected ? 'bg-white/20 text-white' : count > 0 ? 'bg-rose-100 text-rose-700' : 'bg-slate-200 text-slate-500'
                        }`}>
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* 🟡 CARD 2: CHAMADOS NÃO IMPEDITIVOS (ATENÇÃO) */}
            <div 
              className={`bg-white/90 backdrop-blur-xl rounded-3xl border p-6 transition-all duration-300 shadow-[0_8px_30px_rgba(0,0,0,0.03)] hover:shadow-[0_12px_40px_rgba(245,158,11,0.06)] ${
                cardFilter.type === 'NAO_IMPEDITIVO' && !cardFilter.subTipo
                  ? 'border-amber-400 ring-2 ring-amber-200 bg-amber-50/30'
                  : 'border-slate-100 hover:border-amber-200'
              }`}
            >
              {/* Header do Card */}
              <div 
                onClick={() => handleCardFilterToggle('NAO_IMPEDITIVO')}
                className="flex items-center justify-between cursor-pointer group pb-4 border-b border-slate-100 select-none"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform border border-amber-100">
                    <Eye size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-blue-950 group-hover:text-amber-600 transition-colors">
                      Não Impeditivos / Atenção
                    </h3>
                    <p className="text-xs font-bold text-slate-400">
                      Veículos rodando com restrição operacional
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-3.5 py-1.5 rounded-full bg-amber-100 text-amber-800 font-black text-xs">
                    {chamadosNaoImpeditivosBase.length} Veículos
                  </span>
                </div>
              </div>

              {/* Sub-Tipos Grid */}
              <div className="pt-4 space-y-2">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Filtrar por Sub-Tipo de Veículo:</span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {['Cesto Aéreo', 'Munk', 'Moto', 'Fiorino', 'Argo', 'Outros'].map(sub => {
                    const count = naoImpeditivosSubTipos[sub] || 0;
                    const isSelected = cardFilter.type === 'NAO_IMPEDITIVO' && cardFilter.subTipo === sub;
                    return (
                      <button
                        key={sub}
                        onClick={(e) => { e.stopPropagation(); handleCardFilterToggle('NAO_IMPEDITIVO', sub); }}
                        className={`px-3 py-2.5 rounded-2xl text-xs font-black flex items-center justify-between gap-1.5 transition-all border ${
                          isSelected
                            ? 'bg-amber-500 text-white border-amber-500 shadow-md shadow-amber-500/20 scale-[1.02]'
                            : 'bg-slate-50/80 hover:bg-amber-50 text-slate-700 hover:text-amber-800 border-slate-200/70 hover:border-amber-200'
                        }`}
                      >
                        <span className="flex items-center gap-1.5 truncate">
                          <span>{getSubTipoIcon(sub)}</span>
                          <span className="truncate">{sub}</span>
                        </span>
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-black ${
                          isSelected ? 'bg-white/20 text-white' : count > 0 ? 'bg-amber-100 text-amber-800' : 'bg-slate-200 text-slate-500'
                        }`}>
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

          </div>

          {/* LINHA 2: OFICINAS & CADEIA DE SUPRIMENTOS */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* 🏭 CARD 3: OFICINA EXTERNA */}
            <div 
              className={`bg-white/90 backdrop-blur-xl rounded-3xl border p-6 transition-all duration-300 shadow-[0_8px_30px_rgba(0,0,0,0.03)] hover:shadow-[0_12px_40px_rgba(99,102,241,0.06)] ${
                cardFilter.type === 'OFICINA_EXTERNA' && !cardFilter.oficina
                  ? 'border-indigo-400 ring-2 ring-indigo-200 bg-indigo-50/30'
                  : 'border-slate-100 hover:border-indigo-200'
              }`}
            >
              {/* Header do Card */}
              <div 
                onClick={() => handleCardFilterToggle('OFICINA_EXTERNA')}
                className="flex items-center justify-between cursor-pointer group pb-4 border-b border-slate-100 select-none"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform border border-indigo-100">
                    <Truck size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-blue-950 group-hover:text-indigo-600 transition-colors">
                      Oficina Externa
                    </h3>
                    <p className="text-xs font-bold text-slate-400">
                      Veículos encaminhados a oficinas credenciadas
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-3.5 py-1.5 rounded-full bg-indigo-100 text-indigo-700 font-black text-xs">
                    {chamadosOficinaExternaBase.length} Veículos
                  </span>
                </div>
              </div>

              {/* Oficinas Credenciadas Chips */}
              <div className="pt-4 space-y-2">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Distribuição por Oficina:</span>
                {oficinasExternasDistrib.length > 0 ? (
                  <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto pr-1">
                    {oficinasExternasDistrib.map(of => {
                      const isSelected = cardFilter.type === 'OFICINA_EXTERNA' && cardFilter.oficina === of.nome;
                      return (
                        <button
                          key={of.nome}
                          onClick={(e) => { e.stopPropagation(); handleCardFilterToggle('OFICINA_EXTERNA', '', of.nome); }}
                          className={`px-3 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition-all border ${
                            isSelected
                              ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/20'
                              : 'bg-slate-50/80 hover:bg-indigo-50 text-slate-700 hover:text-indigo-800 border-slate-200/70 hover:border-indigo-200'
                          }`}
                        >
                          <Building2 size={13} className={isSelected ? 'text-white' : 'text-indigo-500'} />
                          <span className="truncate max-w-[160px]">{of.nome}</span>
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-black ${
                            isSelected ? 'bg-white/20 text-white' : 'bg-indigo-100 text-indigo-700'
                          }`}>
                            {of.count}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="py-4 text-center text-xs font-bold text-slate-400 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                    Nenhum veículo em oficina externa no momento.
                  </div>
                )}
              </div>
            </div>

            {/* 🏢 CARD 4: OFICINA INTERNA */}
            <div 
              className={`bg-white/90 backdrop-blur-xl rounded-3xl border p-6 transition-all duration-300 shadow-[0_8px_30px_rgba(0,0,0,0.03)] hover:shadow-[0_12px_40px_rgba(16,185,129,0.06)] ${
                cardFilter.type === 'OFICINA_INTERNA' && !cardFilter.subFluxo
                  ? 'border-emerald-400 ring-2 ring-emerald-200 bg-emerald-50/30'
                  : 'border-slate-100 hover:border-emerald-200'
              }`}
            >
              {/* Header do Card */}
              <div 
                onClick={() => handleCardFilterToggle('OFICINA_INTERNA')}
                className="flex items-center justify-between cursor-pointer group pb-4 border-b border-slate-100 select-none"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform border border-emerald-100">
                    <Home size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-blue-950 group-hover:text-emerald-600 transition-colors">
                      Oficina Interna
                    </h3>
                    <p className="text-xs font-bold text-slate-400">
                      Manutenção própria & controle de peças
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-3.5 py-1.5 rounded-full bg-emerald-100 text-emerald-700 font-black text-xs">
                    {chamadosOficinaInternaBase.length} Veículos
                  </span>
                </div>
              </div>

              {/* Sub-Fluxo de Compras/Financeiro Grid */}
              <div className="pt-4 space-y-2">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Estágio do Sub-Fluxo de Peças:</span>
                <div className="grid grid-cols-2 gap-2">
                  
                  {/* Manutenção Direta */}
                  <button
                    onClick={(e) => { e.stopPropagation(); handleCardFilterToggle('OFICINA_INTERNA', '', '', 'DIRETA'); }}
                    className={`p-2.5 rounded-2xl text-xs font-black flex items-center justify-between gap-1.5 transition-all border ${
                      cardFilter.type === 'OFICINA_INTERNA' && cardFilter.subFluxo === 'DIRETA'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-600/20'
                        : 'bg-slate-50/80 hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 border-slate-200/70 hover:border-emerald-200'
                    }`}
                  >
                    <span className="flex items-center gap-1.5 truncate">
                      <Wrench size={13} className={cardFilter.type === 'OFICINA_INTERNA' && cardFilter.subFluxo === 'DIRETA' ? 'text-white' : 'text-emerald-600'} />
                      <span className="truncate">Manut. Direta</span>
                    </span>
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-black ${
                      cardFilter.type === 'OFICINA_INTERNA' && cardFilter.subFluxo === 'DIRETA' ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-700'
                    }`}>
                      {oficinaInternaSubFluxoDistrib.DIRETA}
                    </span>
                  </button>

                  {/* Aguardando Compras */}
                  <button
                    onClick={(e) => { e.stopPropagation(); handleCardFilterToggle('OFICINA_INTERNA', '', '', 'COMPRAS'); }}
                    className={`p-2.5 rounded-2xl text-xs font-black flex items-center justify-between gap-1.5 transition-all border ${
                      cardFilter.type === 'OFICINA_INTERNA' && cardFilter.subFluxo === 'COMPRAS'
                        ? 'bg-amber-500 text-white border-amber-500 shadow-md shadow-amber-500/20'
                        : 'bg-slate-50/80 hover:bg-amber-50 text-slate-700 hover:text-amber-800 border-slate-200/70 hover:border-amber-200'
                    }`}
                  >
                    <span className="flex items-center gap-1.5 truncate">
                      <Briefcase size={13} className={cardFilter.type === 'OFICINA_INTERNA' && cardFilter.subFluxo === 'COMPRAS' ? 'text-white' : 'text-amber-500'} />
                      <span className="truncate">Em Compras</span>
                    </span>
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-black ${
                      cardFilter.type === 'OFICINA_INTERNA' && cardFilter.subFluxo === 'COMPRAS' ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {oficinaInternaSubFluxoDistrib.COMPRAS}
                    </span>
                  </button>

                  {/* Aguardando Financeiro */}
                  <button
                    onClick={(e) => { e.stopPropagation(); handleCardFilterToggle('OFICINA_INTERNA', '', '', 'FINANCEIRO'); }}
                    className={`p-2.5 rounded-2xl text-xs font-black flex items-center justify-between gap-1.5 transition-all border ${
                      cardFilter.type === 'OFICINA_INTERNA' && cardFilter.subFluxo === 'FINANCEIRO'
                        ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-600/20'
                        : 'bg-slate-50/80 hover:bg-blue-50 text-slate-700 hover:text-blue-800 border-slate-200/70 hover:border-blue-200'
                    }`}
                  >
                    <span className="flex items-center gap-1.5 truncate">
                      <DollarSign size={13} className={cardFilter.type === 'OFICINA_INTERNA' && cardFilter.subFluxo === 'FINANCEIRO' ? 'text-white' : 'text-blue-500'} />
                      <span className="truncate">Em Financeiro</span>
                    </span>
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-black ${
                      cardFilter.type === 'OFICINA_INTERNA' && cardFilter.subFluxo === 'FINANCEIRO' ? 'bg-white/20 text-white' : 'bg-blue-100 text-blue-800'
                    }`}>
                      {oficinaInternaSubFluxoDistrib.FINANCEIRO}
                    </span>
                  </button>

                  {/* Pago / Liberado */}
                  <button
                    onClick={(e) => { e.stopPropagation(); handleCardFilterToggle('OFICINA_INTERNA', '', '', 'PAGO'); }}
                    className={`p-2.5 rounded-2xl text-xs font-black flex items-center justify-between gap-1.5 transition-all border ${
                      cardFilter.type === 'OFICINA_INTERNA' && cardFilter.subFluxo === 'PAGO'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-600/20'
                        : 'bg-slate-50/80 hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 border-slate-200/70 hover:border-emerald-200'
                    }`}
                  >
                    <span className="flex items-center gap-1.5 truncate">
                      <CheckCircle2 size={13} className={cardFilter.type === 'OFICINA_INTERNA' && cardFilter.subFluxo === 'PAGO' ? 'text-white' : 'text-emerald-600'} />
                      <span className="truncate">Pago / Peças</span>
                    </span>
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-black ${
                      cardFilter.type === 'OFICINA_INTERNA' && cardFilter.subFluxo === 'PAGO' ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-700'
                    }`}>
                      {oficinaInternaSubFluxoDistrib.PAGO}
                    </span>
                  </button>

                </div>
              </div>
            </div>

          </div>

          {/* BANNER DE FILTRO ATIVO (SELECIONADO VIA CARD OU GERAL) */}
          {activeFilterLabel && (
            <div className="bg-emerald-50/90 backdrop-blur-md border border-emerald-200/80 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs animate-in fade-in duration-200">
              <div className="flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-xs font-bold text-slate-500">Exibindo:</span>
                <span className="text-xs font-black text-emerald-950 bg-white px-3 py-1 rounded-xl border border-emerald-200 shadow-xs">
                  {activeFilterLabel}
                </span>
                <span className="text-xs font-bold text-emerald-800">
                  ({chamadosFiltrados.length} {chamadosFiltrados.length === 1 ? 'veículo' : 'veículos'})
                </span>
              </div>
              <button
                onClick={clearAllFilters}
                className="text-xs font-black text-emerald-700 hover:text-emerald-900 bg-white hover:bg-emerald-100/50 px-3.5 py-1.5 rounded-xl border border-emerald-200 transition-colors flex items-center gap-1 shadow-xs"
              >
                <X size={14} />
                <span>Limpar Filtro</span>
              </button>
            </div>
          )}

          {/* LISTA DE CHAMADOS RESULTANTE NA VISÃO EXECUTIVA */}
          <div className="bg-white/90 backdrop-blur-xl rounded-[2rem] shadow-[0_8px_30px_rgba(0,0,0,0.03)] border border-slate-100 overflow-hidden flex flex-col">
            <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-lg font-black text-blue-950 flex items-center gap-2">
                <Boxes size={22} className="text-emerald-600"/>
                <span>Lista de Veículos Filtrados</span>
              </h3>
              <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-3.5 py-1 rounded-full text-xs font-black">
                {chamadosFiltrados.length} {chamadosFiltrados.length === 1 ? 'Chamado' : 'Chamados'}
              </span>
            </div>
            {renderWorkflowCardList(chamadosFiltrados, cardFilter.type === 'NAO_IMPEDITIVO')}
          </div>

        </div>
      )}

      {/* 3. VISÃO CLÁSSICA (2 BLOCOS VERTICAIS COMPLETOS) */}
      {viewMode === 'classic' && (
        <div className="grid grid-cols-1 gap-8 animate-in fade-in duration-200">
          
          {/* Chamados Impeditivos */}
          <div className="bg-white rounded-[2rem] shadow-[0_8px_30px_rgba(0,0,0,0.03)] border border-slate-100 overflow-hidden flex flex-col">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-xl font-black text-blue-950 flex items-center gap-2">
                <AlertTriangle size={24} className="text-rose-500"/>
                <span>Chamados Impeditivos</span>
              </h3>
              <span className="bg-rose-100 text-rose-700 px-3.5 py-1 rounded-full text-xs font-black">
                {chamadosNormais.length} Veículos
              </span>
            </div>
            {renderWorkflowCardList(chamadosNormais, false)}
          </div>

          {/* Atenção (Não Impeditivos) */}
          <div className="bg-white rounded-[2rem] shadow-[0_8px_30px_rgba(0,0,0,0.03)] border border-slate-100 overflow-hidden flex flex-col">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-xl font-black text-blue-950 flex items-center gap-2">
                <Eye size={24} className="text-amber-500"/>
                <span>Atenção (Não Impeditivos)</span>
              </h3>
              <span className="bg-amber-100 text-amber-800 px-3.5 py-1 rounded-full text-xs font-black">
                {chamadosAtencao.length} Veículos
              </span>
            </div>
            {renderWorkflowCardList(chamadosAtencao, true)}
          </div>

        </div>
      )}

      {/* 4. MODAL DE FILTROS AVANÇADOS DE CHAMADOS */}
      {showChamadosFiltersModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/40 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full sm:max-w-lg rounded-t-[2.5rem] sm:rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
            <div className="p-6 bg-slate-50 border-b border-slate-100 flex justify-between items-center sticky top-0 z-10">
              <div className="flex items-center gap-2">
                <Filter size={20} className="text-emerald-600" />
                <h3 className="text-lg font-black text-blue-950">Filtros Avançados de Chamados</h3>
              </div>
              <button onClick={() => setShowChamadosFiltersModal(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1.5">Turno</label>
                <select className="w-full p-3 bg-slate-50 rounded-xl font-bold text-slate-700 border border-slate-200 outline-none" value={filters.turno} onChange={e => setFilters({...filters, turno: e.target.value})}>
                  <option value="">Turno (Todos)</option><option>Manhã</option><option>Tarde</option><option>Noite</option><option>Linha Viva</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1.5">Tipo OP</label>
                <select className="w-full p-3 bg-slate-50 rounded-xl font-bold text-slate-700 border border-slate-200 outline-none" value={filters.tipoOp} onChange={e => setFilters({...filters, tipoOp: e.target.value})}>
                  <option value="">Tipo OP (Todos)</option><option>TMA</option><option>Linha Viva</option><option>Linha Morta</option><option>SOC</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1.5">Sub Tipo</label>
                <select className="w-full p-3 bg-slate-50 rounded-xl font-bold text-slate-700 border border-slate-200 outline-none" value={filters.subTipo} onChange={e => setFilters({...filters, subTipo: e.target.value})}>
                  <option value="">Sub Tipo (Todos)</option><option>Munk</option><option>Cesto Aéreo</option><option>Fiorino</option><option>Strada</option><option>Argo</option><option>Moto</option><option>Leve</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1.5">Sub Fluxo</label>
                <select className="w-full p-3 bg-slate-50 rounded-xl font-bold text-slate-700 border border-slate-200 outline-none" value={filters.subFluxo || ""} onChange={e => setFilters({...filters, subFluxo: e.target.value})}>
                  <option value="">Sub Fluxo (Todos)</option><option value="COMPRAS">Em Compras</option><option value="FINANCEIRO">Em Financeiro</option><option value="PAGO">Pago</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1.5">Etapa Workflow</label>
                <select className="w-full p-3 bg-slate-50 rounded-xl font-bold text-slate-700 border border-slate-200 outline-none" value={filters.etapa} onChange={e => setFilters({...filters, etapa: e.target.value})}>
                  <option value="">Etapa Workflow (Todas)</option>
                  <option value="Análise Frota">Análise Frota</option>
                  <option value="Aguardando Desequipar">Aguardando Desequipar</option>
                  <option value="Desequipado - Entrada Oficina">Desequipado (Entrada Oficina)</option>
                  <option value="Oficina Interna">Oficina Interna</option>
                  <option value="Oficina Externa">Oficina Externa</option>
                  <option value="Liberado Operação">Liberado Operação</option>
                </select>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-2">
              <button onClick={clearChamadosModalFilters} className="flex-1 py-3 text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-xl font-black text-sm transition-colors">
                Limpar Filtros
              </button>
              <button onClick={() => setShowChamadosFiltersModal(false)} className="flex-1 py-3 bg-emerald-600 text-white hover:bg-emerald-700 rounded-xl font-black text-sm transition-colors shadow-md shadow-emerald-600/20">
                Aplicar Filtros
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
