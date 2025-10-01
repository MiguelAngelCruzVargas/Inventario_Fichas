import express from 'express';
import { authenticateToken, requireRole } from '../auth.js';
import { query, queryOne } from '../database.js';

const router = express.Router();

// Helper: asegurar tabla si no existe
const ensureTable = async () => {
  const sql = `
    CREATE TABLE IF NOT EXISTS equipos_inventario (
      id INT AUTO_INCREMENT PRIMARY KEY,
      nombre VARCHAR(150) NOT NULL,
      cantidad INT NOT NULL DEFAULT 0,
      estado ENUM('nuevo','usado','dañado','reparación') NOT NULL DEFAULT 'nuevo',
      descripcion TEXT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_nombre (nombre),
      INDEX idx_estado (estado)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `;
  await query(sql);
};

// Listar inventario simple de equipos
router.get('/', authenticateToken, requireRole(['admin', 'trabajador']), async (req, res) => {
  try {
    const rows = await query('SELECT * FROM equipos_inventario ORDER BY updated_at DESC, created_at DESC');
    res.json({ items: rows });
  } catch (e) {
    // Si no existe la tabla, crearla y reintentar una vez
    if (e?.code === 'ER_NO_SUCH_TABLE' || e?.errno === 1146) {
      try {
        await ensureTable();
        const rows = await query('SELECT * FROM equipos_inventario ORDER BY updated_at DESC, created_at DESC');
        return res.json({ items: rows });
      } catch (inner) {
        console.error('Error auto-creando equipos_inventario:', inner);
        return res.status(500).json({ error: 'Error interno', detail: inner.message });
      }
    }
    console.error('Error listando equipos_inventario:', e);
    res.status(500).json({ error: 'Error interno', detail: e.message });
  }
});

// Crear entrada
router.post('/', authenticateToken, requireRole(['admin', 'trabajador']), async (req, res) => {
  try {
    const { nombre, cantidad, estado, descripcion } = req.body;
    if (!nombre || String(nombre).trim().length < 2) return res.status(400).json({ error: 'Nombre requerido' });
    const cant = Number(cantidad ?? 0);
    if (!Number.isFinite(cant) || cant < 0) return res.status(400).json({ error: 'Cantidad inválida' });
    const est = estado && ['nuevo','usado','dañado','reparación'].includes(estado) ? estado : 'nuevo';
    const result = await query('INSERT INTO equipos_inventario (nombre, cantidad, estado, descripcion) VALUES (?, ?, ?, ?)', [String(nombre).trim(), cant, est, descripcion ? String(descripcion).trim() : null]);
    const creado = await queryOne('SELECT * FROM equipos_inventario WHERE id = ?', [result.insertId]);
    res.status(201).json(creado);
  } catch (e) {
    if (e?.code === 'ER_NO_SUCH_TABLE' || e?.errno === 1146) {
      try {
        await ensureTable();
        // Reintentar inserción
        const { nombre, cantidad, estado, descripcion } = req.body;
        const cant = Number(cantidad ?? 0);
        const est = estado && ['nuevo','usado','dañado','reparación'].includes(estado) ? estado : 'nuevo';
        const result = await query('INSERT INTO equipos_inventario (nombre, cantidad, estado, descripcion) VALUES (?, ?, ?, ?)', [String(nombre).trim(), cant, est, descripcion ? String(descripcion).trim() : null]);
        const creado = await queryOne('SELECT * FROM equipos_inventario WHERE id = ?', [result.insertId]);
        return res.status(201).json(creado);
      } catch (inner) {
        console.error('Error auto-creando e insertando en equipos_inventario:', inner);
        return res.status(500).json({ error: 'Error interno', detail: inner.message });
      }
    }
    console.error('Error creando equipos_inventario:', e);
    res.status(500).json({ error: 'Error interno', detail: e.message });
  }
});

// Actualizar entrada
router.put('/:id', authenticateToken, requireRole(['admin', 'trabajador']), async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: 'ID inválido' });
    const { nombre, cantidad, estado, descripcion } = req.body;
    const updates = [];
    const params = [];
    if (typeof nombre !== 'undefined') { updates.push('nombre = ?'); params.push(String(nombre).trim()); }
    if (typeof cantidad !== 'undefined') {
      const cant = Number(cantidad);
      if (!Number.isFinite(cant) || cant < 0) return res.status(400).json({ error: 'Cantidad inválida' });
      updates.push('cantidad = ?'); params.push(cant);
    }
    if (typeof estado !== 'undefined') {
      if (!['nuevo','usado','dañado','reparación'].includes(estado)) return res.status(400).json({ error: 'Estado inválido' });
      updates.push('estado = ?'); params.push(estado);
    }
    if (typeof descripcion !== 'undefined') { updates.push('descripcion = ?'); params.push(descripcion ? String(descripcion).trim() : null); }
    if (updates.length === 0) return res.status(400).json({ error: 'Nada para actualizar' });
    params.push(id);
    await query(`UPDATE equipos_inventario SET ${updates.join(', ')}, updated_at = NOW() WHERE id = ?`, params);
    const updated = await queryOne('SELECT * FROM equipos_inventario WHERE id = ?', [id]);
    res.json(updated);
  } catch (e) {
    console.error('Error actualizando equipos_inventario:', e);
    res.status(500).json({ error: 'Error interno', detail: e.message });
  }
});

// Eliminar
router.delete('/:id', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: 'ID inválido' });
    await query('DELETE FROM equipos_inventario WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (e) {
    console.error('Error eliminando equipos_inventario:', e);
    res.status(500).json({ error: 'Error interno', detail: e.message });
  }
});

export default router;
