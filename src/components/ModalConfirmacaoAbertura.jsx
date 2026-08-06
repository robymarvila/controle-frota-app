import React, { useState } from 'react';
import { 
  CheckCircle2, Copy, Check, Sparkles, Clock, AlertTriangle, 
  Camera, Truck, Wrench, ShieldCheck, ArrowRight, X, Info, FileText
} from 'lucide-react';

export default function ModalConfirmacaoAbertura({ chamado, onClose }) {
  const [copiedSol, setCopiedSol] = useState(false);
  const [copiedAlp, setCopiedAlp] = useState(false);

  if (!chamado) return null;

  // Extração dos códigos SOL e ALP
  const numeroSol = chamado.numero || (chamado.defeitos && chamado.defeitos[0]?.numeroSolicitacao) || 'N/A';
  const codigoAlp = chamado.codigoChamado || (`ALP.M-${String(chamado.id).slice(-6)}`);

  // Verificação de fotos anexadas (gerais ou por defeito)
  const temFotos = (
    (chamado.fotosChamado && chamado.fotosChamado.length > 0) ||
    (chamado.fotosGerais && chamado.fotosGerais.length > 0) ||
    (chamado.dadosWorkflow?.fotosChamado && chamado.dadosWorkflow.fotosChamado.length > 0) ||
    (chamado.defeitos && chamado.defeitos.some(d => (d.fotos && d.fotos.length > 0) || d.fotoUrl || d.foto))
  );

  const copyToClipboard = (text, type) => {
    if (!text || text === 'N/A') return;
    navigator.clipboard.writeText(text);
    if (type === 'SOL') {
      setCopiedSol(true);
      setTimeout(() => setCopiedSol(false), 2000);
    } else {
      setCopiedAlp(true);
      setTimeout(() => setCopiedAlp(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 sm:p-6 md:p-8 bg-slate-955/80 backdrop-blur-2xl animate-in fade-in duration-300">
      {/* Liquid Glass Modal Box */}
      <div className="relative w-full max-w-2xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-3xl rounded-[2.5rem] shadow-[0_25px_90px_rgba(0,0,0,0.45)] border border-white/60 dark:border-slate-800 flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
        
        {/* Ambient Top Glows */}
        <div className="absolute -top-24 -left-24 w-80 h-80 bg-gradient-to-br from-emerald-500/25 via-teal-500/15 to-transparent rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-80 h-80 bg-gradient-to-tl from-indigo-500/25 via-purple-500/15 to-transparent rounded-full blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="relative z-10 p-6 sm:p-8 border-b border-slate-200/60 dark:border-slate-800 flex items-center justify-between gap-4 bg-emerald-500/5 dark:bg-emerald-500/10 backdrop-blur-md">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-white flex items-center justify-center shadow-lg shadow-emerald-500/30 shrink-0 animate-bounce">
              <CheckCircle2 size={32} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="px-3 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                  <Sparkles size={11} className="animate-pulse" /> Chamado Registrado
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                  {chamado.placa ? `Veículo: ${chamado.placa}` : 'Novo Registro'}
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                Chamado Aberto com Sucesso!
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2.5 hover:bg-slate-200/60 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-full transition-all shrink-0"
            title="Fechar"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="relative z-10 p-6 sm:p-8 space-y-6 overflow-y-auto max-h-[75vh]">
          
          {/* Main Status Information Banner */}
          <div className="p-5 rounded-3xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-indigo-500/10 border border-emerald-500/25 dark:border-emerald-500/30 backdrop-blur-md flex items-start gap-4 shadow-sm">
            <div className="p-3 bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-2xl shrink-0 mt-0.5">
              <Clock size={24} className="animate-spin-slow" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                Seu chamado está em Análise pela Frota, Agora só Aguardar!
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-medium mt-1 leading-relaxed">
                A equipe de gestão da frota já recebeu a notificação em tempo real. O veículo deu entrada na etapa inicial de triagem.
              </p>
            </div>
          </div>

          {/* Ticket Codes Cards - Material 3 Expressive Style */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* SOL Number Card */}
            <div className="p-5 rounded-3xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 shadow-md hover:shadow-lg transition-all group relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-teal-500/5 rounded-full blur-xl group-hover:bg-teal-500/10 transition-all pointer-events-none" />
              
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-400 flex items-center gap-1.5">
                  <FileText size={14} className="text-teal-500" /> Número SOL (E-CAR)
                </span>
                <button
                  onClick={() => copyToClipboard(numeroSol, 'SOL')}
                  className="px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-teal-500/10 dark:hover:bg-teal-500/20 text-slate-600 dark:text-slate-300 hover:text-teal-600 dark:hover:text-teal-400 text-[11px] font-bold transition-all flex items-center gap-1"
                  title="Copiar Número SOL"
                >
                  {copiedSol ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
                  <span>{copiedSol ? 'Copiado!' : 'Copiar'}</span>
                </button>
              </div>

              <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight font-mono">
                {numeroSol}
              </div>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium mt-1">
                Identificador da solicitação E-CAR
              </p>
            </div>

            {/* ALP Code Card */}
            <div className="p-5 rounded-3xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 shadow-md hover:shadow-lg transition-all group relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-xl group-hover:bg-indigo-500/10 transition-all pointer-events-none" />
              
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-400 flex items-center gap-1.5">
                  <Wrench size={14} className="text-indigo-500" /> Código Interno ALP
                </span>
                <button
                  onClick={() => copyToClipboard(codigoAlp, 'ALP')}
                  className="px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-indigo-500/10 dark:hover:bg-indigo-500/20 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 text-[11px] font-bold transition-all flex items-center gap-1"
                  title="Copiar Código ALP"
                >
                  {copiedAlp ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
                  <span>{copiedAlp ? 'Copiado!' : 'Copiar'}</span>
                </button>
              </div>

              <div className="text-xl sm:text-2xl font-black text-indigo-600 dark:text-indigo-400 tracking-tight font-mono">
                {codigoAlp}
              </div>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium mt-1">
                Código de rastreamento operacional no sistema
              </p>
            </div>
          </div>

          {/* Photo Warning Banner (if no photo was attached) */}
          {!temFotos && (
            <div className="p-5 rounded-3xl bg-amber-500/10 border border-amber-500/30 dark:bg-amber-950/20 dark:border-amber-800/40 backdrop-blur-md flex items-start gap-4">
              <div className="p-3 bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded-2xl shrink-0 mt-0.5">
                <Camera size={24} className="animate-pulse" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-700 dark:text-amber-300">
                    Aviso Importante
                  </span>
                  <h4 className="text-sm font-black text-amber-950 dark:text-amber-200">
                    Fotos Não Anexadas
                  </h4>
                </div>
                <p className="text-xs text-amber-900/80 dark:text-amber-300/90 font-medium leading-relaxed">
                  As fotos do defeito/veículo <strong className="font-black text-amber-950 dark:text-amber-100">não são obrigatórias no momento</strong> para abertura do chamado, mas prepare-se pois em breve passarão a ser item obrigatório em todos os preenchimentos.
                </p>
              </div>
            </div>
          )}

          {/* Quick Ticket Summary Info */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between gap-4 text-xs">
            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300 font-medium">
              <Truck size={16} className="text-slate-400" />
              <span>Placa: <strong className="font-bold text-slate-900 dark:text-white">{chamado.placa || 'N/A'}</strong></span>
            </div>
            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300 font-medium">
              <ShieldCheck size={16} className="text-emerald-500" />
              <span>Etapa: <strong className="font-bold text-emerald-600 dark:text-emerald-400">Análise Frota</strong></span>
            </div>
          </div>

        </div>

        {/* Modal Footer - Confirmation Action Button */}
        <div className="relative z-10 p-6 border-t border-slate-200/60 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 backdrop-blur-md flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-xl shadow-emerald-500/25 active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <CheckCircle2 size={18} /> Confirmar Ciência e Acompanhar Chamado
          </button>
        </div>

      </div>
    </div>
  );
}
