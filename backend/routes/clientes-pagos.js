import express from 'express';
import { authenticateToken, requireRole } from '../auth.js';
import { db, query, queryOne } from '../database.js';

const router = express.Router();

// Util: calcular vencimiento para un periodo (a partir de año/mes y dia_corte)
const vencimientoFrom = (year, month, dia_corte = 1) => {
  const d = new Date(Date.UTC(year, month - 1, Math.min(dia_corte || 1, 28)));
  return d.toISOString().slice(0, 10);
};

// GET /clientes-pagos/mis - Cliente ve sus pagos
router.get('/mis', authenticateToken, requireRole(['cliente']), async (req, res) => {
  try {
    const clienteId = req.user.cliente_id;
    if (!clienteId) return res.status(400).json({ success: false, error: 'Cliente no asociado' });

    const pagos = await query(
      'SELECT * FROM clientes_pagos WHERE cliente_id = ? ORDER BY periodo_year DESC, periodo_month DESC',
      [clienteId]
    );

    // Resumen simple: próximo vencimiento y estado
    const pendiente = pagos.filter(p => p.estado === 'pendiente').sort((a,b) => new Date(a.fecha_vencimiento) - new Date(b.fecha_vencimiento))[0];
    const vencidos = pagos.filter(p => p.estado === 'vencido').length;
    const pagados = pagos.filter(p => p.estado === 'pagado').length;

    res.json({ success: true, pagos, resumen: { proximo: pendiente || null, vencidos, pagados } });
  } catch (e) {
    console.error('Error al obtener mis pagos:', e);
    res.status(500).json({ success: false, error: 'Error al obtener pagos' });
  }
});

// GET /clientes-pagos/cliente/:id - Admin/Trabajador ve pagos de un cliente
router.get('/cliente/:id', authenticateToken, requireRole(['admin','trabajador']), async (req, res) => {
  try {
    const { id } = req.params;
    const pagos = await query(
      'SELECT * FROM clientes_pagos WHERE cliente_id = ? ORDER BY periodo_year DESC, periodo_month DESC',
      [id]
    );
    res.json({ success: true, pagos });
  } catch (e) { res.status(500).json({ success: false, error: 'Error al obtener pagos del cliente' }); }
});

// POST /clientes-pagos/cliente/:id/generar - generar periodos entre YYYY-MM
router.post('/cliente/:id/generar', authenticateToken, requireRole(['admin','trabajador']), async (req, res) => {
  try {
    const { id } = req.params;
    const { desde, hasta, monto } = req.body; // desde/hasta: 'YYYY-MM'
    const cliente = await queryOne('SELECT id, dia_corte, cuota_mensual FROM clientes WHERE id = ? AND tipo = "servicio"', [id]);
    if (!cliente) return res.status(404).json({ success: false, error: 'Cliente no encontrado' });
    const cuota = monto || cliente.cuota_mensual || 0;
    if (!desde || !hasta) return res.status(400).json({ success: false, error: 'desde y hasta son requeridos' });

    const [y1, m1] = desde.split('-').map(n => parseInt(n,10));
    const [y2, m2] = hasta.split('-').map(n => parseInt(n,10));
    let y = y1, m = m1;
    const inserts = [];
    while (y < y2 || (y === y2 && m <= m2)) {
      inserts.push([id, y, m, vencimientoFrom(y, m, cliente.dia_corte || 1), cuota]);
      m++;
      if (m > 12) { m = 1; y++; }
    }
    const conn = db; // usar db.execute con bulks
    for (const row of inserts) {
      await conn.execute(
        `INSERT IGNORE INTO clientes_pagos (cliente_id, periodo_year, periodo_month, fecha_vencimiento, monto) VALUES (?, ?, ?, ?, ?)`,
        row
      );
    }
    res.status(201).json({ success: true, generados: inserts.length });
  } catch (e) {
    console.error('Error al generar pagos:', e);
    res.status(500).json({ success: false, error: 'Error al generar pagos' });
  }
});

// POST /clientes-pagos/:id/pagar
router.post('/:id/pagar', authenticateToken, requireRole(['admin','trabajador']), async (req, res) => {
  try {
    const { id } = req.params;
    // Obtener periodo a pagar
    const [rows] = await db.execute('SELECT id, cliente_id, periodo_year, periodo_month, monto FROM clientes_pagos WHERE id = ?', [id]);
    if (!rows.length) return res.status(404).json({ success: false, error: 'Periodo no encontrado' });
    const per = rows[0];

    // Marcar como pagado
    await db.execute('UPDATE clientes_pagos SET monto_pagado = monto, estado = "pagado", pagado_at = NOW(), updated_at = NOW() WHERE id = ?', [id]);

    // Intentar crear el siguiente periodo automáticamente si no existe
    let nextY = Number(per.periodo_year);
    let nextM = Number(per.periodo_month) + 1;
    if (nextM > 12) { nextM = 1; nextY += 1; }

    // Cargar datos del cliente para cuota y día de corte
    const cliente = await queryOne('SELECT id, cuota_mensual, dia_corte FROM clientes WHERE id = ?', [per.cliente_id]);
    if (cliente) {
      const montoNext = Number(cliente.cuota_mensual || per.monto || 0);
      const venc = vencimientoFrom(nextY, nextM, cliente.dia_corte || 1);
      await db.execute(
        'INSERT IGNORE INTO clientes_pagos (cliente_id, periodo_year, periodo_month, fecha_vencimiento, monto) VALUES (?, ?, ?, ?, ?)',
        [per.cliente_id, nextY, nextM, venc, montoNext]
      );
    }

    res.json({ success: true, message: 'Pago registrado' });
  } catch (e) {
    console.error('Error al registrar pago:', e);
    res.status(500).json({ success: false, error: 'Error al registrar pago' });
  }
});

// POST /clientes-pagos/cliente/:id/init - crea el primer periodo si el cliente de servicio no tiene ninguno
router.post('/cliente/:id/init', authenticateToken, requireRole(['admin','trabajador']), async (req, res) => {
  try {
    const { id } = req.params; // cliente id
    const cliente = await queryOne('SELECT id, tipo, cuota_mensual, dia_corte, fecha_primer_corte, fecha_instalacion FROM clientes WHERE id = ?', [id]);
    if (!cliente) return res.status(404).json({ success: false, error: 'Cliente no encontrado' });
    if (cliente.tipo !== 'servicio') return res.status(400).json({ success: false, error: 'Solo aplica a clientes de servicio' });

    // Verificar si ya existen periodos
    const existing = await queryOne('SELECT id FROM clientes_pagos WHERE cliente_id = ? LIMIT 1', [id]);
    if (existing) return res.json({ success: true, message: 'Ya existen periodos para este cliente' });

    // Determinar fecha base: fecha_primer_corte si existe, de lo contrario fecha_instalacion o hoy
    const hoy = new Date();
    const baseDateStr = cliente.fecha_primer_corte || cliente.fecha_instalacion || hoy.toISOString().slice(0,10);
    const baseParts = baseDateStr.split('-').map(n => parseInt(n,10));
    let year = baseParts[0];
    let month = baseParts[1];
    let dia = cliente.dia_corte || baseParts[2] || 1;
    // Normalizar día (evitar >28 para evitar invalid dates en meses cortos)
    if (dia > 28) dia = 28;
    const cuota = Number(cliente.cuota_mensual || 0);
    const vencimiento = vencimientoFrom(year, month, dia);
    await db.execute(
      'INSERT INTO clientes_pagos (cliente_id, periodo_year, periodo_month, fecha_vencimiento, monto) VALUES (?, ?, ?, ?, ?)',
      [cliente.id, year, month, vencimiento, cuota]
    );
    return res.status(201).json({ success: true, message: 'Primer periodo creado', periodo: { year, month, vencimiento, monto: cuota } });
  } catch (e) {
    console.error('Error en init periodo cliente:', e);
    res.status(500).json({ success: false, error: 'Error al crear primer periodo' });
  }
});

// POST /clientes-pagos/:id/suspender (corte de servicio)
router.post('/:id/suspender', authenticateToken, requireRole(['admin','trabajador']), async (req, res) => {
  try {
    const { id } = req.params;
    await db.execute('UPDATE clientes_pagos SET estado = "suspendido", corte_servicio_at = NOW(), updated_at = NOW() WHERE id = ?', [id]);
    res.json({ success: true, message: 'Servicio suspendido para el periodo' });
  } catch (e) { res.status(500).json({ success: false, error: 'Error al suspender servicio' }); }
});

// POST /clientes-pagos/:id/reactivar
router.post('/:id/reactivar', authenticateToken, requireRole(['admin','trabajador']), async (req, res) => {
  try {
    const { id } = req.params;
    await db.execute('UPDATE clientes_pagos SET estado = "pendiente", updated_at = NOW() WHERE id = ? AND estado = "suspendido"', [id]);
    res.json({ success: true, message: 'Servicio reactivado para el periodo' });
  } catch (e) { res.status(500).json({ success: false, error: 'Error al reactivar servicio' }); }
});

export default router;
 
// NUEVO: GET /clientes-pagos/resumen - Próximo pago por cliente de servicio
router.get('/resumen', authenticateToken, requireRole(['admin','trabajador','cliente_servicio']), async (req, res) => {
  try {
    const rows = await query(`
      SELECT 
        c.id AS cliente_id,
        c.nombre_completo,
        c.cuota_mensual,
        c.dia_corte,
        p.id AS periodo_id,
        p.periodo_year,
        p.periodo_month,
        p.fecha_vencimiento,
        p.estado,
        p.monto,
        p.monto_pagado,
        CASE 
          WHEN p.id IS NULL THEN 'al_dia'
          WHEN p.estado = 'pagado' THEN 'al_dia'
          WHEN p.monto_pagado > 0 AND p.monto_pagado < p.monto AND p.fecha_vencimiento < CURDATE() THEN 'vencido'
          WHEN p.monto_pagado > 0 AND p.monto_pagado < p.monto THEN 'pendiente'
          WHEN p.fecha_vencimiento IS NOT NULL AND p.fecha_vencimiento < CURDATE() THEN 'vencido'
          ELSE COALESCE(p.estado, 'pendiente')
        END AS estado_calculado,
        /* Deuda acumulada de periodos anteriores al seleccionado (si hay) */
        COALESCE(d.deuda_prev, 0) AS deuda_prev,
        /* Faltante del periodo seleccionado (0 si pagado o si no hay periodo seleccionado) */
        CASE WHEN p.id IS NOT NULL AND p.estado <> 'pagado' THEN GREATEST(p.monto - COALESCE(p.monto_pagado,0), 0) ELSE 0 END AS faltante_actual,
        /* Total a pagar = deuda previa + faltante del actual (si aplica) */
        COALESCE(d.deuda_prev, 0) + CASE WHEN p.id IS NOT NULL AND p.estado <> 'pagado' THEN GREATEST(p.monto - COALESCE(p.monto_pagado,0), 0) ELSE 0 END AS monto_a_pagar
      FROM clientes c
      /* p: periodo objetivo por cliente (pendiente/vencido/suspendido más cercano; si no hay, primer futuro) */
      LEFT JOIN (
        SELECT cp1.*
          FROM clientes_pagos cp1
          JOIN (
                SELECT cliente_id,
                       COALESCE(
                         MIN(CASE WHEN estado IN ('pendiente','vencido','suspendido') THEN fecha_vencimiento END),
                         MIN(CASE WHEN fecha_vencimiento >= CURDATE() THEN fecha_vencimiento END)
                       ) AS target_v
                  FROM clientes_pagos
                 GROUP BY cliente_id
               ) sel ON sel.cliente_id = cp1.cliente_id AND cp1.fecha_vencimiento = sel.target_v
      ) p ON p.cliente_id = c.id
      /* d: suma de remainders de periodos anteriores al target */
      LEFT JOIN (
        SELECT cp.cliente_id,
               SUM(GREATEST(cp.monto - COALESCE(cp.monto_pagado,0), 0)) AS deuda_prev
          FROM clientes_pagos cp
          JOIN (
                SELECT cliente_id,
                       COALESCE(
                         MIN(CASE WHEN estado IN ('pendiente','vencido','suspendido') THEN fecha_vencimiento END),
                         MIN(CASE WHEN fecha_vencimiento >= CURDATE() THEN fecha_vencimiento END),
                         CURDATE()
                       ) AS target_v
                  FROM clientes_pagos
                 GROUP BY cliente_id
               ) s2 ON s2.cliente_id = cp.cliente_id
         WHERE cp.estado <> 'pagado' AND cp.fecha_vencimiento < s2.target_v
         GROUP BY cp.cliente_id
      ) d ON d.cliente_id = c.id
      WHERE c.tipo = 'servicio' AND c.activo = 1
      ORDER BY (p.fecha_vencimiento IS NULL), p.fecha_vencimiento ASC, c.nombre_completo ASC
    `);
    res.json({ success: true, resumen: rows });
  } catch (e) {
    console.error('Error en /clientes-pagos/resumen:', e);
    res.status(500).json({ success: false, error: 'Error al obtener resumen' });
  }
});

// NUEVO: GET /clientes-pagos/pendientes - Lista todos los periodos no pagados (pendiente/vencido/suspendido)
router.get('/pendientes', authenticateToken, requireRole(['admin','trabajador']), async (req, res) => {
  try {
    const { page = 1, limit = 20, estado, q, desde, hasta } = req.query;
    const p = Math.max(parseInt(page, 10) || 1, 1);
    const l = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 200);
    const off = (p - 1) * l;

    const where = ["c.tipo = 'servicio'", 'c.activo = 1'];
    const params = [];
    if (estado && ['pendiente','vencido','suspendido'].includes(String(estado))) {
      where.push('cp.estado = ?'); params.push(String(estado));
    } else {
      where.push("cp.estado IN ('pendiente','vencido','suspendido')");
    }
    if (q) { where.push('c.nombre_completo LIKE ?'); params.push(`%${q}%`); }
    if (desde) { where.push('cp.fecha_vencimiento >= ?'); params.push(desde); }
    if (hasta) { where.push('cp.fecha_vencimiento <= ?'); params.push(hasta); }

    const whereSql = where.length ? 'WHERE ' + where.join(' AND ') : '';

    const countSql = `SELECT COUNT(*) AS total
                        FROM clientes_pagos cp
                        JOIN clientes c ON c.id = cp.cliente_id
                       ${whereSql}`;
    const [countRows] = await db.execute(countSql, params);
    const total = Number(countRows[0]?.total || 0);

    const dataSql = `SELECT 
                       cp.id AS periodo_id,
                       cp.cliente_id,
                       c.nombre_completo,
                       cp.periodo_year,
                       cp.periodo_month,
                       cp.fecha_vencimiento,
                       cp.estado,
                       cp.monto,
                       cp.monto_pagado,
                       (cp.monto - COALESCE(cp.monto_pagado,0)) AS faltante,
                       CASE 
                         WHEN cp.estado = 'pagado' THEN 'al_dia'
                         WHEN COALESCE(cp.monto_pagado,0) > 0 AND COALESCE(cp.monto_pagado,0) < cp.monto AND cp.fecha_vencimiento < CURDATE() THEN 'vencido'
                         WHEN COALESCE(cp.monto_pagado,0) > 0 AND COALESCE(cp.monto_pagado,0) < cp.monto THEN 'pendiente'
                         WHEN cp.fecha_vencimiento < CURDATE() THEN 'vencido'
                         ELSE cp.estado
                       END AS estado_calculado
                     FROM clientes_pagos cp
                     JOIN clientes c ON c.id = cp.cliente_id
                    ${whereSql}
                    ORDER BY cp.fecha_vencimiento ASC, c.nombre_completo ASC
                    LIMIT ? OFFSET ?`;
    const dataParams = params.slice();
    dataParams.push(l, off);
    const [rows] = await db.execute(dataSql, dataParams);

    res.json({ success: true, items: rows, pagination: { page: p, limit: l, total, totalPages: Math.ceil(total / l) } });
  } catch (e) {
    console.error('Error en /clientes-pagos/pendientes:', e);
    res.status(500).json({ success: false, error: 'Error al obtener periodos pendientes' });
  }
});

// POST /clientes-pagos/:id/abonar - registrar abono parcial
router.post('/:id/abonar', authenticateToken, requireRole(['admin','trabajador']), async (req, res) => {
  try {
    const { id } = req.params;
    const { monto } = req.body;
    const abono = Number(monto);
    if (!abono || abono <= 0) return res.status(400).json({ success: false, error: 'Monto de abono inválido' });

    const [rows] = await db.execute('SELECT id, cliente_id, periodo_year, periodo_month, monto, monto_pagado, estado FROM clientes_pagos WHERE id = ?', [id]);
    if (!rows.length) return res.status(404).json({ success: false, error: 'Periodo no encontrado' });
    const p = rows[0];
    const nuevo = Math.min(Number(p.monto), Number(p.monto_pagado) + abono);
    const nuevoEstado = nuevo >= Number(p.monto) ? 'pagado' : (p.estado === 'suspendido' ? 'suspendido' : 'pendiente');
    await db.execute(
      'UPDATE clientes_pagos SET monto_pagado = ?, estado = ?, pagado_at = CASE WHEN ? >= monto THEN NOW() ELSE pagado_at END, updated_at = NOW() WHERE id = ?',
      [nuevo, nuevoEstado, nuevo, id]
    );
    // Si con el abono quedó pagado, crear siguiente periodo si no existe, igual que en /pagar
    if (nuevoEstado === 'pagado') {
      let nextY = Number(p.periodo_year);
      let nextM = Number(p.periodo_month) + 1;
      if (nextM > 12) { nextM = 1; nextY += 1; }
      const cliente = await queryOne('SELECT id, cuota_mensual, dia_corte FROM clientes WHERE id = ?', [p.cliente_id]);
      if (cliente) {
        const montoNext = Number(cliente.cuota_mensual || p.monto || 0);
        const venc = vencimientoFrom(nextY, nextM, cliente.dia_corte || 1);
        await db.execute(
          'INSERT IGNORE INTO clientes_pagos (cliente_id, periodo_year, periodo_month, fecha_vencimiento, monto) VALUES (?, ?, ?, ?, ?)',
          [p.cliente_id, nextY, nextM, venc, montoNext]
        );
      }
    }
    res.json({ success: true, message: 'Abono registrado', monto_pagado: nuevo, estado: nuevoEstado });
  } catch (e) {
    console.error('Error en abonar:', e);
    res.status(500).json({ success: false, error: 'Error al registrar abono' });
  }
});

// POST /clientes-pagos/ensure-next - asegura el periodo del mes actual para clientes activos
router.post('/ensure-next', authenticateToken, requireRole(['admin','trabajador']), async (req, res) => {
  try {
    const today = new Date();
    const y = today.getUTCFullYear();
    const m = today.getUTCMonth() + 1;
    const [clientes] = await db.execute("SELECT id, cuota_mensual, dia_corte FROM clientes WHERE tipo='servicio' AND activo=1");
    let creados = 0;
    for (const c of clientes) {
      const venc = vencimientoFrom(y, m, c.dia_corte || 1);
      const [r] = await db.execute(
        `INSERT IGNORE INTO clientes_pagos (cliente_id, periodo_year, periodo_month, fecha_vencimiento, monto) VALUES (?, ?, ?, ?, ?)`,
        [c.id, y, m, venc, c.cuota_mensual || 0]
      );
      if (r?.affectedRows) creados += r.affectedRows;
    }
    res.json({ success: true, creados });
  } catch (e) {
    console.error('Error en ensure-next:', e);
    res.status(500).json({ success: false, error: 'Error al asegurar periodos' });
  }
});
