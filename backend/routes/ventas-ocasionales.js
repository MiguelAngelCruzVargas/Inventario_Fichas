import express from 'express';
import { authenticateToken, requireRole } from '../auth.js';
import { query } from '../database.js';

const router = express.Router();

// POST /ventas-ocasionales - Registrar venta a cliente ocasional
router.post('/', authenticateToken, requireRole(['admin','trabajador']), async (req, res) => {
  try {
    const { cliente_id, tipo_ficha_id, cantidad, precio_unitario, observaciones } = req.body;

    if (!cliente_id || !tipo_ficha_id || !cantidad || !precio_unitario) {
      return res.status(400).json({ error: 'Datos incompletos', detail: 'cliente_id, tipo_ficha_id, cantidad, precio_unitario son requeridos' });
    }
    if (cantidad <= 0 || precio_unitario <= 0) {
      return res.status(400).json({ error: 'Valores inválidos', detail: 'cantidad y precio_unitario deben ser > 0' });
    }

    // Validar cliente ocasional
    const cliente = await query('SELECT id, tipo, activo FROM clientes WHERE id = ? AND activo = 1', [cliente_id]);
    if (cliente.length === 0 || cliente[0].tipo !== 'ocasional') {
      return res.status(400).json({ error: 'Cliente inválido', detail: 'El cliente no existe, no está activo o no es ocasional' });
    }

    // Validar tipo ficha
    const tipo = await query('SELECT id, activo FROM tipos_fichas WHERE id = ? AND activo = 1', [tipo_ficha_id]);
    if (tipo.length === 0) return res.status(404).json({ error: 'Tipo de ficha no encontrado' });

    // Verificar stock global
    const stock = await query('SELECT id, cantidad_disponible FROM stock_global WHERE tipo_ficha_id = ?', [tipo_ficha_id]);
    if (stock.length === 0 || stock[0].cantidad_disponible < cantidad) {
      const disp = stock.length ? stock[0].cantidad_disponible : 0;
      return res.status(400).json({ error: 'Stock global insuficiente', detail: `Disponible: ${disp}, solicitado: ${cantidad}` });
    }

    const subtotal = Number(cantidad) * Number(precio_unitario);

    // Registrar venta
    const result = await query(`
      INSERT INTO ventas_ocasionales (cliente_id, tipo_ficha_id, cantidad, precio_unitario, subtotal, nota, fecha_venta, usuario_id)
      VALUES (?, ?, ?, ?, ?, ?, CURDATE(), ?)
    `, [cliente_id, tipo_ficha_id, cantidad, precio_unitario, subtotal, observaciones || null, req.user?.id || null]);

    // Actualizar stock global
    await query('UPDATE stock_global SET cantidad_disponible = cantidad_disponible - ? WHERE tipo_ficha_id = ?', [cantidad, tipo_ficha_id]);

    // Devolver venta con joins
    const venta = await query(`
      SELECT vo.*, c.nombre_completo AS cliente_nombre, tf.nombre AS tipo_ficha_nombre, u.username AS usuario_venta
      FROM ventas_ocasionales vo
      JOIN clientes c ON vo.cliente_id = c.id
      JOIN tipos_fichas tf ON vo.tipo_ficha_id = tf.id
      LEFT JOIN usuarios u ON vo.usuario_id = u.id
      WHERE vo.id = ?
    `, [result.insertId]);

    res.status(201).json({ success: true, venta: venta[0] });
  } catch (e) {
    console.error('Error en ventas-ocasionales:', e);
    res.status(500).json({ error: 'Error interno del servidor', detail: 'No se pudo registrar la venta' });
  }
});

// GET /ventas-ocasionales - Listar ventas (filtros opcionales)
router.get('/', authenticateToken, requireRole(['admin','trabajador']), async (req, res) => {
  try {
    const { cliente_id, fecha_desde, fecha_hasta, limite } = req.query;
    let sql = `
      SELECT vo.*, c.nombre_completo AS cliente_nombre, tf.nombre AS tipo_ficha_nombre, u.username AS usuario_venta
      FROM ventas_ocasionales vo
      JOIN clientes c ON vo.cliente_id = c.id
      JOIN tipos_fichas tf ON vo.tipo_ficha_id = tf.id
      LEFT JOIN usuarios u ON vo.usuario_id = u.id
      WHERE c.tipo = 'ocasional' AND c.activo = 1
    `;
    const params = [];
    if (cliente_id) { sql += ' AND vo.cliente_id = ?'; params.push(cliente_id); }
    if (fecha_desde) { sql += ' AND DATE(vo.fecha_venta) >= ?'; params.push(fecha_desde); }
    if (fecha_hasta) { sql += ' AND DATE(vo.fecha_venta) <= ?'; params.push(fecha_hasta); }
    sql += ' ORDER BY vo.fecha_venta DESC, vo.id DESC';
    if (limite && !isNaN(parseInt(limite))) { sql += ` LIMIT ${parseInt(limite)}`; }
    const ventas = await query(sql, params);
    res.json({ success: true, ventas });
  } catch (e) {
    console.error('Error listando ventas-ocasionales:', e);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export default router;
