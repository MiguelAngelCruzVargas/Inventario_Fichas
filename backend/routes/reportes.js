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

// Detecta si la tabla cortes_caja tiene revendedor_id/nombre (para compatibilidad de esquema)
async function cortesTieneRevendedorCols() {
  try {
    const r = await query(`
      SELECT 
        SUM(CASE WHEN COLUMN_NAME='revendedor_id' THEN 1 ELSE 0 END) AS has_id,
        SUM(CASE WHEN COLUMN_NAME='revendedor_nombre' THEN 1 ELSE 0 END) AS has_nombre
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'cortes_caja' AND COLUMN_NAME IN ('revendedor_id','revendedor_nombre')
    `);
    return (r?.[0]?.has_id > 0 && r?.[0]?.has_nombre > 0);
  } catch {
    return false;
  }
}

// GET /reportes/resumen - Totales y series (mes/semana/top)
router.get('/resumen', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { fecha_desde, fecha_hasta, revendedor_id, limit = 5 } = req.query;
  const cortesConRevCols = await cortesTieneRevendedorCols();
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
  let topRevendedores = await query(`
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
      // Además necesitamos unidades por periodo y top tipos desde detalle_tipos (JSON)
  const cortesDetalle = await query(`
        SELECT c.fecha_corte, c.detalle_tipos, c.observaciones, c.total_ingresos, c.total_ganancias, c.total_revendedores
        FROM cortes_caja c
        WHERE 1=1 ${whereDateCortes}
        ORDER BY c.fecha_corte ASC
      `, paramsCortes);

      // Estructuras de agregación
      const unidadesPorMes = new Map();
      const unidadesPorSemana = new Map();
      const topTiposDesdeCortes = new Map(); // key: tipo

  // Agregación para top clientes desde cortes (por nombre en observaciones)
  const topRevFromCortes = new Map(); // key: nombre

  for (const row of cortesDetalle) {
        const fecha = row.fecha_corte ? new Date(row.fecha_corte) : null;
        let detalles = [];
        try {
          detalles = typeof row.detalle_tipos === 'string' ? JSON.parse(row.detalle_tipos || '[]') : (row.detalle_tipos || []);
        } catch { detalles = []; }

        const periodoMes = fecha ? `${fecha.getFullYear()}-${String(fecha.getMonth()+1).padStart(2,'0')}` : 'desconocido';
        const week = fecha ? (function isoWeek(d){
          const tmp = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
          const dayNum = (tmp.getUTCDay() + 6) % 7;
          tmp.setUTCDate(tmp.getUTCDate() - dayNum + 3);
          const firstThursday = new Date(Date.UTC(tmp.getUTCFullYear(),0,4));
          const weekNum = 1 + Math.round(((tmp - firstThursday)/86400000 - 3 + ((firstThursday.getUTCDay()+6)%7))/7);
          return `${tmp.getUTCFullYear()}-W${String(weekNum).padStart(2,'0')}`;
        })(fecha) : 'desconocido';

        let unidadesCorte = 0;
        for (const det of detalles) {
          const unidades = Number(det.vendidas || 0);
          const totalVendidoDet = Number(det.valorVendido || det.valor_total || 0);
          const tipo = det.tipo || det.tipo_ficha || 'Sin tipo';
          unidadesCorte += unidades;

          // Top tipos
          const prev = topTiposDesdeCortes.get(tipo) || { unidades: 0, total_vendido: 0 };
          topTiposDesdeCortes.set(tipo, { unidades: prev.unidades + unidades, total_vendido: prev.total_vendido + totalVendidoDet });
        }

        // Top revendedores (estimado) por observaciones "Corte para X"
        const obs = row.observaciones || '';
        const m = obs.match(/Corte\s+para\s+(.+)/i);
        const nombreCliente = m ? m[1].trim() : 'Sin nombre';
        const prevR = topRevFromCortes.get(nombreCliente) || { total_vendido: 0, total_revendedor: 0, total_admin: 0, unidades: 0 };
        topRevFromCortes.set(nombreCliente, {
          total_vendido: prevR.total_vendido + Number(row.total_ingresos || 0),
          total_revendedor: prevR.total_revendedor + Number(row.total_revendedores || 0),
          total_admin: prevR.total_admin + Number(row.total_ganancias || 0),
          unidades: prevR.unidades + unidadesCorte
        });

        // Unidades por mes/semana
        unidadesPorMes.set(periodoMes, (unidadesPorMes.get(periodoMes) || 0) + unidadesCorte);
        unidadesPorSemana.set(week, (unidadesPorSemana.get(week) || 0) + unidadesCorte);
      }

      // Series por montos desde SQL + unidades desde JSON
      const paramsCortesMes = [...paramsCortes];
      const montosMes = await query(`
        SELECT 
          DATE_FORMAT(c.fecha_corte, '%Y-%m') AS periodo,
          COALESCE(SUM(c.total_ingresos),0) AS total_vendido,
          COALESCE(SUM(c.total_revendedores),0) AS total_revendedor,
          COALESCE(SUM(c.total_ganancias),0) AS total_admin
        FROM cortes_caja c
        WHERE 1=1 ${buildDateWhere('c.fecha_corte', fecha_desde, fecha_hasta, paramsCortesMes)}
        GROUP BY DATE_FORMAT(c.fecha_corte, '%Y-%m')
        ORDER BY periodo ASC
      `, paramsCortesMes);
      const porMesCortes = montosMes.map(m => ({ ...m, unidades: unidadesPorMes.get(m.periodo) || 0 }));

      const paramsCortesSem = [...paramsCortes];
      const montosSem = await query(`
        SELECT 
          CONCAT(YEAR(c.fecha_corte), '-W', LPAD(WEEK(c.fecha_corte, 3), 2, '0')) AS periodo,
          COALESCE(SUM(c.total_ingresos),0) AS total_vendido,
          COALESCE(SUM(c.total_revendedores),0) AS total_revendedor,
          COALESCE(SUM(c.total_ganancias),0) AS total_admin
        FROM cortes_caja c
        WHERE 1=1 ${buildDateWhere('c.fecha_corte', fecha_desde, fecha_hasta, paramsCortesSem)}
        GROUP BY YEAR(c.fecha_corte), WEEK(c.fecha_corte, 3)
        ORDER BY MIN(c.fecha_corte) ASC
      `, paramsCortesSem);
      const porSemanaCortes = montosSem.map(m => ({ ...m, unidades: unidadesPorSemana.get(m.periodo) || 0 }));

      // Acumular totales
      const tC = totalesCortes[0] || { total_vendido: 0, total_revendedor: 0, total_admin: 0 };
      totales.total_vendido = Number(totales.total_vendido || 0) + Number(tC.total_vendido || 0);
      totales.total_revendedor = Number(totales.total_revendedor || 0) + Number(tC.total_revendedor || 0);
      totales.total_admin = Number(totales.total_admin || 0) + Number(tC.total_admin || 0);
  // total_unidades ahora incluye lo derivado de detalle_tipos de los cortes
  const totalUnidadesCortes = Array.from(unidadesPorMes.values()).reduce((a,b)=>a+b,0);
  totales.total_unidades = Number(totales.total_unidades || 0) + totalUnidadesCortes;

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

      // Si no hay ventas, enriquecer top_tipos con lo derivado de cortes
      if ((topTipos?.length || 0) === 0 && topTiposDesdeCortes.size > 0) {
        // Reemplazar top_tipos con los obtenidos de cortes
        const arr = Array.from(topTiposDesdeCortes.entries()).map(([tipo, v]) => ({ tipo, unidades: v.unidades, total_vendido: v.total_vendido }));
        arr.sort((a,b)=> b.unidades - a.unidades || b.total_vendido - a.total_vendido);
        // Limit respect to query param
        topTipos.length = 0; // clear reference
        Array.prototype.push.apply(topTipos, arr.slice(0, parseInt(limit) || 5));
      }

      // Si top_revendedores está vacío, poblar desde cortes (estimado)
      if ((topRevendedores?.length || 0) === 0 && topRevFromCortes.size > 0) {
        const arrR = Array.from(topRevFromCortes.entries()).map(([nombre, v]) => ({
          revendedor_id: null,
          nombre,
          total_vendido: v.total_vendido,
          total_revendedor: v.total_revendedor,
          total_admin: v.total_admin,
          unidades: v.unidades
        }));
        arrR.sort((a,b)=> b.total_vendido - a.total_vendido);
        topRevendedores = arrR.slice(0, parseInt(limit) || 5);
      }
    } else {
      // Con filtro por revendedor, incluir también cortes de ese revendedor si la tabla ya tiene revendedor_id
      if (!cortesConRevCols) {
        // No hay columnas en BD; no podemos incluir cortes filtrados por revendedor
        return res.json({
          success: true,
          filtros: { fecha_desde, fecha_hasta, revendedor_id },
          totales: (totalesVentas[0] || { total_vendido: 0, total_revendedor: 0, total_admin: 0, total_unidades: 0 }),
          por_mes: porMesVentas,
          por_semana: porSemanaVentas,
          top_tipos: topTipos,
          top_revendedores: topRevendedores
        });
      }
      
      porMes = [...porMesVentas];
      porSemana = [...porSemanaVentas];
      totales = { ...(totalesVentas[0] || { total_vendido: 0, total_revendedor: 0, total_admin: 0, total_unidades: 0 }) };

      const paramsC = [parseInt(revendedor_id)];
      const whereDateC = buildDateWhere('c.fecha_corte', fecha_desde, fecha_hasta, paramsC);
      const cortes = await query(`
        SELECT c.fecha_corte, c.detalle_tipos, c.total_ingresos, c.total_ganancias, c.total_revendedores
        FROM cortes_caja c
        WHERE c.revendedor_id = ? ${whereDateC}
        ORDER BY c.fecha_corte ASC
      `, paramsC);

      const unidadesPorMes = new Map();
      const unidadesPorSemana = new Map();
      const topTiposDesdeCortes = new Map();

      for (const row of cortes) {
        const fecha = row.fecha_corte ? new Date(row.fecha_corte) : null;
        let detalles = [];
        try { detalles = typeof row.detalle_tipos === 'string' ? JSON.parse(row.detalle_tipos || '[]') : (row.detalle_tipos || []); } catch { detalles = []; }
        const periodoMes = fecha ? `${fecha.getFullYear()}-${String(fecha.getMonth()+1).padStart(2,'0')}` : 'desconocido';
        const week = fecha ? (function isoWeek(d){ const tmp=new Date(Date.UTC(d.getFullYear(),d.getMonth(),d.getDate())); const dayNum=(tmp.getUTCDay()+6)%7; tmp.setUTCDate(tmp.getUTCDate()-dayNum+3); const firstThursday=new Date(Date.UTC(tmp.getUTCFullYear(),0,4)); const weekNum=1+Math.round(((tmp-firstThursday)/86400000-3+((firstThursday.getUTCDay()+6)%7))/7); return `${tmp.getUTCFullYear()}-W${String(weekNum).padStart(2,'0')}`;})(fecha) : 'desconocido';
        let unidadesCorte = 0;
        for (const det of detalles) {
          const unidades = Number(det.vendidas || 0);
          const totalVendidoDet = Number(det.valorVendido || det.valor_total || 0);
          const tipo = det.tipo || det.tipo_ficha || 'Sin tipo';
          unidadesCorte += unidades;
          const prev = topTiposDesdeCortes.get(tipo) || { unidades: 0, total_vendido: 0 };
          topTiposDesdeCortes.set(tipo, { unidades: prev.unidades + unidades, total_vendido: prev.total_vendido + totalVendidoDet });
        }
        unidadesPorMes.set(periodoMes, (unidadesPorMes.get(periodoMes) || 0) + unidadesCorte);
        unidadesPorSemana.set(week, (unidadesPorSemana.get(week) || 0) + unidadesCorte);
      }

      // Montos por cortes
      const paramsCMes = [parseInt(revendedor_id)];
      const montosMes = await query(`
        SELECT DATE_FORMAT(c.fecha_corte, '%Y-%m') AS periodo,
               COALESCE(SUM(c.total_ingresos),0) AS total_vendido,
               COALESCE(SUM(c.total_revendedores),0) AS total_revendedor,
               COALESCE(SUM(c.total_ganancias),0) AS total_admin
        FROM cortes_caja c
        WHERE c.revendedor_id = ? ${buildDateWhere('c.fecha_corte', fecha_desde, fecha_hasta, paramsCMes)}
        GROUP BY DATE_FORMAT(c.fecha_corte, '%Y-%m')
        ORDER BY periodo ASC
      `, paramsCMes);
      const porMesC = montosMes.map(m => ({ ...m, unidades: unidadesPorMes.get(m.periodo) || 0 }));

      const paramsCSem = [parseInt(revendedor_id)];
      const montosSem = await query(`
        SELECT CONCAT(YEAR(c.fecha_corte), '-W', LPAD(WEEK(c.fecha_corte, 3), 2, '0')) AS periodo,
               COALESCE(SUM(c.total_ingresos),0) AS total_vendido,
               COALESCE(SUM(c.total_revendedores),0) AS total_revendedor,
               COALESCE(SUM(c.total_ganancias),0) AS total_admin
        FROM cortes_caja c
        WHERE c.revendedor_id = ? ${buildDateWhere('c.fecha_corte', fecha_desde, fecha_hasta, paramsCSem)}
        GROUP BY YEAR(c.fecha_corte), WEEK(c.fecha_corte, 3)
        ORDER BY MIN(c.fecha_corte) ASC
      `, paramsCSem);
      const porSemanaC = montosSem.map(m => ({ ...m, unidades: unidadesPorSemana.get(m.periodo) || 0 }));

      // Acumular en totales
      totales.total_vendido = Number(totales.total_vendido || 0) + (montosMes.reduce((s,m)=>s+Number(m.total_vendido||0),0));
      totales.total_revendedor = Number(totales.total_revendedor || 0) + (montosMes.reduce((s,m)=>s+Number(m.total_revendedor||0),0));
      totales.total_admin = Number(totales.total_admin || 0) + (montosMes.reduce((s,m)=>s+Number(m.total_admin||0),0));
      totales.total_unidades = Number(totales.total_unidades || 0) + Array.from(unidadesPorMes.values()).reduce((a,b)=>a+b,0);

      // Fusionar series
      const mergeSeries = (a, b) => {
        const map = new Map();
        for (const row of a) map.set(row.periodo, { ...row, total_vendido: Number(row.total_vendido||0), total_revendedor: Number(row.total_revendedor||0), total_admin: Number(row.total_admin||0), unidades: Number(row.unidades||0) });
        for (const row of b) {
          const prev = map.get(row.periodo) || { periodo: row.periodo, total_vendido: 0, total_revendedor: 0, total_admin: 0, unidades: 0 };
          map.set(row.periodo, { periodo: row.periodo, total_vendido: prev.total_vendido + Number(row.total_vendido||0), total_revendedor: prev.total_revendedor + Number(row.total_revendedor||0), total_admin: prev.total_admin + Number(row.total_admin||0), unidades: prev.unidades + Number(row.unidades||0) });
        }
        return Array.from(map.values()).sort((x,y)=> (x.periodo>y.periodo?1:-1));
      };
      porMes = mergeSeries(porMes, porMesC);
      porSemana = mergeSeries(porSemana, porSemanaC);
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

    // 1) Ventas detalladas
    const rowsVentas = await query(`
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

    // 2) Cortes detallados (expandir detalle_tipos)
    const paramsC = [];
    const whereDateC = buildDateWhere('c.fecha_corte', fecha_desde, fecha_hasta, paramsC);
    const cortes = await query(`
      SELECT c.fecha_corte, c.detalle_tipos, c.observaciones, c.revendedor_id, c.revendedor_nombre
      FROM cortes_caja c
      WHERE 1=1 ${whereDateC}
      ORDER BY c.fecha_corte DESC
    `, paramsC);

    // Obtener porcentaje admin por revendedor (si logramos inferir nombre)
    const getPorcentajeAdmin = async (nombre, id) => {
      if (!nombre) return null;
      try {
        if (id) {
          const r1 = await query(`SELECT porcentaje_comision FROM revendedores WHERE id = ? LIMIT 1`, [id]);
          if (r1.length && r1[0].porcentaje_comision != null) return parseFloat(r1[0].porcentaje_comision);
        }
        const r = await query(`SELECT porcentaje_comision FROM revendedores WHERE nombre_negocio = ? OR nombre = ? LIMIT 1`, [nombre, nombre]);
        if (r.length && r[0].porcentaje_comision != null) return parseFloat(r[0].porcentaje_comision);
      } catch {}
      return null;
    };

    // Porcentaje global fallback
    let pctGlobal = 20;
    try {
      const cfg = await query(`SELECT valor FROM configuraciones WHERE clave = 'porcentaje_ganancia_creador' LIMIT 1`);
      if (cfg.length && !isNaN(parseFloat(cfg[0].valor))) pctGlobal = parseFloat(cfg[0].valor);
    } catch {}

    const rowsCortes = [];
    for (const c of cortes) {
      let detalles = [];
      try { detalles = typeof c.detalle_tipos === 'string' ? JSON.parse(c.detalle_tipos || '[]') : (c.detalle_tipos || []); } catch { detalles = []; }
      const obs = c.observaciones || '';
      const nombre = c.revendedor_nombre || (function(){
        const m = obs.match(/Corte\s+para\s+(.+)/i);
        return m ? m[1].trim() : '';
      })();
      const pctAdmin = (await getPorcentajeAdmin(nombre, c.revendedor_id)) ?? pctGlobal;
      const factorAdmin = pctAdmin / 100;

      for (const d of detalles) {
        const cantidad = Number(d.vendidas || 0);
        const precio = Number(d.precio || 0);
        const subtotal = Number(d.valorVendido || d.valor_total || (cantidad * precio));
        const gananciaAdmin = subtotal * factorAdmin;
        const comisionTotal = subtotal - gananciaAdmin;
        const comisionUnitaria = cantidad > 0 ? comisionTotal / cantidad : 0;
        rowsCortes.push({
          fecha_venta: c.fecha_corte,
          revendedor: nombre,
          tipo_ficha: d.tipo || d.tipo_ficha || 'Sin tipo',
          cantidad,
          precio_unitario: precio,
          subtotal,
          comision_unitaria: comisionUnitaria,
          comision_total: comisionTotal,
          ganancia_admin: gananciaAdmin
        });
      }
    }

    const headers = [
      'fecha_venta','revendedor','tipo_ficha','cantidad','precio_unitario','subtotal','comision_unitaria','comision_total','ganancia_admin'
    ];
    const csvLines = [headers.join(',')];
    const allRows = [...rowsVentas, ...rowsCortes];
    for (const r of allRows) {
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
