import express from 'express';
import { query, queryOne, db } from '../database.js';
import { authenticateToken, requireRole } from '../auth.js';

const router = express.Router();

// GET /revendedores - Obtener todos los revendedores (activos e inactivos)
router.get('/', authenticateToken, async (req, res) => {
  try {
    console.log('🔍 Consultando revendedores...');
    
    // Obtener TODOS los revendedores para mostrar historial completo
    const todosRevendedores = await query(`
      SELECT r.*, 
             u.activo as usuario_activo,
             u.username,
             COUNT(DISTINCT e.id) as total_entregas,
             COALESCE(SUM(v.subtotal), 0) as ventas_totales,
             r.porcentaje_comision
      FROM revendedores r
      LEFT JOIN usuarios u ON r.usuario_id = u.id
      LEFT JOIN entregas e ON r.id = e.revendedor_id
      LEFT JOIN ventas v ON r.id = v.revendedor_id
      GROUP BY r.id, r.activo, u.activo, u.username
      ORDER BY r.activo DESC, r.nombre_negocio
    `);
    
    console.log('📋 Todos los revendedores en BD:', todosRevendedores);
    
    // Separar activos de inactivos
    const revendedoresActivos = todosRevendedores.filter(r => r.activo === 1 && r.usuario_activo === 1);
    const revendedoresInactivos = todosRevendedores.filter(r => r.activo === 0 || r.usuario_activo === 0);

    console.log(`✅ Revendedores: ${revendedoresActivos.length} activos, ${revendedoresInactivos.length} inactivos`);

    // Para cada revendedor ACTIVO, obtener sus inventarios y precios
    for (let revendedor of revendedoresActivos) {
      const [inventarios, precios] = await Promise.all([
        query(`
          SELECT i.*, tf.nombre as tipo_ficha_nombre, tf.duracion_horas
          FROM inventarios i
          JOIN tipos_fichas tf ON i.tipo_ficha_id = tf.id
          WHERE i.revendedor_id = ? AND i.activo = 1 AND tf.activo = 1
          ORDER BY tf.duracion_horas, tf.nombre
        `, [revendedor.id]),
        query(`
          SELECT p.*, tf.nombre as tipo_ficha_nombre
          FROM precios p
          JOIN tipos_fichas tf ON p.tipo_ficha_id = tf.id
          WHERE p.revendedor_id = ? AND p.activo = 1 AND tf.activo = 1
          ORDER BY tf.duracion_horas, tf.nombre
        `, [revendedor.id])
      ]);
      
      revendedor.inventarios = inventarios;
      revendedor.precios = precios;
    }

    // Los inactivos no necesitan inventarios/precios detallados
    for (let revendedor of revendedoresInactivos) {
      revendedor.inventarios = [];
      revendedor.precios = [];
    }

    // MANTENER COMPATIBILIDAD CON FRONTEND:
    // El frontend espera directamente el array de revendedores
    // Pero también enviamos la información adicional para componentes que la necesiten
    const response = todosRevendedores;
    
    // Agregar metadata en la respuesta para componentes avanzados
    response._metadata = {
      success: true,
      total: todosRevendedores.length,
      activos: revendedoresActivos.length,
      inactivos: revendedoresInactivos.length,
      revendedoresActivos,
      revendedoresInactivos
    };

    res.json(response);
  } catch (error) {
    console.error('Error al obtener revendedores:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      errno: error.errno,
      sql: error.sql,
      sqlMessage: error.sqlMessage
    });
    res.status(500).json({
      error: 'Error interno del servidor',
      detail: 'Error al obtener los revendedores',
      ...(process.env.NODE_ENV === 'development' && { 
        debug: {
          message: error.message,
          code: error.code,
          sql: error.sql
        }
      })
    });
  }
});

// GET /revendedores/disponibles - Obtener solo revendedores activos para asignación
router.get('/disponibles', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    console.log('🔍 Consultando revendedores disponibles para asignación...');
    
    const revendedoresDisponibles = await query(`
      SELECT r.id, r.nombre_negocio, r.responsable, r.telefono, r.activo
      FROM revendedores r
      INNER JOIN usuarios u ON r.usuario_id = u.id
      WHERE r.activo = 1 AND u.activo = 1
      ORDER BY r.nombre_negocio
    `);

    console.log(`✅ ${revendedoresDisponibles.length} revendedores disponibles para asignación`);
    res.json({ success: true, revendedores: revendedoresDisponibles });

  } catch (error) {
    console.error('❌ ERROR al obtener revendedores disponibles:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor al obtener revendedores disponibles'
    });
  }
});

// GET /revendedores/me - Obtener datos del revendedor actual
router.get('/me', authenticateToken, requireRole(['revendedor']), async (req, res) => {
  try {
    console.log('GET /revendedores/me - Debug completo:', {
      userId: req.user.id,
      username: req.user.username,
      userRole: req.user.role,
      revendedorId: req.user.revendedor_id,
      fullUser: req.user
    });
    
    const revendedorId = req.user.revendedor_id;
    
    if (!revendedorId) {
      console.log('Error: Usuario sin revendedor_id asociado');
      return res.status(400).json({
        error: 'Usuario no asociado a revendedor',
        detail: 'Este usuario no tiene un revendedor asociado',
        debug: req.user
      });
    }

    const revendedor = await query(`
      SELECT r.*, 
             COUNT(DISTINCT u.id) as total_usuarios,
             COUNT(DISTINCT e.id) as total_entregas,
             COALESCE(SUM(v.subtotal), 0) as ventas_totales,
             MAX(v.fecha_venta) as ultima_venta,
             r.porcentaje_comision
      FROM revendedores r
      LEFT JOIN usuarios u ON r.usuario_id = u.id AND u.activo = 1
      LEFT JOIN entregas e ON r.id = e.revendedor_id
      LEFT JOIN ventas v ON r.id = v.revendedor_id
      WHERE r.id = ? AND r.activo = 1
      GROUP BY r.id
    `, [revendedorId]);

    if (revendedor.length === 0) {
      return res.status(404).json({
        error: 'Revendedor no encontrado',
        detail: 'No se encontró el revendedor asociado a este usuario'
      });
    }

    // Obtener inventarios del revendedor
    const inventarios = await query(`
      SELECT 
        i.id,
        i.revendedor_id,
        i.tipo_ficha_id,
        i.fichas_entregadas,
        i.fichas_vendidas,
        (i.fichas_entregadas - i.fichas_vendidas) as stock_actual,
        i.activo,
        i.fecha_actualizacion,
        tf.nombre as tipo_ficha_nombre, 
        tf.duracion_horas
      FROM inventarios i
      JOIN tipos_fichas tf ON i.tipo_ficha_id = tf.id
      WHERE i.revendedor_id = ? AND i.activo = 1 AND tf.activo = 1
      ORDER BY tf.duracion_horas, tf.nombre
    `, [revendedorId]);
    
    revendedor[0].inventarios = inventarios;

    res.json(revendedor[0]);
  } catch (error) {
    console.error('Error al obtener datos del revendedor actual:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      detail: 'Error al obtener los datos del revendedor'
    });
  }
});

// GET /revendedores/debug - Endpoint de diagnóstico para problemas de usuario-revendedor
router.get('/debug', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    console.log('🔍 Iniciando diagnóstico de usuario-revendedor...');
    
    // Obtener todos los usuarios
    const usuarios = await query(`
      SELECT id, username, tipo_usuario, revendedor_id, nombre_completo, activo
      FROM usuarios 
      WHERE activo = 1
      ORDER BY tipo_usuario, username
    `);
    
    // Obtener todos los revendedores  
    const revendedores = await query(`
      SELECT id, nombre, nombre_negocio, responsable, activo
      FROM revendedores 
      WHERE activo = 1
      ORDER BY nombre
    `);
    
    // Análisis de problemas
    const problemas = [];
    const usuariosRevendedores = usuarios.filter(u => u.tipo_usuario === 'revendedor');
    
    for (const usuario of usuariosRevendedores) {
      if (!usuario.revendedor_id) {
        problemas.push({
          tipo: 'USUARIO_SIN_REVENDEDOR_ID',
          usuario: usuario,
          descripcion: `Usuario ${usuario.username} marcado como revendedor pero sin revendedor_id`
        });
      } else {
        const revendedorExiste = revendedores.find(r => r.id === usuario.revendedor_id);
        if (!revendedorExiste) {
          problemas.push({
            tipo: 'REVENDEDOR_NO_EXISTE',
            usuario: usuario,
            descripcion: `Usuario ${usuario.username} tiene revendedor_id=${usuario.revendedor_id} pero ese revendedor no existe`
          });
        }
      }
    }
    
    // Verificar revendedores sin usuarios
    for (const revendedor of revendedores) {
      const usuarioAsociado = usuarios.find(u => u.revendedor_id === revendedor.id);
      if (!usuarioAsociado) {
        problemas.push({
          tipo: 'REVENDEDOR_SIN_USUARIO',
          revendedor: revendedor,
          descripcion: `Revendedor ${revendedor.nombre} (ID: ${revendedor.id}) no tiene usuario asociado`
        });
      }
    }
    
    res.json({
      usuarios: usuarios,
      revendedores: revendedores,
      problemas: problemas,
      resumen: {
        total_usuarios: usuarios.length,
        usuarios_revendedores: usuariosRevendedores.length,
        total_revendedores: revendedores.length,
        problemas_encontrados: problemas.length
      }
    });
    
  } catch (error) {
    console.error('Error en diagnóstico:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      detail: 'Error al ejecutar diagnóstico'
    });
  }
});

// GET /revendedores/:id - Obtener un revendedor específico
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const revendedor = await query(`
      SELECT r.*, 
             COUNT(DISTINCT u.id) as total_usuarios,
             COUNT(DISTINCT e.id) as total_entregas,
             COALESCE(SUM(v.subtotal), 0) as ventas_totales,
             MAX(v.fecha_venta) as ultima_venta,
             r.porcentaje_comision
      FROM revendedores r
      LEFT JOIN usuarios u ON r.usuario_id = u.id AND u.activo = 1
      LEFT JOIN entregas e ON r.id = e.revendedor_id
      LEFT JOIN ventas v ON r.id = v.revendedor_id
      WHERE r.id = ? AND r.activo = 1
      GROUP BY r.id
    `, [id]);

    if (!revendedor || revendedor.length === 0) {
      return res.status(404).json({
        error: 'Revendedor no encontrado'
      });
    }

    res.json(revendedor[0]);
  } catch (error) {
    console.error('Error al obtener revendedor:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      errno: error.errno,
      sql: error.sql,
      sqlMessage: error.sqlMessage
    });
    res.status(500).json({
      error: 'Error interno del servidor',
      detail: 'Error al obtener el revendedor',
      ...(process.env.NODE_ENV === 'development' && { 
        debug: {
          message: error.message,
          code: error.code,
          sql: error.sql
        }
      })
    });
  }
});

// POST /revendedores - Crear nuevo revendedor
router.post('/', authenticateToken, requireRole(['admin', 'trabajador']), async (req, res) => {
  try {
    console.log('POST /revendedores - Request body:', req.body);
    console.log('POST /revendedores - User:', req.user);
    
    const { nombre_negocio, nombre, responsable, telefono, direccion, porcentaje_comision = 20.00 } = req.body;

    // Validaciones
    if (!nombre_negocio || !responsable || !telefono) {
      console.log('Validation error: missing required fields', {
        nombre_negocio,
        responsable,
        telefono
      });
      return res.status(400).json({
        error: 'Datos incompletos',
        detail: 'Se requiere nombre del negocio, responsable y teléfono'
      });
    }

    // Usar nombre_negocio como nombre por defecto si no se proporciona nombre
    const nombreFinal = nombre || nombre_negocio;

    // Validar porcentaje de comisión
    if (porcentaje_comision < 0 || porcentaje_comision > 100) {
      return res.status(400).json({
        error: 'Porcentaje inválido',
        detail: 'El porcentaje de comisión debe estar entre 0 y 100'
      });
    }

    // Verificar que no exista un revendedor con el mismo nombre de negocio
    const existingRevendedor = await query(
      'SELECT id FROM revendedores WHERE nombre_negocio = ? AND activo = 1',
      [nombre_negocio]
    );

    if (existingRevendedor.length > 0) {
      return res.status(409).json({
        error: 'Revendedor ya existe',
        detail: 'Ya existe un revendedor con ese nombre de negocio'
      });
    }

    // **LÓGICA CENTRALIZADA**: Crear usuario primero
    // Generar username único basado en el nombre del negocio
    const baseUsername = nombre_negocio.toLowerCase()
      .replace(/[^a-z0-9]/g, '') // Solo letras y números
      .substring(0, 20); // Máximo 20 caracteres
    
    let username = baseUsername;
    let counter = 1;
    
    // Verificar si el username ya existe y generar uno único
    while (true) {
      const existingUser = await query('SELECT id FROM usuarios WHERE username = ?', [username]);
      if (existingUser.length === 0) break;
      username = `${baseUsername}${counter}`;
      counter++;
    }

    // Generar contraseña aleatoria
    const generatePassword = () => {
      const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghkmnpqrstuvwxyz23456789';
      let password = '';
      for (let i = 0; i < 8; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return password;
    };

    const password = generatePassword();
    
    // Encriptar contraseña
    const bcrypt = await import('bcrypt');
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Generar email único
    const email = `${username}@sistema.local`;

    // Usar conexión directa para transacciones
    const connection = await db.getConnection();

    try {
      // Iniciar transacción
      await connection.beginTransaction();

      // 1. Crear usuario
      const [userResult] = await connection.execute(`
        INSERT INTO usuarios (username, password_hash, email, nombre_completo, role, tipo_usuario, activo, created_at)
        VALUES (?, ?, ?, ?, 'revendedor', 'revendedor', 1, NOW())
      `, [username, hashedPassword, email, responsable]);

      const usuarioId = userResult.insertId;

      // 2. Crear revendedor vinculado al usuario
      const [revendedorResult] = await connection.execute(`
        INSERT INTO revendedores (usuario_id, nombre_negocio, nombre, responsable, telefono, direccion, porcentaje_comision, activo)
        VALUES (?, ?, ?, ?, ?, ?, ?, 1)
      `, [usuarioId, nombre_negocio, nombreFinal, responsable, telefono, direccion, porcentaje_comision]);

      // Confirmar transacción
      await connection.commit();

      // Obtener el revendedor creado con datos del usuario
      const nuevoRevendedor = await query(`
        SELECT r.*, u.username, u.email, u.activo as usuario_activo
        FROM revendedores r
        JOIN usuarios u ON r.usuario_id = u.id
        WHERE r.id = ?
      `, [revendedorResult.insertId]);

      console.log('✅ Revendedor y usuario creados exitosamente:', {
        revendedorId: revendedorResult.insertId,
        usuarioId: usuarioId,
        username: username
      });

      res.status(201).json({
        ...nuevoRevendedor[0],
        // Incluir credenciales SOLO para respuesta (no se guardan en BD)
        temp_credentials: {
          username: username,
          password: password
        }
      });

    } catch (transactionError) {
      // Rollback en caso de error
      await connection.rollback();
      throw transactionError;
    } finally {
      // Liberar conexión
      connection.release();
    }

  } catch (error) {
    console.error('Error al crear revendedor:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      detail: 'Error al crear el revendedor'
    });
  }
});

// DELETE /revendedores/:id - Eliminar revendedor (soft delete)
router.delete('/:id', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar que el revendedor existe
    const revendedor = await query(
      'SELECT id, nombre FROM revendedores WHERE id = ? AND activo = 1',
      [id]
    );

    if (!revendedor || revendedor.length === 0) {
      return res.status(404).json({
        error: 'Revendedor no encontrado'
      });
    }

    // Desactivar revendedor (soft delete)
    await query(`
      UPDATE revendedores 
      SET activo = 0 
      WHERE id = ?
    `, [id]);

    // También desactivar todos los usuarios asociados al revendedor
    await query(`
      UPDATE usuarios 
      SET activo = 0
      WHERE revendedor_id = ?
    `, [id]);

    res.json({
      message: 'Revendedor eliminado correctamente',
      id: parseInt(id),
      nombre: revendedor[0].nombre
    });

  } catch (error) {
    console.error('Error al eliminar revendedor:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      detail: 'Error al eliminar el revendedor'
    });
  }
});

// PUT /revendedores/:id - Actualizar revendedor
router.put('/:id', authenticateToken, requireRole(['admin', 'trabajador']), async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, responsable, telefono, direccion, porcentaje_comision } = req.body;

    // Verificar que el revendedor existe
    const existingRevendedor = await query(
      'SELECT id FROM revendedores WHERE id = ? AND activo = 1',
      [id]
    );

    if (!existingRevendedor || existingRevendedor.length === 0) {
      return res.status(404).json({
        error: 'Revendedor no encontrado'
      });
    }

    // Validaciones
    if (!nombre || !responsable) {
      return res.status(400).json({
        error: 'Datos incompletos',
        detail: 'Se requiere nombre y responsable'
      });
    }

    // Validar porcentaje de comisión si se proporciona
    if (porcentaje_comision !== undefined && (porcentaje_comision < 0 || porcentaje_comision > 100)) {
      return res.status(400).json({
        error: 'Porcentaje inválido',
        detail: 'El porcentaje de comisión debe estar entre 0 y 100'
      });
    }

    // Verificar que no exista otro revendedor con el mismo nombre
    const duplicateRevendedor = await query(
      'SELECT id FROM revendedores WHERE nombre = ? AND id != ? AND activo = 1',
      [nombre, id]
    );

    if (duplicateRevendedor.length > 0) {
      return res.status(409).json({
        error: 'Nombre duplicado',
        detail: 'Ya existe otro revendedor con ese nombre'
      });
    }

    // Construir query de actualización dinámicamente
    const updates = [];
    const values = [];

    if (nombre) {
      updates.push('nombre = ?');
      values.push(nombre);
    }
    
    if (responsable) {
      updates.push('responsable = ?');
      values.push(responsable);
    }

    if (telefono !== undefined) {
      updates.push('telefono = ?');
      values.push(telefono);
    }

    if (direccion !== undefined) {
      updates.push('direccion = ?');
      values.push(direccion);
    }

    if (porcentaje_comision !== undefined) {
      updates.push('porcentaje_comision = ?');
      values.push(porcentaje_comision);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        error: 'Sin cambios',
        detail: 'No se proporcionaron campos para actualizar'
      });
    }

    values.push(id);

    // Actualizar revendedor
    await query(`
      UPDATE revendedores 
      SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `, values);

    // Obtener el revendedor actualizado
    const revendedorActualizado = await query(`
      SELECT * FROM revendedores WHERE id = ?
    `, [id]);

    res.json(revendedorActualizado[0]);

  } catch (error) {
    console.error('Error al actualizar revendedor:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      detail: 'Error al actualizar el revendedor'
    });
  }
});

// PUT /revendedores/:id/comision - Actualizar solo el porcentaje de comisión
router.put('/:id/comision', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const { porcentaje_comision } = req.body;

    // Validaciones
    if (porcentaje_comision === undefined || porcentaje_comision === null) {
      return res.status(400).json({
        error: 'Datos incompletos',
        detail: 'Se requiere porcentaje_comision'
      });
    }

    if (porcentaje_comision < 0 || porcentaje_comision > 100) {
      return res.status(400).json({
        error: 'Porcentaje inválido',
        detail: 'El porcentaje de comisión debe estar entre 0 y 100'
      });
    }

    // Verificar que el revendedor existe
    const revendedor = await query(
      'SELECT id, nombre FROM revendedores WHERE id = ? AND activo = 1',
      [id]
    );

    if (!revendedor || revendedor.length === 0) {
      return res.status(404).json({
        error: 'Revendedor no encontrado'
      });
    }

    // Actualizar solo el porcentaje de comisión
    await query(`
      UPDATE revendedores 
      SET porcentaje_comision = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `, [porcentaje_comision, id]);

    res.json({
      message: 'Porcentaje de comisión actualizado correctamente',
      id: parseInt(id),
      nombre: revendedor[0].nombre,
      porcentaje_comision: porcentaje_comision
    });

  } catch (error) {
    console.error('Error al actualizar porcentaje de comisión:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      detail: 'Error al actualizar el porcentaje de comisión'
    });
  }
});

// POST /revendedores/fix-user/:userId - Arreglar problemas de usuario-revendedor
router.post('/fix-user/:userId', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { userId } = req.params;
    const { action, revendedorData } = req.body; // action: 'create_revendedor', 'link_existing', 'change_role'
    
    console.log('🔧 Iniciando arreglo para usuario:', userId, 'Acción:', action);
    
    // Obtener el usuario
    const usuario = await queryOne(`
      SELECT id, username, tipo_usuario, revendedor_id, nombre_completo, activo
      FROM usuarios 
      WHERE id = ? AND activo = 1
    `, [userId]);
    
    if (!usuario) {
      return res.status(404).json({
        error: 'Usuario no encontrado'
      });
    }
    
    let resultado = {};
    
    switch (action) {
      case 'create_revendedor':
        // Crear un nuevo revendedor para este usuario
        if (!revendedorData || !revendedorData.nombre_negocio) {
          return res.status(400).json({
            error: 'Datos incompletos',
            detail: 'Se requiere revendedorData.nombre_negocio para crear revendedor'
          });
        }
        
        const nuevoRevendedor = await query(`
          INSERT INTO revendedores (nombre_negocio, nombre, responsable, telefono, direccion, porcentaje_comision, activo)
          VALUES (?, ?, ?, ?, ?, ?, 1)
        `, [
          revendedorData.nombre_negocio,
          revendedorData.nombre || usuario.nombre_completo || usuario.username,
          revendedorData.responsable || usuario.nombre_completo || usuario.username,
          revendedorData.telefono || '',
          revendedorData.direccion || '',
          revendedorData.porcentaje_comision || 20.00
        ]);
        
        // Asociar el usuario al nuevo revendedor
        await query(`
          UPDATE usuarios 
          SET revendedor_id = ? 
          WHERE id = ?
        `, [nuevoRevendedor.insertId, userId]);
        
        resultado = {
          accion: 'create_revendedor',
          revendedor_creado: nuevoRevendedor.insertId,
          usuario_actualizado: userId
        };
        break;
        
      case 'link_existing':
        // Vincular a un revendedor existente
        const revendedorId = revendedorData?.revendedor_id;
        if (!revendedorId) {
          return res.status(400).json({
            error: 'Datos incompletos',
            detail: 'Se requiere revendedorData.revendedor_id para vincular'
          });
        }
        
        // Verificar que el revendedor existe
        const revendedorExistente = await queryOne(`
          SELECT id FROM revendedores WHERE id = ? AND activo = 1
        `, [revendedorId]);
        
        if (!revendedorExistente) {
          return res.status(404).json({
            error: 'Revendedor no encontrado'
          });
        }
        
        await query(`
          UPDATE usuarios 
          SET revendedor_id = ? 
          WHERE id = ?
        `, [revendedorId, userId]);
        
        resultado = {
          accion: 'link_existing',
          revendedor_vinculado: revendedorId,
          usuario_actualizado: userId
        };
        break;
        
      case 'change_role':
        // Cambiar el rol del usuario (quitar como revendedor)
        await query(`
          UPDATE usuarios 
          SET tipo_usuario = ?, revendedor_id = NULL 
          WHERE id = ?
        `, [revendedorData?.nuevo_tipo || 'usuario', userId]);
        
        resultado = {
          accion: 'change_role',
          nuevo_tipo: revendedorData?.nuevo_tipo || 'usuario',
          usuario_actualizado: userId
        };
        break;
        
      default:
        return res.status(400).json({
          error: 'Acción no válida',
          detail: 'Las acciones válidas son: create_revendedor, link_existing, change_role'
        });
    }
    
    res.json({
      message: 'Usuario arreglado exitosamente',
      usuario: usuario.username,
      resultado: resultado
    });
    
  } catch (error) {
    console.error('Error al arreglar usuario:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      detail: 'Error al arreglar el usuario'
    });
  }
});

export default router;