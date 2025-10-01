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
        revendedor_id,
        revendedor_nombre,
        total_ingresos,
        total_ganancias,
        total_revendedores,
        detalle_tipos,
        observaciones,
        monto_pagado_revendedor,
        saldo_revendedor,
        estado_cobro,
        created_at
      FROM cortes_caja 
      ${whereClause}
      ORDER BY fecha_corte DESC, created_at DESC
      LIMIT ? OFFSET ?
    `;
    
    console.log('🔍 Query SQL:', sqlQuery);
    console.log('🔍 Parámetros:', queryParams);
    
    let cortes;
    try {
      cortes = await query(sqlQuery, queryParams);
    } catch (e) {
      if (e?.code === 'ER_BAD_FIELD_ERROR' || /Unknown column/.test(e?.message || '')) {
        console.warn('⚠️ Columnas de abonos no existen aún; usando SELECT legado para historial');
        const legacy = `
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
        cortes = await query(legacy, queryParams);
      } else {
        throw e;
      }
    }
    
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
  observaciones = '',
  // Nuevos campos: permitir registrar abono inicial al crear el corte
  monto_pagado_revendedor: montoPagadoInicial = 0,
  abono_nota_inicial: notaAbonoInicial = null
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

    // Calcular estado de cobro en base a abono inicial y total_ganancias (lo que debe entregar el revendedor)
    const debeEntregar = parseFloat(total_ganancias) || 0;
    const pagadoInicial = Math.max(0, parseFloat(montoPagadoInicial) || 0);
    const saldoInicial = Math.max(0, Number((debeEntregar - pagadoInicial).toFixed(2)));
    const estadoCobro = pagadoInicial <= 0
      ? 'pendiente'
      : (saldoInicial > 0 ? 'parcial' : 'saldado');

    // 1. Guardar el corte de caja
    let result;
    try {
      // Intento con columnas nuevas (revendedor_id/nombre)
      result = await query(`
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
          observaciones,
          monto_pagado_revendedor,
          saldo_revendedor,
          estado_cobro
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
        observaciones,
        pagadoInicial,
        saldoInicial,
        estadoCobro
      ]);
    } catch (e) {
      // Compatibilidad: si la columna no existe aún, insertar con esquema antiguo
      if (e?.code === 'ER_BAD_FIELD_ERROR' || /Unknown column 'revendedor_id'|Unknown column 'monto_pagado_revendedor'|Unknown column 'saldo_revendedor'|Unknown column 'estado_cobro'/.test(e?.message || '')) {
        console.warn('⚠️ cortes_caja sin columnas de revendedor; guardando con esquema antiguo');
        result = await query(`
          INSERT INTO cortes_caja (
            fecha_corte,
            usuario_id,
            usuario_nombre,
            total_ingresos,
            total_ganancias,
            total_revendedores,
            detalle_tipos,
            observaciones
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          fecha_corte,
          usuario_id,
          usuario_nombre,
          parseFloat(total_ingresos) || 0,
          parseFloat(total_ganancias) || 0,
          parseFloat(total_revendedores) || 0,
          detalleJson,
          observaciones
        ]);
      } else {
        throw e;
      }
    }

    console.log('✅ Corte guardado con ID:', result.insertId);

    // 1.b Si hay abono inicial > 0, registrar en tabla de abonos (si existe)
    if (pagadoInicial > 0) {
      try {
        await query(`
          INSERT INTO cortes_caja_abonos (corte_id, revendedor_id, monto, usuario_id, nota)
          VALUES (?, ?, ?, ?, ?)
        `, [result.insertId, revendedor_id || null, pagadoInicial, usuario_id || null, notaAbonoInicial || null]);
      } catch (abonoErr) {
        if (abonoErr?.code === 'ER_NO_SUCH_TABLE' || /doesn't exist/.test(abonoErr?.message || '')) {
          console.warn('⚠️ Tabla cortes_caja_abonos no existe; se omitió el registro de abono inicial');
        } else {
          console.warn('⚠️ Error registrando abono inicial (continuando):', abonoErr);
        }
      }
    }

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

      // Obtener el corte recién creado (tolerante a esquemas antiguos)
      let nuevoCorte;
      try {
        nuevoCorte = await query(`
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
            revendedor_id,
            revendedor_nombre,
            monto_pagado_revendedor,
            saldo_revendedor,
            estado_cobro,
            created_at
          FROM cortes_caja 
          WHERE id = ?
        `, [result.insertId]);
      } catch (e) {
        if (e?.code === 'ER_BAD_FIELD_ERROR' || /Unknown column/.test(e?.message || '')) {
          // Esquema antiguo: seleccionar solo columnas disponibles
          nuevoCorte = await query(`
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
            WHERE id = ?
          `, [result.insertId]);
        } else {
          throw e;
        }
      }

      const cortePlano = nuevoCorte[0] || {};
      const corteConDetalle = {
        ...cortePlano,
        detalle_tipos: typeof cortePlano.detalle_tipos === 'string' 
          ? JSON.parse(cortePlano.detalle_tipos) 
          : (cortePlano.detalle_tipos || [])
      };

      res.status(201).json({
        success: true,
        message: 'Corte de caja guardado exitosamente',
        data: corteConDetalle
      });

      // Emitir evento SSE para que admin/trabajador y revendedor puedan refrescar en tiempo real
      try {
        const { default: bus } = await import('../events/bus.js');
        bus.emit('broadcast', { type: 'corte-creado', payload: {
          id: corteConDetalle.id,
          fecha_corte: corteConDetalle.fecha_corte,
          usuario_id: corteConDetalle.usuario_id,
          usuario_nombre: corteConDetalle.usuario_nombre,
          revendedor_id: corteConDetalle.revendedor_id || null,
          revendedor_nombre: corteConDetalle.revendedor_nombre || null,
          total_ingresos: corteConDetalle.total_ingresos,
          total_ganancias: corteConDetalle.total_ganancias,
          total_revendedores: corteConDetalle.total_revendedores,
          estado_cobro: corteConDetalle.estado_cobro,
          saldo_revendedor: corteConDetalle.saldo_revendedor,
          created_at: corteConDetalle.created_at
        }});
      } catch (emitErr) {
        console.warn('⚠️ No se pudo emitir evento corte-creado:', emitErr.message);
      }

  } catch (error) {
    console.error('❌ Error al guardar corte de caja:', error);
    res.status(500).json({
      success: false,
      message: 'Error al guardar el corte de caja',
      error: error.message
    });
  }
});

// Registrar un abono parcial para un corte de caja de revendedor
router.post('/:id/abonar', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { monto, nota } = req.body;
    const abono = Number(monto);
    if (!abono || abono <= 0) {
      return res.status(400).json({ success: false, message: 'Monto de abono inválido' });
    }

    // Obtener el corte
    const filas = await query('SELECT id, total_ganancias, monto_pagado_revendedor, saldo_revendedor FROM cortes_caja WHERE id = ? LIMIT 1', [id]);
    if (!filas || filas.length === 0) {
      return res.status(404).json({ success: false, message: 'Corte no encontrado' });
    }
    const corte = filas[0];
    const debe = Number(corte.total_ganancias) || 0;
    const pagadoActual = Number(corte.monto_pagado_revendedor || 0);
    const nuevoPagado = Math.min(debe, Number((pagadoActual + abono).toFixed(2)));
    const nuevoSaldo = Math.max(0, Number((debe - nuevoPagado).toFixed(2)));
    const nuevoEstado = nuevoPagado <= 0 ? 'pendiente' : (nuevoSaldo > 0 ? 'parcial' : 'saldado');

    // Actualizar corte
    try {
      await query('UPDATE cortes_caja SET monto_pagado_revendedor = ?, saldo_revendedor = ?, estado_cobro = ? WHERE id = ?', [nuevoPagado, nuevoSaldo, nuevoEstado, id]);
    } catch (e) {
      if (e?.code === 'ER_BAD_FIELD_ERROR') {
        return res.status(400).json({ success: false, message: 'La base de datos no tiene columnas de abonos para cortes. Aplique la migración.' });
      }
      throw e;
    }

    // Insertar detalle de abono si la tabla existe
    try {
      await query('INSERT INTO cortes_caja_abonos (corte_id, revendedor_id, monto, usuario_id, nota) VALUES (?, NULL, ?, ?, ?)', [id, abono, req.user?.id || null, nota || null]);
    } catch (e) {
      if (e?.code === 'ER_NO_SUCH_TABLE') {
        console.warn('Tabla cortes_caja_abonos no existe; no se guardó detalle (solo acumulado)');
      } else {
        console.warn('Error guardando detalle de abono (continuando):', e);
      }
    }

    res.json({ success: true, message: 'Abono registrado', monto_pagado_revendedor: nuevoPagado, saldo_revendedor: nuevoSaldo, estado_cobro: nuevoEstado });

    // Emitir evento SSE de abono para refrescar cortes
    try {
      const { default: bus } = await import('../events/bus.js');
      bus.emit('broadcast', { type: 'corte-abonado', payload: {
        corte_id: id,
        monto_pagado_revendedor: nuevoPagado,
        saldo_revendedor: nuevoSaldo,
        estado_cobro: nuevoEstado,
        updated_at: new Date().toISOString()
      }});
    } catch (emitErr) {
      console.warn('⚠️ No se pudo emitir evento corte-abonado:', emitErr.message);
    }
  } catch (error) {
    console.error('Error al registrar abono en corte:', error);
    res.status(500).json({ success: false, message: 'Error interno al registrar abono' });
  }
});

// Listar abonos de un corte
router.get('/:id/abonos', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    let items = [];
    try {
      items = await query(`
        SELECT a.id, a.corte_id, a.revendedor_id, a.monto, a.usuario_id, u.username AS usuario_nombre, a.nota, a.created_at
        FROM cortes_caja_abonos a
        LEFT JOIN usuarios u ON a.usuario_id = u.id
        WHERE a.corte_id = ?
        ORDER BY a.created_at ASC, a.id ASC
      `, [id]);
    } catch (e) {
      if (e?.code === 'ER_NO_SUCH_TABLE') {
        return res.json({ success: true, items: [] });
      }
      throw e;
    }
    res.json({ success: true, items });
  } catch (error) {
    console.error('Error al obtener abonos del corte:', error);
    res.status(500).json({ success: false, message: 'Error interno al obtener abonos' });
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

    // NUEVO: Intentar primero por revendedor_id directo (schema nuevo)
    let cortes = [];
    try {
      cortes = await query(`
        SELECT id, fecha_corte, usuario_id, usuario_nombre, revendedor_id, revendedor_nombre,
               total_ingresos, total_ganancias, total_revendedores, detalle_tipos, observaciones,
               monto_pagado_revendedor, saldo_revendedor, estado_cobro, created_at
        FROM cortes_caja
        WHERE revendedor_id = ?
        ORDER BY fecha_corte DESC, created_at DESC
        LIMIT 100
      `, [revendedorId]);
      console.log(`📋 (mis-cortes) Encontrados ${cortes.length} cortes por revendedor_id=${revendedorId}`);
    } catch (e) {
      console.warn('⚠️ Error consultando por revendedor_id, posible schema legado:', e.message);
    }

    // Fallback legacy: buscar por observaciones (nombre negocio / persona)
    if (cortes.length === 0) {
      console.log('ℹ️ Fallback a búsqueda por observaciones (schema legado sin revendedor_id)');
      const candidatos = await query(`
        SELECT id, fecha_corte, usuario_id, usuario_nombre,
               total_ingresos, total_ganancias, total_revendedores, detalle_tipos, observaciones, created_at
        FROM cortes_caja
        WHERE observaciones LIKE CONCAT('%', ?, '%')
           OR observaciones LIKE CONCAT('%', ?, '%')
        ORDER BY fecha_corte DESC, created_at DESC
        LIMIT 150
      `, [nombreNegocio || '', nombrePersona || '']);
      cortes = candidatos;
      console.log(`📋 (mis-cortes fallback) ${candidatos.length} cortes potenciales por nombre.`);
    }

    console.log(`📋 FINAL: ${cortes.length} cortes a procesar para revendedor ${nombreRevendedor}`);

    // Procesar cada corte para extraer solo los datos del revendedor actual
    const misCortes = cortes.map(corte => {
      // Parse detalle
      let detalle = [];
      try {
        detalle = typeof corte.detalle_tipos === 'string'
          ? JSON.parse(corte.detalle_tipos)
          : (corte.detalle_tipos || []);
      } catch (e) {
        console.warn('⚠️ Error parseando detalle_tipos corte', corte.id, e.message);
        detalle = [];
      }

      // Totales almacenados en el corte (históricos)
  const totalIngresos = Number(corte.total_ingresos) || 0;
  const totalAdminAlmacenado = Number(corte.total_ganancias) || 0; // Ganancia admin en el momento
  const totalRevAlmacenado = Number(corte.total_revendedores) || 0; // Ganancia revendedor en el momento

      // Derivar porcentajes históricos desde los totales si son consistentes
      let pctAdminHist = 0;
      let pctRevHist = 0;
      if (totalIngresos > 0 && (totalAdminAlmacenado > 0 || totalRevAlmacenado > 0)) {
        pctAdminHist = Math.min(100, Math.max(0, (totalAdminAlmacenado / totalIngresos) * 100));
        pctRevHist = Math.min(100, Math.max(0, (totalRevAlmacenado / totalIngresos) * 100));
        // Si por redondeo no suman 100, ajustar
        const suma = pctAdminHist + pctRevHist;
        if (suma > 0 && Math.abs(suma - 100) > 0.5) {
          // Re-normalizar proporcionalmente
            const factor = 100 / suma;
            pctAdminHist = +(pctAdminHist * factor).toFixed(2);
            pctRevHist = +(pctRevHist * factor).toFixed(2);
        }
      } else {
        // Fallback a configuración actual (menos ideal pero evita mostrar 100/0 erróneo)
        pctAdminHist = porcentajeAdmin;
        pctRevHist = porcentajeRevendedor;
      }

      // Calcular totales revendedor/admin usando almacenados para consistencia
      const totalComisionRevendedor = totalRevAlmacenado || (totalIngresos * (pctRevHist / 100));
      const totalGananciaAdmin = totalAdminAlmacenado || (totalIngresos * (pctAdminHist / 100));

      const detalleConComisiones = detalle.map(d => {
        const valor = Number(d.valorVendido ?? d.total_vendido) || 0;
        return {
          tipo_ficha: d.tipo || d.tipo_ficha || 'Sin tipo',
          entregadas: d.inventarioActual || d.entregadas || 0,
          restantes: d.inventarioResultante || d.restantes || 0,
          vendidas: d.vendidas || 0,
          total_vendido: valor,
          comision_revendedor: +(valor * (pctRevHist / 100)).toFixed(2),
          ganancia_admin: +(valor * (pctAdminHist / 100)).toFixed(2),
          porcentaje_revendedor: pctRevHist,
          porcentaje_admin: pctAdminHist
        };
      });

      // Campos de cobro (pueden no existir en esquema legado)
      let montoPagado = 0;
      let saldoRev = 0;
      let estadoCobro = 'pendiente';
      try {
        montoPagado = Number(corte.monto_pagado_revendedor || 0);
        saldoRev = Number(corte.saldo_revendedor || 0);
        if (Number.isNaN(saldoRev) || saldoRev <= 0) {
          // Fallback: si no hay columna, calcular con totalAdminAlmacenado
          const debe = totalAdminAlmacenado;
          saldoRev = Math.max(0, Number((debe - montoPagado).toFixed(2)));
        }
        estadoCobro = corte.estado_cobro || (montoPagado <= 0 ? 'pendiente' : (saldoRev > 0 ? 'parcial' : 'saldado'));
      } catch {}

      return {
        id: corte.id,
        fecha: corte.fecha_corte,
        total_vendido: totalIngresos,
        total_comision_revendedor: +totalComisionRevendedor.toFixed(2),
        total_ganancia_admin: +totalGananciaAdmin.toFixed(2),
        tipos_vendidos: detalleConComisiones,
        observaciones: corte.observaciones,
        created_at: corte.created_at,
        porcentaje_revendedor: pctRevHist,
        porcentaje_admin: pctAdminHist,
        // Nuevos: estado y abonos/saldos
        estado_cobro: estadoCobro,
        monto_pagado_revendedor: +Number(montoPagado || 0).toFixed(2),
        saldo_revendedor: +Number(saldoRev || 0).toFixed(2)
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
