import React, { useState, useEffect, useMemo } from 'react';
import { 
  Droplets, BookOpen, AlertTriangle, Flame, CheckCircle2, Search, Filter, 
  RefreshCcw, Eye, Wrench, Plus, Car, Gauge, Calendar, User, 
  ExternalLink, ArrowUpRight, Check, X, ShieldAlert, Sparkles, Loader2, Trash2,
  ChevronRight, Activity
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import GuiaMedicaoVaretaOleo from './GuiaMedicaoVaretaOleo';

const getWorkflowEtapaInfo = (c) => {
  if (!c) {
    return {
      label: 'Análise Frota',
      stepNumber: 1,
      totalSteps: 3,
      badgeClass: 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-900/60'
    };
  }

  let etapa = c.etapaWorkflow || 'Análise Frota';
  if (etapa === 'Aguardando Manutenção' || !etapa) etapa = 'Análise Frota';

  const statusGeral = (c.status || 'ABERTO').toUpperCase();
  if (statusGeral === 'RESOLVIDO' || etapa === 'RESOLVIDO') {
    return {
      label: 'Resolvido / Concluído',
      stepNumber: 3,
      totalSteps: 3,
      badgeClass: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
    };
  }

  if (etapa.includes('Liberado Operação')) {
    return {
      label: 'Liberado Operação',
      stepNumber: 3,
      totalSteps: 3,
      badgeClass: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
    };
  }

  if (etapa.includes('Oficina') || etapa.includes('Desequipado')) {
    const sub = c.dadosWorkflow?.subFluxoOficina?.status || c.sub_fluxo_status;
    const subLabel = sub ? ` (${sub})` : '';
    return {
      label: `${etapa}${subLabel}`,
      stepNumber: 2,
      totalSteps: 3,
      badgeClass: 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800'
    };
  }

  if (etapa.includes('Desequipar') || etapa.includes('Aguardando Validação')) {
    return {
      label: etapa,
      stepNumber: 2,
      totalSteps: 3,
      badgeClass: 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-900/60'
    };
  }

  // Padrão: Análise Frota
  return {
    label: 'Análise Frota',
    stepNumber: 1,
    totalSteps: 3,
    badgeClass: 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-900/60'
  };
};

export default function NivelOleoView({
  chamados = [],
  vehicles = [],
  hoje,
  currentUser,
  userPermissions,
  onEditar,
  onAbrirModalNovoOleo,
  onSubmitChamado,
  onPreviewImage
}) {
  const [registros, setRegistros] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filtroNivel, setFiltroNivel] = useState('ALL');
  const [showGuiaModal, setShowGuiaModal] = useState(false); // 'ALL' | '1' | '2' | '3'
  const [filtroStatus, setFiltroStatus] = useState('ALL'); // 'ALL' | 'PENDENTE' | 'CHAMADO_ABERTO'
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal de Confirmação de Abertura Automática
  const [registroParaAbertura, setRegistroParaAbertura] = useState(null);
  const [processandoAbertura, setProcessandoAbertura] = useState(false);
  const [feedbackSucesso, setFeedbackSucesso] = useState(null);

  // Modal de Exclusão (Somente Administrador e Gerente)
  const [registroParaExcluir, setRegistroParaExcluir] = useState(null);
  const [processandoExclusao, setProcessandoExclusao] = useState(false);

  // Identificar se o usuário atual é Administrador ou Gerente
  const podeExcluir = useMemo(() => {
    const perfil = (currentUser?.perfil || currentUser?.role || currentUser?.tipo || '').toUpperCase().trim();
    return perfil === 'ADMINISTRADOR' || perfil === 'GERENTE' || perfil === 'ADMIN' || currentUser?.isAdmin === true;
  }, [currentUser]);

  // Mapa de veículos para dados complementares
  const vehiclesMap = useMemo(() => new Map((vehicles || []).map(v => [v.placa, v])), [vehicles]);
  const chamadosMap = useMemo(() => new Map((chamados || []).map(c => [c.id, c])), [chamados]);

  // Carregar registros de óleo do Supabase
  const carregarRegistros = async (isManualRefresh = false, isSilent = false) => {
    try {
      if (isManualRefresh) setRefreshing(true);
      else if (!isSilent) setLoading(true);

      const { data, error } = await supabase
        .from('registros_nivel_oleo')
        .select('*')
        .order('data_registro', { ascending: false });

      if (error) {
        console.error('Erro ao buscar registros de nível de óleo:', error);
      } else {
        setRegistros(data || []);
      }
    } catch (err) {
      console.error('Falha inesperada ao carregar registros de óleo:', err);
    } finally {
      if (!isSilent) setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    carregarRegistros();

    // 1. Inscrição WebSocket Real-Time do Supabase
    const channelName = `realtime_oleo_${Date.now()}_${Math.random()}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes', 
        { event: '*', schema: 'public', table: 'registros_nivel_oleo' }, 
        (payload) => {
          if (payload.eventType === 'INSERT' && payload.new) {
            setRegistros(prev => [payload.new, ...prev.filter(r => r.id !== payload.new.id)]);
          } else if (payload.eventType === 'UPDATE' && payload.new) {
            setRegistros(prev => prev.map(r => r.id === payload.new.id ? payload.new : r));
          } else if (payload.eventType === 'DELETE' && payload.old) {
            setRegistros(prev => prev.filter(r => r.id !== payload.old.id));
          } else {
            carregarRegistros(false, true);
          }
        }
      )
      .subscribe();

    // 2. Listener local para atualização instantânea (0ms de latência)
    const handleLocalNovoRegistro = (e) => {
      if (e.detail) {
        setRegistros(prev => [e.detail, ...prev.filter(r => r.id !== e.detail.id)]);
      }
    };
    window.addEventListener('fleet_novo_registro_oleo', handleLocalNovoRegistro);

    // 3. Heartbeat silencioso a cada 5 segundos para garantir sincronia mesmo se WebSocket oscilar
    const interval = setInterval(() => {
      carregarRegistros(false, true);
    }, 5000);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('fleet_novo_registro_oleo', handleLocalNovoRegistro);
      clearInterval(interval);
    };
  }, []);

  // Exclusão de Registro de Óleo (Somente Administrador e Gerente)
  const handleConfirmarExclusao = async () => {
    if (!registroParaExcluir) return;

    try {
      setProcessandoExclusao(true);
      const regId = registroParaExcluir.id;

      const { error } = await supabase
        .from('registros_nivel_oleo')
        .delete()
        .eq('id', regId);

      if (error) {
        throw error;
      }

      setRegistros(prev => prev.filter(r => r.id !== regId));
      setRegistroParaExcluir(null);
    } catch (err) {
      console.error('Erro ao excluir registro de óleo:', err);
      alert(`Não foi possível excluir o registro: ${err.message || 'Erro de permissão'}`);
    } finally {
      setProcessandoExclusao(false);
    }
  };

  // Métricas e KPIs
  const stats = useMemo(() => {
    const total = registros.length;
    const normal = registros.filter(r => r.nivel_oleo === 1).length;
    const baixo = registros.filter(r => r.nivel_oleo === 2).length;
    const semOleo = registros.filter(r => r.nivel_oleo === 3).length;
    const chamadosAbertos = registros.filter(r => r.status === 'CHAMADO_ABERTO').length;
    const pendentesAbertura = registros.filter(r => (r.nivel_oleo === 2 || r.nivel_oleo === 3) && r.status !== 'CHAMADO_ABERTO').length;

    return { total, normal, baixo, semOleo, chamadosAbertos, pendentesAbertura };
  }, [registros]);

  // Filtragem
  const registrosFiltrados = useMemo(() => {
    return registros.filter(r => {
      // Filtro de Nível
      if (filtroNivel !== 'ALL' && String(r.nivel_oleo) !== String(filtroNivel)) return false;

      // Filtro de Status
      if (filtroStatus === 'PENDENTE' && r.status === 'CHAMADO_ABERTO') return false;
      if (filtroStatus === 'CHAMADO_ABERTO' && r.status !== 'CHAMADO_ABERTO') return false;

      // Busca por Texto
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const placaMatch = (r.placa || '').toLowerCase().includes(q);
        const userMatch = (r.criado_por || '').toLowerCase().includes(q);
        const regMatch = (r.regional || '').toLowerCase().includes(q);
        const codMatch = (r.codigo_registro || '').toLowerCase().includes(q);
        if (!placaMatch && !userMatch && !regMatch && !codMatch) return false;
      }

      return true;
    });
  }, [registros, filtroNivel, filtroStatus, searchQuery]);

  // Identificar se o veículo já possui chamado aberto no sistema
  const getChamadoAbertoExistente = (placa) => {
    if (!placa) return null;
    return (chamados || []).find(c => 
      (c.placa || '').trim().toUpperCase() === placa.trim().toUpperCase() && 
      c.status !== 'RESOLVIDO'
    ) || null;
  };

  // Disparo da Abertura Automática do Chamado
  const handleConfirmarAbertura = async (anexarAoExistente = false) => {
    if (!registroParaAbertura) return;

    try {
      setProcessandoAbertura(true);
      const reg = registroParaAbertura;
      const chamadoExistente = getChamadoAbertoExistente(reg.placa);
      const operadorNome = currentUser?.nome || currentUser?.name || 'Operador da Frota';
      const dataHoraAberturaIso = (hoje || new Date()).toISOString();

      const rotuloNivel = reg.nivel_oleo === 3 ? 'Sem Óleo' : reg.nivel_oleo === 2 ? 'Baixo' : 'Normal';
      const descricaoDefeito = `Troca de Oleo - ${rotuloNivel}`;

      let chamadoCriadoOuAtualizadoId = null;
      let chamadoCriadoOuAtualizadoCodigo = null;

      if (anexarAoExistente && chamadoExistente) {
        // Opção: Anexar defeito ao chamado já existente
        const novoDefeito = {
          id: Date.now(),
          descricao: descricaoDefeito,
          categoria: 'Mecânico',
          numeroSolicitacao: 'SOL-000000',
          isImpeditivo: true,
          status: 'PENDENTE',
          fotoDefeito: reg.foto_haste_url || null
        };

        let baseChamado = chamadoExistente;
        try {
          const { data: dbChamado } = await supabase
            .from('chamados')
            .select('*')
            .eq('id', chamadoExistente.id)
            .maybeSingle();
          if (dbChamado) baseChamado = dbChamado;
        } catch (e) {
          console.warn('Aviso ao consultar chamado completo no banco:', e);
        }

        const defeitosAtualizados = [...(baseChamado.defeitos || []), novoDefeito];
        const logAnexo = `[Óleo do Motor] Defeito anexado automaticamente por ${operadorNome}: ${descricaoDefeito}. Hodômetro: ${reg.hodometro?.toLocaleString('pt-BR')} km. Ref: ${reg.codigo_registro}`;
        
        const chamadoAtualizado = {
          ...baseChamado,
          defeitos: defeitosAtualizados,
          historicoModificacoes: [
            { id: Date.now(), dataHora: dataHoraAberturaIso, usuario: operadorNome, descricao: logAnexo },
            ...(baseChamado.historicoModificacoes || [])
          ]
        };

        let resAtualizado = null;
        if (onSubmitChamado) {
          resAtualizado = await onSubmitChamado(chamadoAtualizado);
        } else {
          await supabase.from('chamados').upsert(chamadoAtualizado);
        }

        chamadoCriadoOuAtualizadoId = (resAtualizado && resAtualizado.id) || chamadoExistente.id;
        chamadoCriadoOuAtualizadoCodigo = (resAtualizado && resAtualizado.codigoChamado) || chamadoExistente.codigoChamado || ('ALP.M-' + String(chamadoExistente.id).slice(-6));
      } else {
        // Opção: Criar Novo Chamado Formal do Zero
        const novoChamadoId = Date.now();
        const novoChamadoCodigo = 'ALP.M-' + String(novoChamadoId).slice(-6);

        const dadosNovoChamado = {
          id: novoChamadoId,
          codigoChamado: novoChamadoCodigo,
          placa: reg.placa.toUpperCase().trim(),
          situacaoVeiculo: 'Rodando (Operacional)',
          hodometro: reg.hodometro,
          dataAbertura: dataHoraAberturaIso,
          regional: reg.regional || 'Norte',
          status: 'ABERTO',
          etapaWorkflow: 'Análise Frota',
          numero: 'SOL-000000',
          defeitoPrincipal: 'Mecânico',
          defeitoEncontrado: descricaoDefeito,
          naoImpeditivo: false,
          forcarNovoChamadoSeparado: true, // Avisa handleSalvarChamado para não forçar o anexo
          defeitos: [
            {
              id: Date.now(),
              descricao: descricaoDefeito,
              categoria: 'Mecânico',
              numeroSolicitacao: 'SOL-000000',
              isImpeditivo: true,
              status: 'PENDENTE',
              fotoDefeito: reg.foto_haste_url || null
            }
          ],
          fotosChamado: {
            fotoVeiculo: reg.foto_frente_url || null,
            fotoHodometro: reg.foto_hodometro_url || null,
            fotoAdicional: reg.foto_haste_url || null
          },
          dadosWorkflow: {
            criadoPor: operadorNome,
            origemRegistroOleo: reg.codigo_registro,
            fotosChamado: {
              fotoVeiculo: reg.foto_frente_url || null,
              fotoHodometro: reg.foto_hodometro_url || null,
              fotoAdicional: reg.foto_haste_url || null
            },
            timestamps: {
              'Análise Frota': dataHoraAberturaIso
            }
          },
          historicoModificacoes: [
            {
              id: Date.now(),
              dataHora: dataHoraAberturaIso,
              usuario: operadorNome,
              descricao: `Chamado de Troca de Óleo aberto automaticamente por ${operadorNome} a partir do registro de nível de óleo (${reg.codigo_registro}). Placa: ${reg.placa} | Nível: ${rotuloNivel} | KM: ${reg.hodometro?.toLocaleString('pt-BR')} km.`
            }
          ]
        };

        let resCriado = null;
        if (onSubmitChamado) {
          resCriado = await onSubmitChamado(dadosNovoChamado);
        } else {
          const { forcarNovoChamadoSeparado: _f, ...dadosLimpos } = dadosNovoChamado;
          await supabase.from('chamados').insert([dadosLimpos]);
        }

        chamadoCriadoOuAtualizadoId = (resCriado && resCriado.id) || novoChamadoId;
        chamadoCriadoOuAtualizadoCodigo = (resCriado && resCriado.codigoChamado) || novoChamadoCodigo;
      }

      // Atualiza o registro em `registros_nivel_oleo`
      const { error: regUpdateErr } = await supabase
        .from('registros_nivel_oleo')
        .update({
          status: 'CHAMADO_ABERTO',
          chamado_id: chamadoCriadoOuAtualizadoId,
          chamado_codigo: chamadoCriadoOuAtualizadoCodigo,
          data_hora_chamado_aberto: dataHoraAberturaIso,
          aberto_por_operador: operadorNome
        })
        .eq('id', reg.id);

      if (regUpdateErr) {
        console.warn('Aviso ao atualizar status do registro de óleo:', regUpdateErr);
      }

      // Atualiza a lista local
      setRegistros(prev => prev.map(r => r.id === reg.id ? {
        ...r,
        status: 'CHAMADO_ABERTO',
        chamado_id: chamadoCriadoOuAtualizadoId,
        chamado_codigo: chamadoCriadoOuAtualizadoCodigo,
        data_hora_chamado_aberto: dataHoraAberturaIso,
        aberto_por_operador: operadorNome
      } : r));

      setFeedbackSucesso({
        codigoChamado: chamadoCriadoOuAtualizadoCodigo,
        placa: reg.placa,
        acao: anexarAoExistente ? 'anexado' : 'aberto'
      });

      setRegistroParaAbertura(null);
    } catch (err) {
      console.error('Erro na abertura automática do chamado:', err);
      alert(`Falha ao abrir chamado automático: ${err.message || 'Erro desconhecido'}`);
    } finally {
      setProcessandoAbertura(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* 1. CARDS DE RESUMO E KPIS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {/* Total de Registros */}
        <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-2xl border border-slate-200/90 dark:border-slate-800 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase text-slate-400">Total Aferições</span>
            <Droplets size={16} className="text-slate-400" />
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-2">
            {stats.total}
          </p>
          <span className="text-[10px] text-slate-500 font-medium">Registradas no sistema</span>
        </div>

        {/* Nível Normal */}
        <div 
          onClick={() => setFiltroNivel(filtroNivel === '1' ? 'ALL' : '1')}
          className={`cursor-pointer transition-all rounded-2xl border p-4 shadow-sm active:scale-95 ${
            filtroNivel === '1' 
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-400 ring-2 ring-emerald-200 dark:ring-emerald-800' 
              : 'bg-white/90 dark:bg-slate-900/90 border-slate-200/90 dark:border-slate-800 hover:border-emerald-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase text-emerald-600 dark:text-emerald-400">1. Normal</span>
            <CheckCircle2 size={16} className="text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-2">
            {stats.normal}
          </p>
          <span className="text-[10px] text-emerald-700/70 dark:text-emerald-400/70 font-medium">Dentro do recomendado</span>
        </div>

        {/* Nível Baixo (Âmbar) */}
        <div 
          onClick={() => setFiltroNivel(filtroNivel === '2' ? 'ALL' : '2')}
          className={`cursor-pointer transition-all rounded-2xl border p-4 shadow-sm active:scale-95 ${
            filtroNivel === '2' 
              ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-400 ring-2 ring-amber-200 dark:ring-amber-800' 
              : 'bg-white/90 dark:bg-slate-900/90 border-slate-200/90 dark:border-slate-800 hover:border-amber-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase text-amber-600 dark:text-amber-400">2. Baixo</span>
            <AlertTriangle size={16} className="text-amber-500" />
          </div>
          <p className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-2">
            {stats.baixo}
          </p>
          <span className="text-[10px] text-amber-700/70 dark:text-amber-400/70 font-medium">Requer complemento</span>
        </div>

        {/* Sem Óleo (Vermelho Crítico) */}
        <div 
          onClick={() => setFiltroNivel(filtroNivel === '3' ? 'ALL' : '3')}
          className={`cursor-pointer transition-all rounded-2xl border p-4 shadow-sm active:scale-95 ${
            filtroNivel === '3' 
              ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-500 ring-2 ring-rose-200 dark:ring-rose-800' 
              : 'bg-white/90 dark:bg-slate-900/90 border-slate-200/90 dark:border-slate-800 hover:border-rose-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase text-rose-600 dark:text-rose-400">3. Sem Óleo</span>
            <Flame size={16} className="text-rose-600 animate-pulse" />
          </div>
          <p className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-2">
            {stats.semOleo}
          </p>
          <span className="text-[10px] text-rose-700/70 dark:text-rose-400/70 font-medium">Crítico / Não rodar</span>
        </div>

        {/* Pendentes de Tratativa */}
        <div 
          onClick={() => setFiltroStatus(filtroStatus === 'PENDENTE' ? 'ALL' : 'PENDENTE')}
          className={`cursor-pointer transition-all rounded-2xl border p-4 shadow-sm active:scale-95 ${
            filtroStatus === 'PENDENTE' 
              ? 'bg-orange-50 dark:bg-orange-950/40 border-orange-400 ring-2 ring-orange-200' 
              : 'bg-white/90 dark:bg-slate-900/90 border-slate-200/90 dark:border-slate-800 hover:border-orange-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase text-orange-600 dark:text-orange-400">Aguardando OS</span>
            <ShieldAlert size={16} className="text-orange-500" />
          </div>
          <p className="text-2xl font-black text-orange-600 dark:text-orange-400 mt-2">
            {stats.pendentesAbertura}
          </p>
          <span className="text-[10px] text-orange-700/70 dark:text-orange-400/70 font-medium">Baixo / Sem Óleo s/ chamado</span>
        </div>

        {/* Chamados Abertos */}
        <div 
          onClick={() => setFiltroStatus(filtroStatus === 'CHAMADO_ABERTO' ? 'ALL' : 'CHAMADO_ABERTO')}
          className={`cursor-pointer transition-all rounded-2xl border p-4 shadow-sm active:scale-95 ${
            filtroStatus === 'CHAMADO_ABERTO' 
              ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-400 ring-2 ring-blue-200' 
              : 'bg-white/90 dark:bg-slate-900/90 border-slate-200/90 dark:border-slate-800 hover:border-blue-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase text-blue-600 dark:text-blue-400">OS Geradas</span>
            <Wrench size={16} className="text-blue-600" />
          </div>
          <p className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-2">
            {stats.chamadosAbertos}
          </p>
          <span className="text-[10px] text-blue-700/70 dark:text-blue-400/70 font-medium">Convertidos em chamado</span>
        </div>
      </div>

      {/* FEEDBACK DE SUCESSO DE ABERTURA */}
      {feedbackSucesso && (
        <div className="p-4 rounded-2xl bg-emerald-500 text-white shadow-lg flex items-center justify-between animate-in slide-in-from-top-2 duration-300">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <CheckCircle2 size={24} />
            </div>
            <div>
              <h5 className="font-black text-sm">
                Chamado E-CAR #{feedbackSucesso.codigoChamado} {feedbackSucesso.acao === 'anexado' ? 'Anexado com Sucesso!' : 'Aberto com Sucesso!'}
              </h5>
              <p className="text-xs text-white/90 font-medium">
                Veículo {feedbackSucesso.placa} | As fotos e o hodômetro foram integrados automaticamente à ordem de serviço.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setFeedbackSucesso(null)}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* 2. BARRA DE CONTROLES, BUSCA E FILTROS */}
      <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-200/90 dark:border-slate-800 p-4 flex flex-col md:flex-row items-center justify-between gap-3 shadow-sm">
        {/* Campo de Busca */}
        <div className="relative w-full md:w-80">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por placa, regional, usuário..."
            className="w-full bg-slate-100 dark:bg-slate-800 border-none rounded-xl pl-9 pr-4 py-2.5 text-xs font-bold text-slate-800 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Filtros em Pílulas */}
        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          {/* Seletor Nível */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-bold">
            <button
              onClick={() => setFiltroNivel('ALL')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                filtroNivel === 'ALL' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500'
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => setFiltroNivel('1')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 ${
                filtroNivel === '1' ? 'bg-emerald-600 text-white shadow-sm' : 'text-emerald-600 dark:text-emerald-400'
              }`}
            >
              Normal
            </button>
            <button
              onClick={() => setFiltroNivel('2')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 ${
                filtroNivel === '2' ? 'bg-amber-500 text-white shadow-sm' : 'text-amber-600 dark:text-amber-400'
              }`}
            >
              Baixo
            </button>
            <button
              onClick={() => setFiltroNivel('3')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 ${
                filtroNivel === '3' ? 'bg-rose-600 text-white shadow-sm' : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              Sem Óleo
            </button>
          </div>

          {/* Botão Atualizar */}
          <button
            onClick={() => carregarRegistros(true)}
            disabled={refreshing}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
            title="Recarregar registros"
          >
            <RefreshCcw size={15} className={refreshing ? 'animate-spin text-emerald-600' : ''} />
          </button>

          {/* Botão + Nova Aferição */}
          
          {/* Botão Guia da Vareta */}
          <button
            onClick={() => setShowGuiaModal(true)}
            className="px-3.5 py-2.5 rounded-xl border border-amber-300 dark:border-amber-800/80 bg-amber-50/80 dark:bg-amber-950/40 hover:bg-amber-100 text-amber-800 dark:text-amber-300 font-black text-xs flex items-center gap-1.5 transition-all active:scale-95 shadow-sm"
            title="Ver Ilustração e Instruções do Manual da Vareta de Óleo"
          >
            <BookOpen size={15} className="text-amber-500" />
            <span className="hidden sm:inline">Guia da Vareta</span>
          </button>

          {onAbrirModalNovoOleo && (
            <button
              onClick={onAbrirModalNovoOleo}
              className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-black text-xs flex items-center gap-1.5 transition-all shadow-md shadow-amber-500/20 active:scale-95 whitespace-nowrap"
            >
              <Plus size={16} />
              <span>Nova Aferição</span>
            </button>
          )}
        </div>
      </div>

      {/* 3. LISTA / GRID DE REGISTROS DE NÍVEL DE ÓLEO */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center text-slate-400">
          <Loader2 size={32} className="animate-spin text-emerald-600 mb-3" />
          <span className="text-xs font-bold">Carregando registros de nível de óleo...</span>
        </div>
      ) : registrosFiltrados.length === 0 ? (
        <div className="py-16 bg-white/60 dark:bg-slate-900/60 rounded-3xl border border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center text-center p-6">
          <div className="w-16 h-16 rounded-2xl bg-amber-100 dark:bg-amber-950/50 text-amber-600 flex items-center justify-center mb-3">
            <Droplets size={28} />
          </div>
          <h4 className="text-base font-black text-slate-800 dark:text-white">
            Nenhum registro de óleo encontrado
          </h4>
          <p className="text-xs text-slate-500 max-w-sm mt-1">
            {searchQuery || filtroNivel !== 'ALL' || filtroStatus !== 'ALL'
              ? 'Tente ajustar os filtros ou termo de busca acima.'
              : 'Clique em "Nova Aferição" para registrar a medição de óleo de um veículo.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3.5">
          {registrosFiltrados.map((reg) => {
            const vInfo = vehiclesMap.get(reg.placa);
            const chamadoAbertoExistente = getChamadoAbertoExistente(reg.placa);
            const chamadoVinculado = (chamados || []).find(c => 
              (reg.chamado_id && (c.id === reg.chamado_id || String(c.id) === String(reg.chamado_id))) || 
              (reg.chamado_codigo && (c.codigoChamado === reg.chamado_codigo || c.numero === reg.chamado_codigo)) ||
              (c.dadosWorkflow?.origemRegistroOleo === reg.codigo_registro)
            );
            const isChamadoGerado = reg.status === 'CHAMADO_ABERTO' || !!reg.chamado_id || !!chamadoVinculado;
            const dataFmt = new Date(reg.data_registro).toLocaleString('pt-BR', {
              day: '2-digit', month: '2-digit', year: 'numeric',
              hour: '2-digit', minute: '2-digit'
            });

            // Estilização baseada na criticidade
            // 2 = Âmbar, 3 = Vermelho, 1 = Normal/Verde
            const isNivel3 = reg.nivel_oleo === 3;
            const isNivel2 = reg.nivel_oleo === 2;

            return (
              <div
                key={reg.id || reg.codigo_registro}
                className={`rounded-3xl border-2 p-5 transition-all shadow-sm hover:shadow-md ${
                  isNivel3
                    ? 'border-rose-400/90 bg-rose-50/60 dark:bg-rose-950/25 ring-1 ring-rose-200 dark:ring-rose-900/60'
                    : isNivel2
                      ? 'border-amber-400/90 bg-amber-50/50 dark:bg-amber-950/20 ring-1 ring-amber-200 dark:ring-amber-900/60'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
                }`}
              >
                <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                  {/* Bloco 1: Identificação do Veículo & Nível */}
                  <div className="flex items-start gap-4 min-w-[280px]">
                    {/* Badge / Ícone do Nível */}
                    <div className={`w-14 h-14 rounded-2xl flex flex-col items-center justify-center shrink-0 shadow-sm ${
                      isNivel3
                        ? 'bg-rose-600 text-white shadow-rose-600/30'
                        : isNivel2
                          ? 'bg-amber-500 text-white shadow-amber-500/30'
                          : 'bg-emerald-600 text-white shadow-emerald-600/30'
                    }`}>
                      {isNivel3 ? (
                        <Flame size={22} className="animate-pulse" />
                      ) : isNivel2 ? (
                        <AlertTriangle size={22} />
                      ) : (
                        <CheckCircle2 size={22} />
                      )}
                      <span className="text-[9px] font-black uppercase tracking-tight mt-0.5">
                        {reg.nivel_oleo_rotulo || (isNivel3 ? 'Sem Óleo' : isNivel2 ? 'Baixo' : 'Normal')}
                      </span>
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
                          {reg.placa}
                        </span>
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                          {reg.regional || vInfo?.regional || 'Regional'}
                        </span>
                        {reg.codigo_registro && (
                          <span className="text-[10px] font-mono font-bold text-slate-400">
                            {reg.codigo_registro}
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                        {vInfo?.marca || ''} {vInfo?.modelo || vInfo?.subTipo || 'Veículo da Frota'}
                      </p>

                      <div className="flex items-center gap-3 mt-2 text-[11px] font-bold text-slate-600 dark:text-slate-300">
                        <span className="flex items-center gap-1">
                          <Gauge size={13} className="text-blue-600" />
                          {reg.hodometro ? Number(reg.hodometro).toLocaleString('pt-BR') : '---'} km
                        </span>
                        <span className="text-slate-300 dark:text-slate-700">•</span>
                        <span className="flex items-center gap-1">
                          <Calendar size={13} className="text-slate-400" />
                          {dataFmt}
                        </span>
                        <span className="text-slate-300 dark:text-slate-700">•</span>
                        <span className="flex items-center gap-1">
                          <User size={13} className="text-slate-400" />
                          {reg.criado_por || 'Sistema'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Bloco 2: 3 Miniaturas de Fotos */}
                  <div className="flex items-center gap-2.5">
                    {/* Foto Frente */}
                    <ThumbnailPhoto
                      url={reg.foto_frente_url}
                      label="Frente do Veículo"
                      onZoom={() => onPreviewImage && onPreviewImage({ url: reg.foto_frente_url, label: `Frente do Veículo - ${reg.placa}` })}
                    />

                    {/* Foto Hodômetro */}
                    <ThumbnailPhoto
                      url={reg.foto_hodometro_url}
                      label="Hodômetro"
                      onZoom={() => onPreviewImage && onPreviewImage({ url: reg.foto_hodometro_url, label: `Hodômetro (${reg.hodometro} km) - ${reg.placa}` })}
                    />

                    {/* Foto Haste */}
                    <ThumbnailPhoto
                      url={reg.foto_haste_url}
                      label="Vareta de Óleo"
                      onZoom={() => onPreviewImage && onPreviewImage({ url: reg.foto_haste_url, label: `Haste do Nível (${reg.nivel_oleo_rotulo}) - ${reg.placa}` })}
                    />
                  </div>

                  {/* Bloco 3: Ações do Operador da Frota */}
                  <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2.5 w-full lg:w-auto justify-end pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-200 dark:border-slate-800">
                    {isChamadoGerado ? (
                      <div className="flex items-center gap-2">
                        <div className="px-3.5 py-2 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-black flex items-center gap-1.5 shadow-xs">
                          <CheckCircle2 size={15} className="text-emerald-600" />
                          <span>OS #{reg.chamado_codigo || chamadoVinculado?.codigoChamado || 'Gerada'}</span>
                        </div>

                        {onEditar && (
                          <button
                            type="button"
                            onClick={() => {
                              const ch = chamadoVinculado || chamados.find(c => c.id === reg.chamado_id || c.codigoChamado === reg.chamado_codigo);
                              if (ch) onEditar(ch);
                              else alert(`Chamado #${reg.chamado_codigo} registrado.`);
                            }}
                            className="px-3 py-2 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 text-xs font-black flex items-center gap-1 transition-all"
                            title="Abrir detalhes do chamado"
                          >
                            <ExternalLink size={13} />
                            <span>Ver OS</span>
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        {/* Alerta se o veículo já tiver um chamado aberto */}
                        {chamadoAbertoExistente && (
                          <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400 bg-amber-100/80 dark:bg-amber-950/60 px-2.5 py-1 rounded-xl">
                            Chamado #{chamadoAbertoExistente.codigoChamado || 'Ativo'} em aberto
                          </span>
                        )}

                        <button
                          type="button"
                          onClick={() => setRegistroParaAbertura(reg)}
                          className={`px-4 py-2.5 rounded-2xl font-black text-xs text-white shadow-md transition-all flex items-center gap-1.5 active:scale-95 ${
                            isNivel3
                              ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/25'
                              : isNivel2
                                ? 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/25'
                                : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/25'
                          }`}
                        >
                          <Wrench size={14} />
                          <span>Abrir Chamado</span>
                        </button>
                      </div>
                    )}

                    {/* Botão de Excluir Registro (Somente Administrador e Gerente) */}
                    {podeExcluir && (
                      <button
                        type="button"
                        onClick={() => setRegistroParaExcluir(reg)}
                        className="p-2.5 rounded-2xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-slate-200 dark:border-slate-800 hover:border-rose-300 dark:hover:border-rose-800 transition-all active:scale-95 shrink-0"
                        title="Excluir Registro (Administrador / Gerente)"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Bloco 4: STATUS & WORKFLOW RESUMIDO DO CHAMADO GERADO */}
                {isChamadoGerado && (
                  <div className="mt-3.5 pt-3 border-t border-slate-200/80 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-50/80 dark:bg-slate-800/40 rounded-2xl p-3">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-xs font-black shadow-xs">
                        <CheckCircle2 size={13} className="text-emerald-400 dark:text-emerald-600" />
                        <span>OS #{reg.chamado_codigo || chamadoVinculado?.codigoChamado || 'Gerada'}</span>
                      </div>

                      {/* Status Geral */}
                      <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider border ${
                        (chamadoVinculado?.status || 'ABERTO') === 'RESOLVIDO'
                          ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                          : 'bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800'
                      }`}>
                        {chamadoVinculado?.status || 'ABERTO'}
                      </span>

                      {/* Etapa Atual do Workflow */}
                      {(() => {
                        const wfInfo = getWorkflowEtapaInfo(chamadoVinculado);
                        return (
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">Workflow:</span>
                            <span className={`px-2.5 py-0.5 rounded-lg text-xs font-black border flex items-center gap-1.5 ${wfInfo.badgeClass}`}>
                              <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse shrink-0" />
                              <span>{wfInfo.label}</span>
                            </span>
                          </div>
                        );
                      })()}
                    </div>

                    {/* Mini Stepper de Progresso Resumido + Botão Ver Chamado */}
                    <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                      {(() => {
                        const wfInfo = getWorkflowEtapaInfo(chamadoVinculado);
                        const stepsResumo = [
                          { num: 1, label: 'Abertura' },
                          { num: 2, label: 'Manutenção' },
                          { num: 3, label: 'Liberação' }
                        ];
                        return (
                          <div className="hidden sm:flex items-center gap-1.5 bg-white dark:bg-slate-900 px-3 py-1 rounded-xl border border-slate-200/80 dark:border-slate-800 text-[10px] font-bold shadow-xs">
                            {stepsResumo.map((s, idx) => {
                              const isPastOrCurrent = s.num <= wfInfo.stepNumber;
                              const isCurrent = s.num === wfInfo.stepNumber;
                              return (
                                <React.Fragment key={s.num}>
                                  <div className={`flex items-center gap-1 ${
                                    isCurrent 
                                      ? 'text-emerald-600 dark:text-emerald-400 font-black' 
                                      : isPastOrCurrent 
                                        ? 'text-slate-600 dark:text-slate-300' 
                                        : 'text-slate-300 dark:text-slate-600'
                                  }`}>
                                    <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black ${
                                      isCurrent 
                                        ? 'bg-emerald-500 text-white shadow-xs' 
                                        : isPastOrCurrent 
                                          ? 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200' 
                                          : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                                    }`}>
                                      {s.num}
                                    </span>
                                    <span>{s.label}</span>
                                  </div>
                                  {idx < stepsResumo.length - 1 && (
                                    <ChevronRight size={11} className="text-slate-300 dark:text-slate-700 shrink-0" />
                                  )}
                                </React.Fragment>
                              );
                            })}
                          </div>
                        );
                      })()}

                      {onEditar && (
                        <button
                          type="button"
                          onClick={() => {
                            const ch = chamadoVinculado || chamados.find(c => c.id === reg.chamado_id || c.codigoChamado === reg.chamado_codigo);
                            if (ch) onEditar(ch);
                            else alert(`Chamado #${reg.chamado_codigo} registrado.`);
                          }}
                          className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black flex items-center gap-1.5 shadow-sm shadow-blue-500/20 transition-all active:scale-95"
                          title="Abrir detalhes do chamado e fluxo de manutenção"
                        >
                          <ExternalLink size={13} />
                          <span>Ver Chamado</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Observações registradas se existirem */}
                {reg.observacoes && (
                  <div className="mt-3 pt-2.5 border-t border-slate-200/60 dark:border-slate-800/60 text-xs text-slate-500 dark:text-slate-400 font-medium flex items-center gap-2">
                    <span className="font-bold text-slate-600 dark:text-slate-300">Obs:</span>
                    <span>{reg.observacoes}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL DE CONFIRMAÇÃO DE ABERTURA AUTOMÁTICA DE CHAMADO */}
      {registroParaAbertura && (
        <div 
          className="fixed inset-0 z-[170] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in"
          onClick={() => !processandoAbertura && setRegistroParaAbertura(null)}
        >
          <div 
            className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 overflow-hidden animate-in zoom-in-95"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-md shadow-amber-500/25">
                  <Wrench size={20} />
                </div>
                <div>
                  <h4 className="font-black text-slate-900 dark:text-white text-base">
                    Abertura de Chamado E-CAR
                  </h4>
                  <p className="text-xs text-slate-400 font-medium">
                    Veículo {registroParaAbertura.placa} • Troca de Óleo
                  </p>
                </div>
              </div>
              <button
                type="button"
                disabled={processandoAbertura}
                onClick={() => setRegistroParaAbertura(null)}
                className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            {/* Conteúdo com Valores Pré-Configurados */}
            <div className="py-4 space-y-3.5 text-xs">
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 font-bold uppercase text-[10px]">Situação Veículo:</span>
                  <span className="font-black text-slate-800 dark:text-white">Rodando (Operacional)</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 font-bold uppercase text-[10px]">Hodômetro (KM):</span>
                  <span className="font-black text-slate-800 dark:text-white">{registroParaAbertura.hodometro?.toLocaleString('pt-BR')} km</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 font-bold uppercase text-[10px]">Defeito Principal:</span>
                  <span className="font-black text-amber-600 dark:text-amber-400">
                    Troca de Oleo - {registroParaAbertura.nivel_oleo_rotulo}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 font-bold uppercase text-[10px]">Categoria:</span>
                  <span className="font-black text-slate-800 dark:text-white">Mecanico</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 font-bold uppercase text-[10px]">Nº SOL (E-CAR):</span>
                  <span className="font-mono font-black text-slate-800 dark:text-white">SOL-000000</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 font-bold uppercase text-[10px]">Impeditivo?:</span>
                  <span className="font-black text-rose-600">Sim</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 font-bold uppercase text-[10px]">Evidências:</span>
                  <span className="font-black text-emerald-600">3 Fotos importadas</span>
                </div>
              </div>

              {/* Se já existir chamado aberto para a placa */}
              {getChamadoAbertoExistente(registroParaAbertura.placa) ? (
                <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200">
                  <div className="flex items-center gap-2 font-black text-xs mb-1">
                    <AlertTriangle size={15} className="text-amber-600" />
                    <span>Atenção: Chamado Existente Detectado</span>
                  </div>
                  <p className="text-[11px] leading-relaxed font-medium">
                    O veículo <strong>{registroParaAbertura.placa}</strong> já possui o chamado <strong>#{getChamadoAbertoExistente(registroParaAbertura.placa).codigoChamado || getChamadoAbertoExistente(registroParaAbertura.placa).id}</strong> aberto em andamento.
                  </p>
                  <p className="text-[11px] mt-1 font-bold">
                    Deseja anexar este defeito de óleo ao chamado existente ou abrir um chamado novo separado?
                  </p>
                </div>
              ) : (
                <p className="text-slate-500 font-medium text-center text-xs">
                  O chamado será aberto imediatamente e direcionado para a triagem da frota.
                </p>
              )}
            </div>

            {/* Ações no Rodapé */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-end gap-2">
              <button
                type="button"
                disabled={processandoAbertura}
                onClick={() => setRegistroParaAbertura(null)}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl font-bold text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Cancelar
              </button>

              {getChamadoAbertoExistente(registroParaAbertura.placa) ? (
                <>
                  <button
                    type="button"
                    disabled={processandoAbertura}
                    onClick={() => handleConfirmarAbertura(true)}
                    className="w-full sm:w-auto px-4 py-2.5 rounded-2xl font-black text-xs bg-amber-500 hover:bg-amber-600 text-white shadow-md shadow-amber-500/20 flex items-center justify-center gap-1.5 transition-all"
                  >
                    {processandoAbertura ? <Loader2 size={14} className="animate-spin" /> : <Wrench size={14} />}
                    <span>Anexar ao Chamado Existente</span>
                  </button>

                  <button
                    type="button"
                    disabled={processandoAbertura}
                    onClick={() => handleConfirmarAbertura(false)}
                    className="w-full sm:w-auto px-4 py-2.5 rounded-2xl font-black text-xs bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20 flex items-center justify-center gap-1.5 transition-all"
                  >
                    {processandoAbertura ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                    <span>Abrir Novo Separado</span>
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  disabled={processandoAbertura}
                  onClick={() => handleConfirmarAbertura(false)}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-2xl font-black text-xs bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20 flex items-center justify-center gap-1.5 transition-all active:scale-95"
                >
                  {processandoAbertura ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>Gerando Chamado E-CAR...</span>
                    </>
                  ) : (
                    <>
                      <Check size={14} />
                      <span>Confirmar Abertura de Chamado</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO DE REGISTRO (ADMIN / GERENTE) */}
      {registroParaExcluir && (
        <div 
          className="fixed inset-0 z-[175] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in"
          onClick={() => !processandoExclusao && setRegistroParaExcluir(null)}
        >
          <div 
            className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-rose-200 dark:border-rose-900/60 p-6 overflow-hidden animate-in zoom-in-95"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="w-11 h-11 rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 size={22} />
              </div>
              <div>
                <h4 className="font-black text-slate-900 dark:text-white text-base">
                  Excluir Registro de Óleo
                </h4>
                <p className="text-xs text-slate-400 font-medium">
                  Ação restrita a Administrador e Gerente
                </p>
              </div>
            </div>

            <div className="py-4 space-y-3 text-xs">
              <p className="text-slate-600 dark:text-slate-300 font-medium">
                Tem certeza que deseja excluir o registro de aferição da placa <strong>{registroParaExcluir.placa}</strong> ({registroParaExcluir.codigo_registro || 'Registro'})?
              </p>

              {registroParaExcluir.status === 'CHAMADO_ABERTO' && (
                <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-xs font-bold flex items-start gap-2">
                  <AlertTriangle size={16} className="shrink-0 text-amber-600 mt-0.5" />
                  <span>
                    Atenção: Este registro já gerou o Chamado <strong>#{registroParaExcluir.chamado_codigo}</strong>. A exclusão removerá o registro de medição da lista, mas não cancelará o chamado aberto na frota.
                  </span>
                </div>
              )}
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                disabled={processandoExclusao}
                onClick={() => setRegistroParaExcluir(null)}
                className="px-4 py-2.5 rounded-xl font-bold text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={processandoExclusao}
                onClick={handleConfirmarExclusao}
                className="px-5 py-2.5 rounded-2xl font-black text-xs bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-600/25 flex items-center gap-1.5 transition-all active:scale-95"
              >
                {processandoExclusao ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Excluindo...</span>
                  </>
                ) : (
                  <>
                    <Trash2 size={14} />
                    <span>Confirmar Exclusão</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    
      {/* MODAL GUIA DA VARETA DE ÓLEO (ILUSTRAÇÃO DIDÁTICA + MANUAL) */}
      <GuiaMedicaoVaretaOleo
        isOpen={showGuiaModal}
        onClose={() => setShowGuiaModal(false)}
      />
</div>
  );
}

// Subcomponente de Miniatura de Foto com Zoom
function ThumbnailPhoto({ url, label, onZoom }) {
  if (!url) {
    return (
      <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center text-slate-400">
        <span className="text-[8px] font-bold">Sem foto</span>
      </div>
    );
  }

  return (
    <div 
      className="relative group w-12 h-12 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-sm cursor-pointer"
      onClick={onZoom}
      title={`Ver ${label}`}
    >
      <img src={url} alt={label} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-200" />
      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
        <Eye size={14} />
      </div>
    </div>
  );
}
