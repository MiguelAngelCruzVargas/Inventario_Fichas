import express from 'express';
import { query } from '../database.js';
import { authenticateToken, requireRole } from '../auth.js';

const router = express.Router();

// GET /ventas - Obtener todas las ventas
router.get('/', authenticateToken, requireRole(['admin', 'trabajador']), async (req, res) => {
  try {
    const { fecha_desde, fecha_hasta, revendedor_id, limite } = req.query;

    let sql = `
      SELECT v.*, COALESCE(r.responsable, r.nombre, r.nombre_negocio) as revendedor_nombre,
             tf.nombre as tipo_ficha_nombre,
             u.username as usuario_venta
      FROM ventas v
      JOIN revendedores r ON v.revendedor_id = r.id
      JOIN tipos_fichas tf ON v.tipo_ficha_id = tf.id
      LEFT JOIN usuarios u ON v.usuario_id = u.id
      WHERE r.activo = 1
    `;

    const params = [];

    if (revendedor_id) {
      sql += ' AND v.revendedor_id = ?';
      params.push(revendedor_id);
    }

    if (fecha_desde) {
      sql += ' AND DATE(v.fecha_venta) >= ?';
      params.push(fecha_desde);
    }

    if (fecha_hasta) {
      sql += ' AND DATE(v.fecha_venta) <= ?';
      params.push(fecha_hasta);
    }

    sql += ' ORDER BY v.fecha_venta DESC';

    // Agregar límite si se especifica
    if (limite && !isNaN(parseInt(limite))) {
      sql += ` LIMIT ${parseInt(limite)}`;
    }

    const ventas = await query(sql, params);
    res.json(ventas);
  } catch (error) {
    console.error('Error al obtener ventas:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      detail: 'Error al obtener las ventas'
    });
  }
});

// GET /ventas/revendedor/:id - Obtener ventas de un revendedor
router.get('/revendedor/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { fecha_desde, fecha_hasta } = req.query;

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

    let sql = `
      SELECT v.*, COALESCE(r.responsable, r.nombre, r.nombre_negocio) as revendedor_nombre,
             tf.nombre as tipo_ficha_nombre, tf.duracion_horas,
             u.username as usuario_venta
      FROM ventas v
      JOIN revendedores r ON v.revendedor_id = r.id
      JOIN tipos_fichas tf ON v.tipo_ficha_id = tf.id
      LEFT JOIN usuarios u ON v.usuario_id = u.id
      WHERE v.revendedor_id = ? AND r.activo = 1 AND tf.activo = 1
    `;

    const params = [id];

    if (fecha_desde) {
      sql += ' AND DATE(v.fecha_venta) >= ?';
      params.push(fecha_desde);
    }

    if (fecha_hasta) {
      sql += ' AND DATE(v.fecha_venta) <= ?';
      params.push(fecha_hasta);
    }

    sql += ' ORDER BY v.fecha_venta DESC';

    const ventas = await query(sql, params);
    res.json(ventas);
  } catch (error) {
    console.error('Error al obtener ventas del revendedor:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      detail: 'Error al obtener las ventas del revendedor'
    });
  }
});

// GET /ventas/:id - Obtener una venta específica
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const venta = await query(`
      SELECT v.*, COALESCE(r.responsable, r.nombre, r.nombre_negocio) as revendedor_nombre,
             tf.nombre as tipo_ficha_nombre, tf.duracion_horas,
             u.username as usuario_venta
      FROM ventas v
      JOIN revendedores r ON v.revendedor_id = r.id
      JOIN tipos_fichas tf ON v.tipo_ficha_id = tf.id
      LEFT JOIN usuarios u ON v.usuario_id = u.id
      WHERE v.id = ?
    `, [id]);

    if (!venta || venta.length === 0) {
      return res.status(404).json({
        error: 'Venta no encontrada'
      });
    }

    res.json(venta[0]);
  } catch (error) {
    console.error('Error al obtener venta:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      detail: 'Error al obtener la venta'
    });
  }
});

// POST /ventas - Crear nueva venta
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { revendedor_id, tipo_ficha_id, cantidad, precio_unitario, observaciones } = req.body;

    // Validaciones
    if (!revendedor_id || !tipo_ficha_id || !cantidad || !precio_unitario) {
      return res.status(400).json({
        error: 'Datos incompletos',
        detail: 'Se requiere revendedor_id, tipo_ficha_id, cantidad y precio_unitario'
      });
    }

    if (cantidad <= 0 || precio_unitario <= 0) {
      return res.status(400).json({
        error: 'Valores inválidos',
        detail: 'La cantidad y precio unitario deben ser mayores a 0'
      });
    }

    // Verificar que el revendedor y tipo de ficha existen
    const revendedorExists = await query(
      'SELECT id FROM revendedores WHERE id = ? AND activo = 1',
      [revendedor_id]
    );

    const tipoFichaExists = await query(
      'SELECT id FROM tipos_fichas WHERE id = ? AND activo = 1',
      [tipo_ficha_id]
    );

    if (revendedorExists.length === 0) {
      return res.status(404).json({
        error: 'Revendedor no encontrado'
      });
    }

    if (tipoFichaExists.length === 0) {
      return res.status(404).json({
        error: 'Tipo de ficha no encontrado'
      });
    }

    // Verificar stock disponible en inventario del revendedor
    const inventario = await query(
      'SELECT stock_actual FROM inventarios WHERE revendedor_id = ? AND tipo_ficha_id = ?',
      [revendedor_id, tipo_ficha_id]
    );

    if (inventario.length === 0 || inventario[0].stock_actual < cantidad) {
      const stockDisponible = inventario.length > 0 ? inventario[0].stock_actual : 0;
      return res.status(400).json({
        error: 'Stock insuficiente',
        detail: `Stock disponible: ${stockDisponible}, solicitado: ${cantidad}`
      });
    }

    // Obtener precio y comisión configurados
    const precioConfig = await query(
      'SELECT precio_unitario, comision FROM precios WHERE revendedor_id = ? AND tipo_ficha_id = ?',
      [revendedor_id, tipo_ficha_id]
    );

    const comision = precioConfig.length > 0 ? precioConfig[0].comision : 0;
    const montoTotal = cantidad * precio_unitario;
    const montoComision = cantidad * comision;

    // Crear venta
    const result = await query(`
      INSERT INTO ventas (revendedor_id, tipo_ficha_id, cantidad, precio_unitario, 
                         subtotal, comision_unitaria, comision_total, nota, 
                         fecha_venta)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURDATE())
    `, [revendedor_id, tipo_ficha_id, cantidad, precio_unitario, montoTotal, comision, montoComision, observaciones]);

    // Actualizar inventario del revendedor
    await query(`
      UPDATE inventarios 
      SET stock_actual = stock_actual - ?,
          fichas_vendidas = fichas_vendidas + ?
      WHERE revendedor_id = ? AND tipo_ficha_id = ?
    `, [cantidad, cantidad, revendedor_id, tipo_ficha_id]);

    // Obtener la venta creada
    const nuevaVenta = await query(`
      SELECT v.*, COALESCE(r.responsable, r.nombre, r.nombre_negocio) as revendedor_nombre,
             tf.nombre as tipo_ficha_nombre, tf.duracion_horas,
             u.username as usuario_venta
      FROM ventas v
      JOIN revendedores r ON v.revendedor_id = r.id
      JOIN tipos_fichas tf ON v.tipo_ficha_id = tf.id
      LEFT JOIN usuarios u ON v.usuario_id = u.id
      WHERE v.id = ?
    `, [result.insertId]);

    res.status(201).json(nuevaVenta[0]);

  } catch (error) {
    console.error('Error al crear venta:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      detail: 'Error al crear la venta'
    });
  }
});

// PUT /ventas/:id - Actualizar venta
router.put('/:id', authenticateToken, requireRole(['admin', 'trabajador']), async (req, res) => {
  try {
    const { id } = req.params;
    const { cantidad, precio_unitario, observaciones } = req.body;

    // Verificar que la venta existe
    const ventaActual = await query(
      'SELECT * FROM ventas WHERE id = ?',
      [id]
    );

    if (ventaActual.length === 0) {
      return res.status(404).json({
        error: 'Venta no encontrada'
      });
    }

    const venta = ventaActual[0];
    const cantidadAnterior = venta.cantidad;
    const diferenciaCantidad = cantidad - cantidadAnterior;

    // Obtener comisión configurada
    const precioConfig = await query(
      'SELECT comision FROM precios WHERE revendedor_id = ? AND tipo_ficha_id = ?',
      [venta.revendedor_id, venta.tipo_ficha_id]
    );

    const comision = precioConfig.length > 0 ? precioConfig[0].comision : 0;
    const montoTotal = cantidad * precio_unitario;
    const montoComision = cantidad * comision;

    // Actualizar venta
    await query(`
      UPDATE ventas 
      SET cantidad = ?, precio_unitario = ?, subtotal = ?, 
          comision_unitaria = ?, comision_total = ?, nota = ?
      WHERE id = ?
    `, [cantidad, precio_unitario, montoTotal, comision, montoComision, observaciones, id]);

    // Ajustar inventario si cambió la cantidad
    if (diferenciaCantidad !== 0) {
      await query(`
        UPDATE inventarios 
        SET fichas_vendidas = fichas_vendidas + ?,
            stock_actual = stock_actual - ?
        WHERE revendedor_id = ? AND tipo_ficha_id = ?
      `, [diferenciaCantidad, diferenciaCantidad, venta.revendedor_id, venta.tipo_ficha_id]);
    }

    // Obtener la venta actualizada
    const ventaActualizada = await query(`
      SELECT v.*, COALESCE(r.responsable, r.nombre, r.nombre_negocio) as revendedor_nombre,
             tf.nombre as tipo_ficha_nombre, tf.duracion_horas,
             u.username as usuario_venta
      FROM ventas v
      JOIN revendedores r ON v.revendedor_id = r.id
      JOIN tipos_fichas tf ON v.tipo_ficha_id = tf.id
      LEFT JOIN usuarios u ON v.usuario_id = u.id
      WHERE v.id = ?
    `, [id]);

    res.json(ventaActualizada[0]);

  } catch (error) {
    console.error('Error al actualizar venta:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      detail: 'Error al actualizar la venta'
    });
  }
});

// DELETE /ventas/:id - Eliminar venta
router.delete('/:id', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { id } = req.params;

    // Obtener datos de la venta antes de eliminar
    const venta = await query(
      'SELECT * FROM ventas WHERE id = ?',
      [id]
    );

    if (venta.length === 0) {
      return res.status(404).json({
        error: 'Venta no encontrada'
      });
    }

    const ventaData = venta[0];

    // Eliminar venta
    await query('DELETE FROM ventas WHERE id = ?', [id]);

    // Revertir cambios en inventario
    await query(`
      UPDATE inventarios 
      SET fichas_vendidas = fichas_vendidas - ?,
          stock_actual = stock_actual + ?
      WHERE revendedor_id = ? AND tipo_ficha_id = ?
    `, [ventaData.cantidad, ventaData.cantidad, ventaData.revendedor_id, ventaData.tipo_ficha_id]);

    res.json({
      message: 'Venta eliminada exitosamente'
    });

  } catch (error) {
    console.error('Error al eliminar venta:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      detail: 'Error al eliminar la venta'
    });
  }
});

export default router;
