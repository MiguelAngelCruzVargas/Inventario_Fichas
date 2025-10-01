import express from 'express';
import { query } from '../database.js';
import { authenticateToken, requireRole } from '../auth.js';
import bus from '../events/bus.js';

const router = express.Router();

// Helper para construir filtros seguros
function buildWhere(filters, params) {
  const where = [];
  if (filters.revendedor_id) {
    where.push('e.revendedor_id = ?');
    params.push(parseInt(filters.revendedor_id));
  }
  if (filters.revendedor) {
    where.push('(r.responsable LIKE ? OR r.nombre LIKE ? OR r.nombre_negocio LIKE ?)');
    const like = `%${filters.revendedor}%`;
    params.push(like, like, like);
  }
  if (filters.tipo_ficha_id) {
    where.push('e.tipo_ficha_id = ?');
    params.push(parseInt(filters.tipo_ficha_id));
  }
  if (filters.desde) {
    where.push('DATE(e.created_at) >= ?');
    params.push(filters.desde);
  }
  if (filters.hasta) {
    where.push('DATE(e.created_at) <= ?');
    params.push(filters.hasta);
  }
  return where.length ? `AND ${where.join(' AND ')}` : '';
}

// GET /entregas/historial - Historial detallado con precio y paginación
router.get('/historial', authenticateToken, async (req, res) => {
  try {
    const { page = 1, pageSize = 25, revendedor_id, tipo_ficha_id, desde, hasta } = req.query;

  const userRole = req.user?.role;
    const userRevendedorId = req.user?.revendedor_id;

    const safePage = Math.max(parseInt(page) || 1, 1);
    const safePageSize = Math.min(Math.max(parseInt(pageSize) || 25, 1), 200);
    const offset = (safePage - 1) * safePageSize;

    // Filtros base: activos
    const params = [];
    let extraWhere = buildWhere({ revendedor_id, tipo_ficha_id, desde, hasta }, params);

    // Restricción por rol: revendedor sólo ve lo suyo
    if (userRole === 'revendedor') {
      extraWhere += (extraWhere ? ' AND ' : 'AND ') + 'e.revendedor_id = ?';
      params.push(userRevendedorId);
    } else if (userRole !== 'admin' && userRole !== 'trabajador') {
      return res.status(403).json({ error: 'Acceso denegado' });
    }

    // Conteo total
    const totalRows = await query(
      `SELECT COUNT(*) as total
       FROM entregas e
       JOIN revendedores r ON e.revendedor_id = r.id
       JOIN tipos_fichas tf ON e.tipo_ficha_id = tf.id
       WHERE r.activo = 1 AND tf.activo = 1 ${extraWhere}`,
      params
    );
    const total = totalRows?.[0]?.total || 0;

    // Datos con precio efectivo por fecha (si existe en precios) o fallback a precio de tipo_ficha
    const data = await query(
  `SELECT 
         e.id,
         e.revendedor_id,
       e.created_by AS usuario_id,
     COALESCE(r.responsable, r.nombre, r.nombre_negocio) AS revendedor_nombre,
         e.tipo_ficha_id,
         tf.nombre AS tipo_ficha_nombre,
         tf.duracion_horas,
         e.cantidad,
         e.tipo_movimiento,
         e.created_at AS fecha_entrega,
         COALESCE(tm.nombre_completo, u.username) AS usuario_entrega,
         COALESCE(
           (
             SELECT p2.precio_venta
             FROM precios p2
             WHERE p2.revendedor_id = e.revendedor_id
               AND p2.tipo_ficha_id = e.tipo_ficha_id
               AND (p2.fecha_vigencia_desde IS NULL OR p2.fecha_vigencia_desde <= DATE(e.created_at))
               AND (p2.fecha_vigencia_hasta IS NULL OR p2.fecha_vigencia_hasta >= DATE(e.created_at))
             ORDER BY p2.fecha_vigencia_desde DESC, p2.id DESC
             LIMIT 1
           ),
           (
             SELECT pr.precio
             FROM precios_revendedor pr
             WHERE pr.revendedor_id = e.revendedor_id
               AND pr.tipo_ficha_id = e.tipo_ficha_id
             ORDER BY pr.updated_at DESC, pr.created_at DESC, pr.id DESC
             LIMIT 1
           ),
           tf.precio_venta, 0
         ) AS precio_unitario,
         (e.cantidad * COALESCE(
           (
             SELECT p3.precio_venta
             FROM precios p3
             WHERE p3.revendedor_id = e.revendedor_id
               AND p3.tipo_ficha_id = e.tipo_ficha_id
               AND (p3.fecha_vigencia_desde IS NULL OR p3.fecha_vigencia_desde <= DATE(e.created_at))
               AND (p3.fecha_vigencia_hasta IS NULL OR p3.fecha_vigencia_hasta >= DATE(e.created_at))
             ORDER BY p3.fecha_vigencia_desde DESC, p3.id DESC
             LIMIT 1
           ),
           (
             SELECT pr2.precio
             FROM precios_revendedor pr2
             WHERE pr2.revendedor_id = e.revendedor_id
               AND pr2.tipo_ficha_id = e.tipo_ficha_id
             ORDER BY pr2.updated_at DESC, pr2.created_at DESC, pr2.id DESC
             LIMIT 1
           ),
           tf.precio_venta, 0
         )) AS subtotal
       FROM entregas e
       JOIN revendedores r ON e.revendedor_id = r.id
       JOIN tipos_fichas tf ON e.tipo_ficha_id = tf.id
       LEFT JOIN usuarios u ON e.created_by = u.id
       LEFT JOIN trabajadores_mantenimiento tm ON tm.usuario_id = u.id
       WHERE r.activo = 1 AND tf.activo = 1 ${extraWhere}
       ORDER BY e.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, safePageSize, offset]
    );

    res.json({
      page: safePage,
      pageSize: safePageSize,
      total,
      items: data
    });
  } catch (error) {
    console.error('Error en /entregas/historial:', error);
    res.status(500).json({ error: 'Error interno del servidor', detail: 'No se pudo obtener el historial' });
  }
});

// GET /entregas - Obtener todas las entregas
router.get('/', authenticateToken, requireRole(['admin', 'trabajador']), async (req, res) => {
  try {
  const entregas = await query(`
      SELECT e.id, e.revendedor_id, e.tipo_ficha_id, e.cantidad, 
             e.tipo_movimiento, e.nota, e.created_at as fecha_entrega,
  e.created_by AS usuario_id,
       COALESCE(r.responsable, r.nombre, r.nombre_negocio) as revendedor_nombre,
             tf.nombre as tipo_ficha_nombre, tf.duracion_horas,
        COALESCE(tm.nombre_completo, u.username) as usuario_entrega
      FROM entregas e
      JOIN revendedores r ON e.revendedor_id = r.id
      JOIN tipos_fichas tf ON e.tipo_ficha_id = tf.id
      LEFT JOIN usuarios u ON e.created_by = u.id
      LEFT JOIN trabajadores_mantenimiento tm ON tm.usuario_id = u.id
      WHERE r.activo = 1 AND tf.activo = 1
      ORDER BY e.created_at DESC
    `);

    res.json(entregas);
  } catch (error) {
    console.error('Error al obtener entregas:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      detail: 'Error al obtener las entregas'
    });
  }
});

// GET /entregas/me - Obtener entregas del revendedor actual
router.get('/me', authenticateToken, requireRole(['revendedor']), async (req, res) => {
  try {
    const revendedorId = req.user.revendedor_id;
    
    console.log('GET /entregas/me - Debug:', {
      userId: req.user.id,
      username: req.user.username,
      userRole: req.user.role,
      revendedorId: revendedorId
    });
    
    if (!revendedorId) {
      console.log('Error: Usuario sin revendedor_id asociado para entregas');
      return res.status(400).json({
        error: 'Usuario no asociado a revendedor',
        detail: 'Este usuario no tiene un revendedor asociado',
        debug: req.user
      });
    }

  const entregas = await query(`
      SELECT e.id, e.revendedor_id, e.tipo_ficha_id, e.cantidad,
             e.tipo_movimiento, e.nota, e.created_at as fecha_entrega,
  e.created_by AS usuario_id,
       COALESCE(r.responsable, r.nombre, r.nombre_negocio) as revendedor_nombre,
             tf.nombre as tipo_ficha_nombre, tf.duracion_horas,
        COALESCE(tm.nombre_completo, u.username) as usuario_entrega
      FROM entregas e
      JOIN revendedores r ON e.revendedor_id = r.id
      JOIN tipos_fichas tf ON e.tipo_ficha_id = tf.id
      LEFT JOIN usuarios u ON e.created_by = u.id
      LEFT JOIN trabajadores_mantenimiento tm ON tm.usuario_id = u.id
      WHERE e.revendedor_id = ? AND r.activo = 1 AND tf.activo = 1
      ORDER BY e.created_at DESC
    `, [revendedorId]);

    res.json(entregas);
  } catch (error) {
    console.error('Error al obtener entregas del revendedor actual:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      detail: 'Error al obtener las entregas del revendedor'
    });
  }
});

// GET /entregas/revendedor/:id - Obtener entregas de un revendedor específico
router.get('/revendedor/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
  const userRole = req.user.role;
    const userRevendedorId = req.user.revendedor_id;

    // Verificar permisos: admin puede ver cualquier revendedor, revendedor solo sus datos
    if (userRole !== 'admin' && userRole !== 'trabajador') {
      if (userRole !== 'revendedor' || userRevendedorId != id) {
        return res.status(403).json({
          error: 'Acceso denegado',
          detail: 'Solo puedes acceder a tus propias entregas'
        });
      }
    }

    // Verificar que el revendedor existe
    const revendedorExists = await query(
      'SELECT id FROM revendedores WHERE id = ? AND activo = 1',
      [id]
    );

    if (revendedorExists.length === 0) {
      return res.status(404).json({
        error: 'Revendedor no encontrado'
      });
    }

  const entregas = await query(`
      SELECT e.id, e.revendedor_id, e.tipo_ficha_id, e.cantidad,
             e.tipo_movimiento, e.nota, e.created_at as fecha_entrega,
  e.created_by AS usuario_id,
       COALESCE(r.responsable, r.nombre, r.nombre_negocio) as revendedor_nombre,
             tf.nombre as tipo_ficha_nombre, tf.duracion_horas,
        COALESCE(tm.nombre_completo, u.username) as usuario_entrega
      FROM entregas e
      JOIN revendedores r ON e.revendedor_id = r.id
      JOIN tipos_fichas tf ON e.tipo_ficha_id = tf.id
      LEFT JOIN usuarios u ON e.created_by = u.id
      LEFT JOIN trabajadores_mantenimiento tm ON tm.usuario_id = u.id
      WHERE e.revendedor_id = ? AND r.activo = 1 AND tf.activo = 1
      ORDER BY e.created_at DESC
    `, [id]);

    res.json(entregas);
  } catch (error) {
    console.error('Error al obtener entregas del revendedor:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      detail: 'Error al obtener las entregas del revendedor'
    });
  }
});

// POST /entregas - Crear nueva entrega
router.post('/', authenticateToken, requireRole(['admin', 'trabajador']), async (req, res) => {
  try {
    const { revendedor_id, tipo_ficha_id, cantidad, tipo_movimiento, nota } = req.body;

    // Validaciones básicas
    if (!revendedor_id || !tipo_ficha_id || !cantidad || !tipo_movimiento) {
      return res.status(400).json({
        error: 'Datos incompletos',
        detail: 'Se requiere revendedor_id, tipo_ficha_id, cantidad y tipo_movimiento'
      });
    }

    // Verificar que el revendedor existe
    const revendedorExists = await query(
      'SELECT id FROM revendedores WHERE id = ? AND activo = 1',
      [revendedor_id]
    );

    if (revendedorExists.length === 0) {
      return res.status(404).json({
        error: 'Revendedor no encontrado'
      });
    }

    // Verificar que el tipo de ficha existe
    const tipoFichaExists = await query(
      'SELECT id FROM tipos_fichas WHERE id = ? AND activo = 1',
      [tipo_ficha_id]
    );

    if (tipoFichaExists.length === 0) {
      return res.status(404).json({
        error: 'Tipo de ficha no encontrado'
      });
    }

    // Crear la entrega
    const result = await query(`
      INSERT INTO entregas (revendedor_id, tipo_ficha_id, cantidad, tipo_movimiento, nota, created_by)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [revendedor_id, tipo_ficha_id, cantidad, tipo_movimiento, nota, req.user.id]);

    // Si es una entrega, reducir el stock global y actualizarlo
    if (tipo_movimiento === 'entrega') {
      // Verificar que hay suficiente stock disponible
      const stockActual = await query(
        'SELECT cantidad_disponible FROM stock_global WHERE tipo_ficha_id = ?',
        [tipo_ficha_id]
      );

      if (stockActual.length === 0 || stockActual[0].cantidad_disponible < cantidad) {
        // Rollback de la entrega si no hay suficiente stock
        await query('DELETE FROM entregas WHERE id = ?', [result.insertId]);
        return res.status(400).json({
          error: 'Stock insuficiente',
          detail: `No hay suficiente stock disponible. Stock actual: ${stockActual[0]?.cantidad_disponible || 0}, solicitado: ${cantidad}`
        });
      }

      // Actualizar stock global
      await query(`
        UPDATE stock_global 
        SET cantidad_disponible = cantidad_disponible - ?,
            cantidad_entregada = cantidad_entregada + ?
        WHERE tipo_ficha_id = ?
      `, [cantidad, cantidad, tipo_ficha_id]);

      // También actualizar o crear el inventario del revendedor
      const inventarioExiste = await query(
        'SELECT id FROM inventarios WHERE revendedor_id = ? AND tipo_ficha_id = ?',
        [revendedor_id, tipo_ficha_id]
      );

      if (inventarioExiste.length > 0) {
        // Actualizar inventario existente
        await query(`
          UPDATE inventarios 
          SET fichas_entregadas = fichas_entregadas + ?,
              stock_actual = stock_actual + ?
          WHERE revendedor_id = ? AND tipo_ficha_id = ?
        `, [cantidad, cantidad, revendedor_id, tipo_ficha_id]);
      } else {
        // Crear nuevo inventario
        await query(`
          INSERT INTO inventarios (revendedor_id, tipo_ficha_id, fichas_entregadas, fichas_vendidas, stock_actual)
          VALUES (?, ?, ?, 0, ?)
        `, [revendedor_id, tipo_ficha_id, cantidad, cantidad]);
      }
    }

    // Obtener la entrega creada con datos relacionados
  const nuevaEntrega = await query(`
      SELECT e.id, e.revendedor_id, e.tipo_ficha_id, e.cantidad,
             e.tipo_movimiento, e.nota, e.created_at as fecha_entrega,
  e.created_by AS usuario_id,
       COALESCE(r.responsable, r.nombre, r.nombre_negocio) as revendedor_nombre,
             tf.nombre as tipo_ficha_nombre, tf.duracion_horas,
        COALESCE(tm.nombre_completo, u.username) as usuario_entrega
      FROM entregas e
      JOIN revendedores r ON e.revendedor_id = r.id
      JOIN tipos_fichas tf ON e.tipo_ficha_id = tf.id
      LEFT JOIN usuarios u ON e.created_by = u.id
      LEFT JOIN trabajadores_mantenimiento tm ON tm.usuario_id = u.id
      WHERE e.id = ?
    `, [result.insertId]);

    const created = nuevaEntrega[0];
    // Broadcast SSE event for new entrega
    try {
      bus.emit('broadcast', {
        type: 'entrega-creada',
        payload: {
          id: created.id,
          revendedor_id: created.revendedor_id,
          revendedor_nombre: created.revendedor_nombre,
          tipo_ficha_id: created.tipo_ficha_id,
          tipo_ficha_nombre: created.tipo_ficha_nombre,
          cantidad: created.cantidad,
          tipo_movimiento: created.tipo_movimiento,
          fecha_entrega: created.fecha_entrega,
          usuario_id: created.usuario_id,
          usuario_entrega: created.usuario_entrega
        }
      });
    } catch {}

    res.status(201).json(created);

  } catch (error) {
    console.error('Error al crear entrega:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      detail: 'Error al crear la entrega'
    });
  }
});

export default router;
