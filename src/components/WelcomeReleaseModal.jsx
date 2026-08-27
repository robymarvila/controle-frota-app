import React, { useState } from 'react';
import { 
  Sparkles, Wrench, MapPin, Truck, ShieldAlert, CheckCircle2, ChevronRight, 
  X, Layers, Zap, Calendar, Users, FileCheck, ArrowRight, Eye, ClipboardCheck,
  ShieldCheck, AlertTriangle, FileClock, Activity, BookOpen, Star, RefreshCw, Clock,
  Smartphone, LayoutDashboard, Building2, Lock, Moon, Globe, FileText, Check,
  Camera, Shield, Gauge, Cpu, CheckSquare, Search
} from 'lucide-react';

const TEN_DAYS_MS = 10 * 24 * 60 * 60 * 1000;

export default function WelcomeReleaseModal({ currentUser, onClose }) {
  const [activeTab, setActiveTab] = useState('destaques'); // 'destaques' (Nível 1) ou 'detalhado' (Nível 2)
  const [detailSectorTab, setDetailSectorTab] = useState('frota'); // 'frota', 'indicadores', 'mobile', 'mecanica', 'seguranca'

  const uId = currentUser?.id || currentUser?.login;
  const diasRestantes = getDaysRemainingForReleaseModal(uId);

  const highlights = [
    {
      id: 'executiva',
      tag: 'NOVA ARQUITETURA',
      tagColor: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
      icon: <FileText className="text-emerald-600 dark:text-emerald-400" size={24} />,
      title: 'Visão Hub Executiva em Chamados E-CAR',
      description: 'Central analítica com cards inteligentes para decisões operacionais rápidas, mantendo a flexibilidade de alternar instantaneamente para a Visão Clássica.',
      sectorTab: 'frota',
      gradient: 'from-emerald-500/10 via-teal-500/5 to-transparent'
    },
    {
      id: 'android',
      tag: 'PRODUÇÃO / NATIVO',
      tagColor: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20',
      icon: <Smartphone className="text-indigo-600 dark:text-indigo-400" size={24} />,
      title: 'App Controle Operacional para Android',
      description: 'Aplicativo nativo via Capacitor para smartphones e tablets: acesso à câmera com upload instantâneo de fotos, geolocalização e suporte touch.',
      sectorTab: 'mobile',
      gradient: 'from-indigo-500/10 via-blue-500/5 to-transparent'
    },
    {
      id: 'indicadores',
      tag: 'DISPONIBILIDADE ESTRATÉGICA',
      tagColor: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
      icon: <LayoutDashboard className="text-rose-600 dark:text-rose-400" size={24} />,
      title: 'Indicadores de Frota & Dashboard',
      description: 'Métricas segmentadas lado a lado: Total Frota, Disponíveis, Impeditivos (Parados) e Não Impeditivos (Rodando), com histórico dinâmico em 30 dias.',
      sectorTab: 'indicadores',
      gradient: 'from-rose-500/10 via-pink-500/5 to-transparent'
    },
    {
      id: 'liberacao',
      tag: 'COMPLIANCE TÉCNICO',
      tagColor: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
      icon: <ClipboardCheck className="text-amber-600 dark:text-amber-400" size={24} />,
      title: 'Fluxo "Solicitar Liberação" & Oficinas',
      description: 'Checklist com atalho de fotos para conferência visual de cada defeito, laudo técnico obrigatório e sub-fluxo de Compras/Financeiro com Dual-Write.',
      sectorTab: 'mecanica',
      gradient: 'from-amber-500/10 via-orange-500/5 to-transparent'
    },
    {
      id: 'cadastro_oficinas',
      tag: 'GESTÃO DE PARCEIROS',
      tagColor: 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20',
      icon: <Building2 className="text-teal-600 dark:text-teal-400" size={24} />,
      title: 'Cadastro Centralizado de Oficinas',
      description: 'Módulo dedicado para gerenciar oficinas parceiras credenciadas e internas, com integração dinâmica aos selects de encaminhamento de OS.',
      sectorTab: 'mecanica',
      gradient: 'from-teal-500/10 via-emerald-500/5 to-transparent'
    },
    {
      id: 'seguranca',
      tag: 'BLINDAGEM & EXPERIÊNCIA',
      tagColor: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
      icon: <ShieldCheck className="text-purple-600 dark:text-purple-400" size={24} />,
      title: 'Segurança E2EE, Logout Liquid Glass & Dark Mode',
      description: 'Criptografia ponta a ponta no login, bloqueio contra sessões inesperadas, novo modal de logout Liquid Glass, PWA veloz e Dark Mode ajustado.',
      sectorTab: 'seguranca',
      gradient: 'from-purple-500/10 via-indigo-500/5 to-transparent'
    }
  ];

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-6 md:p-8 bg-slate-950/75 backdrop-blur-xl animate-in fade-in duration-300">
      {/* Liquid Glass Container */}
      <div className="relative w-full max-w-6xl max-h-[92vh] bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl rounded-[2.5rem] shadow-[0_25px_70px_rgba(0,0,0,0.4)] border border-white/60 dark:border-slate-800 flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
        
        {/* Ambient Top & Bottom Glow */}
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-gradient-to-br from-emerald-500/20 via-teal-500/15 to-indigo-500/0 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-gradient-to-tl from-indigo-500/20 via-purple-500/15 to-emerald-500/0 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="relative z-10 p-5 sm:p-7 border-b border-slate-200/60 dark:border-slate-800 flex items-start justify-between gap-4 shrink-0 bg-white/40 dark:bg-slate-900/40 backdrop-blur-md">
          <div className="flex items-center gap-4">
            <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-emerald-500 via-teal-600 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-emerald-500/25 shrink-0 animate-pulse">
              <Sparkles size={28} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="px-3 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  Release v2.6 • Novas Atualizações
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 flex items-center gap-1">
                  <Clock size={11} className="text-emerald-500" />
                  {diasRestantes > 0 
                    ? `Abertura automática nos primeiros 10 dias (Restam ${diasRestantes} dia${diasRestantes > 1 ? 's' : ''})`
                    : `Disponível no menu superior`
                  }
                </span>
              </div>
              <h2 className="text-lg sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                Seja bem-vindo às novas atualizações do sistema!
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                Apresentamos as novidades de arquitetura, visão executiva, aplicativo nativo Android, fluxos de oficina e segurança corporativa.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2.5 hover:bg-slate-200/60 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-full transition-all shrink-0 cursor-pointer"
            title="Fechar"
          >
            <X size={22} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="relative z-10 flex-1 overflow-y-auto p-5 sm:p-7 space-y-6 custom-scrollbar">
          
          {/* Top Switcher (Nível 1: Destaques Principais vs Nível 2: Guia Completo Setorizado) */}
          <div className="flex items-center justify-between gap-4 flex-wrap pb-2 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800/80 p-1.5 rounded-2xl border border-slate-200/60 dark:border-slate-700">
              <button
                onClick={() => setActiveTab('destaques')}
                className={`px-5 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
                  activeTab === 'destaques'
                    ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-md scale-[1.02]'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <Star size={16} /> Destaques Principais
              </button>
              <button
                onClick={() => setActiveTab('detalhado')}
                className={`px-5 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
                  activeTab === 'detalhado'
                    ? 'bg-gradient-to-r from-emerald-600 to-indigo-600 text-white shadow-md shadow-emerald-500/20 scale-[1.02]'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <BookOpen size={16} /> Guia Completo & Técnico
              </button>
            </div>

            {activeTab === 'destaques' && (
              <button
                onClick={() => setActiveTab('detalhado')}
                className="text-xs font-black text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1.5 group cursor-pointer"
              >
                Explorar todas as melhorias por módulo <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </button>
            )}
          </div>

          {/* VISÃO NÍVEL 1: DESTAQUES RÁPIDOS */}
          {activeTab === 'destaques' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {highlights.map((item) => (
                  <div
                    key={item.id}
                    className={`relative p-5 rounded-[2rem] bg-gradient-to-br ${item.gradient} border border-slate-200/80 dark:border-slate-800/80 hover:border-emerald-500/40 transition-all duration-300 hover:shadow-xl group flex flex-col justify-between`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3.5">
                        <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border ${item.tagColor}`}>
                          {item.tag}
                        </span>
                        <div className="p-2.5 rounded-2xl bg-white dark:bg-slate-800 shadow-sm border border-slate-100 dark:border-slate-700 group-hover:scale-110 transition-transform">
                          {item.icon}
                        </div>
                      </div>
                      <h3 className="text-base font-black text-slate-900 dark:text-white mb-2 leading-snug">
                        {item.title}
                      </h3>
                      <p className="text-xs text-slate-600 dark:text-slate-300 font-medium leading-relaxed">
                        {item.description}
                      </p>
                    </div>

                    <div className="mt-5 pt-3.5 border-t border-slate-200/40 dark:border-slate-800/40 flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Disponível na v2.6
                      </span>
                      <button
                        onClick={() => {
                          setActiveTab('detalhado');
                          if (item.sectorTab) setDetailSectorTab(item.sectorTab);
                        }}
                        className="text-xs font-black text-emerald-600 dark:text-emerald-400 group-hover:translate-x-1 transition-transform flex items-center gap-1 cursor-pointer"
                      >
                        Ver Detalhes <ChevronRight size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Banner Interativo para Acesso ao Guia Completo */}
              <div className="p-6 rounded-[2.5rem] bg-gradient-to-r from-emerald-600 via-teal-700 to-indigo-800 text-white flex flex-col sm:flex-row items-center justify-between gap-6 shadow-xl shadow-emerald-600/20 relative overflow-hidden">
                <div className="absolute right-0 top-0 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />
                <div className="space-y-1 relative z-10 text-center sm:text-left">
                  <span className="text-[10px] font-black uppercase tracking-widest text-emerald-200 bg-white/10 px-3 py-1 rounded-full border border-white/20">
                    Documentação & Treinamento Técnico
                  </span>
                  <h3 className="text-xl font-black tracking-tight mt-1">Quer conferir o funcionamento técnico detalhado?</h3>
                  <p className="text-xs text-emerald-100/90 font-medium max-w-2xl">
                    Preparamos um guia aprofundado cobrindo Chamados E-CAR, Indicadores de Frota, App Android Nativo, Liberação Técnica de Oficina e Segurança Corporativa.
                  </p>
                </div>

                <button
                  onClick={() => setActiveTab('detalhado')}
                  className="px-7 py-3.5 bg-white hover:bg-emerald-50 text-emerald-950 font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg hover:shadow-xl active:scale-95 transition-all shrink-0 flex items-center gap-2 relative z-10 cursor-pointer"
                >
                  <Sparkles size={16} className="text-emerald-600" /> Acessar Guia Completo
                </button>
              </div>
            </div>
          )}

          {/* VISÃO NÍVEL 2: GUIA COMPLETO E TÉCNICO */}
          {activeTab === 'detalhado' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              {/* Sector Tabs Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                {[
                  { id: 'frota', label: 'Chamados E-CAR', icon: <FileText size={16} /> },
                  { id: 'indicadores', label: 'Indicadores Frota', icon: <LayoutDashboard size={16} /> },
                  { id: 'mobile', label: 'App Android & PWA', icon: <Smartphone size={16} /> },
                  { id: 'mecanica', label: 'Oficinas & Liberação', icon: <Wrench size={16} /> },
                  { id: 'seguranca', label: 'Segurança & WFM', icon: <ShieldCheck size={16} /> }
                ].map((sector) => (
                  <button
                    key={sector.id}
                    onClick={() => setDetailSectorTab(sector.id)}
                    className={`p-3.5 rounded-2xl font-black text-xs transition-all flex items-center justify-center gap-2 border cursor-pointer ${
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

              {/* 1. CHAMADOS E-CAR */}
              {detailSectorTab === 'frota' && (
                <div className="space-y-4 animate-in fade-in duration-300">
                  <div className="bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-800/60 rounded-3xl p-5">
                    <h4 className="text-sm font-black text-emerald-950 dark:text-emerald-300 flex items-center gap-2">
                      <FileText size={18} /> Inovações no Módulo de Chamados E-CAR & Gestão
                    </h4>
                    <p className="text-xs text-emerald-800/90 dark:text-emerald-400 font-medium mt-1 leading-relaxed">
                      Implementação da nova central analítica com alternância entre Visão Executiva e Visão Clássica, galeria unificada de evidências fotográficas e rastreamento de quilometragem.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-5 bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-200/80 dark:border-slate-700 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        <h5 className="font-black text-slate-800 dark:text-white text-xs uppercase tracking-wider">Visão Hub Executiva vs. Visão Clássica</h5>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                        A **Visão Executiva** sintetiza a tomada de decisão com cards interativos (*Total em Aberto*, *Veículos Parados*, *Oficina Interna com Sub-fluxo*, *Não Impeditivos*, *Oficina Externa*, *Aguardando Validação*). A **Visão Clássica** tradicional em tabela e kanban foi integralmente preservada, permitindo troca imediata pelo seletor de topo.
                      </p>
                    </div>

                    <div className="p-5 bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-200/80 dark:border-slate-700 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        <h5 className="font-black text-slate-800 dark:text-white text-xs uppercase tracking-wider">Galeria de Evidências Fotográficas e Zoom</h5>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                        Centralização das fotos de abertura (*Fachada, Hodômetro, Adicionais*) e fotos de cada defeito específico reportado. Conta com visualizador em alta definição com zoom em tela cheia para análise pericial rápida da avaria.
                      </p>
                    </div>

                    <div className="p-5 bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-200/80 dark:border-slate-700 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        <h5 className="font-black text-slate-800 dark:text-white text-xs uppercase tracking-wider">Campo Hodômetro (KM) Integrado</h5>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                        Registro obrigatório e auditoria da quilometragem exata do veículo no ato de abertura e edição do chamado, garantindo precisão nos planos de manutenção preventiva e histórico veicular.
                      </p>
                    </div>

                    <div className="p-5 bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-200/80 dark:border-slate-700 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        <h5 className="font-black text-slate-800 dark:text-white text-xs uppercase tracking-wider">Histórico Cronológico & Devoluções</h5>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                        Linha do tempo estruturada registrando todas as movimentações, motivos de encaminhamento para oficinas externas, comentários técnicos e pareceres de validação de frota.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* 2. INDICADORES DE FROTA & DASHBOARD */}
              {detailSectorTab === 'indicadores' && (
                <div className="space-y-4 animate-in fade-in duration-300">
                  <div className="bg-rose-50/60 dark:bg-rose-950/30 border border-rose-200/60 dark:border-rose-800/60 rounded-3xl p-5">
                    <h4 className="text-sm font-black text-rose-950 dark:text-rose-300 flex items-center gap-2">
                      <LayoutDashboard size={18} /> Inteligência Analítica & Indicadores de Frota
                    </h4>
                    <p className="text-xs text-rose-800/90 dark:text-rose-400 font-medium mt-1 leading-relaxed">
                      Revisão matemática da disponibilidade mecânica com segmentação de criticidade operacional e histórico por veículo.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-5 bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-200/80 dark:border-slate-700 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-rose-500" />
                        <h5 className="font-black text-slate-800 dark:text-white text-xs uppercase tracking-wider">Disponibilidade Segmentada (Impeditivos vs. Não Impeditivos)</h5>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                        O Hero Card de disponibilidade agora expõe a composição real lado a lado: **Total Frota**, **Disponíveis**, **C/ Chamado Aberto** e o desdobramento em **Chamados Impeditivos** (veículos parados) e **Não Impeditivos** (veículos rodando com pendências leves).
                      </p>
                    </div>

                    <div className="p-5 bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-200/80 dark:border-slate-700 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-rose-500" />
                        <h5 className="font-black text-slate-800 dark:text-white text-xs uppercase tracking-wider">Histórico Dinâmico por Placa (30 e 60 Dias)</h5>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                        Ao clicar em qualquer placa no ranking de reincidência em 30 dias, um modal rápido lista o histórico integral de chamados do veículo, com data de abertura, fechamento, motorista e pareceres técnicos.
                      </p>
                    </div>

                    <div className="p-5 bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-200/80 dark:border-slate-700 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-rose-500" />
                        <h5 className="font-black text-slate-800 dark:text-white text-xs uppercase tracking-wider">Filtros Avançados por Tipo, Contrato e Turno</h5>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                        Possibilidade de cruzar a taxa de indisponibilidade filtrando por tipo de contrato (Locado vs. Próprio), sub-tipos (ex: Cesto Aéreo) e tipo de operação (OP Comercial vs. Manutenção).
                      </p>
                    </div>

                    <div className="p-5 bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-200/80 dark:border-slate-700 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-rose-500" />
                        <h5 className="font-black text-slate-800 dark:text-white text-xs uppercase tracking-wider">Cálculo Preciso de Horas Paradas</h5>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                        Métricas de tempo de inatividade com clamp temporal, mensurando com precisão o impacto de veículos parados em oficina dentro do mês corrente ou janelas personalizadas.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* 3. APP ANDROID & PWA */}
              {detailSectorTab === 'mobile' && (
                <div className="space-y-4 animate-in fade-in duration-300">
                  <div className="bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200/60 dark:border-indigo-800/60 rounded-3xl p-5">
                    <h4 className="text-sm font-black text-indigo-950 dark:text-indigo-300 flex items-center gap-2">
                      <Smartphone size={18} /> Aplicativo Android & Ecossistema Mobile PWA
                    </h4>
                    <p className="text-xs text-indigo-800/90 dark:text-indigo-400 font-medium mt-1 leading-relaxed">
                      Lançamento da compilação nativa para smartphones e tablets Android com recursos de hardware e cache offline.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-5 bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-200/80 dark:border-slate-700 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-indigo-500" />
                        <h5 className="font-black text-slate-800 dark:text-white text-xs uppercase tracking-wider">App Nativo Android (Capacitor)</h5>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                        Pacote nativo APK para instalação direta em celulares de auditores, motoristas e mecânicos de base, integrando plugins nativos de câmera, geolocalização e feedback tátil (Haptics).
                      </p>
                    </div>

                    <div className="p-5 bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-200/80 dark:border-slate-700 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-indigo-500" />
                        <h5 className="font-black text-slate-800 dark:text-white text-xs uppercase tracking-wider">Captura & Upload Direto de Fotos</h5>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                        Integração com a câmera nativa do aparelho para registro fotográfico instantâneo de defeitos no campo, com compressão inteligente para envio ultrarrápido sem estourar o limite de dados.
                      </p>
                    </div>

                    <div className="p-5 bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-200/80 dark:border-slate-700 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-indigo-500" />
                        <h5 className="font-black text-slate-800 dark:text-white text-xs uppercase tracking-wider">PWA Aprimorado & Service Worker</h5>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                        Novo Service Worker (`sw.js`) com cache inteligente de assets essenciais, garantindo carregamento instantâneo e operação resiliente mesmo em condições de sinal oscilante de campo.
                      </p>
                    </div>

                    <div className="p-5 bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-200/80 dark:border-slate-700 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-indigo-500" />
                        <h5 className="font-black text-slate-800 dark:text-white text-xs uppercase tracking-wider">Mobile Hub & Navegação Otimizada</h5>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                        Barra inferior ergonômica, menus rápidos de perfil e telas de transição com animações suaves de 60 FPS calibradas para telas sensíveis ao toque.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* 4. MECÂNICA, VALIDAÇÃO & OFICINAS */}
              {detailSectorTab === 'mecanica' && (
                <div className="space-y-4 animate-in fade-in duration-300">
                  <div className="bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-800/60 rounded-3xl p-5">
                    <h4 className="text-sm font-black text-amber-950 dark:text-amber-300 flex items-center gap-2">
                      <Wrench size={18} /> Mecânica, Validação de Manutenção & Oficinas
                    </h4>
                    <p className="text-xs text-amber-800/90 dark:text-amber-400 font-medium mt-1 leading-relaxed">
                      Novo fluxo técnico de liberação com conferência visual de fotos, sub-fluxo financeiro de compras e cadastro centralizado de oficinas.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-5 bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-200/80 dark:border-slate-700 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-amber-500" />
                        <h5 className="font-black text-slate-800 dark:text-white text-xs uppercase tracking-wider">Novo Fluxo "Solicitar Liberação"</h5>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                        O mecânico valida a conclusão dos serviços marcando item a item no checklist interativo, com acesso ao botão `[ 📷 Foto ]` em cada defeito para inspecionar a foto original antes de atestar a resolução.
                      </p>
                    </div>

                    <div className="p-5 bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-200/80 dark:border-slate-700 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-amber-500" />
                        <h5 className="font-black text-slate-800 dark:text-white text-xs uppercase tracking-wider">Sub-Fluxo de Oficina Interna (Compras & Financeiro)</h5>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                        Rastreamento das etapas de aquisição de peças: **COMPRAS** ➔ **FINANCEIRO** ➔ **PAGO**, com registro do número do pedido e sincronização *Dual-Write* bidirecional em tempo real com o banco de dados.
                      </p>
                    </div>

                    <div className="p-5 bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-200/80 dark:border-slate-700 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-amber-500" />
                        <h5 className="font-black text-slate-800 dark:text-white text-xs uppercase tracking-wider">Módulo de Cadastro de Oficinas</h5>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                        Interface corporativa para cadastrar, editar e gerenciar oficinas credenciadas e oficinas internas, integrando os nomes automaticamente aos menus de transferência de chamados.
                      </p>
                    </div>

                    <div className="p-5 bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-200/80 dark:border-slate-700 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-amber-500" />
                        <h5 className="font-black text-slate-800 dark:text-white text-xs uppercase tracking-wider">Ordem de Camadas & Retorno Seguro</h5>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                        Ajuste estrutural de empilhamento (`z-[80]`) no modal de detalhes: o mecânico pode alternar entre detalhes da OS e validação sem perder nenhuma digitação de relatório ou foto anexada.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* 5. SEGURANÇA, WFM & EXPERIÊNCIA */}
              {detailSectorTab === 'seguranca' && (
                <div className="space-y-4 animate-in fade-in duration-300">
                  <div className="bg-purple-50/60 dark:bg-purple-950/30 border border-purple-200/60 dark:border-purple-800/60 rounded-3xl p-5">
                    <h4 className="text-sm font-black text-purple-950 dark:text-purple-300 flex items-center gap-2">
                      <ShieldCheck size={18} /> Segurança Corporativa, WFM & Ergonomia Visual
                    </h4>
                    <p className="text-xs text-purple-800/90 dark:text-purple-400 font-medium mt-1 leading-relaxed">
                      Criptografia de ponta a ponta, blindagem de sessões, monitoramento de auditores e Dark Mode calibrado.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-5 bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-200/80 dark:border-slate-700 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-purple-500" />
                        <h5 className="font-black text-slate-800 dark:text-white text-xs uppercase tracking-wider">Criptografia E2EE & Proteção de Sessão</h5>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                        Criptografia de ponta a ponta no fluxo de autenticação e mecanismos de segurança para detecção e bloqueio de acessos inesperados ou sessões simultâneas concorrentes.
                      </p>
                    </div>

                    <div className="p-5 bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-200/80 dark:border-slate-700 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-purple-500" />
                        <h5 className="font-black text-slate-800 dark:text-white text-xs uppercase tracking-wider">Modal Ultra-Premium de Logout (Liquid Glass)</h5>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                        Encerramento de sessão seguro e padronizado em todos os módulos (Mecânico, AutoFiscalização, Sidebar e Mobile Hub) com card do usuário, avatar gradiente e status ativo.
                      </p>
                    </div>

                    <div className="p-5 bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-200/80 dark:border-slate-700 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-purple-500" />
                        <h5 className="font-black text-slate-800 dark:text-white text-xs uppercase tracking-wider">Status do Auditor em Tempo Real (WFM)</h5>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                        Monitoramento contínuo da disponibilidade dos auditores em campo (*Disponível, Em Rota, Em Inspeção, Pausa*), integrado com árvore de buckets e alocação dinâmica no mapa.
                      </p>
                    </div>

                    <div className="p-5 bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-200/80 dark:border-slate-700 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-purple-500" />
                        <h5 className="font-black text-slate-800 dark:text-white text-xs uppercase tracking-wider">Dark Mode Refinado de Alto Contraste</h5>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                        Paleta noturna esmeralda e ardósia profunda (`slate-900`/`slate-950`) com contraste calibrado para máxima legibilidade e economia de bateria sem gerar fadiga visual.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="relative z-10 p-5 sm:p-6 border-t border-slate-200/60 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 backdrop-blur-md flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs font-medium">
            <CheckCircle2 size={16} className="text-emerald-500" />
            <span>Você pode rever este guia a qualquer momento pelo botão <strong>Novidades v2.6</strong> no topo.</span>
          </div>

          <button
            onClick={onClose}
            className="w-full sm:w-auto px-8 py-3.5 bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:hover:bg-slate-100 dark:text-slate-950 font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            Entendido / Ir para o Sistema <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Função utilitária para verificar se a janela de 10 dias após o primeiro login na versão v2.6 ainda é válida.
 * Retorna true se deve exibir o modal automaticamente.
 */
export function checkShouldAutoShowReleaseModal(userId) {
  if (!userId) return false;
  const storageKey = `release_v2.6_first_login_${userId}`;
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
  const storageKey = `release_v2.6_first_login_${userId}`;
  const storedTimestamp = localStorage.getItem(storageKey);
  if (!storedTimestamp) return 10;
  const firstLoginTime = parseInt(storedTimestamp, 10);
  if (isNaN(firstLoginTime)) return 10;
  const timePassed = Date.now() - firstLoginTime;
  const remainingMs = TEN_DAYS_MS - timePassed;
  if (remainingMs <= 0) return 0;
  return Math.ceil(remainingMs / (24 * 60 * 60 * 1000));
}
