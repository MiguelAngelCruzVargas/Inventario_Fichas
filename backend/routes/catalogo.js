import express from 'express';
import { authenticateToken, requireRole } from '../auth.js';
import { query } from '../database.js';

const router = express.Router();

// GET /catalogo/entidades - Lista unificada de contrapartes
// Query params:
// - includeInactive=0|1 (default 0)
// - tipo: 'revendedores' | 'clientes' | 'clientes_servicio' | 'clientes_ocasional' (opcional)
router.get('/entidades', authenticateToken, requireRole(['admin','trabajador']), async (req, res) => {
  try {
    const includeInactive = req.query.includeInactive === '1' || req.query.includeInactive === 'true';
    const tipo = (req.query.tipo || '').toLowerCase();

    const results = [];

    const wantRev = !tipo || tipo === 'revendedores';
    const wantCli = !tipo || tipo === 'clientes' || tipo === 'clientes_servicio' || tipo === 'clientes_ocasional';

    if (wantRev) {
      const where = includeInactive ? '' : 'WHERE r.activo = 1';
      const revs = await query(
        `SELECT r.id, COALESCE(r.responsable, r.nombre, r.nombre_negocio) AS nombre, r.telefono, r.direccion, r.activo
         FROM revendedores r ${where} ORDER BY nombre ASC`
      );
      for (const r of revs) {
        results.push({
          id: r.id,
          tipoEntidad: 'revendedor',
          nombre: r.nombre,
          telefono: r.telefono || null,
          direccion: r.direccion || null,
          activo: r.activo ? 1 : 0,
          meta: { tabla: 'revendedores' }
        });
      }
    }

    if (wantCli) {
      // Filtrado por subtipo si corresponde
      const subWhere =
        tipo === 'clientes_servicio' ? "AND c.tipo = 'servicio'" :
        tipo === 'clientes_ocasional' ? "AND c.tipo = 'ocasional'" : '';
      const activeClause = includeInactive ? '' : 'AND c.activo = 1';
      const clientes = await query(
        `SELECT c.id, c.nombre_completo AS nombre, c.telefono, c.direccion, c.tipo, c.activo
         FROM clientes c
         WHERE 1=1 ${subWhere} ${activeClause}
         ORDER BY c.nombre_completo ASC`
      );
      for (const c of clientes) {
        results.push({
          id: c.id,
          tipoEntidad: c.tipo === 'servicio' ? 'cliente_servicio' : 'cliente_ocasional',
          nombre: c.nombre,
          telefono: c.telefono || null,
          direccion: c.direccion || null,
          activo: c.activo ? 1 : 0,
          meta: { tabla: 'clientes', tipo: c.tipo }
        });
      }
    }

    res.json({ success: true, items: results, count: results.length });
  } catch (e) {
    console.error('Error en /catalogo/entidades:', e);
    res.status(500).json({ success: false, error: 'Error al obtener el catálogo unificado' });
  }
});

export default router;
