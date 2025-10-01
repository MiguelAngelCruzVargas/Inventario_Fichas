import express from 'express';
import { query, queryOne } from '../database.js';
import { authenticateToken, requireRole } from '../auth.js';
import bus from '../events/bus.js';
import multer from 'multer';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs';

const router = express.Router();

// ==============================================
// Configuración y utilidades de imágenes
// ==============================================
// Límites y parámetros ajustables vía variables de entorno
const MAX_INPUT_MB = parseInt(process.env.NOTE_IMAGE_MAX_INPUT_MB || '12', 10); // tamaño máximo aceptado del archivo original
const MAX_DIM = parseInt(process.env.NOTE_IMAGE_MAX_DIM || '1600', 10);          // dimensión máxima (ancho/alto) inicial
const TARGET_MAX_KB = parseInt(process.env.NOTE_IMAGE_TARGET_MAX_KB || '600', 10); // objetivo de peso final aproximado
const START_QUALITY = parseInt(process.env.NOTE_IMAGE_START_QUALITY || '82', 10); // calidad inicial
const MIN_QUALITY = parseInt(process.env.NOTE_IMAGE_MIN_QUALITY || '55', 10);     // calidad mínima permitida
const MIN_DIM = parseInt(process.env.NOTE_IMAGE_MIN_DIM || '800', 10);            // dimensión mínima al reducir
const MAX_IMAGES = parseInt(process.env.NOTE_IMAGES_MAX || '3', 10);              // máximo de imágenes por nota

// Configuración de subida (memoria para poder convertir / comprimir) - versión single y multi
// Endurecimiento seguridad: validación estricta de mimetypes y límite de tamaño dinámico
const baseMulterConfig = {
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_INPUT_MB * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = [ 'image/jpeg','image/jpg','image/png','image/webp','image/heic','image/heif' ];
    if (!allowed.includes(file.mimetype)) {
      return cb(new Error('Tipo de archivo no permitido'));
    }
    cb(null, true);
  }
};
const uploadSingle = multer(baseMulterConfig).single('imagen');
const uploadMulti = multer(baseMulterConfig).fields([
  { name: 'imagen', maxCount: 1 },
  { name: 'imagenes[]', maxCount: MAX_IMAGES }
]);

function hydrateNota(row) {
  if (!row) return row;
  let imgs = [];
  if (row.imagenes) {
    try { imgs = JSON.parse(row.imagenes || '[]') || []; } catch { imgs = row.imagen ? [row.imagen] : []; }
  } else if (row.imagen) {
    imgs = [row.imagen];
  }
  row.imagenes = imgs;
  if (!row.imagen && imgs[0]) row.imagen = imgs[0];
  return row;
}

function removeLocalImage(p) {
  if (p && typeof p === 'string' && p.startsWith('/uploads/notas/')) {
    const full = path.resolve('.' + p);
    if (fs.existsSync(full)) fs.unlink(full, () => {});
  }
}

/**
 * Comprime adaptativamente una imagen al formato JPEG
 * - Reduce calidad en pasos de 5 hasta llegar al objetivo
 * - Si alcanza la calidad mínima y sigue pesada, reduce dimensiones gradualmente
 * - Devuelve { buffer, qualityFinal, dimFinal }
 */
async function compressAdaptive(inputBuffer) {
  let quality = START_QUALITY;
  let dim = MAX_DIM;
  const targetBytes = TARGET_MAX_KB * 1024;
  let lastBuffer = inputBuffer;
  let iterations = 0;
  while (true) {
    iterations++;
    const pipeline = sharp(lastBuffer, { failOn: 'none' })
      .rotate() // respeta orientación EXIF
      .resize({ width: dim, height: dim, fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality, mozjpeg: true });
    const out = await pipeline.toBuffer();
    lastBuffer = out;

    // Condición de salida: peso dentro del objetivo o no hay más margen de reducción
    if (out.length <= targetBytes) break;
    if (quality <= MIN_QUALITY) {
      // Intentar reducir dimensiones si aún podemos bajar
      if (dim > MIN_DIM) {
        dim = Math.max(MIN_DIM, Math.round(dim * 0.9));
        // Pequeño ajuste adicional de calidad si todavía no estamos en el mínimo absoluto
        quality = Math.max(MIN_QUALITY, quality - 2);
        continue;
      }
      // No se pudo bajar más; aceptamos este resultado
      break;
    }
    quality = Math.max(MIN_QUALITY, quality - 5);
    if (iterations > 25) break; // salvaguarda
  }
  return { buffer: lastBuffer, qualityFinal: quality, dimFinal: dim };
}

// POST /notas - crear nota (trabajador o admin) con 0..N imágenes
router.post('/', authenticateToken, requireRole(['trabajador','admin']), uploadMulti, async (req, res) => {
  try {
    const { titulo, contenido, revendedor_id } = req.body;
    if (!titulo || !contenido) {
      return res.status(400).json({ error: 'Datos incompletos', detail: 'Se requiere titulo y contenido' });
    }
    if (titulo.length > 150) {
      return res.status(400).json({ error: 'Título demasiado largo (max 150 chars)' });
    }
    if (revendedor_id) {
      const rev = await queryOne('SELECT id FROM revendedores WHERE id = ? AND activo = 1', [revendedor_id]);
      if (!rev) return res.status(404).json({ error: 'Revendedor no encontrado' });
    }
    // Recolectar archivos (legacy 'imagen' o nuevo 'imagenes[]')
    const single = req.files?.imagen?.[0];
    const multiples = req.files?.['imagenes[]'] || [];
    let archivos = multiples.length ? multiples : (single ? [single] : []);
    if (archivos.length > MAX_IMAGES) {
      return res.status(400).json({ error: 'Exceso de imágenes', detail: `Máximo ${MAX_IMAGES}` });
    }
    const uploadsRoot = path.resolve('./uploads');
    const notasDir = path.join(uploadsRoot, 'notas');
    if (!fs.existsSync(notasDir)) fs.mkdirSync(notasDir, { recursive: true });
    const imagenesPaths = [];
    for (let i=0;i<archivos.length;i++) {
      const file = archivos[i];
      try {
        if (file.size > MAX_INPUT_MB * 1024 * 1024) {
          return res.status(400).json({ error: 'Archivo demasiado grande', detail: `Máximo permitido ${MAX_INPUT_MB}MB (imagen #${i+1})` });
        }
        const baseName = `nota_${Date.now()}_${Math.floor(Math.random()*1e6)}_${i}`;
        const finalFilename = `${baseName}.jpg`;
        const finalPath = path.join(notasDir, finalFilename);
        const { buffer: optimizedBuffer, qualityFinal, dimFinal } = await compressAdaptive(file.buffer);
        fs.writeFileSync(finalPath, optimizedBuffer);
        const storedPath = `/uploads/notas/${finalFilename}`;
        imagenesPaths.push(storedPath);
        if (process.env.NODE_ENV !== 'production') {
          console.log(`[IMG] Nota img#${i+1}/${archivos.length} -> ${finalFilename} ${(optimizedBuffer.length/1024).toFixed(1)}KB q${qualityFinal} dim<=${dimFinal}`);
        }
      } catch (eImg) {
        console.error('Error procesando imagen múltiple:', eImg);
        return res.status(400).json({ error: 'Imagen inválida', detail: `Fallo procesando imagen #${i+1}` });
      }
    }
    const firstImage = imagenesPaths[0] || null;
    const imagenesJson = imagenesPaths.length ? JSON.stringify(imagenesPaths) : null;

    const result = await query(
      'INSERT INTO notas_trabajadores (usuario_id, revendedor_id, titulo, contenido, imagen, imagenes) VALUES (?, ?, ?, ?, ?, ?)',
      [req.user.id, revendedor_id || null, titulo.trim(), contenido.trim(), firstImage, imagenesJson]
    );
    const nota = await queryOne(
      `SELECT n.*, u.username, COALESCE(r.responsable, r.nombre, r.nombre_negocio) AS revendedor_nombre
       FROM notas_trabajadores n
       JOIN usuarios u ON n.usuario_id = u.id
       LEFT JOIN revendedores r ON n.revendedor_id = r.id
       WHERE n.id = ?`, [result.insertId]
    );
    const hydrated = hydrateNota(nota);
    res.status(201).json(hydrated);
    bus.emit('broadcast', { type: 'nota-creada', payload: hydrated });
  } catch (e) {
    console.error('Error creando nota:', e);
    if (e.message === 'Tipo de archivo no permitido') {
      return res.status(400).json({ error: 'Archivo no permitido', detail: 'Formatos aceptados: jpg, jpeg, png, webp, heic, heif' });
    }
    res.status(500).json({ error: 'Error interno', detail: 'No se pudo crear la nota' });
  }
});

// GET /notas - listar notas (admin ve todas, trabajador sólo propias)
router.get('/', authenticateToken, requireRole(['trabajador','admin']), async (req, res) => {
  try {
    const { revendedor_id, usuario_id, q, page = 1, pageSize = 25 } = req.query;
    const p = Math.max(1, parseInt(page));
    const ps = Math.min(100, Math.max(1, parseInt(pageSize)));
    const offset = (p - 1) * ps;

    const params = [];
    let where = 'WHERE 1=1';
    if (req.user.role === 'trabajador') {
      where += ' AND n.usuario_id = ?';
      params.push(req.user.id);
    }
    // Filtro por trabajador (solo admins pueden listar por cualquier usuario; para trabajador ya está limitado arriba)
    if (usuario_id) {
      where += ' AND n.usuario_id = ?';
      params.push(parseInt(usuario_id));
    }
    if (revendedor_id) {
      where += ' AND n.revendedor_id = ?';
      params.push(parseInt(revendedor_id));
    }
    if (q) {
      where += ' AND (n.titulo LIKE ? OR n.contenido LIKE ?)';
      const like = `%${q}%`; params.push(like, like);
    }

    const totalRows = await query(`SELECT COUNT(*) as total FROM notas_trabajadores n ${where}`, params);
    const total = totalRows[0]?.total || 0;

    let notas = await query(
      `SELECT n.*, u.username, COALESCE(r.responsable, r.nombre, r.nombre_negocio) AS revendedor_nombre
       FROM notas_trabajadores n
       JOIN usuarios u ON n.usuario_id = u.id
       LEFT JOIN revendedores r ON n.revendedor_id = r.id
       ${where}
       ORDER BY n.created_at DESC
       LIMIT ? OFFSET ?`, [...params, ps, offset]
    );
    notas = notas.map(hydrateNota);
    res.json({ page: p, pageSize: ps, total, items: notas });
  } catch (e) {
    console.error('Error listando notas:', e);
    res.status(500).json({ error: 'Error interno', detail: 'No se pudieron obtener las notas' });
  }
});

// PUT /notas/:id - actualizar nota (autor o admin) con posible reemplazo/agregado de imagen
// Reglas:
// - Trabajador sólo puede editar si estado = 0 (pendiente)
// - Admin puede editar siempre
// - Si se envía nueva imagen la anterior se elimina (si existe y es local)
router.put('/:id', authenticateToken, requireRole(['trabajador','admin']), uploadMulti, async (req, res) => {
  try {
    const { id } = req.params;
    const { titulo, contenido } = req.body;
    const nota = await queryOne('SELECT * FROM notas_trabajadores WHERE id = ?', [id]);
    if (!nota) return res.status(404).json({ error: 'Nota no encontrada' });
    if (req.user.role !== 'admin' && nota.usuario_id !== req.user.id) {
      return res.status(403).json({ error: 'No autorizado' });
    }
    if (req.user.role === 'trabajador' && nota.estado === 1) {
      return res.status(400).json({ error: 'No editable', detail: 'La nota ya fue marcada como realizada' });
    }

    const updates = [];
    const params = [];
    if (titulo) { updates.push('titulo = ?'); params.push(titulo.slice(0,150)); }
    if (contenido) { updates.push('contenido = ?'); params.push(contenido); }

    // Procesar nuevas imágenes si vienen (replace completo si hay al menos 1)
    const single = req.files?.imagen?.[0];
    const multiples = req.files?.['imagenes[]'] || [];
    const nuevos = multiples.length ? multiples : (single ? [single] : []);
    let nuevasRutas = null;
    if (nuevos.length) {
      if (nuevos.length > MAX_IMAGES) {
        return res.status(400).json({ error: 'Exceso de imágenes', detail: `Máximo ${MAX_IMAGES}` });
      }
      const uploadsRoot = path.resolve('./uploads');
      const notasDir = path.join(uploadsRoot, 'notas');
      if (!fs.existsSync(notasDir)) fs.mkdirSync(notasDir, { recursive: true });
      const rutas = [];
      for (let i=0;i<nuevos.length;i++) {
        const file = nuevos[i];
        try {
          if (file.size > MAX_INPUT_MB * 1024 * 1024) {
            return res.status(400).json({ error: 'Archivo demasiado grande', detail: `Máximo ${MAX_INPUT_MB}MB (imagen #${i+1})` });
          }
          const baseName = `nota_${Date.now()}_${Math.floor(Math.random()*1e6)}_${i}`;
          const finalFilename = `${baseName}.jpg`;
          const finalPath = path.join(notasDir, finalFilename);
          const { buffer: optimizedBuffer, qualityFinal, dimFinal } = await compressAdaptive(file.buffer);
          fs.writeFileSync(finalPath, optimizedBuffer);
          rutas.push(`/uploads/notas/${finalFilename}`);
          if (process.env.NODE_ENV !== 'production') {
            console.log(`[IMG] Nota update img#${i+1}/${nuevos.length} -> ${finalFilename} ${(optimizedBuffer.length/1024).toFixed(1)}KB q${qualityFinal} dim<=${dimFinal}`);
          }
        } catch (eImg) {
          console.error('Error procesando imagen update:', eImg);
          return res.status(400).json({ error: 'Imagen inválida', detail: `Fallo procesando imagen #${i+1}` });
        }
      }
      nuevasRutas = rutas;
      // eliminar anteriores
      let prevList = [];
      if (nota.imagenes) {
        try { prevList = JSON.parse(nota.imagenes)||[]; } catch { prevList = nota.imagen ? [nota.imagen] : []; }
      } else if (nota.imagen) { prevList = [nota.imagen]; }
      prevList.forEach(removeLocalImage);
      // set new fields
      updates.push('imagen = ?'); params.push(rutas[0] || null);
      updates.push('imagenes = ?'); params.push(JSON.stringify(rutas));
    }

    // Si no se reemplazaron imágenes pero la nota antigua no tenía imagen y se envía nada, no tocamos campos de imagen

    if (!updates.length) return res.status(400).json({ error: 'Sin cambios' });
    params.push(id);
    await query(`UPDATE notas_trabajadores SET ${updates.join(', ')}, updated_at = NOW() WHERE id = ?`, params);
    const updated = await queryOne(`SELECT n.*, u.username, COALESCE(r.responsable, r.nombre, r.nombre_negocio) AS revendedor_nombre
                  FROM notas_trabajadores n
                  JOIN usuarios u ON n.usuario_id = u.id
                  LEFT JOIN revendedores r ON n.revendedor_id = r.id
                  WHERE n.id = ?`, [id]);
    const hydrated = hydrateNota(updated);
    res.json(hydrated);
    bus.emit('broadcast', { type: 'nota-actualizada', payload: hydrated });
  } catch (e) {
    console.error('Error actualizando nota:', e);
    if (e.message === 'Tipo de archivo no permitido') {
      return res.status(400).json({ error: 'Archivo no permitido', detail: 'Formatos aceptados: jpg, jpeg, png, webp, heic, heif' });
    }
    res.status(500).json({ error: 'Error interno', detail: 'No se pudo actualizar la nota' });
  }
});

// PATCH /notas/:id/estado - cambiar estado (pendiente/realizada) autor o admin
router.patch('/:id/estado', authenticateToken, requireRole(['trabajador','admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const { estado } = req.body; // valores esperados: 'pendiente' | 'realizada'
    if (!['pendiente','realizada',0,1,'0','1'].includes(estado)) {
      return res.status(400).json({ error: 'Estado inválido' });
    }
    const nota = await queryOne('SELECT usuario_id FROM notas_trabajadores WHERE id = ?', [id]);
    if (!nota) return res.status(404).json({ error: 'Nota no encontrada' });
    if (req.user.role !== 'admin' && nota.usuario_id !== req.user.id) {
      return res.status(403).json({ error: 'No autorizado' });
    }
    // Normalizar a tinyint 0/1
    const val = (estado === 'realizada' || estado === 1 || estado === '1') ? 1 : 0;
  await query('UPDATE notas_trabajadores SET estado = ?, updated_at = NOW() WHERE id = ?', [val, id]);
  const updated = await queryOne(`SELECT n.*, u.username, COALESCE(r.responsable, r.nombre, r.nombre_negocio) AS revendedor_nombre
                  FROM notas_trabajadores n
                  JOIN usuarios u ON n.usuario_id = u.id
                  LEFT JOIN revendedores r ON n.revendedor_id = r.id
                  WHERE n.id = ?`, [id]);
    const hydrated = hydrateNota(updated);
    res.json(hydrated);
    bus.emit('broadcast', { type: 'nota-estado', payload: { id: Number(id), estado: val } });
  } catch (e) {
    console.error('Error cambiando estado nota:', e);
    res.status(500).json({ error: 'Error interno', detail: 'No se pudo actualizar el estado' });
  }
});

// DELETE /notas/:id - eliminar nota (autor o admin)
router.delete('/:id', authenticateToken, requireRole(['trabajador','admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const nota = await queryOne('SELECT usuario_id FROM notas_trabajadores WHERE id = ?', [id]);
    if (!nota) return res.status(404).json({ error: 'Nota no encontrada' });
    if (req.user.role !== 'admin' && nota.usuario_id !== req.user.id) {
      return res.status(403).json({ error: 'No autorizado' });
    }
  await query('DELETE FROM notas_trabajadores WHERE id = ?', [id]);
  res.json({ success: true });
  bus.emit('broadcast', { type: 'nota-eliminada', payload: { id: Number(id) } });
  } catch (e) {
    console.error('Error eliminando nota:', e);
    res.status(500).json({ error: 'Error interno', detail: 'No se pudo eliminar la nota' });
  }
});

export default router;
