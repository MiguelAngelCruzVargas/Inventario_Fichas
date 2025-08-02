import express from 'express';
import { query } from '../database.js';
import { authenticateToken } from '../auth.js';

const router = express.Router();

// Obtener historial de cortes de caja
router.get('/historial', async (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query;
    
    const cortes = await query(`
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
      ORDER BY fecha_corte DESC, created_at DESC
      LIMIT ? OFFSET ?
    `, [parseInt(limit), parseInt(offset)]);

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
                  stock_actual = fichas_entregadas - (fichas_vendidas + ?)
              WHERE revendedor_id = ? AND tipo_ficha_id = ?
            `, [fichas_vendidas_nuevas, fichas_vendidas_nuevas, revendedor_id, tipo_ficha_id]);
            
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

export default router;
