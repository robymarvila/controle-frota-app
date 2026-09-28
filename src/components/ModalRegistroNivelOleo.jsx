import React, { useState, useMemo } from 'react';
import { 
  Droplets, Camera, Image as ImageIcon, CheckCircle2, AlertTriangle, 
  Flame, X, ZoomIn, Trash2, Car, Gauge, Info, Loader2, Sparkles, AlertCircle
} from 'lucide-react';
import { capturePhotoUnified } from '../utils/photoCapture';
import { supabase } from '../supabaseClient';
import GuiaMedicaoVaretaOleo from './GuiaMedicaoVaretaOleo';
import SearchableSelect from './SearchableSelect';

export default function ModalRegistroNivelOleo({
  isOpen,
  onClose,
  vehicles = [],
  currentUser,
  onSuccess,
  onPreviewImage
}) {
  const [placa, setPlaca] = useState('');
  const [nivelOleo, setNivelOleo] = useState(null); // 1 | 2 | 3
  const [hodometro, setHodometro] = useState('');
  const [observacoes, setObservacoes] = useState('');
  
  // Fotos: frente, hodometro, haste
  const [fotos, setFotos] = useState({
    frente: null,
    hodometro: null,
    haste: null
  });

  const [loadingSlot, setLoadingSlot] = useState(null); // 'frente' | 'hodometro' | 'haste'
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

  // Submissão do Registro
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErroMsg('');

    if (!placa) {
      setErroMsg('Selecione a placa do veículo.');
      return;
    }
    if (!nivelOleo) {
      setErroMsg('Selecione o nível de óleo constatado (Normal, Baixo ou Sem Óleo).');
      return;
    }
    const kmNum = Number(String(hodometro).replace(/\D/g, ''));
    if (!kmNum || kmNum <= 0) {
      setErroMsg('Informe um hodômetro (KM) válido.');
      return;
    }
    if (!fotos.frente) {
      setErroMsg('A foto da frente do veículo é obrigatória.');
      return;
    }
    if (!fotos.hodometro) {
      setErroMsg('A foto do hodômetro é obrigatória.');
      return;
    }
    if (!fotos.haste) {
      setErroMsg('A foto da haste/vareta de nível de óleo é obrigatória.');
      return;
    }

    try {
      setSalvando(true);

      const rotulos = {
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
        nivel_oleo_rotulo: rotulos[nivelOleo],
        hodometro: kmNum,
        foto_frente_url: fotos.frente,
        foto_hodometro_url: fotos.hodometro,
        foto_haste_url: fotos.haste,
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
      onClose();
    } catch (err) {
      console.error('Erro ao salvar registro de óleo:', err);
      setErroMsg(`Falha ao salvar no banco: ${err.message || 'Erro desconhecido'}`);
    } finally {
      setSalvando(false);
    }
  };

  const totalFotosAnexadas = (fotos.frente ? 1 : 0) + (fotos.hodometro ? 1 : 0) + (fotos.haste ? 1 : 0);

  return (
    <>
      <div 
        className="fixed inset-0 z-[160] flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200"
        onClick={onClose}
      >
        <div 
          className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-[0_25px_70px_-15px_rgba(0,0,0,0.5)] border border-slate-100 dark:border-slate-800 overflow-hidden flex flex-col max-h-[94vh] animate-in zoom-in-95 duration-200"
          onClick={e => e.stopPropagation()}
        >
          {/* Glow Superior Temático */}
          <div className={`absolute top-0 left-0 right-0 h-28 bg-gradient-to-b ${
            nivelOleo === 3 
              ? 'from-rose-500/25 via-red-500/5 to-transparent' 
              : nivelOleo === 2 
                ? 'from-amber-500/25 via-orange-500/5 to-transparent' 
                : 'from-emerald-500/20 via-teal-500/5 to-transparent'
          } pointer-events-none transition-colors duration-500`} />

          {/* Header */}
          <div className="relative px-6 py-4 flex items-center justify-between border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className={`w-11 h-11 rounded-2xl flex items-center justify-center text-white shadow-md transition-colors duration-300 ${
                nivelOleo === 3 
                  ? 'bg-gradient-to-br from-rose-500 to-red-600 shadow-rose-500/30' 
                  : nivelOleo === 2 
                    ? 'bg-gradient-to-br from-amber-500 to-orange-600 shadow-amber-500/30' 
                    : 'bg-gradient-to-br from-emerald-600 to-teal-700 shadow-emerald-600/30'
              }`}>
                <Droplets size={22} />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                  Registro de Nível de Óleo do Motor
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  Aferição preventiva da vareta com fotos comprobatórias
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* Corpo do Formulário com Scroll */}
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
            {/* Mensagem de Erro Geral */}
            {erroMsg && (
              <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-bold flex items-center gap-2 animate-in fade-in">
                <AlertCircle size={16} className="shrink-0 text-rose-500" />
                <span>{erroMsg}</span>
              </div>
            )}

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

              <div className="relative">
                <SearchableSelect
                  options={vehicleOptions}
                  value={placa}
                  onChange={handlePlacaChange}
                  placeholder="Digite parte da placa (ex: RCW, SKJ, 123)..."
                  className="w-full bg-slate-50 dark:bg-slate-800/80 border-2 border-slate-200 dark:border-slate-700 focus:border-emerald-500 dark:focus:border-emerald-500 rounded-2xl px-4 py-3 text-sm font-black text-slate-800 dark:text-white transition-all outline-none"
                />
              </div>
            </div>

            {/* SEÇÃO 2: NÍVEL DE ÓLEO (3 CARDS INTERATIVOS) */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-black text-slate-700 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                  <Droplets size={14} className="text-amber-500" />
                  Nível de Óleo Constatado *
                </label>
                
                {/* Botão Guia Visual */}
                <button
                  type="button"
                  onClick={() => setShowGuiaModal(true)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 text-[11px] font-black hover:bg-amber-100 transition-colors"
                >
                  <Info size={12} />
                  <span>Ver Guia da Vareta</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Opção 1: Normal */}
                <button
                  type="button"
                  onClick={() => setNivelOleo(1)}
                  className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center text-center gap-2 active:scale-95 ${
                    nivelOleo === 1
                      ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 ring-2 ring-emerald-300 dark:ring-emerald-800 shadow-sm'
                      : 'border-slate-200 dark:border-slate-800 hover:border-emerald-300 bg-white dark:bg-slate-800/60 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    nivelOleo === 1 ? 'bg-emerald-600 text-white' : 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600'
                  }`}>
                    <CheckCircle2 size={22} />
                  </div>
                  <div>
                    <span className="text-sm font-black block">1. Normal</span>
                    <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block mt-0.5 leading-tight">
                      Entre mínimo e máximo
                    </span>
                  </div>
                </button>

                {/* Opção 2: Baixo (Âmbar) */}
                <button
                  type="button"
                  onClick={() => setNivelOleo(2)}
                  className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center text-center gap-2 active:scale-95 ${
                    nivelOleo === 2
                      ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 ring-2 ring-amber-300 dark:ring-amber-800 shadow-sm'
                      : 'border-slate-200 dark:border-slate-800 hover:border-amber-300 bg-white dark:bg-slate-800/60 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    nivelOleo === 2 ? 'bg-amber-500 text-white' : 'bg-amber-100 dark:bg-amber-900/50 text-amber-600'
                  }`}>
                    <AlertTriangle size={22} />
                  </div>
                  <div>
                    <span className="text-sm font-black block">2. Baixo</span>
                    <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block mt-0.5 leading-tight">
                      Abaixo da marca mínima
                    </span>
                  </div>
                </button>

                {/* Opção 3: Sem Óleo (Vermelho) */}
                <button
                  type="button"
                  onClick={() => setNivelOleo(3)}
                  className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center text-center gap-2 active:scale-95 ${
                    nivelOleo === 3
                      ? 'border-rose-500 bg-rose-50 dark:bg-rose-950/40 text-rose-900 dark:text-rose-200 ring-2 ring-rose-300 dark:ring-rose-800 shadow-sm'
                      : 'border-slate-200 dark:border-slate-800 hover:border-rose-300 bg-white dark:bg-slate-800/60 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    nivelOleo === 3 ? 'bg-rose-600 text-white animate-pulse' : 'bg-rose-100 dark:bg-rose-900/50 text-rose-600'
                  }`}>
                    <Flame size={22} />
                  </div>
                  <div>
                    <span className="text-sm font-black block text-rose-600 dark:text-rose-400">3. Sem Óleo</span>
                    <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block mt-0.5 leading-tight">
                      Haste seca (Crítico)
                    </span>
                  </div>
                </button>
              </div>

              {/* Banner Informativo do Nível Selecionado */}
              {nivelOleo === 2 && (
                <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-xs font-bold flex items-center gap-2">
                  <AlertTriangle size={16} className="shrink-0 text-amber-600" />
                  <span>Nível Baixo: Veículo precisará de complemento de lubrificante ou abertura de chamado.</span>
                </div>
              )}

              {nivelOleo === 3 && (
                <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-xs font-bold flex items-center gap-2">
                  <Flame size={16} className="shrink-0 text-rose-600" />
                  <span>Sem Óleo: Risco grave de danos ao motor. Recomenda-se acionar chamado imediato e não rodar!</span>
                </div>
              )}
            
              {/* DICA OPERACIONAL DE AFERICAO (CONFORME MANUAL) */}
              <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300">
                  <AlertTriangle size={15} className="text-amber-500 shrink-0" />
                  <span className="text-[11px] font-medium leading-snug">
                    <strong>Atenção:</strong> Não confie na medição com o motor totalmente frio pela manhã! Ligue 2 a 3 min antes de checar.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowGuiaModal(true)}
                  className="shrink-0 px-2.5 py-1 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-black text-[10px] transition-colors shadow-sm active:scale-95 whitespace-nowrap"
                >
                  Ver Guia Ilustrado
                </button>
              </div>
</div>

            {/* SEÇÃO 3: HODÔMETRO (KM) */}
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

              {/* Alerta Não-Impeditivo de KM Decrescente */}
              {isKmMenorQueAnterior && (
                <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 text-[11px] font-bold flex items-center gap-2 animate-in fade-in">
                  <Info size={14} className="shrink-0 text-amber-500" />
                  <span>Atenção: O valor digitado é menor que o último KM registrado ({ultimoKmRegistrado?.toLocaleString('pt-BR')} km). Verifique se digitou corretamente (não impede o salvamento).</span>
                </div>
              )}
            </div>

            {/* SEÇÃO 4: 3 FOTOS OBRIGATÓRIAS */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-black text-slate-700 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                  <Camera size={14} className="text-teal-600" />
                  Evidências Fotográficas ({totalFotosAnexadas}/3 Obrigatórias) *
                </label>
                {totalFotosAnexadas === 3 && (
                  <span className="text-[11px] font-black text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 size={13} />
                    Completo
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Slot 1: Frente do Veículo */}
                <PhotoCardSlot
                  label="1. Frente do Veículo"
                  sub="Com placa visível"
                  foto={fotos.frente}
                  isLoading={loadingSlot === 'frente'}
                  onCapture={(mode) => handleCapture('frente', mode)}
                  onRemove={() => handleRemoveFoto('frente')}
                  onZoom={() => onPreviewImage && onPreviewImage({ url: fotos.frente, label: 'Frente do Veículo' })}
                />

                {/* Slot 2: Hodômetro */}
                <PhotoCardSlot
                  label="2. Hodômetro (KM)"
                  sub="Painel nítido"
                  foto={fotos.hodometro}
                  isLoading={loadingSlot === 'hodometro'}
                  onCapture={(mode) => handleCapture('hodometro', mode)}
                  onRemove={() => handleRemoveFoto('hodometro')}
                  onZoom={() => onPreviewImage && onPreviewImage({ url: fotos.hodometro, label: 'Painel do Hodômetro' })}
                />

                {/* Slot 3: Haste de Nível */}
                <PhotoCardSlot
                  label="3. Haste de Óleo"
                  sub="Vareta com a marcação"
                  foto={fotos.haste}
                  isLoading={loadingSlot === 'haste'}
                  onCapture={(mode) => handleCapture('haste', mode)}
                  onRemove={() => handleRemoveFoto('haste')}
                  onZoom={() => onPreviewImage && onPreviewImage({ url: fotos.haste, label: 'Haste do Nível de Óleo' })}
                />
              </div>
            </div>

            {/* SEÇÃO 5: OBSERVAÇÕES OPCIONAIS */}
            <div className="space-y-1.5">
              <label className="block text-xs font-black text-slate-700 dark:text-slate-200 uppercase tracking-wider">
                Observações Adicionais (Opcional)
              </label>
              <textarea
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                placeholder="Ex: Motorista constatou nível baixo antes de iniciar a rota matutina..."
                rows={2}
                className="w-full bg-slate-50 dark:bg-slate-800/80 border-2 border-slate-200 dark:border-slate-700 focus:border-emerald-500 dark:focus:border-emerald-500 rounded-2xl px-4 py-2.5 text-xs font-medium text-slate-800 dark:text-white transition-all outline-none resize-none"
              />
            </div>
          </form>

          {/* Footer com Ações */}
          <div className="px-6 py-4 bg-slate-50 dark:bg-slate-850/60 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              disabled={salvando}
              className="px-4 py-2.5 rounded-xl font-bold text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors"
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={salvando || totalFotosAnexadas < 3 || !placa || !nivelOleo || !hodometro}
              className={`px-6 py-2.5 rounded-2xl font-black text-xs text-white shadow-md transition-all flex items-center gap-2 active:scale-95 ${
                totalFotosAnexadas === 3 && placa && nivelOleo && hodometro && !salvando
                  ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/25 cursor-pointer'
                  : 'bg-slate-400 dark:bg-slate-700 cursor-not-allowed opacity-60'
              }`}
            >
              {salvando ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Gravando Registro...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={16} />
                  <span>Salvar Registro de Óleo</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* MODAL DE GUIA DA VARETA (ILUSTRAÇÃO DIDÁTICA + FOTO DO MANUAL) */}
      <GuiaMedicaoVaretaOleo
        isOpen={showGuiaModal}
        onClose={() => setShowGuiaModal(false)}
      />
    </>
  );
}

// Subcomponente de Slot de Foto com Câmera / Galeria / Preview
function PhotoCardSlot({ label, sub, foto, isLoading, onCapture, onRemove, onZoom }) {
  return (
    <div className={`p-3 rounded-2xl border-2 transition-all flex flex-col justify-between ${
      foto 
        ? 'border-emerald-500 bg-emerald-50/30 dark:bg-emerald-950/20' 
        : 'border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40'
    }`}>
      <div>
        <span className="text-[11px] font-black text-slate-800 dark:text-slate-200 block truncate">
          {label}
        </span>
        <span className="text-[10px] text-slate-400 block truncate">
          {sub}
        </span>
      </div>

      <div className="my-2 min-h-[90px] flex items-center justify-center">
        {isLoading ? (
          <div className="flex flex-col items-center gap-1.5 text-slate-400 py-3">
            <Loader2 size={20} className="animate-spin text-emerald-600" />
            <span className="text-[10px] font-bold">Processando...</span>
          </div>
        ) : foto ? (
          <div className="relative group w-full h-24 rounded-xl overflow-hidden border border-emerald-300 dark:border-emerald-800 shadow-sm bg-black/10">
            <img 
              src={foto} 
              alt={label} 
              className="w-full h-full object-cover cursor-pointer group-hover:scale-105 transition-transform duration-300"
              onClick={onZoom}
            />
            <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={onZoom}
                className="p-1.5 bg-white/90 text-slate-800 rounded-full hover:bg-white shadow transition-transform active:scale-95"
                title="Ampliar foto"
              >
                <ZoomIn size={14} />
              </button>
              <button
                type="button"
                onClick={onRemove}
                className="p-1.5 bg-rose-600 text-white rounded-full hover:bg-rose-700 shadow transition-transform active:scale-95"
                title="Remover foto"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ) : (
          <div className="w-full py-2 flex flex-col items-center justify-center text-slate-400 gap-1.5">
            <Camera size={22} className="text-slate-300 dark:text-slate-600" />
            <span className="text-[10px] font-bold text-slate-400">Pendente</span>
          </div>
        )}
      </div>

      {/* Botões de Ação */}
      {!foto && !isLoading && (
        <div className="grid grid-cols-2 gap-1.5 pt-1">
          <button
            type="button"
            onClick={() => onCapture('camera')}
            className="py-1.5 px-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black flex items-center justify-center gap-1 transition-all active:scale-95 shadow-sm"
          >
            <Camera size={12} />
            <span>Câmera</span>
          </button>
          <button
            type="button"
            onClick={() => onCapture('gallery')}
            className="py-1.5 px-2 rounded-xl bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-[10px] font-black flex items-center justify-center gap-1 transition-all active:scale-95"
          >
            <ImageIcon size={12} />
            <span>Galeria</span>
          </button>
        </div>
      )}

      {foto && !isLoading && (
        <div className="pt-1 flex items-center justify-between">
          <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
            <CheckCircle2 size={12} />
            Anexada
          </span>
          <button
            type="button"
            onClick={onRemove}
            className="text-[10px] font-bold text-rose-500 hover:text-rose-700 dark:hover:text-rose-400 underline"
          >
            Substituir
          </button>
        </div>
      )}
    </div>
  );
}
