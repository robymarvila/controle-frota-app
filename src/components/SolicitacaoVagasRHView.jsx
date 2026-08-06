import React, { useState, useMemo, useEffect } from 'react';
import {
  UserPlus, RefreshCw, Edit3, Save, PlusCircle, CheckCircle2,
  FileSpreadsheet, TrendingUp, Users, AlertTriangle, Search,
  Calendar, Check, X, Info, Sparkles, Filter, ChevronRight, ChevronDown,
  Clock, ShieldCheck, Eye, Layers, Layers2, Wrench, Download, AlertCircle, ArrowUpRight, Minus, Trash2
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import * as XLSX from 'xlsx';

// Chave para cache local de solicitações
const STORAGE_KEY_SOLICITACOES = 'fleet_solicitacoes_vagas_rh_v1';

// ==============================================================================
// COMPONENTE DE LINHA DRILL-DOWN PARA A TABELA DE VAGAS DO RH
// ==============================================================================
const VagasDrillDownRow = ({
  node,
  level = 0,
  path = '',
  isEditMode,
  editedVagasMap,
  setEditedVagasMap,
  COMMESSA_MAP
}) => {
  const currentPath = path ? `${path}/${node.name}` : node.name;
  const nodeKey = node.id || `${currentPath}_${level}`;

  const [isExpanded, setIsExpanded] = useState(level < 2 || isEditMode);

  useEffect(() => {
    if (isEditMode) {
      setIsExpanded(true);
    }
  }, [isEditMode]);

  const childrenArr = node.children ? (Array.isArray(node.children) ? node.children : Object.values(node.children)) : [];
  const hasChildren = childrenArr.length > 0;

  const gapDeficit = Math.max(0, (node.orcado || 0) - (node.rhEntregue || 0));

  // Helper recursivo para obter o total de vagas a solicitar no nó usando a chave com o caminho (path) completo
  const getNodeSolicitado = (n, parentPath = '') => {
    if (!n) return 0;
    const curPath = parentPath ? `${parentPath}/${n.name}` : n.name;
    const nChildren = n.children ? (Array.isArray(n.children) ? n.children : Object.values(n.children)) : [];
    if (nChildren.length === 0) {
      const k = n.id || `${curPath}_${n.level}`;
      const edit = editedVagasMap[k];
      const leafGap = Math.max(0, (n.orcado || 0) - (n.rhEntregue || 0));
      return edit !== undefined ? Number(edit) : leafGap;
    }
    return nChildren.reduce((sum, child) => sum + getNodeSolicitado(child, curPath), 0);
  };

  const currentSolicitado = getNodeSolicitado(node, path);

  // Estilização por nível de hierarquia (Design Minimalista Slate / Cinza Claro - Matriz de Cruzamento)
  const levelStyles = [
    'bg-slate-200 dark:bg-slate-800 font-black text-slate-900 dark:text-white',       // Level 0 (Grupo / Base UT)
    'bg-slate-100 dark:bg-slate-800/80 font-bold text-slate-800 dark:text-slate-200',  // Level 1 (Commessa / Subgrupo)
    'bg-slate-50 dark:bg-slate-900/80 font-bold text-slate-700 dark:text-slate-300',   // Level 2 (Base UT / Base Contrato)
    'bg-white dark:bg-slate-900 font-semibold text-slate-600 dark:text-slate-400',     // Level 3 (Subgrupo / Cargo)
    'bg-slate-50/50 dark:bg-slate-900/50 font-medium text-slate-600 dark:text-slate-400', // Level 4 (Base Contrato)
    'bg-white dark:bg-slate-900 font-normal text-slate-500 dark:text-slate-500'       // Level 5 (Cargo / Função)
  ];

  const rowStyle = levelStyles[level] || levelStyles[5];

  return (
    <>
      <tr className={`border-b border-slate-200/50 dark:border-slate-800/50 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/20 transition-colors ${rowStyle}`}>
        {/* NOME DO NÓ DA HIERARQUIA COM CHEVRON DRILL DOWN */}
        <td className="py-2.5 px-4" style={{ paddingLeft: `${(level * 16) + 16}px` }}>
          <div className="flex items-center gap-2">
            {hasChildren ? (
              <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-5 h-5 flex items-center justify-center rounded bg-slate-200 dark:bg-slate-700 hover:bg-indigo-100 dark:hover:bg-indigo-900 text-slate-500 hover:text-indigo-600 transition-colors cursor-pointer"
              >
                {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </button>
            ) : (
              <span className="w-5 h-5 flex items-center justify-center text-slate-300 dark:text-slate-700">
                <Minus size={14} />
              </span>
            )}
            <span className={level === 5 || !hasChildren ? "text-indigo-600 dark:text-indigo-400 font-bold text-xs" : "text-xs"}>
              {node.name || 'NÃO DEFINIDO'}
            </span>
          </div>
        </td>

        {/* BUDGET ORÇADO */}
        <td className="py-2.5 px-4 text-center font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/5 text-xs">
          {node.orcado || 0}
        </td>

        {/* RH ENTREGUE */}
        <td className="py-2.5 px-4 text-center font-bold text-amber-700 dark:text-amber-300 bg-amber-500/5 text-xs">
          {node.rhEntregue || 0}
        </td>

        {/* GAP RECOMENDADO (DEFICIT) */}
        <td className="py-2.5 px-4 text-center">
          <span className={`px-2 py-0.5 rounded text-[11px] font-black inline-flex items-center justify-center min-w-[32px] ${gapDeficit > 0
              ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
            }`}>
            {gapDeficit > 0 ? `+${gapDeficit}` : '0'}
          </span>
        </td>

        {/* VAGAS A SOLICITAR (RH) */}
        <td className="py-2.5 px-4 text-center bg-blue-500/5 font-black text-blue-700 dark:text-blue-300">
          {isEditMode && !hasChildren ? (
            <input
              type="number"
              min="0"
              value={editedVagasMap[nodeKey] !== undefined ? editedVagasMap[nodeKey] : gapDeficit}
              onChange={e => {
                const val = Math.max(0, parseInt(e.target.value) || 0);
                setEditedVagasMap(prev => ({ ...prev, [nodeKey]: val }));
              }}
              className="w-20 py-1 px-2 text-center rounded-lg bg-white dark:bg-slate-800 border border-blue-500 text-slate-900 dark:text-white font-bold text-xs outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
            />
          ) : (
            <span className={`px-2.5 py-1 rounded-lg text-xs font-black inline-block ${currentSolicitado > 0 ? 'bg-blue-600 text-white shadow-xs' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
              }`}>
              {currentSolicitado}
            </span>
          )}
        </td>

        {/* AÇÕES / INFORMAÇÕES */}
        <td className="py-2.5 px-4 text-center text-slate-400 text-[11px] font-medium">
          {hasChildren ? `${childrenArr.length} subníveis` : (
            <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 font-semibold">Folha</span>
          )}
        </td>
      </tr>

      {/* FILHOS RECURSIVOS */}
      {isExpanded && hasChildren && (
        childrenArr
          .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
          .map((child, idx) => (
            <VagasDrillDownRow
              key={`${currentPath}-${idx}`}
              node={child}
              level={level + 1}
              path={currentPath}
              isEditMode={isEditMode}
              editedVagasMap={editedVagasMap}
              setEditedVagasMap={setEditedVagasMap}
              COMMESSA_MAP={COMMESSA_MAP}
            />
          ))
      )}
    </>
  );
};

// ==============================================================================
// COMPONENTE PRINCIPAL SOLICITAÇÃO DE VAGAS RH VIEW
// ==============================================================================
export default function SolicitacaoVagasRHView({
  hierarchyTree = [],
  matrixRows = [],
  matrixViewMode = 'budget_full',
  setMatrixViewMode,
  baseUnificada = [],
  dadosBudget = [],
  COMMESSA_MAP = {},
  showNotification,
  currentUser,
  userPermissions
}) {
  const canPerformGestaoActions = useMemo(() => {
    const isMasterAdmin = (currentUser?.perfil || '').toUpperCase() === 'ADMINISTRADOR' || currentUser?.isAdmin === true;
    if (isMasterAdmin) return true;

    if (userPermissions?.permissoes_edicao?.forca_editar_vagas !== undefined) {
      return userPermissions.permissoes_edicao.forca_editar_vagas === true;
    }

    const perfilUpper = String(currentUser?.perfil || '').trim().toUpperCase();
    const cargoUpper = String(currentUser?.cargo || '').trim().toUpperCase();
    const allowed = ['ADMIN', 'ADMINISTRADOR', 'GERENTE', 'COORDENADOR'];
    return allowed.includes(perfilUpper) || allowed.includes(cargoUpper);
  }, [currentUser, userPermissions]);

  const [isEditMode, setIsEditMode] = useState(false);

  useEffect(() => {
    if (!canPerformGestaoActions && isEditMode) {
      setIsEditMode(false);
    }
  }, [canPerformGestaoActions, isEditMode]);
  const [searchTerm, setSearchTerm] = useState('');
  const [commessaFilter, setCommessaFilter] = useState('TODAS');

  // Ref para o input de Nome da Campanha
  const nomeCampanhaRef = React.useRef(null);

  // Dados da Campanha/Protocolo sendo editados
  const [nomeCampanha, setNomeCampanha] = useState('');
  const [observacaoCampanha, setObservacaoCampanha] = useState('');

  // Toast de notificação interna e Modal de Protocolo Criado com sucesso
  const [toastNotification, setToastNotification] = useState(null);
  const [createdProtocolModal, setCreatedProtocolModal] = useState(null);

  const notify = (message, isError = false) => {
    if (showNotification) showNotification(message, isError);
    setToastNotification({ message, isError });
    setTimeout(() => setToastNotification(null), 6000);
  };

  // Vagas em rascunho: chave => quantidade editada
  const [editedVagasMap, setEditedVagasMap] = useState({});

  // Vagas Spot (Avulsas) adicionadas manualmente
  const [vagasSpotList, setVagasSpotList] = useState([]);
  const [isSpotModalOpen, setIsSpotModalOpen] = useState(false);
  const [newSpotData, setNewSpotData] = useState({
    commessa: 'EN43',
    regional: 'Norte',
    funcao: '',
    subgrupo: 'EMERGENCIAL / SPOT',
    quantidade: 1,
    justificativa: ''
  });

  // Histórico de solicitações salvas
  const [solicitacoesHistory, setSolicitacoesHistory] = useState([]);
  const [selectedProtocoloModal, setSelectedProtocoloModal] = useState(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // --------------------------------------------------------------------------
  // ÁRVORE RECURSIVA PROCESSADA PARA A VISÃO SELECIONADA (EXCLUI BLOCOS SEM META)
  // --------------------------------------------------------------------------
  const displayTree = useMemo(() => {
    if (!hierarchyTree) return [];
    const rootNodes = Array.isArray(hierarchyTree) ? hierarchyTree : Object.values(hierarchyTree);
    return rootNodes.filter(n => {
      const name = String(n.name || '').toUpperCase();
      return !name.includes('FORA DE EQUIPE') && !name.includes('SEM COMESSA');
    });
  }, [hierarchyTree]);

  // Executa o botão "Atualizar Vagas" -> Recalcula os GAPs recomendados
  const handleAtualizarVagas = () => {
    setEditedVagasMap({});
    showNotification && showNotification(`Vagas atualizadas com sucesso para a visão ${matrixViewMode.toUpperCase()}.`);
  };

  // --------------------------------------------------------------------------
  // BUSCA E CARGA DO HISTÓRICO DE SOLICITAÇÕES (SUPABASE + LOCALSTORAGE)
  // --------------------------------------------------------------------------
  const loadSolicitacoesHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const { data, error } = await supabase
        .from('solicitacoes_vagas')
        .select(`
          *,
          solicitacoes_vagas_itens(*)
        `)
        .order('criado_em', { ascending: false });

      if (!error && data) {
        setSolicitacoesHistory(data);
        localStorage.setItem(STORAGE_KEY_SOLICITACOES, JSON.stringify(data));
      } else {
        const local = localStorage.getItem(STORAGE_KEY_SOLICITACOES);
        if (local) setSolicitacoesHistory(JSON.parse(local));
      }
    } catch (e) {
      console.warn('Usando LocalStorage para solicitações de vagas:', e);
      const local = localStorage.getItem(STORAGE_KEY_SOLICITACOES);
      if (local) setSolicitacoesHistory(JSON.parse(local));
    } finally {
      setIsLoadingHistory(false);
    }
  };

  useEffect(() => {
    loadSolicitacoesHistory();
  }, []);

  // Helper robusto para interpretação de datas brasileiras (DD/MM/YYYY), ISO e numéricas do Excel
  const parseDateRobust = (val) => {
    if (!val) return null;
    if (val instanceof Date) return isNaN(val.getTime()) ? null : val;
    if (typeof val === 'number') {
      return new Date((val - (25567 + 2)) * 86400 * 1000);
    }
    const str = String(val).trim();
    if (!str) return null;

    if (str.includes('/')) {
      const parts = str.split(' ')[0].split('/');
      if (parts.length === 3) {
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const year = parseInt(parts[2], 10);
        const d = new Date(year, month, day);
        if (!isNaN(d.getTime())) return d;
      }
    }

    const isoDate = new Date(str);
    if (!isNaN(isoDate.getTime())) return isoDate;

    return null;
  };

  // --------------------------------------------------------------------------
  // CÁLCULO DE ENTREGAS DE CONTRATAÇÕES PÓS-PROTOCOLO
  // --------------------------------------------------------------------------
  const getProtocoloHiringStats = (protocoloObj) => {
    if (!protocoloObj || !protocoloObj.solicitacoes_vagas_itens) {
      return { totalSolicitado: 0, totalContratado: 0, itensWithStats: [], admitidosMatch: [] };
    }

    const dtProtocolo = parseDateRobust(protocoloObj.criado_em) || new Date();
    // Normalizar a data de abertura do protocolo (sem horário)
    const dtProtocoloDateOnly = new Date(dtProtocolo.getFullYear(), dtProtocolo.getMonth(), dtProtocolo.getDate());

    const admitidosPosProtocolo = (baseUnificada || []).filter(colab => {
      if (!colab) return false;
      const rawDt = colab.data_admissao || colab.dt_admissao || colab.admissao || colab['Dt. Admissao'] || colab['Data Admissão'];
      if (!rawDt) return false;

      const dtColab = parseDateRobust(rawDt);
      if (!dtColab) return false;

      // O colaborador só conta como contratação pós-protocolo se a admissão for ESTRITAMENTE posterior à data de abertura
      const dtColabDateOnly = new Date(dtColab.getFullYear(), dtColab.getMonth(), dtColab.getDate());
      return dtColabDateOnly > dtProtocoloDateOnly;
    });

    let totalSolicitado = 0;
    let totalContratado = 0;

    const itensWithStats = (protocoloObj.solicitacoes_vagas_itens || []).map(item => {
      const qtdSolicitada = item.vagas_solicitadas || 0;
      totalSolicitado += qtdSolicitada;

      const itemCommessa = String(item.commessa || '').trim().toUpperCase();
      const itemFuncao = String(item.funcao || '').trim().toUpperCase().replace(/\s*-\s*N$/, '');

      const matches = admitidosPosProtocolo.filter(c => {
        const cCommessa = String(c.commessa || c.departamento || c['Comessa Alpitel'] || '').trim().toUpperCase();
        const cFuncao = String(c.funcao || c.cargo || c['Função'] || '').trim().toUpperCase().replace(/\s*-\s*N$/, '');

        let matchCommessa = false;
        if (!itemCommessa || itemCommessa === 'GERAL' || itemCommessa === 'COMMESSA GERAL') {
          matchCommessa = true;
        } else {
          matchCommessa = cCommessa === itemCommessa || cCommessa.includes(itemCommessa) || itemCommessa.includes(cCommessa);
        }

        let matchFuncao = false;
        if (itemFuncao && cFuncao) {
          matchFuncao = cFuncao === itemFuncao || cFuncao.includes(itemFuncao) || itemFuncao.includes(cFuncao);
        }

        return matchCommessa && matchFuncao;
      });

      const qtdContratada = matches.length;
      totalContratado += qtdContratada;

      return {
        ...item,
        qtdContratada,
        pctConcluido: qtdSolicitada > 0 ? Math.min(100, Math.round((qtdContratada / qtdSolicitada) * 100)) : 100,
        colaboradoresAdmitidos: matches
      };
    });

    return {
      totalSolicitado,
      totalContratado,
      pctGeral: totalSolicitado > 0 ? Math.min(100, Math.round((totalContratado / totalSolicitado) * 100)) : 0,
      itensWithStats,
      admitidosMatch: admitidosPosProtocolo
    };
  };

  // --------------------------------------------------------------------------
  // CRIAR E REGISTRAR PROTOCOLO DE VAGA SPOT / AVULSA DIRETAMENTE
  // --------------------------------------------------------------------------
  const handleSaveSpotProtocolo = async () => {
    if (!canPerformGestaoActions) {
      notify('Apenas Coordenadores, Gerentes e Administradores podem criar vagas spot/avulsas.', true);
      return;
    }
    if (!newSpotData.funcao.trim()) {
      notify('Informe a função para a vaga spot.', true);
      return;
    }
    const qtd = Number(newSpotData.quantidade) || 1;
    const commessaName = (newSpotData.commessa || 'EN43').trim().toUpperCase();
    const funcaoName = newSpotData.funcao.trim().toUpperCase();
    const regionalName = newSpotData.regional || 'Geral';
    const subgrupoName = newSpotData.subgrupo || 'EMERGENCIAL / SPOT';
    const justificativaStr = newSpotData.justificativa ? `Justificativa: ${newSpotData.justificativa}` : 'Vaga Avulsa / Spot Extra';

    setIsSaving(true);
    const now = new Date();
    const dateStr = now.getFullYear().toString() +
      String(now.getMonth() + 1).padStart(2, '0') +
      String(now.getDate()).padStart(2, '0');
    const randomNum = Math.floor(100 + Math.random() * 900);
    const protocoloCode = `VAG-${dateStr}-${randomNum}`;

    const novoHeader = {
      protocolo: protocoloCode,
      nome_campanha: `[SPOT] ${funcaoName} (${commessaName})`,
      observacao: justificativaStr,
      tipo: 'SPOT',
      status: 'EM_ANDAMENTO',
      total_vagas_solicitadas: qtd,
      criado_em: now.toISOString(),
      criado_por: 'Gestor Operacional'
    };

    const itemObj = {
      commessa: commessaName,
      base_ut: regionalName,
      regional: regionalName,
      base: regionalName,
      subgrupo: subgrupoName,
      base_contrato: regionalName,
      funcao: funcaoName,
      gap_recomendado: qtd,
      vagas_solicitadas: qtd
    };

    try {
      const { data: headData, error: headErr } = await supabase
        .from('solicitacoes_vagas')
        .insert([novoHeader])
        .select()
        .single();

      if (!headErr && headData) {
        const itensPayload = [{
          solicitacao_id: headData.id,
          commessa: commessaName,
          regional: regionalName,
          funcao: funcaoName,
          subgrupo: subgrupoName,
          gap_recomendado: qtd,
          vagas_solicitadas: qtd
        }];

        const { error: itensErr } = await supabase.from('solicitacoes_vagas_itens').insert(itensPayload);
        if (itensErr) console.warn('Erro ao inserir item spot no Supabase:', itensErr);
      }
    } catch (e) {
      console.warn('Gravação de vaga spot em Supabase falhou, salvando via LocalStorage:', e);
    } finally {
      const fullHeaderWithItens = {
        ...novoHeader,
        solicitacoes_vagas_itens: [{
          id: `item_spot_${Date.now()}`,
          solicitacao_id: novoHeader.id,
          ...itemObj
        }]
      };

      const updatedHistory = [fullHeaderWithItens, ...solicitacoesHistory];
      setSolicitacoesHistory(updatedHistory);
      localStorage.setItem(STORAGE_KEY_SOLICITACOES, JSON.stringify(updatedHistory));

      setIsSaving(false);
      setIsSpotModalOpen(false);
      setNewSpotData({ commessa: 'EN43', regional: 'Norte', funcao: '', subgrupo: 'EMERGENCIAL / SPOT', quantidade: 1, justificativa: '' });
      setCreatedProtocolModal(fullHeaderWithItens);
      notify(`Protocolo de Vaga Spot ${protocoloCode} gerado e gravado no Histórico com sucesso!`);
    }
  };

  // --------------------------------------------------------------------------
  // EXPORTAR DADOS DO PROTOCOLO PARA EXCEL (.XLSX) NATIVO COM 5 NÍVEIS
  // --------------------------------------------------------------------------
  const handleExportProtocoloToExcel = (protocolo) => {
    if (!protocolo) return;
    const itens = protocolo.solicitacoes_vagas_itens || [];
    if (itens.length === 0) {
      notify('Nenhum item de vaga disponível neste protocolo para exportar.', true);
      return;
    }

    const exportData = itens.map(item => ({
      'Base UT': item.base_ut || item.regional || item.base || 'Geral',
      'Subgrupo': item.subgrupo || 'Geral',
      'Base Contrato': item.base_contrato || 'GERAL',
      'Commessa': item.commessa || '',
      'Cargo / Função': item.funcao || '',
      'Quantidade de Vagas': item.vagas_solicitadas || 0
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    ws['!cols'] = [
      { wch: 22 }, // Base UT
      { wch: 22 }, // Subgrupo
      { wch: 22 }, // Base Contrato
      { wch: 15 }, // Commessa
      { wch: 35 }, // Cargo / Função
      { wch: 22 }  // Quantidade de Vagas
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Vagas Solicitadas');

    const fileName = `Protocolo_${protocolo.protocolo}_Vagas.xlsx`;
    XLSX.writeFile(wb, fileName);
    notify(`Planilha Excel (${fileName}) exportada com sucesso!`);
  };

  // --------------------------------------------------------------------------
  // CANCELAR / EXCLUIR PROTOCOLO DE ABERTURA DE VAGAS (GESTOR / ADMIN)
  // --------------------------------------------------------------------------
  const handleDeleteProtocolo = async (protocoloObj) => {
    if (!canPerformGestaoActions) {
      notify('Apenas Coordenadores, Gerentes e Administradores podem cancelar ou excluir protocolos.', true);
      return;
    }
    if (!protocoloObj) return;
    const confirmMessage = `Tem certeza que deseja cancelar / excluir o protocolo ${protocoloObj.protocolo} ("${protocoloObj.nome_campanha}")?\nEsta ação removerá todas as vagas desta solicitação.`;
    if (!window.confirm(confirmMessage)) return;

    try {
      if (protocoloObj.id) {
        await supabase.from('solicitacoes_vagas_itens').delete().eq('solicitacao_id', protocoloObj.id);
        await supabase.from('solicitacoes_vagas').delete().eq('id', protocoloObj.id);
      }
    } catch (e) {
      console.warn('Erro ao excluir protocolo do Supabase:', e);
    } finally {
      const updated = solicitacoesHistory.filter(h => h.protocolo !== protocoloObj.protocolo && h.id !== protocoloObj.id);
      setSolicitacoesHistory(updated);
      localStorage.setItem(STORAGE_KEY_SOLICITACOES, JSON.stringify(updated));
      setSelectedProtocoloModal(null);
      notify(`Protocolo ${protocoloObj.protocolo} cancelado e excluído com sucesso.`);
    }
  };

  // --------------------------------------------------------------------------
  // SALVAR PROTOCOLO DE SOLICITAÇÃO AO RH
  // --------------------------------------------------------------------------
  const handleSaveSolicitacao = async () => {
    if (!canPerformGestaoActions) {
      notify('Apenas Coordenadores, Gerentes e Administradores podem salvar e abrir novos protocolos de vagas.', true);
      return;
    }
    if (!nomeCampanha.trim()) {
      notify('Por favor, preencha o Nome da Campanha no campo acima antes de salvar.', true);
      if (nomeCampanhaRef.current) {
        nomeCampanhaRef.current.focus();
        nomeCampanhaRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    const allRowsToSave = [];

    const extractLeafNodes = (nodes, parentPath = '') => {
      if (!nodes) return;
      const arr = Array.isArray(nodes) ? nodes : Object.values(nodes);
      arr.forEach(n => {
        const curPath = parentPath ? `${parentPath}/${n.name}` : n.name;
        const nChildren = n.children ? (Array.isArray(n.children) ? n.children : Object.values(n.children)) : [];
        if (nChildren.length === 0) {
          const nodeKey = n.id || `${curPath}_${n.level}`;
          const gapDeficit = Math.max(0, (n.orcado || 0) - (n.rhEntregue || 0));
          const editVal = editedVagasMap[nodeKey];
          const qtdSolicitada = editVal !== undefined ? Number(editVal) : gapDeficit;

          const pathParts = curPath.split('/');
          const m = n.meta || {};

          let commessaName = m.commessa || pathParts[1] || 'GERAL';
          let baseUtName = m.baseUt || (matrixViewMode === 'operacional_status' ? pathParts[0] : pathParts[2]) || 'BASE GERAL';
          let subgrupoName = m.subgrupo || (matrixViewMode === 'operacional_status' ? pathParts[1] : pathParts[3]) || 'DIRETO';

          let baseContratoName = m.baseContrato;
          if (!baseContratoName || baseContratoName === 'GERAL') {
            if (matrixViewMode === 'budget_full' && pathParts[4]) {
              baseContratoName = pathParts[4];
            } else if (matrixViewMode === 'operacional_status' && pathParts[2]) {
              baseContratoName = pathParts[2];
            } else {
              baseContratoName = 'GERAL';
            }
          }
          let funcaoName = m.funcao || n.name || 'CARGO';

          if (qtdSolicitada > 0) {
            allRowsToSave.push({
              commessa: commessaName,
              base_ut: baseUtName,
              regional: baseUtName,
              base: baseUtName,
              subgrupo: subgrupoName,
              base_contrato: baseContratoName,
              funcao: funcaoName,
              gap_recomendado: gapDeficit,
              vagas_solicitadas: qtdSolicitada
            });
          }
        } else {
          extractLeafNodes(nChildren, curPath);
        }
      });
    };

    extractLeafNodes(displayTree);

    vagasSpotList.forEach(s => {
      const qtd = Number(editedVagasMap[s.id]) || s.gapDeficit;
      if (qtd > 0) {
        allRowsToSave.push({
          commessa: s.commessa,
          regional: s.regional,
          funcao: s.funcao,
          subgrupo: s.subgrupo,
          gap_recomendado: s.gapDeficit,
          vagas_solicitadas: qtd
        });
      }
    });

    if (allRowsToSave.length === 0) {
      notify('Nenhuma vaga com quantidade maior que zero para solicitar.', true);
      return;
    }

    setIsSaving(true);
    const now = new Date();
    const dateCode = now.toISOString().slice(0, 10).replace(/-/g, '');
    const randomSeq = Math.floor(100 + Math.random() * 900);
    const protocoloCode = `VAG-${dateCode}-${randomSeq}`;
    const totalVagas = allRowsToSave.reduce((acc, curr) => acc + curr.vagas_solicitadas, 0);

    const novoHeader = {
      id: crypto.randomUUID ? crypto.randomUUID() : `sol_${Date.now()}`,
      protocolo: protocoloCode,
      nome_campanha: nomeCampanha.trim(),
      observacao: observacaoCampanha.trim() || 'Abertura de Vagas via Matriz de Força de Trabalho',
      tipo: vagasSpotList.length > 0 ? 'SPOT / MISTO' : 'REGULAR',
      status: 'EM_ANDAMENTO',
      total_vagas_solicitadas: totalVagas,
      criado_em: now.toISOString(),
      criado_por: 'Gestor Operacional'
    };

    try {
      const { data: headData, error: headErr } = await supabase
        .from('solicitacoes_vagas')
        .insert([novoHeader])
        .select()
        .single();

      if (!headErr && headData) {
        const itensPayload = allRowsToSave.map(item => ({
          solicitacao_id: headData.id,
          commessa: item.commessa || 'GERAL',
          regional: item.regional || item.base_ut || item.base || 'GERAL',
          funcao: item.funcao || 'CARGO',
          subgrupo: item.subgrupo || 'DIRETO',
          gap_recomendado: Number(item.gap_recomendado) || 0,
          vagas_solicitadas: Number(item.vagas_solicitadas) || 0
        }));

        const { error: itensErr } = await supabase.from('solicitacoes_vagas_itens').insert(itensPayload);
        if (itensErr) {
          console.warn('Alerta ao inserir itens no Supabase:', itensErr);
        }
      }
    } catch (e) {
      console.warn('Gravação em Supabase falhou, usando LocalStorage fallback:', e);
    } finally {
      const fullHeaderWithItens = {
        ...novoHeader,
        solicitacoes_vagas_itens: allRowsToSave.map((item, i) => ({
          id: `item_${Date.now()}_${i}`,
          solicitacao_id: novoHeader.id,
          ...item
        }))
      };

      const updatedHistory = [fullHeaderWithItens, ...solicitacoesHistory];
      setSolicitacoesHistory(updatedHistory);
      localStorage.setItem(STORAGE_KEY_SOLICITACOES, JSON.stringify(updatedHistory));

      setIsSaving(false);
      setNomeCampanha('');
      setObservacaoCampanha('');
      setVagasSpotList([]);
      setIsEditMode(false);
      setCreatedProtocolModal(fullHeaderWithItens);
      notify(`Solicitação de Vagas gravada com sucesso! Protocolo: ${protocoloCode}`);
    }
  };

  // Totais sumarizados para os Cards de KPI Topo e Rodapé
  const totaisTabela = useMemo(() => {
    let totalOrcado = 0;
    let totalRhEntregue = 0;
    let totalEmEquipe = 0;

    displayTree.forEach(root => {
      totalOrcado += root.orcado || 0;
      totalRhEntregue += root.rhEntregue || 0;
      totalEmEquipe += root.emEquipe || 0;
    });

    const totalGapDeficit = Math.max(0, totalOrcado - totalRhEntregue);

    let totalVagasSolicitar = 0;

    const calcSol = (nodes, parentPath = '') => {
      if (!nodes) return;
      const arr = Array.isArray(nodes) ? nodes : Object.values(nodes);
      arr.forEach(n => {
        const curPath = parentPath ? `${parentPath}/${n.name}` : n.name;
        const nChild = n.children ? (Array.isArray(n.children) ? n.children : Object.values(n.children)) : [];
        if (nChild.length === 0) {
          const k = n.id || `${curPath}_${n.level}`;
          const g = Math.max(0, (n.orcado || 0) - (n.rhEntregue || 0));
          const edit = editedVagasMap[k];
          totalVagasSolicitar += edit !== undefined ? Number(edit) : g;
        } else {
          calcSol(nChild, curPath);
        }
      });
    };

    calcSol(displayTree);

    vagasSpotList.forEach(s => {
      const edit = editedVagasMap[s.id];
      totalVagasSolicitar += edit !== undefined ? Number(edit) : s.gapDeficit;
    });

    return {
      totalOrcado,
      totalRhEntregue,
      totalEmEquipe,
      totalGapDeficit,
      totalVagasSolicitar
    };
  }, [displayTree, editedVagasMap, vagasSpotList]);

  const kpiTotais = useMemo(() => {
    let totalSolicitadoHistorico = 0;
    let totalContratadoHistorico = 0;

    solicitacoesHistory.forEach(prot => {
      const stats = getProtocoloHiringStats(prot);
      totalSolicitadoHistorico += stats.totalSolicitado;
      totalContratadoHistorico += stats.totalContratado;
    });

    const pctAtendimentoGeral = totalSolicitadoHistorico > 0
      ? Math.min(100, Math.round((totalContratadoHistorico / totalSolicitadoHistorico) * 100))
      : 0;

    return {
      totalRecomendado: totaisTabela.totalGapDeficit,
      totalSolicitadoRascunho: totaisTabela.totalVagasSolicitar,
      totalSolicitadoHistorico,
      totalContratadoHistorico,
      pctAtendimentoGeral
    };
  }, [totaisTabela, solicitacoesHistory, baseUnificada]);

  // --------------------------------------------------------------------------
  // RENDERIZAÇÃO PRINCIPAL DO COMPONENTE
  // --------------------------------------------------------------------------
  return (
    <div className="space-y-8 animate-in fade-in duration-300 relative">

      {/* TOAST DE NOTIFICAÇÃO AUTÔNOMO */}
      {toastNotification && (
        <div className={`fixed top-6 right-6 z-50 p-4 rounded-2xl shadow-2xl border text-xs font-bold flex items-center gap-3 animate-in slide-in-from-top-5 duration-300 max-w-md ${toastNotification.isError
            ? 'bg-rose-600 text-white border-rose-400'
            : 'bg-emerald-600 text-white border-emerald-400'
          }`}>
          {toastNotification.isError ? <AlertCircle size={20} /> : <CheckCircle2 size={20} />}
          <span className="flex-1 text-sm font-extrabold">{toastNotification.message}</span>
          <button onClick={() => setToastNotification(null)} className="p-1 hover:bg-white/20 rounded-lg cursor-pointer">
            <X size={16} />
          </button>
        </div>
      )}

      {/* HERO SECTION ULTRA-PREMIUM (MATERIAL 3 EXPRESSIVE + LIQUID GLASS) */}
      <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-8 sm:p-10 text-white shadow-2xl border border-white/20 backdrop-blur-2xl">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 -mb-10 w-72 h-72 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-3.5 py-1 rounded-full text-[11px] font-black uppercase tracking-widest bg-gradient-to-r from-blue-500/30 to-indigo-500/30 text-blue-200 border border-blue-400/30 backdrop-blur-md flex items-center gap-1.5 shadow-inner">
                <Sparkles size={13} className="text-blue-400 animate-pulse" /> Inteligência de Gestão de Vagas RH
              </span>
              <span className="px-3 py-1 rounded-full text-[11px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Matriz Drill Down Expansível
              </span>
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight bg-gradient-to-r from-white via-blue-100 to-indigo-200 bg-clip-text text-transparent">
              4. Solicitação de Vagas (RH)
            </h2>
            <p className="text-sm text-slate-300 max-w-2xl font-medium leading-relaxed">
              Explore a hierarquia expansível da Matriz de Cruzamento, edite as vagas a solicitar e abra novos protocolos formais ao RH com rastreamento automático de contratações.
            </p>
          </div>

          {/* BOTÕES PRINCIPAIS DE AÇÃO */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleAtualizarVagas}
              className="px-5 py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-xs uppercase tracking-wider shadow-xl shadow-blue-500/25 active:scale-95 transition-all flex items-center gap-2.5 cursor-pointer border border-white/20"
              title="Atualizar prévia de vagas com base na Matriz do Budget x RH"
            >
              <RefreshCw size={17} className="animate-spin-slow text-blue-200" />
              <span>Atualizar Vagas</span>
            </button>

            <button
              onClick={() => {
                if (!canPerformGestaoActions) {
                  notify('Apenas Coordenadores, Gerentes e Administradores podem habilitar a edição e abertura de vagas.', true);
                  return;
                }
                setIsEditMode(!isEditMode);
              }}
              className={`px-5 py-3.5 rounded-2xl font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2.5 cursor-pointer border ${isEditMode
                  ? 'bg-amber-500 text-slate-950 border-amber-300 shadow-xl shadow-amber-500/30 scale-105'
                  : 'bg-white/10 hover:bg-white/20 text-white border-white/20 backdrop-blur-md'
                }`}
            >
              <Edit3 size={17} />
              <span>{isEditMode ? 'Edição Habilitada' : 'Abrir Vagas (Editar)'}</span>
            </button>

            <button
              onClick={() => {
                if (!canPerformGestaoActions) {
                  notify('Apenas Coordenadores, Gerentes e Administradores podem criar vagas spot/avulsas.', true);
                  return;
                }
                setIsSpotModalOpen(true);
              }}
              className="px-5 py-3.5 rounded-2xl bg-emerald-600/90 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider shadow-lg active:scale-95 transition-all flex items-center gap-2 cursor-pointer border border-emerald-400/30 backdrop-blur-md"
            >
              <PlusCircle size={17} />
              <span>+ Vaga Spot</span>
            </button>
          </div>
        </div>
      </div>

      {/* CARDS DE KPIS EXPRESSIVOS DA MATRIZ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="p-6 rounded-3xl bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 shadow-xl relative overflow-hidden group backdrop-blur-2xl">
          <div className="absolute top-0 right-0 w-28 h-28 bg-blue-500/10 rounded-full blur-2xl group-hover:bg-blue-500/20 transition-all pointer-events-none" />
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <TrendingUp size={15} className="text-blue-500" /> Vagas Pendentes (GAP)
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-500/15 text-blue-600 dark:text-blue-400">
              Budget x RH
            </span>
          </div>
          <div className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
            {kpiTotais.totalRecomendado} <span className="text-sm font-bold text-slate-400">vagas</span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 font-medium">
            Deficit recomendado na Matriz de Cruzamento
          </p>
        </div>

        <div className="p-6 rounded-3xl bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 shadow-xl relative overflow-hidden group backdrop-blur-2xl">
          <div className="absolute top-0 right-0 w-28 h-28 bg-amber-500/10 rounded-full blur-2xl group-hover:bg-amber-500/20 transition-all pointer-events-none" />
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <UserPlus size={15} className="text-amber-500" /> Abertura Selecionada
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500/15 text-amber-600 dark:text-amber-400">
              Rascunho Atual
            </span>
          </div>
          <div className="text-3xl sm:text-4xl font-black text-amber-600 dark:text-amber-400 tracking-tight">
            {kpiTotais.totalSolicitadoRascunho} <span className="text-sm font-bold text-slate-400">vagas</span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 font-medium">
            Vagas que serão enviadas neste protocolo
          </p>
        </div>

        <div className="p-6 rounded-3xl bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 shadow-xl relative overflow-hidden group backdrop-blur-2xl">
          <div className="absolute top-0 right-0 w-28 h-28 bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-500/20 transition-all pointer-events-none" />
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Users size={15} className="text-emerald-500" /> Contratadas pós-Abertura
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
              Base RH Match
            </span>
          </div>
          <div className="text-3xl sm:text-4xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight flex items-baseline gap-2">
            {kpiTotais.totalContratadoHistorico}
            <span className="text-xs font-extrabold text-slate-400">
              / {kpiTotais.totalSolicitadoHistorico} solicitadas
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 font-medium">
            Admitidos após a data dos protocolos salvos
          </p>
        </div>

        <div className="p-6 rounded-3xl bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 shadow-xl relative overflow-hidden group backdrop-blur-2xl">
          <div className="absolute top-0 right-0 w-28 h-28 bg-indigo-500/10 rounded-full blur-2xl group-hover:bg-indigo-500/20 transition-all pointer-events-none" />
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <ShieldCheck size={15} className="text-indigo-500" /> Taxa Atendimento RH
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-indigo-500/15 text-indigo-600 dark:text-indigo-400">
              Desempenho
            </span>
          </div>
          <div className="text-3xl sm:text-4xl font-black text-indigo-600 dark:text-indigo-400 tracking-tight">
            {kpiTotais.pctAtendimentoGeral}%
          </div>
          <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 mt-3 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full transition-all duration-500"
              style={{ width: `${kpiTotais.pctAtendimentoGeral}%` }}
            />
          </div>
        </div>
      </div>

      {/* SEÇÃO PRINCIPAL: TABELA EXPANSÍVEL DRILL DOWN (MATRIZ DE CRUZAMENTO) */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 shadow-xl space-y-6 backdrop-blur-2xl">

        {/* BANNER DE MODO DE EDIÇÃO ATIVO */}
        {isEditMode && (
          <div className="p-4 rounded-2xl bg-blue-500/15 border-2 border-blue-500 text-blue-900 dark:text-blue-100 font-bold text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in shadow-md">
            <div className="flex items-center gap-2.5">
              <Edit3 size={18} className="text-blue-600 dark:text-blue-400 animate-pulse" />
              <span>
                <strong>Modo de Edição Habilitado:</strong> Toda a árvore foi expandida automaticamente. Edite as quantidades nas caixas azuis abaixo, informe o <em>Nome da Campanha</em> e clique em <strong>"Salvar & Abrir Protocolo"</strong>.
              </span>
            </div>
            <button
              onClick={() => setIsEditMode(false)}
              className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs transition-all shadow-xs cursor-pointer shrink-0"
            >
              Concluir Edição
            </button>
          </div>
        )}

        {/* HEADLINE DA TABELA E CAMPOS DE CAMPANHA */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 border-b border-slate-200/60 dark:border-slate-800 pb-6">
          <div className="space-y-1">
            <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              Abertura Formal de Vagas para a Seleção RH (Matriz Drill Down)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Expanda e recolha as categorias da hierarquia para revisar e definir as vagas por área.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <input
              ref={nomeCampanhaRef}
              type="text"
              placeholder="Nome da Campanha (Ex: Contratação Q3 EN43) *"
              value={nomeCampanha}
              onChange={e => setNomeCampanha(e.target.value)}
              className={`px-4 py-2.5 rounded-2xl text-xs font-bold outline-none transition-all w-full sm:w-72 ${isEditMode
                  ? 'bg-blue-50 dark:bg-slate-800 border-2 border-blue-500 text-slate-900 dark:text-white ring-2 ring-blue-500/30'
                  : 'bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white'
                }`}
            />
            <input
              type="text"
              placeholder="Observação / Motivo..."
              value={observacaoCampanha}
              onChange={e => setObservacaoCampanha(e.target.value)}
              className="px-4 py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none w-full sm:w-60"
            />
            <button
              onClick={handleSaveSolicitacao}
              disabled={isSaving}
              className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs uppercase tracking-wider shadow-lg active:scale-95 transition-all flex items-center gap-2 cursor-pointer border border-white/20 disabled:opacity-50"
            >
              <Save size={16} />
              <span>{isSaving ? 'Gravando...' : 'Salvar & Abrir Protocolo'}</span>
            </button>
          </div>
        </div>

        {/* BARRA DE SELEÇÃO DAS 3 VISÕES DA MATRIZ */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-200/60 dark:border-slate-700/60">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-300">
            <Filter size={15} className="text-blue-500" />
            <span>Alternar Visão da Hierarquia:</span>
          </div>

          <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-inner flex-wrap">
            <button
              type="button"
              onClick={() => setMatrixViewMode && setMatrixViewMode('budget_full')}
              className={`px-3.5 py-1.5 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer ${matrixViewMode === 'budget_full'
                  ? 'bg-blue-600 text-white shadow-md font-black'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
            >
              <Layers size={14} /> 1. Budget Completa (6 Níveis)
            </button>
            <button
              type="button"
              onClick={() => setMatrixViewMode && setMatrixViewMode('budget_simple')}
              className={`px-3.5 py-1.5 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer ${matrixViewMode === 'budget_simple'
                  ? 'bg-blue-600 text-white shadow-md font-black'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
            >
              <Layers2 size={14} /> 2. Budget Simplificada (4 Níveis)
            </button>
            <button
              type="button"
              onClick={() => setMatrixViewMode && setMatrixViewMode('operacional_status')}
              className={`px-3.5 py-1.5 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer ${matrixViewMode === 'operacional_status'
                  ? 'bg-blue-600 text-white shadow-md font-black'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
            >
              <Wrench size={14} /> 3. Prontidão Operacional
            </button>
          </div>
        </div>

        {/* TABELA PIVÔ DE DRILL DOWN EXPANSÍVEL (DESIGN SLATE/GRAY DA MATRIZ) */}
        <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 font-black uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                <th className="py-3.5 px-4 text-xs">
                  {matrixViewMode === 'budget_full' && 'Hierarquia Budget Completa (Grupo > COMMESSA > Base UT > Subgrupo > Base Contrato > Cargo/Função)'}
                  {matrixViewMode === 'budget_simple' && 'Hierarquia Budget Simplificada (Grupo > COMMESSA > Base UT > Cargo/Função)'}
                  {matrixViewMode === 'operacional_status' && 'Hierarquia Prontidão Operacional (Base UT > Subgrupo > Base Contrato > Cargo/Função)'}
                </th>
                <th className="py-3.5 px-4 text-center bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 text-xs" style={{ width: '130px' }}>1. Budget</th>
                <th className="py-3.5 px-4 text-center bg-amber-500/5 text-amber-700 dark:text-amber-300 text-xs" style={{ width: '140px' }}>2. RH Entregue</th>
                <th className="py-3.5 px-4 text-center text-xs" style={{ width: '150px' }}>GAP Recomendado (+OP)</th>
                <th className="py-3.5 px-4 text-center bg-blue-500/10 text-blue-700 dark:text-blue-300 font-black text-xs" style={{ width: '160px' }}>Vagas a Solicitar (RH)</th>
                <th className="py-3.5 px-4 text-center text-xs" style={{ width: '110px' }}>Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/50 dark:divide-slate-800/50 font-medium">
              {displayTree.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 font-bold">
                    Nenhum dado encontrado na árvore de hierarquia da visão selecionada.
                  </td>
                </tr>
              ) : (
                displayTree.map((node, idx) => (
                  <VagasDrillDownRow
                    key={`${node.name}_${idx}`}
                    node={node}
                    level={0}
                    path=""
                    isEditMode={isEditMode}
                    editedVagasMap={editedVagasMap}
                    setEditedVagasMap={setEditedVagasMap}
                    COMMESSA_MAP={COMMESSA_MAP}
                  />
                ))
              )}

              {/* EXIBIÇÃO DE VAGAS SPOT ADICIONADAS SEPARADAMENTE */}
              {vagasSpotList.length > 0 && (
                <>
                  <tr className="bg-amber-500/10 border-t-2 border-amber-400 text-amber-900 dark:text-amber-200 font-bold text-xs">
                    <td colSpan={6} className="py-2.5 px-4 uppercase tracking-wider flex items-center gap-2">
                      <PlusCircle size={15} className="text-amber-500" />
                      <span>Vagas Spot / Avulsas Cadastradas ({vagasSpotList.length})</span>
                    </td>
                  </tr>
                  {vagasSpotList.map(spot => (
                    <tr key={spot.id} className="bg-amber-500/5 border-b border-amber-200 dark:border-amber-900/30 text-xs">
                      <td className="py-2.5 px-4 font-bold text-slate-800 dark:text-slate-200 pl-8">
                        <span className="px-2 py-0.5 rounded bg-amber-500 text-slate-950 font-black text-[10px] mr-2">SPOT</span>
                        {spot.funcao} ({spot.commessa}) - {spot.regional}
                      </td>
                      <td className="py-2.5 px-4 text-center text-slate-400">0</td>
                      <td className="py-2.5 px-4 text-center text-slate-400">0</td>
                      <td className="py-2.5 px-4 text-center font-bold text-rose-600 dark:text-rose-400">+{spot.gapDeficit}</td>
                      <td className="py-2.5 px-4 text-center bg-blue-500/10 font-black text-blue-700 dark:text-blue-300">
                        {editedVagasMap[spot.id] !== undefined ? editedVagasMap[spot.id] : spot.gapDeficit}
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveSpotVaga(spot.id)}
                          className="p-1 rounded bg-rose-500/10 text-rose-600 hover:bg-rose-500/20"
                          title="Remover vaga spot"
                        >
                          <X size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </>
              )}
            </tbody>

            {/* LINHA FINAL COM TOTAL DA TABELA (TFOOT SLATE/GRAY MATRIZ) */}
            <tfoot className="bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-black text-xs border-t-2 border-slate-300 dark:border-slate-700">
              <tr>
                <td className="py-3.5 px-4 font-black uppercase tracking-wider text-slate-700 dark:text-slate-200">
                  <div className="flex items-center gap-2">
                    <Sparkles size={15} className="text-amber-500" />
                    <span>TOTAL GERAL</span>
                  </div>
                </td>
                <td className="py-3.5 px-4 text-center font-black text-emerald-600 dark:text-emerald-400 text-sm">
                  {totaisTabela.totalOrcado}
                </td>
                <td className="py-3.5 px-4 text-center font-black text-amber-700 dark:text-amber-300 text-sm">
                  {totaisTabela.totalRhEntregue}
                </td>
                <td className="py-3.5 px-4 text-center">
                  <span className="px-2.5 py-0.5 rounded text-xs font-black bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 inline-block">
                    +{totaisTabela.totalGapDeficit}
                  </span>
                </td>
                <td className="py-3.5 px-4 text-center bg-blue-500/10">
                  <span className="px-3 py-1 rounded-lg bg-blue-600 text-white font-black text-sm shadow-xs inline-block">
                    {totaisTabela.totalVagasSolicitar}
                  </span>
                </td>
                <td className="py-3.5 px-4 text-center text-slate-400 font-bold">-</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* PAINEL DE HISTÓRICO DE PROTOCOLOS SALVOS E ACOMPANHAMENTO DE CONTRATAÇÕES */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 shadow-xl space-y-6 backdrop-blur-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/60 dark:border-slate-800 pb-5">
          <div>
            <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              Histórico de Protocolos e Entregas do RH
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Clique em qualquer protocolo para visualizar as vagas solicitadas versus o total de contratações realizadas após a data da abertura.
            </p>
          </div>

          <button
            onClick={loadSolicitacoesHistory}
            className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw size={14} className={isLoadingHistory ? 'animate-spin' : ''} />
            <span>Atualizar Histórico</span>
          </button>
        </div>

        {/* LISTA DE CARDS DE PROTOCOLOS */}
        {solicitacoesHistory.length === 0 ? (
          <div className="p-12 text-center text-slate-400 font-medium bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700">
            <Clock size={32} className="mx-auto mb-2 text-slate-400 opacity-60" />
            <p>Nenhuma solicitação de vaga gravada ainda. Preencha os dados acima e clique em "Salvar & Abrir Protocolo".</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {solicitacoesHistory.map((prot, idx) => {
              const stats = getProtocoloHiringStats(prot);
              const dataFormatada = new Date(prot.criado_em).toLocaleDateString('pt-BR', {
                day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
              });

              const uniqueKey = prot.id || prot.protocolo || `prot_${idx}`;

              return (
                <div
                  key={uniqueKey}
                  onClick={() => setSelectedProtocoloModal(prot)}
                  className="p-6 rounded-3xl bg-slate-50/80 dark:bg-slate-800/80 hover:bg-white dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700 shadow-md hover:shadow-xl transition-all cursor-pointer group space-y-4 relative overflow-hidden"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`px-3 py-1 rounded-xl text-xs font-black shadow-sm ${prot.tipo === 'SPOT' ? 'bg-amber-500 text-slate-950' : 'bg-blue-600 text-white'}`}>
                        {prot.protocolo}
                      </span>
                      {prot.tipo === 'SPOT' && (
                        <span className="px-2 py-0.5 rounded-lg text-[10px] font-black bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 uppercase tracking-wide">
                          VAGA SPOT
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold text-slate-400">
                        {dataFormatada}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteProtocolo(prot);
                        }}
                        className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-600 text-rose-600 hover:text-white transition-colors cursor-pointer"
                        title="Cancelar / Excluir Protocolo"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-base font-black text-slate-900 dark:text-white group-hover:text-blue-500 transition-colors">
                      {prot.nome_campanha}
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-1">
                      {prot.observacao}
                    </p>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-600 dark:text-slate-300">
                        Atendimento RH: {stats.totalContratado} de {stats.totalSolicitado}
                      </span>
                      <span className="font-black text-emerald-600 dark:text-emerald-400">
                        {stats.pctGeral}%
                      </span>
                    </div>

                    <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full transition-all duration-500"
                        style={{ width: `${stats.pctGeral}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-blue-600 dark:text-blue-400 font-bold pt-1">
                    <span>Ver detalhes das vagas</span>
                    <ChevronRight size={15} className="group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODAL DETALHADO DE PROTOCOLO */}
      {selectedProtocoloModal && (() => {
        const stats = getProtocoloHiringStats(selectedProtocoloModal);
        const dtStr = new Date(selectedProtocoloModal.criado_em).toLocaleDateString('pt-BR', {
          day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
        });

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-4xl w-full overflow-hidden space-y-6 max-h-[90vh] flex flex-col">

              <div className="p-6 bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex items-center justify-between shrink-0">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 rounded-xl text-xs font-black bg-blue-500 text-white">
                      {selectedProtocoloModal.protocolo}
                    </span>
                    <span className="text-xs text-slate-300 font-bold">{dtStr}</span>
                  </div>
                  <h3 className="text-xl font-black mt-2 text-white">
                    {selectedProtocoloModal.nome_campanha}
                  </h3>
                  <p className="text-xs text-slate-300 mt-0.5">{selectedProtocoloModal.observacao}</p>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleExportProtocoloToExcel(selectedProtocoloModal)}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs flex items-center gap-2 shadow-md cursor-pointer transition-all border border-emerald-400/30"
                  >
                    <FileSpreadsheet size={16} />
                    <span>Exportar Excel</span>
                  </button>

                  <button
                    onClick={() => setSelectedProtocoloModal(null)}
                    className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-6 overflow-y-auto flex-1">
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-center">
                    <span className="text-[11px] font-black text-slate-400 uppercase">Solicitadas</span>
                    <div className="text-2xl font-black text-blue-600 dark:text-blue-400">{stats.totalSolicitado}</div>
                  </div>
                  <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-center">
                    <span className="text-[11px] font-black text-slate-400 uppercase">Contratadas (RH)</span>
                    <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{stats.totalContratado}</div>
                  </div>
                  <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-center">
                    <span className="text-[11px] font-black text-slate-400 uppercase">% Concluído</span>
                    <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400">{stats.pctGeral}%</div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                    Vagas por Commessa e Cargo
                  </h4>
                  <div className="divide-y divide-slate-200 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
                    {stats.itensWithStats.map((item, idx) => (
                      <div key={item.id || `item_${idx}`} className="p-4 bg-slate-50/50 dark:bg-slate-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 last:border-0">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="px-2.5 py-0.5 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-extrabold text-xs">
                              {item.commessa && item.commessa !== 'GERAL' ? `Commessa ${item.commessa}` : 'COMMESSA GERAL'}
                            </span>
                            <span className="font-black text-slate-900 dark:text-white text-sm">
                              {item.funcao}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-medium flex-wrap">
                            <span>Base UT: <strong className="text-slate-800 dark:text-slate-200">{item.base_ut || item.regional || item.base || 'Geral'}</strong></span>
                            <span>•</span>
                            <span>Subgrupo: <strong className="text-slate-800 dark:text-slate-200">{item.subgrupo || 'Geral'}</strong></span>
                            <span>•</span>
                            <span>Base Contrato: <strong className="text-slate-800 dark:text-slate-200">{item.base_contrato || 'GERAL'}</strong></span>
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <span className="text-xs font-black text-slate-800 dark:text-slate-200 block">
                              {item.qtdContratada} / {item.vagas_solicitadas} Contratadas
                            </span>
                            <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                              {item.pctConcluido}% concluído
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

              <div className="p-4 bg-slate-100 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
                <button
                  type="button"
                  onClick={() => handleDeleteProtocolo(selectedProtocoloModal)}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs flex items-center gap-2 shadow-md cursor-pointer transition-all border border-rose-400/30"
                >
                  <Trash2 size={15} />
                  <span>Cancelar / Excluir Protocolo</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedProtocoloModal(null)}
                  className="px-5 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 font-bold text-xs cursor-pointer"
                >
                  Fechar
                </button>
              </div>

            </div>
          </div>
        );
      })()}

      {/* MODAL PARA INCLUIR VAGA SPOT / AVULSA */}
      {isSpotModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-md w-full p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
              <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <PlusCircle className="text-emerald-500" /> Abertura de Vaga Spot / Avulsa
              </h3>
              <button onClick={() => setIsSpotModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Commessa *</label>
                <input
                  type="text"
                  value={newSpotData.commessa}
                  onChange={e => setNewSpotData({ ...newSpotData, commessa: e.target.value })}
                  placeholder="Ex: EN43, ES71..."
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-bold text-xs outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Função / Cargo *</label>
                <input
                  type="text"
                  value={newSpotData.funcao}
                  onChange={e => setNewSpotData({ ...newSpotData, funcao: e.target.value })}
                  placeholder="Ex: ELETRICISTA DE RECORTE, MOTORISTA MUNK..."
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-bold text-xs outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Regional</label>
                  <select
                    value={newSpotData.regional}
                    onChange={e => setNewSpotData({ ...newSpotData, regional: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-bold text-xs outline-none"
                  >
                    <option value="Norte">Norte</option>
                    <option value="Sul">Sul</option>
                    <option value="Leste">Leste</option>
                    <option value="Oeste">Oeste</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Quantidade *</label>
                  <input
                    type="number"
                    min="1"
                    value={newSpotData.quantidade}
                    onChange={e => setNewSpotData({ ...newSpotData, quantidade: Math.max(1, parseInt(e.target.value) || 1) })}
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-bold text-xs outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Justificativa / Motivo</label>
                <textarea
                  rows={2}
                  value={newSpotData.justificativa}
                  onChange={e => setNewSpotData({ ...newSpotData, justificativa: e.target.value })}
                  placeholder="Ex: Demanda urgente emergencial de expansão..."
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium text-xs outline-none resize-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsSpotModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveSpotProtocolo}
                disabled={isSaving}
                className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider shadow-md cursor-pointer flex items-center gap-2 transition-all"
              >
                <Save size={16} />
                <span>Salvar & Gerar Protocolo Spot</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL ULTRA-PREMIUM DE CONFIRMAÇÃO DE PROTOCOLO CRIADO */}
      {createdProtocolModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border-2 border-emerald-500 rounded-3xl shadow-2xl max-w-lg w-full p-8 text-center space-y-6 relative overflow-hidden">
            <div className="w-20 h-20 bg-emerald-500/20 text-emerald-500 rounded-full flex items-center justify-center mx-auto shadow-inner border border-emerald-500/40">
              <CheckCircle2 size={44} className="animate-bounce" />
            </div>

            <div className="space-y-2">
              <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">
                Protocolo Gerado com Sucesso
              </span>
              <h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                {createdProtocolModal.protocolo}
              </h3>
              <p className="text-sm font-bold text-slate-600 dark:text-slate-300">
                Campanha: "{createdProtocolModal.nome_campanha}"
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-2 text-xs">
              <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                <span className="font-bold">Total de Vagas Abertas:</span>
                <strong className="text-slate-900 dark:text-white font-black text-base">{createdProtocolModal.total_vagas_solicitadas} vagas</strong>
              </div>
            </div>

            <div className="flex flex-col gap-3 pt-2">
              <button
                onClick={() => handleExportProtocoloToExcel(createdProtocolModal)}
                className="w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all border border-emerald-400/30"
              >
                <FileSpreadsheet size={18} />
                <span>Exportar Dados para Excel (.xlsx)</span>
              </button>

              <button
                onClick={() => setCreatedProtocolModal(null)}
                className="w-full py-3 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs uppercase tracking-wider transition-all cursor-pointer border border-slate-300 dark:border-slate-700"
              >
                Concluir & Continuar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
