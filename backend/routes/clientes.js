import express from 'express';
import { authenticateToken, requireRole } from '../auth.js';
import { query, db } from '../database.js';

// Cache simple de columnas de la tabla clientes
let clientesColumnsCache = null;
async function getClientesColumns() {
  if (clientesColumnsCache) return clientesColumnsCache;
  const rows = await query("SHOW COLUMNS FROM clientes");
  clientesColumnsCache = rows.map(r => r.Field);
  return clientesColumnsCache;
}

const router = express.Router();

// Helper to validate base payload
function parseClientePayload(body) {
  const {
    tipo,
    nombre_completo,
    telefono,
    email,
    direccion,
    latitud,
    longitud,
    notas,
    // específicos servicio
    plan,
    velocidad_mbps,
    cuota_mensual,
    fecha_instalacion,
  fecha_primer_corte,
    dia_corte,
    estado,
    activo
  } = body;

  // Derivar día de corte si no viene pero existe fecha_primer_corte
  let diaCorteParsed = dia_corte === '' || dia_corte === undefined ? null : parseInt(dia_corte, 10);
  if ((diaCorteParsed === null || isNaN(diaCorteParsed)) && fecha_primer_corte) {
    try {
      const d = new Date(fecha_primer_corte + 'T00:00:00Z');
      if (!isNaN(d.getTime())) {
        diaCorteParsed = d.getUTCDate();
        if (diaCorteParsed > 28) diaCorteParsed = 28;
      }
    } catch {}
  }

  return {
    tipo,
    nombre_completo,
    telefono: telefono || null,
    email: email || null,
    direccion: direccion || null,
    latitud: latitud === '' || latitud === undefined || latitud === null ? null : Number(latitud),
    longitud: longitud === '' || longitud === undefined || longitud === null ? null : Number(longitud),
    notas: notas || null,
    plan: plan || null,
    velocidad_mbps: velocidad_mbps === '' || velocidad_mbps === undefined ? null : parseInt(velocidad_mbps, 10),
    cuota_mensual: cuota_mensual === '' || cuota_mensual === undefined ? null : Number(cuota_mensual),
  fecha_instalacion: fecha_instalacion || null,
  fecha_primer_corte: fecha_primer_corte || null,
    dia_corte: diaCorteParsed,
    estado: estado || null,
    activo: activo === undefined ? 1 : (activo ? 1 : 0)
  };
}

// GET /clientes - listar con filtros
router.get('/', authenticateToken, requireRole(['admin','trabajador']), async (req, res) => {
  try {
    const { tipo, activo } = req.query;
    const wh = [];
    const params = [];
    if (tipo && ['servicio','ocasional'].includes(tipo)) { wh.push('tipo = ?'); params.push(tipo); }
    // Por defecto ocultar inactivos si no se especifica filtro
    if (activo === '1' || activo === '0') {
      wh.push('activo = ?');
      params.push(parseInt(activo,10));
    } else {
      wh.push('activo = 1');
    }
    const where = wh.length ? `WHERE ${wh.join(' AND ')}` : '';
    const rows = await query(`
      SELECT * FROM clientes ${where}
      ORDER BY activo DESC, tipo, nombre_completo
    `, params);
    res.json({ success: true, clientes: rows });
  } catch (e) {
    console.error('Error al listar clientes:', e);
    res.status(500).json({ success: false, error: 'Error al listar clientes' });
  }
});

// POST /clientes - crear
router.post('/', authenticateToken, requireRole(['admin','trabajador']), async (req, res) => {
  try {
    const c = parseClientePayload(req.body);
    if (!c.tipo || !['servicio','ocasional'].includes(c.tipo)) {
      return res.status(400).json({ success: false, error: 'Tipo de cliente inválido' });
    }
    if (!c.nombre_completo || !c.nombre_completo.trim()) {
      return res.status(400).json({ success: false, error: 'El nombre completo es requerido' });
    }
    // Construir INSERT dinámico según columnas existentes
    const cols = await getClientesColumns();
    const baseFields = [
      'tipo','nombre_completo','telefono','email','direccion','latitud','longitud','notas',
      'plan','velocidad_mbps','cuota_mensual','fecha_instalacion','dia_corte','estado','activo'
    ];
    const optionalFields = ['fecha_primer_corte'];
    const insertFields = [...baseFields, ...optionalFields.filter(f => cols.includes(f))];
    const placeholders = insertFields.map(() => '?').join(', ');
    const values = insertFields.map(f => c[f]);

    const [result] = await db.execute(
      `INSERT INTO clientes (${insertFields.join(', ')}) VALUES (${placeholders})`,
      values
    );

    const [nuevo] = await db.execute('SELECT * FROM clientes WHERE id = ?', [result.insertId]);
    res.status(201).json({ success: true, cliente: nuevo[0] });
  } catch (e) {
    console.error('Error al crear cliente:', e);
    res.status(500).json({ success: false, error: 'Error al crear cliente' });
  }
});

// PUT /clientes/:id - actualizar
router.put('/:id', authenticateToken, requireRole(['admin','trabajador']), async (req, res) => {
  try {
    const { id } = req.params;
    const c = parseClientePayload(req.body);
    // Campos a actualizar (dinámico por columnas existentes)
    const cols = await getClientesColumns();
    const fields = [
      'tipo','nombre_completo','telefono','email','direccion','latitud','longitud','notas',
      'plan','velocidad_mbps','cuota_mensual','fecha_instalacion','dia_corte','estado','activo'
    ];
    if (cols.includes('fecha_primer_corte')) fields.push('fecha_primer_corte');
    const updates = [];
    const values = [];
    for (const f of fields) {
      if (req.body[f] !== undefined) {
        updates.push(`${f} = ?`);
        values.push(c[f]);
      }
    }
    if (!updates.length) return res.status(400).json({ success: false, error: 'Sin cambios' });
    values.push(id);
    await db.execute(`UPDATE clientes SET ${updates.join(', ')}, updated_at = NOW() WHERE id = ?`, values);
    const [actual] = await db.execute('SELECT * FROM clientes WHERE id = ?', [id]);
    if (!actual.length) return res.status(404).json({ success: false, error: 'Cliente no encontrado' });
    res.json({ success: true, cliente: actual[0] });
  } catch (e) {
    console.error('Error al actualizar cliente:', e);
    res.status(500).json({ success: false, error: 'Error al actualizar cliente' });
  }
});

// PATCH /clientes/:id/toggle-activo
router.patch('/:id/toggle-activo', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const [row] = await db.execute('SELECT id, activo FROM clientes WHERE id = ?', [id]);
    if (!row.length) return res.status(404).json({ success: false, error: 'Cliente no encontrado' });
    const nuevo = row[0].activo ? 0 : 1;
    await db.execute('UPDATE clientes SET activo = ?, updated_at = NOW() WHERE id = ?', [nuevo, id]);
    res.json({ success: true, message: `Cliente ${nuevo ? 'activado' : 'desactivado'}` });
  } catch (e) {
    console.error('Error al cambiar estado de cliente:', e);
    res.status(500).json({ success: false, error: 'Error al cambiar estado de cliente' });
  }
});

// DELETE /clientes/:id
router.delete('/:id', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const [row] = await db.execute('SELECT id FROM clientes WHERE id = ?', [id]);
    if (!row.length) return res.status(404).json({ success: false, error: 'Cliente no encontrado' });
    await db.execute('DELETE FROM clientes WHERE id = ?', [id]);
    res.json({ success: true, message: 'Cliente eliminado' });
  } catch (e) {
    console.error('Error al eliminar cliente:', e);
    res.status(500).json({ success: false, error: 'Error al eliminar cliente' });
  }
});

export default router;
