import React, { useState, useEffect, useMemo, useRef } from 'react';

import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap, LayersControl } from 'react-leaflet';

import 'leaflet/dist/leaflet.css';

import L from 'leaflet';
import { supabase } from '../supabaseClient';
import { gpsService } from '../services/gpsService';
import { notificationService } from '../services/notificationService';

import * as XLSX from 'xlsx';

import {
  Calendar, CheckCircle, XCircle, Clock, Search, FileText,
  ChevronRight, Users, Camera, AlertCircle, Download,
  BarChart3, Home, ArrowLeft, Plus, Trash2, Check,
  MapPin, Zap, Activity, Navigation, CheckCircle2,
  ChevronDown, ChevronUp, FileCheck, Eye, PauseCircle,
  Filter, FileSignature, Upload, X, AlertTriangle,
  ClipboardCheck, PlayCircle, User, History, Send, UserPlus, Tv,
  List, Grid, Database, EyeOff, LogOut, ArrowLeftRight, CalendarX,
  CloudLightning, Loader2, RefreshCw, Contact, Map as MapIcon
} from 'lucide-react';

import {

  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis,

  CartesianGrid, Tooltip, Legend, ResponsiveContainer

} from 'recharts';

// ─── CONSTANTS ───────────────────────────────────────────────

const COLORS_CHART = { emerald: '#10b981', danger: '#ef4444', warning: '#f59e0b', blue: '#3b82f6', slate: '#64748b' };

const COLUMN_MAP = {

  'Equipe': 'equipe', 'Data': 'data', 'Nr_Ordem': 'nr_ordem',

  'Despachada': 'despachada', 'A_Caminho': 'a_caminho', 'No_Local': 'no_local',

  'Liberada': 'liberada', 'Minutos': 'minutos', 'Atuação': 'atuacao',

  'ChaveUnicaOS': 'chave_unica_os', 'ChaveUnica': 'chave_unica',

  'Base Ajustada': 'base', 'Tipo de Veículo': 'tipo_veiculo',

  'Tipo de Equipe': 'tipo_equipe', 'Classe Ajustada': 'classe',

  'Descrição Causa Ajustado': 'descricao_causa', 'Base Contrato': 'base_contrato',

  'Período Ajustado': 'periodo', 'Endereço Cliente': 'endereco_cliente'

};

const REQUIRED_PHOTOS_LABELS = [

  { id: 'fachada', label: 'Fachada do Cliente' },

  { id: 'defeito', label: 'Defeito Encontrado' },

  { id: 'reparo', label: 'Reparo Realizado' },

  { id: 'medicao', label: 'Medição 110/220v' }

];

const FIELD_PHOTOS_LABELS = [

  { id: 'fachada', label: 'Fachada do Local' },

  { id: 'posteCia', label: 'Poste da CIA' },

  { id: 'posteCliente', label: 'Poste do Cliente' }

];

// ─── HELPERS ─────────────────────────────────────────────────

const getRegionalFromTipoEquipe = (te) => {

  if (!te) return '';

  const u = te.toUpperCase();

  if (u.includes('NORTE')) return 'Norte';

  if (u.includes('LESTE')) return 'Leste';

  if (u.includes('SUL')) return 'Sul';

  if (u.includes('OESTE')) return 'Oeste';

  return '';

};

const fmtDateBR = (d) => {

  if (!d) return '--';

  const dt = new Date(d);

  if (isNaN(dt)) return '--';

  return dt.toLocaleDateString('pt-BR');

};

const fmtDateTimeBR = (d) => {

  if (!d) return '--';

  const dt = new Date(d);

  if (isNaN(dt)) return '--';

  return dt.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

};

const fmtTime = (d) => {

  if (!d) return '--';

  const dt = new Date(d);

  if (isNaN(dt)) return '--';

  return dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

};

const formatUserFriendlyName = (usernameOrEmail) => {

  if (!usernameOrEmail) return '--';

  if (usernameOrEmail.includes('@')) {

    const part = usernameOrEmail.split('@')[0];

    return part.split('.').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');

  }

  return usernameOrEmail.split('.').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');

};

const genInspId = () => 'ALP-AUTO-' + Date.now().toString().slice(-8);

const addLog = (hist, usuario, acao, detalhes) => [

  ...(hist || []),

  { id: Date.now(), data: new Date().toISOString(), usuario, acao, detalhes }

];

const calcFiscDuration = (start, end) => {

  if (!start) return '--';

  const s = new Date(start).getTime();

  const e = end ? new Date(end).getTime() : Date.now();

  const diffMs = e - s;

  if (diffMs <= 0) return '0 seg';

  const totalSegs = Math.floor(diffMs / 1000);

  const mins = Math.floor(totalSegs / 60);

  const segs = totalSegs % 60;

  if (mins > 0) return `${mins} min ${segs} seg`;

  return `${segs} seg`;

};

const parseDateToYYYYMMDD = (val) => {

  if (!val) return null;

  if (val instanceof Date) {

    const y = val.getFullYear();

    const m = String(val.getMonth() + 1).padStart(2, '0');

    const d = String(val.getDate()).padStart(2, '0');

    return `${y}-${m}-${d}`;

  }

  const str = String(val).trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;

  if (/^\d{4}-\d{2}-\d{2}/.test(str)) return str.slice(0, 10);

  const parts = str.split(/[\/\-]/);

  if (parts.length === 3) {

    if (parts[0].length === 4) {

      return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;

    } else {

      const d = parts[0].padStart(2, '0');

      const m = parts[1].padStart(2, '0');

      const y = parts[2];

      if (parseInt(d) <= 31 && parseInt(m) <= 12 && y.length === 4) {

        return `${y}-${m}-${d}`;

      }

    }

  }

  const parsed = new Date(str);

  if (!isNaN(parsed.getTime())) {

    const y = parsed.getFullYear();

    const m = String(parsed.getMonth() + 1).padStart(2, '0');

    const d = String(parsed.getDate()).padStart(2, '0');

    return `${y}-${m}-${d}`;

  }

  return null;

};

const parseDateTimeToISO = (val) => {

  if (!val) return null;

  if (val instanceof Date) {

    return val.toISOString();

  }

  const str = String(val).trim();

  if (/^\d{4}-\d{2}-\d{2}T/.test(str)) return str;

  const match = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?$/);

  if (match) {

    const d = match[1].padStart(2, '0');

    const m = match[2].padStart(2, '0');

    const y = match[3];

    const hr = match[4].padStart(2, '0');

    const min = match[5].padStart(2, '0');

    const sec = (match[6] || '00').padStart(2, '0');

    const localIso = `${y}-${m}-${d}T${hr}:${min}:${sec}`;

    const parsed = new Date(localIso);

    if (!isNaN(parsed.getTime())) {

      return parsed.toISOString();

    }

  }

  const parsed = new Date(str);

  if (!isNaN(parsed.getTime())) {

    return parsed.toISOString();

  }

  return null;

};

// GEOLOCATION: Solicita posição GPS

const requestGeolocation = () => {

  return new Promise((resolve, reject) => {

    if (!navigator.geolocation) {

      reject(new Error('Geolocalização não suportada por este dispositivo.'));

      return;

    }

    navigator.geolocation.getCurrentPosition(

      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),

      (err) => reject(new Error('Permissão de GPS negada ou sinal indisponível.')),

      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }

    );

  });

};

// FINGERPRINT: Gera hash SHA-256 único do dispositivo

const generateFingerprint = async () => {

  const components = [];

  components.push(`scr:${screen.width}x${screen.height}x${screen.colorDepth}`);

  components.push(`avail:${screen.availWidth}x${screen.availHeight}`);

  components.push(`lang:${navigator.language}`);

  components.push(`plat:${navigator.platform}`);

  components.push(`cores:${navigator.hardwareConcurrency || 'n/a'}`);

  components.push(`touch:${navigator.maxTouchPoints || 0}`);

  components.push(`ua:${navigator.userAgent}`);

  try {

    components.push(`tz:${Intl.DateTimeFormat().resolvedOptions().timeZone}`);

  } catch { components.push('tz:unknown'); }

  try {

    const canvas = document.createElement('canvas');

    canvas.width = 200;

    canvas.height = 50;

    const ctx = canvas.getContext('2d');

    ctx.textBaseline = 'top';

    ctx.font = '14px Arial';

    ctx.fillStyle = '#f60';

    ctx.fillRect(0, 0, 200, 50);

    ctx.fillStyle = '#069';

    ctx.fillText('Auditoria Fleet 2026', 2, 15);

    components.push(`canvas:${canvas.toDataURL()}`);

  } catch { components.push('canvas:error'); }

  const raw = components.join('|||');

  const encoder = new TextEncoder();

  const data = encoder.encode(raw);

  const hashBuffer = await crypto.subtle.digest('SHA-256', data);

  const hashArray = Array.from(new Uint8Array(hashBuffer));

  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

};

// IP: Coleta IP público

const fetchPublicIP = async () => {

  try {

    const res = await fetch('https://api.ipify.org?format=json');

    const data = await res.json();

    return data.ip || null;

  } catch {

    return null;

  }

};

// ─── MAIN COMPONENT ──────────────────────────────────────────

export default function AutoFiscalizacaoView({ currentUser, activeRegional, isMobileAuditor, onLogout }) {

  // ── Data State

  const [ordens, setOrdens] = useState([]);

  const [inspecoes, setInspecoes] = useState([]);

  const [workflows, setWorkflows] = useState([]);

  const [fieldAudits, setFieldAudits] = useState([]);

  const [colaboradoresList, setColaboradoresList] = useState([]);

  const [loading, setLoading] = useState(true);
  
  // ── Strict GPS Permission Block
  const [gpsBlocked, setGpsBlocked] = useState(false);

  useEffect(() => {
    let active = true;
    const verifyGps = async () => {
      if (isMobileAuditor && gpsService.isNative()) {
        const hasPerm = await gpsService.checkStrictPermission();
        if (active) setGpsBlocked(!hasPerm);
      }
    };
    verifyGps();
    return () => { active = false; };
  }, [isMobileAuditor]);

  const canImportOS = useMemo(() => {

    if (!currentUser) return false;

    const setor = (currentUser.setor || '').trim().toUpperCase();

    const regional = (currentUser.regional || '').trim().toUpperCase();

    const perfil = (currentUser.perfil || '').trim().toUpperCase();

    const validSetores = ['OPERAÇÕES', 'OPERACAO', 'OPERACOES'];

    const validRegionais = ['NORTE', 'LESTE', 'LEESTE', 'GLOBAL'];

    const validPerfis = ['ADMINISTRADOR', 'GERENTE', 'COORDENADOR'];

    return (

      validSetores.includes(setor) &&

      validRegionais.includes(regional) &&

      validPerfis.includes(perfil)

    );

  }, [currentUser]);

  // ── Navigation State

  const [screen, setScreen] = useState(isMobileAuditor ? 'mobile_home' : 'dashboard');

  const [selectedDate, setSelectedDate] = useState(null);

  const [selectedOS, setSelectedOS] = useState(null);

  const [selectedWorkflow, setSelectedWorkflow] = useState(null);

  const [showInstructionModal, setShowInstructionModal] = useState(false);

  const [showInspectionForm, setShowInspectionForm] = useState(false);

  const [viewingOSDetails, setViewingOSDetails] = useState(null);

  // ── Month Selector (for square grid agenda)

  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());

  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // ── Mobile State

  const [mobileSelectedOS, setMobileSelectedOS] = useState(null);

  const [inProgressAudit, setInProgressAudit] = useState(null);

  const [syncSteps, setSyncSteps] = useState(null);

  const renderStepBadge = (status) => {

    switch (status) {

      case 'success':

        return (

          <span className="flex items-center gap-1 text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full uppercase">

            <Check size={10} strokeWidth={3} /> Ok

          </span>

        );

      case 'error':

        return (

          <span className="flex items-center gap-1 text-[10px] font-black text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full uppercase animate-bounce">

            <X size={10} strokeWidth={3} /> Erro

          </span>

        );

      case 'loading':

        return (

          <span className="flex items-center gap-1 text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full uppercase animate-pulse">

            <Loader2 size={10} className="animate-spin" /> Gravando

          </span>

        );

      case 'pending':

      default:

        return (

          <span className="text-[10px] font-black text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full uppercase">

            Pendente

          </span>

        );

    }

  };

  const [mobileTab, setMobileTab] = useState('rotas'); // rotas | historico

  // ── Fetch Data

  useEffect(() => {

    fetchAll();

    const ch1 = supabase.channel('rt-af-ordens').on('postgres_changes', { event: '*', schema: 'public', table: 'autofiscalizacao_ordens' }, () => fetchOrdens()).subscribe();

    const ch2 = supabase.channel('rt-af-insp').on('postgres_changes', { event: '*', schema: 'public', table: 'autofiscalizacao_inspecoes' }, () => fetchInspecoes()).subscribe();

    const ch3 = supabase.channel('rt-af-wf').on('postgres_changes', { event: '*', schema: 'public', table: 'autofiscalizacao_workflows' }, () => fetchWorkflows()).subscribe();

    const ch4 = supabase.channel('rt-af-fa').on('postgres_changes', { event: '*', schema: 'public', table: 'wfm_tarefas' }, () => fetchFieldAudits()).subscribe();

    const ch5 = supabase.channel('rt-af-colab').on('postgres_changes', { event: '*', schema: 'public', table: 'colaboradores' }, () => fetchColaboradores()).subscribe();

    const ch6 = supabase.channel('rt-af-field-audits').on('postgres_changes', { event: '*', schema: 'public', table: 'autofiscalizacao_field_audits' }, () => fetchFieldAudits()).subscribe();

    return () => {

      supabase.removeChannel(ch1); supabase.removeChannel(ch2); supabase.removeChannel(ch3);

      supabase.removeChannel(ch4); supabase.removeChannel(ch5); supabase.removeChannel(ch6);

    };

  }, []);

  const fetchOrdens = async () => { const { data } = await supabase.from('autofiscalizacao_ordens').select('*').order('data', { ascending: false }); if (data) setOrdens(data); };

  const fetchInspecoes = async () => { const { data } = await supabase.from('autofiscalizacao_inspecoes').select('*').order('timestamp', { ascending: false }); if (data) setInspecoes(data); };

  const fetchWorkflows = async () => { const { data } = await supabase.from('autofiscalizacao_workflows').select('*'); if (data) setWorkflows(data); };

  const fetchFieldAudits = async () => {

    try {

      const { data: wfmTasks } = await supabase.from('wfm_tarefas').select('*');

      const { data: fieldResults } = await supabase.from('autofiscalizacao_field_audits').select('*');

      if (wfmTasks) {

        const results = fieldResults || [];

        const merged = wfmTasks.map(t => {

          const result = results.find(r => r.inspid === t.id_origem);

          return {

            ...t,

            inspid: t.id_origem || t.id,

            executed: result ? result.executed : null,

            access: result ? result.access : null,

            address: result ? result.address : null,

            photos: result ? result.photos : null,

            telemetry: result ? result.telemetry : null,

            suspend_reason: result ? result.suspend_reason : ''

          };

        });

        results.forEach(r => {

          if (!merged.some(m => m.inspid === r.inspid)) {

            merged.push({

              id: r.inspid,

              id_origem: r.inspid,

              inspid: r.inspid,

              status: r.status,

              auditor: r.auditor,

              executed: r.executed,

              access: r.access,

              address: r.address,

              photos: r.photos,

              telemetry: r.telemetry,

              suspend_reason: r.suspend_reason || '',

              historico: r.historico || []

            });

          }

        });

        setFieldAudits(merged);

      }

    } catch (err) {

      console.error("Erro ao carregar e mesclar fieldAudits:", err);

    }

  };

  const fetchColaboradores = async () => { const { data } = await supabase.from('colaboradores').select('*').order('nome', { ascending: true }); if (data) setColaboradoresList(data); };

  const fetchAll = async () => {

    setLoading(true);

    await Promise.all([fetchOrdens(), fetchInspecoes(), fetchWorkflows(), fetchFieldAudits(), fetchColaboradores()]);

    setLoading(false);

  };

  // ── Filtered by Regional

  const filteredOrdens = useMemo(() => {

    if (!activeRegional || activeRegional === 'Todas') return ordens;

    return ordens.filter(o => o.regional === activeRegional);

  }, [ordens, activeRegional]);

  const filteredInspecoes = useMemo(() => {

    if (!activeRegional || activeRegional === 'Todas') return inspecoes;

    return inspecoes.filter(i => i.regional === activeRegional);

  }, [inspecoes, activeRegional]);

  const filteredWorkflows = useMemo(() => {

    if (!activeRegional || activeRegional === 'Todas') return workflows;

    return workflows.filter(w => w.regional === activeRegional);

  }, [workflows, activeRegional]);

  // ── Upsert helper

  const upsertSupabase = async (table, data) => {

    try {

      let payload = data;

      if (table === 'autofiscalizacao_workflows') {

        payload = {

          inspid: data.inspid,

          osid: data.osid,

          is_conform: data.is_conform,

          feedback_done: data.feedback_done,

          feedback_notes: data.feedback_notes,

          feedback_photos: data.feedback_photos,

          feedback_date: data.feedback_date,

          feedback_by: data.feedback_by,

          field_audit_required: data.field_audit_required,

          is_finished: data.is_finished,

          regional: data.regional,

          historico: data.historico

        };

      } else if (table === 'autofiscalizacao_ordens') {

        payload = {

          nr_ordem: data.nr_ordem,

          data: data.data,

          equipe: data.equipe,

          base: data.base,

          tipo_veiculo: data.tipo_veiculo,

          tipo_equipe: data.tipo_equipe,

          descricao_causa: data.descricao_causa,

          classe: data.classe,

          atuacao: data.atuacao,

          despachada: data.despachada,

          a_caminho: data.a_caminho,

          no_local: data.no_local,

          liberada: data.liberada,

          minutos: data.minutos,

          chave_unica_os: data.chave_unica_os,

          chave_unica: data.chave_unica,

          base_contrato: data.base_contrato,

          periodo: data.periodo,

          endereco_cliente: data.endereco_cliente,

          regional: data.regional,

          status_fisc: data.status_fisc,

          fisc_started_at: data.fisc_started_at,

          fisc_finished_at: data.fisc_finished_at,

          endereco_completo: data.endereco_completo

        };

      }

      const { error } = await supabase.from(table).upsert(payload);

      if (error) { console.error(`Error ${table}:`, error); alert('Erro ao salvar: ' + error.message); return false; }

      return true;

    } catch (err) { console.error(err); alert('Erro de conexão.'); return false; }

  };

  // ── Photo Upload helper

  const uploadPhoto = async (file, folder) => {

    const ext = file.name.split('.').pop();

    const fileName = `${folder}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;

    const { data, error } = await supabase.storage.from('autofiscalizacao_fotos').upload(fileName, file);

    if (error) { alert('Erro no upload: ' + error.message); return null; }

    const { data: urlData } = supabase.storage.from('autofiscalizacao_fotos').getPublicUrl(fileName);

    return urlData?.publicUrl || fileName;

  };

  // ── CONFIRM SCIENCE & START AUDIT

  const handleConfirmStart = async () => {

    setShowInstructionModal(false);

    setShowInspectionForm(true);

    const nowIso = new Date().toISOString();

    const updatedOS = {

      ...selectedOS,

      status_fisc: 'INICIADO',

      fisc_started_at: nowIso

    };

    await upsertSupabase('autofiscalizacao_ordens', updatedOS);

    if (selectedOS.faData?.id) {

      const histEntry = {

        timestamp: nowIso,

        usuario: currentUser?.nome || currentUser?.login || 'Auditor',

        acao: 'WFM_INICIADA',

        observacao: `Fiscalização iniciada pelo auditor em campo. Rota movida para o horário real: ${new Date(nowIso).toLocaleTimeString('pt-BR')}`

      };

      const currentHist = selectedOS.faData.historico || [];

      const updatedHist = [...currentHist, histEntry];

      const { error } = await supabase.from('wfm_tarefas').update({

        status: 'iniciada',

        planned_start: nowIso,

        historico: updatedHist

      }).eq('id', selectedOS.faData.id);

      if (!error) {

        selectedOS.faData.status = 'iniciada';

        selectedOS.faData.planned_start = nowIso;

        selectedOS.faData.historico = updatedHist;

      }

    }

    setOrdens(prev => prev.map(o => o.nr_ordem === selectedOS.nr_ordem ? { ...updatedOS, faData: selectedOS.faData } : o));

    setSelectedOS({ ...updatedOS, faData: selectedOS.faData });

  };

  // ── INSPECTION SUBMISSION

  const handleSubmitInspection = async (formData) => {

    const inspId = genInspId();

    const formattedDuration = calcFiscDuration(selectedOS?.fisc_started_at, new Date().toISOString());

    const actionLog = `AutoFiscalização ${formData.isConform ? 'CONFORME' : 'NÃO CONFORME'} registrada para OS ${formData.osId}. Tempo de preenchimento: ${formattedDuration}`;

    const historico = addLog([], currentUser?.nome || currentUser?.login, 'INSPECAO_CRIADA', actionLog);

    const inspecao = {

      inspid: inspId, osid: formData.osId, data: formData.date,

      status: formData.isConform ? 'Conforme' : 'Não Conforme',

      team_members: formData.members, photos: formData.photoUrls,

      inspector: currentUser?.login || currentUser?.nome,

      timestamp: new Date().toISOString(), regional: formData.regional || activeRegional || '',

      historico,

      notes: formData.notes

    };

    const ok1 = await upsertSupabase('autofiscalizacao_inspecoes', inspecao);

    if (!ok1) return;

    const wfHistorico = addLog([], currentUser?.nome || currentUser?.login, 'WORKFLOW_CRIADO',

      `Workflow criado. Status: ${inspecao.status}. ${!formData.isConform ? 'Auditoria de campo pendente.' : 'Pendente feedback.'}`);

    const wf = {

      inspid: inspId, osid: formData.osId,

      is_conform: formData.isConform, feedback_done: false, feedback_notes: '',

      feedback_date: null, feedback_by: null,

      field_audit_required: !formData.isConform,

      is_finished: false, regional: formData.regional || activeRegional || '',

      historico: wfHistorico

    };

    const ok2 = await upsertSupabase('autofiscalizacao_workflows', wf);

    if (!ok2) return;

    if (!formData.isConform) {

      const fa = {

        inspid: inspId, status: 'pending', suspend_reason: '',

        address: {}, executed: null, access: null, photos: {},

        start_time: null, end_time: null, auditor: '',

        regional: formData.regional || activeRegional || '',

        historico: addLog([], 'Sistema', 'AUDITORIA_CAMPO_CRIADA', 'Auditoria de campo criada automaticamente (Não Conforme)')

      };

      await upsertSupabase('autofiscalizacao_field_audits', fa);

    }

    // Complete the OS metadata

    const nowIso = new Date().toISOString();

    const updatedOS = {

      ...selectedOS,

      status_fisc: 'CONCLUIDO',

      fisc_finished_at: nowIso

    };

    await upsertSupabase('autofiscalizacao_ordens', updatedOS);

    if (selectedOS?.faData?.id) {

      const histEntry = {

        timestamp: nowIso,

        usuario: currentUser?.nome || currentUser?.login || 'Auditor',

        acao: 'WFM_COMPLETADA',

        observacao: `Fiscalização concluída pelo auditor. Tempo total: ${formattedDuration}`

      };

      const currentHist = selectedOS.faData.historico || [];

      const updatedHist = [...currentHist, histEntry];

      await supabase.from('wfm_tarefas').update({

        status: 'completed',

        historico: updatedHist

      }).eq('id', selectedOS.faData.id);

    }

    await fetchAll();

    setShowInspectionForm(false);

    setSelectedOS(null);

    setScreen('workflows');

  };

  // ── FEEDBACK SUBMISSION

  const handleSubmitFeedback = async (wf, notes, photos = {}) => {

    const hist = addLog(wf.historico, currentUser?.nome || currentUser?.login, 'FEEDBACK_REGISTRADO', `Feedback: ${notes}`);

    const updated = {

      ...wf, feedback_done: true, feedback_notes: notes, feedback_photos: photos,

      feedback_date: new Date().toISOString(), feedback_by: currentUser?.login || currentUser?.nome,

      is_finished: wf.is_conform && !wf.field_audit_required, historico: hist

    };

    await upsertSupabase('autofiscalizacao_workflows', updated);

    await fetchAll();

    setSelectedWorkflow(null);

    setScreen('workflows');

  };

  // ── REQUEST FIELD AUDIT (for Conforme)

  const handleRequestFieldAudit = async (wf) => {

    const hist = addLog(wf.historico, currentUser?.nome || currentUser?.login, 'AUDITORIA_EXTERNA_SOLICITADA',

      'Auditoria de campo solicitada manualmente para inspeção CONFORME');

    const updated = { ...wf, field_audit_required: true, is_finished: false, historico: hist };

    await upsertSupabase('autofiscalizacao_workflows', updated);

    const existing = fieldAudits.find(f => f.inspid === wf.inspid);

    if (!existing) {

      const fa = {

        inspid: wf.inspid, status: 'pending', suspend_reason: '',

        address: {}, executed: null, access: null, photos: {},

        start_time: null, end_time: null, auditor: '',

        regional: wf.regional || '',

        historico: addLog([], currentUser?.nome || currentUser?.login, 'AUDITORIA_CAMPO_CRIADA', 'Auditoria de campo solicitada pela gestão/inspetor')

      };

      await upsertSupabase('autofiscalizacao_field_audits', fa);

    }

    await fetchAll();

    alert('Auditoria externa solicitada com sucesso!');

  };

  // ── MOBILE: Submit Field Audit

  const handleMobileSubmit = async (auditData) => {

    const existing = fieldAudits.find(f => f.inspid === auditData.inspid);

    if (!existing) return alert("Tarefa não encontrada.");

    const nowIso = new Date().toISOString();

    const hist = addLog(existing?.historico, currentUser?.nome || currentUser?.login, 'AUDITORIA_CAMPO_CONCLUIDA', 'Auditoria de campo concluída pelo auditor');

    const txId = 'TX-' + (existing.payload_dados?.osid || existing.id_origem || 'OS') + '-' + Date.now();

    // Inicia o processo de sincronização e muda para a tela de etapas

    setSyncSteps({

      txId,

      wfm: 'loading',

      fieldAudits: 'pending',

      workflow: 'pending',

      ordem: 'pending',

      errorMsg: null

    });

    setScreen('mobile_sync');

    const executeSync = async () => {

      try {

        // ETAPA 1: Finalizar OS no WFM

        if (existing?.id) {

          const { error: wfmErr } = await supabase.from('wfm_tarefas').update({

            status: 'completed',

            historico: hist

          }).eq('id', existing.id);

          if (wfmErr) throw new Error("Erro ao atualizar WFM: " + wfmErr.message);

        }

        setSyncSteps(prev => ({ ...prev, wfm: 'success', fieldAudits: 'loading' }));

        await new Promise(resolve => setTimeout(resolve, 400));

        // ETAPA 2: Gravar dados na tabela autofiscalizacao_field_audits

        const faAuditResult = {

          inspid: existing.id_origem, // ID real da inspeção

          status: 'completed', // 'completed' em vez de 'concluida' para destravar a Etapa 3!

          address: auditData.address,

          executed: auditData.executed,

          access: auditData.access,

          photos: auditData.photos,

          start_time: auditData.start_time,

          end_time: nowIso,

          auditor: currentUser?.login || currentUser?.nome,

          regional: existing?.payload_dados?.regional || existing?.regional || '',

          historico: hist,

          telemetry: auditData.telemetry

        };

        const { error: faErr } = await supabase.from('autofiscalizacao_field_audits').upsert(faAuditResult);

        if (faErr) throw new Error("Erro ao gravar resultados da auditoria: " + faErr.message);

        setSyncSteps(prev => ({ ...prev, fieldAudits: 'success', workflow: 'loading' }));

        await new Promise(resolve => setTimeout(resolve, 400));

        // ETAPA 3: Atualizar workflow da AutoFiscalização

        const wf = workflows.find(w => w.inspid === existing.id_origem);

        if (wf) {

          const wfHist = addLog(wf.historico, currentUser?.nome || currentUser?.login, 'AUDITORIA_CAMPO_CONCLUIDA', 'Auditor completou a inspeção de campo');

          const updated = { ...wf, is_finished: wf.feedback_done, historico: wfHist };

          const { error: wfErr } = await supabase.from('autofiscalizacao_workflows').upsert(updated);

          if (wfErr) throw new Error("Erro ao atualizar workflow: " + wfErr.message);

        }

        setSyncSteps(prev => ({ ...prev, workflow: 'success', ordem: 'loading' }));

        await new Promise(resolve => setTimeout(resolve, 400));

        // ETAPA 4: Finalizar OS na base de ordens

        const os = ordens.find(o => o.nr_ordem === (existing.payload_dados?.osid || existing.id_origem));

        if (os) {

          const updatedOS = {

            ...os,

            status_fisc: 'CONCLUIDO',

            fisc_finished_at: nowIso

          };

          const { error: osErr } = await supabase.from('autofiscalizacao_ordens').upsert(updatedOS);

          if (osErr) throw new Error("Erro ao atualizar status da OS: " + osErr.message);

        }

        setSyncSteps(prev => ({ ...prev, ordem: 'success' }));

        setInProgressAudit(null);

        // Atualizar os dados locais após sucesso

        await fetchAll();

      } catch (err) {

        console.error("Erro na sincronização:", err);

        setSyncSteps(prev => {

          const updatedSteps = { ...prev, errorMsg: err.message };

          if (prev.wfm === 'loading') updatedSteps.wfm = 'error';

          else if (prev.fieldAudits === 'loading') updatedSteps.fieldAudits = 'error';

          else if (prev.workflow === 'loading') updatedSteps.workflow = 'error';

          else if (prev.ordem === 'loading') updatedSteps.ordem = 'error';

          return updatedSteps;

        });

      }

    };

    window.retrySync = executeSync;

    executeSync();

  };

  // ── MOBILE: Suspend Field Audit

  const handleMobileSuspend = async (inspid, reason) => {

    const existing = fieldAudits.find(f => f.inspid === inspid);

    if (!existing) return alert("Tarefa não encontrada.");

    const nowIso = new Date().toISOString();

    const hist = addLog(existing?.historico, currentUser?.nome || currentUser?.login, 'AUDITORIA_CAMPO_SUSPENSA', `Motivo: ${reason}`);

    // 1. Atualizar o status da auditoria em autofiscalizacao_field_audits para suspensa (usando o ID real da inspeção)

    const faSuspendedAudit = {

      inspid: existing.id_origem, // Correção da Chave Estrangeira!

      status: 'suspended',

      suspend_reason: reason,

      end_time: nowIso,

      historico: hist,

      regional: existing?.payload_dados?.regional || existing?.regional || currentUser?.regional || 'Sem Regional',

      auditor: currentUser?.login || currentUser?.nome || ''

    };

    await upsertSupabase('autofiscalizacao_field_audits', faSuspendedAudit);

    // 2. Atualizar a tarefa atual em wfm_tarefas para status='suspensa' (Gantt histórico) - apenas colunas válidas no payload

    const payloadSuspended = {

      id: existing.id,

      modulo_origem: existing.modulo_origem || 'AUTOFISCALIZACAO',

      id_origem: existing.id_origem || '',

      categoria: existing.categoria || 'AutoFiscalização - Campo',

      auditor: existing.auditor,

      assigned_date: existing.assigned_date,

      planned_start: existing.planned_start,

      planned_end: existing.planned_end,

      status: 'suspensa',

      historico: hist,

      payload_dados: {

        ...existing.payload_dados,

        end_time: nowIso,

        suspend_reason: reason

      }

    };

    const { error: err1 } = await supabase.from('wfm_tarefas').upsert(payloadSuspended);

    if (err1) {

      console.error("Erro ao suspender tarefa:", err1);

      alert("Erro ao suspender no WFM: " + err1.message);

      return;

    }

    // 3. Inserir uma cópia correspondente à OS original como NÃO PROGRAMADA

    const newTaskId = crypto.randomUUID();

    const histNew = [

      {

        timestamp: nowIso,

        usuario: 'Sistema',

        acao: 'WFM_REPROGRAMADO_SUSPENSA',

        observacao: `OS disponibilizada para reprogramação após ser suspensa pelo auditor. Motivo da suspensão: ${reason}`

      }

    ];

    const payloadNew = {

      id: newTaskId,

      modulo_origem: existing.modulo_origem || 'AUTOFISCALIZACAO',

      id_origem: existing.id_origem || `ALP-AUTO-NEW-${Date.now()}`,

      categoria: existing.categoria || 'AutoFiscalização - Campo',

      auditor: existing.auditor,

      assigned_date: existing.assigned_date,

      planned_start: null,

      planned_end: null,

      status: 'pending',

      historico: histNew,

      payload_dados: existing.payload_dados

    };

    const { error: err2 } = await supabase.from('wfm_tarefas').insert(payloadNew);

    if (err2) {

      console.error("Erro ao re-enfileirar tarefa:", err2);

    }

    // 4. Restaurar status_fisc para PENDENTE em autofiscalizacao_ordens

    const os = ordens.find(o => o.nr_ordem === (existing.payload_dados?.osid || existing.id_origem));

    if (os) {

      const updatedOS = {

        ...os,

        status_fisc: 'PENDENTE',

        fisc_started_at: null

      };

      await upsertSupabase('autofiscalizacao_ordens', updatedOS);

    }

    // 5. Inserir log de suspensão no histórico do workflow da AutoFiscalização

    if (existing.id_origem) {

      try {

        const { data: wf } = await supabase.from('autofiscalizacao_workflows').select('*').eq('inspid', existing.id_origem).maybeSingle();

        if (wf) {

          const wfLogEntry = {

            id: Date.now(),

            acao: 'WFM_SUSPENSA',

            data: nowIso,

            usuario: currentUser?.nome || currentUser?.login || 'Auditor',

            detalhes: `Auditoria de campo suspensa pelo auditor no celular. Motivo: ${reason}`

          };

          const updatedWfHist = [...(wf.historico || []), wfLogEntry];

          await supabase.from('autofiscalizacao_workflows').update({

            historico: updatedWfHist

          }).eq('inspid', existing.id_origem);

        }

      } catch (err) {

        console.error("Erro ao sincronizar log de suspensão no workflow:", err);

      }

    }

    await fetchAll();

    setInProgressAudit(null);

  };

  // ── XLSX IMPORT

  const handleImportXLSX = async (file) => {

    const ab = await file.arrayBuffer();

    const wb = XLSX.read(ab, { type: 'array', cellDates: true });

    const ws = wb.Sheets[wb.SheetNames[0]];

    const raw = XLSX.utils.sheet_to_json(ws, { defval: '' });

    if (!raw.length) return alert('Planilha vazia.');

    const headers = Object.keys(raw[0]);

    const missing = Object.keys(COLUMN_MAP).filter(h => !headers.some(hh => hh.trim() === h));

    if (missing.length > 0) return alert('Colunas faltando: ' + missing.join(', '));

    const rows = raw.map(row => {

      const mapped = {};

      for (const [excelCol, dbCol] of Object.entries(COLUMN_MAP)) {

        let val = row[excelCol] ?? row[Object.keys(row).find(k => k.trim() === excelCol)] ?? null;

        if (val === '' || val === undefined) val = null;

        if (dbCol === 'data') {

          val = parseDateToYYYYMMDD(val);

        } else if (['despachada', 'a_caminho', 'no_local', 'liberada'].includes(dbCol)) {

          val = parseDateTimeToISO(val);

        } else if (dbCol === 'minutos') {

          val = parseInt(val) || 0;

        } else {

          val = val !== null ? String(val) : '';

        }

        mapped[dbCol] = val;

      }

      mapped.status_fisc = 'PENDENTE';

      mapped.regional = getRegionalFromTipoEquipe(mapped.tipo_equipe) || activeRegional || '';

      mapped.imported_at = new Date().toISOString();

      mapped.imported_by = currentUser?.login || currentUser?.nome || 'Sistema';

      return mapped;

    });

    // Deduplicate by nr_ordem (Primary Key) to prevent bulk upsert conflicts

    const uniqueMap = new Map();

    rows.forEach(r => {

      if (r.nr_ordem) {

        uniqueMap.set(r.nr_ordem, r);

      }

    });

    return Array.from(uniqueMap.values());

  };

  const confirmImport = async (rows) => {

    const batchSize = 50;

    for (let i = 0; i < rows.length; i += batchSize) {

      const batch = rows.slice(i, i + batchSize);

      const { error } = await supabase.from('autofiscalizacao_ordens').upsert(batch, { onConflict: 'nr_ordem' });

      if (error) { alert(`Erro no lote ${i}: ` + error.message); return false; }

    }

    await fetchOrdens();

    return true;

  };

  // ══════════════════════════════════════════════════════════════

  // MOBILE AUDITOR LAYOUT (fullscreen, WhatsApp-style bottom nav)

  // ══════════════════════════════════════════════════════════════

  if (isMobileAuditor) {

    const myTasks = Array.from(new Map(fieldAudits.filter(t => t.auditor === (currentUser?.login || currentUser?.nome)).map(t => [t.inspid, t])).values());

    const allMobileAudits = myTasks.map(t => {

      const wf = filteredWorkflows.find(w => w.inspid === t.inspid);

      const os = filteredOrdens.find(o => o.nr_ordem === (t.payload_dados?.osid || t.id_origem));

      let mobileStatus = 'pending';

      if (t.status === 'concluida' || t.status === 'completed') mobileStatus = 'completed';

      else if (t.status === 'suspensa' || t.status === 'suspended') mobileStatus = 'suspended';

      else if (inProgressAudit?.inspid === t.inspid || t.status === 'iniciada' || t.status === 'started') mobileStatus = 'started';

      return {

        ...wf,

        ...os,

        inspid: t.inspid,

        osid: t.payload_dados?.osid || t.id_origem || os?.nr_ordem || t.id_origem,

        endereco_cliente: t.payload_dados?.endereco || os?.endereco_cliente || os?.endereco_completo || 'Endereço Não Informado',

        link_mapa: os?.endereco_cliente || (typeof t.payload_dados?.endereco === 'string' && t.payload_dados.endereco.includes('maps') ? t.payload_dados.endereco : ''),

        mobileStatus,

        suspendReason: t.suspend_reason || '',

        faData: t

      };

    });

    const getSentTime = (audit) => {

      const logs = audit.faData?.historico || audit.historico || [];

      if (logs.length > 0) {

        const logTime = logs[0].data || logs[0].timestamp || audit.timestamp;

        return new Date(logTime || 0).getTime();

      }

      return new Date(audit.timestamp || 0).getTime();

    };

    // Sorting: oldest routes first (chronological order of sending)

    const sortedMobileAudits = allMobileAudits.sort((a, b) => getSentTime(a) - getSentTime(b));

    const getStatusStyle = (s) => {

      switch (s) {

        case 'started': return { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Iniciada', dot: 'bg-emerald-500' };

        case 'completed': return { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Concluída', dot: 'bg-blue-500' };

        case 'suspended': return { bg: 'bg-red-100', text: 'text-red-700', label: 'Suspensa', dot: 'bg-red-500' };

        default: return { bg: 'bg-orange-100', text: 'text-orange-700', label: 'Pendente', dot: 'bg-orange-500' };

      }

    };

    if (gpsBlocked) {
      return (
        <div className="w-full h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-300">
          <AlertTriangle size={64} className="text-red-500 mb-6 animate-pulse" />
          <h2 className="text-white text-2xl font-black mb-4 uppercase tracking-widest">Acesso Bloqueado</h2>
          <p className="text-slate-300 text-sm leading-relaxed mb-8 max-w-sm">
            O aplicativo exige que a permissão de localização esteja configurada como <strong className="text-white">"Permitir o tempo todo"</strong> para que possamos monitorar seu trajeto e manter a sua segurança em campo, mesmo quando a tela estiver apagada.
          </p>
          <button
            onClick={() => gpsService.openSettings()}
            className="w-full max-w-xs bg-red-600 hover:bg-red-700 text-white font-black py-4 rounded-2xl shadow-lg transition-all text-sm uppercase tracking-wider flex items-center justify-center gap-2 active:scale-95"
          >
            <Zap size={18} /> ABRIR CONFIGURAÇÕES
          </button>
        </div>
      );
    }

    return (

      <div className="w-full h-screen bg-slate-50 flex flex-col overflow-hidden font-sans">

        {/* ── MOBILE HOME ── */}

        {screen === 'mobile_home' && (

          <MobileHome

            audits={sortedMobileAudits} mobileTab={mobileTab} setMobileTab={setMobileTab}

            getStatusStyle={getStatusStyle}

            onSelectAudit={(a) => { setMobileSelectedOS(a); setScreen('mobile_detail'); }}

            currentUser={currentUser}

            onLogout={onLogout}

          />

        )}

        {/* ── MOBILE DETAIL ── */}

        {screen === 'mobile_detail' && mobileSelectedOS && (

          <MobileDetail

            audit={mobileSelectedOS} getStatusStyle={getStatusStyle}

            inProgressAudit={inProgressAudit}

            onBack={() => { setScreen('mobile_home'); setMobileSelectedOS(null); }}

            onStart={async () => {

              if (inProgressAudit && inProgressAudit.inspid !== mobileSelectedOS.inspid) return alert('Finalize ou suspenda a auditoria atual primeiro.');

              const nowIso = new Date().toISOString();

              if (!inProgressAudit || inProgressAudit.inspid !== mobileSelectedOS.inspid) {

                setInProgressAudit({ inspid: mobileSelectedOS.inspid, startTime: nowIso });

              }

              // 1. Atualizar o status_fisc na tabela autofiscalizacao_ordens no Supabase

              const updatedOS = {

                ...mobileSelectedOS,

                status_fisc: 'INICIADO',

                fisc_started_at: nowIso

              };

              await upsertSupabase('autofiscalizacao_ordens', updatedOS);

              // Atualiza o estado das ordens localmente

              setOrdens(prev => prev.map(o => o.nr_ordem === mobileSelectedOS.nr_ordem ? { ...updatedOS, faData: mobileSelectedOS.faData } : o));

              // 2. Atualizar a correspondente tarefa em wfm_tarefas no Supabase

              if (mobileSelectedOS.faData?.id) {

                const histEntry = {

                  timestamp: nowIso,

                  usuario: currentUser?.nome || currentUser?.login || 'Auditor',

                  acao: 'WFM_INICIADA',

                  observacao: `Fiscalização iniciada pelo auditor em campo (Mobile). Rota movida para o horário real: ${new Date(nowIso).toLocaleTimeString('pt-BR')}`

                };

                const currentHist = mobileSelectedOS.faData.historico || [];

                const updatedHist = [...currentHist, histEntry];

                await supabase.from('wfm_tarefas').update({

                  status: 'iniciada',

                  planned_start: nowIso,

                  historico: updatedHist

                }).eq('id', mobileSelectedOS.faData.id);

              }

              // 3. Atualizar o histórico do workflow da AutoFiscalização para "WFM_INICIADA"

              const inspid = mobileSelectedOS.faData?.id_origem || mobileSelectedOS.inspid;

              if (inspid) {

                try {

                  const { data: wf } = await supabase.from('autofiscalizacao_workflows').select('*').eq('inspid', inspid).maybeSingle();

                  if (wf) {

                    const wfLogEntry = {

                      id: Date.now(),

                      acao: 'WFM_INICIADA',

                      data: nowIso,

                      usuario: currentUser?.nome || currentUser?.login || 'Auditor',

                      detalhes: `Fiscalização de campo iniciada pelo auditor em tempo real (Mobile).`

                    };

                    const updatedWfHist = [...(wf.historico || []), wfLogEntry];

                    await supabase.from('autofiscalizacao_workflows').update({

                      historico: updatedWfHist

                    }).eq('inspid', inspid);

                  }

                } catch (err) {

                  console.error("Erro ao sincronizar log de início no workflow:", err);

                }

              }

              // Atualiza a OS selecionada localmente

              setMobileSelectedOS({ ...updatedOS, faData: mobileSelectedOS.faData });

              setScreen('mobile_form');

            }}

          />

        )}

        {/* ── MOBILE FORM ── */}

        {screen === 'mobile_form' && mobileSelectedOS && (

          <MobileForm

            audit={mobileSelectedOS} inProgressAudit={inProgressAudit}

            onBack={() => setScreen('mobile_detail')}

            onSubmit={handleMobileSubmit}

            onSuspend={(reason) => { handleMobileSuspend(mobileSelectedOS.inspid, reason); setScreen('mobile_home'); setMobileSelectedOS(null); }}

            uploadPhoto={uploadPhoto}

          />

        )}

        {/* ── MOBILE SUCCESS ── */}

        {screen === 'mobile_success' && (

          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">

            <div className="w-24 h-24 bg-emerald-100 text-emerald-500 rounded-full flex items-center justify-center mb-6"><CheckCircle size={48} /></div>

            <h2 className="text-2xl font-bold text-slate-800 mb-2">Auditoria Salva!</h2>

            <p className="text-slate-500 mb-8">Os dados foram enviados com sucesso.</p>

            <button onClick={() => { setScreen('mobile_home'); setMobileSelectedOS(null); }} className="w-full max-w-xs bg-slate-800 text-white font-bold py-4 rounded-xl">Voltar para Rotas</button>

          </div>

        )}

        {/* ── MOBILE SYNC STEP TRACKER ── */}

        {screen === 'mobile_sync' && syncSteps && (

          <div className="flex-1 flex flex-col p-6 bg-slate-50 overflow-y-auto">

            <div className="bg-white rounded-3xl p-6 shadow-xl border border-slate-200/60 max-w-md w-full mx-auto my-auto animate-in zoom-in-95 duration-300">

              {/* Header */}

              <div className="text-center mb-6">

                <div className="relative w-16 h-16 mx-auto mb-4 flex items-center justify-center">

                  {/* Outer spinning ring if sync in progress */}

                  {syncSteps.ordem !== 'success' && !syncSteps.errorMsg && (

                    <div className="absolute inset-0 rounded-full border-4 border-slate-100 border-t-emerald-500 animate-spin"></div>

                  )}

                  {/* Inside badge */}

                  <div className={`w-12 h-12 rounded-full flex items-center justify-center shadow-inner ${

                    syncSteps.errorMsg 

                      ? 'bg-rose-50 text-rose-500' 

                      : syncSteps.ordem === 'success' 

                        ? 'bg-emerald-50 text-emerald-500 animate-bounce' 

                        : 'bg-blue-50 text-blue-500'

                  }`}>

                    {syncSteps.errorMsg ? (

                      <AlertCircle size={24} />

                    ) : syncSteps.ordem === 'success' ? (

                      <CheckCircle size={24} />

                    ) : (

                      <CloudLightning size={24} className="animate-pulse" />

                    )}

                  </div>

                </div>

                <h3 className="text-lg font-black text-slate-800">

                  {syncSteps.errorMsg 

                    ? 'Erro na Sincronização' 

                    : syncSteps.ordem === 'success' 

                      ? 'Sincronização Concluída!' 

                      : 'Sincronizando com o Servidor'}

                </h3>

                <p className="text-slate-400 text-xs mt-1 font-mono font-bold">

                  ID: <span className="text-slate-600">{syncSteps.txId}</span>

                </p>

              </div>

              {/* Steps list */}

              <div className="space-y-4 mb-6">

                {/* Step 1: WFM */}

                <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-100 rounded-2xl">

                  <div className="flex items-center gap-3">

                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-lg"></div>

                    <span className="text-xs font-bold text-slate-700">OS Finalizada no WFM</span>

                  </div>

                  {renderStepBadge(syncSteps.wfm)}

                </div>

                {/* Step 2: Field Audits */}

                <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-100 rounded-2xl">

                  <div className="flex items-center gap-3">

                    <div className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-lg"></div>

                    <span className="text-xs font-bold text-slate-700">Formulário e Fotos Gravados</span>

                  </div>

                  {renderStepBadge(syncSteps.fieldAudits)}

                </div>

                {/* Step 3: Workflow */}

                <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-100 rounded-2xl">

                  <div className="flex items-center gap-3">

                    <div className="w-2.5 h-2.5 rounded-full bg-purple-500 shadow-lg"></div>

                    <span className="text-xs font-bold text-slate-700">Workflow AutoFiscalização Atualizado</span>

                  </div>

                  {renderStepBadge(syncSteps.workflow)}

                </div>

                {/* Step 4: Ordem */}

                <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-100 rounded-2xl">

                  <div className="flex items-center gap-3">

                    <div className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-lg"></div>

                    <span className="text-xs font-bold text-slate-700">Ordem Concluída no Painel</span>

                  </div>

                  {renderStepBadge(syncSteps.ordem)}

                </div>

              </div>

              {/* Error message alert */}

              {syncSteps.errorMsg && (

                <div className="bg-rose-50 border border-rose-100 rounded-2xl p-4 text-rose-800 text-xs mb-6 leading-relaxed font-medium">

                  <p className="font-bold flex items-center gap-1.5 mb-1"><XCircle size={14} /> Detalhe do Erro:</p>

                  <p className="font-mono text-[10px] break-words">{syncSteps.errorMsg}</p>

                </div>

              )}

              {/* Actions */}

              <div className="space-y-3">

                {syncSteps.errorMsg ? (

                  <button 

                    onClick={() => {

                      setSyncSteps(prev => ({ 

                        ...prev, 

                        errorMsg: null, 

                        wfm: prev.wfm === 'error' ? 'loading' : prev.wfm,

                        fieldAudits: prev.fieldAudits === 'error' ? 'loading' : prev.fieldAudits,

                        workflow: prev.workflow === 'error' ? 'loading' : prev.workflow,

                        ordem: prev.ordem === 'error' ? 'loading' : prev.ordem

                      }));

                      window.retrySync();

                    }}

                    className="w-full bg-rose-500 hover:bg-rose-600 text-white font-bold py-4 rounded-2xl shadow-lg shadow-rose-100 transition-all flex items-center justify-center gap-2"

                  >

                    <RefreshCw size={16} className="animate-spin-once" /> Tentar Novamente

                  </button>

                ) : syncSteps.ordem === 'success' ? (

                  <button 

                    onClick={() => { setScreen('mobile_home'); setMobileSelectedOS(null); setSyncSteps(null); }}

                    className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-4 rounded-2xl shadow-lg shadow-emerald-100 transition-all flex items-center justify-center gap-2"

                  >

                    <CheckCircle size={16} /> Finalizar e Voltar para Rotas

                  </button>

                ) : (

                  <button 

                    disabled 

                    className="w-full bg-slate-100 text-slate-400 font-bold py-4 rounded-2xl cursor-not-allowed flex items-center justify-center gap-2 text-xs"

                  >

                    <Loader2 size={16} className="animate-spin text-slate-400" /> Sincronizando dados em campo...

                  </button>

                )}

              </div>

            </div>

          </div>

        )}

        {/* ── MOBILE PROFILE ── */}

        {screen === 'mobile_profile' && (

          <MobileProfile

            currentUser={currentUser}

            onBack={() => setScreen('mobile_home')}

            upsertSupabase={upsertSupabase}

            onLogout={onLogout}

          />

        )}

        {/* ── BOTTOM NAV (WhatsApp Style) ── */}

        {(screen === 'mobile_home' || screen === 'mobile_success' || screen === 'mobile_profile') && (

          <div className="h-16 bg-white border-t border-slate-200 flex items-center justify-around shrink-0 pb-1 z-30">

            <button onClick={() => { setMobileTab('rotas'); setScreen('mobile_home'); }} className={`flex flex-col items-center gap-0.5 ${mobileTab === 'rotas' && screen === 'mobile_home' ? 'text-emerald-600' : 'text-slate-400'}`}>

              <MapPin size={22} /><span className="text-[10px] font-bold">Rotas</span>

            </button>

            <button onClick={() => { setMobileTab('historico'); setScreen('mobile_home'); }} className={`flex flex-col items-center gap-0.5 ${mobileTab === 'historico' && screen === 'mobile_home' ? 'text-emerald-600' : 'text-slate-400'}`}>

              <History size={22} /><span className="text-[10px] font-bold">Histórico</span>

            </button>

            <button onClick={() => setScreen('mobile_profile')} className={`flex flex-col items-center gap-0.5 ${screen === 'mobile_profile' ? 'text-emerald-600' : 'text-slate-400'}`}>

              <User size={22} /><span className="text-[10px] font-bold">{currentUser?.nome?.split(' ')[0] || 'Perfil'}</span>

            </button>

          </div>

        )}

      </div>

    );

  }

  // ══════════════════════════════════════════════════════════════

  // DESKTOP LAYOUT

  // ══════════════════════════════════════════════════════════════

  if (loading) return (

    <div className="flex items-center justify-center h-64">

      <div className="animate-spin w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full"></div>

    </div>

  );

  return (

    <div className="max-w-7xl mx-auto animate-in fade-in duration-300">

      {/* ── Sub-navigation ── */}

      <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">

        {[

          { id: 'dashboard', label: 'Dashboard', icon: <BarChart3 size={16} /> },

          { id: 'agenda', label: 'Agenda de Fiscalização', icon: <Calendar size={16} /> },

          { id: 'workflows', label: 'Acompanhamento', icon: <Activity size={16} /> },

          { id: 'reports', label: 'Relatórios', icon: <FileText size={16} /> },

          ...(canImportOS ? [{ id: 'import', label: 'Importar OS', icon: <Upload size={16} /> }] : []),

        ].map(t => (

          <button key={t.id} onClick={() => { setScreen(t.id); setSelectedDate(null); setSelectedOS(null); setSelectedWorkflow(null); }}

            className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold whitespace-nowrap transition-all ${screen === t.id || (t.id === 'agenda' && screen === 'day_detail') ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-200' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}>

            {t.icon} {t.label}

            {t.id === 'workflows' && filteredWorkflows.filter(w => !w.is_finished).length > 0 && (

              <span className="bg-rose-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full ml-1">{filteredWorkflows.filter(w => !w.is_finished).length}</span>

            )}

          </button>

        ))}

      </div>

      {/* ── Screen Routing ── */}

      {screen === 'dashboard' && <DashboardScreen ordens={filteredOrdens} inspecoes={filteredInspecoes} workflows={filteredWorkflows} />}

      {screen === 'agenda' && (

        <AgendaScreen

          ordens={filteredOrdens} inspecoes={filteredInspecoes}

          selectedMonth={selectedMonth} setSelectedMonth={setSelectedMonth}

          selectedYear={selectedYear} setSelectedYear={setSelectedYear}

          onSelectDay={(d) => { setSelectedDate(d); setScreen('day_detail'); }}

        />

      )}

      {screen === 'day_detail' && selectedDate && (

        <DayDetailScreen

          date={selectedDate} ordens={filteredOrdens} inspecoes={filteredInspecoes}

          onBack={() => setScreen('agenda')}

          onStartInspection={(os) => { setSelectedOS(os); setShowInstructionModal(true); }}

          onViewDetails={(os) => setViewingOSDetails(os)}

        />

      )}

      {screen === 'workflows' && (

        <WorkflowsScreen

          workflows={filteredWorkflows} fieldAudits={fieldAudits} inspecoes={filteredInspecoes} ordens={filteredOrdens}

          onSelectWorkflow={(wf) => { setSelectedWorkflow(wf); setScreen('workflow_detail'); }}

        />

      )}

      {screen === 'workflow_detail' && selectedWorkflow && (

        <WorkflowDetailScreen

          workflow={selectedWorkflow} fieldAudits={fieldAudits} inspecoes={filteredInspecoes} ordens={filteredOrdens}

          onBack={() => { setSelectedWorkflow(null); setScreen('workflows'); }}

          onSubmitFeedback={handleSubmitFeedback}

          onRequestFieldAudit={handleRequestFieldAudit}

          currentUser={currentUser}

        />

      )}

      {screen === 'reports' && (

        <ReportsScreen

          ordens={filteredOrdens}

          inspecoes={filteredInspecoes}

          workflows={filteredWorkflows}

          fieldAudits={fieldAudits}

          onSelectWorkflow={(wf) => { setSelectedWorkflow(wf); setScreen('workflow_detail'); }}

        />

      )}

      {screen === 'import' && <ImportScreen onImport={handleImportXLSX} onConfirm={confirmImport} currentUser={currentUser} />}

      {/* ── Modals ── */}

      {showInstructionModal && selectedOS && (

        <InstructionModal

          os={selectedOS}

          onCancel={() => { setShowInstructionModal(false); setSelectedOS(null); }}

          onConfirm={handleConfirmStart}

        />

      )}

      {showInspectionForm && selectedOS && (

        <InspectionFormModal

          os={selectedOS}

          onCancel={() => { setShowInspectionForm(false); setSelectedOS(null); }}

          onSubmit={handleSubmitInspection}

          uploadPhoto={uploadPhoto}

          currentUser={currentUser} activeRegional={activeRegional}

          colaboradoresList={colaboradoresList}

          setColaboradoresList={setColaboradoresList}

        />

      )}

      {viewingOSDetails && (

        <ModalDetalhesOS

          os={viewingOSDetails}

          onClose={() => setViewingOSDetails(null)}

          inspecoes={inspecoes}

          workflows={workflows}

          fieldAudits={fieldAudits}

        />

      )}

    </div>

  );

}

// ══════════════════════════════════════════════════════════════

// SUB-COMPONENTS: DESKTOP

// ══════════════════════════════════════════════════════════════

// ── DASHBOARD ────────────────────────────────────────────────

function DashboardScreen({ ordens, inspecoes, workflows }) {

  const totalOrdens = ordens.length;

  const totalInsp = inspecoes.length;

  const conformes = inspecoes.filter(i => i.status === 'Conforme').length;

  const naoConformes = inspecoes.filter(i => i.status === 'Não Conforme').length;

  const wfAtivos = workflows.filter(w => !w.is_finished).length;

  const pieData = [

    { name: 'Conforme', value: conformes, color: COLORS_CHART.emerald },

    { name: 'Não Conforme', value: naoConformes, color: COLORS_CHART.danger }

  ];

  const dateMap = {};

  ordens.forEach(o => {

    const d = String(o.data).slice(0, 10);

    if (!dateMap[d]) dateMap[d] = { date: d, total: 0, done: 0, pending: 0 };

    dateMap[d].total++;

  });

  inspecoes.forEach(i => {

    const d = String(i.data).slice(0, 10);

    if (dateMap[d]) dateMap[d].done++;

  });

  Object.values(dateMap).forEach(d => d.pending = d.total - d.done);

  const barData = Object.values(dateMap).sort((a, b) => a.date.localeCompare(b.date)).slice(-7);

  return (

    <div className="animate-in fade-in duration-300">

      <div className="mb-6">

        <h2 className="text-2xl font-black text-blue-950">Visão Geral — AutoFiscalização</h2>

        <p className="text-slate-500 text-sm font-medium mt-1">Acompanhamento das inspeções e auditorias integradas.</p>

      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">

        {[

          { label: 'Total OS Importadas', value: totalOrdens, color: 'text-slate-700', bg: 'bg-slate-50', icon: <FileText size={22} className="text-slate-400" /> },

          { label: 'Conformes', value: conformes, color: 'text-emerald-700', bg: 'bg-emerald-50', icon: <CheckCircle size={22} className="text-emerald-500" /> },

          { label: 'Não Conformes', value: naoConformes, color: 'text-rose-700', bg: 'bg-rose-50', icon: <XCircle size={22} className="text-rose-500" /> },

          { label: 'Workflows Ativos', value: wfAtivos, color: 'text-amber-700', bg: 'bg-amber-50', icon: <Activity size={22} className="text-amber-500" /> }

        ].map((c, i) => (

          <div key={i} className={`${c.bg} p-5 rounded-2xl border border-slate-100 shadow-sm`}>

            <div className="flex justify-between items-start mb-2">{c.icon}</div>

            <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">{c.label}</p>

            <p className={`text-3xl font-black ${c.color} mt-1`}>{c.value}</p>

          </div>

        ))}

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">

          <h3 className="font-bold text-slate-800 mb-4 text-sm">Qualidade Sistêmica</h3>

          <div className="h-56">

            {totalInsp > 0 ? (

              <ResponsiveContainer width="100%" height="100%">

                <PieChart>

                  <Pie data={pieData} innerRadius={55} outerRadius={75} paddingAngle={5} dataKey="value">

                    {pieData.map((e, i) => <Cell key={i} fill={e.color} />)}

                  </Pie>

                  <Tooltip /><Legend verticalAlign="bottom" height={36} />

                </PieChart>

              </ResponsiveContainer>

            ) : <div className="flex items-center justify-center h-full text-slate-400 font-bold">Sem dados de inspeção</div>}

          </div>

        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">

          <h3 className="font-bold text-slate-800 mb-4 text-sm">Progresso por Dia</h3>

          <div className="h-56">

            {barData.length > 0 ? (

              <ResponsiveContainer width="100%" height="100%">

                <BarChart data={barData}>

                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />

                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} tickFormatter={d => fmtDateBR(d)} />

                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} />

                  <Tooltip /><Legend />

                  <Bar dataKey="done" name="Realizadas" fill={COLORS_CHART.emerald} radius={[4, 4, 0, 0]} />

                  <Bar dataKey="pending" name="Pendentes" fill="#cbd5e1" radius={[4, 4, 0, 0]} />

                </BarChart>

              </ResponsiveContainer>

            ) : <div className="flex items-center justify-center h-full text-slate-400 font-bold">Importe OS para visualizar</div>}

          </div>

        </div>

      </div>

    </div>

  );

}

// ── AGENDA (SQUARE GRID DAY-BY-DAY) ──────────────────────────

function AgendaScreen({ ordens, inspecoes, selectedMonth, setSelectedMonth, selectedYear, setSelectedYear, onSelectDay }) {

  const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

  const years = ['2025', '2026', '2027'];

  const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();

  const dayCards = useMemo(() => {

    const list = [];

    for (let i = 1; i <= daysInMonth; i++) {

      const dateStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;

      const dayOrders = ordens.filter(o => String(o.data).slice(0, 10) === dateStr);

      const dayDone = inspecoes.filter(insp => String(insp.data).slice(0, 10) === dateStr);

      const weekday = new Date(selectedYear, selectedMonth, i).toLocaleDateString('pt-BR', { weekday: 'short' });

      list.push({

        day: i,

        dateStr,

        weekday,

        total: dayOrders.length,

        done: dayDone.length,

        pending: dayOrders.length - dayDone.length

      });

    }

    return list;

  }, [selectedMonth, selectedYear, ordens, inspecoes, daysInMonth]);

  return (

    <div className="animate-in fade-in duration-300">

      <div className="mb-6 flex justify-between items-start flex-wrap gap-4">

        <div>

          <h2 className="text-2xl font-black text-blue-950">Agenda de Fiscalização</h2>

          <p className="text-slate-500 text-sm font-medium mt-1">Calendário mensal. Selecione um dia ativo para auditar.</p>

        </div>

        <div className="flex items-center gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-sm flex-wrap">

          <div className="flex flex-col">

            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Mês</span>

            <select value={selectedMonth} onChange={e => setSelectedMonth(Number(e.target.value))} className="bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl font-bold text-sm text-slate-700 outline-none">

              {months.map((m, idx) => <option key={idx} value={idx}>{m}</option>)}

            </select>

          </div>

          <div className="flex flex-col">

            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Ano</span>

            <select value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))} className="bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl font-bold text-sm text-slate-700 outline-none">

              {years.map(y => <option key={y} value={y}>{y}</option>)}

            </select>

          </div>

        </div>

      </div>

      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-3">

        {dayCards.map(day => {

          const hasOS = day.total > 0;

          const isConcluded = hasOS && day.pending === 0;

          return (

            <div

              key={day.day}

              onClick={() => hasOS && onSelectDay(day.dateStr)}

              className={`aspect-square rounded-2xl flex flex-col justify-between p-3.5 border transition-all ${hasOS

                ? isConcluded

                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800 hover:shadow-md cursor-pointer hover:-translate-y-0.5'

                  : 'bg-white border-slate-200 text-slate-800 hover:shadow-md hover:border-emerald-300 cursor-pointer hover:-translate-y-0.5'

                : 'bg-slate-50 border-slate-100 text-slate-400 cursor-not-allowed'

                }`}

            >

              <div className="flex justify-between items-start">

                <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 group-hover:text-emerald-500">{day.weekday}</span>

                <span className="text-xl font-black leading-none">{day.day}</span>

              </div>

              {hasOS ? (

                <div className="mt-2 text-[10px] font-bold leading-tight space-y-0.5">

                  <div className="text-slate-500">{day.total} OS</div>

                  <div className="text-emerald-600">{day.done} Feitas</div>

                  {day.pending > 0 && <div className="text-amber-500 font-black">{day.pending} Pend.</div>}

                </div>

              ) : (

                <span className="text-[9px] uppercase tracking-wider font-bold text-slate-300">Sem OS</span>

              )}

            </div>

          );

        })}

      </div>

    </div>

  );

}

// ── DAY DETAIL ──────────────────────────────────────────────

function DayDetailScreen({ date, ordens, inspecoes, onBack, onStartInspection, onViewDetails }) {

  const [tab, setTab] = useState('pendentes');

  const [search, setSearch] = useState('');

  // Advanced filters states

  const [selBaseContrato, setSelBaseContrato] = useState('');

  const [selTurno, setSelTurno] = useState('');

  const [selAtuacao, setSelAtuacao] = useState('');

  const [selStatusFisc, setSelStatusFisc] = useState('');

  const [selTipoVeiculo, setSelTipoVeiculo] = useState('');

  const dayOrdens = ordens.filter(o => String(o.data).slice(0, 10) === date);

  const dayInsp = inspecoes.filter(i => String(i.data).slice(0, 10) === date);

  const inspectedOsIds = dayInsp.map(i => i.osid);

  const pendingOS = dayOrdens.filter(o => !inspectedOsIds.includes(o.nr_ordem));

  const doneOS = dayInsp;

  // Extract unique filter options from the day's records

  const basesContrato = useMemo(() => {

    return [...new Set(dayOrdens.map(o => o.base_contrato))].filter(Boolean).sort();

  }, [dayOrdens]);

  const turnos = useMemo(() => {

    return [...new Set(dayOrdens.map(o => o.periodo))].filter(Boolean).sort();

  }, [dayOrdens]);

  const atuacoes = useMemo(() => {

    return [...new Set(dayOrdens.map(o => o.atuacao))].filter(Boolean).sort();

  }, [dayOrdens]);

  const tiposVeiculo = useMemo(() => {

    return [...new Set(dayOrdens.map(o => o.tipo_veiculo))].filter(Boolean).sort();

  }, [dayOrdens]);

  // Compute stats for Pendentes

  const countPend = pendingOS.filter(o => o.status_fisc !== 'INICIADO').length;

  const countInit = pendingOS.filter(o => o.status_fisc === 'INICIADO').length;

  const baseCounts = useMemo(() => {

    return pendingOS.reduce((acc, o) => {

      if (o.base) acc[o.base] = (acc[o.base] || 0) + 1;

      return acc;

    }, {});

  }, [pendingOS]);

  const atuacaoCounts = useMemo(() => {

    return pendingOS.reduce((acc, o) => {

      if (o.atuacao) acc[o.atuacao] = (acc[o.atuacao] || 0) + 1;

      return acc;

    }, {});

  }, [pendingOS]);

  const veiculoCounts = useMemo(() => {

    return pendingOS.reduce((acc, o) => {

      if (o.tipo_veiculo) acc[o.tipo_veiculo] = (acc[o.tipo_veiculo] || 0) + 1;

      return acc;

    }, {});

  }, [pendingOS]);

  const periodoCounts = useMemo(() => {

    return pendingOS.reduce((acc, o) => {

      if (o.periodo) acc[o.periodo] = (acc[o.periodo] || 0) + 1;

      return acc;

    }, {});

  }, [pendingOS]);

  // Compute stats for Realizadas

  const countConf = doneOS.filter(i => i.status === 'Conforme').length;

  const countNConf = doneOS.filter(i => i.status === 'Não Conforme').length;

  const totalRealizadas = doneOS.length;

  const rateConf = totalRealizadas > 0 ? Math.round((countConf / totalRealizadas) * 100) : 0;

  // Filtered lists

  const filteredPending = useMemo(() => {

    return pendingOS.filter(o => {

      const matchSearch = !search || o.nr_ordem?.toLowerCase().includes(search.toLowerCase()) || o.equipe?.toLowerCase().includes(search.toLowerCase());

      const matchBase = !selBaseContrato || o.base_contrato === selBaseContrato;

      const matchTurno = !selTurno || o.periodo === selTurno;

      const matchAtuacao = !selAtuacao || o.atuacao === selAtuacao;

      const matchStatus = !selStatusFisc || o.status_fisc === selStatusFisc;

      const matchTipo = !selTipoVeiculo || o.tipo_veiculo === selTipoVeiculo;

      return matchSearch && matchBase && matchTurno && matchAtuacao && matchStatus && matchTipo;

    });

  }, [pendingOS, search, selBaseContrato, selTurno, selAtuacao, selStatusFisc, selTipoVeiculo]);

  const filteredDone = useMemo(() => {

    return doneOS.filter(insp => {

      const os = ordens.find(o => o.nr_ordem === insp.osid);

      if (!os) return false;

      const matchSearch = !search || os.nr_ordem?.toLowerCase().includes(search.toLowerCase()) || os.equipe?.toLowerCase().includes(search.toLowerCase());

      const matchBase = !selBaseContrato || os.base_contrato === selBaseContrato;

      const matchTurno = !selTurno || os.periodo === selTurno;

      const matchAtuacao = !selAtuacao || os.atuacao === selAtuacao;

      const matchTipo = !selTipoVeiculo || os.tipo_veiculo === selTipoVeiculo;

      return matchSearch && matchBase && matchTurno && matchAtuacao && matchTipo;

    });

  }, [doneOS, ordens, search, selBaseContrato, selTurno, selAtuacao, selTipoVeiculo]);

  return (

    <div className="animate-in slide-in-from-right duration-300">

      <button onClick={onBack} className="flex items-center gap-2 text-slate-500 hover:text-emerald-600 font-bold mb-4 transition-colors"><ArrowLeft size={18} /> Voltar para Agenda</button>

      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">

        <div>

          <h2 className="text-2xl font-black text-blue-950">Inspeções — {fmtDateBR(date + 'T12:00:00')}</h2>

          <p className="text-slate-500 text-sm font-medium mt-1">Verifique as ordens e preencha a AutoFiscalização.</p>

        </div>

      </div>

      {/* Tabs */}

      <div className="flex gap-4 mb-4 border-b border-slate-200">

        <button className={`pb-3 px-2 font-bold text-sm transition-colors ${tab === 'pendentes' ? 'text-emerald-600 border-b-2 border-emerald-600' : 'text-slate-500'}`} onClick={() => setTab('pendentes')}>Pendentes ({pendingOS.length})</button>

        <button className={`pb-3 px-2 font-bold text-sm transition-colors ${tab === 'realizadas' ? 'text-emerald-600 border-b-2 border-emerald-600' : 'text-slate-500'}`} onClick={() => setTab('realizadas')}>Realizadas ({doneOS.length})</button>

      </div>

      {/* Dynamic Indicators Cards (Google M3 Expressive style) */}

      {tab === 'pendentes' ? (

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-5 animate-in fade-in">

          <div className="bg-gradient-to-tr from-amber-50 to-amber-100/50 border border-amber-200/60 p-3 rounded-2xl shadow-sm text-center flex flex-col justify-center h-[72px]">

            <span className="text-[8px] font-black text-amber-600 uppercase tracking-widest block">Pendentes</span>

            <p className="text-xl font-black text-amber-900 mt-0.5">{countPend}</p>

          </div>

          <div className="bg-gradient-to-tr from-blue-50 to-blue-100/50 border border-blue-200/60 p-3 rounded-2xl shadow-sm text-center flex flex-col justify-center h-[72px]">

            <span className="text-[8px] font-black text-blue-600 uppercase tracking-widest block">Iniciadas</span>

            <p className="text-xl font-black text-blue-900 mt-0.5">{countInit}</p>

          </div>

          <div className="bg-white border border-slate-200 p-2.5 rounded-2xl shadow-sm text-center flex flex-col justify-center h-[72px]">

            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">Por Base</span>

            <div className="text-[9px] font-bold text-slate-700 mt-1 space-y-0.5 overflow-y-auto max-h-[42px] leading-tight">

              {Object.entries(baseCounts).map(([k, v]) => (

                <div key={k} className="flex justify-between px-1"><span>{k.split(' ')[0]}:</span> <span className="text-blue-950 font-black">{v}</span></div>

              ))}

              {Object.keys(baseCounts).length === 0 && <span className="text-slate-400">0</span>}

            </div>

          </div>

          <div className="bg-white border border-slate-200 p-2.5 rounded-2xl shadow-sm text-center flex flex-col justify-center h-[72px]">

            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">Por Atuação</span>

            <div className="text-[9px] font-bold text-slate-700 mt-1 space-y-0.5 overflow-y-auto max-h-[42px] leading-tight">

              {Object.entries(atuacaoCounts).map(([k, v]) => (

                <div key={k} className="flex justify-between px-1"><span>{k}:</span> <span className="text-blue-950 font-black">{v}</span></div>

              ))}

              {Object.keys(atuacaoCounts).length === 0 && <span className="text-slate-400">0</span>}

            </div>

          </div>

          <div className="bg-white border border-slate-200 p-2.5 rounded-2xl shadow-sm text-center flex flex-col justify-center h-[72px]">

            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">Por Veículo</span>

            <div className="text-[9px] font-bold text-slate-700 mt-1 space-y-0.5 overflow-y-auto max-h-[42px] leading-tight">

              {Object.entries(veiculoCounts).map(([k, v]) => (

                <div key={k} className="flex justify-between px-1"><span className="truncate max-w-[55px]" title={k}>{k}:</span> <span className="text-blue-950 font-black">{v}</span></div>

              ))}

              {Object.keys(veiculoCounts).length === 0 && <span className="text-slate-400">0</span>}

            </div>

          </div>

          <div className="bg-white border border-slate-200 p-2.5 rounded-2xl shadow-sm text-center flex flex-col justify-center h-[72px]">

            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">Por Turno</span>

            <div className="text-[9px] font-bold text-slate-700 mt-1 space-y-0.5 overflow-y-auto max-h-[42px] leading-tight">

              {Object.entries(periodoCounts).map(([k, v]) => (

                <div key={k} className="flex justify-between px-1"><span className="truncate max-w-[55px]" title={k}>{k.split(' ')[0]}:</span> <span className="text-blue-950 font-black">{v}</span></div>

              ))}

              {Object.keys(periodoCounts).length === 0 && <span className="text-slate-400">0</span>}

            </div>

          </div>

        </div>

      ) : (

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5 animate-in fade-in">

          <div className="bg-gradient-to-tr from-emerald-50 to-emerald-100/50 border border-emerald-200/60 p-4.5 rounded-2xl shadow-sm text-center flex flex-col justify-center h-[86px]">

            <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest block">Inspeções Conformes</span>

            <p className="text-2xl font-black text-emerald-950 mt-1">{countConf}</p>

          </div>

          <div className="bg-gradient-to-tr from-rose-50 to-rose-100/50 border border-rose-200/60 p-4.5 rounded-2xl shadow-sm text-center flex flex-col justify-center h-[86px]">

            <span className="text-[9px] font-black text-rose-600 uppercase tracking-widest block">Inspeções Não Conformes</span>

            <p className="text-2xl font-black text-rose-950 mt-1">{countNConf}</p>

          </div>

          <div className="bg-gradient-to-tr from-blue-50 to-blue-100/50 border border-blue-200/60 p-4.5 rounded-2xl shadow-sm text-center flex flex-col justify-center h-[86px]">

            <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest block">Índice de Conformidade</span>

            <p className="text-2xl font-black text-blue-950 mt-1">{rateConf}%</p>

          </div>

        </div>

      )}

      {/* Advanced Filters Section */}

      <div className="bg-slate-50/60 p-4 rounded-2xl border border-slate-100/50 mb-5 space-y-3 shadow-inner">

        <div className="flex items-center justify-between">

          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Filtros Avançados</span>

          {(search || selBaseContrato || selTurno || selAtuacao || selStatusFisc || selTipoVeiculo) && (

            <button

              onClick={() => {

                setSearch('');

                setSelBaseContrato('');

                setSelTurno('');

                setSelAtuacao('');

                setSelStatusFisc('');

                setSelTipoVeiculo('');

              }}

              className="text-[9px] font-black uppercase text-rose-600 hover:underline"

            >

              Limpar Filtros

            </button>

          )}

        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5">

          {/* Text search */}

          <div className="relative">

            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />

            <input

              type="text"

              placeholder="Buscar OS ou equipe..."

              value={search}

              onChange={e => setSearch(e.target.value)}

              className="w-full pl-9 pr-3 py-2 bg-white rounded-xl border border-slate-200 font-bold text-xs text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500"

            />

          </div>

          {/* Base Contrato */}

          <select

            value={selBaseContrato}

            onChange={e => setSelBaseContrato(e.target.value)}

            className="py-2 px-3 bg-white border border-slate-200 rounded-xl font-bold text-xs text-slate-655 outline-none focus:ring-2 focus:ring-emerald-500"

          >

            <option value="">Base Contrato (Todas)</option>

            {basesContrato.map(b => <option key={b} value={b}>{b}</option>)}

          </select>

          {/* Turno */}

          <select

            value={selTurno}

            onChange={e => setSelTurno(e.target.value)}

            className="py-2 px-3 bg-white border border-slate-200 rounded-xl font-bold text-xs text-slate-655 outline-none focus:ring-2 focus:ring-emerald-500"

          >

            <option value="">Turno (Todos)</option>

            {turnos.map(t => <option key={t} value={t}>{t}</option>)}

          </select>

          {/* Atuação */}

          <select

            value={selAtuacao}

            onChange={e => setSelAtuacao(e.target.value)}

            className="py-2 px-3 bg-white border border-slate-200 rounded-xl font-bold text-xs text-slate-655 outline-none focus:ring-2 focus:ring-emerald-500"

          >

            <option value="">Atuação (Todas)</option>

            {atuacoes.map(a => <option key={a} value={a}>{a}</option>)}

          </select>

          {/* Tipo Veículo */}

          <select

            value={selTipoVeiculo}

            onChange={e => setSelTipoVeiculo(e.target.value)}

            className="py-2 px-3 bg-white border border-slate-200 rounded-xl font-bold text-xs text-slate-655 outline-none focus:ring-2 focus:ring-emerald-500"

          >

            <option value="">Veículo (Todos)</option>

            {tiposVeiculo.map(v => <option key={v} value={v}>{v}</option>)}

          </select>

          {/* Status Fisc */}

          {tab === 'pendentes' ? (

            <select

              value={selStatusFisc}

              onChange={e => setSelStatusFisc(e.target.value)}

              className="py-2 px-3 bg-white border border-slate-200 rounded-xl font-bold text-xs text-slate-655 outline-none focus:ring-2 focus:ring-emerald-500"

            >

              <option value="">Status Fisc (Todos)</option>

              <option value="PENDENTE">Pendente</option>

              <option value="INICIADO">Iniciado</option>

            </select>

          ) : (

            <div className="py-2 px-3 bg-slate-100 border border-slate-200 rounded-xl font-bold text-xs text-slate-400 text-center select-none">

              Realizadas

            </div>

          )}

        </div>

      </div>

      <div className="space-y-3">

        {tab === 'pendentes' && filteredPending.map(os => (

          <div key={os.nr_ordem} className="bg-white p-5 rounded-2xl border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-sm hover:border-emerald-300 transition-colors">

            <div className="flex-1">

              <div className="flex items-center gap-2 mb-1.5 flex-wrap">

                <span className={`px-2.5 py-0.5 text-[10px] font-black rounded-full uppercase tracking-wider ${os.status_fisc === 'INICIADO' ? 'bg-blue-50 text-blue-700' : 'bg-amber-50 text-amber-700'}`}>

                  {os.status_fisc === 'INICIADO' ? 'Iniciado' : 'Pendente'}

                </span>

                <span className={`px-2.5 py-0.5 text-[10px] font-black rounded-full uppercase tracking-wider ${os.atuacao === 'TMA' ? 'bg-emerald-50 text-emerald-700' : 'bg-orange-50 text-orange-700'}`}>{os.atuacao}</span>

                <span className="text-slate-400 text-xs font-bold">{os.base}</span>

                <span className="text-slate-400 text-xs">•</span>

                <span className="text-slate-400 text-xs font-bold">{os.periodo}</span>

                {os.fisc_started_at && <span className="text-blue-500 text-xs font-bold">Iniciada às {fmtTime(os.fisc_started_at)}</span>}

              </div>

              <h4 className="text-base font-black text-slate-800">OS: {os.nr_ordem}</h4>

              <p className="text-slate-505 text-xs mt-1 leading-relaxed">

                <span className="font-bold text-slate-600">Classe:</span> {os.classe} <br />

                <span className="font-bold text-slate-600">Causa:</span> {os.descricao_causa} • Equipe: {os.equipe} • {os.tipo_veiculo}

              </p>

              <div className="flex gap-4 mt-2.5 text-[10px] font-bold text-slate-400">

                <span>Desp: {fmtTime(os.despachada)}</span>

                <span>Rota: {fmtTime(os.a_caminho)}</span>

                <span>Local: {fmtTime(os.no_local)}</span>

                <span>Lib: {fmtTime(os.liberada)}</span>

                <span className="text-blue-600">{os.minutos} min</span>

              </div>

            </div>

            <div className="flex items-center gap-2 shrink-0">

              <button onClick={() => onViewDetails(os)} className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-colors shadow-sm" title="Visualizar Detalhes da OS">

                <Eye size={18} />

              </button>

              <button onClick={() => onStartInspection(os)} className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl font-bold text-sm transition-colors flex items-center gap-2 shadow-sm">

                Iniciar <ChevronRight size={16} />

              </button>

            </div>

          </div>

        ))}

        {tab === 'realizadas' && filteredDone.map(insp => {

          const os = ordens.find(o => o.nr_ordem === insp.osid);

          return (

            <div key={insp.inspid} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3 hover:border-emerald-300 transition-colors">

              <div className="flex-1">

                <div className="flex items-center gap-2 mb-1.5">

                  <span className={`px-2.5 py-0.5 text-[10px] font-black rounded-full uppercase tracking-wider ${insp.status === 'Conforme' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>{insp.status}</span>

                  <span className="text-slate-400 text-xs font-bold">{insp.inspid}</span>

                </div>

                <h4 className="text-base font-black text-slate-800">OS: {insp.osid}</h4>

                <p className="text-slate-500 text-xs mt-0.5">Inspetor: {formatUserFriendlyName(insp.inspector)} • {fmtDateTimeBR(insp.timestamp)}</p>

                {insp.notes && (

                  <p className="text-slate-500 text-xs italic mt-1.5 leading-relaxed bg-slate-50 p-2.5 rounded-xl border border-slate-100 max-w-2xl">

                    <span className="font-black text-[9px] uppercase tracking-wider text-slate-400 block mb-0.5">Comentários da Inspeção</span>

                    "{insp.notes}"

                  </p>

                )}

              </div>

              <button onClick={() => os && onViewDetails(os)} className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-655 rounded-xl transition-colors shadow-sm" title="Visualizar Detalhes da OS">

                <Eye size={18} />

              </button>

            </div>

          );

        })}

        {tab === 'pendentes' && filteredPending.length === 0 && <p className="text-center text-slate-400 font-bold py-8">Nenhuma OS pendente atende aos filtros ativos. 📋</p>}

        {tab === 'realizadas' && filteredDone.length === 0 && <p className="text-center text-slate-400 font-bold py-8">Nenhuma OS realizada atende aos filtros ativos. 📋</p>}

      </div>

    </div>

  );

}

// ── INSTRUCTION MODAL ───────────────────────────────────────

function InstructionModal({ os, onCancel, onConfirm }) {

  return (

    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in">

      <div className="bg-white rounded-[2rem] max-w-2xl w-full shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">

        <div className="bg-emerald-600 p-6 text-white text-center">

          <AlertCircle size={48} className="mx-auto mb-3 opacity-90" />

          <h2 className="text-xl font-black">Instrução Sistêmica — E-Ordem</h2>

        </div>

        <div className="p-6">

          <p className="text-slate-700 leading-relaxed mb-5">A AutoFiscalização é realizada de forma sistêmica. Verifique na OS <strong>{os.nr_ordem}</strong> se foram anexadas as <strong className="text-emerald-700">4 fotos obrigatórias</strong>:</p>

          <div className="space-y-3 mb-6">

            {REQUIRED_PHOTOS_LABELS.map((p, i) => (

              <div key={p.id} className="flex gap-3 p-3 bg-emerald-50 rounded-xl border border-emerald-100">

                <div className="w-7 h-7 bg-emerald-200 text-emerald-800 rounded-full flex items-center justify-center font-black text-sm shrink-0">{i + 1}</div>

                <p className="text-slate-700 font-bold mt-0.5">{p.label}</p>

              </div>

            ))}

          </div>

          <p className="text-sm text-slate-500 mb-6">Suba os <strong>prints</strong> comprovando que verificou essas imagens, independente do resultado (Conforme ou Não Conforme).</p>

          <div className="flex justify-end gap-3">

            <button onClick={onCancel} className="px-5 py-2.5 text-slate-500 font-bold hover:bg-slate-100 rounded-xl transition-colors">Cancelar</button>

            <button onClick={onConfirm} className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl shadow-lg transition-all flex items-center gap-2">Ciente, Iniciar <ChevronRight size={16} /></button>

          </div>

        </div>

      </div>

    </div>

  );

}

// ── INSPECTION FORM MODAL ───────────────────────────────────

function InspectionFormModal({ os, onCancel, onSubmit, uploadPhoto, currentUser, activeRegional, colaboradoresList, setColaboradoresList }) {

  const [isConform, setIsConform] = useState(null);

  const [memberInput, setMemberInput] = useState('');

  const [members, setMembers] = useState([]);

  const [photoFiles, setPhotoFiles] = useState({});

  const [photoUrls, setPhotoUrls] = useState({});

  const [uploading, setUploading] = useState(false);

  const [saving, setSaving] = useState(false);

  const [notes, setNotes] = useState('');

  // New Colab Quick Registry states

  const [showAddColabModal, setShowAddColabModal] = useState(false);

  const addMemberName = (name) => {

    if (name.trim() && !members.includes(name.trim())) {

      setMembers([...members, name.trim()]);

      setMemberInput('');

    }

  };

  const handlePhoto = async (key, file) => {

    setPhotoFiles(p => ({ ...p, [key]: file }));

    setUploading(true);

    const url = await uploadPhoto(file, `inspecoes/${os.nr_ordem}`);

    if (url) setPhotoUrls(p => ({ ...p, [key]: url }));

    setUploading(false);

  };

  const handleSubmit = async () => {

    if (isConform === null) return alert('Informe se a OS está Conforme ou Não Conforme.');

    if (members.length === 0) return alert('Adicione pelo menos um integrante da equipe.');

    const allPhotos = REQUIRED_PHOTOS_LABELS.every(p => photoUrls[p.id]);

    if (!allPhotos) return alert('Anexe os 4 prints obrigatórios.');

    setSaving(true);

    await onSubmit({

      osId: os.nr_ordem, date: String(os.data).slice(0, 10),

      isConform, members, photoUrls,

      regional: os.regional || activeRegional || '',

      notes

    });

    setSaving(false);

  };

  // Filter suggestions

  const suggestions = useMemo(() => {

    if (memberInput.trim().length < 2) return [];

    return colaboradoresList.filter(c =>

      c.nome?.toLowerCase().includes(memberInput.toLowerCase()) &&

      !members.includes(c.nome)

    ).slice(0, 5);

  }, [memberInput, colaboradoresList, members]);

  return (

    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">

      <div className="bg-white rounded-[2rem] w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

        {/* Header */}

        <div className="bg-blue-950 p-6 text-white shrink-0">

          <div className="flex justify-between items-start">

            <div>

              <h2 className="text-lg font-black">AutoFiscalização — OS: {os.nr_ordem}</h2>

              <p className="text-blue-200 text-sm font-bold mt-1">{os.equipe} • {os.base} • {os.tipo_veiculo}</p>

            </div>

            <button onClick={onCancel} className="text-white/60 hover:text-white"><X size={22} /></button>

          </div>

          {/* Timeline */}

          <div className="mt-4 bg-white/10 rounded-xl p-3 flex items-center justify-between text-xs font-bold">

            {[

              { label: 'Despachada', time: fmtTime(os.despachada) },

              { label: 'A Caminho', time: fmtTime(os.a_caminho) },

              { label: 'No Local', time: fmtTime(os.no_local) },

              { label: 'Liberada', time: fmtTime(os.liberada) }

            ].map((step, i) => (

              <React.Fragment key={i}>

                {i > 0 && <ChevronRight size={14} className="text-white/30" />}

                <div className="text-center">

                  <p className="text-white/50 text-[9px] uppercase">{step.label}</p>

                  <p className="text-white font-black">{step.time}</p>

                </div>

              </React.Fragment>

            ))}

            <div className="bg-emerald-500/30 text-emerald-300 px-2 py-1 rounded-lg font-black">{os.minutos} min</div>

          </div>

        </div>

        {/* Form Body */}

        <div className="flex-1 overflow-y-auto p-6 space-y-5">

          {/* Conform Selection */}

          <div>

            <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Parecer da Inspeção</label>

            <div className="flex gap-3 mt-2">

              <button onClick={() => setIsConform(true)} className={`flex-1 py-3 rounded-xl font-black transition-all border-2 flex items-center justify-center gap-2 ${isConform === true ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 text-slate-500'}`}>

                <CheckCircle size={18} /> Conforme

              </button>

              <button onClick={() => setIsConform(false)} className={`flex-1 py-3 rounded-xl font-black transition-all border-2 flex items-center justify-center gap-2 ${isConform === false ? 'border-rose-500 bg-rose-50 text-rose-700' : 'border-slate-200 text-slate-500'}`}>

                <XCircle size={18} /> Não Conforme

              </button>

            </div>

          </div>

          {/* Team Members with Colab AutoComplete */}

          <div>

            <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Integrantes da Equipe</label>

            <div className="relative mt-2">

              <div className="flex gap-2">

                <input

                  type="text"

                  placeholder="Pesquisar nome do colaborador..."

                  value={memberInput}

                  onChange={e => setMemberInput(e.target.value)}

                  className="flex-1 p-2.5 bg-slate-50 rounded-xl border border-slate-200 font-bold text-sm text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500"

                />

                <button

                  onClick={() => addMemberName(memberInput)}

                  className="bg-emerald-100 text-emerald-700 px-3 rounded-xl hover:bg-emerald-200 transition-colors"

                >

                  <Plus size={18} />

                </button>

              </div>

              {/* Suggestions Dropdown */}

              {(suggestions.length > 0 || memberInput.trim().length >= 2) && (

                <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-50 max-h-48 overflow-y-auto divide-y divide-slate-100">

                  {suggestions.map(c => (

                    <div

                      key={c.id}

                      onClick={() => addMemberName(c.nome)}

                      className="p-3 hover:bg-emerald-50 cursor-pointer font-bold text-xs text-slate-700 flex justify-between items-center"

                    >

                      <span>{c.nome}</span>

                      <span className="text-[10px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{c.funcao || 'Colaborador'}</span>

                    </div>

                  ))}

                  <div

                    onClick={() => setShowAddColabModal(true)}

                    className="p-3 hover:bg-slate-50 cursor-pointer font-bold text-xs text-emerald-600 flex items-center gap-1.5"

                  >

                    <UserPlus size={14} />

                    <span>Não encontrou? Cadastrar novo Colaborador</span>

                  </div>

                </div>

              )}

            </div>

            <div className="flex flex-wrap gap-2 mt-2">

              {members.map((m, i) => (

                <span key={i} className="bg-slate-100 text-slate-700 text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5">

                  {m} <button onClick={() => setMembers(members.filter((_, j) => j !== i))} className="text-slate-400 hover:text-rose-500"><X size={12} /></button>

                </span>

              ))}

            </div>

          </div>

          {/* Photos */}

          <div>

            <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Evidências (4 Prints Obrigatórios)</label>

            <div className="grid grid-cols-2 gap-3 mt-2">

              {REQUIRED_PHOTOS_LABELS.map(p => (

                <label key={p.id} className={`relative border-2 border-dashed rounded-xl p-4 flex flex-col items-center justify-center text-center h-28 cursor-pointer transition-all ${photoUrls[p.id] ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-300 text-slate-500 hover:border-emerald-300'}`}>

                  <input type="file" accept="image/*" className="hidden" onChange={e => e.target.files[0] && handlePhoto(p.id, e.target.files[0])} />

                  {photoUrls[p.id] ? <CheckCircle size={24} className="mb-1" /> : <Camera size={24} className="mb-1 opacity-50" />}

                  <span className="text-[10px] font-black uppercase leading-tight">{p.label}</span>

                  {photoFiles[p.id] && <span className="text-[9px] text-emerald-600 mt-0.5 truncate max-w-full">{photoFiles[p.id].name}</span>}

                </label>

              ))}

            </div>

          </div>

          {/* Campo de Comentário */}

          <div>

            <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Observações/Comentários da Inspeção</label>

            <textarea

              value={notes}

              onChange={e => setNotes(e.target.value)}

              placeholder="Adicione observações ou comentários relevantes sobre esta inspeção..."

              className="w-full mt-2 p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500 h-20 resize-none shadow-inner"

            />

          </div>

        </div>

        {/* Footer */}

        <div className="p-5 bg-slate-50 border-t border-slate-200 flex justify-end gap-3 shrink-0">

          <button onClick={onCancel} className="px-5 py-2.5 text-slate-500 font-bold hover:bg-slate-200 rounded-xl transition-colors">Cancelar</button>

          <button onClick={handleSubmit} disabled={saving || uploading} className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-black rounded-xl shadow-lg transition-all flex items-center gap-2">

            {saving ? 'Salvando...' : 'Registrar AutoFiscalização'} <FileSignature size={16} />

          </button>

        </div>

      </div>

      {/* Sub-modal: Quick Collaborator Registration */}

      {showAddColabModal && (

        <ModalCadastrarColaboradorRapid

          initialName={memberInput}

          regional={os.regional || activeRegional || 'Norte'}

          onClose={() => setShowAddColabModal(false)}

          onSave={async (colabData) => {

            const { error } = await supabase.from('colaboradores').insert([colabData]);

            if (error) return alert('Erro ao salvar no Supabase: ' + error.message);

            setColaboradoresList(p => [...p, colabData]);

            addMemberName(colabData.nome);

            setShowAddColabModal(false);

          }}

        />

      )}

    </div>

  );

}

// ── QUICK COLLABORATOR REGISTRATION SUB-MODAL ────────────────

function ModalCadastrarColaboradorRapid({ initialName, regional, onClose, onSave }) {

  const [nome, setNome] = useState(initialName || '');

  const [matricula, setMatricula] = useState('');

  const [funcao, setFuncao] = useState('Eletricista');

  const [selectedRegional, setSelectedRegional] = useState(regional || 'Norte');

  const handleSubmit = (e) => {

    e.preventDefault();

    if (!nome.trim() || !matricula.trim()) return alert('Preencha o nome e a matrícula.');

    onSave({

      id: Date.now(),

      nome: nome.trim(),

      matricula: matricula.trim(),

      regional: selectedRegional,

      funcao: funcao.trim(),

      statusForca: 'Ativo na Força'

    });

  };

  return (

    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">

      <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">

        <div className="p-5 bg-emerald-600 text-white flex justify-between items-center shrink-0">

          <h3 className="font-black text-sm">Cadastro Rápido de Colaborador</h3>

          <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-full"><X size={18} /></button>

        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">

          <div>

            <label className="text-[10px] font-black uppercase text-slate-400">Nome Completo</label>

            <input type="text" value={nome} onChange={e => setNome(e.target.value)} className="w-full mt-1 p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500" />

          </div>

          <div>

            <label className="text-[10px] font-black uppercase text-slate-400">Matrícula</label>

            <input type="text" value={matricula} onChange={e => setMatricula(e.target.value)} className="w-full mt-1 p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500" />

          </div>

          <div>

            <label className="text-[10px] font-black uppercase text-slate-400">Função</label>

            <input type="text" value={funcao} onChange={e => setFuncao(e.target.value)} className="w-full mt-1 p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500" />

          </div>

          <div>

            <label className="text-[10px] font-black uppercase text-slate-400">Regional</label>

            <select value={selectedRegional} onChange={e => setSelectedRegional(e.target.value)} className="w-full mt-1 p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500">

              <option value="Norte">Norte</option>

              <option value="Leste">Leste</option>

              <option value="Sul">Sul</option>

              <option value="Oeste">Oeste</option>

            </select>

          </div>

          <div className="flex justify-end gap-2 pt-2">

            <button type="button" onClick={onClose} className="px-4 py-2 text-slate-500 font-bold hover:bg-slate-100 rounded-xl">Cancelar</button>

            <button type="submit" className="px-5 py-2 bg-emerald-600 text-white font-black rounded-xl hover:bg-emerald-700 transition-colors shadow-md">Salvar</button>

          </div>

        </form>

      </div>

    </div>

  );

}

// ── OS DETAILS MODAL (WITH SYSTEM ACTIONS HISTORIC LOG) ───────

function ModalDetalhesOS({ os, onClose, inspecoes, workflows, fieldAudits }) {

  const fields = [

    { label: 'OS', val: os.nr_ordem },

    { label: 'Data', val: fmtDateBR(os.data) },

    { label: 'Equipe', val: os.equipe },

    { label: 'Base Ajustada', val: os.base },

    { label: 'Tipo Veículo', val: os.tipo_veiculo },

    { label: 'Tipo Equipe', val: os.tipo_equipe },

    { label: 'Atuação', val: os.atuacao },

    { label: 'Classe Ajustada', val: os.classe },

    { label: 'Causa Ajustado', val: os.descricao_causa },

    { label: 'Período', val: os.periodo },

    { label: 'Base Contrato', val: os.base_contrato },

    { label: 'Chave Única OS', val: os.chave_unica_os },

    { label: 'Chave Única', val: os.chave_unica },

  ];

  // Merge histories

  const insp = inspecoes.find(i => i.osid === os.nr_ordem);

  const wf = workflows.find(w => w.osid === os.nr_ordem);

  const fa = fieldAudits.find(f => f.inspid === insp?.inspid);

  const allLogs = [];

  if (insp?.historico) allLogs.push(...insp.historico);

  if (wf?.historico) allLogs.push(...wf.historico);

  if (fa?.historico) allLogs.push(...fa.historico);

  const uniqueLogs = Array.from(new Map(allLogs.map(l => [l.id || l.data, l])).values())

    .sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime());

  return (

    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">

      <div className="bg-white rounded-[2rem] w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

        {/* Header */}

        <div className="p-6 bg-blue-950 text-white flex justify-between items-center shrink-0">

          <div>

            <h3 className="text-xl font-black">Detalhes Completos — OS: {os.nr_ordem}</h3>

            {os.status_fisc && (

              <span className={`inline-block mt-1 px-2.5 py-0.5 text-[9px] font-black uppercase rounded-full ${os.status_fisc === 'CONCLUIDO' ? 'bg-emerald-500/20 text-emerald-300' : os.status_fisc === 'INICIADO' ? 'bg-blue-500/20 text-blue-300' : 'bg-amber-500/20 text-amber-300'}`}>

                {os.status_fisc}

              </span>

            )}

          </div>

          <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-full transition-colors text-white/70 hover:text-white"><X size={22} /></button>

        </div>

        {/* Content */}

        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* Times Workflow Stepper */}

          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5">

            <h4 className="font-black text-[10px] uppercase tracking-wider text-slate-400 mb-4">Linha do Tempo da Operação</h4>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-3 md:gap-2 items-center">

              {[

                { label: 'Despachada', time: fmtTime(os.despachada), icon: <Zap size={14} className="text-amber-500" /> },

                { label: 'A Caminho', time: fmtTime(os.a_caminho), icon: <Navigation size={14} className="text-blue-500" /> },

                { label: 'No Local', time: fmtTime(os.no_local), icon: <MapPin size={14} className="text-rose-500" /> },

                { label: 'Liberada', time: fmtTime(os.liberada), icon: <CheckCircle2 size={14} className="text-emerald-500" /> }

              ].map((step, idx) => (

                <div key={idx} className="flex flex-col md:flex-row items-center w-full">

                  <div className="flex items-center gap-2.5 bg-white p-3 rounded-xl border border-slate-150 shadow-sm w-full md:w-auto md:flex-1 min-h-[52px]">

                    <div className="p-1.5 bg-slate-50 rounded-lg shrink-0">

                      {step.icon}

                    </div>

                    <div className="truncate">

                      <p className="text-[9px] text-slate-400 uppercase tracking-wider font-bold">{step.label}</p>

                      <p className="text-slate-700 font-black text-xs mt-0.5">{step.time}</p>

                    </div>

                  </div>

                  {/* Conector */}

                  {idx < 3 && (

                    <div className="flex items-center justify-center shrink-0 w-8 h-8 md:w-auto md:h-auto md:px-1">

                      <span className="block md:hidden text-slate-300 font-black text-lg leading-none">↓</span>

                      <span className="hidden md:block text-slate-300 font-black text-lg leading-none">→</span>

                    </div>

                  )}

                </div>

              ))}

              {/* Duração Card */}

              <div className="flex flex-row md:flex-col items-center justify-between md:justify-center bg-emerald-600 text-white p-3 rounded-xl shadow-md w-full min-h-[52px]">

                <div className="text-left md:text-center">

                  <p className="text-[9px] text-emerald-100 uppercase tracking-widest font-black">Duração Total</p>

                  <p className="text-sm font-black mt-0.5 leading-none">{os.minutos} min</p>

                </div>

                <div className="block md:hidden bg-white/20 p-1.5 rounded-lg">

                  <Clock size={16} />

                </div>

              </div>

            </div>

          </div>

          {/* OS Fields Grid */}

          <div>

            <h4 className="font-black text-slate-800 text-sm mb-3 border-b pb-1">Dados da OS</h4>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">

              {fields.map((f, idx) => (

                <div key={idx} className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">

                  <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">{f.label}</p>

                  <p className="font-bold text-xs text-slate-700 mt-0.5 truncate" title={f.val}>{f.val || '--'}</p>

                </div>

              ))}

              {os.endereco_cliente && (

                <div className="col-span-2 sm:col-span-3">

                  <a href={os.endereco_cliente} target="_blank" rel="noopener noreferrer" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs py-3.5 rounded-xl flex items-center justify-center gap-2 shadow-md transition-colors">

                    <Navigation size={14} /> Abrir Localização do Cliente no Google Maps

                  </a>

                </div>

              )}

            </div>

          </div>

          {/* Autodiagnostic Execution Info */}

          {os.fisc_started_at && (

            <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-xl">

              <h4 className="font-black text-emerald-800 text-xs mb-2">Tempos da AutoFiscalização</h4>

              <div className="grid grid-cols-2 gap-4 text-xs font-bold text-emerald-700">

                <div>Iniciada em: <span className="text-slate-700">{fmtDateTimeBR(os.fisc_started_at)}</span></div>

                <div>Concluída em: <span className="text-slate-700">{fmtDateTimeBR(os.fisc_finished_at)}</span></div>

                <div className="col-span-2">Duração do Preenchimento: <span className="text-blue-700 font-black">{calcFiscDuration(os.fisc_started_at, os.fisc_finished_at)}</span></div>

              </div>

            </div>

          )}

          {/* Actions Log History */}

          <div>

            <h4 className="font-black text-slate-800 text-sm mb-3 border-b pb-1">Histórico de Movimentações</h4>

            <div className="space-y-3">

              {uniqueLogs.map((log, i) => (

                <div key={log.id || i} className="flex gap-3 p-3 bg-slate-50 border border-slate-100 rounded-2xl animate-in slide-in-from-bottom-2">

                  <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full mt-1.5 shrink-0 shadow-sm" />

                  <div className="flex-1">

                    <div className="flex justify-between items-start">

                      <p className="text-xs font-black text-slate-800">{log.acao}</p>

                      <span className="text-[9px] font-bold text-slate-400">{fmtDateTimeBR(log.data)}</span>

                    </div>

                    <p className="text-xs text-slate-500 mt-0.5">{log.detalhes}</p>

                    <p className="text-[9px] font-black uppercase text-slate-400 mt-1">Autor: {log.usuario}</p>

                  </div>

                </div>

              ))}

              {uniqueLogs.length === 0 && (

                <p className="text-xs text-slate-400 font-bold text-center py-4">Nenhuma movimentação ou ação registrada para esta ordem de serviço.</p>

              )}

            </div>

          </div>

        </div>

        {/* Footer */}

        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end shrink-0">

          <button onClick={onClose} className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl shadow-md">Fechar</button>

        </div>

      </div>

    </div>

  );

}

// ── WORKFLOWS SCREEN ────────────────────────────────────────

function WorkflowsScreen({ workflows, fieldAudits, inspecoes, ordens, onSelectWorkflow }) {

  const [filterStatus, setFilterStatus] = useState('');

  const enriched = workflows.map(wf => {

    const insp = inspecoes.find(i => i.inspid === wf.inspid);

    const os = ordens.find(o => o.nr_ordem === wf.osid);

    const fa = fieldAudits.find(f => f.inspid === wf.inspid);

    const steps = [];

    steps.push({ label: 'Sistema', done: true, icon: <Tv size={14} /> });

    steps.push({ label: 'Feedback', done: Boolean(wf.feedback_done), icon: <ClipboardCheck size={14} /> });

    if (wf.field_audit_required) {

      const faDone = fa?.status === 'completed' || (wf.historico || []).some(h => h.acao === 'AUDITORIA_CAMPO_CONCLUIDA');

      steps.push({ label: 'Campo', done: Boolean(faDone), icon: <MapPin size={14} /> });

    }

    const allStepsDone = steps.length > 0 && steps.every(s => s.done);

    const isFinishedComputed = Boolean(wf.is_finished || allStepsDone);

    return { ...wf, insp, os, fa, steps, is_finished: isFinishedComputed };

  });

  const filtered = enriched.filter(w => {

    if (filterStatus === 'ativos') return !w.is_finished;

    if (filterStatus === 'finalizados') return w.is_finished;

    return true;

  });

  return (

    <div className="animate-in fade-in duration-300">

      <div className="flex justify-between items-end mb-6">

        <div>

          <h2 className="text-2xl font-black text-blue-950">Acompanhamento de Workflows</h2>

          <p className="text-slate-500 text-sm font-medium mt-1">Pipeline: Sistema → Feedback → Campo</p>

        </div>

        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="px-4 py-2.5 bg-white rounded-xl border border-slate-200 text-sm font-bold text-slate-600 outline-none shadow-sm">

          <option value="">Todos ({enriched.length})</option>

          <option value="ativos">Ativos ({enriched.filter(w => !w.is_finished).length})</option>

          <option value="finalizados">Finalizados ({enriched.filter(w => w.is_finished).length})</option>

        </select>

      </div>

      <div className="space-y-4">

        {filtered.length === 0 && <p className="text-center text-slate-400 font-bold py-12">Nenhum workflow encontrado.</p>}

        {filtered.map(wf => {

          const completedCount = wf.steps.filter(s => s.done).length;

          const totalCount = wf.steps.length;

          const pctProgress = Math.round((completedCount / totalCount) * 100);

          return (

            <div 

              key={wf.inspid} 

              onClick={() => onSelectWorkflow(wf)} 

              className="group relative bg-white dark:bg-slate-900 rounded-[2rem] p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-xl hover:border-emerald-500/40 transition-all duration-300 cursor-pointer overflow-hidden"

            >

              {/* Decorative ambient background glow */}

              <div className="absolute -right-16 -top-16 w-32 h-32 bg-gradient-to-br from-emerald-500/10 to-teal-500/0 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-500 pointer-events-none" />

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 relative z-10">

                <div>

                  <div className="flex items-center gap-2 mb-2 flex-wrap">

                    <span className={`text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full border ${

                      wf.is_conform 

                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200/60 dark:bg-emerald-950/40 dark:text-emerald-300' 

                        : 'bg-rose-50 text-rose-700 border-rose-200/60 dark:bg-rose-950/40 dark:text-rose-300'

                    }`}>

                      {wf.is_conform ? '✓ Conforme' : '⚠ Não Conforme'}

                    </span>

                    <span className={`text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full border flex items-center gap-1.5 ${

                      wf.is_finished 

                        ? 'bg-blue-50 text-blue-700 border-blue-200/60 dark:bg-blue-950/40 dark:text-blue-300' 

                        : 'bg-amber-50 text-amber-700 border-amber-200/60 dark:bg-amber-950/40 dark:text-amber-300'

                    }`}>

                      {!wf.is_finished && <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />}

                      {wf.is_finished ? 'Finalizado' : 'Em Execução'}

                    </span>

                    {wf.regional && (

                      <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">

                        {wf.regional}

                      </span>

                    )}

                  </div>

                  <h4 className="text-lg font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">

                    OS: <span className="text-emerald-600 dark:text-emerald-400">{wf.osid}</span>

                    <span className="text-xs text-slate-400 font-bold font-mono">({wf.inspid})</span>

                  </h4>

                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">

                    {wf.os?.equipe || 'Equipe não alocada'} • {wf.os?.base || 'Base N/I'}

                  </p>

                </div>

                <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">

                  <div className="text-right hidden sm:block">

                    <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block">Progresso</span>

                    <span className="text-sm font-black text-slate-700 dark:text-slate-200 font-mono">{pctProgress}%</span>

                  </div>

                  <div className="w-10 h-10 rounded-2xl bg-slate-50 dark:bg-slate-800 group-hover:bg-emerald-600 text-slate-400 group-hover:text-white flex items-center justify-center transition-all duration-300 shadow-sm border border-slate-200/60 dark:border-slate-700 group-hover:border-emerald-600 group-hover:scale-105">

                    <ChevronRight size={20} className="group-hover:translate-x-0.5 transition-transform" />

                  </div>

                </div>

              </div>

              {/* ULTRA-PREMIUM BULLETPROOF FLEX STEPPER */}

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80 relative z-10">

                <div className="flex items-center justify-between gap-2">

                  {wf.steps.map((step, idx) => {

                    const isDone = step.done;

                    const isLast = idx === wf.steps.length - 1;

                    const nextDone = !isLast && wf.steps[idx + 1].done;

                    return (

                      <React.Fragment key={idx}>

                        {/* STEP ITEM */}

                        <div className="flex items-center gap-2.5">

                          <div className={`w-9 h-9 rounded-2xl flex items-center justify-center transition-all duration-300 font-bold shrink-0 border-2 ${

                            isDone

                              ? 'bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-500/20 scale-105'

                              : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-700'

                          }`}>

                            {isDone ? <Check size={16} className="stroke-[3]" /> : step.icon}

                          </div>

                          <div>

                            <span className={`block text-[11px] font-black uppercase tracking-wider leading-none ${

                              isDone ? 'text-slate-800 dark:text-slate-200' : 'text-slate-400 dark:text-slate-500'

                            }`}>

                              {step.label}

                            </span>

                            <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 mt-0.5 block">

                              {isDone ? 'Concluído' : 'Pendente'}

                            </span>

                          </div>

                        </div>

                        {/* CONNECTOR LINE BETWEEN STEPS */}

                        {!isLast && (

                          <div className="flex-1 px-2 flex items-center">

                            <div className="w-full h-[3px] rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden relative">

                              <div 

                                className={`h-full transition-all duration-500 rounded-full ${

                                  isDone && nextDone 

                                    ? 'bg-emerald-500 w-full' 

                                    : isDone 

                                      ? 'bg-gradient-to-r from-emerald-500 to-amber-400 w-1/2' 

                                      : 'w-0'

                                }`}

                              />

                            </div>

                          </div>

                        )}

                      </React.Fragment>

                    );

                  })}

                </div>

              </div>

            </div>

          );

        })}

      </div>

    </div>

  );

}

function WorkflowDetailScreen({ workflow, fieldAudits, inspecoes, ordens, onBack, onSubmitFeedback, onRequestFieldAudit, currentUser }) {

  const [feedbackNotes, setFeedbackNotes] = useState(workflow.feedback_notes || '');

  const [fotoEquipeUrl, setFotoEquipeUrl] = useState('');

  const [fotoMedidaUrl, setFotoMedidaUrl] = useState('');

  const [uploadingEquipe, setUploadingEquipe] = useState(false);

  const [uploadingMedida, setUploadingMedida] = useState(false);

  const insp = inspecoes.find(i => i.inspid === workflow.inspid);

  const os = ordens.find(o => o.nr_ordem === workflow.osid);

  const fa = fieldAudits.find(f => f.inspid === workflow.inspid);

  const handleGeneratePDF = (wf, type = 'print') => {

    const itemInsp = inspecoes.find(i => i.inspid === wf.inspid);

    const itemOs = ordens.find(o => o.nr_ordem === wf.osid);

    const itemFa = fieldAudits.find(f => f.inspid === wf.inspid);

    const titleStr = `Laudo_AutoFiscalizacao_${wf.osid}`;

    let htmlContent = `

      <!DOCTYPE html>

      <html>

      <head>

        <title>${titleStr}</title>

        <meta charset="utf-8" />

        <script src="https://cdn.tailwindcss.com"></script>

        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;800;900&display=swap" rel="stylesheet">

        <style>

          body {

            font-family: 'Outfit', sans-serif;

            background-color: #ffffff;

            color: #1e293b;

            margin: 0;

            padding: 15px;

            -webkit-print-color-adjust: exact;

            print-color-adjust: exact;

          }

          @media print {

            body { padding: 0; }

            .no-print { display: none; }

            .page-break { page-break-before: always; }

          }

        </style>

      </head>

      <body class="p-6">

        <!-- HEADER -->

        <div class="flex justify-between items-start border-b-4 border-blue-600 pb-4 mb-6">

          <div>

            <div class="flex items-center gap-2">

              <span class="bg-blue-600 text-white font-black text-[9px] px-2.5 py-1 rounded-lg uppercase tracking-wider">Relatório Oficial de Campo</span>

              <span class="text-[9px] text-slate-400 font-mono">ID: ${wf.inspid}</span>

            </div>

            <h1 class="text-xl font-black text-slate-800 tracking-tight mt-1.5 uppercase">Relatório de AutoFiscalização</h1>

            <p class="text-xs text-slate-500 font-bold mt-0.5">Cliente: ENEL Distribuição</p>

          </div>

          <div class="text-right">

            <span class="text-xl font-black text-blue-900 block font-mono">OS: ${wf.osid}</span>

            <span class="inline-block bg-slate-100 text-slate-700 text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded border mt-1">

              ${wf.is_conform ? 'Sistêmica Conforme' : 'Sistêmica Não Conforme'}

            </span>

          </div>

        </div>

        <!-- METADADOS DA ORDEM -->

        <div class="bg-slate-50 border border-slate-200 rounded-3xl p-5 mb-5 shadow-sm">

          <h3 class="text-xs font-black text-slate-450 uppercase tracking-widest mb-3 border-b pb-1.5">Dados da Ordem de Serviço</h3>

          <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">

            <div>

              <span class="text-slate-400 font-bold block uppercase text-[8px]">Base / Contrato</span>

              <span class="font-bold text-slate-800 mt-0.5 block">${itemOs?.base || '--'} • ${itemOs?.base_contrato || '--'}</span>

            </div>

            <div>

              <span class="text-slate-400 font-bold block uppercase text-[8px]">Equipe Responsável</span>

              <span class="font-bold text-slate-800 mt-0.5 block">${itemOs?.equipe || '--'} (${itemOs?.tipo_equipe || '--'})</span>

            </div>

            <div>

              <span class="text-slate-400 font-bold block uppercase text-[8px]">Atuação / Turno</span>

              <span class="font-bold text-slate-800 mt-0.5 block">${itemOs?.atuacao || '--'} • ${itemOs?.turno || '--'}</span>

            </div>

            <div>

              <span class="text-slate-400 font-bold block uppercase text-[8px]">Tipo Veículo</span>

              <span class="font-bold text-slate-800 mt-0.5 block">${itemOs?.tipo_veiculo || '--'}</span>

            </div>

          </div>

        </div>

        <!-- ETAPA 1 -->

        <div class="border border-slate-200 rounded-3xl p-5 mb-5 shadow-sm bg-white">

          <div class="flex items-center justify-between border-b pb-3 mb-4">

            <h2 class="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">

              <span class="w-5 h-5 bg-blue-600 text-white rounded-lg flex items-center justify-center text-[10px] font-black">1</span>

              Etapa 1: Inspeção Sistêmica (D-1)

            </h2>

            <span class="text-[9px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full uppercase">Concluído</span>

          </div>

          <div class="grid grid-cols-2 md:grid-cols-3 gap-4 text-xs mb-4">

            <div>

              <span class="text-slate-400 font-bold block uppercase text-[8px]">Inspetor Responsável</span>

              <span class="font-bold text-slate-800 mt-0.5 block">${itemInsp ? formatUserFriendlyName(itemInsp.inspector) : '--'}</span>

            </div>

            <div>

              <span class="text-slate-400 font-bold block uppercase text-[8px]">Data da Inspeção</span>

              <span class="font-bold text-slate-800 mt-0.5 block">${itemInsp ? fmtDateTimeBR(itemInsp.timestamp) : '--'}</span>

            </div>

            <div class="col-span-2 md:col-span-1">

              <span class="text-slate-400 font-bold block uppercase text-[8px]">Colaboradores da Equipe</span>

              <span class="font-bold text-slate-800 mt-0.5 block">${itemInsp?.team_members && itemInsp.team_members.length > 0 ? itemInsp.team_members.join(', ') : '--'}</span>

            </div>

          </div>

          ${itemInsp?.notes ? `

            <div class="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs text-slate-600 italic mb-4 leading-relaxed">

              <span class="block text-[8px] font-black uppercase text-slate-400 tracking-wider not-italic mb-1">Notas da Inspeção</span>

              "${itemInsp.notes}"

            </div>

          ` : ''}

          <!-- Fotos Etapa 1 (Ampliado para 2 colunas para melhor visualização) -->

          ${itemInsp?.photos && Object.keys(itemInsp.photos).length > 0 ? `

            <div class="mt-4">

              <span class="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-3">Evidências da Inspeção (D-1)</span>

              <div class="grid grid-cols-2 gap-4">

                ${Object.entries(itemInsp.photos).map(([key, url]) => `

                  <div class="border border-slate-200 rounded-2xl overflow-hidden bg-slate-50 shadow-sm">

                    <img src="${url}" class="w-full h-56 object-cover" />

                    <p class="text-[8px] font-black text-center uppercase text-slate-500 py-2 bg-slate-100 border-t border-slate-200">

                      ${key === 'fachada' ? 'Fachada' : key === 'defeito' ? 'Defeito' : key === 'reparo' ? 'Reparo' : 'Medição'}

                    </p>

                  </div>

                `).join('')}

              </div>

            </div>

          ` : ''}

        </div>

        <!-- ETAPA 2 -->

        <div class="border border-slate-200 rounded-3xl p-5 mb-5 shadow-sm bg-white page-break">

          <div class="flex items-center justify-between border-b pb-3 mb-4">

            <h2 class="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">

              <span class="w-5 h-5 bg-indigo-600 text-white rounded-lg flex items-center justify-center text-[10px] font-black">2</span>

              Etapa 2: Tratativa de Desvio / Feedback

            </h2>

            <span class="text-[9px] font-black ${wf.feedback_done ? 'text-emerald-600 bg-emerald-50' : 'text-amber-600 bg-amber-50'} px-2 py-0.5 rounded-full uppercase">

              ${wf.feedback_done ? 'Concluído' : 'Pendente'}

            </span>

          </div>

          ${wf.feedback_done ? `

            <div class="space-y-4">

              <div class="grid grid-cols-2 gap-4 text-xs">

                <div>

                  <span class="text-slate-400 font-bold block uppercase text-[8px]">Registrado por</span>

                  <span class="font-bold text-slate-800 mt-0.5 block">${wf.feedback_by || '--'}</span>

                </div>

                <div>

                  <span class="text-slate-400 font-bold block uppercase text-[8px]">Data da Tratativa</span>

                  <span class="font-bold text-slate-800 mt-0.5 block">${wf.feedback_date ? fmtDateTimeBR(wf.feedback_date) : '--'}</span>

                </div>

              </div>

              <div class="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs text-slate-600 leading-relaxed italic">

                <span class="block text-[8px] font-black uppercase text-slate-400 tracking-wider not-italic mb-1">Ações Corretivas Executadas</span>

                "${wf.feedback_notes}"

              </div>

              <!-- Fotos Feedback (Ampliado) -->

              ${wf.feedback_photos && (wf.feedback_photos.foto_equipe || wf.feedback_photos.foto_medida) ? `

                <div class="mt-4">

                  <span class="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-3">Comprovações Físicas do Feedback</span>

                  <div class="grid grid-cols-2 gap-4">

                    ${wf.feedback_photos.foto_equipe ? `

                      <div class="border border-slate-200 rounded-2xl overflow-hidden bg-slate-50 shadow-sm">

                        <img src="${wf.feedback_photos.foto_equipe}" class="w-full h-64 object-cover" />

                        <p class="text-[8px] font-black text-center uppercase text-slate-500 py-2 bg-slate-100 border-t border-slate-200">Reunião / Instrução com a Equipe</p>

                      </div>

                    ` : ''}

                    ${wf.feedback_photos.foto_medida ? `

                      <div class="border border-slate-200 rounded-2xl overflow-hidden bg-slate-50 shadow-sm">

                        <img src="${wf.feedback_photos.foto_medida}" class="w-full h-64 object-cover" />

                        <p class="text-[8px] font-black text-center uppercase text-slate-500 py-2 bg-slate-100 border-t border-slate-200">Medida Disciplinar Assinada</p>

                      </div>

                    ` : ''}

                  </div>

                </div>

              ` : ''}

            </div>

          ` : `

            <p class="text-xs text-slate-400 italic">Tratativa de feedback pendente para esta inspeção.</p>

          `}

        </div>

        <!-- ETAPA 3 -->

        <div class="border border-slate-200 rounded-3xl p-5 mb-5 shadow-sm bg-white page-break">

          <div class="flex items-center justify-between border-b pb-3 mb-4">

            <h2 class="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">

              <span class="w-5 h-5 bg-purple-600 text-white rounded-lg flex items-center justify-center text-[10px] font-black">3</span>

              Etapa 3: Auditoria Física em Campo

            </h2>

            <span class="text-[9px] font-black ${!wf.field_audit_required

        ? 'text-slate-400 bg-slate-50'

        : itemFa?.status === 'completed'

          ? 'text-blue-600 bg-blue-50'

          : 'text-amber-600 bg-amber-50'

      } px-2 py-0.5 rounded-full uppercase">

              ${!wf.field_audit_required ? 'Não Solicitado' : itemFa?.status === 'completed' ? 'Concluído' : 'Em Andamento'}

            </span>

          </div>

          ${itemFa ? `

            <div class="space-y-4">

              <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">

                <div>

                  <span class="text-slate-400 font-bold block uppercase text-[8px]">Auditor Responsável</span>

                  <span class="font-bold text-slate-800 mt-0.5 block">${formatUserFriendlyName(itemFa.auditor)}</span>

                </div>

                <div>

                  <span class="text-slate-400 font-bold block uppercase text-[8px]">Atividade Executada</span>

                  <span class="font-bold text-slate-800 mt-0.5 block">${itemFa.executed ? 'Confirmada (Sim)' : 'Não Confirmada (Não)'}</span>

                </div>

                <div>

                  <span class="text-slate-400 font-bold block uppercase text-[8px]">Acesso à Residência</span>

                  <span class="font-bold text-slate-800 mt-0.5 block">${itemFa.access ? 'Sim' : 'Não'}</span>

                </div>

                <div>

                  <span class="text-slate-400 font-bold block uppercase text-[8px]">Período de Auditoria</span>

                  <span class="font-bold text-slate-800 mt-0.5 block">${itemFa.end_time ? fmtDateTimeBR(itemFa.end_time) : '--'}</span>

                </div>

              </div>

              <div class="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs text-slate-750">

                <span class="block text-[8px] font-black uppercase text-slate-400 tracking-wider mb-1">Endereço Confirmado no Local</span>

                <span class="font-bold text-slate-800">

                  CEP: ${itemFa.address?.cep || '--'} | Rua: ${itemFa.address?.street || '--'} | Nº: ${itemFa.address?.number || '--'}

                  ${itemFa.address?.complement ? ` (${itemFa.address.complement})` : ''}

                </span>

              </div>

              <!-- Fotos Auditoria (Ampliado para 2 colunas) -->

              ${itemFa.photos && Object.keys(itemFa.photos).length > 0 ? `

                <div class="mt-4">

                  <span class="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-3">Fotos de Evidência Física</span>

                  <div class="grid grid-cols-2 gap-4">

                    ${Object.entries(itemFa.photos).map(([key, url]) => `

                      <div class="border border-slate-200 rounded-2xl overflow-hidden bg-slate-50 shadow-sm">

                        <img src="${url}" class="w-full h-56 object-cover" />

                        <p class="text-[8px] font-black text-center uppercase text-slate-500 py-2 bg-slate-100 border-t border-slate-200">

                          ${key === 'fachada' ? 'Fachada' : key === 'posteCia' ? 'Poste CIA' : key === 'posteCliente' ? 'Poste Cliente' : 'CM Medição'}

                        </p>

                      </div>

                    `).join('')}

                  </div>

                </div>

              ` : ''}

              <!-- Telemetria de Auditoria -->

              ${itemFa.telemetry?.geo_lat ? `

                <div class="bg-slate-50 border border-slate-200 rounded-2xl p-4 mt-4">

                  <span class="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-2">Assinatura de Telemetria e Geolocalização</span>

                  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">

                    <div>

                      <img 

                        src="https://static-maps.yandex.ru/1.x/?ll=${itemFa.telemetry.geo_lng},${itemFa.telemetry.geo_lat}&z=15&l=map&size=450,220&pt=${itemFa.telemetry.geo_lng},${itemFa.telemetry.geo_lat},pm2rdm" 

                        class="w-full h-48 rounded-xl border border-slate-200 object-cover shadow-sm"

                        alt="Mapa de Telemetria GPS"

                      />

                    </div>

                    <div class="flex flex-col justify-center space-y-2 text-[9px] font-mono text-slate-500 uppercase">

                      <div><strong class="text-slate-700">Coordenadas:</strong> Lat ${itemFa.telemetry.geo_lat} / Lng ${itemFa.telemetry.geo_lng}</div>

                      <div><strong class="text-slate-700">IP do Auditor:</strong> ${itemFa.telemetry.ip_address || 'n/a'}</div>

                      <div><strong class="text-slate-700">Hardware Fingerprint:</strong> ${itemFa.telemetry.fingerprint?.slice(0, 24)}...</div>

                      <div class="mt-1 leading-normal text-slate-400">Rastreabilidade de campo verificada e validada digitalmente via sinal GPS.</div>

                    </div>

                  </div>

                </div>

              ` : ''}

            </div>

          ` : `

            <p class="text-xs text-slate-400 italic">Auditoria física de campo não solicitada para esta OS.</p>

          `}

        </div>

        <!-- FOOTER / NOTA DE ASSINATURA -->

        <div class="border-t border-slate-200 pt-5 mt-10 text-center text-[10px] text-slate-400 font-bold uppercase tracking-wider">

          <p>Alpitel Energy | Relatório Oficial Gerado Eletronicamente em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}</p>

          <p class="text-[8px] text-slate-350 mt-1 font-mono">Este documento é confidencial e propriedade da Alpitel Energy, emitido exclusivamente para ENEL Distribuição.</p>

        </div>

      </body>

      </html>

    `;

    if (type === 'download') {

      const runDownload = () => {

        const tempDiv = document.createElement('div');

        tempDiv.innerHTML = htmlContent;

        document.body.appendChild(tempDiv);

        const opt = {

          margin: 8,

          filename: `${titleStr}.pdf`,

          image: { type: 'jpeg', quality: 0.98 },

          html2canvas: { useCORS: true, scale: 2, logging: false },

          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }

        };

        window.html2pdf().from(tempDiv).set(opt).save().then(() => {

          document.body.removeChild(tempDiv);

        });

      };

      if (window.html2pdf) {

        runDownload();

      } else {

        const script = document.createElement('script');

        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';

        script.onload = runDownload;

        document.head.appendChild(script);

      }

    } else {

      const iframe = document.createElement('iframe');

      iframe.style.position = 'fixed';

      iframe.style.width = '0px';

      iframe.style.height = '0px';

      iframe.style.border = 'none';

      iframe.style.left = '-1000px';

      iframe.style.top = '-1000px';

      document.body.appendChild(iframe);

      const doc = iframe.contentWindow.document;

      doc.open();

      doc.write(htmlContent);

      doc.close();

      iframe.onload = () => {

        setTimeout(() => {

          iframe.contentWindow.focus();

          iframe.contentWindow.print();

          setTimeout(() => {

            document.body.removeChild(iframe);

          }, 1000);

        }, 1000);

      };

    }

  };

  const handleUploadPhoto = async (file, type) => {

    if (!file) return;

    if (type === 'equipe') setUploadingEquipe(true);

    else setUploadingMedida(true);

    try {

      const ext = file.name.split('.').pop();

      const path = `feedbacks/${workflow.osid}/${Date.now()}_${type}.${ext}`;

      const { data, error } = await supabase.storage

        .from('autofiscalizacao_fotos')

        .upload(path, file);

      if (error) throw error;

      const { data: pubData } = supabase.storage

        .from('autofiscalizacao_fotos')

        .getPublicUrl(path);

      if (type === 'equipe') setFotoEquipeUrl(pubData.publicUrl);

      else setFotoMedidaUrl(pubData.publicUrl);

    } catch (err) {

      console.error(err);

      alert(`Erro no upload: ${err.message}`);

    } finally {

      if (type === 'equipe') setUploadingEquipe(false);

      else setUploadingMedida(false);

    }

  };

  const isSubmitDisabled = !feedbackNotes.trim() || uploadingEquipe || uploadingMedida || (!workflow.is_conform && (!fotoEquipeUrl || !fotoMedidaUrl));

  return (

    <div className="animate-in slide-in-from-right duration-350 ease-out space-y-6">

      {/* Voltar button - Apple style minimal hover */}

      <button

        onClick={onBack}

        className="group flex items-center gap-2 text-slate-550 hover:text-emerald-600 font-bold text-xs uppercase tracking-wider transition-all duration-300 active:scale-95"

      >

        <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> Voltar para Workflows

      </button>

      {/* Main Header Card - Apple Liquid Glass Style */}

      <div className="bg-gradient-to-tr from-white/90 via-white/80 to-white/70 backdrop-blur-xl border border-white/60 shadow-[0_12px_40px_rgba(15,23,42,0.03)] rounded-3xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-5 relative overflow-hidden">

        {/* Glow effect in background */}

        <div className="absolute -top-24 -left-24 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10">

          <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest block mb-1">DETALHES DO TRATAMENTO</span>

          <h2 className="text-3xl font-black text-slate-800 tracking-tight leading-none font-sans">

            OS: <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-900 to-indigo-950 font-black">{workflow.osid}</span>

          </h2>

          <p className="text-slate-500 text-xs font-bold mt-1.5 flex items-center gap-1.5">

            <span className="w-1.5 h-1.5 rounded-full bg-slate-350" /> ID Único: {workflow.inspid}

          </p>

        </div>

        <div className="flex flex-wrap items-center gap-2 relative z-10">

          <button

            onClick={() => handleGeneratePDF(workflow, 'print')}

            className="px-3.5 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider shadow-[0_4px_12px_rgba(0,0,0,0.02)] border bg-slate-800 hover:bg-slate-900 text-white border-slate-700 hover:border-slate-800 transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 duration-150"

          >

            <Download size={12} /> Salvar PDF

          </button>

          <button

            onClick={() => handleGeneratePDF(workflow, 'download')}

            className="px-3.5 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider shadow-[0_4px_12px_rgba(0,0,0,0.02)] border bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-500 hover:border-emerald-600 transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 duration-150 animate-pulse-once"

          >

            <Download size={12} /> Download PDF

          </button>

          <span className={`px-4 py-1.5 rounded-2xl text-[10px] font-black uppercase tracking-wider shadow-[0_4px_12px_rgba(0,0,0,0.02)] border ${workflow.is_conform

            ? 'bg-emerald-600 text-white border-emerald-500'

            : 'bg-rose-600 text-white border-rose-500'

            }`}>

            {workflow.is_conform ? 'Sistêmica Conforme' : 'Sistêmica Não Conforme'}

          </span>

          <span className={`px-4 py-1.5 rounded-2xl text-[10px] font-black uppercase tracking-wider shadow-[0_4px_12px_rgba(0,0,0,0.02)] border ${workflow.is_finished

            ? 'bg-blue-600 text-white border-blue-500'

            : 'bg-amber-500 text-white border-amber-400'

            }`}>

            {workflow.is_finished ? 'Finalizado' : 'Em Execução'}

          </span>

        </div>

      </div>

      {/* Grid of Steps: Left column steps details, Right column actions & timeline */}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left Side: 3 Steps Pipeline (takes 2 cols) */}

        <div className="lg:col-span-2 space-y-6">

          {/* STEP 1 CARD */}

          <div className="bg-gradient-to-tr from-white/95 to-white/80 backdrop-blur-md border border-white/60 shadow-[0_8px_30px_rgba(0,0,0,0.02)] rounded-3xl p-6 relative overflow-hidden group hover:shadow-[0_12px_40px_rgba(0,0,0,0.04)] transition-all duration-300">

            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">

              <h3 className="font-black text-slate-800 flex items-center gap-2.5 text-xs uppercase tracking-wider">

                <span className="w-6 h-6 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center text-[10px] font-black shadow-md shadow-blue-500/20">1</span>

                Etapa 1: Inspeção Sistêmica (D-1)

              </h3>

              <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest bg-emerald-50 px-2.5 py-0.5 rounded-full">Concluído</span>

            </div>

            <div className="space-y-4">

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-slate-50/50 p-4 rounded-2xl border border-slate-100/50">

                <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm flex flex-col justify-center">

                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Status OS</p>

                  <p className={`text-xs font-black mt-0.5 uppercase ${insp?.status === 'Conforme' ? 'text-emerald-600' : 'text-rose-600'}`}>{insp?.status || '--'}</p>

                </div>

                <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm flex flex-col justify-center">

                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Inspetor</p>

                  <p className="text-xs font-bold text-slate-700 mt-0.5">{formatUserFriendlyName(insp?.inspector)}</p>

                </div>

                <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm flex flex-col justify-center">

                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Equipe / Base</p>

                  <p className="text-xs font-bold text-slate-700 mt-0.5">{os?.equipe} • {os?.base}</p>

                </div>

                <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm flex flex-col justify-center">

                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Data do Registro</p>

                  <p className="text-xs font-bold text-slate-700 mt-0.5">{fmtDateTimeBR(insp?.timestamp)}</p>

                </div>

              </div>

              {insp?.notes && (

                <div className="bg-slate-50/30 p-3 rounded-xl border border-slate-100 text-xs font-medium text-slate-650">

                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-1">Notas do Inspetor</span>

                  "{insp.notes}"

                </div>

              )}

              {insp?.photos && Object.keys(insp.photos).length > 0 && (

                <div>

                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-2.5">Evidências Sistêmicas D-1</p>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">

                    {Object.entries(insp.photos).map(([key, url]) => (

                      <div key={key} className="border border-slate-200/60 rounded-2xl overflow-hidden bg-white shadow-sm hover:scale-[1.03] active:scale-[0.98] transition-all duration-300">

                        <a href={url} target="_blank" rel="noopener noreferrer" className="block relative group">

                          <img src={url} alt={key} className="w-full h-20 object-cover" />

                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-[9px] font-black uppercase tracking-wider">Ampliar</div>

                        </a>

                        <p className="text-[8px] font-black text-center uppercase text-slate-500 py-1.5 bg-slate-50/80 border-t border-slate-100 truncate">

                          {key === 'fachada' ? 'Fachada' : key === 'defeito' ? 'Defeito' : key === 'reparo' ? 'Reparo' : 'Medição'}

                        </p>

                      </div>

                    ))}

                  </div>

                </div>

              )}

            </div>

          </div>

          {/* STEP 2 CARD */}

          <div className="bg-gradient-to-tr from-white/95 to-white/80 backdrop-blur-md border border-white/60 shadow-[0_8px_30px_rgba(0,0,0,0.02)] rounded-3xl p-6 relative overflow-hidden group hover:shadow-[0_12px_40px_rgba(0,0,0,0.04)] transition-all duration-300">

            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">

              <h3 className="font-black text-slate-800 flex items-center gap-2.5 text-xs uppercase tracking-wider">

                <span className="w-6 h-6 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center text-[10px] font-black shadow-md shadow-indigo-500/20">2</span>

                Etapa 2: Registro de Feedback

              </h3>

              <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full ${workflow.feedback_done ? 'bg-emerald-550 text-white' : 'bg-amber-500 text-white'

                }`}>

                {workflow.feedback_done ? 'Concluído' : 'Pendente'}

              </span>

            </div>

            {workflow.feedback_done ? (

              <div className="bg-emerald-50/30 p-4.5 rounded-2xl border border-emerald-100/50 space-y-4">

                <div>

                  <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest block mb-1">Feedback de Tratativa de Desvio</span>

                  <p className="text-sm font-bold text-slate-705 leading-relaxed">"{workflow.feedback_notes}"</p>

                </div>

                {workflow.feedback_photos && (workflow.feedback_photos.foto_equipe || workflow.feedback_photos.foto_medida) && (

                  <div>

                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-2">Comprovações Físicas anexadas</span>

                    <div className="grid grid-cols-2 gap-4">

                      {workflow.feedback_photos.foto_equipe && (

                        <div className="border border-emerald-100/70 rounded-2xl overflow-hidden bg-white shadow-sm hover:scale-[1.03] transition-all duration-300">

                          <a href={workflow.feedback_photos.foto_equipe} target="_blank" rel="noopener noreferrer" className="block relative group">

                            <img src={workflow.feedback_photos.foto_equipe} alt="Foto Equipe" className="w-full h-32 object-cover" />

                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-[9px] font-black uppercase">Ampliar</div>

                          </a>

                          <p className="text-[8px] font-black text-center uppercase text-emerald-700 py-2 bg-emerald-50/50 border-t border-emerald-100/30">Foto com a Equipe</p>

                        </div>

                      )}

                      {workflow.feedback_photos.foto_medida && (

                        <div className="border border-emerald-100/70 rounded-2xl overflow-hidden bg-white shadow-sm hover:scale-[1.03] transition-all duration-300">

                          <a href={workflow.feedback_photos.foto_medida} target="_blank" rel="noopener noreferrer" className="block relative group">

                            <img src={workflow.feedback_photos.foto_medida} alt="Medida Disciplinar" className="w-full h-32 object-cover" />

                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-[9px] font-black uppercase">Ampliar</div>

                          </a>

                          <p className="text-[8px] font-black text-center uppercase text-emerald-700 py-2 bg-emerald-50/50 border-t border-emerald-100/30">Medida Disciplinar Assinada</p>

                        </div>

                      )}

                    </div>

                  </div>

                )}

                <div className="text-[9px] text-slate-400 font-bold flex gap-3 uppercase">

                  <span>Registrado por: {workflow.feedback_by}</span>

                  <span>Em: {fmtDateTimeBR(workflow.feedback_date)}</span>

                </div>

              </div>

            ) : (

              <div className="space-y-4">

                <textarea

                  value={feedbackNotes}

                  onChange={e => setFeedbackNotes(e.target.value)}

                  placeholder="Descreva as ações corretivas/tratativas tomadas com a equipe..."

                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500 h-28 resize-none transition-all shadow-inner"

                />

                {/* Photo Upload inputs for Não Conforme OS */}

                {!workflow.is_conform && (

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                    {/* Upload Foto Equipe */}

                    <div className="bg-slate-50/50 border border-slate-200 rounded-2xl p-4 flex flex-col justify-between">

                      <div>

                        <h5 className="text-[10px] font-black uppercase text-slate-500 tracking-wider mb-0.5">Foto com a Equipe *</h5>

                        <p className="text-[9px] text-slate-400 mb-3">Foto física junto da equipe no local.</p>

                      </div>

                      {fotoEquipeUrl ? (

                        <div className="relative border rounded-xl overflow-hidden h-24 bg-white shadow-sm">

                          <img src={fotoEquipeUrl} alt="Foto Equipe" className="w-full h-full object-cover" />

                          <button onClick={() => setFotoEquipeUrl('')} className="absolute top-2 right-2 p-1.5 bg-rose-600 text-white rounded-full hover:bg-rose-700 shadow-md transition-colors"><Trash2 size={12} /></button>

                        </div>

                      ) : (

                        <label className="border-2 border-dashed border-slate-200 hover:border-emerald-400 rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer transition-all bg-white h-24 hover:bg-emerald-50/10 animate-pulse-once">

                          {uploadingEquipe ? (

                            <div className="animate-spin rounded-full h-5 w-5 border-2 border-emerald-500 border-t-transparent" />

                          ) : (

                            <>

                              <Camera size={20} className="text-slate-400 mb-1" />

                              <span className="text-[10px] text-slate-500 font-bold">Selecionar Imagem</span>

                            </>

                          )}

                          <input type="file" accept="image/*" onChange={e => handleUploadPhoto(e.target.files[0], 'equipe')} className="hidden" disabled={uploadingEquipe} />

                        </label>

                      )}

                    </div>

                    {/* Upload Foto Medida Disciplinar */}

                    <div className="bg-slate-50/55 border border-slate-200 rounded-2xl p-4 flex flex-col justify-between">

                      <div>

                        <h5 className="text-[10px] font-black uppercase text-slate-500 tracking-wider mb-0.5">Medida Disciplinar *</h5>

                        <p className="text-[9px] text-slate-400 mb-3">Foto da medida física assinada.</p>

                      </div>

                      {fotoMedidaUrl ? (

                        <div className="relative border rounded-xl overflow-hidden h-24 bg-white shadow-sm">

                          <img src={fotoMedidaUrl} alt="Medida Disciplinar" className="w-full h-full object-cover" />

                          <button onClick={() => setFotoMedidaUrl('')} className="absolute top-2 right-2 p-1.5 bg-rose-600 text-white rounded-full hover:bg-rose-700 shadow-md transition-colors"><Trash2 size={12} /></button>

                        </div>

                      ) : (

                        <label className="border-2 border-dashed border-slate-200 hover:border-emerald-400 rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer transition-all bg-white h-24 hover:bg-emerald-50/10 animate-pulse-once">

                          {uploadingMedida ? (

                            <div className="animate-spin rounded-full h-5 w-5 border-2 border-emerald-500 border-t-transparent" />

                          ) : (

                            <>

                              <FileText size={20} className="text-slate-400 mb-1" />

                              <span className="text-[10px] text-slate-500 font-bold">Selecionar Documento</span>

                            </>

                          )}

                          <input type="file" accept="image/*" onChange={e => handleUploadPhoto(e.target.files[0], 'medida')} className="hidden" disabled={uploadingMedida} />

                        </label>

                      )}

                    </div>

                  </div>

                )}

                <button

                  onClick={() => {

                    if (!feedbackNotes.trim()) return alert('Preencha o feedback.');

                    if (!workflow.is_conform && (!fotoEquipeUrl || !fotoMedidaUrl)) return alert('Obrigatório anexar as fotos de equipe e medida disciplinar.');

                    onSubmitFeedback(workflow, feedbackNotes, { foto_equipe: fotoEquipeUrl, foto_medida: fotoMedidaUrl });

                  }}

                  disabled={isSubmitDisabled}

                  className={`w-full py-3 rounded-2xl font-black text-xs uppercase tracking-wider transition-all duration-300 shadow-lg flex items-center justify-center gap-2 active:scale-95 ${isSubmitDisabled

                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'

                    : 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:opacity-90 shadow-emerald-500/20 hover:scale-[1.01]'

                    }`}

                >

                  <Send size={14} /> Registrar Feedback & Concluir Etapa

                </button>

              </div>

            )}

          </div>

          {/* STEP 3 CARD */}

          {(workflow.field_audit_required || fa) && (

            <div className="bg-gradient-to-tr from-white/95 to-white/80 backdrop-blur-md border border-white/60 shadow-[0_8px_30px_rgba(0,0,0,0.02)] rounded-3xl p-6 relative overflow-hidden group hover:shadow-[0_12px_40px_rgba(0,0,0,0.04)] transition-all duration-300">

              <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">

                <h3 className="font-black text-slate-800 flex items-center gap-2.5 text-xs uppercase tracking-wider">

                  <span className="w-6 h-6 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 text-white flex items-center justify-center text-[10px] font-black shadow-md shadow-teal-500/20">3</span>

                  Etapa 3: Auditoria de Campo (Mobile)

                </h3>

                <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full ${fa?.status === 'completed' ? 'bg-blue-500 text-white' : fa?.status === 'suspended' ? 'bg-rose-500 text-white' : 'bg-amber-500 text-white'

                  }`}>

                  {fa ? (fa.status === 'completed' ? 'Concluído' : fa.status === 'suspended' ? 'Suspenso' : 'Em Andamento') : 'Aguardando'}

                </span>

              </div>

              {!fa ? (

                <div className="bg-slate-50/50 p-6 rounded-2xl border border-slate-100 text-center">

                  <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Aguardando auditor em campo iniciar a verificação física.</p>

                </div>

              ) : (

                <div className="space-y-5">

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-slate-50/50 p-4 rounded-2xl border border-slate-100/50">

                    <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm flex flex-col justify-center">

                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Status</p>

                      <p className="text-xs font-black text-slate-700 mt-0.5 uppercase">{fa.status === 'completed' ? 'Concluída' : fa.status === 'suspended' ? 'Suspensa' : 'Iniciada'}</p>

                    </div>

                    <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm flex flex-col justify-center">

                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Auditor de Campo</p>

                      <p className="text-xs font-bold text-slate-700 mt-0.5">{formatUserFriendlyName(fa.auditor)}</p>

                    </div>

                    <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm flex flex-col justify-center">

                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Atividade Executada</p>

                      <p className="text-xs font-bold text-slate-700 mt-0.5">{fa.executed === null ? '--' : fa.executed ? 'Sim' : 'Não'}</p>

                    </div>

                    <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm flex flex-col justify-center">

                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Acesso à Residência</p>

                      <p className="text-xs font-bold text-slate-700 mt-0.5">{fa.access === null ? '--' : fa.access ? 'Sim' : 'Não'}</p>

                    </div>

                    <div className="col-span-1 md:col-span-2 bg-white p-3 rounded-xl border border-slate-100 shadow-sm flex flex-col justify-center">

                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Endereço Confirmado pelo Auditor</p>

                      <p className="text-xs font-bold text-slate-700 mt-0.5 leading-relaxed">

                        CEP: {fa.address?.cep || '--'}

                        {fa.address?.street ? ` | Rua: ${fa.address.street}` : ''}

                        | Nº: {fa.address?.number || '--'}

                        {fa.address?.complement ? ` (${fa.address.complement})` : ''}

                      </p>

                    </div>

                    <div className="col-span-1 md:col-span-2 bg-white p-3 rounded-xl border border-slate-100 shadow-sm flex flex-col justify-center">

                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Período de Atendimento</p>

                      <p className="text-xs font-bold text-slate-700 mt-0.5 whitespace-normal">

                        {fa.start_time ? fmtDateTimeBR(fa.start_time) : '--'} até {fa.end_time ? fmtDateTimeBR(fa.end_time) : '--'}

                      </p>

                    </div>

                  </div>

                  {fa.suspend_reason && (

                    <div className="bg-rose-50/60 border border-rose-100 text-rose-700 p-3.5 rounded-xl text-xs font-bold leading-relaxed">

                      <span className="text-[9px] font-black text-rose-500 uppercase tracking-wider block mb-0.5">Motivo da Suspensão / Recusa</span>

                      "{fa.suspend_reason}"

                    </div>

                  )}

                  {fa.photos && Object.keys(fa.photos).length > 0 && (

                    <div>

                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-2.5">Evidências de Campo</p>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">

                        {Object.entries(fa.photos).map(([key, url]) => (

                          <div key={key} className="border border-slate-200/60 rounded-2xl overflow-hidden bg-white shadow-sm hover:scale-[1.03] active:scale-[0.98] transition-all duration-300">

                            <a href={url} target="_blank" rel="noopener noreferrer" className="block relative group">

                              <img src={url} alt={key} className="w-full h-20 object-cover" />

                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-[9px] font-black uppercase">Ampliar</div>

                            </a>

                            <p className="text-[8px] font-black text-center uppercase text-slate-500 py-1.5 bg-slate-50/80 border-t border-slate-100 truncate">

                              {key === 'fachada' ? 'Fachada' : key === 'posteCia' ? 'Poste CIA' : key === 'posteCliente' ? 'Poste Cliente' : 'CM Medição'}

                            </p>

                          </div>

                        ))}

                      </div>

                    </div>

                  )}

                  {/* GPS Embed Map */}

                  {fa.telemetry?.geo_lat && fa.telemetry?.geo_lng && (

                    <div className="bg-slate-50/50 border border-slate-200/80 rounded-3xl p-4 shadow-inner space-y-3">

                      <div>

                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-2">Localização GPS de Finalização</span>

                        <iframe

                          src={`https://maps.google.com/maps?q=${fa.telemetry.geo_lat},${fa.telemetry.geo_lng}&t=&z=15&ie=UTF8&iwloc=&output=embed`}

                          className="w-full h-56 rounded-2xl border border-slate-200 shadow-sm"

                          allowFullScreen=""

                          loading="lazy">

                        </iframe>

                      </div>

                      <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-[8px] text-slate-400 font-bold uppercase">

                        <span>LAT: {fa.telemetry.geo_lat}</span>

                        <span>LNG: {fa.telemetry.geo_lng}</span>

                        <span>IP: {fa.telemetry.ip_address || 'n/a'}</span>

                        <span>Fingerprint: {fa.telemetry.fingerprint?.slice(0, 16)}...</span>

                      </div>

                    </div>

                  )}

                </div>

              )}

            </div>

          )}

        </div>

        {/* Right Side: Request Action Card & Log Timeline */}

        <div className="space-y-6">

          {/* Action Trigger Card - Apple design */}

          {workflow.is_conform && !workflow.field_audit_required && (

            <div className="bg-gradient-to-tr from-amber-50 to-amber-100/50 border border-amber-200/60 shadow-[0_8px_30px_rgba(245,158,11,0.03)] rounded-3xl p-5 relative overflow-hidden group hover:scale-[1.01] transition-all duration-300">

              <h3 className="font-black text-amber-900 mb-2 flex items-center gap-2 text-xs uppercase tracking-wider"><AlertTriangle size={16} /> Solicitar Auditoria Externa</h3>

              <p className="text-xs text-amber-700 leading-relaxed mb-4">Esta OS está marcada como Conforme. Caso necessite auditar em campo para conferir desvios, acione a auditoria móvel.</p>

              <button

                onClick={() => onRequestFieldAudit(workflow)}

                className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:opacity-90 active:scale-95 text-white font-black rounded-xl text-xs uppercase tracking-wider shadow-md shadow-amber-500/10 transition-all duration-300"

              >

                <MapPin size={12} className="inline mr-1.5" /> Solicitar Campo

              </button>

            </div>

          )}

          {/* Timeline of actions logs - Apple style */}

          <div className="bg-gradient-to-tr from-white/95 to-white/80 backdrop-blur-md border border-white/60 shadow-[0_8px_30px_rgba(0,0,0,0.02)] rounded-3xl p-5">

            <h3 className="font-black text-slate-800 mb-4 flex items-center gap-2 text-xs uppercase tracking-wider"><History size={16} className="text-blue-500" /> Histórico do Workflow</h3>

            <div className="space-y-3.5 max-h-[460px] overflow-y-auto pr-1">

              {(workflow.historico || []).slice().reverse().map((log, i) => (

                <div key={log.id || i} className="relative pl-5 border-l border-slate-200 py-0.5 group">

                  {/* Timeline dot */}

                  <div className="absolute -left-[4.5px] top-1.5 w-2 h-2 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-full shadow-sm ring-4 ring-white transition-all group-hover:scale-125" />

                  <div>

                    <span className="text-[9px] font-black text-slate-400 block mb-0.5">{fmtDateTimeBR(log.data)}</span>

                    <p className="text-xs font-black text-slate-700 leading-snug">{log.acao}</p>

                    <p className="text-xs text-slate-500 mt-0.5">{log.detalhes}</p>

                    <span className="text-[8px] font-bold text-slate-400 block mt-1 uppercase">RESP: {log.usuario}</span>

                  </div>

                </div>

              ))}

              {(!workflow.historico || workflow.historico.length === 0) && (

                <p className="text-xs text-slate-400 text-center py-4 font-bold uppercase tracking-wider">Nenhum registro.</p>

              )}

            </div>

          </div>

        </div>

      </div>

    </div>

  );

}

// ── REPORTS SCREEN ──────────────────────────────────────────

function ReportsScreen({ ordens, inspecoes, workflows, fieldAudits, onSelectWorkflow }) {

  const [search, setSearch] = useState('');

  const [selBase, setSelBase] = useState('');

  const [selStatus, setSelStatus] = useState('');

  const [selInspector, setSelInspector] = useState('');

  const [selAuditor, setSelAuditor] = useState('');

  const [selWfStage, setSelWfStage] = useState('');

  // Extract unique bases, inspectors, auditors for the filters

  const uniqueBases = useMemo(() => {

    return [...new Set(ordens.map(o => o.base))].filter(Boolean).sort();

  }, [ordens]);

  const uniqueInspectors = useMemo(() => {

    return [...new Set(inspecoes.map(i => i.inspector))].filter(Boolean).sort();

  }, [inspecoes]);

  const uniqueAuditors = useMemo(() => {

    return [...new Set(fieldAudits.map(f => f.auditor))].filter(Boolean).sort();

  }, [fieldAudits]);

  const rows = useMemo(() => {

    return inspecoes.map(i => {

      const os = ordens.find(o => o.nr_ordem === i.osid);

      const wf = workflows.find(w => w.inspid === i.inspid);

      const fa = fieldAudits.find(f => f.inspid === i.inspid);

      return {

        ...i,

        equipe: os?.equipe || '',

        base: os?.base || '',

        tipo_veiculo: os?.tipo_veiculo || '',

        wf,

        fa,

        wfFinished: wf?.is_finished,

        os

      };

    }).filter(r => {

      const matchSearch = !search ||

        r.inspid?.toLowerCase().includes(search.toLowerCase()) ||

        r.osid?.toLowerCase().includes(search.toLowerCase()) ||

        r.equipe?.toLowerCase().includes(search.toLowerCase());

      const matchBase = !selBase || r.base === selBase;

      const matchStatus = !selStatus || r.status === selStatus;

      const matchInspector = !selInspector || r.inspector === selInspector;

      const matchAuditor = !selAuditor || r.fa?.auditor === selAuditor;

      let matchStage = true;

      if (selWfStage) {

        if (selWfStage === 'feedback_pendente') {

          matchStage = r.wf && !r.wf.feedback_done;

        } else if (selWfStage === 'campo_pendente') {

          matchStage = r.wf && r.wf.field_audit_required && r.fa?.status !== 'completed';

        } else if (selWfStage === 'finalizado') {

          matchStage = r.wfFinished;

        } else if (selWfStage === 'em_andamento') {

          matchStage = r.wf && !r.wfFinished;

        }

      }

      return matchSearch && matchBase && matchStatus && matchInspector && matchAuditor && matchStage;

    });

  }, [inspecoes, ordens, workflows, fieldAudits, search, selBase, selStatus, selInspector, selAuditor, selWfStage]);

  const handleExport = () => {

    const data = rows.map(r => ({

      // DADOS DA ORDEM

      'OS ID': r.osid,

      'OS Data': r.os?.data ? fmtDateBR(r.os.data) : '',

      'OS Equipe': r.equipe,

      'OS Base': r.base,

      'OS Base Contrato': r.os?.base_contrato || '',

      'OS Turno': r.os?.periodo || '',

      'OS Atuação': r.os?.atuacao || '',

      'OS Tipo de Veículo': r.tipo_veiculo,

      'OS Classe': r.os?.classe || '',

      'OS Descrição Causa': r.os?.descricao_causa || '',

      'OS Minutos Duração': r.os?.minutos || 0,

      'OS Despachada': r.os?.despachada ? fmtDateTimeBR(r.os.despachada) : '',

      'OS A Caminho': r.os?.a_caminho ? fmtDateTimeBR(r.os.a_caminho) : '',

      'OS No Local': r.os?.no_local ? fmtDateTimeBR(r.os.no_local) : '',

      'OS Liberada': r.os?.liberada ? fmtDateTimeBR(r.os.liberada) : '',

      // DADOS DA AUTOFISCALIZAÇÃO

      'ID AutoFiscalização': r.inspid,

      'Status AutoFiscalização': r.status,

      'Inspetor Responsável': r.inspector,

      'Integrantes Equipe': r.team_members ? r.team_members.join(', ') : '',

      'Data AutoFiscalização': r.timestamp ? fmtDateTimeBR(r.timestamp) : '',

      'Comentários Inspetor': r.notes || '',

      'Foto Fachada Prints': r.photos?.fachada || '',

      'Foto Defeito Prints': r.photos?.defeito || '',

      'Foto Reparo Prints': r.photos?.reparo || '',

      'Foto Medição Prints': r.photos?.medicao || '',

      // DADOS DO FEEDBACK

      'Feedback Concluído?': r.wf?.feedback_done ? 'Sim' : 'Não',

      'Responsável Feedback': r.wf?.feedback_by || '',

      'Data Feedback': r.wf?.feedback_date ? fmtDateTimeBR(r.wf.feedback_date) : '',

      'Comentários Feedback': r.wf?.feedback_notes || '',

      'Foto Equipe Feedback': r.wf?.feedback_photos?.foto_equipe || '',

      'Foto Medida Feedback': r.wf?.feedback_photos?.foto_medida || '',

      // DADOS DA AUDITORIA EXTERNA

      'Auditoria Status': r.fa?.status || '',

      'Auditor de Campo': r.fa?.auditor || '',

      'Auditoria Atividade Executada?': r.fa?.executed !== null ? (r.fa?.executed ? 'Sim' : 'Não') : '',

      'Auditoria Acesso Residência?': r.fa?.access !== null ? (r.fa?.access ? 'Sim' : 'Não') : '',

      'Auditoria CEP Confirmado': r.fa?.address?.cep || '',

      'Auditoria Rua Confirmada': r.fa?.address?.street || '',

      'Auditoria Número Confirmado': r.fa?.address?.number || '',

      'Auditoria Complemento Confirmado': r.fa?.address?.complement || '',

      'Auditoria Foto Fachada': r.fa?.photos?.fachada || '',

      'Auditoria Foto Poste CIA': r.fa?.photos?.posteCia || '',

      'Auditoria Foto Poste Cliente': r.fa?.photos?.posteCliente || '',

      'Auditoria Foto Medição': r.fa?.photos?.medicao || '',

      'Auditoria Início': r.fa?.start_time ? fmtDateTimeBR(r.fa.start_time) : '',

      'Auditoria Conclusão': r.fa?.end_time ? fmtDateTimeBR(r.fa.end_time) : '',

      'Auditoria GPS Lat': r.fa?.telemetry?.geo_lat || '',

      'Auditoria GPS Lng': r.fa?.telemetry?.geo_lng || '',

      'Auditoria IP': r.fa?.telemetry?.ip_address || '',

      'Auditoria Fingerprint': r.fa?.telemetry?.fingerprint || '',

      // STEPS DE TRATAMENTO

      'Etapa 1 (Sistema)': 'Concluído',

      'Etapa 2 (Feedback)': r.wf?.feedback_done ? 'Concluído' : 'Pendente',

      'Etapa 3 (Campo)': r.wf?.field_audit_required ? (r.fa?.status === 'completed' ? 'Concluído' : 'Pendente') : 'N/A',

      'Workflow Geral': r.wfFinished ? 'Finalizado' : 'Em andamento'

    }));

    const ws = XLSX.utils.json_to_sheet(data);

    const wb = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(wb, ws, 'AutoFiscalizações');

    XLSX.writeFile(wb, `AutoFiscalizacoes_${new Date().toISOString().slice(0, 10)}.xlsx`);

  };

  return (

    <div className="animate-in fade-in duration-300">

      <div className="flex justify-between items-end mb-6">

        <div>

          <h2 className="text-2xl font-black text-blue-950">Relatórios</h2>

          <p className="text-slate-500 text-sm font-medium mt-1">Visualize e exporte os dados de AutoFiscalização.</p>

        </div>

        <button onClick={handleExport} className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl font-bold text-sm transition-colors flex items-center gap-2 shadow-md"><Download size={16} /> Exportar Excel</button>

      </div>

      {/* Filtros */}

      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm mb-6 space-y-4">

        <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Filtros Avançados</h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">

          {/* Busca por Texto */}

          <div className="flex flex-col">

            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Buscar</span>

            <div className="relative">

              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-450" size={14} />

              <input type="text" placeholder="ID, OS, Equipe..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500" />

            </div>

          </div>

          {/* Base */}

          <div className="flex flex-col">

            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Base</span>

            <select value={selBase} onChange={e => setSelBase(e.target.value)} className="py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs text-slate-655 outline-none focus:ring-2 focus:ring-emerald-500">

              <option value="">Todas</option>

              {uniqueBases.map(b => <option key={b} value={b}>{b}</option>)}

            </select>

          </div>

          {/* Status */}

          <div className="flex flex-col">

            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Status OS</span>

            <select value={selStatus} onChange={e => setSelStatus(e.target.value)} className="py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs text-slate-655 outline-none focus:ring-2 focus:ring-emerald-500">

              <option value="">Todos</option>

              <option value="Conforme">Conforme</option>

              <option value="Não Conforme">Não Conforme</option>

            </select>

          </div>

          {/* Inspetor */}

          <div className="flex flex-col">

            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Inspetor</span>

            <select value={selInspector} onChange={e => setSelInspector(e.target.value)} className="py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs text-slate-655 outline-none focus:ring-2 focus:ring-emerald-500">

              <option value="">Todos</option>

              {uniqueInspectors.map(i => <option key={i} value={i}>{i}</option>)}

            </select>

          </div>

          {/* Auditor */}

          <div className="flex flex-col">

            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Auditor</span>

            <select value={selAuditor} onChange={e => setSelAuditor(e.target.value)} className="py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs text-slate-655 outline-none focus:ring-2 focus:ring-emerald-500">

              <option value="">Todos</option>

              {uniqueAuditors.map(a => <option key={a} value={a}>{a}</option>)}

            </select>

          </div>

          {/* Etapa Workflow */}

          <div className="flex flex-col">

            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Etapa Workflow</span>

            <select value={selWfStage} onChange={e => setSelWfStage(e.target.value)} className="py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs text-slate-655 outline-none focus:ring-2 focus:ring-emerald-500">

              <option value="">Todas</option>

              <option value="em_andamento">Em Andamento</option>

              <option value="feedback_pendente">Feedback Pendente</option>

              <option value="campo_pendente">Campo Pendente</option>

              <option value="finalizado">Finalizado</option>

            </select>

          </div>

        </div>

      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">

        <div className="overflow-x-auto">

          <table className="w-full text-left text-sm">

            <thead>

              <tr className="bg-slate-50 border-b border-slate-200">

                {['ID', 'OS', 'Data', 'Status', 'Equipe', 'Base', 'Inspetor', 'Auditor', 'Sistema (E1)', 'Feedback (E2)', 'Campo (E3)', 'Geral'].map(h => (

                  <th key={h} className="py-3.5 px-4 text-[9px] font-black uppercase text-slate-400 tracking-wider whitespace-nowrap">{h}</th>

                ))}

              </tr>

            </thead>

            <tbody className="divide-y divide-slate-100">

              {rows.map(r => {

                const step1 = 'Concluído';

                const step2 = r.wf?.feedback_done ? 'Concluído' : (r.wf ? 'Pendente' : '--');

                const step3 = r.wf?.field_audit_required ? (r.fa?.status === 'completed' ? 'Concluído' : 'Pendente') : 'N/A';

                return (

                  <tr key={r.inspid} className="hover:bg-slate-50 transition-colors">

                    <td className="py-3 px-4 font-bold">

                      <button

                        onClick={() => {

                          if (r.wf) {

                            onSelectWorkflow(r.wf);

                          } else {

                            alert('Esta inspeção não gerou workflow (conforme automática).');

                          }

                        }}

                        className="text-blue-600 hover:text-blue-800 hover:underline text-xs font-black text-left focus:outline-none"

                      >

                        {r.inspid}

                      </button>

                    </td>

                    <td className="py-3 px-4 font-bold text-slate-700">{r.osid}</td>

                    <td className="py-3 px-4 text-slate-600 text-xs whitespace-nowrap">{fmtDateBR(r.data)}</td>

                    <td className="py-3 px-4">

                      <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${r.status === 'Conforme' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>

                        {r.status}

                      </span>

                    </td>

                    <td className="py-3 px-4 font-bold text-slate-700 text-xs">{r.equipe}</td>

                    <td className="py-3 px-4 text-slate-600 text-xs">{r.base}</td>

                    <td className="py-3 px-4 text-slate-600 text-xs">{r.inspector}</td>

                    <td className="py-3 px-4 text-slate-600 text-xs">{r.fa?.auditor || '--'}</td>

                    {/* E1 */}

                    <td className="py-3 px-4">

                      <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700">

                        {step1}

                      </span>

                    </td>

                    {/* E2 */}

                    <td className="py-3 px-4">

                      {step2 === 'Concluído' ? (

                        <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700">{step2}</span>

                      ) : step2 === 'Pendente' ? (

                        <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-amber-50 text-amber-700">{step2}</span>

                      ) : (

                        <span className="text-slate-400 text-xs">--</span>

                      )}

                    </td>

                    {/* E3 */}

                    <td className="py-3 px-4">

                      {step3 === 'Concluído' ? (

                        <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700">{step3}</span>

                      ) : step3 === 'Pendente' ? (

                        <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-amber-50 text-amber-700">{step3}</span>

                      ) : (

                        <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-slate-100 text-slate-450">{step3}</span>

                      )}

                    </td>

                    {/* Geral */}

                    <td className="py-3 px-4">

                      <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${r.wfFinished ? 'bg-blue-50 text-blue-700' : (r.wf ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-450')}`}>

                        {r.wfFinished ? 'Finalizado' : (r.wf ? 'Ativo' : 'Conforme')}

                      </span>

                    </td>

                  </tr>

                );

              })}

              {rows.length === 0 && (

                <tr>

                  <td colSpan={12} className="py-8 text-center text-slate-400 font-bold">Nenhum dado encontrado.</td>

                </tr>

              )}

            </tbody>

          </table>

        </div>

      </div>

    </div>

  );

}

// ── IMPORT SCREEN ───────────────────────────────────────────

function ImportScreen({ onImport, onConfirm, currentUser }) {

  const [file, setFile] = useState(null);

  const [preview, setPreview] = useState(null);

  const [importing, setImporting] = useState(false);

  const [done, setDone] = useState(false);

  const fileRef = useRef(null);

  const handleFile = async (f) => {

    setFile(f);

    setDone(false);

    const rows = await onImport(f);

    if (rows) {

      const dates = [...new Set(rows.map(r => r.data))].sort();

      const equipes = [...new Set(rows.map(r => r.equipe))];

      const bases = [...new Set(rows.map(r => r.base))];

      setPreview({ rows, total: rows.length, dates, equipes: equipes.length, bases });

    }

  };

  const handleConfirm = async () => {

    if (!preview) return;

    setImporting(true);

    const ok = await onConfirm(preview.rows);

    setImporting(false);

    if (ok) { setDone(true); setPreview(null); setFile(null); }

  };

  return (

    <div className="animate-in fade-in duration-300">

      <div className="mb-6">

        <h2 className="text-2xl font-black text-blue-950">Importar Ordens de Serviço</h2>

        <p className="text-slate-500 text-sm font-medium mt-1">Carregue o arquivo Excel com as OS em D-1 para iniciar o processo de AutoFiscalização.</p>

      </div>

      {done && (

        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 mb-6 flex items-center gap-4">

          <CheckCircle size={32} className="text-emerald-500 shrink-0" />

          <div>

            <p className="font-black text-emerald-800">Importação concluída com sucesso!</p>

            <p className="text-sm text-emerald-600">As OS foram carregadas e já estão disponíveis na Agenda D-1.</p>

          </div>

        </div>

      )}

      <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-6">

        <div className="flex items-center gap-4 mb-4">

          <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center"><Upload size={24} className="text-emerald-600" /></div>

          <div>

            <h3 className="font-black text-slate-800">Selecionar Arquivo</h3>

            <p className="text-xs text-slate-500">Formato aceito: .xlsx (19 colunas obrigatórias)</p>

          </div>

        </div>

        <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={e => e.target.files[0] && handleFile(e.target.files[0])} />

        <button onClick={() => fileRef.current?.click()} className="w-full py-4 border-2 border-dashed border-slate-300 rounded-xl text-slate-500 font-bold hover:border-emerald-400 hover:text-emerald-600 transition-colors">

          {file ? `📄 ${file.name}` : 'Clique para selecionar o arquivo Excel'}

        </button>

      </div>

      {preview && (

        <div className="bg-white rounded-2xl border border-slate-200 p-6 animate-in slide-in-from-bottom duration-300">

          <h3 className="font-black text-slate-800 mb-4">Preview da Importação</h3>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">

            <div className="bg-slate-50 p-3 rounded-xl"><p className="text-[10px] font-black uppercase text-slate-400">Total Linhas</p><p className="text-xl font-black text-slate-700">{preview.total}</p></div>

            <div className="bg-slate-50 p-3 rounded-xl"><p className="text-[10px] font-black uppercase text-slate-400">Datas</p><p className="text-xl font-black text-slate-700">{preview.dates.length}</p><p className="text-[10px] text-slate-400">{preview.dates.map(d => fmtDateBR(d + 'T12:00:00')).join(', ')}</p></div>

            <div className="bg-slate-50 p-3 rounded-xl"><p className="text-[10px] font-black uppercase text-slate-400">Equipes</p><p className="text-xl font-black text-slate-700">{preview.equipes}</p></div>

            <div className="bg-slate-50 p-3 rounded-xl"><p className="text-[10px] font-black uppercase text-slate-400">Bases</p><p className="text-xl font-black text-slate-700">{preview.bases.length}</p><p className="text-[10px] text-slate-400">{preview.bases.join(', ')}</p></div>

          </div>

          <div className="flex justify-end gap-3">

            <button onClick={() => { setPreview(null); setFile(null); }} className="px-5 py-2.5 text-slate-500 font-bold hover:bg-slate-100 rounded-xl transition-colors">Cancelar</button>

            <button onClick={handleConfirm} disabled={importing} className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-black rounded-xl shadow-lg transition-all flex items-center gap-2">

              {importing ? 'Importando...' : `Confirmar Importação (${preview.total} registros)`} <Check size={16} />

            </button>

          </div>

        </div>

      )}

    </div>

  );

}

// ══════════════════════════════════════════════════════════════

// SUB-COMPONENTS: MOBILE AUDITOR

// ══════════════════════════════════════════════════════════════

function MobileHome({ audits, mobileTab, setMobileTab, getStatusStyle, onSelectAudit, currentUser, onLogout }) {

  // ── Tab State

  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard' | 'timeline' | 'map' | 'list' | 'profile'

  const [selectedDate, setSelectedDate] = useState(new Date());

  // ── States for shift / scale / preferences

  const [shift, setShift] = useState(null);

  const [pref, setPref] = useState(null);

  const [scale, setScale] = useState(null);

  const [scaleLoading, setScaleLoading] = useState(true);

  const [myMonthlyShifts, setMyMonthlyShifts] = useState([]);

  // ── UI States

  const [showShiftModal, setShowShiftModal] = useState(false);
  const [modalPlaca, setModalPlaca] = useState('');
  const [modalTelefone, setModalTelefone] = useState('');
  const [hasConfirmedGpsPerm, setHasConfirmedGpsPerm] = useState(false);
  const [filterDate, setFilterDate] = useState('');

  const [viewMode, setViewMode] = useState('lista'); // 'lista' | 'card' | 'base'

  const [collapsedBases, setCollapsedBases] = useState({});

  const [collapsedGroups, setCollapsedGroups] = useState({});

  const [swapTarget, setSwapTarget] = useState(null); // The OS to swap with
  const [showSwapModal, setShowSwapModal] = useState(null); // OS selected for swap
  const [currentMapPos, setCurrentMapPos] = useState(null);

  useEffect(() => {
    if (activeTab === 'map' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => setCurrentMapPos([pos.coords.latitude, pos.coords.longitude]),
        () => {},
        { enableHighAccuracy: true }
      );
    }
  }, [activeTab]);

  // ── Loading Scale & Shift

  const fetchShiftAndPref = async () => {

    const todayStr = new Date().toLocaleDateString('en-CA');

    const auditorName = currentUser?.login || currentUser?.nome;

    if (!auditorName) return;

    try {

      setScaleLoading(true);

      let esc = null;

      let s = null;

      // 1. Buscar a escala do dia de hoje

      const { data: escToday } = await supabase.from('wfm_calendario_escalas').select('*').eq('auditor', auditorName).eq('date', todayStr).maybeSingle();

      esc = escToday;

      // 2. Buscar o turno (shift) do dia de hoje

      const { data: sToday } = await supabase.from('autofiscalizacao_shifts').select('*').eq('auditor', auditorName).eq('date', todayStr).maybeSingle();

      s = sToday;

      // 3. Fallback para turnos de madrugada (jornada cruzando a meia-noite)

      if (!esc || !s) {

        const now = new Date();

        if (now.getHours() < 6) {

          const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

          const yesterdayStr = yesterday.toISOString().split('T')[0];

          if (!esc) {

            const { data: escPrev } = await supabase.from('wfm_calendario_escalas').select('*').eq('auditor', auditorName).eq('date', yesterdayStr).maybeSingle();

            if (escPrev) {

              const startH = escPrev.shift_start ? parseInt(escPrev.shift_start.split(':')[0], 10) : 0;

              const endH = escPrev.shift_end ? parseInt(escPrev.shift_end.split(':')[0], 10) : 0;

              if (endH < startH) { // Indica que a jornada cruza a meia-noite

                if (now.getHours() < endH || (now.getHours() === endH && now.getMinutes() === 0)) {

                  esc = escPrev;

                }

              }

            }

          }

          if (!s) {

            const { data: sPrev } = await supabase.from('autofiscalizacao_shifts').select('*').eq('auditor', auditorName).eq('date', yesterdayStr).maybeSingle();

            if (sPrev) {

              const startH = sPrev.shift_start ? parseInt(sPrev.shift_start.split(':')[0], 10) : 0;

              const endH = sPrev.shift_end ? parseInt(sPrev.shift_end.split(':')[0], 10) : 0;

              if (endH < startH) {

                if (now.getHours() < endH || (now.getHours() === endH && now.getMinutes() === 0)) {

                  s = sPrev;

                }

              }

            }

          }

        }

      }

      setScale(esc);
      setShift(s || null);
      setScaleLoading(false);

      const { data: p } = await supabase.from('autofiscalizacao_auditor_prefs').select('*').eq('auditor', auditorName).maybeSingle();
      if (p) setPref(p);

      const { data: shs } = await supabase.from('autofiscalizacao_shifts').select('*').eq('auditor', auditorName);
      if (shs) setMyMonthlyShifts(shs);

      // REDIRECIONAMENTO AUTOMÁTICO
      if (esc && !s) {
        setActiveTab('ponto');
      }

    } catch (err) {
      console.error(err);
      setScaleLoading(false);
    }
  };

  useEffect(() => {
    fetchShiftAndPref();
    notificationService.init();

    // ── Escuta Realtime para novas OS atribuídas a este inspetor
    const auditorLogin = currentUser?.login || currentUser?.nome;
    if (auditorLogin) {
      const channel = supabase
        .channel(`rt-os-notif-${auditorLogin}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'wfm_tarefas', filter: `auditor=eq.${auditorLogin}` },
          (payload) => {
            console.log('[Realtime OS] Nova tarefa inserida:', payload);
            notificationService.notifyNewTask({
              id: payload.new?.id,
              title: payload.new?.titulo || 'Nova Ordem de Serviço',
              description: payload.new?.descricao || `OS atribuída: ${payload.new?.os_numero || ''}`,
              osNumber: payload.new?.os_numero,
              auditor: auditorLogin,
            });
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [currentUser]);

  // ── Live GPS Tracker Unificado (Nativo Android Foreground Service no APK + Contingência PWA no Web)
  useEffect(() => {
    if (!shift || !shift.start_time || shift.end_time) {
      gpsService.stopTracking();
      return;
    }

    // Inicia rastreamento contínuo com motor duplo (deslocamento + heartbeat 30s)
    gpsService.startTracking(shift, (pos) => {
      // Callback opcional de atualização em tempo real
    });

    return () => {
      gpsService.stopTracking();
    };
  }, [shift]);

  // ── Shift Action Handler
  const handleShiftAction = async (action) => {
    const todayStr = new Date().toLocaleDateString('en-CA');
    const now = new Date().toISOString();
    const auditorName = currentUser?.login || currentUser?.nome;

    if (action === 'start') {
      setShowShiftModal(true);
    } else if (shift) {
      let updates = {};
      if (action === 'meal_start') updates = { meal_start: now };
      if (action === 'meal_end') updates = { meal_end: now };
      if (action === 'end') updates = { end_time: now };

      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (pos) => {
            const lat = pos.coords.latitude;
            const lng = pos.coords.longitude;
            const speed = pos.coords.speed !== null && !isNaN(pos.coords.speed) ? pos.coords.speed * 3.6 : null;
            updates.gps_lat = lat;
            updates.gps_lng = lng;
            updates.gps_last_update = now;

            const { data } = await supabase
              .from('autofiscalizacao_shifts')
              .update(updates)
              .eq('id', shift.id)
              .select()
              .single();
            if (data) setShift(data);

            // Grava ponto histórico da ação do turno
            try {
              await supabase.from('autofiscalizacao_gps_logs').insert({
                shift_id: shift.id,
                auditor: shift.auditor,
                date: shift.date,
                lat,
                lng,
                accuracy: pos.coords.accuracy || null,
                speed,
                created_at: now,
              });
            } catch (e) {}
          },
          async () => {
            const { data } = await supabase
              .from('autofiscalizacao_shifts')
              .update(updates)
              .eq('id', shift.id)
              .select()
              .single();
            if (data) setShift(data);
          },
          { enableHighAccuracy: true }
        );
      } else {
        const { data } = await supabase
          .from('autofiscalizacao_shifts')
          .update(updates)
          .eq('id', shift.id)
          .select()
          .single();
        if (data) setShift(data);
      }
    }
  };

  const handleStartShiftSubmit = async () => {
    if (!modalPlaca || !modalPlaca.trim()) {
      return alert('A placa do veículo é obrigatória.');
    }
    if (!modalTelefone || modalTelefone.replace(/\D/g, '').length < 10) {
      return alert('O número de telefone válido é obrigatório.');
    }
    if (!hasConfirmedGpsPerm) {
      return alert('É obrigatório confirmar as permissões de GPS e Bateria.');
    }

    const cleanPlaca = modalPlaca.toUpperCase().replace(/\s+/g, '').trim();
    const cleanTelefone = modalTelefone.trim();
    const todayStr = new Date().toLocaleDateString('en-CA');
    const now = new Date().toISOString();
    const auditorName = currentUser?.login || currentUser?.nome;

    if (!navigator.geolocation) {
      return alert('Seu navegador não suporta geolocalização.');
    }

    // Se estivermos na aba ponto, após iniciar queremos voltar para o painel ou agenda (dashboard/timeline)
    // Para UX: vamos mudar para dashboard depois
    
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const speed = pos.coords.speed !== null && !isNaN(pos.coords.speed) ? pos.coords.speed * 3.6 : null;
        const shiftDate = scale?.date || todayStr;

        const { data, error } = await supabase
          .from('autofiscalizacao_shifts')
          .insert({
            auditor: auditorName,
            date: shiftDate,
            start_time: now,
            placa_veiculo: cleanPlaca,
            telefone: cleanTelefone,
            gps_lat: lat,
            gps_lng: lng,
            gps_last_update: now,
          })
          .select()
          .single();

        if (data) {
          setShift(data);
          setShowShiftModal(false);

          // Ponto inicial da jornada na telemetria
          try {
            await supabase.from('autofiscalizacao_gps_logs').insert({
              shift_id: data.id,
              auditor: data.auditor,
              date: data.date,
              lat,
              lng,
              accuracy: pos.coords.accuracy || null,
              speed,
              created_at: now,
            });
          } catch (e) {}
        } else if (error) {
          console.error(error);
          alert('Erro ao iniciar turno.');
        }
      },
      (err) => {
        console.error(err);
        alert('Permissão de GPS é obrigatória para iniciar o turno de trabalho.');
      },
      { enableHighAccuracy: true }
    );

  };

  // ── Swap OS Sequence Handler

  const handleSwapSequence = async (task1, task2) => {

    const time1 = task1.faData?.planned_start;

    const time2 = task2.faData?.planned_start;

    if (!time1 || !time2) {

      alert("Não é possível reordenar tarefas que não possuem horário agendado no WFM.");

      return;

    }

    const { error: err1 } = await supabase.from('wfm_tarefas').update({ planned_start: time2 }).eq('id', task1.faData.id);

    const { error: err2 = {} } = await supabase.from('wfm_tarefas').update({ planned_start: time1 }).eq('id', task2.faData.id);

    if (!err1 && !err2) {

      alert(`Sequência reordenada com sucesso no WFM!`);

      setShowSwapModal(null);

      await fetchFieldAudits();

    } else {

      alert("Erro ao reordenar a sequência no WFM.");

    }

  };

  // ── Calculations for selectedDate

  const dateStr = selectedDate.toLocaleDateString('en-CA');

  // Filter tasks for this selectedDate

  const todayAudits = audits.filter(a => a.faData?.assigned_date === dateStr);

  // Ordena cronologicamente pelo horário planejado (idêntico ao desktop)

  const sortedAudits = [...todayAudits].sort((a, b) => {

    const timeA = new Date(a.faData?.planned_start || 0).getTime();

    const timeB = new Date(b.faData?.planned_start || 0).getTime();

    return timeA - timeB;

  });

  // Unique date lists for filtering

  const uniqueDates = [...new Set(audits.map(a => String(a.data).slice(0, 10)))].sort((a, b) => b.localeCompare(a));

  // Tab 4 Lists: filtered by date selector

  const listFiltered = audits.filter(a => {

    const matchDate = !filterDate || String(a.data).slice(0, 10) === filterDate;

    return matchDate;

  });

  const groupedByDate = useMemo(() => {

    return listFiltered.reduce((acc, a) => {

      const d = String(a.data).slice(0, 10);

      if (!acc[d]) acc[d] = [];

      acc[d].push(a);

      return acc;

    }, {});

  }, [listFiltered]);

  const groupedByBase = useMemo(() => {

    const res = {};

    listFiltered.forEach(audit => {

      const base = audit.base || 'Sem Base';

      const d = String(audit.data).slice(0, 10);

      if (!res[base]) {

        res[base] = { dates: {}, total: 0, completed: 0 };

      }

      if (!res[base].dates[d]) res[base].dates[d] = [];

      res[base].dates[d].push(audit);

    });

    Object.keys(res).forEach(base => {

      const baseMaster = audits.filter(a => a.base === base);

      res[base].total = baseMaster.length;

      res[base].completed = baseMaster.filter(a => a.mobileStatus === 'completed').length;

    });

    return res;

  }, [listFiltered, audits]);

  // Stats for current month

  const monthlyStats = useMemo(() => {

    const currentMonth = new Date().getMonth();

    const currentYear = new Date().getFullYear();

    const myMonthShifts = myMonthlyShifts.filter(s => {

      const d = new Date(s.date);

      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;

    });

    const daysWorked = myMonthShifts.filter(s => s.start_time).length;

    const completedThisMonth = audits.filter(a => {

      if (a.mobileStatus !== 'completed') return false;

      const d = new Date(a.data);

      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;

    }).length;

    // Daily volume for chart

    const dailyVolume = {};

    audits.forEach(a => {

      const d = new Date(a.data);

      if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {

        const dayStr = String(d.getDate()).padStart(2, '0');

        dailyVolume[dayStr] = (dailyVolume[dayStr] || 0) + 1;

      }

    });

    const chartData = Object.entries(dailyVolume).map(([day, val]) => ({ name: day, volume: val })).sort((a, b) => a.name.localeCompare(b.name));

    return { daysWorked, completedThisMonth, chartData };

  }, [myMonthlyShifts, audits]);

  // Route map coordinates list

  const extractCoords = (a) => {
    const link = a.link_mapa || a.endereco_cliente || a.faData?.link_mapa || a.faData?.endereco_cliente || '';
    if (typeof link === 'string' && (link.includes('maps/dir/') || link.includes('google.com.br/maps'))) {
      const pattern = /([-+]?\d*\.\d+)\s*(?:\+\+|,\s*)\s*([-+]?\d*\.\d+)/g;
      const matches = [...link.matchAll(pattern)];
      if (matches.length > 0) {
        const lastMatch = matches[matches.length - 1];
        return { lat: parseFloat(lastMatch[1]), lng: parseFloat(lastMatch[2]) };
      }
    }
    if (a.faData?.gps_lat && a.faData?.gps_lng) return { lat: parseFloat(a.faData.gps_lat), lng: parseFloat(a.faData.gps_lng) };
    if (a.latitude && a.longitude) return { lat: parseFloat(a.latitude), lng: parseFloat(a.longitude) };
    if (a.faData?.latitude && a.faData?.longitude) return { lat: parseFloat(a.faData.latitude), lng: parseFloat(a.faData.longitude) };
    if (a.payload_dados?.latitude && a.payload_dados?.longitude) return { lat: parseFloat(a.payload_dados.latitude), lng: parseFloat(a.payload_dados.longitude) };
    return null;
  };

  const mapPoints = useMemo(() => {

    const list = [];

    sortedAudits.forEach(a => {

      const coords = extractCoords(a);
      if (coords) list.push([coords.lat, coords.lng]);

    });

    return list;

  }, [sortedAudits]);

  // Rolling horizontal calendar days (-3 to +3 days from today)

  const calendarDays = useMemo(() => {

    const list = [];

    const base = new Date();

    for (let i = -3; i <= 3; i++) {

      const d = new Date(base.getTime() + i * 24 * 60 * 60 * 1000);

      list.push(d);

    }

    return list;

  }, []);

  const renderAuditItem = (audit, mode, index = 0) => {

    const style = getStatusStyle(audit.mobileStatus);

    const sentTimeStr = audit.faData?.historico?.[0]?.data || audit.faData?.historico?.[0]?.timestamp || audit.timestamp;

    if (mode === 'lista') {

      const isSuspended = audit.mobileStatus === 'suspended';

      return (

        <div

          key={audit.inspid + '-' + index}

          onClick={() => onSelectAudit(audit)}

          className={`p-3.5 rounded-2xl border transition-all duration-200 flex justify-between items-center cursor-pointer active:scale-[0.98] ${audit.mobileStatus === 'completed'

            ? 'bg-slate-50/60 border-slate-100 opacity-60'

            : isSuspended

              ? 'bg-red-50/80 border-red-200 shadow-sm shadow-red-100/50'

              : 'bg-white border-slate-200 hover:border-emerald-300 shadow-sm'

            }`}

        >

          <div className="flex items-center gap-3 min-w-0">

            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${audit.mobileStatus === 'completed' ? 'bg-slate-100 text-slate-400' : isSuspended ? 'bg-red-100 text-red-500' : 'bg-emerald-50 text-emerald-600'

              }`}>

              <span className="text-[10px] font-black">{audit.faData?.route_sequence || '-'}</span>

            </div>

            <div className="min-w-0">

              <h4 className="font-black text-slate-800 text-xs truncate">OS: {audit.osid}</h4>

              <p className="text-[10px] text-slate-400 font-bold uppercase truncate mt-0.5">{audit.base} • {audit.atuacao}</p>

            </div>

          </div>

          <ChevronRight size={14} className="text-slate-350" />

        </div>

      );

    }

    const isSuspended = audit.mobileStatus === 'suspended';

    return (

      <div

        key={audit.inspid + '-' + index}

        onClick={() => onSelectAudit(audit)}

        className={`p-4 rounded-2xl border transition-all duration-300 flex flex-col cursor-pointer active:scale-[0.98] ${audit.mobileStatus === 'completed'

          ? 'bg-slate-50/60 border-slate-100 opacity-60'

          : isSuspended

            ? 'bg-gradient-to-tr from-amber-50/70 to-red-50/50 border-red-200/80 shadow-md'

            : 'bg-gradient-to-tr from-white to-white/95 border-slate-200/80 hover:border-emerald-300 shadow-sm'

          }`}

      >

        <div className="flex justify-between items-start mb-2">

          <div>

            <span className={`text-[8px] font-black px-2 py-0.5 rounded-lg mb-1.5 inline-flex items-center gap-1 uppercase tracking-wider ${isSuspended ? 'bg-red-600 text-white' : style.bg + ' ' + style.text

              }`}>

              <div className={`w-1 h-1 rounded-full ${isSuspended ? 'bg-white' : style.dot}`} />

              {isSuspended ? '⚠️ Suspensa' : style.label}

            </span>

            <div className="flex items-center gap-2">

              <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-600 font-black text-[10px] flex items-center justify-center border">{audit.faData?.route_sequence || '-'}</span>

              <h4 className="font-black text-slate-800 text-sm">OS: {audit.osid}</h4>

            </div>

          </div>

          <ChevronRight size={16} className="text-slate-350" />

        </div>

        <div className="grid grid-cols-2 gap-2 text-[9px] font-bold text-slate-500 uppercase tracking-wider pt-2 border-t border-slate-100/50 mt-1">

          <div>

            <span className="text-slate-400 font-mono block">Equipe / Base</span>

            <span className="text-slate-750 block mt-0.5 truncate">{audit.equipe} • {audit.base}</span>

          </div>

          <div>

            <span className="text-slate-400 font-mono block">Enviado em</span>

            <span className="text-slate-750 block mt-0.5">{sentTimeStr ? fmtDateTimeBR(sentTimeStr) : '--'}</span>

          </div>

          <div className="col-span-2 flex justify-between items-center text-[8px] pt-1">

            <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-500">{audit.atuacao}</span>

            <span className="text-blue-600 font-black">{audit.minutos} Minutos</span>

          </div>

        </div>

      </div>

    );

  };

  // --- Scale Blocker ---

  if (!scaleLoading && !scale) {

    return (

      <div className="flex-grow bg-slate-50 flex flex-col items-center justify-center p-6 text-center min-h-screen">

        <div className="w-20 h-20 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center mb-6 border border-slate-200 shadow-inner">

          <CalendarX size={32} />

        </div>

        <h2 className="text-xl font-black text-slate-800 tracking-tight">Sem Escala Programada</h2>

        <p className="text-sm text-slate-500 mt-2 max-w-xs leading-relaxed">

          Você não possui escala de trabalho habilitada para o dia de hoje no console WFM. Por favor, entre em contato com o seu despachante/operador.

        </p>

        <div className="flex gap-4 mt-6 w-full max-w-xs">
          <button
            onClick={fetchShiftAndPref}
            className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-white font-black rounded-xl text-xs uppercase tracking-wider transition-all active:scale-95 shadow-md"
          >
            Tentar
          </button>
          {onLogout && (
            <button
              onClick={onLogout}
              className="flex-1 py-3 bg-red-100 text-red-600 hover:bg-red-200 font-black rounded-xl text-xs uppercase tracking-wider transition-all active:scale-95 shadow-md"
            >
              Sair
            </button>
          )}
        </div>

      </div>

    );

  }

  if (scaleLoading) {

    return (

      <div className="flex-grow bg-slate-50 flex flex-col items-center justify-center p-6 min-h-screen">

        <div className="animate-spin w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full mb-3"></div>

        <span className="text-xs font-bold text-slate-500">Carregando Escala...</span>

      </div>

    );

  }

  return (

    <div className="flex-grow flex flex-col bg-slate-50 relative pb-20 font-sans min-h-screen overflow-y-auto">

      {/* ─── TAB 1: DASHBOARD / STATISTICS ─── */}

      {activeTab === 'dashboard' && (

        <div className="flex-1 flex flex-col p-5 space-y-5 animate-in fade-in duration-300">

          <div className="bg-gradient-to-br from-emerald-600 via-emerald-500 to-teal-500 p-6 rounded-[2rem] text-white shadow-lg relative overflow-hidden shrink-0">

            <div className="absolute -top-12 -right-12 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />

            <h1 className="text-2xl font-black mb-1.5 tracking-tight flex items-center gap-1.5">

              Olá, {formatUserFriendlyName(currentUser?.nome || currentUser?.login)}! ✨

            </h1>

            <p className="text-[11px] text-emerald-100 font-bold mb-4">Veja seu progresso de trabalho de campo este mês.</p>

            <div className="grid grid-cols-2 gap-3 mt-4">

              <div className="bg-white/10 border border-white/20 p-3 rounded-2xl backdrop-blur-md">

                <span className="text-[9px] text-emerald-100 font-black uppercase tracking-wider block">Dias Trabalhados</span>

                <span className="text-2xl font-black">{monthlyStats.daysWorked}</span>

              </div>

              <div className="bg-white/10 border border-white/20 p-3 rounded-2xl backdrop-blur-md">

                <span className="text-[9px] text-emerald-100 font-black uppercase tracking-wider block">OS Concluídas</span>

                <span className="text-2xl font-black">{monthlyStats.completedThisMonth}</span>

              </div>

            </div>

          </div>

          <div className="bg-white p-5 rounded-3xl border border-slate-200/60 shadow-sm flex flex-col">

            <h3 className="font-black text-slate-800 text-xs uppercase tracking-wider mb-4 flex items-center gap-2">

              <BarChart3 size={14} className="text-emerald-500" /> Volume de OS Realizadas (Mês)

            </h3>

            {monthlyStats.chartData.length === 0 ? (

              <div className="h-44 flex flex-col items-center justify-center text-slate-400 text-xs">

                Nenhum dado registrado para o mês atual.

              </div>

            ) : (

              <div className="h-44 w-full">

                <ResponsiveContainer width="100%" height="100%">

                  <BarChart data={monthlyStats.chartData}>

                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />

                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={9} tickLine={false} />

                    <YAxis stroke="#94a3b8" fontSize={9} tickLine={false} />

                    <Tooltip contentStyle={{ background: '#0f172a', border: 'none', borderRadius: '12px', color: '#fff', fontSize: '10px' }} />

                    <Bar dataKey="volume" fill="#10b981" radius={[4, 4, 0, 0]} />

                  </BarChart>

                </ResponsiveContainer>

              </div>

            )}

          </div>

        </div>

      )}

      {/* ─── TAB 2: TIMELINE (VERTICAL GANTT) ─── */}

      {activeTab === 'timeline' && (

        <div className="flex-1 flex flex-col animate-in fade-in duration-300">

          {/* Horizontal Calendar days */}

          <div className="bg-white border-b border-slate-200/80 p-3 flex gap-2.5 overflow-x-auto shrink-0 scrollbar-none">

            {calendarDays.map((d, i) => {

              const isActive = d.toLocaleDateString('en-CA') === dateStr;

              return (

                <button

                  key={i}

                  onClick={() => setSelectedDate(d)}

                  className={`flex flex-col items-center justify-center shrink-0 w-12 h-16 rounded-2xl transition-all border ${isActive

                    ? 'bg-emerald-500 border-emerald-500 text-white font-black shadow-md shadow-emerald-100'

                    : 'bg-slate-50 border-slate-200/60 text-slate-500 font-bold hover:bg-slate-100'

                    }`}

                >

                  <span className="text-[8px] uppercase tracking-wider">{d.toLocaleDateString('pt-BR', { weekday: 'short' }).slice(0, 3)}</span>

                  <span className="text-base font-black mt-1">{d.getDate()}</span>

                </button>

              );

            })}

          </div>

          <div className="p-5 flex-grow">

            {!shift?.start_time ? (

              <div className="bg-white border border-slate-200 rounded-3xl p-8 text-center shadow-sm max-w-xs mx-auto mt-10">

                <Clock className="mx-auto text-slate-300 mb-4" size={40} />

                <h3 className="font-black text-slate-800 text-sm">Turno Não Iniciado</h3>

                <p className="text-xs text-slate-400 mt-2 leading-relaxed">Inicie o seu expediente na aba <strong>Ponto</strong> para carregar o seu Gantt diário.</p>

              </div>

            ) : sortedAudits.length === 0 ? (

              <div className="bg-white border border-slate-200 rounded-3xl p-8 text-center shadow-sm max-w-xs mx-auto mt-10">

                <CheckCircle className="mx-auto text-emerald-400 mb-3" size={36} />

                <p className="font-black text-slate-700 text-sm">Parabéns! Nenhuma OS pendente para este dia.</p>

              </div>

            ) : (

              <div className="relative border-l-2 border-slate-200/80 ml-4 space-y-6 pb-6">

                {sortedAudits.map((audit, index) => {

                  const plannedStart = audit.faData?.planned_start ? new Date(audit.faData.planned_start).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '--:--';

                  const isSuspended = audit.mobileStatus === 'suspended';

                  const isCompleted = audit.mobileStatus === 'completed';

                  const isStarted = audit.mobileStatus === 'started';

                  const markerColor = isCompleted ? 'bg-slate-400 text-white' : isSuspended ? 'bg-red-500 text-white' : isStarted ? 'bg-emerald-500 text-white animate-pulse' : 'bg-blue-600 text-white';

                  return (

                    <div key={(audit.inspid || 'timeline-item') + '-' + index} className="relative pl-7">

                      {/* Timeline circle badge */}

                      <div className={`absolute -left-[13px] top-1.5 w-6 h-6 rounded-full flex items-center justify-center font-black text-[10px] shadow-md border-2 border-white ${markerColor}`}>

                        {String.fromCharCode(65 + index)}

                      </div>

                      <div className="text-[10px] text-slate-400 font-bold mb-1.5 flex items-center gap-1.5 font-mono">

                        <Clock size={11} /> Programado para: {plannedStart}

                      </div>

                      {renderAuditItem(audit, 'card', index)}

                    </div>

                  );

                })}

              </div>

            )}

          </div>

        </div>

      )}

      {/* ─── TAB 3: ROUTE MAP & DRAG/SWAP REORDER ─── */}

      {activeTab === 'map' && (

        <div className="flex-1 flex flex-col p-4 animate-in fade-in duration-300 relative">

          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[50vh]">

            <MapContainer center={mapPoints[0] || [-23.6156, -46.6378]} zoom={12} className="w-full h-full z-10">

              <LayersControl position="topright">
                <LayersControl.BaseLayer checked name="Mapa Padrão">
                  <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" />
                </LayersControl.BaseLayer>
                <LayersControl.BaseLayer name="Google Trânsito">
                  <TileLayer url="https://mt1.google.com/vt/lyrs=m,traffic&x={x}&y={y}&z={z}" attribution="Google" />
                </LayersControl.BaseLayer>
              </LayersControl>

              {sortedAudits.map((a, i) => {

                const coords = extractCoords(a);
                if (!coords) return null;
                const lat = coords.lat;
                const lng = coords.lng;

                const label = a.faData?.route_sequence || String.fromCharCode(65 + i);

                const mapMarkerIcon = L.divIcon({

                  html: `<div class="flex items-center justify-center w-7 h-7 rounded-full border-2 border-white shadow-md text-white font-black text-[11px]" style="background-color: #2563eb;">${label}</div>`,

                  className: 'custom-map-icon',

                  iconSize: [28, 28]

                });

                return (

                  <Marker key={a.inspid + '-' + i} position={[lat, lng]} icon={mapMarkerIcon}>

                    <Popup>
                      <div className="p-1 font-sans text-xs flex flex-col gap-2 min-w-[120px]">
                        <div>
                          <strong className="block text-slate-800">OS: {a.osid}</strong>
                          <span className="text-slate-500">Sequência: {label}</span>
                        </div>
                        <a 
                          href={`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="bg-blue-600 hover:bg-blue-700 text-white text-[10px] uppercase font-black tracking-wider text-center py-2 rounded-lg flex items-center justify-center gap-1.5 mt-1 transition-colors"
                        >
                          <MapIcon size={12} /> Ir ao Endereço
                        </a>
                      </div>
                    </Popup>
                  </Marker>
                );
              })}

              {mapPoints.length > 1 && <Polyline positions={mapPoints} color="#2563eb" weight={3} dashArray="5, 10" />}

              {currentMapPos && (
                <Marker 
                  position={currentMapPos} 
                  icon={L.divIcon({
                    html: `<div class="relative flex items-center justify-center w-5 h-5"><div class="absolute inline-flex w-full h-full rounded-full bg-blue-400 opacity-75 animate-ping"></div><div class="relative inline-flex w-3.5 h-3.5 rounded-full bg-blue-600 border-2 border-white shadow-sm"></div></div>`,
                    className: 'custom-map-icon',
                    iconSize: [20, 20]
                  })}
                >
                  <Popup>
                    <div className="text-xs font-black text-slate-700">Minha Localização</div>
                  </Popup>
                </Marker>
              )}

            </MapContainer>

          </div>

          <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm mt-4 flex-1 overflow-y-auto">

            <h3 className="font-black text-slate-800 text-xs uppercase tracking-wider mb-3 flex items-center gap-2 border-b pb-2">

              <ArrowLeftRight size={14} className="text-blue-500" /> Reordenar Rotas

            </h3>

            {sortedAudits.length === 0 ? (

              <p className="text-xs text-slate-400 text-center py-4">Nenhuma rota programada para hoje.</p>

            ) : (

              <div className="space-y-2">

                {sortedAudits.map((audit, index) => (

                  <div key={(audit.inspid || 'list-item') + '-' + index} className="flex justify-between items-center p-2 border border-slate-100 rounded-xl bg-slate-50/50">

                    <div className="flex items-center gap-2.5 min-w-0">

                      <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-black text-[9px] flex items-center justify-center">{String.fromCharCode(65 + index)}</span>

                      <span className="font-black text-xs text-slate-700 truncate">OS: {audit.osid}</span>

                    </div>

                    <button

                      onClick={() => setShowSwapModal(audit)}

                      className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg border border-blue-100 transition-colors flex items-center gap-1 text-[9px] font-black uppercase"

                    >

                      <ArrowLeftRight size={11} /> TROCAR

                    </button>

                  </div>

                ))}

              </div>

            )}

          </div>

          {/* Swap Selection Modal */}

          {showSwapModal && (

            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">

              <div className="bg-white w-full max-w-sm rounded-3xl p-5 shadow-2xl animate-in zoom-in-95 duration-200">

                <h4 className="font-black text-slate-800 text-sm mb-2 flex items-center gap-2">

                  <ArrowLeftRight size={16} className="text-blue-600" /> Trocar Posição Rota

                </h4>

                <p className="text-xs text-slate-500 mb-4">Escolha com qual OS deseja trocar a posição <strong>{showSwapModal.faData?.route_sequence}</strong>:</p>

                <div className="space-y-2 max-h-52 overflow-y-auto pr-1">

                  {sortedAudits.filter(a => a.inspid !== showSwapModal.inspid).map(a => (

                    <button

                      key={a.inspid}

                      onClick={() => handleSwapSequence(showSwapModal, a)}

                      className="w-full text-left p-3 border border-slate-100 rounded-xl hover:bg-slate-50 transition-colors flex justify-between items-center"

                    >

                      <div className="flex items-center gap-2">

                        <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-600 font-black text-[9px] flex items-center justify-center border">{a.faData?.route_sequence}</span>

                        <span className="font-black text-xs text-slate-700">OS: {a.osid}</span>

                      </div>

                      <ChevronRight size={14} className="text-slate-400" />

                    </button>

                  ))}

                </div>

                <button

                  onClick={() => setShowSwapModal(null)}

                  className="mt-4 w-full bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-2.5 rounded-xl text-xs uppercase"

                >

                  Cancelar

                </button>

              </div>

            </div>

          )}

        </div>

      )}

      {/* ─── TAB 4: ORIGINAL LIST VIEWS ─── */}

      {activeTab === 'list' && (

        <div className="flex-1 flex flex-col animate-in fade-in duration-300">

          <div className="bg-white px-4 py-2 border-b border-slate-200/80 flex items-center justify-between shrink-0 sticky top-0 z-10 shadow-sm">

            <div className="flex items-center gap-2">

              <Filter size={14} className="text-slate-400 shrink-0" />

              <select value={filterDate} onChange={e => setFilterDate(e.target.value)} className="bg-slate-50 text-slate-700 text-[11px] font-black px-2 py-1 rounded-lg border border-slate-250 outline-none cursor-pointer">

                <option value="">Todas Datas</option>

                {uniqueDates.map(d => <option key={d} value={d}>{fmtDateBR(d + 'T12:00:00')}</option>)}

              </select>

            </div>

            <div className="flex bg-slate-100 p-0.5 rounded-xl border border-slate-200">

              <button onClick={() => setViewMode('lista')} className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase transition-all flex items-center gap-1 ${viewMode === 'lista' ? 'bg-white text-slate-800 shadow-sm font-black' : 'text-slate-400'}`}><List size={12} /> Lista</button>

              <button onClick={() => setViewMode('card')} className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase transition-all flex items-center gap-1 ${viewMode === 'card' ? 'bg-white text-slate-800 shadow-sm font-black' : 'text-slate-400'}`}><Grid size={12} /> Cards</button>

              <button onClick={() => setViewMode('base')} className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase transition-all flex items-center gap-1 ${viewMode === 'base' ? 'bg-white text-slate-800 shadow-sm font-black' : 'text-slate-400'}`}><Database size={12} /> Bases</button>

            </div>

          </div>

          <div className="p-4 flex-1 pb-20">

            {listFiltered.length === 0 ? (

              <div className="bg-white border border-slate-200 rounded-3xl p-8 text-center shadow-sm">

                <CheckCircle className="mx-auto text-emerald-400 mb-3" size={36} />

                <p className="font-black text-slate-700 text-sm">Nenhuma auditoria programada.</p>

              </div>

            ) : viewMode === 'base' ? (

              Object.entries(groupedByBase).map(([base, dataGroup]) => {

                const isCollapsed = collapsedBases[base];

                const pct = dataGroup.total > 0 ? Math.round((dataGroup.completed / dataGroup.total) * 100) : 0;

                return (

                  <div key={base} className="bg-white rounded-3xl shadow-[0_8px_30px_rgba(0,0,0,0.015)] border border-slate-200/70 p-4 mb-4 transition-all duration-300">

                    <div className="flex items-center justify-between cursor-pointer" onClick={() => setCollapsedBases(p => ({ ...p, [base]: !p[base] }))}>

                      <div>

                        <h3 className="font-black text-slate-800 text-sm flex items-center gap-2">

                          <Database size={14} className="text-emerald-500" /> {base}

                        </h3>

                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Progresso: {dataGroup.completed} / {dataGroup.total} OS</p>

                      </div>

                      <div className="flex items-center gap-2">

                        <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full">{pct}%</span>

                        {isCollapsed ? <ChevronDown size={16} className="text-slate-400" /> : <ChevronUp size={16} className="text-slate-400" />}

                      </div>

                    </div>

                    {!isCollapsed && (

                      <div className="space-y-2.5 mt-3 pt-3 border-t border-slate-100">

                        {Object.values(dataGroup.dates).flat().map((audit, idx) => renderAuditItem(audit, 'lista', idx))}

                      </div>

                    )}

                  </div>

                );

              })

            ) : (

              Object.entries(groupedByDate).sort(([a], [b]) => b.localeCompare(a)).map(([date, items]) => {

                const isCollapsed = collapsedGroups[date];

                return (

                  <div key={date} className="bg-white p-4 rounded-3xl border border-slate-200/60 mb-4 shadow-sm">

                    <div className="flex items-center justify-between cursor-pointer mb-2" onClick={() => setCollapsedGroups(p => ({ ...p, [date]: !p[date] }))}>

                      <h3 className="font-black text-slate-800 text-sm flex items-center gap-2"><Calendar size={14} className="text-emerald-500" /> {fmtDateBR(date + 'T12:00:00')}</h3>

                      <div className="flex items-center gap-2">

                        <span className="text-[10px] font-black text-slate-400">{items.length} OS</span>

                        {isCollapsed ? <ChevronDown size={16} className="text-slate-400" /> : <ChevronUp size={16} className="text-slate-400" />}

                      </div>

                    </div>

                    {!isCollapsed && (

                      <div className="space-y-2.5 mt-3 pt-2 border-t border-slate-50">

                        {items.map((audit, idx) => renderAuditItem(audit, viewMode, idx))}

                      </div>

                    )}

                  </div>

                );

              })

            )}

          </div>

        </div>

      )}

      {/* ─── TAB 5: PROFILE & PONTO CONTROL ─── */}

      {/* ─── TAB 3: PONTO ELETRÔNICO ─── */}
      {activeTab === 'ponto' && (
        <div className="flex-1 flex flex-col p-5 space-y-5 animate-in fade-in duration-300 bg-slate-50 pb-24">
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-black text-slate-800 text-xs uppercase tracking-wider flex items-center gap-2">
                <Clock size={14} className="text-blue-600 animate-pulse" /> Controle de Ponto
              </h3>
              <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-lg border ${shift?.start_time && !shift?.end_time
                ? shift.meal_start && !shift.meal_end ? 'bg-amber-50 border-amber-100 text-amber-600' : 'bg-emerald-50 border-emerald-100 text-emerald-600 animate-pulse'
                : 'bg-slate-100 border-slate-200 text-slate-400'
                }`}>
                {shift?.start_time && !shift?.end_time
                  ? shift.meal_start && !shift.meal_end ? 'Em Refeição' : 'Turno Ativo'
                  : 'Ponto Fechado'}
              </span>
            </div>
            
            {/* Se o turno ainda não começou, mostra os inputs de início */}
            {!shift?.start_time ? (
              <div className="space-y-4 pt-2">
                <p className="text-[11px] text-slate-500 leading-relaxed font-medium">
                  Para iniciar seu turno de trabalho, informe os dados abaixo e confirme as permissões para rastreamento em tempo real.
                </p>

                <div className="space-y-3">
                  <div>
                    <label className="block text-[9px] font-black uppercase text-slate-400 mb-1 tracking-wider">Placa do Veículo</label>
                    <input
                      type="text"
                      value={modalPlaca}
                      onChange={e => setModalPlaca(e.target.value.toUpperCase())}
                      placeholder="ABC-1234"
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-800 text-center text-lg outline-none focus:ring-2 focus:ring-emerald-500 transition-all uppercase tracking-wider"
                      maxLength={8}
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] font-black uppercase text-slate-400 mb-1 tracking-wider">Telefone (Celular)</label>
                    <input
                      type="tel"
                      value={modalTelefone}
                      onChange={e => {
                        let v = e.target.value.replace(/\D/g, '');
                        if (v.length > 11) v = v.substring(0, 11);
                        v = v.replace(/^(\d{2})(\d)/g, '$1 $2');
                        v = v.replace(/(\d{5})(\d)/, '$1-$2');
                        setModalTelefone(v);
                      }}
                      placeholder="11 9XXXX-XXXX"
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-800 text-center text-lg outline-none focus:ring-2 focus:ring-emerald-500 transition-all tracking-wider"
                      maxLength={13}
                    />
                  </div>
                </div>

                <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-4 text-left space-y-3 mt-4">
                  <div className="flex items-center gap-2 text-amber-900 font-black text-xs uppercase tracking-wide">
                    <AlertTriangle size={16} className="text-amber-600 shrink-0" />
                    <span>Telemetria Contínua Obrigatória</span>
                  </div>
                  <div className="text-[11px] text-amber-950 space-y-2 leading-tight">
                    <p><strong>GPS:</strong> "Permitir o tempo todo"</p>
                    <p><strong>Bateria:</strong> "Sem Restrições"</p>
                  </div>
                  {gpsService.isNative() && (
                    <button
                      type="button"
                      onClick={() => gpsService.openSettings()}
                      className="w-full py-2 px-3 bg-amber-600 hover:bg-amber-700 text-white font-bold text-[10px] rounded-xl uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all"
                    >
                      <Zap size={14} /> Abrir Configurações
                    </button>
                  )}
                </div>

                <label className="flex items-start gap-2.5 p-3 bg-white border border-slate-200 rounded-xl cursor-pointer select-none text-left shadow-sm">
                  <input
                    type="checkbox"
                    checked={hasConfirmedGpsPerm}
                    onChange={e => setHasConfirmedGpsPerm(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
                  />
                  <span className="text-[10px] text-slate-700 font-medium leading-tight">
                    Confirmo que configurei a localização <strong>O tempo todo</strong>.
                  </span>
                </label>

                <button
                  onClick={handleStartShiftSubmit}
                  disabled={!modalPlaca.trim() || !modalTelefone.trim() || !hasConfirmedGpsPerm}
                  className={`w-full font-black py-4 rounded-2xl shadow-lg transition-all text-sm uppercase tracking-wider flex items-center justify-center gap-2 active:scale-95 mt-4 ${
                    modalPlaca.trim() && modalTelefone.trim() && hasConfirmedGpsPerm
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/30'
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  <PlayCircle size={18} /> AUTORIZAR E INICIAR
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <div className="grid grid-cols-2 gap-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    <div>
                      <span className="text-slate-400 font-mono block">Início Turno</span>
                      <span className="text-slate-750 block mt-0.5 text-xs text-slate-900">{shift?.start_time ? fmtTime(shift.start_time) : '--:--'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-mono block">Veículo</span>
                      <span className="text-slate-750 block mt-0.5 text-xs text-slate-900">{shift?.placa_veiculo || '--'}</span>
                    </div>
                    <div className="pt-2 border-t border-slate-200/50">
                      <span className="text-slate-400 font-mono block">Refeição</span>
                      <span className="text-slate-750 block mt-0.5 text-xs text-slate-900">
                        {shift?.meal_start ? fmtTime(shift.meal_start) : '--'} a {shift?.meal_end ? fmtTime(shift.meal_end) : '--'}
                      </span>
                    </div>
                    <div className="pt-2 border-t border-slate-200/50">
                      <span className="text-slate-400 font-mono block">Término Turno</span>
                      <span className="text-slate-750 block mt-0.5 text-xs text-slate-900">{shift?.end_time ? fmtTime(shift.end_time) : '--:--'}</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {!shift.meal_start ? (
                    <button
                      onClick={() => handleShiftAction('meal_start')}
                      className="bg-amber-500 hover:bg-amber-600 text-white font-black py-3 rounded-2xl text-[10px] shadow-sm uppercase tracking-wider flex justify-center items-center gap-1 active:scale-95"
                    >
                      INICIAR REFEIÇÃO
                    </button>
                  ) : !shift.meal_end ? (
                    <button
                      onClick={() => handleShiftAction('meal_end')}
                      className="bg-blue-500 hover:bg-blue-600 text-white font-black py-3 rounded-2xl text-[10px] shadow-sm uppercase tracking-wider flex justify-center items-center gap-1 active:scale-95"
                    >
                      RETORNAR REFEIÇÃO
                    </button>
                  ) : (
                    <div className="bg-slate-100 text-slate-400 font-black py-3 rounded-2xl text-[10px] flex justify-center items-center uppercase tracking-wider border">
                      REFEIÇÃO CONCLUÍDA
                    </div>
                  )}

                  {!shift.end_time ? (
                    <button
                      onClick={() => handleShiftAction('end')}
                      className="bg-red-500 hover:bg-red-600 text-white font-black py-3 rounded-2xl text-[10px] shadow-sm uppercase tracking-wider flex justify-center items-center gap-1 active:scale-95"
                    >
                      ENCERRAR DIA
                    </button>
                  ) : (
                    <div className="bg-slate-100 text-slate-400 font-black py-3 rounded-2xl text-[10px] flex justify-center items-center uppercase tracking-wider border">
                      DIA ENCERRADO
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── TAB 5: PROFILE ─── */}
      {activeTab === 'profile' && (
        <div className="flex-1 flex flex-col animate-in fade-in duration-300 bg-slate-50 pb-24 h-full overflow-y-auto">
          <MobileProfile
            currentUser={currentUser}
            onBack={() => setActiveTab('dashboard')}
            onLogout={onLogout}
            upsertSupabase={async (table, data) => {
              const { error } = await supabase.from(table).upsert(data);
              return !error;
            }}
          />
        </div>
      )}

      {/* ─── BOTTOM NAVIGATION BAR (Instagram / WhatsApp Style) ─── */}
      <div 
        className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-lg border-t border-slate-200/80 flex items-center justify-around px-2 z-40 shadow-lg shrink-0 select-none"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)', height: 'calc(64px + env(safe-area-inset-bottom))' }}
      >
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`flex flex-col items-center justify-center h-full gap-1 flex-1 ${activeTab === 'dashboard' ? 'text-emerald-500 font-black scale-105' : 'text-slate-400 hover:text-slate-600'} transition-all`}
        >
          <BarChart3 size={20} />
          <span className="text-[9px] font-black uppercase tracking-widest mt-0.5">Painel</span>
        </button>
        <button
          onClick={() => setActiveTab('timeline')}
          className={`flex flex-col items-center justify-center h-full gap-1 flex-1 ${activeTab === 'timeline' ? 'text-emerald-500 font-black scale-105' : 'text-slate-400 hover:text-slate-600'} transition-all`}
        >
          <Clock size={20} />
          <span className="text-[9px] font-black uppercase tracking-widest mt-0.5">Agenda</span>
        </button>
        <button
          onClick={() => setActiveTab('ponto')}
          className={`flex flex-col items-center justify-center h-full gap-1 flex-1 ${activeTab === 'ponto' ? 'text-emerald-500 font-black scale-105' : 'text-slate-400 hover:text-slate-600'} transition-all relative`}
        >
          {activeTab === 'ponto' && <div className="absolute top-0 w-8 h-1 bg-emerald-500 rounded-b-full"></div>}
          <Contact size={20} />
          <span className="text-[9px] font-black uppercase tracking-widest mt-0.5">Ponto</span>
        </button>
        <button
          onClick={() => setActiveTab('map')}
          className={`flex flex-col items-center justify-center h-full gap-1 flex-1 ${activeTab === 'map' ? 'text-emerald-500 font-black scale-105' : 'text-slate-400 hover:text-slate-600'} transition-all`}
        >
          <MapIcon size={20} />
          <span className="text-[9px] font-black uppercase tracking-widest mt-0.5">Mapa</span>
        </button>
        <button
          onClick={() => setActiveTab('profile')}
          className={`flex flex-col items-center justify-center h-full gap-1 flex-1 ${activeTab === 'profile' ? 'text-emerald-500 font-black scale-105' : 'text-slate-400 hover:text-slate-600'} transition-all`}
        >
          <User size={20} />
          <span className="text-[9px] font-black uppercase tracking-widest mt-0.5">Perfil</span>
        </button>
      </div>

    </div>

  );

} function MobileDetail({ audit, getStatusStyle, inProgressAudit, onBack, onStart }) {

  const style = getStatusStyle(audit.mobileStatus);

  const fields = [

    { label: 'OS', value: audit.osid },

    { label: 'Data', value: fmtDateBR(audit.data) },

    { label: 'Equipe', value: audit.equipe },

    { label: 'Base Ajustada', value: audit.base },

    { label: 'Tipo Veículo', value: audit.tipo_veiculo },

    { label: 'Tipo Equipe', value: audit.tipo_equipe },

    { label: 'Atuação', value: audit.atuacao },

    { label: 'Classe Ajustada', value: audit.classe },

    { label: 'Causa Ajustado', value: audit.descricao_causa },

    { label: 'Período', value: audit.periodo },

    { label: 'Base Contrato', value: audit.base_contrato },

    { label: 'Regional', value: audit.regional },

    { label: 'Duração OS', value: audit.minutos ? `${audit.minutos} minutos` : null },

  ];

  return (

    <div className="flex-1 overflow-y-auto flex flex-col bg-slate-50">

      <div className="bg-emerald-600 p-5 pt-10 text-white shadow-md shrink-0">

        <button onClick={onBack} className="flex items-center gap-1.5 text-emerald-100 font-bold mb-3 text-sm"><ArrowLeft size={16} /> Voltar</button>

        <span className={`${style.bg} ${style.text} text-[9px] uppercase font-bold px-2 py-0.5 rounded mb-1.5 inline-block`}>{style.label}</span>

        <h2 className="text-xl font-bold font-sans">OS: {audit.osid}</h2>

        <p className="text-emerald-100 text-xs mt-0.5">{audit.inspid}</p>

      </div>

      <div className="p-4 space-y-4 flex-1 pb-24">

        {audit.mobileStatus === 'suspended' && audit.suspendReason && (

          <div className="bg-red-50 border border-red-200 p-3.5 rounded-xl">

            <p className="text-[10px] text-red-500 uppercase font-black mb-0.5 flex items-center gap-1"><AlertCircle size={12} /> Motivo Suspensão</p>

            <p className="font-bold text-red-800 text-sm">{audit.suspendReason}</p>

          </div>

        )}

        {/* GPS Link Button */}

        {audit.endereco_cliente && (

          <div className="bg-slate-800 p-4 rounded-xl shadow-sm">

            <p className="text-[10px] text-slate-400 uppercase font-black mb-2">Localização do Cliente</p>

            <a href={audit.endereco_cliente} target="_blank" rel="noopener noreferrer" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-3 rounded-xl flex items-center justify-center gap-2 text-xs shadow-md transition-colors">

              <Navigation size={14} /> Abrir Localização no Google Maps

            </a>

          </div>

        )}

        {/* OS Details */}

        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">

          <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider mb-3 border-b pb-1">Dados da OS</h3>

          <div className="grid grid-cols-2 gap-3">

            {fields.map((f, i) => f.value && (

              <div key={i} className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">

                <p className="text-[9px] text-slate-400 uppercase font-black tracking-wider leading-none">{f.label}</p>

                <p className="font-bold text-xs text-slate-700 mt-1 truncate" title={f.value}>{f.value}</p>

              </div>

            ))}

          </div>

        </div>

        {/* Completed field audit view details (For History tab) */}

        {audit.faData && (audit.mobileStatus === 'completed' || audit.mobileStatus === 'suspended') && (

          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 space-y-4">

            <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider border-b pb-1">Dados da Auditoria Realizada</h3>

            <div className="grid grid-cols-2 gap-3 text-xs">

              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">

                <p className="text-[9px] font-black uppercase text-slate-400">Atividade Executada</p>

                <p className="font-bold text-slate-700 mt-0.5">{audit.faData.executed ? 'Sim' : 'Não'}</p>

              </div>

              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">

                <p className="text-[9px] font-black uppercase text-slate-400">Acesso à Residência</p>

                <p className="font-bold text-slate-700 mt-0.5">{audit.faData.access ? 'Sim' : 'Não'}</p>

              </div>

              <div className="col-span-2 bg-slate-50 p-2.5 rounded-lg border border-slate-100">

                <p className="text-[9px] font-black uppercase text-slate-400">Endereço Confirmado</p>

                <p className="font-bold text-slate-700 mt-0.5">

                  CEP: {audit.faData.address?.cep || '--'}

                  {audit.faData.address?.street ? ` | Rua: ${audit.faData.address.street}` : ''}

                  | Nº: {audit.faData.address?.number || '--'}

                  {audit.faData.address?.complement ? ` (${audit.faData.address.complement})` : ''}

                </p>

              </div>

            </div>

            {/* Audit Photos */}

            <div>

              <p className="text-[9px] font-black uppercase text-slate-400 tracking-wider mb-2">Fotos Enviadas</p>

              <div className="grid grid-cols-2 gap-2">

                {Object.entries(audit.faData.photos || {}).map(([key, url]) => (

                  <div key={key} className="border rounded-lg overflow-hidden bg-slate-50 shadow-sm">

                    <a href={url} target="_blank" rel="noopener noreferrer" className="block relative group">

                      <img src={url} alt={key} className="w-full h-20 object-cover" />

                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-[10px] font-bold">Zoom</div>

                    </a>

                    <p className="text-[8px] font-black text-center uppercase text-slate-500 py-1 bg-slate-100 truncate">

                      {key === 'fachada' ? 'Fachada' : key === 'posteCia' ? 'Poste CIA' : key === 'posteCliente' ? 'Poste Cliente' : 'Medição'}

                    </p>

                  </div>

                ))}

              </div>

            </div>

            {/* Google Map of GPS completion */}

            {audit.faData.telemetry?.geo_lat && audit.faData.telemetry?.geo_lng && (

              <div>

                <p className="text-[9px] font-black uppercase text-slate-400 tracking-wider mb-2">Local de Finalização da Auditoria</p>

                <iframe

                  src={`https://maps.google.com/maps?q=${audit.faData.telemetry.geo_lat},${audit.faData.telemetry.geo_lng}&t=&z=15&ie=UTF8&iwloc=&output=embed`}

                  className="w-full h-44 rounded-xl border border-slate-200 shadow-sm"

                  allowFullScreen=""

                  loading="lazy">

                </iframe>

                <div className="mt-2 text-[8px] text-slate-400 font-bold flex flex-wrap gap-2 uppercase">

                  <span>LAT: {audit.faData.telemetry.geo_lat}</span>

                  <span>LNG: {audit.faData.telemetry.geo_lng}</span>

                  <span>IP: {audit.faData.telemetry.ip_address || 'n/a'}</span>

                </div>

              </div>

            )}

          </div>

        )}

      </div>

      <div className="sticky bottom-0 p-4 bg-white border-t border-slate-200 shrink-0">

        {audit.mobileStatus === 'completed' ? (

          <div className="w-full bg-slate-100 text-slate-500 font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 text-xs"><CheckCircle2 size={18} /> Auditoria Finalizada</div>

        ) : (

          <button onClick={onStart} className="w-full bg-slate-800 text-white font-bold py-3.5 rounded-xl shadow-lg flex items-center justify-center gap-2 text-xs">

            {audit.mobileStatus === 'started' ? 'Retomar Auditoria' : audit.mobileStatus === 'suspended' ? 'Retomar Suspensa' : 'Iniciar Auditoria'} <ChevronRight size={18} />

          </button>

        )}

      </div>

    </div>

  );

}

function MobileForm({ audit, inProgressAudit, onBack, onSubmit, onSuspend, uploadPhoto }) {

  const [address, setAddress] = useState({ cep: '', street: '', number: '', complement: '' });

  const handleCepChange = async (val) => {

    const cleanCep = val.replace(/\D/g, '');

    setAddress(prev => ({ ...prev, cep: cleanCep }));

    if (cleanCep.length === 8) {

      try {

        const res = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);

        const data = await res.json();

        if (data && !data.erro) {

          setAddress(prev => ({

            ...prev,

            street: `${data.logradouro}, ${data.bairro} - ${data.localidade}/${data.uf}`

          }));

          setMobError('');

        } else {

          setAddress(prev => ({ ...prev, street: '' }));

          setMobError('CEP não encontrado.');

        }

      } catch (err) {

        console.error('Error fetching CEP:', err);

      }

    } else {

      setAddress(prev => ({ ...prev, street: '' }));

    }

  };

  const [executed, setExecuted] = useState(null);

  const [access, setAccess] = useState(null);

  const [photos, setPhotos] = useState({});

  const [photoUrls, setPhotoUrls] = useState({});

  const [mobError, setMobError] = useState('');

  const [showSuspend, setShowSuspend] = useState(false);

  const [suspendReason, setSuspendReason] = useState('');

  const [saving, setSaving] = useState(false);

  // Telemetry state

  const [telemetryData, setTelemetryData] = useState({

    geo_lat: null,

    geo_lng: null,

    ip_address: null,

    fingerprint: null,

    status: 'collecting', // 'collecting' | 'ready' | 'error'

    error: ''

  });

  useEffect(() => {

    let active = true;

    const collect = async () => {

      try {

        const geo = await requestGeolocation();

        const ip = await fetchPublicIP();

        const fp = await generateFingerprint();

        if (active) {

          setTelemetryData({

            geo_lat: geo.lat,

            geo_lng: geo.lng,

            ip_address: ip,

            fingerprint: fp,

            status: 'ready',

            error: ''

          });

        }

      } catch (err) {

        console.error('Telemetry error:', err);

        if (active) {

          setTelemetryData({

            geo_lat: null,

            geo_lng: null,

            ip_address: null,

            fingerprint: null,

            status: 'error',

            error: 'O acesso ao GPS do dispositivo é OBRIGATÓRIO para prosseguir. Ative a localização nas configurações do seu navegador e tente novamente.'

          });

        }

      }

    };

    collect();

    return () => { active = false; };

  }, []);

  const handlePhoto = async (key, file) => {

    setPhotos(p => ({ ...p, [key]: file }));

    const url = await uploadPhoto(file, `campo/${audit.osid}`);

    if (url) setPhotoUrls(p => ({ ...p, [key]: url }));

  };

  const submit = async () => {

    if (telemetryData.status !== 'ready' || !telemetryData.geo_lat) {

      return setMobError('A Geolocalização do dispositivo ainda não foi coletada ou o acesso foi negado.');

    }

    if (!address.cep || !address.number) return setMobError('Preencha CEP e Número.');

    if (executed === null) return setMobError('Informe se a atividade foi executada.');

    if (!photoUrls.fachada || !photoUrls.posteCia || !photoUrls.posteCliente) return setMobError('Anexe as 3 fotos obrigatórias.');

    if (access === null) return setMobError('Informe se teve acesso à residência.');

    if (access === true && !photoUrls.medicao) return setMobError('Foto do Centro de Medição é obrigatória.');

    setSaving(true);

    await onSubmit({

      inspid: audit.inspid,

      address,

      executed,

      access,

      photos: photoUrls,

      start_time: inProgressAudit?.startTime || new Date().toISOString(),

      telemetry: {

        geo_lat: telemetryData.geo_lat,

        geo_lng: telemetryData.geo_lng,

        ip_address: telemetryData.ip_address,

        fingerprint: telemetryData.fingerprint,

        collected_at: new Date().toISOString()

      }

    });

    setSaving(false);

  };

  return (

    <div className="flex-1 overflow-y-auto flex flex-col relative bg-slate-50">

      <div className="bg-emerald-600 p-5 pt-10 text-white sticky top-0 z-30 shadow-md shrink-0">

        <button onClick={onBack} className="flex items-center gap-1.5 text-emerald-100 font-bold mb-3 text-sm"><ArrowLeft size={16} /> Detalhes</button>

        <h2 className="text-lg font-bold font-sans">OS: {audit.osid}</h2>

        <div className="flex items-center gap-1.5 text-emerald-100 text-xs mt-1">

          <Clock size={12} /> Iniciada às {fmtTime(inProgressAudit?.startTime || new Date())}

        </div>

      </div>

      {telemetryData.status === 'collecting' && (

        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-4">

          <div className="animate-spin rounded-full h-8 w-8 border-4 border-emerald-500 border-t-transparent" />

          <div>

            <p className="font-bold text-slate-700 text-sm">Obtendo localização GPS...</p>

            <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-wider">Aguardando resposta do satélite</p>

          </div>

        </div>

      )}

      {telemetryData.status === 'error' && (

        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-4 max-w-sm mx-auto">

          <AlertCircle className="text-rose-500 animate-bounce" size={44} />

          <div>

            <h3 className="font-black text-slate-800 text-sm uppercase">GPS Obrigatório Desativado</h3>

            <p className="text-xs text-slate-500 mt-2 leading-relaxed">{telemetryData.error}</p>

          </div>

          <button onClick={() => window.location.reload()} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl shadow-md text-xs">

            Tentar Novamente / Recarregar

          </button>

        </div>

      )}

      {telemetryData.status === 'ready' && (

        <>

          <div className="p-4 space-y-5 flex-1 pb-28">

            {/* GPS Nav Button */}

            {audit.endereco_cliente && (

              <div className="bg-slate-800 p-4 rounded-2xl shadow-sm">

                <div className="flex items-start gap-2.5 text-white mb-3">

                  <MapPin className="text-emerald-400 shrink-0 mt-0.5" size={18} />

                  <div>

                    <p className="font-bold text-sm">{audit.base}</p>

                    <p className="text-[10px] text-slate-400 mt-0.5">Navegue até o local.</p>

                  </div>

                </div>

                <a href={audit.endereco_cliente} target="_blank" rel="noopener noreferrer" className="w-full bg-emerald-500 hover:bg-emerald-400 text-white font-bold py-2.5 rounded-xl flex items-center justify-center gap-2 text-sm transition-colors">

                  <Navigation size={16} /> Abrir no GPS

                </a>

              </div>

            )}

            {/* 1. Address */}

            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200">

              <h3 className="font-bold text-slate-800 mb-2 text-sm">1. Confirmar Endereço</h3>

              <div className="space-y-2">

                <input

                  type="text"

                  placeholder="Digite o CEP"

                  value={address.cep}

                  onChange={e => handleCepChange(e.target.value)}

                  maxLength={9}

                  className="w-full p-2.5 border border-slate-300 rounded-xl bg-slate-50 text-sm font-bold animate-pulse-once"

                />

                {address.street && (

                  <div className="bg-emerald-50 text-emerald-800 border border-emerald-100 p-2.5 rounded-xl text-[11px] font-bold transition-all animate-in slide-in-from-top-1">

                    <span className="text-[8px] font-black uppercase text-emerald-600 block mb-0.5">Endereço Encontrado</span>

                    {address.street}

                  </div>

                )}

                <div className="flex gap-2">

                  <input

                    type="text"

                    placeholder="Número"

                    value={address.number}

                    onChange={e => setAddress({ ...address, number: e.target.value })}

                    className="w-1/3 p-2.5 border border-slate-300 rounded-xl bg-slate-50 text-sm font-bold"

                  />

                  <input

                    type="text"

                    placeholder="Complemento"

                    value={address.complement}

                    onChange={e => setAddress({ ...address, complement: e.target.value })}

                    className="w-2/3 p-2.5 border border-slate-300 rounded-xl bg-slate-50 text-sm font-bold"

                  />

                </div>

              </div>

            </div>

            {/* 2. Executed */}

            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200">

              <h3 className="font-bold text-slate-800 mb-2 text-sm">2. Atividade Executada?</h3>

              <div className="flex gap-2">

                <button onClick={() => setExecuted(true)} className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition-all border-2 ${executed === true ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 text-slate-500'}`}>Sim</button>

                <button onClick={() => setExecuted(false)} className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition-all border-2 ${executed === false ? 'border-red-500 bg-red-50 text-red-700' : 'border-slate-200 text-slate-500'}`}>Não</button>

              </div>

            </div>

            {/* 3. Field Photos */}

            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200">

              <h3 className="font-bold text-slate-800 mb-2 text-sm">3. Fotos Obrigatórias</h3>

              <div className="grid grid-cols-2 gap-2">

                {FIELD_PHOTOS_LABELS.map(item => (

                  <label key={item.id} className={`relative border-2 border-dashed rounded-xl p-3 flex flex-col items-center justify-center text-center h-20 cursor-pointer ${photoUrls[item.id] ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-300 text-slate-500'}`}>

                    <input type="file" accept="image/*" className="hidden" onChange={e => e.target.files[0] && handlePhoto(item.id, e.target.files[0])} />

                    {photoUrls[item.id] ? <CheckCircle size={20} className="mb-0.5" /> : <Camera size={20} className="mb-0.5 opacity-50" />}

                    <span className="text-[9px] font-bold uppercase leading-tight">{item.label}</span>

                  </label>

                ))}

              </div>

            </div>

            {/* 4. Access */}

            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200">

              <h3 className="font-bold text-slate-800 mb-2 text-sm">4. Acesso à Residência?</h3>

              <div className="flex gap-2 mb-3">

                <button onClick={() => setAccess(true)} className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition-all border-2 ${access === true ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-500'}`}>Sim</button>

                <button onClick={() => setAccess(false)} className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition-all border-2 ${access === false ? 'border-slate-500 bg-slate-100 text-slate-700' : 'border-slate-200 text-slate-500'}`}>Não</button>

              </div>

              {access === true && (

                <label className={`relative border-2 border-dashed rounded-xl p-3 flex flex-col items-center justify-center text-center h-20 cursor-pointer ${photoUrls.medicao ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-300 text-slate-500'}`}>

                  <input type="file" accept="image/*" className="hidden" onChange={e => e.target.files[0] && handlePhoto('medicao', e.target.files[0])} />

                  {photoUrls.medicao ? <CheckCircle size={20} className="mb-0.5" /> : <Camera size={20} className="mb-0.5 opacity-50" />}

                  <span className="text-[10px] font-bold uppercase">Centro de Medição</span>

                </label>

              )}

            </div>

          </div>

          {/* Footer Actions */}

          <div className="sticky bottom-0 p-4 bg-white border-t border-slate-200 z-20 shrink-0">

            {mobError && <div className="mb-2 text-center text-xs font-bold text-red-600 bg-red-50 border border-red-100 p-2 rounded-lg">{mobError}</div>}

            <div className="flex gap-2">

              <button onClick={() => setShowSuspend(true)} className="flex-[1] bg-red-50 border border-red-200 text-red-600 hover:bg-red-100 font-bold py-3 rounded-xl flex items-center justify-center"><PauseCircle size={18} /></button>

              <button onClick={submit} disabled={saving} className="flex-[3] bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold py-3 rounded-xl shadow-lg flex items-center justify-center gap-2 text-xs">

                {saving ? 'Salvando...' : 'Salvar'} <CheckCircle2 size={18} />

              </button>

            </div>

          </div>

        </>

      )}

      {/* Suspend Modal */}

      {showSuspend && (

        <div className="absolute inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-end justify-center">

          <div className="bg-white w-full rounded-t-3xl p-5 animate-in slide-in-from-bottom-8">

            <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-5" />

            <h3 className="text-lg font-bold text-slate-800 mb-1 flex items-center gap-2"><AlertCircle className="text-red-500" size={20} /> Suspender Auditoria</h3>

            <p className="text-sm text-slate-500 mb-3">Informe o motivo detalhado.</p>

            <textarea value={suspendReason} onChange={e => setSuspendReason(e.target.value)} placeholder="Ex: Portão trancado, endereço não localizado..." className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 h-28 mb-4 outline-none focus:border-red-500 text-sm font-bold" />

            <div className="flex gap-2">

              <button onClick={() => { setShowSuspend(false); setMobError(''); }} className="flex-1 bg-slate-100 text-slate-600 font-bold py-3 rounded-xl">Cancelar</button>

              <button onClick={() => { if (!suspendReason.trim()) return setMobError('Informe o motivo.'); onSuspend(suspendReason); setShowSuspend(false); }} className="flex-1 bg-red-600 text-white font-bold py-3 rounded-xl shadow-lg">Suspender</button>

            </div>

          </div>

        </div>

      )}

    </div>

  );

}

function MobileProfile({ currentUser, onBack, upsertSupabase, onLogout }) {

  const [nome, setNome] = useState(currentUser?.nome || '');

  const [login, setLogin] = useState(currentUser?.login || '');

  const [senha, setSenha] = useState(currentUser?.senha || '');

  const [telefone, setTelefone] = useState(currentUser?.telefone || '');

  const [matricula, setMatricula] = useState(currentUser?.matricula || '');

  const [showSenha, setShowSenha] = useState(false);

  const [saving, setSaving] = useState(false);

  const formatPhone = (value) => {

    if (!value) return '';

    const cleanValue = value.replace(/\D/g, '');

    if (cleanValue.length <= 2) return cleanValue;

    if (cleanValue.length <= 7) return `${cleanValue.slice(0, 2)} ${cleanValue.slice(2)}`;

    return `${cleanValue.slice(0, 2)} ${cleanValue.slice(2, 7)}-${cleanValue.slice(7, 11)}`;

  };

  const handleSave = async (e) => {

    e.preventDefault();

    if (!nome.trim() || !login.trim() || !senha.trim()) {

      alert('Nome, Login e Senha são obrigatórios!');

      return;

    }

    setSaving(true);

    const updatedUser = {

      ...currentUser,

      nome: nome.toUpperCase(),

      login: login.toLowerCase(),

      senha,

      telefone: formatPhone(telefone),

      matricula

    };

    try {

      const ok = await upsertSupabase('usuarios', updatedUser);

      if (ok !== false) {

        sessionStorage.setItem('currentUser', JSON.stringify(updatedUser));

        alert('Perfil atualizado com sucesso!');

        window.location.reload();

      }

    } catch (err) {

      alert('Erro ao atualizar: ' + err.message);

    } finally {

      setSaving(false);

    }

  };

  const handleSystemLogout = () => {

    if (confirm('Deseja realmente sair do sistema?')) {

      sessionStorage.removeItem('currentUser');

      if (onLogout) {

        onLogout();

      } else {

        window.location.reload();

      }

    }

  };

  return (

    <div className="flex-1 overflow-y-auto flex flex-col bg-slate-50 relative pb-20 font-sans">

      {/* Header Banner - Apple Liquid Glass style */}

      <div className="bg-gradient-to-tr from-emerald-600 via-emerald-500 to-teal-500 p-6 pt-10 text-white rounded-b-[2rem] shadow-lg relative overflow-hidden shrink-0">

        <div className="absolute -top-10 -left-10 w-28 h-28 bg-white/10 rounded-full blur-2xl pointer-events-none" />

        <button onClick={onBack} className="flex items-center gap-1.5 text-emerald-100 font-bold mb-4 text-xs uppercase tracking-wider"><ArrowLeft size={16} /> Voltar</button>

        <div className="flex items-center gap-4 relative z-10">

          <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-md text-white flex items-center justify-center font-black text-2xl shadow-inner border border-white/30 uppercase">

            {nome.charAt(0) || 'U'}

          </div>

          <div>

            <h2 className="text-xl font-black tracking-tight uppercase leading-tight">{nome || 'Usuário'}</h2>

            <span className="inline-block bg-white/25 backdrop-blur-sm border border-white/20 text-[9px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full mt-1.5 shadow-sm">

              {currentUser?.perfil || 'Auditor'}

            </span>

          </div>

        </div>

      </div>

      <div className="p-4 space-y-4 flex-1">

        {/* Form Container */}

        <form onSubmit={handleSave} className="bg-white p-5 rounded-3xl shadow-[0_8px_30px_rgba(0,0,0,0.02)] border border-slate-200/60 space-y-4">

          <h3 className="font-black text-slate-800 text-xs uppercase tracking-wider mb-2 border-b pb-2 flex items-center gap-2">

            <User size={14} className="text-emerald-500" /> Meus Dados Cadastrais

          </h3>

          <div className="space-y-3.5">

            <div>

              <label className="block text-[9px] font-black uppercase text-slate-400 mb-1 tracking-wider">Nome Completo</label>

              <input

                required

                type="text"

                value={nome}

                onChange={e => setNome(e.target.value.toUpperCase())}

                className="w-full p-3 bg-slate-50 rounded-xl font-bold text-slate-705 outline-none border border-slate-250/60 focus:ring-2 focus:ring-emerald-500 transition-all text-xs uppercase"

                placeholder="SEU NOME COMPLETO"

              />

            </div>

            <div>

              <label className="block text-[9px] font-black uppercase text-slate-400 mb-1 tracking-wider">Login / Usuário</label>

              <input

                required

                type="text"

                value={login}

                onChange={e => setLogin(e.target.value.toLowerCase())}

                className="w-full p-3 bg-slate-50 rounded-xl font-bold text-slate-705 outline-none border border-slate-250/60 focus:ring-2 focus:ring-emerald-500 transition-all text-xs"

                placeholder="nome.sobrenome"

              />

            </div>

            <div>

              <label className="block text-[9px] font-black uppercase text-slate-400 mb-1 tracking-wider">Senha do Sistema</label>

              <div className="relative">

                <input

                  required

                  type={showSenha ? "text" : "password"}

                  value={senha}

                  onChange={e => setSenha(e.target.value)}

                  className="w-full p-3 bg-slate-50 rounded-xl font-bold text-slate-705 outline-none border border-slate-250/60 focus:ring-2 focus:ring-emerald-500 transition-all pr-10 text-xs"

                  placeholder="Sua senha de acesso"

                />

                <button

                  type="button"

                  onClick={() => setShowSenha(!showSenha)}

                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-emerald-600 transition-colors"

                >

                  {showSenha ? <EyeOff size={16} /> : <Eye size={16} />}

                </button>

              </div>

            </div>

            <div className="grid grid-cols-2 gap-3">

              <div>

                <label className="block text-[9px] font-black uppercase text-slate-400 mb-1 tracking-wider">Telefone</label>

                <input

                  type="text"

                  value={telefone}

                  onChange={e => setTelefone(formatPhone(e.target.value))}

                  className="w-full p-3 bg-slate-50 rounded-xl font-bold text-slate-705 outline-none border border-slate-250/60 focus:ring-2 focus:ring-emerald-500 transition-all text-xs"

                  placeholder="DDD 99999-9999"

                />

              </div>

              <div>

                <label className="block text-[9px] font-black uppercase text-slate-400 mb-1 tracking-wider">Matrícula</label>

                <input

                  type="text"

                  value={matricula}

                  onChange={e => setMatricula(e.target.value)}

                  className="w-full p-3 bg-slate-50 rounded-xl font-bold text-slate-705 outline-none border border-slate-250/60 focus:ring-2 focus:ring-emerald-500 transition-all text-xs"

                  placeholder="Nº da Matrícula"

                />

              </div>

            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">

              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100/80">

                <span className="block text-[8px] font-black uppercase text-slate-400 tracking-wider">Setor</span>

                <span className="text-xs font-bold text-slate-750 block mt-0.5">{currentUser?.setor || 'Operações'}</span>

              </div>

              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100/80">

                <span className="block text-[8px] font-black uppercase text-slate-400 tracking-wider">Regional</span>

                <span className="text-xs font-bold text-slate-750 block mt-0.5">{currentUser?.regional || 'Norte'}</span>

              </div>

            </div>

          </div>

          <button

            type="submit"

            disabled={saving}

            className="w-full py-3 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 disabled:opacity-50 text-white font-black rounded-xl text-xs uppercase tracking-wider shadow-md shadow-emerald-500/10 active:scale-95 duration-200 transition-all flex items-center justify-center gap-2 mt-4"

          >

            {saving ? 'Salvando...' : 'Salvar Alterações'} <Check size={16} />

          </button>

        </form>

        {/* Logout Card - Apple Design style */}

        <div className="bg-white p-5 rounded-3xl shadow-[0_8px_30px_rgba(0,0,0,0.02)] border border-slate-200/60 flex flex-col items-center text-center space-y-3">

          <div className="p-3 bg-rose-50 text-rose-500 rounded-full">

            <LogOut size={22} />

          </div>

          <div>

            <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">Encerrar Sessão</h4>

            <p className="text-[10px] text-slate-400 mt-0.5 leading-relaxed">Você sairá da sua conta neste dispositivo.</p>

          </div>

          <button

            onClick={handleSystemLogout}

            type="button"

            className="w-full py-3 bg-rose-50 hover:bg-rose-100 text-rose-600 font-black rounded-xl text-xs uppercase tracking-wider border border-rose-200/50 active:scale-95 duration-200 transition-all cursor-pointer"

          >

            Sair do Sistema

          </button>

        </div>

      </div>

    </div>

  );

}