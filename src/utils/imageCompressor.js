// ============================================================================
// UTILITÁRIO DE COMPRESSÃO E OTIMIZAÇÃO DE IMAGENS (Web Canvas)
// ============================================================================

/**
 * Comprime um arquivo de imagem (File/Blob) ou string DataURL via HTML5 Canvas.
 * Redimensiona proporcionalmente mantendo resolução ideal (máx 1280px) e qualidade 0.75 JPEG,
 * reduzindo fotos de smartphone (3-10 MB) para aproximadamente 60-120 KB.
 *
 * @param {File|Blob|string} source - Arquivo File/Blob ou DataURL de origem.
 * @param {Object} [options]
 * @param {number} [options.maxWidth=1280] - Largura máxima em pixels.
 * @param {number} [options.maxHeight=1280] - Altura máxima em pixels.
 * @param {number} [options.quality=0.75] - Qualidade JPEG (0.1 a 1.0).
 * @param {string} [options.mimeType='image/jpeg'] - Formato de saída.
 * @returns {Promise<string>} Promessa que resolve para a string DataURL otimizada.
 */
export async function compressImageToDataUrl(source, options = {}) {
  const {
    maxWidth = 1280,
    maxHeight = 1280,
    quality = 0.75,
    mimeType = 'image/jpeg'
  } = options;

  if (!source) return '';

  return new Promise((resolve, reject) => {
    // 1. Obter URL do source
    let objectUrl = null;
    let srcUrl = '';

    if (typeof source === 'string') {
      srcUrl = source;
    } else if (source instanceof Blob || source instanceof File) {
      // Se não for imagem (ex: PDF), não tentar comprimir com canvas
      if (source.type && !source.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = (err) => reject(err);
        reader.readAsDataURL(source);
        return;
      }
      try {
        objectUrl = URL.createObjectURL(source);
        srcUrl = objectUrl;
      } catch (e) {
        const reader = new FileReader();
        reader.onloadend = () => {
          compressImageToDataUrl(reader.result, options).then(resolve).catch(reject);
        };
        reader.onerror = (err) => reject(err);
        reader.readAsDataURL(source);
        return;
      }
    } else {
      resolve('');
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }

      try {
        let { width, height } = img;

        // Se imagem já for pequena e não for muito pesada, redimensionar apenas se exceder maxWidth/maxHeight
        if (width > maxWidth || height > maxHeight) {
          if (width > height) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, width);
        canvas.height = Math.max(1, height);

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(srcUrl);
          return;
        }

        // Fundo branco caso haja transparência convertida para JPEG
        if (mimeType === 'image/jpeg') {
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        const compressedDataUrl = canvas.toDataURL(mimeType, quality);
        resolve(compressedDataUrl);
      } catch (err) {
        console.warn('Falha na compressão da imagem via canvas, utilizando original:', err);
        resolve(srcUrl);
      }
    };

    img.onerror = (err) => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
      console.warn('Erro ao carregar imagem para compressão, tentando fallback:', err);
      // Fallback para FileReader padrão se ainda for File/Blob
      if (source instanceof Blob || source instanceof File) {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = () => reject(err);
        reader.readAsDataURL(source);
      } else {
        resolve(srcUrl);
      }
    };

    img.src = srcUrl;
  });
}
