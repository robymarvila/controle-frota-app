import React, { useState, useMemo, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import ModalConfirmacaoLogout from './ModalConfirmacaoLogout';
import { 
  Search, Wrench, Home, Truck, CheckCircle2, ClipboardCheck, 
  AlertCircle, X, ChevronRight, PlayCircle, Eye, ShieldAlert,
  Clock, Info, FileText, Check, MessageSquarePlus, MessageSquare, 
  History, User, LayoutGrid, List, LayoutTemplate, EyeOff, LogOut,
  Sun, Moon, Send, Camera, Image, Trash2, ArrowLeft, RotateCcw, ZoomIn
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

const formatarTextoLog = (texto) => {
  if (!texto || typeof texto !== 'string') return texto || '';
  return texto.replace(/\b\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:\+\d{2}:\d{2}|Z)?\b/g, (match) => {
    try {
      const d = new Date(match);
      if (!isNaN(d.getTime())) {
        const dia = String(d.getDate()).padStart(2, '0');
        const mes = String(d.getMonth() + 1).padStart(2, '0');
        const ano = d.getFullYear();
        const horas = String(d.getHours()).padStart(2, '0');
        const min = String(d.getMinutes()).padStart(2, '0');
        return `${dia}/${mes}/${ano} ${horas}:${min}`;
      }
    } catch (e) {}
    return match;
  });
};

export default function MecanicoView({ 
  chamados, 
  vehicles, 
  onWorkflowTransition, 
  onSubmit, 
  currentUser, 
  listaOficinas,
  theme = 'light',
  setTheme,
  onLogout
}) {
  const [activeTab, setActiveTab] = useState('ANALISE'); // 'ANALISE', 'INTERNA', 'USUARIO'
  const [activeType, setActiveType] = useState('TODOS');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('CARD'); // 'CARD', 'LISTA', 'AGRUPADO'
  const [showUserMenu, setShowUserMenu] = useState(false);
  
  const optionsOficinas = useMemo(() => {
    if (Array.isArray(listaOficinas) && listaOficinas.length > 0) return listaOficinas;
    return getListaOficinasAtualizada();
  }, [listaOficinas]);
  
  // Modals state
  const [selectedChamado, setSelectedChamado] = useState(null); // For 'Iniciar Diagnóstico'
  const [detailChamado, setDetailChamado] = useState(null); // For 'Detalhes e Comentários'
  const [solicitarChamado, setSolicitarChamado] = useState(null); // For 'Solicitar Liberação'
  
  // Forms state
  const [modalMode, setModalMode] = useState('Interna');
  const [selectedImagePreview, setSelectedImagePreview] = useState(null);
  const [diagnostico, setDiagnostico] = useState('');
  const [pecas, setPecas] = useState('');
  const [oficinaExterna, setOficinaExterna] = useState('');
  const [comentarioExterna, setComentarioExterna] = useState('');
  const [novoComentario, setNovoComentario] = useState('');
  
  // Solicitação de Liberação State
  const [relatorioTecnico, setRelatorioTecnico] = useState('');
  const [fotosReparo, setFotosReparo] = useState([null, null, null]);
  const [showDetalhesInModal, setShowDetalhesInModal] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  // User Profile State
  const [showSenha, setShowSenha] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // Helper
  const vehiclesMap = useMemo(() => new Map(vehicles.map(v => [v.placa, v])), [vehicles]);
  const getVehicle = (placa) => vehiclesMap.get(placa) || {};

  // Defeitos detalhados atualizados de forma leve para os cards da oficina
  const [defeitosMap, setDefeitosMap] = useState(new Map());

  useEffect(() => {
    let isMounted = true;
    const targetChamados = chamados.filter(c => {
      const etapa = c.etapaWorkflow || 'Análise Frota';
      return c.status === 'ABERTO' && ['Análise Frota', 'Aguardando Manutenção', 'Oficina Interna', 'Aguardando Validação Frota'].includes(etapa);
    });

    async function loadDefeitosOficina() {
      const newMap = new Map();
      const chunks = [];
      for (let i = 0; i < targetChamados.length; i += 5) {
        chunks.push(targetChamados.slice(i, i + 5).map(c => c.id));
      }
      for (const chunkIds of chunks) {
        if (!isMounted) return;
        try {
          const { data } = await supabase.from('chamados').select('id,defeitos,dadosWorkflow').in('id', chunkIds);
          (data || []).forEach(r => {
            if (r.defeitos) {
              let defs = r.defeitos;
              if (typeof defs === 'string') {
                try { defs = JSON.parse(defs); } catch(e) {}
              }
              const defsLight = (Array.isArray(defs) ? defs : []).map(d => ({
                id: d.id,
                descricao: d.descricao,
                categoria: d.categoria,
                status: d.status,
                isImpeditivo: d.isImpeditivo,
                dataResolucao: d.dataResolucao,
                numeroSolicitacao: d.numeroSolicitacao
              }));
              newMap.set(r.id, { defeitos: defsLight, dadosWorkflow: r.dadosWorkflow });
            }
          });
        } catch (e) {
          console.warn('Aviso ao carregar lote de defeitos:', e);
        }
      }
      if (isMounted && newMap.size > 0) {
        setDefeitosMap(prev => new Map([...prev, ...newMap]));
      }
    }

    if (targetChamados.length > 0) {
      loadDefeitosOficina();
    }

    return () => { isMounted = false; };
  }, [chamados]);

  // Busca Instantânea para Dropdown Flutuante (Resultados Instantâneos)
  const searchResults = useMemo(() => {
    if (!searchTerm.trim()) return [];
    const q = searchTerm.trim().toLowerCase();
    return (chamados || []).filter(c => {
      const matchPlaca = (c.placa || '').toLowerCase().includes(q);
      const matchNum = (c.numero || '').toLowerCase().includes(q);
      const matchCod = (c.codigoChamado || '').toLowerCase().includes(q);
      const matchDef = (c.defeitoPrincipal || c.defeitoEncontrado || '').toLowerCase().includes(q);
      const matchMot = (c.motorista || '').toLowerCase().includes(q);
      return matchPlaca || matchNum || matchCod || matchDef || matchMot;
    }).slice(0, 8);
  }, [chamados, searchTerm]);

  // Filters
  const processedChamados = useMemo(() => {
    return chamados.filter(c => {
      const etapa = c.etapaWorkflow || 'Análise Frota';
      const isTargetEtapa = ['Análise Frota', 'Aguardando Manutenção', 'Oficina Interna', 'Aguardando Validação Frota'].includes(etapa);
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
  const oficinaInternaChamados = useMemo(() => processedChamados.filter(c => ['Oficina Interna', 'Aguardando Validação Frota'].includes(c.etapaWorkflow)), [processedChamados]);

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
  const handleOpenDetails = async (chamado) => {
    const parseDefs = (raw) => {
      if (Array.isArray(raw)) return raw;
      if (typeof raw === 'string') {
        try { return JSON.parse(raw); } catch (e) { return []; }
      }
      return [];
    };

    let initialDefs = parseDefs(chamado.defeitos);
    if (initialDefs.length === 0) {
      initialDefs = parseDefs(chamado.dadosWorkflow?.defeitos);
    }
    if (initialDefs.length === 0 && (chamado.defeitoEncontrado || chamado.defeitoPrincipal)) {
      initialDefs = [{
        id: chamado.id || Date.now(),
        descricao: chamado.defeitoEncontrado || chamado.defeitoPrincipal,
        categoria: chamado.defeitoPrincipal || 'Geral',
        status: chamado.status === 'RESOLVIDO' ? 'RESOLVIDO' : 'PENDENTE',
        isImpeditivo: true
      }];
    }

    const currentWithDefs = {
      ...chamado,
      defeitos: initialDefs,
      fotosChamado: chamado.dadosWorkflow?.fotosChamado || chamado.fotosChamado || chamado.fotosGerais || {}
    };

    setDetailChamado(currentWithDefs);
    setNovoComentario('');

    try {
      const [{ data, error }, { data: hData }] = await Promise.all([
        supabase.from('chamados').select('*').eq('id', chamado.id).maybeSingle(),
        supabase.from('chamados_historico').select('*').eq('chamado_id', chamado.id).order('data_hora', { ascending: false })
      ]);

      if (data && !error) {
        let dbDefs = parseDefs(data.defeitos);
        if (dbDefs.length === 0) {
          dbDefs = parseDefs(data.dadosWorkflow?.defeitos);
        }
        if (dbDefs.length === 0 && (data.defeitoEncontrado || data.defeitoPrincipal)) {
          dbDefs = [{
            id: data.id || Date.now(),
            descricao: data.defeitoEncontrado || data.defeitoPrincipal,
            categoria: data.defeitoPrincipal || 'Geral',
            status: data.status === 'RESOLVIDO' ? 'RESOLVIDO' : 'PENDENTE',
            isImpeditivo: true
          }];
        }

        const toIso = (dt) => { 
          try { 
            const d = new Date(dt); 
            return isNaN(d.getTime()) ? String(dt) : d.toISOString(); 
          } catch(e) { 
            return String(dt); 
          } 
        };

        const mapHistorico = new Map();
        (hData || []).forEach(l => {
          const iso = toIso(l.data_hora);
          const desc = (l.descricao || '').trim();
          const key = `${iso}_${desc}`;
          mapHistorico.set(key, {
            id: l.id,
            dataHora: l.data_hora,
            usuario: l.usuario,
            descricao: l.descricao
          });
        });

        (data.historicoModificacoes || []).forEach(l => {
          const rawDt = l.dataHora || l.data_hora || l.data;
          const iso = toIso(rawDt);
          const desc = (l.descricao || l.detalhes || '').trim();
          const key = `${iso}_${desc}`;
          if (!mapHistorico.has(key)) {
            mapHistorico.set(key, {
              id: l.id || Date.now() + Math.random(),
              dataHora: rawDt,
              usuario: l.usuario || l.criadoPor || 'Sistema',
              descricao: desc
            });
          }
        });

        const logsUnificados = Array.from(mapHistorico.values()).sort((a, b) => new Date(b.dataHora || 0) - new Date(a.dataHora || 0));

        setDetailChamado(prev => {
          if (!prev || prev.id !== chamado.id) return prev;
          return {
            ...prev,
            ...data,
            hodometro: data.hodometro !== null && data.hodometro !== undefined ? data.hodometro : (data.dadosWorkflow?.hodometro || prev.hodometro),
            fotosChamado: data.dadosWorkflow?.fotosChamado || data.fotosChamado || data.fotosGerais || {},
            defeitos: dbDefs,
            historicoModificacoes: logsUnificados
          };
        });
      }
    } catch (err) {
      console.error('Erro ao buscar detalhes do chamado:', err);
    }
  };

  const handleAddComment = () => {
    if (!novoComentario.trim()) return;
    const log = `Comentário do Mecânico: ${novoComentario.trim()}`;
    const dataHoraIso = new Date().toISOString();
    const usuarioNome = currentUser?.nome || 'Mecânico';

    supabase
      .from('chamados_historico')
      .insert([{
        chamado_id: detailChamado.id,
        data_hora: dataHoraIso,
        usuario: usuarioNome,
        acao: 'COMENTÁRIO',
        descricao: log
      }])
      .then(() => {}, err => console.error('Erro ao salvar em chamados_historico:', err));

    const updated = {
      ...detailChamado,
      historicoModificacoes: [{ id: Date.now(), dataHora: dataHoraIso, usuario: usuarioNome, descricao: log }, ...(detailChamado.historicoModificacoes || [])]
    };
    onSubmit(updated);
    setDetailChamado(updated);
    setNovoComentario('');
  };

  // Actions - Solicitar Liberação do Veículo
  const handleOpenSolicitarLiberacao = async (chamado) => {
    setShowDetalhesInModal(false);
    setRelatorioTecnico('');
    setFotosReparo([null, null, null]);

    // Parse inicial da memória para renderização imediata
    const parseDefs = (raw) => {
      if (Array.isArray(raw)) return raw;
      if (typeof raw === 'string') {
        try { return JSON.parse(raw); } catch (e) { return []; }
      }
      return [];
    };

    let initialDefs = parseDefs(chamado.defeitos);
    if (initialDefs.length === 0) {
      initialDefs = parseDefs(chamado.dadosWorkflow?.defeitos);
    }
    if (initialDefs.length === 0 && (chamado.defeitoEncontrado || chamado.defeitoPrincipal)) {
      initialDefs = [{
        id: chamado.id || Date.now(),
        descricao: chamado.defeitoEncontrado || chamado.defeitoPrincipal,
        categoria: chamado.defeitoPrincipal || 'Geral',
        status: chamado.status === 'RESOLVIDO' ? 'RESOLVIDO' : 'PENDENTE',
        isImpeditivo: true
      }];
    }

    const currentWithDefs = {
      ...chamado,
      defeitos: initialDefs,
      fotosChamado: chamado.dadosWorkflow?.fotosChamado || chamado.fotosChamado || {}
    };
    setSolicitarChamado(currentWithDefs);

    // Busca dados 100% atualizados no Supabase em segundo plano
    try {
      const [{ data, error }, { data: hData }] = await Promise.all([
        supabase.from('chamados').select('*').eq('id', chamado.id).maybeSingle(),
        supabase.from('chamados_historico').select('*').eq('chamado_id', chamado.id).order('data_hora', { ascending: false })
      ]);

      if (data && !error) {
        let dbDefs = parseDefs(data.defeitos);
        if (dbDefs.length === 0) {
          dbDefs = parseDefs(data.dadosWorkflow?.defeitos);
        }
        if (dbDefs.length === 0 && (data.defeitoEncontrado || data.defeitoPrincipal)) {
          dbDefs = [{
            id: data.id || Date.now(),
            descricao: data.defeitoEncontrado || data.defeitoPrincipal,
            categoria: data.defeitoPrincipal || 'Geral',
            status: data.status === 'RESOLVIDO' ? 'RESOLVIDO' : 'PENDENTE',
            isImpeditivo: true
          }];
        }

        const toIso = (dt) => { 
          try { 
            const d = new Date(dt); 
            return isNaN(d.getTime()) ? String(dt) : d.toISOString(); 
          } catch(e) { 
            return String(dt); 
          } 
        };

        const mapHistorico = new Map();
        (hData || []).forEach(l => {
          const iso = toIso(l.data_hora);
          const desc = (l.descricao || '').trim();
          mapHistorico.set(`${iso}_${desc}`, {
            id: l.id,
            dataHora: l.data_hora,
            usuario: l.usuario,
            descricao: l.descricao
          });
        });

        (data.historicoModificacoes || []).forEach(l => {
          const rawDt = l.dataHora || l.data_hora || l.data;
          const iso = toIso(rawDt);
          const desc = (l.descricao || l.detalhes || '').trim();
          if (!mapHistorico.has(`${iso}_${desc}`)) {
            mapHistorico.set(`${iso}_${desc}`, {
              id: l.id || Date.now() + Math.random(),
              dataHora: rawDt,
              usuario: l.usuario || l.criadoPor || 'Sistema',
              descricao: desc
            });
          }
        });

        const logsUnificados = Array.from(mapHistorico.values()).sort((a, b) => new Date(b.dataHora || 0) - new Date(a.dataHora || 0));

        setSolicitarChamado(prev => {
          if (!prev || prev.id !== chamado.id) return prev;
          return {
            ...prev,
            ...data,
            hodometro: data.hodometro !== null && data.hodometro !== undefined ? data.hodometro : (data.dadosWorkflow?.hodometro || prev.hodometro),
            fotosChamado: data.dadosWorkflow?.fotosChamado || data.fotosChamado || {},
            defeitos: dbDefs,
            historicoModificacoes: logsUnificados
          };
        });
      }
    } catch (err) {
      console.warn('Erro ao carregar dados atualizados do chamado para liberação:', err);
    }
  };

  const handleToggleDefeito = (defeitoId) => {
    if (!solicitarChamado) return;
    const updatedDefeitos = (solicitarChamado.defeitos || []).map(d =>
      d.id === defeitoId ? { ...d, status: d.status === 'RESOLVIDO' ? 'PENDENTE' : 'RESOLVIDO', dataResolucao: d.status === 'RESOLVIDO' ? null : new Date().toISOString() } : d
    );
    const updated = { ...solicitarChamado, defeitos: updatedDefeitos, silentSave: true };
    setSolicitarChamado(updated);
    onSubmit(updated);
  };

  const handleUploadFotoReparo = (index, file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const novasFotos = [...fotosReparo];
      novasFotos[index] = reader.result;
      setFotosReparo(novasFotos);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoverFotoReparo = (index) => {
    const novasFotos = [...fotosReparo];
    novasFotos[index] = null;
    setFotosReparo(novasFotos);
  };

  const handleConfirmSolicitacaoLiberacao = () => {
    if (!solicitarChamado) return;
    const unresolved = (solicitarChamado.defeitos || []).filter(d => d.status !== 'RESOLVIDO');
    if (unresolved.length > 0) {
      return alert('Não é possível solicitar a liberação enquanto houver defeitos não marcados como resolvidos no checklist.');
    }
    if (!relatorioTecnico.trim()) {
      return alert('Por favor, descreva no relatório técnico o que foi realizado/reparado no veículo.');
    }

    const dataHoraIso = new Date().toISOString();
    const nomeMecanico = currentUser?.nome || currentUser?.login || 'Mecânico';
    const fotosValidas = fotosReparo.filter(Boolean);

    const solicitacaoData = {
      dataSolicitacao: dataHoraIso,
      mecanicoId: currentUser?.id || null,
      mecanicoNome: nomeMecanico,
      relatorioTecnico: relatorioTecnico.trim(),
      fotosReparo: fotosValidas,
      status: 'PENDENTE'
    };

    let log = `Mecânico (${nomeMecanico}) concluiu os reparos e solicitou liberação do veículo para a Frota. Relatório: ${relatorioTecnico.trim()}`;
    if (fotosValidas.length > 0) log += ` (${fotosValidas.length} fotos anexadas)`;

    onWorkflowTransition(solicitarChamado.id, 'Aguardando Validação Frota', log, {
      defeitos: solicitarChamado.defeitos,
      dadosWorkflow: {
        ...(solicitarChamado.dadosWorkflow || {}),
        solicitacaoLiberacao: solicitacaoData,
        motivoDevolucaoMecanico: null // Limpa alerta de devolução anterior
      }
    });

    setSolicitarChamado(null);
  };

  const handleSystemLogout = () => {
    setShowLogoutConfirm(true);
  };

  const handleConfirmSystemLogout = () => {
    setShowLogoutConfirm(false);
    if (onLogout) {
      onLogout();
    } else {
      sessionStorage.removeItem('currentUser');
      localStorage.removeItem('currentUser');
      window.location.reload();
    }
  };

  // UI Components
  const CardVeiculo = ({ c, tab, view = 'CARD' }) => {
    const vec = getVehicle(c.placa);
    const hasSugestao = c.dadosWorkflow?.sugestaoMecanico === 'Externa';
    
    const parseDefs = (raw) => {
      if (Array.isArray(raw)) return raw;
      if (typeof raw === 'string') {
        try { return JSON.parse(raw); } catch (e) { return []; }
      }
      return [];
    };

    const liveData = defeitosMap.get(c.id);
    const sourceDefs = liveData?.defeitos || c.defeitos;

    const cDefeitos = parseDefs(sourceDefs).length > 0 
      ? parseDefs(sourceDefs) 
      : (parseDefs(c.dadosWorkflow?.defeitos).length > 0 
          ? parseDefs(c.dadosWorkflow?.defeitos) 
          : ((c.defeitoEncontrado || c.defeitoPrincipal) ? [{ id: 1, descricao: c.defeitoEncontrado || c.defeitoPrincipal, status: c.status === 'RESOLVIDO' ? 'RESOLVIDO' : 'PENDENTE' }] : [])
        );

    const totalDef = cDefeitos.length;
    const resolvedDef = cDefeitos.filter(d => d.status === 'RESOLVIDO').length;
    const isAguardandoFrota = c.etapaWorkflow === 'Aguardando Validação Frota';
    const motivoDevolucao = c.dadosWorkflow?.motivoDevolucaoMecanico;

    if (view === 'LISTA') {
      return (
        <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md transition-all rounded-2xl p-4 flex items-center justify-between gap-4">
          <div className="flex-1 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6">
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-xl font-black text-slate-800 dark:text-slate-100">{c.placa}</h4>
                {isAguardandoFrota && (
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-purple-100 dark:bg-purple-950/70 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60 flex items-center gap-1">
                    <Clock size={10} /> Aguardando Frota
                  </span>
                )}
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">{vec.marca || '--'} • {vec.subTipo || vec.tipo || '--'}</p>
            </div>
            
            <div className="flex items-center gap-2">
              <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${
                c.situacaoVeiculo === 'RODANDO' ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300' : 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300'
              }`}>
                {c.situacaoVeiculo || 'RODANDO'}
              </span>
              {vec.regional && (
                <span className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-full text-[9px] font-black uppercase tracking-wider">{vec.regional}</span>
              )}
            </div>

            {totalDef > 0 && (
              <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 font-bold">
                <AlertCircle size={14} className="text-amber-500" />
                <span>{resolvedDef}/{totalDef} defeitos</span>
              </div>
            )}
          </div>
          
          <div className="flex gap-2">
            <button onClick={() => handleOpenDetails(c)} className="p-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl transition-all" title="Ver Detalhes">
              <Eye size={18}/>
            </button>
            {tab === 'ANALISE' ? (
              <button onClick={() => handleOpenAction(c)} className="p-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-all shadow-md shadow-emerald-500/20" title="Iniciar Diagnóstico">
                <Wrench size={18}/>
              </button>
            ) : isAguardandoFrota ? (
              <button onClick={() => handleOpenDetails(c)} className="p-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl transition-all shadow-md shadow-purple-500/20" title="Aguardando Validação da Frota">
                <Clock size={18}/>
              </button>
            ) : (
              <button onClick={() => handleOpenSolicitarLiberacao(c)} className="p-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-all shadow-md shadow-emerald-500/20" title="Solicitar Liberação para a Frota">
                <Send size={18}/>
              </button>
            )}
          </div>
        </div>
      );
    }

    // Default CARD view
    return (
      <div className={`bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800 shadow-lg shadow-slate-200/40 dark:shadow-black/40 p-6 rounded-[2rem] space-y-4 animate-in slide-in-from-bottom-4 duration-500 hover:shadow-xl transition-all ${
        isAguardandoFrota ? 'ring-2 ring-purple-500/30 border-purple-200 dark:border-purple-900/60' : ''
      }`}>
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h4 className="text-3xl font-black text-slate-800 dark:text-slate-100 tracking-tight">{c.placa}</h4>
              {vec.regional && (
                <span className="px-2.5 py-1 bg-emerald-100/80 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 rounded-full text-[10px] font-black uppercase tracking-wider">{vec.regional}</span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">{vec.marca || '--'} • {vec.subTipo || vec.tipo || '--'}</p>
          </div>
          
          <div className="flex flex-col items-end gap-1.5">
            <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider shadow-sm ${
              c.situacaoVeiculo === 'RODANDO' ? 'bg-emerald-100/80 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300' : 'bg-rose-100/80 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300'
            }`}>
              {c.situacaoVeiculo || 'RODANDO'}
            </span>

            {isAguardandoFrota && (
              <span className="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider bg-purple-100 dark:bg-purple-950/80 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800/80 shadow-xs flex items-center gap-1">
                <Clock size={11} /> Aguardando Frota
              </span>
            )}
          </div>
        </div>

        {/* Alerta de Devolução pela Frota */}
        {motivoDevolucao && (
          <div className="p-3.5 bg-rose-50/90 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800/60 text-rose-900 dark:text-rose-200 rounded-2xl text-xs font-bold flex items-start gap-2.5 animate-pulse">
            <RotateCcw size={16} className="shrink-0 mt-0.5 text-rose-500" />
            <div>
              <span className="font-black uppercase tracking-wider block text-[10px] text-rose-600 dark:text-rose-400">Devolvido pela Frota para Revisão:</span>
              <p className="mt-0.5 font-medium leading-relaxed">{motivoDevolucao}</p>
            </div>
          </div>
        )}

        {/* Defeitos Preview */}
        {totalDef > 0 && (
          <div className="bg-slate-50/90 dark:bg-slate-950/60 rounded-2xl p-4 border border-slate-100/80 dark:border-slate-800 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">Defeitos Reportados</span>
              <span className="text-[10px] font-black text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 px-2 py-1 rounded-lg shadow-sm">{totalDef}</span>
            </div>
            {tab === 'INTERNA' && (
              <div className="mt-2 space-y-1.5">
                <div className="flex justify-between text-[10px] font-bold text-slate-500 dark:text-slate-400">
                  <span>Progresso da Manutenção</span>
                  <span>{resolvedDef}/{totalDef} concluídos</span>
                </div>
                <div className="bg-slate-200/60 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div className="bg-emerald-500 h-full rounded-full transition-all duration-500" style={{ width: `${(resolvedDef / Math.max(1, totalDef)) * 100}%` }} />
                </div>
              </div>
            )}
          </div>
        )}

        {hasSugestao && (
          <div className="bg-amber-50/80 dark:bg-amber-950/60 border border-amber-200/50 dark:border-amber-800/60 text-amber-800 dark:text-amber-300 p-3.5 rounded-2xl text-xs font-bold flex items-center gap-2 backdrop-blur-sm">
            <Info size={16} className="shrink-0 text-amber-500" />
            Sinalizado p/ Externa ({c.oficinaDestino})
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 pt-2">
          <button
            onClick={() => handleOpenDetails(c)}
            className="w-full py-4 bg-slate-100/80 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-[1.5rem] text-xs font-black transition-all active:scale-95 flex flex-col items-center justify-center gap-1.5"
          >
            <Eye size={18}/>
            <span>Detalhes / Histórico</span>
          </button>
          
          {tab === 'ANALISE' ? (
            <button
              onClick={() => handleOpenAction(c)}
              className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-[1.5rem] text-xs font-black shadow-lg shadow-emerald-500/20 transition-all active:scale-95 flex flex-col items-center justify-center gap-1.5"
            >
              <Wrench size={18}/>
              <span>Diagnóstico</span>
            </button>
          ) : isAguardandoFrota ? (
            <button
              onClick={() => handleOpenDetails(c)}
              className="w-full py-4 bg-purple-600 hover:bg-purple-700 text-white rounded-[1.5rem] text-xs font-black shadow-lg shadow-purple-500/20 transition-all active:scale-95 flex flex-col items-center justify-center gap-1.5"
            >
              <Clock size={18}/>
              <span>Aguardando Frota</span>
            </button>
          ) : (
            <button
              onClick={() => handleOpenSolicitarLiberacao(c)}
              className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-[1.5rem] text-xs font-black shadow-lg shadow-emerald-500/20 transition-all active:scale-95 flex flex-col items-center justify-center gap-1.5"
            >
              <Send size={18}/>
              <span>Solicitar Liberação</span>
            </button>
          )}
        </div>
      </div>
    );
  };

  const renderChamados = (chamadosList, tab) => {
    if (chamadosList.length === 0) {
      return (
        <div className="text-center py-16 px-6 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl rounded-[2.5rem] border-2 border-dashed border-slate-200 dark:border-slate-800">
          <div className="w-16 h-16 mx-auto bg-white dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-400 mb-4 shadow-sm">
            <CheckCircle2 size={32}/>
          </div>
          <h3 className="text-lg font-black text-slate-700 dark:text-slate-200">Tudo limpo por aqui!</h3>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-2">Nenhum veículo nesta etapa no momento.</p>
        </div>
      );
    }

    if (viewMode === 'AGRUPADO') {
      const pesados = chamadosList.filter(c => getVehicle(c.placa)?.tipo?.toUpperCase() === 'PESADO');
      const leves = chamadosList.filter(c => getVehicle(c.placa)?.tipo?.toUpperCase() === 'LEVE');
      const motos = chamadosList.filter(c => getVehicle(c.placa)?.tipo?.toUpperCase() === 'MOTO');

      return (
        <div className="space-y-8">
          {pesados.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-black text-slate-800 dark:text-slate-100 flex items-center gap-2 px-2"><Truck size={20} className="text-emerald-500"/> Veículos Pesados ({pesados.length})</h3>
              <div className="space-y-4">{pesados.map(c => <CardVeiculo key={c.id} c={c} tab={tab} view="CARD" />)}</div>
            </div>
          )}
          {leves.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-black text-slate-800 dark:text-slate-100 flex items-center gap-2 px-2"><Home size={20} className="text-emerald-500"/> Veículos Leves ({leves.length})</h3>
              <div className="space-y-4">{leves.map(c => <CardVeiculo key={c.id} c={c} tab={tab} view="CARD" />)}</div>
            </div>
          )}
          {motos.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-black text-slate-800 dark:text-slate-100 flex items-center gap-2 px-2"><PlayCircle size={20} className="text-amber-500"/> Motocicletas ({motos.length})</h3>
              <div className="space-y-4">{motos.map(c => <CardVeiculo key={c.id} c={c} tab={tab} view="CARD" />)}</div>
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
    <div className={`min-h-screen pb-28 font-sans relative selection:bg-emerald-200 transition-colors ${
      theme === 'dark' ? 'bg-[#030712] text-slate-100' : 'bg-[#F8FAFC] text-slate-900'
    }`}>
      
      {/* Dynamic Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[0%] left-[-10%] w-[50%] h-[50%] bg-emerald-500/10 dark:bg-emerald-500/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-[20%] right-[-10%] w-[60%] h-[60%] bg-teal-500/10 dark:bg-teal-500/5 rounded-full blur-[120px]" />
      </div>

      {/* Top Header Bar with Theme Toggle and Avatar Menu */}
      <header className="sticky top-0 z-30 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200/80 dark:border-slate-800 px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-md shadow-emerald-500/20">
              <Wrench size={18} />
            </div>
            <div>
              <h2 className="text-sm font-black text-slate-900 dark:text-slate-100 leading-tight">Painel do Mecânico</h2>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold">Gestão de Oficina & Manutenção</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Theme Toggle Button */}
            {setTheme && (
              <button
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="p-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-amber-400 border border-slate-200 dark:border-slate-700 shadow-xs hover:scale-105 transition-all"
                title={theme === 'dark' ? 'Mudar para Modo Claro' : 'Mudar para Modo Escuro'}
              >
                {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
              </button>
            )}

            {/* User Avatar Menu */}
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white font-black text-xs flex items-center justify-center shadow-md border border-emerald-400/30 active:scale-95 transition-transform"
              >
                {currentUser?.nome?.charAt(0) || 'M'}
              </button>

              {showUserMenu && (
                <div className="absolute right-0 top-12 z-50 w-56 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-2 animate-in zoom-in-95">
                  <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800 mb-1">
                    <p className="text-xs font-black text-slate-800 dark:text-slate-100 truncate">{currentUser?.nome || 'Mecânico'}</p>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">{currentUser?.login || 'MECÂNICO'}</p>
                  </div>
                  <button
                    onClick={() => { setShowUserMenu(false); setActiveTab('USUARIO'); }}
                    className="w-full px-3 py-2 text-left text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl flex items-center gap-2"
                  >
                    <User size={14} /> Meu Perfil
                  </button>
                  <button
                    onClick={() => { setShowUserMenu(false); handleSystemLogout(); }}
                    className="w-full px-3 py-2 text-left text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-xl flex items-center gap-2 mt-1"
                  >
                    <LogOut size={14} /> Sair do Sistema
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="relative z-10 max-w-2xl mx-auto p-4 md:p-6 space-y-6">
        
        {activeTab === 'USUARIO' ? (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Header Banner */}
            <div className="bg-gradient-to-tr from-emerald-600 to-teal-700 p-6 pt-8 text-white rounded-[2rem] shadow-lg relative overflow-hidden shrink-0 min-h-[160px] flex items-center">
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
            
            <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] shadow-sm border border-slate-200/80 dark:border-slate-800 space-y-5">
              <h3 className="font-black text-slate-800 dark:text-slate-100 text-xs uppercase tracking-wider mb-2 border-b border-slate-100 dark:border-slate-800 pb-3 flex items-center gap-2">
                <User size={16} className="text-emerald-500" /> Meus Dados Cadastrais
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 mb-1.5 tracking-wider">Nome Completo</label>
                  <input 
                    readOnly
                    type="text" 
                    value={currentUser?.nome?.toUpperCase() || ''} 
                    className="w-full p-4 bg-slate-50/70 dark:bg-slate-950/70 rounded-xl font-bold text-slate-700 dark:text-slate-200 outline-none border border-slate-200 dark:border-slate-800 text-xs uppercase"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 mb-1.5 tracking-wider">Login / Usuário</label>
                  <input 
                    readOnly
                    type="text" 
                    value={currentUser?.login?.toLowerCase() || ''} 
                    className="w-full p-4 bg-slate-50/70 dark:bg-slate-950/70 rounded-xl font-bold text-slate-700 dark:text-slate-200 outline-none border border-slate-200 dark:border-slate-800 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 mb-1.5 tracking-wider">Senha do Sistema</label>
                  <div className="relative">
                    <input 
                      readOnly
                      type={showSenha ? "text" : "password"} 
                      value={currentUser?.senha || '********'} 
                      className="w-full p-4 bg-slate-50/70 dark:bg-slate-950/70 rounded-xl font-bold text-slate-700 dark:text-slate-200 outline-none border border-slate-200 dark:border-slate-800 pr-12 text-xs"
                    />
                    <button 
                      type="button" 
                      onClick={() => setShowSenha(!showSenha)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-emerald-500 transition-colors"
                    >
                      {showSenha ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 mb-1.5 tracking-wider">Telefone</label>
                    <input 
                      readOnly
                      type="text" 
                      value={currentUser?.telefone || ''} 
                      className="w-full p-4 bg-slate-50/70 dark:bg-slate-950/70 rounded-xl font-bold text-slate-700 dark:text-slate-200 outline-none border border-slate-200 dark:border-slate-800 text-xs"
                      placeholder="DDD 99999-9999"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 mb-1.5 tracking-wider">Matrícula</label>
                    <input 
                      readOnly
                      type="text" 
                      value={currentUser?.matricula || ''} 
                      className="w-full p-4 bg-slate-50/70 dark:bg-slate-950/70 rounded-xl font-bold text-slate-700 dark:text-slate-200 outline-none border border-slate-200 dark:border-slate-800 text-xs"
                      placeholder="Nº da Matrícula"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  onClick={handleSystemLogout}
                  className="w-full py-4 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/40 text-rose-600 dark:text-rose-400 rounded-2xl text-xs font-black transition-all flex items-center justify-center gap-2 border border-rose-200 dark:border-rose-800/60"
                >
                  <LogOut size={16} /> Sair do Sistema
                </button>
              </div>
            </div>

          </div>
        ) : (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Header Rich Welcome Card */}
            <div className="bg-gradient-to-br from-emerald-600 via-teal-700 to-emerald-900 text-white shadow-xl shadow-emerald-900/20 rounded-[2.5rem] p-8 relative overflow-hidden">
               <div className="absolute top-0 right-0 p-4 opacity-10"><Wrench size={140} /></div>
               <div className="relative z-10">
                  <h1 className="text-3xl sm:text-4xl font-black tracking-tight mb-2">Painel de Oficina</h1>
                  <p className="text-base sm:text-lg text-emerald-100 font-medium">Bem-vindo, <span className="text-white font-black">{currentUser?.nome?.split(' ')[0] || 'Mecânico'}</span>!</p>
                  <div className="mt-6 flex flex-wrap gap-3">
                     <span className="bg-white/20 backdrop-blur-md px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border border-white/20">
                       {analiseChamados.length + oficinaInternaChamados.length} Veículos na fila
                     </span>
                  </div>
               </div>
            </div>

            {/* Search & Filters (Instant Floating Dropdown Search) */}
            <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800 rounded-[2rem] p-4 shadow-sm space-y-4">
              <div className="relative">
                <div className="relative">
                  <Search className="absolute left-4.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={19} />
                  <input 
                    type="text" 
                    placeholder="Buscar por placa, SOL, defeito ou motorista..." 
                    value={searchTerm} 
                    onFocus={() => setIsSearchFocused(true)}
                    onBlur={() => setTimeout(() => setIsSearchFocused(false), 250)}
                    onChange={(e) => { setSearchTerm(e.target.value); setIsSearchFocused(true); }} 
                    className="w-full pl-14 pr-10 py-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-[1.5rem] font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm placeholder:text-slate-400 shadow-xs" 
                  />
                  {searchTerm && (
                    <button 
                      type="button"
                      onClick={() => setSearchTerm('')} 
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
                    >
                      <X size={15} />
                    </button>
                  )}
                </div>

                {/* Instant Floating Dropdown Results */}
                {isSearchFocused && searchTerm.trim() && (
                  <div className="absolute left-0 right-0 top-full mt-2 bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.2)] z-50 overflow-hidden max-h-80 overflow-y-auto animate-in fade-in zoom-in-95 duration-200 p-2 space-y-1.5 custom-scrollbar">
                    <div className="px-3 py-1.5 text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                      <span>Resultados da busca ({searchResults.length})</span>
                      <span>Clique na ação desejada</span>
                    </div>
                    {searchResults.map(c => {
                      const veiculo = getVehicle(c.placa);
                      const subTipo = veiculo?.subTipo || veiculo?.tipo || 'Veículo';
                      const isAnalise = ['Análise Frota', 'Aguardando Manutenção'].includes(c.etapaWorkflow || 'Análise Frota');
                      const isAguardando = c.etapaWorkflow === 'Aguardando Validação Frota';

                      return (
                        <div 
                          key={c.id}
                          className="p-3 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800/80 bg-white dark:bg-slate-900 transition-all border border-slate-100 dark:border-slate-800 shadow-2xs group flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-1.5 mb-1">
                              <span className="font-black text-sm text-slate-800 dark:text-slate-100 group-hover:text-emerald-500 transition-colors">
                                {c.placa}
                              </span>
                              {c.codigoChamado && (
                                <span className="text-[10px] font-mono font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-200/60 dark:border-emerald-800/60">
                                  {c.codigoChamado}
                                </span>
                              )}
                              <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded-md border border-slate-200/60 dark:border-slate-700">
                                {subTipo}
                              </span>
                            </div>
                            <p className="text-xs text-slate-700 dark:text-slate-300 font-bold truncate">
                              {c.defeitoPrincipal || c.defeitoEncontrado || 'Sem descrição informada'}
                            </p>
                            {c.motorista && (
                              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium truncate mt-0.5">
                                Motorista: <strong className="text-slate-700 dark:text-slate-200">{c.motorista}</strong>
                              </p>
                            )}
                          </div>

                          <div className="flex items-center gap-2 shrink-0 justify-end pt-1 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800">
                            <button
                              type="button"
                              onMouseDown={(e) => { e.preventDefault(); handleOpenDetails(c); setIsSearchFocused(false); }}
                              className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
                              title="Ver Detalhes"
                            >
                              <Eye size={13} /> Detalhes
                            </button>

                            {isAnalise ? (
                              <button
                                type="button"
                                onMouseDown={(e) => { e.preventDefault(); handleOpenAction(c); setIsSearchFocused(false); }}
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-sm transition-all flex items-center gap-1 cursor-pointer"
                              >
                                <Wrench size={13} /> Diagnóstico
                              </button>
                            ) : isAguardando ? (
                              <button
                                type="button"
                                onMouseDown={(e) => { e.preventDefault(); handleOpenDetails(c); setIsSearchFocused(false); }}
                                className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-black shadow-sm transition-all flex items-center gap-1 cursor-pointer"
                              >
                                <Clock size={13} /> Validação
                              </button>
                            ) : (
                              <button
                                type="button"
                                onMouseDown={(e) => { e.preventDefault(); handleOpenSolicitarLiberacao(c); setIsSearchFocused(false); }}
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-sm transition-all flex items-center gap-1 cursor-pointer"
                              >
                                <Send size={13} /> Solicitar Liberação
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    {searchResults.length === 0 && (
                      <div className="p-4 text-center text-xs font-bold text-slate-400">
                        Nenhum chamado encontrado para "{searchTerm}".
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              {/* Filtros de Categoria e Modos de Visualização */}
              <div className="space-y-3 pt-1">
                <div className="space-y-1.5">
                  <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest px-1">Categoria de Veículo</span>
                  <div className="grid grid-cols-4 gap-1.5 p-1 bg-slate-100 dark:bg-slate-950 rounded-2xl">
                    {['TODOS', 'PESADO', 'LEVE', 'MOTO'].map(t => (
                      <button
                        key={t}
                        onClick={() => setActiveType(t)}
                        className={`py-2 rounded-xl text-[10px] sm:text-xs font-black tracking-wider transition-all active:scale-95 text-center ${
                          activeType === t 
                            ? 'bg-slate-800 dark:bg-slate-700 text-white shadow-md' 
                            : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
                
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Modo de Visualização</span>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 dark:bg-slate-950 rounded-2xl">
                    <button 
                      onClick={() => setViewMode('CARD')} 
                      className={`flex items-center justify-center gap-1.5 py-2 rounded-xl font-black text-xs transition-all active:scale-95 ${
                        viewMode === 'CARD' 
                          ? 'bg-white dark:bg-slate-800 shadow-sm text-emerald-600 dark:text-emerald-400 font-extrabold' 
                          : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'
                      }`}
                    >
                      <LayoutGrid size={15}/>
                      <span>Cards</span>
                    </button>

                    <button 
                      onClick={() => setViewMode('LISTA')} 
                      className={`flex items-center justify-center gap-1.5 py-2 rounded-xl font-black text-xs transition-all active:scale-95 ${
                        viewMode === 'LISTA' 
                          ? 'bg-white dark:bg-slate-800 shadow-sm text-emerald-600 dark:text-emerald-400 font-extrabold' 
                          : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'
                      }`}
                    >
                      <List size={15}/>
                      <span>Lista</span>
                    </button>

                    <button 
                      onClick={() => setViewMode('AGRUPADO')} 
                      className={`flex items-center justify-center gap-1.5 py-2 rounded-xl font-black text-xs transition-all active:scale-95 ${
                        viewMode === 'AGRUPADO' 
                          ? 'bg-white dark:bg-slate-800 shadow-sm text-emerald-600 dark:text-emerald-400 font-extrabold' 
                          : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'
                      }`}
                    >
                      <LayoutTemplate size={15}/>
                      <span>Agrupado</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Content List */}
            <div className="space-y-5">
              <div className="flex items-center gap-3 px-2">
                <div className={`p-2.5 rounded-2xl ${activeTab === 'ANALISE' ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400' : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400'}`}>
                  {activeTab === 'ANALISE' ? <Clock size={20}/> : <Home size={20}/>}
                </div>
                <h2 className="text-xl font-black text-slate-800 dark:text-slate-100">
                  {activeTab === 'ANALISE' ? 'Aguardando Análise' : 'Oficina Interna'}
                </h2>
                <span className="ml-auto bg-slate-200/60 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-3 py-1 rounded-full text-xs font-black shadow-xs border border-slate-200 dark:border-slate-700">
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

      {/* ── BOTTOM NAVIGATION (Apple Glass Style) ── */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/90 dark:bg-slate-900/90 backdrop-blur-2xl border-t border-slate-200/80 dark:border-slate-800 shadow-[0_-8px_30px_rgba(0,0,0,0.08)] px-2 pt-2 pb-[calc(8px+env(safe-area-inset-bottom,0px))]">
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
              <Clock size={20} strokeWidth={activeTab === 'ANALISE' ? 2.5 : 2} />
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
            <div className={`p-2 rounded-xl transition-all relative ${
              activeTab === 'INTERNA' 
                ? 'bg-emerald-100/90 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 shadow-sm scale-105' 
                : 'bg-transparent'
            }`}>
              <Home size={20} strokeWidth={activeTab === 'INTERNA' ? 2.5 : 2} />
              {oficinaInternaChamados.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 text-white text-[9px] font-black flex items-center justify-center shadow-xs">
                  {oficinaInternaChamados.length}
                </span>
              )}
            </div>
            <span className="text-[11px] font-black tracking-tight leading-none">Oficina Int</span>
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
              <User size={20} strokeWidth={activeTab === 'USUARIO' ? 2.5 : 2} />
            </div>
            <span className="text-[11px] font-black tracking-tight leading-none">Perfil</span>
          </button>
        </div>
      </div>

      {/* ── MODAL DE INICIAR DIAGNÓSTICO (Ação Análise) ── */}
      {selectedChamado && (
        <div className="fixed inset-0 z-50 flex justify-center items-end sm:items-center bg-slate-950/70 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-900 w-full sm:max-w-lg rounded-t-[2.5rem] sm:rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col max-h-[90vh] border border-slate-200 dark:border-slate-800 animate-in slide-in-from-bottom-8">
            <div className="p-6 bg-slate-900 dark:bg-slate-950 flex justify-between items-center sticky top-0 z-10 border-b border-slate-800">
              <div>
                <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest block mb-1">Processamento de Chamado</span>
                <h3 className="text-3xl font-black text-white tracking-tight">{selectedChamado.placa}</h3>
              </div>
              <button onClick={() => setSelectedChamado(null)} className="p-2.5 bg-white/10 rounded-full text-white hover:bg-rose-500 transition-colors"><X size={22}/></button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
              <form onSubmit={handleConfirmAnalise} className="space-y-6">
                <div className="grid grid-cols-2 gap-2 bg-slate-100 dark:bg-slate-950 p-1.5 rounded-[1.8rem]">
                  <button type="button" onClick={() => setModalMode('Interna')} className={`py-3.5 rounded-[1.5rem] text-sm font-black transition-all flex items-center justify-center gap-2 ${modalMode === 'Interna' ? 'bg-white dark:bg-slate-800 shadow-sm text-emerald-600 dark:text-emerald-400' : 'text-slate-500 hover:text-slate-800'}`}>
                    <Home size={18}/> Interna
                  </button>
                  <button type="button" onClick={() => setModalMode('Externa')} className={`py-3.5 rounded-[1.5rem] text-sm font-black transition-all flex items-center justify-center gap-2 ${modalMode === 'Externa' ? 'bg-white dark:bg-slate-800 shadow-sm text-emerald-600 dark:text-emerald-400' : 'text-slate-500 hover:text-slate-800'}`}>
                    <Truck size={18}/> Externa
                  </button>
                </div>

                {modalMode === 'Interna' ? (
                  <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
                    <div>
                      <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-2">Diagnóstico / O que precisa ser feito? <span className="text-rose-500">*</span></label>
                      <textarea required value={diagnostico} onChange={e => setDiagnostico(e.target.value)} placeholder="Ex: Troca de pastilhas de freio, revisão elétrica..." className="w-full p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-[1.5rem] font-medium text-slate-700 dark:text-slate-200 outline-none focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 min-h-[120px] resize-none text-xs" />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-2">Peças Necessárias (Se houver)</label>
                      <textarea value={pecas} onChange={e => setPecas(e.target.value)} placeholder="Ex: Jogo de pastilhas dianteiras, 4L óleo..." className="w-full p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-[1.5rem] font-medium text-slate-700 dark:text-slate-200 outline-none focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 min-h-[80px] resize-none text-xs" />
                    </div>
                    <button type="submit" className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-[1.5rem] text-xs font-black shadow-lg shadow-emerald-500/20 transition-all active:scale-95 mt-4">
                      Confirmar Entrada na Oficina Interna
                    </button>
                  </div>
                ) : (
                  <div className="space-y-5 animate-in fade-in slide-in-from-left-4 duration-300">
                    <div>
                      <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-2">Selecione a Oficina Externa <span className="text-rose-500">*</span></label>
                      <select required value={oficinaExterna} onChange={e => setOficinaExterna(e.target.value)} className="w-full p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-[1.5rem] font-black text-slate-700 dark:text-slate-200 outline-none focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 text-xs">
                        <option value="">Selecione a Oficina...</option>
                        {optionsOficinas.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-2">Motivo / Defeito</label>
                      <textarea value={comentarioExterna} onChange={e => setComentarioExterna(e.target.value)} placeholder="Descreva o motivo pelo qual o reparo não pode ser feito internamente..." className="w-full p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-[1.5rem] font-medium text-slate-700 dark:text-slate-200 outline-none focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 min-h-[120px] resize-none text-xs" />
                    </div>
                    <button type="submit" className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-[1.5rem] text-xs font-black shadow-lg shadow-emerald-500/20 transition-all active:scale-95 mt-4">
                      Sinalizar Necessidade de Oficina Externa
                    </button>
                  </div>
                )}
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL DE SOLICITAÇÃO DE LIBERAÇÃO À FROTA ── */}
      {solicitarChamado && (() => {
        const vec = getVehicle(solicitarChamado.placa);
        const fotosChamadoArr = Object.entries(solicitarChamado.fotosChamado || {}).filter(([_, url]) => !!url);
        const historicoLogs = solicitarChamado.historicoModificacoes || [];

        return (
          <div className="fixed inset-0 z-50 flex justify-center items-end sm:items-center bg-slate-950/70 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-300">
            <div className="bg-white dark:bg-slate-900 w-full sm:max-w-lg rounded-t-[2.5rem] sm:rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col max-h-[90vh] border border-slate-200 dark:border-slate-800 animate-in slide-in-from-bottom-8">
              {/* Header */}
              <div className="p-6 bg-slate-900 dark:bg-slate-950 flex justify-between items-center sticky top-0 z-10 border-b border-slate-800">
                <div className="min-w-0 pr-2">
                  <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest block mb-1">Validação de Manutenção</span>
                  <h3 className="text-3xl font-black text-white tracking-tight truncate">{solicitarChamado.placa}</h3>
                  <p className="text-xs text-slate-400 font-medium">Solicitar Liberação para a Equipe de Frota</p>
                </div>
                
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleOpenDetails(solicitarChamado)}
                    className="px-3.5 py-2 rounded-2xl text-xs font-black transition-all flex items-center gap-1.5 shadow-xs cursor-pointer bg-white/10 text-white hover:bg-white/20 border border-white/10"
                    title="Ver Detalhes e Comentários do Chamado"
                  >
                    <Eye size={15} />
                    <span className="hidden sm:inline">Ver Detalhes</span>
                  </button>
                  <button onClick={() => setSolicitarChamado(null)} className="p-2.5 bg-white/10 rounded-full text-white hover:bg-rose-500 transition-colors"><X size={22}/></button>
                </div>
              </div>
              
              <div className="p-6 overflow-y-auto flex-1 space-y-6 custom-scrollbar pb-8">
                {/* ── FORMULÁRIO DE SOLICITAÇÃO DE LIBERAÇÃO ── */}
                {/* Card de Atalho para Detalhes */}
                  <div className="bg-emerald-50/80 dark:bg-emerald-950/40 p-3.5 rounded-2xl border border-emerald-200/80 dark:border-emerald-800/50 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="p-2 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                        <Info size={16} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                          {solicitarChamado.motorista ? `Motorista: ${solicitarChamado.motorista}` : 'OS em Manutenção Interna'}
                        </p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                          {solicitarChamado.codigoChamado || `#${solicitarChamado.id}`} • {solicitarChamado.hodometro ? `${Number(solicitarChamado.hodometro).toLocaleString('pt-BR')} km` : 'Sem km informado'}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleOpenDetails(solicitarChamado)}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[11px] font-black shrink-0 transition-colors flex items-center gap-1 cursor-pointer shadow-xs"
                    >
                      <Eye size={13} /> Ver Detalhes
                    </button>
                  </div>

                    {/* 1. Checklist de Defeitos */}
                    <div className="bg-slate-50 dark:bg-slate-950 rounded-[2rem] p-5 border border-slate-200 dark:border-slate-800 space-y-3">
                      <div className="flex justify-between items-center">
                        <h4 className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 tracking-widest flex items-center gap-2">
                          <ClipboardCheck size={16} className="text-emerald-500"/>
                          1. Checklist de Manutenção (Marque os Concluídos)
                        </h4>
                        <span className="text-[10px] font-mono font-bold text-slate-400">
                          {(solicitarChamado.defeitos || []).filter(d => d.status === 'RESOLVIDO').length}/{(solicitarChamado.defeitos || []).length}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Selecione todos os defeitos que foram reparados com sucesso.</p>
                      
                      <div className="space-y-2 mt-2">
                        {(solicitarChamado.defeitos || []).map((def, idx) => {
                          const fotoDef = def.fotoDefeito || def.foto || def.fotoUrl || (Array.isArray(def.fotos) && def.fotos[0]);
                          return (
                            <div 
                              key={def.id || idx}
                              onClick={() => handleToggleDefeito(def.id)}
                              className={`flex items-center justify-between p-3.5 rounded-[1.2rem] border cursor-pointer transition-all ${
                                def.status === 'RESOLVIDO' 
                                  ? 'border-emerald-300 dark:border-emerald-700 bg-emerald-50/60 dark:bg-emerald-950/40' 
                                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs'
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-black shrink-0 transition-all ${
                                  def.status === 'RESOLVIDO' ? 'bg-emerald-500 shadow-sm' : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-300'
                                }`}>
                                  {def.status === 'RESOLVIDO' ? <Check size={14}/> : idx + 1}
                                </div>
                                <div>
                                  <p className={`text-xs font-bold transition-colors ${
                                    def.status === 'RESOLVIDO' ? 'text-slate-400 dark:text-slate-500 line-through' : 'text-slate-700 dark:text-slate-200'
                                  }`}>
                                    {def.descricao}
                                  </p>
                                  <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase mt-0.5 block tracking-wider">{def.categoria}</span>
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                {fotoDef && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedImagePreview({ url: fotoDef, label: `Foto do Defeito: ${def.categoria || def.descricao}` });
                                    }}
                                    className="px-2.5 py-1 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 text-[10px] font-black hover:scale-105 transition-transform flex items-center gap-1 cursor-pointer"
                                    title="Visualizar Foto do Defeito"
                                  >
                                    <Camera size={12} className="text-emerald-600 dark:text-emerald-400"/>
                                    <span className="hidden sm:inline">Foto</span>
                                  </button>
                                )}
                                <span className={`text-[9px] font-black px-2 py-0.5 rounded-md uppercase ${
                                  def.status === 'RESOLVIDO' ? 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                                }`}>
                                  {def.status === 'RESOLVIDO' ? 'Concluído' : 'Pendente'}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                        {(solicitarChamado.defeitos || []).length === 0 && (
                          <p className="text-xs font-medium text-slate-400 italic">Nenhum defeito reportado neste chamado.</p>
                        )}
                      </div>
                    </div>

                    {/* 2. Relatório Técnico do Mecânico (Obrigatório) */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 block">
                        2. Relatório Técnico dos Reparos (Obrigatório) <span className="text-rose-500">*</span>
                      </label>
                      <textarea 
                        required
                        value={relatorioTecnico}
                        onChange={e => setRelatorioTecnico(e.target.value)}
                        placeholder="Descreva detalhadamente o que foi reparado, peças trocadas e testes executados no veículo..."
                        className="w-full p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-[1.5rem] font-medium text-slate-700 dark:text-slate-200 outline-none focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 min-h-[110px] resize-none text-xs"
                      />
                    </div>

                    {/* 3. Anexo de Fotos dos Reparos (Até 3 Fotos Opcionais) */}
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                          <Camera size={14} className="text-emerald-500"/>
                          3. Fotos dos Reparos (Até 3 Fotos Opcionais)
                        </label>
                        <span className="text-[9px] font-mono text-slate-400">
                          {fotosReparo.filter(Boolean).length}/3 fotos
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-3">
                        {[0, 1, 2].map((slotIdx) => {
                          const foto = fotosReparo[slotIdx];
                          return (
                            <div key={slotIdx} className="relative aspect-square rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-center justify-center group shadow-xs">
                              {foto ? (
                                <>
                                  <img src={foto} alt={`Foto ${slotIdx + 1}`} className="w-full h-full object-cover" />
                                  <button
                                    type="button"
                                    onClick={() => handleRemoverFotoReparo(slotIdx)}
                                    className="absolute top-1.5 right-1.5 p-1 bg-rose-600 text-white rounded-full shadow-md hover:scale-110 transition-transform"
                                    title="Remover Foto"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                  <span className="absolute bottom-1 left-1 bg-black/60 text-white text-[8px] font-black uppercase px-1.5 py-0.5 rounded">
                                    Foto #{slotIdx + 1}
                                  </span>
                                </>
                              ) : (
                                <label className="w-full h-full flex flex-col items-center justify-center cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors p-2 text-center">
                                  <Camera size={22} className="text-slate-400 mb-1" />
                                  <span className="text-[9px] font-bold text-slate-400 uppercase">Foto #{slotIdx + 1}</span>
                                  <input 
                                    type="file" 
                                    accept="image/*" 
                                    className="hidden" 
                                    onChange={(e) => handleUploadFotoReparo(slotIdx, e.target.files[0])}
                                  />
                                </label>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Validação de Defeitos Pendentes ou Botão de Envio */}
                    {(solicitarChamado.defeitos || []).some(d => d.status !== 'RESOLVIDO') ? (
                      <div className="bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800/60 text-amber-800 dark:text-amber-300 p-4 rounded-[1.5rem] text-xs font-bold flex gap-3 shadow-xs mt-4">
                        <AlertCircle size={18} className="shrink-0 mt-0.5 text-amber-500" />
                        Resolva todos os defeitos do checklist acima antes de enviar a solicitação para a Frota.
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={handleConfirmSolicitacaoLiberacao}
                        disabled={!relatorioTecnico.trim()}
                        className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-[1.5rem] text-xs font-black shadow-lg shadow-emerald-500/20 transition-all active:scale-95 flex justify-center items-center gap-2 mt-4 cursor-pointer"
                      >
                        <Send size={18}/>
                        Enviar Solicitação de Liberação para a Frota
                      </button>
                    )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── MODAL DE DETALHES E COMENTÁRIOS DO CHAMADO (Sempre em Primeiro Plano z-[80]) ── */}
      {detailChamado && (() => {
        const vec = getVehicle(detailChamado.placa);
        const defeitos = detailChamado.defeitos || [];
        const historico = detailChamado.historicoModificacoes || [];
        const totalDef = defeitos.length;
        const resolvedDef = defeitos.filter(d => d.status === 'RESOLVIDO').length;

        // 1. Fotos Gerais do Chamado (fotosChamado, fotosGerais)
        const fotosGeraisRaw = detailChamado.dadosWorkflow?.fotosChamado || detailChamado.fotosChamado || detailChamado.fotosGerais || detailChamado.dadosWorkflow?.fotosGerais || {};

        let fotosGeraisList = [];
        if (Array.isArray(fotosGeraisRaw)) {
          fotosGeraisList = fotosGeraisRaw.filter(Boolean).map((url, idx) => ({ 
            label: `Foto Geral #${idx + 1}`, 
            url, 
            tipo: 'geral' 
          }));
        } else if (typeof fotosGeraisRaw === 'object' && fotosGeraisRaw !== null) {
          const labelsMap = {
            fotoVeiculo: 'Veículo (Fachada)',
            fotoHodometro: 'Hodômetro (KM)',
            fotoAdicional: 'Foto Adicional'
          };
          fotosGeraisList = Object.entries(fotosGeraisRaw)
            .filter(([_, url]) => !!url)
            .map(([k, url]) => ({ 
              label: labelsMap[k] || k || 'Foto Geral', 
              url, 
              tipo: 'geral' 
            }));
        }

        // 2. Fotos de cada Defeito Reportado
        const fotosDefeitosList = [];
        defeitos.forEach((d, idx) => {
          const defTitulo = d.categoria ? `${d.categoria}` : (d.descricao ? (d.descricao.length > 25 ? d.descricao.slice(0, 25) + '...' : d.descricao) : `Defeito #${idx + 1}`);
          if (d.fotoDefeito) {
            fotosDefeitosList.push({ label: `Defeito: ${defTitulo}`, url: d.fotoDefeito, defeitoId: d.id, tipo: 'defeito' });
          }
          if (d.foto && d.foto !== d.fotoDefeito) {
            fotosDefeitosList.push({ label: `Defeito: ${defTitulo}`, url: d.foto, defeitoId: d.id, tipo: 'defeito' });
          }
          if (d.fotoUrl && d.fotoUrl !== d.fotoDefeito && d.fotoUrl !== d.foto) {
            fotosDefeitosList.push({ label: `Defeito: ${defTitulo}`, url: d.fotoUrl, defeitoId: d.id, tipo: 'defeito' });
          }
          if (Array.isArray(d.fotos)) {
            d.fotos.filter(Boolean).forEach((f, fIdx) => {
              fotosDefeitosList.push({ label: `Defeito ${defTitulo} (${fIdx + 1})`, url: f, defeitoId: d.id, tipo: 'defeito' });
            });
          }
        });

        // 3. Fotos de Reparo do Mecânico (se houver)
        const fotosReparoRaw = detailChamado.fotosReparo || detailChamado.dadosWorkflow?.fotosReparo || [];
        const fotosReparoList = (Array.isArray(fotosReparoRaw) ? fotosReparoRaw : [])
          .filter(Boolean)
          .map((url, idx) => ({ label: `Foto do Reparo #${idx + 1}`, url, tipo: 'reparo' }));

        // Unificar todas as fotos e remover duplicatas de URL
        const mapUrls = new Map();
        [...fotosGeraisList, ...fotosDefeitosList, ...fotosReparoList].forEach(item => {
          if (item && item.url && !mapUrls.has(item.url)) {
            mapUrls.set(item.url, item);
          }
        });
        const todasEvidencias = Array.from(mapUrls.values());

        return (
          <div className="fixed inset-0 z-[80] flex justify-center items-end sm:items-center bg-slate-950/70 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-300">
            <div className="bg-white dark:bg-slate-900 w-full sm:max-w-lg rounded-t-[2.5rem] sm:rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col max-h-[90vh] border border-slate-200 dark:border-slate-800 animate-in slide-in-from-bottom-8">
              {/* Header */}
              <div className="p-6 bg-slate-900 dark:bg-slate-950 flex justify-between items-center sticky top-0 z-10 border-b border-slate-800">
                <div>
                  <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest block mb-1">Detalhes do Chamado</span>
                  <h3 className="text-3xl font-black text-white tracking-tight">{detailChamado.placa}</h3>
                  <p className="text-xs text-slate-400 font-bold mt-0.5">{vec.marca || '--'} • {vec.subTipo || vec.tipo || '--'}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {solicitarChamado && (
                    <button
                      type="button"
                      onClick={() => setDetailChamado(null)}
                      className="px-3.5 py-2 rounded-2xl text-xs font-black transition-all flex items-center gap-1.5 shadow-xs cursor-pointer bg-emerald-600 hover:bg-emerald-700 text-white border border-emerald-400/30"
                    >
                      ← Voltar à Validação
                    </button>
                  )}
                  <button onClick={() => setDetailChamado(null)} className="p-2.5 bg-white/10 rounded-full text-white hover:bg-rose-500 transition-colors"><X size={22}/></button>
                </div>
              </div>
              
              <div className="p-6 overflow-y-auto space-y-6 flex-1 custom-scrollbar">

                {/* Banner de retorno quando aberto a partir da Validação */}
                {solicitarChamado && (
                  <div className="bg-emerald-50 dark:bg-emerald-950/60 p-4 rounded-2xl border border-emerald-200 dark:border-emerald-800/70 flex items-center justify-between gap-3 shadow-xs">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="p-2 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 shrink-0">
                        <FileText size={16} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-black text-emerald-950 dark:text-emerald-200">Consultando Detalhes da OS</p>
                        <p className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium">Sua validação de manutenção continua aberta em segundo plano.</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setDetailChamado(null)}
                      className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shrink-0 transition-all flex items-center gap-1 cursor-pointer shadow-sm"
                    >
                      ← Retornar
                    </button>
                  </div>
                )}
                
                {/* Informações Gerais do Chamado */}
                <div className="space-y-3">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <FileText size={16}/> Informações do Chamado
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-2xl border border-slate-200 dark:border-slate-800">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Código</p>
                      <p className="text-sm font-black text-slate-800 dark:text-slate-200 mt-0.5">{detailChamado.codigoChamado || detailChamado.numero || '--'}</p>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-2xl border border-slate-200 dark:border-slate-800">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Status</p>
                      <p className="text-sm font-black text-slate-800 dark:text-slate-200 mt-0.5">{detailChamado.situacaoVeiculo || detailChamado.status || '--'}</p>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-2xl border border-slate-200 dark:border-slate-800">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Etapa</p>
                      <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">{detailChamado.etapaWorkflow || '--'}</p>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-2xl border border-slate-200 dark:border-slate-800">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Data Abertura</p>
                      <p className="text-sm font-black text-slate-800 dark:text-slate-200 mt-0.5">{detailChamado.dataAbertura ? new Date(detailChamado.dataAbertura).toLocaleDateString('pt-BR') : '--'}</p>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-2xl border border-slate-200 dark:border-slate-800">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Hodômetro</p>
                      <p className="text-sm font-black text-slate-800 dark:text-slate-200 font-mono mt-0.5">{detailChamado.hodometro || detailChamado.dadosWorkflow?.hodometro ? `${Number(detailChamado.hodometro || detailChamado.dadosWorkflow?.hodometro).toLocaleString('pt-BR')} km` : '--'}</p>
                    </div>
                    {detailChamado.motorista && (
                      <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 col-span-2">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Motorista</p>
                        <p className="text-sm font-black text-slate-800 dark:text-slate-200 mt-0.5">{detailChamado.motorista}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Evidências Fotográficas do Chamado (Fotos Gerais e dos Defeitos) */}
                {todasEvidencias.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <Camera size={16} className="text-emerald-500"/> Evidências Fotográficas ({todasEvidencias.length})
                      </h4>
                      <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800/60">
                        Toque para ampliar
                      </span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {todasEvidencias.map((item, idx) => (
                        <div 
                          key={idx} 
                          onClick={() => setSelectedImagePreview({ url: item.url, label: item.label })}
                          className="relative aspect-square rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm group cursor-pointer bg-slate-900"
                        >
                          <img 
                            src={item.url} 
                            alt={item.label} 
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-90 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2">
                            <div className="flex justify-end">
                              <div className="p-1 bg-black/40 backdrop-blur-xs rounded-lg text-white/90">
                                <ZoomIn size={12}/>
                              </div>
                            </div>
                            <p className="text-[9px] font-black text-white uppercase tracking-wider line-clamp-1">
                              {item.label}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Defeitos Reportados */}
                <div className="space-y-4">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <AlertCircle size={16}/> Defeitos Reportados {totalDef > 0 && <span className="bg-slate-800 text-white px-2 py-0.5 rounded-lg text-[9px]">{resolvedDef}/{totalDef}</span>}
                  </h4>
                  {totalDef > 0 ? (
                    <div className="space-y-3">
                      {defeitos.map((d, i) => {
                        const fotoDef = d.fotoDefeito || d.foto || d.fotoUrl || (Array.isArray(d.fotos) && d.fotos[0]);
                        return (
                          <div key={d.id || i} className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-[1.5rem] space-y-3">
                            <div className="flex justify-between items-start">
                              <p className="text-sm font-bold text-slate-800 dark:text-slate-200 flex-1">{d.descricao || 'Sem descrição'}</p>
                              <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider shrink-0 ml-2 ${d.status === 'RESOLVIDO' ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300' : 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'}`}>
                                {d.status || 'Pendente'}
                              </span>
                            </div>

                            {/* Foto específica deste defeito se houver */}
                            {fotoDef && (
                              <div 
                                onClick={() => setSelectedImagePreview({ url: fotoDef, label: `Foto do Defeito: ${d.categoria || d.descricao || '#' + (i + 1)}` })}
                                className="relative rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-900 group cursor-pointer aspect-video max-h-36 flex items-center justify-center shadow-xs"
                              >
                                <img src={fotoDef} alt="Foto do defeito" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end justify-between p-2.5 opacity-90 group-hover:opacity-100 transition-opacity">
                                  <span className="text-[9px] font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                                    <Camera size={12} className="text-emerald-400"/> Foto do Defeito
                                  </span>
                                  <span className="text-[9px] font-bold text-white/90 bg-white/20 backdrop-blur-xs px-2 py-0.5 rounded-lg flex items-center gap-1">
                                    <ZoomIn size={11}/> Ampliar
                                  </span>
                                </div>
                              </div>
                            )}

                            <div className="flex gap-2 flex-wrap items-center justify-between">
                              <div className="flex gap-2 flex-wrap">
                                {d.categoria && (
                                  <span className="text-[10px] font-black bg-white dark:bg-slate-800 px-2.5 py-1 rounded-lg shadow-xs text-slate-500 dark:text-slate-300 uppercase tracking-wider">{d.categoria}</span>
                                )}
                                {d.dataResolucao && (
                                  <span className="text-[10px] font-black bg-emerald-50 text-emerald-600 px-2.5 py-1 rounded-lg border border-emerald-200">
                                    Resolvido em: {new Date(d.dataResolucao).toLocaleDateString('pt-BR')}
                                  </span>
                                )}
                              </div>
                              {fotoDef && (
                                <button
                                  type="button"
                                  onClick={() => setSelectedImagePreview({ url: fotoDef, label: `Foto do Defeito: ${d.categoria || d.descricao || '#' + (i + 1)}` })}
                                  className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
                                >
                                  <Eye size={12}/> Ver Foto
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic">Nenhum defeito reportado.</p>
                  )}
                </div>

                {/* Adicionar Comentário */}
                <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-800">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <MessageSquare size={16}/> Adicionar Comentário na OS
                  </h4>
                  <textarea 
                    value={novoComentario}
                    onChange={e => setNovoComentario(e.target.value)}
                    placeholder="Escreva uma observação técnica, aviso ou andamento do veículo..."
                    className="w-full p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-[1.5rem] font-medium text-slate-700 dark:text-slate-200 outline-none focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 min-h-[90px] resize-none text-xs"
                  />
                  <button
                    type="button"
                    onClick={handleAddComment}
                    disabled={!novoComentario.trim()}
                    className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-black transition-all shadow-md shadow-emerald-500/20"
                  >
                    Registrar Comentário
                  </button>
                </div>

                {/* Histórico */}
                {historico.length > 0 && (
                  <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-800">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <History size={16}/> Linha do Tempo / Histórico
                    </h4>
                    <div className="space-y-3">
                      {historico.map((h, i) => (
                        <div key={h.id || i} className="flex gap-3 text-sm">
                          <div className="flex flex-col items-center">
                            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 shrink-0 mt-1.5" />
                            {i < historico.length - 1 && <div className="w-px flex-1 bg-slate-200 dark:bg-slate-800 mt-1" />}
                          </div>
                          <div className="pb-4">
                            <p className="font-bold text-slate-700 dark:text-slate-300 text-xs">{formatarTextoLog(h.descricao)}</p>
                            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase mt-1 tracking-wider">
                              {h.usuario} • {new Date(h.dataHora).toLocaleDateString('pt-BR')} {new Date(h.dataHora).toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'})}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Botão de Retorno no rodapé para quando aberto a partir da Validação */}
                {solicitarChamado && (
                  <button
                    type="button"
                    onClick={() => setDetailChamado(null)}
                    className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-black transition-all flex items-center justify-center gap-2 shadow-lg cursor-pointer mt-4"
                  >
                    ← Voltar para Validação de Manutenção ({solicitarChamado.placa})
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── MODAL DE PREVIEW DE IMAGEM ── */}
      {selectedImagePreview && (
        <div className="fixed inset-0 z-[100] flex justify-center items-center bg-slate-950/90 backdrop-blur-md p-4 animate-in fade-in duration-300" onClick={() => setSelectedImagePreview(null)}>
          <div className="relative max-w-4xl w-full max-h-[90vh] flex flex-col items-center justify-center">
            <button 
              onClick={(e) => { e.stopPropagation(); setSelectedImagePreview(null); }} 
              className="absolute -top-12 right-0 p-2 bg-white/10 hover:bg-rose-500 rounded-full text-white transition-colors"
            >
              <X size={24}/>
            </button>
            <img 
              src={selectedImagePreview.url} 
              alt={selectedImagePreview.label} 
              className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl border border-white/10"
              onClick={(e) => e.stopPropagation()} 
            />
            {selectedImagePreview.label && (
              <p className="text-white text-xs font-black uppercase tracking-wider mt-3 bg-black/60 px-4 py-1.5 rounded-full">
                {selectedImagePreview.label}
              </p>
            )}
          </div>
        </div>
      )}

      {/* ── MODAL ULTRA-PREMIUM DE CONFIRMAÇÃO DE LOGOUT ── */}
      <ModalConfirmacaoLogout
        isOpen={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        onConfirm={handleConfirmSystemLogout}
        currentUser={currentUser}
      />

    </div>
  );
}