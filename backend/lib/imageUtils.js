import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

// Parámetros con defaults (pueden sobreescribirse vía env)
const MAX_INPUT_MB = parseInt(process.env.TASK_IMAGE_MAX_INPUT_MB || process.env.NOTE_IMAGE_MAX_INPUT_MB || '12', 10);
const MAX_DIM = parseInt(process.env.TASK_IMAGE_MAX_DIM || process.env.NOTE_IMAGE_MAX_DIM || '1600', 10);
const TARGET_MAX_KB = parseInt(process.env.TASK_IMAGE_TARGET_MAX_KB || process.env.NOTE_IMAGE_TARGET_MAX_KB || '600', 10);
const START_QUALITY = parseInt(process.env.TASK_IMAGE_START_QUALITY || process.env.NOTE_IMAGE_START_QUALITY || '82', 10);
const MIN_QUALITY = parseInt(process.env.TASK_IMAGE_MIN_QUALITY || process.env.NOTE_IMAGE_MIN_QUALITY || '55', 10);
const MIN_DIM = parseInt(process.env.TASK_IMAGE_MIN_DIM || process.env.NOTE_IMAGE_MIN_DIM || '800', 10);

export async function compressAdaptive(buffer){
  let quality = START_QUALITY;
  let dim = MAX_DIM;
  const targetBytes = TARGET_MAX_KB * 1024;
  let last = buffer;
  let iterations = 0;
  while(true){
    iterations++;
    const out = await sharp(last, { failOn: 'none' })
      .rotate()
      .resize({ width: dim, height: dim, fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality, mozjpeg: true })
      .toBuffer();
    last = out;
    if(out.length <= targetBytes) break;
    if(quality <= MIN_QUALITY){
      if(dim > MIN_DIM){
        dim = Math.max(MIN_DIM, Math.round(dim * 0.9));
        quality = Math.max(MIN_QUALITY, quality - 2);
        continue;
      }
      break;
    }
    quality = Math.max(MIN_QUALITY, quality - 5);
    if(iterations > 25) break;
  }
  return { buffer: last, qualityFinal: quality, dimFinal: dim };
}

export function ensureDir(p){
  if(!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

export function removeIfLocal(relativePath){
  if(relativePath && relativePath.startsWith('/uploads/tareas/')){
    const full = path.resolve('.' + relativePath);
    if(fs.existsSync(full)) fs.unlink(full, ()=>{});
  }
}

export const validateImage = (file) => {
  if(!file) return 'Archivo inexistente';
  const allowed = ['image/jpeg','image/jpg','image/png','image/webp','image/heic','image/heif'];
  if(!allowed.includes(file.mimetype)) return 'Tipo de archivo no permitido';
  if(file.size > MAX_INPUT_MB * 1024 * 1024) return `Archivo demasiado grande (> ${MAX_INPUT_MB}MB)`;
  return null;
};
