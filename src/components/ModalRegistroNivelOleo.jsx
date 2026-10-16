import React, { useState, useMemo } from 'react';
import { 
  Droplets, Camera, Image as ImageIcon, CheckCircle2, AlertTriangle, 
  Flame, X, ZoomIn, Trash2, Car, Gauge, Info, Loader2, Sparkles, 
  AlertCircle, Waves, ArrowRight, ShieldCheck, Check, ChevronLeft, BookOpen
} from 'lucide-react';
import { capturePhotoUnified } from '../utils/photoCapture';
import { supabase } from '../supabaseClient';
import GuiaMedicaoVaretaOleo, { PASSOS_MEDICAO, IlustracaoPassoVetorial } from './GuiaMedicaoVaretaOleo';
import SearchableSelect from './SearchableSelect';

export default function ModalRegistroNivelOleo({
  isOpen,
  onClose,
  vehicles = [],
  currentUser,
  onSuccess,
  onPreviewImage
}) {
  // Etapa do fluxo: 'gate' (instruções ilustradas e ciência obrigatória) ou 'formulario' (preenchimento)
  const [etapaFluxo, setEtapaFluxo] = useState('gate');
  const [passoAtivoGate, setPassoAtivoGate] = useState(0);
  const [concordouGate, setConcordouGate] = useState(false);

  // Campos do Formulário
  const [placa, setPlaca] = useState('');
  const [nivelOleo, setNivelOleo] = useState(null); // 1 = Normal | 2 = Baixo | 3 = Sem Óleo
  const [nivelAgua, setNivelAgua] = useState(null); // 'Alto' | 'Médio' | 'Baixo'
  const [hodometro, setHodometro] = useState('');
  const [observacoes, setObservacoes] = useState('');
  
  // 5 Evidências Fotográficas Obrigatórias
  const [fotos, setFotos] = useState({
    frente: null,
    hodometro: null,
    hasteLimpa: null,
    hasteComOleo: null,
    reservatorioAgua: null
  });

  const [loadingSlot, setLoadingSlot] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const [erroMsg, setErroMsg] = useState('');
  const [showGuiaModal, setShowGuiaModal] = useState(false);

  // Opções para o SearchableSelect com marca, modelo e regional
  const vehicleOptions = useMemo(() => {
    return (vehicles || []).map(v => ({
      value: v.placa,
      label: v.placa,
      subLabel: `${v.marca || ''} ${v.modelo || v.subTipo || ''} • ${v.regional || 'Norte'}`.trim()
    }));
  }, [vehicles]);

  // Veículo selecionado
  const selectedVehicle = useMemo(() => {
    if (!placa) return null;
    return (vehicles || []).find(v => (v.placa || '').toUpperCase() === String(placa).toUpperCase()) || null;
  }, [placa, vehicles]);

  // Manipulador de seleção de placa (auto-preenche hodômetro se vazio)
  const handlePlacaChange = (newPlaca) => {
    setPlaca(newPlaca);
    if (newPlaca) {
      const v = (vehicles || []).find(item => (item.placa || '').toUpperCase() === String(newPlaca).toUpperCase());
      if (v && (v.km_atual || v.hodometro)) {
        if (!hodometro) {
          setHodometro(String(v.km_atual || v.hodometro));
        }
      }
    }
  };

  // Último KM conhecido do veículo
  const ultimoKmRegistrado = useMemo(() => {
    if (!selectedVehicle) return null;
    const km = Number(selectedVehicle.km_atual || selectedVehicle.hodometro || 0);
    return km > 0 ? km : null;
  }, [selectedVehicle]);

  // Alerta não impeditivo de KM inferior
  const isKmMenorQueAnterior = useMemo(() => {
    if (!ultimoKmRegistrado || !hodometro) return false;
    const kmNum = Number(String(hodometro).replace(/\D/g, ''));
    return kmNum > 0 && kmNum < ultimoKmRegistrado;
  }, [ultimoKmRegistrado, hodometro]);

  if (!isOpen) return null;

  // Reset e Fechamento
  const handleCloseModal = () => {
    setEtapaFluxo('gate');
    setPassoAtivoGate(0);
    setConcordouGate(false);
    setPlaca('');
    setNivelOleo(null);
    setNivelAgua(null);
    setHodometro('');
    setObservacoes('');
    setFotos({
      frente: null,
      hodometro: null,
      hasteLimpa: null,
      hasteComOleo: null,
      reservatorioAgua: null
    });
    setErroMsg('');
    onClose();
  };

  // Captura de Foto com compressor unificado
  const handleCapture = async (slot, sourceMode) => {
    try {
      setLoadingSlot(slot);
      setErroMsg('');
      const dataUrl = await capturePhotoUnified(sourceMode);
      if (dataUrl) {
        setFotos(prev => ({ ...prev, [slot]: dataUrl }));
      }
    } catch (err) {
      console.error('Erro na captura da foto:', err);
      setErroMsg('Não foi possível capturar a foto. Tente novamente.');
    } finally {
      setLoadingSlot(null);
    }
  };

  const handleRemoveFoto = (slot) => {
    setFotos(prev => ({ ...prev, [slot]: null }));
  };

  // Total de fotos preenchidas
  const totalFotosAnexadas = 
    (fotos.frente ? 1 : 0) + 
    (fotos.hodometro ? 1 : 0) + 
    (fotos.hasteLimpa ? 1 : 0) + 
    (fotos.hasteComOleo ? 1 : 0) + 
    (fotos.reservatorioAgua ? 1 : 0);

  // Submissão do Registro Completo
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErroMsg('');

    if (!placa) {
      setErroMsg('Selecione a placa do veículo.');
      return;
    }
    if (!nivelOleo) {
      setErroMsg('Selecione o nível de óleo do motor (Normal, Baixo ou Sem Óleo).');
      return;
    }
    if (!nivelAgua) {
      setErroMsg('Selecione o nível de água no reservatório (Alto, Médio ou Baixo).');
      return;
    }
    const kmNum = Number(String(hodometro).replace(/\D/g, ''));
    if (!kmNum || kmNum <= 0) {
      setErroMsg('Informe um hodômetro (KM) válido.');
      return;
    }

    // Validação das 5 fotos obrigatórias
    if (!fotos.frente) {
      setErroMsg('A foto 1 (Frente do Veículo) é obrigatória.');
      return;
    }
    if (!fotos.hodometro) {
      setErroMsg('A foto 2 (Painel do Hodômetro) é obrigatória.');
      return;
    }
    if (!fotos.hasteLimpa) {
      setErroMsg('A foto 3 (Haste Limpa com pano) é obrigatória.');
      return;
    }
    if (!fotos.hasteComOleo) {
      setErroMsg('A foto 4 (Haste C/ Óleo após inserção) é obrigatória.');
      return;
    }
    if (!fotos.reservatorioAgua) {
      setErroMsg('A foto 5 (Reservatório de Água) é obrigatória.');
      return;
    }

    try {
      setSalvando(true);

      const rotulosOleo = {
        1: 'Normal',
        2: 'Baixo',
        3: 'Sem Óleo'
      };

      const codigoRegistro = 'ALP.O-' + String(Date.now()).slice(-7);
      const usuarioNome = currentUser?.nome || currentUser?.name || 'Operador da Frota';
      const usuarioId = currentUser?.id || currentUser?.matricula || null;
      const regionalVeiculo = selectedVehicle?.regional || 'Norte';

      const payload = {
        codigo_registro: codigoRegistro,
        placa: placa.toUpperCase().trim(),
        regional: regionalVeiculo,
        nivel_oleo: Number(nivelOleo),
        nivel_oleo_rotulo: rotulosOleo[nivelOleo],
        nivel_agua: nivelAgua,
        nivel_agua_rotulo: nivelAgua,
        hodometro: kmNum,
        foto_frente_url: fotos.frente,
        foto_hodometro_url: fotos.hodometro,
        foto_haste_limpa_url: fotos.hasteLimpa,
        foto_haste_com_oleo_url: fotos.hasteComOleo,
        foto_haste_url: fotos.hasteComOleo, // retrocompatibilidade com telas e relatórios legados
        foto_reservatorio_agua_url: fotos.reservatorioAgua,
        observacoes: observacoes.trim() || null,
        status: 'REGISTRADO',
        criado_por: usuarioNome,
        criado_por_id: usuarioId ? String(usuarioId) : null,
        data_registro: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('registros_nivel_oleo')
        .insert([payload])
        .select()
        .single();

      if (error) {
        throw error;
      }

      // Atualiza também o KM atual no veículo se for superior
      if (kmNum > (ultimoKmRegistrado || 0)) {
        supabase
          .from('veiculos')
          .update({ km_atual: kmNum })
          .eq('placa', placa.toUpperCase().trim())
          .then(() => {}, err => console.warn('Aviso: Não foi possível sincronizar km no veiculo:', err));
      }

      const registroFinal = data || payload;
      try {
        window.dispatchEvent(new CustomEvent('fleet_novo_registro_oleo', { detail: registroFinal }));
      } catch (e) {}

      if (onSuccess) {
        onSuccess(registroFinal);
      }
      handleCloseModal();
    } catch (err) {
      console.error('Erro ao salvar registro de óleo & água:', err);
      setErroMsg(`Falha ao salvar no banco: ${err.message || 'Erro desconhecido'}`);
    } finally {
      setSalvando(false);
    }
  };

  const currentStepGate = PASSOS_MEDICAO[passoAtivoGate];

  return (
    <>
      <div 
        className="fixed inset-0 z-[160] flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200"
        onClick={handleCloseModal}
      >
        <div 
          className="relative w-full max-w-3xl bg-white dark:bg-slate-900 rounded-3xl shadow-[0_25px_70px_-15px_rgba(0,0,0,0.5)] border border-slate-100 dark:border-slate-800 overflow-hidden flex flex-col max-h-[94vh] animate-in zoom-in-95 duration-200"
          onClick={e => e.stopPropagation()}
        >
          {/* GLOW DECORATIVO SUPERIOR */}
          <div className="absolute top-0 left-0 right-0 h-28 bg-gradient-to-b from-amber-500/20 via-sky-500/5 to-transparent pointer-events-none" />

          {/* CABEÇALHO */}
          <div className="relative px-6 py-4 flex items-center justify-between border-b border-slate-100 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-500 to-sky-600 flex items-center justify-center text-white shadow-md shadow-amber-500/20">
                <Droplets size={22} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                    Inspeção: Nível de Óleo & Água
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                    {etapaFluxo === 'gate' ? 'Passo 1: Instruções e Ciência' : 'Passo 2: Formulário e Fotos'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  {etapaFluxo === 'gate' 
                    ? 'Procedimento oficial do fabricante antes de realizar a medição' 
                    : 'Aferição oficial da vareta, reservatório de expansão e 5 evidências'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {etapaFluxo === 'formulario' && (
                <button
                  type="button"
                  onClick={() => setShowGuiaModal(true)}
                  className="hidden sm:inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-xs font-black hover:bg-amber-100 transition-colors"
                >
                  <BookOpen size={13} />
                  <span>Ver Passo a Passo</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleCloseModal}
                className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* ETAPA 1: GATE DE INSTRUÇÃO E CIÊNCIA OBRIGATÓRIA (MANUAL DO FABRICANTE)   */}
          {/* ========================================================================= */}
          {etapaFluxo === 'gate' && (
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
              {/* ALERTA INTRODUTÓRIO */}
              <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2.5 text-amber-800 dark:text-amber-300">
                  <ShieldCheck size={18} className="text-amber-500 shrink-0" />
                  <span className="text-xs font-bold leading-tight">
                    Conformidade Técnica: Para evitar falsas leituras, siga rigorosamente os 5 passos do manual do fabricante antes de registrar as fotos.
                  </span>
                </div>
              </div>

              {/* SELETOR INTERATIVO DE PASSOS (1 A 5) */}
              <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
                {PASSOS_MEDICAO.map((p, idx) => {
                  const isSelected = idx === passoAtivoGate;
                  const isPassed = idx < passoAtivoGate;
                  return (
                    <button
                      key={p.passo}
                      type="button"
                      onClick={() => setPassoAtivoGate(idx)}
                      className={`py-2 px-2 rounded-xl text-left transition-all border flex flex-col sm:flex-row items-center sm:items-start gap-1 sm:gap-2 ${
                        isSelected 
                          ? 'bg-amber-500 text-white border-amber-600 shadow-sm shadow-amber-500/25' 
                          : isPassed
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                            : 'bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-amber-300'
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

              {/* CARD CENTRAL DO PASSO ILUSTRADO */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center bg-slate-50/70 dark:bg-slate-850/60 rounded-3xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800">
                {/* SVG Ilustrado */}
                <div className="md:col-span-6 bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-700/80 flex flex-col items-center justify-center min-h-[220px] shadow-sm relative overflow-hidden">
                  <IlustracaoPassoVetorial passo={currentStepGate.passo} />
                  <span className="mt-2 inline-block px-3 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                    {currentStepGate.tag}
                  </span>
                </div>

                {/* Explicação e Dica */}
                <div className="md:col-span-6 space-y-3">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400 block mb-0.5">
                      Passo {currentStepGate.passo} de 5
                    </span>
                    <h4 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
                      {currentStepGate.titulo}
                    </h4>
                    <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
                      {currentStepGate.subtitulo}
                    </p>
                  </div>

                  <p className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed font-medium">
                    {currentStepGate.descricao}
                  </p>

                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-900 dark:text-amber-200 font-semibold leading-snug flex items-start gap-2">
                    <Info size={15} className="text-amber-600 shrink-0 mt-0.5" />
                    <span>{currentStepGate.dica}</span>
                  </div>

                  {/* Botões de Avanço no Stepper */}
                  <div className="flex items-center justify-between pt-1">
                    <button
                      type="button"
                      disabled={passoAtivoGate === 0}
                      onClick={() => setPassoAtivoGate(prev => prev - 1)}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      Anterior
                    </button>
                    <button
                      type="button"
                      disabled={passoAtivoGate === PASSOS_MEDICAO.length - 1}
                      onClick={() => setPassoAtivoGate(prev => prev + 1)}
                      className="px-3.5 py-1.5 rounded-xl text-xs font-black bg-slate-800 dark:bg-white text-white dark:text-slate-900 hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed shadow-xs"
                    >
                      Próximo Passo
                    </button>
                  </div>
                </div>
              </div>

              {/* CHECKLIST E SINALIZAÇÃO OBRIGATÓRIA (GATE) */}
              <div className="p-4 rounded-2xl bg-amber-500/10 border-2 border-amber-500/30 flex flex-col sm:flex-row items-center justify-between gap-4">
                <label className="flex items-start gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={concordouGate}
                    onChange={(e) => setConcordouGate(e.target.checked)}
                    className="mt-1 w-5 h-5 rounded-lg border-2 border-amber-500 text-amber-600 focus:ring-amber-500 accent-amber-500 cursor-pointer"
                  />
                  <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100 leading-snug">
                    Declaro que o veículo está em <strong>piso plano</strong>, o <strong>motor está frio (ou em repouso de 10 a 15 min)</strong> e que realizei a <strong>higienização da haste</strong> antes da leitura.
                  </span>
                </label>

                <button
                  type="button"
                  disabled={!concordouGate}
                  onClick={() => setEtapaFluxo('formulario')}
                  className={`w-full sm:w-auto px-6 py-3 rounded-2xl font-black text-xs sm:text-sm text-white shadow-lg transition-all flex items-center justify-center gap-2 whitespace-nowrap active:scale-95 ${
                    concordouGate 
                      ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/30 cursor-pointer' 
                      : 'bg-slate-400 dark:bg-slate-700 cursor-not-allowed opacity-60'
                  }`}
                >
                  <CheckCircle2 size={18} />
                  <span>Prosseguir para Medição</span>
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* ETAPA 2: FORMULÁRIO COMPLETO COM NÍVEL DE ÓLEO, ÁGUA E 5 FOTOS            */}
          {/* ========================================================================= */}
          {etapaFluxo === 'formulario' && (
            <>
              <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
                {/* Mensagem de Erro Geral */}
                {erroMsg && (
                  <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-bold flex items-center gap-2 animate-in fade-in">
                    <AlertCircle size={16} className="shrink-0 text-rose-500" />
                    <span>{erroMsg}</span>
                  </div>
                )}

                {/* BOTÃO PARA REVER O GUIA DA VARETA */}
                <div className="p-3 rounded-2xl bg-slate-100/80 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                    <ShieldCheck size={16} className="text-emerald-500 shrink-0" />
                    <span className="text-[11px] font-bold">
                      Etapa de conformidade aprovada. Siga com o preenchimento e as fotos comprobatórias.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEtapaFluxo('gate')}
                    className="shrink-0 px-2.5 py-1 rounded-xl bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-700 dark:text-slate-200 font-bold text-[10px] transition-colors"
                  >
                    Rever Instruções
                  </button>
                </div>

                {/* SEÇÃO 1: SELEÇÃO DA PLACA / VEÍCULO */}
                <div className="space-y-2">
                  <label className="block text-xs font-black text-slate-700 dark:text-slate-200 uppercase tracking-wider flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Car size={14} className="text-emerald-600" />
                      Veículo / Placa *
                    </span>
                    {selectedVehicle && (
                      <span className="text-[11px] font-bold text-slate-400 capitalize">
                        {selectedVehicle.marca || ''} {selectedVehicle.modelo || selectedVehicle.subTipo || ''} ({selectedVehicle.regional || 'Norte'})
                      </span>
                    )}
                  </label>

                  <SearchableSelect
                    options={vehicleOptions}
                    value={placa}
                    onChange={handlePlacaChange}
                    placeholder="Digite parte da placa (ex: RCW, SKJ, 123)..."
                    className="w-full bg-slate-50 dark:bg-slate-800/80 border-2 border-slate-200 dark:border-slate-700 focus:border-emerald-500 dark:focus:border-emerald-500 rounded-2xl px-4 py-3 text-sm font-black text-slate-800 dark:text-white transition-all outline-none"
                  />
                </div>

                {/* SEÇÃO 2: NÍVEL DE ÓLEO DO MOTOR (3 CARDS) */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-black text-slate-700 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                      <Droplets size={14} className="text-amber-500" />
                      1. Nível de Óleo do Motor *
                    </label>
                    <span className="text-[11px] font-bold text-slate-400">
                      Conforme marcas MÍN / MÁX
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* Normal */}
                    <button
                      type="button"
                      onClick={() => setNivelOleo(1)}
                      className={`p-3.5 rounded-2xl border-2 transition-all flex flex-col items-center text-center gap-1.5 active:scale-95 ${
                        nivelOleo === 1
                          ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 ring-2 ring-emerald-300 dark:ring-emerald-800 shadow-sm'
                          : 'border-slate-200 dark:border-slate-800 hover:border-emerald-300 bg-white dark:bg-slate-800/60 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                        nivelOleo === 1 ? 'bg-emerald-600 text-white' : 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600'
                      }`}>
                        <CheckCircle2 size={20} />
                      </div>
                      <div>
                        <span className="text-xs font-black block">1. Normal</span>
                        <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 block mt-0.5">
                          Entre marcas MÍN e MÁX
                        </span>
                      </div>
                    </button>

                    {/* Baixo */}
                    <button
                      type="button"
                      onClick={() => setNivelOleo(2)}
                      className={`p-3.5 rounded-2xl border-2 transition-all flex flex-col items-center text-center gap-1.5 active:scale-95 ${
                        nivelOleo === 2
                          ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 ring-2 ring-amber-300 dark:ring-amber-800 shadow-sm'
                          : 'border-slate-200 dark:border-slate-800 hover:border-amber-300 bg-white dark:bg-slate-800/60 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                        nivelOleo === 2 ? 'bg-amber-500 text-white' : 'bg-amber-100 dark:bg-amber-900/50 text-amber-600'
                      }`}>
                        <AlertTriangle size={20} />
                      </div>
                      <div>
                        <span className="text-xs font-black block">2. Baixo</span>
                        <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 block mt-0.5">
                          Abaixo da marca mínima
                        </span>
                      </div>
                    </button>

                    {/* Sem Óleo */}
                    <button
                      type="button"
                      onClick={() => setNivelOleo(3)}
                      className={`p-3.5 rounded-2xl border-2 transition-all flex flex-col items-center text-center gap-1.5 active:scale-95 ${
                        nivelOleo === 3
                          ? 'border-rose-500 bg-rose-50 dark:bg-rose-950/40 text-rose-900 dark:text-rose-200 ring-2 ring-rose-300 dark:ring-rose-800 shadow-sm'
                          : 'border-slate-200 dark:border-slate-800 hover:border-rose-300 bg-white dark:bg-slate-800/60 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                        nivelOleo === 3 ? 'bg-rose-600 text-white animate-pulse' : 'bg-rose-100 dark:bg-rose-900/50 text-rose-600'
                      }`}>
                        <Flame size={20} />
                      </div>
                      <div>
                        <span className="text-xs font-black block text-rose-600 dark:text-rose-400">3. Sem Óleo</span>
                        <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 block mt-0.5">
                          Haste seca (Crítico)
                        </span>
                      </div>
                    </button>
                  </div>
                </div>

                {/* SEÇÃO 3: NÍVEL DE ÁGUA NO RESERVATÓRIO DE EXPANSÃO (NOVO REQUISITO) */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-black text-slate-700 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                      <Waves size={14} className="text-sky-500" />
                      2. Nível de Água no Reservatório (Arrefecimento) *
                    </label>
                    <span className="text-[11px] font-bold text-slate-400">
                      Checagem visual do vaso
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* Alto */}
                    <button
                      type="button"
                      onClick={() => setNivelAgua('Alto')}
                      className={`p-3.5 rounded-2xl border-2 transition-all flex flex-col items-center text-center gap-1.5 active:scale-95 ${
                        nivelAgua === 'Alto'
                          ? 'border-sky-500 bg-sky-50 dark:bg-sky-950/40 text-sky-900 dark:text-sky-200 ring-2 ring-sky-300 dark:ring-sky-800 shadow-sm'
                          : 'border-slate-200 dark:border-slate-800 hover:border-sky-300 bg-white dark:bg-slate-800/60 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                        nivelAgua === 'Alto' ? 'bg-sky-600 text-white' : 'bg-sky-100 dark:bg-sky-900/50 text-sky-600'
                      }`}>
                        <Waves size={20} />
                      </div>
                      <div>
                        <span className="text-xs font-black block">Alto</span>
                        <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 block mt-0.5">
                          Próximo ou na marca MÁX
                        </span>
                      </div>
                    </button>

                    {/* Médio */}
                    <button
                      type="button"
                      onClick={() => setNivelAgua('Médio')}
                      className={`p-3.5 rounded-2xl border-2 transition-all flex flex-col items-center text-center gap-1.5 active:scale-95 ${
                        nivelAgua === 'Médio'
                          ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 ring-2 ring-emerald-300 dark:ring-emerald-800 shadow-sm'
                          : 'border-slate-200 dark:border-slate-800 hover:border-emerald-300 bg-white dark:bg-slate-800/60 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                        nivelAgua === 'Médio' ? 'bg-emerald-600 text-white' : 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600'
                      }`}>
                        <CheckCircle2 size={20} />
                      </div>
                      <div>
                        <span className="text-xs font-black block">Médio</span>
                        <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 block mt-0.5">
                          Nível seguro operacional
                        </span>
                      </div>
                    </button>

                    {/* Baixo */}
                    <button
                      type="button"
                      onClick={() => setNivelAgua('Baixo')}
                      className={`p-3.5 rounded-2xl border-2 transition-all flex flex-col items-center text-center gap-1.5 active:scale-95 ${
                        nivelAgua === 'Baixo'
                          ? 'border-rose-500 bg-rose-50 dark:bg-rose-950/40 text-rose-900 dark:text-rose-200 ring-2 ring-rose-300 dark:ring-rose-800 shadow-sm'
                          : 'border-slate-200 dark:border-slate-800 hover:border-rose-300 bg-white dark:bg-slate-800/60 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                        nivelAgua === 'Baixo' ? 'bg-rose-600 text-white animate-pulse' : 'bg-rose-100 dark:bg-rose-900/50 text-rose-600'
                      }`}>
                        <AlertTriangle size={20} />
                      </div>
                      <div>
                        <span className="text-xs font-black block text-rose-600 dark:text-rose-400">Baixo</span>
                        <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 block mt-0.5">
                          Abaixo do MÍN (Superaquecimento)
                        </span>
                      </div>
                    </button>
                  </div>

                  {nivelAgua === 'Baixo' && (
                    <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-xs font-bold flex items-center gap-2">
                      <AlertTriangle size={16} className="shrink-0 text-rose-600" />
                      <span>Água Baixa: Risco de superaquecimento e danos à junta do cabeçote. Necessário completar líquido com aditivo ou abrir chamado.</span>
                    </div>
                  )}
                </div>

                {/* SEÇÃO 4: HODÔMETRO (KM) */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-black text-slate-700 dark:text-slate-200 uppercase tracking-wider flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Gauge size={14} className="text-blue-600" />
                      Hodômetro (KM) *
                    </span>
                    {ultimoKmRegistrado && (
                      <span className="text-[11px] font-bold text-slate-400">
                        Último registrado: {ultimoKmRegistrado.toLocaleString('pt-BR')} km
                      </span>
                    )}
                  </label>

                  <input
                    type="text"
                    value={hodometro}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '');
                      setHodometro(val ? Number(val).toLocaleString('pt-BR') : '');
                    }}
                    placeholder="Ex: 85.420"
                    className="w-full bg-slate-50 dark:bg-slate-800/80 border-2 border-slate-200 dark:border-slate-700 focus:border-emerald-500 dark:focus:border-emerald-500 rounded-2xl px-4 py-3 text-sm font-black text-slate-800 dark:text-white transition-all outline-none"
                    required
                  />

                  {isKmMenorQueAnterior && (
                    <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 text-[11px] font-bold flex items-center gap-2 animate-in fade-in">
                      <Info size={14} className="shrink-0 text-amber-500" />
                      <span>Atenção: O valor digitado é menor que o último KM registrado ({ultimoKmRegistrado?.toLocaleString('pt-BR')} km). Verifique se digitou corretamente (não impede o salvamento).</span>
                    </div>
                  )}
                </div>

                {/* SEÇÃO 5: 5 FOTOS OBRIGATÓRIAS */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-black text-slate-700 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                      <Camera size={14} className="text-teal-600" />
                      Evidências Fotográficas ({totalFotosAnexadas}/5 Obrigatórias) *
                    </label>
                    {totalFotosAnexadas === 5 && (
                      <span className="text-[11px] font-black text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 size={13} />
                        Todas Anexadas
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
                    {/* Foto 1: Frente */}
                    <PhotoCardSlot
                      label="1. Frente"
                      sub="Placa legível"
                      foto={fotos.frente}
                      isLoading={loadingSlot === 'frente'}
                      onCapture={(mode) => handleCapture('frente', mode)}
                      onRemove={() => handleRemoveFoto('frente')}
                      onZoom={() => onPreviewImage && onPreviewImage({ url: fotos.frente, label: 'Frente do Veículo' })}
                    />

                    {/* Foto 2: Hodômetro */}
                    <PhotoCardSlot
                      label="2. Hodômetro"
                      sub="KM do painel"
                      foto={fotos.hodometro}
                      isLoading={loadingSlot === 'hodometro'}
                      onCapture={(mode) => handleCapture('hodometro', mode)}
                      onRemove={() => handleRemoveFoto('hodometro')}
                      onZoom={() => onPreviewImage && onPreviewImage({ url: fotos.hodometro, label: 'Painel do Hodômetro' })}
                    />

                    {/* Foto 3: Haste Limpa */}
                    <PhotoCardSlot
                      label="3. Haste Limpa"
                      sub="Ponta higienizada"
                      foto={fotos.hasteLimpa}
                      isLoading={loadingSlot === 'hasteLimpa'}
                      onCapture={(mode) => handleCapture('hasteLimpa', mode)}
                      onRemove={() => handleRemoveFoto('hasteLimpa')}
                      onZoom={() => onPreviewImage && onPreviewImage({ url: fotos.hasteLimpa, label: 'Haste Limpa com Pano' })}
                    />

                    {/* Foto 4: Haste C/ Óleo */}
                    <PhotoCardSlot
                      label="4. Haste C/ Óleo"
                      sub="Leitura na marca"
                      foto={fotos.hasteComOleo}
                      isLoading={loadingSlot === 'hasteComOleo'}
                      onCapture={(mode) => handleCapture('hasteComOleo', mode)}
                      onRemove={() => handleRemoveFoto('hasteComOleo')}
                      onZoom={() => onPreviewImage && onPreviewImage({ url: fotos.hasteComOleo, label: 'Haste C/ Óleo (Leitura)' })}
                    />

                    {/* Foto 5: Reservatório de Água */}
                    <PhotoCardSlot
                      label="5. Reserv. Água"
                      sub="Nível no vaso"
                      foto={fotos.reservatorioAgua}
                      isLoading={loadingSlot === 'reservatorioAgua'}
                      onCapture={(mode) => handleCapture('reservatorioAgua', mode)}
                      onRemove={() => handleRemoveFoto('reservatorioAgua')}
                      onZoom={() => onPreviewImage && onPreviewImage({ url: fotos.reservatorioAgua, label: 'Reservatório de Água' })}
                    />
                  </div>
                </div>

                {/* SEÇÃO 6: OBSERVAÇÕES OPCIONAIS */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-black text-slate-700 dark:text-slate-200 uppercase tracking-wider">
                    Observações Adicionais (Opcional)
                  </label>
                  <textarea
                    value={observacoes}
                    onChange={(e) => setObservacoes(e.target.value)}
                    placeholder="Ex: Nível de água e óleo aferidos antes do início da rota matutina..."
                    rows={2}
                    className="w-full bg-slate-50 dark:bg-slate-800/80 border-2 border-slate-200 dark:border-slate-700 focus:border-emerald-500 dark:focus:border-emerald-500 rounded-2xl px-4 py-2.5 text-xs font-medium text-slate-800 dark:text-white transition-all outline-none resize-none"
                  />
                </div>
              </form>

              {/* RODAPÉ DO FORMULÁRIO */}
              <div className="px-6 py-4 bg-slate-50 dark:bg-slate-850/60 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setEtapaFluxo('gate')}
                  disabled={salvando}
                  className="px-3.5 py-2 rounded-xl font-bold text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors flex items-center gap-1"
                >
                  <ChevronLeft size={16} />
                  <span>Voltar</span>
                </button>

                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={salvando || totalFotosAnexadas < 5 || !placa || !nivelOleo || !nivelAgua || !hodometro}
                  className={`px-6 py-2.5 rounded-2xl font-black text-xs text-white shadow-md transition-all flex items-center gap-2 active:scale-95 ${
                    totalFotosAnexadas === 5 && placa && nivelOleo && nivelAgua && hodometro && !salvando
                      ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/25 cursor-pointer'
                      : 'bg-slate-400 dark:bg-slate-700 cursor-not-allowed opacity-60'
                  }`}
                >
                  {salvando ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>Gravando Aferição...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={16} />
                      <span>Salvar Aferição ({totalFotosAnexadas}/5 Fotos)</span>
                    </>
                  )}
                </button>
              </div>
            </>
          )}

        </div>
      </div>

      {/* GUIA DA VARETA INTEGRADO (CONSULTA FLUTUANTE) */}
      <GuiaMedicaoVaretaOleo
        isOpen={showGuiaModal}
        onClose={() => setShowGuiaModal(false)}
      />
    </>
  );
}

// Subcomponente de Slot de Foto Otimizado
function PhotoCardSlot({ label, sub, foto, isLoading, onCapture, onRemove, onZoom }) {
  return (
    <div className={`p-2.5 rounded-2xl border-2 transition-all flex flex-col justify-between ${
      foto 
        ? 'border-emerald-500 bg-emerald-50/30 dark:bg-emerald-950/20' 
        : 'border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40'
    }`}>
      <div>
        <span className="text-[11px] font-black text-slate-800 dark:text-slate-200 block truncate">
          {label}
        </span>
        <span className="text-[9.5px] text-slate-400 block truncate">
          {sub}
        </span>
      </div>

      <div className="my-2 min-h-[75px] flex items-center justify-center">
        {isLoading ? (
          <div className="flex flex-col items-center gap-1 text-slate-400 py-2">
            <Loader2 size={18} className="animate-spin text-emerald-600" />
            <span className="text-[9px] font-bold">Processando...</span>
          </div>
        ) : foto ? (
          <div className="relative group w-full h-20 rounded-xl overflow-hidden border border-emerald-300 dark:border-emerald-800 shadow-sm bg-black/10">
            <img 
              src={foto} 
              alt={label} 
              className="w-full h-full object-cover cursor-pointer group-hover:scale-105 transition-transform duration-300"
              onClick={onZoom}
            />
            <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5">
              <button
                type="button"
                onClick={onZoom}
                className="p-1 bg-white/90 text-slate-800 rounded-full hover:bg-white shadow transition-transform active:scale-95"
                title="Ampliar foto"
              >
                <ZoomIn size={12} />
              </button>
              <button
                type="button"
                onClick={onRemove}
                className="p-1 bg-rose-600 text-white rounded-full hover:bg-rose-700 shadow transition-transform active:scale-95"
                title="Remover foto"
              >
                <Trash2 size={12} />
              </button>
            </div>
          </div>
        ) : (
          <div className="w-full py-1.5 flex flex-col items-center justify-center text-slate-400 gap-1">
            <Camera size={20} className="text-slate-300 dark:text-slate-600" />
            <span className="text-[9px] font-bold text-slate-400">Pendente</span>
          </div>
        )}
      </div>

      {/* Botões de Câmera e Galeria */}
      {!foto && !isLoading && (
        <div className="grid grid-cols-2 gap-1 pt-0.5">
          <button
            type="button"
            onClick={() => onCapture('camera')}
            className="py-1 px-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[9.5px] font-black flex items-center justify-center gap-0.5 transition-all active:scale-95 shadow-sm"
          >
            <Camera size={11} />
            <span>Câm</span>
          </button>
          <button
            type="button"
            onClick={() => onCapture('gallery')}
            className="py-1 px-1 rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-[9.5px] font-black flex items-center justify-center gap-0.5 transition-all active:scale-95"
          >
            <ImageIcon size={11} />
            <span>Gal</span>
          </button>
        </div>
      )}

      {foto && !isLoading && (
        <div className="pt-0.5 flex items-center justify-between">
          <span className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
            <CheckCircle2 size={10} />
            OK
          </span>
          <button
            type="button"
            onClick={onRemove}
            className="text-[9px] font-bold text-rose-500 hover:text-rose-700 dark:hover:text-rose-400 underline"
          >
            Trocar
          </button>
        </div>
      )}
    </div>
  );
}
