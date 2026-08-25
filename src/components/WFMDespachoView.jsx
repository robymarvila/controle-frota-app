import React, { useState, useEffect, useMemo, useRef } from 'react';

const buildCleanOrFilter = (osObj, targetOsId) => {
  const parts = [];
  if (osObj?.id && typeof osObj.id === 'string' && osObj.id.trim().length > 0) {
    parts.push(`id.eq.${osObj.id.trim()}`);
  }
  if (targetOsId && typeof targetOsId === 'string' && targetOsId.trim().length > 0 && targetOsId !== '--') {
    parts.push(`id_origem.eq.${targetOsId.trim()}`);
    parts.push(`payload_dados->>osid.eq.${targetOsId.trim()}`);
  }
  return parts.join(',') || 'id.neq.00000000-0000-0000-0000-000000000000';
};

import { supabase } from '../supabaseClient';
import WFMScreen from './WFMScreen';
import ModalDetalhesOS from './ModalDetalhesOS';
import ModalEditarOS from './ModalEditarOS';

export default function WFMDespachoView({ currentUser, activeRegional }) {
  const [loading, setLoading] = useState(true);
  const [ordens, setOrdens] = useState([]);
  const [inspecoes, setInspecoes] = useState([]);
  const [workflows, setWorkflows] = useState([]);
  const [fieldAudits, setFieldAudits] = useState([]);
  const [atividadesExtras, setAtividadesExtras] = useState([]);
  const [colaboradoresList, setColaboradoresList] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [escalas, setEscalas] = useState([]);
  const [viewingOSDetails, setViewingOSDetails] = useState(null);
  const [editingTask, setEditingTask] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date());

  const selectedDateRef = useRef(selectedDate);
  useEffect(() => {
    selectedDateRef.current = selectedDate;
  }, [selectedDate]);

  useEffect(() => {
    fetchShifts();
    fetchEscalas();
  }, [selectedDate]);

  useEffect(() => {
    fetchAll();
    const ch1 = supabase.channel('rt-af-ordens').on('postgres_changes', { event: '*', schema: 'public', table: 'autofiscalizacao_ordens' }, () => fetchOrdens()).subscribe();
    const ch2 = supabase.channel('rt-af-insp').on('postgres_changes', { event: '*', schema: 'public', table: 'autofiscalizacao_inspecoes' }, () => fetchInspecoes()).subscribe();
    const ch3 = supabase.channel('rt-af-wf').on('postgres_changes', { event: '*', schema: 'public', table: 'autofiscalizacao_workflows' }, () => fetchWorkflows()).subscribe();
    const ch4 = supabase.channel('rt-af-fa').on('postgres_changes', { event: '*', schema: 'public', table: 'wfm_tarefas' }, () => fetchFieldAudits()).subscribe();
    const ch5 = supabase.channel('rt-af-atividades').on('postgres_changes', { event: '*', schema: 'public', table: 'autofiscalizacao_atividades_extras' }, () => fetchAtividadesExtras()).subscribe();
    const ch6 = supabase.channel('rt-af-shifts').on('postgres_changes', { event: '*', schema: 'public', table: 'autofiscalizacao_shifts' }, () => fetchShifts()).subscribe();
    const ch7 = supabase.channel('rt-wfm-escalas').on('postgres_changes', { event: '*', schema: 'public', table: 'wfm_calendario_escalas' }, () => fetchEscalas()).subscribe();
    const ch8 = supabase.channel('rt-af-field-audits').on('postgres_changes', { event: '*', schema: 'public', table: 'autofiscalizacao_field_audits' }, () => fetchFieldAudits()).subscribe();

    return () => {
      supabase.removeChannel(ch1); supabase.removeChannel(ch2); supabase.removeChannel(ch3);
      supabase.removeChannel(ch4); supabase.removeChannel(ch5); supabase.removeChannel(ch6);
      supabase.removeChannel(ch7); supabase.removeChannel(ch8);
    };
  }, []);

  const fetchOrdens = async () => { const { data } = await supabase.from('autofiscalizacao_ordens').select('*'); if (data) setOrdens(data); };
  const fetchInspecoes = async () => { const { data } = await supabase.from('autofiscalizacao_inspecoes').select('*'); if (data) setInspecoes(data); };
  const fetchWorkflows = async () => { const { data } = await supabase.from('autofiscalizacao_workflows').select('*'); if (data) setWorkflows(data); };

  const transformTask = (t) => {
    const link = t.payload_dados?.endereco_cliente || t.payload_dados?.endereco || '';
    let extracted = null;
    
    // Parse Google Maps link (Pattern 1 & Pattern 2)
    if (typeof link === 'string' && (link.includes('maps/dir/') || link.includes('google.com.br/maps'))) {
      const matches = [...link.matchAll(/(-?\d+\.\d+)/g)].map(m => parseFloat(m[0]));
      if (matches.length >= 4) {
        extracted = { lat: matches[matches.length - 2], lng: matches[matches.length - 1] };
      } else if (matches.length >= 2) {
        extracted = { lat: matches[0], lng: matches[1] };
      }
    }
    
    // Fallback for coordinates inside text string e.g. {-23.43055 -46.59377}
    if (!extracted && typeof link === 'string') {
      const rawMatch = link.match(/(-?\d+\.\d+)\s+(-?\d+\.\d+)/);
      if (rawMatch) {
        extracted = { lat: parseFloat(rawMatch[1]), lng: parseFloat(rawMatch[2]) };
      }
    }

    let lat = t.payload_dados?.latitude || extracted?.lat || null;
    let lng = t.payload_dados?.longitude || extracted?.lng || null;
    
    if (!lat || !lng) {
      const BASE_COORDINATES = {
        'fagundes filho': [-23.6156, -46.6378],
        'cajati': [-23.4900, -46.7200],
        'vila medeiros': [-23.4886, -46.5867],
        'monte santo': [-23.5900, -46.5500],
        'aricanduva': [-23.5689, -46.5056],
        'catumbi': [-23.5356, -46.6200],
        'santo andré': [-23.6556, -46.5314],
        'soc leste 1': [-23.5700, -46.4500],
        'soc leste 2': [-23.5750, -46.4400],
        'sot sul 1': [-23.6800, -46.6900],
        'sot leste 1': [-23.5500, -46.4000],
        'sot norte 1': [-23.4500, -46.6000]
      };
      
      const rawBase = t.payload_dados?.base || 'Base Não Informada';
      const cleanBase = rawBase.replace(/^base\s+/i, '').trim().toLowerCase();
      const baseCoords = BASE_COORDINATES[cleanBase];
      
      if (baseCoords) {
        const hash = t.id ? t.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) : 42;
        const jitterLat = (hash % 100 - 50) * 0.00015;
        const jitterLng = ((hash >> 2) % 100 - 50) * 0.00015;
        lat = baseCoords[0] + jitterLat;
        lng = baseCoords[1] + jitterLng;
      }
    }

    let displayAddress = 'Sem endereço';
    const cleanAddr = t.payload_dados?.endereco_completo || t.payload_dados?.endereco || '';
    if (cleanAddr && typeof cleanAddr === 'string' && !cleanAddr.startsWith('http') && !cleanAddr.includes('maps/dir')) {
      displayAddress = cleanAddr;
    } else if (lat && lng) {
      displayAddress = `${lat.toFixed(10)} ${lng.toFixed(10)}`;
    }

    return {
      ...t,
      inspid: t.id_origem || t.id,
      osid: t.payload_dados?.osid || t.id_origem,
      start_time: t.start_time || t.payload_dados?.start_time || null,
      end_time: t.end_time || t.payload_dados?.end_time || null,
      fisc_started_at: t.fisc_started_at || t.payload_dados?.fisc_started_at || null,
      fisc_finished_at: t.fisc_finished_at || t.payload_dados?.fisc_finished_at || null,
      os_data: {
        ...t.payload_dados,
        base_contrato: t.payload_dados?.base || 'Base Não Informada',
        endereco_completo: displayAddress,
        latitude: lat,
        longitude: lng,
        start_time: t.start_time || t.payload_dados?.start_time || null,
        end_time: t.end_time || t.payload_dados?.end_time || null,
        fisc_started_at: t.fisc_started_at || t.payload_dados?.fisc_started_at || null,
        fisc_finished_at: t.fisc_finished_at || t.payload_dados?.fisc_finished_at || null
      }
    };
  };

  const fetchFieldAudits = async () => {
    try {
      const { data: wfmTasks } = await supabase.from('wfm_tarefas').select('*');
      const { data: fieldResults } = await supabase.from('autofiscalizacao_field_audits').select('*');
      const { data: wfs } = await supabase.from('autofiscalizacao_workflows').select('*').eq('field_audit_required', true).eq('is_finished', false);
      const { data: allOrdens } = await supabase.from('autofiscalizacao_ordens').select('*');
      
      const tasksToInsert = [];
      if (wfs && wfs.length > 0 && wfmTasks) {
        const missingWfs = wfs.filter(wf => !wfmTasks.some(t => t.id_origem === wf.inspid));
        
        for (const wf of missingWfs) {
          let os = allOrdens?.find(o => o.nr_ordem === wf.osid);
          if (!os) {
            const { data } = await supabase.from('autofiscalizacao_ordens').select('*').eq('nr_ordem', wf.osid).maybeSingle();
            os = data || {};
          }
          
          tasksToInsert.push({
            modulo_origem: 'AUTOFISCALIZACAO',
            id_origem: wf.inspid,
            categoria: 'AutoFiscalização - Campo',
            payload_dados: {
              ...os,
              osid: wf.osid,
              titulo: `OS ${wf.osid} - Fiscalização de Campo`,
              endereco: os.endereco_completo || os.endereco_cliente || 'Endereço Não Informado',
              latitude: os.latitude || os.lat_os || null,
              longitude: os.longitude || os.lng_os || null,
              base: os.base_contrato || os.base || 'Base Não Informada',
              regional: wf.regional || ''
            },
            status: 'pendente',
            auditor: '',
            historico: [{ timestamp: new Date().toISOString(), usuario: 'Sistema', acao: 'WFM_RECEBIDO', observacao: 'Tarefa importada automaticamente do Workflow' }]
          });
        }
      }
      
      if (tasksToInsert.length > 0) {
        await supabase.from('wfm_tarefas').insert(tasksToInsert);
      }

      const { data: finalTasks } = await supabase.from('wfm_tarefas').select('*');
      const results = fieldResults || [];
      const baseTasks = finalTasks || wfmTasks || [];

      const merged = baseTasks.map(t => {
        const result = results.find(r => r.inspid === t.id_origem || r.inspid === t.id);
        const ord = allOrdens?.find(o => o.nr_ordem === (t.payload_dados?.osid || t.id_origem));
        return {
          ...t,
          inspid: t.id_origem || t.id,
          osid: t.payload_dados?.osid || t.id_origem,
          start_time: result?.start_time || t.payload_dados?.start_time || t.start_time || ord?.fisc_started_at || null,
          end_time: result?.end_time || t.payload_dados?.end_time || t.end_time || ord?.fisc_finished_at || null,
          fisc_started_at: ord?.fisc_started_at || t.payload_dados?.fisc_started_at || result?.start_time || null,
          fisc_finished_at: ord?.fisc_finished_at || t.payload_dados?.fisc_finished_at || result?.end_time || null,
          executed: result?.executed || null,
          access: result?.access || null,
          address: result?.address || null,
          photos: result?.photos || null,
          telemetry: result?.telemetry || null,
          suspend_reason: result?.suspend_reason || '',
          historico: [
            ...(Array.isArray(t.historico) ? t.historico : []),
            ...(Array.isArray(result?.historico) ? result.historico.filter(rh => !(t.historico || []).some(th => (th.id && th.id === rh.id) || (th.timestamp && th.timestamp === rh.timestamp))) : [])
          ]
        };
      });

      results.forEach(r => {
        if (!merged.some(m => m.inspid === r.inspid || m.id_origem === r.inspid)) {
          const ord = allOrdens?.find(o => o.nr_ordem === r.osid || o.nr_ordem === r.inspid);
          merged.push({
            id: r.inspid,
            id_origem: r.inspid,
            inspid: r.inspid,
            osid: r.osid || r.inspid,
            status: r.status,
            auditor: r.auditor,
            start_time: r.start_time || ord?.fisc_started_at,
            end_time: r.end_time || ord?.fisc_finished_at,
            fisc_started_at: ord?.fisc_started_at || r.start_time,
            fisc_finished_at: ord?.fisc_finished_at || r.end_time,
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

      setFieldAudits(merged.map(transformTask));
    } catch (err) {
      console.error("Error in fetchFieldAudits:", err);
    }
  };

  const fetchColaboradores = async () => {
    const { data } = await supabase.from('usuarios').select('*');
    if (data) setColaboradoresList(data);
  };

  const fetchAtividadesExtras = async () => {
    const { data } = await supabase.from('autofiscalizacao_atividades_extras').select('*');
    if (data) setAtividadesExtras(data);
  };

  const getLocalDateString = (d) => {
    if (!d) return '';
    const tzOffset = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - tzOffset).toISOString().split('T')[0];
  };

  const fetchShifts = async () => {
    const dateStr = getLocalDateString(selectedDateRef.current);
    const { data } = await supabase.from('autofiscalizacao_shifts').select('*').eq('date', dateStr);
    if (data) setShifts(data);
  };

  const fetchEscalas = async () => {
    const dateStr = getLocalDateString(selectedDateRef.current);
    const { data } = await supabase.from('wfm_calendario_escalas').select('*').eq('date', dateStr);
    if (data) setEscalas(data);
  };

  const fetchAll = async () => {
    setLoading(true);
    await Promise.all([
      fetchOrdens(),
      fetchInspecoes(),
      fetchWorkflows(),
      fetchFieldAudits(),
      fetchColaboradores(),
      fetchAtividadesExtras(),
      fetchShifts(),
      fetchEscalas()
    ]);
    setLoading(false);
  };

  const filteredOrdens = useMemo(() => {
    if (!activeRegional || activeRegional === 'Todas') return ordens;
    return ordens.filter(o => o.regional === activeRegional);
  }, [ordens, activeRegional]);

  const filteredWorkflows = useMemo(() => {
    if (!activeRegional || activeRegional === 'Todas') return workflows;
    return workflows.filter(w => w.regional === activeRegional);
  }, [workflows, activeRegional]);

  const addLog = (hist = [], usuario, acao, observacao = '') => {
    const timestamp = new Date().toISOString();
    return [...hist, { timestamp, usuario, acao, observacao }];
  };

  const handleAssignAudit = async (fa, auditorLogin, assignedDate, plannedStartISO) => {
    let acao = auditorLogin ? 'WFM_ALOCACAO' : 'WFM_DESALOCACAO';
    let logMsg = auditorLogin ? `OS programada para auditor ${auditorLogin} no dia ${assignedDate} às ${new Date(plannedStartISO).toLocaleTimeString('pt-BR')}` : 'OS desalocada do WFM e retornada para o Bucket';

    if (auditorLogin && !plannedStartISO) {
      acao = 'WFM_NAO_PROG';
      logMsg = `OS alocada na fila de NÃO PROGRAMADOS do auditor ${auditorLogin}`;
    }

    const hist = addLog(fa.historico, currentUser?.nome || currentUser?.login, acao, logMsg);
    const updated = {
      ...fa,
      auditor: auditorLogin,
      assigned_date: assignedDate,
      planned_start: plannedStartISO,
      status: 'pending',
      historico: hist
    };

    const targetId = updated.id || fa.id;
    const targetOsNumber = updated.osid || updated.os_numero || updated.payload_dados?.osid || fa.osid || fa.nr_ordem || fa.payload_dados?.osid;

    let updateQuery = null;
    if (targetId) {
      updateQuery = supabase.from('wfm_tarefas').update({
        auditor: updated.auditor,
        assigned_date: updated.assigned_date,
        planned_start: updated.planned_start,
        status: updated.status,
        historico: updated.historico
      }).eq('id', targetId);
    } else if (targetOsNumber) {
      updateQuery = supabase.from('wfm_tarefas').update({
        auditor: updated.auditor,
        assigned_date: updated.assigned_date,
        planned_start: updated.planned_start,
        status: updated.status,
        historico: updated.historico
      }).or(buildCleanOrFilter(fa, targetOsNumber));
    }

    const { error } = updateQuery ? await updateQuery : { error: null };

    if (!error) {
      const inspid = fa.id_origem;
      if (inspid) {
        try {
          const { data: wf } = await supabase.from('autofiscalizacao_workflows').select('*').eq('inspid', inspid).maybeSingle();
          if (wf) {
            const wfLogEntry = {
              id: Date.now(),
              acao: acao,
              data: new Date().toISOString(),
              usuario: currentUser?.nome || currentUser?.login || 'Sistema',
              detalhes: `Ação no WFM: ${logMsg}`
            };
            const updatedWfHist = [...(wf.historico || []), wfLogEntry];
            await supabase.from('autofiscalizacao_workflows').update({
              historico: updatedWfHist
            }).eq('inspid', inspid);
          }
        } catch (err) {
          console.error("Erro ao sincronizar log com autofiscalizacao_workflows:", err);
        }
      }
      await fetchFieldAudits();
    }
  };

  const handleChangeTaskBase = async (task, newBase) => {
    const histEntry = {
      timestamp: new Date().toISOString(),
      usuario: currentUser?.nome || currentUser?.login || 'Sistema',
      acao: 'WFM_MUDAR_BASE',
      observacao: `Base da tarefa alterada para: ${newBase} (retornada para o Bucket)`
    };

    const hist = task.historico ? [...task.historico, histEntry] : [histEntry];

    const { error } = await supabase
      .from('wfm_tarefas')
      .update({
        auditor: '',
        assigned_date: null,
        planned_start: null,
        status: 'pending',
        payload_dados: {
          ...task.payload_dados,
          base: newBase
        },
        historico: hist
      })
      .eq('id', task.id);

    if (!error) await fetchFieldAudits();
  };

  if (loading) return (
    <div className="flex items-center justify-center h-full min-h-screen">
      <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
    </div>
  );

  return (
    <div className="animate-in fade-in duration-300 h-[calc(100vh-64px)] overflow-hidden">
      <WFMScreen 
        fieldAudits={fieldAudits} 
        ordens={filteredOrdens} 
        inspecoes={inspecoes} 
        workflows={filteredWorkflows}
        atividadesExtras={atividadesExtras}
        shifts={shifts}
        escalas={escalas}
        onRefreshEscalas={fetchEscalas}
        selectedDate={selectedDate}
        setSelectedDate={setSelectedDate}
        currentUser={currentUser} 
        activeRegional={activeRegional} 
        onAssignAudit={handleAssignAudit} 
        onChangeTaskBase={handleChangeTaskBase} 
        onViewDetails={(taskOsData) => {
          const osId = taskOsData?.osid || taskOsData?.nr_ordem;
          const fullOs = ordens.find(o => o.nr_ordem === osId);
          if (fullOs) {
            setViewingOSDetails(fullOs);
          } else {
            setViewingOSDetails({
              ...taskOsData,
              nr_ordem: osId,
              base: taskOsData.base || taskOsData.base_contrato,
              endereco_completo: taskOsData.endereco_completo || taskOsData.endereco
            });
          }
        }}
        onRefreshAtividades={fetchAtividadesExtras}
      />

      {editingTask && (
        <ModalEditarOS
          os={editingTask}
          auditors={colaboradoresList}
          onClose={() => setEditingTask(null)}
          onSaveSuccess={() => {
            setEditingTask(null);
            fetchAll();
          }}
        />
      )}
      {viewingOSDetails && (
        <ModalDetalhesOS
          os={viewingOSDetails}
          onClose={() => setViewingOSDetails(null)}
          ordens={ordens}
          inspecoes={inspecoes}
          workflows={workflows}
          fieldAudits={fieldAudits}
          auditors={(colaboradoresList || []).filter(c => {
            const p = String(c.cargo || c.perfil || '').toLowerCase();
            return p.includes('auditor') || p.includes('inspetor');
          })}
          onEditOS={(osToEdit) => {
            setViewingOSDetails(null);
            setEditingTask(osToEdit);
          }}
          onAssignAudit={handleAssignAudit}
        />
      )}
    </div>
  );
}
