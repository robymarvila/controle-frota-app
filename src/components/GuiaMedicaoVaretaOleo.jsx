import React, { useState } from 'react';
import { 
  X, Info, AlertTriangle, CheckCircle2, AlertCircle, 
  HelpCircle, BookOpen, Layers, Sparkles, ArrowRight, Eye, Droplets
} from 'lucide-react';

/**
 * Componente Ilustrado de Guia de Medição da Vareta de Óleo.
 * Apresenta a ilustração vetorial interativa das 3 medições (conforme o manual do veículo):
 * 1. Medição Enganosa pela Manhã (Motor frio)
 * 2. Medição Real (Após ligar o motor por 2-3 minutos)
 * 3. Nível Ideal (Após completar)
 * Inclui também aba para alternar para a imagem original do manual.
 */
export default function GuiaMedicaoVaretaOleo({ isOpen, onClose }) {
  const [activeTab, setActiveTab] = useState('ilustracao'); // 'ilustracao' | 'manual'
  const [selectedStick, setSelectedStick] = useState(2); // 1, 2 ou 3 selecionado para foco

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-5 bg-slate-950/85 backdrop-blur-md animate-in fade-in"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-4xl max-h-[92vh] bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden animate-in zoom-in-95"
        onClick={e => e.stopPropagation()}
      >
        {/* CABEÇALHO MODAL */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 backdrop-blur-sm">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-500/20">
              <Droplets size={20} />
            </div>
            <div>
              <h3 className="font-black text-slate-900 dark:text-white text-base tracking-tight flex items-center gap-2">
                Guia de Medição da Vareta de Óleo
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-100 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                  Manual Oficial
                </span>
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                Procedimento padrão para evitar leituras falsas e proteger o motor do veículo
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Seletor de Abas */}
            <div className="inline-flex p-1 rounded-xl bg-slate-200/80 dark:bg-slate-800 border border-slate-300/50 dark:border-slate-700/60 text-xs">
              <button
                type="button"
                onClick={() => setActiveTab('ilustracao')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-black transition-all ${
                  activeTab === 'ilustracao'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Sparkles size={13} className={activeTab === 'ilustracao' ? 'text-amber-500' : ''} />
                <span>Ilustração Didática</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('manual')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-black transition-all ${
                  activeTab === 'manual'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <BookOpen size={13} className={activeTab === 'manual' ? 'text-blue-500' : ''} />
                <span>Foto do Manual</span>
              </button>
            </div>

            {/* Fechar */}
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors ml-1"
              title="Fechar Guia"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* CORPO DO MODAL */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {activeTab === 'ilustracao' ? (
            <>
              {/* ALERTA DE DESTAQUE PRINCIPAL */}
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3.5">
                <AlertTriangle className="text-amber-500 shrink-0 mt-0.5" size={20} />
                <div className="space-y-1 text-xs">
                  <strong className="text-amber-900 dark:text-amber-200 font-black text-sm block">
                    Por que a medição pela manhã é perigosa e enganosa?
                  </strong>
                  <p className="text-amber-800 dark:text-amber-300/90 leading-relaxed">
                    Quando o veículo fica estacionado à noite toda, <strong>todo o óleo escorre para o fundo do cárter</strong>. 
                    Ao puxar a vareta logo cedo com o motor frio, ela aparenta estar com nível máximo, 
                    <strong> mesmo se o motor estiver precisando urgentemente de óleo</strong>. 
                    O manual exige ligar o motor por 2 a 3 minutos antes da verificação!
                  </p>
                </div>
              </div>

              {/* GRADE DAS 3 VARETAS ILUSTRADAS */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* 1. MEDIÇÃO ENGANOSA PELA MANHÃ */}
                <div 
                  onClick={() => setSelectedStick(1)}
                  className={`cursor-pointer rounded-2xl p-4 border-2 transition-all flex flex-col items-center text-center relative overflow-hidden ${
                    selectedStick === 1
                      ? 'border-rose-500 bg-rose-50/50 dark:bg-rose-950/30 ring-2 ring-rose-300 dark:ring-rose-800 shadow-lg'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 hover:border-rose-300'
                  }`}
                >
                  <div className="w-full flex items-center justify-between mb-2">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
                      1. Falso Cheio
                    </span>
                    <span className="text-[10px] font-bold text-slate-400">Motor Frio</span>
                  </div>

                  <h4 className="font-black text-slate-900 dark:text-white text-xs uppercase tracking-wide">
                    Medição Enganosa
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mb-3">
                    Pela manhã antes de ligar
                  </p>

                  {/* ILUSTRAÇÃO SVG VETORIAL - VARETA 1 */}
                  <div className="py-2 flex justify-center">
                    <VaretaSvg nivel="cheio" tipo="falso" />
                  </div>

                  <div className="mt-3 p-2.5 rounded-xl bg-white dark:bg-slate-900/80 border border-rose-200 dark:border-rose-900/50 w-full text-left">
                    <div className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400 font-bold text-[11px] mb-1">
                      <X size={13} />
                      <span>Não confie nesta leitura!</span>
                    </div>
                    <p className="text-[10.5px] text-slate-600 dark:text-slate-300 leading-tight">
                      Óleo acumulado no cárter durante horas de repouso cria a ilusão de nível ideal.
                    </p>
                  </div>
                </div>

                {/* 2. MEDIÇÃO REAL (APÓS LIGAR 2-3 MINUTOS) */}
                <div 
                  onClick={() => setSelectedStick(2)}
                  className={`cursor-pointer rounded-2xl p-4 border-2 transition-all flex flex-col items-center text-center relative overflow-hidden ${
                    selectedStick === 2
                      ? 'border-amber-500 bg-amber-50/50 dark:bg-amber-950/30 ring-2 ring-amber-300 dark:ring-amber-800 shadow-lg'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 hover:border-amber-300'
                  }`}
                >
                  <div className="w-full flex items-center justify-between mb-2">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                      2. Nível Real
                    </span>
                    <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400">Manual</span>
                  </div>

                  <h4 className="font-black text-slate-900 dark:text-white text-xs uppercase tracking-wide">
                    Após Ligar 2 a 3 Min
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mb-3">
                    Conforme o manual do fabricante
                  </p>

                  {/* ILUSTRAÇÃO SVG VETORIAL - VARETA 2 */}
                  <div className="py-2 flex justify-center">
                    <VaretaSvg nivel="baixo" tipo="real" />
                  </div>

                  <div className="mt-3 p-2.5 rounded-xl bg-white dark:bg-slate-900/80 border border-amber-200 dark:border-amber-900/50 w-full text-left">
                    <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-bold text-[11px] mb-1">
                      <AlertTriangle size={13} />
                      <span>Revela o nível verdadeiro!</span>
                    </div>
                    <p className="text-[10.5px] text-slate-600 dark:text-slate-300 leading-tight">
                      O óleo circulou pelo motor e filtro. Revela se a viatura está com nível baixo ou sem óleo.
                    </p>
                  </div>
                </div>

                {/* 3. NÍVEL IDEAL APÓS COMPLETAR */}
                <div 
                  onClick={() => setSelectedStick(3)}
                  className={`cursor-pointer rounded-2xl p-4 border-2 transition-all flex flex-col items-center text-center relative overflow-hidden ${
                    selectedStick === 3
                      ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30 ring-2 ring-emerald-300 dark:ring-emerald-800 shadow-lg'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 hover:border-emerald-300'
                  }`}
                >
                  <div className="w-full flex items-center justify-between mb-2">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                      3. Nível Ideal
                    </span>
                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">Protegido</span>
                  </div>

                  <h4 className="font-black text-slate-900 dark:text-white text-xs uppercase tracking-wide">
                    Após Completar
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mb-3">
                    Nível ideal conforme o manual
                  </p>

                  {/* ILUSTRAÇÃO SVG VETORIAL - VARETA 3 */}
                  <div className="py-2 flex justify-center">
                    <VaretaSvg nivel="ideal" tipo="completo" />
                  </div>

                  <div className="mt-3 p-2.5 rounded-xl bg-white dark:bg-slate-900/80 border border-emerald-200 dark:border-emerald-900/50 w-full text-left">
                    <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold text-[11px] mb-1">
                      <CheckCircle2 size={13} />
                      <span>Motor 100% Protegido</span>
                    </div>
                    <p className="text-[10.5px] text-slate-600 dark:text-slate-300 leading-tight">
                      Óleo preenche a faixa hachurada recomendada, entre o mínimo e o máximo seguro.
                    </p>
                  </div>
                </div>
              </div>

              {/* PASSO A PASSO OPERACIONAL RECOMENDADO */}
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-100/80 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80">
                <h5 className="font-black text-xs uppercase tracking-wider text-slate-700 dark:text-slate-200 mb-3 flex items-center gap-2">
                  <CheckCircle2 size={15} className="text-emerald-500" />
                  Procedimento Operacional Padrão (POP) em 3 Passos:
                </h5>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <span className="w-5 h-5 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-[10px] font-black inline-flex items-center justify-center mb-1.5">
                      1
                    </span>
                    <strong className="block text-slate-900 dark:text-white font-bold mb-1">Piso Plano e Nivelado</strong>
                    <p className="text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed">
                      Estacione a viatura em terreno 100% plano para evitar desvio no ângulo da vareta.
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <span className="w-5 h-5 rounded-full bg-amber-500 text-white text-[10px] font-black inline-flex items-center justify-center mb-1.5">
                      2
                    </span>
                    <strong className="block text-slate-900 dark:text-white font-bold mb-1">Ligar 2 a 3 Minutos</strong>
                    <p className="text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed">
                      Dê a partida, deixe em marcha lenta por 2 a 3 min. Desligue e aguarde 1 minuto.
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <span className="w-5 h-5 rounded-full bg-emerald-500 text-white text-[10px] font-black inline-flex items-center justify-center mb-1.5">
                      3
                    </span>
                    <strong className="block text-slate-900 dark:text-white font-bold mb-1">Limpar e Checar</strong>
                    <p className="text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed">
                      Puxe a vareta, limpe com pano seco, recoloque até o fundo e retire para conferir a hachura.
                    </p>
                  </div>
                </div>
              </div>
            </>
          ) : (
            /* ABA 2: FOTO ORIGINAL DO MANUAL TÉCNICO */
            <div className="flex flex-col items-center space-y-4 py-2">
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border-2 border-slate-200 dark:border-slate-700 shadow-inner max-w-xl w-full flex justify-center">
                <img 
                  src="/assets/guia_nivel_oleo.png" 
                  alt="Esquema Oficial do Manual Técnico do Veículo"
                  className="max-h-[58vh] w-auto object-contain rounded-xl shadow-md"
                />
              </div>

              <div className="max-w-xl w-full p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200 space-y-1.5">
                <div className="flex items-center gap-1.5 font-black text-amber-800 dark:text-amber-300">
                  <Info size={15} />
                  <span>Legenda Técnica da Imagem do Manual:</span>
                </div>
                <ul className="list-disc list-inside space-y-1 text-[11px] text-amber-800/90 dark:text-amber-300/90 pl-1">
                  <li><strong>Esquerda (Medição Enganosa):</strong> Realizada pela manhã com motor totalmente frio. A vareta parece conter quantidade recomendada.</li>
                  <li><strong>Centro (Após 2-3 Minutos):</strong> Mostra a queda acentuada do nível ao ligar o motor, revelando que a viatura precisa de óleo.</li>
                  <li><strong>Direita (Após Completar):</strong> Nível ideal e seguro atingindo a área hachurada de segurança conforme especificado pelo manual.</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* RODAPÉ DO MODAL */}
        <div className="px-6 py-3.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex items-center justify-between">
          <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5 font-medium">
            <HelpCircle size={14} className="text-slate-400" />
            <span>Consulte o manual da viatura para a viscosidade correta (ex: 5W30, 10W40).</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black text-xs hover:opacity-90 transition-opacity active:scale-95 shadow-md"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Desenho Vetorial SVG de Alta Resolução da Vareta de Óleo.
 * Renderiza a tampa metálica com rosca, haste de aço e a ponta hachurada com o líquido dourado.
 */
function VaretaSvg({ nivel = 'ideal', tipo = 'completo' }) {
  // Configuração de altura do óleo na ponta hachurada
  // Altura total da ponta hachurada no SVG: y=130 a y=200 (70px)
  let oilFillHeight = 65; // 'cheio' / 'ideal'
  let oilFillY = 135;
  let oilGradientId = 'oilGradIdeal';

  if (nivel === 'baixo') {
    oilFillHeight = 15;
    oilFillY = 185;
    oilGradientId = 'oilGradLow';
  } else if (nivel === 'cheio' && tipo === 'falso') {
    oilFillHeight = 65;
    oilFillY = 135;
    oilGradientId = 'oilGradFalse';
  }

  // Identificador exclusivo para isolar elementos no DOM do iOS WebKit
  const uid = `v_${nivel}_${tipo}`;
  const clipId = `${uid}_clip`;
  const capId = `${uid}_cap`;
  const stemId = `${uid}_stem`;
  const bladeId = `${uid}_blade`;
  const patternId = `${uid}_hatch`;
  const oilId = `${uid}_oil`;

  return (
    <svg width="120" height="240" viewBox="0 0 120 240" fill="none" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-md">
      <defs>
        {/* Padrão Hachurado (Crosshatch Pattern) da Vareta */}
        <pattern id={patternId} width="6" height="6" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
          <line x1="0" y1="0" x2="0" y2="6" stroke="#475569" strokeWidth="0.8" opacity="0.45" />
          <line x1="0" y1="0" x2="6" y2="0" stroke="#475569" strokeWidth="0.8" opacity="0.45" />
        </pattern>

        {/* Gradiente Metálico da Tampa */}
        <linearGradient id={capId} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#1e293b" />
          <stop offset="35%" stopColor="#475569" />
          <stop offset="70%" stopColor="#1e293b" />
          <stop offset="100%" stopColor="#0f172a" />
        </linearGradient>

        {/* Gradiente da Haste de Aço */}
        <linearGradient id={stemId} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#94a3b8" />
          <stop offset="45%" stopColor="#f1f5f9" />
          <stop offset="75%" stopColor="#94a3b8" />
          <stop offset="100%" stopColor="#64748b" />
        </linearGradient>

        {/* Gradiente Dourado do Óleo */}
        <linearGradient id={oilId} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#b45309" />
          <stop offset="40%" stopColor="#fbbf24" />
          <stop offset="70%" stopColor="#f59e0b" />
          <stop offset="100%" stopColor="#92400e" />
        </linearGradient>

        {/* Sombra de corte da ponta */}
        <linearGradient id={bladeId} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#cbd5e1" />
          <stop offset="50%" stopColor="#f8fafc" />
          <stop offset="100%" stopColor="#94a3b8" />
        </linearGradient>

        {/* ClipPath isolado dentro do defs para conformidade estrita */}
        <clipPath id={clipId}>
          <path d="M 53 133 L 67 133 L 67 199 C 67 202, 53 202, 53 199 Z" />
        </clipPath>
      </defs>

      {/* 1. TAMPA SUPERIOR DO PLUG / BUJÃO */}
      <rect x="36" y="8" width="48" height="20" rx="3" fill={`url(#${capId})`} stroke="#0f172a" strokeWidth="1.5" />
      <rect x="28" y="28" width="64" height="14" rx="2" fill={`url(#${capId})`} stroke="#0f172a" strokeWidth="1.5" />
      
      {/* Roscas do bujão */}
      <rect x="34" y="42" width="52" height="16" rx="2" fill="#334155" stroke="#0f172a" strokeWidth="1" />
      <line x1="34" y1="46" x2="86" y2="48" stroke="#cbd5e1" strokeWidth="2" strokeLinecap="round" />
      <line x1="34" y1="52" x2="86" y2="54" stroke="#cbd5e1" strokeWidth="2" strokeLinecap="round" />

      {/* 2. HASTE DE AÇO PRINCIPAL */}
      <rect x="56" y="58" width="8" height="74" fill={`url(#${stemId})`} stroke="#475569" strokeWidth="1" />

      {/* 3. LÂMINA / PONTA ACHATADA DA VARETA (ÁREA DE MEDIÇÃO) */}
      <path 
        d="M 52 132 
           C 52 130, 68 130, 68 132 
           L 68 200 
           C 68 204, 52 204, 52 200 
           Z" 
        fill={`url(#${bladeId})`} 
        stroke="#334155" 
        strokeWidth="1.5" 
      />

      {/* Textura de Hachura de Fundo na Lâmina */}
      <path 
        d="M 53 133 L 67 133 L 67 199 L 53 199 Z" 
        fill={`url(#${patternId})`} 
      />

      {/* 4. PREENCHIMENTO DO LÍQUIDO DE ÓLEO */}
      <g clipPath={`url(#${clipId})`}>
        {/* Nível do Óleo Dourado */}
        <rect 
          x="53" 
          y={oilFillY} 
          width="14" 
          height={oilFillHeight} 
          fill={`url(#${oilId})`} 
          opacity="0.9"
        />

        {/* Hachura sobreposta ao óleo para manter visual do manual */}
        <rect 
          x="53" 
          y={oilFillY} 
          width="14" 
          height={oilFillHeight} 
          fill={`url(#${patternId})`} 
          opacity="0.4"
        />

        {/* Linha de reflexo do óleo */}
        <line 
          x1="53" 
          y1={oilFillY} 
          x2="67" 
          y2={oilFillY} 
          stroke="#fef08a" 
          strokeWidth="1.5" 
        />
      </g>

      {/* Ponta arredondada inferior (Bico) */}
      <path d="M 54 200 C 54 206, 66 206, 66 200 Z" fill="#b45309" stroke="#334155" strokeWidth="1" />

      {/* MARCADORES TEXTUAIS LATERAIS (MAX / MIN) */}
      <line x1="72" y1="135" x2="80" y2="135" stroke="#334155" strokeWidth="1.5" />
      <text x="83" y="138" fontSize="8" fontWeight="bold" fill="#475569" fontFamily="sans-serif">MAX</text>

      <line x1="72" y1="185" x2="80" y2="185" stroke="#334155" strokeWidth="1.5" />
      <text x="83" y="188" fontSize="8" fontWeight="bold" fill="#475569" fontFamily="sans-serif">MIN</text>

      {/* ETIQUETA INFORMATIVA FLUTUANTE */}
      {nivel === 'baixo' && (
        <g>
          <line x1="26" y1="186" x2="50" y2="186" stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="2,2" />
          <circle cx="24" cy="186" r="3" fill="#f59e0b" />
          <text x="5" y="174" fontSize="8" fontWeight="900" fill="#d97706" fontFamily="sans-serif">NÍVEL BAIXO</text>
        </g>
      )}

      {nivel === 'cheio' && tipo === 'falso' && (
        <g>
          <line x1="26" y1="136" x2="50" y2="136" stroke="#ef4444" strokeWidth="1.5" strokeDasharray="2,2" />
          <circle cx="24" cy="136" r="3" fill="#ef4444" />
          <text x="2" y="124" fontSize="7.5" fontWeight="900" fill="#dc2626" fontFamily="sans-serif">FALSO CHEIO</text>
        </g>
      )}

      {nivel === 'ideal' && (
        <g>
          <line x1="26" y1="145" x2="50" y2="145" stroke="#10b981" strokeWidth="1.5" strokeDasharray="2,2" />
          <circle cx="24" cy="145" r="3" fill="#10b981" />
          <text x="12" y="132" fontSize="8" fontWeight="900" fill="#059669" fontFamily="sans-serif">IDEAL</text>
        </g>
      )}
    </svg>
  );
}
