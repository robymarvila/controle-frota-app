import React, { useState, useEffect } from 'react';
import { 
  Sparkles, Wrench, MapPin, Truck, ShieldAlert, CheckCircle2, ChevronRight, 
  X, Layers, Zap, Calendar, Users, FileCheck, ArrowRight, Eye, ClipboardCheck,
  ShieldCheck, AlertTriangle, FileClock, Activity, BookOpen, Star, RefreshCw, Clock
} from 'lucide-react';

const TEN_DAYS_MS = 10 * 24 * 60 * 60 * 1000;

export default function WelcomeReleaseModal({ currentUser, onClose }) {
  const [activeTab, setActiveTab] = useState('destaques'); // 'destaques' (Nível 1) ou 'detalhado' (Nível 2)
  const [detailSectorTab, setDetailSectorTab] = useState('frota'); // 'frota', 'wfm', 'laudos', 'autofiscalizacao'

  const uId = currentUser?.id || currentUser?.login;
  const diasRestantes = getDaysRemainingForReleaseModal(uId);

  const highlights = [
    {
      id: 'mecanico',
      tag: 'NOVA INTERFACE',
      tagColor: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
      icon: <Wrench className="text-emerald-600 dark:text-emerald-400" size={24} />,
      title: 'Painel do Mecânico (Tablet & Mobile)',
      description: 'Interface Kanban limpa e rápida com colunas gigantes, checklists interativos de defeitos e trava de liberação para zero pendências.',
      gradient: 'from-emerald-500/10 via-teal-500/5 to-transparent'
    },
    {
      id: 'wfm',
      tag: 'MOTOR DE DESPACHO',
      tagColor: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20',
      icon: <MapPin className="text-indigo-600 dark:text-indigo-400" size={24} />,
      title: 'WFM & Árvore de Buckets com Mapa',
      description: 'Organização hierárquica por Operação ➔ Região ➔ Base, Drag & Drop duplo (alocação de auditores e remapeamento de base) e rotas no mapa.',
      gradient: 'from-indigo-500/10 via-blue-500/5 to-transparent'
    },
    {
      id: 'oficinas',
      tag: 'FLUXO SISTÊMICO',
      tagColor: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
      icon: <Truck className="text-amber-600 dark:text-amber-400" size={24} />,
      title: 'Modais de Transição de Oficinas',
      description: 'Modais Liquid Glass para retorno à Oficina Interna ou transferência para Credenciadas (Chaveiro Edson, Aerobrasil, DeNigris, etc.).',
      gradient: 'from-amber-500/10 via-orange-500/5 to-transparent'
    },
    {
      id: 'laudos',
      tag: 'COMPLIANCE 100%',
      tagColor: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
      icon: <ShieldAlert className="text-purple-600 dark:text-purple-400" size={24} />,
      title: 'Monitor de Laudos & Laudo Parcial',
      description: 'Nova categoria "Laudo Parcial" para veículos com documentação em progresso e regras aprimoradas para 4 laudos de Cesto Aéreo.',
      gradient: 'from-purple-500/10 via-pink-500/5 to-transparent'
    }
  ];

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6 md:p-8 bg-slate-950/70 backdrop-blur-xl animate-in fade-in duration-300">
      {/* Liquid Glass Container */}
      <div className="relative w-full max-w-5xl max-h-[90vh] bg-white/90 dark:bg-slate-900/90 backdrop-blur-2xl rounded-[2.5rem] shadow-[0_25px_70px_rgba(0,0,0,0.35)] border border-white/60 dark:border-slate-800 flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
        
        {/* Ambient Top Glow */}
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-gradient-to-br from-emerald-500/20 via-teal-500/15 to-indigo-500/0 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-gradient-to-tl from-indigo-500/20 via-purple-500/15 to-emerald-500/0 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="relative z-10 p-6 sm:p-8 border-b border-slate-200/60 dark:border-slate-800 flex items-start justify-between gap-4 shrink-0 bg-white/40 dark:bg-slate-900/40 backdrop-blur-md">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 via-teal-600 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-emerald-500/25 shrink-0 animate-pulse">
              <Sparkles size={28} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="px-3 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  Release v2.5 • Grandes Novidades
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 flex items-center gap-1">
                  <Clock size={11} className="text-emerald-500" />
                  {diasRestantes > 0 
                    ? `Abertura automática nos primeiros 10 dias (Restam ${diasRestantes} dia${diasRestantes > 1 ? 's' : ''})`
                    : `Disponível no menu superior`
                  }
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                Seja bem-vindo às novas atualizações do sistema!
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                Desenvolvemos recursos modernos, rápidos e intuitivos para potencializar a operação da sua equipe.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2.5 hover:bg-slate-200/60 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-full transition-all shrink-0"
            title="Fechar"
          >
            <X size={22} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="relative z-10 flex-1 overflow-y-auto p-6 sm:p-8 space-y-6">
          
          {/* Top Switcher (Nível 1: Destaques vs Nível 2: Saiba Mais / Guia Detalhado) */}
          <div className="flex items-center justify-between gap-4 flex-wrap pb-2 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800/80 p-1.5 rounded-2xl border border-slate-200/60 dark:border-slate-700">
              <button
                onClick={() => setActiveTab('destaques')}
                className={`px-5 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${
                  activeTab === 'destaques'
                    ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-md scale-[1.02]'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <Star size={16} /> Destaques Principais
              </button>
              <button
                onClick={() => setActiveTab('detalhado')}
                className={`px-5 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${
                  activeTab === 'detalhado'
                    ? 'bg-gradient-to-r from-emerald-600 to-indigo-600 text-white shadow-md shadow-emerald-500/20 scale-[1.02]'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <BookOpen size={16} /> Saiba Mais (Guia Completo)
              </button>
            </div>

            {activeTab === 'destaques' && (
              <button
                onClick={() => setActiveTab('detalhado')}
                className="text-xs font-black text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1.5 group"
              >
                Explorar todas as melhorias por setor <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </button>
            )}
          </div>

          {/* VISÃO NÍVEL 1: DESTAQUES RÁPIDOS */}
          {activeTab === 'destaques' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {highlights.map((item) => (
                  <div
                    key={item.id}
                    className={`relative p-6 rounded-[2rem] bg-gradient-to-br ${item.gradient} border border-slate-200/80 dark:border-slate-800/80 hover:border-emerald-500/40 transition-all duration-300 hover:shadow-xl group flex flex-col justify-between`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border ${item.tagColor}`}>
                          {item.tag}
                        </span>
                        <div className="p-3 rounded-2xl bg-white dark:bg-slate-800 shadow-sm border border-slate-100 dark:border-slate-700 group-hover:scale-110 transition-transform">
                          {item.icon}
                        </div>
                      </div>
                      <h3 className="text-lg font-black text-slate-900 dark:text-white mb-2 leading-snug">
                        {item.title}
                      </h3>
                      <p className="text-xs text-slate-600 dark:text-slate-300 font-medium leading-relaxed">
                        {item.description}
                      </p>
                    </div>

                    <div className="mt-6 pt-4 border-t border-slate-200/40 dark:border-slate-800/40 flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Sistema Atualizado
                      </span>
                      <button
                        onClick={() => {
                          setActiveTab('detalhado');
                          if (item.id === 'mecanico' || item.id === 'oficinas') setDetailSectorTab('frota');
                          if (item.id === 'wfm') setDetailSectorTab('wfm');
                          if (item.id === 'laudos') setDetailSectorTab('laudos');
                        }}
                        className="text-xs font-black text-emerald-600 dark:text-emerald-400 group-hover:translate-x-1 transition-transform flex items-center gap-1"
                      >
                        Ver Detalhes <ChevronRight size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Big CTA Banner for "Saiba Mais" */}
              <div className="p-6 rounded-[2.5rem] bg-gradient-to-r from-emerald-600 via-teal-700 to-indigo-800 text-white flex flex-col sm:flex-row items-center justify-between gap-6 shadow-xl shadow-emerald-600/20 relative overflow-hidden">
                <div className="absolute right-0 top-0 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />
                <div className="space-y-1 relative z-10 text-center sm:text-left">
                  <span className="text-[10px] font-black uppercase tracking-widest text-emerald-200 bg-white/10 px-3 py-1 rounded-full border border-white/20">
                    Documentação Interativa
                  </span>
                  <h3 className="text-xl font-black tracking-tight mt-1">Quer conferir todas as mudanças em detalhes?</h3>
                  <p className="text-xs text-emerald-100/90 font-medium max-w-xl">
                    Preparamos um resumo setorizado cobrindo Frota, Mecânicos, Despacho WFM, Laudos de Compliance e AutoFiscalização.
                  </p>
                </div>

                <button
                  onClick={() => setActiveTab('detalhado')}
                  className="px-8 py-4 bg-white hover:bg-emerald-50 text-emerald-950 font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg hover:shadow-xl active:scale-95 transition-all shrink-0 flex items-center gap-2 relative z-10"
                >
                  <Sparkles size={16} className="text-emerald-600" /> Saiba Mais (Guia Completo)
                </button>
              </div>
            </div>
          )}

          {/* VISÃO NÍVEL 2: GUIA COMPLETO "SAIBA MAIS" */}
          {activeTab === 'detalhado' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              {/* Sector Tabs Bar */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {[
                  { id: 'frota', label: 'Frota & Oficina', icon: <Wrench size={16} />, color: 'emerald' },
                  { id: 'wfm', label: 'WFM & Despacho', icon: <MapPin size={16} />, color: 'indigo' },
                  { id: 'laudos', label: 'Laudos & Compliance', icon: <ShieldAlert size={16} />, color: 'purple' },
                  { id: 'autofiscalizacao', label: 'AutoFiscalização', icon: <ClipboardCheck size={16} />, color: 'blue' }
                ].map((sector) => (
                  <button
                    key={sector.id}
                    onClick={() => setDetailSectorTab(sector.id)}
                    className={`p-3.5 rounded-2xl font-black text-xs transition-all flex items-center justify-center gap-2 border ${
                      detailSectorTab === sector.id
                        ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-950 border-slate-900 dark:border-white shadow-md scale-[1.02]'
                        : 'bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 border-slate-200/60 dark:border-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {sector.icon} {sector.label}
                  </button>
                ))}
              </div>

              {/* SECTOR CONTENT */}

              {/* 1. FROTA & OFICINA */}
              {detailSectorTab === 'frota' && (
                <div className="space-y-4 animate-in fade-in duration-300">
                  <div className="bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-800/60 rounded-3xl p-5">
                    <h4 className="text-sm font-black text-emerald-950 dark:text-emerald-300 flex items-center gap-2">
                      <Wrench size={18} /> Inovações no Módulo de Frota & Manutenção
                    </h4>
                    <p className="text-xs text-emerald-800/90 dark:text-emerald-400 font-medium mt-1 leading-relaxed">
                      Aprimoramos o controle operacional das oficinas, introduzimos a trava de liberação segura e criamos o perfil especializado para mecânicos.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-5 bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-200/80 dark:border-slate-700 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        <h5 className="font-black text-slate-800 dark:text-white text-xs uppercase tracking-wider">Painel do Mecânico (Kanban)</h5>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                        Ambiente exclusivo direcionado automaticamente para mecânicos de frota. Exibe placas em tamanho expandido, categorias (Pesado, Leve, Moto) e colunas claras de "Em Análise" e "Oficina Interna".
                      </p>
                    </div>

                    <div className="p-5 bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-200/80 dark:border-slate-700 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        <h5 className="font-black text-slate-800 dark:text-white text-xs uppercase tracking-wider">Trava de Liberação de Veículos</h5>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                        Um veículo só pode ser liberado para a operação se **todos os defeitos** forem individualmente resolvidos. O sistema valida pendências em tempo real e bloqueia conclusões indevidas.
                      </p>
                    </div>

                    <div className="p-5 bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-200/80 dark:border-slate-700 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        <h5 className="font-black text-slate-800 dark:text-white text-xs uppercase tracking-wider">Campo Hodômetro (KM) no E-CAR</h5>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                        Adicionamos o campo numérico de **Hodômetro (KM)** na abertura e edição de chamados para registrar a quilometragem exata da ocorrência.
                      </p>
                    </div>

                    <div className="p-5 bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-200/80 dark:border-slate-700 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        <h5 className="font-black text-slate-800 dark:text-white text-xs uppercase tracking-wider">Oficinas Credenciadas</h5>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                        Modais sistêmicos para transferência externa. Atualizamos a lista de oficinas credenciadas para incluir **Chaveiro Edson**, **Aerobrasil Mecânica**, **DeNigris Mercedes** e **O Carro Auto Center**.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* 2. WFM & DESPACHO */}
              {detailSectorTab === 'wfm' && (
                <div className="space-y-4 animate-in fade-in duration-300">
                  <div className="bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200/60 dark:border-indigo-800/60 rounded-3xl p-5">
                    <h4 className="text-sm font-black text-indigo-950 dark:text-indigo-300 flex items-center gap-2">
                      <MapPin size={18} /> Novo Motor WFM & Despacho Inteligente
                    </h4>
                    <p className="text-xs text-indigo-800/90 dark:text-indigo-400 font-medium mt-1 leading-relaxed">
                      Reestruturação completa da árvore de buckets operacionais e sincronização com mapa global em tempo real.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-5 bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-200/80 dark:border-slate-700 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-indigo-500" />
                        <h5 className="font-black text-slate-800 dark:text-white text-xs uppercase tracking-wider">Árvore de Buckets (Operação ➔ Base)</h5>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                        Organização hierárquica clara por Região e Base de operação. Inclui a ramificação "Auditores abaixo" listando os auditores operacionais ativos.
                      </p>
                    </div>

                    <div className="p-5 bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-200/80 dark:border-slate-700 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-indigo-500" />
                        <h5 className="font-black text-slate-800 dark:text-white text-xs uppercase tracking-wider">Drag & Drop Duplo</h5>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                        Arraste uma OS da lista central para alocar diretamente em um Auditor na árvore, ou solte uma OS em uma Base para remapear sua unidade instantaneamente.
                      </p>
                    </div>

                    <div className="p-5 bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-200/80 dark:border-slate-700 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-indigo-500" />
                        <h5 className="font-black text-slate-800 dark:text-white text-xs uppercase tracking-wider">Mapa Global com Filtro por Nó</h5>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                        Selecione qualquer base na árvore para filtrar o mapa global em tempo real. Exibe marcadores, bases de saída dos auditores e traçado de rotas otimizadas.
                      </p>
                    </div>

                    <div className="p-5 bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-200/80 dark:border-slate-700 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-indigo-500" />
                        <h5 className="font-black text-slate-800 dark:text-white text-xs uppercase tracking-wider">Limpeza da Verificação Manual</h5>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                        Normalização automática de nomes de base para encaminhar atividades corretamente para suas bases, reduzindo o volume de tarefas na Verificação Manual.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* 3. LAUDOS & COMPLIANCE */}
              {detailSectorTab === 'laudos' && (
                <div className="space-y-4 animate-in fade-in duration-300">
                  <div className="bg-purple-50/60 dark:bg-purple-950/30 border border-purple-200/60 dark:border-purple-800/60 rounded-3xl p-5">
                    <h4 className="text-sm font-black text-purple-950 dark:text-purple-300 flex items-center gap-2">
                      <ShieldAlert size={18} /> Reformulação do Monitor de Compliance (Laudos)
                    </h4>
                    <p className="text-xs text-purple-800/90 dark:text-purple-400 font-medium mt-1 leading-relaxed">
                      Estatísticas refinadas para classificação de laudos e novas garantias de documentação em dia.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-5 bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-200/80 dark:border-slate-700 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-purple-500" />
                        <h5 className="font-black text-slate-800 dark:text-white text-xs uppercase tracking-wider">Novo Card "Laudo Parcial"</h5>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                        Novo indicador em tom roxo identificando veículos com documentação parcial (ex: 2 de 4 laudos). Permite filtrar e acompanhar o processo de regularização.
                      </p>
                    </div>

                    <div className="p-5 bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-200/80 dark:border-slate-700 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-purple-500" />
                        <h5 className="font-black text-slate-800 dark:text-white text-xs uppercase tracking-wider">Recálculo da Categoria "Com Laudo"</h5>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                        Veículos com 100% dos laudos obrigatórios em dia não perdem o status de "Com Laudo" por vencimentos futuros (como 42 dias), garantindo estatísticas 100% fiéis.
                      </p>
                    </div>

                    <div className="p-5 bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-200/80 dark:border-slate-700 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-purple-500" />
                        <h5 className="font-black text-slate-800 dark:text-white text-xs uppercase tracking-wider">Exigências para Cesto Aéreo</h5>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                        Validação rigorosa dos 4 laudos obrigatórios para veículos Cesto Aéreo/Munk: **CRLV**, **Acústico**, **Dielétrico Liner** e **Dielétrico Lança**.
                      </p>
                    </div>

                    <div className="p-5 bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-200/80 dark:border-slate-700 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-purple-500" />
                        <h5 className="font-black text-slate-800 dark:text-white text-xs uppercase tracking-wider">Filtragem Dinâmica</h5>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                        Clique em qualquer card do monitor (*Com Laudo*, *Laudo Parcial*, *Vence em 5D/15D/30D/60D*) para filtrar a grade de veículos instantaneamente.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* 4. AUTOFISCALIZAÇÃO & QUALIDADE */}
              {detailSectorTab === 'autofiscalizacao' && (
                <div className="space-y-4 animate-in fade-in duration-300">
                  <div className="bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-800/60 rounded-3xl p-5">
                    <h4 className="text-sm font-black text-blue-950 dark:text-blue-300 flex items-center gap-2">
                      <ClipboardCheck size={18} /> AutoFiscalização & Pipeline de Qualidade
                    </h4>
                    <p className="text-xs text-blue-800/90 dark:text-blue-400 font-medium mt-1 leading-relaxed">
                      Correções de sincronismo em encerramentos e redesign ultra-premium nos cartões de acompanhamento.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-5 bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-200/80 dark:border-slate-700 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-blue-500" />
                        <h5 className="font-black text-slate-800 dark:text-white text-xs uppercase tracking-wider">Flex Stepper Sem Linhas Quebradas</h5>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                        Novo fluxo flexível para os passos do workflow (*Sistema ➔ Feedback ➔ Campo*), eliminando problemas de sobreposição e desalinhamento visual.
                      </p>
                    </div>

                    <div className="p-5 bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-200/80 dark:border-slate-700 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-blue-500" />
                        <h5 className="font-black text-slate-800 dark:text-white text-xs uppercase tracking-wider">Conclusão Automática de Workflows</h5>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                        Cálculo dinâmico de conclusão: assim que a inspeção, o feedback e a auditoria de campo forem finalizados, a OS assume o status **Finalizado** no painel.
                      </p>
                    </div>

                    <div className="p-5 bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-200/80 dark:border-slate-700 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-blue-500" />
                        <h5 className="font-black text-slate-800 dark:text-white text-xs uppercase tracking-wider">Galeria Fotográfica Consolidada</h5>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                        O modal de detalhes da OS unifica todas as evidências registradas em campo (Fotos de Fachada, Odômetro, Poste Cia, Poste Cliente e Fotos de Reunião).
                      </p>
                    </div>

                    <div className="p-5 bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-200/80 dark:border-slate-700 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-blue-500" />
                        <h5 className="font-black text-slate-800 dark:text-white text-xs uppercase tracking-wider">Entrega Equipes (Somente Leitura)</h5>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                        Liberada a visualização das métricas de Entrega de Equipes para o perfil da Frota, sem exibição dos botões de alteração/importação.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="relative z-10 p-6 border-t border-slate-200/60 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 backdrop-blur-md flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs font-medium">
            <CheckCircle2 size={16} className="text-emerald-500" />
            <span>Você pode rever este guia a qualquer momento pelo menu de perfil.</span>
          </div>

          <button
            onClick={onClose}
            className="w-full sm:w-auto px-8 py-3.5 bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:hover:bg-slate-100 dark:text-slate-950 font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            Entendido / Ir para o Sistema <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Função utilitária para verificar se a janela de 10 dias após o primeiro login ainda é válida.
 * Retorna true se deve exibir o modal automaticamente.
 */
export function checkShouldAutoShowReleaseModal(userId) {
  if (!userId) return false;
  const storageKey = `release_v2.5_first_login_${userId}`;
  const storedTimestamp = localStorage.getItem(storageKey);
  const now = Date.now();

  if (!storedTimestamp) {
    // Primeiro login nesta versão: gravar timestamp
    localStorage.setItem(storageKey, String(now));
    return true;
  }

  const firstLoginTime = parseInt(storedTimestamp, 10);
  if (isNaN(firstLoginTime)) {
    localStorage.setItem(storageKey, String(now));
    return true;
  }

  // Verifica se passaram menos de 10 dias
  const timePassed = now - firstLoginTime;
  return timePassed <= TEN_DAYS_MS;
}

/**
 * Retorna o número de dias restantes na janela de 10 dias para exibição automática.
 */
export function getDaysRemainingForReleaseModal(userId) {
  if (!userId) return 0;
  const storageKey = `release_v2.5_first_login_${userId}`;
  const storedTimestamp = localStorage.getItem(storageKey);
  if (!storedTimestamp) return 10;
  const firstLoginTime = parseInt(storedTimestamp, 10);
  if (isNaN(firstLoginTime)) return 10;
  const timePassed = Date.now() - firstLoginTime;
  const remainingMs = TEN_DAYS_MS - timePassed;
  if (remainingMs <= 0) return 0;
  return Math.ceil(remainingMs / (24 * 60 * 60 * 1000));
}
