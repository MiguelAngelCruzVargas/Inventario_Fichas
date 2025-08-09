import express from 'express';
import { query } from '../database.js';
import { authenticateToken, requireRole } from '../auth.js';

const router = express.Router();

// Normaliza rango de fechas (opcionales)
function buildDateWhere(field = 'v.fecha_venta', desde, hasta, params) {
  const parts = [];
  if (desde) {
    parts.push(`DATE(${field}) >= ?`);
    params.push(desde);
  }
  if (hasta) {
    parts.push(`DATE(${field}) <= ?`);
    params.push(hasta);
  }
  return parts.length ? `AND ${parts.join(' AND ')}` : '';
}

// GET /reportes/resumen - Totales y series (mes/semana/top)
router.get('/resumen', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { fecha_desde, fecha_hasta, revendedor_id, limit = 5 } = req.query;
    const params = [];
    const whereRev = revendedor_id ? 'AND v.revendedor_id = ?' : '';
    if (revendedor_id) params.push(parseInt(revendedor_id));
    const whereDate = buildDateWhere('v.fecha_venta', fecha_desde, fecha_hasta, params);

  // Totales generales (ventas)
  const totalesVentas = await query(`
      SELECT 
        COALESCE(SUM(v.subtotal),0) AS total_vendido,
        COALESCE(SUM(v.comision_total),0) AS total_revendedor,
        COALESCE(SUM(v.subtotal - v.comision_total),0) AS total_admin,
        COALESCE(SUM(v.cantidad),0) AS total_unidades
      FROM ventas v
      WHERE 1=1 ${whereRev} ${whereDate}
    `, params);

    // Serie mensual (YYYY-MM)
    const paramsMes = [...params];
  const porMesVentas = await query(`
      SELECT 
        DATE_FORMAT(v.fecha_venta, '%Y-%m') AS periodo,
        COALESCE(SUM(v.subtotal),0) AS total_vendido,
        COALESCE(SUM(v.comision_total),0) AS total_revendedor,
        COALESCE(SUM(v.subtotal - v.comision_total),0) AS total_admin,
        COALESCE(SUM(v.cantidad),0) AS unidades
      FROM ventas v
      WHERE 1=1 ${whereRev} ${buildDateWhere('v.fecha_venta', fecha_desde, fecha_hasta, paramsMes)}
      GROUP BY DATE_FORMAT(v.fecha_venta, '%Y-%m')
      ORDER BY periodo ASC
    `, paramsMes);

    // Serie semanal (ISO YEAR-WEEK)
    const paramsSem = [...params];
  const porSemanaVentas = await query(`
      SELECT 
        CONCAT(YEAR(v.fecha_venta), '-W', LPAD(WEEK(v.fecha_venta, 3), 2, '0')) AS periodo,
        COALESCE(SUM(v.subtotal),0) AS total_vendido,
        COALESCE(SUM(v.comision_total),0) AS total_revendedor,
        COALESCE(SUM(v.subtotal - v.comision_total),0) AS total_admin,
        COALESCE(SUM(v.cantidad),0) AS unidades
      FROM ventas v
      WHERE 1=1 ${whereRev} ${buildDateWhere('v.fecha_venta', fecha_desde, fecha_hasta, paramsSem)}
      GROUP BY YEAR(v.fecha_venta), WEEK(v.fecha_venta, 3)
      ORDER BY MIN(v.fecha_venta) ASC
    `, paramsSem);

    // Top tipos de ficha (por cantidad)
    const paramsTipos = [...params];
  const topTipos = await query(`
      SELECT 
        tf.id AS tipo_ficha_id,
        tf.nombre AS tipo,
        COALESCE(SUM(v.cantidad),0) AS unidades,
        COALESCE(SUM(v.subtotal),0) AS total_vendido
      FROM ventas v
      JOIN tipos_fichas tf ON v.tipo_ficha_id = tf.id
      WHERE 1=1 ${whereRev} ${buildDateWhere('v.fecha_venta', fecha_desde, fecha_hasta, paramsTipos)}
      GROUP BY tf.id, tf.nombre
      ORDER BY unidades DESC, total_vendido DESC
      LIMIT ${parseInt(limit) || 5}
    `, paramsTipos);

    // Top revendedores (por total vendido)
    const paramsRev = [];
    const whereDate2 = buildDateWhere('v.fecha_venta', fecha_desde, fecha_hasta, paramsRev);
    const topRevendedores = await query(`
      SELECT 
        r.id AS revendedor_id,
        COALESCE(r.nombre_negocio, r.nombre) AS nombre,
        COALESCE(SUM(v.subtotal),0) AS total_vendido,
        COALESCE(SUM(v.comision_total),0) AS total_revendedor,
        COALESCE(SUM(v.subtotal - v.comision_total),0) AS total_admin,
        COALESCE(SUM(v.cantidad),0) AS unidades
      FROM ventas v
      JOIN revendedores r ON v.revendedor_id = r.id
      WHERE 1=1 ${whereDate2}
      GROUP BY r.id, r.nombre, r.nombre_negocio
      ORDER BY total_vendido DESC
      LIMIT ${parseInt(limit) || 5}
    `, paramsRev);

    // Complementar datos con cortes de caja cuando NO hay filtro por revendedor (la tabla cortes_caja no guarda revendedor_id)
    let totales = { ...(totalesVentas[0] || { total_vendido: 0, total_revendedor: 0, total_admin: 0, total_unidades: 0 }) };
    let porMes = [...porMesVentas];
    let porSemana = [...porSemanaVentas];

    if (!revendedor_id) {
      const paramsCortes = [];
      const whereDateCortes = buildDateWhere('c.fecha_corte', fecha_desde, fecha_hasta, paramsCortes);

      // Totales de cortes
      const totalesCortes = await query(`
        SELECT 
          COALESCE(SUM(c.total_ingresos),0) AS total_vendido,
          COALESCE(SUM(c.total_revendedores),0) AS total_revendedor,
          COALESCE(SUM(c.total_ganancias),0) AS total_admin
        FROM cortes_caja c
        WHERE 1=1 ${whereDateCortes}
      `, paramsCortes);

      // Series mensuales y semanales de cortes
      const paramsCortesMes = [...paramsCortes];
      const porMesCortes = await query(`
        SELECT 
          DATE_FORMAT(c.fecha_corte, '%Y-%m') AS periodo,
          COALESCE(SUM(c.total_ingresos),0) AS total_vendido,
          COALESCE(SUM(c.total_revendedores),0) AS total_revendedor,
          COALESCE(SUM(c.total_ganancias),0) AS total_admin,
          0 AS unidades
        FROM cortes_caja c
        WHERE 1=1 ${buildDateWhere('c.fecha_corte', fecha_desde, fecha_hasta, paramsCortesMes)}
        GROUP BY DATE_FORMAT(c.fecha_corte, '%Y-%m')
        ORDER BY periodo ASC
      `, paramsCortesMes);

      const paramsCortesSem = [...paramsCortes];
      const porSemanaCortes = await query(`
        SELECT 
          CONCAT(YEAR(c.fecha_corte), '-W', LPAD(WEEK(c.fecha_corte, 3), 2, '0')) AS periodo,
          COALESCE(SUM(c.total_ingresos),0) AS total_vendido,
          COALESCE(SUM(c.total_revendedores),0) AS total_revendedor,
          COALESCE(SUM(c.total_ganancias),0) AS total_admin,
          0 AS unidades
        FROM cortes_caja c
        WHERE 1=1 ${buildDateWhere('c.fecha_corte', fecha_desde, fecha_hasta, paramsCortesSem)}
        GROUP BY YEAR(c.fecha_corte), WEEK(c.fecha_corte, 3)
        ORDER BY MIN(c.fecha_corte) ASC
      `, paramsCortesSem);

      // Acumular totales
      const tC = totalesCortes[0] || { total_vendido: 0, total_revendedor: 0, total_admin: 0 };
      totales.total_vendido = Number(totales.total_vendido || 0) + Number(tC.total_vendido || 0);
      totales.total_revendedor = Number(totales.total_revendedor || 0) + Number(tC.total_revendedor || 0);
      totales.total_admin = Number(totales.total_admin || 0) + Number(tC.total_admin || 0);
      // total_unidades se mantiene desde ventas (no contamos unidades desde cortes)

      // Helper para fusionar series por periodo
      const mergeSeries = (a, b) => {
        const map = new Map();
        for (const row of a) {
          map.set(row.periodo, { ...row, total_vendido: Number(row.total_vendido || 0), total_revendedor: Number(row.total_revendedor || 0), total_admin: Number(row.total_admin || 0), unidades: Number(row.unidades || 0) });
        }
        for (const row of b) {
          const prev = map.get(row.periodo) || { periodo: row.periodo, total_vendido: 0, total_revendedor: 0, total_admin: 0, unidades: 0 };
          map.set(row.periodo, {
            periodo: row.periodo,
            total_vendido: Number(prev.total_vendido) + Number(row.total_vendido || 0),
            total_revendedor: Number(prev.total_revendedor) + Number(row.total_revendedor || 0),
            total_admin: Number(prev.total_admin) + Number(row.total_admin || 0),
            unidades: Number(prev.unidades || 0) + Number(row.unidades || 0)
          });
        }
        return Array.from(map.values()).sort((x,y)=> (x.periodo>y.periodo?1:-1));
      };

      porMes = mergeSeries(porMesVentas, porMesCortes);
      porSemana = mergeSeries(porSemanaVentas, porSemanaCortes);
    } else {
      // Con filtro por revendedor, devolvemos solo datos de ventas (cortes no distinguen revendedor)
      porMes = porMesVentas;
      porSemana = porSemanaVentas;
      totales = { ...(totalesVentas[0] || { total_vendido: 0, total_revendedor: 0, total_admin: 0, total_unidades: 0 }) };
    }

    res.json({
      success: true,
      filtros: { fecha_desde, fecha_hasta, revendedor_id },
      totales,
      por_mes: porMes,
      por_semana: porSemana,
      top_tipos: topTipos,
      top_revendedores: topRevendedores
    });
  } catch (error) {
    console.error('Error en /reportes/resumen:', error);
    res.status(500).json({ success: false, message: 'Error obteniendo reportes', error: error.message });
  }
});

// GET /reportes/export - Exportar CSV (compatible con Excel)
router.get('/export', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { fecha_desde, fecha_hasta, revendedor_id } = req.query;
    const params = [];
    const whereRev = revendedor_id ? 'AND v.revendedor_id = ?' : '';
    if (revendedor_id) params.push(parseInt(revendedor_id));
    const whereDate = buildDateWhere('v.fecha_venta', fecha_desde, fecha_hasta, params);

    const rows = await query(`
      SELECT 
        v.fecha_venta,
        r.nombre_negocio AS revendedor,
        tf.nombre AS tipo_ficha,
        v.cantidad,
        v.precio_unitario,
        v.subtotal,
        v.comision_unitaria,
        v.comision_total,
        (v.subtotal - v.comision_total) AS ganancia_admin
      FROM ventas v
      JOIN revendedores r ON v.revendedor_id = r.id
      JOIN tipos_fichas tf ON v.tipo_ficha_id = tf.id
      WHERE 1=1 ${whereRev} ${whereDate}
      ORDER BY v.fecha_venta DESC
    `, params);

    const headers = [
      'fecha_venta','revendedor','tipo_ficha','cantidad','precio_unitario','subtotal','comision_unitaria','comision_total','ganancia_admin'
    ];
    const csvLines = [headers.join(',')];
    for (const r of rows) {
      const line = [
        r.fecha_venta ? new Date(r.fecha_venta).toISOString().slice(0,10) : '',
        (r.revendedor || '').replace(/[,\n\r]/g,' '),
        (r.tipo_ficha || '').replace(/[,\n\r]/g,' '),
        r.cantidad,
        r.precio_unitario,
        r.subtotal,
        r.comision_unitaria,
        r.comision_total,
        r.ganancia_admin
      ].join(',');
      csvLines.push(line);
    }

    const csv = csvLines.join('\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="reporte_ventas.csv"');
    return res.send(csv);
  } catch (error) {
    console.error('Error en /reportes/export:', error);
    res.status(500).json({ success: false, message: 'Error exportando reporte', error: error.message });
  }
});

export default router;
