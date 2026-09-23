import React, { useState } from 'react';
import { 
  Camera, Image as ImageIcon, CheckCircle2, AlertTriangle, 
  Trash2, X, ZoomIn, ArrowRight, ShieldCheck, Loader2 
} from 'lucide-react';
import { capturePhotoUnified } from '../utils/photoCapture';

export default function ModalEvidenciasObrigatorias({
  isOpen,
  onClose,
  placa,
  hodometro,
  fotosChamado = {},
  defeitos = [],
  onUpdateFotoChamado,
  onUpdateFotoDefeito,
  onConcluirChamado,
  onPreviewImage
}) {
  const [loadingSlot, setLoadingSlot] = useState(null); // 'veiculo' | 'hodometro' | 'adicional' | `defeito_${id}`

  if (!isOpen) return null;

  // 1. Identificar evidências obrigatórias
  const temFotoVeiculo = Boolean(fotosChamado?.fotoVeiculo);
  const temFotoHodometro = Boolean(fotosChamado?.fotoHodometro);
  
  // Para cada defeito cadastrado, a fotoDefeito é obrigatória
  const defeitosArray = Array.isArray(defeitos) ? defeitos : [];
  const totalDefeitos = defeitosArray.length;
  const defeitosComFoto = defeitosArray.filter(d => Boolean(d.fotoDefeito)).length;

  const totalObrigatorias = 2 + totalDefeitos;
  const totalConcluidas = (temFotoVeiculo ? 1 : 0) + (temFotoHodometro ? 1 : 0) + defeitosComFoto;
  const todasConcluidas = totalConcluidas >= totalObrigatorias;
  const porcentagem = Math.round((totalConcluidas / Math.max(1, totalObrigatorias)) * 100);

  // Ação de captura protegida por loading state
  const handleCapture = async (target, sourceMode) => {
    try {
      setLoadingSlot(target);
      const dataUrl = await capturePhotoUnified(sourceMode);
      if (dataUrl) {
        if (target === 'veiculo') {
          onUpdateFotoChamado('fotoVeiculo', dataUrl);
        } else if (target === 'hodometro') {
          onUpdateFotoChamado('fotoHodometro', dataUrl);
        } else if (target === 'adicional') {
          onUpdateFotoChamado('fotoAdicional', dataUrl);
        }
      }
    } catch (err) {
      console.error('Erro na captura da foto:', err);
    } finally {
      setLoadingSlot(null);
    }
  };

  const handleCaptureDefeito = async (defeitoId, sourceMode) => {
    try {
      setLoadingSlot(`defeito_${defeitoId}`);
      const dataUrl = await capturePhotoUnified(sourceMode);
      if (dataUrl) {
        onUpdateFotoDefeito(defeitoId, dataUrl);
      }
    } catch (err) {
      console.error('Erro na captura da foto do defeito:', err);
    } finally {
      setLoadingSlot(null);
    }
  };

  const handleRemove = (target) => {
    if (target === 'veiculo') {
      onUpdateFotoChamado('fotoVeiculo', null);
    } else if (target === 'hodometro') {
      onUpdateFotoChamado('fotoHodometro', null);
    } else if (target === 'adicional') {
      onUpdateFotoChamado('fotoAdicional', null);
    }
  };

  const handleRemoveDefeito = (defeitoId) => {
    onUpdateFotoDefeito(defeitoId, null);
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-[0_30px_70px_-15px_rgba(0,0,0,0.4)] border border-slate-100 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-300 font-sans"
        onClick={e => e.stopPropagation()}
      >
        {/* Glow Superior */}
        <div className={`absolute top-0 left-0 right-0 h-28 bg-gradient-to-b ${todasConcluidas ? 'from-emerald-500/20 to-teal-500/0' : 'from-amber-500/20 to-orange-500/0'} pointer-events-none transition-all duration-500`} />

        {/* Botão Fechar no Canto */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 p-2.5 text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors z-20"
          title="Voltar ao Formulário"
        >
          <X size={20} />
        </button>

        {/* Header Ultra Premium */}
        <div className="relative pt-7 px-6 sm:px-8 pb-4 shrink-0 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-start gap-4">
            <div className={`w-13 h-13 rounded-2xl flex items-center justify-center border shadow-lg shrink-0 transition-colors duration-300 ${
              todasConcluidas 
                ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 shadow-emerald-500/10' 
                : 'bg-amber-500/10 text-amber-600 border-amber-500/20 shadow-amber-500/10'
            }`}>
              {todasConcluidas ? (
                <ShieldCheck size={30} className="animate-in zoom-in-50 duration-300" />
              ) : (
                <Camera size={30} className="animate-pulse" />
              )}
            </div>

            <div className="flex-1 min-w-0 pr-8">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight">
                  Evidências Fotográficas Obrigatórias
                </h3>
                <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${
                  todasConcluidas 
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300' 
                    : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                }`}>
                  {todasConcluidas ? '100% Concluído' : 'Item Obrigatório'}
                </span>
              </div>

              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1 leading-relaxed">
                Veículo: <strong className="text-slate-700 dark:text-slate-200">{placa || 'Não informada'}</strong>
                {hodometro ? <> • Hodômetro: <strong className="text-slate-700 dark:text-slate-200">{Number(hodometro).toLocaleString('pt-BR')} km</strong></> : null}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Tire uma foto com a câmera do seu aparelho ou anexe da galeria diretamente abaixo para prosseguir:
              </p>
            </div>
          </div>

          {/* Barra de Progresso Interativa */}
          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80">
            <div className="flex items-center justify-between text-xs font-bold mb-1.5">
              <span className="text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                {todasConcluidas ? (
                  <CheckCircle2 size={14} className="text-emerald-500" />
                ) : (
                  <AlertTriangle size={14} className="text-amber-500" />
                )}
                {totalConcluidas} de {totalObrigatorias} evidências anexadas
              </span>
              <span className={`font-mono ${todasConcluidas ? 'text-emerald-600' : 'text-amber-600 dark:text-amber-400'}`}>
                {porcentagem}%
              </span>
            </div>
            <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-500 ${
                  todasConcluidas 
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-500 shadow-md shadow-emerald-500/30' 
                    : 'bg-gradient-to-r from-amber-500 to-orange-500'
                }`}
                style={{ width: `${porcentagem}%` }}
              />
            </div>
          </div>
        </div>

        {/* Lista de Evidências (Scrollável) */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-4 bg-slate-50/60 dark:bg-slate-900/60">

          {/* 1. FACHADA DO VEÍCULO */}
          <CardEvidenciaSlot
            title="1. Fachada do Veículo"
            subtitle="Foto frontal ou angular mostrando a placa e o estado geral externo"
            badge="OBRIGATÓRIO"
            fotoUrl={fotosChamado?.fotoVeiculo}
            isLoading={loadingSlot === 'veiculo'}
            onCaptureCamera={() => handleCapture('veiculo', 'camera')}
            onCaptureGallery={() => handleCapture('veiculo', 'photos')}
            onRemove={() => handleRemove('veiculo')}
            onPreview={() => onPreviewImage && onPreviewImage({ url: fotosChamado?.fotoVeiculo, label: 'Fachada do Veículo' })}
          />

          {/* 2. HODÔMETRO (KM) */}
          <CardEvidenciaSlot
            title="2. Hodômetro (KM)"
            subtitle={`Foto nítida do painel exibindo a quilometragem atual (${hodometro ? `${Number(hodometro).toLocaleString('pt-BR')} km` : 'KM'})`}
            badge="OBRIGATÓRIO"
            fotoUrl={fotosChamado?.fotoHodometro}
            isLoading={loadingSlot === 'hodometro'}
            onCaptureCamera={() => handleCapture('hodometro', 'camera')}
            onCaptureGallery={() => handleCapture('hodometro', 'photos')}
            onRemove={() => handleRemove('hodometro')}
            onPreview={() => onPreviewImage && onPreviewImage({ url: fotosChamado?.fotoHodometro, label: 'Painel do Hodômetro (KM)' })}
          />

          {/* 3...N. DEFEITOS REPORTADOS */}
          {defeitosArray.map((defeito, idx) => {
            const defId = defeito.id !== undefined && defeito.id !== null ? defeito.id : idx;
            return (
              <CardEvidenciaSlot
                key={defId}
                title={`Foto do Defeito #${idx + 1}: ${defeito.categoria || 'Avaria'}`}
                subtitle={defeito.descricao ? `Avaria relatada: "${defeito.descricao}"` : 'Foto evidenciando o defeito ou peça danificada'}
                badge="OBRIGATÓRIO"
                fotoUrl={defeito.fotoDefeito}
                isLoading={loadingSlot === `defeito_${defId}`}
                onCaptureCamera={() => handleCaptureDefeito(defId, 'camera')}
                onCaptureGallery={() => handleCaptureDefeito(defId, 'photos')}
                onRemove={() => handleRemoveDefeito(defId)}
                onPreview={() => onPreviewImage && onPreviewImage({ url: defeito.fotoDefeito, label: `Defeito #${idx + 1}: ${defeito.categoria || 'Avaria'}` })}
              />
            );
          })}

          {/* 4. FOTO ADICIONAL (COMPLEMENTAR / OPCIONAL) */}
          <CardEvidenciaSlot
            title="Foto Adicional (Opcional)"
            subtitle="Evidência complementar, ângulo extra ou documento relevante"
            badge="OPCIONAL"
            fotoUrl={fotosChamado?.fotoAdicional}
            isLoading={loadingSlot === 'adicional'}
            onCaptureCamera={() => handleCapture('adicional', 'camera')}
            onCaptureGallery={() => handleCapture('adicional', 'photos')}
            onRemove={() => handleRemove('adicional')}
            onPreview={() => onPreviewImage && onPreviewImage({ url: fotosChamado?.fotoAdicional, label: 'Foto Adicional' })}
          />

        </div>

        {/* Rodapé com Ações */}
        <div className="p-5 sm:p-6 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-3.5 rounded-xl font-bold text-xs sm:text-sm text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-[0.98] transition-all"
          >
            Voltar ao Formulário
          </button>

          <button
            type="button"
            disabled={!todasConcluidas}
            onClick={() => {
              if (todasConcluidas && onConcluirChamado) {
                onConcluirChamado();
              }
            }}
            className={`w-full sm:w-auto px-8 py-3.5 rounded-xl font-black text-xs sm:text-sm text-white shadow-lg active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2 ${
              todasConcluidas
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-emerald-600/30 cursor-pointer animate-pulse'
                : 'bg-slate-300 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed shadow-none'
            }`}
          >
            {todasConcluidas ? (
              <>
                <span>Concluir e Abrir Chamado</span>
                <CheckCircle2 size={18} />
              </>
            ) : (
              <>
                <span>Faltam {totalObrigatorias - totalConcluidas} Foto(s) Obrigatória(s)</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}

/**
 * Card individual de slot de foto com suporte à Câmera e Galeria
 */
function CardEvidenciaSlot({
  title,
  subtitle,
  badge = 'OBRIGATÓRIO',
  fotoUrl,
  isLoading = false,
  onCaptureCamera,
  onCaptureGallery,
  onRemove,
  onPreview
}) {
  const isAnexada = Boolean(fotoUrl);
  const isObrigatorio = badge === 'OBRIGATÓRIO';

  return (
    <div className={`p-4 rounded-2xl border transition-all duration-200 ${
      isAnexada
        ? 'bg-white dark:bg-slate-800 border-emerald-200/80 dark:border-emerald-800/60 shadow-xs'
        : isObrigatorio
        ? 'bg-amber-50/50 dark:bg-amber-950/20 border-2 border-dashed border-amber-300 dark:border-amber-700/60'
        : 'bg-white dark:bg-slate-800 border-dashed border-slate-200 dark:border-slate-700'
    }`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Info do Slot */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="text-xs sm:text-sm font-black text-slate-800 dark:text-slate-100">
              {title}
            </h4>
            <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md ${
              isAnexada
                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                : isObrigatorio
                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 animate-pulse'
                : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
            }`}>
              {isAnexada ? '✓ Anexada' : badge}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 font-medium leading-tight">
            {subtitle}
          </p>
        </div>

        {/* Área de Visualização ou Botões de Ação */}
        <div className="shrink-0 flex items-center gap-2">
          {isLoading ? (
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-500 text-xs font-bold">
              <Loader2 size={16} className="animate-spin text-blue-600" />
              <span>Processando...</span>
            </div>
          ) : isAnexada ? (
            <div className="flex items-center gap-2">
              {/* Thumbnail com Zoom */}
              <div 
                onClick={onPreview}
                className="relative w-16 h-14 rounded-xl overflow-hidden border border-emerald-300 dark:border-emerald-700 cursor-zoom-in group shadow-xs hover:opacity-95 transition-all"
                title="Clique para expandir em tela cheia"
              >
                <img 
                  src={fotoUrl} 
                  alt={title} 
                  className="w-full h-full object-cover" 
                />
                <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity">
                  <ZoomIn size={14} />
                </div>
              </div>

              {/* Botões de Troca Rápida */}
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={onCaptureCamera}
                    className="p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg text-xs font-bold transition-colors"
                    title="Tirar outra foto com a Câmera"
                  >
                    <Camera size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={onCaptureGallery}
                    className="p-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-lg text-xs font-bold transition-colors"
                    title="Substituir pela Galeria"
                  >
                    <ImageIcon size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={onRemove}
                    className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg text-xs font-bold transition-colors"
                    title="Remover foto"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={onCaptureCamera}
                className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-black shadow-md shadow-blue-500/20 active:scale-[0.97] transition-all"
              >
                <Camera size={14} />
                <span>Tirar Foto</span>
              </button>

              <button
                type="button"
                onClick={onCaptureGallery}
                className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold active:scale-[0.97] transition-all"
              >
                <ImageIcon size={14} />
                <span>Galeria</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
