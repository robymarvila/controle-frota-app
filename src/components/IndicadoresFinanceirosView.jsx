import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { PieChart as PieChartIcon, RefreshCcw, Filter, ChevronDown, CheckSquare, Square } from 'lucide-react';
import {
  ComposedChart, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  Line, Area, PieChart, Pie, Cell
} from 'recharts';

const ratesNorte = {
  'Cesto': { rate: 342.00, hours: 8 },
  'Leve': { rate: 278.30, hours: 8 },
  'Moto': { rate: 280.10, hours: 8 },
  'Munk': { rate: 342.00, hours: 8 },
  'Linha Viva': { rate: 342.00, hours: 10 },
  'LV': { rate: 342.00, hours: 10 }
};

const ratesLeste = {
  'Cesto': { rate: 338.39, hours: 8 },
  'Leve': { rate: 274.56, hours: 8 },
  'Moto': { rate: 276.14, hours: 8 },
  'Munk': { rate: 338.39, hours: 8 },
  'Linha Viva': { rate: 338.39, hours: 8 },
  'LV': { rate: 338.39, hours: 8 }
};

const basesNorteList = ['Fagundes Filho', 'Cajati', 'Vila Medeiros', 'Bragança'];

const getTitleCaseBase = (str) => {
  if (!str) return 'Desconhecida';
  const lower = str.toLowerCase();
  if (lower.includes('santo and')) return 'Santo André';
  if (lower.includes('fagundes')) return 'Fagundes Filho';
  if (lower.includes('aricanduva')) return 'Aricanduva';
  if (lower.includes('catumbi')) return 'Catumbi';
  if (lower.includes('cajati')) return 'Cajati';
  if (lower.includes('vila medeiros')) return 'Vila Medeiros';
  if (lower.includes('monte santo')) return 'Monte Santo';
  if (lower.includes('guarulhos')) return 'Guarulhos';
  if (lower.includes('itaquera')) return 'Itaquera';
  if (lower.includes('são miguel') || lower.includes('sao miguel')) return 'São Miguel';
  return str.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
};

const isVehicleType = (str) => {
  if (!str) return false;
  const s = str.toUpperCase();
  return s.includes('CESTO') || s.includes('LEVE') || s.includes('MOTO') || s.includes('MUNK') || s.includes('LINHA VIVA') || s === 'LV';
};

const getBaseFromReg = (reg) => {
  let b = reg.base;
  if (isVehicleType(b)) b = null;
  if (b && b.trim() !== '') return getTitleCaseBase(b);
  const teamName = reg.nome || reg.chaveUnica || '';
  const prefix = teamName.substring(0, 3).toUpperCase();
  const PREFIX_TO_BASE = {
    'ESL': 'Santo André', 'ENL': 'Fagundes Filho', 'EQL': 'Aricanduva',
    'EVL': 'Catumbi', 'ECL': 'Cajati', 'EEL': 'Vila Medeiros', 'EML': 'Monte Santo'
  };
  return PREFIX_TO_BASE[prefix] || 'Desconhecida';
};

const getRegionFromBase = (base) => {
  const normBase = getTitleCaseBase(base);
  if (basesNorteList.includes(normBase)) return 'NORTE';
  return 'LESTE';
};

const getNormalizedVehicle = (veiculo) => {
  const normVeiculo = veiculo?.trim().toUpperCase() || '';
  if (normVeiculo.includes('LEVE')) return 'Leve';
  if (normVeiculo.includes('MOTO')) return 'Moto';
  if (normVeiculo.includes('MUNK') || normVeiculo.includes('PESADO')) return 'Munk';
  if (normVeiculo.includes('LINHA VIVA') || normVeiculo.includes('LV')) return 'LV';
  return 'Cesto';
};

const getRateInfo = (regiao, vType) => {
  return (regiao === 'NORTE' ? ratesNorte : ratesLeste)[vType] || ratesNorte['Cesto'];
};

const getTurno = (horario) => {
  if (!horario) return 'Desconhecido';
  const h = parseInt(horario.split(':')[0], 10);
  if (isNaN(h)) return 'Desconhecido';
  if (h >= 5 && h < 12) return 'Manhã';
  if (h >= 12 && h < 18) return 'Tarde';
  return 'Noite';
};

const formatCurrencyCompact = (val) => {
  return new Intl.NumberFormat('pt-BR', { notation: "compact", compactDisplay: "short", maximumFractionDigits: 1 }).format(val);
};

const formatCurrency = (val) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(val);
};

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316'];

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-3 rounded-xl shadow-lg">
        <p className="font-bold text-slate-700 dark:text-slate-200 mb-2">{label}</p>
        {payload.map((entry, index) => (
          <p key={index} style={{ color: entry.color }} className="text-sm font-black flex justify-between gap-4">
            <span>{entry.name}:</span>
            <span>{formatCurrency(entry.value)}</span>
          </p>
        ))}
      </div>
    );
  }
  return null;
};

// Componente MultiSelect Customizado
const MultiSelectDropdown = ({ label, options, selected, onChange }) => {
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

  const toggleOption = (opt) => {
    if (selected.includes(opt)) {
      onChange(selected.filter(x => x !== opt));
    } else {
      onChange([...selected, opt]);
    }
  };

  const isAllSelected = selected.length === 0;
  const displayLabel = isAllSelected ? `Todos` : `${selected.length} selec.`;

  return (
    <div className="relative" ref={containerRef}>
      <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">{label}</div>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-40 bg-white border border-slate-200 hover:border-slate-300 rounded-xl px-3 py-2 text-sm font-bold text-slate-700 shadow-sm transition-all"
      >
        <span className="truncate">{displayLabel}</span>
        <ChevronDown size={14} className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      
      {isOpen && (
        <div className="absolute z-50 top-full mt-2 w-48 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden flex flex-col max-h-[300px]">
          <div className="p-2 border-b border-slate-100 flex justify-between bg-slate-50">
            <button onClick={() => onChange([])} className="text-xs font-bold text-blue-600 hover:text-blue-800">Limpar</button>
            <button onClick={() => setIsOpen(false)} className="text-xs font-bold text-slate-500 hover:text-slate-700">Fechar</button>
          </div>
          <div className="overflow-y-auto p-2 flex flex-col gap-1">
            {options.map((opt, idx) => {
              const isSelected = selected.includes(opt);
              return (
                <button 
                  key={idx} 
                  onClick={() => toggleOption(opt)}
                  className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-50 rounded-lg text-left text-sm font-medium text-slate-700"
                >
                  {isSelected ? <CheckSquare size={16} className="text-blue-600" /> : <Square size={16} className="text-slate-300" />}
                  <span className="truncate">{opt}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default function IndicadoresFinanceirosView({ theme }) {
  const [competencia, setCompetencia] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Dados Brutos da API para cruzamento dinâmico no front
  const [rawData, setRawData] = useState({ allRegs: [], planData: [] });

  // Listas de Opções Disponíveis
  const [availableBases, setAvailableBases] = useState([]);
  const availableRegioes = ['NORTE', 'LESTE'];
  const availableVeiculos = ['Cesto', 'Leve', 'Moto', 'Munk', 'LV'];
  const availableTurnos = ['Manhã', 'Tarde', 'Noite'];

  // Estados dos Filtros Multi-Select (Vazio = Tudo selecionado)
  const [selectedRegioes, setSelectedRegioes] = useState([]);
  const [selectedBases, setSelectedBases] = useState([]);
  const [selectedVeiculos, setSelectedVeiculos] = useState([]);
  const [selectedTurnos, setSelectedTurnos] = useState([]);

  const [chartData, setChartData] = useState({
    diario: [],
    veiculo: [],
    regiao: [],
    base: [],
    turno: []
  });

  const getAvailableMonths = () => {
    const months = [];
    const d = new Date();
    for (let i = -6; i <= 1; i++) {
      const td = new Date(d.getFullYear(), d.getMonth() + i, 1);
      const val = `${td.getFullYear()}-${String(td.getMonth() + 1).padStart(2, '0')}`;
      const label = td.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
      months.push({ val, label: label.charAt(0).toUpperCase() + label.slice(1) });
    }
    return months;
  };

  useEffect(() => {
    const d = new Date();
    setCompetencia(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }, []);

  const fetchData = async () => {
    if (!competencia) return;
    setLoading(true);
    
    const [y, m] = competencia.split('-');
    const dataInicio = `${y}-${m}-01`;
    const dataFim = `${y}-${m}-${new Date(parseInt(y), parseInt(m), 0).getDate()}`;

    try {
      let allRegs = [];
      let page = 0;
      let hasMore = true;
      while (hasMore) {
        const { data, error } = await supabase
          .from('entregas_equipes')
          .select('*')
          .gte('dataRegistro', dataInicio)
          .lte('dataRegistro', dataFim)
          .range(page * 1000, (page + 1) * 1000 - 1);
        if (error) throw error;
        if (data && data.length > 0) {
          allRegs = [...allRegs, ...data];
          if (data.length < 1000) hasMore = false;
          else page++;
        } else {
          hasMore = false;
        }
      }

      const { data: planData, error: planError } = await supabase
        .from('planejamento_equipes')
        .select('*');
      if (planError) throw planError;

      // Extract unique bases dynamically across the month
      const basesSet = new Set();
      allRegs.forEach(reg => {
        const base = getBaseFromReg(reg);
        if (base && base !== 'Desconhecida') basesSet.add(base);
      });
      (planData || []).forEach(p => {
        if (!isVehicleType(p.base)) {
          const base = getTitleCaseBase(p.base);
          if (base && base !== 'Desconhecida') basesSet.add(base);
        }
      });

      setAvailableBases(Array.from(basesSet).sort());
      setRawData({ allRegs, planData });

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [competencia]);

  // Recalcular Gráficos quando Filtros ou Dados mudarem
  useEffect(() => {
    if (!rawData.allRegs.length && !rawData.planData.length) return;
    processChartsData();
  }, [rawData, selectedRegioes, selectedBases, selectedVeiculos, selectedTurnos]);

  const passesFilters = (regiao, base, veiculo, turno) => {
    if (selectedRegioes.length > 0 && !selectedRegioes.includes(regiao)) return false;
    if (selectedBases.length > 0 && !selectedBases.includes(base)) return false;
    if (selectedVeiculos.length > 0 && !selectedVeiculos.includes(veiculo)) return false;
    if (selectedTurnos.length > 0 && !selectedTurnos.includes(turno)) return false;
    return true;
  };

  const processChartsData = () => {
    const { allRegs, planData } = rawData;
    
    const [y, m] = competencia.split('-');
    const dataInicio = `${y}-${m}-01`;
    const dataFim = `${y}-${m}-${new Date(parseInt(y), parseInt(m), 0).getDate()}`;
    const d1 = new Date(dataInicio);
    const d2 = new Date(dataFim);
    
    const datesList = [];
    for (let dt = new Date(d1.getFullYear(), d1.getMonth(), d1.getDate()); dt <= d2; dt.setDate(dt.getDate() + 1)) {
      datesList.push(dt.toISOString().split('T')[0]);
    }

    const dHoje = new Date();
    const currentComp = `${dHoje.getFullYear()}-${String(dHoje.getMonth() + 1).padStart(2, '0')}`;
    const isClosed = competencia < currentComp;

    const dailyAcc = {};
    const veiculoAcc = {};
    const regiaoAcc = {};
    const baseAcc = {};
    const turnoAcc = {};

    datesList.forEach(dStr => {
      dailyAcc[dStr] = { data: dStr, plan: 0, real: 0 };
    });

    const uniqueDates = new Set();

    // Aggregation Real
    allRegs.forEach(reg => {
      if (reg.dataRegistro) {
        const dStr = reg.dataRegistro.split('T')[0];
        
        if (datesList.includes(dStr)) {
          const base = getBaseFromReg(reg);
          const rRegiao = getRegionFromBase(base);
          const rawVeiculo = reg.veiculo || 'Desconhecido';
          const veiculo = getNormalizedVehicle(rawVeiculo);
          const turno = getTurno(reg.horario);
          
          if (!passesFilters(rRegiao, base, veiculo, turno)) return;
          uniqueDates.add(dStr);

          let tempoDecimal = parseFloat(String(reg.tempoRealDecimal).replace(',', '.'));
          if (isNaN(tempoDecimal)) tempoDecimal = 0;

          const info = getRateInfo(rRegiao, veiculo);
          const receitaReal = tempoDecimal * info.rate * 1; 

          dailyAcc[dStr].real += receitaReal;
          
          if (!veiculoAcc[veiculo]) veiculoAcc[veiculo] = { name: veiculo, plan: 0, real: 0 };
          veiculoAcc[veiculo].real += receitaReal;

          if (!regiaoAcc[rRegiao]) regiaoAcc[rRegiao] = { name: rRegiao, plan: 0, real: 0 };
          regiaoAcc[rRegiao].real += receitaReal;

          if (!baseAcc[base]) baseAcc[base] = { name: base, plan: 0, real: 0 };
          baseAcc[base].real += receitaReal;

          if (!turnoAcc[turno]) turnoAcc[turno] = { name: turno, plan: 0, real: 0 };
          turnoAcc[turno].real += receitaReal;
        }
      }
    });

    // Aggregation Plan
    const daysDiff = datesList.length;
    (planData || []).forEach(p => {
      if (isVehicleType(p.base)) return;
      const pBase = getTitleCaseBase(p.base);
      const pRegiao = getRegionFromBase(pBase);
      const pVeic = getNormalizedVehicle(p.veiculo);
      const pTurno = getTurno(p.horario);
      
      if (!passesFilters(pRegiao, pBase, pVeic, pTurno)) return;

      const count = p.quantidadePlan || p.equipesPlanejadas || 0;
      const info = getRateInfo(pRegiao, pVeic);
      const dailyReceitaPlan = info.hours * info.rate * count;
      
      datesList.forEach(dStr => {
        dailyAcc[dStr].plan += dailyReceitaPlan;
      });

      const totalPlan = dailyReceitaPlan * daysDiff;

      if (!veiculoAcc[pVeic]) veiculoAcc[pVeic] = { name: pVeic, plan: 0, real: 0 };
      veiculoAcc[pVeic].plan += totalPlan;

      if (!regiaoAcc[pRegiao]) regiaoAcc[pRegiao] = { name: pRegiao, plan: 0, real: 0 };
      regiaoAcc[pRegiao].plan += totalPlan;

      if (!baseAcc[pBase]) baseAcc[pBase] = { name: pBase, plan: 0, real: 0 };
      baseAcc[pBase].plan += totalPlan;

      if (!turnoAcc[pTurno]) turnoAcc[pTurno] = { name: pTurno, plan: 0, real: 0 };
      turnoAcc[pTurno].plan += totalPlan;
    });

    // Calculate Projection and Accumulate Data
    const numDaysWithData = Math.max(1, uniqueDates.size);
    const totalReal = Object.values(dailyAcc).reduce((acc, curr) => acc + curr.real, 0);
    const projectedDailyAverage = isClosed ? 0 : (totalReal / numDaysWithData);
    
    let currAcumuladoReal = 0;
    let currAcumuladoPlan = 0;
    let currAcumuladoProj = 0;

    const lastRealDateStr = Array.from(uniqueDates).sort().pop() || '';

    const diarioFinal = datesList.map((dStr, index) => {
      const dArr = dStr.split('-');
      const shortDate = `${dArr[2]}/${dArr[1]}`;
      const item = dailyAcc[dStr];
      
      const isFutureDate = !isClosed && dStr > lastRealDateStr;
      const isToday = dStr === lastRealDateStr;

      currAcumuladoPlan += item.plan;

      if (!isFutureDate) {
         currAcumuladoReal += item.real;
      }

      if (!isClosed) {
         currAcumuladoProj += projectedDailyAverage;
      } else {
         currAcumuladoProj = null;
      }

      return {
        name: shortDate,
        'Planejado': item.plan,
        'Realizado': isFutureDate ? null : item.real,
        'Acumulado Plan': currAcumuladoPlan,
        'Acumulado Real': isFutureDate ? null : currAcumuladoReal,
        'Acumulado Proj.': currAcumuladoProj
      };
    });

    const sortByReal = (a, b) => b.real - a.real;

    setChartData({
      diario: diarioFinal,
      veiculo: Object.values(veiculoAcc).sort(sortByReal),
      regiao: Object.values(regiaoAcc).sort(sortByReal),
      base: Object.values(baseAcc).sort(sortByReal),
      turno: Object.values(turnoAcc).sort(sortByReal).map(t => ({ name: t.name, value: t.real })) 
    });
  };

  return (
    <div className="flex flex-col gap-6 animate-fade-in w-full pb-10">
      
      {/* HEADER / FILTROS GERAIS */}
      <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-6 shadow-[0_8px_30px_rgba(0,0,0,0.02)] border border-slate-100 dark:border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-blue-950 dark:text-slate-100 flex items-center gap-3">
            <PieChartIcon className="text-blue-600" size={28} />
            Dashboard de Indicadores
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-bold mt-1 uppercase tracking-wider">
            Visão Gráfica de Produção e Receita
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={competencia}
            onChange={(e) => setCompetencia(e.target.value)}
            className="bg-slate-50 border-2 border-slate-200 text-slate-700 text-sm font-bold rounded-xl focus:ring-blue-500 focus:border-blue-500 block w-40 p-2.5 outline-none cursor-pointer"
          >
            {getAvailableMonths().map(m => (
              <option key={m.val} value={m.val}>{m.label}</option>
            ))}
          </select>
          <button 
            onClick={fetchData}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white p-2.5 rounded-xl transition-all shadow-sm flex items-center justify-center w-11 h-11"
          >
            <RefreshCcw size={20} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* PAINEL DE FILTROS MULTI-SELECT */}
      <div className="bg-slate-50 border border-slate-200 rounded-3xl p-4 flex flex-wrap gap-4 items-center">
        <div className="bg-white border border-slate-200 p-2 rounded-xl flex items-center text-slate-400 mr-2 shadow-sm">
           <Filter size={20} />
        </div>
        <MultiSelectDropdown label="Região" options={availableRegioes} selected={selectedRegioes} onChange={setSelectedRegioes} />
        <MultiSelectDropdown label="Base" options={availableBases} selected={selectedBases} onChange={setSelectedBases} />
        <MultiSelectDropdown label="Turno" options={availableTurnos} selected={selectedTurnos} onChange={setSelectedTurnos} />
        <MultiSelectDropdown label="Veículo" options={availableVeiculos} selected={selectedVeiculos} onChange={setSelectedVeiculos} />
      </div>

      {loading ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-100 rounded-[2rem] p-16 flex flex-col justify-center items-center gap-4 text-slate-400 shadow-sm">
          <RefreshCcw className="animate-spin" size={32} /> 
          <span className="font-bold tracking-wider uppercase text-xs">Construindo gráficos...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Gráfico Diário - Composed Chart */}
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[2rem] p-6 shadow-sm">
            <h3 className="font-black text-blue-950 dark:text-slate-200 text-lg mb-6 tracking-wider uppercase">
              Evolução Financeira Diária e Acumulada
            </h3>
            <div className="h-[400px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData.diario} margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                  <defs>
                    <linearGradient id="colorRealFin" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.25}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.01}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 'bold', fill: '#64748b' }} />
                  
                  {/* Eixo Y Esquerdo (Diário) */}
                  <YAxis yAxisId="left" tickFormatter={formatCurrencyCompact} axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 'bold', fill: '#64748b' }} />
                  
                  {/* Eixo Y Direito (Acumulado) */}
                  <YAxis yAxisId="right" orientation="right" tickFormatter={formatCurrencyCompact} axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 'bold', fill: '#cbd5e1' }} />
                  
                  <Tooltip content={<CustomTooltip />} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', fontWeight: 'bold' }} />
                  
                  <Bar yAxisId="left" dataKey="Planejado" fill="#3b82f6" fillOpacity={0.15} stroke="#3b82f6" strokeWidth={1.5} strokeDasharray="3 3" radius={[4, 4, 0, 0]} />
                  <Area yAxisId="left" type="monotone" dataKey="Realizado" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorRealFin)" dot={{ r: 3, strokeWidth: 1 }} activeDot={{ r: 6 }} />
                  
                  <Line yAxisId="right" type="monotone" dataKey="Acumulado Plan" stroke="#3b82f6" strokeWidth={3} dot={false} />
                  <Line yAxisId="right" type="monotone" dataKey="Acumulado Real" stroke="#f59e0b" strokeWidth={4} dot={false} />
                  <Line yAxisId="right" type="monotone" dataKey="Acumulado Proj." stroke="#94a3b8" strokeDasharray="6 4" strokeWidth={3} dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Gráfico Região */}
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[2rem] p-6 shadow-sm">
            <h3 className="font-black text-blue-950 dark:text-slate-200 text-lg mb-6 tracking-wider uppercase">
              Receita por Região
            </h3>
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData.regiao} margin={{ top: 5, right: 0, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 'bold', fill: '#64748b' }} />
                  <YAxis tickFormatter={formatCurrencyCompact} axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 'bold', fill: '#64748b' }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', fontWeight: 'bold' }} />
                  <Bar dataKey="plan" name="Planejado" fill="#93c5fd" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="real" name="Realizado" fill="#34d399" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Gráfico Turno */}
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[2rem] p-6 shadow-sm flex flex-col">
            <h3 className="font-black text-blue-950 dark:text-slate-200 text-lg mb-6 tracking-wider uppercase">
              Realizado por Turno
            </h3>
            <div className="h-[280px] w-full flex-1">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData.turno}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {chartData.turno.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatCurrency(value)} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', fontWeight: 'bold' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Gráfico Bases */}
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[2rem] p-6 shadow-sm">
            <h3 className="font-black text-blue-950 dark:text-slate-200 text-lg mb-6 tracking-wider uppercase">
              Receita por Base (Rank)
            </h3>
            <div className="h-[320px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData.base} margin={{ top: 5, right: 0, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold', fill: '#64748b' }} interval={0} />
                  <YAxis tickFormatter={formatCurrencyCompact} axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 'bold', fill: '#64748b' }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', fontWeight: 'bold' }} />
                  <Bar dataKey="plan" name="Planejado" fill="#93c5fd" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="real" name="Realizado" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Gráfico Veículos */}
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[2rem] p-6 shadow-sm">
            <h3 className="font-black text-blue-950 dark:text-slate-200 text-lg mb-6 tracking-wider uppercase">
              Receita por Veículo
            </h3>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart layout="vertical" data={chartData.veiculo} margin={{ top: 5, right: 30, left: 30, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                  <XAxis type="number" tickFormatter={formatCurrencyCompact} axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 'bold', fill: '#64748b' }} />
                  <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: 'bold', fill: '#64748b' }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', fontWeight: 'bold' }} />
                  <Bar dataKey="plan" name="Planejado" fill="#bfdbfe" radius={[0, 4, 4, 0]} />
                  <Bar dataKey="real" name="Realizado" fill="#f59e0b" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
