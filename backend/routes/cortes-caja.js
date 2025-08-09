import express from 'express';
import { query } from '../database.js';
import { authenticateToken } from '../auth.js';

const router = express.Router();

// Obtener historial de cortes de caja
router.get('/historial', authenticateToken, async (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query;
    const { userId, userType } = req.user;
    
    console.log('🔍 Historial cortes - Usuario:', { userId, userType });
    
    let whereClause = '';
    let queryParams = [];
    
    // Si es revendedor, solo mostrar sus propios cortes
    if (userType === 'revendedor') {
      whereClause = 'WHERE usuario_id = ?';
      queryParams.push(userId);
      console.log('🔍 Filtrando cortes para revendedor con ID:', userId);
    } else {
      console.log('🔍 Mostrando todos los cortes (admin/trabajador)');
    }
    
    queryParams.push(parseInt(limit), parseInt(offset));
    
    const sqlQuery = `
      SELECT 
        id,
        fecha_corte,
        usuario_id,
        usuario_nombre,
        total_ingresos,
        total_ganancias,
        total_revendedores,
        detalle_tipos,
        observaciones,
        created_at
      FROM cortes_caja 
      ${whereClause}
      ORDER BY fecha_corte DESC, created_at DESC
      LIMIT ? OFFSET ?
    `;
    
    console.log('🔍 Query SQL:', sqlQuery);
    console.log('🔍 Parámetros:', queryParams);
    
    const cortes = await query(sqlQuery, queryParams);
    
    console.log('🔍 Cortes encontrados:', cortes.length);
    if (cortes.length > 0) {
      console.log('🔍 Primer corte:', cortes[0]);
    }

    // Parsear el detalle_tipos de JSON string a objeto
    const cortesConDetalle = cortes.map(corte => ({
      ...corte,
      detalle_tipos: typeof corte.detalle_tipos === 'string' 
        ? JSON.parse(corte.detalle_tipos) 
        : corte.detalle_tipos
    }));

    res.json({
      success: true,
      data: cortesConDetalle
    });
  } catch (error) {
    console.error('Error al obtener historial de cortes:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener el historial de cortes de caja',
      error: error.message
    });
  }
});

// Guardar un nuevo corte de caja
router.post('/', async (req, res) => {
  try {
    const {
      fecha_corte,
      usuario_id,
      usuario_nombre,
      revendedor_id,
      revendedor_nombre,
      total_ingresos,
      total_ganancias,
      total_revendedores,
      detalle_tipos,
      actualizaciones_inventario = [],
      observaciones = ''
    } = req.body;

    console.log('📝 Datos recibidos para corte de caja:', {
      fecha_corte,
      usuario_id,
      usuario_nombre,
      revendedor_id,
      total_ingresos,
      total_ganancias,
      total_revendedores,
      actualizaciones_inventario: actualizaciones_inventario?.length || 0,
      detalle_tipos_count: detalle_tipos?.length || 0
    });

    // Validaciones
    if (!fecha_corte || !usuario_id || !usuario_nombre) {
      return res.status(400).json({
        success: false,
        message: 'Faltan campos requeridos: fecha_corte, usuario_id, usuario_nombre'
      });
    }

    if (total_ingresos < 0 || total_ganancias < 0 || total_revendedores < 0) {
      return res.status(400).json({
        success: false,
        message: 'Los totales no pueden ser negativos'
      });
    }

    // Convertir detalle_tipos a JSON string si es necesario
    const detalleJson = typeof detalle_tipos === 'object' 
      ? JSON.stringify(detalle_tipos) 
      : detalle_tipos;

    console.log('🚀 Guardando corte de caja...');

    // 1. Guardar el corte de caja
    const result = await query(`
      INSERT INTO cortes_caja (
        fecha_corte,
        usuario_id,
        usuario_nombre,
        revendedor_id,
        revendedor_nombre,
        total_ingresos,
        total_ganancias,
        total_revendedores,
        detalle_tipos,
        observaciones
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      fecha_corte,
      usuario_id,
      usuario_nombre,
      revendedor_id || null,
      (revendedor_nombre || null),
      parseFloat(total_ingresos) || 0,
      parseFloat(total_ganancias) || 0,
      parseFloat(total_revendedores) || 0,
      detalleJson,
      observaciones
    ]);

    console.log('✅ Corte guardado con ID:', result.insertId);

    // 2. Actualizar inventarios si se proporcionaron actualizaciones
    if (revendedor_id && actualizaciones_inventario && actualizaciones_inventario.length > 0) {
      console.log('🔄 Actualizando inventarios para revendedor:', revendedor_id);
      
      for (const actualizacion of actualizaciones_inventario) {
        const { tipo_ficha_id, fichas_vendidas_nuevas } = actualizacion;
        
        if (tipo_ficha_id && fichas_vendidas_nuevas > 0) {
          console.log(`🔄 Actualizando tipo ${tipo_ficha_id}: +${fichas_vendidas_nuevas} vendidas`);
          
          try {
            // Actualizar el inventario: sumar las fichas vendidas al total de fichas vendidas
            const updateResult = await query(`
              UPDATE inventarios 
              SET fichas_vendidas = fichas_vendidas + ?,
                  stock_actual = fichas_entregadas - fichas_vendidas
              WHERE revendedor_id = ? AND tipo_ficha_id = ?
            `, [fichas_vendidas_nuevas, revendedor_id, tipo_ficha_id]);
            
            console.log(`✅ Inventario actualizado - Filas afectadas: ${updateResult.affectedRows}`);
            
            // Si no existe el registro de inventario, crearlo
            if (updateResult.affectedRows === 0) {
              console.log('⚠️ No existe registro de inventario, creando nuevo...');
              await query(`
                INSERT INTO inventarios (revendedor_id, tipo_ficha_id, fichas_entregadas, fichas_vendidas, stock_actual)
                VALUES (?, ?, 0, ?, ?)
              `, [revendedor_id, tipo_ficha_id, fichas_vendidas_nuevas, -fichas_vendidas_nuevas]);
              
              console.log(`✅ Nuevo registro de inventario creado para tipo ${tipo_ficha_id}`);
            }
          } catch (inventarioError) {
            console.error(`❌ Error al actualizar inventario para tipo ${tipo_ficha_id}:`, inventarioError);
            // Continuamos con los otros tipos aunque uno falle
          }
        }
      }
    }

      // Obtener el corte recién creado
      const nuevoCorte = await query(`
        SELECT 
          id,
          fecha_corte,
          usuario_id,
          usuario_nombre,
          revendedor_id,
          revendedor_nombre,
          total_ingresos,
          total_ganancias,
          total_revendedores,
          detalle_tipos,
          observaciones,
          created_at
        FROM cortes_caja 
        WHERE id = ?
      `, [result.insertId]);

      const corteConDetalle = {
        ...nuevoCorte[0],
        detalle_tipos: typeof nuevoCorte[0].detalle_tipos === 'string' 
          ? JSON.parse(nuevoCorte[0].detalle_tipos) 
          : nuevoCorte[0].detalle_tipos
      };

      res.status(201).json({
        success: true,
        message: 'Corte de caja guardado exitosamente',
        data: corteConDetalle
      });

  } catch (error) {
    console.error('❌ Error al guardar corte de caja:', error);
    res.status(500).json({
      success: false,
      message: 'Error al guardar el corte de caja',
      error: error.message
    });
  }
});

// Obtener MIS cortes de caja (específico para revendedores)
router.get('/mis-cortes', authenticateToken, async (req, res) => {
  try {
    const usuarioId = req.user.id; // ID del usuario revendedor desde el token
    console.log(`🔍 Obteniendo cortes para revendedor con usuario ID: ${usuarioId}`);

    // Primero obtenemos el revendedor_id basado en el usuario_id
    const revendedor = await query(`
      SELECT id, nombre, nombre_negocio, porcentaje_comision FROM revendedores WHERE usuario_id = ? AND activo = 1
    `, [usuarioId]);

    if (revendedor.length === 0) {
      console.log(`❌ No se encontró revendedor para usuario_id: ${usuarioId}`);
      return res.status(404).json({ 
        success: false, 
        error: 'No se encontró información del revendedor' 
      });
    }

    const revendedorId = revendedor[0].id;
    const nombreRevendedor = revendedor[0].nombre_negocio || revendedor[0].nombre;
    const nombrePersona = revendedor[0].nombre;
    const nombreNegocio = revendedor[0].nombre_negocio;
    
    // OBTENER EL PORCENTAJE REAL DE COMISIÓN
    let porcentajeAdmin = 20; // Valor por defecto
    let porcentajeRevendedor = 80; // Valor por defecto
    
    try {
      // Intentar obtener desde el revendedor específico primero
      if (revendedor[0].porcentaje_comision && !isNaN(parseFloat(revendedor[0].porcentaje_comision))) {
        porcentajeAdmin = parseFloat(revendedor[0].porcentaje_comision);
        porcentajeRevendedor = 100 - porcentajeAdmin;
        console.log(`✅ Usando comisión específica del revendedor: Admin=${porcentajeAdmin}%, Revendedor=${porcentajeRevendedor}%`);
      } else {
        // Si no tiene comisión específica, obtener de la configuración global
        const configResult = await query(`
          SELECT valor FROM configuraciones WHERE clave = 'porcentaje_ganancia_creador'
        `);
        
        if (configResult.length > 0 && !isNaN(parseFloat(configResult[0].valor))) {
          porcentajeAdmin = parseFloat(configResult[0].valor);
          porcentajeRevendedor = 100 - porcentajeAdmin;
          console.log(`✅ Usando comisión global: Admin=${porcentajeAdmin}%, Revendedor=${porcentajeRevendedor}%`);
        } else {
          console.log(`⚠️ No se encontró configuración, usando valores por defecto: Admin=${porcentajeAdmin}%, Revendedor=${porcentajeRevendedor}%`);
        }
      }
    } catch (configError) {
      console.warn('⚠️ Error obteniendo configuración de comisiones, usando valores por defecto:', configError);
    }
    
    // Convertir porcentajes a decimales para cálculos
    const factorAdmin = porcentajeAdmin / 100;
    const factorRevendedor = porcentajeRevendedor / 100;
    
    console.log(`✅ Revendedor encontrado: ${nombreRevendedor} (ID: ${revendedorId})`);
    console.log(`🔍 Nombres a buscar: persona="${nombrePersona}", negocio="${nombreNegocio}"`);
    console.log(`💰 Comisiones: Admin=${porcentajeAdmin}% (${factorAdmin}), Revendedor=${porcentajeRevendedor}% (${factorRevendedor})`);

    // MEJORAR LA BÚSQUEDA: Buscar cortes de múltiples formas
    let cortes = [];
    
    // Opción 1: Buscar por observaciones que contengan el nombre del negocio
    if (nombreNegocio) {
      const cortesPorNegocio = await query(`
        SELECT 
          id, fecha_corte, usuario_id, usuario_nombre, total_ingresos,
          total_ganancias, total_revendedores, detalle_tipos, observaciones, created_at
        FROM cortes_caja 
        WHERE observaciones LIKE CONCAT('%', ?, '%')
        ORDER BY fecha_corte DESC, created_at DESC
      `, [nombreNegocio]);
      cortes = cortes.concat(cortesPorNegocio);
      console.log(`📋 Encontrados ${cortesPorNegocio.length} cortes por nombre de negocio: "${nombreNegocio}"`);
    }
    
    // Opción 2: Si no hay resultados, buscar por nombre personal
    if (cortes.length === 0 && nombrePersona) {
      const cortesPorNombre = await query(`
        SELECT 
          id, fecha_corte, usuario_id, usuario_nombre, total_ingresos,
          total_ganancias, total_revendedores, detalle_tipos, observaciones, created_at
        FROM cortes_caja 
        WHERE observaciones LIKE CONCAT('%', ?, '%')
        ORDER BY fecha_corte DESC, created_at DESC
      `, [nombrePersona]);
      cortes = cortes.concat(cortesPorNombre);
      console.log(`📋 Encontrados ${cortesPorNombre.length} cortes por nombre personal: "${nombrePersona}"`);
    }
    
    // Opción 3: Si aún no hay resultados, obtener TODOS los cortes y filtrar después
    if (cortes.length === 0) {
      console.log('⚠️ No se encontraron cortes por nombres, obteniendo todos los cortes para debug...');
      const todosLosCortes = await query(`
        SELECT 
          id, fecha_corte, usuario_id, usuario_nombre, total_ingresos,
          total_ganancias, total_revendedores, detalle_tipos, observaciones, created_at
        FROM cortes_caja 
        ORDER BY fecha_corte DESC, created_at DESC
        LIMIT 10
      `);
      console.log(`📋 Total de cortes en BD: ${todosLosCortes.length}`);
      if (todosLosCortes.length > 0) {
        console.log('📋 Ejemplos de observaciones en BD:');
        todosLosCortes.forEach((corte, i) => {
          if (i < 3) { // Solo mostrar los primeros 3
            console.log(`  - Corte ${corte.id}: "${corte.observaciones}"`);
          }
        });
      }
      cortes = todosLosCortes; // Para debugging, devolver todos
    }

    console.log(`📋 FINAL: ${cortes.length} cortes encontrados para el revendedor ${nombreRevendedor}`);
    
    // Debug: mostrar el contenido de algunos cortes para verificar la estructura
    if (cortes.length > 0) {
      console.log('🔍 Ejemplo de detalle_tipos del primer corte:');
      console.log(cortes[0].detalle_tipos);
    }

    // Procesar cada corte para extraer solo los datos del revendedor actual
    const misCortes = cortes.map(corte => {
      let detalleCompleto = [];
      try {
        detalleCompleto = typeof corte.detalle_tipos === 'string' 
          ? JSON.parse(corte.detalle_tipos) 
          : corte.detalle_tipos || [];
      } catch (error) {
        console.warn('Error parsing detalle_tipos:', error);
        detalleCompleto = [];
      }

      // Ya que los cortes contienen todos los datos mezclados, 
      // simplemente devolver todo el detalle como si fuera del revendedor
      const miDetalle = detalleCompleto; // Todos los datos son del revendedor si el corte es suyo

      console.log(`📊 Corte ${corte.id}: ${miDetalle.length} detalles encontrados para ${nombrePersona}/${nombreNegocio}`);

      // Calcular totales usando los campos correctos del JSON
      const totalVendido = miDetalle.reduce((sum, detalle) => sum + (detalle.valorVendido || 0), 0);
      
      // USAR LOS PORCENTAJES REALES OBTENIDOS DE LA CONFIGURACIÓN
      const totalComisionRevendedor = totalVendido * factorRevendedor;
      const totalGananciaAdmin = totalVendido * factorAdmin;
      
      // Procesar cada detalle para añadir información de comisión
      const detalleConComisiones = miDetalle.map(detalle => ({
        tipo_ficha: detalle.tipo || 'Sin tipo',
        entregadas: detalle.inventarioActual || 0,
        restantes: detalle.inventarioResultante || 0, 
        vendidas: detalle.vendidas || 0,
        total_vendido: detalle.valorVendido || 0,
        comision_revendedor: (detalle.valorVendido || 0) * factorRevendedor,
        ganancia_admin: (detalle.valorVendido || 0) * factorAdmin,
        porcentaje_revendedor: porcentajeRevendedor, // Incluir el porcentaje para el frontend
        porcentaje_admin: porcentajeAdmin
      }));

      return {
        id: corte.id,
        fecha: corte.fecha_corte,
        total_vendido: totalVendido,
        total_comision_revendedor: totalComisionRevendedor,
        total_ganancia_admin: totalGananciaAdmin,
        tipos_vendidos: detalleConComisiones,
        observaciones: corte.observaciones,
        created_at: corte.created_at,
        // Incluir información de porcentajes para el frontend
        porcentaje_revendedor: porcentajeRevendedor,
        porcentaje_admin: porcentajeAdmin
      };
    });

    res.json({ 
      success: true, 
      data: misCortes,
      // Incluir información de configuración para el frontend
      configuracion: {
        porcentaje_revendedor: porcentajeRevendedor,
        porcentaje_admin: porcentajeAdmin,
        origen_configuracion: revendedor[0].porcentaje_comision ? 'revendedor_especifico' : 'configuracion_global'
      }
    });

  } catch (error) {
    console.error('❌ ERROR al obtener mis cortes:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error interno del servidor al obtener cortes' 
    });
  }
});

export default router;
