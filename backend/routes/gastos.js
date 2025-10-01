import express from 'express';
import ExcelJS from 'exceljs';
import { authenticateToken, requireRole } from '../auth.js';
import { query, queryOne } from '../database.js';

const router = express.Router();

// Crear gasto
router.post('/', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { tipo, persona, monto, motivo } = req.body;
    if (!['prestamos','viaticos','personales'].includes(tipo)) return res.status(400).json({ error: 'Tipo inválido' });
    // Persona: para "personales" permitir vacío y usar 'admin' por defecto
    let personaFinal = (persona ?? '').toString().trim();
    if (tipo === 'personales' && !personaFinal) personaFinal = 'admin';
    if (!personaFinal || personaFinal.length < 2) return res.status(400).json({ error: 'Persona requerida' });
    const amount = Number(monto);
    if (!Number.isFinite(amount) || amount < 0) return res.status(400).json({ error: 'Monto inválido' });
    
    const result = await query(
      'INSERT INTO gastos (tipo, persona, monto, motivo) VALUES (?, ?, ?, ?)',
      [tipo, personaFinal, amount, motivo ? String(motivo).trim() : null]
    );
    const nuevo = await queryOne('SELECT * FROM gastos WHERE id = ?', [result.insertId]);
    res.status(201).json(nuevo);
  } catch (e) {
    console.error('Error creando gasto:', e);
    res.status(500).json({ error: 'Error interno', detail: e.message });
  }
});

// Listar gastos con filtros: periodo = week|month y estado pagado
router.get('/', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
  const { periodo, pagado, fecha_desde, fecha_hasta, tipo } = req.query;
  // Permitir fechas en formato YYYY-MM-DD o DD/MM/YYYY -> convertir a YYYY-MM-DD
  const parseFecha = (raw) => {
    if (!raw) return null;
    const s = String(raw).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s; // ya ISO
    const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/); // dd/mm/yyyy
    if (m) {
      const dd = m[1], mm = m[2], yyyy = m[3];
      return `${yyyy}-${mm}-${dd}`;
    }
    return null; // formato inválido, se ignora
  };
  const fechaDesdeISO = parseFecha(fecha_desde);
  const fechaHastaISO = parseFecha(fecha_hasta);
  // Paginación eficiente
  let page = parseInt(req.query.page, 10);
  let limit = parseInt(req.query.limit, 10);
  if (!Number.isFinite(page) || page < 1) page = 1;
  if (!Number.isFinite(limit) || limit < 1 || limit > 100) limit = 10; // tope 100
  const offset = (page - 1) * limit;
    const params = [];
    const where = [];
    if (periodo === 'week') where.push('YEARWEEK(created_at, 1) = YEARWEEK(CURDATE(), 1)');
    if (periodo === 'month') where.push('YEAR(created_at) = YEAR(CURDATE()) AND MONTH(created_at) = MONTH(CURDATE())');
    if (typeof pagado !== 'undefined') { where.push('pagado = ?'); params.push(pagado === '1' ? 1 : 0); }
    // Filtro por tipo (prestamos, viaticos, personales) usando misma normalización
    if (tipo && ['prestamos','viaticos','personales'].includes(tipo)) {
      where.push(`IF(tipo='' OR tipo IS NULL, 'prestamos', tipo) = ?`);
      params.push(tipo);
    }
    // Filtro por rango de fechas (inclusive). Se espera formato YYYY-MM-DD
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (fechaDesdeISO && dateRegex.test(fechaDesdeISO)) {
      where.push('DATE(created_at) >= ?');
      params.push(fechaDesdeISO);
    }
    if (fechaHastaISO && dateRegex.test(fechaHastaISO)) {
      where.push('DATE(created_at) <= ?');
      params.push(fechaHastaISO);
    }
    // Conteo total para paginación
    const sqlCount = `SELECT COUNT(*) AS c FROM gastos ${where.length ? 'WHERE ' + where.join(' AND ') : ''}`;
    const totalRow = await queryOne(sqlCount, params);
    const total = Number(totalRow?.c || 0);

    // Normalizar valores vacíos de tipo a 'prestamos' para visualización y aplicar LIMIT/OFFSET
    const sql = `SELECT id,
                        IF(tipo='' OR tipo IS NULL, 'prestamos', tipo) AS tipo,
                        persona, monto, motivo, pagado, pagado_at, created_at, updated_at
                   FROM gastos ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
                   ORDER BY created_at DESC
                   LIMIT ? OFFSET ?`;
    const items = await query(sql, [...params, limit, offset]);
    res.json({
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit))
      }
    });
  } catch (e) {
    console.error('Error listando gastos:', e);
    res.status(500).json({ error: 'Error interno', detail: e.message });
  }
});

// Resumen por periodo (totales y por tipo)
router.get('/resumen', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { periodo, fecha_desde, fecha_hasta, tipo } = req.query;
    const parseFecha = (raw) => {
      if (!raw) return null;
      const s = String(raw).trim();
      if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
      const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
      if (m) return `${m[3]}-${m[2]}-${m[1]}`;
      return null;
    };
    const fechaDesdeISO = parseFecha(fecha_desde);
    const fechaHastaISO = parseFecha(fecha_hasta);
    const filters = [];
    if (periodo === 'week') filters.push('YEARWEEK(created_at, 1) = YEARWEEK(CURDATE(), 1)');
    if (periodo === 'month') filters.push('YEAR(created_at) = YEAR(CURDATE()) AND MONTH(created_at) = MONTH(CURDATE())');
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (fechaDesdeISO && dateRegex.test(fechaDesdeISO)) filters.push('DATE(created_at) >= ?');
  if (fechaHastaISO && dateRegex.test(fechaHastaISO)) filters.push('DATE(created_at) <= ?');
    if (tipo && ['prestamos','viaticos','personales'].includes(tipo)) filters.push(`IF(tipo='' OR tipo IS NULL, 'prestamos', tipo) = ?`);
    const where = filters.length ? 'WHERE ' + filters.join(' AND ') : '';
    const params = [];
  if (fechaDesdeISO && dateRegex.test(fechaDesdeISO)) params.push(fechaDesdeISO);
  if (fechaHastaISO && dateRegex.test(fechaHastaISO)) params.push(fechaHastaISO);
    if (tipo && ['prestamos','viaticos','personales'].includes(tipo)) params.push(tipo);
    // Total debe excluir préstamos pagados: sumar viáticos + personales + préstamos NO pagados
    const total = await queryOne(`
      SELECT COALESCE(SUM(monto),0) AS total
        FROM gastos
       ${where ? where + ' AND' : 'WHERE'}
       ((IF(tipo='' OR tipo IS NULL, 'prestamos', tipo) IN ('viaticos','personales'))
         OR (IF(tipo='' OR tipo IS NULL, 'prestamos', tipo) = 'prestamos' AND pagado = 0))
    `, params);
    const porTipo = await query(`
      SELECT IF(tipo='' OR tipo IS NULL, 'prestamos', tipo) AS tipo,
             SUM(monto) AS total
        FROM gastos
        ${where}
       GROUP BY IF(tipo='' OR tipo IS NULL, 'prestamos', tipo)`, params);
    const prestadoPendiente = await queryOne(`
      SELECT SUM(monto) AS total
        FROM gastos
       ${where ? where + ' AND' : 'WHERE'} IF(tipo='' OR tipo IS NULL, 'prestamos', tipo) = 'prestamos' AND pagado = 0`, params);
    res.json({
      total: Number(total?.total || 0),
      porTipo: porTipo.map(r => ({ tipo: r.tipo, total: Number(r.total || 0) })),
      prestadoPendiente: Number(prestadoPendiente?.total || 0)
    });
  } catch (e) {
    console.error('Error en resumen de gastos:', e);
    res.status(500).json({ error: 'Error interno', detail: e.message });
  }
});

// Exportar CSV
router.get('/export', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { periodo, pagado, fecha_desde, fecha_hasta, tipo } = req.query;
    const parseFecha = (raw) => {
      if (!raw) return null;
      const s = String(raw).trim();
      if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
      const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
      if (m) return `${m[3]}-${m[2]}-${m[1]}`;
      return null;
    };
    const fechaDesdeISO = parseFecha(fecha_desde);
    const fechaHastaISO = parseFecha(fecha_hasta);
    const params = [];
    const where = [];
    if (periodo === 'week') where.push('YEARWEEK(created_at, 1) = YEARWEEK(CURDATE(), 1)');
    if (periodo === 'month') where.push('YEAR(created_at) = YEAR(CURDATE()) AND MONTH(created_at) = MONTH(CURDATE())');
    if (typeof pagado !== 'undefined') { where.push('pagado = ?'); params.push(pagado === '1' ? 1 : 0); }
    if (tipo && ['prestamos','viaticos','personales'].includes(tipo)) { where.push(`IF(tipo='' OR tipo IS NULL, 'prestamos', tipo) = ?`); params.push(tipo); }
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (fechaDesdeISO && dateRegex.test(fechaDesdeISO)) { where.push('DATE(created_at) >= ?'); params.push(fechaDesdeISO); }
  if (fechaHastaISO && dateRegex.test(fechaHastaISO)) { where.push('DATE(created_at) <= ?'); params.push(fechaHastaISO); }

  const sql = `SELECT id,
                        IF(tipo='' OR tipo IS NULL, 'prestamos', tipo) AS tipo,
                        persona, monto, motivo, pagado, pagado_at, created_at, updated_at,
                        YEAR(created_at) AS year, MONTH(created_at) AS month, WEEK(created_at, 3) AS week
                   FROM gastos ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
                   ORDER BY created_at DESC`;
    const rows = await query(sql, params);

    const esc = (val) => {
      if (val === null || typeof val === 'undefined') return '""';
      const s = String(val).replace(/"/g, '""');
      return `"${s}"`;
    };

    // Helpers fecha/hora legible en es-MX (24h)
    const formatDate = (d) => {
      if (!d) return '';
      const date = new Date(d);
      if (isNaN(date.getTime())) return String(d);
      const yyyy = date.getFullYear();
      const mm = String(date.getMonth() + 1).padStart(2, '0');
      const dd = String(date.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`; // formato estable para Excel
    };
    const formatTime = (d) => {
      if (!d) return '';
      const date = new Date(d);
      if (isNaN(date.getTime())) return '';
      const hh = String(date.getHours()).padStart(2, '0');
      const mi = String(date.getMinutes()).padStart(2, '0');
      const ss = String(date.getSeconds()).padStart(2, '0');
      return `${hh}:${mi}:${ss}`;
    };

    const header = [
      'ID','Tipo','Estado préstamo','Persona','Monto (MXN)','Motivo','¿Pagado?','Fecha de pago','Registrado (fecha)','Registrado (hora)','Año','Mes','Semana','Periodo'
    ].join(',');

  const periodoStr = periodo || 'all';
  const periodoLabel = periodoStr === 'week' ? 'semana' : (periodoStr === 'month' ? 'mes' : 'todo');
    let totViaticos = 0, totPersonales = 0, totPrestamosPend = 0;
    const lines = rows.map(r => {
  const tipoLegible = r.tipo === 'prestamos' ? 'Préstamos' : (r.tipo === 'viaticos' ? 'Viáticos' : 'Personales');
      const prestamoEstado = r.tipo === 'prestamos' ? (r.pagado ? 'Pagado' : 'Pendiente') : '';
      const monto = Number(r.monto || 0);
      if (r.tipo === 'viaticos') totViaticos += monto;
      if (r.tipo === 'personales') totPersonales += monto;
      if (r.tipo === 'prestamos' && !r.pagado) totPrestamosPend += monto;
      return [
        r.id,
        esc(tipoLegible),
        esc(prestamoEstado),
        esc(r.persona),
        (monto).toFixed(2),
        esc(r.motivo || ''),
        esc(r.pagado ? 'Sí' : 'No'),
        esc(r.pagado_at ? `${formatDate(r.pagado_at)} ${formatTime(r.pagado_at)}` : ''),
        esc(formatDate(r.created_at)),
        esc(formatTime(r.created_at)),
        r.year,
        r.month,
        r.week,
        esc(periodoStr)
      ].join(',');
    });

    // Resumen al final (mismas columnas, usando Tipo y Monto)
    const totalGeneral = (totViaticos + totPersonales + totPrestamosPend);
    lines.push('');
    lines.push([ '', 'RESUMEN', '', '', '', '', '', '', '', '', '', '', '', '' ].join(','));
    lines.push([ '', 'Viáticos', '', '', totViaticos.toFixed(2), '', '', '', '', '', '', '', '', '' ].join(','));
    lines.push([ '', 'Personales', '', '', totPersonales.toFixed(2), '', '', '', '', '', '', '', '', '' ].join(','));
    lines.push([ '', 'Préstamos pendientes', '', '', totPrestamosPend.toFixed(2), '', '', '', '', '', '', '', '', '' ].join(','));
    lines.push([ '', 'Total (sin préstamos pagados)', '', '', totalGeneral.toFixed(2), '', '', '', '', '', '', '', '', '' ].join(','));

    // Si se pide formato=xlsx devolvemos Excel bien formateado
    if ((req.query.formato || req.query.format) === 'xlsx') {
      const wb = new ExcelJS.Workbook();
      wb.creator = 'Sistema Fichas';
      wb.created = new Date();
      const ws = wb.addWorksheet('Gastos');
      // Encabezados
      const columns = [
        { header: 'ID', key: 'id', width: 8 },
        { header: 'Tipo', key: 'tipo', width: 14 },
        { header: 'Estado préstamo', key: 'estado', width: 18 },
        { header: 'Persona', key: 'persona', width: 20 },
        { header: 'Monto (MXN)', key: 'monto', width: 14, style: { numFmt: '[$MXN] #,##0.00' } },
        { header: 'Motivo', key: 'motivo', width: 30 },
        { header: '¿Pagado?', key: 'pagado', width: 11 },
        { header: 'Fecha de pago', key: 'pagado_at', width: 20 },
        { header: 'Registrado (fecha)', key: 'fecha', width: 16 },
        { header: 'Registrado (hora)', key: 'hora', width: 16 },
        { header: 'Año', key: 'year', width: 8 },
        { header: 'Mes', key: 'month', width: 8 },
        { header: 'Semana', key: 'week', width: 10 },
        { header: 'Periodo', key: 'periodo', width: 12 }
      ];
      ws.columns = columns;
      // Estilos de cabecera
      ws.getRow(1).font = { bold: true, color: { argb: 'FF1F2937' } };
      ws.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };
      ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE5E7EB' } };
      ws.getRow(1).border = { bottom: { style: 'thin', color: { argb: 'FF9CA3AF' } } };

      // Filas de datos desde rows (evitar problemas de CSV y comas)
    rows.forEach((r) => {
        const tipoLegible = r.tipo === 'prestamos' ? 'Préstamos' : (r.tipo === 'viaticos' ? 'Viáticos' : 'Personales');
        const prestamoEstado = r.tipo === 'prestamos' ? (r.pagado ? 'Pagado' : 'Pendiente') : '';
        ws.addRow({
          id: r.id,
          tipo: tipoLegible,
          estado: prestamoEstado,
          persona: r.persona || '',
          monto: Number(r.monto || 0),
          motivo: r.motivo || '',
          pagado: r.pagado ? 'Sí' : 'No',
          pagado_at: r.pagado_at ? `${formatDate(r.pagado_at)} ${formatTime(r.pagado_at)}` : '',
          fecha: formatDate(r.created_at),
          hora: formatTime(r.created_at),
          year: r.year,
          month: r.month,
          week: r.week,
      periodo: periodoLabel
        });
      });

      // Resumen
      const startSummaryRow = ws.rowCount + 2;
      ws.addRow([]);
      ws.addRow(['', 'RESUMEN']);
      ws.addRow(['', 'Viáticos', '', '', totViaticos]);
      ws.addRow(['', 'Personales', '', '', totPersonales]);
      ws.addRow(['', 'Préstamos pendientes', '', '', totPrestamosPend]);
      ws.addRow(['', 'Total (sin préstamos pagados)', '', '', totalGeneral]);

      // Estilos resumen
      ws.getCell(`B${startSummaryRow+1}`).font = { bold: true };
      for (let r = startSummaryRow + 2; r <= startSummaryRow + 5; r++) {
        ws.getCell(`B${r}`).font = { bold: r === startSummaryRow + 5 };
  ws.getCell(`E${r}`).numFmt = '[$MXN] #,##0.00';
      }

      const now = new Date();
      const yyyy = now.getFullYear();
      const mm = String(now.getMonth()+1).padStart(2,'0');
      const dd = String(now.getDate()).padStart(2,'0');
      const HH = String(now.getHours()).padStart(2, '0');
      const MI = String(now.getMinutes()).padStart(2, '0');
  const filenameXlsx = `gastos_${periodoLabel}_${yyyy}-${mm}-${dd}_${HH}${MI}.xlsx`;

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filenameXlsx}"`);
      await wb.xlsx.write(res);
      return res.end();
    }

    // CSV por defecto
  const csv = '\uFEFF' + header + '\n' + lines.join('\n');
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth()+1).padStart(2,'0');
    const dd = String(now.getDate()).padStart(2,'0');
    const HH = String(now.getHours()).padStart(2, '0');
    const MI = String(now.getMinutes()).padStart(2, '0');
  const filename = `gastos_${periodoLabel}_${yyyy}-${mm}-${dd}_${HH}${MI}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  } catch (e) {
    console.error('Error exportando gastos CSV:', e);
    res.status(500).json({ error: 'Error interno', detail: e.message });
  }
});

// Marcar prestado como pagado
router.post('/:id/pagar', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: 'ID inválido' });
  await query('UPDATE gastos SET pagado=1, pagado_at=NOW(), updated_at=NOW() WHERE id=? AND (tipo="prestamos" OR tipo="")', [id]);
    const updated = await queryOne('SELECT * FROM gastos WHERE id=?', [id]);
    if (!updated) return res.status(404).json({ error: 'Gasto no encontrado' });
    res.json(updated);
  } catch (e) {
    console.error('Error marcando gasto como pagado:', e);
    res.status(500).json({ error: 'Error interno', detail: e.message });
  }
});

// Eliminar gasto
router.delete('/:id', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: 'ID inválido' });
    await query('DELETE FROM gastos WHERE id=?', [id]);
    res.json({ success: true });
  } catch (e) {
    console.error('Error eliminando gasto:', e);
    res.status(500).json({ error: 'Error interno', detail: e.message });
  }
});

export default router;
