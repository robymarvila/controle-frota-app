// ============================================================================
// UTILITÁRIO UNIFICADO DE CAPTURA DE FOTOS (PARIDADE TOTAL PWA & APK)
// ============================================================================
import { Capacitor } from '@capacitor/core';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { compressImageToDataUrl } from './imageCompressor';

/**
 * Captura uma foto da Câmera ou da Galeria com paridade absoluta entre:
 * - APK nativo Android/iOS (via @capacitor/camera com fallback transparente);
 * - PWA / Navegador Mobile (usando capture="environment" para abrir câmera traseira);
 * - Desktop / Web PWA (usando seletor padrão de imagem).
 * 
 * Todas as fotos capturadas passam obrigatoriamente pelo compressImageToDataUrl
 * mantendo padrão Base64 DataURL ultra leve (~60 a 100 KB) e resolução ideal (1280px máx).
 *
 * @param {'camera' | 'photos' | 'gallery'} sourceMode - Origem da imagem ('camera' ou 'photos'/'gallery')
 * @returns {Promise<string | null>} Retorna a string DataURL comprimida ou null se cancelado pelo usuário.
 */
export async function capturePhotoUnified(sourceMode = 'camera') {
  const isCamera = sourceMode === 'camera';

  // 1. Tentar execução nativa no APK (Capacitor)
  if (Capacitor.isNativePlatform()) {
    try {
      const image = await Camera.getPhoto({
        quality: 85,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: isCamera ? CameraSource.Camera : CameraSource.Photos,
        promptLabelHeader: isCamera ? 'Tirar Foto' : 'Selecionar da Galeria',
        promptLabelCancel: 'Cancelar',
        promptLabelPhoto: 'Da Galeria',
        promptLabelPicture: 'Tirar Foto'
      });

      if (image && image.dataUrl) {
        // Passa pelo compressor para padronizar dimensões e compressão Canvas
        const compressed = await compressImageToDataUrl(image.dataUrl);
        return compressed;
      }
      return null;
    } catch (err) {
      const errMsg = String(err?.message || err || '').toLowerCase();
      // Se o usuário simplesmente cancelou a foto, não faz fallback e retorna null
      if (errMsg.includes('cancel') || errMsg.includes('user cancelled') || errMsg.includes('closed')) {
        return null;
      }
      console.warn('Falha no plugin nativo de câmera, acionando fallback HTML5 PWA:', err);
      // Caso contrário, continua para o fallback HTML5 PWA
    }
  }

  // 2. Execução no PWA / Web ou Fallback Seguro
  return new Promise((resolve) => {
    try {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.style.position = 'fixed';
      input.style.top = '-9999px';
      input.style.left = '-9999px';
      input.style.opacity = '0';
      input.style.pointerEvents = 'none';

      // Se for câmera no smartphone (PWA), aciona o visor traseiro diretamente
      if (isCamera) {
        input.setAttribute('capture', 'environment');
      }

      let resolved = false;

      const onWindowFocus = () => {
        setTimeout(() => {
          if (!resolved) {
            resolved = true;
            cleanup();
            resolve(null);
          }
        }, 600);
      };

      const cleanup = () => {
        window.removeEventListener('focus', onWindowFocus);
        if (input.parentNode) {
          input.parentNode.removeChild(input);
        }
      };

      input.onchange = async (e) => {
        if (resolved) return;
        resolved = true;
        const file = e.target.files && e.target.files[0];
        cleanup();

        if (!file) {
          resolve(null);
          return;
        }

        try {
          const compressed = await compressImageToDataUrl(file);
          resolve(compressed);
        } catch (err) {
          console.warn('Falha na compressão do arquivo de imagem, fallback FileReader:', err);
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.onerror = () => resolve(null);
          reader.readAsDataURL(file);
        }
      };

      // Listener para caso o usuário cancele o modal do navegador (quando suportado)
      input.oncancel = () => {
        if (resolved) return;
        resolved = true;
        cleanup();
        resolve(null);
      };

      window.addEventListener('focus', onWindowFocus);
      document.body.appendChild(input);

      // Dispara o clique programático
      input.click();

      // Timeout de segurança para limpeza de memória após 5 minutos
      setTimeout(() => {
        if (!resolved) {
          resolved = true;
          cleanup();
          resolve(null);
        }
      }, 300000);
    } catch (err) {
      console.error('Erro ao acionar input de foto PWA:', err);
      resolve(null);
    }
  });
}
