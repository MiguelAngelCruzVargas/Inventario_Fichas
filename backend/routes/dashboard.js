import express from 'express';
// Asegúrate de que las rutas a tus archivos de dependencias sean correctas
import { query } from '../database.js';
import { authenticateToken, requireRole } from '../auth.js';

const router = express.Router();

// GET /dashboard/stats - Obtener todas las listas de datos para el dashboard
router.get('/stats', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    console.log('🎯 Obteniendo datos detallados del dashboard...');

    // 1. Revendedores con inventario - CORREGIDO con campos reales
    const revendedoresQuery = `
      SELECT
          r.id,
          r.nombre_negocio,
          r.nombre,
          r.responsable,
          r.telefono,
          r.direccion,
          r.activo,
          r.porcentaje_comision,
          COALESCE(inv.fichas1h, 0) AS fichas1h,
          COALESCE(inv.fichas2h, 0) AS fichas2h,
          COALESCE(inv.fichas3h, 0) AS fichas3h,
          COALESCE(inv.fichas5h, 0) AS fichas5h,
          COALESCE(inv.total_fichas, 0) AS total_fichas
      FROM
          revendedores r
      LEFT JOIN (
          SELECT
              i.revendedor_id,
              SUM(CASE WHEN tf.nombre LIKE '%1h%' OR tf.nombre LIKE '%1 hora%' THEN (i.fichas_entregadas - i.fichas_vendidas) ELSE 0 END) AS fichas1h,
              SUM(CASE WHEN tf.nombre LIKE '%2h%' OR tf.nombre LIKE '%2 horas%' THEN (i.fichas_entregadas - i.fichas_vendidas) ELSE 0 END) AS fichas2h,
              SUM(CASE WHEN tf.nombre LIKE '%3h%' OR tf.nombre LIKE '%3 horas%' THEN (i.fichas_entregadas - i.fichas_vendidas) ELSE 0 END) AS fichas3h,
              SUM(CASE WHEN tf.nombre LIKE '%5h%' OR tf.nombre LIKE '%5 horas%' THEN (i.fichas_entregadas - i.fichas_vendidas) ELSE 0 END) AS fichas5h,
              SUM(i.fichas_entregadas - i.fichas_vendidas) AS total_fichas
          FROM
              inventarios i
          LEFT JOIN
              tipos_fichas tf ON i.tipo_ficha_id = tf.id
          WHERE
              i.activo = 1 AND tf.activo = 1
          GROUP BY
              i.revendedor_id
      ) inv ON r.id = inv.revendedor_id
      WHERE
          r.activo = 1
      ORDER BY
          total_fichas DESC, r.nombre;
    `;

    // Las demás consultas se mantienen, pero ahora se ejecutan en paralelo para eficiencia.
    const [
        revendedores,
        entregas,
        tiposFicha,
        tareas,
        trabajadores,
        ventasQuery
    ] = await Promise.all([
        query(revendedoresQuery),
        query(`
            SELECT 
                e.id, e.revendedor_id as revendedorId, e.tipo_ficha_id, e.cantidad,
                e.tipo_movimiento, e.nota, DATE_FORMAT(e.created_at, '%Y-%m-%d') as fecha,
                e.created_at as fecha_completa, r.nombre as revendedor_nombre,
                tf.nombre as tipoFicha, tf.precio_venta as precio, tf.duracion_horas,
                u.username as usuario_entrega
            FROM entregas e
            JOIN revendedores r ON e.revendedor_id = r.id
            JOIN tipos_fichas tf ON e.tipo_ficha_id = tf.id
            LEFT JOIN usuarios u ON e.created_by = u.id
            WHERE r.activo = 1 AND tf.activo = 1
            ORDER BY e.created_at DESC LIMIT 100
        `),
        query(`
            SELECT id, nombre, descripcion, duracion_horas, precio_compra, precio_venta, activo
            FROM tipos_fichas WHERE activo = 1 ORDER BY duracion_horas, nombre
        `),
        query(`
            SELECT 
                t.id, t.revendedor_id, t.trabajador_id, t.titulo, t.descripcion, t.prioridad,
                t.estado, t.fecha_asignacion, t.fecha_vencimiento, t.fecha_completado, t.notas,
                t.created_at, r.nombre as nombre_revendedor, tm.nombre_completo as nombre_trabajador
            FROM tareas_mantenimiento t
            LEFT JOIN revendedores r ON t.revendedor_id = r.id
            LEFT JOIN trabajadores_mantenimiento tm ON t.trabajador_id = tm.id
            ORDER BY t.created_at DESC
        `),
        query(`
            SELECT 
                id, nombre_completo, email, username, activo, especialidad
            FROM trabajadores_mantenimiento
            WHERE activo = 1
            ORDER BY nombre_completo
        `),
        query(`
            SELECT 
                SUM(e.cantidad * tf.precio_venta) as total_vendido,
                SUM(e.cantidad * tf.precio_venta * 0.20) as total_ganancias,
                COUNT(*) as total_entregas,
                SUM(e.cantidad) as total_fichas_vendidas
            FROM entregas e
            JOIN tipos_fichas tf ON e.tipo_ficha_id = tf.id
            WHERE DATE(e.created_at) >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
        `)
    ]);

    const corteCaja = {
        totalGeneralVendido: ventasQuery[0]?.[0]?.total_vendido || 0,
        totalGeneralGanancias: ventasQuery[0]?.[0]?.total_ganancias || 0,
        totalEntregas: ventasQuery[0]?.[0]?.total_entregas || 0,
        totalFichasVendidas: ventasQuery[0]?.[0]?.total_fichas_vendidas || 0,
        fechaCorte: new Date().toISOString().split('T')[0]
    };

    console.log('✅ Datos detallados obtenidos exitosamente');

    res.json({
        success: true,
        data: {
            revendedores: Array.isArray(revendedores[0]) ? revendedores[0] : revendedores,
            entregas: Array.isArray(entregas[0]) ? entregas[0] : entregas,
            tiposFicha: Array.isArray(tiposFicha[0]) ? tiposFicha[0] : tiposFicha,
            tareasMantenimiento: Array.isArray(tareas[0]) ? tareas[0] : tareas,
            trabajadores: Array.isArray(trabajadores[0]) ? trabajadores[0] : trabajadores,
            corteCaja,
            reportesFichas: [], // Simulado
            timestamp: new Date().toISOString()
        }
    });

  } catch (error) {
    console.error('❌ Error al obtener estadísticas del dashboard:', error);
    res.status(500).json({
        success: false,
        error: 'Error interno del servidor',
        detail: 'Error al obtener las estadísticas del dashboard'
    });
  }
});

// GET /dashboard/metrics - Métricas resumidas para el dashboard
router.get('/metrics', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    console.log('📊 Obteniendo métricas resumidas...');

    // Métricas de revendedores - CORREGIDO para considerar activos por estado, no por inventario
    const revendedoresCountQuery = `
      SELECT
        COUNT(r.id) as total,
        COUNT(CASE WHEN r.activo = 1 THEN 1 END) as activos
      FROM revendedores r
      WHERE r.activo = 1;
    `;

    const [revendedoresCount, trabajadoresCount, entregasStats, tareasStats, ventasStats] = await Promise.all([
      query(revendedoresCountQuery),
      query(`
        SELECT
          COUNT(u.id) as total,
          COUNT(CASE WHEN u.activo = 1 THEN 1 END) as activos
        FROM usuarios u
        LEFT JOIN trabajadores_mantenimiento tm ON u.id = tm.id AND tm.activo = 1
        WHERE u.role = 'trabajador'
      `),
      query(`
        SELECT COUNT(*) as total_entregas, SUM(cantidad) as total_fichas_entregadas
        FROM entregas e JOIN revendedores r ON e.revendedor_id = r.id WHERE r.activo = 1
      `),
      query(`
        SELECT 
          COUNT(*) as total_tareas,
          COUNT(CASE WHEN estado = 'Pendiente' THEN 1 END) as pendientes,
          COUNT(CASE WHEN estado = 'Completado' THEN 1 END) as completadas,
          COUNT(CASE WHEN estado = 'Pendiente' AND (prioridad = 'Urgente' OR prioridad = 'Alta') THEN 1 END) as urgentes
        FROM tareas_mantenimiento
      `),
      query(`
        SELECT 
          COALESCE(SUM(e.cantidad * tf.precio_venta), 0) as ventas_totales,
          COALESCE(SUM(e.cantidad * tf.precio_venta * 0.20), 0) as ganancias_totales
        FROM entregas e
        JOIN tipos_fichas tf ON e.tipo_ficha_id = tf.id
        WHERE DATE(e.created_at) >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
      `)
    ]);

    const metrics = {
      revendedores: {
        total: revendedoresCount[0]?.[0]?.total || 0,
        activos: revendedoresCount[0]?.[0]?.activos || 0
      },
      trabajadores: {
        total: trabajadoresCount[0]?.[0]?.total || 0,
        activos: trabajadoresCount[0]?.[0]?.activos || 0
      },
      entregas: {
        total: entregasStats[0]?.[0]?.total_entregas || 0,
        fichasEntregadas: entregasStats[0]?.[0]?.total_fichas_entregadas || 0
      },
      tareas: {
        total: tareasStats[0]?.[0]?.total_tareas || 0,
        pendientes: tareasStats[0]?.[0]?.pendientes || 0,
        completadas: tareasStats[0]?.[0]?.completadas || 0,
        urgentes: tareasStats[0]?.[0]?.urgentes || 0
      },
      ventas: {
        ventasTotales: ventasStats[0]?.[0]?.ventas_totales || 0,
        gananciasTotales: ventasStats[0]?.[0]?.ganancias_totales || 0
      },
      timestamp: new Date().toISOString()
    };

    console.log('✅ Métricas obtenidas exitosamente');

    res.json({
      success: true,
      data: metrics
    });

  } catch (error) {
    console.error('❌ Error al obtener métricas:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      detail: 'Error al obtener las métricas'
    });
  }
});

export default router;
