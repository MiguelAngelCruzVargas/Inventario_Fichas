// routes/archive.js - Endpoints de archivado / export súper protegidos
import express from 'express';
import { authenticateToken, requireRole } from '../auth.js';
import { db } from '../database.js';

const router = express.Router();

// Defensa en profundidad: middleware de puerta
router.use(authenticateToken, requireRole(['admin']), (req, res, next) => {
  if (process.env.ENABLE_DATA_EXPORT !== '1') {
    // Fingir inexistencia
    return res.status(404).json({ error: 'Not found' });
  }
  const key = req.header('X-Archive-Key');
  if (!key || key !== process.env.ARCHIVE_OPS_KEY) {
    return res.status(404).json({ error: 'Not found' });
  }
  const ipList = (process.env.ARCHIVE_ALLOWED_IPS || '')
    .split(',')
    .map(i => i.trim())
    .filter(Boolean);
  if (ipList.length > 0) {
    const remote = (req.ip || '').replace('::ffff:', '');
    if (!ipList.includes(remote)) {
      return res.status(404).json({ error: 'Not found' });
    }
  }
  next();
});

// Catálogo interno de entidades exportables
const ENTITIES = {
  clientes: {
    sql: ({ onlyActivos }) => `SELECT * FROM clientes ${onlyActivos ? 'WHERE activo=1' : ''}`,
    deps: ['clientes_pagos','equipos','ventas_ocasionales']
  },
  clientes_pagos: {
    sql: ({ onlyActivos }) => `SELECT cp.* FROM clientes_pagos cp JOIN clientes c ON c.id=cp.cliente_id ${onlyActivos ? 'WHERE c.activo=1' : ''}`
  },
  revendedores: {
    sql: ({ onlyActivos }) => `SELECT * FROM revendedores ${onlyActivos ? 'WHERE activo=1' : ''}`
  },
  usuarios: {
    sql: ({ onlyActivos }) => `SELECT id,username,role,tipo_usuario,activo,revendedor_id,cliente_id,created_at FROM usuarios ${onlyActivos ? 'WHERE activo=1' : ''}`
  },
  tipos_ficha: { sql: () => 'SELECT * FROM tipos_ficha' }
};

function parseEntities(raw) {
  if (!raw) return [];
  return raw.split(',').map(s => s.trim()).filter(e => ENTITIES[e]);
}

// Preview: conteos y dependencias sugeridas
router.get('/preview', async (req, res) => {
  const entities = parseEntities(req.query.entities || '');
  const onlyActivos = req.query.onlyActivos === '1';
  if (entities.length === 0) {
    return res.status(400).json({ error: 'Debe especificar ?entities=lista (ej: clientes,clientes_pagos)' });
  }
  const result = { snapshot_version: 1, onlyActivos, generated_at: new Date().toISOString(), entities: {}, suggestions: {} };
  try {
    for (const ent of entities) {
      const cfg = ENTITIES[ent];
      const countSql = `SELECT COUNT(*) as c FROM (${cfg.sql({ onlyActivos })}) AS tmp`;
      const [rows] = await db.execute(countSql);
      result.entities[ent] = { count: rows[0].c, deps: cfg.deps || [] };
      (cfg.deps || []).forEach(d => { if (!result.suggestions[d]) result.suggestions[d] = 'Dependencia potencial'; });
    }
    res.json(result);
  } catch (e) {
    console.error('[archive.preview] Error:', e);
    res.status(500).json({ error: 'Error generando preview' });
  }
});

// Export online controlado (limitado en volumen)
router.post('/export', express.json({ limit: '1mb' }), async (req, res) => {
  const { entities, onlyActivos = false } = req.body || {};
  if (!Array.isArray(entities) || entities.length === 0) return res.status(400).json({ error: 'Body inválido: entities[] requerido' });
  const filtered = entities.filter(e => ENTITIES[e]);
  if (filtered.length === 0) return res.status(400).json({ error: 'Ninguna entidad válida' });
  const maxRows = parseInt(process.env.ARCHIVE_MAX_ROWS || '20000', 10);
  const snapshot = {
    snapshot_version: 1,
    schema_version: process.env.SCHEMA_VERSION || 'unversioned',
    exported_at: new Date().toISOString(),
    filters: { only_activos: !!onlyActivos, entities: filtered },
    entities: {},
    notice: 'Uso interno. Para datasets grandes usar script offline.'
  };
  let total = 0;
  try {
    for (const ent of filtered) {
      const cfg = ENTITIES[ent];
      const [rows] = await db.execute(cfg.sql({ onlyActivos }));
      total += rows.length;
      if (total > maxRows) {
        return res.status(413).json({ error: 'Límite de filas excedido para export online', maxRows });
      }
      snapshot.entities[ent] = { row_count: rows.length, data: rows };
    }
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('X-Export-RowTotal', String(total));
    res.status(200).json(snapshot);
  } catch (e) {
    console.error('[archive.export] Error:', e);
    res.status(500).json({ error: 'Error exportando datos' });
  }
});

export default router;
