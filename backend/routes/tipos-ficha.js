import express from 'express';
import { query } from '../database.js';
import { authenticateToken, requireRole } from '../auth.js';

const router = express.Router();

// GET /tipos-ficha - Obtener todos los tipos de ficha
router.get('/', authenticateToken, async (req, res) => {
  try {
    const tiposFicha = await query(`
      SELECT tf.id, tf.nombre, tf.descripcion, tf.duracion_horas,
             tf.precio_compra, tf.precio_venta, tf.activo,
             tf.fecha_creacion, tf.fecha_actualizacion,
             0 as total_inventarios,
             0 as stock_total
      FROM tipos_fichas tf
      WHERE tf.activo = 1
      ORDER BY tf.duracion_horas, tf.nombre
    `);

    res.json(tiposFicha);
  } catch (error) {
    console.error('Error al obtener tipos de ficha:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      detail: 'Error al obtener los tipos de ficha'
    });
  }
});

// GET /tipos-ficha/:id - Obtener un tipo de ficha específico
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const tipoFicha = await query(`
      SELECT tf.id, tf.nombre, tf.descripcion, tf.duracion_horas,
             tf.precio_compra, tf.precio_venta, tf.activo,
             tf.fecha_creacion, tf.fecha_actualizacion,
             0 as total_inventarios,
             0 as stock_total
      FROM tipos_fichas tf
      WHERE tf.id = ? AND tf.activo = 1
    `, [id]);

    if (!tipoFicha || tipoFicha.length === 0) {
      return res.status(404).json({
        error: 'Tipo de ficha no encontrado'
      });
    }

    res.json(tipoFicha[0]);
  } catch (error) {
    console.error('Error al obtener tipo de ficha:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      detail: 'Error al obtener el tipo de ficha'
    });
  }
});

// POST /tipos-ficha - Crear nuevo tipo de ficha
router.post('/', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { nombre, duracion_horas, precio_compra = 0, precio_venta, descripcion } = req.body;

    // Validaciones
    if (!nombre || !duracion_horas || !precio_venta) {
      return res.status(400).json({
        error: 'Datos incompletos',
        detail: 'Se requiere nombre, duracion_horas y precio_venta'
      });
    }

    // Verificar que no exista un tipo con el mismo nombre
    const existingTipo = await query(
      'SELECT id FROM tipos_fichas WHERE nombre = ? AND activo = 1',
      [nombre]
    );

    if (existingTipo.length > 0) {
      return res.status(409).json({
        error: 'Tipo de ficha ya existe',
        detail: 'Ya existe un tipo de ficha con ese nombre'
      });
    }

    // Crear tipo de ficha
    const result = await query(`
      INSERT INTO tipos_fichas (nombre, duracion_horas, precio_compra, precio_venta, descripcion, activo)
      VALUES (?, ?, ?, ?, ?, 1)
    `, [nombre, duracion_horas, precio_compra, precio_venta, descripcion]);

    // Obtener el tipo creado
    const nuevoTipo = await query(`
      SELECT * FROM tipos_fichas WHERE id = ?
    `, [result.insertId]);

    res.status(201).json(nuevoTipo[0]);

  } catch (error) {
    console.error('Error al crear tipo de ficha:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      detail: 'Error al crear el tipo de ficha'
    });
  }
});

// PUT /tipos-ficha/:id - Actualizar tipo de ficha
router.put('/:id', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, duracion_horas, precio_compra, precio_venta, descripcion } = req.body;

    // Validar datos requeridos
    if (!nombre || !duracion_horas || !precio_venta) {
      return res.status(400).json({
        error: 'Datos incompletos',
        detail: 'Se requiere nombre, duracion_horas y precio_venta'
      });
    }

    // Verificar que el tipo existe
    const tipoExists = await query(
      'SELECT id FROM tipos_fichas WHERE id = ? AND activo = 1',
      [id]
    );

    if (tipoExists.length === 0) {
      return res.status(404).json({
        error: 'Tipo de ficha no encontrado'
      });
    }

    // Asegurar que no hay valores undefined
    const nombreFinal = nombre || '';
    const duracionHorasFinal = parseInt(duracion_horas) || 1;
    const precioCompraFinal = parseFloat(precio_compra) || 0;
    const precioVentaFinal = parseFloat(precio_venta) || 0;
    const descripcionFinal = descripcion || null;

    // Actualizar tipo de ficha
    await query(`
      UPDATE tipos_fichas 
      SET nombre = ?, duracion_horas = ?, precio_compra = ?, precio_venta = ?, descripcion = ?
      WHERE id = ?
    `, [nombreFinal, duracionHorasFinal, precioCompraFinal, precioVentaFinal, descripcionFinal, id]);

    // Obtener el tipo actualizado
    const tipoActualizado = await query(`
      SELECT * FROM tipos_fichas WHERE id = ?
    `, [id]);

    res.json(tipoActualizado[0]);

  } catch (error) {
    console.error('Error al actualizar tipo de ficha:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      detail: 'Error al actualizar el tipo de ficha'
    });
  }
});

// DELETE /tipos-ficha/:id - Eliminar tipo de ficha (soft delete)
router.delete('/:id', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar que el tipo existe
    const tipoExists = await query(
      'SELECT id FROM tipos_fichas WHERE id = ? AND activo = 1',
      [id]
    );

    if (tipoExists.length === 0) {
      return res.status(404).json({
        error: 'Tipo de ficha no encontrado'
      });
    }

    // Para ahora, permitir eliminar sin verificar inventarios
    // TODO: Implementar verificación cuando se cree la tabla de inventarios
    // const enUso = await query('SELECT COUNT(*) as count FROM inventarios WHERE tipo_ficha_id = ?', [id]);
    // if (enUso[0].count > 0) { return res.status(409).json({...}); }

    // Soft delete
    await query(
      'UPDATE tipos_fichas SET activo = 0 WHERE id = ?',
      [id]
    );

    res.json({
      message: 'Tipo de ficha eliminado exitosamente'
    });

  } catch (error) {
    console.error('Error al eliminar tipo de ficha:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      detail: 'Error al eliminar el tipo de ficha'
    });
  }
});

export default router;