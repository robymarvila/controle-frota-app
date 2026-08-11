import React, { useState, useEffect } from 'react';
import { X, Clock, Navigation, MapPin, CheckCircle2, Zap, FileText, Download, List, AlertTriangle, RotateCcw } from 'lucide-react';
import { supabase } from '../supabaseClient';

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

const fmtDateBR = (dStr) => {
  if (!dStr) return '--';
  return new Date(dStr + 'T12:00:00').toLocaleDateString('pt-BR');
};

const fmtTime = (dStr) => {
  if (!dStr) return '--:--';
  return new Date(dStr).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
};

const fmtDateTimeBR = (dStr) => {
  if (!dStr) return '--';
  return new Date(dStr).toLocaleString('pt-BR');
};

export default function ModalDetalhesOS({ os, onClose, ordens = [], inspecoes = [], workflows = [], fieldAudits = [], auditors = [], onAssignAudit }) {
  if (!os) return null;

  const [selectedAuditor, setSelectedAuditor] = React.useState(os?.auditor || '');
  const [isAssigning, setIsAssigning] = React.useState(false);
  const [liveLogs, setLiveLogs] = useState([]);

  // Resolve properties with cross-table hydration
  const isWfmTask = !!os.payload_dados;
  const rawDataPayload = isWfmTask ? os.payload_dados : os;
  const osId = rawDataPayload.osid || rawDataPayload.nr_ordem || os.id_origem || os.osid || '--';

  useEffect(() => {
    if (!osId || osId === '--') return;
    const fetchLiveHistory = async () => {
      try {
        const logs = [];

        // 1. Fetch from wfm_tarefas
        const cleanOr = buildCleanOrFilter(os, osId);
        if (cleanOr) {
          const { data: wfmTasks } = await supabase
            .from('wfm_tarefas')
            .select('historico')
            .or(cleanOr);

          if (wfmTasks) {
            wfmTasks.forEach(t => {
              if (Array.isArray(t.historico)) logs.push(...t.historico);
            });
          }
        }

        // 2. Fetch from autofiscalizacao_workflows
        const { data: wfTasks } = await supabase
          .from('autofiscalizacao_workflows')
          .select('historico')
          .eq('osid', osId);

        if (wfTasks) {
          wfTasks.forEach(w => {
            if (Array.isArray(w.historico)) logs.push(...w.historico);
          });
        }

        // 3. Fetch from autofiscalizacao_inspecoes
        const { data: inspTasks } = await supabase
          .from('autofiscalizacao_inspecoes')
          .select('historico')
          .eq('osid', osId);

        if (inspTasks) {
          inspTasks.forEach(i => {
            if (Array.isArray(i.historico)) logs.push(...i.historico);
          });
        }

        setLiveLogs(logs);
      } catch (e) {
        console.warn('Erro ao buscar historico em tempo real:', e);
      }
    };
    fetchLiveHistory();
  }, [osId, os.id]);

  // Cross-reference matched objects across loaded datasets
  const matchedOrdem = ordens.find(o => o.nr_ordem === osId || o.osid === osId) || {};
  const matchedInsp = inspecoes.find(i => i.osid === osId || i.inspid === os.inspid || i.inspid === os.id_origem) || {};
  const matchedWf = workflows.find(w => w.osid === osId || w.inspid === os.inspid || w.inspid === os.id_origem) || {};
  const matchedFa = fieldAudits.find(f => f.inspid === os.inspid || f.inspid === os.id_origem || f.id_origem === osId) || {};

  const categoria = os.categoria || rawDataPayload.tipo_atividade || rawDataPayload.categoria || matchedOrdem.categoria || 'AutoFiscalização';
  const equipe = rawDataPayload.equipe || matchedOrdem.equipe || matchedInsp.equipe || '--';
  const base = rawDataPayload.base_contrato || rawDataPayload.base || matchedOrdem.base_contrato || matchedOrdem.base || matchedInsp.base || '--';
  const periodo = rawDataPayload.periodo || matchedOrdem.periodo || matchedInsp.periodo || '--';
  const atuacao = rawDataPayload.atuacao || rawDataPayload.tipo_atuacao || matchedOrdem.atuacao || matchedInsp.atuacao || '--';
  const tipoVeiculo = rawDataPayload.tipo_veiculo || rawDataPayload.veiculo || matchedOrdem.tipo_veiculo || matchedInsp.tipo_veiculo || '--';
  const tipoEquipe = rawDataPayload.tipo_equipe || matchedOrdem.tipo_equipe || matchedInsp.tipo_equipe || '--';
  const classe = rawDataPayload.classe || rawDataPayload.desc_classe || matchedOrdem.classe || matchedInsp.classe || '--';
  const causa = rawDataPayload.descricao_causa || rawDataPayload.causa || matchedOrdem.descricao_causa || matchedInsp.causa || '--';
  const endereco = rawDataPayload.endereco_completo || rawDataPayload.endereco_cliente || rawDataPayload.endereco || matchedOrdem.endereco_completo || matchedOrdem.endereco_cliente || 'Sem endereço';
  const qtdAnexos = rawDataPayload.qtd_anexos !== undefined ? rawDataPayload.qtd_anexos : (matchedOrdem.qtd_anexos !== undefined ? matchedOrdem.qtd_anexos : '--');
  const supervisor = rawDataPayload.supervisor || matchedOrdem.supervisor || matchedInsp.supervisor || '--';

  // Times
  const despachada = rawDataPayload.despachada || matchedOrdem.despachada || matchedInsp.despachada || '';
  const aCaminho = rawDataPayload.a_caminho || matchedOrdem.a_caminho || matchedInsp.a_caminho || '';
  const noLocal = rawDataPayload.no_local || matchedOrdem.no_local || matchedInsp.no_local || '';
  const liberada = rawDataPayload.liberada || matchedOrdem.liberada || matchedInsp.liberada || '';
  const minutos = rawDataPayload.minutos || matchedOrdem.minutos || matchedInsp.minutos || '--';

  // Auditor results
  const auditorName = os.auditor || matchedFa.auditor || matchedWf.auditor || '';
  const respostas = rawDataPayload.respostas || rawDataPayload.respostas_campo || os.payload_dados?.respostas || matchedFa.payload_dados?.respostas || matchedFa.answers || (os.respostas && typeof os.respostas === 'object' ? os.respostas : null);
  const status = os.status || matchedFa.status || matchedWf.status || matchedOrdem.status_fisc || 'pendente';
  // Photos collection: combine audit photos, general ticket photos, and defect-specific photos
  const fotosGeraisObj = os.dadosWorkflow?.fotosChamado || os.fotosChamado || {};
  const fotosGeraisList = Object.entries(fotosGeraisObj)
    .filter(([_, url]) => !!url)
    .map(([key, url]) => {
      const labels = {
        fotoVeiculo: 'Veículo (Fachada)',
        fotoHodometro: 'Hodômetro (KM)',
        fotoAdicional: 'Foto Adicional'
      };
      return { label: labels[key] || 'Foto Geral', url };
    });

  const fotosDefeitosList = (os.defeitos || [])
    .filter(d => !!d.fotoDefeito)
    .map((d, idx) => ({
      label: `Foto Defeito #${idx + 1} (${d.categoria || 'Geral'})`,
      url: d.fotoDefeito
    }));

  const fotosAuditoriaList = (rawDataPayload.fotos_auditoria || (matchedFa.photos ? Object.values(matchedFa.photos) : []))
    .map((url, idx) => (typeof url === 'string' ? { label: `Evidência Campo ${idx + 1}`, url } : url));

  const fotos = [...fotosGeraisList, ...fotosDefeitosList, ...fotosAuditoriaList];

  // Logs
  const allLogs = [];
  if (os.historico) allLogs.push(...os.historico);
  if (matchedInsp.historico) allLogs.push(...matchedInsp.historico);
  if (matchedWf.historico) allLogs.push(...matchedWf.historico);
  if (matchedFa.historico) allLogs.push(...matchedFa.historico);

  const uniqueLogs = Array.from(new Map(allLogs.map(l => [l.id || l.data || l.timestamp, l])).values())
    .sort((a, b) => new Date(a.data || a.timestamp).getTime() - new Date(b.data || b.timestamp).getTime());

  // Function to download PDF of this audit
  const handleDownloadPDF = () => {
    const tempDiv = document.createElement('div');
    tempDiv.className = "p-8 font-sans bg-white text-slate-800 space-y-6 max-w-4xl mx-auto";
    tempDiv.innerHTML = `
      <div class="flex items-center justify-between border-b-2 border-slate-900 pb-4 mb-6">
        <div>
          <h1 class="text-2xl font-black text-slate-900 tracking-tight uppercase">WFM - Relatório de Auditoria</h1>
          <p class="text-xs font-black text-slate-400 mt-1 uppercase tracking-widest">Categoria: ${categoria}</p>
        </div>
        <div class="text-right">
          <p class="text-xs font-bold text-slate-500">Status: <span class="text-blue-600 font-black uppercase">${status}</span></p>
          <p class="text-[10px] text-slate-400 mt-0.5 font-medium">Exportado em: ${new Date().toLocaleString('pt-BR')}</p>
        </div>
      </div>

      <div class="grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-150">
        <div>
          <p class="text-[9px] font-black uppercase text-slate-400">Ordem de Serviço</p>
          <p class="font-black text-sm text-slate-800">${osId}</p>
        </div>
        <div>
          <p class="text-[9px] font-black uppercase text-slate-400">Equipe</p>
          <p class="font-black text-sm text-slate-800">${equipe}</p>
        </div>
        <div>
          <p class="text-[9px] font-black uppercase text-slate-400">Base</p>
          <p class="font-black text-sm text-slate-800">${base}</p>
        </div>
        <div>
          <p class="text-[9px] font-black uppercase text-slate-400">Auditor Responsável</p>
          <p class="font-black text-sm text-slate-800">${auditorName || 'Não Informado'}</p>
        </div>
      </div>

      <div class="space-y-3">
        <h3 class="text-xs font-black text-slate-900 uppercase tracking-wider border-b pb-1">Tempos de Operação</h3>
        <div class="grid grid-cols-4 gap-2 text-xs">
          <div><p class="text-[9px] text-slate-400 font-bold">Despachada</p><p class="font-black text-slate-700">${fmtTime(despachada)}</p></div>
          <div><p class="text-[9px] text-slate-400 font-bold">A Caminho</p><p class="font-black text-slate-700">${fmtTime(aCaminho)}</p></div>
          <div><p class="text-[9px] text-slate-400 font-bold">No Local</p><p class="font-black text-slate-700">${fmtTime(noLocal)}</p></div>
          <div><p class="text-[9px] text-slate-400 font-bold">Liberada</p><p class="font-black text-slate-700">${fmtTime(liberada)}</p></div>
        </div>
        <div class="mt-2 text-xs"><span class="text-slate-400 font-bold">Tempo Total de Atividade:</span> <span class="font-black text-emerald-600">${minutos} min</span></div>
      </div>

      <div class="space-y-3">
        <h3 class="text-xs font-black text-slate-900 uppercase tracking-wider border-b pb-1">Metadados da Atividade</h3>
        <div class="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
          <div><p class="text-[9px] text-slate-400 font-bold">Atuação</p><p class="font-bold text-slate-700">${atuacao}</p></div>
          <div><p class="text-[9px] text-slate-400 font-bold">Período</p><p class="font-bold text-slate-700">${periodo}</p></div>
          <div><p class="text-[9px] text-slate-400 font-bold">Tipo Veículo</p><p class="font-bold text-slate-700">${tipoVeiculo}</p></div>
          <div><p class="text-[9px] text-slate-400 font-bold">Tipo Equipe</p><p class="font-bold text-slate-700">${tipoEquipe}</p></div>
          <div><p class="text-[9px] text-slate-400 font-bold">Classe</p><p class="font-bold text-slate-700">${classe}</p></div>
          <div><p class="text-[9px] text-slate-400 font-bold">Causa</p><p class="font-bold text-slate-700">${causa}</p></div>
        </div>
        <div class="bg-slate-50 p-2.5 rounded-lg border border-slate-100 mt-2 text-xs">
          <p class="text-[9px] text-slate-400 font-bold uppercase">Endereço do Local</p>
          <p class="font-bold text-slate-700 mt-0.5">${endereco}</p>
        </div>
      </div>

      ${categoria === 'Fiscalização Indicadores' && dataPayload.indicadores ? `
        <div class="space-y-3">
          <h3 class="text-xs font-black text-slate-900 uppercase tracking-wider border-b pb-1">Indicadores Auditados</h3>
          <table class="w-full text-left text-xs border-collapse border border-slate-200">
            <thead>
              <tr class="bg-slate-50 border-b border-slate-200 text-slate-500 font-black uppercase">
                <th class="p-2.5">Indicador</th>
                <th class="p-2.5">Resultado</th>
              </tr>
            </thead>
            <tbody>
              ${dataPayload.indicadores.map(ind => `
                <tr class="border-b border-slate-100 hover:bg-slate-50/50">
                  <td class="p-2.5 font-bold text-slate-800">${ind.nome}</td>
                  <td class="p-2.5 font-black text-slate-700">${ind.resultado}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      ` : ''}

      ${respostas ? `
        <div class="space-y-3">
          <h3 class="text-xs font-black text-slate-900 uppercase tracking-wider border-b pb-1">Questionário e Coleta do Auditor</h3>
          <div class="space-y-2 bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs">
            ${Object.entries(respostas).map(([campo, resposta]) => `
              <div class="py-1">
                <p class="text-[10px] font-black text-slate-400 uppercase tracking-wide">${campo.replace(/_/g, ' ')}</p>
                <p class="font-bold text-slate-700 mt-0.5">${resposta || '--'}</p>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}

      ${fotos && fotos.length > 0 ? `
        <div class="space-y-4">
          <h3 class="text-xs font-black text-slate-900 uppercase tracking-wider border-b pb-1">Evidências Fotográficas (${fotos.length})</h3>
          <div class="grid grid-cols-2 gap-4">
            ${fotos.map((fUrl, idx) => `
              <div class="border border-slate-200 rounded-xl overflow-hidden shadow-sm bg-white p-2">
                <img src="${fUrl}" class="w-full h-48 object-cover rounded-lg" />
                <p class="text-[9px] text-center text-slate-400 font-bold mt-1.5 uppercase">Anexo ${idx + 1}</p>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}
    `;

    const opt = {
      margin:       10,
      filename:     `Relatorio_Auditoria_OS_${osId}.pdf`,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true },
      jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    const runPdf = () => {
      window.html2pdf().from(tempDiv).set(opt).save();
    };

    if (window.html2pdf) {
      runPdf();
    } else {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
      script.onload = runPdf;
      document.body.appendChild(script);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-[2rem] w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 bg-slate-800 text-white flex justify-between items-center shrink-0">
          <div>
            <h3 className="text-xl font-black flex items-center gap-2">
              <FileText size={20} className="text-blue-400"/>
              Detalhes do Atendimento — OS: {osId}
            </h3>
            <div className="flex gap-2 items-center mt-1">
              <span className={`px-2.5 py-0.5 text-[9px] font-black uppercase rounded-full ${status === 'completed' || status === 'concluido' ? 'bg-emerald-500/20 text-emerald-300' : status === 'started' || status === 'in_progress' ? 'bg-blue-500/20 text-blue-300' : 'bg-amber-500/20 text-amber-300'}`}>
                {status}
              </span>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">• Categoria: {categoria}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {auditorName && status !== 'completed' && status !== 'concluido' && (
              <button
                onClick={async () => {
                  if (confirm(`Deseja devolver a OS ${osId} para a Base de Origem (${base})?`)) {
                    const logMsg = `OS Devolvida Manualmente para a Base de Origem (${base})`;
                    await supabase.from('wfm_tarefas').update({
                      auditor: null,
                      assigned_date: null,
                      planned_start: null,
                      planned_end: null,
                      status: 'pending',
                      historico: [
                        ...(os.historico || []),
                        { acao: 'WFM_DESALOCACAO', usuario: 'Operador', timestamp: new Date().toISOString(), observacao: logMsg }
                      ]
                    }).or(buildCleanOrFilter(os, osId));

                    await supabase.from('autofiscalizacao_workflows').update({
                      auditor: null,
                      status: 'pendente'
                    }).eq('osid', osId);

                    alert(`OS ${osId} devolvida com sucesso para a ${base}!`);
                    onClose();
                    if (window.location) window.location.reload();
                  }
                }}
                className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white font-black text-[10px] rounded-xl uppercase tracking-wider shadow-sm flex items-center gap-1.5 active:scale-95 transition-all"
              >
                <RotateCcw size={14} /> Devolver para {base}
              </button>
            )}
            <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-full transition-colors text-white/70 hover:text-white"><X size={22} /></button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50">
          {/* Times Workflow Stepper */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm">
            <h4 className="font-black text-[10px] uppercase tracking-wider text-slate-400 mb-4">Linha do Tempo da Operação</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3 md:gap-2 items-center">
              {[
                { label: 'Despachada', time: fmtTime(despachada), icon: <Zap size={14} className="text-amber-500" /> },
                { label: 'A Caminho', time: fmtTime(aCaminho), icon: <Navigation size={14} className="text-blue-500" /> },
                { label: 'No Local', time: fmtTime(noLocal), icon: <MapPin size={14} className="text-rose-500" /> },
                { label: 'Liberada', time: fmtTime(liberada), icon: <CheckCircle2 size={14} className="text-emerald-500" /> }
              ].map((step, idx) => (
                <div key={idx} className="flex flex-col md:flex-row items-center w-full">
                  <div className="flex items-center gap-2.5 bg-slate-50/50 p-3 rounded-xl border border-slate-150 w-full md:w-auto md:flex-1 min-h-[52px]">
                    <div className="p-1.5 bg-white rounded-lg shrink-0 border border-slate-200/50">
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
              <div className="flex flex-row md:flex-col items-center justify-between md:justify-center bg-slate-800 text-white p-3 rounded-xl shadow-md w-full min-h-[52px]">
                <div className="text-left md:text-center">
                  <p className="text-[9px] text-slate-300 uppercase tracking-widest font-black">Duração</p>
                  <p className="text-sm font-black mt-0.5 leading-none">{minutos} min</p>
                </div>
                <div className="block md:hidden bg-white/20 p-1.5 rounded-lg">
                  <Clock size={16} />
                </div>
              </div>
            </div>
          </div>

          {/* OS Fields Grid */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm space-y-4">
            <h4 className="font-black text-slate-800 text-sm border-b pb-1 flex items-center gap-1.5">
              <List size={16} className="text-slate-400"/>
              Informações Gerais
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {[
                { label: 'OS', val: osId },
                { label: 'Equipe', val: equipe },
                { label: 'Base', val: base },
                { label: 'Período', val: periodo },
                { label: 'Atuação', val: atuacao },
                { label: 'Tipo Veículo', val: tipoVeiculo },
                { label: 'Tipo Equipe', val: tipoEquipe },
                { label: 'Classe', val: classe },
                { label: 'Causa', val: causa },
                { label: 'Qtd Anexos Requeridos', val: qtdAnexos },
                { label: 'Supervisor', val: supervisor },
              ].map((f, idx) => (
                <div key={idx} className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">{f.label}</p>
                  <p className="font-bold text-xs text-slate-700 mt-0.5 truncate" title={f.val}>{f.val || '--'}</p>
                </div>
              ))}
              <div className="col-span-2 sm:col-span-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
                <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">Endereço Completo</p>
                <p className="font-bold text-xs text-slate-700 mt-0.5 leading-snug">{endereco}</p>
              </div>
            </div>
          </div>

          {/* If Category is Indicators, render table of indicators */}
          {categoria === 'Fiscalização Indicadores' && dataPayload.indicadores && (
            <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm space-y-3">
              <h4 className="font-black text-purple-700 text-sm border-b pb-1">Resultados dos Indicadores</h4>
              <div className="overflow-hidden rounded-xl border border-slate-200">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-black uppercase tracking-wider">
                      <th className="p-3">Indicador</th>
                      <th className="p-3">Resultado Obtido</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {dataPayload.indicadores.map((ind, i) => (
                      <tr key={i} className="hover:bg-slate-50/50">
                        <td className="p-3 font-bold text-slate-700">{ind.nome}</td>
                        <td className="p-3 font-black text-slate-800">{ind.resultado}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Render Answers of Auditor if completed */}
          {respostas && typeof respostas === "object" && Object.keys(respostas).length > 0 && (
            <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm space-y-3">
              <h4 className="font-black text-emerald-700 text-sm border-b pb-1">Coletas de Campo do Auditor</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                {Object.entries(respostas).map(([campo, resposta]) => (
                  <div key={campo} className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">{campo.replace(/_/g, ' ')}</p>
                    <p className="font-bold text-xs text-slate-700 mt-0.5 leading-snug">{resposta || '--'}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Render uploaded Photos */}
          {fotos && fotos.length > 0 && (
            <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm space-y-3">
              <h4 className="font-black text-slate-800 text-sm border-b pb-1 flex items-center justify-between">
                <span>Evidências e Fotos Registradas</span>
                <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-100">{fotos.length} {fotos.length === 1 ? 'Foto' : 'Fotos'}</span>
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {fotos.map((item, i) => {
                  const url = typeof item === 'string' ? item : item.url;
                  const label = typeof item === 'string' ? `ANEXO ${i + 1}` : item.label;
                  return (
                    <div key={i} className="border border-slate-200 rounded-xl overflow-hidden shadow-sm bg-slate-50 p-2 flex flex-col items-center">
                      <a href={url} target="_blank" rel="noopener noreferrer" className="w-full h-44 block relative group">
                        <img src={url} alt={label} className="w-full h-full object-cover rounded-lg" />
                        <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center text-white text-xs font-black uppercase tracking-wider backdrop-blur-[1px]">
                          Ampliar Foto
                        </div>
                      </a>
                      <p className="text-[10px] text-center text-slate-600 font-black uppercase mt-2 truncate w-full px-1">{label}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Actions Log History */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm space-y-3">
            <h4 className="font-black text-slate-800 text-sm border-b pb-1">Histórico de Movimentações (WFM)</h4>
            <div className="space-y-3">
              {uniqueLogs.map((log, i) => (
                <div key={log.id || i} className="flex gap-3 p-3 bg-slate-50 border border-slate-100 rounded-2xl">
                  <div className="w-2.5 h-2.5 bg-blue-500 rounded-full mt-1.5 shrink-0 shadow-sm" />
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <p className="text-xs font-black text-slate-800">{log.acao}</p>
                      <span className="text-[9px] font-bold text-slate-400">{fmtDateTimeBR(log.data || log.timestamp)}</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">{log.detalhes || log.observacao}</p>
                    <p className="text-[9px] font-black uppercase text-slate-400 mt-1">Autor: {log.usuario}</p>
                  </div>
                </div>
              ))}
              {uniqueLogs.length === 0 && (
                <p className="text-xs text-slate-400 font-bold text-center py-4">Nenhuma movimentação registrada.</p>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-150 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 flex-wrap">
            {(status === 'completed' || status === 'concluido' || status === 'concluida') && (
              <button 
                onClick={handleDownloadPDF} 
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-md flex items-center gap-2 active:scale-95 transition-all"
              >
                <Download size={14} /> Gerar PDF do Relatório
              </button>
            )}

            {auditorName && status !== 'completed' && status !== 'concluido' && onAssignAudit && (
              <button 
                onClick={async () => {
                  if (confirm('Deseja realmente DESPROGRAMAR esta OS do auditor?')) {
                    setIsAssigning(true);
                    try {
                      await onAssignAudit(os, '', null, null);
                      alert('OS desprogramada e devolvida ao Bucket com sucesso!');
                    } catch(e) {
                      alert('Erro ao desprogramar: ' + e.message);
                    } finally {
                      setIsAssigning(false);
                      onClose();
                    }
                  }
                }}
                className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-black text-xs rounded-xl shadow-md flex items-center gap-2 active:scale-95 transition-all"
              >
                Desprogramar OS
              </button>
            )}

            {onAssignAudit && (
              <div className="flex items-center gap-2 bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
                <select
                  value={selectedAuditor}
                  onChange={(e) => setSelectedAuditor(e.target.value)}
                  className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="">-- Selecionar Auditor --</option>
                  {auditors.map((a, idx) => (
                    <option key={a.login || a.id || idx} value={a.login || a.nome}>
                      {a.nome || a.login}
                    </option>
                  ))}
                </select>
                <button
                  disabled={isAssigning}
                  onClick={async () => {
                    setIsAssigning(true);
                    try {
                      await onAssignAudit(os, selectedAuditor, null, null);
                      alert(selectedAuditor ? `OS alocada com sucesso para ${selectedAuditor}!` : 'OS desalocada!');
                    } catch (err) {
                      console.error(err);
                      alert('Erro ao alocar auditor: ' + err.message);
                    } finally {
                      setIsAssigning(false);
                    }
                  }}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-black text-xs uppercase tracking-wider rounded-lg transition-all shadow-sm"
                >
                  {isAssigning ? 'Alocando...' : 'Alocar ao Auditor'}
                </button>
              </div>
            )}
          </div>

          <button onClick={onClose} className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl shadow-md">Fechar</button>
        </div>
      </div>
    </div>
  );
}