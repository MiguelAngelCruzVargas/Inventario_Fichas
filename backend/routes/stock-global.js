import express from 'express';
import { query } from '../database.js';
import { authenticateToken, requireRole } from '../auth.js';

const router = express.Router();

// GET /stock-global - Obtener todo el stock global
router.get('/', authenticateToken, requireRole(['admin', 'trabajador']), async (req, res) => {
  try {
    const stockGlobal = await query(`
      SELECT tf.id as tipo_ficha_id, tf.nombre as tipo_ficha_nombre, 
             tf.duracion_horas, tf.precio_venta as precio_base,
             COALESCE(sg.cantidad_disponible, 0) as cantidad_disponible,
             COALESCE(sg.cantidad_total, 0) as cantidad_total,
             COALESCE(sg.cantidad_entregada, 0) as cantidad_entregada,
             COALESCE(SUM(i.stock_actual), 0) as stock_en_revendedores,
             (COALESCE(sg.cantidad_disponible, 0) + COALESCE(SUM(i.stock_actual), 0)) as stock_total_sistema,
             sg.updated_at
      FROM tipos_fichas tf
      LEFT JOIN stock_global sg ON tf.id = sg.tipo_ficha_id
      LEFT JOIN inventarios i ON tf.id = i.tipo_ficha_id
      WHERE tf.activo = 1
      GROUP BY tf.id, sg.id
      ORDER BY tf.duracion_horas, tf.nombre
    `);

    res.json(stockGlobal);
  } catch (error) {
    console.error('Error al obtener stock global:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      detail: 'Error al obtener el stock global'
    });
  }
});

// GET /stock-global/:id - Obtener stock global de un tipo específico
router.get('/:id', authenticateToken, requireRole(['admin', 'trabajador']), async (req, res) => {
  try {
    const { id } = req.params;

    const stockGlobal = await query(`
      SELECT sg.*, tf.nombre as tipo_ficha_nombre, tf.duracion_horas, tf.precio_venta as precio_base,
             COALESCE(SUM(i.stock_actual), 0) as stock_en_revendedores,
             (sg.cantidad_disponible + COALESCE(SUM(i.stock_actual), 0)) as stock_total_sistema
      FROM stock_global sg
      JOIN tipos_fichas tf ON sg.tipo_ficha_id = tf.id
      LEFT JOIN inventarios i ON sg.tipo_ficha_id = i.tipo_ficha_id
      WHERE sg.id = ? AND tf.activo = 1
      GROUP BY sg.id
    `, [id]);

    if (!stockGlobal || stockGlobal.length === 0) {
      return res.status(404).json({
        error: 'Stock global no encontrado'
      });
    }

    res.json(stockGlobal[0]);
  } catch (error) {
    console.error('Error al obtener stock global:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      detail: 'Error al obtener el stock global'
    });
  }
});

// POST /stock-global - Crear nuevo registro de stock global
router.post('/', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { tipo_ficha_id, cantidad_disponible, cantidad_total } = req.body;

    // Validaciones
    if (!tipo_ficha_id || cantidad_disponible === undefined) {
      return res.status(400).json({
        error: 'Datos incompletos',
        detail: 'Se requiere tipo_ficha_id y cantidad_disponible'
      });
    }

    if (cantidad_disponible < 0 || (cantidad_total !== undefined && cantidad_total < 0)) {
      return res.status(400).json({
        error: 'Valores inválidos',
        detail: 'Los valores de cantidad deben ser positivos'
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

    // Verificar que no exista ya un registro para este tipo
    const existingStock = await query(
      'SELECT id FROM stock_global WHERE tipo_ficha_id = ?',
      [tipo_ficha_id]
    );

    if (existingStock.length > 0) {
      return res.status(409).json({
        error: 'Stock global ya existe',
        detail: 'Ya existe un registro de stock global para este tipo de ficha'
      });
    }

    // Crear registro de stock global
    const result = await query(`
      INSERT INTO stock_global (tipo_ficha_id, cantidad_disponible, cantidad_total)
      VALUES (?, ?, ?)
    `, [tipo_ficha_id, cantidad_disponible, cantidad_total || cantidad_disponible]);

    // Obtener el registro creado
    const nuevoStock = await query(`
      SELECT sg.*, tf.nombre as tipo_ficha_nombre, tf.duracion_horas, tf.precio_venta as precio_base
      FROM stock_global sg
      JOIN tipos_fichas tf ON sg.tipo_ficha_id = tf.id
      WHERE sg.id = ?
    `, [result.insertId]);

    res.status(201).json(nuevoStock[0]);

  } catch (error) {
    console.error('Error al crear stock global:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      detail: 'Error al crear el stock global'
    });
  }
});

// PUT /stock-global/:id - Actualizar stock global
router.put('/:id', authenticateToken, requireRole(['admin', 'trabajador']), async (req, res) => {
  try {
    const { id } = req.params;
    const { cantidad_disponible, cantidad_total, ajuste_comentario } = req.body;

    // Verificar que el registro existe
    const stockExists = await query(
      'SELECT * FROM stock_global WHERE id = ?',
      [id]
    );

    if (stockExists.length === 0) {
      return res.status(404).json({
        error: 'Stock global no encontrado'
      });
    }

    const stockActual = stockExists[0];

    // Validaciones
    if (cantidad_disponible !== undefined && cantidad_disponible < 0) {
      return res.status(400).json({
        error: 'Valor inválido',
        detail: 'La cantidad disponible debe ser un valor positivo'
      });
    }

    if (cantidad_total !== undefined && cantidad_total < 0) {
      return res.status(400).json({
        error: 'Valor inválido',
        detail: 'La cantidad total debe ser un valor positivo'
      });
    }

    // Construir query de actualización dinámicamente
    const updates = [];
    const params = [];

    if (cantidad_disponible !== undefined) {
      updates.push('cantidad_disponible = ?');
      params.push(cantidad_disponible);
    }

    if (cantidad_total !== undefined) {
      updates.push('cantidad_total = ?');
      params.push(cantidad_total);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        error: 'Sin cambios',
        detail: 'No se proporcionaron campos para actualizar'
      });
    }

    updates.push('updated_at = NOW()');
    params.push(id);

    // Actualizar stock global
    await query(`
      UPDATE stock_global 
      SET ${updates.join(', ')}
      WHERE id = ?
    `, params);

    // Registrar el ajuste si se proporcionó un comentario
    if (ajuste_comentario && cantidad_disponible !== undefined) {
      const diferencia = cantidad_disponible - stockActual.cantidad_disponible;
      await query(`
        INSERT INTO ajustes_stock (tipo_ficha_id, cantidad_ajuste, comentario, usuario_id)
        VALUES (?, ?, ?, ?)
      `, [stockActual.tipo_ficha_id, diferencia, ajuste_comentario, req.user.id]);
    }

    // Obtener el registro actualizado
    const stockActualizado = await query(`
      SELECT sg.*, tf.nombre as tipo_ficha_nombre, tf.duracion_horas, tf.precio_venta as precio_base,
             COALESCE(SUM(i.stock_actual), 0) as stock_en_revendedores
      FROM stock_global sg
      JOIN tipos_fichas tf ON sg.tipo_ficha_id = tf.id
      LEFT JOIN inventarios i ON sg.tipo_ficha_id = i.tipo_ficha_id
      WHERE sg.id = ?
      GROUP BY sg.id
    `, [id]);

    res.json(stockActualizado[0]);

  } catch (error) {
    console.error('Error al actualizar stock global:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      detail: 'Error al actualizar el stock global'
    });
  }
});

// POST /stock-global/abastecimiento - Registrar abastecimiento de stock
router.post('/abastecimiento', authenticateToken, requireRole(['admin', 'trabajador']), async (req, res) => {
  try {
    const { tipo_ficha_id, cantidad, proveedor, numero_factura, costo_total, observaciones } = req.body;

    // --- Validaciones ---
    if (!tipo_ficha_id || !cantidad) {
      return res.status(400).json({
        error: 'Datos incompletos',
        detail: 'Se requiere tipo_ficha_id y cantidad'
      });
    }

    // Convertir cantidad a número
    const cantidadNumerica = parseInt(cantidad, 10);
    
    if (isNaN(cantidadNumerica) || cantidadNumerica <= 0) {
      return res.status(400).json({
        error: 'Cantidad inválida',
        detail: 'La cantidad debe ser un número mayor a 0'
      });
    }

    const tipoFichaExists = await query(
      'SELECT id FROM tipos_fichas WHERE id = ? AND activo = 1',
      [tipo_ficha_id]
    );

    if (tipoFichaExists.length === 0) {
      return res.status(404).json({
        error: 'Tipo de ficha no encontrado'
      });
    }

    // --- Lógica de actualización ---
    const stockGlobalExists = await query(
      'SELECT id, cantidad_disponible FROM stock_global WHERE tipo_ficha_id = ?',
      [tipo_ficha_id]
    );

    if (stockGlobalExists.length === 0) {
      // Crear registro si no existe
      await query(`
        INSERT INTO stock_global (tipo_ficha_id, cantidad_disponible, cantidad_total)
        VALUES (?, ?, ?)
      `, [tipo_ficha_id, cantidadNumerica, cantidadNumerica]);
    } else {
      // Actualizar stock existente
      await query(`
        UPDATE stock_global 
        SET cantidad_disponible = cantidad_disponible + ?,
            cantidad_total = cantidad_total + ?,
            updated_at = NOW()
        WHERE tipo_ficha_id = ?
      `, [cantidadNumerica, cantidadNumerica, tipo_ficha_id]);
    }

    // --- Registrar el abastecimiento ---
    const result = await query(`
      INSERT INTO abastecimientos (tipo_ficha_id, cantidad, proveedor, numero_factura, 
                                   costo_total, observaciones, usuario_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      tipo_ficha_id, 
      cantidadNumerica, 
      proveedor || null, 
      numero_factura || null, 
      costo_total || null, 
      observaciones || null, 
      req.user.id
    ]);

    // --- Obtener el stock actualizado ---
    const stockActualizado = await query(
      'SELECT cantidad_disponible FROM stock_global WHERE tipo_ficha_id = ?',
      [tipo_ficha_id]
    );

    res.status(201).json({
      message: 'Abastecimiento registrado exitosamente',
      abastecimiento_id: result.insertId,
      nueva_cantidad_stock: stockActualizado[0].cantidad_disponible
    });

  } catch (error) {
    console.error('Error al registrar abastecimiento:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      detail: 'Error al registrar el abastecimiento'
    });
  }
});

// GET /stock-global/historial/:tipo_ficha_id - Obtener historial de ajustes de stock
router.get('/historial/:tipo_ficha_id', authenticateToken, requireRole(['admin', 'trabajador']), async (req, res) => {
  try {
    const { tipo_ficha_id } = req.params;

    const historial = await query(`
      SELECT a.*, u.username as usuario_ajuste, tf.nombre as tipo_ficha_nombre
      FROM ajustes_stock a
      JOIN usuarios u ON a.usuario_id = u.id
      JOIN tipos_fichas tf ON a.tipo_ficha_id = tf.id
      WHERE a.tipo_ficha_id = ?
      ORDER BY a.fecha_ajuste DESC
      LIMIT 50
    `, [tipo_ficha_id]);

    res.json(historial);
  } catch (error) {
    console.error('Error al obtener historial de stock:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      detail: 'Error al obtener el historial de stock'
    });
  }
});

export default router;
