import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users,
  ArrowLeft, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  Smartphone, 
  ShieldCheck, 
  MapPin, 
  Search, 
  ChevronLeft, 
  ChevronRight, 
  Activity, 
  Wifi, 
  RotateCcw, 
  Filter, 
  Eye, 
  CalendarCheck, 
  CalendarX, 
  Lock, 
  Navigation,
  Sparkles,
  ArrowRight,
  TrendingUp,
  FileText,
  Utensils,
  LogOut,
  LogIn,
  Sliders,
  Check,
  PlusCircle,
  AlertCircle
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import deviceTelemetryService from '../services/deviceTelemetryService';
import AuditorRouteMap from './AuditorRouteMap';
import ModalAuditoriaDispositivo from './ModalAuditoriaDispositivo';
import ModalHabilitarEscala from './ModalHabilitarEscala';
import ModalJustificarOcorrencia from './ModalJustificarOcorrencia';

export default function StatusAuditoresView({ currentUser, activeRegional = 'Todas', initialAuditor = null, initialDate = null }) {
  // 1. Estados de Filtro de Data
  const [selectedDate, setSelectedDate] = useState(() => {
    if (initialDate) return initialDate;
    const d = new Date();
    return d.toISOString().split('T')[0];
  });
  const [selectedMonth, setSelectedMonth] = useState(() => {
    if (initialDate && initialDate.length >= 7) return initialDate.slice(0, 7);
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  // 2. Estados Principais de Dados
  const [auditors, setAuditors] = useState([]);
  const [selectedAuditor, setSelectedAuditor] = useState(initialAuditor || null);

  useEffect(() => {
    if (initialAuditor) {
      setSelectedAuditor(initialAuditor);
    }
  }, [initialAuditor]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('TODOS'); // TODOS, ONLINE, MEAL, OFFLINE, SEM_ESCALA

  // 3. Dados Operacionais Carregados
  const [shifts, setShifts] = useState([]);
  const [escalas, setEscalas] = useState([]);
  const [monthEscalas, setMonthEscalas] = useState([]);
  const [monthShifts, setMonthShifts] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [gpsLogs, setGpsLogs] = useState([]);
  const [prefs, setPrefs] = useState([]);
  const [auditEvents, setAuditEvents] = useState([]);
  const [ocorrencias, setOcorrencias] = useState([]);
  const [loading, setLoading] = useState(true);

  // 4. Modais
  const [showDeviceModal, setShowDeviceModal] = useState(false);
  const [modalEscalaDate, setModalEscalaDate] = useState(null);
  const [modalOcorrenciaDate, setModalOcorrenciaDate] = useState(null);
  const [workflowViewMode, setWorkflowViewMode] = useState('WORKFLOW'); // WORKFLOW ou CARDS

  // 5. Carregar Usuários / Auditores
  useEffect(() => {
    async function fetchAuditors() {
      try {
        const { data, error } = await supabase
          .from('usuarios')
          .select('*')
          .order('nome', { ascending: true });

        if (data) {
          const onlyAuditors = data.filter(u => {
            const perfil = (u.perfil || '').toUpperCase();
            const cargo = (u.cargo || '').toUpperCase();
            const setor = (u.setor || '').toUpperCase();
            return perfil === 'AUDITOR' || perfil === 'INSPETOR' || cargo.includes('AUDITOR') || setor.includes('AUTOFISCALIZACAO');
          });
          const list = onlyAuditors.length > 0 ? onlyAuditors : data;
          setAuditors(list);
          if (!selectedAuditor && list.length > 0) {
            setSelectedAuditor(list[0]);
          }
        }
      } catch (err) {
        console.error('Erro ao buscar auditores:', err);
      }
    }
    fetchAuditors();
  }, []);

  // 6. Carregar Ocorrências do Cache Local
  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('fleet_ocorrencias_auditores') || '[]');
      setOcorrencias(stored);
    } catch (e) {}
  }, []);

  // 7. Carregar Dados do Dia e do Mês
  const loadData = async () => {
    setLoading(true);
    try {
      const startOfMonth = `${selectedMonth}-01`;
      const endOfMonth = `${selectedMonth}-31`;

      const [
        { data: shiftsDia },
        { data: escalasDia },
        { data: mEscalas },
        { data: mShifts },
        { data: wfmTasks },
        { data: fieldAudits },
        { data: auditorPrefs }
      ] = await Promise.all([
        supabase.from('autofiscalizacao_shifts').select('*').eq('date', selectedDate),
        supabase.from('wfm_calendario_escalas').select('*').eq('date', selectedDate),
        supabase.from('wfm_calendario_escalas').select('*').gte('date', startOfMonth).lte('date', endOfMonth),
        supabase.from('autofiscalizacao_shifts').select('*').gte('date', startOfMonth).lte('date', endOfMonth),
        supabase.from('wfm_tarefas').select('*').eq('assigned_date', selectedDate),
        supabase.from('autofiscalizacao_field_audits').select('*'),
        supabase.from('autofiscalizacao_auditor_prefs').select('*')
      ]);

      setShifts(shiftsDia || []);
      setEscalas(escalasDia || []);
      setMonthEscalas(mEscalas || []);
      setMonthShifts(mShifts || []);
      setPrefs(auditorPrefs || []);

      // Unificar tarefas do dia para o auditor selecionado
      const allDayTasks = [
        ...(wfmTasks || []),
        ...(fieldAudits || []).filter(fa => fa.created_at && fa.created_at.startsWith(selectedDate))
      ];
      setTasks(allDayTasks);

      // Carregar Logs de GPS do Dia
      if (selectedAuditor) {
        const auditorLogin = (selectedAuditor.login || selectedAuditor.nome || '').toLowerCase().trim();
        const { data: logs } = await supabase
          .from('autofiscalizacao_gps_logs')
          .select('*')
          .eq('date', selectedDate)
          .ilike('auditor', `%${auditorLogin}%`)
          .order('created_at', { ascending: true });
        setGpsLogs(logs || []);

        const events = await deviceTelemetryService.fetchAuditEvents(auditorLogin, selectedDate);
        setAuditEvents(events || []);
      }
    } catch (err) {
      console.error('Erro ao carregar dados do Status Auditores:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedDate, selectedMonth, selectedAuditor]);

  // 8. Informações do Auditor Selecionado no Dia
  const auditorInfo = useMemo(() => {
    if (!selectedAuditor) return null;
    const login = (selectedAuditor.login || selectedAuditor.nome || '').toLowerCase().trim();

    const currentShift = shifts.find(s => (s.auditor || '').toLowerCase().trim() === login);
    const currentEscala = escalas.find(e => (e.auditor || '').toLowerCase().trim() === login);
    const currentPref = prefs.find(p => (p.auditor || '').toLowerCase().trim() === login);
    const currentOcorrencia = ocorrencias.find(o => (o.auditor || '').toLowerCase().trim() === login && o.date === selectedDate);

    // Tarefas do auditor no dia
    const auditorTasks = tasks.filter(t => {
      const aud = (t.auditor || t.tecnico || '').toLowerCase().trim();
      return aud === login || aud === (selectedAuditor.nome || '').toLowerCase().trim();
    });

    // Calcular Status em Tempo Real
    let status = 'SEM_ESCALA';
    let statusLabel = 'Sem Escala Habilitada';
    let statusBg = 'bg-slate-100 text-slate-600 border-slate-200';
    let dotColor = 'bg-slate-400';

    if (currentOcorrencia) {
      status = 'OCORRENCIA';
      statusLabel = currentOcorrencia.tipo;
      statusBg = 'bg-purple-50 text-purple-700 border-purple-200';
      dotColor = 'bg-purple-500';
    } else if (currentEscala) {
      if (currentShift && currentShift.start_time) {
        if (currentShift.end_time) {
          status = 'CONCLUIDO';
          statusLabel = 'Turno Encerrado';
          statusBg = 'bg-blue-50 text-blue-700 border-blue-200';
          dotColor = 'bg-blue-500';
        } else if (currentShift.meal_start && !currentShift.meal_end) {
          status = 'MEAL';
          statusLabel = 'Em Refeição';
          statusBg = 'bg-amber-50 text-amber-800 border-amber-200';
          dotColor = 'bg-amber-500';
        } else {
          status = 'ONLINE';
          statusLabel = 'Em Campo / Ativo';
          statusBg = 'bg-emerald-50 text-emerald-700 border-emerald-200';
          dotColor = 'bg-emerald-500 animate-pulse';
        }
      } else {
        status = 'OFFLINE';
        statusLabel = 'Escalado (Não Iniciado)';
        statusBg = 'bg-rose-50 text-rose-700 border-rose-200';
        dotColor = 'bg-rose-500';
      }
    }

    // Cálculo de Duração Líquida do Turno
    let shiftDuration = '--:--';
    if (currentShift?.start_time) {
      const start = new Date(currentShift.start_time).getTime();
      const end = currentShift.end_time ? new Date(currentShift.end_time).getTime() : new Date().getTime();
      let totalMin = Math.floor((end - start) / 60000);

      // Descontar refeição se finalizada
      if (currentShift.meal_start && currentShift.meal_end) {
        const mealMin = Math.floor((new Date(currentShift.meal_end).getTime() - new Date(currentShift.meal_start).getTime()) / 60000);
        totalMin = Math.max(0, totalMin - mealMin);
      }

      const h = Math.floor(totalMin / 60);
      const m = totalMin % 60;
      shiftDuration = `${String(h).padStart(2, '0')}h ${String(m).padStart(2, '0')}m`;
    }

    // Telemetria do Smartphone (Smart Specs)
    const latestEvent = auditEvents[auditEvents.length - 1];
    const deviceSpecs = {
      brand: latestEvent?.device_brand || 'Samsung / Smartphone',
      model: latestEvent?.device_model || 'Galaxy A54 5G',
      osName: latestEvent?.os_name || 'Android',
      osVersion: latestEvent?.os_version || '14.0',
      appVersion: latestEvent?.app_version || '1.1.0',
      screenRes: latestEvent?.screen_res || '1080x2340',
      networkType: latestEvent?.network_type || '4G LTE',
      batteryLevel: latestEvent?.battery_level || 85,
      ipAddress: latestEvent?.ip_address || '189.96.226.***'
    };

    return {
      auditor: selectedAuditor,
      shift: currentShift,
      escala: currentEscala,
      pref: currentPref,
      ocorrencia: currentOcorrencia,
      tasks: auditorTasks,
      status,
      statusLabel,
      statusBg,
      dotColor,
      shiftDuration,
      deviceSpecs
    };
  }, [selectedAuditor, shifts, escalas, prefs, tasks, auditEvents, ocorrencias, selectedDate]);

  // 9. Filtragem da Lista de Auditores na Barra Lateral
  const filteredAuditors = useMemo(() => {
    return auditors.filter(a => {
      const q = searchQuery.toLowerCase().trim();
      const matchQuery = !q || (a.nome && a.nome.toLowerCase().includes(q)) || (a.login && a.login.toLowerCase().includes(q)) || (a.matricula && a.matricula.toLowerCase().includes(q));

      if (!matchQuery) return false;

      const login = (a.login || a.nome || '').toLowerCase().trim();
      const s = shifts.find(sh => (sh.auditor || '').toLowerCase().trim() === login);
      const e = escalas.find(sc => (sc.auditor || '').toLowerCase().trim() === login);

      if (statusFilter === 'ONLINE') return e && s && s.start_time && !s.end_time && !(s.meal_start && !s.meal_end);
      if (statusFilter === 'MEAL') return e && s && s.meal_start && !s.meal_end;
      if (statusFilter === 'OFFLINE') return e && (!s || !s.start_time);
      if (statusFilter === 'SEM_ESCALA') return !e;

      return true;
    });
  }, [auditors, searchQuery, statusFilter, shifts, escalas]);

  // 10. Grade do Calendário Mensal
  const calendarDays = useMemo(() => {
    const safeMonth = selectedMonth || new Date().toISOString().slice(0, 7);
    const parts = safeMonth.includes('-') ? safeMonth.split('-') : new Date().toISOString().slice(0, 7).split('-');
    const yearStr = parts[0];
    const monthStr = parts[1];
    const year = parseInt(yearStr, 10) || new Date().getFullYear();
    const month = (parseInt(monthStr, 10) || (new Date().getMonth() + 1)) - 1;

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const totalDays = lastDay.getDate();
    const startWeekDay = firstDay.getDay(); // 0 = Domingo

    const days = [];
    // Dias vazios de preenchimento
    for (let i = 0; i < startWeekDay; i++) {
      days.push({ empty: true, key: `empty-${i}` });
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const auditorLogin = (selectedAuditor?.login || selectedAuditor?.nome || '').toLowerCase().trim();

    for (let d = 1; d <= totalDays; d++) {
      const dateStr = `${yearStr}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const escala = monthEscalas.find(e => (e.auditor || '').toLowerCase().trim() === auditorLogin && e.date === dateStr);
      const shift = monthShifts.find(s => (s.auditor || '').toLowerCase().trim() === auditorLogin && s.date === dateStr);
      const ocorrencia = ocorrencias.find(o => (o.auditor || '').toLowerCase().trim() === auditorLogin && o.date === dateStr);

      const isFuture = dateStr > todayStr;
      const isToday = dateStr === todayStr;
      const isPast = dateStr < todayStr;
      const isSelected = dateStr === selectedDate;

      // Classificação visual do dia
      let badgeType = 'SEM_ESCALA'; // SEM_ESCALA, ESCALADO_FUTURO, TRABALHADO, FALTA, OCORRENCIA
      let badgeColor = 'bg-slate-100 text-slate-400 border-slate-200';
      let statusIcon = null;

      if (ocorrencia) {
        badgeType = 'OCORRENCIA';
        badgeColor = 'bg-purple-50 text-purple-700 border-purple-200';
      } else if (shift && shift.start_time) {
        badgeType = 'TRABALHADO';
        badgeColor = 'bg-emerald-50 text-emerald-700 border-emerald-200';
      } else if (escala) {
        if (isPast) {
          badgeType = 'FALTA';
          badgeColor = 'bg-rose-50 text-rose-700 border-rose-200';
        } else {
          badgeType = 'ESCALADO_FUTURO';
          badgeColor = 'bg-blue-50 text-blue-700 border-blue-200';
        }
      }

      days.push({
        empty: false,
        dayNum: d,
        dateStr,
        escala,
        shift,
        ocorrencia,
        isFuture,
        isToday,
        isPast,
        isSelected,
        badgeType,
        badgeColor
      });
    }

    return days;
  }, [selectedMonth, selectedAuditor, monthEscalas, monthShifts, ocorrencias, selectedDate]);

  // Handler ao clicar em um dia do calendário
  const handleDayClick = (day) => {
    if (day.empty) return;
    setSelectedDate(day.dateStr);

    // Se for dia futuro ou hoje sem escala habilitada -> Oferecer criar escala
    if ((day.isFuture || day.isToday) && !day.escala) {
      setModalEscalaDate(day.dateStr);
    } 
    // Se for dia passado sem início de turno (com ou sem escala) -> Oferecer justificar ocorrência
    else if (day.isPast && (!day.shift || !day.shift.start_time)) {
      setModalOcorrenciaDate(day.dateStr);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 p-3 sm:p-6 select-text space-y-6 font-sans">
      {/* 1. Header do Módulo - Tema Claro e Elegante */}
      <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
            <Users size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-slate-900 tracking-tight">Status Auditores</h1>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-blue-50 text-blue-700 border border-blue-200">
                A Vida do Auditor
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Painel central de status individual, jornadas, trajetos, ocorrências e telemetria
            </p>
          </div>
        </div>

        {/* Controles de Data e Atualização */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => {
              const d = new Date();
              setSelectedDate(d.toISOString().split('T')[0]);
              setSelectedMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all border ${
              selectedDate === new Date().toISOString().split('T')[0]
                ? 'bg-blue-600 text-white border-blue-600 shadow-sm shadow-blue-500/20'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            Hoje
          </button>

          <input
            type="date"
            value={selectedDate}
            onChange={(e) => {
              setSelectedDate(e.target.value);
              if (e.target.value) {
                const parts = e.target.value.split('-');
                setSelectedMonth(`${parts[0]}-${parts[1]}`);
              }
            }}
            className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 shadow-xs focus:ring-2 focus:ring-blue-100 outline-none"
          />

          <button
            onClick={loadData}
            disabled={loading}
            className="p-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-slate-600 transition-colors shadow-xs"
            title="Atualizar Dados"
          >
            <RotateCcw size={16} className={loading ? 'animate-spin text-blue-600' : ''} />
          </button>
        </div>
      </div>

      {/* 2. Grid Principal (Painel Lateral de Roster + Área Central de Detalhes) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* 2.1 Coluna Lateral: Lista / Roster de Auditores (lg:col-span-4) */}
        <div className={`lg:col-span-4 bg-white rounded-3xl border border-slate-200 shadow-sm p-4 flex flex-col gap-4 ${selectedAuditor ? 'hidden lg:flex' : 'flex'}`}>
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <Users size={16} className="text-blue-600" />
              Equipe de Campo ({filteredAuditors.length})
            </h2>
            <span className="text-[11px] font-bold text-slate-400 font-mono">
              Regional: {activeRegional}
            </span>
          </div>

          {/* Barra de Busca */}
          <div className="relative">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar auditor, matrícula..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
            />
          </div>

          {/* Filtros Rápidos de Status */}
          <div className="flex flex-wrap gap-1.5 text-[11px] font-bold">
            {[
              { id: 'TODOS', label: 'Todos' },
              { id: 'ONLINE', label: 'Em Campo' },
              { id: 'MEAL', label: 'Almoço' },
              { id: 'OFFLINE', label: 'Não Iniciado' },
              { id: 'SEM_ESCALA', label: 'Sem Escala' }
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setStatusFilter(f.id)}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  statusFilter === f.id
                    ? 'bg-slate-900 text-white font-black shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Lista com Rolagem Suave */}
          <div className="space-y-2 max-h-[620px] overflow-y-auto pr-1">
            {filteredAuditors.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs font-semibold">
                Nenhum auditor encontrado com os filtros atuais.
              </div>
            ) : (
              filteredAuditors.map(aud => {
                const login = (aud.login || aud.nome || '').toLowerCase().trim();
                const isSelected = selectedAuditor?.id === aud.id || selectedAuditor?.login === aud.login;
                const sh = shifts.find(s => (s.auditor || '').toLowerCase().trim() === login);
                const esc = escalas.find(e => (e.auditor || '').toLowerCase().trim() === login);

                let badge = { text: 'Sem Escala', class: 'bg-slate-100 text-slate-500 border-slate-200' };
                if (esc) {
                  if (sh && sh.start_time) {
                    if (sh.end_time) badge = { text: 'Encerrado', class: 'bg-blue-50 text-blue-700 border-blue-200' };
                    else if (sh.meal_start && !sh.meal_end) badge = { text: 'Almoço', class: 'bg-amber-50 text-amber-800 border-amber-200' };
                    else badge = { text: 'Online', class: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
                  } else {
                    badge = { text: 'Não Iniciou', class: 'bg-rose-50 text-rose-700 border-rose-200' };
                  }
                }

                return (
                  <div
                    key={aud.id || aud.login}
                    onClick={() => setSelectedAuditor(aud)}
                    className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50/50 shadow-xs ring-2 ring-blue-500/20'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center shrink-0">
                        {aud.nome?.charAt(0) || 'A'}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-900 truncate">{aud.nome}</p>
                        <p className="text-[11px] font-mono text-slate-500 truncate">{aud.login}</p>
                      </div>
                    </div>

                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-black border uppercase shrink-0 ${badge.class}`}>
                      {badge.text}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* 2.2 Coluna Principal: Vida do Auditor Selecionado (lg:col-span-8) */}
        <div className={`lg:col-span-8 space-y-6 ${!selectedAuditor ? 'hidden lg:block' : 'block'}`}>
          {auditorInfo ? (
            <>
              {/* Botão Mobile para Voltar à Lista */}
              <button
                onClick={() => setSelectedAuditor(null)}
                className="lg:hidden px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-2xl flex items-center gap-1.5 transition-all shadow-xs mb-3"
              >
                <ArrowLeft size={15} />
                <span>Voltar para Lista de Auditores</span>
              </button>

              {/* Card de Identificação Superior com Botão de Auditoria */}
              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-200 text-blue-700 font-black text-lg flex items-center justify-center shadow-xs">
                    {auditorInfo.auditor.nome?.charAt(0) || 'A'}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-black text-slate-900">
                        {auditorInfo.auditor.nome}
                      </h2>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border flex items-center gap-1.5 ${auditorInfo.statusBg}`}>
                        <span className={`w-2 h-2 rounded-full ${auditorInfo.dotColor}`}></span>
                        {auditorInfo.statusLabel}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 font-mono mt-0.5">
                      {auditorInfo.auditor.login} • Matrícula: {auditorInfo.auditor.matricula || 'N/A'} • Placa: {auditorInfo.shift?.placa_veiculo || auditorInfo.pref?.placa_veiculo || 'N/A'}
                    </p>
                  </div>
                </div>

                {/* Botão Dedicado no Topo Direito: Dados de Auditoria & Dispositivo */}
                <button
                  onClick={() => setShowDeviceModal(true)}
                  className="px-4 py-2.5 bg-blue-50 hover:bg-blue-100/80 text-blue-700 border border-blue-200/80 rounded-2xl text-xs font-bold transition-all shadow-xs flex items-center gap-2"
                >
                  <Smartphone size={16} />
                  <span>Dados de Auditoria & Dispositivo</span>
                </button>
              </div>

              {/* 3. Escala de Trabalho do Dia: Visão Workflow Passo a Passo / Cards */}
              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5 space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-200">
                      <Clock size={16} />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-slate-900">Escala & Jornada do Dia</h3>
                      <p className="text-xs text-slate-500 font-medium">
                        Data: {new Date(selectedDate + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
                      </p>
                    </div>
                  </div>

                  {/* Toggle Workflow vs Cards */}
                  <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                    <button
                      onClick={() => setWorkflowViewMode('WORKFLOW')}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                        workflowViewMode === 'WORKFLOW'
                          ? 'bg-white text-blue-700 shadow-xs font-black'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      🚀 Workflow Visual
                    </button>
                    <button
                      onClick={() => setWorkflowViewMode('CARDS')}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                        workflowViewMode === 'CARDS'
                          ? 'bg-white text-blue-700 shadow-xs font-black'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      📊 Cards Detalhados
                    </button>
                  </div>
                </div>

                {/* 3.1 Pipeline Visual do Workflow Passo a Passo */}
                {workflowViewMode === 'WORKFLOW' ? (
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 overflow-x-auto">
                    <div className="flex items-center justify-between min-w-[700px] gap-2">
                      {/* 1. Início Escala */}
                      <div className="flex flex-col items-center text-center flex-1">
                        <div className={`w-9 h-9 rounded-2xl flex items-center justify-center text-xs font-bold border shadow-xs ${
                          auditorInfo.escala ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-200 text-slate-400 border-slate-300'
                        }`}>
                          ⏰
                        </div>
                        <span className="text-[10px] font-black uppercase text-slate-500 mt-1.5">Início Escala</span>
                        <span className="text-xs font-mono font-bold text-slate-800">
                          {auditorInfo.escala?.shift_start || '--:--'}
                        </span>
                      </div>

                      <div className="h-0.5 flex-1 bg-slate-300 mx-1"></div>

                      {/* 2. Login App */}
                      <div className="flex flex-col items-center text-center flex-1">
                        <div className={`w-9 h-9 rounded-2xl flex items-center justify-center text-xs font-bold border shadow-xs ${
                          auditEvents.length > 0 ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-slate-200 text-slate-400 border-slate-300'
                        }`}>
                          🔐
                        </div>
                        <span className="text-[10px] font-black uppercase text-slate-500 mt-1.5">Login App</span>
                        <span className="text-xs font-mono font-bold text-slate-800">
                          {auditEvents[0]?.timestamp ? new Date(auditEvents[0].timestamp).toLocaleTimeString('pt-BR') : 'Realizado'}
                        </span>
                      </div>

                      <div className="h-0.5 flex-1 bg-slate-300 mx-1"></div>

                      {/* 3. Início Turno */}
                      <div className="flex flex-col items-center text-center flex-1">
                        <div className={`w-9 h-9 rounded-2xl flex items-center justify-center text-xs font-bold border shadow-xs ${
                          auditorInfo.shift?.start_time ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-slate-200 text-slate-400 border-slate-300'
                        }`}>
                          🟢
                        </div>
                        <span className="text-[10px] font-black uppercase text-slate-500 mt-1.5">Início Turno</span>
                        <span className="text-xs font-mono font-bold text-slate-800">
                          {auditorInfo.shift?.start_time ? new Date(auditorInfo.shift.start_time).toLocaleTimeString('pt-BR') : '--:--'}
                        </span>
                      </div>

                      <div className="h-0.5 flex-1 bg-slate-300 mx-1"></div>

                      {/* 4. Refeição Início */}
                      <div className="flex flex-col items-center text-center flex-1">
                        <div className={`w-9 h-9 rounded-2xl flex items-center justify-center text-xs font-bold border shadow-xs ${
                          auditorInfo.shift?.meal_start ? 'bg-amber-500 text-white border-amber-500' : 'bg-slate-200 text-slate-400 border-slate-300'
                        }`}>
                          🍱
                        </div>
                        <span className="text-[10px] font-black uppercase text-slate-500 mt-1.5">Refeição Início</span>
                        <span className="text-xs font-mono font-bold text-slate-800">
                          {auditorInfo.shift?.meal_start ? new Date(auditorInfo.shift.meal_start).toLocaleTimeString('pt-BR') : '--:--'}
                        </span>
                      </div>

                      <div className="h-0.5 flex-1 bg-slate-300 mx-1"></div>

                      {/* 5. Refeição Fim */}
                      <div className="flex flex-col items-center text-center flex-1">
                        <div className={`w-9 h-9 rounded-2xl flex items-center justify-center text-xs font-bold border shadow-xs ${
                          auditorInfo.shift?.meal_end ? 'bg-amber-600 text-white border-amber-600' : 'bg-slate-200 text-slate-400 border-slate-300'
                        }`}>
                          🍽️
                        </div>
                        <span className="text-[10px] font-black uppercase text-slate-500 mt-1.5">Refeição Fim</span>
                        <span className="text-xs font-mono font-bold text-slate-800">
                          {auditorInfo.shift?.meal_end ? new Date(auditorInfo.shift.meal_end).toLocaleTimeString('pt-BR') : '--:--'}
                        </span>
                      </div>

                      <div className="h-0.5 flex-1 bg-slate-300 mx-1"></div>

                      {/* 6. Fim Turno */}
                      <div className="flex flex-col items-center text-center flex-1">
                        <div className={`w-9 h-9 rounded-2xl flex items-center justify-center text-xs font-bold border shadow-xs ${
                          auditorInfo.shift?.end_time ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-200 text-slate-400 border-slate-300'
                        }`}>
                          🛑
                        </div>
                        <span className="text-[10px] font-black uppercase text-slate-500 mt-1.5">Fim Turno</span>
                        <span className="text-xs font-mono font-bold text-slate-800">
                          {auditorInfo.shift?.end_time ? new Date(auditorInfo.shift.end_time).toLocaleTimeString('pt-BR') : '--:--'}
                        </span>
                      </div>

                      <div className="h-0.5 flex-1 bg-slate-300 mx-1"></div>

                      {/* 7. Fim Escala */}
                      <div className="flex flex-col items-center text-center flex-1">
                        <div className={`w-9 h-9 rounded-2xl flex items-center justify-center text-xs font-bold border shadow-xs ${
                          auditorInfo.escala ? 'bg-slate-700 text-white border-slate-700' : 'bg-slate-200 text-slate-400 border-slate-300'
                        }`}>
                          🏁
                        </div>
                        <span className="text-[10px] font-black uppercase text-slate-500 mt-1.5">Fim Escala</span>
                        <span className="text-xs font-mono font-bold text-slate-800">
                          {auditorInfo.escala?.shift_end || '--:--'}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* 3.2 Visão em Cards Detalhados */
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                      <span className="text-[10px] font-black text-slate-400 uppercase block">Horário Previsto</span>
                      <p className="text-sm font-mono font-bold text-slate-800 mt-1">
                        {auditorInfo.escala ? `${auditorInfo.escala.shift_start} às ${auditorInfo.escala.shift_end}` : 'Sem Escala'}
                      </p>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                      <span className="text-[10px] font-black text-slate-400 uppercase block">Início de Turno Real</span>
                      <p className="text-sm font-mono font-bold text-emerald-700 mt-1">
                        {auditorInfo.shift?.start_time ? new Date(auditorInfo.shift.start_time).toLocaleTimeString('pt-BR') : '--:--'}
                      </p>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                      <span className="text-[10px] font-black text-slate-400 uppercase block">Parada Refeição</span>
                      <p className="text-sm font-mono font-bold text-amber-800 mt-1">
                        {auditorInfo.shift?.meal_start ? new Date(auditorInfo.shift.meal_start).toLocaleTimeString('pt-BR') : '--:--'}
                      </p>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                      <span className="text-[10px] font-black text-slate-400 uppercase block">Tempo Líquido Trabalhado</span>
                      <p className="text-sm font-mono font-bold text-blue-700 mt-1">
                        {auditorInfo.shiftDuration}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* 4. Calendário Individual Mensal com Ações de Escala & Justificativas */}
              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5 space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-200">
                      <Calendar size={16} />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-slate-900">Calendário Individual de Escalas</h3>
                      <p className="text-xs text-slate-500 font-medium">
                        Clique em qualquer dia para inspecionar, habilitar escala ou justificar ocorrências
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="month"
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(e.target.value)}
                      className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 shadow-xs focus:ring-2 focus:ring-blue-100 outline-none"
                    />
                  </div>
                </div>

                {/* Grade de Dias do Mês */}
                <div className="grid grid-cols-7 gap-2">
                  {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => (
                    <div key={d} className="text-center text-[10px] font-black text-slate-400 uppercase py-1">
                      {d}
                    </div>
                  ))}

                  {calendarDays.map((day) => {
                    if (day.empty) {
                      return <div key={day.key} className="h-20 rounded-2xl bg-slate-50/40 border border-dashed border-slate-200/50"></div>;
                    }

                    return (
                      <div
                        key={day.dateStr}
                        onClick={() => handleDayClick(day)}
                        className={`h-20 p-2 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between relative group ${
                          day.isSelected
                            ? 'border-blue-600 bg-blue-50/60 ring-2 ring-blue-500/20 shadow-xs'
                            : 'border-slate-200 bg-white hover:border-blue-300 hover:bg-slate-50/80 shadow-xs'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className={`text-xs font-mono font-bold ${
                            day.isToday ? 'px-1.5 py-0.2 rounded-md bg-blue-600 text-white' : 'text-slate-800'
                          }`}>
                            {day.dayNum}
                          </span>

                          {/* Indicador de Status */}
                          <span className={`px-1.5 py-0.2 rounded text-[9px] font-black border uppercase ${day.badgeColor}`}>
                            {day.badgeType === 'TRABALHADO' && 'Turno'}
                            {day.badgeType === 'ESCALADO_FUTURO' && 'Escala'}
                            {day.badgeType === 'FALTA' && 'Ausente'}
                            {day.badgeType === 'OCORRENCIA' && 'Ocorrência'}
                            {day.badgeType === 'SEM_ESCALA' && 'Livre'}
                          </span>
                        </div>

                        <div className="text-[10px] font-mono text-slate-500 truncate">
                          {day.escala ? `${day.escala.shift_start}-${day.escala.shift_end}` : '--:--'}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Legenda do Calendário */}
                <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-slate-600 pt-2 border-t border-slate-100">
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
                    <span>Turno Realizado</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-blue-500"></span>
                    <span>Escala Habilitada</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-rose-500"></span>
                    <span>Ausente / Sem Início</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-purple-500"></span>
                    <span>Justificado / Folga</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-slate-300"></span>
                    <span>Livre / Sem Escala</span>
                  </div>
                </div>
              </div>

              {/* 5. Mapa de Trajeto e Atendimentos do Auditor */}
              <AuditorRouteMap
                auditor={auditorInfo.auditor}
                dateStr={selectedDate}
                shift={auditorInfo.shift}
                gpsLogs={gpsLogs}
                tasks={auditorInfo.tasks}
                height="420px"
              />

              {/* 6. Lista de Tarefas / OSs do Dia */}
              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-200">
                      <FileText size={16} />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-slate-900">
                        Atendimentos & OSs do Dia ({auditorInfo.tasks.length})
                      </h3>
                      <p className="text-xs text-slate-500 font-medium">
                        Ordens de serviço executadas e status final de cada atendimento
                      </p>
                    </div>
                  </div>
                </div>

                {auditorInfo.tasks.length === 0 ? (
                  <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-xs font-semibold text-slate-500">
                    Nenhum atendimento ou OS vinculada ao auditor nesta data.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-xs">
                    {auditorInfo.tasks.map((t, idx) => {
                      const isSusp = t.status === 'suspended' || t.status === 'suspensa';
                      const isComp = t.status === 'completed' || t.status === 'concluido';

                      return (
                        <div key={t.id || idx} className="p-3.5 hover:bg-slate-50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center shrink-0 border border-slate-200">
                              {idx + 1}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-bold text-xs text-slate-900">
                                  OS: {t.osid || t.id_origem || t.id}
                                </span>
                                <span className={`px-2 py-0.2 rounded-md text-[10px] font-black border uppercase ${
                                  isComp ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : isSusp ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-blue-50 text-blue-700 border-blue-200'
                                }`}>
                                  {t.status || 'Atribuída'}
                                </span>
                              </div>
                              <p className="text-xs text-slate-600 mt-0.5">
                                {t.endereco_completo || t.endereco || 'Endereço registrado na OS'}
                              </p>
                              {t.suspend_reason && (
                                <p className="text-[11px] text-rose-600 font-bold mt-0.5">
                                  Motivo de Suspensão: {t.suspend_reason}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <span className="text-xs font-mono text-slate-500 block">
                              {t.start_time ? new Date(t.start_time).toLocaleTimeString('pt-BR') : '--:--'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center text-slate-400 font-semibold shadow-sm">
              Selecione um auditor na lista lateral para visualizar sua vida operacional completa.
            </div>
          )}
        </div>
      </div>

      {/* 7. Modais Interativos */}
      {/* 7.1 Modal de Dados de Dispositivo & Auditoria */}
      {showDeviceModal && auditorInfo && (
        <ModalAuditoriaDispositivo
          auditor={auditorInfo.auditor}
          dateStr={selectedDate}
          deviceSpecs={auditorInfo.deviceSpecs}
          auditEvents={auditEvents}
          currentShift={auditorInfo.shift}
          currentPref={auditorInfo.pref}
          onClose={() => setShowDeviceModal(false)}
        />
      )}

      {/* 7.2 Modal de Habilitar Escala */}
      {modalEscalaDate && selectedAuditor && (
        <ModalHabilitarEscala
          auditor={selectedAuditor}
          dateStr={modalEscalaDate}
          existingEscala={escalas.find(e => (e.auditor || '').toLowerCase().trim() === (selectedAuditor.login || selectedAuditor.nome || '').toLowerCase().trim() && e.date === modalEscalaDate)}
          currentUser={currentUser}
          onSuccess={() => {
            loadData();
            setModalEscalaDate(null);
          }}
          onClose={() => setModalEscalaDate(null)}
        />
      )}

      {/* 7.3 Modal de Justificar Ocorrência */}
      {modalOcorrenciaDate && selectedAuditor && (
        <ModalJustificarOcorrencia
          auditor={selectedAuditor}
          dateStr={modalOcorrenciaDate}
          existingOcorrencia={ocorrencias.find(o => (o.auditor || '').toLowerCase().trim() === (selectedAuditor.login || selectedAuditor.nome || '').toLowerCase().trim() && o.date === modalOcorrenciaDate)}
          currentUser={currentUser}
          onSuccess={() => {
            try {
              const stored = JSON.parse(localStorage.getItem('fleet_ocorrencias_auditores') || '[]');
              setOcorrencias(stored);
            } catch (e) {}
            loadData();
            setModalOcorrenciaDate(null);
          }}
          onClose={() => setModalOcorrenciaDate(null)}
        />
      )}
    </div>
  );
}
