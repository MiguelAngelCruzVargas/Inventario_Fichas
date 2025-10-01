import express from 'express';
import { query } from '../database.js';
import { authenticateToken, requireRole } from '../auth.js';

const router = express.Router();

// GET /precios/revendedor/:id - Obtener precios de un revendedor
router.get('/revendedor/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const precios = await query(`
  SELECT p.*, tf.nombre as tipo_ficha_nombre, tf.duracion_horas, p.precio_venta as precio,
     COALESCE(r.responsable, r.nombre, r.nombre_negocio) as revendedor_nombre
      FROM precios p
      JOIN tipos_fichas tf ON p.tipo_ficha_id = tf.id
      JOIN revendedores r ON p.revendedor_id = r.id
      WHERE p.revendedor_id = ? AND tf.activo = 1 AND r.activo = 1
      ORDER BY tf.duracion_horas, tf.nombre
    `, [id]);

    res.json(precios);
  } catch (error) {
    console.error('Error al obtener precios:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      detail: 'Error al obtener los precios'
    });
  }
});

// GET /precios - Obtener todos los precios
router.get('/', authenticateToken, requireRole(['admin', 'trabajador']), async (req, res) => {
  try {
    const precios = await query(`
  SELECT p.*, tf.nombre as tipo_ficha_nombre, tf.duracion_horas, p.precio_venta as precio,
     COALESCE(r.responsable, r.nombre, r.nombre_negocio) as revendedor_nombre
      FROM precios p
      JOIN tipos_fichas tf ON p.tipo_ficha_id = tf.id
      JOIN revendedores r ON p.revendedor_id = r.id
      WHERE tf.activo = 1 AND r.activo = 1
      ORDER BY r.nombre_negocio, tf.duracion_horas
    `);

    res.json(precios);
  } catch (error) {
    console.error('Error al obtener precios:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      detail: 'Error al obtener los precios'
    });
  }
});

// GET /precios/:id - Obtener un precio específico
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const precio = await query(`
  SELECT p.*, tf.nombre as tipo_ficha_nombre, tf.duracion_horas, p.precio_venta as precio_base,
     COALESCE(r.responsable, r.nombre, r.nombre_negocio) as revendedor_nombre
      FROM precios p
      JOIN tipos_fichas tf ON p.tipo_ficha_id = tf.id
      JOIN revendedores r ON p.revendedor_id = r.id
      WHERE p.id = ?
    `, [id]);

    if (!precio || precio.length === 0) {
      return res.status(404).json({
        error: 'Precio no encontrado'
      });
    }

    res.json(precio[0]);
  } catch (error) {
    console.error('Error al obtener precio:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      detail: 'Error al obtener el precio'
    });
  }
});

// POST /precios - Crear nuevo precio
router.post('/', authenticateToken, requireRole(['admin', 'trabajador']), async (req, res) => {
  try {
    const { revendedor_id, tipo_ficha_id, precio } = req.body;

    // Validaciones
    if (!revendedor_id || !tipo_ficha_id || precio === undefined) {
      return res.status(400).json({
        error: 'Datos incompletos',
        detail: 'Se requiere revendedor_id, tipo_ficha_id y precio'
      });
    }

    if (precio < 0) {
      return res.status(400).json({
        error: 'Valores inválidos',
        detail: 'El precio debe ser un valor positivo'
      });
    }

    // Verificar que no exista ya un precio para esta combinación
    const existingPrecio = await query(
      'SELECT id FROM precios WHERE revendedor_id = ? AND tipo_ficha_id = ?',
      [revendedor_id, tipo_ficha_id]
    );

    if (existingPrecio.length > 0) {
      // Actualizar precio existente
      await query(`
        UPDATE precios 
        SET precio_venta = ?
        WHERE revendedor_id = ? AND tipo_ficha_id = ?
      `, [precio, revendedor_id, tipo_ficha_id]);

      const precioActualizado = await query(`
  SELECT p.*, tf.nombre as tipo_ficha_nombre, tf.duracion_horas,
         COALESCE(r.responsable, r.nombre, r.nombre_negocio) as revendedor_nombre
        FROM precios p
        JOIN tipos_fichas tf ON p.tipo_ficha_id = tf.id
        JOIN revendedores r ON p.revendedor_id = r.id
        WHERE p.revendedor_id = ? AND p.tipo_ficha_id = ?
      `, [revendedor_id, tipo_ficha_id]);

      return res.json(precioActualizado[0]);
    }

    // Crear nuevo precio
    const result = await query(`
      INSERT INTO precios (revendedor_id, tipo_ficha_id, precio_venta)
      VALUES (?, ?, ?)
    `, [revendedor_id, tipo_ficha_id, precio]);

    // Obtener el precio creado
    const nuevoPrecio = await query(`
  SELECT p.*, tf.nombre as tipo_ficha_nombre, tf.duracion_horas,
     COALESCE(r.responsable, r.nombre, r.nombre_negocio) as revendedor_nombre
      FROM precios p
      JOIN tipos_fichas tf ON p.tipo_ficha_id = tf.id
      JOIN revendedores r ON p.revendedor_id = r.id
      WHERE p.id = ?
    `, [result.insertId]);

    res.status(201).json(nuevoPrecio[0]);

  } catch (error) {
    console.error('Error al crear precio:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      detail: 'Error al crear el precio'
    });
  }
});

// PUT /precios/:id - Actualizar precio
router.put('/:id', authenticateToken, requireRole(['admin', 'trabajador']), async (req, res) => {
  try {
    const { id } = req.params;
    const { precio } = req.body;

    // Validaciones
    if (precio === undefined) {
      return res.status(400).json({
        error: 'Datos incompletos',
        detail: 'Se requiere precio'
      });
    }

    if (precio < 0) {
      return res.status(400).json({
        error: 'Valores inválidos',
        detail: 'El precio debe ser un valor positivo'
      });
    }

    // Verificar que el precio existe
    const precioExists = await query(
      'SELECT id FROM precios WHERE id = ?',
      [id]
    );

    if (precioExists.length === 0) {
      return res.status(404).json({
        error: 'Precio no encontrado'
      });
    }

    // Actualizar precio
    await query(`
      UPDATE precios 
      SET precio_venta = ?
      WHERE id = ?
    `, [precio, id]);

    // Obtener el precio actualizado
    const precioActualizado = await query(`
  SELECT p.*, tf.nombre as tipo_ficha_nombre, tf.duracion_horas,
     COALESCE(r.responsable, r.nombre, r.nombre_negocio) as revendedor_nombre
      FROM precios p
      JOIN tipos_fichas tf ON p.tipo_ficha_id = tf.id
      JOIN revendedores r ON p.revendedor_id = r.id
      WHERE p.id = ?
    `, [id]);

    res.json(precioActualizado[0]);

  } catch (error) {
    console.error('Error al actualizar precio:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      detail: 'Error al actualizar el precio'
    });
  }
});

// DELETE /precios/:id - Eliminar precio
router.delete('/:id', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar que el precio existe
    const precioExists = await query(
      'SELECT id FROM precios WHERE id = ?',
      [id]
    );

    if (precioExists.length === 0) {
      return res.status(404).json({
        error: 'Precio no encontrado'
      });
    }

    // Eliminar precio
    await query('DELETE FROM precios WHERE id = ?', [id]);

    res.json({
      message: 'Precio eliminado exitosamente'
    });

  } catch (error) {
    console.error('Error al eliminar precio:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      detail: 'Error al eliminar el precio'
    });
  }
});

export default router;
