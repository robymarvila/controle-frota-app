import React, { useState, useEffect } from 'react';
import { CalendarCheck, Calendar, ListChecks, Plus } from 'lucide-react';
import { supabase } from '../../supabaseClient';
import CalendarioGrid from './CalendarioGrid';
import PainelExecucao from './PainelExecucao';
import ModalProgramador from './ModalProgramador';
import RelatorioAuditoria from './RelatorioAuditoria';
import ModalConflitoAgenda from './ModalConflitoAgenda';

const catConfig = {
    'DDS': { badge: 'bg-sky-50 text-sky-700 border-sky-300', duration: '5 min' },
    'Momento ENEL': { badge: 'bg-emerald-50 text-emerald-700 border-emerald-300', duration: '20 min' },
    'Parada de Segurança': { badge: 'bg-rose-50 text-rose-700 border-rose-300', duration: '30 min' },
    'Repasse': { badge: 'bg-amber-50 text-amber-700 border-amber-300', duration: '30 min' }
};

const shiftTimes = { 
  'manha': ['06:00', '08:00', '10:00'], 
  'tarde': ['12:00', '14:00'], 
  'noite': ['20:00', '22:00'] 
};

export default function CalendarioOperacionalView({ currentUser, activeRegional }) {
  const [activeTab, setActiveTab] = useState('calendar'); // 'calendar' | 'report'
  const [currentDate, setCurrentDate] = useState(new Date());
  
  const [activities, setActivities] = useState([]);
  const [presencas, setPresencas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('mes'); // 'mes' ou 'semana'

  const [isProgModalOpen, setIsProgModalOpen] = useState(false);
  const [selectedDateForNew, setSelectedDateForNew] = useState(null);
  
  const [isDayPanelOpen, setIsDayPanelOpen] = useState(false);
  const [selectedDateStr, setSelectedDateStr] = useState('');

  // Estados do conflito
  const [conflitosParaResolver, setConflitosParaResolver] = useState([]);
  const [pendingFormData, setPendingFormData] = useState(null);

  const isAdminOrCoord = ['GERENTE', 'COORDENADOR', 'ADMINISTRADOR'].includes(currentUser?.perfil);

  const fetchData = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('calendario_atividades')
      .select('*')
      .order('data_programada', { ascending: false });
    
    if (!error && data) {
      setActivities(data);
    }

    const { data: presData, error: presError } = await supabase
      .from('calendario_presencas')
      .select('*');
    
    if (!presError && presData) {
      setPresencas(presData);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchData();

    const channel = supabase
      .channel('realtime-calendario')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'calendario_atividades' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setActivities(prev => {
              if (prev.some(a => a.id === payload.new.id)) return prev;
              return [payload.new, ...prev];
            });
          } else if (payload.eventType === 'UPDATE') {
            setActivities(prev => prev.map(a => a.id === payload.new.id ? { ...a, ...payload.new } : a));
          } else if (payload.eventType === 'DELETE') {
            setActivities(prev => prev.filter(a => a.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    const presChannel = supabase
      .channel('realtime-presencas')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'calendario_presencas' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setPresencas(prev => {
              if (prev.some(p => p.id === payload.new.id)) return prev;
              return [...prev, payload.new];
            });
          } else if (payload.eventType === 'UPDATE') {
            setPresencas(prev => prev.map(p => p.id === payload.new.id ? { ...p, ...payload.new } : p));
          } else if (payload.eventType === 'DELETE') {
            setPresencas(prev => prev.filter(p => p.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(presChannel);
    };
  }, []);

  const registrarLog = async (atividade_id, acao, detalhes) => {
    await supabase.from('calendario_logs').insert([{
      atividade_id,
      usuario_id: currentUser?.id,
      nome_usuario: currentUser?.nome,
      acao,
      detalhes
    }]);
  };

  const handleSaveProgramacao = async (formData) => {
    const { dates, shifts } = formData;
    
    // Varredura de conflitos
    const conflitos = activities.filter(a => dates.includes(a.data_programada) && shifts.includes(a.turno));
    
    if (conflitos.length > 0) {
        setConflitosParaResolver(conflitos);
        setPendingFormData(formData);
        return; // Interrompe para abrir o modal
    }

    await commitProgramacao(formData, false);
  };

  const commitProgramacao = async ({ dates, shifts, regiao, tipo, assunto, obs, file }, replaceConflict) => {
    if (replaceConflict && conflitosParaResolver.length > 0) {
        // Deleta todos os conflitantes no banco
        const idsToDelete = conflitosParaResolver.map(c => c.id);
        await supabase.from('calendario_atividades').delete().in('id', idsToDelete);
        for (const c of conflitosParaResolver) {
            await registrarLog(c.id, 'EXCLUIU_POR_SUBSTITUICAO', { motivo: 'Substituição em Lote' });
        }
    }

    setConflitosParaResolver([]);
    setPendingFormData(null);

    let anexo_url = null;
    let anexo_nome = null;

    if (file) {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const { data, error } = await supabase.storage.from('evidencias_calendario').upload(`apoio/${fileName}`, file);
      if (!error) {
        const { data: { publicUrl } } = supabase.storage.from('evidencias_calendario').getPublicUrl(`apoio/${fileName}`);
        anexo_url = publicUrl;
        anexo_nome = file.name;
      }
    }

    const registros = [];
    dates.forEach(d => {
      shifts.forEach(sh => {
        shiftTimes[sh].forEach(time => {
          registros.push({
            data_programada: d,
            horario_programado: time,
            turno: sh,
            regiao: regiao.toUpperCase(),
            tipo,
            assunto,
            observacao: obs,
            status: 'PENDENTE',
            anexo_programacao_url: anexo_url,
            anexo_nome: anexo_nome,
            criado_por: currentUser?.id
          });
        });
      });
    });

    const { data: insertData, error: insertError } = await supabase
      .from('calendario_atividades')
      .insert(registros)
      .select();

    if (!insertError && insertData) {
      for (const t of insertData) {
        await registrarLog(t.id, 'PROGRAMOU', { turno: t.turno, horario: t.horario_programado });
      }
      alert("Planejamento inserido com sucesso!");
      fetchData();
      setIsProgModalOpen(false);
    } else {
      alert("Erro ao salvar programação.");
    }
  };

  const handleDeleteActivity = async (id) => {
    if (!window.confirm("Deseja realmente remover esta atividade do planejamento?")) return;
    
    // Log antes de deletar
    await registrarLog(id, 'EXCLUIU', { status_anterior: 'PENDENTE' });
    
    const { error } = await supabase.from('calendario_atividades').delete().eq('id', id);
    if (!error) {
      fetchData();
    }
  };

  const handleConcluirActivity = async (task, file, formExtra) => {
    let evidencia_url = null;
    let evidencia_nome = null;

    if (file) {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const { data, error } = await supabase.storage.from('evidencias_calendario').upload(`evidencias/${fileName}`, file);
      if (!error) {
        const { data: { publicUrl } } = supabase.storage.from('evidencias_calendario').getPublicUrl(`evidencias/${fileName}`);
        evidencia_url = publicUrl;
        evidencia_nome = file.name;
      } else {
        alert("Erro ao enviar evidência fotográfica.");
        return;
      }
    }

    const { error: updateError } = await supabase
      .from('calendario_atividades')
      .update({
        status: 'EXECUTADO',
        evidencia_url,
        evidencia_nome,
        executado_por: currentUser?.id,
        data_execucao: new Date().toISOString(),
        hora_inicio_execucao: formExtra?.horaInicio,
        hora_fim_execucao: formExtra?.horaFim,
        execucao_observacao: formExtra?.obs
      })
      .eq('id', task.id);

    if (!updateError) {
      await registrarLog(task.id, 'EXECUTOU', { evidencia_anexada: !!evidencia_url });
      fetchData();
    }
  };

  const handleOpenDayPanel = (dateStr) => {
    setSelectedDateStr(dateStr);
    setIsDayPanelOpen(true);
  };

  const handleOpenNewProgramacao = (dateStr) => {
    setIsDayPanelOpen(false);
    setSelectedDateForNew(dateStr);
    setIsProgModalOpen(true);
  };

  const filteredActivities = activities.filter(a => !activeRegional || activeRegional === 'Todas' || (a.regiao && a.regiao.toUpperCase() === activeRegional.toUpperCase()));

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto w-full flex flex-col min-h-[80vh] animate-in fade-in duration-300">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm mb-6">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 p-2.5 rounded-lg text-blue-700">
              <CalendarCheck size={24} />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-800 tracking-tight">Calendário Operacional</h2>
              <p className="text-sm text-slate-500 font-medium mt-0.5">Visão unificada das atividades e check-ups de campo</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="flex bg-slate-100 p-1 rounded-lg">
              <button onClick={() => setViewMode('mes')} className={`px-4 py-1.5 text-xs font-bold rounded-md transition ${viewMode === 'mes' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Mês</button>
              <button onClick={() => setViewMode('semana')} className={`px-4 py-1.5 text-xs font-bold rounded-md transition ${viewMode === 'semana' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Semana</button>
            </div>
            <div className="bg-slate-100 p-1 rounded-xl border border-slate-200 flex">
                  <button onClick={() => setActiveTab('calendar')} className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${activeTab === 'calendar' ? 'bg-white text-blue-950 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}>
                      <Calendar size={14} /> Calendário
                  </button>
                  <button onClick={() => setActiveTab('report')} className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${activeTab === 'report' ? 'bg-white text-blue-950 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}>
                      <ListChecks size={14} /> Lista & Relatório
                  </button>
            </div>
            {isAdminOrCoord && (
              <button onClick={() => setIsProgModalOpen(true)} className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-blue-700 hover:bg-blue-800 text-white px-5 py-2.5 rounded-lg text-sm font-bold shadow-md shadow-blue-900/20 transition transform hover:-translate-y-0.5">
                <Plus size={18} /> Nova Programação
              </button>
            )}
          </div>
      </header>

      {activeTab === 'calendar' && (
        <CalendarioGrid 
          currentDate={currentDate} 
          setCurrentDate={setCurrentDate} 
          activities={filteredActivities}
          onDayClick={handleOpenDayPanel}
          catConfig={catConfig}
          viewMode={viewMode}
        />
      )}

      {activeTab === 'report' && (
        <RelatorioAuditoria 
          activities={filteredActivities} 
          catConfig={catConfig} 
          isAdminOrCoord={isAdminOrCoord}
          onDelete={handleDeleteActivity}
          presencas={presencas}
        />
      )}

      <PainelExecucao 
        isOpen={isDayPanelOpen}
        onClose={() => setIsDayPanelOpen(false)}
        selectedDateStr={selectedDateStr}
        activities={filteredActivities}
        catConfig={catConfig}
        isAdminOrCoord={isAdminOrCoord}
        onDelete={handleDeleteActivity}
        onConcluir={handleConcluirActivity}
        onNewProgramacao={() => handleOpenNewProgramacao(selectedDateStr)}
        onRegistrarLog={registrarLog}
      />

      <ModalProgramador 
        isOpen={isProgModalOpen}
        onClose={() => { setIsProgModalOpen(false); setSelectedDateForNew(null); }}
        isAdminOrCoord={isAdminOrCoord}
        onSave={handleSaveProgramacao}
        preSelectedDate={selectedDateForNew}
      />

      <ModalConflitoAgenda 
        isOpen={conflitosParaResolver.length > 0}
        conflicts={conflitosParaResolver}
        newActivity={pendingFormData}
        onClose={() => { setConflitosParaResolver([]); setPendingFormData(null); }}
        onAddBoth={() => commitProgramacao(pendingFormData, false)}
        onReplace={() => commitProgramacao(pendingFormData, true)}
      />

    </div>
  );
}
