// Archivo: routes/tareas.js
import express from 'express';
import { query } from '../database.js'; // Asegúrate de que la ruta sea correcta
import { authenticateToken, requireRole } from '../auth.js'; // Asegúrate de que la ruta sea correcta

const router = express.Router();

// ==================================================
// RUTAS DE TRABAJADORES (DENTRO DEL CONTEXTO DE TAREAS)
// ==================================================

// OBTENER TODOS LOS TRABAJADORES (ACTIVOS E INACTIVOS)
// Utilizado para poblar los selectores en el frontend al crear una tarea.
// Los inactivos se muestran pero no están disponibles para asignación
router.get('/trabajadores', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    console.log('🔍 Consultando trabajadores en tabla trabajadores_mantenimiento...');
    
    // Obtenemos TODOS los trabajadores para mostrar historial completo
    const trabajadores = await query(`
      SELECT 
        t.id, 
        t.nombre_completo, 
        t.especialidad, 
        t.activo, 
        t.created_at,
        u.username,
        u.activo as usuario_activo,
        -- Estado combinado: trabajador Y usuario deben estar activos
        CASE 
          WHEN t.activo = 1 AND u.activo = 1 THEN 1 
          ELSE 0 
        END as disponible_para_asignacion
      FROM trabajadores_mantenimiento t
      LEFT JOIN usuarios u ON t.usuario_id = u.id
      ORDER BY 
        (t.activo = 1 AND u.activo = 1) DESC, 
        t.nombre_completo ASC
    `);

    // Separar trabajadores por disponibilidad real (ambos activos)
    const trabajadoresDisponibles = trabajadores.filter(t => t.disponible_para_asignacion === 1);
    const trabajadoresNoDisponibles = trabajadores.filter(t => t.disponible_para_asignacion === 0);

    console.log(`✅ Trabajadores encontrados: ${trabajadoresDisponibles.length} disponibles, ${trabajadoresNoDisponibles.length} no disponibles`);
    
    // MANTENER COMPATIBILIDAD CON FRONTEND:
    // El frontend espera: { success: true, trabajadores: [...] }
    // Pero también enviamos información adicional
    res.json({ 
      success: true, 
      trabajadores: trabajadores, // Array completo para compatibilidad
      // Información adicional para componentes avanzados
      _metadata: {
        total: trabajadores.length,
        disponiblesCount: trabajadoresDisponibles.length,
        noDisponiblesCount: trabajadoresNoDisponibles.length
      },
      disponibles: trabajadoresDisponibles,
      noDisponibles: trabajadoresNoDisponibles
    });

  } catch (error) {
    console.error('❌ ERROR al obtener trabajadores:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor al obtener trabajadores'
    });
  }
});

// OBTENER TRABAJADORES DISPONIBLES PARA ASIGNACIÓN (SOLO ACTIVOS)
// Esta ruta específica para selectores donde solo queremos trabajadores activos
router.get('/trabajadores/disponibles', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    console.log('🔍 Consultando trabajadores disponibles para asignación...');
    
    const trabajadoresDisponibles = await query(`
      SELECT 
        t.id, 
        t.nombre_completo, 
        t.especialidad, 
        t.activo, 
        t.created_at,
        u.username,
        u.activo as usuario_activo
      FROM trabajadores_mantenimiento t
      INNER JOIN usuarios u ON t.usuario_id = u.id
      WHERE t.activo = 1 AND u.activo = 1
      ORDER BY t.nombre_completo ASC
    `);

    console.log(`✅ ${trabajadoresDisponibles.length} trabajadores disponibles para asignación`);
    console.log('📋 Lista de trabajadores disponibles:');
    trabajadoresDisponibles.forEach(t => {
      console.log(`  - ID: ${t.id}, Nombre: ${t.nombre_completo}, Usuario: ${t.username}, Activo: T=${t.activo}/U=${t.usuario_activo}`);
    });
    
    res.json({ success: true, trabajadores: trabajadoresDisponibles });

  } catch (error) {
    console.error('❌ ERROR al obtener trabajadores disponibles:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor al obtener trabajadores disponibles'
    });
  }
});

// ==================================================
// RUTAS PRINCIPALES DE TAREAS
// ==================================================

// OBTENER TODAS LAS TAREAS
router.get('/', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const tareas = await query(`
      SELECT 
        t.id, t.revendedor_id, t.trabajador_id, t.titulo, t.descripcion,
        t.prioridad, t.estado, t.fecha_asignacion, t.fecha_vencimiento,
        t.fecha_completado, t.notas, t.created_at,
        r.nombre as nombre_revendedor,
        r.activo as revendedor_activo,
        tm.nombre_completo as nombre_trabajador,
        tm.activo as trabajador_activo,
        u_trabajador.activo as usuario_trabajador_activo,
        u_revendedor.activo as usuario_revendedor_activo
      FROM tareas_mantenimiento t
      LEFT JOIN revendedores r ON t.revendedor_id = r.id
      LEFT JOIN usuarios u_revendedor ON r.usuario_id = u_revendedor.id
      LEFT JOIN usuarios u_trabajador ON t.trabajador_id = u_trabajador.id
      LEFT JOIN trabajadores_mantenimiento tm ON u_trabajador.id = tm.usuario_id
      ORDER BY 
        CASE t.estado WHEN 'Pendiente' THEN 1 ELSE 2 END,
        CASE t.prioridad WHEN 'Urgente' THEN 1 WHEN 'Alta' THEN 2 WHEN 'Media' THEN 3 ELSE 4 END,
        t.fecha_vencimiento ASC
    `);
    res.json({ success: true, tareas });
  } catch (error) {
    console.error('❌ ERROR al obtener tareas:', error);
    res.status(500).json({ success: false, error: 'Error interno del servidor al obtener tareas' });
  }
});

// CREAR NUEVA TAREA
router.post('/', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { revendedor_id, trabajador_id, titulo, descripcion, prioridad = 'Media', fecha_vencimiento } = req.body;

    console.log('📝 Datos recibidos para crear tarea:', { revendedor_id, trabajador_id, titulo, descripcion, prioridad, fecha_vencimiento });

    if (!revendedor_id || !trabajador_id || !titulo || !descripcion || !fecha_vencimiento) {
      return res.status(400).json({ success: false, error: 'Todos los campos son requeridos' });
    }

    // Validar que el revendedor existe
    const revendedorExiste = await query(`
      SELECT r.id 
      FROM revendedores r 
      INNER JOIN usuarios u ON r.usuario_id = u.id 
      WHERE r.id = ? AND u.activo = 1
    `, [revendedor_id]);

    if (revendedorExiste.length === 0) {
      console.log('❌ Revendedor no encontrado o inactivo:', revendedor_id);
      return res.status(400).json({ success: false, error: 'El revendedor seleccionado no existe o está inactivo' });
    }

    // Validar que el trabajador existe y está activo (tanto en trabajadores_mantenimiento como en usuarios)
    const trabajadorExiste = await query(`
      SELECT t.id, t.usuario_id, t.nombre_completo, u.username
      FROM trabajadores_mantenimiento t
      INNER JOIN usuarios u ON t.usuario_id = u.id
      WHERE t.id = ? AND t.activo = 1 AND u.activo = 1
    `, [trabajador_id]);

    if (trabajadorExiste.length === 0) {
      console.log('❌ Trabajador no encontrado o inactivo (verificando tabla trabajadores_mantenimiento Y usuarios):', trabajador_id);
      return res.status(400).json({ success: false, error: 'El trabajador seleccionado no existe o está inactivo' });
    }

    const usuarioIdTrabajador = trabajadorExiste[0].usuario_id;
    console.log('✅ Trabajador validado:', trabajadorExiste[0]);
    console.log('📋 Usuario ID del trabajador:', usuarioIdTrabajador);

    console.log('✅ Validaciones pasadas - Creando tarea...');

    const result = await query(`
      INSERT INTO tareas_mantenimiento 
      (revendedor_id, trabajador_id, titulo, descripcion, prioridad, fecha_asignacion, fecha_vencimiento, created_by) 
      VALUES (?, ?, ?, ?, ?, CURDATE(), ?, ?)
    `, [revendedor_id, usuarioIdTrabajador, titulo, descripcion, prioridad, fecha_vencimiento, req.user?.id || 1]);

    console.log('✅ Tarea creada exitosamente con ID:', result.insertId);
    res.status(201).json({ success: true, message: 'Tarea creada exitosamente', tarea_id: result.insertId });
  } catch (error) {
    console.error('❌ ERROR al crear tarea:', error);
    res.status(500).json({ success: false, error: 'Error interno del servidor al crear la tarea.' });
  }
});

// ACTUALIZAR ESTADO DE TAREA
router.put('/:id/estado', authenticateToken, requireRole(['admin', 'trabajador']), async (req, res) => {
  try {
    const { id } = req.params;
    const { estado, notas = '' } = req.body;

    if (!estado || !['Pendiente', 'Completado'].includes(estado)) {
      return res.status(400).json({ success: false, error: 'Estado inválido' });
    }

    const fechaCompletado = estado === 'Completado' ? new Date() : null;

    await query(
      'UPDATE tareas_mantenimiento SET estado = ?, notas = ?, fecha_completado = ? WHERE id = ?',
      [estado, notas, fechaCompletado, id]
    );

    res.json({ success: true, message: 'Estado de tarea actualizado exitosamente' });
  } catch (error) {
    console.error('Error al actualizar estado de tarea:', error);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
});

// ELIMINAR TAREA
router.delete('/:id', authenticateToken, requireRole(['admin']), async (req, res) => {
  const { id } = req.params;
  
  console.log(`🗑️ DELETE /api/tareas/${id} - Iniciando eliminación de tarea`);

  try {
      const resultado = await query(`DELETE FROM tareas_mantenimiento WHERE id = ?`, [id]);
      
      if (resultado.affectedRows === 0) {
          return res.status(404).json({ success: false, message: 'Tarea no encontrada.' });
      }
      
      console.log(`✅ Tarea eliminada con ID: ${id}`);
      res.json({ success: true, message: 'Tarea eliminada exitosamente' });

  } catch (error) {
      console.error('❌ ERROR al eliminar tarea:', error);
      res.status(500).json({ success: false, message: 'Error interno del servidor al eliminar la tarea.' });
  }
});

// REASIGNAR TAREA
router.put('/:id/reasignar', authenticateToken, requireRole(['admin']), async (req, res) => {
  const { id } = req.params;
  const { nuevo_trabajador_id } = req.body;
  
  console.log(`🔄 PUT /api/tareas/${id}/reasignar - Reasignando tarea al trabajador ${nuevo_trabajador_id}`);

  try {
      // Verificar que el nuevo trabajador existe y está activo (tanto en trabajadores_mantenimiento como en usuarios)
      const trabajadorValido = await query(`
          SELECT t.id, t.usuario_id, t.nombre_completo, u.username
          FROM trabajadores_mantenimiento t
          INNER JOIN usuarios u ON t.usuario_id = u.id
          WHERE t.id = ? AND t.activo = 1 AND u.activo = 1
      `, [nuevo_trabajador_id]);

      if (trabajadorValido.length === 0) {
          return res.status(400).json({ 
              success: false, 
              message: 'El trabajador seleccionado no existe o está inactivo.' 
          });
      }

      const nuevoUsuarioIdTrabajador = trabajadorValido[0].usuario_id;
      console.log('✅ Nuevo trabajador validado:', trabajadorValido[0]);
      console.log('📋 Nuevo usuario ID del trabajador:', nuevoUsuarioIdTrabajador);

      // Verificar que la tarea existe
      const tareaExiste = await query(`
          SELECT id, titulo 
          FROM tareas_mantenimiento 
          WHERE id = ?
      `, [id]);

      if (tareaExiste.length === 0) {
          return res.status(404).json({ 
              success: false, 
              message: 'Tarea no encontrada.' 
          });
      }

      // Reasignar la tarea
      const resultado = await query(`
          UPDATE tareas_mantenimiento 
          SET trabajador_id = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
      `, [nuevoUsuarioIdTrabajador, id]);
      
      if (resultado.affectedRows === 0) {
          return res.status(404).json({ success: false, message: 'No se pudo reasignar la tarea.' });
      }
      
      console.log(`✅ Tarea ${id} reasignada al trabajador ${trabajadorValido[0].nombre_completo}`);
      
      res.json({ 
          success: true, 
          message: `Tarea "${tareaExiste[0].titulo}" reasignada exitosamente a ${trabajadorValido[0].nombre_completo}` 
      });

  } catch (error) {
      console.error('❌ ERROR al reasignar tarea:', error);
      res.status(500).json({ success: false, message: 'Error interno del servidor al reasignar la tarea.' });
  }
});

// OBTENER MIS TAREAS (PARA TRABAJADORES)
router.get('/mis-tareas', authenticateToken, requireRole(['trabajador']), async (req, res) => {
  try {
    const usuarioId = req.user.id; // ID del usuario trabajador desde el token
    console.log(`🔍 Obteniendo tareas para trabajador con usuario ID: ${usuarioId}`);

    // Verificar que el usuario es un trabajador activo
    const trabajador = await query(`
      SELECT id, nombre_completo, especialidad FROM trabajadores_mantenimiento 
      WHERE usuario_id = ? AND activo = 1
    `, [usuarioId]);

    if (trabajador.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'No se encontró información del trabajador o está inactivo' 
      });
    }

    console.log(`✅ Trabajador validado: ${trabajador[0].nombre_completo}`);

    const tareas = await query(`
      SELECT 
        t.*,
        r.nombre_negocio as nombre_revendedor,
        r.responsable as responsable_revendedor,
        r.telefono as telefono_revendedor,
        tm.nombre_completo as nombre_trabajador,
        tm.especialidad as especialidad_trabajador,
        u.nombre_completo as creado_por_nombre
      FROM tareas_mantenimiento t
      LEFT JOIN revendedores r ON t.revendedor_id = r.id
      LEFT JOIN usuarios u_trabajador ON t.trabajador_id = u_trabajador.id
      LEFT JOIN trabajadores_mantenimiento tm ON u_trabajador.id = tm.usuario_id
      LEFT JOIN usuarios u ON t.created_by = u.id
      WHERE t.trabajador_id = ?
      ORDER BY 
        CASE t.estado 
          WHEN 'Pendiente' THEN 1
          WHEN 'En Progreso' THEN 2
          ELSE 3
        END,
        t.fecha_vencimiento ASC
    `, [usuarioId]); // Ahora usamos directamente usuarioId

    console.log(`📋 ${tareas.length} tareas encontradas para el trabajador`);
    res.json({ success: true, tareas });

  } catch (error) {
    console.error('❌ ERROR al obtener mis tareas:', error);
    res.status(500).json({ success: false, error: 'Error interno del servidor al obtener tareas' });
  }
});

// ACTUALIZAR ESTADO DE MI TAREA (PARA TRABAJADORES)
router.put('/mis-tareas/:id/estado', authenticateToken, requireRole(['trabajador']), async (req, res) => {
  try {
    const { id } = req.params;
    const { estado, notas = '' } = req.body;
    const usuarioId = req.user.id;

    // Validar que la tarea pertenece al trabajador
    const tarea = await query(`
      SELECT * FROM tareas_mantenimiento 
      WHERE id = ? AND trabajador_id = ?
    `, [id, usuarioId]);

    if (tarea.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Tarea no encontrada o no tienes permisos para modificarla' 
      });
    }

    if (!['Pendiente', 'En Progreso', 'Completado'].includes(estado)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Estado inválido' 
      });
    }

    const fechaCompletado = estado === 'Completado' ? new Date() : null;

    await query(`
      UPDATE tareas_mantenimiento 
      SET estado = ?, notas = ?, fecha_completado = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [estado, notas, fechaCompletado, id]);

    res.json({ success: true, message: 'Estado de tarea actualizado exitosamente' });

  } catch (error) {
    console.error('❌ ERROR al actualizar estado de mi tarea:', error);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
});

// OBTENER MIS TAREAS COMO REVENDEDOR
router.get('/mis-tareas-revendedor', authenticateToken, requireRole(['revendedor']), async (req, res) => {
  try {
    const usuarioId = req.user.id; // ID del usuario revendedor desde el token
    console.log(`🔍 Obteniendo tareas para revendedor con usuario ID: ${usuarioId}`);

    // Primero obtenemos el revendedor_id basado en el usuario_id
    const revendedor = await query(`
      SELECT id FROM revendedores WHERE usuario_id = ? AND activo = 1
    `, [usuarioId]);

    if (revendedor.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'No se encontró información del revendedor' 
      });
    }

    const revendedorId = revendedor[0].id;
    console.log(`🔍 Revendedor ID encontrado: ${revendedorId}`);

    const tareas = await query(`
      SELECT 
        t.*,
        r.nombre_negocio as nombre_revendedor,
        r.responsable as responsable_revendedor,
        r.telefono as telefono_revendedor,
        tm.nombre_completo as nombre_trabajador,
        tm.especialidad as especialidad_trabajador,
        u.nombre_completo as creado_por_nombre
      FROM tareas_mantenimiento t
      LEFT JOIN revendedores r ON t.revendedor_id = r.id
      LEFT JOIN trabajadores_mantenimiento tm ON t.trabajador_id = tm.id
      LEFT JOIN usuarios u ON t.created_by = u.id
      WHERE t.revendedor_id = ?
      ORDER BY 
        CASE t.estado 
          WHEN 'Pendiente' THEN 1
          WHEN 'En Progreso' THEN 2  
          WHEN 'Completado' THEN 3
          ELSE 4
        END,
        CASE t.prioridad
          WHEN 'Urgente' THEN 1
          WHEN 'Alta' THEN 2
          WHEN 'Media' THEN 3
          WHEN 'Baja' THEN 4
          ELSE 5
        END,
        t.fecha_vencimiento ASC,
        t.created_at DESC
    `, [revendedorId]);

    console.log(`✅ Encontradas ${tareas.length} tareas para el revendedor`);
    
    res.json({ 
      success: true, 
      tareas 
    });

  } catch (error) {
    console.error('❌ ERROR al obtener mis tareas como revendedor:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error interno del servidor al obtener las tareas' 
    });
  }
});

// ACTUALIZAR ESTADO DE MI TAREA (PARA TRABAJADORES)
router.put('/mis-tareas/:id/estado', authenticateToken, requireRole(['trabajador']), async (req, res) => {
  try {
    const { id } = req.params;
    const { estado, notas } = req.body;
    const usuarioId = req.user.id;

    console.log(`🔄 Actualizando estado de tarea ${id} a "${estado}" por usuario ${usuarioId}`);

    // Primero obtenemos el trabajador_id basado en el usuario_id
    const trabajador = await query(`
      SELECT id FROM trabajadores_mantenimiento WHERE usuario_id = ? AND activo = 1
    `, [usuarioId]);

    if (trabajador.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'No se encontró información del trabajador' 
      });
    }

    const trabajadorId = trabajador[0].id;

    // Verificar que la tarea pertenece al trabajador
    const tareaExiste = await query(`
      SELECT * FROM tareas_mantenimiento 
      WHERE id = ? AND trabajador_id = ?
    `, [id, trabajadorId]);

    if (tareaExiste.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Tarea no encontrada o no tienes permisos para modificarla' 
      });
    }

    // Actualizar la tarea
    const updateFields = ['estado = ?'];
    const updateValues = [estado];

    if (notas) {
      updateFields.push('notas = ?');
      updateValues.push(notas);
    }

    if (estado === 'Completado') {
      updateFields.push('fecha_completado = CURDATE()');
    }

    updateValues.push(id);

    await query(`
      UPDATE tareas_mantenimiento 
      SET ${updateFields.join(', ')}, updated_at = NOW()
      WHERE id = ?
    `, updateValues);

    console.log(`✅ Tarea ${id} actualizada a estado "${estado}"`);

    res.json({ 
      success: true, 
      message: `Tarea actualizada a estado "${estado}"` 
    });

  } catch (error) {
    console.error('❌ ERROR al actualizar estado de mi tarea:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error interno del servidor al actualizar la tarea' 
    });
  }
});

export default router;
