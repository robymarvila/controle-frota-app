import React, { useState } from 'react';
import { ChevronRight, ChevronDown, MapPin, GripVertical, AlertTriangle, Users, Filter, Settings, Plus, Power, Trash2, Edit3, History } from 'lucide-react';

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

export default function WFMBucketTree({ 
  bucketOS = [], 
  auditors = [], 
  selectedBucketName, 
  setSelectedBucketName, 
  onAssignAudit,
  onChangeTaskBase,
  onViewDetails,
  escalas = [],
  isConfigMode = false,
  onToggleConfigMode,
  showInactive = false,
  setShowInactive,
  bucketStatuses = {},
  onToggleBucketStatus,
  onDeleteBucket,
  onOpenAddBucket,
  onOpenHistory,
  canConfigureBuckets = false
}) {
  const [expandedNodes, setExpandedNodes] = useState({
    'Operação TMA': true, 
    'Bases Norte': true,
    'Verificação Manual': true,
    'Auditores abaixo': true
  });

  const [draggedNode, setDraggedNode] = useState(null);

  const toggleNode = (nodeName) => {
    setExpandedNodes(p => ({ ...p, [nodeName]: !p[nodeName] }));
  };

  const cleanBaseName = (name) => {
    if (!name) return '';
    return name.replace(/^base\s+/i, '').trim().toLowerCase();
  };

  // Build tree structure
  const treeData = {
    'Verificação Manual': []
  };
  
  Object.keys(DE_PARA_BASES_PADRAO).forEach(op => {
    const isOpActive = bucketStatuses[op] !== 'INATIVO';
    if (!showInactive && !isOpActive) return;

    treeData[op] = {};
    Object.keys(DE_PARA_BASES_PADRAO[op]).forEach(reg => {
      const isRegActive = bucketStatuses[reg] !== 'INATIVO';
      if (!showInactive && !isRegActive) return;

      treeData[op][reg] = {};
      DE_PARA_BASES_PADRAO[op][reg].forEach(base => {
        const isBaseActive = bucketStatuses[base] !== 'INATIVO';
        if (!showInactive && !isBaseActive) return;

        treeData[op][reg][base] = [];
      });
    });
  });

  // Distribute OS to standard branches or manual verification
  bucketOS.forEach(fa => {
    const baseName = cleanBaseName(fa.os_data?.base_contrato);
    let found = false;
    
    for (const op of Object.keys(DE_PARA_BASES_PADRAO)) {
      if (treeData[op]) {
        for (const reg of Object.keys(DE_PARA_BASES_PADRAO[op])) {
          if (treeData[op][reg]) {
            const matchingBase = DE_PARA_BASES_PADRAO[op][reg].find(b => cleanBaseName(b) === baseName);
            if (matchingBase && treeData[op][reg][matchingBase]) {
              treeData[op][reg][matchingBase].push(fa);
              found = true;
              break;
            }
          }
        }
      }
      if (found) break;
    }
    
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
      alert('Não é possível alocar atividades para este auditor hoje: Auditor sem escala habilitada.');
      return;
    }

    try {
      const dataStr = e.dataTransfer.getData('application/json');
      if (!dataStr) return;
      const task = JSON.parse(dataStr);
      if (onAssignAudit) {
        onAssignAudit(task, auditorLogin, null, null);
      }
    } catch (err) {
      console.error("Error dropping task to auditor:", err);
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
      }
    } catch (err) {
      console.error("Error dropping task to base:", err);
    }
  };

  const renderTree = (nodeData, nodeName, depth = 0) => {
    if (!nodeData && !Array.isArray(nodeData)) return null;
    const total = getBranchTotal(nodeData);
    const isLeaf = Array.isArray(nodeData);
    const isExpanded = !!expandedNodes[nodeName];
    const isSelected = selectedBucketName === nodeName;
    const isInactive = bucketStatuses[nodeName] === 'INATIVO';

    return (
      <div key={nodeName} className="mt-0.5">
        <div
          onDragOver={handleDragOver}
          onDrop={(e) => isLeaf ? handleDropToBase(e, nodeName) : null}
          className={`group relative ${isInactive ? 'opacity-50' : ''}`}
        >
          <div 
            className={`w-full flex items-center justify-between p-2 rounded-xl transition-all duration-200 text-left cursor-pointer
              ${isSelected 
                ? 'bg-gradient-to-r from-blue-50 to-indigo-50/50 text-blue-700 border border-blue-100 shadow-sm' 
                : 'hover:bg-slate-50 text-slate-700 border border-transparent'
              }
            `}
            style={{ paddingLeft: `${(depth * 14) + 8}px` }}
            onClick={() => {
              handleSelectBucket(nodeName);
              if (!isLeaf) toggleNode(nodeName);
            }}
          >
            <div className="flex items-center gap-2 overflow-hidden">
              {isConfigMode && (
                <span className="cursor-grab text-slate-300 hover:text-slate-500">
                  <GripVertical size={12} />
                </span>
              )}
              {!isLeaf && (
                isExpanded 
                  ? <ChevronDown size={14} className="text-slate-400 group-hover:text-slate-600 transition-colors shrink-0" /> 
                  : <ChevronRight size={14} className="text-slate-400 group-hover:text-slate-600 transition-colors shrink-0" />
              )}
              {isLeaf && <div className="w-3.5 shrink-0" />}
              
              {nodeName === 'Verificação Manual' ? (
                <AlertTriangle size={14} className="text-amber-500 shrink-0" />
              ) : isLeaf ? (
                <MapPin size={13} className={isSelected ? 'text-blue-500 shrink-0' : 'text-slate-400 shrink-0'} />
              ) : null}
              
              <span className={`text-xs tracking-wide truncate ${depth === 0 ? 'font-black text-slate-800' : depth === 1 ? 'font-bold text-slate-700' : 'font-medium text-slate-600'}`}>
                {nodeName}
              </span>
              {isInactive && (
                <span className="text-[9px] font-black uppercase text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">Inativo</span>
              )}
            </div>
            
            <div className="flex items-center gap-1.5 shrink-0" onClick={e => e.stopPropagation()}>
              {isConfigMode && nodeName !== 'Verificação Manual' && (
                <div className="flex items-center gap-1">
                  <button 
                    title={isInactive ? "Reativar Bucket" : "Inativar Bucket"}
                    onClick={() => onToggleBucketStatus && onToggleBucketStatus(nodeName)}
                    className={`p-1 rounded-md transition-colors ${isInactive ? 'text-amber-600 hover:bg-amber-100' : 'text-emerald-600 hover:bg-emerald-100'}`}
                  >
                    <Power size={13} />
                  </button>
                  <button 
                    title="Excluir Bucket"
                    onClick={() => onDeleteBucket && onDeleteBucket(nodeName)}
                    className="p-1 rounded-md text-rose-500 hover:bg-rose-100 transition-colors"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              )}

              {!isConfigMode && isLeaf && (
                <span className="opacity-0 group-hover:opacity-100 transition-opacity text-[9px] font-black text-blue-500 uppercase bg-blue-50/60 px-1.5 py-0.5 rounded">Soltar OS</span>
              )}
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${total > 0 ? 'bg-slate-100 text-slate-600' : 'bg-slate-50 text-slate-400'}`}>
                {total}
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
            <Users size={14} className="text-indigo-500" />
            <span className="text-xs font-black text-slate-800 tracking-wide">Auditores abaixo</span>
          </div>
          <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{auditors.length}</span>
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
                      ? 'bg-gradient-to-r from-indigo-50 to-blue-50/50 text-indigo-700 border border-indigo-100 shadow-sm' 
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

  return (
    <div className="w-full h-full bg-white flex flex-col overflow-hidden">
      {/* Header with Config Toggle */}
      <div className="p-3.5 border-b border-slate-100 shrink-0 space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="font-black text-slate-800 text-xs tracking-wider uppercase flex items-center gap-2">
            <Filter size={14} className="text-blue-600" />
            Buckets / Alocação
          </h2>
          
          {canConfigureBuckets && (
            <button 
              onClick={onToggleConfigMode}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all ${isConfigMode ? 'bg-amber-500 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
              title="Configuração de Buckets"
            >
              <Settings size={12} />
              {isConfigMode ? 'Modo Edição' : 'Configurar'}
            </button>
          )}
        </div>

        {/* Config controls when enabled */}
        {isConfigMode && (
          <div className="space-y-2 pt-1 border-t border-slate-100 animate-in fade-in duration-200">
            <div className="flex items-center justify-between text-[10px] font-bold">
              <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg">
                <button 
                  onClick={() => setShowInactive && setShowInactive(false)}
                  className={`px-2 py-0.5 rounded-md uppercase ${!showInactive ? 'bg-white text-slate-800 font-black shadow-2xs' : 'text-slate-500'}`}
                >
                  Ativos
                </button>
                <button 
                  onClick={() => setShowInactive && setShowInactive(true)}
                  className={`px-2 py-0.5 rounded-md uppercase ${showInactive ? 'bg-white text-slate-800 font-black shadow-2xs' : 'text-slate-500'}`}
                >
                  Todos (Inativos)
                </button>
              </div>

              <button 
                onClick={onOpenHistory}
                className="text-blue-600 hover:text-blue-800 font-black flex items-center gap-1 uppercase"
                title="Ver Histórico de Auditoria"
              >
                <History size={12} /> Log
              </button>
            </div>

            <button 
              onClick={onOpenAddBucket}
              className="w-full py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1 shadow-xs transition-all active:scale-98"
            >
              <Plus size={13} /> Criar Novo Bucket
            </button>
          </div>
        )}
      </div>

      {/* Tree list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1 custom-scrollbar">
        {renderTree(treeData['Verificação Manual'], 'Verificação Manual')}
        {Object.keys(DE_PARA_BASES_PADRAO).map(op => treeData[op] ? renderTree(treeData[op], op) : null)}
        {renderAuditorsBranch()}
      </div>
    </div>
  );
}
