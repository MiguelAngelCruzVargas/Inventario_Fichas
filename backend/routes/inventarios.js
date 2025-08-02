import express from 'express';
import { query } from '../database.js';
import { authenticateToken, requireRole } from '../auth.js';

const router = express.Router();

// GET /inventarios/revendedor/:id - Obtener inventario de un revendedor
router.get('/revendedor/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

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

    const inventario = await query(`
      SELECT i.*, tf.nombre as tipo_ficha_nombre, tf.duracion_horas,
             r.nombre_negocio as revendedor_nombre,
             sg.cantidad_disponible as stock_global_disponible
      FROM inventarios i
      JOIN tipos_fichas tf ON i.tipo_ficha_id = tf.id
      JOIN revendedores r ON i.revendedor_id = r.id
      LEFT JOIN stock_global sg ON i.tipo_ficha_id = sg.tipo_ficha_id
      WHERE i.revendedor_id = ? AND i.activo = 1
      ORDER BY tf.duracion_horas, tf.nombre
    `, [id]);

    res.json(inventario);
  } catch (error) {
    console.error('Error al obtener inventario:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      detail: 'Error al obtener el inventario'
    });
  }
});

// POST /inventarios/ajustar - Ajustar inventario
router.post('/ajustar', authenticateToken, requireRole(['admin', 'trabajador']), async (req, res) => {
  try {
    const { revendedor_id, tipo_ficha_id, campo, cantidad } = req.body;

    // Validaciones
    if (!revendedor_id || !tipo_ficha_id || !campo || cantidad === undefined) {
      return res.status(400).json({
        error: 'Datos incompletos',
        detail: 'Se requiere revendedor_id, tipo_ficha_id, campo y cantidad'
      });
    }

    // Mapear nombres de campos del frontend a la base de datos
    const mapCampos = {
      'entregadas': 'fichas_entregadas',
      'vendidas': 'fichas_vendidas',
      'fichas_entregadas': 'fichas_entregadas',
      'fichas_vendidas': 'fichas_vendidas',
      'stock_actual': 'stock_actual'
    };

    const campoReal = mapCampos[campo];
    if (!campoReal) {
      return res.status(400).json({
        error: 'Campo inválido',
        detail: `Campo debe ser uno de: ${Object.keys(mapCampos).join(', ')}`
      });
    }

    // Verificar que existe el inventario
    let inventario = await query(
      'SELECT * FROM inventarios WHERE revendedor_id = ? AND tipo_ficha_id = ?',
      [revendedor_id, tipo_ficha_id]
    );

    if (inventario.length === 0) {
      // Crear inventario si no existe
      await query(`
        INSERT INTO inventarios (revendedor_id, tipo_ficha_id, fichas_entregadas, fichas_vendidas, stock_actual)
        VALUES (?, ?, 0, 0, 0)
      `, [revendedor_id, tipo_ficha_id]);

      inventario = await query(
        'SELECT * FROM inventarios WHERE revendedor_id = ? AND tipo_ficha_id = ?',
        [revendedor_id, tipo_ficha_id]
      );
    }

    const inventarioActual = inventario[0];

    // Calcular nuevo valor del campo
    const valorActual = inventarioActual[campoReal] || 0;
    const nuevoValor = valorActual + cantidad;

    if (nuevoValor < 0) {
      return res.status(400).json({
        error: 'Valor inválido',
        detail: `El nuevo valor no puede ser negativo. Valor actual: ${valorActual}, ajuste: ${cantidad}`
      });
    }

    // Si se están modificando fichas entregadas, actualizar también el stock global
    if (campoReal === 'fichas_entregadas') {
      // La cantidad puede ser positiva (entrega) o negativa (devolución)
      // Debemos restar del stock global cuando entregamos (+cantidad) y sumar cuando devolvemos (-cantidad)
      const ajusteStockGlobal = -cantidad; // Invertir para que entrega reste y devolución sume
      
      // Verificar que hay suficiente stock global para la entrega (solo si es positiva)
      if (cantidad > 0) {
        const stockGlobal = await query(
          'SELECT cantidad_disponible FROM stock_global WHERE tipo_ficha_id = ?',
          [tipo_ficha_id]
        );
        
        if (stockGlobal.length === 0 || stockGlobal[0].cantidad_disponible < cantidad) {
          return res.status(400).json({
            error: 'Stock insuficiente',
            detail: `No hay suficiente stock global para entregar ${cantidad} fichas. Stock disponible: ${stockGlobal.length > 0 ? stockGlobal[0].cantidad_disponible : 0}`
          });
        }
      }
      
      // Actualizar stock global
      await query(`
        UPDATE stock_global 
        SET cantidad_disponible = cantidad_disponible + ?
        WHERE tipo_ficha_id = ?
      `, [ajusteStockGlobal, tipo_ficha_id]);
    }

    // Actualizar el campo específico
    await query(`
      UPDATE inventarios 
      SET ${campoReal} = ?
      WHERE revendedor_id = ? AND tipo_ficha_id = ?
    `, [nuevoValor, revendedor_id, tipo_ficha_id]);

    // Recalcular stock_actual si se modificaron fichas entregadas o vendidas
    if (campoReal === 'fichas_entregadas' || campoReal === 'fichas_vendidas') {
      await query(`
        UPDATE inventarios 
        SET stock_actual = fichas_entregadas - fichas_vendidas
        WHERE revendedor_id = ? AND tipo_ficha_id = ?
      `, [revendedor_id, tipo_ficha_id]);
    }

    // Obtener el inventario actualizado
    const inventarioActualizado = await query(`
      SELECT i.*, tf.nombre as tipo_ficha_nombre, tf.duracion_horas,
             r.nombre_negocio as revendedor_nombre
      FROM inventarios i
      JOIN tipos_fichas tf ON i.tipo_ficha_id = tf.id
      JOIN revendedores r ON i.revendedor_id = r.id
      WHERE i.revendedor_id = ? AND i.tipo_ficha_id = ?
    `, [revendedor_id, tipo_ficha_id]);

    res.json(inventarioActualizado[0]);

  } catch (error) {
    console.error('Error al ajustar inventario:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      detail: 'Error al ajustar el inventario'
    });
  }
});

// GET /inventarios - Obtener todos los inventarios (admin/trabajador)
router.get('/', authenticateToken, requireRole(['admin', 'trabajador']), async (req, res) => {
  try {
    const inventarios = await query(`
      SELECT i.*, tf.nombre as tipo_ficha_nombre, tf.duracion_horas,
             r.nombre_negocio as revendedor_nombre,
             sg.cantidad_disponible as stock_global_disponible
      FROM inventarios i
      JOIN tipos_fichas tf ON i.tipo_ficha_id = tf.id
      JOIN revendedores r ON i.revendedor_id = r.id
      LEFT JOIN stock_global sg ON i.tipo_ficha_id = sg.tipo_ficha_id
      WHERE r.activo = 1 AND tf.activo = 1 AND i.activo = 1
      ORDER BY r.nombre_negocio, tf.duracion_horas
    `);

    res.json(inventarios);
  } catch (error) {
    console.error('Error al obtener inventarios:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      detail: 'Error al obtener los inventarios'
    });
  }
});

// PUT /inventarios/vendidas-directo - Actualizar directamente la cantidad de fichas vendidas
router.put('/vendidas-directo', authenticateToken, requireRole(['admin', 'trabajador']), async (req, res) => {
  try {
    const { revendedor_id, tipo_ficha_id, cantidad_vendidas } = req.body;

    // Validaciones
    if (!revendedor_id || !tipo_ficha_id || cantidad_vendidas === undefined) {
      return res.status(400).json({
        error: 'Datos incompletos',
        detail: 'Se requiere revendedor_id, tipo_ficha_id y cantidad_vendidas'
      });
    }

    if (cantidad_vendidas < 0) {
      return res.status(400).json({
        error: 'Cantidad inválida',
        detail: 'La cantidad vendidas no puede ser negativa'
      });
    }

    // Verificar que el inventario existe y obtener fichas entregadas
    const inventario = await query(
      'SELECT fichas_entregadas FROM inventarios WHERE revendedor_id = ? AND tipo_ficha_id = ?',
      [revendedor_id, tipo_ficha_id]
    );

    if (inventario.length === 0) {
      return res.status(404).json({
        error: 'Inventario no encontrado',
        detail: 'No existe inventario para este revendedor y tipo de ficha'
      });
    }

    const fichasEntregadas = inventario[0].fichas_entregadas;

    // Verificar que no se vendan más fichas de las entregadas
    if (cantidad_vendidas > fichasEntregadas) {
      return res.status(400).json({
        error: 'Cantidad excedida',
        detail: `No se pueden vender ${cantidad_vendidas} fichas. Solo se han entregado ${fichasEntregadas} fichas.`
      });
    }

    // Actualizar cantidad vendidas
    await query(`
      UPDATE inventarios 
      SET fichas_vendidas = ?, stock_actual = fichas_entregadas - ?
      WHERE revendedor_id = ? AND tipo_ficha_id = ?
    `, [cantidad_vendidas, cantidad_vendidas, revendedor_id, tipo_ficha_id]);

    // Obtener el inventario actualizado
    const inventarioActualizado = await query(`
      SELECT i.*, tf.nombre as tipo_ficha_nombre, tf.duracion_horas,
             r.nombre_negocio as revendedor_nombre
      FROM inventarios i
      JOIN tipos_fichas tf ON i.tipo_ficha_id = tf.id
      JOIN revendedores r ON i.revendedor_id = r.id
      WHERE i.revendedor_id = ? AND i.tipo_ficha_id = ?
    `, [revendedor_id, tipo_ficha_id]);

    res.json({
      success: true,
      message: 'Cantidad vendidas actualizada exitosamente',
      data: inventarioActualizado[0]
    });

  } catch (error) {
    console.error('Error al actualizar cantidad vendidas:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      detail: 'Error al actualizar la cantidad vendidas'
    });
  }
});

// POST /inventarios - Crear nuevo inventario
router.post('/', authenticateToken, requireRole(['admin', 'trabajador']), async (req, res) => {
  try {
    const { revendedor_id, tipo_ficha_id, stock_inicial } = req.body;

    // Validaciones
    if (!revendedor_id || !tipo_ficha_id) {
      return res.status(400).json({
        error: 'Datos incompletos',
        detail: 'Se requiere revendedor_id y tipo_ficha_id'
      });
    }

    // Verificar que no exista ya
    const existingInventario = await query(
      'SELECT id FROM inventarios WHERE revendedor_id = ? AND tipo_ficha_id = ?',
      [revendedor_id, tipo_ficha_id]
    );

    if (existingInventario.length > 0) {
      return res.status(409).json({
        error: 'Inventario ya existe',
        detail: 'Ya existe un inventario para este revendedor y tipo de ficha'
      });
    }

    const stockInicial = stock_inicial || 0;

    // Crear inventario
    const result = await query(`
      INSERT INTO inventarios (revendedor_id, tipo_ficha_id, fichas_entregadas, fichas_vendidas, stock_actual)
      VALUES (?, ?, ?, 0, ?)
    `, [revendedor_id, tipo_ficha_id, stockInicial, stockInicial]);

    // Obtener el inventario creado
    const nuevoInventario = await query(`
      SELECT i.*, tf.nombre as tipo_ficha_nombre, tf.duracion_horas,
             r.nombre_negocio as revendedor_nombre
      FROM inventarios i
      JOIN tipos_fichas tf ON i.tipo_ficha_id = tf.id
      JOIN revendedores r ON i.revendedor_id = r.id
      WHERE i.id = ?
    `, [result.insertId]);

    res.status(201).json(nuevoInventario[0]);

  } catch (error) {
    console.error('Error al crear inventario:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      detail: 'Error al crear el inventario'
    });
  }
});

export default router;
