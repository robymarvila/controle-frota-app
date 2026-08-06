import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { DollarSign, Search, RefreshCcw, ChevronRight, Activity, TrendingUp, TrendingDown, BarChart2, Expand, Shrink } from 'lucide-react';

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
  if (isVehicleType(b)) {
    b = null;
  }
  if (b && b.trim() !== '') return getTitleCaseBase(b);
  
  const teamName = reg.nome || reg.chaveUnica || '';
  const prefix = teamName.substring(0, 3).toUpperCase();
  const PREFIX_TO_BASE = {
    'ESL': 'Santo André',
    'ENL': 'Fagundes Filho',
    'EQL': 'Aricanduva',
    'EVL': 'Catumbi',
    'ECL': 'Cajati',
    'EEL': 'Vila Medeiros',
    'EML': 'Monte Santo'
  };
  return PREFIX_TO_BASE[prefix] || 'Desconhecida';
};

const getRegionFromBase = (base) => {
  const normBase = getTitleCaseBase(base);
  if (basesNorteList.includes(normBase)) return 'NORTE';
  return 'LESTE';
};

const getRateInfo = (regiao, veiculo) => {
  const normVeiculo = veiculo?.trim().toUpperCase() || '';
  let vType = 'Cesto';
  if (normVeiculo.includes('LEVE')) vType = 'Leve';
  if (normVeiculo.includes('MOTO')) vType = 'Moto';
  if (normVeiculo.includes('MUNK') || normVeiculo.includes('PESADO')) vType = 'Munk';
  if (normVeiculo.includes('LINHA VIVA') || normVeiculo.includes('LV')) vType = 'LV';

  const isNorte = regiao === 'NORTE';
  const rates = isNorte ? ratesNorte : ratesLeste;
  return rates[vType] || rates['Cesto'];
};

const formatCurrency = (val) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(val || 0);
};

const formatCurrencyShort = (val) => {
  if (!val) return '0';
  return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 }).format(val);
};

export default function FinanceiroView({ theme, currentUser }) {
  const [competencia, setCompetencia] = useState('');
  const [semana, setSemana] = useState('ALL');
  const [modoVisao, setModoVisao] = useState('RESUMO');
  const [loading, setLoading] = useState(false);
  
  const [dreData, setDreData] = useState({ 
    NORTE: { bases: {}, planTotal: 0, realTotal: 0, projecaoTotal: 0 }, 
    LESTE: { bases: {}, planTotal: 0, realTotal: 0, projecaoTotal: 0 }, 
    totais: { plan: 0, real: 0, projecao: 0 },
    meta: { daysDiff: 1, daysInMonth: 30, datesList: [], isClosed: false }
  });
  
  const [activeRegionTab, setActiveRegionTab] = useState('GERAL');
  const [collapsedBases, setCollapsedBases] = useState({});

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

  const getWeeksForMonth = (compStr) => {
    if (!compStr) return [];
    const [y, m] = compStr.split('-');
    const year = parseInt(y, 10);
    const month = parseInt(m, 10) - 1;
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    let current = new Date(firstDay);
    const dayOfWeek = current.getDay();
    const diff = current.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    let startOfWeek = new Date(current.setDate(diff));
    
    const weeks = [];
    let wNum = 1;
    while (startOfWeek <= lastDay) {
      let endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      
      let actualStart = startOfWeek < firstDay ? firstDay : startOfWeek;
      let actualEnd = endOfWeek > lastDay ? lastDay : endOfWeek;
      
      const sStr = String(actualStart.getDate()).padStart(2, '0') + '/' + String(actualStart.getMonth()+1).padStart(2, '0');
      const eStr = String(actualEnd.getDate()).padStart(2, '0') + '/' + String(actualEnd.getMonth()+1).padStart(2, '0');
      const ds = actualStart.toISOString().split('T')[0];
      const de = actualEnd.toISOString().split('T')[0];
      
      weeks.push({
         label: `W${wNum} | ${sStr} a ${eStr}`,
         val: `${ds}|${de}`
      });
      wNum++;
      startOfWeek.setDate(startOfWeek.getDate() + 7);
    }
    return weeks;
  };

  useEffect(() => {
    const d = new Date();
    const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    setCompetencia(val);
  }, []);

  const toggleCollapse = (base) => {
    setCollapsedBases(prev => ({ ...prev, [base]: !prev[base] }));
  };

  const toggleAllBases = () => {
    const allBases = [];
    Object.keys(dreData.NORTE.bases).forEach(b => allBases.push(b));
    Object.keys(dreData.LESTE.bases).forEach(b => allBases.push(b));
    
    const isAnyExpanded = allBases.some(b => !collapsedBases[b]);
    const newCollapsed = {};
    if (isAnyExpanded) {
      allBases.forEach(b => newCollapsed[b] = true);
    }
    setCollapsedBases(newCollapsed);
  };

  const fetchData = async () => {
    if (!competencia) return;
    setLoading(true);
    
    let dataInicio, dataFim;
    if (semana === 'ALL') {
      const [y, m] = competencia.split('-');
      dataInicio = `${y}-${m}-01`;
      dataFim = `${y}-${m}-${new Date(parseInt(y), parseInt(m), 0).getDate()}`;
    } else {
      [dataInicio, dataFim] = semana.split('|');
    }

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

      const planMap = {}; 
      (planData || []).forEach(p => {
        if (isVehicleType(p.base)) return;
        const pBase = getTitleCaseBase(p.base);
        const pVeic = p.veiculo || 'Desconhecido';
        if (!planMap[pBase]) planMap[pBase] = {};
        if (!planMap[pBase][pVeic]) planMap[pBase][pVeic] = 0;
        planMap[pBase][pVeic] += (p.quantidadePlan || p.equipesPlanejadas || 0);
      });

      const d1 = new Date(dataInicio);
      const d2 = new Date(dataFim);
      const daysDiff = Math.max(1, Math.round((d2 - d1) / (1000 * 60 * 60 * 24)) + 1);
      
      const compDate = new Date(competencia + '-01T00:00:00');
      const daysInMonth = new Date(compDate.getFullYear(), compDate.getMonth() + 1, 0).getDate();

      const dHoje = new Date();
      const currentComp = `${dHoje.getFullYear()}-${String(dHoje.getMonth() + 1).padStart(2, '0')}`;
      const isClosed = competencia < currentComp;

      const datesList = [];
      for (let dt = new Date(d1.getFullYear(), d1.getMonth(), d1.getDate()); dt <= d2; dt.setDate(dt.getDate() + 1)) {
        datesList.push(dt.toISOString().split('T')[0]);
      }

      const tree = { 
        NORTE: { bases: {}, planTotal: 0, realTotal: 0, projecaoTotal: 0 }, 
        LESTE: { bases: {}, planTotal: 0, realTotal: 0, projecaoTotal: 0 } 
      };

      const uniqueDates = new Set();

      const initVeiculoStructure = (rRegiao, base, veiculo) => {
        if (!tree[rRegiao].bases[base]) tree[rRegiao].bases[base] = {};
        if (!tree[rRegiao].bases[base][veiculo]) {
          const diasObj = {};
          datesList.forEach(dStr => diasObj[dStr] = { plan: 0, real: 0 });
          tree[rRegiao].bases[base][veiculo] = { plan: 0, real: 0, projecao: 0, dias: diasObj };
        }
      };

      allRegs.forEach(reg => {
        if (reg.dataRegistro) {
          const dStr = reg.dataRegistro.split('T')[0];
          uniqueDates.add(dStr);
          
          if (datesList.includes(dStr)) {
            const base = getBaseFromReg(reg);
            const rRegiao = getRegionFromBase(base);
            const veiculo = reg.veiculo || 'Desconhecido';
            
            initVeiculoStructure(rRegiao, base, veiculo);
            
            let tempoDecimal = parseFloat(String(reg.tempoRealDecimal).replace(',', '.'));
            if (isNaN(tempoDecimal)) tempoDecimal = 0;

            const info = getRateInfo(rRegiao, veiculo);
            const receitaReal = tempoDecimal * info.rate * 1; 
            
            tree[rRegiao].bases[base][veiculo].real += receitaReal;
            tree[rRegiao].bases[base][veiculo].dias[dStr].real += receitaReal;
          }
        }
      });

      Object.keys(planMap).forEach(base => {
        const rRegiao = getRegionFromBase(base);
        Object.keys(planMap[base]).forEach(veiculo => {
          initVeiculoStructure(rRegiao, base, veiculo);

          const planDailyCount = planMap[base][veiculo];
          const info = getRateInfo(rRegiao, veiculo);
          const receitaPlanDaily = (info.hours * info.rate * planDailyCount);
          
          const receitaPlanTotal = receitaPlanDaily * daysDiff;
          tree[rRegiao].bases[base][veiculo].plan += receitaPlanTotal;
          
          datesList.forEach(dStr => {
            tree[rRegiao].bases[base][veiculo].dias[dStr].plan += receitaPlanDaily;
          });
        });
      });

      const numDaysWithData = Math.max(1, uniqueDates.size);

      let gtPlan = 0;
      let gtReal = 0;
      let gtProjecao = 0;
      
      ['NORTE', 'LESTE'].forEach(reg => {
        let rPlan = 0;
        let rReal = 0;
        let rProjecao = 0;
        
        Object.keys(tree[reg].bases).forEach(base => {
          let bPlan = 0;
          let bReal = 0;
          let bProjecao = 0;
          
          Object.keys(tree[reg].bases[base]).forEach(veiculo => {
            const vPlan = tree[reg].bases[base][veiculo].plan;
            const vReal = tree[reg].bases[base][veiculo].real;
            
            let vProjecao;
            if (isClosed) {
              vProjecao = vReal;
            } else {
              vProjecao = (vReal / numDaysWithData) * daysInMonth;
            }
            
            tree[reg].bases[base][veiculo].projecao = vProjecao;
            
            bPlan += vPlan;
            bReal += vReal;
            bProjecao += vProjecao;
          });
          
          const bDias = {};
          datesList.forEach(dStr => bDias[dStr] = { plan: 0, real: 0 });
          Object.keys(tree[reg].bases[base]).forEach(veiculo => {
            datesList.forEach(dStr => {
              bDias[dStr].plan += tree[reg].bases[base][veiculo].dias[dStr].plan;
              bDias[dStr].real += tree[reg].bases[base][veiculo].dias[dStr].real;
            });
          });

          tree[reg].bases[base].TOTAL = { plan: bPlan, real: bReal, projecao: bProjecao, dias: bDias };
          rPlan += bPlan;
          rReal += bReal;
          rProjecao += bProjecao;
        });
        
        tree[reg].planTotal = rPlan;
        tree[reg].realTotal = rReal;
        tree[reg].projecaoTotal = rProjecao;
        
        const rDias = {};
        datesList.forEach(dStr => rDias[dStr] = { plan: 0, real: 0 });
        Object.keys(tree[reg].bases).forEach(base => {
          datesList.forEach(dStr => {
            rDias[dStr].plan += tree[reg].bases[base].TOTAL.dias[dStr].plan;
            rDias[dStr].real += tree[reg].bases[base].TOTAL.dias[dStr].real;
          });
        });
        tree[reg].dias = rDias;
        
        gtPlan += rPlan;
        gtReal += rReal;
        gtProjecao += rProjecao;
      });

      const gtDias = {};
      datesList.forEach(dStr => {
        gtDias[dStr] = {
          plan: tree['NORTE'].dias[dStr].plan + tree['LESTE'].dias[dStr].plan,
          real: tree['NORTE'].dias[dStr].real + tree['LESTE'].dias[dStr].real
        };
      });

      setDreData({
        NORTE: tree['NORTE'],
        LESTE: tree['LESTE'],
        totais: { plan: gtPlan, real: gtReal, projecao: gtProjecao, dias: gtDias },
        meta: { daysDiff, daysInMonth, datesList, isClosed }
      });
      
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (competencia) {
      setSemana('ALL'); 
      setTimeout(fetchData, 50);
    }
  }, [competencia]);

  useEffect(() => {
    fetchData();
  }, [semana]);

  const totalDiff = dreData.totais.real - dreData.totais.plan;
  const totalPerc = dreData.totais.plan ? (dreData.totais.real / dreData.totais.plan) * 100 : 0;
  
  const projDiff = dreData.totais.projecao - dreData.totais.plan;
  const projPerc = dreData.totais.plan ? (dreData.totais.projecao / dreData.totais.plan) * 100 : 0;

  const renderResumoRegionTable = (regionKey, title) => {
    const regionData = dreData[regionKey];
    if (!regionData) return null;

    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[2rem] shadow-[0_8px_30px_rgba(0,0,0,0.02)] overflow-hidden mb-8">
        <div className="bg-blue-950 text-white p-4 font-black text-center uppercase tracking-widest text-xs">
          PRODUÇÃO OPERACIONAL - {title}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse min-w-[1100px]">
            <thead>
              <tr className="bg-slate-50 text-blue-950 font-black">
                <th className="border-r border-b-2 border-slate-200 p-0 w-[160px] sticky left-0 z-30 bg-slate-50 shadow-[2px_0_5px_rgba(0,0,0,0.02)]"></th>
                <th className="border-r border-b-2 border-slate-200 p-3 w-[160px] sticky left-[160px] z-30 bg-slate-50 uppercase text-[10px] tracking-wider text-left align-middle">
                  Tipo Veículo
                </th>
                <th className="border-r border-slate-200 p-3 text-center border-b-[3px] border-orange-400 bg-slate-50/50 uppercase text-[10px] tracking-wider">
                  Planejado
                </th>
                <th className="border-r border-slate-200 p-3 text-center border-b-[3px] border-emerald-400 bg-slate-50/50 uppercase text-[10px] tracking-wider">
                  Realizado
                </th>
                <th className="border-r border-slate-200 p-3 text-center border-b-[3px] border-emerald-500 bg-slate-100 text-slate-800 uppercase text-[10px] tracking-wider">
                  Var. Realizada
                </th>
                <th className="border-r border-slate-200 p-3 text-center border-b-[3px] border-indigo-400 bg-slate-50/50 text-indigo-900 uppercase text-[10px] tracking-wider">
                  {dreData.meta.isClosed ? 'Resultado Final' : 'Projeção (Mês)'}
                </th>
                <th className="p-3 text-center border-b-[3px] border-blue-500 bg-slate-100 text-slate-800 uppercase text-[10px] tracking-wider">
                  Var. Projetada
                </th>
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-slate-200">
              {Object.keys(regionData.bases).map((base, bIdx) => {
                const baseData = regionData.bases[base];
                const veiculos = Object.keys(baseData).filter(k => k !== 'TOTAL');
                const isCollapsed = collapsedBases[base] ?? false;
                const rowCount = isCollapsed ? 1 : veiculos.length + 1;

                return (
                  <React.Fragment key={`${regionKey}-${bIdx}`}>
                    {veiculos.map((veiculo, vIdx) => {
                      const plan = baseData[veiculo].plan;
                      const real = baseData[veiculo].real;
                      const projecao = baseData[veiculo].projecao;
                      const diffReal = real - plan;
                      const diffProj = projecao - plan;

                      return (
                        <tr 
                          key={vIdx}
                          className={`tr-transition border-b border-slate-100 hover:bg-slate-50/50 ${isCollapsed ? 'opacity-0 invisible pointer-events-none' : 'opacity-100'}`}
                          style={{ height: isCollapsed ? '0px' : 'auto', display: isCollapsed ? 'none' : '' }}
                        >
                          {vIdx === 0 && !isCollapsed && (
                            <td rowSpan={rowCount} className="border-r border-b bg-slate-100 text-slate-800 p-3 align-middle w-[160px] sticky left-0 z-20 shadow-[2px_0_5px_rgba(0,0,0,0.03)]">
                              <div className="flex flex-col items-center justify-center gap-2">
                                <button onClick={() => toggleCollapse(base)} className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors border bg-white hover:bg-slate-200 border-slate-300 text-slate-500 shadow-sm">
                                  <ChevronRight size={14} className={`transition-transform duration-300 ${isCollapsed ? '' : 'rotate-90'}`} />
                                </button>
                                <span className="text-center font-black text-[10px] uppercase tracking-wider break-words w-full leading-tight">{base}</span>
                              </div>
                            </td>
                          )}
                          <td className={`td-transition border-r border-slate-200 sticky left-[160px] z-10 bg-white font-bold text-slate-600 align-middle ${isCollapsed ? 'p-0 border-none' : 'p-3'}`}>
                            <div className={`slide-wrapper ${isCollapsed ? 'collapsed' : ''}`}>{veiculo}</div>
                          </td>
                          <td className={`td-transition text-right font-medium text-slate-700 ${isCollapsed ? 'p-0 border-none' : 'p-3'}`}>
                            <div className={`slide-wrapper ${isCollapsed ? 'collapsed' : ''}`}>{formatCurrency(plan)}</div>
                          </td>
                          <td className={`td-transition text-right font-medium text-slate-700 ${isCollapsed ? 'p-0 border-none' : 'p-3'}`}>
                            <div className={`slide-wrapper ${isCollapsed ? 'collapsed' : ''}`}>{formatCurrency(real)}</div>
                          </td>
                          <td className={`td-transition text-right font-black border-r border-slate-200 ${isCollapsed ? 'p-0 border-none' : 'p-3'} ${diffReal >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                            <div className={`slide-wrapper ${isCollapsed ? 'collapsed' : ''}`}>{formatCurrency(diffReal)}</div>
                          </td>
                          <td className={`td-transition text-right font-black border-r border-slate-200 ${isCollapsed ? 'p-0 border-none' : 'p-3'} ${projecao < plan ? 'text-rose-600' : 'text-indigo-600'}`}>
                            <div className={`slide-wrapper ${isCollapsed ? 'collapsed' : ''}`}>{formatCurrency(projecao)}</div>
                          </td>
                          <td className={`td-transition text-right font-black ${isCollapsed ? 'p-0 border-none' : 'p-3'} ${diffProj >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                            <div className={`slide-wrapper ${isCollapsed ? 'collapsed' : ''}`}>{formatCurrency(diffProj)}</div>
                          </td>
                        </tr>
                      );
                    })}

                    <tr className={`tr-transition border-b-2 border-slate-200 hover:bg-blue-950/5 ${isCollapsed ? '' : 'bg-slate-50'}`}>
                      {isCollapsed && (
                         <td className="border-r border-b bg-slate-100 text-slate-800 p-3 align-middle w-[160px] sticky left-0 z-20 shadow-[2px_0_5px_rgba(0,0,0,0.03)]">
                           <div className="flex flex-col items-center justify-center gap-2">
                             <button onClick={() => toggleCollapse(base)} className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors border bg-white hover:bg-slate-200 border-slate-300 text-slate-500 shadow-sm">
                               <ChevronRight size={14} className={`transition-transform duration-300 ${isCollapsed ? '' : 'rotate-90'}`} />
                             </button>
                             <span className="text-center font-black text-[10px] uppercase tracking-wider break-words w-full leading-tight">{base}</span>
                           </div>
                         </td>
                      )}
                      <td className={`td-transition border-r border-slate-200 sticky left-[160px] z-10 ${isCollapsed ? 'bg-white' : 'bg-slate-50'} font-black text-blue-950 uppercase tracking-widest text-[10px] align-middle p-3`}>
                        <div className="slide-wrapper opacity-100 max-h-[100px]">TOTAL BASE</div>
                      </td>
                      <td className="td-transition text-right font-black text-slate-800 p-3 bg-orange-50/30">
                        {formatCurrency(baseData.TOTAL?.plan || 0)}
                      </td>
                      <td className="td-transition text-right font-black text-slate-800 p-3 bg-emerald-50/30">
                        {formatCurrency(baseData.TOTAL?.real || 0)}
                      </td>
                      <td className={`td-transition text-right border-r border-slate-200 font-black p-3 ${((baseData.TOTAL?.real || 0) - (baseData.TOTAL?.plan || 0)) >= 0 ? 'text-emerald-700 bg-emerald-50/50' : 'text-rose-700 bg-rose-50/50'}`}>
                        {formatCurrency((baseData.TOTAL?.real || 0) - (baseData.TOTAL?.plan || 0))}
                      </td>
                      <td className={`td-transition border-r border-slate-200 text-right font-black p-3 ${baseData.TOTAL?.projecao < baseData.TOTAL?.plan ? 'text-rose-700 bg-rose-50/30' : 'text-indigo-700 bg-indigo-50/30'}`}>
                        {formatCurrency(baseData.TOTAL?.projecao || 0)}
                      </td>
                      <td className={`td-transition text-right font-black p-3 ${((baseData.TOTAL?.projecao || 0) - (baseData.TOTAL?.plan || 0)) >= 0 ? 'text-blue-700 bg-blue-50/50' : 'text-orange-700 bg-orange-50/50'}`}>
                        {formatCurrency((baseData.TOTAL?.projecao || 0) - (baseData.TOTAL?.plan || 0))}
                      </td>
                    </tr>
                  </React.Fragment>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-blue-950 text-white font-black text-sm uppercase tracking-widest">
                <td colSpan="2" className="p-4 border-r border-blue-900 sticky left-0 z-30 bg-blue-950 text-right">
                  TOTAL {title}
                </td>
                <td className="p-4 text-right border-r border-blue-900">{formatCurrency(regionData.planTotal)}</td>
                <td className="p-4 text-right border-r border-blue-900">{formatCurrency(regionData.realTotal)}</td>
                <td className={`p-4 text-right border-r border-blue-900 ${regionData.realTotal - regionData.planTotal >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {formatCurrency(regionData.realTotal - regionData.planTotal)}
                </td>
                <td className={`p-4 text-right border-r border-blue-900 ${regionData.projecaoTotal < regionData.planTotal ? 'text-rose-400' : 'text-indigo-300'}`}>
                  {formatCurrency(regionData.projecaoTotal)}
                </td>
                <td className={`p-4 text-right ${regionData.projecaoTotal - regionData.planTotal >= 0 ? 'text-blue-300' : 'text-orange-400'}`}>
                  {formatCurrency(regionData.projecaoTotal - regionData.planTotal)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    );
  };

  const renderDiarioRegionTable = (regionKey, title) => {
    const regionData = dreData[regionKey];
    if (!regionData) return null;
    const { datesList } = dreData.meta;

    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[2rem] shadow-[0_8px_30px_rgba(0,0,0,0.02)] overflow-hidden mb-8">
        <div className="bg-blue-950 text-white p-4 font-black text-center uppercase tracking-widest text-xs">
          PRODUÇÃO DIÁRIA - {title}
        </div>
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-xs border-collapse min-w-max">
            <thead>
              <tr className="bg-slate-50 text-blue-950 font-black">
                <th rowSpan="2" className="border-r border-b-2 border-slate-200 p-0 w-[140px] sticky left-0 z-30 bg-slate-50 shadow-[2px_0_5px_rgba(0,0,0,0.02)]"></th>
                <th rowSpan="2" className="border-r border-b-2 border-slate-200 p-3 w-[140px] sticky left-[140px] z-30 bg-slate-50 uppercase text-[10px] tracking-wider text-left align-middle">
                  Tipo Veículo
                </th>
                {datesList.map((dStr, idx) => {
                  const dataArr = dStr.split('-');
                  const shortDate = `${dataArr[2]}/${dataArr[1]}`;
                  return (
                    <th key={idx} colSpan="2" className="border-r border-slate-200 p-2 text-center border-b-[3px] border-orange-400 bg-slate-50/50 uppercase tracking-widest">
                      {shortDate}
                    </th>
                  );
                })}
                <th colSpan="2" className="p-2 text-center border-b-[3px] border-slate-400 bg-slate-100 text-slate-800 uppercase tracking-widest">
                  TOTAL
                </th>
              </tr>
              <tr className="bg-slate-50 text-slate-400 text-[9px] uppercase tracking-widest font-black">
                {datesList.map((_, idx) => (
                  <React.Fragment key={idx}>
                    <th className="border-r border-slate-200 p-1.5 text-center bg-slate-50/30">Plan</th>
                    <th className="border-r border-slate-200 p-1.5 text-center bg-white">Real</th>
                  </React.Fragment>
                ))}
                <th className="border-r border-slate-200 p-1.5 text-center bg-slate-100 text-slate-600">Plan</th>
                <th className="p-1.5 text-center bg-slate-100 text-slate-600">Real</th>
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-slate-200">
              {Object.keys(regionData.bases).map((base, bIdx) => {
                const baseData = regionData.bases[base];
                const veiculos = Object.keys(baseData).filter(k => k !== 'TOTAL');
                const isCollapsed = collapsedBases[base] ?? false;
                const rowCount = isCollapsed ? 1 : veiculos.length + 1;

                return (
                  <React.Fragment key={`${regionKey}-${bIdx}`}>
                    {veiculos.map((veiculo, vIdx) => {
                      const diasInfo = baseData[veiculo].dias;
                      
                      return (
                        <tr 
                          key={vIdx}
                          className={`tr-transition border-b border-slate-100 hover:bg-slate-50/50 ${isCollapsed ? 'opacity-0 invisible pointer-events-none' : 'opacity-100'}`}
                          style={{ height: isCollapsed ? '0px' : 'auto', display: isCollapsed ? 'none' : '' }}
                        >
                          {vIdx === 0 && !isCollapsed && (
                            <td rowSpan={rowCount} className="border-r border-b bg-slate-100 text-slate-800 p-3 align-middle w-[140px] sticky left-0 z-20 shadow-[2px_0_5px_rgba(0,0,0,0.03)]">
                              <div className="flex flex-col items-center justify-center gap-2">
                                <button onClick={() => toggleCollapse(base)} className="w-6 h-6 rounded-lg flex items-center justify-center transition-colors border bg-white hover:bg-slate-200 border-slate-300 text-slate-500 shadow-sm">
                                  <ChevronRight size={12} className={`transition-transform duration-300 ${isCollapsed ? '' : 'rotate-90'}`} />
                                </button>
                                <span className="text-center font-black text-[9px] uppercase tracking-wider break-words w-full leading-tight">{base}</span>
                              </div>
                            </td>
                          )}
                          <td className={`td-transition border-r border-slate-200 sticky left-[140px] z-10 bg-white font-bold text-slate-600 align-middle ${isCollapsed ? 'p-0 border-none' : 'p-2'}`}>
                            <div className={`slide-wrapper ${isCollapsed ? 'collapsed' : ''}`}>{veiculo}</div>
                          </td>
                          {datesList.map((dStr, idx) => (
                            <React.Fragment key={idx}>
                              <td className={`td-transition text-right text-slate-500 ${isCollapsed ? 'p-0 border-none' : 'p-2'} ${diasInfo[dStr].plan > 0 ? 'font-medium' : 'text-slate-300'}`}>
                                <div className={`slide-wrapper ${isCollapsed ? 'collapsed' : ''}`}>{formatCurrencyShort(diasInfo[dStr].plan)}</div>
                              </td>
                              <td className={`td-transition text-right border-r border-slate-200 ${isCollapsed ? 'p-0 border-none' : 'p-2'} ${diasInfo[dStr].real > 0 ? 'font-black text-slate-700 bg-emerald-50/30' : 'text-slate-300'}`}>
                                <div className={`slide-wrapper ${isCollapsed ? 'collapsed' : ''}`}>{formatCurrencyShort(diasInfo[dStr].real)}</div>
                              </td>
                            </React.Fragment>
                          ))}
                          <td className={`td-transition text-right font-bold text-slate-600 bg-slate-50 ${isCollapsed ? 'p-0 border-none' : 'p-2 border-l border-slate-300'}`}>
                            <div className={`slide-wrapper ${isCollapsed ? 'collapsed' : ''}`}>{formatCurrencyShort(baseData[veiculo].plan)}</div>
                          </td>
                          <td className={`td-transition text-right font-black text-emerald-700 bg-slate-50 ${isCollapsed ? 'p-0 border-none' : 'p-2'}`}>
                            <div className={`slide-wrapper ${isCollapsed ? 'collapsed' : ''}`}>{formatCurrencyShort(baseData[veiculo].real)}</div>
                          </td>
                        </tr>
                      );
                    })}

                    <tr className={`tr-transition border-b-2 border-slate-300 hover:bg-blue-950/5 ${isCollapsed ? '' : 'bg-slate-50'}`}>
                      {isCollapsed && (
                         <td className="border-r border-b bg-slate-100 text-slate-800 p-3 align-middle w-[140px] sticky left-0 z-20 shadow-[2px_0_5px_rgba(0,0,0,0.03)]">
                           <div className="flex flex-col items-center justify-center gap-2">
                             <button onClick={() => toggleCollapse(base)} className="w-6 h-6 rounded-lg flex items-center justify-center transition-colors border bg-white hover:bg-slate-200 border-slate-300 text-slate-500 shadow-sm">
                               <ChevronRight size={12} className={`transition-transform duration-300 ${isCollapsed ? '' : 'rotate-90'}`} />
                             </button>
                             <span className="text-center font-black text-[9px] uppercase tracking-wider break-words w-full leading-tight">{base}</span>
                           </div>
                         </td>
                      )}
                      <td className={`td-transition border-r border-slate-200 sticky left-[140px] z-10 ${isCollapsed ? 'bg-white' : 'bg-slate-50'} font-black text-blue-950 uppercase tracking-widest text-[9px] align-middle p-2`}>
                        <div className="slide-wrapper opacity-100 max-h-[100px]">TOTAL BASE</div>
                      </td>
                      {datesList.map((dStr, idx) => (
                        <React.Fragment key={idx}>
                          <td className="td-transition text-right font-black text-slate-600 p-2 bg-slate-100/50">
                            {formatCurrencyShort(baseData.TOTAL.dias[dStr].plan)}
                          </td>
                          <td className="td-transition text-right font-black text-slate-800 border-r border-slate-200 p-2 bg-emerald-50">
                            {formatCurrencyShort(baseData.TOTAL.dias[dStr].real)}
                          </td>
                        </React.Fragment>
                      ))}
                      <td className="td-transition text-right font-black text-slate-800 p-2 border-l border-slate-300 bg-orange-50/50">
                        {formatCurrencyShort(baseData.TOTAL.plan)}
                      </td>
                      <td className="td-transition text-right font-black text-slate-800 p-2 bg-emerald-100/50">
                        {formatCurrencyShort(baseData.TOTAL.real)}
                      </td>
                    </tr>
                  </React.Fragment>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-blue-950 text-white font-black text-[10px] uppercase tracking-widest">
                <td colSpan="2" className="p-3 border-r border-blue-900 sticky left-0 z-30 bg-blue-950 text-right">
                  TOTAL {title}
                </td>
                {datesList.map((dStr, idx) => (
                  <React.Fragment key={idx}>
                    <td className="p-2 text-right text-blue-300">{formatCurrencyShort(regionData.dias[dStr].plan)}</td>
                    <td className="p-2 text-right border-r border-blue-900 text-emerald-400">{formatCurrencyShort(regionData.dias[dStr].real)}</td>
                  </React.Fragment>
                ))}
                <td className="p-3 text-right text-orange-300 border-l border-blue-800">{formatCurrencyShort(regionData.planTotal)}</td>
                <td className="p-3 text-right text-emerald-400">{formatCurrencyShort(regionData.realTotal)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-6 animate-fade-in w-full pb-10">
      <style>{`
        .slide-wrapper {
          transition: max-height 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.2s ease-in-out, padding 0.3s ease-in-out;
          max-height: 100px;
          opacity: 1;
          overflow: hidden;
        }
        .slide-wrapper.collapsed {
          max-height: 0px;
          opacity: 0;
        }
        .tr-transition {
          transition: opacity 0.3s ease-in-out, height 0.3s cubic-bezier(0.4, 0, 0.2, 1), visibility 0.3s;
        }
        .td-transition {
          transition: padding 0.3s cubic-bezier(0.4, 0, 0.2, 1), border-width 0.3s ease-in-out;
        }
        .custom-scrollbar::-webkit-scrollbar {
          height: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f5f9;
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
      `}</style>

      {/* HEADER / FILTROS */}
      <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-6 shadow-[0_8px_30px_rgba(0,0,0,0.02)] border border-slate-100 dark:border-slate-800 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-blue-950 dark:text-slate-100 flex items-center gap-3">
            <Activity className="text-blue-600" size={28} />
            Produção Operacional
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-bold mt-1 uppercase tracking-wider">
            Análise Financeira de Planejado vs Realizado
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-2xl p-1.5 shadow-inner">
            <button 
              onClick={() => setModoVisao('RESUMO')}
              className={`px-5 py-2 rounded-xl text-sm font-black uppercase tracking-wider transition-all ${modoVisao === 'RESUMO' ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}
            >
              Resumo Mensal
            </button>
            <button 
              onClick={() => setModoVisao('DIARIO')}
              className={`px-5 py-2 rounded-xl text-sm font-black uppercase tracking-wider transition-all ${modoVisao === 'DIARIO' ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}
            >
              Visão Diária
            </button>
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
            
            <select
              value={semana}
              onChange={(e) => setSemana(e.target.value)}
              className="bg-slate-50 border-2 border-slate-200 text-slate-700 text-sm font-bold rounded-xl focus:ring-blue-500 focus:border-blue-500 block min-w-[200px] p-2.5 outline-none cursor-pointer"
            >
              <option value="ALL">Mês Completo</option>
              {getWeeksForMonth(competencia).map(w => (
                <option key={w.val} value={w.val}>{w.label}</option>
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
      </div>

      {/* KPI CARDS (GLOBAL) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-indigo-50 to-white dark:from-slate-800 dark:to-slate-900 border border-indigo-100 dark:border-slate-800 rounded-[2rem] p-6 relative overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.02)]">
          <div className="absolute top-0 right-0 p-4 opacity-10 text-indigo-600"><DollarSign size={80} /></div>
          <h3 className="text-indigo-600 dark:text-indigo-400 font-black text-[10px] tracking-widest uppercase mb-1">Receita Planejada</h3>
          <p className="text-2xl font-black text-slate-800 dark:text-slate-100">{formatCurrency(dreData.totais.plan)}</p>
        </div>

        <div className="bg-gradient-to-br from-emerald-50 to-white dark:from-slate-800 dark:to-slate-900 border border-emerald-100 dark:border-slate-800 rounded-[2rem] p-6 relative overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.02)]">
          <div className="absolute top-0 right-0 p-4 opacity-10 text-emerald-600"><Activity size={80} /></div>
          <h3 className="text-emerald-600 dark:text-emerald-400 font-black text-[10px] tracking-widest uppercase mb-1">Receita Realizada</h3>
          <p className="text-2xl font-black text-slate-800 dark:text-slate-100">{formatCurrency(dreData.totais.real)}</p>
        </div>

        <div className="bg-gradient-to-br from-slate-50 to-white dark:from-slate-800 dark:to-slate-900 border border-slate-200 dark:border-slate-700 rounded-[2rem] p-5 relative overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.02)] flex flex-col justify-between">
          <div className="absolute top-0 right-0 p-4 opacity-[0.03] text-slate-900"><TrendingUp size={80} /></div>
          
          <div className="mb-2 relative z-10">
             <h3 className={`font-black text-[10px] tracking-widest uppercase mb-0.5 ${totalDiff >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
               Var. Realizada
             </h3>
             <div className="flex items-end gap-2">
                <p className="text-xl font-black text-slate-800 dark:text-slate-100">{formatCurrency(totalDiff)}</p>
                <span className={`text-[10px] font-black mb-1 px-1.5 py-0.5 rounded-md ${totalDiff >= 0 ? 'bg-emerald-100/50 text-emerald-700' : 'bg-rose-100/50 text-rose-700'}`}>
                  {totalPerc.toFixed(0)}%
                </span>
             </div>
          </div>

          <div className="relative z-10 pt-2 border-t border-slate-100 dark:border-slate-800">
             <h3 className={`font-black text-[10px] tracking-widest uppercase mb-0.5 ${projDiff >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-orange-600 dark:text-orange-400'}`}>
               Var. Projetada
             </h3>
             <div className="flex items-end gap-2">
                <p className="text-xl font-black text-slate-800 dark:text-slate-100">{formatCurrency(projDiff)}</p>
                <span className={`text-[10px] font-black mb-1 px-1.5 py-0.5 rounded-md ${projDiff >= 0 ? 'bg-blue-100/50 text-blue-700' : 'bg-orange-100/50 text-orange-700'}`}>
                  {projPerc.toFixed(0)}%
                </span>
             </div>
          </div>
        </div>

        <div className={`bg-gradient-to-br from-blue-50 to-white dark:from-slate-800 dark:to-slate-900 border border-blue-100 dark:border-slate-800 rounded-[2rem] p-6 relative overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.02)] ${dreData.meta.isClosed ? 'opacity-80' : ''}`}>
          <div className="absolute top-0 right-0 p-4 opacity-10 text-blue-600"><BarChart2 size={80} /></div>
          <h3 className={`font-black text-[10px] tracking-widest uppercase mb-1 ${dreData.totais.projecao < dreData.totais.plan ? 'text-rose-600 dark:text-rose-400' : 'text-blue-600 dark:text-blue-400'}`}>
            {dreData.meta.isClosed ? 'Resultado Final' : `Projeção (${dreData.meta.daysInMonth} dias)`}
          </h3>
          <p className="text-2xl font-black text-slate-800 dark:text-slate-100">{formatCurrency(dreData.totais.projecao)}</p>
        </div>
      </div>

      {activeRegionTab === 'GERAL' && (
        <div className="bg-gradient-to-r from-blue-950 to-indigo-950 text-white rounded-[2rem] p-6 shadow-md flex flex-col gap-5 mt-2">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-blue-800/50 pb-5 gap-4">
            <div>
              <h3 className="font-black text-2xl flex items-center gap-2">
                <Activity size={24} className="text-blue-400"/> CONSOLIDADO GERAL
              </h3>
              <p className="text-blue-300 text-xs font-bold uppercase tracking-wider mt-1">Soma Integrada (Norte + Leste)</p>
            </div>
            <div className="flex gap-6 md:gap-12 bg-white/5 rounded-2xl p-4 border border-white/10">
              <div>
                <p className="text-blue-300 text-[10px] font-black tracking-widest uppercase mb-1">Planejado Total</p>
                <p className="text-2xl font-bold">{formatCurrency(dreData.totais.plan)}</p>
              </div>
              <div className="border-l border-white/10 pl-6 md:pl-12">
                <p className="text-emerald-400 text-[10px] font-black tracking-widest uppercase mb-1">Realizado Total</p>
                <p className="text-2xl font-bold">{formatCurrency(dreData.totais.real)}</p>
              </div>
              <div className="border-l border-white/10 pl-6 md:pl-12">
                <p className="text-indigo-300 text-[10px] font-black tracking-widest uppercase mb-1">
                  {dreData.meta.isClosed ? 'Resultado Final' : 'Projeção Mês'}
                </p>
                <p className={`text-2xl font-bold ${dreData.totais.projecao < dreData.totais.plan ? 'text-rose-400' : 'text-indigo-300'}`}>
                  {formatCurrency(dreData.totais.projecao)}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div className="bg-black/20 rounded-xl p-5 flex flex-col justify-between border border-white/5">
               <span className="font-black text-lg tracking-widest uppercase text-slate-200 mb-4 flex items-center gap-2">
                 <div className="w-2 h-2 rounded-full bg-blue-500"></div> Região Norte
               </span>
               <div className="grid grid-cols-3 gap-4">
                  <div className="bg-white/5 rounded-lg p-3 text-center">
                    <p className="text-blue-300 text-[9px] font-black uppercase tracking-widest mb-1">Plan</p>
                    <p className="text-sm font-bold text-slate-100">{formatCurrency(dreData.NORTE.planTotal)}</p>
                  </div>
                  <div className="bg-white/5 rounded-lg p-3 text-center">
                    <p className="text-emerald-400 text-[9px] font-black uppercase tracking-widest mb-1">Real</p>
                    <p className="text-sm font-bold text-slate-100">{formatCurrency(dreData.NORTE.realTotal)}</p>
                  </div>
                  <div className="bg-white/5 rounded-lg p-3 text-center">
                    <p className="text-indigo-300 text-[9px] font-black uppercase tracking-widest mb-1">Proj</p>
                    <p className="text-sm font-bold text-slate-100">{formatCurrency(dreData.NORTE.projecaoTotal)}</p>
                  </div>
               </div>
             </div>
             <div className="bg-black/20 rounded-xl p-5 flex flex-col justify-between border border-white/5">
               <span className="font-black text-lg tracking-widest uppercase text-slate-200 mb-4 flex items-center gap-2">
                 <div className="w-2 h-2 rounded-full bg-orange-500"></div> Região Leste
               </span>
               <div className="grid grid-cols-3 gap-4">
                  <div className="bg-white/5 rounded-lg p-3 text-center">
                    <p className="text-blue-300 text-[9px] font-black uppercase tracking-widest mb-1">Plan</p>
                    <p className="text-sm font-bold text-slate-100">{formatCurrency(dreData.LESTE.planTotal)}</p>
                  </div>
                  <div className="bg-white/5 rounded-lg p-3 text-center">
                    <p className="text-emerald-400 text-[9px] font-black uppercase tracking-widest mb-1">Real</p>
                    <p className="text-sm font-bold text-slate-100">{formatCurrency(dreData.LESTE.realTotal)}</p>
                  </div>
                  <div className="bg-white/5 rounded-lg p-3 text-center">
                    <p className="text-indigo-300 text-[9px] font-black uppercase tracking-widest mb-1">Proj</p>
                    <p className="text-sm font-bold text-slate-100">{formatCurrency(dreData.LESTE.projecaoTotal)}</p>
                  </div>
               </div>
             </div>
          </div>
        </div>
      )}

      {/* ABAS POR REGIÃO + BOTÃO DE EXPANDIR/RECOLHER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mt-2">
        <div className="flex bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl w-fit">
          <button 
            onClick={() => setActiveRegionTab('GERAL')}
            className={`px-8 py-2.5 rounded-xl text-sm font-black tracking-wider uppercase transition-all flex items-center gap-2 ${
              activeRegionTab === 'GERAL' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
            }`}
          >
            <Activity size={18} />
            VISÃO GERAL
          </button>
          <button 
            onClick={() => setActiveRegionTab('NORTE')}
            className={`px-8 py-2.5 rounded-xl text-sm font-black tracking-wider uppercase transition-all ${
              activeRegionTab === 'NORTE' ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
            }`}
          >
            Região Norte
          </button>
          <button 
            onClick={() => setActiveRegionTab('LESTE')}
            className={`px-8 py-2.5 rounded-xl text-sm font-black tracking-wider uppercase transition-all ${
              activeRegionTab === 'LESTE' ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
            }`}
          >
            Região Leste
          </button>
        </div>

        <button 
          onClick={toggleAllBases}
          className="flex items-center gap-2 px-5 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl font-bold text-xs uppercase tracking-wider transition-colors shadow-sm border border-slate-200 dark:border-slate-700"
        >
          {Object.keys(dreData.NORTE.bases).some(b => !collapsedBases[b]) ? (
            <><Shrink size={16} /> Recolher Tudo</>
          ) : (
            <><Expand size={16} /> Expandir Tudo</>
          )}
        </button>
      </div>

      {loading ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-100 rounded-[2rem] p-16 flex flex-col justify-center items-center gap-4 text-slate-400 shadow-sm">
          <RefreshCcw className="animate-spin" size={32} /> 
          <span className="font-bold tracking-wider uppercase text-xs">Processando dados financeiros...</span>
        </div>
      ) : (
        <>
          {activeRegionTab === 'GERAL' ? (
            <>
              {modoVisao === 'RESUMO' ? renderResumoRegionTable('NORTE', 'Região Norte') : renderDiarioRegionTable('NORTE', 'Região Norte')}
              {modoVisao === 'RESUMO' ? renderResumoRegionTable('LESTE', 'Região Leste') : renderDiarioRegionTable('LESTE', 'Região Leste')}
            </>
          ) : (
            modoVisao === 'RESUMO' ? renderResumoRegionTable(activeRegionTab, `Região ${activeRegionTab.charAt(0) + activeRegionTab.slice(1).toLowerCase()}`) : renderDiarioRegionTable(activeRegionTab, `Região ${activeRegionTab.charAt(0) + activeRegionTab.slice(1).toLowerCase()}`)
          )}
        </>
      )}
    </div>
  );
}
