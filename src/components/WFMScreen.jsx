import React, { useState, useEffect, useMemo, useRef } from 'react';
import { CheckCircle2, History, ChevronLeft, ChevronRight, Settings, MapPin, Clock, Filter, AlertTriangle, Route, GripVertical, Plus, LayoutTemplate, Columns, Play, Pause, Trash2, X, FileText, Download, Map as MapIcon, HelpCircle, Eye, Users, Search, CalendarX, WifiOff, Wifi, PlayCircle, Navigation, Copy, Check, UserCheck } from 'lucide-react';
import WFMMapView from './WFMMapView';
import WFMBucketTree from './WFMBucketTree';
import ModalHistoricoBuckets from './ModalHistoricoBuckets';
import ModalDetalhesOS from './ModalDetalhesOS';
import ModalEditarOS from './ModalEditarOS';
import ModalStatusAuditor from './ModalStatusAuditor';
import { WFMToastList, WFMConfirmModal } from './WFMToast';
import { supabase } from '../supabaseClient';

export function getOSTimesAndStatus(task, ordens = [], fieldAudits = [], workflows = [], inspecoes = []) {
  if (!task) return {};
  
  const payload = task.payload_dados || task.os_data || {};
  const osId = task.osid || payload.osid || task.id_origem || task.nr_ordem || task.inspid;
  const inspId = task.id_origem || task.inspid || payload.inspid || payload.id_origem;

  const matchedFa = (fieldAudits || []).find(f => 
    (inspId && (f.inspid === inspId || f.id === inspId || f.id_origem === inspId)) || 
    (osId && (f.osid === osId || f.payload_dados?.osid === osId || f.id_origem === osId || f.nr_ordem === osId))
  ) || {};

  const matchedOrdem = (ordens || []).find(o => o.nr_ordem === osId || o.nr_ordem === task.osid || o.nr_ordem === payload.osid) || {};
  const matchedWf = (workflows || []).find(w => (inspId && w.inspid === inspId) || (osId && w.osid === osId)) || {};
  const matchedInsp = (inspecoes || []).find(i => (inspId && i.inspid === inspId) || (osId && i.osid === osId)) || {};

  // Combine logs strictly relevant to Field Audit (Etapa 3 - Campo) and WFM Task
  const allHistLogs = [
    ...(Array.isArray(task.historico) ? task.historico : []),
    ...(Array.isArray(payload.historico) ? payload.historico : []),
    ...(Array.isArray(matchedFa.historico) ? matchedFa.historico : []),
    ...(Array.isArray(matchedWf.historico) ? matchedWf.historico : [])
  ];

  const getLogTime = (log) => {
    if (!log) return null;
    return log.timestamp || log.data || log.created_at || (log.id && typeof log.id === 'number' && log.id > 1700000000000 ? new Date(log.id).toISOString() : null);
  };

  // Find start time of FIELD AUDIT (Etapa 3 - Campo)
  let realStartStr = matchedFa.start_time || task.start_time || payload.start_time;

  if (!realStartStr) {
    const startLog = allHistLogs.find(h => {
      const a = (h.acao || '').toUpperCase();
      const d = (h.detalhes || h.observacao || '').toUpperCase();
      return a === 'AUDITORIA_CAMPO_INICIADA' || a === 'WFM_INICIADA' || a === 'WFM_INICIO' ||
             (a.includes('INICIADA') && !a.includes('TURNO') && !a.includes('ESCALA') && !d.includes('AUTOFISCALIZAÇÃO'));
    });
    if (startLog) {
      realStartStr = getLogTime(startLog);
    }
  }

  // Find end time of FIELD AUDIT (Etapa 3 - Campo)
  let realEndStr = matchedFa.end_time || task.end_time || payload.end_time;

  if (!realEndStr) {
    const endLog = allHistLogs.find(h => {
      const a = (h.acao || '').toUpperCase();
      const d = (h.detalhes || h.observacao || '').toUpperCase();
      return a === 'AUDITORIA_CAMPO_CONCLUIDA' || a === 'AUDITORIA_CAMPO_SUSPENSA' || a === 'WFM_CONCLUIDA' || a === 'WFM_SUSPENSA';
    });
    if (endLog) {
      realEndStr = getLogTime(endLog);
    }
  }

  // Raw status from field audit or wfm task (Etapa 3)
  const rawStatus = (matchedFa.status || task.status || '').toLowerCase();
  const hasCompletedLog = allHistLogs.some(h => (h.acao || '').toUpperCase() === 'AUDITORIA_CAMPO_CONCLUIDA');
  const hasSuspendedLog = allHistLogs.some(h => (h.acao || '').toUpperCase() === 'AUDITORIA_CAMPO_SUSPENSA');

  let status = 'pending';
  if (rawStatus === 'completed' || rawStatus === 'concluida' || rawStatus === 'concluido' || matchedFa.executed === true || hasCompletedLog) {
    status = 'completed';
  } else if (rawStatus === 'suspended' || rawStatus === 'suspensa' || rawStatus === 'suspenso' || hasSuspendedLog) {
    status = 'suspended';
  } else if (rawStatus === 'in_progress' || rawStatus === 'iniciada' || rawStatus === 'iniciado' || (realStartStr && !realEndStr)) {
    status = 'in_progress';
  }

  const plannedStart = task.planned_start ? new Date(task.planned_start) : (payload.planned_start ? new Date(payload.planned_start) : (matchedFa.planned_start ? new Date(matchedFa.planned_start) : null));
  const plannedEnd = task.planned_end ? new Date(task.planned_end) : (payload.planned_end ? new Date(payload.planned_end) : (matchedFa.planned_end ? new Date(matchedFa.planned_end) : null));
  const plannedDurationMins = (plannedStart && plannedEnd)
    ? Math.max(15, Math.round((plannedEnd.getTime() - plannedStart.getTime()) / 60000))
    : (task.minutos || task.duracao || payload.duracao || payload.minutos || matchedOrdem.minutos || 60);

  const realStart = realStartStr ? new Date(realStartStr) : null;
  const realEnd = realEndStr ? new Date(realEndStr) : null;

  let executedDurationMins = null;
  if (realStart && realEnd) {
    executedDurationMins = Math.max(1, Math.round((realEnd.getTime() - realStart.getTime()) / 60000));
  } else if (realStart && status === 'in_progress') {
    executedDurationMins = Math.max(1, Math.round((Date.now() - realStart.getTime()) / 60000));
  }

  return {
    osId,
    status,
    realStart,
    realEnd,
    realStartStr,
    realEndStr,
    plannedStart,
    plannedEnd,
    plannedDurationMins,
    executedDurationMins,
    matchedFa,
    matchedOrdem,
    matchedWf,
    matchedInsp
  };
}

export default function WFMScreen({
  fieldAudits = [],
  ordens = [],
  workflows = [],
  inspecoes = [],
  atividadesExtras = [],
  shifts = [],
  escalas = [],
  onRefreshEscalas,
  currentUser,
  activeRegional,
  onAssignAudit,
  onViewDetails,
  onRefreshAtividades,
  onChangeTaskBase,
  selectedDate,
  setSelectedDate
}) {
  const [historyAuditor, setHistoryAuditor] = useState(null);
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

  const getAuditorHistory = (auditorLogin) => {
    const list = [];
    const scale = escalas.find(e => e.auditor === auditorLogin);
    const shift = shifts.find(s => s.auditor === auditorLogin);
    if (scale) {
      list.push({
        timestamp: scale.created_at || new Date().toISOString(),
        usuario: scale.created_by || 'Operador',
        acao: 'ESCALA_CRIADA',
        observacao: `Escala de trabalho definida: das ${scale.shift_start || '07:00'} às ${scale.shift_end || '17:00'}`
      });
    }
    if (shift) {
      if (shift.start_time) {
        list.push({
          timestamp: shift.start_time,
          usuario: auditorLogin,
          acao: 'TURNO_INICIADO',
          observacao: `Turno de trabalho iniciado. Veículo registrado: ${shift.placa_veiculo || 'Não informado'}. Localização de início: Lat: ${shift.gps_lat || '-'}, Lng: ${shift.gps_lng || '-'}`
        });
      }
      if (shift.meal_start) {
        list.push({
          timestamp: shift.meal_start,
          usuario: auditorLogin,
          acao: 'REFEICAO_INICIADA',
          observacao: 'Pausa para refeição iniciada.'
        });
      }
      if (shift.meal_end) {
        list.push({
          timestamp: shift.meal_end,
          usuario: auditorLogin,
          acao: 'REFEICAO_ENCERRADA',
          observacao: 'Retorno da pausa para refeição.'
        });
      }
      if (shift.end_time) {
        list.push({
          timestamp: shift.end_time,
          usuario: auditorLogin,
          acao: 'TURNO_ENCERRADO',
          observacao: 'Turno de trabalho finalizado.'
        });
      }
    }

    fieldAudits.forEach(fa => {
      if (fa.auditor === auditorLogin && Array.isArray(fa.historico)) {
        fa.historico.forEach(h => {
          if (h && h.timestamp) {
            list.push({
              timestamp: h.timestamp,
              usuario: h.usuario || 'Operador',
              acao: h.acao,
              observacao: `OS ${fa.os_data?.osid || fa.id_origem}: ${h.observacao || h.detalhes || ''}`
            });
          }
        });
      }
    });

    return list.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  };

  const handleTrackAuditor = (auditorLogin) => {
    const shift = shifts.find(s => s.auditor === auditorLogin);
    if (!shift || !shift.gps_lat || !shift.gps_lng) {
      addToast('Localização GPS do auditor não disponível ou turno não iniciado.', 'warning');
      return;
    }
    setViewMode('map');
    setSelectedBucketName(auditorLogin);
  };

  const [auditors, setAuditors] = useState([]);
  const [statusAuditorModal, setStatusAuditorModal] = useState(null);
  const [prefs, setPrefs] = useState([]);
  const [viewMode, setViewMode] = useState(() => localStorage.getItem('wfmViewMode') || 'dispatch');
  const [zoomLevel, setZoomLevel] = useState(30);
  const [auditorColWidth, setAuditorColWidth] = useState(250);
  const unscheduledColWidth = 100;
  const [isResizing, setIsResizing] = useState(false);
  const [expandedBases, setExpandedBases] = useState({});
  const [showBucketDrawer, setShowBucketDrawer] = useState(false);
  const [showNewTaskModal, setShowNewTaskModal] = useState(false);
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [selectedBucketName, setSelectedBucketName] = useState('');
  const [isBucketConfigMode, setIsBucketConfigMode] = useState(false);
  const [showInactiveBuckets, setShowInactiveBuckets] = useState(false);
  const [bucketStatuses, setBucketStatuses] = useState(() => {
    try {
      const cached = localStorage.getItem('fleet_wfm_bucket_statuses');
      return cached ? JSON.parse(cached) : {};
    } catch(e) { return {}; }
  });
  const [bucketHistoryLogs, setBucketHistoryLogs] = useState(() => {
    try {
      const cached = localStorage.getItem('fleet_wfm_bucket_history_logs');
      return cached ? JSON.parse(cached) : [];
    } catch(e) { return []; }
  });
  const [showBucketHistoryModal, setShowBucketHistoryModal] = useState(false);

  const handleToggleBucketStatus = (bucketName) => {
    setBucketStatuses(prev => {
      const current = prev[bucketName] || 'ATIVO';
      const next = current === 'ATIVO' ? 'INATIVO' : 'ATIVO';
      const updated = { ...prev, [bucketName]: next };
      try { localStorage.setItem('fleet_wfm_bucket_statuses', JSON.stringify(updated)); } catch(e) {}
      
      const newLog = {
        id: Date.now(),
        bucket_nome: bucketName,
        acao: next === 'INATIVO' ? 'INATIVACAO' : 'REATIVACAO',
        detalhes: next === 'INATIVO' ? 'Bucket inativado temporariamente' : 'Bucket reativado',
        usuario: currentUser?.nome || currentUser?.login || 'Operador',
        created_at: new Date().toISOString()
      };
      setBucketHistoryLogs(prevLogs => {
        const newLogs = [newLog, ...prevLogs];
        try { localStorage.setItem('fleet_wfm_bucket_history_logs', JSON.stringify(newLogs)); } catch(e) {}
        return newLogs;
      });
      addToast(next === 'INATIVO' ? `Bucket "${bucketName}" inativado temporariamente.` : `Bucket "${bucketName}" reativado com sucesso!`, 'info');
      return updated;
    });
  };

  const handleDeleteBucket = (bucketName) => {
    askConfirm({
      title: 'Excluir Bucket',
      message: `Deseja realmente excluir/inativar permanentemente o Bucket "${bucketName}"?`,
      confirmText: 'Excluir Bucket',
      variant: 'danger',
      onConfirm: () => {
        setBucketStatuses(prev => {
          const updated = { ...prev, [bucketName]: 'INATIVO' };
          try { localStorage.setItem('fleet_wfm_bucket_statuses', JSON.stringify(updated)); } catch(e) {}
          
          const newLog = {
            id: Date.now(),
            bucket_nome: bucketName,
            acao: 'EXCLUSAO',
            detalhes: 'Bucket excluído pelo usuário',
            usuario: currentUser?.nome || currentUser?.login || 'Operador',
            created_at: new Date().toISOString()
          };
          setBucketHistoryLogs(prevLogs => {
            const newLogs = [newLog, ...prevLogs];
            try { localStorage.setItem('fleet_wfm_bucket_history_logs', JSON.stringify(newLogs)); } catch(e) {}
            return newLogs;
          });
          return updated;
        });
        addToast(`Bucket "${bucketName}" excluído com sucesso!`, 'success');
      }
    });
  };

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSearchOS, setSelectedSearchOS] = useState(null);

  const handleOpenOSDetails = (osToOpen) => {
    if (onViewDetails) {
      onViewDetails(osToOpen);
    } else {
      setSelectedSearchOS(osToOpen);
    }
  };

  const [editingTask, setEditingTask] = useState(null);
  const [listMode, setListMode] = useState('grid'); // 'grid' or 'list'
  const [selectedOsIds, setSelectedOsIds] = useState([]);

  useEffect(() => {
    setSelectedOsIds([]);
  }, [selectedBucketName]);

  const [currentTime, setCurrentTime] = useState(new Date());
  const [showConfig, setShowConfig] = useState(null);
  const [showActivityModal, setShowActivityModal] = useState(null);
  const [ganttActionItem, setGanttActionItem] = useState(null);

  useEffect(() => { localStorage.setItem('wfmViewMode', viewMode); }, [viewMode]);

  const extractCoords = (fa) => {
    if (!fa) return null;
    if (fa.os_data?.latitude && fa.os_data?.longitude) {
      return { lat: parseFloat(fa.os_data.latitude), lng: parseFloat(fa.os_data.longitude) };
    }
    if (fa.latitude && fa.longitude) {
      return { lat: parseFloat(fa.latitude), lng: parseFloat(fa.longitude) };
    }
    if (fa.payload_dados?.latitude && fa.payload_dados?.longitude) {
      return { lat: parseFloat(fa.payload_dados.latitude), lng: parseFloat(fa.payload_dados.longitude) };
    }
    return null;
  };

  const getDistance = (lat1, lon1, lat2, lon2) => {
    if (!lat1 || !lon1 || !lat2 || !lon2) return 99999;
    const R = 6371; // km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  const handleOptimizeRoute = async (auditorLogin) => {
    const pref = prefs.find(p => p.auditor === auditorLogin);
    if (!pref || !pref.start_lat) return addToast('Ponto fixo de partida do auditor não configurado.', 'warning', 'Ponto Fixo');

    const myOs = fieldAudits.filter(f => f.auditor === auditorLogin && (!f.assigned_date || f.assigned_date === dateStr) && f.status === 'pending');
    if (myOs.length === 0) return addToast('Não há OS pendentes para otimizar para este auditor.', 'info', 'Otimização');

    const startH = pref.shift_start ? parseInt(pref.shift_start.split(':')[0]) : 7;
    const startM = pref.shift_start ? parseInt(pref.shift_start.split(':')[1]) : 0;
    let currentSlot = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), startH, startM, 0);
    let route = [];

    const coordsList = myOs.map(extractCoords).filter(c => c !== null);
    if (coordsList.length > 0) {
      try {
        const osrmCoords = [
          `${pref.start_lng},${pref.start_lat}`,
          ...coordsList.map(c => `${c.lng},${c.lat}`)
        ].join(';');
        const url = `https://router.project-osrm.org/trip/v1/driving/${osrmCoords}?source=first&roundtrip=true`;
        const res = await fetch(url);
        const json = await res.json();
        if (json.code === 'Ok' && json.trips && json.trips[0] && json.waypoints) {
          const sortedWaypoints = [...json.waypoints]
            .sort((a, b) => a.waypoint_index - b.waypoint_index)
            .filter(wp => wp.input_index > 0);
          route = sortedWaypoints.map(wp => myOs[wp.input_index - 1]);
        }
      } catch (err) {
        console.error("OSRM Route optimization failed, falling back to local greedy solver:", err);
      }
    }

    if (route.length === 0) {
      let lastLat = pref.start_lat;
      let lastLng = pref.start_lng;
      let remaining = [...myOs];

      while (remaining.length > 0) {
        remaining.sort((a, b) => {
          const coordsA = extractCoords(a);
          const coordsB = extractCoords(b);
          const dA = getDistance(lastLat, lastLng, coordsA?.lat, coordsA?.lng);
          const dB = getDistance(lastLat, lastLng, coordsB?.lat, coordsB?.lng);
          return dA - dB;
        });

        const nextOs = remaining.shift();
        const coordsNext = extractCoords(nextOs);
        if (coordsNext) {
          lastLat = coordsNext.lat;
          lastLng = coordsNext.lng;
        }
        route.push(nextOs);
      }
    }

    for (const os of route) {
      currentSlot = findFreeSlot(currentSlot, auditorLogin, 60);
      const minutos = os.payload_dados?.minutos || os.os_data?.minutos || 60;
      if (onAssignAudit) {
        await onAssignAudit(os, auditorLogin, dateStr, currentSlot.toISOString());
      }
      currentSlot = new Date(currentSlot.getTime() + minutos * 60000);
    }

    addToast(`Rota otimizada com sucesso! ${route.length} OS ordenadas com sucesso na timeline.`, 'success', 'Rota Otimizada');
  };

  const startResizing = React.useCallback((e) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  useEffect(() => {
    if (!isResizing) return;
    const handleMouseMove = (e) => {
      if (e.clientX > 150 && e.clientX < 400) setAuditorColWidth(e.clientX);
    };
    const handleMouseUp = () => setIsResizing(false);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const fetchPrefs = async () => {
    const { data: prefsData } = await supabase.from('autofiscalizacao_auditor_prefs').select('*');
    if (prefsData) setPrefs(prefsData);
  };

  useEffect(() => {
    const fetchAuditors = async () => {
      let query = supabase.from('usuarios').select('*').ilike('perfil', '%auditor%');
      if (activeRegional && !['Global', 'Todas'].includes(activeRegional)) {
        query = query.eq('regional', activeRegional);
      }
      const { data: users } = await query;
      if (users) setAuditors(users);
      fetchPrefs();
    };

    fetchAuditors();
  }, [activeRegional]);

  // Use local time to prevent UTC day shifting

  const tzOffset = selectedDate.getTimezoneOffset() * 60000;

  const localISOTime = new Date(selectedDate.getTime() - tzOffset).toISOString().slice(0, -1);

  const dateStr = localISOTime.split('T')[0];

  const isToday = new Date().toLocaleDateString('en-CA') === dateStr;

  const getOsId = (fa) => {

    if (fa.osid) return fa.osid;

    const wf = workflows?.find(w => w.inspid === fa.inspid);

    return wf ? wf.osid : null;

  };

  const bucketOS = useMemo(() => {

    let filtered = fieldAudits.filter(fa => !fa.auditor && fa.status !== 'completed' && fa.status !== 'concluida');

    if (searchQuery.trim()) {

      const q = searchQuery.toLowerCase().trim();

      filtered = filtered.filter(fa => {

        const osId = String(fa.os_data?.osid || fa.id_origem || '').toLowerCase();

        const base = String(fa.os_data?.base_contrato || fa.os_data?.base || '').toLowerCase();

        const address = String(fa.os_data?.endereco_completo || fa.os_data?.endereco || '').toLowerCase();

        const team = String(fa.os_data?.equipe || '').toLowerCase();

        const cat = String(fa.categoria || '').toLowerCase();

        return osId.includes(q) || base.includes(q) || address.includes(q) || team.includes(q) || cat.includes(q);

      });

    }

    return filtered;

  }, [fieldAudits, searchQuery]);

  const bases = useMemo(() => {

    const map = {};

    bucketOS.forEach(wf => {

      let b = wf.base_contrato || wf.base || wf.payload_dados?.base || wf.os_data?.base_contrato;

      if (!b || b === 'undefined' || b === 'null') {

        b = 'Ordem de Serviço';

      }

      if (!map[b]) map[b] = [];

      map[b].push(wf);

    });

    return Object.entries(map).sort((a, b) => b[1].length - a[1].length);

  }, [bucketOS]);

  const cleanBaseName = (name) => {

    if (!name) return '';

    return name.replace(/^base\s+/i, '').trim().toLowerCase();

  };

  const getOsInBucket = (bucketName) => {

    if (!bucketName) return bucketOS;

    // Check if it's an auditor

    const isAuditor = auditors.some(a => a.login === bucketName || a.nome === bucketName);

    if (isAuditor) {

      const auditorObj = auditors.find(a => a.login === bucketName || a.nome === bucketName);

      return fieldAudits.filter(fa => fa.auditor === auditorObj.login);

    }

    const DE_PARA_BASES = {

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

    if (bucketName === 'Verificação Manual') {

      return bucketOS.filter(fa => {

        const baseName = cleanBaseName(fa.os_data?.base_contrato);

        let found = false;

        for (const op of Object.keys(DE_PARA_BASES)) {

          for (const reg of Object.keys(DE_PARA_BASES[op])) {

            if (DE_PARA_BASES[op][reg].map(cleanBaseName).includes(baseName)) {

              found = true;

              break;

            }

          }

          if (found) break;

        }

        return !found;

      });

    }

    // Check if it's an operation

    if (DE_PARA_BASES[bucketName]) {

      const basesList = [];

      Object.keys(DE_PARA_BASES[bucketName]).forEach(reg => {

        basesList.push(...DE_PARA_BASES[bucketName][reg]);

      });

      const cleanBases = basesList.map(cleanBaseName);

      return bucketOS.filter(fa => cleanBases.includes(cleanBaseName(fa.os_data?.base_contrato)));

    }

    // Check if it's a region

    for (const op of Object.keys(DE_PARA_BASES)) {

      if (DE_PARA_BASES[op][bucketName]) {

        const cleanBases = DE_PARA_BASES[op][bucketName].map(cleanBaseName);

        return bucketOS.filter(fa => cleanBases.includes(cleanBaseName(fa.os_data?.base_contrato)));

      }

    }

    // Check if it's a base name

    return bucketOS.filter(fa => cleanBaseName(fa.os_data?.base_contrato) === cleanBaseName(bucketName));

  };

  const unallocatedOsToShow = useMemo(() => {

    if (searchQuery.trim()) {

      const q = searchQuery.toLowerCase().trim();

      return fieldAudits.filter(fa => {

        const stringsToSearch = [

          fa.id,

          fa.id_origem,

          fa.osid,

          fa.auditor,

          fa.status,

          fa.categoria,

          fa.payload_dados?.osid,

          fa.payload_dados?.nr_ordem,

          fa.payload_dados?.base_contrato,

          fa.payload_dados?.base,

          fa.payload_dados?.endereco_completo,

          fa.payload_dados?.endereco_cliente,

          fa.payload_dados?.endereco,

          fa.payload_dados?.equipe,

          fa.payload_dados?.tipo_atividade,

          fa.payload_dados?.titulo,

          fa.os_data?.osid,

          fa.os_data?.nr_ordem,

          fa.os_data?.base_contrato,

          fa.os_data?.base,

          fa.os_data?.endereco_completo,

          fa.os_data?.equipe

        ];

        return stringsToSearch.some(val =>

          val !== undefined &&

          val !== null &&

          String(val).toLowerCase().includes(q)

        );

      });

    }

    return getOsInBucket(selectedBucketName);

  }, [selectedBucketName, bucketOS, auditors, fieldAudits, searchQuery]);

  const searchResults = useMemo(() => {

    if (!searchQuery.trim()) return [];

    const q = searchQuery.toLowerCase().trim();

    const list = [];

    const seenOs = new Set();

    fieldAudits.forEach(fa => {

      const osId = getOsId(fa) || fa.osid || fa.id_origem || fa.payload_dados?.osid || fa.nr_ordem || '';

      const base = fa.payload_dados?.base || fa.base || fa.base_contrato || '';

      const auditorName = fa.auditor || '';

      const endereco = fa.payload_dados?.endereco || fa.address?.street || fa.endereco_cliente || '';

      if (

        osId.toLowerCase().includes(q) ||

        base.toLowerCase().includes(q) ||

        auditorName.toLowerCase().includes(q) ||

        endereco.toLowerCase().includes(q)

      ) {

        if (!seenOs.has(osId)) {

          seenOs.add(osId);

          list.push({

            osId: osId || 'OS-Sem-ID',

            status: fa.status || 'pending',

            address: endereco || (fa.payload_dados?.latitude ? `Lat: ${fa.payload_dados.latitude}, Lng: ${fa.payload_dados.longitude}` : 'Sem Endereço Registrado'),

            auditor: fa.auditor || 'Não Alocado',

            raw: fa

          });

        }

      }

    });

    ordens.forEach(o => {

      const osId = o.nr_ordem || o.osid || '';

      const base = o.base || o.base_contrato || '';

      const endereco = o.endereco_cliente || o.endereco_completo || '';

      if (

        osId.toLowerCase().includes(q) ||

        base.toLowerCase().includes(q) ||

        endereco.toLowerCase().includes(q)

      ) {

        if (!seenOs.has(osId)) {

          seenOs.add(osId);

          list.push({

            osId: osId || 'OS-Sem-ID',

            status: o.status_fisc || 'pending',

            address: endereco || 'Sem Endereço Registrado',

            auditor: 'N/A',

            raw: o

          });

        }

      }

    });

    return list.slice(0, 15);

  }, [searchQuery, fieldAudits, ordens]);

  const getSelectedBucketDisplayName = () => {

    if (!selectedBucketName) return '';

    const auditorObj = auditors.find(a => a.login === selectedBucketName);

    return auditorObj ? auditorObj.nome : selectedBucketName;

  };

  const handleBulkAssign = async (auditorLogin) => {

    if (!auditorLogin) return;

    try {

      const selectedTasks = unallocatedOsToShow.filter(t => selectedOsIds.includes(t.inspid));

      for (const task of selectedTasks) {

        await onAssignAudit(task, auditorLogin, null, null);

      }

      setSelectedOsIds([]);

      addToast(`${selectedTasks.length} OS designadas com sucesso para ${auditorLogin}!`, 'success', 'Alocação em Massa');

    } catch (err) {

      console.error(err);

      addToast('Erro ao alocar tarefas em massa.', 'error');

    }

  };

  const handleBulkChangeBase = async (newBase) => {

    if (!newBase) return;

    try {

      const selectedTasks = unallocatedOsToShow.filter(t => selectedOsIds.includes(t.inspid));

      for (const task of selectedTasks) {

        await handleChangeTaskBase(task, newBase);

      }

      setSelectedOsIds([]);

      addToast(`Base de ${selectedTasks.length} OS alterada para ${newBase}!`, 'success', 'Transferência de Base');

    } catch (err) {

      console.error(err);

      addToast('Erro ao alterar base das OS em massa.', 'error');

    }

  };

  const timelineBounds = useMemo(() => {

    let minHour = 7;

    let maxHour = 18;

    prefs.forEach(p => {

      if (p.shift_start) {

        const h = parseInt(p.shift_start.split(':')[0], 10);

        if (h < minHour) minHour = h;

      }

      if (p.shift_end) {

        let h = parseInt(p.shift_end.split(':')[0], 10);

        const sH = p.shift_start ? parseInt(p.shift_start.split(':')[0], 10) : 7;

        if (h < sH) h += 24; // Cruza meia-noite

        if (h > maxHour) maxHour = h;

      }

    });

    escalas.forEach(e => {

      if (e.shift_start) {

        const h = parseInt(e.shift_start.split(':')[0], 10);

        if (h < minHour) minHour = h;

      }

      if (e.shift_end) {

        let h = parseInt(e.shift_end.split(':')[0], 10);

        const sH = e.shift_start ? parseInt(e.shift_start.split(':')[0], 10) : 7;

        if (h < sH) h += 24; // Cruza meia-noite

        if (h > maxHour) maxHour = h;

      }

    });

    fieldAudits.forEach(fa => {

      if (fa.planned_start && fa.assigned_date === dateStr) {

        const d = new Date(fa.planned_start);

        let h = d.getHours();

        const taskDate = d.toLocaleDateString('en-CA');

        if (taskDate > dateStr) {

          h += 24; // Madrugada do dia seguinte

        }

        if (h < minHour) minHour = h;

        if (h > maxHour) maxHour = h;

      }

    });

    atividadesExtras.forEach(at => {

      if (at.data === dateStr && at.planned_start) {

        const dStart = new Date(at.planned_start);

        let startH = dStart.getHours();

        const taskDateStart = dStart.toLocaleDateString('en-CA');

        if (taskDateStart > dateStr) {

          startH += 24;

        }

        const dEnd = new Date(at.planned_end);

        let endH = dEnd.getHours();

        const taskDateEnd = dEnd.toLocaleDateString('en-CA');

        if (taskDateEnd > dateStr) {

          endH += 24;

        }

        if (startH < minHour) minHour = startH;

        if (endH > maxHour) maxHour = endH;

      }

    });

    if (minHour < 0) minHour = 0;

    if (maxHour > 30) maxHour = 30; // Limite de 30 horas (06:00 da manhã do dia seguinte)

    if (maxHour <= 23) {

      maxHour = Math.min(23, maxHour + 1);

    } else {

      maxHour = Math.min(30, maxHour + 1);

    }

    return { minHour, maxHour };

  }, [prefs, escalas, fieldAudits, atividadesExtras, dateStr]);

  const { minHour, maxHour } = timelineBounds;

  const zoomToPxPerMin = { 5: 19.2, 10: 9.6, 30: 3.2, 60: 1.6 };

  const pxPerMin = zoomToPxPerMin[zoomLevel];

  const slotWidthPx = zoomLevel * pxPerMin;

  const timeSlots = [];

  for (let h = minHour; h <= maxHour; h++) {

    for (let m = 0; m < 60; m += zoomLevel) {

      if (h === maxHour && m > 0) break;

      const realHour = h % 24;

      timeSlots.push({ hour: h, minute: m, label: `${realHour.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}` });

    }

  }

  const handleDragStart = (e, item) => e.dataTransfer.setData('application/json', JSON.stringify(item));

  const handleDragOver = (e) => e.preventDefault();

  // Helper to find next free slot

  const findFreeSlot = (baseDate, auditorLogin, durationMins = 60) => {
    let slot = new Date(baseDate);
    let collision = true;
    const myOs = fieldAudits.filter(f => f.auditor === auditorLogin && f.assigned_date === dateStr && f.planned_start);
    const myExtras = atividadesExtras.filter(at => at.auditor === auditorLogin && at.data === dateStr && at.planned_start);

    while (collision) {
      collision = false;
      const slotEnd = new Date(slot.getTime() + durationMins * 60000);
      for (const fa of myOs) {
        const faStart = new Date(fa.planned_start);
        const faEnd = new Date(faStart.getTime() + 60 * 60000); // default 60min
        if ((slot >= faStart && slot < faEnd) || (slotEnd > faStart && slotEnd <= faEnd) || (slot <= faStart && slotEnd >= faEnd)) {
          collision = true;
          break;
        }
      }

      for (const at of myExtras) {
        const atStart = new Date(at.planned_start);
        const atEnd = new Date(at.planned_end || atStart.getTime() + 60 * 60000);
        if ((slot >= atStart && slot < atEnd) || (slotEnd > atStart && slotEnd <= atEnd) || (slot <= atStart && slotEnd >= atEnd)) {
          collision = true;
          break;
        }
      }

      if (collision) slot = new Date(slot.getTime() + 30 * 60000); // push 30 mins
    }
    return slot;
  };

  const handleDrop = async (e, auditorLogin, dropHourDecimal) => {
    e.preventDefault();
    e.stopPropagation();

    const escala = escalas.find(esc => esc.auditor === auditorLogin);
    if (!escala) {
      addToast('Não é possível alocar atividades para este auditor hoje: Auditor sem escala habilitada.', 'warning', 'Escala Inativa');
      return;
    }

    const data = e.dataTransfer.getData('application/json');
    if (!data) return;

    const item = JSON.parse(data);

    const isStarted = item.status === 'iniciada' || item.status === 'in_progress' || item.status === 'completed';
    if (isStarted) {
      addToast('Esta atividade já foi iniciada e não pode ser reprogramada.', 'warning', 'Atividade em Andamento');
      return;
    }

    let finalDateIso = null;
    if (dropHourDecimal !== -1) {
      const dropDateForCheck = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), Math.floor(dropHourDecimal), Math.round((dropHourDecimal % 1) * 60), 0);
      if (dropDateForCheck.getTime() < new Date().getTime()) {
        addToast('Não é possível programar atividades no passado.', 'warning', 'Horário Inválido');
        return;
      }
    }

    if (dropHourDecimal !== -1) {
      const dropDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), Math.floor(dropHourDecimal), Math.round((dropHourDecimal % 1) * 60), 0);
      const freeSlot = findFreeSlot(dropDate, auditorLogin, item.minutos || 60);
      finalDateIso = freeSlot.toISOString();
    }

    if (item.inspid || item.os_data) {
      if (onAssignAudit) {
        const existingFa = fieldAudits.find(f => f.inspid === item.inspid) || {
          inspid: item.inspid,
          osid: getOsId(item) || item.osid,
          status: 'pending'
        };
        await onAssignAudit(existingFa, auditorLogin, dateStr, finalDateIso);
        addToast(`OS alocada com sucesso para ${auditorLogin}!`, 'success', 'Alocação Concluída');
      }
    } else if (item.tipo_atividade) {
      let endIso = null;
      if (finalDateIso) {
        const end = new Date(new Date(finalDateIso).getTime() + 60 * 60000);
        endIso = end.toISOString();
      }
      await supabase.from('autofiscalizacao_atividades_extras').update({
        auditor: auditorLogin,
        planned_start: finalDateIso,
        planned_end: endIso
      }).eq('id', item.id);
      if (onRefreshAtividades) onRefreshAtividades();
      addToast(`Atividade alocada com sucesso para ${auditorLogin}!`, 'success', 'Atividade Extra');
    }
  };

  const handleUnassignDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const data = e.dataTransfer.getData('application/json');
    if (!data) return;
    const item = JSON.parse(data);
    if (item.inspid && onAssignAudit && item.auditor) {
      const existingFa = fieldAudits.find(f => f.inspid === item.inspid);
      if (existingFa) {
        onAssignAudit(existingFa, '', null, null);
        addToast('OS desalocada e retornada ao Bucket!', 'info', 'Desalocação');
      }
    }
  };

  const getAssignedOS = (auditorLogin) => {

    let assigned = fieldAudits.filter(fa => fa.auditor === auditorLogin && (fa.assigned_date === dateStr || !fa.assigned_date));

    if (searchQuery.trim()) {

      const q = searchQuery.toLowerCase().trim();

      assigned = assigned.filter(fa => {

        const osId = String(fa.os_data?.osid || fa.id_origem || '').toLowerCase();

        const base = String(fa.os_data?.base_contrato || fa.os_data?.base || '').toLowerCase();

        const address = String(fa.os_data?.endereco_completo || fa.os_data?.endereco || '').toLowerCase();

        const team = String(fa.os_data?.equipe || '').toLowerCase();

        const cat = String(fa.categoria || '').toLowerCase();

        return osId.includes(q) || base.includes(q) || address.includes(q) || team.includes(q) || cat.includes(q);

      });

    }

    return assigned;

  };

  const getAssignedExtras = (auditorLogin) => atividadesExtras.filter(at => at.auditor === auditorLogin && at.data === dateStr);

  const calcLeftPx = (dateStrISO) => {

    if (!dateStrISO) return 0;

    const d = new Date(dateStrISO);

    let hours = d.getHours();

    // Se o evento é de madrugada do dia seguinte, somamos 24 horas

    const taskDate = d.toLocaleDateString('en-CA');

    if (taskDate > dateStr) {

      hours += 24;

    }

    return ((hours - minHour) * 60 + d.getMinutes()) * pxPerMin;

  };

  const calcWidthPx = (startISO, endISO, defaultMinutes) => {

    if (!startISO) return defaultMinutes * pxPerMin;

    if (!endISO) return defaultMinutes * pxPerMin;

    const start = new Date(startISO).getTime();

    const end = new Date(endISO).getTime();

    const mins = (end - start) / 60000;

    return Math.max(mins, 15) * pxPerMin;

  };

  const getProgress = (startISO, endISO) => {

    if (!startISO || !endISO || !isToday) return 0;

    const start = new Date(startISO).getTime();

    const end = new Date(endISO).getTime();

    const now = currentTime.getTime();

    if (now < start) return 0;

    if (now > end) return 100;

    return ((now - start) / (end - start)) * 100;

  };

  const getColorClasses = (status, type) => {

    if (status === 'completed' || status === 'concluido') return 'bg-blue-500';

    if (status === 'in_progress' || status === 'iniciada') return 'bg-emerald-500';

    if (status === 'suspended' || status === 'suspensa') return 'bg-amber-100 border-amber-400 text-amber-900';

    if (type === 'extra') return 'bg-purple-300';

    return 'bg-red-500'; // pending OS

  };

  const handleChangeTaskBase = async (task, newBase) => {

    if (onChangeTaskBase) {

      await onChangeTaskBase(task, newBase);

    }

  };

    const handleAction = async (actionType, item, type) => {
    if (actionType === 'desprogramar') {
      if (type === 'os') {
        if (onAssignAudit) onAssignAudit(item, '', null, null);
      } else {
        await supabase.from('autofiscalizacao_atividades_extras').delete().eq('id', item.id);
        onRefreshAtividades();
      }
    } else if (actionType === 'iniciar' || actionType === 'suspender') {
      const newStatus = actionType === 'iniciar' ? 'iniciada' : 'suspensa';
      const histEntry = { timestamp: new Date().toISOString(), usuario: currentUser?.login || 'Sistema', acao: actionType === 'iniciar' ? 'INICIADA_GANTT' : 'SUSPENSA_GANTT' };
      if (type === 'os') {
        const hist = item.historico ? [...item.historico, histEntry] : [histEntry];
        
        // Atualiza na wfm_tarefas para o gantt
        await supabase.from('wfm_tarefas').update({ status: newStatus, historico: hist }).eq('id', item.id);
        
        // Também tenta atualizar na antiga por garantia
        await supabase.from('autofiscalizacao_field_audits').update({ status: newStatus }).eq('inspid', item.inspid);
        
        if (actionType === 'suspender') {
           // Create the clone in wfm_tarefas
           const { id, created_at, status, auditor, planned_start, planned_end, ...cloneData } = item;
           cloneData.status = 'pendente';
           cloneData.auditor = '';
           cloneData.historico = [...(cloneData.historico || []), { timestamp: new Date().toISOString(), usuario: currentUser?.login || 'Sistema', acao: 'CLONE_SUSPENSA', observacao: 'Atividade desmembrada devido a suspensão no Gantt.' }];
           await supabase.from('wfm_tarefas').insert(cloneData);
        }
      } else {
        await supabase.from('autofiscalizacao_atividades_extras').update({ status: newStatus }).eq('id', item.id);
        onRefreshAtividades();
      }
    }
    setGanttActionItem(null);
  };

  const bucketPanel = (isFloating) => (

    <div

      className={`${isFloating ? 'absolute left-0 top-10 bottom-0 w-80 bg-white/95 backdrop-blur-xl border-r border-slate-200/50 flex flex-col shadow-2xl z-40' : 'w-80 bg-white border-r border-slate-200 flex flex-col shadow-[4px_0_24px_rgba(0,0,0,0.02)] z-20'}`}

      onDrop={handleUnassignDrop}

      onDragOver={handleDragOver}

    >

      <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">

        <div>

          <h2 className="font-black text-slate-800 flex items-center gap-2">

            <Filter size={18} className="text-blue-600" />

            OS Não Alocadas ({bucketOS.length})

          </h2>

          <p className="text-xs text-slate-500 mt-1">NÃO CONFORMES / Pendentes</p>

        </div>

        {isFloating && (

          <button onClick={() => setShowBucketDrawer(false)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">

            <X size={16} />

          </button>

        )}

      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">

        {bases.map(([base, osList]) => (

          <div key={base} className="bg-slate-50 border border-slate-200 rounded-lg overflow-hidden">

            <button

              onClick={() => setExpandedBases(p => ({ ...p, [base]: !p[base] }))}

              className="w-full flex items-center justify-between p-3 font-bold text-slate-700 bg-white hover:bg-slate-50 transition-colors"

            >

              <span>{base} ({osList.length})</span>

              <ChevronLeft size={16} className={expandedBases[base] ? '-rotate-90' : 'rotate-180'} />

            </button>

            {expandedBases[base] && (

              <div className="p-2 space-y-2 max-h-64 overflow-y-auto">

                {osList.map(wf => {

                  const os = wf.os_data || {};

                  const resolvedOsId = getOsId(wf) || wf.osid || wf.nr_ordem;

                  return (

                    <div

                      key={wf.inspid}

                      draggable

                      onDragStart={(e) => handleDragStart(e, wf)}

                      className="bg-white border border-slate-200 rounded-lg p-3 shadow-sm cursor-grab hover:border-blue-300 hover:shadow-md transition-all group"

                    >

                      <div className="flex items-start justify-between mb-1">

                        <span className="text-xs font-black text-slate-400 uppercase tracking-wider">{resolvedOsId}</span>

                        <GripVertical size={14} className="text-slate-300 group-hover:text-blue-500" />

                      </div>

                      <div className="font-bold text-slate-700 text-sm mb-1 leading-tight">{os.base_contrato || 'Base Não Informada'}</div>

                      <div className="text-xs text-slate-500 flex items-start gap-1">

                        <MapPin size={12} className="shrink-0 mt-0.5 text-slate-400" />

                        <span className="line-clamp-2">

                          {os.endereco_completo || (os.endereco_cliente && os.endereco_cliente.startsWith('http') ? 'Ver Localização no Mapa' : os.endereco_cliente) || 'Sem Endereço'}

                        </span>

                      </div>

                    </div>

                  );

                })}

              </div>

            )}

          </div>

        ))}

      </div>

    </div>

  );

  const renderBucketContent = () => (

    <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-white">

      {bases.map(([base, osList]) => (

        <div key={base} className="bg-slate-50 border border-slate-200 rounded-lg overflow-hidden">

          <button

            onClick={() => setExpandedBases(p => ({ ...p, [base]: !p[base] }))}

            className="w-full flex items-center justify-between p-3 font-bold text-slate-700 bg-white hover:bg-slate-50 transition-colors"

          >

            <span>{base} ({osList.length})</span>

            <ChevronLeft size={16} className={expandedBases[base] ? '-rotate-90' : 'rotate-180'} />

          </button>

          {expandedBases[base] && (

            <div className="p-2 space-y-2 max-h-64 overflow-y-auto">

              {osList.map(wf => {

                const os = wf.os_data || {};

                const resolvedOsId = getOsId(wf) || wf.osid || wf.nr_ordem;

                return (

                  <div

                    key={wf.inspid}

                    draggable

                    onDragStart={(e) => handleDragStart(e, wf)}

                    className="bg-white border border-slate-200 rounded-lg p-3 shadow-sm cursor-grab hover:border-blue-300 hover:shadow-md transition-all group"

                  >

                    <div className="flex items-start justify-between mb-1">

                      <span className="text-xs font-black text-slate-400 uppercase tracking-wider">{resolvedOsId}</span>

                      <GripVertical size={14} className="text-slate-300 group-hover:text-blue-500" />

                    </div>

                    <div className="font-bold text-slate-700 text-sm mb-1 leading-tight">{os.base_contrato || 'Base Não Informada'}</div>

                    <div className="text-xs text-slate-500 flex items-start gap-1">

                      <MapPin size={12} className="shrink-0 mt-0.5 text-slate-400" />

                      <span className="line-clamp-2">

                        {os.endereco_completo || (os.endereco_cliente && os.endereco_cliente.startsWith('http') ? 'Ver Localização no Mapa' : os.endereco_cliente) || 'Sem Endereço'}

                      </span>

                    </div>

                  </div>

                );

              })}

            </div>

          )}

        </div>

      ))}

    </div>

  );

  const exportDailyToExcel = () => {

    import('xlsx').then(XLSX => {

      const data = [];

      auditors.forEach(auditor => {

        const myOs = fieldAudits.filter(fa => fa.auditor === auditor.login && (fa.assigned_date === dateStr || !fa.planned_start));

        const myExtras = atividadesExtras.filter(at => at.auditor === auditor.login && (at.data === dateStr || !at.planned_start));

        myOs.forEach(fa => {

          const os = ordens.find(o => o.nr_ordem === (fa.osid || fa.nr_ordem));

          data.push({

            'Auditor': auditor.nome || auditor.login,

            'Tipo Registro': 'OS',

            'Número OS': fa.osid || fa.nr_ordem,

            'Status': fa.status,

            'Horário Planejado': fa.planned_start ? new Date(fa.planned_start).toLocaleTimeString('pt-BR') : 'NÃO PROG',

            'Horário Fim': fa.planned_end ? new Date(fa.planned_end).toLocaleTimeString('pt-BR') : '-',

            'Base/Contrato': os?.base_contrato || '-',

            'Endereço': os?.endereco_completo || os?.endereco_cliente || '-'

          });

        });

        myExtras.forEach(at => {

          data.push({

            'Auditor': auditor.nome || auditor.login,

            'Tipo Registro': 'Atividade Extra',

            'Número OS': at.tipo_atividade,

            'Status': at.status,

            'Horário Planejado': at.planned_start ? new Date(at.planned_start).toLocaleTimeString('pt-BR') : 'NÃO PROG',

            'Horário Fim': at.planned_end ? new Date(at.planned_end).toLocaleTimeString('pt-BR') : '-',

            'Base/Contrato': '-',

            'Endereço': at.comentario || '-'

          });

        });

      });

      const ws = XLSX.utils.json_to_sheet(data);

      const wb = XLSX.utils.book_new();

      XLSX.utils.book_append_sheet(wb, ws, "Gantt Diário");

      XLSX.writeFile(wb, `Gantt_${dateStr}.xlsx`);

    });

  };

  return (

    <div className="flex h-full bg-slate-50 border border-slate-200 rounded-xl overflow-hidden shadow-sm flex-col animate-in fade-in">

      <div className="h-16 bg-white border-b border-slate-200/80 flex items-center justify-between px-6 shadow-sm z-25 shrink-0 select-none">

        <div className="flex items-center gap-6">

          <div className="flex flex-col">

            <h1 className="text-lg font-black tracking-tight text-slate-900 leading-none">WFM</h1>

            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Console</span>

          </div>

          {/* Mode Selector */}

          <div className="h-10 px-1 bg-slate-100/80 rounded-xl border border-slate-200/60 shadow-inner flex items-center gap-1">

            <button

              onClick={() => setViewMode('allocation')}

              className={`h-8 px-4 rounded-lg text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all duration-200 ${viewMode === 'allocation' ? 'bg-white text-blue-600 shadow-sm border border-slate-200/20' : 'text-slate-500 hover:text-slate-800 hover:bg-white/40'}`}

            >

              <LayoutTemplate size={14} className={viewMode === 'allocation' ? 'text-blue-600' : 'text-slate-400'} />

              Alocação (Árvore)

            </button>

            <button

              onClick={() => setViewMode('dispatch')}

              className={`h-8 px-4 rounded-lg text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all duration-200 ${viewMode === 'dispatch' ? 'bg-white text-blue-600 shadow-sm border border-slate-200/20' : 'text-slate-500 hover:text-slate-800 hover:bg-white/40'}`}

            >

              <Columns size={14} className={viewMode === 'dispatch' ? 'text-blue-600' : 'text-slate-400'} />

              Timeline (Gantt)

            </button>

            <button

              onClick={() => setViewMode('map')}

              className={`h-8 px-4 rounded-lg text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all duration-200 ${viewMode === 'map' ? 'bg-white text-blue-600 shadow-sm border border-slate-200/20' : 'text-slate-500 hover:text-slate-850'}`}

            >

              <MapIcon size={14} className={viewMode === 'map' ? 'text-blue-600' : 'text-slate-400'} />

              Mapa Global

            </button>

          </div>

        </div>

        <div className="flex items-center gap-6">

          {viewMode === 'dispatch' && (

            <div className="h-10 px-1 bg-slate-100/80 rounded-xl border border-slate-200/60 shadow-inner flex items-center gap-0.5">

              {[60, 30, 10, 5].map(lvl => (

                <button

                  key={lvl}

                  onClick={() => setZoomLevel(lvl)}

                  className={`h-8 w-10 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center justify-center transition-all ${zoomLevel === lvl ? 'bg-white shadow-sm text-blue-600 border border-slate-200/20' : 'text-slate-500 hover:text-slate-800'}`}

                >

                  {lvl}m

                </button>

              ))}

            </div>

          )}

          {/* Search Box in Header */}

          <div className="relative flex items-center h-10 w-64 bg-slate-100/80 border border-slate-200/60 rounded-xl px-3 focus-within:ring-2 focus-within:ring-blue-500/10 transition-all shadow-inner">

            <Search size={14} className="text-slate-400 shrink-0 mr-2" />

            <input

              type="text"

              placeholder="Buscar OS, Base, Equipe..."

              value={searchQuery}

              onChange={e => setSearchQuery(e.target.value)}

              className="w-full bg-transparent border-none outline-none text-xs font-bold text-slate-700 placeholder-slate-400"

            />

            {searchQuery && (

              <button

                onClick={() => setSearchQuery('')}

                className="p-1 hover:bg-slate-200 rounded text-slate-400 hover:text-slate-600 transition-colors"

              >

                <X size={10} />

              </button>

            )}

            {/* ── DROPDOWN FLUTUANTE DE BUSCA DA OS ── */}

            {searchQuery.trim() && (

              <div className="absolute top-12 left-0 w-80 bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-200/80 z-50 p-2 max-h-80 overflow-y-auto space-y-1.5 animate-in zoom-in-95 duration-150">

                <div className="px-2 py-1 border-b border-slate-100 flex items-center justify-between text-[10px] font-black uppercase text-slate-400">

                  <span>Resultados da Busca</span>

                  <span>{searchResults.length} encontradas</span>

                </div>

                {searchResults.length === 0 ? (

                  <div className="p-4 text-center text-xs text-slate-400 font-bold">

                    Nenhuma OS encontrada para "{searchQuery}"

                  </div>

                ) : (

                  searchResults.map((item, idx) => {
                    const statusUpper = (item.status || '').toUpperCase();
                    let statusBadgeClass = "bg-amber-500 text-white";
                    let statusLabel = "Pendente";
                    if (statusUpper === 'COMPLETED' || statusUpper === 'CONCLUIDO' || statusUpper === 'CONCLUÍDA') {
                      statusBadgeClass = "bg-blue-500 text-white";
                      statusLabel = "Concluída";
                    } else if (statusUpper === 'INICIADA' || statusUpper === 'INICIADO' || statusUpper === 'IN_PROGRESS') {
                      statusBadgeClass = "bg-emerald-500 text-white animate-pulse";
                      statusLabel = "Iniciada";
                    } else if (statusUpper === 'SUSPENDED' || statusUpper === 'SUSPENSA' || statusUpper === 'SUSPENSO') {
                      statusBadgeClass = "bg-rose-500 text-white";
                      statusLabel = "Suspensa";
                    }

                    return (
                      <div
                        key={idx}
                        onClick={() => {
                          handleOpenOSDetails(item.raw);
                          setSearchQuery('');
                        }}
                        className="p-2.5 rounded-xl hover:bg-slate-100/80 transition-colors cursor-pointer border border-transparent hover:border-slate-200 group"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-black text-xs text-slate-800 group-hover:text-blue-600 transition-colors">
                            {item.osId}
                          </span>
                          <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${statusBadgeClass}`}>
                            {statusLabel}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-start gap-1">
                          <MapPin size={12} className="shrink-0 mt-0.5 text-slate-400 group-hover:text-blue-500 transition-colors" />
                          <span className="line-clamp-2">{item.address}</span>
                        </div>
                      </div>
                    );
                  })

                )}

              </div>

            )}

          </div>

          <button
            onClick={() => setShowNewTaskModal(true)}
            className="h-10 px-6 bg-blue-600 hover:bg-blue-700 active:scale-[0.97] text-white text-xs font-black uppercase tracking-wider rounded-xl flex items-center gap-2 shadow-md shadow-blue-500/10 hover:shadow-blue-500/20 transition-all duration-200 shrink-0"
          >
            <Plus size={16} strokeWidth={3} /> Adicionar Atividade
          </button>

          {viewMode !== 'allocation' && (
            <div className="h-10 px-1 bg-slate-100/80 rounded-xl border border-slate-200/60 shadow-inner flex items-center gap-1">
              <button
                onClick={() => { const d = new Date(selectedDate); d.setDate(d.getDate() - 1); setSelectedDate(d); }}
                className="h-8 w-8 rounded-lg flex items-center justify-center transition-colors text-slate-500 hover:text-slate-800 bg-white/40 hover:bg-white shadow-sm active:scale-95"
              >
                <ChevronLeft size={16} />
              </button>

              <button
                onClick={() => setShowCalendarModal(true)}
                className="h-8 px-4 bg-white hover:bg-slate-50 rounded-lg text-xs font-black uppercase tracking-wider text-slate-700 shadow-sm border border-slate-200/20 flex items-center gap-2 transition-colors"
              >
                <Clock size={14} className="text-blue-500" />
                {selectedDate.toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' })}
              </button>

              <button
                onClick={exportDailyToExcel}
                title="Exportar Excel deste Dia"
                className="h-8 w-8 rounded-lg flex items-center justify-center transition-colors text-emerald-600 hover:text-emerald-700 bg-white border border-emerald-100/40 shadow-sm active:scale-95"
              >
                <Download size={16} />
              </button>

              {showCalendarModal && (
                <Calendar3MonthsModal
                  currentDate={selectedDate}
                  onSelect={(d) => { setSelectedDate(d); setShowCalendarModal(false); }}
                  onClose={() => setShowCalendarModal(false)}
                />
              )}

              <button
                onClick={() => { const d = new Date(selectedDate); d.setDate(d.getDate() + 1); setSelectedDate(d); }}
                className="h-8 w-8 rounded-lg flex items-center justify-center transition-colors text-slate-500 hover:text-slate-800 bg-white/40 hover:bg-white shadow-sm active:scale-95"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden relative">

        {(viewMode === 'allocation' || viewMode === 'map') && (

          <div className="flex w-full h-full">

            {/* Left: Bucket Tree */}

            <div className="w-80 bg-white border-r border-slate-200 flex flex-col overflow-hidden shrink-0">

              <WFMBucketTree

                bucketOS={bucketOS}

                auditors={auditors}

                selectedBucketName={selectedBucketName}

                setSelectedBucketName={setSelectedBucketName}

                onAssignAudit={onAssignAudit}

                onChangeTaskBase={handleChangeTaskBase}

                onViewDetails={onViewDetails}

                escalas={escalas}

              />

            </div>

            {/* Right: Content panel */}

            <div className="flex-1 bg-slate-50 overflow-hidden flex flex-col">

              {viewMode === 'allocation' ? (

                /* Allocation panel: Grid/List of unallocated OS on top, auditors on bottom */

                <div className="flex-1 flex flex-col p-6 overflow-hidden">

                  <div className="flex-1 overflow-y-auto mb-6 flex flex-col">

                    {selectedBucketName ? (

                      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col flex-1 min-h-[350px]">

                        <div className="p-4 bg-slate-800 border-b border-slate-700 flex justify-between items-center shrink-0">

                          <div className="flex items-center gap-4">

                            <div>

                              <h3 className="font-black text-white text-base flex items-center gap-2">

                                {selectedBucketName === 'Verificação Manual' && <AlertTriangle size={16} className="text-amber-400" />}

                                {getSelectedBucketDisplayName()}

                              </h3>

                              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Bucket Selecionado</p>

                            </div>

                            {/* Toggle List/Grid */}

                            <div className="flex bg-slate-900/50 p-0.5 rounded-lg border border-slate-700">

                              <button

                                onClick={() => setListMode('grid')}

                                className={`px-2.5 py-1 rounded text-[10px] font-black uppercase tracking-wider transition-colors ${listMode === 'grid' ? 'bg-white text-slate-800' : 'text-slate-400 hover:text-slate-200'}`}

                              >

                                Cards

                              </button>

                              <button

                                onClick={() => setListMode('list')}

                                className={`px-2.5 py-1 rounded text-[10px] font-black uppercase tracking-wider transition-colors ${listMode === 'list' ? 'bg-white text-slate-800' : 'text-slate-400 hover:text-slate-200'}`}

                              >

                                Lista

                              </button>

                            </div>

                          </div>

                          <div className="flex items-center gap-3">

                            {selectedOsIds.length > 0 && (

                              <div className="flex items-center gap-2 bg-slate-900/80 px-3 py-1.5 rounded-xl border border-slate-700 animate-in fade-in slide-in-from-top-2">

                                <span className="text-[10px] font-black text-blue-400 uppercase">{selectedOsIds.length} selecionadas</span>

                                <select

                                  onChange={(e) => handleBulkAssign(e.target.value)}

                                  className="text-[10px] font-bold bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white cursor-pointer focus:outline-none"

                                  defaultValue=""

                                >

                                  <option value="" disabled>Designar para...</option>

                                  {auditors.map(a => <option key={a.login} value={a.login}>{a.nome || a.login}</option>)}

                                </select>

                                <select

                                  onChange={(e) => handleBulkChangeBase(e.target.value)}

                                  className="text-[10px] font-bold bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white cursor-pointer focus:outline-none"

                                  defaultValue=""

                                >

                                  <option value="" disabled>Mover para Base...</option>

                                  <option value="Fagundes Filho">Fagundes Filho</option>

                                  <option value="Cajati">Cajati</option>

                                  <option value="Vila Medeiros">Vila Medeiros</option>

                                  <option value="Monte Santo">Monte Santo</option>

                                  <option value="Aricanduva">Aricanduva</option>

                                  <option value="Catumbi">Catumbi</option>

                                  <option value="Santo André">Santo André</option>

                                  <option value="SOC Leste 1">SOC Leste 1</option>

                                  <option value="SOT Sul 1">SOT Sul 1</option>

                                  <option value="SOT Leste 1">SOT Leste 1</option>

                                  <option value="SOT Norte 1">SOT Norte 1</option>

                                </select>

                              </div>

                            )}

                            <span className="text-[10px] font-black text-blue-400 bg-blue-950/60 px-3 py-1 rounded-full border border-blue-900/50 uppercase tracking-wider">{unallocatedOsToShow.length} OS</span>

                          </div>

                        </div>

                        <div className="flex-1 overflow-y-auto p-4 bg-slate-50/50">

                          {unallocatedOsToShow.length === 0 ? (

                            <div className="h-full flex flex-col items-center justify-center text-slate-400">

                              <p className="font-bold text-sm">Nenhuma OS pendente neste bucket</p>

                            </div>

                          ) : listMode === 'grid' ? (

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

                              {unallocatedOsToShow.map(fa => {

                                const osId = fa.os_data?.osid || fa.id_origem;

                                const isChecked = selectedOsIds.includes(fa.inspid);

                                

                                const timeInfo = getOSTimesAndStatus(fa, ordens, fieldAudits, workflows, inspecoes);

                                const isCompleted = timeInfo.status === 'completed';

                                const isStarted = timeInfo.status === 'in_progress';

                                const isSuspended = timeInfo.status === 'suspended';

                                

                                let statusLabel = 'Não Iniciada / Livre';

                                let statusBadgeClass = 'bg-slate-100 text-slate-700 border-slate-300';

                                if (isCompleted) {

                                  statusLabel = 'Concluída';

                                  statusBadgeClass = 'bg-blue-600 text-white border-blue-600 shadow-xs';

                                } else if (isStarted) {

                                  statusLabel = 'Em Andamento';

                                  statusBadgeClass = 'bg-emerald-600 text-white border-emerald-600 animate-pulse shadow-xs';

                                } else if (isSuspended) {

                                  statusLabel = 'Suspensa';

                                  statusBadgeClass = 'bg-amber-500 text-slate-950 border-amber-500 font-black shadow-xs';

                                } else if (fa.auditor) {

                                  statusLabel = 'Programada';

                                  statusBadgeClass = 'bg-sky-50 text-sky-800 border-sky-300 font-black';

                                }

                                return (

                                  <div

                                    key={fa.inspid}

                                    draggable

                                    onDragStart={(e) => handleDragStart(e, fa)}

                                    className={`bg-white border rounded-2xl p-4 shadow-sm cursor-grab hover:border-blue-400 hover:shadow-md transition-all duration-200 group flex flex-col justify-between

                                      ${isChecked ? 'border-blue-500 ring-2 ring-blue-500/10' : (isCompleted ? 'border-blue-200 bg-blue-50/10' : isStarted ? 'border-emerald-300 bg-emerald-50/20' : isSuspended ? 'border-amber-300 bg-amber-50/20' : (!fa.auditor ? 'border-2 border-amber-500 bg-amber-50/20 shadow-md shadow-amber-500/10' : 'border-slate-200/80'))}

                                    `}

                                  >

                                    <div>

                                      <div className="flex items-start justify-between mb-2">

                                        <div className="flex items-center gap-2">

                                          <input

                                            type="checkbox"

                                            checked={isChecked}

                                            onChange={() => {

                                              setSelectedOsIds(p => p.includes(fa.inspid) ? p.filter(id => id !== fa.inspid) : [...p, fa.inspid]);

                                            }}

                                            className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"

                                          />

                                          <span className="text-xs font-black text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg uppercase tracking-wider">OS: {osId}</span>

                                        </div>

                                        <GripVertical size={16} className="text-slate-300 group-hover:text-blue-500 transition-colors" />

                                      </div>

                                      <div className="space-y-2 mt-3">

                                        <div>

                                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Base</span>

                                          <p className="font-bold text-slate-800 text-sm">{fa.os_data?.base_contrato || 'Base Não Informada'}</p>

                                        </div>

                                        <div>

                                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Endereço</span>

                                          <p className="text-xs text-slate-600 leading-snug line-clamp-2">{fa.os_data?.endereco_completo || fa.os_data?.endereco || 'Sem endereço'}</p>

                                        </div>

                                      </div>

                                    </div>

                                    <div className="border-t border-slate-100 pt-3 mt-4 flex flex-col gap-2">

                                      <div className="flex items-center justify-between gap-1">

                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest truncate">{fa.categoria || 'AutoFiscalização'}</span>

                                        <span className={`text-[9px] font-black uppercase px-2.5 py-0.5 rounded-full border ${statusBadgeClass}`}>

                                          {statusLabel}

                                        </span>

                                      </div>

                                      {fa.auditor && (

                                        <div className="text-[10px] font-bold text-slate-600 flex items-center justify-between bg-slate-50 px-2 py-1 rounded-lg">

                                          <span className="text-slate-400 font-medium uppercase text-[9px]">Auditor:</span>

                                          <span className="text-slate-800 font-bold truncate max-w-[140px]">{fa.auditor}</span>

                                        </div>

                                      )}

                                      <button

                                        onClick={() => {

                                          const osToOpen = fa.os_data || fa;

                                          handleOpenOSDetails(osToOpen);

                                        }}

                                        className="w-full py-2 text-xs font-black uppercase tracking-wider text-slate-600 hover:text-slate-800 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-all flex items-center justify-center gap-1 active:scale-[0.98] cursor-pointer"

                                      >

                                        <Eye size={12} /> Ver Detalhes

                                      </button>

                                    </div>

                                  </div>

                                );

                              })}

                            </div>

                          ) : (

                            /* List View Table */

                            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">

                              <table className="w-full text-left border-collapse">

                                <thead>

                                  <tr className="bg-slate-50 border-b border-slate-200 text-xs font-black text-slate-500 uppercase tracking-wider">

                                    <th className="p-3 w-10">

                                      <input

                                        type="checkbox"

                                        checked={selectedOsIds.length === unallocatedOsToShow.length}

                                        onChange={() => {

                                          if (selectedOsIds.length === unallocatedOsToShow.length) {

                                            setSelectedOsIds([]);

                                          } else {

                                            setSelectedOsIds(unallocatedOsToShow.map(t => t.inspid));

                                          }

                                        }}

                                        className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"

                                      />

                                    </th>

                                    <th className="p-3">OS ID</th>

                                    <th className="p-3">Base</th>

                                    <th className="p-3">Endereço</th>

                                    <th className="p-3">Categoria</th>

                                    <th className="p-3">Status Operacional</th>

                                    <th className="p-3">Auditor</th>

                                    <th className="p-3 text-right">Ações</th>

                                  </tr>

                                </thead>

                                <tbody className="divide-y divide-slate-100 text-xs">
                                  {unallocatedOsToShow.map(fa => {

                                    const osId = fa.os_data?.osid || fa.id_origem;

                                    const isChecked = selectedOsIds.includes(fa.inspid);

                                    

                                    const timeInfo = getOSTimesAndStatus(fa, ordens, fieldAudits, workflows, inspecoes);

                                    const isCompleted = timeInfo.status === 'completed';

                                    const isStarted = timeInfo.status === 'in_progress';

                                    const isSuspended = timeInfo.status === 'suspended';

                                    

                                    let statusLabel = 'Não Iniciada';

                                    let statusBadgeClass = 'bg-slate-100 text-slate-700 border-slate-300';

                                    if (isCompleted) {

                                      statusLabel = 'Concluída';

                                      statusBadgeClass = 'bg-blue-600 text-white border-blue-600';

                                    } else if (isStarted) {

                                      statusLabel = 'Em Andamento';

                                      statusBadgeClass = 'bg-emerald-600 text-white border-emerald-600 animate-pulse';

                                    } else if (isSuspended) {

                                      statusLabel = 'Suspensa';

                                      statusBadgeClass = 'bg-amber-500 text-slate-950 border-amber-500 font-black';

                                    } else if (fa.auditor) {

                                      statusLabel = 'Programada';

                                      statusBadgeClass = 'bg-sky-50 text-sky-800 border-sky-300 font-bold';

                                    }

                                    return (

                                      <tr

                                        key={fa.inspid}

                                        draggable

                                        onDragStart={(e) => handleDragStart(e, fa)}

                                        className={`hover:bg-slate-50/80 transition-colors ${isChecked ? 'bg-blue-50/20' : ''}`}

                                      >

                                        <td className="p-3">

                                          <input

                                            type="checkbox"

                                            checked={isChecked}

                                            onChange={() => {

                                              setSelectedOsIds(p => p.includes(fa.inspid) ? p.filter(id => id !== fa.inspid) : [...p, fa.inspid]);

                                            }}

                                            className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"

                                          />

                                        </td>

                                        <td className="p-3 font-black text-slate-800">{osId}</td>

                                        <td className="p-3 font-bold text-slate-700">{fa.os_data?.base_contrato || '-'}</td>

                                        <td className="p-3 text-slate-500 max-w-xs truncate" title={fa.os_data?.endereco_completo}>{fa.os_data?.endereco_completo || '-'}</td>

                                        <td className="p-3 font-medium text-slate-500">{fa.categoria || 'AutoFiscalização'}</td>

                                        <td className="p-3">

                                          <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border ${statusBadgeClass}`}>

                                            {statusLabel}

                                          </span>

                                        </td>

                                        <td className="p-3">

                                          {fa.auditor ? (

                                            <span className="text-[10px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">

                                              {fa.auditor}

                                            </span>

                                          ) : (

                                            <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded">

                                              Não Alocado

                                            </span>

                                          )}

                                        </td>

                                        <td className="p-3 text-right">

                                          <button

                                            onClick={() => {

                                              const osToOpen = fa.os_data || fa;

                                              handleOpenOSDetails(osToOpen);

                                            }}

                                            className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg transition-colors inline-flex items-center gap-1 cursor-pointer"

                                          >

                                            <Eye size={10} /> Detalhes

                                          </button>

                                        </td>

                                      </tr>

                                    );

                                  })}

                                </tbody>

                              </table>

                            </div>

                          )}

                        </div>

                      </div>

                    ) : (

                      <div className="h-full flex flex-col items-center justify-center text-slate-400 bg-white border border-slate-200 rounded-2xl p-6 min-h-[300px] flex-1">

                        <div className="w-14 h-14 border border-dashed border-slate-300 rounded-2xl mb-3 flex items-center justify-center bg-slate-50">

                          <HelpCircle size={20} className="text-slate-300" />

                        </div>

                        <p className="font-bold text-base text-slate-600">Selecione um Bucket na Árvore</p>

                        <p className="text-xs text-slate-400 mt-1">Navegue pelas operações e bases na árvore ao lado</p>

                      </div>

                    )}

                  </div>

                  {/* Bottom: Auditor drop zone */}

                  <div className="h-56 bg-white border border-slate-200 rounded-2xl p-4 flex flex-col shrink-0">

                    <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest mb-3 flex items-center gap-1.5">

                      <Users size={14} className="text-blue-500" />

                      Arraste para os Auditores Disponíveis

                    </h3>

                    <div className="flex-1 overflow-x-auto pb-2 flex gap-4 custom-scrollbar">

                      {auditors.map(auditor => (

                        <div

                          key={auditor.login}

                          onDrop={(e) => handleDrop(e, auditor.login, -1)}

                          onDragOver={handleDragOver}

                          className="w-60 h-full border border-dashed border-slate-200 bg-slate-50/50 hover:bg-blue-50/40 hover:border-blue-300 rounded-xl transition-all duration-200 p-4 flex flex-col justify-center items-center text-center shrink-0 cursor-default"

                        >

                          <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-sm mb-2 shadow-sm uppercase">

                            {(auditor.nome || auditor.login).slice(0, 2)}

                          </div>

                          <h4 className="font-black text-slate-800 text-xs truncate max-w-full">{auditor.nome || auditor.login}</h4>

                          <p className="text-[10px] text-slate-400 mt-1">Solte a OS aqui para atribuir</p>

                        </div>

                      ))}

                    </div>

                  </div>

                </div>

              ) : (

                /* Map view filtered by selected bucket */

                <div className="flex-1 relative">

                  <WFMMapView

                    fieldAudits={fieldAudits}

                    auditors={auditors}

                    dateStr={dateStr}

                    prefs={prefs}

                    unallocatedOs={unallocatedOsToShow}

                    onAssignAudit={onAssignAudit}

                    selectedBucketName={selectedBucketName}

                    shifts={shifts}

                    escalas={escalas}

                  />

                </div>

              )}

            </div>

          </div>

        )}

        {viewMode === 'dispatch' && (

          <div className="flex-1 flex flex-col overflow-auto bg-slate-50 relative" onDrop={handleUnassignDrop} onDragOver={handleDragOver}>

            {showBucketDrawer && (

              <DraggableWindow

                title={`OS Não Alocadas (${bucketOS.length})`}

                onClose={() => setShowBucketDrawer(false)}
                onDrop={handleUnassignDrop}
                onDragOver={handleDragOver}
              >
                {renderBucketContent()}
              </DraggableWindow>
            )}
            {/* Header Timeline */}
            <div className="flex border-b border-slate-200 bg-white sticky top-0 z-30 shadow-sm h-10 shrink-0">
              <div
                className="flex-shrink-0 border-r border-slate-200 flex items-center justify-between px-3 relative bg-slate-50/90 backdrop-blur sticky left-0 z-40"
                style={{ width: auditorColWidth }}
              >
                <button
                  onClick={() => setShowBucketDrawer(!showBucketDrawer)}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded-lg shadow-sm flex items-center gap-1 transition-colors z-50"
                  title="Abrir Modal Voador de OS Não Alocadas"
                >
                  <Filter size={12} /> {bucketOS.length} OS Livres
                </button>
                <div
                  className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-blue-400 active:bg-blue-600 z-50 transition-colors"
                  onMouseDown={startResizing}
                ></div>
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Auditor</span>
              </div>

              {/* Coluna "NÃO PROG" Fixa/Congelada antes das 06:00 */}
              <div
                className="flex-shrink-0 border-r border-slate-200 bg-amber-50/90 flex items-center justify-center px-1 sticky z-40 text-[9px] font-black text-amber-800 uppercase tracking-wider shadow-[2px_0_6px_rgba(0,0,0,0.03)]"
                style={{ left: auditorColWidth, width: unscheduledColWidth }}
              >
                Não Prog.
              </div>

              {/* Slots de Horários da Linha do Tempo */}
              <div className="flex flex-1 relative bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMSIgY3k9IjEiIHI9IjEiIGZpbGw9IiNlMmU4ZjAiLz48L3N2Zz4=')]">
                {timeSlots.map(slot => (
                  <div
                    key={`${slot.hour}-${slot.minute}`}
                    className="flex-shrink-0 border-r border-slate-200/50 flex items-center px-2 text-[10px] font-bold text-slate-500"
                    style={{ width: slotWidthPx }}
                  >
                    {slot.label}
                  </div>
                ))}
                {isToday && currentTime.getHours() >= minHour && currentTime.getHours() <= maxHour && (
                  <div
                    className="absolute top-0 bottom-0 w-px bg-red-500 z-40 shadow-[0_0_8px_rgba(239,68,68,0.6)]"
                    style={{ left: calcLeftPx(currentTime.toISOString()) }}
                  >
                    <div className="absolute -top-1 -translate-x-1/2 bg-red-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded shadow-sm">
                      {currentTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Linhas de Auditores */}
            <div className="flex-1 relative">
              {isToday && currentTime.getHours() >= minHour && currentTime.getHours() <= maxHour && (
                <div
                  className="absolute top-0 bottom-0 w-px bg-red-500/50 z-30 pointer-events-none"
                  style={{ left: auditorColWidth + unscheduledColWidth + calcLeftPx(currentTime.toISOString()) }}
                ></div>
              )}

              {auditors.map(auditor => {
                const pref = prefs.find(p => p.auditor === auditor.login);
                const assignedOs = getAssignedOS(auditor.login);
                const assignedExtras = getAssignedExtras(auditor.login);
                const auditorShifts = shifts.filter(s => s.auditor === auditor.login);
                const shift = auditorShifts.find(s => !s.end_time) || auditorShifts[0];
                const escala = escalas.find(e => e.auditor === auditor.login);
                const auditorTelefone = shift?.telefone || shift?.phone || auditor?.telefone || auditor?.celular || pref?.telefone || auditor?.phone;

                let shiftStatusIcon = <div className="w-2.5 h-2.5 rounded-full bg-slate-300 shadow-sm" title="Sem Calendário"></div>;
                let bgClass = "bg-slate-100/70 text-slate-400 group-hover:bg-slate-100";
                let statusText = "Sem Calendário Habilitado";

                if (escala) {
                  if (shift && shift.start_time) {
                    if (shift.end_time) {
                      bgClass = "bg-blue-50/60 text-slate-800 group-hover:bg-blue-50";
                      shiftStatusIcon = <div className="w-2.5 h-2.5 rounded-full bg-blue-400 shadow-sm" title="Fim de Expediente"></div>;
                      statusText = "Fim de Expediente";
                    } else if (shift.meal_start && !shift.meal_end) {
                      bgClass = "bg-amber-50/60 text-slate-800 group-hover:bg-amber-50";
                      shiftStatusIcon = <div className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-sm" title="Em Refeição"></div>;
                      statusText = "Em Refeição";
                    } else {
                      bgClass = "bg-emerald-50/60 text-slate-800 group-hover:bg-emerald-50";
                      shiftStatusIcon = <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm animate-pulse" title="Online - Ativo"></div>;
                      statusText = "Online";
                    }
                  } else {
                    bgClass = "bg-amber-50/50 text-slate-700 group-hover:bg-amber-50";
                    shiftStatusIcon = <div className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-sm" title="Offline - Turno Não Iniciado"></div>;
                    statusText = "Offline";
                  }
                }

                const shiftStartStr = escala?.shift_start || pref?.shift_start || '07:00';
                const shiftEndStr = escala?.shift_end || pref?.shift_end || '18:00';
                const sH = parseInt(shiftStartStr.split(':')[0], 10);
                let eH = parseInt(shiftEndStr.split(':')[0], 10);
                if (eH < sH) {
                  eH += 24;
                }

                const hatchStartPx = 0;
                const hatchStartWidth = Math.max(0, (sH - minHour) * 60 * pxPerMin);
                const hatchEndPx = Math.max(0, (eH - minHour) * 60 * pxPerMin);
                const hatchEndWidth = Math.max(0, (maxHour - eH + 1) * 60 * pxPerMin);

                return (
                  <div key={auditor.login} className="flex border-b border-slate-200 hover:bg-slate-50 transition-colors group min-h-[72px]">
                    {/* Coluna 1: Card do Auditor (Sticky left-0) */}
                    <div
                      className={`flex-shrink-0 border-r border-slate-200 transition-colors flex flex-col justify-center sticky left-0 z-20 p-3 shadow-[2px_0_12px_rgba(0,0,0,0.02)] ${bgClass}`}
                      style={{ width: auditorColWidth }}
                      onDrop={(e) => {
                        if (!escala) return addToast('Auditor sem escala de trabalho habilitada para hoje.', 'warning', 'Sem Escala');
                        handleDrop(e, auditor.login, -1);
                      }}
                      onDragOver={(e) => {
                        if (escala) handleDragOver(e);
                      }}
                    >
                      <div className="flex items-start justify-between">
                        <div
                          onClick={() => {
                            if (escala && shift && shift.start_time) {
                              handleTrackAuditor(auditor.login);
                            }
                          }}
                          className={`font-bold text-sm truncate pr-2 flex items-center gap-2 ${escala && shift && shift.start_time ? 'cursor-pointer hover:text-emerald-700 underline decoration-dotted' : ''}`}
                          title={escala && shift && shift.start_time ? 'Clique para ver localização em tempo real no mapa' : statusText}
                        >
                          {shiftStatusIcon} {auditor.nome || auditor.login}
                        </div>
                        <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity gap-1 shrink-0 bg-white/80 rounded-lg p-0.5 shadow-sm">
                          <button
                            disabled={!escala}
                            onClick={() => handleOptimizeRoute(auditor.login)}
                            className={`p-1 rounded ${!escala ? 'text-slate-300 cursor-not-allowed' : 'hover:bg-purple-100 text-purple-600'}`}
                            title={escala ? "Otimizar Rota (Distância Mínima)" : "Indisponível (Sem Escala)"}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-wand-2"><path d="m21.64 3.64-1.28-1.28a1.21 1.21 0 0 0-1.72 0L2.36 18.64a1.21 1.21 0 0 0 0 1.72l1.28 1.28a1.2 1.2 0 0 0 1.72 0L21.64 5.36a1.2 1.2 0 0 0 0-1.72Z" /><path d="m14 7 3 3" /><path d="M5 6v4" /><path d="M19 14v4" /><path d="M10 2v2" /><path d="M7 8H3" /><path d="M21 16h-4" /><path d="M11 3H9" /></svg>
                          </button>
                          <button
                            disabled={!escala}
                            onClick={() => setShowActivityModal(auditor.login)}
                            className={`p-1 rounded ${!escala ? 'text-slate-300 cursor-not-allowed' : 'hover:bg-emerald-100 text-emerald-600'}`}
                            title={escala ? "Nova Atividade Extra" : "Indisponível (Sem Escala)"}
                          >
                            <Plus size={14} />
                          </button>
                          <button
                            onClick={() => setHistoryAuditor(auditor.login)}
                            className="p-1 hover:bg-slate-100 text-slate-600 rounded"
                            title="Histórico de Ações"
                          >
                            <History size={14} />
                          </button>
                          <button onClick={() => setStatusAuditorModal(auditor)} className="p-1 hover:bg-indigo-100 text-indigo-600 rounded" title="Ver Vida do Auditor (Status, Trajetos e Telemetria)">
                            <UserCheck size={14} />
                          </button>
                          <button onClick={() => setShowConfig(auditor.login)} className="p-1 hover:bg-blue-100 text-blue-600 rounded" title="Ajustar Ponto/Turno/Escala">
                            <Settings size={14} />
                          </button>
                        </div>
                      </div>

                      <div className="flex flex-col gap-0.5 mt-1">
                        <div className="text-[10px] font-medium flex items-center gap-1 truncate opacity-80">
                          <Clock size={10} className="text-blue-400" /> {shiftStartStr} as {shiftEndStr}
                        </div>
                        {escala && shift && shift.start_time && (
                          <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                            {shift.placa_veiculo && (
                              <div className="text-[10px] font-black text-emerald-700 flex items-center gap-1">
                                🚗 <span className="bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-mono uppercase text-[9px]">{shift.placa_veiculo}</span>
                              </div>
                            )}
                            {auditorTelefone && (
                              <div className="text-[10px] font-bold text-slate-700 flex items-center gap-1">
                                📱 <span className="text-[9px] font-mono text-slate-800 bg-slate-200/70 px-1 py-0.2 rounded">{auditorTelefone}</span>
                              </div>
                            )}
                          </div>
                        )}
                        {!escala && (
                          <div className="text-[9px] font-black text-slate-400 uppercase tracking-wider mt-0.5">
                            Sem Calendário
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Coluna 2: Área "Não Programado" (Sticky left-[auditorColWidth]) */}
                    <div
                      className="flex-shrink-0 border-r border-slate-200 bg-amber-50/50 hover:bg-amber-100/60 transition-colors sticky z-20 flex flex-col gap-1 p-1 shadow-[2px_0_6px_rgba(0,0,0,0.02)]"
                      style={{ left: auditorColWidth, width: unscheduledColWidth }}
                      onDrop={(e) => handleDrop(e, auditor.login, -1)}
                      onDragOver={handleDragOver}
                    >
                      <div className="text-[8px] font-black text-amber-700/70 text-center uppercase tracking-widest mt-0.5 mb-0.5">Não Prog.</div>

                      {assignedOs.filter(fa => !fa.planned_start).map(fa => {
                        const resolvedOsId = getOsId(fa) || 'OS Desconhecida';
                        const osData = ordens.find(o => o.nr_ordem === resolvedOsId);
                        const isStarted = fa.status === 'in_progress' || fa.status === 'iniciada' || fa.status === 'completed' || fa.status === 'concluido';

                        return (
                          <div
                            key={`os-${fa.inspid}`}
                            draggable={!isStarted}
                            onDragStart={(e) => handleDragStart(e, fa)}
                            onClick={(e) => {
                              const rect = e.currentTarget.getBoundingClientRect();
                              setGanttActionItem({ 
                                type: 'os', 
                                item: fa, 
                                osData, 
                                rect, 
                                label: resolvedOsId, 
                                address: osData?.endereco_completo || 'Sem Endereço', 
                                base: osData?.base_contrato 
                              });
                            }}
                            className="w-full py-1.5 px-2 rounded-lg border border-amber-200/80 bg-white text-[9px] font-black cursor-pointer shadow-xs relative overflow-hidden flex items-center hover:border-amber-300 transition-all"
                          >
                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-500" />
                            <span className="truncate block ml-1.5 text-slate-800">{resolvedOsId}</span>
                          </div>
                        );
                      })}

                      {assignedExtras.filter(at => !at.planned_start).map(at => {
                        const isStarted = at.status === 'in_progress' || at.status === 'iniciada' || at.status === 'completed' || at.status === 'concluido';

                        return (
                          <div
                            key={`ex-${at.id}`}
                            draggable={!isStarted}
                            onDragStart={(e) => handleDragStart(e, at)}
                            onClick={(e) => {
                              const rect = e.currentTarget.getBoundingClientRect();
                              setGanttActionItem({ 
                                type: 'extra', 
                                item: at, 
                                rect, 
                                label: at.tipo_atividade, 
                                address: at.comentario || 'Atividade Extra', 
                                base: '-' 
                              });
                            }}
                            className="w-full py-1.5 px-2 rounded-lg border border-purple-200/80 bg-white text-[9px] font-black cursor-pointer shadow-xs relative overflow-hidden flex items-center hover:border-purple-300 transition-all"
                          >
                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-purple-500" />
                            <span className="truncate block ml-1.5 text-purple-900">{at.tipo_atividade}</span>
                          </div>
                        );
                      })}
                    </div>

                    {/* Coluna 3: Timeline Lane Container (Inicia às 06:00) */}
                    <div className="flex flex-1 relative bg-slate-50/30">
                      {hatchStartWidth > 0 && (
                        <div className="absolute top-0 bottom-0 pointer-events-none opacity-50 z-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjgiPjxwYXRoIGQ9Ik0tMiAxMGwxMi0xMk02IDE0TDE0IDZNLTItMmw4IDgiIHN0cm9rZT0iI2NiZDVlMSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9zdmc+')]" style={{ left: hatchStartPx, width: hatchStartWidth }}></div>
                      )}

                      {hatchEndWidth > 0 && (
                        <div className="absolute top-0 bottom-0 pointer-events-none opacity-50 z-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjgiPjxwYXRoIGQ9Ik0tMiAxMGwxMi0xMk02IDE0TDE0IDZNLTItMmw4IDgiIHN0cm9rZT0iI2NiZDVlMSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9zdmc+')]" style={{ left: hatchEndPx, width: hatchEndWidth }}></div>
                      )}

                      {timeSlots.map(slot => (
                        <div
                          key={`${slot.hour}-${slot.minute}`}
                          className="flex-shrink-0 border-r border-slate-200/50 hover:bg-blue-50/50 transition-colors z-10"
                          style={{ width: slotWidthPx }}
                          onDrop={(e) => handleDrop(e, auditor.login, slot.hour + slot.minute / 60)}
                          onDragOver={handleDragOver}
                        ></div>
                      ))}

                      {/* Render OS com Encadeamento Sequencial Anti-Sobreposição e Tempos Reais */}
                      {(() => {
                        const scheduledList = assignedOs.filter(fa => !!fa.planned_start);
                        const sortedAssignedOs = [...scheduledList].sort((a, b) => {
                          const getEffStart = (x) => {
                            const timeInfo = getOSTimesAndStatus(x, ordens, fieldAudits, workflows, inspecoes);
                            const raw = ((timeInfo.status === 'in_progress' || timeInfo.status === 'completed' || timeInfo.status === 'suspended') && timeInfo.realStartStr) || x.planned_start;
                            return new Date(raw || 0).getTime();
                          };
                          return getEffStart(a) - getEffStart(b);
                        });

                        let lastEndTime = 0;

                        return sortedAssignedOs.map((fa) => {
                          const timeInfo = getOSTimesAndStatus(fa, ordens, fieldAudits, workflows, inspecoes);
                          const isStarted = timeInfo.status === 'in_progress';
                          const isCompleted = timeInfo.status === 'completed';
                          const isSuspended = timeInfo.status === 'suspended';

                          const actualStart = (isStarted || isCompleted || isSuspended)
                            ? (timeInfo.realStartStr || fa.planned_start)
                            : fa.planned_start;

                          const payload = fa.payload_dados || {};
                          let durationMins = timeInfo.plannedDurationMins;

                          if (isCompleted && timeInfo.executedDurationMins) {
                            durationMins = timeInfo.executedDurationMins;
                          } else if (isStarted && timeInfo.realStart) {
                            const elapsedMins = Math.round((Date.now() - timeInfo.realStart.getTime()) / 60000);
                            durationMins = Math.max(elapsedMins, timeInfo.plannedDurationMins);
                          } else if (isSuspended && timeInfo.executedDurationMins) {
                            durationMins = timeInfo.executedDurationMins;
                          }

                          let startMs = new Date(actualStart).getTime();
                          // Encadeamento inteligente: evita que duas ordens no mesmo auditor se sobreponham visualmente
                          if (startMs < lastEndTime) {
                            startMs = lastEndTime;
                          }

                          lastEndTime = startMs + Math.max(durationMins, 15) * 60000;

                          const startIsoStr = new Date(startMs).toISOString();
                          const leftPx = calcLeftPx(startIsoStr);
                          const wPx = Math.max(durationMins * pxPerMin, 28);

                          const resolvedOsId = getOsId(fa) || 'OS Desconhecida';
                          const osData = ordens.find(o => o.nr_ordem === resolvedOsId);
                          const prog = getProgress(startIsoStr, new Date(startMs + durationMins * 60000).toISOString());

                          let cardBg = 'bg-sky-500 text-white shadow-sky-600/20';
                          let icon = <Clock size={11} className="shrink-0 text-white/90" />;
                          let badgeText = `${durationMins}m`;

                          if (isCompleted) {
                            cardBg = 'bg-blue-600 text-white shadow-blue-700/20';
                            icon = <CheckCircle2 size={11} className="shrink-0 text-white" />;
                            badgeText = timeInfo.executedDurationMins ? `${timeInfo.executedDurationMins}m` : `${durationMins}m`;
                          } else if (isStarted) {
                            cardBg = 'bg-emerald-600 text-white shadow-emerald-700/20 animate-pulse';
                            icon = <Play size={11} className="shrink-0 text-white fill-white" />;
                            badgeText = `${durationMins}m`;
                          } else if (isSuspended) {
                            cardBg = 'bg-amber-500 text-slate-900 shadow-amber-600/20';
                            icon = <Pause size={11} className="shrink-0 text-slate-900 fill-slate-900" />;
                            badgeText = `${durationMins}m`;
                          }

                          return (
                            <div
                              key={`os-${fa.inspid}`}
                              draggable={!isStarted && !isCompleted && !isSuspended}
                              onDragStart={(e) => handleDragStart(e, fa)}
                              className={`absolute top-1 bottom-1 rounded-xl shadow-md border border-white/20 overflow-hidden cursor-pointer backdrop-blur-md transition-all z-20 group hover:shadow-lg hover:scale-[1.02] hover:z-30 flex items-center px-2 select-none ${cardBg}`}
                              style={{ left: `${leftPx}px`, width: `${wPx}px` }}
                              title={`OS: ${resolvedOsId} • Duração: ${durationMins} min • Status: ${timeInfo.status === 'completed' ? 'Concluída' : (timeInfo.status === 'in_progress' ? 'Em Andamento' : (timeInfo.status === 'suspended' ? 'Suspensa' : 'Pendente'))}${timeInfo.realStart ? ' • Início: ' + timeInfo.realStart.toLocaleTimeString('pt-BR') : ''}${timeInfo.realEnd ? ' • Conclusão: ' + timeInfo.realEnd.toLocaleTimeString('pt-BR') : ''}`}
                              onClick={(e) => {
                                const rect = e.currentTarget.getBoundingClientRect();
                                setGanttActionItem({ 
                                  type: 'os', 
                                  item: fa, 
                                  osData, 
                                  rect, 
                                  label: resolvedOsId, 
                                  address: osData?.endereco_completo || payload.endereco_completo || 'Sem Endereço', 
                                  base: osData?.base_contrato || payload.base_contrato,
                                  timeInfo
                                });
                              }}
                            >
                              {(isStarted || isCompleted) && (
                                <div 
                                  className="absolute top-0 bottom-0 left-0 bg-black/15 pointer-events-none transition-all duration-1000"
                                  style={{ width: `${isCompleted ? 100 : prog}%` }}
                                />
                              )}

                              <div className="relative z-10 flex items-center justify-between w-full min-w-0 gap-1">
                                <div className="flex items-center gap-1.5 min-w-0">
                                  {icon}
                                  <span className="text-[10px] font-black tracking-tight truncate leading-none">
                                    {resolvedOsId}
                                  </span>
                                </div>

                                {wPx > 60 && (
                                  <span className="text-[8px] font-mono font-black uppercase px-1.5 py-0.5 rounded-md bg-black/20 text-white/95 shrink-0">
                                    {badgeText}
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        });
                      })()}

                      {/* Render Atividades Extras */}
                      {assignedExtras.map((at) => {
                        if (!at.planned_start || !at.planned_end) return null;

                        const isStarted = at.status === 'in_progress' || at.status === 'iniciada';
                        const isCompleted = at.status === 'completed' || at.status === 'concluido';

                        const actualStart = at.planned_start;
                        const leftPx = calcLeftPx(actualStart);
                        const durMins = Math.max(15, Math.round((new Date(at.planned_end) - new Date(at.planned_start)) / 60000));
                        const wPx = Math.max(durMins * pxPerMin, 24);

                        const prog = getProgress(at.planned_start, at.planned_end);

                        return (
                          <div
                            key={`at-${at.id}`}
                            className="absolute top-1 bottom-1 rounded-xl shadow-md border border-purple-300/40 bg-purple-600 text-white overflow-hidden cursor-pointer backdrop-blur-md transition-all z-20 hover:shadow-lg hover:scale-[1.02] hover:z-30 flex items-center px-2 select-none"
                            style={{ left: `${leftPx}px`, width: `${wPx}px` }}
                            title={`${at.tipo_atividade}: ${at.comentario || 'Atividade Extra'} (${durMins} min)`}
                            onClick={(e) => {
                              const rect = e.currentTarget.getBoundingClientRect();
                              setGanttActionItem({ 
                                type: 'extra', 
                                item: at, 
                                rect, 
                                label: at.tipo_atividade, 
                                address: at.comentario || 'Atividade Extra', 
                                base: '' 
                              });
                            }}
                          >
                            {(isStarted || isCompleted) && (
                              <div 
                                className="absolute top-0 bottom-0 left-0 bg-black/20 pointer-events-none transition-all duration-1000"
                                style={{ width: `${isCompleted ? 100 : prog}%` }}
                              />
                            )}

                            <div className="relative z-10 flex items-center justify-between w-full min-w-0 gap-1">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <AlertTriangle size={11} className="shrink-0 text-purple-200" />
                                <span className="text-[10px] font-black uppercase tracking-tight truncate leading-none">
                                  {at.tipo_atividade}
                                </span>
                              </div>

                              {wPx > 60 && (
                                <span className="text-[8px] font-mono font-black uppercase px-1.5 py-0.5 rounded-md bg-black/25 text-white/95 shrink-0">
                                  {durMins}m
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── MODAL DE DETALHES DO ATENDIMENTO COM ALOCAÇÃO ── */}
      {editingTask && (
        <ModalEditarOS
          os={editingTask}
          auditors={escalas.length === 0 ? auditors : auditors.filter(a => escalas.some(e => e.auditor === a.login || e.auditor === a.email || e.auditor === a.nome))}
          onClose={() => setEditingTask(null)}
          onSaveSuccess={() => {
            setEditingTask(null);
          }}
        />
      )}
      {!onViewDetails && selectedSearchOS && (
        <ModalDetalhesOS
          os={selectedSearchOS}
          onClose={() => setSelectedSearchOS(null)}
          ordens={ordens}
          inspecoes={inspecoes}
          workflows={workflows}
          fieldAudits={fieldAudits}
          auditors={escalas.length === 0 ? auditors : auditors.filter(a => escalas.some(e => e.auditor === a.login || e.auditor === a.email || e.auditor === a.nome))}
          onAssignAudit={onAssignAudit}
        />
      )}

      {statusAuditorModal && (
        <ModalStatusAuditor
          auditor={statusAuditorModal}
          initialDate={selectedDate}
          onClose={() => setStatusAuditorModal(null)}
          currentUser={currentUser}
        />
      )}

      {showNewTaskModal && (
        <NovaAtividadeAvulsaModal
          onClose={() => setShowNewTaskModal(false)}
          onToast={addToast}
          onSave={async (task) => {
            const hist = [{ timestamp: new Date().toISOString(), usuario: 'WFM_Operador', acao: 'CRIADO_AVULSA', observacao: 'Atividade avulsa criada no painel' }];
            const wfmTask = { ...task, historico: hist };
            const { error } = await supabase.from('wfm_tarefas').insert([wfmTask]);
            if (error) {
              addToast('Erro ao criar tarefa avulsa: ' + error.message, 'error');
            } else {
              addToast('Nova atividade criada com sucesso!', 'success');
              setShowNewTaskModal(false);
            }
          }}
        />
      )}

      {showActivityModal && (
        <ActivityModal
          auditorLogin={showActivityModal}
          dateStr={dateStr}
          onClose={() => setShowActivityModal(null)}
          onSave={async (data) => {
            await supabase.from('autofiscalizacao_atividades_extras').insert([data]);
            if (onRefreshAtividades) onRefreshAtividades();
            addToast('Atividade extra salva com sucesso!', 'success');
            setShowActivityModal(null);
          }}
        />
      )}

      {showConfig && (
        <ConfigModal
          auditorLogin={showConfig}
          pref={prefs.find(p => p.auditor === showConfig) || { auditor: showConfig }}
          escalas={escalas}
          dateStr={dateStr}
          onClose={() => setShowConfig(null)}
          onSave={async (data, isCalendarEnabled) => {
            await supabase.from('autofiscalizacao_auditor_prefs').upsert(data);
            if (isCalendarEnabled) {
              await supabase.from('wfm_calendario_escalas').upsert({
                auditor: showConfig,
                date: dateStr,
                shift_start: data.shift_start,
                shift_end: data.shift_end,
                created_by: currentUser?.nome || currentUser?.login || 'Sistema'
              }, { onConflict: 'auditor,date' });
            } else {
              await supabase.from('wfm_calendario_escalas').delete().eq('auditor', showConfig).eq('date', dateStr);
            }
            fetchPrefs();
            if (onRefreshEscalas) onRefreshEscalas();
            addToast('Configurações do auditor atualizadas com sucesso!', 'success');
            setShowConfig(null);
          }}
        />
      )}

      {historyAuditor && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 flex flex-col max-h-[85vh]">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
                  <Clock size={20} />
                </div>
                <div>
                  <h3 className="font-black text-slate-800 text-base">Histórico de Ações do Auditor</h3>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5">{historyAuditor}</p>
                </div>
              </div>
              <button
                onClick={() => setHistoryAuditor(null)}
                className="p-2 hover:bg-slate-200 rounded-xl transition-colors text-slate-400 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 p-6 overflow-y-auto space-y-4">
              {getAuditorHistory(historyAuditor).length === 0 ? (
                <div className="text-center py-8 text-slate-400 font-bold text-sm">
                  Nenhuma ação registrada para este auditor hoje.
                </div>
              ) : (
                <div className="relative border-l border-slate-200 pl-4 ml-2 space-y-5">
                  {getAuditorHistory(historyAuditor).map((item, idx) => (
                    <div key={idx} className="relative">
                      <span className="absolute -left-[21px] top-1.5 w-2.5 h-2.5 rounded-full bg-blue-500 border border-white ring-4 ring-blue-50"></span>
                      <div className="text-[10px] text-slate-400 font-black uppercase tracking-wider">
                        {new Date(item.timestamp).toLocaleTimeString('pt-BR')}
                      </div>
                      <div className="text-xs font-bold text-slate-800 mt-0.5 uppercase tracking-wide">
                        {item.acao.replace(/_/g, ' ')}
                      </div>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                        {item.observacao}
                      </p>
                      <div className="text-[9px] text-slate-400 mt-1 font-medium">
                        Por: {item.usuario}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setHistoryAuditor(null)}
                className="px-5 py-2.5 text-xs font-black uppercase tracking-wider text-slate-600 hover:text-slate-800 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition-all"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {ganttActionItem && (
        <ActionPopover
          data={ganttActionItem}
          ordens={ordens}
          fieldAudits={fieldAudits}
          workflows={workflows}
          inspecoes={inspecoes}
          onClose={() => setGanttActionItem(null)}
          onAction={(action) => handleAction(action, ganttActionItem.item, ganttActionItem.type)}
          onViewDetails={() => {
            if (ganttActionItem.type === 'os') {
              const osToOpen = ganttActionItem.osData || ganttActionItem.item.os_data || ganttActionItem.item;
              handleOpenOSDetails(osToOpen);
            }
            setGanttActionItem(null);
          }}
        />
      )}

      {/* ── ULTRA-PREMIUM NATIVE WFM TOAST NOTIFICATIONS ── */}
      <WFMToastList toasts={toasts} onDismiss={removeToast} />

      {/* ── ULTRA-PREMIUM NATIVE WFM CONFIRMATION DIALOG ── */}
      {confirmModal && <WFMConfirmModal {...confirmModal} />}
    </div>

  );

}

function ActionPopover({ data, onClose, onAction, onViewDetails, ordens = [], fieldAudits = [], workflows = [], inspecoes = [] }) {
  const { item, type, label, address, base, osData, timeInfo: propTimeInfo } = data;
  const [copied, setCopied] = useState(false);
  
  const timeInfo = useMemo(() => {
    if (propTimeInfo && propTimeInfo.osId) return propTimeInfo;
    if (type !== 'os') return {};
    return getOSTimesAndStatus(item, ordens, fieldAudits, workflows, inspecoes);
  }, [item, type, propTimeInfo, ordens, fieldAudits, workflows, inspecoes]);

  const status = (type === 'os' ? (timeInfo.status || item.status || 'pending') : (item.status || 'pending')).toLowerCase();
  const isStarted = status === 'in_progress' || status === 'iniciada' || status === 'iniciado';
  const isSuspended = status === 'suspended' || status === 'suspensa' || status === 'suspenso';
  const isCompleted = status === 'completed' || status === 'concluido' || status === 'concluida';
  
  const formatStatus = () => {
     if (isCompleted) return 'Concluída';
     if (isSuspended) return 'Suspensa';
     if (isStarted) return 'Em Andamento';
     if (item.auditor) return 'Programada';
     return 'Despachada / Pendente';
  };
  
  const statusColor = isCompleted 
    ? 'text-blue-700 bg-blue-50 border-blue-200' 
    : (isSuspended 
      ? 'text-amber-700 bg-amber-50 border-amber-200' 
      : (isStarted 
        ? 'text-emerald-700 bg-emerald-50 border-emerald-200 animate-pulse' 
        : 'text-slate-700 bg-slate-100 border-slate-200'));

  const payload = item.payload_dados || item.os_data || {};
  const osInfo = osData || timeInfo.matchedOrdem || {};
  const rawAddress = osInfo.endereco_completo || osInfo.endereco_cliente || payload.endereco_completo || payload.endereco_cliente || payload.endereco || address || '';
  
  let cleanAddressText = rawAddress;
  let latFromUrl = null;
  let lngFromUrl = null;

  if (typeof cleanAddressText === 'string' && (cleanAddressText.startsWith('http://') || cleanAddressText.startsWith('https://'))) {
    const coordsMatch = cleanAddressText.match(/([-+]?\d+\.\d+)[\s,+]+([-+]?\d+\.\d+)/g);
    if (coordsMatch && coordsMatch.length > 0) {
      const lastCoord = coordsMatch[coordsMatch.length - 1].replace(/\+/g, ' ').trim().split(/\s+/);
      if (lastCoord.length === 2) {
        latFromUrl = parseFloat(lastCoord[0]);
        lngFromUrl = parseFloat(lastCoord[1]);
      }
    }
    const bairroMunicipio = [osInfo.bairro || payload.bairro, osInfo.municipio || osInfo.cidade || payload.municipio].filter(Boolean).join(', ');
    cleanAddressText = bairroMunicipio || 'Localização Georreferenciada da OS';
  }

  const baseOp = osInfo.base_contrato || osInfo.base || payload.base_contrato || payload.base || base || '-';
  const equipeCodigo = osInfo.equipe || payload.equipe || item.equipe || '-';
  const classeOS = osInfo.classe || payload.classe || item.classe || '-';
  const causaOS = osInfo.descricao_causa || osInfo.causa || payload.descricao_causa || payload.causa || item.causa || '-';

  const plannedStart = timeInfo.plannedStart || (item.planned_start ? new Date(item.planned_start) : null);
  const plannedEnd = timeInfo.plannedEnd || (item.planned_end ? new Date(item.planned_end) : null);
  const plannedDurationMins = timeInfo.plannedDurationMins || ((plannedStart && plannedEnd) ? Math.round((plannedEnd - plannedStart) / 60000) : (item.minutos || item.duracao || payload.duracao || 60));

  const realStart = timeInfo.realStart;
  const realEnd = timeInfo.realEnd;
  const executedDurationMins = timeInfo.executedDurationMins;

  const finalLat = osInfo.latitude || payload.latitude || item.latitude || latFromUrl;
  const finalLng = osInfo.longitude || payload.longitude || item.longitude || lngFromUrl;

  const mapsUrl = (finalLat && finalLng)
    ? `https://www.google.com/maps/dir/?api=1&destination=${finalLat},${finalLng}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(cleanAddressText)}`;

  const wazeUrl = (finalLat && finalLng)
    ? `https://waze.com/ul?ll=${finalLat},${finalLng}&navigate=yes`
    : `https://waze.com/ul?q=${encodeURIComponent(cleanAddressText)}&navigate=yes`;

  const handleCopyAddress = () => {
    if (cleanAddressText) {
      navigator.clipboard.writeText(cleanAddressText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs" onClick={onClose}>
      <div className="bg-white rounded-3xl shadow-2xl overflow-hidden w-full max-w-md border border-slate-100 animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="p-4 bg-slate-900 text-white flex justify-between items-start">
          <div>
            <div className="flex items-center gap-2">
              {type === 'os' ? <FileText size={18} className="text-blue-400" /> : <AlertTriangle size={18} className="text-purple-400" />}
              <h3 className="font-black text-base tracking-wide text-white">{label}</h3>
            </div>
            <div className="mt-1.5 flex items-center gap-2">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${statusColor}`}>
                {formatStatus()}
              </span>
              <span className="text-[11px] text-slate-300 font-bold">
                {type === 'os' ? (item.categoria || 'Fiscalização de OS') : item.tipo_atividade}
              </span>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-3.5 max-h-[75vh] overflow-y-auto">
          {/* Equipe, Base & Duração */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/70 text-center">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Equipe</span>
              <span className="text-xs font-black text-slate-800 truncate block mt-0.5">{equipeCodigo}</span>
            </div>
            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/70 text-center">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Base</span>
              <span className="text-xs font-black text-slate-800 truncate block mt-0.5">{baseOp}</span>
            </div>
            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/70 text-center">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Duração</span>
              <span className="text-xs font-black text-blue-600 truncate block mt-0.5">
                {executedDurationMins ? `${executedDurationMins} min` : `${plannedDurationMins} min`}
              </span>
            </div>
          </div>

          {/* Esteira de 3 Tempos */}
          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/70 space-y-2">
            <div className="text-[10px] font-black uppercase tracking-wider text-slate-500">Linha de Tempo da OS</div>
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-white p-2.5 rounded-xl border border-slate-200/80 shadow-2xs flex flex-col justify-between">
                <div className="flex items-center gap-1 text-[9px] font-black uppercase text-slate-500">
                  <Clock size={11} className="text-blue-500 shrink-0" /> Programado
                </div>
                <div className="mt-1.5">
                  <span className="text-[11px] font-mono font-bold text-slate-800 block leading-tight">
                    {plannedStart ? plannedStart.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                  </span>
                  <span className="text-[9px] font-mono text-slate-400 block leading-tight">
                    até {plannedEnd ? plannedEnd.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                  </span>
                </div>
                <span className="text-[8px] font-bold text-slate-400 mt-1 block">{plannedDurationMins}m prev.</span>
              </div>
              <div className={`p-2.5 rounded-xl border shadow-2xs flex flex-col justify-between ${realStart ? 'bg-emerald-50/70 border-emerald-200' : 'bg-white border-slate-200/80'}`}>
                <div className="flex items-center gap-1 text-[9px] font-black uppercase text-emerald-700">
                  <Play size={11} className="text-emerald-500 fill-emerald-500 shrink-0" /> Início Real
                </div>
                <div className="mt-1.5">
                  <span className={`text-[11px] font-mono font-bold block leading-tight ${realStart ? 'text-emerald-800' : 'text-slate-400'}`}>
                    {realStart ? realStart.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'Não iniciado'}
                  </span>
                </div>
                <span className="text-[8px] font-bold text-slate-400 mt-1 block">
                  {realStart ? (realStart.toLocaleDateString('pt-BR') !== (plannedStart ? plannedStart.toLocaleDateString('pt-BR') : '') ? realStart.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : 'Iniciado') : 'Aguardando'}
                </span>
              </div>
              <div className={`p-2.5 rounded-xl border shadow-2xs flex flex-col justify-between ${realEnd ? 'bg-blue-50/70 border-blue-200' : (isStarted ? 'bg-amber-50/70 border-amber-200' : 'bg-white border-slate-200/80')}`}>
                <div className="flex items-center gap-1 text-[9px] font-black uppercase text-blue-700">
                  <CheckCircle2 size={11} className="text-blue-500 shrink-0" /> Conclusão
                </div>
                <div className="mt-1.5">
                  <span className={`text-[11px] font-mono font-bold block leading-tight ${realEnd ? 'text-blue-800' : (isStarted ? 'text-amber-700 font-bold text-[10px]' : 'text-slate-400')}`}>
                    {realEnd ? realEnd.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : (isStarted ? 'Em andamento' : (isSuspended ? 'Suspensa' : 'Pendente'))}
                  </span>
                </div>
                <span className="text-[8px] font-bold text-slate-400 mt-1 block">
                  {executedDurationMins ? `${executedDurationMins}m real` : '--'}
                </span>
              </div>
            </div>
          </div>

          {/* Endereço & Navegação */}
          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/70 space-y-2.5">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-2 text-xs min-w-0">
                <MapPin size={15} className="text-rose-500 shrink-0 mt-0.5" />
                <span className="font-semibold text-slate-700 leading-snug break-words">
                  {cleanAddressText || 'Sem Endereço Registrado'}
                </span>
              </div>
              <button 
                onClick={handleCopyAddress}
                title="Copiar Endereço"
                className="p-1 rounded-lg bg-white border border-slate-200 text-slate-500 hover:text-slate-800 shrink-0 hover:bg-slate-100 transition-colors"
              >
                {copied ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
              </button>
            </div>
            
            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200/60">
              <a
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="py-2 px-3 bg-white hover:bg-blue-50 text-blue-700 font-black text-xs rounded-xl border border-blue-200 text-center flex items-center justify-center gap-1.5 shadow-2xs transition-all active:scale-98"
              >
                <MapIcon size={14} className="text-blue-600" /> Google Maps
              </a>
              <a
                href={wazeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="py-2 px-3 bg-white hover:bg-cyan-50 text-cyan-800 font-black text-xs rounded-xl border border-cyan-200 text-center flex items-center justify-center gap-1.5 shadow-2xs transition-all active:scale-98"
              >
                <Navigation size={14} className="text-cyan-600" /> Waze
              </a>
            </div>
          </div>

          {/* Ações */}
          <div className="space-y-2 pt-1">
            {!isStarted && !isCompleted && !isSuspended && (
              <button 
                onClick={() => onAction('iniciar')} 
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md shadow-emerald-500/20 active:scale-98"
              >
                <Play size={15} /> Iniciar Atividade Agora
              </button>
            )}
            {isStarted && !isCompleted && !isSuspended && (
              <button 
                onClick={() => onAction('suspender')} 
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md shadow-amber-500/20 active:scale-98"
              >
                <Pause size={15} /> Suspender Atividade
              </button>
            )}
            
            {!isStarted && !isCompleted && !isSuspended && (
              <button 
                onClick={() => onAction('desprogramar')} 
                className="w-full flex items-center justify-center gap-2 py-2 bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-600 font-bold text-xs rounded-xl transition-colors"
              >
                <Trash2 size={14} /> Desprogramar do Gantt
              </button>
            )}

            {type === 'os' && (
              <button 
                onClick={onViewDetails} 
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md shadow-blue-500/20 active:scale-98 cursor-pointer"
              >
                <Eye size={14} /> Ver Todos os Detalhes da OS
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ActivityModal({ auditorLogin, dateStr, onClose, onSave }) {
  const [tipo, setTipo] = useState('Refeição');
  const [start, setStart] = useState('12:00');
  const [end, setEnd] = useState('13:00');
  const [comentario, setComentario] = useState('');

  const handleSave = () => {
    const s = new Date(`${dateStr}T${start}:00-03:00`);
    const e = new Date(`${dateStr}T${end}:00-03:00`);

    onSave({
      auditor: auditorLogin,
      tipo_atividade: tipo,
      data: dateStr,
      planned_start: s.toISOString(),
      planned_end: e.toISOString(),
      status: 'pending',
      comentario
    });
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95">
        <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
          <h3 className="font-black text-slate-800">Nova Atividade Extra</h3>
          <button onClick={onClose} className="p-1 hover:bg-slate-200 rounded-lg"><X size={16} /></button>
        </div>

        <div className="p-4 space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Tipo de Atividade</label>
            <select value={tipo} onChange={e => setTipo(e.target.value)} className="w-full p-2 border border-slate-200 rounded-lg font-medium text-slate-700">
              <option>Refeição</option>
              <option>Frota</option>
              <option>Almoxarifado</option>
              <option>Atividade Interna</option>
              <option>Atividade Externa</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Início</label>
              <input type="time" value={start} onChange={e => setStart(e.target.value)} className="w-full p-2 border border-slate-200 rounded-lg font-medium text-slate-700" />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Fim</label>
              <input type="time" value={end} onChange={e => setEnd(e.target.value)} className="w-full p-2 border border-slate-200 rounded-lg font-medium text-slate-700" />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Comentário</label>
            <input type="text" value={comentario} onChange={e => setComentario(e.target.value)} className="w-full p-2 border border-slate-200 rounded-lg font-medium text-slate-700" placeholder="Motivo ou descrição..." />
          </div>
        </div>

        <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm font-bold text-slate-500 hover:text-slate-700">Cancelar</button>
          <button onClick={handleSave} className="px-4 py-2 bg-emerald-600 text-white text-sm font-bold rounded-lg shadow-sm hover:bg-emerald-700">Salvar Atividade</button>
        </div>
      </div>
    </div>
  );
}

function ConfigModal({ auditorLogin, pref, escalas = [], dateStr, onClose, onSave }) {
  const existingScale = escalas.find(e => e.auditor === auditorLogin);
  const [isEnabled, setIsEnabled] = useState(!!existingScale);
  const [start, setStart] = useState(existingScale?.shift_start || pref.shift_start || '07:00');
  const [end, setEnd] = useState(existingScale?.shift_end || pref.shift_end || '18:00');
  const [startAddress, setStartAddress] = useState(pref.start_address || '');
  const [startLat, setStartLat] = useState(pref.start_lat || '');
  const [startLng, setStartLng] = useState(pref.start_lng || '');

  const handleSave = () => {
    onSave(
      {
        ...pref,
        shift_start: start,
        shift_end: end,
        start_address: startAddress,
        start_lat: parseFloat(startLat) || null,
        start_lng: parseFloat(startLng) || null
      },
      isEnabled
    );
  };

  const formattedDate = dateStr ? dateStr.split('-').reverse().join('/') : '';

  return (

    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">

      <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl animate-in zoom-in-95">

        <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">

          <h3 className="font-black text-slate-800 flex items-center gap-2"><Settings size={16} className="text-blue-600" /> Ajustes de Turno</h3>

          <button onClick={onClose} className="p-1 hover:bg-slate-200 rounded-lg"><X size={16} /></button>

        </div>

        <div className="p-4 space-y-4">

          <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200/60 rounded-xl shadow-inner mb-2">

            <div className="flex flex-col">

              <span className="text-xs font-black text-slate-800 uppercase tracking-wide">Habilitar Escala</span>

              <span className="text-[10px] font-bold text-slate-400">Ativar escala para o dia {formattedDate}</span>

            </div>

            <input

              type="checkbox"

              checked={isEnabled}

              onChange={e => setIsEnabled(e.target.checked)}

              className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"

            />

          </div>

          <div className="bg-blue-50 text-blue-800 text-xs p-3 rounded-lg font-medium">

            Define o horário de trabalho de <b>{auditorLogin}</b>. Horários fora deste turno ficarão cinzas no Gantt.

          </div>

          <div className="grid grid-cols-2 gap-4">

            <div>

              <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Início</label>

              <input type="time" value={start} onChange={e => setStart(e.target.value)} className="w-full p-2 border border-slate-200 rounded-lg font-medium text-slate-700" />

            </div>

            <div>

              <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Fim</label>

              <input type="time" value={end} onChange={e => setEnd(e.target.value)} className="w-full p-2 border border-slate-200 rounded-lg font-medium text-slate-700" />

            </div>

            <div className="col-span-2 mt-2">

              <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Endereço de Partida (Ponto Fixo)</label>

              <input type="text" value={startAddress} onChange={e => setStartAddress(e.target.value)} placeholder="Rua de Exemplo, 123" className="w-full p-2 border border-slate-200 rounded-lg font-medium text-slate-700" />

            </div>

            <div>

              <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Latitude Fixo</label>

              <input type="number" step="any" value={startLat} onChange={e => setStartLat(e.target.value)} placeholder="-23.5505" className="w-full p-2 border border-slate-200 rounded-lg font-medium text-slate-700" />

            </div>

            <div>

              <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Longitude Fixo</label>

              <input type="number" step="any" value={startLng} onChange={e => setStartLng(e.target.value)} placeholder="-46.6333" className="w-full p-2 border border-slate-200 rounded-lg font-medium text-slate-700" />

            </div>

          </div>

        </div>

        <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-2">

          <button onClick={onClose} className="px-4 py-2 text-sm font-bold text-slate-500 hover:text-slate-700">Cancelar</button>

          <button onClick={handleSave} className="px-4 py-2 bg-blue-600 text-white text-sm font-bold rounded-lg shadow-sm hover:bg-blue-700">Salvar Turno</button>

        </div>

      </div>

    </div>

  );

}

function DraggableWindow({ title, onClose, initialX = 80, initialY = 120, initialW = 320, initialH = 500, children, onDrop, onDragOver }) {

  const [pos, setPos] = useState({ x: initialX, y: initialY });

  const [size, setSize] = useState({ w: initialW, h: initialH });

  const [isDragging, setIsDragging] = useState(false);

  const [isResizing, setIsResizing] = useState(false);

  useEffect(() => {

    const handleMouseMove = (e) => {

      if (isDragging) {

        setPos(p => ({ x: p.x + e.movementX, y: Math.max(0, p.y + e.movementY) }));

      } else if (isResizing) {

        setSize(s => ({ w: Math.max(250, s.w + e.movementX), h: Math.max(300, s.h + e.movementY) }));

      }

    };

    const handleMouseUp = () => { setIsDragging(false); setIsResizing(false); };

    if (isDragging || isResizing) {

      window.addEventListener('mousemove', handleMouseMove);

      window.addEventListener('mouseup', handleMouseUp);

    }

    return () => { window.removeEventListener('mousemove', handleMouseMove); window.removeEventListener('mouseup', handleMouseUp); };

  }, [isDragging, isResizing]);

  return (

    <div

      className="fixed z-50 bg-white/95 backdrop-blur-xl border border-slate-300 shadow-[0_20px_50px_rgba(0,0,0,0.2)] flex flex-col rounded-xl overflow-hidden"

      style={{ left: pos.x, top: pos.y, width: size.w, height: size.h }}

      onDrop={onDrop}

      onDragOver={onDragOver}

    >

      <div

        className="p-3 bg-slate-800 border-b border-slate-700 cursor-move flex justify-between items-center shrink-0 select-none shadow-md"

        onMouseDown={(e) => { setIsDragging(true); }}

      >

        <div className="font-black text-white text-sm flex items-center gap-2"><Filter size={16} className="text-blue-400" /> {title}</div>

        <button onMouseDown={e => e.stopPropagation()} onClick={onClose} className="p-1 hover:bg-slate-600 rounded text-slate-300"><X size={14} /></button>

      </div>

      <div className="flex-1 overflow-hidden relative flex flex-col bg-slate-50">

        {children}

      </div>

      <div

        className="absolute bottom-0 right-0 w-5 h-5 cursor-se-resize z-50 flex items-end justify-end p-1"

        onMouseDown={(e) => { e.stopPropagation(); setIsResizing(true); e.preventDefault(); }}

      >

        <svg viewBox="0 0 10 10" className="w-3 h-3 text-slate-500 opacity-60 hover:opacity-100"><path d="M8 10L10 8M5 10L10 5M2 10L10 2" stroke="currentColor" strokeWidth="2" /></svg>

      </div>

    </div>

  );

}

function Calendar3MonthsModal({ currentDate, onSelect, onClose }) {

  const [baseDate, setBaseDate] = useState(new Date(currentDate));

  const [pos, setPos] = useState({ x: window.innerWidth / 2 - 350, y: 80 });

  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {

    const handleMouseMove = (e) => {

      if (isDragging) {

        setPos(p => ({ x: p.x + e.movementX, y: Math.max(0, p.y + e.movementY) }));

      }

    };

    const handleMouseUp = () => { setIsDragging(false); };

    if (isDragging) {

      window.addEventListener('mousemove', handleMouseMove);

      window.addEventListener('mouseup', handleMouseUp);

    }

    return () => {

      window.removeEventListener('mousemove', handleMouseMove);

      window.removeEventListener('mouseup', handleMouseUp);

    };

  }, [isDragging]);

  const renderMonth = (monthOffset) => {

    const d = new Date(baseDate.getFullYear(), baseDate.getMonth() + monthOffset, 1);

    const monthName = d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

    const daysInMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();

    const firstDayIndex = d.getDay();

    const days = Array(firstDayIndex).fill(null).concat(Array.from({ length: daysInMonth }, (_, i) => i + 1));

    return (

      <div className="w-52 flex-shrink-0 bg-slate-50/50 p-2 rounded-xl border border-slate-100 select-none">

        <h4 className="font-black text-slate-700 text-center mb-3 capitalize flex items-center justify-center gap-2">

          {monthOffset === 0 && <Clock size={14} className="text-blue-600" />}

          {monthName}

        </h4>

        <div className="grid grid-cols-7 gap-1 mb-1 text-center text-[10px] font-black text-slate-400">

          {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((w, i) => <div key={i}>{w}</div>)}

        </div>

        <div className="grid grid-cols-7 gap-1">

          {days.map((day, i) => {

            if (!day) return <div key={i} />;

            const isToday = new Date().toDateString() === new Date(d.getFullYear(), d.getMonth(), day).toDateString();

            const isSelected = currentDate.toDateString() === new Date(d.getFullYear(), d.getMonth(), day).toDateString();

            return (

              <button

                key={i}

                onClick={() => onSelect(new Date(d.getFullYear(), d.getMonth(), day))}

                className={`w-full aspect-square rounded text-xs flex items-center justify-center transition-all 

                  ${isSelected ? 'bg-blue-600 text-white font-black shadow-md scale-105' :

                    isToday ? 'bg-blue-100 text-blue-700 font-black' :

                      'hover:bg-white hover:shadow-sm text-slate-600 font-medium'}`}

              >

                {day}

              </button>

            );

          })}

        </div>

      </div>

    );

  };

  return (

    <div

      className="fixed bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-slate-200/80 p-6 z-[70] flex flex-col gap-4 animate-in fade-in zoom-in-95 select-none"

      style={{ left: pos.x, top: pos.y }}

    >

      <div

        className="flex items-center justify-between mb-2 cursor-move border-b border-slate-100 pb-2 active:bg-slate-50/50 rounded-lg p-1"

        onMouseDown={() => setIsDragging(true)}

      >

        <button onMouseDown={e => e.stopPropagation()} onClick={() => setBaseDate(new Date(baseDate.getFullYear(), baseDate.getMonth() - 1, 1))} className="p-2 hover:bg-slate-100 rounded-xl transition-colors"><ChevronLeft size={20} /></button>

        <span className="font-black text-[11px] text-slate-400 uppercase tracking-widest">Calendário (Arraste para mover)</span>

        <button onMouseDown={e => e.stopPropagation()} onClick={() => setBaseDate(new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 1))} className="p-2 hover:bg-slate-100 rounded-xl transition-colors"><ChevronRight size={20} /></button>

      </div>

      <div className="flex gap-4 overflow-hidden">

        {renderMonth(-1)}

        {renderMonth(0)}

        {renderMonth(1)}

      </div>

      <button onClick={onClose} className="absolute -top-3 -right-3 bg-white p-2 shadow-lg rounded-full text-slate-400 hover:text-red-500 hover:bg-red-50 border border-slate-100 transition-colors"><X size={16} /></button>

    </div>

  );

}

function NovaAtividadeAvulsaModal({ onClose, onSave, onToast }) {

  const [categoria, setCategoria] = useState('Fiscalização de OS');

  const [qtdAnexos, setQtdAnexos] = useState(1);

  // Common metadata

  const [equipe, setEquipe] = useState('');

  const [nrOrdem, setNrOrdem] = useState('');

  const [despachada, setDespachada] = useState('');

  const [aCaminho, setACaminho] = useState('');

  const [noLocal, setNoLocal] = useState('');

  const [liberada, setLiberada] = useState('');

  const [minutos, setMinutos] = useState(60);

  const [atuacao, setAtuacao] = useState('TMA');

  const [base, setBase] = useState('Fagundes Filho');

  const [tipoVeiculo, setTipoVeiculo] = useState('Cesto Aéreo');

  const [tipoEquipe, setTipoEquipe] = useState('TMA');

  const [classe, setClasse] = useState('');

  const [causa, setCausa] = useState('');

  const [periodo, setPeriodo] = useState('Manhã');

  // CEP / Endereço Client for Fiscalização de OS

  const [cep, setCep] = useState('');

  const [rua, setRua] = useState('');

  const [bairro, setBairro] = useState('');

  const [cidade, setCidade] = useState('');

  const [estado, setEstado] = useState('');

  const [numero, setNumero] = useState('');

  const [complemento, setComplemento] = useState('');

  // Fiscalização Indicadores specific

  const [supervisor, setSupervisor] = useState('');

  const [selectedIndicadores, setSelectedIndicadores] = useState({}); // { [indName]: resultado }

  const [customIndName, setCustomIndName] = useState('');

  const [customIndValue, setCustomIndValue] = useState('');

  // AutoFiscalização specific

  const [dataAF, setDataAF] = useState('');

  const [chaveUnicaOS, setChaveUnicaOS] = useState('');

  const [chaveUnica, setChaveUnica] = useState('');

  const [enderecoClienteAF, setEnderecoClienteAF] = useState('');

  const [enderecoCompletoAF, setEnderecoCompletoAF] = useState('');

  // Outros specific

  const [tituloOutros, setTituloOutros] = useState('');

  const [enderecoOutros, setEnderecoOutros] = useState('');

  const [obsOutros, setObsOutros] = useState('');

  const handleCepSearch = async () => {

    const cleanCep = cep.replace(/\D/g, '');

    if (cleanCep.length !== 8) {

      if (onToast) onToast("CEP inválido. Digite 8 números.", "warning", "CEP Inválido");

      return;

    }

    try {

      const resp = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);

      const data = await resp.json();

      if (data.erro) {

        if (onToast) onToast("CEP não encontrado.", "warning", "CEP Não Encontrado");

        return;

      }

      setRua(data.logradouro || '');

      setBairro(data.bairro || '');

      setCidade(data.localidade || '');

      setEstado(data.uf || '');

    } catch (e) {

      console.error(e);

      if (onToast) onToast("Erro ao buscar CEP.", "error");

    }

  };

  const toggleIndicador = (ind) => {

    setSelectedIndicadores(prev => {

      const next = { ...prev };

      if (next[ind] !== undefined) {

        delete next[ind];

      } else {

        next[ind] = '';

      }

      return next;

    });

  };

  const handleSave = () => {

    let payload = {
      latitude: lat,
      longitude: lng,

      qtd_anexos: parseInt(qtdAnexos) || 0,

      tipo_atividade: categoria

    };

    if (categoria === 'Fiscalização de OS') {

      if (!nrOrdem || !equipe) {

        if (onToast) onToast("Preencha o Número da OS e Equipe.", "warning", "Campos Obrigatórios");

        return;

      }

      const endComp = `${rua}, ${numero}${complemento ? ' Apt/Comp: ' + complemento : ''} - ${bairro} - ${cidade}/${estado} - CEP: ${cep}`;

      payload = {

        ...payload,

        osid: nrOrdem,

        equipe,

        despachada,

        a_caminho: aCaminho,

        no_local: noLocal,

        liberada,

        minutos: parseInt(minutos) || 60,

        atuacao,

        base_contrato: base,

        tipo_veiculo: tipoVeiculo,

        tipo_equipe: tipoEquipe,

        classe,

        causa,

        periodo,

        cep,

        rua,

        bairro,

        cidade,

        estado,

        numero,

        complemento,

        endereco_completo: endComp,

        titulo: `OS ${nrOrdem} - Fiscalização de OS`

      };

    } else if (categoria === 'Fiscalização Indicadores') {

      if (!equipe) {

        if (onToast) onToast("Preencha a Equipe.", "warning", "Campo Obrigatório");

        return;

      }

      payload = {

        ...payload,

        equipe,

        periodo,

        tipo_veiculo: tipoVeiculo,

        tipo_equipe: tipoEquipe,

        base_contrato: base,

        supervisor,

        indicadores: Object.entries(selectedIndicadores).map(([nome, resultado]) => ({ nome, resultado })),

        titulo: `Fiscalização Indicadores - Equipe ${equipe}`

      };

    } else if (categoria === 'AutoFiscalização') {

      if (!nrOrdem || !equipe) {

        if (onToast) onToast("Preencha o Número da OS e Equipe.", "warning", "Campos Obrigatórios");

        return;

      }

      payload = {

        ...payload,

        osid: nrOrdem,

        equipe,

        data: dataAF,

        despachada,

        a_caminho: aCaminho,

        no_local: noLocal,

        liberada,

        minutos: parseInt(minutos) || 60,

        atuacao,

        chave_unica_os: chaveUnicaOS,

        chave_unica: chaveUnica,

        base_contrato: base,

        tipo_veiculo: tipoVeiculo,

        tipo_equipe: tipoEquipe,

        classe,

        descricao_causa: causa,

        periodo,

        endereco_cliente: enderecoClienteAF,

        endereco_completo: enderecoCompletoAF || enderecoClienteAF,

        titulo: `OS ${nrOrdem} - AutoFiscalização`

      };

    } else {

      // Outros

      if (!tituloOutros || !enderecoOutros) {
        if (onToast) onToast("Preencha o Título e o Endereço.", "warning", "Campos Obrigatórios");
        return;
      }

      payload = {

        ...payload,

        titulo: tituloOutros,

        base_contrato: base,

        endereco_completo: enderecoOutros,

        observacao: obsOutros

      };

    }

    onSave({

      modulo_origem: 'WFM_AVULSA',

      categoria,

      payload_dados: payload,

      status: 'pendente',

      auditor: '',

      assigned_date: null,

      planned_start: null

    });

  };

  const BASES_LIST = [

    'Fagundes Filho', 'Cajati', 'Vila Medeiros',

    'Monte Santo', 'Aricanduva', 'Catumbi', 'Santo André',

    'Base SOC Leste 1', 'Base SOC Leste 2',

    'SOT Sul 1', 'SOT Leste 1', 'SOT Norte 1'

  ];

  return (

    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[80] flex items-center justify-center p-4">

      <div className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 flex flex-col max-h-[90vh]">

        <div className="p-5 border-b border-slate-100 bg-slate-800 flex justify-between items-center shrink-0">

          <h3 className="font-black text-white text-base flex items-center gap-2">

            <Plus size={18} /> Nova Atividade (Avulsa WFM)

          </h3>

          <button onClick={onClose} className="p-1 hover:bg-slate-700 rounded-lg text-slate-300 transition-colors"><X size={18} /></button>

        </div>

        <div className="p-6 space-y-6 overflow-y-auto flex-1 bg-slate-50/50">

          {/* Categoria Selector */}

          <div className="grid grid-cols-2 gap-4">

            <div>

              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Tipo de Atividade</label>

              <select

                value={categoria}

                onChange={e => setCategoria(e.target.value)}

                className="w-full p-3 border border-slate-200 rounded-xl font-bold text-slate-700 bg-white focus:ring-2 focus:ring-blue-500/20 outline-none"

              >

                <option value="Fiscalização de OS">Fiscalização de OS</option>

                <option value="Fiscalização Indicadores">Fiscalização Indicadores</option>

                <option value="AutoFiscalização">AutoFiscalização</option>

                <option value="Outros">Outros (Formulário Básico)</option>

              </select>

            </div>

            <div>

              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Qtd. Anexos de Campo</label>

              <select

                value={qtdAnexos}

                onChange={e => setQtdAnexos(parseInt(e.target.value))}

                className="w-full p-3 border border-slate-200 rounded-xl font-bold text-slate-700 bg-white focus:ring-2 focus:ring-blue-500/20 outline-none"

              >

                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => <option key={n} value={n}>{n} anexo{n !== 1 ? 's' : ''}</option>)}

              </select>

            </div>

          </div>

          <div className="border-t border-slate-200/60 pt-4">

            {/* Form rendering based on selection */}

            {categoria === 'Fiscalização de OS' && (

              <div className="space-y-4">

                <h4 className="text-xs font-black text-blue-600 uppercase tracking-wider mb-2">Dados da Fiscalização de OS</h4>

                <div className="grid grid-cols-2 gap-4">

                  <div>

                    <label className="text-[10px] font-bold text-slate-500 mb-1 block">Número da OS</label>

                    <input type="text" value={nrOrdem} onChange={e => setNrOrdem(e.target.value)} className="w-full p-2.5 border border-slate-200 rounded-xl bg-white text-slate-700 outline-none focus:border-blue-500" placeholder="Ex: 16494428-1" />

                  </div>

                  <div>

                    <label className="text-[10px] font-bold text-slate-500 mb-1 block">Equipe</label>

                    <input type="text" value={equipe} onChange={e => setEquipe(e.target.value)} className="w-full p-2.5 border border-slate-200 rounded-xl bg-white text-slate-700 outline-none focus:border-blue-500" placeholder="Ex: ENL100" />

                  </div>

                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">

                  <div>

                    <label className="text-[9px] font-bold text-slate-500 mb-1 block">Despachada</label>

                    <input type="datetime-local" value={despachada} onChange={e => setDespachada(e.target.value)} className="w-full p-2 border border-slate-200 rounded-lg text-xs" />

                  </div>

                  <div>

                    <label className="text-[9px] font-bold text-slate-500 mb-1 block">A Caminho</label>

                    <input type="datetime-local" value={aCaminho} onChange={e => setACaminho(e.target.value)} className="w-full p-2 border border-slate-200 rounded-lg text-xs" />

                  </div>

                  <div>

                    <label className="text-[9px] font-bold text-slate-500 mb-1 block">No Local</label>

                    <input type="datetime-local" value={noLocal} onChange={e => setNoLocal(e.target.value)} className="w-full p-2 border border-slate-200 rounded-lg text-xs" />

                  </div>

                  <div>

                    <label className="text-[9px] font-bold text-slate-500 mb-1 block">Liberada</label>

                    <input type="datetime-local" value={liberada} onChange={e => setLiberada(e.target.value)} className="w-full p-2 border border-slate-200 rounded-lg text-xs" />

                  </div>

                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">

                  <div>

                    <label className="text-[10px] font-bold text-slate-500 mb-1 block">Base</label>

                    <select value={base} onChange={e => setBase(e.target.value)} className="w-full p-2.5 border border-slate-200 rounded-xl bg-white">

                      {BASES_LIST.map(b => <option key={b} value={b}>{b}</option>)}

                    </select>

                  </div>

                  <div>

                    <label className="text-[10px] font-bold text-slate-500 mb-1 block">Atuação</label>

                    <select value={atuacao} onChange={e => setAtuacao(e.target.value)} className="w-full p-2.5 border border-slate-200 rounded-xl bg-white">

                      <option>TMA</option>

                      <option>P2</option>

                      <option>Outros</option>

                    </select>

                  </div>

                  <div>

                    <label className="text-[10px] font-bold text-slate-500 mb-1 block">Período</label>

                    <select value={periodo} onChange={e => setPeriodo(e.target.value)} className="w-full p-2.5 border border-slate-200 rounded-xl bg-white">

                      <option>Manhã</option>

                      <option>Tarde</option>

                      <option>Noite</option>

                    </select>

                  </div>

                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">

                  <div>

                    <label className="text-[10px] font-bold text-slate-500 mb-1 block">Tipo de Veículo</label>

                    <select value={tipoVeiculo} onChange={e => setTipoVeiculo(e.target.value)} className="w-full p-2.5 border border-slate-200 rounded-xl bg-white">

                      <option>Cesto Aéreo</option>

                      <option>Leve</option>

                      <option>Moto</option>

                    </select>

                  </div>

                  <div>

                    <label className="text-[10px] font-bold text-slate-500 mb-1 block">Tipo de Equipe</label>

                    <select value={tipoEquipe} onChange={e => setTipoEquipe(e.target.value)} className="w-full p-2.5 border border-slate-200 rounded-xl bg-white">

                      <option>TMA</option>

                      <option>SOC</option>

                      <option>Linha Vida</option>

                      <option>Linha Morta</option>

                      <option>Outros</option>

                    </select>

                  </div>

                  <div>

                    <label className="text-[10px] font-bold text-slate-500 mb-1 block">Duração (Minutos)</label>

                    <input type="number" value={minutos} onChange={e => setMinutos(e.target.value)} className="w-full p-2.5 border border-slate-200 rounded-xl bg-white" />

                  </div>

                </div>

                <div className="grid grid-cols-2 gap-4">

                  <div>

                    <label className="text-[10px] font-bold text-slate-500 mb-1 block">Classe</label>

                    <input type="text" value={classe} onChange={e => setClasse(e.target.value)} className="w-full p-2.5 border border-slate-200 rounded-xl bg-white" placeholder="Ex: Equipamento" />

                  </div>

                  <div>

                    <label className="text-[10px] font-bold text-slate-500 mb-1 block">Causa</label>

                    <input type="text" value={causa} onChange={e => setCausa(e.target.value)} className="w-full p-2.5 border border-slate-200 rounded-xl bg-white" placeholder="Ex: Defeito" />

                  </div>

                </div>

                {/* CEP Autocomplete Form */}

                <div className="bg-slate-100 p-4 rounded-2xl space-y-3 border border-slate-200/60">

                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Endereço do Cliente (CEP Autocomplete)</span>

                  <div className="flex gap-2">

                    <input

                      type="text"

                      value={cep}

                      onChange={e => setCep(e.target.value)}

                      placeholder="CEP (Ex: 01310-930)"

                      className="p-2 border border-slate-250 rounded-lg flex-1 outline-none text-xs font-bold text-slate-700 bg-white"

                    />

                    <button

                      type="button"

                      onClick={handleCepSearch}

                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-black uppercase tracking-wider transition-colors active:scale-95"

                    >

                      Buscar CEP

                    </button>

                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">

                    <input type="text" value={rua} onChange={e => setRua(e.target.value)} placeholder="Rua / Logradouro" className="p-2 border border-slate-200 rounded-lg bg-white w-full" />

                    <input type="text" value={bairro} onChange={e => setBairro(e.target.value)} placeholder="Bairro" className="p-2 border border-slate-200 rounded-lg bg-white w-full" />

                    <input type="text" value={cidade} onChange={e => setCidade(e.target.value)} placeholder="Cidade" className="p-2 border border-slate-200 rounded-lg bg-white w-full" />

                    <input type="text" value={estado} onChange={e => setEstado(e.target.value)} placeholder="Estado (UF)" className="p-2 border border-slate-200 rounded-lg bg-white w-full" />

                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">

                    <input type="text" value={numero} onChange={e => setNumero(e.target.value)} placeholder="Número" className="p-2 border border-slate-200 rounded-lg bg-white w-full font-bold" />

                    <input type="text" value={complemento} onChange={e => setComplemento(e.target.value)} placeholder="Complemento / Bloco" className="p-2 border border-slate-200 rounded-lg bg-white w-full" />

                  </div>

                </div>

              </div>

            )}

            {categoria === 'Fiscalização Indicadores' && (

              <div className="space-y-4">

                <h4 className="text-xs font-black text-purple-600 uppercase tracking-wider mb-2">Dados da Fiscalização de Indicadores</h4>

                <div className="grid grid-cols-2 gap-4">

                  <div>

                    <label className="text-[10px] font-bold text-slate-500 mb-1 block">Equipe</label>

                    <input type="text" value={equipe} onChange={e => setEquipe(e.target.value)} className="w-full p-2.5 border border-slate-200 rounded-xl bg-white text-slate-700 outline-none" placeholder="Ex: ENL100" />

                  </div>

                  <div>

                    <label className="text-[10px] font-bold text-slate-500 mb-1 block">Supervisor</label>

                    <input type="text" value={supervisor} onChange={e => setSupervisor(e.target.value)} className="w-full p-2.5 border border-slate-200 rounded-xl bg-white text-slate-700 outline-none" placeholder="Nome do Supervisor" />

                  </div>

                </div>

                <div className="grid grid-cols-3 gap-4">

                  <div>

                    <label className="text-[10px] font-bold text-slate-500 mb-1 block">Base</label>

                    <select value={base} onChange={e => setBase(e.target.value)} className="w-full p-2.5 border border-slate-200 rounded-xl bg-white">

                      {BASES_LIST.map(b => <option key={b} value={b}>{b}</option>)}

                    </select>

                  </div>

                  <div>

                    <label className="text-[10px] font-bold text-slate-500 mb-1 block">Período</label>

                    <select value={periodo} onChange={e => setPeriodo(e.target.value)} className="w-full p-2.5 border border-slate-200 rounded-xl bg-white">

                      <option>Manhã</option>

                      <option>Tarde</option>

                      <option>Noite</option>

                    </select>

                  </div>

                  <div>

                    <label className="text-[10px] font-bold text-slate-500 mb-1 block">Tipo de Veículo</label>

                    <select value={tipoVeiculo} onChange={e => setTipoVeiculo(e.target.value)} className="w-full p-2.5 border border-slate-200 rounded-xl bg-white">

                      <option>Cesto Aéreo</option>

                      <option>Leve</option>

                      <option>Moto</option>

                    </select>

                  </div>

                </div>

                <div className="grid grid-cols-2 gap-4">

                  <div>

                    <label className="text-[10px] font-bold text-slate-500 mb-1 block">Tipo de Equipe</label>

                    <select value={tipoEquipe} onChange={e => setTipoEquipe(e.target.value)} className="w-full p-2.5 border border-slate-200 rounded-xl bg-white">

                      <option>TMA</option>

                      <option>SOC</option>

                      <option>Linha Vida</option>

                      <option>Linha Morta</option>

                      <option>Outros</option>

                    </select>

                  </div>

                </div>

                {/* Indicadores Multi-selector and Custom Value fields */}

                <div className="bg-slate-100 p-4 rounded-2xl border border-slate-200 space-y-3">

                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Selecione e Preencha os Indicadores</span>

                  <div className="flex flex-wrap gap-1.5">

                    {['M300', 'Produtividade', 'Utilização', 'Retorno a Base', 'TMR Secundário', 'TMA Improdutivo', 'Improdutivo', 'Reincidência'].map(ind => {

                      const isActive = selectedIndicadores[ind] !== undefined;

                      return (

                        <button

                          type="button"

                          key={ind}

                          onClick={() => toggleIndicador(ind)}

                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${isActive ? 'bg-purple-600 text-white shadow-sm' : 'bg-white hover:bg-slate-50 text-slate-600 border border-slate-200'}`}

                        >

                          {ind}

                        </button>

                      );

                    })}

                  </div>

                  {/* Dynamic Inputs for selected indicators */}

                  {Object.keys(selectedIndicadores).length > 0 && (

                    <div className="space-y-2.5 pt-2 border-t border-slate-200 mt-2">

                      {Object.keys(selectedIndicadores).map(ind => (

                        <div key={ind} className="flex items-center justify-between gap-3 text-xs">

                          <span className="font-bold text-slate-700 w-32 shrink-0">{ind}</span>

                          <input

                            type="text"

                            value={selectedIndicadores[ind]}

                            onChange={e => setSelectedIndicadores(p => ({ ...p, [ind]: e.target.value }))}

                            placeholder="Preencha o resultado (Ex: 2,1 ou 56%)"

                            className="p-2 border border-slate-250 rounded-lg flex-1 outline-none font-bold bg-white text-slate-800"

                          />

                        </div>

                      ))}

                    </div>

                  )}

                  {/* Add Custom Indicator */}

                  <div className="flex gap-2 pt-2 border-t border-slate-200/50 mt-2">

                    <input

                      type="text"

                      placeholder="Outro Indicador..."

                      value={customIndName}

                      onChange={e => setCustomIndName(e.target.value)}

                      className="p-2 border border-slate-250 rounded-lg flex-1 text-xs"

                    />

                    <input

                      type="text"

                      placeholder="Resultado..."

                      value={customIndValue}

                      onChange={e => setCustomIndValue(e.target.value)}

                      className="p-2 border border-slate-250 rounded-lg flex-1 text-xs"

                    />

                    <button

                      type="button"

                      onClick={() => {

                        if (!customIndName || !customIndValue) return;

                        setSelectedIndicadores(p => ({ ...p, [customIndName]: customIndValue }));

                        setCustomIndName('');

                        setCustomIndValue('');

                      }}

                      className="px-3 py-2 bg-slate-700 text-white rounded-lg text-[10px] font-black uppercase tracking-wider hover:bg-slate-800"

                    >

                      Adicionar

                    </button>

                  </div>

                </div>

              </div>

            )}

            {categoria === 'AutoFiscalização' && (

              <div className="space-y-4">

                <h4 className="text-xs font-black text-emerald-600 uppercase tracking-wider mb-2">Dados da AutoFiscalização</h4>

                <div className="grid grid-cols-2 gap-4">

                  <div>

                    <label className="text-[10px] font-bold text-slate-500 mb-1 block">Número da OS</label>

                    <input type="text" value={nrOrdem} onChange={e => setNrOrdem(e.target.value)} className="w-full p-2.5 border border-slate-200 rounded-xl bg-white text-slate-700 outline-none" placeholder="Ex: 16494428-1" />

                  </div>

                  <div>

                    <label className="text-[10px] font-bold text-slate-500 mb-1 block">Equipe</label>

                    <input type="text" value={equipe} onChange={e => setEquipe(e.target.value)} className="w-full p-2.5 border border-slate-200 rounded-xl bg-white text-slate-700 outline-none" placeholder="Ex: ENL100" />

                  </div>

                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">

                  <div>

                    <label className="text-[9px] font-bold text-slate-500 mb-1 block">Data</label>

                    <input type="date" value={dataAF} onChange={e => setDataAF(e.target.value)} className="w-full p-2 border border-slate-200 rounded-lg text-xs" />

                  </div>

                  <div>

                    <label className="text-[9px] font-bold text-slate-500 mb-1 block">Despachada</label>

                    <input type="datetime-local" value={despachada} onChange={e => setDespachada(e.target.value)} className="w-full p-2 border border-slate-200 rounded-lg text-xs" />

                  </div>

                  <div>

                    <label className="text-[9px] font-bold text-slate-500 mb-1 block">A Caminho</label>

                    <input type="datetime-local" value={aCaminho} onChange={e => setACaminho(e.target.value)} className="w-full p-2 border border-slate-200 rounded-lg text-xs" />

                  </div>

                  <div>

                    <label className="text-[9px] font-bold text-slate-500 mb-1 block">No Local</label>

                    <input type="datetime-local" value={noLocal} onChange={e => setNoLocal(e.target.value)} className="w-full p-2 border border-slate-200 rounded-lg text-xs" />

                  </div>

                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">

                  <div>

                    <label className="text-[10px] font-bold text-slate-500 mb-1 block">Liberada</label>

                    <input type="datetime-local" value={liberada} onChange={e => setLiberada(e.target.value)} className="w-full p-2 border border-slate-200 rounded-lg text-xs" />

                  </div>

                  <div>

                    <label className="text-[10px] font-bold text-slate-500 mb-1 block">Chave Única OS</label>

                    <input type="text" value={chaveUnicaOS} onChange={e => setChaveUnicaOS(e.target.value)} className="w-full p-2.5 border border-slate-200 rounded-xl bg-white" placeholder="Chave Única OS" />

                  </div>

                  <div>

                    <label className="text-[10px] font-bold text-slate-500 mb-1 block">Chave Única</label>

                    <input type="text" value={chaveUnica} onChange={e => setChaveUnica(e.target.value)} className="w-full p-2.5 border border-slate-200 rounded-xl bg-white" placeholder="Chave Única" />

                  </div>

                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">

                  <div>

                    <label className="text-[10px] font-bold text-slate-500 mb-1 block">Base</label>

                    <select value={base} onChange={e => setBase(e.target.value)} className="w-full p-2.5 border border-slate-200 rounded-xl bg-white">

                      {BASES_LIST.map(b => <option key={b} value={b}>{b}</option>)}

                    </select>

                  </div>

                  <div>

                    <label className="text-[10px] font-bold text-slate-500 mb-1 block">Atuação</label>

                    <select value={atuacao} onChange={e => setAtuacao(e.target.value)} className="w-full p-2.5 border border-slate-200 rounded-xl bg-white">

                      <option>TMA</option>

                      <option>P2</option>

                      <option>Outros</option>

                    </select>

                  </div>

                  <div>

                    <label className="text-[10px] font-bold text-slate-500 mb-1 block">Período</label>

                    <select value={periodo} onChange={e => setPeriodo(e.target.value)} className="w-full p-2.5 border border-slate-200 rounded-xl bg-white">

                      <option>Manhã</option>

                      <option>Tarde</option>

                      <option>Noite</option>

                    </select>

                  </div>

                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">

                  <div>

                    <label className="text-[10px] font-bold text-slate-500 mb-1 block">Tipo de Veículo</label>

                    <select value={tipoVeiculo} onChange={e => setTipoVeiculo(e.target.value)} className="w-full p-2.5 border border-slate-200 rounded-xl bg-white">

                      <option>Cesto Aéreo</option>

                      <option>Leve</option>

                      <option>Moto</option>

                    </select>

                  </div>

                  <div>

                    <label className="text-[10px] font-bold text-slate-500 mb-1 block">Tipo de Equipe</label>

                    <select value={tipoEquipe} onChange={e => setTipoEquipe(e.target.value)} className="w-full p-2.5 border border-slate-200 rounded-xl bg-white">

                      <option>TMA</option>

                      <option>SOC</option>

                      <option>Linha Vida</option>

                      <option>Linha Morta</option>

                      <option>Outros</option>

                    </select>

                  </div>

                  <div>

                    <label className="text-[10px] font-bold text-slate-500 mb-1 block">Duração (Minutos)</label>

                    <input type="number" value={minutos} onChange={e => setMinutos(e.target.value)} className="w-full p-2.5 border border-slate-200 rounded-xl bg-white" />

                  </div>

                </div>

                <div className="grid grid-cols-2 gap-4">

                  <div>

                    <label className="text-[10px] font-bold text-slate-500 mb-1 block">Classe</label>

                    <input type="text" value={classe} onChange={e => setClasse(e.target.value)} className="w-full p-2.5 border border-slate-200 rounded-xl bg-white" placeholder="Ex: Equipamento" />

                  </div>

                  <div>

                    <label className="text-[10px] font-bold text-slate-500 mb-1 block">Causa</label>

                    <input type="text" value={causa} onChange={e => setCausa(e.target.value)} className="w-full p-2.5 border border-slate-200 rounded-xl bg-white" placeholder="Ex: Defeito" />

                  </div>

                </div>

                <div className="space-y-3">

                  <div>

                    <label className="text-[10px] font-bold text-slate-500 mb-1 block">Endereço Cliente</label>

                    <input type="text" value={enderecoClienteAF} onChange={e => setEnderecoClienteAF(e.target.value)} className="w-full p-2.5 border border-slate-200 rounded-xl bg-white" placeholder="Endereço Cliente" />

                  </div>

                  <div>

                    <label className="text-[10px] font-bold text-slate-500 mb-1 block">Endereço Completo</label>

                    <input type="text" value={enderecoCompletoAF} onChange={e => setEnderecoCompletoAF(e.target.value)} className="w-full p-2.5 border border-slate-200 rounded-xl bg-white" placeholder="Endereço Completo" />

                  </div>

                </div>

              </div>

            )}

            {categoria === 'Outros' && (

              <div className="space-y-4">

                <h4 className="text-xs font-black text-slate-600 uppercase tracking-wider mb-2">Dados da Atividade Comum (Básica)</h4>

                <div>

                  <label className="text-[10px] font-bold text-slate-500 mb-1 block">Título da Atividade</label>

                  <input type="text" value={tituloOutros} onChange={e => setTituloOutros(e.target.value)} className="w-full p-2.5 border border-slate-200 rounded-xl bg-white outline-none" placeholder="Ex: Reunião na Diretoria" />

                </div>

                <div>

                  <label className="text-[10px] font-bold text-slate-500 mb-1 block">Endereço / Local da Atividade</label>

                  <input type="text" value={enderecoOutros} onChange={e => setEnderecoOutros(e.target.value)} className="w-full p-2.5 border border-slate-200 rounded-xl bg-white outline-none" placeholder="Endereço..." />

                </div>

                <div>

                  <label className="text-[10px] font-bold text-slate-500 mb-1 block">Base de Controle</label>

                  <select value={base} onChange={e => setBase(e.target.value)} className="w-full p-2.5 border border-slate-200 rounded-xl bg-white">

                    {BASES_LIST.map(b => <option key={b} value={b}>{b}</option>)}

                  </select>

                </div>

                <div>

                  <label className="text-[10px] font-bold text-slate-500 mb-1 block">Observações / Detalhes</label>

                  <textarea value={obsOutros} onChange={e => setObsOutros(e.target.value)} className="w-full p-2.5 border border-slate-200 rounded-xl bg-white h-24 text-xs" placeholder="Descreva os objetivos da atividade..." />

                </div>

              </div>

            )}

          </div>

        </div>

        <div className="p-5 border-t border-slate-100 bg-slate-50 flex justify-end gap-2 shrink-0">

          <button onClick={onClose} className="px-5 py-2.5 text-xs font-black uppercase tracking-wider text-slate-500 hover:text-slate-700 transition-colors">Cancelar</button>

          <button onClick={handleSave} className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-md transition-all">Criar Atividade</button>

        </div>

      </div>

    </div>

  );

}

