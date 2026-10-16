import React, { useState } from 'react';
import { 
  X, Info, AlertTriangle, CheckCircle2, AlertCircle, 
  HelpCircle, Sparkles, ArrowRight, Eye, Droplets,
  Clock, Compass, ShieldCheck, Check, Layers, ChevronRight, ChevronLeft
} from 'lucide-react';

/**
 * 5 Passos Oficiais de Medição Conforme o Manual do Fabricante:
 * 1. Estacione no plano: Garanta que o carro não esteja inclinado, pois isso altera a leitura na vareta.
 * 2. Aguarde o óleo descer: Faça a leitura com o motor frio (antes de ligar o carro no dia) ou espere de 10 a 15 minutos após desligá-lo.
 * 3. Localize e limpe a vareta: Abra o capô ou suba a cabine do caminhão, retire a vareta de óleo (geralmente com anel amarelo ou colorido) e limpe a ponta com um pano ou papel que não solte fiapos.
 * 4. Insira novamente: Coloque a vareta de volta até o fundo e retire-a com cuidado.
 * 5. Confira o nível: O óleo deve estar entre as marcas de mínimo e máximo indicadas na ponta da vareta.
 */

export const PASSOS_MEDICAO = [
  {
    passo: 1,
    titulo: 'Estacione no Plano',
    subtitulo: 'Garanta terreno 100% nivelado',
    descricao: 'Garanta que o carro não esteja inclinado em aclives ou declives. Qualquer inclinação faz o óleo acumular em um dos lados do cárter, falseando a leitura.',
    dica: 'Dica do Fabricante: Evite calçadas, lombadas ou valetas. Estacione sobre piso de concreto ou asfalto plano.',
    tag: 'Base Estável',
    cor: 'blue'
  },
  {
    passo: 2,
    titulo: 'Aguarde o Óleo Descer',
    subtitulo: 'Motor frio ou repouso de 10 a 15 min',
    descricao: 'Faça a leitura com o motor frio (antes de ligar o veículo no início do expediente) ou aguarde de 10 a 15 minutos após desligá-lo para que todo o óleo retorne ao cárter.',
    dica: 'Dica do Fabricante: Nunca meça imediatamente após desligar; o óleo ainda estará espalhado pelo cabeçote e galerias.',
    tag: 'Decantação Total',
    cor: 'indigo'
  },
  {
    passo: 3,
    titulo: 'Localize e Limpe a Vareta',
    subtitulo: 'Higienização da ponta com pano limpo',
    descricao: 'Abra o capô ou suba a cabine do caminhão. Puxe a vareta de óleo (geralmente identificada por anel amarelo ou colorido) e limpe a ponta com pano ou papel sem fiapos.',
    dica: 'Evidência 1: Tire aqui a foto da "Haste Limpa" antes de reinserir no tubo.',
    tag: 'Foto: Haste Limpa',
    cor: 'amber'
  },
  {
    passo: 4,
    titulo: 'Insira Novamente até o Fundo',
    subtitulo: 'Encaixe completo sem forçar',
    descricao: 'Coloque a vareta de volta até o batente final (fundo do duto) e retire-a com cuidado e firmeza, mantendo-a na vertical para não escorrer.',
    dica: 'Dica do Fabricante: Certifique-se de que a tampa da vareta encostou completamente no bocal para calibrar a leitura.',
    tag: 'Encaixe Preciso',
    cor: 'purple'
  },
  {
    passo: 5,
    titulo: 'Confira o Nível na Hachura',
    subtitulo: 'Leitura visual entre MÍN e MÁX',
    descricao: 'O óleo deve estar entre as marcas de mínimo e máximo indicadas na ponta da vareta. Nível abaixo de MIN exige complemento imediato; sem óleo exige paralisação da viatura.',
    dica: 'Evidência 2: Tire aqui a foto da "Haste C/ Óleo" registrando nitidamente a película do líquido.',
    tag: 'Foto: Haste C/ Óleo',
    cor: 'emerald'
  }
];

export default function GuiaMedicaoVaretaOleo({ 
  isOpen, 
  onClose, 
  isGateMode = false, 
  onConfirmGate 
}) {
  const [passoAtivo, setPassoAtivo] = useState(0); // 0 a 4
  const [concordouChecklist, setConcordouChecklist] = useState(false);

  if (!isOpen) return null;

  const currentStep = PASSOS_MEDICAO[passoAtivo];

  const handleNext = () => {
    if (passoAtivo < PASSOS_MEDICAO.length - 1) {
      setPassoAtivo(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (passoAtivo > 0) {
      setPassoAtivo(prev => prev - 1);
    }
  };

  const handleConfirm = () => {
    if (onConfirmGate) {
      onConfirmGate();
    } else if (onClose) {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-5 bg-slate-950/85 backdrop-blur-md animate-in fade-in"
      onClick={!isGateMode ? onClose : undefined}
    >
      <div 
        className="relative w-full max-w-4xl max-h-[92vh] bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden animate-in zoom-in-95"
        onClick={e => e.stopPropagation()}
      >
        {/* CABEÇALHO */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 backdrop-blur-sm shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-500/20 shadow-xs">
              <Droplets size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-slate-900 dark:text-white text-base tracking-tight">
                  Passo a Passo de Medição da Vareta de Óleo
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                  Manual Oficial do Fabricante
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                {isGateMode 
                  ? 'Revise e confirme a execução dos 5 passos antes de preencher as medições do veículo'
                  : 'Procedimento técnico padronizado para aferição precisa e prevenção de falhas de motor'}
              </p>
            </div>
          </div>

          {!isGateMode && (
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors"
              title="Fechar Guia"
            >
              <X size={20} />
            </button>
          )}
        </div>

        {/* NAVEGAÇÃO DE PASSOS EM PÍLULAS / STEPPER */}
        <div className="px-5 sm:px-6 pt-3 pb-2 border-b border-slate-100 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/40">
          <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
            {PASSOS_MEDICAO.map((p, idx) => {
              const isSelected = idx === passoAtivo;
              const isPassed = idx < passoAtivo;
              return (
                <button
                  key={p.passo}
                  type="button"
                  onClick={() => setPassoAtivo(idx)}
                  className={`py-2 px-2 rounded-xl text-left transition-all border flex flex-col sm:flex-row items-center sm:items-start gap-1 sm:gap-2 ${
                    isSelected 
                      ? 'bg-amber-500 text-white border-amber-600 shadow-sm shadow-amber-500/20' 
                      : isPassed
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                        : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-amber-300'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 ${
                    isSelected 
                      ? 'bg-white text-amber-600' 
                      : isPassed 
                        ? 'bg-emerald-600 text-white' 
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                  }`}>
                    {isPassed ? <Check size={11} strokeWidth={3} /> : p.passo}
                  </div>
                  <div className="hidden sm:block truncate w-full">
                    <span className="block text-[11px] font-black truncate">{p.titulo}</span>
                    <span className={`block text-[9.5px] truncate ${isSelected ? 'text-white/80' : 'text-slate-400'}`}>
                      {p.tag}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* CORPO CENTRAL DO PASSO SELECIONADO */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
            
            {/* ILUSTRAÇÃO VETORIAL SVG ULTRA PREMIUM (Col 12 / 6) */}
            <div className="md:col-span-6 bg-gradient-to-b from-slate-50 to-slate-100/90 dark:from-slate-800/70 dark:to-slate-850/90 rounded-3xl p-5 border border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center min-h-[260px] sm:min-h-[300px] shadow-inner relative overflow-hidden">
              <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-white/90 dark:bg-slate-900/90 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 shadow-xs flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                <span>Passo {currentStep.passo} de 5</span>
              </div>

              {/* Renderização do Desenho Específico de cada Passo */}
              <IlustracaoPassoVetorial passo={currentStep.passo} />

              <div className="mt-3 text-center">
                <span className="inline-block px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                  {currentStep.tag}
                </span>
              </div>
            </div>

            {/* TEXTO EXPLICATIVO E DIRETRIZES TÉCNICAS (Col 12 / 6) */}
            <div className="md:col-span-6 space-y-4">
              <div>
                <span className="text-[11px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400 block mb-1">
                  Passo {currentStep.passo} • Manual do Fabricante
                </span>
                <h4 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                  {currentStep.titulo}
                </h4>
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-0.5">
                  {currentStep.subtitulo}
                </p>
              </div>

              {/* Descrição principal */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80">
                <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-200 leading-relaxed font-medium">
                  {currentStep.descricao}
                </p>
              </div>

              {/* Dica do Fabricante */}
              <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-start gap-3">
                <Info size={18} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-900 dark:text-amber-200 font-semibold leading-snug">
                  {currentStep.dica}
                </p>
              </div>

              {/* Destaque das Fotos Obrigatórias */}
              {currentStep.passo === 3 && (
                <div className="p-3 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 flex items-center gap-2.5 text-xs text-blue-900 dark:text-blue-200 font-bold">
                  <CheckCircle2 size={16} className="text-blue-600 shrink-0" />
                  <span>Foto Obrigatória: Haste Limpa (ponta higienizada com pano sem óleo).</span>
                </div>
              )}

              {currentStep.passo === 5 && (
                <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center gap-2.5 text-xs text-emerald-900 dark:text-emerald-200 font-bold">
                  <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                  <span>Foto Obrigatória: Haste C/ Óleo (após reinserir, mostrando a marcação).</span>
                </div>
              )}

              {/* Controles de Navegação Rápida (Anterior / Próximo) */}
              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={handlePrev}
                  disabled={passoAtivo === 0}
                  className="px-3.5 py-2 rounded-xl text-xs font-black text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 transition-all"
                >
                  <ChevronLeft size={16} />
                  <span>Passo Anterior</span>
                </button>

                <div className="text-[11px] font-bold text-slate-400">
                  {passoAtivo + 1} de 5
                </div>

                <button
                  type="button"
                  onClick={handleNext}
                  disabled={passoAtivo === PASSOS_MEDICAO.length - 1}
                  className="px-3.5 py-2 rounded-xl text-xs font-black bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 transition-all shadow-sm"
                >
                  <span>Próximo Passo</span>
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>

          </div>

          {/* CHECKLIST E GATE DE CONFORMIDADE OBRIGATÓRIA (SE FOR MODO GATE) */}
          {isGateMode && (
            <div className="mt-4 p-4 rounded-2xl bg-amber-500/10 border-2 border-amber-500/30 flex flex-col sm:flex-row items-center justify-between gap-4">
              <label className="flex items-start gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={concordouChecklist}
                  onChange={(e) => setConcordouChecklist(e.target.checked)}
                  className="mt-1 w-5 h-5 rounded-lg border-2 border-amber-500 text-amber-600 focus:ring-amber-500 accent-amber-500 cursor-pointer"
                />
                <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100 leading-snug">
                  Declaro que o veículo está <strong>estacionado em piso plano</strong>, o <strong>motor está frio (ou em repouso de 10 a 15 min)</strong> e que realizei a <strong>limpeza da vareta</strong> antes de conferir o nível.
                </span>
              </label>

              <button
                type="button"
                onClick={handleConfirm}
                disabled={!concordouChecklist}
                className={`w-full sm:w-auto px-6 py-3 rounded-2xl font-black text-xs sm:text-sm text-white shadow-lg transition-all flex items-center justify-center gap-2 whitespace-nowrap active:scale-95 ${
                  concordouChecklist 
                    ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/30 cursor-pointer'
                    : 'bg-slate-400 dark:bg-slate-700 cursor-not-allowed opacity-60'
                }`}
              >
                <CheckCircle2 size={18} />
                <span>Iniciar Medição / Aferição</span>
              </button>
            </div>
          )}
        </div>

        {/* RODAPÉ DO MODAL (SE FOR MODO INFORMATIVO) */}
        {!isGateMode && (
          <div className="px-6 py-3.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex items-center justify-between">
            <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5 font-medium">
              <ShieldCheck size={15} className="text-emerald-500" />
              <span>Seguir os 5 passos evita falsas leituras e protege o motor contra travamento.</span>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black text-xs hover:opacity-90 transition-opacity active:scale-95 shadow-md"
            >
              Entendido
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Renderizador Vetorial Dedicado para cada um dos 5 passos
 */
export function IlustracaoPassoVetorial({ passo }) {
  switch (passo) {
    case 1:
      return <SvgPasso1Plano />;
    case 2:
      return <SvgPasso2Repouso />;
    case 3:
      return <SvgPasso3Limpeza />;
    case 4:
      return <SvgPasso4Insercao />;
    case 5:
      return <SvgPasso5Leitura />;
    default:
      return <SvgPasso5Leitura />;
  }
}

/**
 * PASSO 1: Veículo em Piso Plano com Nível de Bolha
 */
function SvgPasso1Plano() {
  return (
    <svg width="260" height="180" viewBox="0 0 260 180" fill="none" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-sm">
      {/* Linha do solo / Piso plano */}
      <line x1="20" y1="140" x2="240" y2="140" stroke="#0ea5e9" strokeWidth="3" strokeDasharray="4,4" />
      <line x1="10" y1="142" x2="250" y2="142" stroke="#64748b" strokeWidth="2" />
      
      {/* Silhueta Estilizada do Veículo / Caminhão */}
      <rect x="50" y="70" width="110" height="50" rx="4" fill="#334155" />
      <path d="M 160 85 L 195 85 L 205 110 L 205 120 L 160 120 Z" fill="#475569" />
      <rect x="165" y="90" width="22" height="16" rx="2" fill="#93c5fd" />
      
      {/* Rodas */}
      <circle cx="80" cy="130" r="14" fill="#0f172a" stroke="#cbd5e1" strokeWidth="3" />
      <circle cx="80" cy="130" r="5" fill="#94a3b8" />
      <circle cx="180" cy="130" r="14" fill="#0f172a" stroke="#cbd5e1" strokeWidth="3" />
      <circle cx="180" cy="130" r="5" fill="#94a3b8" />

      {/* Cárter sob o motor */}
      <rect x="140" y="116" width="30" height="8" rx="2" fill="#b45309" opacity="0.9" />

      {/* Nível de Bolha Flutuante Superior */}
      <g transform="translate(70, 20)">
        <rect x="0" y="0" width="120" height="26" rx="13" fill="#0284c7" stroke="#38bdf8" strokeWidth="2" />
        <rect x="10" y="4" width="100" height="18" rx="9" fill="#0369a1" />
        {/* Linhas de calibração do nível */}
        <line x1="50" y1="4" x2="50" y2="22" stroke="#ffffff" strokeWidth="1.5" strokeOpacity="0.7" />
        <line x1="70" y1="4" x2="70" y2="22" stroke="#ffffff" strokeWidth="1.5" strokeOpacity="0.7" />
        {/* Bolha de Ar Centralizada (Indicando 0 graus de inclinação) */}
        <circle cx="60" cy="13" r="6" fill="#4ade80" />
        <circle cx="58" cy="11" r="2" fill="#ffffff" />
      </g>

      {/* Badge "Nivelamento 100%" */}
      <rect x="85" y="152" width="90" height="20" rx="10" fill="#10b981" />
      <text x="130" y="165" fontSize="9.5" fontWeight="900" fill="#ffffff" textAnchor="middle" fontFamily="sans-serif">
        TERRENO PLANO OK
      </text>
    </svg>
  );
}

/**
 * PASSO 2: Aguarde o Óleo Descer (Motor Frio / 10 a 15 Minutos)
 */
function SvgPasso2Repouso() {
  return (
    <svg width="260" height="180" viewBox="0 0 260 180" fill="none" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-sm">
      {/* Relógio / Cronômetro de 10-15 min */}
      <circle cx="95" cy="85" r="46" fill="#1e293b" stroke="#6366f1" strokeWidth="4" />
      <circle cx="95" cy="85" r="40" fill="#0f172a" />
      
      {/* Arco de 15 minutos destacado (1/4 de volta) */}
      <path d="M 95 45 A 40 40 0 0 1 135 85 L 95 85 Z" fill="#6366f1" opacity="0.35" />
      <line x1="95" y1="85" x2="95" y2="55" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="95" y1="85" x2="120" y2="85" stroke="#818cf8" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="95" cy="85" r="4" fill="#ffffff" />

      {/* Indicador de 10 a 15 min */}
      <rect x="65" y="142" width="60" height="20" rx="10" fill="#6366f1" />
      <text x="95" y="155" fontSize="9.5" fontWeight="900" fill="#ffffff" textAnchor="middle" fontFamily="sans-serif">
        10 A 15 MIN
      </text>

      {/* Bloco de Motor Esquemático com Gotas Decantando no Cárter */}
      <g transform="translate(160, 40)">
        <rect x="0" y="10" width="70" height="55" rx="5" fill="#334155" stroke="#475569" strokeWidth="2" />
        {/* Tampa de Válvulas */}
        <path d="M 5 10 L 15 0 L 55 0 L 65 10 Z" fill="#1e293b" />
        
        {/* Gotas de óleo escorrendo para a base */}
        <circle cx="20" cy="30" r="3" fill="#f59e0b" />
        <circle cx="35" cy="42" r="3.5" fill="#f59e0b" />
        <circle cx="50" cy="34" r="3" fill="#f59e0b" />

        {/* Cárter na parte inferior cheio */}
        <rect x="8" y="65" width="54" height="22" rx="4" fill="#b45309" stroke="#92400e" strokeWidth="1.5" />
        <text x="35" y="79" fontSize="8" fontWeight="bold" fill="#fef08a" textAnchor="middle" fontFamily="sans-serif">
          CÁRTER
        </text>
      </g>

      {/* Termômetro Frio */}
      <g transform="translate(20, 50)">
        <rect x="8" y="0" width="8" height="45" rx="4" fill="#0284c7" />
        <circle cx="12" cy="50" r="10" fill="#0284c7" />
        <circle cx="12" cy="50" r="6" fill="#38bdf8" />
        <line x1="12" y1="15" x2="12" y2="45" stroke="#38bdf8" strokeWidth="3" />
      </g>
    </svg>
  );
}

/**
 * PASSO 3: Localize e Limpe a Vareta (Haste Limpa com Pano sem Fiapos)
 */
function SvgPasso3Limpeza() {
  return (
    <svg width="260" height="180" viewBox="0 0 260 180" fill="none" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-sm">
      {/* Puxador com Anel Amarelo no topo */}
      <circle cx="50" cy="35" r="18" fill="#eab308" stroke="#ca8a04" strokeWidth="4" />
      <circle cx="50" cy="35" r="9" fill="#0f172a" />
      <rect x="46" y="50" width="8" height="16" fill="#ca8a04" rx="2" />

      {/* Haste de Aço Inoxidável descendo na diagonal */}
      <line x1="50" y1="65" x2="190" y2="135" stroke="#cbd5e1" strokeWidth="6" strokeLinecap="round" />
      <line x1="50" y1="65" x2="190" y2="135" stroke="#64748b" strokeWidth="1.5" strokeDasharray="3,3" />

      {/* Lâmina hachurada da ponta */}
      <rect x="175" y="125" width="30" height="12" rx="3" transform="rotate(27 175 125)" fill="#94a3b8" stroke="#475569" strokeWidth="1.5" />

      {/* Pano / Flanela Branca Limpando a Ponta */}
      <g transform="translate(145, 95)">
        <path 
          d="M 10 15 
             C 10 0, 45 -5, 55 12 
             C 65 25, 50 45, 35 45 
             C 20 45, 10 30, 10 15 Z" 
          fill="#f8fafc" 
          stroke="#94a3b8" 
          strokeWidth="2" 
        />
        {/* Dobras da flanela */}
        <path d="M 22 15 C 30 18, 42 16, 48 24" stroke="#cbd5e1" strokeWidth="2" strokeLinecap="round" />
        <path d="M 20 28 C 26 32, 38 30, 42 36" stroke="#cbd5e1" strokeWidth="1.5" strokeLinecap="round" />
      </g>

      {/* Brilhos de Limpeza / Limpo */}
      <g transform="translate(205, 120)">
        <path d="M 0 -8 L 2 -2 L 8 0 L 2 2 L 0 8 L -2 2 L -8 0 L -2 -2 Z" fill="#38bdf8" />
      </g>
      <g transform="translate(180, 80)">
        <path d="M 0 -6 L 1.5 -1.5 L 6 0 L 1.5 1.5 L 0 6 L -1.5 1.5 L -6 0 L -1.5 -1.5 Z" fill="#eab308" />
      </g>

      {/* Etiqueta HASTE LIMPA */}
      <rect x="135" y="150" width="110" height="22" rx="11" fill="#f59e0b" />
      <text x="190" y="164" fontSize="10" fontWeight="900" fill="#ffffff" textAnchor="middle" fontFamily="sans-serif">
        PONTO DA FOTO 1
      </text>
    </svg>
  );
}

/**
 * PASSO 4: Insira Novamente até o Fundo
 */
function SvgPasso4Insercao() {
  return (
    <svg width="260" height="180" viewBox="0 0 260 180" fill="none" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-sm">
      {/* Tubo Guia / Bocal do Motor */}
      <g transform="translate(100, 60)">
        {/* Bocal superior metálico */}
        <rect x="15" y="0" width="30" height="14" rx="2" fill="#475569" stroke="#1e293b" strokeWidth="2" />
        {/* Tubo de inserção curvado suave */}
        <path d="M 22 14 L 22 90 C 22 105, 40 115, 55 120" stroke="#334155" strokeWidth="12" strokeLinecap="round" fill="none" />
        <path d="M 22 14 L 22 90 C 22 105, 40 115, 55 120" stroke="#94a3b8" strokeWidth="4" strokeLinecap="round" fill="none" />
      </g>

      {/* Vareta de Óleo sendo empurrada para baixo */}
      <g transform="translate(110, 10)">
        {/* Puxador amarelo */}
        <circle cx="20" cy="18" r="14" fill="#eab308" stroke="#ca8a04" strokeWidth="3" />
        <circle cx="20" cy="18" r="7" fill="#0f172a" />
        
        {/* Tampa do bujão */}
        <rect x="10" y="32" width="20" height="10" rx="2" fill="#334155" />
        
        {/* Haste de aço entrando no tubo */}
        <line x1="20" y1="42" x2="20" y2="120" stroke="#f1f5f9" strokeWidth="4" />
      </g>

      {/* Setas Indicadoras de Inserção Descendente */}
      <g transform="translate(60, 45)">
        <line x1="15" y1="0" x2="15" y2="40" stroke="#a855f7" strokeWidth="4" strokeLinecap="round" />
        <polygon points="5,40 25,40 15,55" fill="#a855f7" />
        <text x="15" y="72" fontSize="9" fontWeight="bold" fill="#a855f7" textAnchor="middle" fontFamily="sans-serif">
          ATÉ O FUNDO
        </text>
      </g>

      {/* Retirar com Cuidado */}
      <g transform="translate(180, 50)">
        <line x1="15" y1="55" x2="15" y2="15" stroke="#10b981" strokeWidth="3" strokeLinecap="round" strokeDasharray="3,3" />
        <polygon points="5,15 25,15 15,0" fill="#10b981" />
        <text x="15" y="75" fontSize="9" fontWeight="bold" fill="#10b981" textAnchor="middle" fontFamily="sans-serif">
          RETIRAR
        </text>
      </g>
    </svg>
  );
}

/**
 * PASSO 5: Confira o Nível entre as Marcas (Haste C/ Óleo)
 */
function SvgPasso5Leitura() {
  return (
    <svg width="260" height="180" viewBox="0 0 260 180" fill="none" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-sm">
      <defs>
        {/* Hachurado Crosshatch */}
        <pattern id="guia_step5_hatch" width="6" height="6" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
          <line x1="0" y1="0" x2="0" y2="6" stroke="#475569" strokeWidth="0.8" opacity="0.6" />
          <line x1="0" y1="0" x2="6" y2="0" stroke="#475569" strokeWidth="0.8" opacity="0.6" />
        </pattern>
        {/* Gradiente Dourado do Óleo */}
        <linearGradient id="guia_step5_oil" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#b45309" />
          <stop offset="50%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#92400e" />
        </linearGradient>
      </defs>

      {/* Haste de Aço Central Ampliada */}
      <rect x="118" y="10" width="24" height="40" fill="#cbd5e1" stroke="#475569" strokeWidth="1.5" />

      {/* Lâmina Achada de Medição */}
      <rect x="114" y="50" width="32" height="110" rx="4" fill="#e2e8f0" stroke="#334155" strokeWidth="2" />
      {/* Textura de hachura no fundo */}
      <rect x="115" y="52" width="30" height="106" fill="url(#guia_step5_hatch)" />

      {/* Filme de Óleo Dourado Cobrindo do meio para baixo (Nível Ideal) */}
      <rect x="115" y="85" width="30" height="73" fill="url(#guia_step5_oil)" opacity="0.9" />
      <rect x="115" y="85" width="30" height="73" fill="url(#guia_step5_hatch)" opacity="0.3" />
      <line x1="115" y1="85" x2="145" y2="85" stroke="#fef08a" strokeWidth="2.5" />

      {/* Linha e Marcação MAX */}
      <line x1="100" y1="70" x2="114" y2="70" stroke="#1e293b" strokeWidth="2" />
      <text x="75" y="74" fontSize="10" fontWeight="900" fill="#1e293b" fontFamily="sans-serif">MÁX</text>

      {/* Faixa Ideal Recomendada */}
      <rect x="152" y="70" width="85" height="60" rx="6" fill="#10b981" opacity="0.15" stroke="#10b981" strokeWidth="1.5" strokeDasharray="3,3" />
      <text x="195" y="96" fontSize="9" fontWeight="900" fill="#047857" textAnchor="middle" fontFamily="sans-serif">
        FAIXA IDEAL
      </text>
      <text x="195" y="108" fontSize="8" fontWeight="bold" fill="#047857" textAnchor="middle" fontFamily="sans-serif">
        (Entre Mín e Máx)
      </text>

      {/* Linha e Marcação MIN */}
      <line x1="100" y1="130" x2="114" y2="130" stroke="#1e293b" strokeWidth="2" />
      <text x="75" y="134" fontSize="10" fontWeight="900" fill="#1e293b" fontFamily="sans-serif">MÍN</text>

      {/* Ponta inferior do bico */}
      <path d="M 115 158 C 115 168, 145 168, 145 158 Z" fill="#b45309" stroke="#334155" strokeWidth="1.5" />

      {/* Etiqueta HASTE C/ ÓLEO */}
      <rect x="75" y="152" width="110" height="22" rx="11" fill="#10b981" />
      <text x="130" y="166" fontSize="10" fontWeight="900" fill="#ffffff" textAnchor="middle" fontFamily="sans-serif">
        PONTO DA FOTO 2
      </text>
    </svg>
  );
}
