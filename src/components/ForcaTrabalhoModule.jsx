import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Briefcase, TrendingUp, Users, Wrench, Upload, Search, 
  CheckCircle2, AlertTriangle, ArrowUpRight, ArrowDownRight,
  Layers, FileSpreadsheet, Sparkles, X, Clock, ShieldCheck,
  ChevronDown, ChevronRight, UserCheck, Phone, Check, AlertCircle,
  Truck, Radio, Eye, Plus, Edit2, Trash2, UserPlus, UserMinus,
  MapPin, Calendar, HelpCircle, Layers2, Save,
  History, Camera, Bell, Shield, ArrowRight, Info, XCircle, CheckCircle,
  Download, Filter, Minus, Award
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { supabase } from '../supabaseClient';
import EmployeeViews from './EmployeeViews';
import EmployeeProfileModal from './EmployeeProfileModal';
import SolicitacaoVagasRHView from './SolicitacaoVagasRHView';
import initialForcaJsonRaw from '../forcaData.json';

const initialBaseUnificadaFallback = initialForcaJsonRaw.map((item, idx) => ({
  id: item.id || idx + 1,
  matricula: (item.matricula && item.matricula !== 'VERIFICADO OK') ? item.matricula : `MAT-${String(item.id || idx + 1).padStart(4, '0')}`,
  nome: item.nome || `COLABORADOR ${idx + 1}`,
  funcao: String(item.funcao || 'Técnico'),
  status_forca: item.statusForca || item.status_forca || 'Ativo na Força',
  statusForca: item.statusForca || item.status_forca || 'Ativo na Força',
  acao_a_ser_feita: (item.equipe && String(item.equipe).trim().toUpperCase() !== 'SOBRA' && item.equipe !== '--') ? 'Em Equipe' : 'Alocação Pendente',
  equipe: item.equipe || 'Sobra',
  commessa: (item.cnh && item.cnh !== 'ABANDONO' && item.cnh !== '--') ? item.cnh : 'EN43',
  base_ut: 'NORTE',
  subgrupo: 'TMA',
  grupo_folga: item.grupoFolga || '--',
  turno: item.turno || '1 - MANHÃ',
  area_atuacao: item.areaAtuacao || 'NORTE',
  cnh: item.cnh || '',
  cpf: item.cpf || '',
  br0: item.br0 || ''
}));

// Tabela DE > PARA oficial de Commessas fornecida pelo usuário
export const COMMESSA_MAP = {
  'EN53': { regional: 'Norte', tipoOperacao: 'TMA Norte' },
  'EN55': { regional: 'Norte', tipoOperacao: 'SOT Norte' },
  'EN56': { regional: 'Norte', tipoOperacao: 'SOT Norte' },
  'EN5C': { regional: 'Norte', tipoOperacao: 'TMA Norte' },
  'EN43': { regional: 'Norte', tipoOperacao: 'TMA Norte' },
  'EN45': { regional: 'Norte', tipoOperacao: 'SOT Norte' },
  'EN46': { regional: 'Norte', tipoOperacao: 'SOT Norte' },
  'EN4C': { regional: 'Norte', tipoOperacao: 'TMA Norte' },
  'ES71': { regional: 'Sul',   tipoOperacao: 'SOT Sul' },
  'EE93': { regional: 'Leste', tipoOperacao: 'TMA Leste' },
  'EE95': { regional: 'Leste', tipoOperacao: 'TMA Leste' },
  'EEC1': { regional: 'Leste', tipoOperacao: 'SOC Leste' },
  'EEC2': { regional: 'Leste', tipoOperacao: 'SOC Leste' },
  'EEC3': { regional: 'Leste', tipoOperacao: 'SOC Leste' },
};

// Normalizador de Função para unir funções "- N" (Noturnas) com as Diurnas
const normalizeFuncao = (funcStr) => {
  if (!funcStr) return 'NÃO INFORMADO';
  let s = String(funcStr).trim().toUpperCase();
  s = s.replace(/\s*-\s*N$/, '').replace(/\s+N$/, '');
  return s;
};

// Auxiliar inteligente para formatação de horário decimal ou string de acordo com o turno real
const formatHorarioStr = (val, turnoStr = '') => {
  if (val === undefined || val === null || val === '') {
    const t = String(turnoStr || '').toUpperCase();
    if (t.includes('TARDE') || t.includes('2')) return 'DAS 13:00 HORAS';
    if (t.includes('NOITE') || t.includes('3')) return 'DAS 20:00 HORAS';
    return 'DAS 06:00 HORAS';
  }
  if (typeof val === 'number') {
    if (val > 0 && val <= 1) {
      const hours = Math.round(val * 24);
      return `DAS ${String(hours).padStart(2, '0')}:00 HORAS`;
    }
    const hours = Math.round(val);
    return `DAS ${String(hours).padStart(2, '0')}:00 HORAS`;
  }
  if (typeof val === 'string' && val.trim()) {
    const str = val.trim().toUpperCase();
    if (str.includes('HORA')) return str;
    if (str.includes(':')) return `DAS ${str} HORAS`;
    const num = parseFloat(str);
    if (!isNaN(num)) {
      if (num > 0 && num <= 1) {
        const hours = Math.round(num * 24);
        return `DAS ${String(hours).padStart(2, '0')}:00 HORAS`;
      }
      return `DAS ${String(Math.round(num)).padStart(2, '0')}:00 HORAS`;
    }
    return `DAS ${str} HORAS`;
  }
  const t = String(turnoStr || '').toUpperCase();
  if (t.includes('TARDE') || t.includes('2')) return 'DAS 13:00 HORAS';
  if (t.includes('NOITE') || t.includes('3')) return 'DAS 20:00 HORAS';
  return 'DAS 06:00 HORAS';
};

// Cor do badge para o Grupo de Folga (PONTO) - A=Amarelo, B=Verde, C=Azul
const getGrupoBgColor = (grupo) => {
  const g = String(grupo || '').trim().toUpperCase();
  if (g === 'A') return 'bg-amber-400 text-slate-950 font-black shadow-sm';
  if (g === 'B') return 'bg-emerald-400 text-slate-950 font-black shadow-sm';
  if (g === 'C') return 'bg-sky-400 text-slate-950 font-black shadow-sm';
  return 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold';
};

// Componente de Dropdown para Filtro de Seleção Múltipla
function MultiSelectFilterDropdown({ label, options, selectedValues, onChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleOption = (val) => {
    if (selectedValues.includes(val)) {
      onChange(selectedValues.filter(v => v !== val));
    } else {
      onChange([...selectedValues, val]);
    }
  };

  const count = selectedValues.length;

  return (
    <div className="relative shrink-0" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border shadow-xs ${
          count > 0
            ? 'bg-indigo-600 text-white border-indigo-500 shadow-indigo-500/20'
            : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'
        }`}
      >
        <span>{label}</span>
        {count > 0 && (
          <span className="px-1.5 py-0.5 rounded-full bg-white text-indigo-700 text-[10px] font-black flex items-center justify-center">
            {count}
          </span>
        )}
        <ChevronDown size={14} className={isOpen ? 'rotate-180 transition-transform' : 'transition-transform'} />
      </button>

      {isOpen && (
        <div className="absolute left-0 mt-1.5 w-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-2 z-50 animate-in fade-in duration-150 max-h-64 overflow-y-auto space-y-0.5">
          <div className="flex items-center justify-between pb-1.5 border-b border-slate-100 dark:border-slate-800 px-2">
            <span className="text-[10px] font-black uppercase text-slate-400">{label}</span>
            {count > 0 && (
              <button
                type="button"
                onClick={() => onChange([])}
                className="text-[10px] font-bold text-rose-500 hover:underline"
              >
                Limpar
              </button>
            )}
          </div>
          {options.length === 0 ? (
            <div className="text-[11px] text-slate-400 p-2 font-medium">Sem opções</div>
          ) : (
            options.map(opt => {
              const isChecked = selectedValues.includes(opt);
              return (
                <label
                  key={opt}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold cursor-pointer text-slate-700 dark:text-slate-200 select-none"
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggleOption(opt)}
                    className="rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="truncate" title={opt}>{opt}</span>
                </label>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

// Helper seguro para sincronização em lotes com Supabase
const safeSyncToSupabase = async (tableName, cleanPayload, conflictKey = 'matricula', wipeFirst = true) => {
  try {
    let payloadToSync = cleanPayload;
    if (tableName === 'base_unificada') {
      payloadToSync = cleanPayload.map(item => {
        const copy = { ...item };
        delete copy.base_contrato;
        return copy;
      });
    }

    if (wipeFirst) {
      const { error: delErr } = await supabase.from(tableName).delete().neq('id', 0);
      if (delErr) {
        console.warn(`[Supabase Sync] Tabela ${tableName} não disponível no banco. Dados mantidos na memória.`, delErr.message);
        return;
      }
    }
    const chunkSize = 100;
    for (let i = 0; i < payloadToSync.length; i += chunkSize) {
      const chunk = payloadToSync.slice(i, i + chunkSize);
      let insErr;
      if (conflictKey) {
        const res = await supabase.from(tableName).upsert(chunk, { onConflict: conflictKey });
        insErr = res.error;
      } else {
        const res = await supabase.from(tableName).insert(chunk);
        insErr = res.error;
      }

      if (insErr) {
        console.warn(`[Supabase Sync] Erro no lote em ${tableName}:`, insErr.message);
      }
    }
  } catch (err) {
    console.warn(`[Supabase Sync] Exceção ao gravar ${tableName}:`, err);
  }
};

// ==========================================
// HELPERS DE VALIDAÇÃO DE EQUIPE (REGRAS DE FORMAÇÃO)
// ==========================================
const validateEquipeFormation = (membros, veiculo, subgrupo) => {
  const alerts = [];
  if (!membros || membros.length === 0) return alerts;

  const funcoesUpper = membros.map(m => (m.funcao || '').toUpperCase());
  const cnhs = membros.map(m => (m.cnh || 'NP').toUpperCase());
  const veiculoUpper = (veiculo || '').toUpperCase();
  const subgrupoUpper = (subgrupo || '').toUpperCase();

  // Regra 1: Mínimo 2 eletricistas
  const eletricistas = funcoesUpper.filter(f => f.includes('ELET'));
  if (eletricistas.length < 2) {
    alerts.push({ tipo: 'error', mensagem: `Mínimo 2 Eletricistas necessários. Encontrados: ${eletricistas.length}` });
  }

  // Regra 2: CNH D ou Motorista para Cesto
  if (veiculoUpper.includes('CESTO')) {
    const temCnhD = cnhs.some(c => c.includes('D') || c.includes('E'));
    const temMotorista = funcoesUpper.some(f => f.includes('MOTORISTA'));
    if (!temCnhD && !temMotorista) {
      alerts.push({ tipo: 'warning', mensagem: 'Equipe Cesto Aéreo: nenhum membro possui CNH categoria D/E nem o cargo de MOTORISTA (I, II ou Motorista).' });
    }
  }

  // Regra 3: CNH B+ para Leve
  if (veiculoUpper.includes('LEVE')) {
    const temCnhB = cnhs.some(c => c !== 'NP' && c !== '' && (c.includes('B') || c.includes('C') || c.includes('D') || c.includes('E') || c.includes('AB')));
    if (!temCnhB) {
      alerts.push({ tipo: 'warning', mensagem: 'Equipe Leve: nenhum membro possui CNH categoria B ou superior.' });
    }
  }

  // Regra 4: TMA I + TMA II
  if (subgrupoUpper === 'TMA') {
    const temTMA1 = funcoesUpper.some(f => f.includes('TMA I') && !f.includes('TMA II'));
    const temTMA2 = funcoesUpper.some(f => f.includes('TMA II'));
    if (!temTMA1 || !temTMA2) {
      alerts.push({ tipo: 'error', mensagem: `Equipe TMA requer ELET TMA I + ELET TMA II. TMA I: ${temTMA1 ? '✓' : '✗'} | TMA II: ${temTMA2 ? '✓' : '✗'}` });
    }
  }

  // Regra 5: Moto I + Moto II
  if (veiculoUpper.includes('MOTO')) {
    const moto1Count = funcoesUpper.filter(f => f.includes('MOTO I') && !f.includes('MOTO II')).length;
    const moto2Count = funcoesUpper.filter(f => f.includes('MOTO II')).length;
    if (moto1Count === 0 || moto2Count === 0) {
      alerts.push({ tipo: 'error', mensagem: `Equipe Moto requer ELET MOTO I + ELET MOTO II. MOTO I: ${moto1Count} | MOTO II: ${moto2Count}` });
    }
    // Regra 6: Alerta 2x Moto I
    if (moto1Count >= 2 && moto2Count === 0) {
      alerts.push({ tipo: 'warning', mensagem: `Atenção: ${moto1Count}x MOTO I sem nenhum MOTO II na equipe.` });
    }
  }

  return alerts;
};

// Máscara de telefone XX-XXXXX-XXXX
const applyPhoneMask = (value) => {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 2)}-${digits.slice(2)}`;
  return `${digits.slice(0, 2)}-${digits.slice(2, 7)}-${digits.slice(7)}`;
};

// Componente de Célula de Placa Integrada (1 clique = Busca/Filtro, 2 cliques = Lista Completa)
const InlinePlacaCell = ({ eqCode, currentPlaca, mainVeiculo, availablePlacas, onSave }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [mode, setMode] = useState('filter'); // 'filter' (1-click) or 'full' (2-clicks)
  const containerRef = React.useRef(null);

  const handleClick = (e) => {
    e.stopPropagation();
    if (!isOpen) {
      setIsOpen(true);
      setMode('filter');
      setSearchTerm('');
    }
  };

  const handleDoubleClick = (e) => {
    e.stopPropagation();
    setIsOpen(true);
    setMode('full');
    setSearchTerm('');
  };

  const handleSelect = (placa) => {
    setIsOpen(false);
    onSave(eqCode, 'placa_veiculo', placa, currentPlaca);
  };

  const filteredPlacas = useMemo(() => {
    if (mode === 'full' || !searchTerm.trim()) return availablePlacas;
    const term = searchTerm.toLowerCase();
    return availablePlacas.filter(p => p.toLowerCase().includes(term));
  }, [availablePlacas, searchTerm, mode]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative w-full h-full flex items-center justify-center">
      <div 
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        title="1 clique: filtrar placa | 2 cliques: ver todas"
        className="cursor-pointer w-full py-1 px-2 rounded-lg hover:bg-indigo-500/10 transition-colors flex items-center justify-center gap-1 font-mono font-black text-[11px] text-indigo-600 dark:text-indigo-300"
      >
        <Truck size={12} className="text-amber-500 shrink-0" />
        <span>{currentPlaca || '-- PLACA --'}</span>
        <ChevronDown size={11} className="text-slate-400 shrink-0" />
      </div>

      {isOpen && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 w-48 p-2.5 rounded-2xl bg-slate-900 text-white text-xs shadow-2xl z-50 border border-slate-700 animate-in fade-in duration-150">
          <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5 flex items-center justify-between">
            <span>{mode === 'filter' ? '🔍 Filtrar Placa' : '📋 Todas as Placas'}</span>
            <span className="text-[9px] text-indigo-400 font-mono">{mainVeiculo}</span>
          </div>

          <input
            type="text"
            placeholder="Digite para filtrar..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            autoFocus
            className="w-full px-2.5 py-1.5 mb-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-[11px] font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />

          <div className="max-h-36 overflow-y-auto space-y-1 pr-0.5 no-scrollbar">
            <button
              onClick={() => handleSelect('')}
              className={`w-full text-left px-2 py-1 rounded-lg text-[10px] font-mono hover:bg-rose-500/20 text-rose-300 ${!currentPlaca ? 'bg-slate-800 font-bold' : ''}`}
            >
              -- SEM PLACA --
            </button>
            {filteredPlacas.length === 0 ? (
              <p className="text-[10px] text-slate-400 p-1 font-sans">Nenhuma placa encontrada.</p>
            ) : (
              filteredPlacas.map(p => (
                <button
                  key={p}
                  onClick={() => handleSelect(p)}
                  className={`w-full text-left px-2 py-1 rounded-lg text-[11px] font-mono hover:bg-indigo-600 transition-colors ${currentPlaca === p ? 'bg-indigo-600 font-black text-white' : 'text-slate-200'}`}
                >
                  {p}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ==========================================
// PAINEL DE GESTÃO DA FORÇA FORA DE EQUIPE (ULTRA PREMIUM)
// ==========================================
const OutOfTeamManagementPanel = ({ data = [], onEditEmployee }) => {
  const [panelViewMode, setPanelViewMode] = useState('operacional'); // 'operacional' | 'executive'
  const [filterCommessa, setFilterCommessa] = useState('ALL');
  const [filterUt, setFilterUt] = useState('ALL');
  const [filterSubgrupo, setFilterSubgrupo] = useState('ALL');
  const [filterStatusForca, setFilterStatusForca] = useState([]);
  const [filterStatusFalta, setFilterStatusFalta] = useState('ALL');
  const [filterAcao, setFilterAcao] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // 1. Filtrar colaboradores onde acao_a_ser_feita !== 'Em Equipe'
  const notInTeamEmployees = useMemo(() => {
    return (data || []).filter(item => item.acao_a_ser_feita !== 'Em Equipe');
  }, [data]);

  // 2. Extrair opções para os selects
  const commessaOptions = useMemo(() => {
    const set = new Set();
    notInTeamEmployees.forEach(e => set.add(e.commessa || 'SEM COMESSA'));
    return Array.from(set).sort();
  }, [notInTeamEmployees]);

  const utOptions = useMemo(() => {
    const set = new Set();
    notInTeamEmployees.forEach(e => set.add(e.base_ut || 'BASE GERAL'));
    return Array.from(set).sort();
  }, [notInTeamEmployees]);

  const subgrupoOptions = useMemo(() => {
    const set = new Set();
    notInTeamEmployees.forEach(e => set.add(e.subgrupo || 'OUTROS'));
    return Array.from(set).sort();
  }, [notInTeamEmployees]);

  const statusForcaOptions = useMemo(() => {
    const set = new Set();
    notInTeamEmployees.forEach(e => set.add(e.status_forca || 'NÃO INFORMADO'));
    return Array.from(set).sort();
  }, [notInTeamEmployees]);

  const statusFaltaOptions = useMemo(() => {
    const set = new Set();
    notInTeamEmployees.forEach(e => set.add(e.status_falta || 'Sem Falta'));
    return Array.from(set).sort();
  }, [notInTeamEmployees]);

  const acaoOptions = useMemo(() => {
    const set = new Set();
    notInTeamEmployees.forEach(e => set.add(e.acao_a_ser_feita || 'NÃO INFORMADO'));
    return Array.from(set).sort();
  }, [notInTeamEmployees]);

  // 3. Cards de resumo por Status Força
  const statusSummaryCards = useMemo(() => {
    const counts = {};
    notInTeamEmployees.forEach(e => {
      const st = e.status_forca || 'NÃO INFORMADO';
      counts[st] = (counts[st] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [notInTeamEmployees]);

  // 4. Aplicar filtros multi-dimensionais
  const filteredEmployees = useMemo(() => {
    return notInTeamEmployees.filter(e => {
      const com = e.commessa || 'SEM COMESSA';
      const ut = e.base_ut || 'BASE GERAL';
      const sub = e.subgrupo || 'OUTROS';
      const st = e.status_forca || 'NÃO INFORMADO';
      const sf = e.status_falta || 'Sem Falta';
      const ac = e.acao_a_ser_feita || 'NÃO INFORMADO';

      if (filterCommessa !== 'ALL' && com !== filterCommessa) return false;
      if (filterUt !== 'ALL' && ut !== filterUt) return false;
      if (filterSubgrupo !== 'ALL' && sub !== filterSubgrupo) return false;
      if (filterStatusForca.length > 0 && !filterStatusForca.includes(st)) return false;
      if (filterStatusFalta !== 'ALL' && sf !== filterStatusFalta) return false;
      if (filterAcao !== 'ALL' && ac !== filterAcao) return false;

      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        return (
          (e.nome && e.nome.toLowerCase().includes(term)) ||
          (e.matricula && String(e.matricula).includes(term)) ||
          (e.funcao && e.funcao.toLowerCase().includes(term))
        );
      }
      return true;
    });
  }, [notInTeamEmployees, filterCommessa, filterUt, filterSubgrupo, filterStatusForca, filterStatusFalta, filterAcao, searchTerm]);

  // 5. Sub-breakdown por Status Falta dos colaboradores atualmente filtrados
  const statusFaltaSummaryCards = useMemo(() => {
    const counts = {};
    filteredEmployees.forEach(e => {
      const sf = e.status_falta || 'Sem Falta';
      counts[sf] = (counts[sf] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [filteredEmployees]);

  // 6. ESTATÍSTICAS EXECUTIVAS PARA DASHBOARD DA DIRETORIA
  const executiveMetrics = useMemo(() => {
    const totalBase = data.length || 1;
    const totalNotInTeam = notInTeamEmployees.length;
    const pctNotInTeam = ((totalNotInTeam / totalBase) * 100).toFixed(1);
    const pctReadiness = (100 - parseFloat(pctNotInTeam)).toFixed(1);

    // Impacto por Base UT
    const utCounts = {};
    notInTeamEmployees.forEach(e => {
      const u = e.base_ut || 'BASE GERAL';
      utCounts[u] = (utCounts[u] || 0) + 1;
    });
    const utImpact = Object.entries(utCounts)
      .map(([name, count]) => ({
        name,
        count,
        pct: ((count / totalNotInTeam) * 100).toFixed(1)
      }))
      .sort((a, b) => b.count - a.count);

    // Impacto por Commessa
    const comCounts = {};
    notInTeamEmployees.forEach(e => {
      const c = e.commessa || 'SEM COMESSA';
      comCounts[c] = (comCounts[c] || 0) + 1;
    });
    const commessaImpact = Object.entries(comCounts)
      .map(([name, count]) => ({
        name,
        count,
        pct: ((count / totalNotInTeam) * 100).toFixed(1)
      }))
      .sort((a, b) => b.count - a.count);

    // Impacto por Subgrupo / Categoria
    const subCounts = {};
    notInTeamEmployees.forEach(e => {
      const s = e.subgrupo || 'OUTROS';
      subCounts[s] = (subCounts[s] || 0) + 1;
    });
    const subgrupoImpact = Object.entries(subCounts)
      .map(([name, count]) => ({
        name,
        count,
        pct: ((count / totalNotInTeam) * 100).toFixed(1)
      }))
      .sort((a, b) => b.count - a.count);

    // Pareto de Faltas (Status Falta)
    const faltaCounts = {};
    notInTeamEmployees.forEach(e => {
      const sf = e.status_falta || 'Sem Falta';
      faltaCounts[sf] = (faltaCounts[sf] || 0) + 1;
    });
    const faltaPareto = Object.entries(faltaCounts)
      .map(([name, count]) => ({
        name,
        count,
        pct: ((count / totalNotInTeam) * 100).toFixed(1)
      }))
      .sort((a, b) => b.count - a.count);

    return {
      totalBase,
      totalNotInTeam,
      pctNotInTeam,
      pctReadiness,
      utImpact,
      commessaImpact,
      subgrupoImpact,
      faltaPareto
    };
  }, [data, notInTeamEmployees]);

  return (
    <div className="p-6 sm:p-8 rounded-3xl bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 shadow-xl space-y-6 animate-in fade-in duration-300">
      
      {/* PANEL HEADER WITH VIEW MODE TOGGLE */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/60 dark:border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-black bg-rose-500/15 text-rose-600 dark:text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
              <AlertCircle size={14} /> Fora de Equipe ({notInTeamEmployees.length})
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              Impacto no Efetivo Total: {executiveMetrics.pctNotInTeam}%
            </span>
          </div>
          <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight mt-2">
            Gestão da Força Fora de Equipe
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            Monitoramento estratégico e operacional dos colaboradores não alocados em equipes ativas
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* ALTERNADOR DE VISÃO: OPERACIONAL VS DASHBOARD EXECUTIVO */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-inner">
            <button
              type="button"
              onClick={() => setPanelViewMode('operacional')}
              className={`px-3.5 py-2 rounded-xl font-bold text-xs transition-all flex items-center gap-2 cursor-pointer ${
                panelViewMode === 'operacional'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Layers size={14} /> 📋 Visão Operacional
            </button>
            <button
              type="button"
              onClick={() => setPanelViewMode('executive')}
              className={`px-3.5 py-2 rounded-xl font-bold text-xs transition-all flex items-center gap-2 cursor-pointer ${
                panelViewMode === 'executive'
                  ? 'bg-gradient-to-r from-amber-500 to-indigo-600 text-white shadow-md'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Award size={14} /> 💼 Dashboard Executivo (Diretoria)
            </button>
          </div>

          <span className="px-4 py-2 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-black border border-slate-200 dark:border-slate-700">
            {filteredEmployees.length} selecionados
          </span>
        </div>
      </div>

      {/* DASHBOARD EXECUTIVO (DIRETORIA) */}
      {panelViewMode === 'executive' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          
          {/* TOP KPI CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-gradient-to-br from-rose-500/10 via-rose-500/5 to-transparent border border-rose-500/20 relative overflow-hidden">
              <span className="text-[11px] font-black uppercase tracking-wider text-rose-600 dark:text-rose-400 block mb-1">
                Efetivo Fora de Equipe
              </span>
              <div className="text-3xl font-black text-rose-600 dark:text-rose-400">
                {executiveMetrics.totalNotInTeam} <span className="text-xs font-bold text-slate-400">colaboradores</span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 font-medium">
                {executiveMetrics.pctNotInTeam}% do total da base unificada ({executiveMetrics.totalBase})
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent border border-emerald-500/20 relative overflow-hidden">
              <span className="text-[11px] font-black uppercase tracking-wider text-emerald-600 dark:emerald-400 block mb-1">
                Prontidão Operacional
              </span>
              <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400">
                {executiveMetrics.pctReadiness}% <span className="text-xs font-bold text-slate-400">em equipe</span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 font-medium">
                {executiveMetrics.totalBase - executiveMetrics.totalNotInTeam} colaboradores ativos em campo
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/20 relative overflow-hidden">
              <span className="text-[11px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400 block mb-1">
                Maior Concentração de Faltas
              </span>
              <div className="text-2xl font-black text-amber-600 dark:text-amber-400">
                {executiveMetrics.faltaPareto[0]?.name || 'N/A'}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 font-medium">
                {executiveMetrics.faltaPareto[0]?.count || 0} pessoas ({executiveMetrics.faltaPareto[0]?.pct || 0}% do fora de equipe)
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-gradient-to-br from-indigo-500/10 via-indigo-500/5 to-transparent border border-indigo-500/20 relative overflow-hidden">
              <span className="text-[11px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400 block mb-1">
                Base UT de Maior Impacto
              </span>
              <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400">
                {executiveMetrics.utImpact[0]?.name || 'N/A'}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 font-medium">
                {executiveMetrics.utImpact[0]?.count || 0} pessoas ({executiveMetrics.utImpact[0]?.pct || 0}% do total fora de equipe)
              </p>
            </div>
          </div>

          {/* PARETO E IMPACTO PERCENTUAL POR DIMENSÕES */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* PARETO DA FAIXA DE FALTAS (STATUS FALTA) */}
            <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 space-y-4">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                <AlertCircle size={15} className="text-amber-500" /> Pareto da Faixa de Faltas (Status Falta)
              </h4>
              <div className="space-y-3">
                {executiveMetrics.faltaPareto.map(item => (
                  <div key={item.name} className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-slate-700 dark:text-slate-300">{item.name}</span>
                      <span className="text-slate-900 dark:text-white font-black">{item.count} colab. ({item.pct}%)</span>
                    </div>
                    <div className="w-full h-2.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-amber-500 to-rose-500 rounded-full transition-all duration-500"
                        style={{ width: `${item.pct}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* PERCENTUAL DE IMPACTO POR COMMESSA */}
            <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 space-y-4">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                <Layers size={15} className="text-indigo-500" /> % Fora de Equipe por Commessa (Contrato)
              </h4>
              <div className="space-y-3">
                {executiveMetrics.commessaImpact.slice(0, 5).map(item => (
                  <div key={item.name} className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-slate-700 dark:text-slate-300">{item.name}</span>
                      <span className="text-slate-900 dark:text-white font-black">{item.count} colab. ({item.pct}%)</span>
                    </div>
                    <div className="w-full h-2.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-500"
                        style={{ width: `${item.pct}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* MATRIZ RESUMIDA POR SUBGRUPO & BASE UT */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 space-y-4">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                <MapPin size={15} className="text-emerald-500" /> Distribuição por Base UT
              </h4>
              <div className="space-y-3">
                {executiveMetrics.utImpact.map(item => (
                  <div key={item.name} className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{item.name}</span>
                    <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg">
                      {item.count} pessoas ({item.pct}%)
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 space-y-4">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                <Wrench size={15} className="text-indigo-500" /> Distribuição por Subgrupo
              </h4>
              <div className="space-y-3">
                {executiveMetrics.subgrupoImpact.map(item => (
                  <div key={item.name} className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{item.name}</span>
                    <span className="text-xs font-black text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded-lg">
                      {item.count} pessoas ({item.pct}%)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      )}

      {/* VISÃO OPERACIONAL (VISÃO ATUAL) */}
      {panelViewMode === 'operacional' && (
        <>
          {/* CARDS SUMMARY BY STATUS FORCA (MULTI-SELEÇÃO) */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <div className="text-[11px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Layers size={14} className="text-indigo-500" /> Categoria por Status Força
                {filterStatusForca.length > 0 && (
                  <span className="ml-1 px-2.5 py-0.5 rounded-full bg-indigo-600 text-white text-[10px] font-black shadow-xs">
                    {filterStatusForca.length} selecionada(s)
                  </span>
                )}
              </div>
              {filterStatusForca.length > 0 && (
                <button
                  type="button"
                  onClick={() => setFilterStatusForca([])}
                  className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer transition-all"
                >
                  <X size={12} /> Limpar Seleção ({filterStatusForca.length})
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {statusSummaryCards.map(([statusName, count]) => {
                const isSelected = filterStatusForca.includes(statusName);
                return (
                  <button
                    key={statusName}
                    type="button"
                    onClick={() => {
                      setFilterStatusForca(prev =>
                        isSelected
                          ? prev.filter(item => item !== statusName)
                          : [...prev, statusName]
                      );
                    }}
                    className={`p-4 rounded-2xl border text-left transition-all cursor-pointer relative overflow-hidden ${
                      isSelected
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg scale-[1.02] ring-2 ring-indigo-400/50'
                        : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700/80 hover:bg-indigo-50/50 dark:hover:bg-slate-800 text-slate-900 dark:text-white'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className={`text-[10px] font-black uppercase tracking-wider ${
                        isSelected ? 'text-indigo-100' : 'text-slate-400 dark:text-slate-500'
                      }`}>
                        {statusName}
                      </div>
                      {isSelected && (
                        <CheckCircle size={14} className="text-white shrink-0" />
                      )}
                    </div>
                    <div className={`text-2xl font-black ${
                      isSelected ? 'text-white' : 'text-slate-900 dark:text-white'
                    }`}>
                      {count} <span className="text-xs font-semibold">colaboradores</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* SUB-BREAKDOWN POR STATUS FALTA (EXIBIDO DINAMICAMENTE) */}
          {statusFaltaSummaryCards.length > 0 && (
            <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                  <AlertCircle size={14} /> Distribuição de Faltas (Status Falta) nos {filteredEmployees.length} Selecionados:
                </span>
                {filterStatusFalta !== 'ALL' && (
                  <button
                    type="button"
                    onClick={() => setFilterStatusFalta('ALL')}
                    className="text-[11px] font-bold text-amber-600 underline hover:text-amber-800 cursor-pointer"
                  >
                    Limpar filtro de faltas
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                {statusFaltaSummaryCards.map(([sfName, count]) => {
                  const active = filterStatusFalta === sfName;
                  return (
                    <button
                      key={sfName}
                      type="button"
                      onClick={() => setFilterStatusFalta(active ? 'ALL' : sfName)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                        active
                          ? 'bg-amber-600 text-white shadow-md'
                          : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-amber-200 dark:border-amber-900/50 hover:bg-amber-100 dark:hover:bg-slate-700'
                      }`}
                    >
                      <span>{sfName}</span>
                      <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                        active ? 'bg-amber-800 text-white' : 'bg-amber-500/20 text-amber-700 dark:text-amber-300'
                      }`}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* MULTI-DIMENSIONAL FILTERS BAR */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-3">
            <div>
              <label className="block text-[11px] font-black uppercase tracking-wider text-slate-400 mb-1">Commessa</label>
              <select
                value={filterCommessa}
                onChange={e => setFilterCommessa(e.target.value)}
                className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="ALL">Todas as Commessas</option>
                {commessaOptions.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-black uppercase tracking-wider text-slate-400 mb-1">Base UT</label>
              <select
                value={filterUt}
                onChange={e => setFilterUt(e.target.value)}
                className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="ALL">Todas as Bases</option>
                {utOptions.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-black uppercase tracking-wider text-slate-400 mb-1">Subgrupo</label>
              <select
                value={filterSubgrupo}
                onChange={e => setFilterSubgrupo(e.target.value)}
                className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="ALL">Todos os Subgrupos</option>
                {subgrupoOptions.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-black uppercase tracking-wider text-slate-400 mb-1">Status Força</label>
              <MultiSelectFilterDropdown
                label="Status Força"
                options={statusForcaOptions}
                selectedValues={filterStatusForca}
                onChange={setFilterStatusForca}
              />
            </div>

            <div>
              <label className="block text-[11px] font-black uppercase tracking-wider text-slate-400 mb-1">Status Falta</label>
              <select
                value={filterStatusFalta}
                onChange={e => setFilterStatusFalta(e.target.value)}
                className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="ALL">Todas as Faltas</option>
                {statusFaltaOptions.map(sf => <option key={sf} value={sf}>{sf}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-black uppercase tracking-wider text-slate-400 mb-1">Ação a ser Feita</label>
              <select
                value={filterAcao}
                onChange={e => setFilterAcao(e.target.value)}
                className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="ALL">Todas as Ações</option>
                {acaoOptions.map(ac => <option key={ac} value={ac}>{ac}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-black uppercase tracking-wider text-slate-400 mb-1">Buscar</label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 text-slate-400" size={14} />
                <input
                  type="text"
                  placeholder="Nome ou Matrícula..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* TABLE */}
          <div className="overflow-x-auto">
            {filteredEmployees.length === 0 ? (
              <div className="py-12 text-center text-slate-400 font-bold text-xs">
                Nenhum colaborador fora de equipe encontrado com os filtros selecionados.
              </div>
            ) : (
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-black uppercase tracking-wider text-slate-400">
                    <th className="py-3.5 px-4">Nome Completo</th>
                    <th className="py-3.5 px-4">Matrícula</th>
                    <th className="py-3.5 px-4">Função</th>
                    <th className="py-3.5 px-4">Commessa</th>
                    <th className="py-3.5 px-4">Base UT</th>
                    <th className="py-3.5 px-4">Status Força</th>
                    <th className="py-3.5 px-4 bg-amber-500/5">Status Falta (Range)</th>
                    <th className="py-3.5 px-4 bg-amber-500/5 text-center">Qtd. Faltas Atual</th>
                    <th className="py-3.5 px-4">Ação a ser Feita</th>
                    <th className="py-3.5 px-4 text-center">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-semibold">
                  {filteredEmployees.map(emp => {
                    const sFalta = emp.status_falta || 'Sem Falta';
                    const qtdFaltas = Number(emp.qtd_faltas_atual || 0);

                    let badgeColor = 'bg-slate-500/15 text-slate-600 dark:text-slate-400';
                    if (sFalta.includes('Maior') || sFalta.includes('Acima') || sFalta.includes('10 Dias')) {
                      badgeColor = 'bg-rose-500/20 text-rose-700 dark:text-rose-300 font-black';
                    } else if (sFalta.includes('Até 5') || sFalta.includes('Até 3')) {
                      badgeColor = 'bg-amber-500/20 text-amber-700 dark:text-amber-300 font-bold';
                    } else if (sFalta.includes('Sem Falta')) {
                      badgeColor = 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300';
                    } else if (sFalta.includes('INSS')) {
                      badgeColor = 'bg-purple-500/20 text-purple-700 dark:text-purple-300 font-bold';
                    }

                    return (
                      <tr key={emp.id || emp.matricula} className="hover:bg-indigo-50/40 dark:hover:bg-indigo-950/20 transition-colors">
                        <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">{emp.nome || 'N/I'}</td>
                        <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-300">{emp.matricula || '--'}</td>
                        <td className="py-3 px-4 text-indigo-600 dark:text-indigo-400 font-bold">{emp.funcao || 'N/I'}</td>
                        <td className="py-3 px-4 font-bold text-slate-700 dark:text-slate-300">{emp.commessa || 'SEM COMESSA'}</td>
                        <td className="py-3 px-4 text-slate-500">{emp.base_ut || 'BASE GERAL'}</td>
                        <td className="py-3 px-4">
                          <span className="px-2.5 py-1 rounded-lg text-[10px] font-black bg-indigo-500/15 text-indigo-600 dark:text-indigo-400">
                            {emp.status_forca || 'NÃO INFORMADO'}
                          </span>
                        </td>
                        <td className="py-3 px-4 bg-amber-500/5">
                          <span className={`px-2.5 py-1 rounded-lg text-[10px] ${badgeColor}`}>
                            {sFalta}
                          </span>
                        </td>
                        <td className="py-3 px-4 bg-amber-500/5 text-center">
                          <span className={`px-2.5 py-1 rounded-xl text-xs font-black ${
                            qtdFaltas > 10 
                              ? 'bg-rose-600 text-white shadow-md' 
                              : qtdFaltas > 0 
                              ? 'bg-amber-500 text-white' 
                              : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                          }`}>
                            {qtdFaltas} {qtdFaltas === 1 ? 'falta' : 'faltas'}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2.5 py-1 rounded-lg text-[10px] font-black bg-rose-500/15 text-rose-600 dark:text-rose-400">
                            {emp.acao_a_ser_feita || 'NÃO INFORMADO'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => onEditEmployee(emp)}
                            className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow transition-all inline-flex items-center gap-1 cursor-pointer"
                          >
                            <Edit2 size={13} /> Editar
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

    </div>
  );
};

// ==========================================
// MODAL DE LISTA DE COLABORADORES DO NÓ DA MATRIZ
// ==========================================
const NodeEmployeeListModal = ({ nodeData, onClose, onEditEmployee }) => {
  const [search, setSearch] = useState('');

  if (!nodeData) return null;

  const employees = nodeData.employees || [];
  const filtered = employees.filter(emp => {
    if (!search) return true;
    const term = search.toLowerCase();
    return (
      (emp.nome && emp.nome.toLowerCase().includes(term)) ||
      (emp.matricula && String(emp.matricula).includes(term)) ||
      (emp.funcao && emp.funcao.toLowerCase().includes(term)) ||
      (emp.status_forca && emp.status_forca.toLowerCase().includes(term)) ||
      (emp.departamento && emp.departamento.toLowerCase().includes(term))
    );
  });

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-5xl max-h-[85vh] flex flex-col overflow-hidden">
        
        {/* HEADER */}
        <div className="p-6 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-lg bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 text-xs font-black uppercase">
                {nodeData.type || 'Colaboradores'}
              </span>
              <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
                {nodeData.title}
              </h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
              Lista detalhada dos colaboradores pertencentes ao agrupamento selecionado ({filtered.length} de {employees.length})
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-200 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* SEARCH BAR */}
        <div className="p-4 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800">
          <div className="relative">
            <Search className="absolute left-3.5 top-3 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Buscar por Nome, Matrícula, Função ou Departamento..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-semibold focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
        </div>

        {/* TABLE */}
        <div className="overflow-y-auto flex-1 p-4">
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-slate-400 font-bold text-xs">
              Nenhum colaborador encontrado.
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-black uppercase text-slate-400 tracking-wider">
                  <th className="py-3 px-3">Nome</th>
                  <th className="py-3 px-3">Matrícula</th>
                  <th className="py-3 px-3">Função</th>
                  <th className="py-3 px-3">Status Força</th>
                  <th className="py-3 px-3 bg-amber-500/5">Status Falta</th>
                  <th className="py-3 px-3 bg-amber-500/5 text-center">Qtd. Faltas</th>
                  <th className="py-3 px-3">Ação a ser Feita</th>
                  <th className="py-3 px-3">Departamento</th>
                  <th className="py-3 px-3">Dt. Admissão</th>
                  <th className="py-3 px-3 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-semibold">
                {filtered.map(emp => {
                  const sFalta = emp.status_falta || 'Sem Falta';
                  const qtdFaltas = Number(emp.qtd_faltas_atual || 0);
                  return (
                    <tr key={emp.id || emp.matricula} className="hover:bg-indigo-50/40 dark:hover:bg-indigo-950/20 transition-colors">
                      <td className="py-3 px-3 font-bold text-slate-900 dark:text-white">{emp.nome || 'N/I'}</td>
                      <td className="py-3 px-3 font-mono text-slate-600 dark:text-slate-300">{emp.matricula || '--'}</td>
                      <td className="py-3 px-3 text-indigo-600 dark:text-indigo-400 font-bold">{emp.funcao || 'N/I'}</td>
                      <td className="py-3 px-3">
                        <span className="px-2.5 py-1 rounded-lg text-[10px] font-black bg-amber-500/15 text-amber-600 dark:text-amber-400">
                          {emp.status_forca || 'NÃO INFORMADO'}
                        </span>
                      </td>
                      <td className="py-3 px-3 bg-amber-500/5">
                        <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-amber-500/20 text-amber-800 dark:text-amber-300">
                          {sFalta}
                        </span>
                      </td>
                      <td className="py-3 px-3 bg-amber-500/5 text-center">
                        <span className={`px-2 py-0.5 rounded-lg text-[11px] font-black ${
                          qtdFaltas > 10 ? 'bg-rose-600 text-white' : qtdFaltas > 0 ? 'bg-amber-500 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                        }`}>
                          {qtdFaltas}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                          emp.acao_a_ser_feita === 'Em Equipe' ? 'bg-blue-500/15 text-blue-600' : 'bg-slate-500/15 text-slate-600'
                        }`}>
                          {emp.acao_a_ser_feita || 'NÃO INFORMADO'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-500">{emp.departamento || '--'}</td>
                      <td className="py-3 px-3 text-slate-500">{emp.dt_admissao || '--'}</td>
                      <td className="py-3 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => {
                            onClose();
                            onEditEmployee(emp);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow transition-all inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Edit2 size={12} /> Editar
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* FOOTER */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 font-bold text-xs transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// MODAL DE EDIÇÃO ULTRA COMPLETO DE COLABORADOR (46 COLUNAS)
// ==========================================
const FullEmployeeEditModal = ({ employee, onClose, onSave }) => {
  const [formData, setFormData] = useState({ ...employee });
  const [activeTab, setActiveTab] = useState('pessoal');
  const [isSaving, setIsSaving] = useState(false);

  if (!employee) return null;

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    await onSave(formData);
    setIsSaving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        
        {/* HEADER */}
        <div className="p-6 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-lg bg-indigo-600 text-white text-xs font-black uppercase">
                Edição 46 Colunas
              </span>
              <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                {formData.nome || 'Editar Colaborador'}
              </h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
              Matrícula: <strong className="text-slate-700 dark:text-slate-200">{formData.matricula}</strong> | Função: <strong className="text-indigo-600 dark:text-indigo-400">{formData.funcao}</strong>
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-200 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* TABS */}
        <div className="flex items-center gap-1 p-3 bg-slate-100 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 overflow-x-auto">
          {[
            { id: 'pessoal', label: '1. Pessoal & Contratual', icon: Users },
            { id: 'operacional', label: '2. Operacional & Commessa', icon: Briefcase },
            { id: 'status', label: '3. Status & CNH', icon: ShieldCheck },
            { id: 'endereco', label: '4. Endereço & Gestão', icon: MapPin },
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-700/60'
                }`}
              >
                <Icon size={14} /> {tab.label}
              </button>
            );
          })}
        </div>

        {/* FORM CONTENT */}
        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 p-6 space-y-6">
          {activeTab === 'pessoal' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Nome Completo</label>
                <input type="text" value={formData.nome || ''} onChange={e => handleChange('nome', e.target.value)} className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Matrícula</label>
                <input type="text" value={formData.matricula || ''} onChange={e => handleChange('matricula', e.target.value)} className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">CPF</label>
                <input type="text" value={formData.cpf || ''} onChange={e => handleChange('cpf', e.target.value)} className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Cargo / Função</label>
                <input type="text" value={formData.funcao || ''} onChange={e => handleChange('funcao', e.target.value)} className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Filial</label>
                <input type="text" value={formData.filial || ''} onChange={e => handleChange('filial', e.target.value)} className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Departamento</label>
                <input type="text" value={formData.departamento || ''} onChange={e => handleChange('departamento', e.target.value)} className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Diretoria</label>
                <input type="text" value={formData.diretoria || ''} onChange={e => handleChange('diretoria', e.target.value)} className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Centro de Custo</label>
                <input type="text" value={formData.centro_custo || ''} onChange={e => handleChange('centro_custo', e.target.value)} className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Data Admissão</label>
                <input type="text" value={formData.dt_admissao || ''} onChange={e => handleChange('dt_admissao', e.target.value)} className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Data Demissão</label>
                <input type="text" value={formData.dt_demissao || ''} onChange={e => handleChange('dt_demissao', e.target.value)} className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Situação Folha</label>
                <input type="text" value={formData.sit_folha || ''} onChange={e => handleChange('sit_folha', e.target.value)} className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Possui Periculosidade</label>
                <select value={formData.possui_periculosidade || ''} onChange={e => handleChange('possui_periculosidade', e.target.value)} className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="">Selecione...</option>
                  <option value="Sim">Sim</option>
                  <option value="Não">Não</option>
                </select>
              </div>
            </div>
          )}

          {activeTab === 'operacional' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Commessa</label>
                <select value={formData.commessa || ''} onChange={e => handleChange('commessa', e.target.value)} className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="">Selecione...</option>
                  {Object.keys(COMMESSA_MAP).map(c => <option key={c} value={c}>{c}</option>)}
                  <option value="--">SEM COMESSA (--)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Base UT</label>
                <select value={formData.base_ut || ''} onChange={e => handleChange('base_ut', e.target.value)} className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="">Selecione...</option>
                  <option value="BASE NORTE">BASE NORTE</option>
                  <option value="BASE LESTE">BASE LESTE</option>
                  <option value="BASE SUL">BASE SUL</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Subgrupo Operacional</label>
                <select value={formData.subgrupo || ''} onChange={e => handleChange('subgrupo', e.target.value)} className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="">Selecione...</option>
                  <option value="TMA">TMA</option>
                  <option value="LINHA MORTA">LINHA MORTA</option>
                  <option value="LINHA VIVA">LINHA VIVA</option>
                  <option value="SOC">SOC</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Área Atuação</label>
                <input type="text" value={formData.area_atuacao || ''} onChange={e => handleChange('area_atuacao', e.target.value)} className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Equipe</label>
                <input type="text" value={formData.equipe || ''} onChange={e => handleChange('equipe', e.target.value)} className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Veículo / Placa</label>
                <input type="text" value={formData.veiculo || ''} onChange={e => handleChange('veiculo', e.target.value)} className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Horário de Trabalho</label>
                <input type="text" value={formData.horario || ''} onChange={e => handleChange('horario', e.target.value)} className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Turno</label>
                <input type="text" value={formData.turno || ''} onChange={e => handleChange('turno', e.target.value)} className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Grupo de Folga</label>
                <input type="text" value={formData.grupo_folga || ''} onChange={e => handleChange('grupo_folga', e.target.value)} className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Centro Custo Alpitel</label>
                <input type="text" value={formData.centro_custo_alpitel || ''} onChange={e => handleChange('centro_custo_alpitel', e.target.value)} className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Commessa Alpitel</label>
                <input type="text" value={formData.comessa_alpitel || ''} onChange={e => handleChange('comessa_alpitel', e.target.value)} className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Nº Crachá</label>
                <input type="text" value={formData.nro_cracha || ''} onChange={e => handleChange('nro_cracha', e.target.value)} className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
            </div>
          )}

          {activeTab === 'status' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Status Força</label>
                <select value={formData.status_forca || ''} onChange={e => handleChange('status_forca', e.target.value)} className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="Ativo">Ativo</option>
                  <option value="Afastado INSS">Afastado INSS</option>
                  <option value="Férias">Férias</option>
                  <option value="Demitido">Demitido</option>
                  <option value="Treinamento">Treinamento</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Ação a ser Feita</label>
                <select value={formData.acao_a_ser_feita || ''} onChange={e => handleChange('acao_a_ser_feita', e.target.value)} className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="Em Equipe">Em Equipe</option>
                  <option value="Sobra">Sobra</option>
                  <option value="Pendente">Pendente</option>
                  <option value="Remanejamento">Remanejamento</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Status Falta</label>
                <input type="text" value={formData.status_falta || ''} onChange={e => handleChange('status_falta', e.target.value)} className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Qtd. Faltas Atual</label>
                <input type="number" value={formData.qtd_faltas_atual || 0} onChange={e => handleChange('qtd_faltas_atual', Number(e.target.value))} className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Possui CNH</label>
                <select value={formData.cnh || ''} onChange={e => handleChange('cnh', e.target.value)} className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="">Selecione...</option>
                  <option value="Sim">Sim</option>
                  <option value="Não">Não</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Nº CNH</label>
                <input type="text" value={formData.nro_cnh || ''} onChange={e => handleChange('nro_cnh', e.target.value)} className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Categoria CNH</label>
                <input type="text" value={formData.categoria_cnh || ''} onChange={e => handleChange('categoria_cnh', e.target.value)} className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Experiência 1º Período</label>
                <input type="text" value={formData.exp_1_periodo || ''} onChange={e => handleChange('exp_1_periodo', e.target.value)} className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Experiência 2º Período</label>
                <input type="text" value={formData.exp_2_periodo || ''} onChange={e => handleChange('exp_2_periodo', e.target.value)} className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Data Retorno Férias</label>
                <input type="text" value={formData.dt_retorno_ferias || ''} onChange={e => handleChange('dt_retorno_ferias', e.target.value)} className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Chave Primária</label>
                <input type="text" value={formData.chave_primaria || ''} onChange={e => handleChange('chave_primaria', e.target.value)} className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
            </div>
          )}

          {activeTab === 'endereco' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Gestor Direto</label>
                <input type="text" value={formData.gestor || ''} onChange={e => handleChange('gestor', e.target.value)} className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Coordenador</label>
                <input type="text" value={formData.coordenador || ''} onChange={e => handleChange('coordenador', e.target.value)} className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Supervisor</label>
                <input type="text" value={formData.supervisor || ''} onChange={e => handleChange('supervisor', e.target.value)} className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Segmento</label>
                <input type="text" value={formData.segmento || ''} onChange={e => handleChange('segmento', e.target.value)} className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Logradouro</label>
                <input type="text" value={formData.logradouro || ''} onChange={e => handleChange('logradouro', e.target.value)} className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Endereço</label>
                <input type="text" value={formData.endereco || ''} onChange={e => handleChange('endereco', e.target.value)} className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Número Endereço</label>
                <input type="text" value={formData.nro_endereco || ''} onChange={e => handleChange('nro_endereco', e.target.value)} className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Bairro</label>
                <input type="text" value={formData.bairro || ''} onChange={e => handleChange('bairro', e.target.value)} className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Telefone Fixos</label>
                <input type="text" value={formData.telefone || ''} onChange={e => handleChange('telefone', e.target.value)} className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Celular / WhatsApp</label>
                <input type="text" value={formData.celular || ''} onChange={e => handleChange('celular', e.target.value)} className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Classe Custo</label>
                <input type="text" value={formData.classe_custo || ''} onChange={e => handleChange('classe_custo', e.target.value)} className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
            </div>
          )}

          {/* FOOTER BUTTONS */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3 rounded-2xl">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 font-bold text-xs transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs shadow-lg transition-all flex items-center gap-2 cursor-pointer"
            >
              <Save size={16} /> {isSaving ? 'Salvando...' : 'Salvar Alterações (Supabase Realtime)'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ==========================================
// COMPONENTE DE LINHA DRILL-DOWN PARA VISÃO GERAL
// ==========================================
const DrillDownRow = ({ node, level = 0, path = '', onSelectNodeEmployees }) => {
  const [isExpanded, setIsExpanded] = useState(level < 1);
  
  const gapRh = node.rhEntregue - node.orcado;
  const gapOpOrcado = node.emEquipe - node.orcado;
  const gapOpRh = node.emEquipe - node.rhEntregue;
  
  const hasChildren = node.children && Object.keys(node.children).length > 0;
  const currentPath = `${path}/${node.name}`;
  
  const levelColors = [
    'bg-slate-200 dark:bg-slate-800 font-black text-slate-900 dark:text-white',
    'bg-slate-100 dark:bg-slate-800/80 font-bold text-slate-800 dark:text-slate-200',
    'bg-slate-50 dark:bg-slate-900/80 font-bold text-slate-700 dark:text-slate-300',
    'bg-white dark:bg-slate-900 font-semibold text-slate-600 dark:text-slate-400',
    'bg-slate-50/50 dark:bg-slate-900/50 font-medium text-slate-600 dark:text-slate-400',
    'bg-white dark:bg-slate-900 font-normal text-slate-500 dark:text-slate-500'
  ];
  
  const rowClass = levelColors[level] || levelColors[5];

  return (
    <>
      <tr className={`border-b border-slate-200/50 dark:border-slate-800/50 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/20 transition-colors ${rowClass}`}>
        <td className="py-2.5 px-4" style={{ paddingLeft: `${(level * 16) + 16}px` }}>
          <div className="flex items-center gap-2">
            {hasChildren ? (
              <button 
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
            <span className={level === 5 ? "text-indigo-600 dark:text-indigo-400 font-bold" : ""}>
              {node.name || 'NÃO DEFINIDO'}
            </span>
          </div>
        </td>
        <td className="py-2.5 px-4 text-center font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/5">{node.orcado}</td>
        <td className="py-2.5 px-4 text-center bg-amber-500/5">
          <button
            type="button"
            onClick={() => onSelectNodeEmployees && onSelectNodeEmployees({
              title: `2. RH Entregue - ${node.name}`,
              type: 'RH Entregue',
              employees: node.itemsRh || []
            })}
            className="px-2.5 py-1 rounded-lg font-black text-amber-700 dark:text-amber-300 hover:bg-amber-500/20 hover:scale-105 transition-all cursor-pointer inline-flex items-center gap-1"
            title="Clique para ver a lista dos colaboradores contratados"
          >
            {node.rhEntregue}
            <Eye size={12} className="opacity-70" />
          </button>
        </td>
        <td className="py-2.5 px-4 text-center bg-rose-500/5">
          <button
            type="button"
            onClick={() => onSelectNodeEmployees && onSelectNodeEmployees({
              title: `3. Força Op. (Em Equipe) - ${node.name}`,
              type: 'Força Op.',
              employees: node.itemsEquipe || []
            })}
            className="px-2.5 py-1 rounded-lg font-black text-rose-700 dark:text-rose-300 hover:bg-rose-500/20 hover:scale-105 transition-all cursor-pointer inline-flex items-center gap-1"
            title="Clique para ver a lista dos colaboradores alocados em equipe"
          >
            {node.emEquipe}
            <Eye size={12} className="opacity-70" />
          </button>
        </td>
        {/* GAP 1: RH x Budget */}
        <td className="py-2.5 px-4 text-center">
          <span className={`px-2 py-0.5 rounded text-[11px] font-black inline-flex items-center justify-center min-w-[32px] ${
            gapRh >= 0 
              ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300' 
              : 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300'
          }`}>
            {gapRh > 0 ? '+' + gapRh : gapRh}
          </span>
        </td>
        {/* GAP 2: Op x Budget (NOVA COLUNA!) */}
        <td className="py-2.5 px-4 text-center">
          <span className={`px-2 py-0.5 rounded text-[11px] font-black inline-flex items-center justify-center min-w-[32px] ${
            gapOpOrcado >= 0 
              ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300' 
              : 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300'
          }`}>
            {gapOpOrcado > 0 ? '+' + gapOpOrcado : gapOpOrcado}
          </span>
        </td>
        {/* GAP 3: Op x RH */}
        <td className="py-2.5 px-4 text-center">
          <span className={`px-2 py-0.5 rounded text-[11px] font-black inline-flex items-center justify-center min-w-[32px] ${
            gapOpRh >= 0 
              ? 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300' 
              : 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
          }`}>
            {gapOpRh > 0 ? '+' + gapOpRh : gapOpRh}
          </span>
        </td>
      </tr>
      
      {isExpanded && hasChildren && (
        Object.values(node.children)
          .sort((a, b) => a.name.localeCompare(b.name))
          .map((child, idx) => (
            <DrillDownRow 
              key={`${currentPath}-${idx}`} 
              node={child} 
              level={level + 1} 
              path={currentPath}
              onSelectNodeEmployees={onSelectNodeEmployees}
            />
          ))
      )}
    </>
  );
};

// ==========================================
// COMPONENTES DE TABELA PARA INCONSISTÊNCIAS
// ==========================================
const UnmatchedRhTable = ({ data }) => {
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [activeFilter, setActiveFilter] = useState({ key: null, value: null });

  const sortedData = useMemo(() => {
    let sortableItems = [...data];
    
    // 1. Filtrar se houver card selecionado
    if (activeFilter.key && activeFilter.value) {
      sortableItems = sortableItems.filter(item => {
        const itemVal = String(item[activeFilter.key] || 'NÃO INFORMADO');
        return itemVal === activeFilter.value;
      });
    }

    // 2. Ordenar
    if (sortConfig.key !== null) {
      sortableItems.sort((a, b) => {
        const aVal = String(a[sortConfig.key] || '');
        const bVal = String(b[sortConfig.key] || '');
        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return sortableItems;
  }, [data, sortConfig, activeFilter]);

  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sitFolhaCounts = data.reduce((acc, curr) => {
    const val = curr.sit_folha || 'NÃO INFORMADO';
    acc[val] = (acc[val] || 0) + 1;
    return acc;
  }, {});
  
  const comessaCounts = data.reduce((acc, curr) => {
    const val = curr.comessa_alpitel || 'NÃO INFORMADO';
    acc[val] = (acc[val] || 0) + 1;
    return acc;
  }, {});

  const handleFilter = (key, value) => {
    if (activeFilter.key === key && activeFilter.value === value) {
      setActiveFilter({ key: null, value: null }); // Toggle off
    } else {
      setActiveFilter({ key, value });
    }
  };

  return (
    <div className="p-5 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-900/50 space-y-4 transition-all duration-300">
      <h4 className="text-sm font-bold text-amber-800 dark:text-amber-300 flex items-center gap-2">
        <AlertTriangle size={16} /> RH Sem Correspondência no Budget ({data.length})
        {activeFilter.key && (
          <span className="ml-4 px-2 py-0.5 rounded-full bg-amber-200 text-amber-800 text-[10px] uppercase font-black tracking-wider flex items-center gap-1 cursor-pointer hover:bg-amber-300" onClick={() => setActiveFilter({key: null, value: null})}>
            Filtro: {activeFilter.value} <X size={12}/>
          </span>
        )}
      </h4>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-slate-900 rounded-xl p-3 border border-amber-200 dark:border-amber-900 shadow-sm flex flex-col max-h-40">
          <h5 className="text-[10px] font-black uppercase text-amber-600 mb-2">Por Situação Folha</h5>
          <div className="space-y-1 overflow-y-auto pr-1">
            {Object.entries(sitFolhaCounts).sort((a,b)=>b[1]-a[1]).map(([k, v]) => {
              const isActive = activeFilter.key === 'sit_folha' && activeFilter.value === k;
              return (
                <div key={k} onClick={() => handleFilter('sit_folha', k)} className={`flex justify-between items-center px-2 py-1 rounded-lg cursor-pointer transition-colors text-xs font-semibold ${isActive ? 'bg-amber-100 dark:bg-amber-900/50 border border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-100' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50 border border-transparent'}`}>
                  <span className="truncate">{k}</span>
                  <span className={`font-bold shrink-0 ${isActive ? 'text-amber-700 dark:text-amber-200' : 'text-slate-800 dark:text-white'}`}>{v}</span>
                </div>
              );
            })}
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-xl p-3 border border-amber-200 dark:border-amber-900 shadow-sm flex flex-col max-h-40">
          <h5 className="text-[10px] font-black uppercase text-amber-600 mb-2">Por Commessa Alpitel</h5>
          <div className="space-y-1 overflow-y-auto pr-1">
            {Object.entries(comessaCounts).sort((a,b)=>b[1]-a[1]).map(([k, v]) => {
              const isActive = activeFilter.key === 'comessa_alpitel' && activeFilter.value === k;
              return (
                <div key={k} onClick={() => handleFilter('comessa_alpitel', k)} className={`flex justify-between items-center px-2 py-1 rounded-lg cursor-pointer transition-colors text-xs font-semibold ${isActive ? 'bg-amber-100 dark:bg-amber-900/50 border border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-100' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50 border border-transparent'}`}>
                  <span className="truncate">{k}</span>
                  <span className={`font-bold shrink-0 ${isActive ? 'text-amber-700 dark:text-amber-200' : 'text-slate-800 dark:text-white'}`}>{v}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="overflow-x-auto max-h-64 overflow-y-auto border border-amber-200/50 dark:border-amber-900/50 rounded-xl bg-white dark:bg-slate-900">
        <table className="w-full text-left text-xs">
          <thead className="bg-amber-100/80 dark:bg-amber-900/50 sticky top-0 z-10 backdrop-blur-md shadow-sm">
            <tr>
              {['matricula', 'nome', 'funcao', 'chave_primaria'].map(col => (
                <th key={col} onClick={() => requestSort(col)} className="py-2.5 px-3 font-bold text-amber-900 dark:text-amber-200 cursor-pointer hover:bg-amber-200/50 dark:hover:bg-amber-800/50 select-none transition-colors">
                  <div className="flex items-center gap-1">
                    {col === 'chave_primaria' ? 'Chave Buscada' : col.charAt(0).toUpperCase() + col.slice(1)}
                    {sortConfig.key === col && (
                      <span className="text-[10px] text-amber-700 dark:text-amber-300">{sortConfig.direction === 'asc' ? '▲' : '▼'}</span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-amber-200/30 dark:divide-amber-800/30">
            {sortedData.map((r, i) => (
              <tr key={i} className="hover:bg-amber-50/50 dark:hover:bg-amber-900/20">
                <td className="py-2 px-3 font-mono">{r.matricula}</td>
                <td className="py-2 px-3 font-medium">{r.nome}</td>
                <td className="py-2 px-3">{r.funcao}</td>
                <td className="py-2 px-3 font-mono text-rose-600 dark:text-rose-400">{r.chave_primaria}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const UnmatchedForcaTable = ({ data }) => {
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [activeFilter, setActiveFilter] = useState({ key: null, value: null });

  const sortedData = useMemo(() => {
    let sortableItems = [...data];
    
    // 1. Filtrar se houver card selecionado
    if (activeFilter.key && activeFilter.value) {
      sortableItems = sortableItems.filter(item => {
        const itemVal = String(item[activeFilter.key] || 'NÃO INFORMADO');
        return itemVal === activeFilter.value;
      });
    }

    // 2. Ordenar
    if (sortConfig.key !== null) {
      sortableItems.sort((a, b) => {
        const aVal = String(a[sortConfig.key] || '');
        const bVal = String(b[sortConfig.key] || '');
        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return sortableItems;
  }, [data, sortConfig, activeFilter]);

  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    setSortConfig({ key, direction });
  };

  const getCounts = (key) => data.reduce((acc, curr) => {
    const val = curr[key] || 'NÃO INFORMADO';
    acc[val] = (acc[val] || 0) + 1;
    return acc;
  }, {});

  const baseCounts = getCounts('base_ut');
  const statusForcaCounts = getCounts('status_forca');
  const acaoCounts = getCounts('acao_a_ser_feita');
  const statusFaltaCounts = getCounts('status_falta');

  const handleFilter = (key, value) => {
    if (activeFilter.key === key && activeFilter.value === value) {
      setActiveFilter({ key: null, value: null });
    } else {
      setActiveFilter({ key, value });
    }
  };

  const SummaryCard = ({ title, counts, filterKey }) => (
    <div className="bg-white dark:bg-slate-900 rounded-xl p-3 border border-rose-200 dark:border-rose-900 shadow-sm flex flex-col max-h-40">
      <h5 className="text-[10px] font-black uppercase text-rose-600 mb-2">{title}</h5>
      <div className="space-y-1 overflow-y-auto pr-1">
        {Object.entries(counts).sort((a,b)=>b[1]-a[1]).map(([k, v]) => {
          const isActive = activeFilter.key === filterKey && activeFilter.value === k;
          return (
            <div key={k} onClick={() => handleFilter(filterKey, k)} className={`flex justify-between items-center px-2 py-1 rounded-lg cursor-pointer transition-colors text-xs font-semibold gap-2 ${isActive ? 'bg-rose-100 dark:bg-rose-900/50 border border-rose-300 dark:border-rose-700 text-rose-900 dark:text-rose-100' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50 border border-transparent'}`}>
              <span className="truncate" title={k}>{k}</span>
              <span className={`font-bold shrink-0 ${isActive ? 'text-rose-700 dark:text-rose-200' : 'text-slate-800 dark:text-white'}`}>{v}</span>
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="p-5 rounded-2xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200/50 dark:border-rose-900/50 space-y-4 transition-all duration-300">
      <h4 className="text-sm font-bold text-rose-800 dark:text-rose-300 flex items-center gap-2">
        <AlertTriangle size={16} /> Força Operacional Sem Correspondência no Budget ({data.length})
        {activeFilter.key && (
          <span className="ml-4 px-2 py-0.5 rounded-full bg-rose-200 text-rose-800 text-[10px] uppercase font-black tracking-wider flex items-center gap-1 cursor-pointer hover:bg-rose-300" onClick={() => setActiveFilter({key: null, value: null})}>
            Filtro: {activeFilter.value} <X size={12}/>
          </span>
        )}
      </h4>
      
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <SummaryCard title="Por Base UT" counts={baseCounts} filterKey="base_ut" />
        <SummaryCard title="Por Status Força" counts={statusForcaCounts} filterKey="status_forca" />
        <SummaryCard title="Por Ação a ser Feita" counts={acaoCounts} filterKey="acao_a_ser_feita" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <SummaryCard title="Por Status Falta" counts={statusFaltaCounts} filterKey="status_falta" />
      </div>

      <div className="overflow-x-auto max-h-64 overflow-y-auto border border-rose-200/50 dark:border-rose-900/50 rounded-xl bg-white dark:bg-slate-900">
        <table className="w-full text-left text-xs whitespace-nowrap">
          <thead className="bg-rose-100/80 dark:bg-rose-900/50 sticky top-0 z-10 backdrop-blur-md shadow-sm">
            <tr>
              {[
                {k: 'matricula', l: 'Matrícula'}, {k: 'nome', l: 'Nome'}, {k: 'funcao', l: 'Função'},
                {k: 'cnh', l: 'CNH'}, {k: 'dt_admissao', l: 'Dt. Admissão'},
                {k: 'acao_a_ser_feita', l: 'Ação a ser Feita'}, {k: 'grupo_folga', l: 'Grupo Folga'},
                {k: 'status_forca', l: 'Status Força'}, {k: 'chave_primaria', l: 'Chave Buscada'}
              ].map(col => (
                <th key={col.k} onClick={() => requestSort(col.k)} className="py-2.5 px-3 font-bold text-rose-900 dark:text-rose-200 cursor-pointer hover:bg-rose-200/50 dark:hover:bg-rose-800/50 select-none transition-colors">
                  <div className="flex items-center gap-1">
                    {col.l}
                    {sortConfig.key === col.k && (
                      <span className="text-[10px] text-rose-700 dark:text-rose-300">{sortConfig.direction === 'asc' ? '▲' : '▼'}</span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-rose-200/30 dark:divide-rose-800/30">
            {sortedData.map((f, i) => (
              <tr key={i} className="hover:bg-rose-50/50 dark:hover:bg-rose-900/20">
                <td className="py-2 px-3 font-mono">{f.matricula}</td>
                <td className="py-2 px-3 font-medium">{f.nome}</td>
                <td className="py-2 px-3">{f.funcao}</td>
                <td className="py-2 px-3">{f.cnh}</td>
                <td className="py-2 px-3">{f.dt_admissao}</td>
                <td className="py-2 px-3">{f.acao_a_ser_feita}</td>
                <td className="py-2 px-3">{f.grupo_folga}</td>
                <td className="py-2 px-3">
                  <span className="px-2 py-0.5 rounded-full bg-rose-200/50 dark:bg-rose-800/50 text-[10px] font-bold">
                    {f.status_forca}
                  </span>
                </td>
                <td className="py-2 px-3 font-mono text-rose-600 dark:text-rose-400">{f.chave_primaria}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default function ForcaTrabalhoModule({ currentUser, userPermissions, vehicles = [] }) {
  // Aba interna ativa: 'visao_geral' | 'budget' | 'rh' | 'operacao'
  const [activeSubTab, setActiveSubTab] = useState('visao_geral');
  const [operacaoViewMode, setOperacaoViewMode] = useState('equipes'); // 'equipes' | 'colaboradores'
  const [editingEmployee, setEditingEmployee] = useState(null);

  // ==============================================================================
  // CONTROLE DE ACESSOS E PRIVILÉGIOS GRANULARES (MATRIZ DE ACESSO SUPABASE)
  // ==============================================================================
  const isMasterAdmin = useMemo(() => {
    const perfilUpper = String(currentUser?.perfil || '').trim().toUpperCase();
    return perfilUpper === 'ADMINISTRADOR' || currentUser?.isAdmin === true;
  }, [currentUser]);

  const canEditColaborador = useMemo(() => {
    if (isMasterAdmin) return true;
    if (userPermissions?.permissoes_edicao?.forca_editar_colaborador !== undefined) {
      return userPermissions.permissoes_edicao.forca_editar_colaborador === true;
    }
    const allowed = ['COORDENADOR', 'GERENTE', 'ADMINISTRADOR', 'ADMIN'];
    return allowed.includes(String(currentUser?.perfil || '').trim().toUpperCase());
  }, [currentUser, userPermissions, isMasterAdmin]);

  const canEditVagas = useMemo(() => {
    if (isMasterAdmin) return true;
    if (userPermissions?.permissoes_edicao?.forca_editar_vagas !== undefined) {
      return userPermissions.permissoes_edicao.forca_editar_vagas === true;
    }
    const allowed = ['COORDENADOR', 'GERENTE', 'ADMINISTRADOR', 'ADMIN'];
    return allowed.includes(String(currentUser?.perfil || '').trim().toUpperCase());
  }, [currentUser, userPermissions, isMasterAdmin]);

  const canCarregarBudget = useMemo(() => {
    if (isMasterAdmin) return true;
    if (userPermissions?.permissoes_edicao?.forca_carregar_budget !== undefined) {
      return userPermissions.permissoes_edicao.forca_carregar_budget === true;
    }
    const allowed = ['COORDENADOR', 'GERENTE', 'ADMINISTRADOR', 'ADMIN'];
    return allowed.includes(String(currentUser?.perfil || '').trim().toUpperCase());
  }, [currentUser, userPermissions, isMasterAdmin]);

  const canCarregarForcaOp = useMemo(() => {
    if (isMasterAdmin) return true;
    if (userPermissions?.permissoes_edicao?.forca_carregar_forca_op !== undefined) {
      return userPermissions.permissoes_edicao.forca_carregar_forca_op === true;
    }
    const allowed = ['COORDENADOR', 'GERENTE', 'ADMINISTRADOR', 'ADMIN'];
    return allowed.includes(String(currentUser?.perfil || '').trim().toUpperCase());
  }, [currentUser, userPermissions, isMasterAdmin]);

  const canFormarEquipe = useMemo(() => {
    if (isMasterAdmin) return true;
    if (userPermissions?.permissoes_edicao?.forca_formar_equipe !== undefined) {
      return userPermissions.permissoes_edicao.forca_formar_equipe === true;
    }
    const allowed = ['COORDENADOR', 'GERENTE', 'ADMINISTRADOR', 'ADMIN'];
    return allowed.includes(String(currentUser?.perfil || '').trim().toUpperCase());
  }, [currentUser, userPermissions, isMasterAdmin]);

  // canEditDirectly mantido apontando para canEditColaborador
  const canEditDirectly = canEditColaborador;

  // Estados dos Datasets principais
  const [budgetData, setBudgetData] = useState(() => {
    try {
      const cached = localStorage.getItem('fleet_budget_forca_cache');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return [];
  });
  const [baseUnificadaData, setBaseUnificadaData] = useState(() => {
    try {
      const cached = localStorage.getItem('fleet_base_unificada_cache');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return initialBaseUnificadaFallback;
  });
  const [matrixViewMode, setMatrixViewMode] = useState('budget_full'); // 'budget_full' | 'budget_simple' | 'operacional_status'
  const [selectedNodeEmployees, setSelectedNodeEmployees] = useState(null);
  
  const forcaData = useMemo(() => baseUnificadaData, [baseUnificadaData]);
  const rhData = useMemo(() => baseUnificadaData, [baseUnificadaData]);
  
  const setForcaData = useCallback((valOrFn) => {
    setBaseUnificadaData(prev => typeof valOrFn === 'function' ? valOrFn(prev) : valOrFn);
  }, []);
  const setRhData = setBaseUnificadaData;

  const [vehiclesDb, setVehiclesDb] = useState([]);

  const handleExportFullBase = () => {
    if (!baseUnificadaData || baseUnificadaData.length === 0) return;
    
    const formattedRows = baseUnificadaData.map(emp => ({
      'Matrícula': emp.matricula || '',
      'Chave Primária': emp.chave_primaria || '',
      'Nome': emp.nome || '',
      'Função': emp.funcao || '',
      'Qtd. Faltas Atual': emp.qtd_faltas_atual ?? 0,
      'Status Falta': emp.status_falta || '',
      'Base UT': emp.base_ut || '',
      'Status Força': emp.status_forca || '',
      'Ação a ser Feita': emp.acao_a_ser_feita || '',
      'Grupo Folga': emp.grupo_folga || '',
      'Commessa': emp.commessa || '',
      'Horário': emp.horario || '',
      'Equipe': emp.equipe || '',
      'Veículo': emp.veiculo || '',
      'Turno': emp.turno || '',
      'Área Atuação': emp.area_atuacao || '',
      'Subgrupo': emp.subgrupo || '',
      'CNH': emp.cnh || '',
      'Filial': emp.filial || '',
      'Dt. Admissão': emp.dt_admissao || '',
      'Dt. Demissão': emp.dt_demissao || '',
      'Sit. Folha': emp.sit_folha || '',
      'Possui Periculosidade': emp.possui_periculosidade || '',
      'Diretoria': emp.diretoria || '',
      'Centro de Custo': emp.centro_custo || '',
      'Classe Custo': emp.classe_custo || '',
      'Segmento': emp.segmento || '',
      'Departamento': emp.departamento || '',
      'Gestor': emp.gestor || '',
      'Coordenador': emp.coordenador || '',
      'Supervisor': emp.supervisor || '',
      'Exp. 1º Período': emp.exp_1_periodo || '',
      'Exp. 2º Período': emp.exp_2_periodo || '',
      'Nº CNH': emp.nro_cnh || '',
      'Categoria CNH': emp.categoria_cnh || '',
      'Logradouro': emp.logradouro || '',
      'Endereço': emp.endereco || '',
      'Nº Endereço': emp.nro_endereco || '',
      'Bairro': emp.bairro || '',
      'Telefone': emp.telefone || '',
      'Celular': emp.celular || '',
      'CPF': emp.cpf || '',
      'Centro Custo Alpitel': emp.centro_custo_alpitel || '',
      'Commessa Alpitel': emp.comessa_alpitel || '',
      'Dt. Retorno Férias': emp.dt_retorno_ferias || '',
      'Nº Crachá': emp.nro_cracha || ''
    }));

    const worksheet = XLSX.utils.json_to_sheet(formattedRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Base Unificada (46 Colunas)');
    
    const fileName = `BASE_UNIFICADA_46_COLUNAS_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  const handleSaveEmployee = async (updatedEmp) => {
    if (!canEditColaborador) {
      showNotification('Você não possui permissão na Matriz de Acessos para editar colaboradores.', true);
      return;
    }
    // Atualizar estado local
    const updatedData = baseUnificadaData.map(e => e.matricula === updatedEmp.matricula ? updatedEmp : e);
    setBaseUnificadaData(updatedData);
    localStorage.setItem('fleet_base_unificada_cache', JSON.stringify(updatedData));
    
    // Sincronizar com Supabase (enviando apenas colunas validas da tabela)
    try {
      const validColumns = [
        'matricula', 'chave_primaria', 'nome', 'funcao', 'qtd_faltas_atual',
        'status_falta', 'base_ut', 'status_forca', 'acao_a_ser_feita', 'grupo_folga',
        'commessa', 'horario', 'equipe', 'veiculo', 'turno', 'area_atuacao',
        'subgrupo', 'cnh', 'filial', 'dt_admissao', 'dt_demissao', 'sit_folha',
        'possui_periculosidade', 'diretoria', 'centro_custo', 'classe_custo',
        'segmento', 'departamento', 'gestor', 'coordenador', 'supervisor',
        'exp_1_periodo', 'exp_2_periodo', 'nro_cnh', 'categoria_cnh', 'logradouro',
        'endereco', 'nro_endereco', 'bairro', 'telefone', 'celular', 'cpf',
        'centro_custo_alpitel', 'comessa_alpitel', 'dt_retorno_ferias', 'nro_cracha'
      ];

      const payload = {};
      validColumns.forEach(col => {
        if (updatedEmp[col] !== undefined) {
          payload[col] = updatedEmp[col];
        }
      });
      payload.updated_at = new Date().toISOString();

      await supabase.from('base_unificada').upsert(payload, { onConflict: 'matricula' });
      showNotification(`Perfil de ${updatedEmp.nome} atualizado com sucesso!`);
    } catch (e) {
      console.error(e);
      showNotification('Erro ao salvar no banco. Salvo localmente.', true);
    }
  };

  const handleDeleteEmployee = async (empToDelete) => {
    if (!canEditColaborador) {
      showNotification('Você não possui permissão na Matriz de Acessos para excluir colaboradores.', true);
      return;
    }
    try {
      // 1. Remove from local state
      const updatedData = baseUnificadaData.filter(e => e.matricula !== empToDelete.matricula);
      setBaseUnificadaData(updatedData);
      localStorage.setItem('fleet_base_unificada_cache', JSON.stringify(updatedData));

      // 2. Delete from Supabase
      await supabase.from('base_unificada').delete().eq('matricula', empToDelete.matricula);

      // 3. Log Audit
      logAudit({
        tipo_acao: 'EXCLUIR_COLABORADOR',
        detalhes: `Excluiu o cadastro de ${empToDelete.nome} (${empToDelete.matricula})`
      });

      showNotification(`Cadastro de ${empToDelete.nome} foi excluído.`);
      setEditingEmployee(null);
    } catch (e) {
      console.error(e);
      showNotification('Erro ao excluir do banco.', true);
    }
  };

  // Estados de Loading e Feedbacks
  const [loading, setLoading] = useState(false);
  const [uploadingType, setUploadingType] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Filtros Globais
  const [filterRegional, setFilterRegional] = useState('TODAS');
  const [filterCommessa, setFilterCommessa] = useState('TODAS');
  const [filterFuncao, setFilterFuncao] = useState('TODAS');
  const [searchTerm, setSearchTerm] = useState('');

  // 11 Filtros Multi-Seleção Simultâneos para a Força Operacional
  const [filterSelBaseUT, setFilterSelBaseUT] = useState([]);
  const [filterSelFuncao, setFilterSelFuncao] = useState([]);
  const [filterSelTurno, setFilterSelTurno] = useState([]);
  const [filterSelStatusForca, setFilterSelStatusForca] = useState([]);
  const [filterSelAcao, setFilterSelAcao] = useState([]);
  const [filterSelCommessa, setFilterSelCommessa] = useState([]);
  const [filterSelTipoEquipe, setFilterSelTipoEquipe] = useState([]);
  const [filterSelCNH, setFilterSelCNH] = useState([]);
  const [filterSelSubgrupo, setFilterSelSubgrupo] = useState([]);
  const [filterSelHorario, setFilterSelHorario] = useState([]);
  const [filterSelAreaAtuacao, setFilterSelAreaAtuacao] = useState([]);

  // Filtro por clique nos Cards de Categoria (Cesto, Leve, Moto, Linha Viva, Munk, Linha Morta)
  const [cardCategoryFilter, setCardCategoryFilter] = useState(null);

  // Controle de Seções Expandidas/Recolhidas (Collapsible State)
  const [collapsedKeys, setCollapsedKeys] = useState({});

  // Redimensionamento de Colunas da Matriz (Estilo Excel)
  const [matrixColWidths, setMatrixColWidths] = useState({
    hierarquia: 420,
    budget: 110,
    rhEntregue: 125,
    forcaOp: 110,
    gapRh: 120,
    gapOpOrcado: 120,
    gapOpRh: 120
  });

  const startXRef = useRef(0);
  const startWidthRef = useRef(0);

  const handleMouseDownResize = (e, colKey) => {
    e.preventDefault();
    startXRef.current = e.clientX;
    startWidthRef.current = matrixColWidths[colKey];

    const onMouseMove = (moveEvent) => {
      const deltaX = moveEvent.clientX - startXRef.current;
      const newWidth = Math.max(75, startWidthRef.current + deltaX);
      setMatrixColWidths(prev => ({ ...prev, [colKey]: newWidth }));
    };

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  // Modais de Edição / Criação de Equipe
  const [editingEquipe, setEditingEquipe] = useState(null);
  const [editTeamCodeInput, setEditTeamCodeInput] = useState('');
  const [editSobraSearchTerm, setEditSobraSearchTerm] = useState('');

  const [isNewEquipeModalOpen, setIsNewEquipeModalOpen] = useState(false);
  const [newEquipeCode, setNewEquipeCode] = useState('');
  const [newEquipeVeiculo, setNewEquipeVeiculo] = useState('CESTO');
  const [newEquipeSubgrupo, setNewEquipeSubgrupo] = useState('TMA');
  const [newEquipeTurno, setNewEquipeTurno] = useState('1 - MANHÃ');
  const [newEquipeHorario, setNewEquipeHorario] = useState(0.25);
  const [newEquipeArea, setNewEquipeArea] = useState('CAJATI');
  const [newSobraSearchTerm, setNewSobraSearchTerm] = useState('');
  const [selectedSobraMembers, setSelectedSobraMembers] = useState([]);

  // ===== FASE 3: NOVOS ESTADOS =====
  // Auditoria e Histórico
  const [auditLog, setAuditLog] = useState(() => {
    try { return JSON.parse(localStorage.getItem('fleet_forca_audit_log') || '[]'); } catch { return []; }
  });
  const [showHistoryModal, setShowHistoryModal] = useState(null); // equipe code or null ('GLOBAL')
  const [historySearchTerm, setHistorySearchTerm] = useState('');

  // Sistema de Aprovação (Change Requests)
  const [changeRequests, setChangeRequests] = useState(() => {
    try { return JSON.parse(localStorage.getItem('fleet_forca_change_requests') || '[]'); } catch { return []; }
  });
  const [showApprovalPanel, setShowApprovalPanel] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectionToast, setRejectionToast] = useState(null);

  // Modal Customizado de Confirmação para Desfazer Equipe
  const [disbandConfirmEquipe, setDisbandConfirmEquipe] = useState(null); // eqCode ou null

  // Modal Ultra Premium de Confirmação de Envio de Solicitação (Supervisores)
  const [submittedRequestModal, setSubmittedRequestModal] = useState(null);

  // Estado para Edição DE > PARA do Lado Direito (Formação Sugerida)
  const [paraMembros, setParaMembros] = useState([]);
  const [paraTeamCodeInput, setParaTeamCodeInput] = useState('');
  const [paraPlacaInput, setParaPlacaInput] = useState('');
  const [paraTelefoneInput, setParaTelefoneInput] = useState('');
  const [paraCameraInput, setParaCameraInput] = useState('NÃO INFORMADO');

  // Larguras de Colunas Dimensionáveis (Excel-Style Column Resizing)
  const [columnWidths, setColumnWidths] = useState({
    hora: 70,
    telefone: 130,
    placa: 140,
    equipe: 80,
    camera: 140,
    grupo: 85,
    nome: 190,
    br0: 70,
    matricula: 95,
    funcao: 150,
    cnh: 60,
    status: 90,
    area: 120,
    acoes: 120,
  });

  const handleMouseDownColumnResize = (e, colKey) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startWidth = columnWidths[colKey] || 100;

    const onMouseMove = (moveEvent) => {
      const currentX = moveEvent.clientX;
      const deltaX = currentX - startX;
      const newWidth = Math.max(45, startWidth + deltaX);
      setColumnWidths(prev => ({ ...prev, [colKey]: newWidth }));
    };

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  // Edição inline de campos (telefone, camera, placa)
  const [inlineEdits, setInlineEdits] = useState({});

  const handleOpenEditEmployee = useCallback((emp) => {
    if (!canEditColaborador) {
      showNotification('Você não possui permissão na Matriz de Acessos para editar colaboradores.', true);
      return;
    }
    setEditingEmployee(emp);
  }, [canEditColaborador]);

  // Verificar se há rejeições não vistas ao entrar no módulo
  useEffect(() => {
    const userId = currentUser?.id || currentUser?.nome;
    if (!userId) return;
    const rejected = changeRequests.filter(r =>
      r.status === 'REJEITADO' &&
      (r.solicitante_id === userId || r.solicitante_nome === currentUser?.nome) &&
      !r._visto
    );
    if (rejected.length > 0) {
      setRejectionToast(`Você tem ${rejected.length} solicitação(ões) rejeitada(s). Verifique o painel de aprovações.`);
      setTimeout(() => setRejectionToast(null), 8000);
      // Marcar como vistas
      const updatedReqs = changeRequests.map(r =>
        rejected.find(rej => rej.id === r.id) ? { ...r, _visto: true } : r
      );
      setChangeRequests(updatedReqs);
      localStorage.setItem('fleet_forca_change_requests', JSON.stringify(updatedReqs));
    }
  }, []);

  // Sincronização Retroativa de Chamados Aprovados (Garantir remoção de membros como DANILO MISSIO HONORATO)
  useEffect(() => {
    if (!forcaData || forcaData.length === 0 || !changeRequests || changeRequests.length === 0) return;

    let needsUpdate = false;
    let currentForca = [...forcaData];

    changeRequests.filter(r => r.status === 'APROVADO' && r.tipo_acao === 'EDITAR_EQUIPE_DE_PARA').forEach(req => {
      const { para, de } = req.detalhes || {};
      if (!de || !para) return;
      const oldEquipeStr = String(de.equipe || req.entidade_id || '').trim().toUpperCase();
      const paraMatriculas = new Set((para.membros || []).map(m => String(m.matricula || '').trim()));
      const paraNomes = new Set((para.membros || []).map(m => String(m.nome || '').trim().toUpperCase()));

      currentForca = currentForca.map(f => {
        const itemEquipeStr = String(f.equipe || '').trim().toUpperCase();
        if (itemEquipeStr === oldEquipeStr) {
          const isMat = f.matricula && paraMatriculas.has(String(f.matricula).trim());
          const isNome = f.nome && paraNomes.has(String(f.nome).trim().toUpperCase());
          if (!isMat && !isNome) {
            needsUpdate = true;
            return { ...f, equipe: 'Sobra' };
          }
        }
        return f;
      });
    });

    if (needsUpdate) {
      setForcaData(currentForca);
      localStorage.setItem('fleet_forca_operacional_cache', JSON.stringify(currentForca));
    }
  }, [changeRequests]);

  // Carregar Dados Iniciais com Paginação Completa e Tempo Real
  useEffect(() => {
    loadAllData();

    // 4. Iniciar WebSocket para Sincronização em Tempo Real (Online e Simultâneo)
    const channel = supabase.channel('realtime:forca_operacional')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'forca_operacional' },
        (payload) => {
          setForcaData((prevData) => {
            let newData = [...prevData];

            if (payload.eventType === 'INSERT') {
              // Previne duplicidade
              if (!newData.some(e => e.matricula === payload.new.matricula)) {
                newData.push(payload.new);
              }
            } else if (payload.eventType === 'UPDATE') {
              newData = newData.map(e => e.matricula === payload.new.matricula ? payload.new : e);
            } else if (payload.eventType === 'DELETE') {
              newData = newData.filter(e => e.matricula !== payload.old.matricula);
            }

            // Reprocessar o formato de turno e horário pro frontend
            const restored = newData.map(item => {
              let h = item.horario;
              let t = item.turno || '1 - MANHÃ';
              if (typeof t === 'string' && t.includes('[H:')) {
                const match = t.match(/\[H:(.*?)\]/);
                if (match && match[1] !== '') {
                  const parsedH = parseFloat(match[1]);
                  if (!isNaN(parsedH)) h = parsedH;
                  else h = match[1];
                }
                t = t.replace(/\[H:.*?\]/, '').trim();
              }
              return { ...item, horario: h, turno: t };
            });

            localStorage.setItem('fleet_forca_operacional_cache', JSON.stringify(restored));
            return restored;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    try {
      // 1. Budget
      try {
        const { data: bData, error: bErr } = await supabase.from('budget_forca').select('*');
        if (!bErr && bData) {
          setBudgetData(bData);
          localStorage.setItem('fleet_budget_forca_cache', JSON.stringify(bData));
        }
      } catch (e) {
        console.warn('Tabela budget_forca indisponível. Carregando cache local.');
        const cached = localStorage.getItem('fleet_budget_forca_cache');
        if (cached) setBudgetData(JSON.parse(cached));
      }

      // 2. Base Unificada (1.008 colaboradores)
      try {
        let allBase = [];
        let page = 0;
        let hasMore = true;
        while (hasMore) {
          const { data: uData, error: uErr } = await supabase
            .from('base_unificada')
            .select('*')
            .range(page * 1000, (page + 1) * 1000 - 1);
          if (uErr) throw uErr;
          if (uData && uData.length > 0) {
            allBase = [...allBase, ...uData];
            if (uData.length < 1000) hasMore = false;
            else page++;
          } else {
            hasMore = false;
          }
        }
        if (allBase && allBase.length > 0) {
          setBaseUnificadaData(allBase);
          localStorage.setItem('fleet_base_unificada_cache', JSON.stringify(allBase));
        } else {
          const cached = localStorage.getItem('fleet_base_unificada_cache');
          if (cached) {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed) && parsed.length > 0) setBaseUnificadaData(parsed);
            else setBaseUnificadaData(initialBaseUnificadaFallback);
          } else {
            setBaseUnificadaData(initialBaseUnificadaFallback);
          }
        }
      } catch (e) {
        console.warn('Tabela base_unificada indisponível. Carregando cache local ou fallback.', e);
        const cached = localStorage.getItem('fleet_base_unificada_cache');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) setBaseUnificadaData(parsed);
          else setBaseUnificadaData(initialBaseUnificadaFallback);
        } else {
          setBaseUnificadaData(initialBaseUnificadaFallback);
        }
      }

      // 4. Veículos (para placa e subTipo)
      try {
        const { data: vData, error: vErr } = await supabase.from('veiculos').select('id,placa,subTipo,tipo,status,turno,regional');
        if (!vErr && vData && vData.length > 0) {
          setVehiclesDb(vData);
          localStorage.setItem('fleet_veiculos_cache', JSON.stringify(vData));
        } else {
          const cached = localStorage.getItem('fleet_veiculos_cache');
          if (cached) setVehiclesDb(JSON.parse(cached));
        }
      } catch (e) {
        console.warn('Tabela veiculos indisponível. Carregando cache local.');
        const cached = localStorage.getItem('fleet_veiculos_cache');
        if (cached) setVehiclesDb(JSON.parse(cached));
      }

    } catch (err) {
      console.warn('Carregando dados iniciais', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleCollapse = (key) => {
    setCollapsedKeys(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const showNotification = (msg, isErr = false) => {
    if (isErr) {
      setErrorMsg(msg);
      setTimeout(() => setErrorMsg(''), 6000);
    } else {
      setSuccessMsg(msg);
      setTimeout(() => setSuccessMsg(''), 4000);
    }
  };

  // ==========================================
  // FASE 3: SISTEMA DE AUDITORIA (LOG)
  // ==========================================
  const logAudit = useCallback((entry) => {
    const numericUserId = typeof currentUser?.id === 'number' && !isNaN(currentUser.id) ? Number(currentUser.id) : null;
    const userName = currentUser?.nome || currentUser?.login || 'Sistema';

    const newEntryLocal = {
      id: Date.now(),
      created_at: new Date().toISOString(),
      usuario_id: numericUserId,
      usuario_nome: userName,
      ...entry
    };
    
    const dbPayload = {
      usuario_id: numericUserId,
      usuario_nome: userName,
      tipo_acao: entry.tipo_acao || 'ACAO',
      entidade_tipo: entry.entidade_tipo || 'base_unificada',
      entidade_id: entry.entidade_id ? String(entry.entidade_id) : null,
      campo_alterado: entry.campo_alterado || null,
      valor_anterior: entry.valor_anterior !== undefined ? String(entry.valor_anterior) : null,
      valor_novo: entry.valor_novo !== undefined ? String(entry.valor_novo) : null,
      detalhes: entry.detalhes || ''
    };

    setAuditLog(prev => {
      const updated = [newEntryLocal, ...prev].slice(0, 5000); // manter últimos 5000
      localStorage.setItem('fleet_forca_audit_log', JSON.stringify(updated));
      return updated;
    });
    // Tentar sync com Supabase
    supabase.from('forca_audit_log').insert(dbPayload).then(() => {}).catch((err) => {
      console.warn('[Audit Log] Sync warning:', err);
    });
  }, [currentUser]);

  // ==========================================
  // FASE 3: SISTEMA DE APROVAÇÃO
  // ==========================================
  const submitChangeRequest = useCallback((requestData) => {
    const numericId = Date.now();
    const dateStr = new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14);
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const trackingCode = `REQ-${dateStr}-${randomNum}`;

    const numericUserId = typeof currentUser?.id === 'number' ? currentUser.id : null;

    const newRequest = {
      id: numericId,
      codigo_controle: trackingCode,
      created_at: new Date().toISOString(),
      solicitante_id: numericUserId,
      solicitante_nome: currentUser?.nome || 'Sistema',
      solicitante_perfil: currentUser?.perfil || '',
      status: 'PENDENTE',
      ...requestData
    };
    setChangeRequests(prev => {
      const updated = [newRequest, ...prev];
      localStorage.setItem('fleet_forca_change_requests', JSON.stringify(updated));
      return updated;
    });

    const supabasePayload = {
      id: numericId,
      tipo_acao: newRequest.tipo_acao,
      entidade_tipo: newRequest.entidade_tipo,
      entidade_id: String(newRequest.entidade_id),
      campo_alterado: newRequest.campo_alterado,
      valor_anterior: newRequest.valor_anterior,
      valor_novo: newRequest.valor_novo,
      detalhes: { ...(newRequest.detalhes || {}), codigo_controle: trackingCode },
      solicitante_id: numericUserId,
      solicitante_nome: newRequest.solicitante_nome,
      solicitante_perfil: newRequest.solicitante_perfil,
      status: 'PENDENTE',
      created_at: newRequest.created_at
    };

    supabase.from('forca_change_requests').insert(supabasePayload).then(() => {}).catch(err => console.warn('Supabase insert warning:', err));
    showNotification('Solicitação de alteração enviada para aprovação do Coordenador/Gerente.');
  }, [currentUser]);

  const pendingRequests = useMemo(() => changeRequests.filter(r => r.status === 'PENDENTE'), [changeRequests]);

  const handleApproveRequest = useCallback((requestId) => {
    const request = changeRequests.find(r => 
      String(r.id) === String(requestId) || 
      r.codigo_controle === requestId ||
      r.id === requestId
    );
    if (!request) return;

    // Executar a ação original
    if (request.tipo_acao === 'RENOMEAR_EQUIPE') {
      const updated = forcaData.map(f => f.equipe === request.valor_anterior ? { ...f, equipe: request.valor_novo } : f);
      setForcaData(updated);
      localStorage.setItem('fleet_forca_operacional_cache', JSON.stringify(updated));
      supabase.from('forca_operacional').update({ equipe: request.valor_novo }).eq('equipe', request.valor_anterior).then(() => {}).catch(() => {});
    } else if (request.tipo_acao === 'REMOVER_MEMBRO') {
      const updated = forcaData.map(f => f.matricula === request.entidade_id ? { ...f, equipe: 'Sobra' } : f);
      setForcaData(updated);
      localStorage.setItem('fleet_forca_operacional_cache', JSON.stringify(updated));
      supabase.from('forca_operacional').update({ equipe: 'Sobra' }).eq('matricula', request.entidade_id).then(() => {}).catch(() => {});
    } else if (request.tipo_acao === 'ADICIONAR_MEMBRO') {
      const updated = forcaData.map(f => f.matricula === request.entidade_id ? { ...f, equipe: request.valor_novo } : f);
      setForcaData(updated);
      localStorage.setItem('fleet_forca_operacional_cache', JSON.stringify(updated));
      supabase.from('forca_operacional').update({ equipe: request.valor_novo }).eq('matricula', request.entidade_id).then(() => {}).catch(() => {});
    } else if (request.tipo_acao === 'DESFAZER_EQUIPE') {
      const updated = forcaData.map(f => f.equipe === request.entidade_id ? { ...f, equipe: 'Sobra' } : f);
      setForcaData(updated);
      localStorage.setItem('fleet_forca_operacional_cache', JSON.stringify(updated));
      supabase.from('forca_operacional').update({ equipe: 'Sobra' }).eq('equipe', request.entidade_id).then(() => {}).catch(() => {});
    } else if (['EDITAR_TELEFONE', 'EDITAR_CAMERA', 'EDITAR_PLACA'].includes(request.tipo_acao)) {
      const campo = request.campo_alterado;
      const updated = forcaData.map(f => {
        if (f.equipe === request.entidade_id || f.matricula === request.entidade_id) {
          return { ...f, [campo]: request.valor_novo };
        }
        return f;
      });
      setForcaData(updated);
      localStorage.setItem('fleet_forca_operacional_cache', JSON.stringify(updated));
    } else if (request.tipo_acao === 'EDITAR_EQUIPE_DE_PARA') {
      const { para, de } = request.detalhes || {};
      const oldEquipeStr = String(de?.equipe || request.entidade_id || '').trim().toUpperCase();
      const newEquipeStr = String(para?.equipe || oldEquipeStr).trim().toUpperCase();
      const newPlaca = para?.placa;
      const newTelefone = para?.telefone;
      const newCamera = para?.camera;

      const paraMatriculas = new Set((para?.membros || []).map(m => String(m.matricula || '').trim()));
      const paraNomes = new Set((para?.membros || []).map(m => String(m.nome || '').trim().toUpperCase()));

      const updated = forcaData.map(f => {
        const itemEquipeStr = String(f.equipe || '').trim().toUpperCase();
        const isCurrentlyInTeam = itemEquipeStr === oldEquipeStr;

        const isMatriculaInPara = f.matricula && paraMatriculas.has(String(f.matricula).trim());
        const isNomeInPara = f.nome && paraNomes.has(String(f.nome).trim().toUpperCase());
        const isInNewProposal = isMatriculaInPara || isNomeInPara;

        if (isInNewProposal) {
          return {
            ...f,
            equipe: newEquipeStr,
            placa_veiculo: newPlaca !== undefined && newPlaca !== '' ? newPlaca : f.placa_veiculo,
            telefone: newTelefone !== undefined && newTelefone !== '' ? newTelefone : f.telefone,
            camera: newCamera !== undefined && newCamera !== '' ? newCamera : f.camera
          };
        } else if (isCurrentlyInTeam) {
          // SE O COLABORADOR ESTAVA NA EQUIPE ORIGINAL MAS NÃO ESTÁ NA PROPOSTA (EX: DANILO MISSIO HONORATO), MOVER PARA SOBRA!
          return { ...f, equipe: 'Sobra' };
        }
        return f;
      });

      setForcaData(updated);
      localStorage.setItem('fleet_forca_operacional_cache', JSON.stringify(updated));

      // Sync com Supabase
      try {
        if (oldEquipeStr !== newEquipeStr) {
          supabase.from('forca_operacional').update({ equipe: newEquipeStr }).eq('equipe', oldEquipeStr).then(() => {}).catch(() => {});
        }
        (para?.membros || []).forEach(m => {
          if (m.matricula) {
            supabase.from('forca_operacional').update({
              equipe: newEquipeStr,
              placa_veiculo: newPlaca,
              telefone: newTelefone,
              camera: newCamera
            }).eq('matricula', m.matricula).then(() => {}).catch(() => {});
          }
        });
        // Devolver explicitamente para Sobra no Supabase quem foi removido da equipe
        (de?.membros || []).forEach(mDe => {
          const wasKeptMat = mDe.matricula && paraMatriculas.has(String(mDe.matricula).trim());
          const wasKeptNome = mDe.nome && paraNomes.has(String(mDe.nome).trim().toUpperCase());
          if (!wasKeptMat && !wasKeptNome) {
            if (mDe.matricula) {
              supabase.from('forca_operacional').update({ equipe: 'Sobra' }).eq('matricula', mDe.matricula).then(() => {}).catch(() => {});
            }
            if (mDe.nome) {
              supabase.from('forca_operacional').update({ equipe: 'Sobra' }).eq('nome', mDe.nome).then(() => {}).catch(() => {});
            }
          }
        });
      } catch (e) {
        console.warn('Erro ao atualizar Supabase:', e);
      }
    }

    // Atualizar status no estado local e Supabase
    const numericUserId = typeof currentUser?.id === 'number' ? currentUser.id : null;
    const updatedReqs = changeRequests.map(r => (String(r.id) === String(requestId) || r.codigo_controle === requestId) ? {
      ...r,
      status: 'APROVADO',
      aprovador_id: numericUserId,
      aprovador_nome: currentUser?.nome,
      data_decisao: new Date().toISOString()
    } : r);
    setChangeRequests(updatedReqs);
    localStorage.setItem('fleet_forca_change_requests', JSON.stringify(updatedReqs));

    if (typeof request.id === 'number') {
      supabase.from('forca_change_requests').update({
        status: 'APROVADO',
        aprovador_id: numericUserId,
        aprovador_nome: currentUser?.nome || 'Gestor',
        data_decisao: new Date().toISOString()
      }).eq('id', request.id).then(() => {}).catch(() => {});
    }

    logAudit({
      tipo_acao: 'APROVAR_SOLICITACAO',
      entidade_tipo: 'SOLICITACAO',
      entidade_id: String(requestId),
      campo_alterado: request.tipo_acao,
      valor_anterior: request.valor_anterior,
      valor_novo: request.valor_novo,
      detalhes: { solicitante: request.solicitante_nome }
    });

    showNotification(`Solicitação de ${request.solicitante_nome} APROVADA com sucesso.`);
  }, [changeRequests, forcaData, currentUser, logAudit]);

  const handleRejectRequest = useCallback((requestId, motivo) => {
    const request = changeRequests.find(r => r.id === requestId);
    if (!request) return;

    const updatedReqs = changeRequests.map(r => r.id === requestId ? {
      ...r,
      status: 'REJEITADO',
      aprovador_id: currentUser?.id,
      aprovador_nome: currentUser?.nome,
      data_decisao: new Date().toISOString(),
      motivo_rejeicao: motivo || 'Sem motivo informado'
    } : r);
    setChangeRequests(updatedReqs);
    localStorage.setItem('fleet_forca_change_requests', JSON.stringify(updatedReqs));

    logAudit({
      tipo_acao: 'REJEITAR_SOLICITACAO',
      entidade_tipo: 'SOLICITACAO',
      entidade_id: String(requestId),
      campo_alterado: request.tipo_acao,
      valor_anterior: request.valor_anterior,
      valor_novo: request.valor_novo,
      detalhes: { solicitante: request.solicitante_nome, motivo }
    });

    showNotification(`Solicitação de ${request.solicitante_nome} REJEITADA.`);
  }, [changeRequests, currentUser, logAudit]);

  // ==========================================
  // FASE 3: EDIÇÃO INLINE (TELEFONE, CÂMERA, PLACA)
  // ==========================================
  const handleInlineFieldSave = useCallback((equipeCode, campo, valorNovo, valorAnterior) => {
    if (valorNovo === valorAnterior) return;

    const tipoAcao = campo === 'telefone' ? 'EDITAR_TELEFONE' : campo === 'camera' ? 'EDITAR_CAMERA' : 'EDITAR_PLACA';

    if (!canEditColaborador) {
      showNotification('Você não possui permissão na Matriz de Acessos para editar dados de equipe/colaborador.', true);
      return;
    }

    // Edição direta: atualizar todos os membros da equipe
    const updated = forcaData.map(f => {
      if (f.equipe === equipeCode) {
        return { ...f, [campo]: valorNovo };
      }
      return f;
    });
    setForcaData(updated);
    localStorage.setItem('fleet_forca_operacional_cache', JSON.stringify(updated));

    logAudit({
      tipo_acao: tipoAcao,
      entidade_tipo: 'EQUIPE',
      entidade_id: equipeCode,
      campo_alterado: campo,
      valor_anterior: valorAnterior || '',
      valor_novo: valorNovo
    });

    // Sync com Supabase
    supabase.from('forca_operacional').update({ [campo]: valorNovo }).eq('equipe', equipeCode).then(() => {}).catch(() => {});
  }, [forcaData, canEditDirectly, logAudit, submitChangeRequest]);

  // Lista de placas disponíveis filtrada por tipo de veículo
  const getPlacasForVeiculo = useCallback((tipoVeiculo) => {
    const veiculoUpper = (tipoVeiculo || '').toUpperCase();
    let subTipoFilter = '';
    if (veiculoUpper.includes('CESTO')) subTipoFilter = 'Cesto Aéreo';
    else if (veiculoUpper.includes('LEVE') || veiculoUpper.includes('FIORINO') || veiculoUpper.includes('STRADA') || veiculoUpper.includes('ARGO')) subTipoFilter = '';
    else if (veiculoUpper.includes('MOTO')) subTipoFilter = 'Moto';
    else if (veiculoUpper.includes('MUNK') || veiculoUpper.includes('MUNCK')) subTipoFilter = 'Munk';

    if (subTipoFilter) {
      return vehiclesDb.filter(v => v.subTipo === subTipoFilter && v.status === 'DISPONIVEL').map(v => v.placa);
    }
    return vehiclesDb.filter(v => v.status === 'DISPONIVEL').map(v => v.placa);
  }, [vehiclesDb]);

  // ==========================================
  // HANDLERS DE UPLOAD DE EXCEL
  // ==========================================

  // 1. Upload BUDGET (Com normalização robusta de cabeçalhos e busca de metas)
  const handleUploadBudget = async (e) => {
    if (!canCarregarBudget) {
      showNotification('Você não possui permissão na Matriz de Acessos para importar o Budget.', true);
      if (e.target) e.target.value = null;
      return;
    }
    const file = e.target.files[0];
    if (!file) return;
    setUploadingType('budget');

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames.find(s => s.toUpperCase().includes('PESSOAL') || s.toUpperCase().includes('BUDGET')) || wb.SheetNames[0];
        const data = XLSX.utils.sheet_to_json(wb.Sheets[wsname]);

        const parsed = data.map(rawRow => {
          // Normalizar chaves removendo espaços e convertendo para maiúsculo
          const r = {};
          Object.keys(rawRow).forEach(k => {
            r[k.trim().toUpperCase()] = rawRow[k];
          });

          const tipo = String(r['TIPO'] || '').trim().toUpperCase();
          if (tipo && tipo !== 'DIRETO') return null;

          // A meta agora vem especificamente da coluna Meta 2026
          let meta = parseInt(r['META 2026'], 10) || 0;

          return {
            chave_primaria: String(r['CHAVE_PRIMÁRIA'] || r['CHAVE_PRIMARIA'] || '').trim(),
            base_contrato: String(r['BASE CONTRATO'] || r['BASE CONTRATO '] || r['BASE_CONTRATO'] || r['BASE/CONTRATO'] || r['BASE DE CONTRATO'] || r['CONTRATO'] || r['BASE'] || '').trim(),
            ut_contrato: String(r['UI CONTRATO'] || r['UT CONTRATO'] || r['BASE UT'] || '').trim(),
            subgrupo: String(r['SUBGRUPO'] || '').trim(),
            grupo: String(r['GRUPO'] || '').trim(),
            empresa: String(r['EMPRESA'] || ''),
            centro_custo: String(r['CENTRO DE CUSTO'] || r['CENTRO CUSTO'] || '').trim(),
            commessa: String(r['COMMESSA'] || '').trim().toUpperCase(),
            descricao: String(r['DESCRIÇÃO'] || r['DESCRICAO'] || ''),
            tipo: 'DIRETO',
            cargo_funcao: String(r['CARGO/FUNÇÃO'] || r['CARGO/FUNCAO'] || r['FUNCAO'] || '').trim(),
            area: String(r['ÁREA'] || r['AREA'] || ''),
            tipo_veiculo: String(r['TIPO_VEÍCULO'] || r['TIPO_VEICULO'] || ''),
            quantidade_meta: meta,
            mes_referencia: '202612'
          };
        }).filter(Boolean);

        const sumTotalMeta = parsed.reduce((a, b) => a + b.quantidade_meta, 0);

        setBudgetData(parsed);
        localStorage.setItem('fleet_budget_forca_cache', JSON.stringify(parsed));
        showNotification(`Budget importado com sucesso! ${parsed.length} metas diretas processadas (Total Orçado: ${sumTotalMeta} pessoas).`);

        await safeSyncToSupabase('budget_forca', parsed, null);
      } catch (err) {
        console.error(err);
        showNotification('Erro ao processar planilha de Budget: ' + err.message, true);
      } finally {
        setUploadingType(null);
        e.target.value = null;
      }
    };
    reader.readAsBinaryString(file);
  };

  // 2. Upload BASE UNIFICADA (RH & Força OP)
  const handleUploadBaseUnificada = async (e) => {
    if (!canCarregarForcaOp) {
      showNotification('Você não possui permissão na Matriz de Acessos para importar a Base RH & Operação.', true);
      if (e.target) e.target.value = null;
      return;
    }
    const file = e.target.files[0];
    if (!file) return;
    setUploadingType('base_unificada');

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const data = XLSX.utils.sheet_to_json(wb.Sheets[wsname]);

        const parseExcelDate = (serial) => {
          if (!serial) return '';
          if (typeof serial === 'string') return serial.trim();
          const num = parseFloat(serial);
          if (!isNaN(num) && num > 10000) {
            const date = new Date((num - 25569) * 86400 * 1000);
            return `${String(date.getUTCDate()).padStart(2, '0')}/${String(date.getUTCMonth() + 1).padStart(2, '0')}/${date.getUTCFullYear()}`;
          }
          return String(serial).trim();
        };

        const parseExcelTime = (serial) => {
          if (serial === undefined || serial === null || serial === '') return '';
          if (typeof serial === 'string' && serial.includes(':')) return serial.trim();
          const num = parseFloat(serial);
          if (!isNaN(num)) {
            if (num >= 0 && num <= 1) {
              const totalMinutes = Math.round(num * 24 * 60);
              const hours = Math.floor(totalMinutes / 60);
              const minutes = totalMinutes % 60;
              return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
            } else if (num > 1 && num <= 24) {
              return `${String(Math.floor(num)).padStart(2, '0')}:00`;
            }
          }
          return String(serial).trim();
        };

        const seenMatriculas = new Set();
        const parsed = [];

        data.forEach((r, idx) => {
          let mat = String(r['Matricula'] || r['Matrícula'] || '').trim();
          if (!mat) mat = `UNIF_AUTO_${idx + 1}`;
          if (seenMatriculas.has(mat)) mat = `${mat}_DUP_${idx}`;
          seenMatriculas.add(mat);

          parsed.push({
            matricula: mat,
            chave_primaria: String(r['chave primária'] || r['chave_primaria'] || r['CHAVE_PRIMARIA'] || '').trim(),
            nome: String(r['Nome'] || '').trim(),
            funcao: String(r['Função'] || r['Funcao'] || '').trim(),
            qtd_faltas_atual: parseInt(r['Qtd Faltas Atual'] || 0, 10) || 0,
            status_falta: String(r['Status Falta'] || 'Sem Falta').trim(),
            base_ut: String(r['Base UT'] || '').trim(),
            base_contrato: String(r['Base Contrato'] || r['Base/Contrato'] || r['Base Contrato '] || r['BASE CONTRATO'] || r['BASE_CONTRATO'] || r['Contrato'] || r['Base'] || '').trim(),
            status_forca: String(r['Status Força'] || '').trim(),
            acao_a_ser_feita: String(r['Ação a ser Feita'] || '').trim(),
            grupo_folga: String(r['Grupo Folga (PONTO)'] || '').trim(),
            commessa: String(r['Comessa'] || '').trim().toUpperCase(),
            horario: parseExcelTime(r['Horário']),
            equipe: String(r['Equipe Nova'] || '').trim(),
            veiculo: String(r['Veículo'] || '').trim(),
            turno: String(r['TURNO'] || '').trim(),
            area_atuacao: String(r['AREA DE ATUAÇÃO'] || '').trim(),
            subgrupo: String(r['SUBGRUPO'] || '').trim(),
            cnh: String(r['CNH'] || '').trim(),
            filial: String(r['Filial'] || '').trim(),
            dt_admissao: parseExcelDate(r['Dt. Admissao']),
            dt_demissao: parseExcelDate(r['Dt. Demissao']),
            sit_folha: String(r['Sit. Folha'] || '').trim(),
            possui_periculosidade: String(r['Possui Peric.'] || '').trim(),
            diretoria: String(r['Diretoria'] || '').trim(),
            centro_custo: String(r['Centro Custo'] || '').trim(),
            classe_custo: String(r['Classe C.Custo'] || '').trim(),
            segmento: String(r['Segmento'] || '').trim(),
            departamento: String(r['Departamento'] || '').trim(),
            gestor: String(r['Gestor'] || '').trim(),
            coordenador: String(r['Coordenador'] || '').trim(),
            supervisor: String(r['Supervisor'] || '').trim(),
            exp_1_periodo: parseExcelDate(r['Exp. 1o Periodo']),
            exp_2_periodo: parseExcelDate(r['Exp. 2o Periodo']),
            nro_cnh: String(r['Nro. CNH'] || '').trim(),
            categoria_cnh: String(r['Categoria CNH'] || '').trim(),
            logradouro: String(r['Logradouro'] || '').trim(),
            endereco: String(r['Endereço'] || '').trim(),
            nro_endereco: String(r['Nro. End.'] || '').trim(),
            bairro: String(r['Bairro'] || '').trim(),
            telefone: String(r['Telefone'] || '').trim(),
            celular: String(r['Celular'] || '').trim(),
            cpf: String(r['CPF'] || '').trim(),
            centro_custo_alpitel: String(r['C.Custo Alpitel'] || '').trim(),
            comessa_alpitel: String(r['Comessa Alpitel'] || '').trim(),
            dt_retorno_ferias: parseExcelDate(r['Dt. Ret Férias']),
            nro_cracha: String(r['Nro. Crachá'] || '').trim()
          });
        });

        setBaseUnificadaData(parsed);
        localStorage.setItem('fleet_base_unificada_cache', JSON.stringify(parsed));
        showNotification(`Base RH & OP importada! ${parsed.length} colaboradores processados da planilha.`);

        await safeSyncToSupabase('base_unificada', parsed, 'matricula', true);
      } catch (err) {
        console.error(err);
        showNotification('Erro ao processar Base RH & OP: ' + err.message, true);
      } finally {
        setUploadingType(null);
        e.target.value = null;
      }
    };
    reader.readAsBinaryString(file);
  };



  // ==========================================
  // MATRIZ DE CRUZAMENTO DE DADOS (BASE UNIFICADA × BUDGET)
  // ==========================================

  const summaryCalculations = useMemo(() => {
    // 0. Aplicar Filtros Multi-Seleção da Visão Geral (Gaps) em 100% dos Datasets
    let filteredBudgetData = budgetData;
    let filteredBaseUnificadaData = baseUnificadaData;

    if (filterSelBaseUT.length > 0) {
      filteredBudgetData = filteredBudgetData.filter(b => filterSelBaseUT.includes(String(b.ut_contrato || '').trim().toUpperCase()));
      filteredBaseUnificadaData = filteredBaseUnificadaData.filter(e => filterSelBaseUT.includes(String(e.base_ut || '').trim().toUpperCase()));
    }
    if (filterSelCommessa.length > 0) {
      filteredBudgetData = filteredBudgetData.filter(b => filterSelCommessa.includes(String(b.commessa || '').trim().toUpperCase()));
      filteredBaseUnificadaData = filteredBaseUnificadaData.filter(e => filterSelCommessa.includes(String(e.commessa || '').trim().toUpperCase()));
    }
    if (filterSelFuncao.length > 0) {
      filteredBudgetData = filteredBudgetData.filter(b => filterSelFuncao.includes(normalizeFuncao(b.cargo_funcao)));
      filteredBaseUnificadaData = filteredBaseUnificadaData.filter(e => filterSelFuncao.includes(normalizeFuncao(e.funcao)));
    }
    if (filterSelSubgrupo.length > 0) {
      filteredBudgetData = filteredBudgetData.filter(b => filterSelSubgrupo.includes(String(b.subgrupo || b.grupo || '').trim().toUpperCase()));
      filteredBaseUnificadaData = filteredBaseUnificadaData.filter(e => filterSelSubgrupo.includes(String(e.subgrupo || '').trim().toUpperCase()));
    }
    if (filterSelAcao.length > 0) {
      filteredBaseUnificadaData = filteredBaseUnificadaData.filter(e => filterSelAcao.includes(String(e.acao_a_ser_feita || '').trim()));
    }

    // 1. Mapear metadados do Budget por Commessa e por Chave Primária
    const commessaMetaMap = {};
    const budgetPkMap = {};

    filteredBudgetData.forEach(b => {
      const com = String(b.commessa || '').trim().toUpperCase();
      const grupo = String(b.grupo || '').trim().toUpperCase() || 'TMA';
      const ut = String(b.ut_contrato || '').trim().toUpperCase() || 'BASE GERAL';
      const subgrupo = String(b.subgrupo || '').trim().toUpperCase() || grupo;
      const baseContrato = String(b.base_contrato || '').trim().toUpperCase() || 'GERAL';
      const funcao = normalizeFuncao(b.cargo_funcao);
      const pk = String(b.chave_primaria || '').trim().toUpperCase();

      if (com && !commessaMetaMap[com]) {
        commessaMetaMap[com] = { grupo, ut, subgrupo, baseContrato };
      }

      if (pk && !budgetPkMap[pk]) {
        budgetPkMap[pk] = { grupo, ut, subgrupo, baseContrato, funcao, commessa: com };
      }
    });

    const matrix = {};

    const addMatrixRow = (meta, src, val, itemObj = null) => {
      const grupo = meta.grupo || 'TMA';
      const com = meta.commessa || 'OUTROS';
      const ut = meta.ut || 'BASE GERAL';
      const subgrupo = meta.subgrupo || grupo;
      const baseContrato = meta.baseContrato || 'GERAL';
      const funcao = meta.funcao || 'NÃO INFORMADO';

      const key = `${grupo}|${com}|${ut}|${subgrupo}|${baseContrato}|${funcao}`;

      if (!matrix[key]) {
        matrix[key] = {
          grupo, commessa: com, ut, subgrupo, baseContrato, funcao,
          orcado: 0, rhEntregue: 0, emEquipe: 0,
          itemsRh: [], itemsEquipe: []
        };
      }
      matrix[key][src] += val;
      if (src === 'rhEntregue' && itemObj) matrix[key].itemsRh.push(itemObj);
      if (src === 'emEquipe' && itemObj) matrix[key].itemsEquipe.push(itemObj);
    };

    // 2. Adicionar itens do Budget
    filteredBudgetData.forEach(b => {
      const meta = {
        grupo: String(b.grupo || '').trim().toUpperCase() || 'TMA',
        commessa: String(b.commessa || '').trim().toUpperCase(),
        ut: String(b.ut_contrato || '').trim().toUpperCase() || 'BASE GERAL',
        subgrupo: String(b.subgrupo || '').trim().toUpperCase() || String(b.grupo || '').trim().toUpperCase() || 'TMA',
        baseContrato: String(b.base_contrato || '').trim().toUpperCase() || 'GERAL',
        funcao: normalizeFuncao(b.cargo_funcao)
      };
      addMatrixRow(meta, 'orcado', Number(b.quantidade_meta || 0));
    });

    // 3. Processar filteredBaseUnificadaData
    const rhSemCorrespondencia = [];
    const forcaSemCorrespondencia = [];
    const bloco2NaoEmEquipe = [];
    const bloco3SemComessa = [];

    filteredBaseUnificadaData.forEach(item => {
      const com = String(item.commessa || item.commessa_alpitel || item.comessa_alpitel || item.cnh || 'EN43').trim().toUpperCase();
      const acaoStr = String(item.acao_a_ser_feita || item.acaoASerFeita || '').trim();
      const isEmEquipe = acaoStr === 'Em Equipe' || (item.equipe && String(item.equipe).trim().toUpperCase() !== 'SOBRA' && String(item.equipe).trim() !== '--');
      const statusForcaStr = String(item.status_forca || item.statusForca || 'ATIVO NA FORÇA').trim().toUpperCase();

      // Status que exigem reposição de vaga e NÃO contam como RH Entregue ativo
      const isInactiveStatus = [
        'AGILE 7',
        'VERIFICAR ABANDONO',
        'CONTRATO SUSPENSO',
        'AFASTADO CONFIRMADO',
        'PEN J/C'
      ].includes(statusForcaStr);

      if (com && com !== '--') {
        const fn = normalizeFuncao(item.funcao);
        const pk = String(item.chave_primaria || '').trim().toUpperCase();

        let meta = budgetPkMap[pk];
        if (!meta) {
          const cMeta = commessaMetaMap[com] || { 
            grupo: 'TMA', 
            ut: item.base_ut ? String(item.base_ut).trim().toUpperCase() : 'BASE GERAL', 
            subgrupo: 'TMA', 
            baseContrato: 'GERAL' 
          };
          meta = {
            grupo: cMeta.grupo,
            commessa: com,
            ut: item.base_ut ? String(item.base_ut).trim().toUpperCase() : cMeta.ut,
            subgrupo: String(item.subgrupo || '').trim().toUpperCase() || cMeta.subgrupo,
            baseContrato: cMeta.baseContrato,
            funcao: fn
          };
          rhSemCorrespondencia.push(item);
          if (isEmEquipe && !isInactiveStatus) forcaSemCorrespondencia.push(item);
        } else {
          meta = { ...meta, funcao: fn, commessa: com };
        }

        // Apenas conta como RH Entregue se o colaborador NÃO estiver em um dos status inativos/afastados
        if (!isInactiveStatus) {
          addMatrixRow(meta, 'rhEntregue', 1, item);
        }

        if (isEmEquipe && !isInactiveStatus) {
          addMatrixRow(meta, 'emEquipe', 1, item);
        } else {
          bloco2NaoEmEquipe.push(item);
        }
      } else {
        bloco3SemComessa.push(item);
      }
    });

    let rawRows = Object.values(matrix);

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      rawRows = rawRows.filter(r => 
        r.grupo.toLowerCase().includes(term) ||
        r.commessa.toLowerCase().includes(term) ||
        r.ut.toLowerCase().includes(term) ||
        r.subgrupo.toLowerCase().includes(term) ||
        r.baseContrato.toLowerCase().includes(term) ||
        r.funcao.toLowerCase().includes(term)
      );
    }

    // 4. Montar a Árvore de Hierarquia com base em matrixViewMode:
    const hierarchy = [];
    const gMap = {};

    const pushItemNode = (parentObj, keyName, lvl, isLeaf = false, rowMeta = null) => {
      if (!parentObj.children[keyName]) {
        parentObj.children[keyName] = {
          name: keyName, level: lvl, orcado: 0, rhEntregue: 0, emEquipe: 0,
          itemsRh: [], itemsEquipe: [], children: isLeaf ? null : {},
          meta: isLeaf ? rowMeta : null
        };
      } else if (isLeaf && rowMeta) {
        parentObj.children[keyName].meta = rowMeta;
      }
      return parentObj.children[keyName];
    };

    rawRows.forEach(r => {
      let levels = [];
      if (matrixViewMode === 'budget_simple') {
        // Visão 2 (Simplificada - 4 Níveis): Grupo > COMMESSA > Base UT > Cargo/Função
        levels = [r.grupo, r.commessa, r.ut, r.funcao];
      } else if (matrixViewMode === 'operacional_status') {
        // Visão 3 (Prontidão Operacional - 4 Níveis): Base UT > Subgrupo > Base Contrato > Cargo/Função
        levels = [r.ut, r.subgrupo, r.baseContrato, r.funcao];
      } else {
        // Visão 1 (Budget Completa - 6 Níveis): Grupo > COMMESSA > Base UT > Subgrupo > Base Contrato > Cargo/Função
        levels = [r.grupo, r.commessa, r.ut, r.subgrupo, r.baseContrato, r.funcao];
      }

      const rowMeta = {
        grupo: r.grupo,
        commessa: r.commessa,
        baseUt: r.ut,
        subgrupo: r.subgrupo,
        baseContrato: r.baseContrato,
        funcao: r.funcao
      };

      const l0 = levels[0];
      if (!gMap[l0]) {
        gMap[l0] = { name: l0, level: 0, orcado: 0, rhEntregue: 0, emEquipe: 0, itemsRh: [], itemsEquipe: [], children: {} };
        hierarchy.push(gMap[l0]);
      }
      let curr = gMap[l0];
      curr.orcado += r.orcado; curr.rhEntregue += r.rhEntregue; curr.emEquipe += r.emEquipe;
      curr.itemsRh.push(...r.itemsRh); curr.itemsEquipe.push(...r.itemsEquipe);

      for (let i = 1; i < levels.length; i++) {
        const isLeaf = i === levels.length - 1;
        curr = pushItemNode(curr, levels[i], i, isLeaf, isLeaf ? rowMeta : null);
        curr.orcado += r.orcado; curr.rhEntregue += r.rhEntregue; curr.emEquipe += r.emEquipe;
        curr.itemsRh.push(...r.itemsRh); curr.itemsEquipe.push(...r.itemsEquipe);
      }
    });

    // Ordenar nós principais
    if (matrixViewMode !== 'operacional_status') {
      const grupoOrder = { 'TMA': 1, 'SOT': 2, 'SOC': 3 };
      hierarchy.sort((a, b) => {
        const gA = grupoOrder[a.name] || 99;
        const gB = grupoOrder[b.name] || 99;
        if (gA !== gB) return gA - gB;
        return a.name.localeCompare(b.name);
      });
    } else {
      hierarchy.sort((a, b) => a.name.localeCompare(b.name));
    }

    // Bloco 2: Fora de Equipe (Com Commessa)
    if (bloco2NaoEmEquipe.length > 0) {
      const b2Name = '⚠️ FORA DE EQUIPE (COM COMESSA)';
      const b2Node = {
        name: b2Name, level: 0, orcado: 0, rhEntregue: bloco2NaoEmEquipe.length, emEquipe: 0,
        itemsRh: [...bloco2NaoEmEquipe], itemsEquipe: [], children: {}
      };
      bloco2NaoEmEquipe.forEach(item => {
        const ut = item.base_ut || 'BASE GERAL';
        const com = item.commessa || 'SEM COMESSA';
        const st = item.status_forca || 'OUTROS';
        const ac = item.acao_a_ser_feita || 'NÃO INFORMADO';
        const fn = normalizeFuncao(item.funcao);

        if (!b2Node.children[ut]) b2Node.children[ut] = { name: ut, level: 1, orcado: 0, rhEntregue: 0, emEquipe: 0, itemsRh: [], itemsEquipe: [], children: {} };
        const n1 = b2Node.children[ut]; n1.rhEntregue += 1; n1.itemsRh.push(item);

        if (!n1.children[com]) n1.children[com] = { name: com, level: 2, orcado: 0, rhEntregue: 0, emEquipe: 0, itemsRh: [], itemsEquipe: [], children: {} };
        const n2 = n1.children[com]; n2.rhEntregue += 1; n2.itemsRh.push(item);

        if (!n2.children[st]) n2.children[st] = { name: st, level: 3, orcado: 0, rhEntregue: 0, emEquipe: 0, itemsRh: [], itemsEquipe: [], children: {} };
        const n3 = n2.children[st]; n3.rhEntregue += 1; n3.itemsRh.push(item);

        if (!n3.children[ac]) n3.children[ac] = { name: ac, level: 4, orcado: 0, rhEntregue: 0, emEquipe: 0, itemsRh: [], itemsEquipe: [], children: {} };
        const n4 = n3.children[ac]; n4.rhEntregue += 1; n4.itemsRh.push(item);

        if (!n4.children[fn]) n4.children[fn] = { name: fn, level: 5, orcado: 0, rhEntregue: 0, emEquipe: 0, itemsRh: [], itemsEquipe: [], children: null };
        const n5 = n4.children[fn]; n5.rhEntregue += 1; n5.itemsRh.push(item);
      });
      hierarchy.push(b2Node);
    }

    // Bloco 3: Sem Commessa
    if (bloco3SemComessa.length > 0) {
      const b3Name = '❓ COLABORADORES SEM COMESSA (SOBRA / PENDENTES)';
      const b3Node = {
        name: b3Name, level: 0, orcado: 0, rhEntregue: bloco3SemComessa.length, emEquipe: 0,
        itemsRh: [...bloco3SemComessa], itemsEquipe: [], children: {}
      };
      bloco3SemComessa.forEach(item => {
        const ut = item.base_ut || 'BASE GERAL';
        const st = item.status_forca || 'OUTROS';
        const ac = item.acao_a_ser_feita || 'NÃO INFORMADO';
        const fn = normalizeFuncao(item.funcao);

        if (!b3Node.children[ut]) b3Node.children[ut] = { name: ut, level: 1, orcado: 0, rhEntregue: 0, emEquipe: 0, itemsRh: [], itemsEquipe: [], children: {} };
        const n1 = b3Node.children[ut]; n1.rhEntregue += 1; n1.itemsRh.push(item);

        if (!n1.children[st]) n1.children[st] = { name: st, level: 2, orcado: 0, rhEntregue: 0, emEquipe: 0, itemsRh: [], itemsEquipe: [], children: {} };
        const n2 = n1.children[st]; n2.rhEntregue += 1; n2.itemsRh.push(item);

        if (!n2.children[ac]) n2.children[ac] = { name: ac, level: 3, orcado: 0, rhEntregue: 0, emEquipe: 0, itemsRh: [], itemsEquipe: [], children: {} };
        const n3 = n2.children[ac]; n3.rhEntregue += 1; n3.itemsRh.push(item);

        if (!n3.children[fn]) n3.children[fn] = { name: fn, level: 4, orcado: 0, rhEntregue: 0, emEquipe: 0, itemsRh: [], itemsEquipe: [], children: null };
        const n4 = n3.children[fn]; n4.rhEntregue += 1; n4.itemsRh.push(item);
      });
      hierarchy.push(b3Node);
    }

    const totalOrcado = rawRows.reduce((a, b) => a + b.orcado, 0);
    const totalRh = filteredBaseUnificadaData.length;
    const totalEquipe = filteredBaseUnificadaData.filter(r => r.acao_a_ser_feita === 'Em Equipe').length;
    const totalGapRh = totalRh - totalOrcado;
    const totalGapOpOrcado = totalEquipe - totalOrcado; // NOVA COLUNA!
    const totalGapOperacao = totalEquipe - totalRh;
    const equipesDistintas = new Set(filteredBaseUnificadaData.filter(f => f.equipe && f.equipe !== 'Sobra' && f.equipe !== '--').map(f => f.equipe)).size;

    return {
      rows: rawRows,
      hierarchy,
      filteredBaseUnificadaData,
      rhSemCorrespondencia,
      forcaSemCorrespondencia,
      totalOrcado,
      totalRh,
      totalEquipe,
      totalGapRh,
      totalGapOpOrcado,
      totalGapOperacao,
      equipesDistintas,
      pctRhOrcado: totalOrcado > 0 ? Math.round((totalRh / totalOrcado) * 100) : 0,
      pctEquipeRh: totalRh > 0 ? Math.round((totalEquipe / totalRh) * 100) : 0
    };
  }, [budgetData, baseUnificadaData, searchTerm, matrixViewMode, filterSelBaseUT, filterSelCommessa, filterSelFuncao, filterSelSubgrupo, filterSelAcao]);

  // Listas de Opções dos Selects e 11 Filtros Multi-Seleção
  const commessasDisponiveis = useMemo(() => Object.keys(COMMESSA_MAP), []);
  const funcoesDisponiveis = useMemo(() => {
    const set = new Set();
    budgetData.forEach(b => set.add(normalizeFuncao(b.cargo_funcao)));
    rhData.forEach(r => set.add(normalizeFuncao(r.funcao)));
    return Array.from(set).sort();
  }, [budgetData, rhData]);

  const optionsBaseUT = useMemo(() => Array.from(new Set(forcaData.map(f => f.base_ut).filter(Boolean))).sort(), [forcaData]);
  const optionsFuncao = useMemo(() => Array.from(new Set(forcaData.map(f => f.funcao).filter(Boolean))).sort(), [forcaData]);
  const optionsTurno = useMemo(() => Array.from(new Set(forcaData.map(f => f.turno).filter(Boolean))).sort(), [forcaData]);
  const optionsStatusForca = useMemo(() => Array.from(new Set(forcaData.map(f => f.status_forca).filter(Boolean))).sort(), [forcaData]);
  const optionsAcao = useMemo(() => Array.from(new Set(forcaData.map(f => f.acao_a_ser_feita).filter(Boolean))).sort(), [forcaData]);
  const optionsCommessa = useMemo(() => Array.from(new Set(forcaData.map(f => f.commessa).filter(Boolean))).sort(), [forcaData]);
  const optionsTipoEquipe = useMemo(() => Array.from(new Set(forcaData.map(f => f.tipo_equipe || f.veiculo).filter(Boolean))).sort(), [forcaData]);
  const optionsCNH = useMemo(() => Array.from(new Set(forcaData.map(f => f.cnh).filter(Boolean))).sort(), [forcaData]);
  const optionsSubgrupo = useMemo(() => Array.from(new Set(forcaData.map(f => f.subgrupo).filter(Boolean))).sort(), [forcaData]);
  const optionsHorario = useMemo(() => Array.from(new Set(forcaData.map(f => formatHorarioStr(f.horario, f.turno)).filter(Boolean))).sort(), [forcaData]);
  const optionsAreaAtuacao = useMemo(() => Array.from(new Set(forcaData.map(f => f.area_atuacao).filter(Boolean))).sort(), [forcaData]);

  // Verificador preciso de correspondência de Categoria dos Cards
  const checkCategoryMatch = useCallback((f, category) => {
    if (!category) return true;
    const t = String(f.tipo_equipe || f.veiculo || '').toUpperCase().trim();
    const s = String(f.subgrupo || '').toUpperCase().trim();
    const func = String(f.funcao || '').toUpperCase().trim();
    const eq = String(f.equipe || '').toUpperCase().trim();
    const acao = String(f.acao_a_ser_feita || '').toUpperCase().trim();

    const text = `${t} | ${s} | ${func} | ${eq} | ${acao}`;

    if (category === 'CESTO') {
      return text.includes('CESTO') || text.includes('BASKET') || text.includes('SKY');
    }
    if (category === 'LEVE') {
      return text.includes('LEVE');
    }
    if (category === 'MOTO') {
      return text.includes('MOTO') || text.includes('MOTOCICLISTA') || text.includes('MOTOCICLO') || text.includes('MOP');
    }
    if (category === 'VIVA') {
      return text.includes('LINHA VIVA') || text.includes('VIVA') || /\bLV\b/.test(text);
    }
    if (category === 'MUNK') {
      return text.includes('MUNK') || text.includes('MUNCK') || text.includes('GUINDASTE') || text.includes('GUINDAUTO');
    }
    if (category === 'MORTA') {
      return text.includes('LINHA MORTA') || text.includes('MORTA') || text.includes('DESENERGIZADA') || /\bLM\b/.test(text);
    }
    return true;
  }, []);

  const passesMultiFiltersExceptCard = useCallback((item) => {
    if (filterSelBaseUT.length > 0 && !filterSelBaseUT.includes(item.base_ut)) return false;
    if (filterSelFuncao.length > 0 && !filterSelFuncao.includes(item.funcao)) return false;
    if (filterSelTurno.length > 0 && !filterSelTurno.includes(item.turno)) return false;
    if (filterSelStatusForca.length > 0 && !filterSelStatusForca.includes(item.status_forca)) return false;
    if (filterSelAcao.length > 0 && !filterSelAcao.includes(item.acao_a_ser_feita)) return false;
    if (filterSelCommessa.length > 0 && !filterSelCommessa.includes(item.commessa)) return false;
    if (filterSelTipoEquipe.length > 0 && !filterSelTipoEquipe.includes(item.tipo_equipe || item.veiculo)) return false;
    if (filterSelCNH.length > 0 && !filterSelCNH.includes(item.cnh)) return false;
    if (filterSelSubgrupo.length > 0 && !filterSelSubgrupo.includes(item.subgrupo)) return false;
    if (filterSelHorario.length > 0 && !filterSelHorario.includes(formatHorarioStr(item.horario, item.turno))) return false;
    if (filterSelAreaAtuacao.length > 0 && !filterSelAreaAtuacao.includes(item.area_atuacao)) return false;

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      const matchName = (item.nome || '').toLowerCase().includes(term);
      const matchMat = String(item.matricula || '').toLowerCase().includes(term);
      const matchEquipe = (item.equipe || '').toLowerCase().includes(term);
      const matchFuncao = (item.funcao || '').toLowerCase().includes(term);
      const matchCommessa = (item.commessa || '').toLowerCase().includes(term);
      const matchBase = (item.base_ut || '').toLowerCase().includes(term);
      if (!matchName && !matchMat && !matchEquipe && !matchFuncao && !matchCommessa && !matchBase) return false;
    }

    return true;
  }, [
    filterSelBaseUT, filterSelFuncao, filterSelTurno, filterSelStatusForca,
    filterSelAcao, filterSelCommessa, filterSelTipoEquipe, filterSelCNH,
    filterSelSubgrupo, filterSelHorario, filterSelAreaAtuacao, searchTerm
  ]);

  const passesMultiFilters = useCallback((item) => {
    if (!passesMultiFiltersExceptCard(item)) return false;
    if (cardCategoryFilter && !checkCategoryMatch(item, cardCategoryFilter)) return false;
    return true;
  }, [passesMultiFiltersExceptCard, cardCategoryFilter, checkCategoryMatch]);

  // Indicadores Específicos da Força Operacional com DRILL DOWN (Qtd Equipes / Qtd Colaboradores)
  const forcaKPIs = useMemo(() => {
    const filteredForca = forcaData.filter(f => passesMultiFiltersExceptCard(f));
    const emEquipe = filteredForca.filter(f => f.equipe && f.equipe !== 'Sobra' && f.equipe !== '--');
    const semEquipe = filteredForca.filter(f => !f.equipe || f.equipe === 'Sobra' || f.equipe === '--');
    const totalEquipesFormadas = new Set(emEquipe.map(f => f.equipe)).size;

    // Cesto Aéreo (Caminhão Cesto / Cesto Aéreo)
    const cestoMembers = emEquipe.filter(f => checkCategoryMatch(f, 'CESTO'));
    const cestoEquipes = new Set(cestoMembers.map(f => f.equipe)).size;

    // Leve
    const leveMembers = emEquipe.filter(f => checkCategoryMatch(f, 'LEVE'));
    const leveEquipes = new Set(leveMembers.map(f => f.equipe)).size;

    // Moto
    const motoMembers = emEquipe.filter(f => checkCategoryMatch(f, 'MOTO'));
    const motoEquipes = new Set(motoMembers.map(f => f.equipe)).size;

    // Linha Viva
    const linhaVivaMembers = emEquipe.filter(f => checkCategoryMatch(f, 'VIVA'));
    const linhaVivaEquipes = new Set(linhaVivaMembers.map(f => f.equipe)).size;

    // Munk (Munck / Guindaste)
    const munkMembers = emEquipe.filter(f => checkCategoryMatch(f, 'MUNK'));
    const munkEquipes = new Set(munkMembers.map(f => f.equipe)).size;

    // Linha Morta
    const linhaMortaMembers = emEquipe.filter(f => checkCategoryMatch(f, 'MORTA'));
    const linhaMortaEquipes = new Set(linhaMortaMembers.map(f => f.equipe)).size;

    return {
      totalEmEquipe: emEquipe.length,
      totalSemEquipe: semEquipe.length,
      totalEquipesFormadas,
      cestoEquipes,
      cestoCount: cestoMembers.length,
      leveEquipes,
      leveCount: leveMembers.length,
      motoEquipes,
      motoCount: motoMembers.length,
      linhaVivaEquipes,
      linhaVivaCount: linhaVivaMembers.length,
      munkEquipes,
      munkCount: munkMembers.length,
      linhaMortaEquipes,
      linhaMortaCount: linhaMortaMembers.length
    };
  }, [forcaData, passesMultiFiltersExceptCard, checkCategoryMatch]);

  // Lista de Colaboradores na Sobra (Sem Equipe)
  const colaboradoresSobra = useMemo(() => {
    return forcaData.filter(f => (!f.equipe || f.equipe === 'Sobra' || f.equipe === '--') && passesMultiFilters(f));
  }, [forcaData, passesMultiFilters]);

  // Helper para verificar se um segmento está recolhido (por padrão: TRUE / Recolhido)
  const isSegmentCollapsed = useCallback((key) => {
    if (collapsedKeys[key] !== undefined) {
      return collapsedKeys[key];
    }
    return true; // RECOLHIDO POR PADRÃO PARA ALTA PERFORMANCE
  }, [collapsedKeys]);

  // ==========================================
  // HIERARQUIA RECOLHÍVEL MULTI-NÍVEL (GRUPO -> BASE UT -> ÁREA DE ATUAÇÃO -> EQUIPES)
  // ==========================================
  const forcaGroupedHierarchy = useMemo(() => {
    let list = forcaData.filter(f => f.equipe && f.equipe !== 'Sobra' && f.equipe !== '--');
    list = list.filter(f => passesMultiFilters(f));

    const grupoOrderMap = { 'TMA': 1, 'SOT': 2, 'SOC': 3, 'OUTROS': 4 };
    const utOrderMap = { 'BASE NORTE': 1, 'BASE LESTE': 2, 'OUTROS': 3 };

    const structure = {};

    list.forEach(item => {
      const rawSubgrupo = String(item.subgrupo || '').toUpperCase();
      const veiculoUpper = String(item.veiculo || '').toUpperCase();
      const areaUpper = String(item.area_atuacao || 'SEM BASE').toUpperCase();
      const utUpper = String(item.base_ut || '').toUpperCase();

      // 1. Determinar Grupo Principal (TMA, SOT, SOC, OUTROS)
      let grupoName = 'TMA';
      if (rawSubgrupo.includes('SOT') || veiculoUpper.includes('VIVA') || veiculoUpper.includes('MORTA') || areaUpper.includes('SOT')) {
        grupoName = 'SOT';
      } else if (rawSubgrupo.includes('SOC') || areaUpper.includes('SOC') || areaUpper.includes('AUTOMAÇÃO')) {
        grupoName = 'SOC';
      } else if (areaUpper.includes('APOIO') || areaUpper.includes('QUALIDADE') || areaUpper.includes('PODA') || areaUpper.includes('SEM BASE')) {
        grupoName = 'OUTROS';
      } else if (rawSubgrupo.includes('TMA') || veiculoUpper.includes('CESTO') || veiculoUpper.includes('LEVE') || veiculoUpper.includes('MOTO')) {
        grupoName = 'TMA';
      } else if (rawSubgrupo) {
        grupoName = rawSubgrupo;
      }

      // 2. Determinar Base UT (BASE NORTE, BASE LESTE, etc.)
      let baseUtName = 'BASE NORTE';
      if (utUpper.includes('LESTE') || areaUpper.includes('MONTE SANTO') || areaUpper.includes('CATUMBI') || areaUpper.includes('ARICANDUVA') || areaUpper.includes('SANTO ANDRÉ') || areaUpper.includes('SOT SUL') || areaUpper.includes('SOC')) {
        baseUtName = 'BASE LESTE';
      } else if (utUpper.includes('NORTE') || areaUpper.includes('FAGUNDES') || areaUpper.includes('CAJATI') || areaUpper.includes('VILA MEDEIROS')) {
        baseUtName = 'BASE NORTE';
      } else if (utUpper) {
        baseUtName = utUpper;
      } else {
        baseUtName = 'BASE GERAL';
      }

      const areaName = areaUpper;
      const turnoStr = String(item.turno || '1 - MANHÃ').toUpperCase();
      let turnoName = 'MANHÃ';
      if (turnoStr.includes('TARDE') || turnoStr.includes('2')) turnoName = 'TARDE';
      if (turnoStr.includes('NOITE') || turnoStr.includes('3')) turnoName = 'NOITE';

      // Nível 4: Título da Equipe / Turno (SEM O RÓTULO DE SUPERVISOR)
      const subTurnoTitle = `EQUIPES ${item.subgrupo || grupoName} ${turnoName}`;
      const horarioTitle = `EQUIPES ${item.subgrupo || grupoName} ${turnoName} ${formatHorarioStr(item.horario, item.turno)}`;

      // Nível 1: Grupo
      if (!structure[grupoName]) {
        structure[grupoName] = {
          grupoName,
          grupoOrder: grupoOrderMap[grupoName] || 99,
          bases: {}
        };
      }

      // Nível 2: Base UT
      if (!structure[grupoName].bases[baseUtName]) {
        structure[grupoName].bases[baseUtName] = {
          baseUtName,
          baseOrder: utOrderMap[baseUtName] || 99,
          areas: {}
        };
      }

      // Nível 3: Área de Atuação
      if (!structure[grupoName].bases[baseUtName].areas[areaName]) {
        structure[grupoName].bases[baseUtName].areas[areaName] = {
          areaName,
          subgrupoTurnos: {}
        };
      }

      // Nível 4: Turnos & Horários
      const subTurnoKey = `${item.subgrupo || grupoName}_${turnoName}`;
      if (!structure[grupoName].bases[baseUtName].areas[areaName].subgrupoTurnos[subTurnoKey]) {
        structure[grupoName].bases[baseUtName].areas[areaName].subgrupoTurnos[subTurnoKey] = {
          subTurnoKey,
          subTurnoTitle,
          subgrupoName: item.subgrupo || grupoName,
          turnoName,
          horarios: {}
        };
      }

      if (!structure[grupoName].bases[baseUtName].areas[areaName].subgrupoTurnos[subTurnoKey].horarios[horarioTitle]) {
        structure[grupoName].bases[baseUtName].areas[areaName].subgrupoTurnos[subTurnoKey].horarios[horarioTitle] = {
          horarioTitle,
          horarioValue: item.horario,
          horarioTurno: item.turno,
          equipes: {}
        };
      }

      const eqCode = item.equipe;
      if (!structure[grupoName].bases[baseUtName].areas[areaName].subgrupoTurnos[subTurnoKey].horarios[horarioTitle].equipes[eqCode]) {
        structure[grupoName].bases[baseUtName].areas[areaName].subgrupoTurnos[subTurnoKey].horarios[horarioTitle].equipes[eqCode] = [];
      }

      structure[grupoName].bases[baseUtName].areas[areaName].subgrupoTurnos[subTurnoKey].horarios[horarioTitle].equipes[eqCode].push(item);
    });

    const sortedGrupos = Object.values(structure).sort((a, b) => a.grupoOrder - b.grupoOrder);
    return sortedGrupos;
  }, [forcaData, passesMultiFilters]);

  // Função para Exportar Equipes no formato Excel respeitando os filtros e a visualização
  const handleExportEquipes = useCallback(() => {
    if (!forcaGroupedHierarchy || forcaGroupedHierarchy.length === 0) return;
    const rows = [];
    forcaGroupedHierarchy.forEach(areaItem => {
      Object.values(areaItem.subgrupoTurnos).forEach(stItem => {
        Object.values(stItem.horarios).forEach(horarioItem => {
          Object.entries(horarioItem.equipes).forEach(([eqCode, membros]) => {
            const first = membros[0] || {};
            const integrantesStr = membros.map(m => `${m.nome} (${m.funcao})`).join(' | ');
            rows.push({
              'Área de Atuação': areaItem.areaName,
              'Subgrupo': stItem.subgrupoName,
              'Turno': stItem.turnoName,
              'Horário': formatHorarioStr(horarioItem.horarioValue, horarioItem.horarioTurno),
              'Supervisor': stItem.supervisor,
              'Código da Equipe': eqCode,
              'Tipo de Equipe': first.tipo_equipe || first.veiculo || 'N/I',
              'Placa do Veículo': first.placa_veiculo || first.placa || 'N/I',
              'Telefone da Equipe': first.telefone_equipe || first.telefone || 'N/I',
              'Status Câmera': first.status_camera || first.camera || 'N/I',
              'Qtd Integrantes': membros.length,
              'Integrantes': integrantesStr
            });
          });
        });
      });
    });

    if (rows.length === 0) return;
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Equipes');
    XLSX.writeFile(wb, `Equipes_Forca_Operacional_${new Date().toISOString().slice(0, 10)}.xlsx`);
  }, [forcaGroupedHierarchy]);

  // Handler para Expandir / Recolher Tudo
  const handleToggleExpandAll = useCallback(() => {
    const isAnyCollapsed = Object.keys(collapsedKeys).length > 0;
    
    if (isAnyCollapsed) {
      // Se há algo recolhido, expandir tudo
      setCollapsedKeys({});
    } else {
      // Se tudo está expandido, recolher todas as chaves
      const allKeys = {};
      forcaGroupedHierarchy.forEach(area => {
        allKeys[`AREA_${area.areaName}`] = true;
        Object.values(area.subgrupoTurnos).forEach(st => {
          allKeys[`ST_${area.areaName}_${st.subTurnoKey}`] = true;
          Object.values(st.horarios).forEach(h => {
            const horKey = `HOR_${area.areaName}_${st.subTurnoKey}_${h.horarioTitle}`;
            allKeys[horKey] = true;
          });
        });
      });
      allKeys['SOBRA'] = true;
      setCollapsedKeys(allKeys);
    }
  }, [collapsedKeys, forcaGroupedHierarchy]);

  // ==========================================
  // HANDLERS DE EDIÇÃO E CRIAÇÃO DE EQUIPES
  // ==========================================

  const handleOpenEditModal = (eqCode, membros) => {
    if (!canFormarEquipe) {
      showNotification('Você não possui permissão na Matriz de Acessos para editar a composição da equipe.', true);
      return;
    }
    setEditingEquipe({ code: eqCode, membros: [...membros] });
    setEditTeamCodeInput(eqCode);
    setEditSobraSearchTerm('');

    // Inicializar lado PARA (Formação Sugerida)
    setParaMembros([...membros]);
    setParaTeamCodeInput(eqCode);
    setParaPlacaInput(membros[0]?.placa_veiculo || '');
    setParaTelefoneInput(membros[0]?.telefone || '');
    setParaCameraInput(membros[0]?.camera || 'NÃO INFORMADO');
  };

  const handleSubmitDeParaEditRequest = async () => {
    if (!editingEquipe) return;
    const oldCode = editingEquipe.code;
    const deMembros = editingEquipe.membros;

    const newCode = paraTeamCodeInput.trim().toUpperCase() || oldCode;
    const newPlaca = paraPlacaInput.trim().toUpperCase();
    const newTelefone = paraTelefoneInput.trim();
    const newCamera = paraCameraInput;

    if (!canFormarEquipe) {
      showNotification('Você não possui permissão na Matriz de Acessos para salvar edições de equipes.', true);
      setEditingEquipe(null);
      return;
    }

    // Edição Direta (Coordenadores, Gerentes, Administradores)
    const paraMatriculas = new Set(paraMembros.map(m => String(m.matricula)));

    const updated = forcaData.map(f => {
      const isCurrentlyInTeam = f.equipe === oldCode;
      const isInNewProposal = paraMatriculas.has(String(f.matricula));

      if (isInNewProposal) {
        return {
          ...f,
          equipe: newCode,
          placa_veiculo: newPlaca !== undefined ? newPlaca : f.placa_veiculo,
          telefone: newTelefone !== undefined ? newTelefone : f.telefone,
          camera: newCamera !== undefined ? newCamera : f.camera
        };
      } else if (isCurrentlyInTeam) {
        return { ...f, equipe: 'Sobra' };
      }
      return f;
    });

    setForcaData(updated);
    localStorage.setItem('fleet_forca_operacional_cache', JSON.stringify(updated));
    showNotification(`Equipe ${newCode} atualizada com sucesso!`);
    logAudit({
      tipo_acao: 'EDITAR_EQUIPE_DE_PARA',
      entidade_tipo: 'EQUIPE',
      entidade_id: oldCode,
      campo_alterado: 'equipe',
      valor_anterior: oldCode,
      valor_novo: newCode,
      detalhes: { de: deMembros.map(m => m.nome), para: paraMembros.map(m => m.nome) }
    });

    try {
      if (oldCode !== newCode) {
        await supabase.from('forca_operacional').update({ equipe: newCode }).eq('equipe', oldCode);
      }
      for (const m of paraMembros) {
        await supabase.from('forca_operacional').update({
          equipe: newCode,
          placa_veiculo: newPlaca,
          telefone: newTelefone,
          camera: newCamera
        }).eq('matricula', m.matricula);
      }
    } catch (e) {
      console.warn('Erro Supabase:', e);
    }

    setEditingEquipe(null);
  };

  const handleRenameTeamCode = async () => {
    if (!editingEquipe || !editTeamCodeInput.trim()) return;
    const newCode = editTeamCodeInput.trim().toUpperCase();
    const oldCode = editingEquipe.code;
    if (newCode === oldCode) return;

    if (!canFormarEquipe) {
      showNotification('Você não possui permissão na Matriz de Acessos para renomear equipes.', true);
      return;
    }

    const updated = forcaData.map(f => f.equipe === oldCode ? { ...f, equipe: newCode } : f);
    setForcaData(updated);
    localStorage.setItem('fleet_forca_operacional_cache', JSON.stringify(updated));
    setEditingEquipe(prev => ({ ...prev, code: newCode }));
    showNotification(`Código da equipe alterado de ${oldCode} para ${newCode}!`);
    logAudit({ tipo_acao: 'RENOMEAR_EQUIPE', entidade_tipo: 'EQUIPE', entidade_id: oldCode, campo_alterado: 'equipe', valor_anterior: oldCode, valor_novo: newCode });

    try { await supabase.from('forca_operacional').update({ equipe: newCode }).eq('equipe', oldCode); } catch (e) { console.warn('Erro Supabase:', e); }
  };

  const handleRemoveMemberFromEquipe = async (matricula) => {
    const membro = forcaData.find(f => f.matricula === matricula);
    const equipeAnterior = membro?.equipe || '';

    if (!canFormarEquipe) {
      showNotification('Você não possui permissão na Matriz de Acessos para remover integrantes de equipes.', true);
      return;
    }

    const updated = forcaData.map(f => f.matricula === matricula ? { ...f, equipe: 'Sobra' } : f);
    setForcaData(updated);
    localStorage.setItem('fleet_forca_operacional_cache', JSON.stringify(updated));
    showNotification('Colaborador movido para a Sobra (Sem Equipe).');
    logAudit({ tipo_acao: 'REMOVER_MEMBRO', entidade_tipo: 'COLABORADOR', entidade_id: matricula, campo_alterado: 'equipe', valor_anterior: equipeAnterior, valor_novo: 'Sobra', detalhes: { nome: membro?.nome } });

    try { await supabase.from('forca_operacional').update({ equipe: 'Sobra' }).eq('matricula', matricula); } catch (e) { console.warn('Erro Supabase:', e); }
  };

  const handleAddMemberToEquipe = async (matricula, targetEquipeCode) => {
    const membro = forcaData.find(f => f.matricula === matricula);

    if (!canFormarEquipe) {
      showNotification('Você não possui permissão na Matriz de Acessos para alocar colaboradores em equipes.', true);
      return;
    }

    const updated = forcaData.map(f => f.matricula === matricula ? { ...f, equipe: targetEquipeCode } : f);
    setForcaData(updated);
    localStorage.setItem('fleet_forca_operacional_cache', JSON.stringify(updated));
    showNotification(`Colaborador adicionado à equipe ${targetEquipeCode}.`);
    logAudit({ tipo_acao: 'ADICIONAR_MEMBRO', entidade_tipo: 'COLABORADOR', entidade_id: matricula, campo_alterado: 'equipe', valor_anterior: membro?.equipe || 'Sobra', valor_novo: targetEquipeCode, detalhes: { nome: membro?.nome } });

    try { await supabase.from('forca_operacional').update({ equipe: targetEquipeCode }).eq('matricula', matricula); } catch (e) { console.warn('Erro Supabase:', e); }
  };

  const handleDisbandEquipe = (eqCode) => {
    if (!canFormarEquipe) {
      showNotification('Você não possui permissão na Matriz de Acessos para desfazer equipes.', true);
      return;
    }

    setDisbandConfirmEquipe(eqCode);
  };

  const executeDisbandEquipe = async (eqCode) => {
    if (!canFormarEquipe) {
      showNotification('Você não possui permissão na Matriz de Acessos para desfazer equipes.', true);
      return;
    }
    setDisbandConfirmEquipe(null);
    const membrosNomes = forcaData.filter(f => f.equipe === eqCode).map(f => f.nome);
    const updated = forcaData.map(f => f.equipe === eqCode ? { ...f, equipe: 'Sobra' } : f);
    setForcaData(updated);
    localStorage.setItem('fleet_forca_operacional_cache', JSON.stringify(updated));
    showNotification(`Equipe ${eqCode} desfeita. Integrantes devolvidos à Sobra.`);
    logAudit({
      tipo_acao: 'DESFAZER_EQUIPE',
      entidade_tipo: 'EQUIPE',
      entidade_id: eqCode,
      campo_alterado: 'equipe',
      valor_anterior: eqCode,
      valor_novo: 'Sobra',
      detalhes: { integrantes_desfeitos: membrosNomes }
    });

    try {
      await supabase.from('forca_operacional').update({ equipe: 'Sobra' }).eq('equipe', eqCode);
    } catch (e) {
      console.warn('Erro Supabase ao desmembrar equipe:', e);
    }
  };

  const handleCreateNewEquipe = async () => {
    if (!canFormarEquipe) {
      showNotification('Você não possui permissão na Matriz de Acessos para criar novas equipes.', true);
      return;
    }
    if (!newEquipeCode.trim()) {
      showNotification('Por favor, informe o código da nova equipe (ex: ENL150).', true);
      return;
    }
    if (selectedSobraMembers.length === 0) {
      showNotification('Selecione pelo menos 1 colaborador da Sobra para integrar a equipe.', true);
      return;
    }

    const code = newEquipeCode.trim().toUpperCase();
    const membrosNomes = forcaData.filter(f => selectedSobraMembers.includes(f.matricula)).map(f => f.nome);
    const updated = forcaData.map(f => {
      if (selectedSobraMembers.includes(f.matricula)) {
        return {
          ...f,
          equipe: code,
          veiculo: newEquipeVeiculo,
          subgrupo: newEquipeSubgrupo,
          turno: newEquipeTurno,
          horario: newEquipeHorario,
          area_atuacao: newEquipeArea
        };
      }
      return f;
    });

    setForcaData(updated);
    localStorage.setItem('fleet_forca_operacional_cache', JSON.stringify(updated));
    setIsNewEquipeModalOpen(false);
    setNewEquipeCode('');
    setSelectedSobraMembers([]);
    showNotification(`Nova equipe ${code} criada com ${selectedSobraMembers.length} membros!`);
    logAudit({ tipo_acao: 'CRIAR_EQUIPE', entidade_tipo: 'EQUIPE', entidade_id: code, campo_alterado: 'equipe', valor_anterior: 'Sobra', valor_novo: code, detalhes: { membros: membrosNomes, veiculo: newEquipeVeiculo, subgrupo: newEquipeSubgrupo } });

    try {
      for (const mat of selectedSobraMembers) {
        await supabase.from('forca_operacional').update({
          equipe: code,
          veiculo: newEquipeVeiculo,
          subgrupo: newEquipeSubgrupo,
          turno: `${newEquipeTurno} [H:${newEquipeHorario}]`,
          area_atuacao: newEquipeArea
        }).eq('matricula', mat);
      }
    } catch (e) {
      console.warn('Erro ao gravar nova equipe no Supabase:', e);
    }
  };

  const filteredSobraForEditModal = useMemo(() => {
    if (!editSobraSearchTerm.trim()) return colaboradoresSobra;
    const term = editSobraSearchTerm.toLowerCase();
    return colaboradoresSobra.filter(c =>
      c.nome.toLowerCase().includes(term) ||
      c.matricula.toLowerCase().includes(term) ||
      c.funcao.toLowerCase().includes(term)
    );
  }, [colaboradoresSobra, editSobraSearchTerm]);

  const filteredSobraForNewModal = useMemo(() => {
    if (!newSobraSearchTerm.trim()) return colaboradoresSobra;
    const term = newSobraSearchTerm.toLowerCase();
    return colaboradoresSobra.filter(c =>
      c.nome.toLowerCase().includes(term) ||
      c.matricula.toLowerCase().includes(term) ||
      c.funcao.toLowerCase().includes(term)
    );
  }, [colaboradoresSobra, newSobraSearchTerm]);

  const turnoOrderMap = { 'MANHÃ': 1, 'TARDE': 2, 'NOITE': 3 };

  return (
    <div className="space-y-8 max-w-[1600px] mx-auto p-2 sm:p-4 animate-in fade-in duration-300">
      
      {/* HERO HEADER - APPLE LIQUID GLASS & MATERIAL 3 EXPRESSIVE */}
      <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-indigo-900 via-slate-900 to-indigo-950 p-8 sm:p-10 text-white shadow-2xl border border-white/20 backdrop-blur-2xl">
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 bg-gradient-to-br from-indigo-500/20 via-purple-500/20 to-transparent rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-12 w-80 h-80 bg-gradient-to-tr from-emerald-500/15 to-transparent rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-3.5 py-1 rounded-full text-[11px] font-black uppercase tracking-widest bg-gradient-to-r from-indigo-500/30 to-purple-500/30 text-indigo-200 border border-indigo-400/30 backdrop-blur-md flex items-center gap-1.5 shadow-inner">
                <Sparkles size={13} className="text-indigo-400 animate-pulse" /> Módulo de Inteligência Operacional
              </span>
              <span className="px-3 py-1 rounded-full text-[11px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Ciclo Integrado 3 Passos
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight bg-gradient-to-r from-white via-slate-100 to-indigo-200 bg-clip-text text-transparent">
              Gestão de Força de Trabalho
            </h1>
            <p className="text-sm sm:text-base text-slate-300 max-w-2xl font-medium leading-relaxed">
              Cruzamento contínuo entre <strong className="text-emerald-300">Orçamento (Budget)</strong>, <strong className="text-amber-300">Contratação (RH)</strong> e <strong className="text-rose-300">Força Operacional por Linhas</strong>.
            </p>
          </div>

          {/* UPLOADS INDIVIDUAIS DE EXCEL */}
          <div className="flex flex-wrap items-center gap-3">
            {canCarregarBudget && (
              <label className="cursor-pointer group px-4 py-3 bg-white/10 hover:bg-white/20 active:scale-95 border border-white/20 rounded-2xl backdrop-blur-md text-white text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 shadow-lg">
                <Upload size={16} className="group-hover:translate-y-[-2px] transition-transform text-emerald-400" />
                <span>Budget (Excel)</span>
                <input type="file" accept=".xlsx,.xls" onChange={handleUploadBudget} className="hidden" disabled={!!uploadingType} />
              </label>
            )}

            {canCarregarForcaOp && (
              <label className="cursor-pointer group px-4 py-3 bg-white/10 hover:bg-white/20 active:scale-95 border border-white/20 rounded-2xl backdrop-blur-md text-white text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 shadow-lg">
                <Upload size={16} className="group-hover:translate-y-[-2px] transition-transform text-amber-400" />
                <span>Base RH & OP (Excel)</span>
                <input type="file" accept=".xlsx,.xls" onChange={handleUploadBaseUnificada} className="hidden" disabled={!!uploadingType} />
              </label>
            )}
          </div>
        </div>

        {/* SUB-NAVEGAÇÃO DE ABAS INTERNAS */}
        <div className="relative z-10 mt-8 pt-6 border-t border-white/10 flex items-center gap-2 overflow-x-auto no-scrollbar">
          {[
            { id: 'visao_geral', label: '1. Visão Geral (Gaps)', icon: <TrendingUp size={18} />, color: 'from-indigo-500 to-purple-600' },
            { id: 'budget', label: '2. Budget (Orçamento)', icon: <FileSpreadsheet size={18} />, color: 'from-emerald-500 to-teal-600' },
            { id: 'base_unificada', label: '3. Base RH & Operação', icon: <Users size={18} />, color: 'from-amber-500 to-orange-600' },
            { id: 'solicitacao_vagas', label: '4. Solicitação de Vagas (RH)', icon: <UserPlus size={18} />, color: 'from-blue-500 to-indigo-600' }
          ].map(tab => {
            const isActive = activeSubTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveSubTab(tab.id)}
                className={`px-5 py-3.5 rounded-2xl font-black text-xs uppercase tracking-wider transition-all duration-200 flex items-center gap-2.5 shrink-0 backdrop-blur-md ${
                  isActive
                    ? `bg-gradient-to-r ${tab.color} text-white shadow-xl shadow-indigo-500/25 scale-[1.02] border border-white/30`
                    : 'bg-white/5 hover:bg-white/15 text-slate-300 hover:text-white border border-white/5'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* FEEDBACK TOASTS */}
      {rejectionToast && (
        <div className="p-4 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-800 dark:text-rose-200 font-bold text-sm flex items-center justify-between gap-3 animate-in slide-in-from-top-2 shadow-lg">
          <div className="flex items-center gap-3">
            <XCircle size={22} className="text-rose-500 shrink-0" />
            <span>{rejectionToast}</span>
          </div>
          <button
            onClick={() => setShowApprovalPanel(true)}
            className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black uppercase tracking-wider transition-all"
          >
            Ver Solicitações
          </button>
        </div>
      )}
      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 font-bold text-sm flex items-center gap-3 animate-in slide-in-from-top-2">
          <CheckCircle2 size={20} className="text-emerald-500 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-700 dark:text-rose-300 font-bold text-sm flex items-center gap-3 animate-in slide-in-from-top-2">
          <AlertTriangle size={20} className="text-rose-500 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* BARRA DE FILTROS MULTI-SELEÇÃO SIMULTÂNEOS E BUSCA (11 COLUNAS) */}
      <div className="p-5 rounded-3xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl border border-slate-200/80 dark:border-slate-800 shadow-xl space-y-4 relative z-40">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="relative flex-1 min-w-[280px]">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por Nome, Matrícula, Função, Equipe, Commessa, Base UT..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 rounded-2xl bg-slate-100/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
            />
          </div>

          <button
            onClick={handleExportEquipes}
            className="px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider shadow-md shadow-emerald-500/20 active:scale-95 flex items-center gap-2"
            title="Exportar equipes visualizadas com os filtros aplicados"
          >
            <Download size={15} /> Exportar Equipes (Excel)
          </button>
        </div>

        <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-slate-100 dark:border-slate-800 relative z-40">
          <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 mr-1 flex items-center gap-1">
            <Filter size={13} /> Filtros Multi-Seleção:
          </span>

          <MultiSelectFilterDropdown label="Base UT" options={optionsBaseUT} selectedValues={filterSelBaseUT} onChange={setFilterSelBaseUT} />
          <MultiSelectFilterDropdown label="Função" options={optionsFuncao} selectedValues={filterSelFuncao} onChange={setFilterSelFuncao} />
          <MultiSelectFilterDropdown label="Turno" options={optionsTurno} selectedValues={filterSelTurno} onChange={setFilterSelTurno} />
          <MultiSelectFilterDropdown label="Status Força" options={optionsStatusForca} selectedValues={filterSelStatusForca} onChange={setFilterSelStatusForca} />
          <MultiSelectFilterDropdown label="Ação a ser Feita" options={optionsAcao} selectedValues={filterSelAcao} onChange={setFilterSelAcao} />
          <MultiSelectFilterDropdown label="Commessa" options={optionsCommessa} selectedValues={filterSelCommessa} onChange={setFilterSelCommessa} />
          <MultiSelectFilterDropdown label="Tipo de Equipe" options={optionsTipoEquipe} selectedValues={filterSelTipoEquipe} onChange={setFilterSelTipoEquipe} />
          <MultiSelectFilterDropdown label="CNH" options={optionsCNH} selectedValues={filterSelCNH} onChange={setFilterSelCNH} />
          <MultiSelectFilterDropdown label="Subgrupo" options={optionsSubgrupo} selectedValues={filterSelSubgrupo} onChange={setFilterSelSubgrupo} />
          <MultiSelectFilterDropdown label="Horário" options={optionsHorario} selectedValues={filterSelHorario} onChange={setFilterSelHorario} />
          <MultiSelectFilterDropdown label="Área de Atuação" options={optionsAreaAtuacao} selectedValues={filterSelAreaAtuacao} onChange={setFilterSelAreaAtuacao} />

          {cardCategoryFilter && (
            <span className="px-2.5 py-1 rounded-xl bg-indigo-600 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm animate-in fade-in">
              Card: {
                cardCategoryFilter === 'CESTO' ? '🚛 Cesto Aéreo' :
                cardCategoryFilter === 'LEVE' ? '🚗 Leve' :
                cardCategoryFilter === 'MOTO' ? '🏍️ Moto' :
                cardCategoryFilter === 'VIVA' ? '⚡ Linha Viva' :
                cardCategoryFilter === 'MUNK' ? '🏗️ Munk' : '🚛 Linha Morta'
              }
              <button onClick={() => setCardCategoryFilter(null)} className="hover:text-rose-200"><X size={13} /></button>
            </span>
          )}

          {(filterSelBaseUT.length > 0 || filterSelFuncao.length > 0 || filterSelTurno.length > 0 || filterSelStatusForca.length > 0 || filterSelAcao.length > 0 || filterSelCommessa.length > 0 || filterSelTipoEquipe.length > 0 || filterSelCNH.length > 0 || filterSelSubgrupo.length > 0 || filterSelHorario.length > 0 || filterSelAreaAtuacao.length > 0 || cardCategoryFilter || searchTerm) && (
            <button
              onClick={() => {
                setFilterSelBaseUT([]); setFilterSelFuncao([]); setFilterSelTurno([]); setFilterSelStatusForca([]);
                setFilterSelAcao([]); setFilterSelCommessa([]); setFilterSelTipoEquipe([]); setFilterSelCNH([]);
                setFilterSelSubgrupo([]); setFilterSelHorario([]); setFilterSelAreaAtuacao([]); setCardCategoryFilter(null); setSearchTerm('');
              }}
              className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-bold transition-all flex items-center gap-1 ml-auto"
            >
              <X size={14} /> Limpar Filtros
            </button>
          )}
        </div>
      </div>

      {/* ABA 1: VISÃO GERAL */}
      {activeSubTab === 'visao_geral' && (
        <div className="space-y-8 animate-in fade-in duration-300">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="p-6 rounded-3xl bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 shadow-xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-28 h-28 bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-500/20 transition-all pointer-events-none" />
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <FileSpreadsheet size={15} className="text-emerald-500" /> Passo 1: Budget Orçado
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                  Meta Total
                </span>
              </div>
              <div className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
                {summaryCalculations.totalOrcado} <span className="text-sm font-bold text-slate-400">pessoas</span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 font-medium">
                Headcount orçado para os diretos
              </p>
            </div>

            <div className="p-6 rounded-3xl bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 shadow-xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-28 h-28 bg-amber-500/10 rounded-full blur-2xl group-hover:bg-amber-500/20 transition-all pointer-events-none" />
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Users size={15} className="text-amber-500" /> Passo 2: Mão de Obra RH
                </span>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold flex items-center gap-1 ${
                  summaryCalculations.totalGapRh >= 0 ? 'bg-emerald-500/15 text-emerald-600' : 'bg-rose-500/15 text-rose-600'
                }`}>
                  {summaryCalculations.totalGapRh >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                  Gap: {summaryCalculations.totalGapRh}
                </span>
              </div>
              <div className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight flex items-baseline gap-2">
                {summaryCalculations.totalRh}
                <span className="text-xs font-extrabold text-amber-500">
                  ({summaryCalculations.pctRhOrcado}% da Meta)
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 mt-3 overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, summaryCalculations.pctRhOrcado)}%` }}
                />
              </div>
            </div>

            <div className="p-6 rounded-3xl bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 shadow-xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-28 h-28 bg-rose-500/10 rounded-full blur-2xl group-hover:bg-rose-500/20 transition-all pointer-events-none" />
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Wrench size={15} className="text-rose-500" /> Passo 3: Força em Equipes
                </span>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold flex items-center gap-1 ${
                  summaryCalculations.totalGapOperacao >= 0 ? 'bg-emerald-500/15 text-emerald-600' : 'bg-amber-500/15 text-amber-600'
                }`}>
                  Alocação: {summaryCalculations.pctEquipeRh}%
                </span>
              </div>
              <div className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
                {summaryCalculations.totalEquipe} <span className="text-sm font-bold text-slate-400">alocados</span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 font-medium">
                Alocados em equipes ativas na operação
              </p>
            </div>

            <div className="p-6 rounded-3xl bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 shadow-xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-28 h-28 bg-indigo-500/10 rounded-full blur-2xl group-hover:bg-indigo-500/20 transition-all pointer-events-none" />
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Layers size={15} className="text-indigo-500" /> Equipes Operacionais
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-indigo-500/15 text-indigo-600 dark:text-indigo-400">
                  Formadas
                </span>
              </div>
              <div className="text-3xl sm:text-4xl font-black text-indigo-600 dark:text-indigo-400 tracking-tight">
                {summaryCalculations.equipesDistintas} <span className="text-sm font-bold text-slate-400">equipes</span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 font-medium">
                Equipes ativas formadas no sistema
              </p>
            </div>
          </div>

          {/* TABELA PIVÔ DE CRUZAMENTO */}
          <div className="p-6 sm:p-8 rounded-3xl bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 shadow-xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/60 dark:border-slate-800 pb-5">
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                  Matriz de Cruzamento: Budget × RH × Operação
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  Análise detalhada de aderência por Commessa e Função (Sumarizado sem segregação de turno)
                </p>
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                {/* BOTÃO EXPORTAR BASE UNIFICADA */}
                <button
                  type="button"
                  onClick={handleExportFullBase}
                  className="px-3.5 py-2 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-lg hover:shadow-emerald-500/20 transition-all flex items-center gap-2 cursor-pointer"
                  title="Exportar base unificada completa da força operacional em Excel"
                >
                  <Download size={15} /> Exportar Força OP
                </button>

                {/* TOGGLE DE VISÃO DA MATRIZ (3 VISÕES) */}
                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-inner">
                  <button
                    type="button"
                    onClick={() => setMatrixViewMode('budget_full')}
                    className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer ${
                      matrixViewMode === 'budget_full'
                        ? 'bg-indigo-600 text-white shadow-md'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                    title="Visão 1: Grupo > COMMESSA > Base UT > Subgrupo > Base Contrato > Cargo/Função"
                  >
                    <Layers size={14} /> 1. Budget Completa (6 Níveis)
                  </button>
                  <button
                    type="button"
                    onClick={() => setMatrixViewMode('budget_simple')}
                    className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer ${
                      matrixViewMode === 'budget_simple'
                        ? 'bg-indigo-600 text-white shadow-md'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                    title="Visão 2: Grupo > COMMESSA > Base UT > Cargo/Função"
                  >
                    <Layers2 size={14} /> 2. Budget Simplificada (4 Níveis)
                  </button>
                  <button
                    type="button"
                    onClick={() => setMatrixViewMode('operacional_status')}
                    className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer ${
                      matrixViewMode === 'operacional_status'
                        ? 'bg-indigo-600 text-white shadow-md'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                    title="Visão 3: Base UT > Subgrupo > Base Contrato > Cargo/Função"
                  >
                    <Wrench size={14} /> 3. Prontidão Operacional
                  </button>
                </div>

                <span
                  title="Quantidade de combinações/linhas ativas na matriz de cruzamento geradas com base nos dados e filtros aplicados"
                  className="px-3 py-1.5 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-xs font-black cursor-help"
                >
                  {summaryCalculations.rows.length} Linhas de Agrupamento
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-black uppercase tracking-wider text-slate-400">
                    <th className="py-3.5 px-4 relative group select-none" style={{ width: `${matrixColWidths.hierarquia}px` }}>
                      <div className="flex items-center justify-between">
                        <span className="truncate">
                          {matrixViewMode === 'budget_full' && 'Hierarquia Budget Completa (Grupo > COMMESSA > Base UT > Subgrupo > Base Contrato > Cargo/Função)'}
                          {matrixViewMode === 'budget_simple' && 'Hierarquia Budget Simplificada (Grupo > COMMESSA > Base UT > Cargo/Função)'}
                          {matrixViewMode === 'operacional_status' && 'Hierarquia Prontidão Operacional (Base UT > Subgrupo > Base Contrato > Cargo/Função)'}
                        </span>
                        <div
                          onMouseDown={(e) => handleMouseDownResize(e, 'hierarquia')}
                          className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-indigo-500/50 group-hover:bg-indigo-500/30 transition-colors z-10"
                          title="Arrastar para redimensionar coluna"
                        />
                      </div>
                    </th>
                    <th className="py-3.5 px-4 text-center bg-emerald-500/5 relative group select-none" style={{ width: `${matrixColWidths.budget}px` }}>
                      <div className="flex items-center justify-center relative">
                        <span>1. Budget</span>
                        <div
                          onMouseDown={(e) => handleMouseDownResize(e, 'budget')}
                          className="absolute right-[-16px] top-[-14px] bottom-[-14px] w-2 cursor-col-resize hover:bg-indigo-500/50 group-hover:bg-indigo-500/30 transition-colors z-10"
                          title="Arrastar para redimensionar coluna"
                        />
                      </div>
                    </th>
                    <th className="py-3.5 px-4 text-center bg-amber-500/5 relative group select-none" style={{ width: `${matrixColWidths.rhEntregue}px` }}>
                      <div className="flex items-center justify-center relative">
                        <span>2. RH Entregue</span>
                        <div
                          onMouseDown={(e) => handleMouseDownResize(e, 'rhEntregue')}
                          className="absolute right-[-16px] top-[-14px] bottom-[-14px] w-2 cursor-col-resize hover:bg-indigo-500/50 group-hover:bg-indigo-500/30 transition-colors z-10"
                          title="Arrastar para redimensionar coluna"
                        />
                      </div>
                    </th>
                    <th className="py-3.5 px-4 text-center bg-rose-500/5 relative group select-none" style={{ width: `${matrixColWidths.forcaOp}px` }}>
                      <div className="flex items-center justify-center relative">
                        <span>3. Força Op.</span>
                        <div
                          onMouseDown={(e) => handleMouseDownResize(e, 'forcaOp')}
                          className="absolute right-[-16px] top-[-14px] bottom-[-14px] w-2 cursor-col-resize hover:bg-indigo-500/50 group-hover:bg-indigo-500/30 transition-colors z-10"
                          title="Arrastar para redimensionar coluna"
                        />
                      </div>
                    </th>
                    <th className="py-3.5 px-4 text-center relative group select-none" style={{ width: `${matrixColWidths.gapRh}px` }}>
                      <div className="flex items-center justify-center relative">
                        <span>Gap (RH x Budget)</span>
                        <div
                          onMouseDown={(e) => handleMouseDownResize(e, 'gapRh')}
                          className="absolute right-[-16px] top-[-14px] bottom-[-14px] w-2 cursor-col-resize hover:bg-indigo-500/50 group-hover:bg-indigo-500/30 transition-colors z-10"
                          title="Arrastar para redimensionar coluna"
                        />
                      </div>
                    </th>
                    <th className="py-3.5 px-4 text-center relative group select-none" style={{ width: `${matrixColWidths.gapOpOrcado}px` }}>
                      <div className="flex items-center justify-center relative">
                        <span>Gap (Op x Budget)</span>
                        <div
                          onMouseDown={(e) => handleMouseDownResize(e, 'gapOpOrcado')}
                          className="absolute right-[-16px] top-[-14px] bottom-[-14px] w-2 cursor-col-resize hover:bg-indigo-500/50 group-hover:bg-indigo-500/30 transition-colors z-10"
                          title="Arrastar para redimensionar coluna"
                        />
                      </div>
                    </th>
                    <th className="py-3.5 px-4 text-center relative group select-none" style={{ width: `${matrixColWidths.gapOpRh}px` }}>
                      <div className="flex items-center justify-center relative">
                        <span>Gap (Op x RH)</span>
                        <div
                          onMouseDown={(e) => handleMouseDownResize(e, 'gapOpRh')}
                          className="absolute right-[-16px] top-[-14px] bottom-[-14px] w-2 cursor-col-resize hover:bg-indigo-500/50 group-hover:bg-indigo-500/30 transition-colors z-10"
                          title="Arrastar para redimensionar coluna"
                        />
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs font-semibold">
                  {summaryCalculations.hierarchy.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400 font-bold">
                        Nenhum dado encontrado com os filtros aplicados.
                      </td>
                    </tr>
                  ) : (
                    summaryCalculations.hierarchy.map((node, idx) => (
                      <DrillDownRow 
                        key={`root-${idx}`} 
                        node={node} 
                        level={0}
                        onSelectNodeEmployees={setSelectedNodeEmployees}
                      />
                    ))
                  )}
                </tbody>
                <tfoot className="bg-slate-100 dark:bg-slate-800 font-black text-slate-900 dark:text-white border-t-2 border-slate-300 dark:border-slate-700 text-xs">
                  <tr>
                    <td className="py-3.5 px-4 uppercase tracking-wider font-black">TOTAL GERAL</td>
                    <td className="py-3.5 px-4 text-center text-emerald-600 dark:text-emerald-400 font-black text-sm bg-emerald-500/10">{summaryCalculations.totalOrcado}</td>
                    <td className="py-3.5 px-4 text-center text-amber-600 dark:text-amber-400 font-black text-sm bg-amber-500/10">{summaryCalculations.totalRh}</td>
                    <td className="py-3.5 px-4 text-center text-rose-600 dark:text-rose-400 font-black text-sm bg-rose-500/10">{summaryCalculations.totalEquipe}</td>
                    {/* GAP 1: RH x Budget */}
                    <td className="py-3.5 px-4 text-center">
                      <span className={`px-2 py-0.5 rounded text-xs font-black ${
                        summaryCalculations.totalGapRh >= 0 
                          ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300' 
                          : 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300'
                      }`}>
                        {summaryCalculations.totalGapRh > 0 ? '+' + summaryCalculations.totalGapRh : summaryCalculations.totalGapRh}
                      </span>
                    </td>
                    {/* GAP 2: Op x Budget */}
                    <td className="py-3.5 px-4 text-center">
                      <span className={`px-2 py-0.5 rounded text-xs font-black ${
                        summaryCalculations.totalGapOpOrcado >= 0 
                          ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300' 
                          : 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300'
                      }`}>
                        {summaryCalculations.totalGapOpOrcado > 0 ? '+' + summaryCalculations.totalGapOpOrcado : summaryCalculations.totalGapOpOrcado}
                      </span>
                    </td>
                    {/* GAP 3: Op x RH */}
                    <td className="py-3.5 px-4 text-center">
                      <span className={`px-2 py-0.5 rounded text-xs font-black ${
                        summaryCalculations.totalGapOperacao >= 0 
                          ? 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300' 
                          : 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
                      }`}>
                        {summaryCalculations.totalGapOperacao > 0 ? '+' + summaryCalculations.totalGapOperacao : summaryCalculations.totalGapOperacao}
                      </span>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* PAINEL DE GESTÃO DA FORÇA FORA DE EQUIPE */}
            <div className="mt-8">
              <OutOfTeamManagementPanel
                data={baseUnificadaData}
                onEditEmployee={handleOpenEditEmployee}
              />
            </div>
          </div>

          {/* MODAIS INTERATIVOS */}
          {selectedNodeEmployees && (
            <NodeEmployeeListModal
              nodeData={selectedNodeEmployees}
              onClose={() => setSelectedNodeEmployees(null)}
              onEditEmployee={handleOpenEditEmployee}
            />
          )}

          {editingEmployee && (
            <FullEmployeeEditModal
              employee={editingEmployee}
              onClose={() => setEditingEmployee(null)}
              onSave={handleSaveEmployee}
            />
          )}

        </div>
      )}

      {/* ABA 2: BUDGET */}
      {activeSubTab === 'budget' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="p-6 rounded-3xl bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 shadow-xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/60 dark:border-slate-800 pb-4">
              <div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                  <FileSpreadsheet className="text-emerald-500" /> Detalhamento do Budget (Orçamento 2025/2026)
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  Metas orçamentárias de pessoal direto por Commessa, Função e Veículo
                </p>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-500/15 text-emerald-600">
                Total Orçado: {summaryCalculations.totalOrcado}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-black uppercase text-slate-400">
                    <th className="py-3 px-4">Centro Custo</th>
                    <th className="py-3 px-4">Commessa</th>
                    <th className="py-3 px-4">Descrição</th>
                    <th className="py-3 px-4">Cargo / Função</th>
                    <th className="py-3 px-4">Tipo Veículo</th>
                    <th className="py-3 px-4 text-center">Meta Orçada</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-semibold">
                  {budgetData.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400 font-bold">
                        Nenhum arquivo de Budget carregado. Clique no botão <strong>Budget (Excel)</strong> no topo para carregar.
                      </td>
                    </tr>
                  ) : (
                    budgetData.map((b, i) => (
                      <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="py-3 px-4 font-bold text-slate-600 dark:text-slate-300">{b.centro_custo}</td>
                        <td className="py-3 px-4 font-black text-indigo-600 dark:text-indigo-400 font-mono">{b.commessa}</td>
                        <td className="py-3 px-4 text-slate-500">{b.descricao}</td>
                        <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">{b.cargo_funcao}</td>
                        <td className="py-3 px-4 text-slate-600 dark:text-slate-300">{b.tipo_veiculo}</td>
                        <td className="py-3 px-4 text-center font-black text-emerald-600 dark:text-emerald-400 text-sm">
                          {b.quantidade_meta}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ABA 3: BASE RH & OPERAÇÃO (UNIFICADA) */}
      {(activeSubTab === 'base_unificada' || activeSubTab === 'rh' || activeSubTab === 'operacao') && (
        <div className="space-y-8 animate-in fade-in duration-300">
          
          {/* SELETOR DE MODO DE VISÃO NA ABA 3 */}
          <div className="flex bg-slate-100 dark:bg-slate-800/80 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-700/60 shadow-inner w-fit mb-4 gap-1">
            <button 
              onClick={() => setOperacaoViewMode('equipes')}
              className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all ${
                operacaoViewMode === 'equipes' 
                  ? 'bg-indigo-600 text-white shadow-md' 
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Wrench size={16} /> Visão por Equipes & Sobra
            </button>
            <button 
              onClick={() => setOperacaoViewMode('tabela')}
              className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all ${
                operacaoViewMode === 'tabela' 
                  ? 'bg-indigo-600 text-white shadow-md' 
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Users size={16} /> Tabela Completa (1.008 Colaboradores)
            </button>
            <button 
              onClick={() => setOperacaoViewMode('colaboradores')}
              className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all ${
                operacaoViewMode === 'colaboradores' 
                  ? 'bg-indigo-600 text-white shadow-md' 
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Eye size={16} /> Visão por Cards / Perfis
            </button>
          </div>

          {operacaoViewMode === 'tabela' ? (
            <div className="p-6 rounded-3xl bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 shadow-xl space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/60 dark:border-slate-800 pb-4">
                <div>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                    <Users className="text-amber-500" /> Base RH & Operação — Mão de Obra Unificada
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    Listagem consolidada dos 1.008 colaboradores com dados operacionais e de RH
                  </p>
                </div>

                <span className="px-3 py-1 rounded-full text-xs font-black bg-amber-500/15 text-amber-600">
                  Total Carregados: {baseUnificadaData.length}
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-black uppercase text-slate-400">
                      <th className="py-3 px-4">Matrícula</th>
                      <th className="py-3 px-4">Nome Colaborador</th>
                      <th className="py-3 px-4">Função</th>
                      <th className="py-3 px-4">Commessa</th>
                      <th className="py-3 px-4">Base UT</th>
                      <th className="py-3 px-4">Equipe Nova</th>
                      <th className="py-3 px-4">Status Força</th>
                      <th className="py-3 px-4">Ação a ser Feita</th>
                      <th className="py-3 px-4">Supervisor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-semibold">
                    {baseUnificadaData.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="py-12 text-center text-slate-400 font-bold">
                          Nenhuma Base carregada. Clique no botão <strong>Base RH & OP (Excel)</strong> no topo para carregar.
                        </td>
                      </tr>
                    ) : (
                      baseUnificadaData.map((r, i) => (
                        <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                          <td className="py-3 px-4 font-mono font-bold text-slate-500">{r.matricula}</td>
                          <td className="py-3 px-4 font-black text-slate-900 dark:text-white">{r.nome}</td>
                          <td className="py-3 px-4 font-bold text-slate-700 dark:text-slate-300">{r.funcao}</td>
                          <td className="py-3 px-4 font-black text-amber-600 dark:text-amber-400 font-mono">{r.commessa || '--'}</td>
                          <td className="py-3 px-4 text-slate-600 dark:text-slate-400">{r.base_ut || '--'}</td>
                          <td className="py-3 px-4 font-bold text-indigo-600 dark:text-indigo-400">{r.equipe || 'Sobra'}</td>
                          <td className="py-3 px-4 text-slate-700 dark:text-slate-300">{r.status_forca || '--'}</td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                              r.acao_a_ser_feita === 'Em Equipe' ? 'bg-emerald-500/15 text-emerald-600' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                            }`}>
                              {r.acao_a_ser_feita || 'NÃO INFORMADO'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-500">{r.supervisor || 'N/A'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : operacaoViewMode === 'colaboradores' ? (
            <EmployeeViews 
              forcaData={forcaData} 
              onDoubleClickEmployee={(emp) => handleOpenEditEmployee(emp)} 
            />
          ) : (
            <>
          {/* CARDS DE INDICADORES OPERACIONAIS SUPERIORES COM DRILL DOWN (QTD EQUIPES / QTD COLABORADORES) */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-9 gap-3">
            <div className="p-3.5 rounded-3xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-white/60 dark:border-slate-800 shadow-xl">
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Em Equipe</p>
              <p className="text-xl font-black text-slate-900 dark:text-white mt-1">{forcaKPIs.totalEmEquipe} <span className="text-xs font-bold text-slate-400">colab</span></p>
            </div>
            
            <div className="p-3.5 rounded-3xl bg-rose-500/10 backdrop-blur-xl border border-rose-500/20 shadow-xl">
              <p className="text-[10px] font-black uppercase tracking-wider text-rose-600 dark:text-rose-400">Sem Equipe (Sobra)</p>
              <p className="text-xl font-black text-rose-600 dark:text-rose-400 mt-1">{forcaKPIs.totalSemEquipe} <span className="text-xs font-bold text-rose-400/80">disp</span></p>
            </div>

            <div className="p-3.5 rounded-3xl bg-indigo-500/10 backdrop-blur-xl border border-indigo-500/20 shadow-xl">
              <p className="text-[10px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400">Equipes Formadas</p>
              <p className="text-xl font-black text-indigo-600 dark:text-indigo-400 mt-1">{forcaKPIs.totalEquipesFormadas} <span className="text-xs font-bold text-indigo-400/80">eqps</span></p>
            </div>
            <div 
              onClick={() => setCardCategoryFilter(cardCategoryFilter === 'CESTO' ? null : 'CESTO')}
              className={`p-3.5 rounded-3xl bg-amber-500/10 backdrop-blur-xl border border-amber-500/20 shadow-xl cursor-pointer transition-all ${
                cardCategoryFilter === 'CESTO' ? 'ring-2 ring-amber-500 bg-amber-500/25 scale-[1.03]' : 'hover:scale-[1.02]'
              }`}
              title="Clique para filtrar apenas equipes de Cesto Aéreo"
            >
              <p className="text-[10px] font-black uppercase tracking-wider text-amber-700 dark:text-amber-400">🚛 Cesto Aéreo</p>
              <p className="text-base font-black text-amber-800 dark:text-amber-300 mt-1">
                {forcaKPIs.cestoEquipes} Eqps <span className="text-xs font-bold text-amber-600 dark:text-amber-400">/ {forcaKPIs.cestoCount} Colab</span>
              </p>
            </div>

            {/* DRILL DOWN LEVE */}
            <div 
              onClick={() => setCardCategoryFilter(cardCategoryFilter === 'LEVE' ? null : 'LEVE')}
              className={`p-3.5 rounded-3xl bg-emerald-500/10 backdrop-blur-xl border border-emerald-500/20 shadow-xl cursor-pointer transition-all ${
                cardCategoryFilter === 'LEVE' ? 'ring-2 ring-emerald-500 bg-emerald-500/25 scale-[1.03]' : 'hover:scale-[1.02]'
              }`}
              title="Clique para filtrar apenas veículos Leves"
            >
              <p className="text-[10px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400">🚗 Leve</p>
              <p className="text-base font-black text-emerald-800 dark:text-emerald-300 mt-1">
                {forcaKPIs.leveEquipes} Eqps <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">/ {forcaKPIs.leveCount} Colab</span>
              </p>
            </div>

            {/* DRILL DOWN MOTO */}
            <div 
              onClick={() => setCardCategoryFilter(cardCategoryFilter === 'MOTO' ? null : 'MOTO')}
              className={`p-3.5 rounded-3xl bg-sky-500/10 backdrop-blur-xl border border-sky-500/20 shadow-xl cursor-pointer transition-all ${
                cardCategoryFilter === 'MOTO' ? 'ring-2 ring-sky-500 bg-sky-500/25 scale-[1.03]' : 'hover:scale-[1.02]'
              }`}
              title="Clique para filtrar apenas Motos"
            >
              <p className="text-[10px] font-black uppercase tracking-wider text-sky-700 dark:text-sky-400">🏍️ Moto</p>
              <p className="text-base font-black text-sky-800 dark:text-sky-300 mt-1">
                {forcaKPIs.motoEquipes} Eqps <span className="text-xs font-bold text-sky-600 dark:text-sky-400">/ {forcaKPIs.motoCount} Colab</span>
              </p>
            </div>

            {/* DRILL DOWN LINHA VIVA */}
            <div 
              onClick={() => setCardCategoryFilter(cardCategoryFilter === 'VIVA' ? null : 'VIVA')}
              className={`p-3.5 rounded-3xl bg-purple-500/10 backdrop-blur-xl border border-purple-500/20 shadow-xl cursor-pointer transition-all ${
                cardCategoryFilter === 'VIVA' ? 'ring-2 ring-purple-500 bg-purple-500/25 scale-[1.03]' : 'hover:scale-[1.02]'
              }`}
              title="Clique para filtrar apenas Linha Viva"
            >
              <p className="text-[10px] font-black uppercase tracking-wider text-purple-700 dark:text-purple-400">⚡ Linha Viva</p>
              <p className="text-base font-black text-purple-800 dark:text-purple-300 mt-1">
                {forcaKPIs.linhaVivaEquipes} Eqps <span className="text-xs font-bold text-purple-600 dark:text-purple-400">/ {forcaKPIs.linhaVivaCount} Colab</span>
              </p>
            </div>

            {/* DRILL DOWN MUNK */}
            <div 
              onClick={() => setCardCategoryFilter(cardCategoryFilter === 'MUNK' ? null : 'MUNK')}
              className={`p-3.5 rounded-3xl bg-teal-500/10 backdrop-blur-xl border border-teal-500/20 shadow-xl cursor-pointer transition-all ${
                cardCategoryFilter === 'MUNK' ? 'ring-2 ring-teal-500 bg-teal-500/25 scale-[1.03]' : 'hover:scale-[1.02]'
              }`}
              title="Clique para filtrar apenas Munk"
            >
              <p className="text-[10px] font-black uppercase tracking-wider text-teal-700 dark:text-teal-400">🏗️ Munk</p>
              <p className="text-base font-black text-teal-800 dark:text-teal-300 mt-1">
                {forcaKPIs.munkEquipes} Eqps <span className="text-xs font-bold text-teal-600 dark:text-teal-400">/ {forcaKPIs.munkCount} Colab</span>
              </p>
            </div>

            {/* DRILL DOWN LINHA MORTA */}
            <div 
              onClick={() => setCardCategoryFilter(cardCategoryFilter === 'MORTA' ? null : 'MORTA')}
              className={`p-3.5 rounded-3xl bg-cyan-500/10 backdrop-blur-xl border border-cyan-500/20 shadow-xl cursor-pointer transition-all ${
                cardCategoryFilter === 'MORTA' ? 'ring-2 ring-cyan-500 bg-cyan-500/25 scale-[1.03]' : 'hover:scale-[1.02]'
              }`}
              title="Clique para filtrar apenas Linha Morta"
            >
              <p className="text-[10px] font-black uppercase tracking-wider text-cyan-700 dark:text-cyan-400">🚛 Linha Morta</p>
              <p className="text-base font-black text-cyan-800 dark:text-cyan-300 mt-1">
                {forcaKPIs.linhaMortaEquipes} Eqps <span className="text-xs font-bold text-cyan-600 dark:text-cyan-400">/ {forcaKPIs.linhaMortaCount} Colab</span>
              </p>
            </div>
          </div>

          {/* BARRA DE AÇÕES OPERACIONAIS - LIQUID GLASS FOSCO BRILHANTE */}
          <div className="p-5 rounded-3xl bg-white/85 dark:bg-slate-900/85 backdrop-blur-2xl border border-white/60 dark:border-slate-800 shadow-xl flex flex-wrap items-center justify-between gap-4">
            {/* BOTÕES DE AÇÕES: EXPANDIR GERAL, HISTÓRICO, SOLICITAÇÕES E NOVA EQUIPE */}
            <div className="flex items-center gap-3 flex-wrap w-full justify-end">
              <button
                onClick={handleToggleExpandAll}
                className="px-4 py-3 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-2 border border-slate-200 dark:border-slate-700 shadow-md active:scale-95"
              >
                <Layers size={16} className="text-emerald-500" />
                <span>{Object.keys(collapsedKeys).length > 0 ? 'Expandir Tudo' : 'Recolher Tudo'}</span>
              </button>

              <button
                onClick={() => setShowHistoryModal('GLOBAL')}
                className="px-4 py-3 rounded-2xl bg-white/10 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-2 border border-slate-200 dark:border-slate-700 shadow-md active:scale-95"
              >
                <History size={16} className="text-indigo-500" /> Histórico Geral
              </button>

              <button
                onClick={() => setShowApprovalPanel(true)}
                className={`px-4 py-3 rounded-2xl font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-2 border shadow-md active:scale-95 relative ${
                  pendingRequests.length > 0
                    ? 'bg-amber-500/20 text-amber-900 dark:text-amber-200 border-amber-500/40 animate-pulse'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                }`}
              >
                <Bell size={16} className={pendingRequests.length > 0 ? 'text-amber-500 animate-bounce' : 'text-slate-400'} />
                <span>Solicitações (DE &gt; PARA)</span>
                {pendingRequests.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-600 text-white shadow-sm">
                    {pendingRequests.length}
                  </span>
                )}
              </button>

              {canFormarEquipe && (
                <button
                  onClick={() => {
                    setIsNewEquipeModalOpen(true);
                    setNewSobraSearchTerm('');
                    setSelectedSobraMembers([]);
                  }}
                  className="px-5 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 shadow-xl shadow-emerald-500/20 active:scale-95 border border-white/20"
                >
                  <Plus size={16} /> + Formar Nova Equipe ({colaboradoresSobra.length} na Sobra)
                </button>
              )}
            </div>
          </div>

          {/* SEÇÃO 1: COLABORADORES SEM EQUIPE (SOBRA) - DESIGN ULTRA SUAVE GLASS */}
          {colaboradoresSobra.length > 0 && (
            <div className="rounded-3xl bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-rose-500/20 overflow-hidden shadow-sm">
              <button
                onClick={() => toggleCollapse('SOBRA')}
                className="w-full p-4 sm:p-5 bg-rose-500/10 dark:bg-rose-500/15 hover:bg-rose-500/20 text-rose-900 dark:text-rose-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-left transition-all border-b border-rose-500/20"
              >
                <div className="flex items-center gap-3 shrink-0">
                  {collapsedKeys['SOBRA'] ? <ChevronRight size={22} className="text-rose-600 dark:text-rose-400 shrink-0" /> : <ChevronDown size={22} className="text-rose-600 dark:text-rose-400 shrink-0" />}
                  <h3 className="font-extrabold text-sm sm:text-base uppercase tracking-wider flex items-center gap-2.5 text-rose-900 dark:text-rose-100">
                    <AlertTriangle size={20} className="text-rose-600 dark:text-rose-400 shrink-0" /> COLABORADORES SEM EQUIPE (SOBRA)
                  </h3>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="px-3.5 py-1.5 rounded-full text-xs font-black bg-rose-500/20 text-rose-800 dark:text-rose-200 border border-rose-500/30">
                    {colaboradoresSobra.length} Pessoas disponíveis
                  </span>
                </div>
              </button>

              {!collapsedKeys['SOBRA'] && (
                <div className="p-4 sm:p-5 overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 text-[10px] font-black uppercase text-slate-400">
                        <th className="py-2.5 px-3">Matrícula</th>
                        <th className="py-2.5 px-3">Nome do Colaborador</th>
                        <th className="py-2.5 px-3">Função</th>
                        <th className="py-2.5 px-3">Subgrupo</th>
                        <th className="py-2.5 px-3">Área Atuação</th>
                        <th className="py-2.5 px-3 text-center">Status</th>
                        <th className="py-2.5 px-3 text-center">Ação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-semibold">
                      {colaboradoresSobra.map((col, idx) => (
                        <tr key={idx} className="hover:bg-rose-500/5 transition-colors">
                          <td className="py-2.5 px-3 font-mono font-bold text-slate-500 dark:text-slate-400">{col.matricula}</td>
                          <td className="py-2.5 px-3 font-black text-slate-900 dark:text-white">{col.nome}</td>
                          <td className="py-2.5 px-3 font-bold text-slate-700 dark:text-slate-300">{col.funcao}</td>
                          <td className="py-2.5 px-3 font-mono text-indigo-600 dark:text-indigo-400">{col.subgrupo}</td>
                          <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400">{col.area_atuacao || 'SEM BASE'}</td>
                          <td className="py-2.5 px-3 text-center">
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-rose-500/15 text-rose-700 dark:text-rose-300">
                              Disponível
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center">
            <button
                              onClick={() => {
                                const targetEq = prompt('Informe o código da equipe existente para vincular este colaborador (ex: ENL100):');
                                if (targetEq && targetEq.trim()) {
                                  handleAddMemberToEquipe(col.matricula, targetEq.trim().toUpperCase());
                                }
                              }}
                              className="px-3 py-1 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[11px] transition-all flex items-center gap-1.5 mx-auto shadow-sm"
                            >
                              <UserPlus size={13} /> Alocar em Equipe
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* SEÇÃO 2: ESTRUTURA HIERÁRQUICA INTEGRADAS (GRUPO -> BASE UT -> ÁREA DE ATUAÇÃO -> EQUIPES) */}
          {forcaGroupedHierarchy.length === 0 ? (
            <div className="p-12 rounded-3xl bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800 text-center text-slate-400 font-bold shadow-sm">
              Nenhuma equipe encontrada para os filtros aplicados.
            </div>
          ) : (
            forcaGroupedHierarchy.map((grupoItem) => {
              const grupoKey = `GRUPO_${grupoItem.grupoName}`;
              const isGrupoCollapsed = isSegmentCollapsed(grupoKey);

              let grupoEquipesCount = 0;
              let grupoMembrosCount = 0;
              Object.values(grupoItem.bases).forEach(base => {
                Object.values(base.areas).forEach(area => {
                  Object.values(area.subgrupoTurnos).forEach(st => {
                    Object.values(st.horarios).forEach(h => {
                      grupoEquipesCount += Object.keys(h.equipes).length;
                      Object.values(h.equipes).forEach(members => grupoMembrosCount += members.length);
                    });
                  });
                });
              });

              let grupoBadgeBg = 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20';
              let grupoHeaderBg = 'from-emerald-500/10 via-teal-500/10 to-emerald-500/10 dark:from-emerald-500/15 dark:to-teal-500/15';
              let grupoIcon = <Sparkles className="text-emerald-500 shrink-0" size={20} />;

              if (grupoItem.grupoName === 'SOT') {
                grupoBadgeBg = 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20';
                grupoHeaderBg = 'from-amber-500/10 via-orange-500/10 to-amber-500/10 dark:from-amber-500/15 dark:to-orange-500/15';
                grupoIcon = <TrendingUp className="text-amber-500 shrink-0" size={20} />;
              } else if (grupoItem.grupoName === 'SOC') {
                grupoBadgeBg = 'bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/20';
                grupoHeaderBg = 'from-sky-500/10 via-indigo-500/10 to-sky-500/10 dark:from-sky-500/15 dark:to-indigo-500/15';
                grupoIcon = <ShieldCheck className="text-sky-500 shrink-0" size={20} />;
              } else if (grupoItem.grupoName === 'OUTROS') {
                grupoBadgeBg = 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20';
                grupoHeaderBg = 'from-rose-500/10 via-slate-500/10 to-rose-500/10 dark:from-rose-500/15 dark:to-slate-500/15';
                grupoIcon = <Wrench className="text-rose-500 shrink-0" size={20} />;
              }

              return (
                <div key={grupoKey} className="rounded-3xl bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden space-y-4 p-2 sm:p-3">
                  <button
                    onClick={() => toggleCollapse(grupoKey)}
                    className={`w-full p-4 sm:p-5 rounded-2xl bg-gradient-to-r ${grupoHeaderBg} border text-slate-900 dark:text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-left transition-all cursor-pointer`}
                  >
                    <div className="flex items-center gap-3 shrink-0">
                      {isGrupoCollapsed ? <ChevronRight size={22} className="shrink-0" /> : <ChevronDown size={22} className="shrink-0" />}
                      <h2 className="text-base sm:text-lg font-black uppercase tracking-wider flex items-center gap-2.5">
                        {grupoIcon}
                        GRUPO: {grupoItem.grupoName}
                      </h2>
                    </div>
                    <div className="flex items-center gap-2.5 flex-wrap shrink-0">
                      <span className={`px-3.5 py-1.5 rounded-full text-xs font-black border ${grupoBadgeBg}`}>
                        {grupoEquipesCount} Equipes Formadas
                      </span>
                      <span className="px-3.5 py-1.5 rounded-full text-xs font-black bg-indigo-500/20 text-indigo-900 dark:text-indigo-200 border border-indigo-500/30">
                        {grupoMembrosCount} Colaboradores
                      </span>
                    </div>
                  </button>

                  {!isGrupoCollapsed && (
                    <div className="space-y-4 px-1 sm:px-2 pb-2">
                      {Object.values(grupoItem.bases).map((baseItem) => {
                        const baseKey = `BASE_${grupoItem.grupoName}_${baseItem.baseUtName}`;
                        const isBaseCollapsed = isSegmentCollapsed(baseKey);

                        let baseEquipesCount = 0;
                        let baseMembrosCount = 0;
                        Object.values(baseItem.areas).forEach(area => {
                          Object.values(area.subgrupoTurnos).forEach(st => {
                            Object.values(st.horarios).forEach(h => {
                              baseEquipesCount += Object.keys(h.equipes).length;
                              Object.values(h.equipes).forEach(m => baseMembrosCount += m.length);
                            });
                          });
                        });

                        return (
                          <div key={baseKey} className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg overflow-hidden space-y-3 shadow-xs">
                            <button
                              onClick={() => toggleCollapse(baseKey)}
                              className="w-full p-3.5 sm:p-4 bg-slate-100/90 dark:bg-slate-800/90 hover:bg-slate-200/90 text-slate-900 dark:text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-left transition-all cursor-pointer"
                            >
                              <div className="flex items-center gap-3 shrink-0">
                                {isBaseCollapsed ? <ChevronRight size={18} className="text-slate-500 shrink-0" /> : <ChevronDown size={18} className="text-slate-500 shrink-0" />}
                                <h3 className="font-extrabold text-xs sm:text-sm uppercase tracking-wider flex items-center gap-2">
                                  <Layers size={17} className="text-indigo-500 shrink-0" />
                                  BASE UT: {baseItem.baseUtName}
                                </h3>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200">
                                  {baseEquipesCount} Equipes | {baseMembrosCount} Pessoas
                                </span>
                              </div>
                            </button>

                            {!isBaseCollapsed && (
                              <div className="space-y-4 p-3">
                                {Object.values(baseItem.areas).map((areaItem) => {
                                  const areaKey = `AREA_${grupoItem.grupoName}_${baseItem.baseUtName}_${areaItem.areaName}`;
                                  const isAreaCollapsed = isSegmentCollapsed(areaKey);

                                  let areaEquipesCount = 0;
                                  let areaMembrosCount = 0;
                                  Object.values(areaItem.subgrupoTurnos).forEach(st => {
                                    Object.values(st.horarios).forEach(h => {
                                      areaEquipesCount += Object.keys(h.equipes).length;
                                      Object.values(h.equipes).forEach(m => areaMembrosCount += m.length);
                                    });
                                  });

                                  return (
                                    <div key={areaKey} className="rounded-xl border border-amber-500/20 bg-amber-500/5 overflow-hidden space-y-3">
                                      <button
                                        onClick={() => toggleCollapse(areaKey)}
                                        className="w-full p-3 bg-amber-500/10 hover:bg-amber-500/15 text-slate-900 dark:text-amber-100 flex items-center justify-between gap-3 text-left transition-all cursor-pointer"
                                      >
                                        <div className="flex items-center gap-2.5 shrink-0">
                                          {isAreaCollapsed ? <ChevronRight size={16} className="text-amber-600 shrink-0" /> : <ChevronDown size={16} className="text-amber-600 shrink-0" />}
                                          <h4 className="font-extrabold text-xs uppercase tracking-wider flex items-center gap-2">
                                            <MapPin size={15} className="text-amber-600 shrink-0" />
                                            ÁREA DE ATUAÇÃO: {areaItem.areaName}
                                          </h4>
                                        </div>
                                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-900 dark:text-amber-200">
                                          {areaEquipesCount} Equipes | {areaMembrosCount} Pessoas
                                        </span>
                                      </button>

                                      {!isAreaCollapsed && (
                                        <div className="p-3 space-y-4">
                                          {Object.values(areaItem.subgrupoTurnos).map((stItem) => {
                                            const stKey = `ST_${areaItem.areaName}_${stItem.subTurnoKey}`;
                                            const isStCollapsed = isSegmentCollapsed(stKey);

                                            return (
                                              <div key={stKey} className="space-y-3">
                                                <div
                                                  onClick={() => toggleCollapse(stKey)}
                                                  className="cursor-pointer flex items-center justify-between py-2 border-b border-slate-200/60 dark:border-slate-800/60"
                                                >
                                                  <div className="flex items-center gap-2 font-black text-xs text-indigo-600 dark:text-indigo-400 uppercase font-mono tracking-wide">
                                                    {isStCollapsed ? <ChevronRight size={15} /> : <ChevronDown size={15} />}
                                                    <ShieldCheck size={15} className="text-indigo-500" />
                                                    {stItem.subTurnoTitle}
                                                  </div>
                                                </div>

                                                {!isStCollapsed && (
                                                  <div className="p-2 space-y-4">
                                                    {Object.values(stItem.horarios).map((horarioItem) => {
                                                      const horKey = `HOR_${areaItem.areaName}_${stItem.subTurnoKey}_${horarioItem.horarioTitle}`;
                                                      const isHorCollapsed = isSegmentCollapsed(horKey);
                                                      const sortedEquipes = Object.entries(horarioItem.equipes).sort((a, b) => a[0].localeCompare(b[0]));

                                                      return (
                                                        <div key={horKey} className="space-y-3">
                                                          <div
                                                            onClick={() => toggleCollapse(horKey)}
                                                            className="cursor-pointer flex items-center justify-between py-1.5 border-b border-slate-200/60 dark:border-slate-800/60"
                                                          >
                                                            <div className="flex items-center gap-2 font-bold text-[11px] text-slate-600 dark:text-slate-300 uppercase font-mono">
                                                              {isHorCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                                                              <Clock size={14} className="text-indigo-500" />
                                                              {formatHorarioStr(horarioItem.horarioValue, horarioItem.horarioTurno)}
                                                            </div>
                                                            <span className="text-[10px] font-bold text-slate-400">
                                                              {sortedEquipes.length} Equipes alocadas nesta saída
                                                            </span>
                                                          </div>

                                                          {!isHorCollapsed && (
                                                            <div className="overflow-x-auto rounded-xl border border-slate-200/80 dark:border-slate-800/80 bg-white/90 dark:bg-slate-900/90 shadow-xs">
                                                              <table className="w-full text-left border-collapse text-xs">
                                                                <thead>
                                                                  <tr className="bg-slate-100/90 dark:bg-slate-800/90 border-b border-slate-200/80 dark:border-slate-800/80 text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 select-none">
                                                                    <th style={{ width: columnWidths.hora }} className="relative py-2.5 px-3 text-center border-r border-slate-200/80 dark:border-slate-800/80">
                                                                      <span>HORA</span>
                                                                      <div onMouseDown={(e) => handleMouseDownColumnResize(e, 'hora')} className="absolute top-0 right-0 w-2 h-full cursor-col-resize hover:bg-indigo-500/50 transition-colors z-10" />
                                                                    </th>
                                                                    <th style={{ width: columnWidths.telefone }} className="relative py-2.5 px-3 text-center border-r border-slate-200/80 dark:border-slate-800/80">
                                                                      <span>TELEFONE</span>
                                                                      <div onMouseDown={(e) => handleMouseDownColumnResize(e, 'telefone')} className="absolute top-0 right-0 w-2 h-full cursor-col-resize hover:bg-indigo-500/50 transition-colors z-10" />
                                                                    </th>
                                                                    <th style={{ width: columnWidths.placa }} className="relative py-2.5 px-3 text-center border-r border-slate-200/80 dark:border-slate-800/80">
                                                                      <span>VEÍCULO / PLACA</span>
                                                                      <div onMouseDown={(e) => handleMouseDownColumnResize(e, 'placa')} className="absolute top-0 right-0 w-2 h-full cursor-col-resize hover:bg-indigo-500/50 transition-colors z-10" />
                                                                    </th>
                                                                    <th style={{ width: columnWidths.equipe }} className="relative py-2.5 px-3 text-center border-r border-slate-200/80 dark:border-slate-800/80">
                                                                      <span>EQUIPE</span>
                                                                      <div onMouseDown={(e) => handleMouseDownColumnResize(e, 'equipe')} className="absolute top-0 right-0 w-2 h-full cursor-col-resize hover:bg-indigo-500/50 transition-colors z-10" />
                                                                    </th>
                                                                    <th style={{ width: columnWidths.camera }} className="relative py-2.5 px-3 text-center border-r border-slate-200/80 dark:border-slate-800/80">
                                                                      <span>CÂMERA</span>
                                                                      <div onMouseDown={(e) => handleMouseDownColumnResize(e, 'camera')} className="absolute top-0 right-0 w-2 h-full cursor-col-resize hover:bg-indigo-500/50 transition-colors z-10" />
                                                                    </th>
                                                                    <th style={{ width: columnWidths.grupo }} className="relative py-2.5 px-3 text-center border-r border-slate-200/80 dark:border-slate-800/80">
                                                                      <span>GRUPO (PONTO)</span>
                                                                      <div onMouseDown={(e) => handleMouseDownColumnResize(e, 'grupo')} className="absolute top-0 right-0 w-2 h-full cursor-col-resize hover:bg-indigo-500/50 transition-colors z-10" />
                                                                    </th>
                                                                    <th style={{ width: columnWidths.nome }} className="relative py-2.5 px-3 border-r border-slate-200/80 dark:border-slate-800/80">
                                                                      <span>NOME DO COLABORADOR</span>
                                                                      <div onMouseDown={(e) => handleMouseDownColumnResize(e, 'nome')} className="absolute top-0 right-0 w-2 h-full cursor-col-resize hover:bg-indigo-500/50 transition-colors z-10" />
                                                                    </th>
                                                                    <th style={{ width: columnWidths.br0 }} className="relative py-2.5 px-3 text-center border-r border-slate-200/80 dark:border-slate-800/80">
                                                                      <span>BR0</span>
                                                                      <div onMouseDown={(e) => handleMouseDownColumnResize(e, 'br0')} className="absolute top-0 right-0 w-2 h-full cursor-col-resize hover:bg-indigo-500/50 transition-colors z-10" />
                                                                    </th>
                                                                    <th style={{ width: columnWidths.matricula }} className="relative py-2.5 px-3 text-center border-r border-slate-200/80 dark:border-slate-800/80">
                                                                      <span>MATRÍCULA</span>
                                                                      <div onMouseDown={(e) => handleMouseDownColumnResize(e, 'matricula')} className="absolute top-0 right-0 w-2 h-full cursor-col-resize hover:bg-indigo-500/50 transition-colors z-10" />
                                                                    </th>
                                                                    <th style={{ width: columnWidths.funcao }} className="relative py-2.5 px-3 border-r border-slate-200/80 dark:border-slate-800/80">
                                                                      <span>FUNÇÃO / CARGO</span>
                                                                      <div onMouseDown={(e) => handleMouseDownColumnResize(e, 'funcao')} className="absolute top-0 right-0 w-2 h-full cursor-col-resize hover:bg-indigo-500/50 transition-colors z-10" />
                                                                    </th>
                                                                    <th style={{ width: columnWidths.cnh }} className="relative py-2.5 px-3 text-center border-r border-slate-200/80 dark:border-slate-800/80">
                                                                      <span>CNH</span>
                                                                      <div onMouseDown={(e) => handleMouseDownColumnResize(e, 'cnh')} className="absolute top-0 right-0 w-2 h-full cursor-col-resize hover:bg-indigo-500/50 transition-colors z-10" />
                                                                    </th>
                                                                    <th style={{ width: columnWidths.status }} className="relative py-2.5 px-3 text-center border-r border-slate-200/80 dark:border-slate-800/80">
                                                                      <span>STATUS FORÇA</span>
                                                                      <div onMouseDown={(e) => handleMouseDownColumnResize(e, 'status')} className="absolute top-0 right-0 w-2 h-full cursor-col-resize hover:bg-indigo-500/50 transition-colors z-10" />
                                                                    </th>
                                                                    <th style={{ width: columnWidths.area }} className="relative py-2.5 px-3 border-r border-slate-200/80 dark:border-slate-800/80">
                                                                      <span>ÁREA DE ATUAÇÃO</span>
                                                                      <div onMouseDown={(e) => handleMouseDownColumnResize(e, 'area')} className="absolute top-0 right-0 w-2 h-full cursor-col-resize hover:bg-indigo-500/50 transition-colors z-10" />
                                                                    </th>
                                                                    <th style={{ width: columnWidths.acoes }} className="relative py-2.5 px-3 text-center">
                                                                      <span>AÇÕES</span>
                                                                      <div onMouseDown={(e) => handleMouseDownColumnResize(e, 'acoes')} className="absolute top-0 right-0 w-2 h-full cursor-col-resize hover:bg-indigo-500/50 transition-colors z-10" />
                                                                    </th>
                                                                  </tr>
                                                                </thead>
                                                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-semibold">
                                                                  {sortedEquipes.map(([eqCode, membros], eqIdx) => {
                                                                    const isAltTeam = eqIdx % 2 === 1;
                                                                    const mainVeiculo = membros[0]?.veiculo || 'CESTO';
                                                                    const equipeAlerts = validateEquipeFormation(membros, mainVeiculo, stItem.subgrupoName);
                                                                    const hasErrorAlert = equipeAlerts.some(a => a.tipo === 'error');
                                                                    const availablePlacas = getPlacasForVeiculo(mainVeiculo);

                                                                    return membros.map((m, mIdx) => (
                                                                      <tr 
                                                                        key={m.matricula || `${eqCode}-${mIdx}`}
                                                                        onDoubleClick={() => handleOpenEditEmployee(m)}
                                                                        title={canEditDirectly ? "Duplo clique para editar perfil do colaborador" : "Edição restrita a Coordenadores, Gerentes e Administradores"}
                                                                        className={`transition-colors cursor-pointer ${
                                                                          isAltTeam 
                                                                            ? 'bg-slate-50/50 dark:bg-slate-800/20 hover:bg-slate-100/60 dark:hover:bg-slate-800/50' 
                                                                            : 'bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                                                                        }`}
                                                                      >
                                                                        {/* HORA */}
                                                                        {mIdx === 0 ? (
                                                                          <td 
                                                                            rowSpan={membros.length} 
                                                                            className="py-2.5 px-3 text-center font-black text-indigo-700 dark:text-indigo-300 bg-indigo-50/30 dark:bg-indigo-950/15 border-r border-slate-200/80 dark:border-slate-800/80 align-middle"
                                                                          >
                                                                            <div className="flex flex-col items-center justify-center">
                                                                              <Clock size={13} className="text-indigo-500 mb-0.5" />
                                                                              <span className="text-[10px] font-mono">
                                                                                {formatHorarioStr(horarioItem.horarioValue, horarioItem.horarioTurno).replace('DAS ', '')}
                                                                              </span>
                                                                            </div>
                                                                          </td>
                                                                        ) : null}

                                                                        {/* TELEFONE */}
                                                                        {mIdx === 0 ? (
                                                                          <td 
                                                                            rowSpan={membros.length} 
                                                                            className="py-1.5 px-2 text-center border-r border-slate-200/80 dark:border-slate-800/80 align-middle"
                                                                          >
                                                                            <div className="flex items-center gap-1 justify-center">
                                                                              <Phone size={12} className="text-emerald-500 shrink-0" />
                                                                              <input
                                                                                type="text"
                                                                                placeholder="11-9XXXX-XXXX"
                                                                                disabled={!canEditDirectly}
                                                                                value={
                                                                                  inlineEdits[`${eqCode}_telefone`] !== undefined
                                                                                    ? inlineEdits[`${eqCode}_telefone`]
                                                                                    : (membros[0]?.telefone || '')
                                                                                }
                                                                                onChange={e => setInlineEdits(prev => ({ ...prev, [`${eqCode}_telefone`]: applyPhoneMask(e.target.value) }))}
                                                                                onBlur={e => handleInlineFieldSave(eqCode, 'telefone', e.target.value, membros[0]?.telefone)}
                                                                                className="w-full py-1 px-1.5 rounded-lg bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800 border border-transparent hover:border-slate-300 dark:hover:border-slate-700 text-[11px] font-mono font-bold text-slate-800 dark:text-slate-200 text-center focus:bg-white dark:focus:bg-slate-800 focus:border-emerald-500 focus:outline-none transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                                                                              />
                                                                            </div>
                                                                          </td>
                                                                        ) : null}

                                                                        {/* VEÍCULO / PLACA */}
                                                                        {mIdx === 0 ? (
                                                                          <td 
                                                                            rowSpan={membros.length} 
                                                                            className="py-1.5 px-2 text-center border-r border-slate-200/80 dark:border-slate-800/80 align-middle"
                                                                          >
                                                                            <div className="flex flex-col items-center gap-1">
                                                                              <span className="px-2 py-0.5 rounded-lg text-[10px] font-black uppercase bg-amber-300/80 text-slate-950 shadow-xs border border-amber-400/50 inline-flex items-center gap-1">
                                                                                <Truck size={11} /> {mainVeiculo}
                                                                              </span>
                                                                              <InlinePlacaCell
                                                                                eqCode={eqCode}
                                                                                currentPlaca={membros[0]?.placa_veiculo}
                                                                                mainVeiculo={mainVeiculo}
                                                                                availablePlacas={availablePlacas}
                                                                                onSave={handleInlineFieldSave}
                                                                                disabled={!canEditDirectly}
                                                                              />
                                                                            </div>
                                                                          </td>
                                                                        ) : null}

                                                                        {/* EQUIPE */}
                                                                        {mIdx === 0 ? (
                                                                          <td 
                                                                            rowSpan={membros.length} 
                                                                            className="py-2.5 px-3 text-center font-black text-white font-mono text-xs border-r border-slate-200/80 dark:border-slate-800/80 align-middle"
                                                                          >
                                                                            <span className="px-2.5 py-1 rounded-xl bg-indigo-600 text-white font-extrabold shadow-xs">
                                                                              {eqCode}
                                                                            </span>
                                                                          </td>
                                                                        ) : null}

                                                                        {/* CÂMERA */}
                                                                        {mIdx === 0 ? (
                                                                          <td 
                                                                            rowSpan={membros.length} 
                                                                            className="py-1.5 px-2 text-center border-r border-slate-200/80 dark:border-slate-800/80 align-middle"
                                                                          >
                                                                            <div className="flex items-center gap-1 justify-center">
                                                                              <Camera size={12} className="text-sky-500 shrink-0" />
                                                                              <select
                                                                                disabled={!canEditDirectly}
                                                                                value={membros[0]?.camera || 'NÃO INFORMADO'}
                                                                                onChange={e => handleInlineFieldSave(eqCode, 'camera', e.target.value, membros[0]?.camera)}
                                                                                className="py-1 px-1.5 rounded-lg bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800 border border-transparent hover:border-slate-300 dark:hover:border-slate-700 text-[10px] font-bold text-slate-800 dark:text-slate-200 focus:bg-white dark:focus:bg-slate-800 focus:border-sky-500 focus:outline-none transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                                                                              >
                                                                                <option value="NÃO INFORMADO">-- CÂMERA --</option>
                                                                                <option value="CAMERA ONLINE">📷 ONLINE</option>
                                                                                <option value="CAMERA FIXA NO PAINEL">🎥 FIXA NO PAINEL</option>
                                                                              </select>
                                                                            </div>
                                                                          </td>
                                                                        ) : null}

                                                                        {/* GRUPO DE FOLGA (PONTO) */}
                                                                        <td className="py-2 px-3 text-center border-r border-slate-200/80 dark:border-slate-800/80">
                                                                          <span className={`px-2 py-0.5 rounded-lg text-[11px] font-black inline-block min-w-[24px] ${getGrupoBgColor(m.grupo_folga)}`}>
                                                                            {m.grupo_folga || 'A'}
                                                                          </span>
                                                                        </td>

                                                                        {/* NOME */}
                                                                        <td className="py-2 px-3 font-black text-slate-900 dark:text-white border-r border-slate-200/80 dark:border-slate-800/80">
                                                                          {m.nome}
                                                                        </td>

                                                                        {/* BR0 */}
                                                                        <td className="py-2 px-3 text-center font-mono font-bold text-slate-500 dark:text-slate-400 border-r border-slate-200/80 dark:border-slate-800/80">
                                                                          {m.br0 || 'N/A'}
                                                                        </td>

                                                                        {/* MATRÍCULA */}
                                                                        <td className="py-2 px-3 text-center font-mono font-bold text-slate-700 dark:text-slate-300 border-r border-slate-200/80 dark:border-slate-800/80">
                                                                          {m.matricula}
                                                                        </td>

                                                                        {/* FUNÇÃO */}
                                                                        <td className="py-2 px-3 font-bold text-slate-700 dark:text-slate-300 border-r border-slate-200/80 dark:border-slate-800/80">
                                                                          {m.funcao}
                                                                        </td>

                                                                        {/* CNH */}
                                                                        <td className="py-2 px-3 text-center border-r border-slate-200/80 dark:border-slate-800/80">
                                                                          <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-slate-200/60 dark:bg-slate-700/60 text-slate-800 dark:text-slate-200">
                                                                            {m.cnh || 'NP'}
                                                                          </span>
                                                                        </td>

                                                                        {/* STATUS FORÇA */}
                                                                        <td className="py-2 px-3 text-center border-r border-slate-200/80 dark:border-slate-800/80">
                                                                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                                                                            m.status_forca?.toUpperCase().includes('ATIVO')
                                                                              ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                                                                              : m.status_forca?.toUpperCase().includes('FÉRIAS')
                                                                              ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                                                                              : 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                                                                          }`}>
                                                                            {m.status_forca || 'Ativo'}
                                                                          </span>
                                                                        </td>

                                                                        {/* ÁREA DE ATUAÇÃO */}
                                                                        <td className="py-2 px-3 font-semibold text-slate-600 dark:text-slate-300 border-r border-slate-200/80 dark:border-slate-800/80">
                                                                          {m.area_atuacao || areaItem.areaName}
                                                                        </td>

                                                                        {/* AÇÕES */}
                                                                        {mIdx === 0 ? (
                                                                          <td 
                                                                            rowSpan={membros.length} 
                                                                            className="py-2 px-3 text-center align-middle"
                                                                          >
                                                                            <div className="flex flex-col items-center justify-center gap-1.5">
                                                                              <div className="flex items-center justify-center gap-1">
                                                                                <button
                                                                                  onClick={() => handleOpenEditModal(eqCode, membros)}
                                                                                  title="Editar Equipe (Código, Integrantes)"
                                                                                  className="p-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 transition-all"
                                                                                >
                                                                                  <Edit2 size={14} />
                                                                                </button>
                                                                                <button
                                                                                  onClick={() => setShowHistoryModal(eqCode)}
                                                                                  title="Histórico de Modificações desta Equipe"
                                                                                  className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 transition-all"
                                                                                >
                                                                                  <History size={14} />
                                                                                </button>
                                                                                <button
                                                                                  onClick={() => handleDisbandEquipe(eqCode)}
                                                                                  title="Desfazer Equipe (Devolver todos para a Sobra)"
                                                                                  className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 transition-all"
                                                                                >
                                                                                  <Trash2 size={14} />
                                                                                </button>
                                                                              </div>

                                                                              {equipeAlerts.length > 0 && (
                                                                                <div
                                                                                  className="group relative cursor-pointer"
                                                                                  title={equipeAlerts.map(a => a.mensagem).join('\n')}
                                                                                >
                                                                                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-black flex items-center gap-1 border ${
                                                                                    hasErrorAlert 
                                                                                      ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30 animate-pulse' 
                                                                                      : 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30'
                                                                                  }`}>
                                                                                    <AlertTriangle size={10} /> {equipeAlerts.length} aviso(s)
                                                                                  </span>

                                                                                  <div className="hidden group-hover:block absolute bottom-full right-0 mb-2 w-64 p-3 rounded-2xl bg-slate-900 text-white text-[10px] font-bold shadow-2xl z-50 pointer-events-none space-y-1 text-left border border-slate-700">
                                                                                    <p className="text-amber-400 font-black uppercase border-b border-slate-700 pb-1 mb-1">
                                                                                      Avisos de Formação ({eqCode}):
                                                                                    </p>
                                                                                    {equipeAlerts.map((al, aIdx) => (
                                                                                      <p key={aIdx} className={al.tipo === 'error' ? 'text-rose-300' : 'text-amber-300'}>
                                                                                        • {al.mensagem}
                                                                                      </p>
                                                                                    ))}
                                                                                  </div>
                                                                                </div>
                                                                              )}
                                                                            </div>
                                                                          </td>
                                                                        ) : null}
                                                                      </tr>
                                                                    ));
                                                                  })}
                                                                </tbody>
                                                              </table>
                                                            </div>
                                                          )}
                                                        </div>
                                                      );
                                                    })}
                                                  </div>
                                                )}
                                              </div>
                                            );
                                          })}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </>
      )}
    </div>
  )}

      {/* ========================================== */}
      {/* MODAL 1: EDITAR EQUIPE (ESTRUTURA DE > PARA SIDE-BY-SIDE) */}
      {/* ========================================== */}
      {editingEquipe && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-6xl bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] p-6 shadow-2xl space-y-5 max-h-[92vh] flex flex-col overflow-hidden">
            
            {/* CAMEÇALHO MODAL */}
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4 shrink-0">
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Edit2 className="text-indigo-500" size={22} />
                  <span>Proposta de Alteração de Equipe (DE &gt; PARA):</span>
                  <span className="text-indigo-600 font-mono font-black">{editingEquipe.code}</span>
                </h3>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                  Lado Esquerdo: Formação Atual (Original DE) | Lado Direito: Formação Sugerida (Proposta PARA)
                </p>
              </div>
              <button onClick={() => setEditingEquipe(null)} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400">
                <X size={18} />
              </button>
            </div>

            {/* CONTEÚDO LADO A LADO (SIDE-BY-SIDE GRID 2 COLUNAS) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 flex-1 overflow-y-auto overflow-x-hidden pr-1">
              
              {/* LADO ESQUERDO: FORMAÇÃO ATUAL (DE - SEM EDIÇÃO) */}
              <div className="p-4 sm:p-5 rounded-3xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 space-y-4 flex flex-col">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-3 shrink-0">
                  <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30 flex items-center gap-1.5">
                    <XCircle size={14} /> FORMAÇÃO ATUAL (DE) - ORIGINAL
                  </span>
                  <span className="text-[11px] font-mono font-bold text-slate-400">Sem alteração</span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs font-semibold bg-white/60 dark:bg-slate-900/60 p-3 rounded-2xl border border-slate-200/60 dark:border-slate-800 shrink-0">
                  <div>
                    <span className="text-[10px] uppercase font-black text-slate-400 block">Código da Equipe:</span>
                    <span className="font-mono font-black text-slate-900 dark:text-white text-sm">{editingEquipe.code}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-black text-slate-400 block">Veículo / Placa:</span>
                    <span className="font-mono font-bold text-amber-600 dark:text-amber-400">{editingEquipe.membros[0]?.placa_veiculo || 'NÃO INFORMADA'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-black text-slate-400 block">Telefone:</span>
                    <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">{editingEquipe.membros[0]?.telefone || 'NÃO INFORMADO'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-black text-slate-400 block">Câmera:</span>
                    <span className="font-bold text-sky-600 dark:text-sky-400">{editingEquipe.membros[0]?.camera || 'NÃO INFORMADO'}</span>
                  </div>
                </div>

                <div className="flex-1 space-y-2">
                  <h4 className="text-xs font-black uppercase text-slate-400 flex items-center justify-between">
                    <span>Integrantes Atuais ({editingEquipe.membros.length})</span>
                  </h4>
                  <div className="space-y-2">
                    {editingEquipe.membros.map((m, idx) => (
                      <div key={idx} className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between text-xs shadow-xs">
                        <div>
                          <p className="font-black text-slate-900 dark:text-white">{m.nome}</p>
                          <p className="text-[10px] text-slate-400 font-semibold">{m.funcao} | Matrícula: {m.matricula}</p>
                        </div>
                        <span className="px-2 py-0.5 rounded text-[10px] font-black bg-slate-100 dark:bg-slate-800 text-slate-500">
                          {m.br0 || 'BR0'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* LADO DIREITO: FORMAÇÃO SUGERIDA (PARA - COM EDIÇÃO) */}
              <div className="p-4 sm:p-5 rounded-3xl bg-indigo-50/40 dark:bg-indigo-950/20 border border-indigo-500/30 space-y-4 flex flex-col">
                <div className="flex items-center justify-between border-b border-indigo-500/20 pb-3 shrink-0">
                  <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5">
                    <CheckCircle size={14} /> FORMAÇÃO SUGERIDA (PARA) - EDITÁVEL
                  </span>
                  <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 font-mono">Faça as modificações</span>
                </div>

                {/* EDITAR CÓDIGO DA EQUIPE, PLACA, TELEFONE E CÂMERA */}
                <div className="grid grid-cols-2 gap-3 text-xs bg-white dark:bg-slate-900 p-3 rounded-2xl border border-indigo-300/40 dark:border-indigo-800/40 shadow-xs shrink-0">
                  <div>
                    <label className="text-[10px] uppercase font-black text-indigo-700 dark:text-indigo-300 block mb-1">
                      Código da Equipe
                    </label>
                    <input
                      type="text"
                      value={paraTeamCodeInput}
                      onChange={e => setParaTeamCodeInput(e.target.value.toUpperCase())}
                      className="w-full px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-indigo-400/40 font-mono font-black text-xs text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] uppercase font-black text-indigo-700 dark:text-indigo-300 block mb-1">
                      Placa do Veículo (Busca Banco de Dados)
                    </label>
                    <input
                      type="text"
                      placeholder="Busque ou digite a placa..."
                      value={paraPlacaInput}
                      onChange={e => setParaPlacaInput(e.target.value.toUpperCase())}
                      className="w-full px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-indigo-400/40 font-mono font-bold text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                      list="veiculos-placas-list"
                    />
                    <datalist id="veiculos-placas-list">
                      {vehiclesDb.map(v => (
                        <option key={v.id || v.placa} value={v.placa}>
                          {v.placa} - {v.subTipo || v.tipo || ''} ({v.regional || ''})
                        </option>
                      ))}
                    </datalist>
                  </div>

                  <div>
                    <label className="text-[10px] uppercase font-black text-indigo-700 dark:text-indigo-300 block mb-1">
                      Telefone da Equipe
                    </label>
                    <input
                      type="text"
                      placeholder="11-9XXXX-XXXX"
                      value={paraTelefoneInput}
                      onChange={e => setParaTelefoneInput(applyPhoneMask(e.target.value))}
                      className="w-full px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-indigo-400/40 font-mono font-bold text-xs text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] uppercase font-black text-indigo-700 dark:text-indigo-300 block mb-1">
                      Status da Câmera
                    </label>
                    <select
                      value={paraCameraInput}
                      onChange={e => setParaCameraInput(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-indigo-400/40 font-bold text-xs text-slate-900 dark:text-white"
                    >
                      <option value="NÃO INFORMADO">-- CÂMERA --</option>
                      <option value="CAMERA ONLINE">📷 ONLINE</option>
                      <option value="CAMERA FIXA NO PAINEL">🎥 FIXA NO PAINEL</option>
                    </select>
                  </div>
                </div>

                {/* LISTA EDITÁVEL DE INTEGRANTES */}
                <div className="flex-1 space-y-3">
                  <h4 className="text-xs font-black uppercase text-indigo-900 dark:text-indigo-200 flex items-center justify-between">
                    <span>Integrantes Sugeridos ({paraMembros.length})</span>
                  </h4>
                  
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {paraMembros.map((m) => (
                      <div key={m.matricula} className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-indigo-200 dark:border-slate-800 flex items-center justify-between text-xs shadow-xs">
                        <div>
                          <p className="font-black text-slate-900 dark:text-white">{m.nome}</p>
                          <p className="text-[10px] text-slate-400 font-semibold">{m.funcao} | Matrícula: {m.matricula}</p>
                        </div>
                        <button
                          onClick={() => setParaMembros(prev => prev.filter(x => x.matricula !== m.matricula))}
                          className="px-2.5 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 font-bold text-[10px] flex items-center gap-1 transition-all"
                        >
                          <UserMinus size={12} /> Devolver p/ Sobra
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* INPUT DE BUSCA PARA PUXAR DA SOBRA */}
                  <div className="space-y-2 border-t border-indigo-200 dark:border-indigo-950 pt-3">
                    <label className="text-[11px] font-black uppercase text-indigo-700 dark:text-indigo-300 block">
                      Puxar Integrante da Sobra ({colaboradoresSobra.length} disponíveis)
                    </label>
                    <div className="relative">
                      <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Pesquisar colaborador por nome ou matrícula..."
                        value={editSobraSearchTerm}
                        onChange={e => setEditSobraSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-indigo-300/60 dark:border-indigo-800/60 text-xs font-semibold"
                      />
                    </div>

                    {filteredSobraForEditModal.length > 0 && (
                      <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                        {filteredSobraForEditModal.map(c => {
                          const alreadyInPara = paraMembros.some(x => x.matricula === c.matricula);
                          if (alreadyInPara) return null;
                          return (
                            <div key={c.matricula} className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
                              <div>
                                <span className="font-bold text-slate-900 dark:text-white">{c.nome}</span>
                                <span className="text-[10px] text-slate-400 ml-1.5">({c.funcao})</span>
                              </div>
                              <button
                                onClick={() => setParaMembros(prev => [...prev, c])}
                                className="px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] flex items-center gap-1 shadow-xs"
                              >
                                <UserPlus size={11} /> Adicionar
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                </div>

              </div>

            </div>

            {/* AÇÕES FINAIS DO MODAL DE > PARA */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-200 dark:border-slate-800 pt-4 shrink-0">
              <button
                onClick={() => handleDisbandEquipe(editingEquipe.code)}
                className="px-4 py-2.5 rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 font-bold text-xs flex items-center gap-2"
              >
                <Trash2 size={14} /> Desfazer Equipe Inteira
              </button>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setEditingEquipe(null)}
                  className="px-4 py-2.5 rounded-2xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSubmitDeParaEditRequest}
                  className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-emerald-500/20 active:scale-95 flex items-center gap-2"
                >
                  <Save size={15} /> {canEditDirectly ? 'Salvar Alteração Direta' : 'Solicitar Modificação (DE > PARA)'}
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* MODAL ANIMADO ULTRA PREMIUM DE SOLICITAÇÃO ENVIADA (SUPERVISORES) */}
      {/* ========================================== */}
      {submittedRequestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xl animate-in fade-in">
          <div className="w-full max-w-lg bg-gradient-to-b from-slate-900 via-slate-900 to-indigo-950 border border-indigo-500/40 rounded-[2.5rem] p-8 text-white shadow-2xl text-center space-y-6 relative overflow-hidden">
            
            {/* GLOW DE FUNDO ANIMADO */}
            <div className="absolute -top-24 -right-24 w-72 h-72 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none animate-pulse"></div>

            {/* ÍCONE ANIMADO DA SOLICITAÇÃO */}
            <div className="w-20 h-20 rounded-full bg-emerald-500/20 border-2 border-emerald-400/50 flex items-center justify-center mx-auto text-emerald-400 shadow-xl shadow-emerald-500/20 animate-bounce">
              <CheckCircle size={44} />
            </div>

            {/* BADGES DO ID E STATUS DA SOLICITAÇÃO */}
            <div className="space-y-2">
              <span className="px-4 py-1.5 rounded-full text-xs font-mono font-black bg-indigo-500/30 text-indigo-200 border border-indigo-400/40 shadow-inner inline-block">
                ID SOLICITAÇÃO: {submittedRequestModal.id}
              </span>
              <div>
                <span className="px-3.5 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/40 inline-flex items-center gap-1.5 shadow-sm">
                  <Clock size={13} className="animate-spin" /> AGUARDANDO APROVAÇÃO DA GESTÃO OPERACIONAL
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-2xl font-black text-white tracking-tight">
                Solicitação Registrada com Sucesso!
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed font-medium">
                Sua proposta de alteração na equipe foi encaminhada para a <strong>Gestão Operacional</strong>.
              </p>
            </div>

            {/* CAIXA DE INSTRUÇÃO E CONTATO */}
            <div className="p-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 text-xs text-slate-200 leading-relaxed font-medium space-y-2 text-left">
              <p className="font-bold text-amber-300 flex items-center gap-1.5">
                📲 Entre em contato com seu gestor imediato:
              </p>
              <p className="text-slate-300 text-[11px]">
                Solicitação realizada por <strong>{submittedRequestModal.solicitante_nome}</strong> ({submittedRequestModal.solicitante_perfil}).
                Informe ao seu Coordenador ou Gerente o número de controle <strong className="text-indigo-200 font-mono">{submittedRequestModal.id}</strong> para aprovação imediata no painel de liberações.
              </p>
            </div>

            {/* RESUMO DAS ALTERAÇÕES SOLICITADAS */}
            <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-indigo-500/30 text-left text-[11px] font-mono space-y-1">
              <p className="text-indigo-400 font-black uppercase text-[10px]">Resumo da Modificação Proposta:</p>
              <p className="text-slate-300">• Alvo: <strong className="text-white">{submittedRequestModal.entidade_id}</strong></p>
              <p className="text-slate-300">• Proposta: <strong className="text-emerald-400">{submittedRequestModal.valor_novo}</strong></p>
            </div>

            <button
              onClick={() => setSubmittedRequestModal(null)}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs uppercase tracking-wider shadow-xl shadow-emerald-500/20 active:scale-95"
            >
              Entendido, Concluir
            </button>

          </div>
        </div>
      )}

      {/* ABA 4: SOLICITAÇÃO DE VAGAS (RH) */}
      {activeSubTab === 'solicitacao_vagas' && (
        <SolicitacaoVagasRHView
          hierarchyTree={summaryCalculations.hierarchy}
          matrixRows={summaryCalculations.rows}
          matrixViewMode={matrixViewMode}
          setMatrixViewMode={setMatrixViewMode}
          baseUnificada={baseUnificadaData || []}
          dadosBudget={budgetData || []}
          COMMESSA_MAP={COMMESSA_MAP}
          showNotification={showNotification}
          currentUser={currentUser}
          userPermissions={userPermissions}
        />
      )}

      {/* ========================================== */}
      {/* MODAL 2: FORMAR NOVA EQUIPE DO ZERO        */}
      {/* ========================================== */}
      {isNewEquipeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-2xl bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] p-6 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
              <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Plus className="text-emerald-500" size={20} />
                Formar Nova Equipe Operacional
              </h3>
              <button onClick={() => setIsNewEquipeModalOpen(false)} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400">
                <X size={18} />
              </button>
            </div>

            {/* FORMULÁRIO DADOS DA EQUIPE */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] font-black uppercase text-slate-400 block mb-1">Código da Equipe</label>
                <input
                  type="text"
                  placeholder="Ex: ENL150, ECL200..."
                  value={newEquipeCode}
                  onChange={e => setNewEquipeCode(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold font-mono"
                />
              </div>

              <div>
                <label className="text-[11px] font-black uppercase text-slate-400 block mb-1">Veículo</label>
                <select
                  value={newEquipeVeiculo}
                  onChange={e => setNewEquipeVeiculo(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold"
                >
                  <option value="CESTO">CESTO</option>
                  <option value="LEVE">LEVE</option>
                  <option value="MOTO">MOTO</option>
                  <option value="LINHA VIVA">LINHA VIVA</option>
                  <option value="MUNCK APOIO">MUNCK APOIO</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-black uppercase text-slate-400 block mb-1">Subgrupo</label>
                <select
                  value={newEquipeSubgrupo}
                  onChange={e => setNewEquipeSubgrupo(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold"
                >
                  <option value="TMA">TMA</option>
                  <option value="LINHA VIVA">LINHA VIVA</option>
                  <option value="SOT">SOT</option>
                  <option value="SOC">SOC</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-black uppercase text-slate-400 block mb-1">Área de Atuação</label>
                <input
                  type="text"
                  placeholder="Ex: CAJATI, VILA MEDEIROS..."
                  value={newEquipeArea}
                  onChange={e => setNewEquipeArea(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold uppercase"
                />
              </div>
            </div>

            {/* SELEÇÃO DOS COLABORADORES DA SOBRA COM PESQUISA */}
            <div className="space-y-3 border-t border-slate-200 dark:border-slate-800 pt-4">
              <h4 className="text-xs font-black uppercase text-slate-400 flex items-center justify-between">
                <span>Selecione os Integrantes da Sobra ({selectedSobraMembers.length} selecionados)</span>
              </h4>

              {/* INPUT DE BUSCA NA SOBRA */}
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Pesquisar colaborador por nome, matrícula ou função..."
                  value={newSobraSearchTerm}
                  onChange={e => setNewSobraSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold"
                />
              </div>

              {filteredSobraForNewModal.length === 0 ? (
                <p className="text-xs font-bold text-slate-400">Nenhum colaborador encontrado na Sobra.</p>
              ) : (
                <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                  {filteredSobraForNewModal.map(c => {
                    const isSelected = selectedSobraMembers.includes(c.matricula);
                    return (
                      <div
                        key={c.matricula}
                        onClick={() => {
                          if (isSelected) {
                            setSelectedSobraMembers(prev => prev.filter(m => m !== c.matricula));
                          } else {
                            setSelectedSobraMembers(prev => [...prev, c.matricula]);
                          }
                        }}
                        className={`p-2.5 rounded-xl cursor-pointer transition-all flex items-center justify-between text-xs ${
                          isSelected
                            ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-900 dark:text-emerald-200 font-black'
                            : 'bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-semibold'
                        }`}
                      >
                        <div>
                          <p>{c.nome}</p>
                          <p className="text-[10px] text-slate-400">{c.funcao} | Matrícula: {c.matricula}</p>
                        </div>
                        <div className={`w-5 h-5 rounded-md flex items-center justify-center ${isSelected ? 'bg-emerald-600 text-white' : 'border border-slate-400'}`}>
                          {isSelected && <Check size={14} />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* BOTÃO SALVAR NOVA EQUIPE */}
            <div className="flex items-center justify-end gap-3 border-t border-slate-200 dark:border-slate-800 pt-4">
              <button
                onClick={() => setIsNewEquipeModalOpen(false)}
                className="px-4 py-2.5 rounded-2xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateNewEquipe}
                className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-emerald-500/20 active:scale-95"
              >
                Criar Equipe Operacional
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* MODAL 3: HISTÓRICO DE AUDITORIA (DE > PARA) */}
      {/* ========================================== */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-4xl bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] p-6 shadow-2xl space-y-4 max-h-[85vh] flex flex-col overflow-hidden">
            
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4 shrink-0">
              <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <History className="text-indigo-500" size={22} />
                <span>Histórico de Modificações:</span>
                <span className="text-indigo-600 font-mono">
                  {showHistoryModal === 'GLOBAL' ? 'Geral do Sistema' : `Equipe ${showHistoryModal}`}
                </span>
              </h3>
              <button 
                onClick={() => {
                  setShowHistoryModal(null);
                  setHistorySearchTerm('');
                }} 
                className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
              >
                <X size={18} />
              </button>
            </div>

            {/* INPUT DE PESQUISA / FILTRO NO HISTÓRICO */}
            <div className="relative shrink-0">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Pesquisar por Código de Equipe, Nome, Placa, Telefone ou Ação..."
                value={historySearchTerm}
                onChange={e => setHistorySearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            {/* LISTA DE TIMELINE */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden pr-1.5 space-y-3.5">
              {(() => {
                let logs = showHistoryModal === 'GLOBAL'
                  ? auditLog
                  : auditLog.filter(l => l.entidade_id === showHistoryModal || l.detalhes?.equipe === showHistoryModal);

                if (historySearchTerm.trim()) {
                  const term = historySearchTerm.toLowerCase();
                  logs = logs.filter(l => {
                    const eqMatch = (l.entidade_id || '').toLowerCase().includes(term);
                    const userMatch = (l.usuario_nome || '').toLowerCase().includes(term);
                    const actionMatch = (l.tipo_acao || '').toLowerCase().includes(term);
                    const prevMatch = (l.valor_anterior || '').toLowerCase().includes(term);
                    const newMatch = (l.valor_novo || '').toLowerCase().includes(term);
                    const detailsStr = l.detalhes ? JSON.stringify(l.detalhes).toLowerCase() : '';
                    return eqMatch || userMatch || actionMatch || prevMatch || newMatch || detailsStr.includes(term);
                  });
                }

                if (logs.length === 0) {
                  return (
                    <div className="py-12 text-center text-slate-400 font-bold">
                      Nenhum registro de alteração encontrado para os termos pesquisados.
                    </div>
                  );
                }

                return logs.map((log) => (
                  <div key={log.id} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700 space-y-2">
                    <div className="flex items-center justify-between text-xs flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 uppercase">
                          {log.tipo_acao}
                        </span>
                        <span className="font-mono text-slate-400 text-[11px]">
                          {new Date(log.created_at).toLocaleString('pt-BR')}
                        </span>
                      </div>
                      <span className="font-bold text-slate-700 dark:text-slate-300 text-[11px] flex items-center gap-1">
                        👤 {log.usuario_nome}
                      </span>
                    </div>

                    {/* COMPARAÇÃO DE > PARA */}
                    {(log.valor_anterior || log.valor_novo) && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 text-xs font-semibold">
                        <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-800 dark:text-rose-300">
                          <span className="text-[10px] font-black uppercase tracking-wider block text-rose-500">DE (Anterior):</span>
                          <span className="break-all">{log.valor_anterior || '(Vazio)'}</span>
                        </div>
                        <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300">
                          <span className="text-[10px] font-black uppercase tracking-wider block text-emerald-500">PARA (Novo):</span>
                          <span className="break-all">{log.valor_novo || '(Removido)'}</span>
                        </div>
                      </div>
                    )}

                    {/* DETALHES EXTRAS FORMATADOS */}
                    {log.detalhes && (
                      <div className="text-xs text-slate-700 dark:text-slate-300 bg-white/70 dark:bg-slate-900/70 p-3 rounded-xl border border-slate-200/60 dark:border-slate-800 space-y-1">
                        {typeof log.detalhes === 'object' ? (
                          <div className="flex flex-wrap gap-2 text-[11px]">
                            {Object.entries(log.detalhes).map(([k, v]) => (
                              <div key={k} className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center gap-1.5">
                                <span className="font-extrabold text-indigo-600 dark:text-indigo-400 capitalize">{k.replace(/_/g, ' ')}:</span>
                                <span className="font-semibold text-slate-800 dark:text-slate-200">{Array.isArray(v) ? v.join(', ') : (typeof v === 'object' ? JSON.stringify(v) : String(v))}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="font-semibold text-[11px]">{String(log.detalhes)}</p>
                        )}
                      </div>
                    )}
                  </div>
                ));
              })()}
            </div>

            <div className="flex items-center justify-end border-t border-slate-200 dark:border-slate-800 pt-3 shrink-0">
              <button
                onClick={() => {
                  setShowHistoryModal(null);
                  setHistorySearchTerm('');
                }}
                className="px-5 py-2.5 rounded-2xl bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 font-black text-xs uppercase"
              >
                Fechar
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* MODAL 5: CONFIRMAÇÃO DE DESFAZER EQUIPE    */}
      {/* ========================================== */}
      {disbandConfirmEquipe && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-md bg-white/95 dark:bg-slate-900/95 border border-rose-500/30 rounded-[2.5rem] p-6 shadow-2xl space-y-5">
            
            <div className="flex items-center gap-3 border-b border-rose-500/20 pb-3">
              <AlertTriangle className="text-rose-500 shrink-0" size={24} />
              <h3 className="text-lg font-black text-slate-900 dark:text-white">
                Desfazer Equipe Operacional
              </h3>
            </div>

            <div className="space-y-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
              <p>
                Tem certeza que deseja desmembrar a equipe <strong className="text-rose-600 dark:text-rose-400 font-black text-sm">{disbandConfirmEquipe}</strong>?
              </p>
              <p className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-800 dark:text-rose-300">
                ⚠️ Todos os colaboradores alocados nesta equipe serão imediatamente devolvidos para a <strong>Sobra (Sem Equipe)</strong> e essa ação será gravada no histórico de auditoria.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-slate-200 dark:border-slate-800 pt-4">
              <button
                onClick={() => setDisbandConfirmEquipe(null)}
                className="px-4 py-2.5 rounded-2xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs"
              >
                Cancelar
              </button>
              <button
                onClick={() => executeDisbandEquipe(disbandConfirmEquipe)}
                className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-rose-500/20 active:scale-95 flex items-center gap-2"
              >
                <Trash2 size={15} /> Confirmar e Desfazer
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* MODAL 4: PAINEL DE APROVAÇÕES (DE > PARA SIDE-BY-SIDE) */}
      {/* ========================================== */}
      {showApprovalPanel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-6xl bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] p-6 shadow-2xl space-y-5 max-h-[92vh] flex flex-col overflow-hidden">
            
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4 shrink-0">
              <div className="flex items-center gap-3">
                <Shield className="text-amber-500" size={24} />
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">
                    Painel de Solicitações de Alteração (DE &gt; PARA)
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    Comparação de estrutura original (DE) vs proposta sugerida (PARA) para liberações
                  </p>
                </div>
              </div>
              <button onClick={() => setShowApprovalPanel(false)} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400">
                <X size={18} />
              </button>
            </div>

            {/* LISTA DE SOLICITAÇÕES COM COMPARATIVO COMPLETO */}
            {changeRequests.length === 0 ? (
              <div className="py-12 text-center text-slate-400 font-bold">
                Nenhuma solicitação de alteração registrada até o momento.
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto overflow-x-hidden space-y-6 pr-1.5">
                {changeRequests.map((req) => {
                  const isPending = req.status === 'PENDENTE';
                  const isApproved = req.status === 'APROVADO';
                  const isRejected = req.status === 'REJEITADO';

                  const deData = req.detalhes?.de;
                  const paraData = req.detalhes?.para;

                  return (
                    <div
                      key={req.id}
                      className={`p-5 rounded-3xl border shadow-md space-y-4 ${
                        isPending
                          ? 'bg-amber-500/5 border-amber-500/30'
                          : isApproved
                          ? 'bg-emerald-500/5 border-emerald-500/30'
                          : 'bg-rose-500/5 border-rose-500/30'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/60 dark:border-slate-800 pb-3">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <span className="font-mono text-xs font-black text-indigo-600 dark:text-indigo-400 bg-indigo-500/15 px-2.5 py-0.5 rounded-full border border-indigo-500/30">
                            ID: {req.id}
                          </span>
                          <span className={`px-3 py-1 rounded-full text-xs font-black uppercase ${
                            isPending ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30 animate-pulse' :
                            isApproved ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30' :
                            'bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-500/30'
                          }`}>
                            {req.status}
                          </span>
                          <span className="font-black text-xs uppercase text-slate-800 dark:text-white">
                            {req.tipo_acao} ({req.entidade_id})
                          </span>
                        </div>

                        <div className="text-[11px] font-semibold text-slate-400">
                          Solicitado por <strong className="text-slate-800 dark:text-slate-200">{req.solicitante_nome} ({req.solicitante_perfil})</strong> em {new Date(req.created_at).toLocaleString('pt-BR')}
                        </div>
                      </div>

                      {/* DE > PARA DETALHADO COMPLETO */}
                      {deData && paraData ? (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 text-xs">
                          {/* DE */}
                          <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 space-y-2">
                            <span className="text-[10px] font-black uppercase text-rose-600 dark:text-rose-400 flex items-center gap-1">
                              <XCircle size={13} /> FORMAÇÃO ORIGINAL (DE):
                            </span>
                            <div className="font-mono text-[11px] text-slate-700 dark:text-slate-300 space-y-1">
                              <p>• Equipe: <strong>{deData.equipe}</strong></p>
                              <p>• Placa: <strong>{deData.placa || 'N/I'}</strong> | Tel: <strong>{deData.telefone || 'N/I'}</strong></p>
                              <p>• Câmera: <strong>{deData.camera || 'N/I'}</strong></p>
                              <p className="font-bold text-slate-900 dark:text-white pt-1">• Integrantes ({deData.membros?.length}):</p>
                              <ul className="list-disc list-inside space-y-0.5 pl-1">
                                {(deData.membros || []).map((m, i) => (
                                  <li key={i}>{m.nome} ({m.funcao})</li>
                                ))}
                              </ul>
                            </div>
                          </div>

                          {/* PARA */}
                          <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 space-y-2">
                            <span className="text-[10px] font-black uppercase text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                              <CheckCircle size={13} /> FORMAÇÃO SUGERIDA (PARA):
                            </span>
                            <div className="font-mono text-[11px] text-slate-700 dark:text-slate-300 space-y-1">
                              <p>• Nova Equipe: <strong className="text-emerald-600 dark:text-emerald-400">{paraData.equipe}</strong></p>
                              <p>• Nova Placa: <strong>{paraData.placa || 'N/I'}</strong> | Tel: <strong>{paraData.telefone || 'N/I'}</strong></p>
                              <p>• Câmera: <strong>{paraData.camera || 'N/I'}</strong></p>
                              <p className="font-bold text-slate-900 dark:text-white pt-1">• Integrantes Sugeridos ({paraData.membros?.length}):</p>
                              <ul className="list-disc list-inside space-y-0.5 pl-1 text-emerald-700 dark:text-emerald-300 font-bold">
                                {(paraData.membros || []).map((m, i) => (
                                  <li key={i}>{m.nome} ({m.funcao})</li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        </div>
                      ) : (
                        /* SIMPLES RESUMO */
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-semibold">
                          <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-900 dark:text-rose-200">
                            <span className="text-[10px] font-black uppercase block text-rose-600 dark:text-rose-400 mb-1">DE (Anterior):</span>
                            <p className="font-bold text-sm">{req.valor_anterior || '(Vazio)'}</p>
                          </div>

                          <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-900 dark:text-emerald-200">
                            <span className="text-[10px] font-black uppercase block text-emerald-600 dark:text-emerald-400 mb-1">PARA (Sugerido):</span>
                            <p className="font-bold text-sm">{req.valor_novo || '(Removido)'}</p>
                          </div>
                        </div>
                      )}

                      {/* MOTIVO DE REJEIÇÃO */}
                      {req.motivo_rejeicao && (
                        <div className="p-3 rounded-xl bg-rose-500/15 text-rose-800 dark:text-rose-300 text-xs font-bold">
                          ⚠️ Motivo da Rejeição: {req.motivo_rejeicao} (por {req.aprovador_nome})
                        </div>
                      )}

                      {/* BOTÕES PARA APROVADORES */}
                      {isPending && (
                        <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2 border-t border-slate-200/60 dark:border-slate-800">
                          {!canEditDirectly ? (
                            <span className="text-xs font-bold text-slate-400 italic">
                              Aguardando liberação de um Coordenador ou Gerente.
                            </span>
                          ) : (
                            <>
                              <div className="flex items-center gap-2 w-full sm:w-auto">
                                <input
                                  type="text"
                                  placeholder="Motivo em caso de rejeição..."
                                  value={rejectReason}
                                  onChange={e => setRejectReason(e.target.value)}
                                  className="flex-1 sm:w-64 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold"
                                />
                                <button
                                  onClick={() => {
                                    handleRejectRequest(req.id, rejectReason);
                                    setRejectReason('');
                                  }}
                                  className="px-3 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-1 shadow-xs"
                                >
                                  <XCircle size={14} /> Rejeitar
                                </button>
                              </div>
                              <button
                                onClick={() => handleApproveRequest(req.id)}
                                className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-md shadow-emerald-500/20 active:scale-95"
                              >
                                <CheckCircle size={15} /> Aprovar Alteração
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <div className="flex items-center justify-end border-t border-slate-200 dark:border-slate-800 pt-3 shrink-0">
              <button
                onClick={() => setShowApprovalPanel(false)}
                className="px-5 py-2.5 rounded-2xl bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 font-black text-xs uppercase"
              >
                Fechar
              </button>
            </div>

          </div>
        </div>
      )}

      {/* MODAL DE PERFIL DO COLABORADOR */}
      <EmployeeProfileModal 
        isOpen={!!editingEmployee}
        onClose={() => setEditingEmployee(null)}
        employee={editingEmployee}
        onSave={handleSaveEmployee}
        onDelete={handleDeleteEmployee}
        logAudit={logAudit}
        currentUser={currentUser}
      />
    </div>
  );
}
