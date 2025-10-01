import express from 'express';
import { authenticateToken, requireRole } from '../auth.js';
import { query, queryOne } from '../database.js';

const router = express.Router();

// Helper: asegurar esquema: columna cliente_id y revendedor_id nullable
const ensureClienteColumn = async () => {
  try {
    // 1) cliente_id
    const col = await query("SHOW COLUMNS FROM equipos LIKE 'cliente_id'");
    if (!Array.isArray(col) || col.length === 0) {
      try { await query('ALTER TABLE equipos ADD COLUMN cliente_id INT NULL AFTER revendedor_id'); } catch {}
      try { await query('ALTER TABLE equipos ADD INDEX idx_cliente (cliente_id)'); } catch {}
      try { await query('ALTER TABLE equipos ADD CONSTRAINT fk_equipos_cliente FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE SET NULL'); } catch {}
    }
    // 2) revendedor_id debe permitir NULL para soportar equipos asignados a clientes de servicio
    try {
      const rev = await query("SHOW COLUMNS FROM equipos LIKE 'revendedor_id'");
      const revCol = Array.isArray(rev) ? rev[0] : null;
      if (revCol && String(revCol.Null).toUpperCase() === 'NO') {
        try {
          await query('ALTER TABLE equipos MODIFY revendedor_id INT NULL');
        } catch (err) {
          // Si falla por la FK, intentar soltar y recrear la FK
          try { await query('ALTER TABLE equipos DROP FOREIGN KEY fk_equipos_revendedor'); } catch {}
          try { await query('ALTER TABLE equipos MODIFY revendedor_id INT NULL'); } catch {}
          try { await query('ALTER TABLE equipos ADD CONSTRAINT fk_equipos_revendedor FOREIGN KEY (revendedor_id) REFERENCES revendedores(id) ON DELETE CASCADE'); } catch {}
          try { await query('ALTER TABLE equipos ADD INDEX idx_revendedor (revendedor_id)'); } catch {}
        }
      }
    } catch {}
  } catch {}
};

// Crear equipo asignado a un cliente
router.post('/', authenticateToken, requireRole(['admin', 'trabajador']), async (req, res) => {
  try {
  // Garantizar que exista la columna cliente_id antes de cualquier SELECT posterior
  await ensureClienteColumn();
  const { nombre, descripcion, revendedor_id, cliente_id } = req.body;
    if (!nombre || String(nombre).trim().length < 2) {
      return res.status(400).json({ error: 'Nombre requerido', detail: 'El nombre debe tener al menos 2 caracteres' });
    }
    // Normalizar posibles valores tipo "rev-2" o "cli-3"
    let rid = revendedor_id;
    let cid = cliente_id;
    if (typeof rid === 'string') {
      if (rid.startsWith('rev-')) rid = Number(rid.slice(4));
      else if (/^\d+$/.test(rid)) rid = Number(rid);
      else rid = NaN;
    }
    if (typeof cid === 'string') {
      if (cid.startsWith('cli-')) cid = Number(cid.slice(4));
      else if (/^\d+$/.test(cid)) cid = Number(cid);
      else cid = NaN;
    }
    rid = Number(rid);
    cid = Number(cid);
    if (!Number.isFinite(rid) && !Number.isFinite(cid)) {
      return res.status(400).json({ error: 'Cliente requerido', detail: 'Debe indicar revendedor_id o cliente_id' });
    }
    let insertParams = [];
    if (Number.isFinite(cid)) {
      // Asegurar columna y validar cliente de servicio
      await ensureClienteColumn();
      const cli = await queryOne("SELECT id FROM clientes WHERE id = ? AND tipo = 'servicio' AND activo = 1", [cid]);
      if (!cli) return res.status(404).json({ error: 'Cliente no encontrado' });
      const result = await query(
        'INSERT INTO equipos (cliente_id, revendedor_id, nombre, descripcion) VALUES (?, NULL, ?, ?)',
        [cid, String(nombre).trim(), descripcion ? String(descripcion).trim() : null]
      );
      insertParams = [result.insertId];
    } else {
      // Validar revendedor
      const rev = await queryOne('SELECT id FROM revendedores WHERE id = ? AND activo = 1', [rid]);
      if (!rev) return res.status(404).json({ error: 'Cliente no encontrado' });
      const result = await query(
        'INSERT INTO equipos (revendedor_id, nombre, descripcion) VALUES (?, ?, ?)',
        [rid, String(nombre).trim(), descripcion ? String(descripcion).trim() : null]
      );
      insertParams = [result.insertId];
    }
    let nuevo;
    try {
      nuevo = await queryOne(
        `SELECT e.*, 
                COALESCE(r.responsable, r.nombre, r.nombre_negocio, c.nombre_completo) AS cliente_nombre,
                e.revendedor_id, e.cliente_id
           FROM equipos e 
           LEFT JOIN revendedores r ON r.id = e.revendedor_id
           LEFT JOIN clientes c ON c.id = e.cliente_id
          WHERE e.id = ?`,
        insertParams
      );
    } catch (err) {
      if (err && err.errno === 1054) { // Unknown column
        await ensureClienteColumn();
        nuevo = await queryOne(
          `SELECT e.*, 
                  COALESCE(r.responsable, r.nombre, r.nombre_negocio, c.nombre_completo) AS cliente_nombre,
                  e.revendedor_id, e.cliente_id
             FROM equipos e 
             LEFT JOIN revendedores r ON r.id = e.revendedor_id
             LEFT JOIN clientes c ON c.id = e.cliente_id
            WHERE e.id = ?`,
          insertParams
        );
      } else {
        throw err;
      }
    }
    res.status(201).json(nuevo);
  } catch (e) {
    console.error('Error creando equipo:', e);
    res.status(500).json({ error: 'Error interno', detail: e.message });
  }
});

// Listar equipos (opcional filtro por revendedor)
router.get('/', authenticateToken, requireRole(['admin', 'trabajador']), async (req, res) => {
  try {
    await ensureClienteColumn();
    const { revendedor_id, cliente_id, includeInactive, client_ref } = req.query;
    const onlyActive = !(includeInactive === '1' || includeInactive === 'true');
    const params = [];
    const filters = [];
    // Prioridad: client_ref si viene (rev-#, cli-#) para simplificar en frontend
    if (client_ref) {
      if (client_ref.startsWith('rev-')) {
        const id = Number(client_ref.slice(4));
        if (Number.isFinite(id)) { filters.push('e.revendedor_id = ?'); params.push(id); }
      } else if (client_ref.startsWith('cli-')) {
        const id = Number(client_ref.slice(4));
        if (Number.isFinite(id)) { filters.push('e.cliente_id = ?'); params.push(id); }
      }
    } else {
      if (revendedor_id) { filters.push('e.revendedor_id = ?'); params.push(Number(revendedor_id)); }
      if (cliente_id) { filters.push('e.cliente_id = ?'); params.push(Number(cliente_id)); }
    }
    const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
    const activeClause = onlyActive ? (where ? ' AND (r.id IS NULL OR r.activo = 1) AND (c.id IS NULL OR c.activo = 1)' : 'WHERE (r.id IS NULL OR r.activo = 1) AND (c.id IS NULL OR c.activo = 1)') : '';
    const sql = `SELECT e.*, 
                        COALESCE(r.responsable, r.nombre, r.nombre_negocio, c.nombre_completo) AS cliente_nombre,
                        e.revendedor_id, e.cliente_id
                   FROM equipos e 
                   LEFT JOIN revendedores r ON r.id = e.revendedor_id 
                   LEFT JOIN clientes c ON c.id = e.cliente_id
                   ${where}${activeClause}
                   ORDER BY e.created_at DESC`;
    let rows;
    try { rows = await query(sql, params); }
    catch (err) {
      if (err && err.errno === 1054) { await ensureClienteColumn(); rows = await query(sql, params); }
      else throw err;
    }
    res.json({ items: rows });
  } catch (e) {
    console.error('Error listando equipos:', e);
    res.status(500).json({ error: 'Error interno', detail: e.message });
  }
});

// Lista combinada de clientes activos (revendedores + clientes servicio) para selector
router.get('/clientes-activos', authenticateToken, requireRole(['admin','trabajador']), async (req,res)=>{
  try {
    const revs = await query(`SELECT id, COALESCE(responsable, nombre, nombre_negocio) AS nombre, 'revendedor' AS tipo
                                FROM revendedores WHERE activo = 1 ORDER BY nombre ASC`);
    const clientes = await query(`SELECT id, nombre_completo AS nombre, 'cliente' AS tipo
                                    FROM clientes WHERE activo = 1 AND tipo = 'servicio' ORDER BY nombre ASC`);
    res.json({ items: [...revs, ...clientes] });
  } catch (e) {
    console.error('Error listando clientes activos para equipos:', e);
    res.status(500).json({ error: 'Error interno', detail: e.message });
  }
});

// Actualizar equipo (nombre, descripcion, revendedor)
router.put('/:id', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
  // Asegurar columna antes del SELECT de retorno
  await ensureClienteColumn();
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: 'ID inválido' });
    const { nombre, descripcion, revendedor_id, cliente_id } = req.body;

    const updates = [];
    const params = [];
    if (typeof nombre !== 'undefined') { updates.push('nombre = ?'); params.push(String(nombre).trim()); }
    if (typeof descripcion !== 'undefined') { updates.push('descripcion = ?'); params.push(descripcion ? String(descripcion).trim() : null); }
    if (typeof cliente_id !== 'undefined') {
      await ensureClienteColumn();
      updates.push('cliente_id = ?'); params.push(cliente_id === null ? null : Number(cliente_id));
      // Si establecemos cliente, limpiamos revendedor y viceversa
      updates.push('revendedor_id = NULL');
    } else if (typeof revendedor_id !== 'undefined') {
      updates.push('revendedor_id = ?'); params.push(revendedor_id === null ? null : Number(revendedor_id));
      updates.push('cliente_id = NULL');
    }
    if (updates.length === 0) return res.status(400).json({ error: 'Nada para actualizar' });

    params.push(id);
    await query(`UPDATE equipos SET ${updates.join(', ')}, updated_at = NOW() WHERE id = ?`, params);
    let updated;
    try {
      updated = await queryOne(
        `SELECT e.*, 
                COALESCE(r.responsable, r.nombre, r.nombre_negocio, c.nombre_completo) AS cliente_nombre,
                e.revendedor_id, e.cliente_id
           FROM equipos e 
           LEFT JOIN revendedores r ON r.id = e.revendedor_id
           LEFT JOIN clientes c ON c.id = e.cliente_id
          WHERE e.id = ?`,
        [id]
      );
    } catch (err) {
      if (err && err.errno === 1054) {
        await ensureClienteColumn();
        updated = await queryOne(
          `SELECT e.*, 
                  COALESCE(r.responsable, r.nombre, r.nombre_negocio, c.nombre_completo) AS cliente_nombre,
                  e.revendedor_id, e.cliente_id
             FROM equipos e 
             LEFT JOIN revendedores r ON r.id = e.revendedor_id
             LEFT JOIN clientes c ON c.id = e.cliente_id
            WHERE e.id = ?`,
          [id]
        );
      } else {
        throw err;
      }
    }
    res.json(updated);
  } catch (e) {
    console.error('Error actualizando equipo:', e);
    res.status(500).json({ error: 'Error interno', detail: e.message });
  }
});

// Eliminar equipo
router.delete('/:id', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: 'ID inválido' });
    await query('DELETE FROM equipos WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (e) {
    console.error('Error eliminando equipo:', e);
    res.status(500).json({ error: 'Error interno', detail: e.message });
  }
});

// Marcar equipo como devuelto (set returned_at = NOW())
router.post('/:id/devolver', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
  // Asegurar columna antes del SELECT de retorno
  await ensureClienteColumn();
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: 'ID inválido' });
    // Marcar como devuelto solo si no estaba devuelto antes
    await query('UPDATE equipos SET returned_at = IFNULL(returned_at, NOW()), updated_at = NOW() WHERE id = ?', [id]);
    let updated;
    try {
      updated = await queryOne(
        `SELECT e.*, 
                COALESCE(r.responsable, r.nombre, r.nombre_negocio, c.nombre_completo) AS cliente_nombre,
                e.revendedor_id, e.cliente_id
           FROM equipos e 
           LEFT JOIN revendedores r ON r.id = e.revendedor_id
           LEFT JOIN clientes c ON c.id = e.cliente_id
          WHERE e.id = ?`,
        [id]
      );
    } catch (err) {
      if (err && err.errno === 1054) {
        await ensureClienteColumn();
        updated = await queryOne(
          `SELECT e.*, 
                  COALESCE(r.responsable, r.nombre, r.nombre_negocio, c.nombre_completo) AS cliente_nombre,
                  e.revendedor_id, e.cliente_id
             FROM equipos e 
             LEFT JOIN revendedores r ON r.id = e.revendedor_id
             LEFT JOIN clientes c ON c.id = e.cliente_id
            WHERE e.id = ?`,
          [id]
        );
      } else {
        throw err;
      }
    }
    if (!updated) return res.status(404).json({ error: 'Equipo no encontrado' });
    res.json(updated);
  } catch (e) {
    console.error('Error marcando equipo devuelto:', e);
    res.status(500).json({ error: 'Error interno', detail: e.message });
  }
});

export default router;
