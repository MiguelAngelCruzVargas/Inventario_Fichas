// Simple client-side image compression and resize utility
// - Keeps aspect ratio
// - Scales down to fit within maxWidth x maxHeight
// - Encodes to WebP/JPEG with iterative quality reduction to fit under maxBytes

const estimateBase64Bytes = (dataUrl) => {
  try {
    const comma = dataUrl.indexOf(',');
    const base64 = comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
    // Approximate bytes from base64 length
    return Math.ceil((base64.length * 3) / 4);
  } catch {
    return dataUrl.length;
  }
};

export async function compressImageFile(file, options = {}) {
  const {
    maxWidth = 320,
    maxHeight = 320,
    maxBytes = 300 * 1024, // 300KB target
  // Usar JPEG para compatibilidad con el backend (PNG/JPEG/JPG aceptados)
  preferredMime = 'image/jpeg',
  } = options;

  if (!file || !file.type?.startsWith('image/')) {
    throw new Error('El archivo no es una imagen válida');
  }

  const arrayBuffer = await file.arrayBuffer();
  const blobUrl = URL.createObjectURL(new Blob([arrayBuffer]));
  try {
    const img = await new Promise((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error('No se pudo leer la imagen'));
      i.src = blobUrl;
    });

    // Compute target dimensions preserving aspect ratio
    const srcW = img.width;
    const srcH = img.height;
    let scale = Math.min(maxWidth / srcW, maxHeight / srcH, 1); // never upscale
    let targetW = Math.max(1, Math.round(srcW * scale));
    let targetH = Math.max(1, Math.round(srcH * scale));

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    let quality = 0.86; // start slightly under 0.9
    let mime = preferredMime;

    let dataUrl;
    let safety = 0;
    do {
      canvas.width = targetW;
      canvas.height = targetH;
      // Draw with high quality
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.clearRect(0, 0, targetW, targetH);
      ctx.drawImage(img, 0, 0, targetW, targetH);

      // Try current quality
      dataUrl = canvas.toDataURL(mime, quality);
      const bytes = estimateBase64Bytes(dataUrl);

      if (bytes <= maxBytes) break;

      // Reduce quality first, then dimensions if needed
      if (quality > 0.6) {
        quality = Math.max(0.6, quality - 0.1);
      } else {
        // reduce size by 15% and reset quality a bit higher
        targetW = Math.max(64, Math.round(targetW * 0.85));
        targetH = Math.max(64, Math.round(targetH * 0.85));
        quality = Math.min(0.8, quality + 0.05);
      }
      safety += 1;
    } while (safety < 12);

    return dataUrl;
  } finally {
    URL.revokeObjectURL(blobUrl);
  }
}

export function humanFileSize(bytes) {
  const thresh = 1024;
  if (Math.abs(bytes) < thresh) {
    return bytes + ' B';
  }
  const units = ['KB', 'MB', 'GB'];
  let u = -1;
  do {
    bytes /= thresh;
    ++u;
  } while (Math.abs(bytes) >= thresh && u < units.length - 1);
  return bytes.toFixed(1) + ' ' + units[u];
}
