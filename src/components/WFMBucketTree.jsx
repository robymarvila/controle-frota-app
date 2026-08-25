import React, { useState, useEffect } from 'react';
import { 
  ChevronRight, 
  ChevronDown, 
  MapPin, 
  GripVertical, 
  AlertTriangle, 
  Users, 
  Filter, 
  Settings, 
  Plus, 
  Power, 
  Trash2, 
  Edit3, 
  History,
  Folder,
  FolderOpen,
  Layers,
  X,
  Check
} from 'lucide-react';
import { WFMToastList, WFMConfirmModal } from './WFMToast';

const DE_PARA_BASES_PADRAO = {
  'Operação TMA': {
    'Bases Norte': ['Fagundes Filho', 'Cajati', 'Vila Medeiros'],
    'Bases Leste': ['Monte Santo', 'Aricanduva', 'Catumbi', 'Santo André']
  },
  'Operação SOC': {
    'SOC Leste': ['Base SOC Leste 1', 'Base SOC Leste 2']
  },
  'Operação SOT': {
    'SOT Sul': ['SOT Sul 1'],
    'SOT Leste': ['SOT Leste 1'],
    'SOT Norte': ['SOT Norte 1']
  }
};

const STORAGE_KEY_CUSTOM_BUCKETS = 'fleet_wfm_custom_buckets';
const STORAGE_KEY_BUCKET_STATUSES = 'fleet_wfm_bucket_statuses';

export default function WFMBucketTree({ 
  bucketOS = [], 
  auditors = [], 
  selectedBucketName = '', 
  setSelectedBucketName, 
  onAssignAudit,
  onChangeTaskBase,
  onViewDetails,
  escalas = [],
  isConfigMode: externalConfigMode,
  onToggleConfigMode: externalToggleConfigMode,
  showInactive: externalShowInactive,
  setShowInactive: externalSetShowInactive,
  bucketStatuses: externalBucketStatuses,
  onToggleBucketStatus: externalToggleBucketStatus,
  onDeleteBucket: externalDeleteBucket,
  onOpenAddBucket: externalOpenAddBucket,
  onOpenHistory: externalOpenHistory,
  canConfigureBuckets = true
}) {
  const [toasts, setToasts] = useState([]);
  const [confirmModal, setConfirmModal] = useState(null);

  const addToast = (message, type = 'success', title = '') => {
    const id = Date.now() + Math.random().toString();
    const defaultTitle = type === 'success' ? 'Sucesso' : (type === 'error' ? 'Erro' : (type === 'warning' ? 'Atenção' : 'Informação'));
    setToasts(prev => [...prev, { id, message, type, title: title || defaultTitle }]);
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const askConfirm = ({ title, message, confirmText, cancelText, variant, onConfirm }) => {
    setConfirmModal({
      isOpen: true,
      title,
      message,
      confirmText: confirmText || 'Confirmar',
      cancelText: cancelText || 'Cancelar',
      variant: variant || 'danger',
      onConfirm: () => {
        setConfirmModal(null);
        if (onConfirm) onConfirm();
      },
      onCancel: () => setConfirmModal(null)
    });
  };

  const [expandedNodes, setExpandedNodes] = useState({
    'Operação TMA': true, 
    'Bases Norte': true,
    'Verificação Manual': true,
    'Auditores abaixo': true
  });

  // Modal de criação de Bucket Pai / Filho
  const [showAddModal, setShowAddModal] = useState(false);
  const [newBucketName, setNewBucketName] = useState('');
  const [newBucketType, setNewBucketType] = useState('pai'); // 'pai' | 'filho'
  const [selectedParentBucket, setSelectedParentBucket] = useState('');
  const [customTree, setCustomTree] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_CUSTOM_BUCKETS);
      return saved ? JSON.parse(saved) : DE_PARA_BASES_PADRAO;
    } catch {
      return DE_PARA_BASES_PADRAO;
    }
  });

  const [localBucketStatuses, setLocalBucketStatuses] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_BUCKET_STATUSES);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const [localConfigMode, setLocalConfigMode] = useState(false);
  const [localShowInactive, setLocalShowInactive] = useState(false);

  const isConfigMode = externalConfigMode !== undefined ? externalConfigMode : localConfigMode;
  const showInactive = externalShowInactive !== undefined ? externalShowInactive : localShowInactive;
  const bucketStatuses = externalBucketStatuses || localBucketStatuses;

  const saveCustomTree = (newTree) => {
    setCustomTree(newTree);
    try {
      localStorage.setItem(STORAGE_KEY_CUSTOM_BUCKETS, JSON.stringify(newTree));
    } catch (e) {
      console.error("Error saving custom buckets:", e);
    }
  };

  const saveBucketStatuses = (statuses) => {
    setLocalBucketStatuses(statuses);
    try {
      localStorage.setItem(STORAGE_KEY_BUCKET_STATUSES, JSON.stringify(statuses));
    } catch (e) {
      console.error("Error saving bucket statuses:", e);
    }
  };

  const toggleNode = (nodeName) => {
    setExpandedNodes(p => ({ ...p, [nodeName]: !p[nodeName] }));
  };

  const cleanBaseName = (name) => {
    if (!name) return '';
    return name.replace(/^base\s+/i, '').trim().toLowerCase();
  };

  // Obter todos os possíveis pais na árvore para o dropdown do modal
  const getAllParentOptions = () => {
    const parents = [];
    const traverse = (node, path = []) => {
      if (typeof node === 'object' && !Array.isArray(node)) {
        Object.keys(node).forEach(key => {
          parents.push({
            name: key,
            label: path.length > 0 ? `${path.join(' ➔ ')} ➔ ${key}` : key,
            level: path.length
          });
          traverse(node[key], [...path, key]);
        });
      }
    };
    traverse(customTree);
    return parents;
  };

  // Criar novo Bucket
  const handleCreateBucket = (e) => {
    e.preventDefault();
    if (!newBucketName.trim()) return;

    const treeCopy = JSON.parse(JSON.stringify(customTree));

    if (newBucketType === 'pai' || !selectedParentBucket) {
      // Cria como raiz
      if (!treeCopy[newBucketName.trim()]) {
        treeCopy[newBucketName.trim()] = {};
      }
    } else {
      // Adiciona como filho no pai selecionado
      let inserted = false;
      const addToParent = (node) => {
        if (typeof node === 'object' && !Array.isArray(node)) {
          for (const key of Object.keys(node)) {
            if (key === selectedParentBucket) {
              if (Array.isArray(node[key])) {
                // Se era array de bases, converte para objeto com sub-base
                node[key] = { [newBucketName.trim()]: [] };
              } else if (typeof node[key] === 'object') {
                if (!node[key][newBucketName.trim()]) {
                  node[key][newBucketName.trim()] = [];
                }
              }
              inserted = true;
              return;
            }
            addToParent(node[key]);
            if (inserted) return;
          }
        }
      };
      addToParent(treeCopy);
    }

    saveCustomTree(treeCopy);
    setExpandedNodes(p => ({ ...p, [newBucketName.trim()]: true, [selectedParentBucket]: true }));
    setNewBucketName('');
    setShowAddModal(false);
  };

  // Excluir Bucket
  const handleDeleteNode = (nodeNameToDelete) => {
    if (externalDeleteBucket) {
      externalDeleteBucket(nodeNameToDelete);
      return;
    }
    askConfirm({
      title: 'Remover Bucket',
      message: `Deseja realmente remover permanentemente o Bucket "${nodeNameToDelete}"?`,
      confirmText: 'Remover Bucket',
      variant: 'danger',
      onConfirm: () => {
        const treeCopy = JSON.parse(JSON.stringify(customTree));
        const deleteRecursive = (node) => {
          if (typeof node === 'object' && !Array.isArray(node)) {
            for (const key of Object.keys(node)) {
              if (key === nodeNameToDelete) {
                delete node[key];
                return true;
              }
              if (deleteRecursive(node[key])) return true;
            }
          }
          return false;
        };

        deleteRecursive(treeCopy);
        saveCustomTree(treeCopy);
        addToast(`Bucket "${nodeNameToDelete}" removido com sucesso!`, 'success');
      }
    });
  };

  // Alternar Ativo/Inativo
  const handleToggleStatus = (nodeName) => {
    if (externalToggleBucketStatus) {
      externalToggleBucketStatus(nodeName);
      return;
    }
    const current = localBucketStatuses[nodeName] || 'ATIVO';
    const nextStatus = current === 'ATIVO' ? 'INATIVO' : 'ATIVO';
    saveBucketStatuses({ ...localBucketStatuses, [nodeName]: nextStatus });
  };

  // Estrutura dinâmica com OSs distribuídas
  const treeData = {
    'Verificação Manual': []
  };

  // Constroi a estrutura baseada em customTree
  const buildEmptyTree = (source, target) => {
    Object.keys(source).forEach(key => {
      const isKeyActive = bucketStatuses[key] !== 'INATIVO';
      if (!showInactive && !isKeyActive) return;

      if (Array.isArray(source[key])) {
        target[key] = [];
      } else if (typeof source[key] === 'object' && source[key] !== null) {
        target[key] = {};
        buildEmptyTree(source[key], target[key]);
      }
    });
  };

  buildEmptyTree(customTree, treeData);

  // Distribuir OSs nos nós folha da árvore
  bucketOS.forEach(fa => {
    const baseName = cleanBaseName(fa.os_data?.base_contrato || fa.payload_dados?.base_contrato);
    let found = false;

    const matchAndPush = (node, nodeName) => {
      if (Array.isArray(node)) {
        if (cleanBaseName(nodeName) === baseName) {
          node.push(fa);
          found = true;
          return true;
        }
      } else if (typeof node === 'object' && node !== null) {
        for (const childKey of Object.keys(node)) {
          if (cleanBaseName(childKey) === baseName && Array.isArray(node[childKey])) {
            node[childKey].push(fa);
            found = true;
            return true;
          }
          if (matchAndPush(node[childKey], childKey)) {
            return true;
          }
        }
      }
      return false;
    };

    matchAndPush(treeData, '');

    if (!found) {
      treeData['Verificação Manual'].push(fa);
    }
  });

  const getBranchTotal = (branch) => {
    if (!branch) return 0;
    if (Array.isArray(branch)) return branch.length;
    let total = 0;
    for (const key of Object.keys(branch)) {
      total += getBranchTotal(branch[key]);
    }
    return total;
  };

  const handleSelectBucket = (name) => {
    setSelectedBucketName(name);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDropToAuditor = (e, auditorLogin) => {
    e.preventDefault();
    const escala = escalas.find(esc => esc.auditor === auditorLogin);
    if (!escala) {
      addToast('Não é possível alocar atividades para este auditor hoje: Auditor sem escala habilitada.', 'warning', 'Escala Inativa');
      return;
    }

    try {
      const dataStr = e.dataTransfer.getData('application/json');
      if (!dataStr) return;
      const task = JSON.parse(dataStr);
      if (onAssignAudit) {
        onAssignAudit(task, auditorLogin, null, null);
        addToast(`OS alocada com sucesso para ${auditorLogin}!`, 'success', 'Alocação Concluída');
      }
    } catch (err) {
      console.error("Error dropping task to auditor:", err);
      addToast('Erro ao alocar auditor: ' + err.message, 'error');
    }
  };

  const handleDropToBase = (e, baseName) => {
    e.preventDefault();
    try {
      const dataStr = e.dataTransfer.getData('application/json');
      if (!dataStr) return;
      const task = JSON.parse(dataStr);
      if (onChangeTaskBase) {
        onChangeTaskBase(task, baseName);
        addToast(`Base da OS alterada para ${baseName}!`, 'success', 'Transferência de Base');
      }
    } catch (err) {
      console.error("Error dropping task to base:", err);
      addToast('Erro ao alterar base: ' + err.message, 'error');
    }
  };

  const renderTree = (nodeData, nodeName, depth = 0) => {
    if (!nodeData && !Array.isArray(nodeData)) return null;
    const total = getBranchTotal(nodeData);
    const isLeaf = Array.isArray(nodeData);
    const isExpanded = !!expandedNodes[nodeName];
    const isSelected = selectedBucketName === nodeName;
    const isInactive = bucketStatuses[nodeName] === 'INATIVO';

    // Ícone correspondente ao nível de profundidade no estilo Dispatch Console
    let nodeIcon = <Folder size={14} className="text-blue-500 shrink-0" />;
    if (isExpanded && !isLeaf) {
      nodeIcon = <FolderOpen size={14} className="text-blue-600 shrink-0" />;
    }
    if (depth >= 2 && !isLeaf) {
      nodeIcon = <Layers size={13} className="text-indigo-500 shrink-0" />;
    }
    if (isLeaf) {
      nodeIcon = <MapPin size={13} className={isSelected ? 'text-blue-600 shrink-0' : 'text-slate-400 shrink-0'} />;
    }
    if (nodeName === 'Verificação Manual') {
      nodeIcon = <AlertTriangle size={14} className="text-amber-500 shrink-0" />;
    }

    return (
      <div key={nodeName} className="mt-0.5 select-none">
        <div
          onDragOver={handleDragOver}
          onDrop={(e) => isLeaf ? handleDropToBase(e, nodeName) : null}
          className={`group relative ${isInactive ? 'opacity-50' : ''}`}
        >
          <div 
            className={`w-full flex items-center justify-between p-2 rounded-xl transition-all duration-150 text-left cursor-pointer
              ${isSelected 
                ? 'bg-blue-50/90 text-blue-800 border border-blue-200/80 shadow-xs' 
                : 'hover:bg-slate-100/70 text-slate-700 border border-transparent'
              }
            `}
            style={{ paddingLeft: `${(depth * 14) + 8}px` }}
            onClick={() => {
              handleSelectBucket(nodeName);
              if (!isLeaf) toggleNode(nodeName);
            }}
          >
            <div className="flex items-center gap-1.5 overflow-hidden min-w-0">
              {isConfigMode && (
                <span className="cursor-grab text-slate-300 hover:text-slate-500">
                  <GripVertical size={12} />
                </span>
              )}
              {!isLeaf && (
                <span className="text-slate-400 group-hover:text-slate-600 transition-transform">
                  {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </span>
              )}
              {isLeaf && <div className="w-3.5 shrink-0" />}
              
              {nodeIcon}
              
              <span className={`text-xs tracking-tight truncate ${depth === 0 ? 'font-black text-slate-800' : depth === 1 ? 'font-bold text-slate-700' : 'font-semibold text-slate-600'}`}>
                {nodeName}
              </span>

              {isInactive && (
                <span className="text-[9px] font-black uppercase text-amber-700 bg-amber-100/80 px-1.5 py-0.5 rounded">Inativo</span>
              )}
            </div>
            
            <div className="flex items-center gap-1.5 shrink-0" onClick={e => e.stopPropagation()}>
              {isConfigMode && nodeName !== 'Verificação Manual' && (
                <div className="flex items-center gap-1">
                  <button 
                    title={isInactive ? "Reativar Bucket" : "Inativar Bucket"}
                    onClick={() => handleToggleStatus(nodeName)}
                    className={`p-1 rounded-md transition-colors ${isInactive ? 'text-amber-600 hover:bg-amber-100' : 'text-emerald-600 hover:bg-emerald-100'}`}
                  >
                    <Power size={13} />
                  </button>
                  <button 
                    title="Excluir Bucket"
                    onClick={() => handleDeleteNode(nodeName)}
                    className="p-1 rounded-md text-rose-500 hover:bg-rose-100 transition-colors"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              )}

              {!isConfigMode && isLeaf && (
                <span className="opacity-0 group-hover:opacity-100 transition-opacity text-[9px] font-black text-blue-600 uppercase bg-blue-100/70 px-1.5 py-0.5 rounded">Soltar OS</span>
              )}

              {/* Badge de Contagem estilo Dispatch Console: (4) */}
              <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${total > 0 ? (isSelected ? 'bg-blue-600 text-white' : 'bg-slate-200/80 text-slate-800 font-black') : 'bg-slate-100 text-slate-400'}`}>
                ({total})
              </span>
            </div>
          </div>
        </div>

        {!isLeaf && isExpanded && nodeData && (
          <div className="mt-0.5">
            {Object.keys(nodeData).map(childName => renderTree(nodeData[childName], childName, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  const renderAuditorsBranch = () => {
    const isExpanded = !!expandedNodes['Auditores abaixo'];
    return (
      <div className="mt-2 pt-2 border-t border-slate-100">
        <button 
          onClick={() => toggleNode('Auditores abaixo')}
          className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 transition-colors text-left"
          style={{ paddingLeft: '8px' }}
        >
          <div className="flex items-center gap-2">
            {isExpanded ? <ChevronDown size={14} className="text-slate-400" /> : <ChevronRight size={14} className="text-slate-400" />}
            <Users size={14} className="text-indigo-600" />
            <span className="text-xs font-black text-slate-800 tracking-wide">Auditores abaixo</span>
          </div>
          <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">({auditors.length})</span>
        </button>

        {isExpanded && (
          <div className="mt-1 ml-4 space-y-0.5">
            {auditors.map(auditor => {
              const isSelected = selectedBucketName === auditor.login;
              return (
                <div 
                  key={auditor.login}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDropToAuditor(e, auditor.login)}
                  onClick={() => handleSelectBucket(auditor.login)}
                  className={`group relative flex items-center justify-between p-2 rounded-xl transition-all duration-200 text-left cursor-pointer active:scale-[0.99]
                    ${isSelected 
                      ? 'bg-gradient-to-r from-indigo-50 to-blue-50/50 text-indigo-700 border border-indigo-100 shadow-xs' 
                      : 'hover:bg-slate-50 text-slate-600 border border-transparent'
                    }
                  `}
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-indigo-600' : 'bg-slate-300'}`} />
                    <span className="text-xs font-bold">{auditor.nome || auditor.login}</span>
                  </div>
                  <span className="opacity-0 group-hover:opacity-100 transition-opacity text-[9px] font-black text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">Designar OS</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const parentOptions = getAllParentOptions();

  return (
    <div className="w-full h-full bg-white flex flex-col overflow-hidden">
      {/* Header with Title and '+' Quick Add Button */}
      <div className="p-3 border-b border-slate-100 shrink-0 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Filter size={14} className="text-blue-600" />
            <h2 className="font-black text-slate-800 text-xs tracking-wider uppercase">
              Buckets / Alocação
            </h2>
            {/* Botão '+' Imediato no Header */}
            <button
              onClick={() => {
                if (externalOpenAddBucket) {
                  externalOpenAddBucket();
                } else {
                  setShowAddModal(true);
                }
              }}
              title="Adicionar Novo Bucket (Pai ou Filho)"
              className="p-1 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white transition-all shadow-2xs active:scale-95 flex items-center justify-center"
            >
              <Plus size={13} className="stroke-[3]" />
            </button>
          </div>
          
          {canConfigureBuckets && (
            <button 
              onClick={externalToggleConfigMode || (() => setLocalConfigMode(!localConfigMode))}
              className={`p-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1 transition-all ${isConfigMode ? 'bg-amber-500 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
              title="Alternar Modo de Configuração"
            >
              <Settings size={12} />
            </button>
          )}
        </div>

        {/* Config controls when enabled */}
        {isConfigMode && (
          <div className="space-y-2 pt-1 border-t border-slate-100 animate-in fade-in duration-200">
            <div className="flex items-center justify-between text-[10px] font-bold">
              <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg">
                <button 
                  onClick={() => {
                    if (externalSetShowInactive) externalSetShowInactive(false);
                    else setLocalShowInactive(false);
                  }}
                  className={`px-2 py-0.5 rounded-md uppercase ${!showInactive ? 'bg-white text-slate-800 font-black shadow-2xs' : 'text-slate-500'}`}
                >
                  Ativos
                </button>
                <button 
                  onClick={() => {
                    if (externalSetShowInactive) externalSetShowInactive(true);
                    else setLocalShowInactive(true);
                  }}
                  className={`px-2 py-0.5 rounded-md uppercase ${showInactive ? 'bg-white text-slate-800 font-black shadow-2xs' : 'text-slate-500'}`}
                >
                  Todos (Inativos)
                </button>
              </div>

              {externalOpenHistory && (
                <button 
                  onClick={externalOpenHistory}
                  className="text-blue-600 hover:text-blue-800 font-black flex items-center gap-1 uppercase"
                  title="Ver Histórico de Auditoria"
                >
                  <History size={12} /> Log
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Tree list */}
      <div className="flex-1 overflow-y-auto p-2.5 space-y-1 custom-scrollbar">
        {renderTree(treeData['Verificação Manual'], 'Verificação Manual')}
        {Object.keys(treeData).filter(k => k !== 'Verificação Manual').map(op => renderTree(treeData[op], op))}
        {renderAuditorsBranch()}
      </div>

      {/* Modal Criar Novo Bucket (Pai ou Filho) */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95">
            <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
              <h3 className="font-black text-sm flex items-center gap-2">
                <Plus size={16} className="text-blue-400 stroke-[3]" /> Criar Novo Bucket de Alocação
              </h3>
              <button 
                onClick={() => setShowAddModal(false)}
                className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateBucket} className="p-4 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 mb-1 block">Tipo de Hierarquia</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewBucketType('pai')}
                    className={`py-2 px-3 rounded-xl border text-xs font-black transition-all flex items-center justify-center gap-1.5 ${newBucketType === 'pai' ? 'bg-blue-50 border-blue-600 text-blue-700 shadow-xs' : 'bg-slate-50 border-slate-200 text-slate-600'}`}
                  >
                    <Folder size={14} /> Bucket Pai (Raiz)
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewBucketType('filho')}
                    className={`py-2 px-3 rounded-xl border text-xs font-black transition-all flex items-center justify-center gap-1.5 ${newBucketType === 'filho' ? 'bg-blue-50 border-blue-600 text-blue-700 shadow-xs' : 'bg-slate-50 border-slate-200 text-slate-600'}`}
                  >
                    <Layers size={14} /> Bucket Filho (Sub)
                  </button>
                </div>
              </div>

              {newBucketType === 'filho' && (
                <div>
                  <label className="text-xs font-bold text-slate-700 mb-1 block">Selecione o Bucket Pai</label>
                  <select
                    value={selectedParentBucket}
                    onChange={(e) => setSelectedParentBucket(e.target.value)}
                    className="w-full p-2.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 bg-slate-50 focus:bg-white focus:border-blue-500 focus:outline-none"
                    required={newBucketType === 'filho'}
                  >
                    <option value="">Selecione onde aninhar...</option>
                    {parentOptions.map(opt => (
                      <option key={opt.name} value={opt.name}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="text-xs font-bold text-slate-700 mb-1 block">Nome do Bucket / Base</label>
                <input
                  type="text"
                  value={newBucketName}
                  onChange={(e) => setNewBucketName(e.target.value)}
                  placeholder={newBucketType === 'pai' ? "Ex: Operação Santos" : "Ex: Base Cubatão"}
                  className="w-full p-2.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 bg-slate-50 focus:bg-white focus:border-blue-500 focus:outline-none"
                  required
                  autoFocus
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black rounded-xl shadow-xs transition-all active:scale-98 flex items-center gap-1.5"
                >
                  <Check size={14} /> Salvar Bucket
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── TOAST NOTIFICATIONS & CONFIRM DIALOG ── */}
      <WFMToastList toasts={toasts} onDismiss={removeToast} />
      {confirmModal && <WFMConfirmModal {...confirmModal} />}
    </div>
  );
}
