import express from 'express';
import { query } from '../database.js';
import { authenticateToken, requireRole } from '../auth.js';

const router = express.Router();

// GET /entregas - Obtener todas las entregas
router.get('/', authenticateToken, requireRole(['admin', 'trabajador']), async (req, res) => {
  try {
    const entregas = await query(`
      SELECT e.id, e.revendedor_id, e.tipo_ficha_id, e.cantidad, 
             e.tipo_movimiento, e.nota, e.created_at as fecha_entrega,
             r.nombre_negocio as revendedor_nombre,
             tf.nombre as tipo_ficha_nombre, tf.duracion_horas,
             u.username as usuario_entrega
      FROM entregas e
      JOIN revendedores r ON e.revendedor_id = r.id
      JOIN tipos_fichas tf ON e.tipo_ficha_id = tf.id
      LEFT JOIN usuarios u ON e.created_by = u.id
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
      userRole: req.user.tipo_usuario,
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
             r.nombre_negocio as revendedor_nombre,
             tf.nombre as tipo_ficha_nombre, tf.duracion_horas,
             u.username as usuario_entrega
      FROM entregas e
      JOIN revendedores r ON e.revendedor_id = r.id
      JOIN tipos_fichas tf ON e.tipo_ficha_id = tf.id
      LEFT JOIN usuarios u ON e.created_by = u.id
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
    const userRole = req.user.tipo_usuario;
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
             r.nombre_negocio as revendedor_nombre,
             tf.nombre as tipo_ficha_nombre, tf.duracion_horas,
             u.username as usuario_entrega
      FROM entregas e
      JOIN revendedores r ON e.revendedor_id = r.id
      JOIN tipos_fichas tf ON e.tipo_ficha_id = tf.id
      LEFT JOIN usuarios u ON e.created_by = u.id
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
             r.nombre_negocio as revendedor_nombre,
             tf.nombre as tipo_ficha_nombre, tf.duracion_horas,
             u.username as usuario_entrega
      FROM entregas e
      JOIN revendedores r ON e.revendedor_id = r.id
      JOIN tipos_fichas tf ON e.tipo_ficha_id = tf.id
      LEFT JOIN usuarios u ON e.created_by = u.id
      WHERE e.id = ?
    `, [result.insertId]);

    res.status(201).json(nuevaEntrega[0]);

  } catch (error) {
    console.error('Error al crear entrega:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      detail: 'Error al crear la entrega'
    });
  }
});

export default router;
