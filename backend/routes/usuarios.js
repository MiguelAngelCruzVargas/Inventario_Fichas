// routes/usuarios.js - Gestión completa de usuarios
import express from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../database.js';
import { authenticateToken, requireRole } from '../auth.js';
import { query } from '../database.js';
import { logger } from '../lib/logger.js';

const router = express.Router();

// Helper validación de contraseña fuerte
function validateStrongPassword(pwd) {
  if (typeof pwd !== 'string') return 'Contraseña inválida';
  if (pwd.length < 10) return 'La contraseña debe tener al menos 10 caracteres';
  if (!/[A-Z]/.test(pwd)) return 'La contraseña debe contener al menos una letra mayúscula';
  if (!/[a-z]/.test(pwd)) return 'La contraseña debe contener al menos una letra minúscula';
  if (!/[0-9]/.test(pwd)) return 'La contraseña debe contener al menos un número';
  if (!/[!@#$%^&*(),.?":{}|<>_+\-=/\[\];'`~]/.test(pwd)) return 'La contraseña debe contener al menos un símbolo';
  if (/\s/.test(pwd)) return 'La contraseña no puede contener espacios';
  return null;
}

// Obtener todos los usuarios (solo admin)
router.get('/', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    console.log('🔍 Obteniendo lista consolidada de usuarios...');
    const includeInactive = req.query.includeInactive === '1' || req.query.includeInactive === 'true';
    
    const whereClause = includeInactive ? '' : 'WHERE u.activo = 1';
    const [usuarios] = await db.execute(`
  SELECT 
        u.id,
  u.username,
  u.revendedor_id,
  u.cliente_id,
        COALESCE(u.role, u.tipo_usuario, 'admin') as role,
        CASE WHEN u.activo = 1 THEN true ELSE false END as active,
        u.created_at,
        u.ultimo_login as last_login,
        COALESCE(u.nombre_completo, u.username) as nombre_completo,
        u.telefono,
        COALESCE(u.email, CONCAT(u.username, '@empresa.com')) as email,
        -- Especialidad: trabajadores o responsable para revendedores
        CASE 
          WHEN COALESCE(u.role, u.tipo_usuario) = 'trabajador' THEN COALESCE(tm.especialidad, 'General')
          WHEN COALESCE(u.role, u.tipo_usuario) = 'revendedor' THEN COALESCE(r.responsable, u.nombre_completo, u.username)
          ELSE NULL
        END as especialidad,
        -- Datos específicos de revendedor
        CASE 
          WHEN COALESCE(u.role, u.tipo_usuario) = 'revendedor' THEN COALESCE(r.nombre_negocio, u.nombre_completo, u.username)
          ELSE NULL
        END as nombre_negocio,
        CASE 
          WHEN COALESCE(u.role, u.tipo_usuario) = 'revendedor' THEN r.direccion
          ELSE NULL
        END as direccion,
        CASE 
          WHEN COALESCE(u.role, u.tipo_usuario) = 'revendedor' THEN r.latitud
          ELSE NULL
        END as latitud,
        CASE 
          WHEN COALESCE(u.role, u.tipo_usuario) = 'revendedor' THEN r.longitud
          ELSE NULL
        END as longitud,
        CASE 
          WHEN COALESCE(u.role, u.tipo_usuario) = 'revendedor' THEN (
            CASE WHEN r.porcentaje_comision IS NOT NULL AND r.porcentaje_comision > 0 
                 THEN r.porcentaje_comision 
                 ELSE NULL 
            END
          )
          ELSE NULL
        END as porcentaje_comision
      FROM usuarios u
      LEFT JOIN revendedores r ON u.id = r.usuario_id
  LEFT JOIN trabajadores_mantenimiento tm ON u.id = tm.usuario_id
      ${whereClause}
      ORDER BY 
        u.activo DESC, 
        CASE COALESCE(u.role, u.tipo_usuario)
          WHEN 'admin' THEN 1
          WHEN 'trabajador' THEN 2  
          WHEN 'revendedor' THEN 3
          ELSE 4
        END,
        u.username
    `);
    
    console.log('📋 Usuarios obtenidos de la consulta consolidada:');
    usuarios.forEach(user => {
      console.log(`  - ID: ${user.id}, Username: ${user.username}, Role: ${user.role}, Active: ${user.active}`);
    });
    
  res.json({ includeInactive, usuarios });
  } catch (error) {
    console.error('Error al obtener usuarios:', error);
    res.status(500).json({ message: 'Error al obtener usuarios' });
  }
});

// Crear nuevo usuario
router.post('/', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    console.log('🔍 === INICIO CREACIÓN DE USUARIO ===');
    console.log('📨 Datos completos recibidos:', JSON.stringify(req.body, null, 2));
    
    const { 
      username, 
      password, 
      role, 
      nombre_completo, 
      telefono, 
      email,
      responsable, 
      nombre_negocio, 
      direccion,
      especialidad,
      latitud,
      longitud,
      cliente_id,
      active = true 
    } = req.body;

    console.log('📋 Datos extraídos:', {
      username, password: password ? '***' : 'undefined', role, 
      nombre_completo, telefono, email: `"${email}"`, 
      active, nombre_negocio, direccion, especialidad
    });

    // Validaciones básicas
    if (!username || !password || !role) {
      return res.status(400).json({ message: 'Faltan campos obligatorios: username, password, role' });
    }
    const pwdErr = validateStrongPassword(password);
    if (pwdErr) {
      return res.status(400).json({ message: 'Contraseña insegura', detail: pwdErr });
    }

    // Validar roles permitidos
    const allowedRoles = ['admin', 'trabajador', 'revendedor', 'cliente'];
    if (!allowedRoles.includes(role)) {
      return res.status(400).json({ message: 'Rol inválido' });
    }

    // Si es cliente, cliente_id es obligatorio
    if (role === 'cliente') {
      if (!cliente_id) {
        return res.status(400).json({ message: 'Debe especificar cliente_id para rol cliente' });
      }
    }

    console.log('🔄 CREACIÓN UNIFICADA - Rol detectado:', role);

    // GENERACIÓN SUPER DEFENSIVA DEL EMAIL
    let cleanEmail;
    
    console.log('📧 Procesando email...');
    console.log('  - email recibido:', typeof email, `"${email}"`);
    console.log('  - email es string?', typeof email === 'string');
    console.log('  - email después de trim:', email && typeof email === 'string' ? `"${email.trim()}"` : 'no es string válido');
    
    if (email !== undefined && email !== null && typeof email === 'string' && email.trim() !== '') {
      cleanEmail = email.trim();
      console.log('✅ Usando email proporcionado:', cleanEmail);
    } else {
      cleanEmail = `${username}@empresa.com`;
      console.log('🔧 Generando email automático:', cleanEmail);
    }
    
    // Verificación adicional de seguridad
    if (!cleanEmail || cleanEmail === 'undefined@empresa.com') {
      cleanEmail = 'usuario@empresa.com';
      console.log('🚨 Email generado era inválido, usando fallback:', cleanEmail);
    }
    
    console.log('📧 Email final garantizado:', cleanEmail);

    // Verificar si el usuario ya existe
    let query = 'SELECT id, username, email FROM usuarios WHERE username = ?';
    let params = [username];
    
    // Solo verificar email si se proporciona uno válido diferente al email generado por defecto
    if (cleanEmail && cleanEmail !== `${username}@empresa.com`) {
      query += ' OR email = ?';
      params.push(cleanEmail);
    }
    
    const [existingUser] = await db.execute(query, params);
    console.log('Usuarios existentes encontrados:', existingUser);

    if (existingUser.length > 0) {
      const conflict = existingUser[0];
      if (conflict.username === username) {
        return res.status(400).json({ message: 'El nombre de usuario ya existe' });
      } else if (conflict.email === cleanEmail) {
        return res.status(400).json({ message: 'El email ya está registrado' });
      }
      return res.status(400).json({ message: 'El usuario o email ya existe' });
    }

    // Encriptar contraseña
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Validación de seguridad final: asegurar que cleanEmail nunca sea null
    if (!cleanEmail || cleanEmail.trim() === '') {
      cleanEmail = `${username}@empresa.com`;
      console.log('🚨 Email vacío detectado, forzando email automático:', cleanEmail);
    }

    console.log('🔄 Creando usuario con datos:', { username, role, cleanEmail, nombre_completo, telefono });

    // LOGGING DETALLADO PRE-INSERT
    const insertParams = [
      username, 
      hashedPassword, 
      role, 
      role, // Mantener consistencia
      active ? 1 : 0, 
      nombre_completo || null, 
      telefono || null, 
      cleanEmail // Ya está garantizado que no es null
    ];
    
    console.log('📊 Parámetros para INSERT:');
    insertParams.forEach((param, index) => {
      console.log(`  [${index}]: ${typeof param} = "${param}"`);
    });

    // Crear usuario principal
    // Incluir cliente_id si viene y el rol es cliente
    let insertSql = `INSERT INTO usuarios (
        username, password_hash, role, tipo_usuario, activo, nombre_completo, telefono, email`;
    let insertPlaceholders = '?, ?, ?, ?, ?, ?, ?, ?';
    if (role === 'cliente' && cliente_id) {
      insertSql += ', cliente_id';
      insertPlaceholders += ', ?';
      insertParams.push(Number(cliente_id));
    }
    insertSql += `) VALUES (${insertPlaceholders})`;

    const [result] = await db.execute(insertSql, insertParams);

    const userId = result.insertId;
    console.log('✅ Usuario base creado con ID:', userId);

    // AUTOMATIZACIÓN TOTAL: Crear registros en tablas específicas según el rol
    try {
      if (role === 'revendedor') {
        console.log('🏪 Creando registro de revendedor...');
        const [revendedorResult] = await db.execute(
          `INSERT INTO revendedores (
            usuario_id, 
            nombre, 
            nombre_negocio, 
            responsable, 
            telefono, 
            direccion,
            latitud,
            longitud, 
            porcentaje_comision, 
            activo
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            userId,
            nombre_completo || username, 
            nombre_negocio || nombre_completo || username,
            nombre_completo || username,
            telefono || '', 
            direccion || '', 
            latitud !== undefined && latitud !== null && latitud !== '' ? Number(latitud) : null,
            longitud !== undefined && longitud !== null && longitud !== '' ? Number(longitud) : null,
            0.00, // 0 indica "usar global" (no personalizado)
            active ? 1 : 0
          ]
        );
        
        // Actualizar referencia en usuarios
        const revendedorId = revendedorResult.insertId;
        await db.execute(
          'UPDATE usuarios SET revendedor_id = ? WHERE id = ?',
          [revendedorId, userId]
        );
        
        console.log('✅ Revendedor creado con ID:', revendedorId);
      }

      if (role === 'trabajador') {
        console.log('🔧 Creando registro de trabajador...');
        const [trabajadorResult] = await db.execute(
          `INSERT INTO trabajadores_mantenimiento (
            usuario_id, 
            nombre_completo, 
            email,
            username,
            especialidad, 
            activo
          ) VALUES (?, ?, ?, ?, ?, ?)`,
          [
            userId,
            nombre_completo || username, 
            cleanEmail,
            username,
            especialidad || 'General',
            active ? 1 : 0
          ]
        );
        
        const trabajadorId = trabajadorResult.insertId;
        console.log(`✅ Trabajador creado en trabajadores_mantenimiento con ID: ${trabajadorId} (usuario_id: ${userId})`);
      }

      // Para admin, no se necesita tabla adicional
      if (role === 'admin') {
        console.log('👑 Usuario admin creado (sin tabla adicional requerida)');
      }

    } catch (relationError) {
      console.error('⚠️ Error al crear registro específico, pero usuario base OK:', relationError);
      // El usuario principal ya está creado, esto no es crítico
    }

    res.status(201).json({ 
      message: 'Usuario creado exitosamente',
      userId: userId,
      user: {
        id: userId,
        username,
        role,
        nombre_completo,
        telefono,
        email,
        active
      }
    });
  } catch (error) {
    console.error('Error al crear usuario:', error);
    res.status(500).json({ message: 'Error al crear usuario: ' + error.message });
  }
});

// Actualizar usuario
router.put('/:id', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      username, 
      password, 
      role, 
      active, 
      nombre_completo, 
      telefono, 
      email,
      responsable, 
      nombre_negocio, 
      direccion,
      especialidad,
  latitud,
      longitud,
      cliente_id 
    } = req.body;

    // Obtener información actual del usuario
    const [currentUser] = await db.execute(
      'SELECT username, COALESCE(role, tipo_usuario) as role FROM usuarios WHERE id = ?', 
      [id]
    );
    
    if (currentUser.length === 0) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    const currentRole = currentUser[0].role;

    // Construir consulta de actualización dinámicamente
    let updateQuery = 'UPDATE usuarios SET ';
    let updateValues = [];
    let updateFields = [];

    if (username !== undefined) {
      // Verificar que el username no esté en uso por otro usuario
      const [existingUser] = await db.execute(
        'SELECT id FROM usuarios WHERE username = ? AND id != ?',
        [username, id]
      );
      if (existingUser.length > 0) {
        return res.status(400).json({ message: 'El nombre de usuario ya está en uso' });
      }
      updateFields.push('username = ?');
      updateValues.push(username);
    }

    if (password && password.trim() !== '') {
      const pwdErr = validateStrongPassword(password.trim());
      if (pwdErr) {
        return res.status(400).json({ message: 'Contraseña insegura', detail: pwdErr });
      }
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(password.trim(), saltRounds);
      updateFields.push('password_hash = ?');
      updateValues.push(hashedPassword);
    }

    if (role !== undefined) {
      const allowedRoles = ['admin', 'trabajador', 'revendedor', 'cliente'];
      if (!allowedRoles.includes(role)) {
        return res.status(400).json({ message: 'Rol inválido' });
      }
      updateFields.push('role = ?, tipo_usuario = ?');
      updateValues.push(role, role);
    }

  if (active !== undefined) {
      updateFields.push('activo = ?');
      updateValues.push(active);
      
      // ACTUALIZACIÓN EN CASCADA: Actualizar estado en tablas relacionadas
      console.log(`🔄 Actualizando estado en cascada para usuario ${id}: ${active ? 'ACTIVO' : 'INACTIVO'}`);
      
      // Actualizar en tabla revendedores si existe
      const [revendedorExists] = await db.execute(
        'SELECT id FROM revendedores WHERE usuario_id = ?', [id]
      );
      if (revendedorExists.length > 0) {
        await db.execute(
          'UPDATE revendedores SET activo = ? WHERE usuario_id = ?', 
          [active ? 1 : 0, id]
        );
        console.log(`✅ Estado actualizado en tabla revendedores para usuario ${id}`);
      }
      
      // Actualizar en tabla trabajadores_mantenimiento si existe
      const [trabajadorExists] = await db.execute(
        'SELECT id FROM trabajadores_mantenimiento WHERE usuario_id = ?', [id]
      );
      if (trabajadorExists.length > 0) {
        await db.execute(
          'UPDATE trabajadores_mantenimiento SET activo = ? WHERE usuario_id = ?', 
          [active ? 1 : 0, id]
        );
        console.log(`✅ Estado actualizado en tabla trabajadores_mantenimiento para usuario ${id}`);
      }

      // Actualizar en tabla clientes si es usuario de tipo cliente
      const [usuarioCliente] = await db.execute(
        'SELECT cliente_id FROM usuarios WHERE id = ? AND COALESCE(role, tipo_usuario) = "cliente"',
        [id]
      );
      if (usuarioCliente.length > 0 && usuarioCliente[0].cliente_id) {
        await db.execute('UPDATE clientes SET activo = ? WHERE id = ?', [active ? 1 : 0, usuarioCliente[0].cliente_id]);
        console.log(`✅ Estado actualizado en tabla clientes (id=${usuarioCliente[0].cliente_id}) para usuario ${id}`);
      }
    }

    if (nombre_completo !== undefined) {
      updateFields.push('nombre_completo = ?');
      updateValues.push(nombre_completo);
    }

    if (telefono !== undefined) {
      updateFields.push('telefono = ?');
      updateValues.push(telefono);
    }

    if (email !== undefined) {
      // Si se proporciona un email, verificar que no esté en uso por otro usuario
      if (email && email.trim()) {
        const [existingEmail] = await db.execute(
          'SELECT id FROM usuarios WHERE email = ? AND id != ?',
          [email.trim(), id]
        );
        if (existingEmail.length > 0) {
          return res.status(400).json({ message: 'El email ya está en uso por otro usuario' });
        }
      }
      updateFields.push('email = ?');
      updateValues.push(email && email.trim() ? email.trim() : null);
    }

    if (cliente_id !== undefined) {
      updateFields.push('cliente_id = ?');
      updateValues.push(cliente_id ? Number(cliente_id) : null);
    }

    if (updateFields.length > 0) {
      updateQuery += updateFields.join(', ') + ' WHERE id = ?';
      updateValues.push(id);
      await db.execute(updateQuery, updateValues);
    }

    // Manejar cambio de rol
    const newRole = role || currentRole;
    
    if (newRole !== currentRole) {
      if (newRole === 'cliente' && (cliente_id === undefined || !cliente_id)) {
        return res.status(400).json({ message: 'Debe especificar cliente_id al cambiar rol a cliente' });
      }
      // VERIFICAR TAREAS ANTES DE ELIMINAR TRABAJADOR
      if (currentRole === 'trabajador') {
        const [tareasAsignadas] = await db.execute(
          'SELECT COUNT(*) as count FROM tareas_mantenimiento WHERE trabajador_id = ? AND estado IN ("Pendiente", "En Progreso")', 
          [id]
        );
        
        if (tareasAsignadas[0].count > 0) {
          return res.status(400).json({ 
            success: false, 
            message: `No se puede cambiar el rol del trabajador porque tiene ${tareasAsignadas[0].count} tareas pendientes asignadas. Complete o reasigne las tareas primero.` 
          });
        }
      }
      
      // Eliminar de tabla anterior y limpiar referencias
      if (currentRole === 'revendedor') {
        await db.execute('DELETE FROM revendedores WHERE usuario_id = ?', [id]);
        await db.execute('UPDATE usuarios SET revendedor_id = NULL WHERE id = ?', [id]);
      } else if (currentRole === 'trabajador') {
        // Ahora es seguro eliminar porque verificamos que no hay tareas pendientes
        await db.execute('DELETE FROM trabajadores_mantenimiento WHERE usuario_id = ?', [id]);
      }

      // Crear en nueva tabla y actualizar referencias
      if (newRole === 'revendedor') {
        const [revendedorResult] = await db.execute(
          `INSERT INTO revendedores (
            usuario_id, nombre, nombre_negocio, responsable, telefono, direccion, latitud, longitud, porcentaje_comision, activo
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            id,
            nombre_completo || username || currentUser[0].username,
            nombre_negocio || nombre_completo || username || currentUser[0].username,
            responsable || '',
            telefono || '',
            direccion || '',
            latitud !== undefined && latitud !== null && latitud !== '' ? Number(latitud) : null,
            longitud !== undefined && longitud !== null && longitud !== '' ? Number(longitud) : null,
            20.00,
            active !== undefined ? (active ? 1 : 0) : 1
          ]
        );
        
        // Actualizar referencia en usuarios
        await db.execute('UPDATE usuarios SET revendedor_id = ? WHERE id = ?', [revendedorResult.insertId, id]);
        
      } else if (newRole === 'trabajador') {
        const [trabajadorResult] = await db.execute(
          `INSERT INTO trabajadores_mantenimiento (
            usuario_id, nombre_completo, email, username, especialidad, activo
          ) VALUES (?, ?, ?, ?, ?, ?)`,
          [
            id,
            nombre_completo || username || currentUser[0].username,
            email || `${username || currentUser[0].username}@empresa.com`,
            username || currentUser[0].username,
            especialidad || 'General',
            active !== undefined ? (active ? 1 : 0) : 1
          ]
        );
        
        console.log(`Trabajador creado en trabajadores_mantenimiento con ID: ${id}`);
      }
    } else {
      // Actualizar en tabla específica existente
  if (newRole === 'revendedor') {
        const updateRevendedor = [];
        const valuesRevendedor = [];
        
        if (nombre_completo !== undefined) {
          updateRevendedor.push('nombre = ?, nombre_negocio = ?');
          valuesRevendedor.push(nombre_completo, nombre_negocio || nombre_completo);
        }
        if (telefono !== undefined) {
          updateRevendedor.push('telefono = ?');
          valuesRevendedor.push(telefono);
        }
        if (responsable !== undefined) {
          updateRevendedor.push('responsable = ?');
          valuesRevendedor.push(responsable);
        }
        if (direccion !== undefined) {
          updateRevendedor.push('direccion = ?');
          valuesRevendedor.push(direccion);
        }
        if (latitud !== undefined) {
          updateRevendedor.push('latitud = ?');
          valuesRevendedor.push(latitud !== null && latitud !== '' ? Number(latitud) : null);
        }
        if (longitud !== undefined) {
          updateRevendedor.push('longitud = ?');
          valuesRevendedor.push(longitud !== null && longitud !== '' ? Number(longitud) : null);
        }
        if (active !== undefined) {
          updateRevendedor.push('activo = ?');
          valuesRevendedor.push(active ? 1 : 0);
        }

        if (updateRevendedor.length > 0) {
          valuesRevendedor.push(id);
          await db.execute(
            `UPDATE revendedores SET ${updateRevendedor.join(', ')} WHERE usuario_id = ?`,
            valuesRevendedor
          );
        }
      }
      
      if (newRole === 'trabajador') {
        const updateTrabajador = [];
        const valuesTrabajador = [];
        
        if (nombre_completo !== undefined) {
          updateTrabajador.push('nombre_completo = ?');
          valuesTrabajador.push(nombre_completo);
        }
        if (email !== undefined) {
          updateTrabajador.push('email = ?');
          valuesTrabajador.push(email || `${username}@empresa.com`);
        }
        if (username !== undefined) {
          updateTrabajador.push('username = ?');
          valuesTrabajador.push(username);
        }
        if (especialidad !== undefined) {
          updateTrabajador.push('especialidad = ?');
          valuesTrabajador.push(especialidad || 'General');
        }
        if (active !== undefined) {
          updateTrabajador.push('activo = ?');
          valuesTrabajador.push(active ? 1 : 0);
        }

        if (updateTrabajador.length > 0) {
          valuesTrabajador.push(id);
          await db.execute(
            `UPDATE trabajadores_mantenimiento SET ${updateTrabajador.join(', ')} WHERE usuario_id = ?`,
            valuesTrabajador
          );
        }
      }
    }

    res.json({ message: 'Usuario actualizado exitosamente' });
  } catch (error) {
    console.error('Error al actualizar usuario:', error);
    res.status(500).json({ message: 'Error al actualizar usuario: ' + error.message });
  }
});

// Vista previa de eliminación - obtener información detallada antes de eliminar
router.get('/:id/deletion-preview', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`🔍 Obteniendo vista previa de eliminación para usuario ${id}...`);

    // Obtener información del usuario
    const [userInfo] = await db.execute('SELECT username, COALESCE(role, tipo_usuario) as role FROM usuarios WHERE id = ?', [id]);
    
    if (userInfo.length === 0) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    const user = userInfo[0];
    const deletionInfo = {
      user: user,
      canDelete: true,
      warnings: [],
      criticalData: {},
      recommendations: []
    };

    if (user.role === 'trabajador') {
      // Primero obtener el trabajador_id basado en el usuario_id
      const [trabajadorInfo] = await db.execute(
        'SELECT id as trabajador_id FROM trabajadores_mantenimiento WHERE usuario_id = ?', 
        [id]
      );
      
      if (trabajadorInfo.length > 0) {
        const trabajadorId = trabajadorInfo[0].trabajador_id;
        
        // Verificar tareas pendientes
        const [tareasAsignadas] = await db.execute(
          'SELECT COUNT(*) as count FROM tareas_mantenimiento WHERE trabajador_id = ? AND estado IN ("Pendiente", "En Progreso")', 
          [trabajadorId]
        );
        
        const [tareasCompletadas] = await db.execute(
          'SELECT COUNT(*) as count FROM tareas_mantenimiento WHERE trabajador_id = ? AND estado = "Completado"', 
          [trabajadorId]
        );
        
        deletionInfo.criticalData = {
          tareas_pendientes: tareasAsignadas[0].count,
          tareas_completadas: tareasCompletadas[0].count
        };
        
        if (tareasAsignadas[0].count > 0) {
          deletionInfo.canDelete = false;
          deletionInfo.warnings.push(`Tiene ${tareasAsignadas[0].count} tareas pendientes asignadas`);
          deletionInfo.recommendations.push('Complete o reasigne las tareas primero');
        }
        
        if (tareasCompletadas[0].count > 0) {
          deletionInfo.warnings.push(`Se perderá el historial de ${tareasCompletadas[0].count} tareas completadas`);
        }
      }

    } else if (user.role === 'revendedor') {
      // Obtener información completa del revendedor
      const [revendedorInfo] = await db.execute(`
        SELECT 
          r.*,
          (SELECT COUNT(*) FROM inventarios WHERE revendedor_id = r.id) as total_inventarios,
          (SELECT COALESCE(SUM(stock_actual), 0) FROM inventarios WHERE revendedor_id = r.id) as fichas_pendientes,
          (SELECT COUNT(*) FROM ventas WHERE revendedor_id = r.id) as total_ventas,
          (SELECT COALESCE(SUM(monto_total), 0) FROM ventas WHERE revendedor_id = r.id) as monto_total_ventas,
          (SELECT COUNT(*) FROM entregas WHERE revendedor_id = r.id) as total_entregas,
          (SELECT COUNT(*) FROM cortes_caja WHERE usuario_id = r.usuario_id) as total_cortes_caja,
          (SELECT COALESCE(SUM(total_revendedores), 0) FROM cortes_caja WHERE usuario_id = r.usuario_id) as monto_total_cortes
        FROM revendedores r 
        WHERE r.usuario_id = ?
      `, [id]);
      
      if (revendedorInfo.length > 0) {
        const info = revendedorInfo[0];
        deletionInfo.criticalData = {
          inventarios: info.total_inventarios,
          fichas_pendientes: info.fichas_pendientes,
          ventas: info.total_ventas,
          monto_total_ventas: info.monto_total_ventas,
          entregas: info.total_entregas,
          cortes_caja: info.total_cortes_caja,
          monto_total_cortes: info.monto_total_cortes
        };
        
        // Verificar datos críticos
        if (info.fichas_pendientes > 0) {
          deletionInfo.canDelete = false;
          deletionInfo.warnings.push(`Tiene ${info.fichas_pendientes} fichas pendientes en inventario`);
          deletionInfo.recommendations.push('Recupere o reasigne las fichas pendientes');
        }
        
        if (info.total_ventas > 0) {
          deletionInfo.warnings.push(`Se perderá el historial de ${info.total_ventas} ventas por $${info.monto_total_ventas}`);
          deletionInfo.recommendations.push('Considere exportar reportes de ventas antes de eliminar');
        }
        
        if (info.total_cortes_caja > 0) {
          deletionInfo.warnings.push(`Se perderá el historial de ${info.total_cortes_caja} cortes de caja por $${info.monto_total_cortes}`);
          deletionInfo.recommendations.push('Exporte reportes de cortes de caja antes de eliminar');
        }
        
        if (info.total_entregas > 0) {
          deletionInfo.warnings.push(`Se perderá el registro de ${info.total_entregas} entregas realizadas`);
        }
      }
    }
    
    // Protección del admin principal
    if (user.username === 'admin' || (user.role === 'admin' && id == '1')) {
      deletionInfo.canDelete = false;
      deletionInfo.warnings.push('Es el usuario administrador principal del sistema');
      deletionInfo.recommendations.push('Este usuario no se puede eliminar por seguridad');
    }

    res.json(deletionInfo);

  } catch (error) {
    console.error('Error al obtener vista previa de eliminación:', error);
    res.status(500).json({ message: 'Error al obtener información de eliminación: ' + error.message });
  }
});

// Eliminar usuario
router.delete('/:id', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`Intentando eliminar usuario con ID: ${id}`);
    const hardRequested = req.query.hard === '1' || req.query.hard === 'true';

    // Obtener información del usuario antes de eliminar
    const [userInfo] = await db.execute('SELECT username, COALESCE(role, tipo_usuario) as role FROM usuarios WHERE id = ?', [id]);
    
    if (userInfo.length === 0) {
      console.log(`Usuario con ID ${id} no encontrado`);
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    const user = userInfo[0];
    console.log(`Eliminando usuario: ${user.username} con rol: ${user.role}`);

    // 🔒 PROTECCIÓN: No permitir eliminar el usuario admin principal
    if (user.username === 'admin' || (user.role === 'admin' && id == '1')) {
      console.log(`⚠️ Intento de eliminar usuario admin principal bloqueado`);
      return res.status(403).json({ 
        message: 'No se puede eliminar el usuario administrador principal del sistema. Este usuario es necesario para el acceso al sistema.',
        error: 'ADMIN_DELETION_FORBIDDEN' 
      });
    }

    // VERIFICAR TAREAS PENDIENTES ANTES DE ELIMINAR TRABAJADOR
    if (user.role === 'trabajador') {
      // Primero obtener el trabajador_id basado en el usuario_id
      const [trabajadorInfo] = await db.execute(
        'SELECT id as trabajador_id FROM trabajadores_mantenimiento WHERE usuario_id = ?', 
        [id]
      );
      
      if (trabajadorInfo.length > 0) {
        const trabajadorId = trabajadorInfo[0].trabajador_id;
        
        const [tareasAsignadas] = await db.execute(
          'SELECT COUNT(*) as count FROM tareas_mantenimiento WHERE trabajador_id = ? AND estado IN ("Pendiente", "En Progreso")', 
          [trabajadorId]
        );
        
        if (tareasAsignadas[0].count > 0) {
          console.log(`⚠️ Usuario ${user.username} tiene ${tareasAsignadas[0].count} tareas pendientes`);
          return res.status(400).json({ 
            message: `No se puede eliminar el trabajador porque tiene ${tareasAsignadas[0].count} tareas pendientes asignadas. Complete o reasigne las tareas primero.` 
          });
        }
      }
    }

    // Usar CASCADE DELETE automático para trabajadores y otros roles o hard delete de revendedor
    let eliminationResult;

    if (user.role === 'revendedor') {
      console.log('🏪 Solicitud de eliminación de revendedor');

      // Obtener resumen de datos para decidir si se permite hard delete
      const [revendedorInfo] = await db.execute(`
        SELECT 
          r.id,
          (SELECT COUNT(*) FROM inventarios WHERE revendedor_id = r.id) as total_inventarios,
          (SELECT COALESCE(SUM(stock_actual), 0) FROM inventarios WHERE revendedor_id = r.id) as fichas_pendientes,
          (SELECT COUNT(*) FROM ventas WHERE revendedor_id = r.id) as total_ventas,
          (SELECT COUNT(*) FROM entregas WHERE revendedor_id = r.id) as total_entregas,
          (SELECT COUNT(*) FROM cortes_caja WHERE usuario_id = r.usuario_id) as total_cortes_caja
        FROM revendedores r WHERE r.usuario_id = ?
      `, [id]);

      const info = revendedorInfo[0];
      const hasImportantData = info && (
        info.fichas_pendientes > 0 ||
        info.total_ventas > 0 ||
        info.total_entregas > 0 ||
        info.total_cortes_caja > 0
      );

      if (!hardRequested) {
        // Soft delete por defecto: desactivar usuario y revendedor, conservar historial
        await db.execute('UPDATE usuarios SET activo = 0 WHERE id = ?', [id]);
        await db.execute('UPDATE revendedores SET activo = 0 WHERE usuario_id = ?', [id]);
        console.log(`🗂️ Soft delete aplicado (usuario y revendedor desactivados) id=${id}`);
        return res.json({
          message: 'Revendedor desactivado (soft delete) - historial preservado',
          softDeleted: true,
          hardDeleteAvailable: !hasImportantData,
          canHardDelete: !hasImportantData,
          hasImportantData,
          warning: hasImportantData ? 'Tiene historial (fichas, ventas, entregas o cortes); utiliza hard delete sólo si asumes la pérdida.' : null
        });
      }

      // Hard delete solicitado con ?hard=1
      if (hardRequested && hasImportantData) {
        return res.status(400).json({
          message: 'Hard delete bloqueado: el revendedor aún tiene historial (fichas, ventas, entregas o cortes). Desactívalo o limpia primero.',
          softDeleted: false,
          hasImportantData: true
        });
      }

      console.log('🗑️ Hard delete autorizado para revendedor (sin historial crítico)');
      eliminationResult = await query('DELETE FROM usuarios WHERE id = ?', [id]);
      console.log(`✅ Revendedor eliminado definitivamente id=${id}`);
    } else if (user.role === 'cliente') {
      console.log('👥 Solicitud de eliminación de cliente');
      // Obtener cliente_id asociado
      const [usuarioCliente] = await db.execute('SELECT cliente_id FROM usuarios WHERE id = ?', [id]);
      if (!usuarioCliente.length || !usuarioCliente[0].cliente_id) {
        return res.status(400).json({ message: 'Este usuario no tiene cliente asociado' });
      }
      const clienteId = usuarioCliente[0].cliente_id;

      // Obtener resumen de historial
      const [[pagos]] = await db.execute('SELECT COUNT(*) as count FROM clientes_pagos WHERE cliente_id = ?', [clienteId]);
      const [[equipos]] = await db.execute('SELECT COUNT(*) as count FROM equipos WHERE cliente_id = ?', [clienteId]);
      let ventasCount = { count: 0 };
      try {
        const [[v]] = await db.execute('SELECT COUNT(*) as count FROM ventas WHERE cliente_id = ?', [clienteId]);
        ventasCount = v;
      } catch {}
      let ventasOcasionalesCount = { count: 0 };
      try {
        const [[vo]] = await db.execute('SELECT COUNT(*) as count FROM ventas_ocasionales WHERE cliente_id = ?', [clienteId]);
        ventasOcasionalesCount = vo;
      } catch {}

      const hasHistory = pagos.count > 0 || equipos.count > 0 || ventasCount.count > 0 || ventasOcasionalesCount.count > 0;

      if (!hardRequested) {
        // Soft delete: sólo desactivar
        await db.execute('UPDATE usuarios SET activo = 0 WHERE id = ?', [id]);
        await db.execute('UPDATE clientes SET activo = 0 WHERE id = ?', [clienteId]);
        console.log(`🗂️ Soft delete aplicado a cliente usuario_id=${id}, cliente_id=${clienteId}`);
        return res.json({
          message: 'Cliente desactivado (soft delete) - historial preservado',
            softDeleted: true,
            hardDeleteAvailable: !hasHistory,
            canHardDelete: !hasHistory,
            hasHistory,
            history: {
              pagos: pagos.count,
              equipos: equipos.count,
              ventas: ventasCount.count,
              ventas_ocasionales: ventasOcasionalesCount.count
            },
            warning: hasHistory ? 'Tiene historial (pagos, equipos o ventas); hard delete lo eliminaría definitivamente.' : null
        });
      }

      if (hardRequested && hasHistory) {
        return res.status(400).json({
          message: 'Hard delete bloqueado: el cliente tiene historial (pagos, equipos o ventas). Usa soft delete.',
          hasHistory: true
        });
      }

      console.log('🗑️ Hard delete autorizado para cliente sin historial');
      eliminationResult = await query('DELETE FROM usuarios WHERE id = ?', [id]);
      console.log(`✅ Cliente eliminado definitivamente id=${id}`);

    } else if (user.role === 'trabajador') {
      console.log('🛠️ Solicitud de eliminación de trabajador');
      // Contar tareas asociadas
      const [[tareasPend]] = await db.execute('SELECT COUNT(*) as count FROM tareas_mantenimiento WHERE trabajador_id = ? AND estado IN ("Pendiente","En Progreso")', [id]);
      const [[tareasTot]] = await db.execute('SELECT COUNT(*) as count FROM tareas_mantenimiento WHERE trabajador_id = ?', [id]);
      const hasAnyTasks = tareasTot.count > 0;
      const hasPending = tareasPend.count > 0;

      if (!hardRequested) {
        if (hasPending) {
          return res.status(400).json({
            message: `No se puede desactivar (soft delete) porque tiene ${tareasPend.count} tareas pendientes/en progreso. Reasigna o completa primero.`,
            pendingTasks: tareasPend.count
          });
        }
        await db.execute('UPDATE usuarios SET activo = 0 WHERE id = ?', [id]);
        await db.execute('UPDATE trabajadores_mantenimiento SET activo = 0 WHERE usuario_id = ?', [id]);
        console.log(`🗂️ Soft delete aplicado a trabajador usuario_id=${id}`);
        return res.json({
          message: 'Trabajador desactivado (soft delete) - historial de tareas preservado',
          softDeleted: true,
          hardDeleteAvailable: !hasAnyTasks,
          canHardDelete: !hasAnyTasks,
          tasks: { total: tareasTot.count, pendientes: tareasPend.count },
          warning: hasAnyTasks ? 'Tiene historial de tareas; hard delete lo borraría o dejaría tareas huérfanas.' : null
        });
      }

      // Hard delete trabajador: sólo si no tiene ninguna tarea (ni historial)
      if (hardRequested && hasAnyTasks) {
        return res.status(400).json({
          message: 'Hard delete bloqueado: el trabajador tiene historial de tareas. Usa soft delete.',
          tareas: tareasTot.count
        });
      }

      console.log('🗑️ Hard delete autorizado para trabajador sin tareas');
      eliminationResult = await query('DELETE FROM usuarios WHERE id = ?', [id]);
      console.log(`✅ Trabajador eliminado definitivamente id=${id}`);

    } else {
      // Trabajadores, admins y otros roles - eliminación directa con CASCADE
      console.log('🗑️ Eliminando usuario con CASCADE DELETE automático...');
      
      // (Nota) Hard delete para roles no especificados; no hay soft delete especializado

      eliminationResult = await query(`DELETE FROM usuarios WHERE id = ?`, [id]);
      console.log(`✅ Usuario eliminado con CASCADE DELETE: ${id}`);
    }

    if (eliminationResult) {
      if (eliminationResult.affectedRows === 0) {
        return res.status(404).json({ message: 'Usuario no encontrado' });
      }
      console.log(`Usuario ${user.username} eliminado exitosamente`);
      return res.json({ message: 'Usuario eliminado exitosamente', hardDeleted: true });
    }

  } catch (error) {
    console.error('Error al eliminar usuario:', error);
    res.status(500).json({ message: 'Error al eliminar usuario: ' + error.message });
  }
});

// Cambiar contraseña (para el propio usuario)
router.post('/cambiar-password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id; // Obtenido del middleware authenticateToken

    // Validaciones
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ 
        message: 'Se requiere contraseña actual y nueva contraseña' 
      });
    }

    const pwdErr = validateStrongPassword(newPassword);
    if (pwdErr) {
      return res.status(400).json({ message: 'Contraseña insegura', detail: pwdErr });
    }

    if (currentPassword === newPassword) {
      return res.status(400).json({ 
        message: 'La nueva contraseña debe ser diferente a la actual' 
      });
    }

    // Verificar contraseña actual - Usar password_hash como nombre de columna
    const [user] = await db.execute('SELECT password_hash FROM usuarios WHERE id = ?', [userId]);
    
    if (user.length === 0) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    const isValidPassword = await bcrypt.compare(currentPassword, user[0].password_hash);
    
    if (!isValidPassword) {
      return res.status(400).json({ message: 'Contraseña actual incorrecta' });
    }

    // Actualizar contraseña
    const saltRounds = 12; // Más seguro
    const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

    await db.execute('UPDATE usuarios SET password_hash = ? WHERE id = ?', [hashedNewPassword, userId]);

    res.json({ message: 'Contraseña actualizada exitosamente' });
  } catch (error) {
    console.error('Error al cambiar contraseña:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Actualizar perfil del usuario actual
router.put('/mi-perfil', authenticateToken, async (req, res) => {
  try {
    const { username, nombre_completo, telefono } = req.body;
    const userId = req.user.id;

    // Verificar si el nuevo username ya existe (si se está cambiando)
    if (username) {
      const [existingUser] = await db.execute(
        'SELECT id FROM usuarios WHERE username = ? AND id != ?',
        [username, userId]
      );

      if (existingUser.length > 0) {
        return res.status(400).json({ message: 'El nombre de usuario ya está en uso' });
      }
    }

    // Construir consulta de actualización dinámicamente
    let updateQuery = 'UPDATE usuarios SET ';
    let updateValues = [];
    let updateFields = [];

    if (username !== undefined && username.trim() !== '') {
      updateFields.push('username = ?');
      updateValues.push(username.trim());
    }

    if (nombre_completo !== undefined) {
      updateFields.push('nombre_completo = ?');
      updateValues.push(nombre_completo?.trim() || null);
    }

    if (telefono !== undefined) {
      updateFields.push('telefono = ?');
      updateValues.push(telefono?.trim() || null);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ message: 'No hay campos para actualizar' });
    }

    updateQuery += updateFields.join(', ') + ' WHERE id = ?';
    updateValues.push(userId);

    await db.execute(updateQuery, updateValues);

    // Obtener datos actualizados del usuario
    const [updatedUser] = await db.execute(`
      SELECT 
        id, username, 
        COALESCE(role, tipo_usuario) as role,
        nombre_completo, telefono, email
      FROM usuarios 
      WHERE id = ?
    `, [userId]);

    res.json({ 
      message: 'Perfil actualizado exitosamente',
      user: updatedUser[0]
    });
  } catch (error) {
    console.error('Error al actualizar perfil:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Alternar estado activo/inactivo de usuario (con actualización en cascada)
router.patch('/:id/toggle-active', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`🔄 Alternando estado de usuario ${id}...`);

    // Obtener estado actual
    const [currentUser] = await db.execute(
      'SELECT activo, username, COALESCE(role, tipo_usuario) as role FROM usuarios WHERE id = ?', 
      [id]
    );
    
    if (currentUser.length === 0) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    const newActiveState = currentUser[0].activo === 1 ? 0 : 1;
    const username = currentUser[0].username;
    const role = currentUser[0].role;
    
    console.log(`📋 Usuario: ${username} (${role}) - Estado actual: ${currentUser[0].activo} → Nuevo estado: ${newActiveState}`);

    // Si se está desactivando un trabajador, verificar tareas pendientes
    if (newActiveState === 0 && role === 'trabajador') {
      const [tareasAsignadas] = await db.execute(
        'SELECT COUNT(*) as count FROM tareas_mantenimiento WHERE trabajador_id = ? AND estado IN ("Pendiente", "En Progreso")', 
        [id]
      );
      
      if (tareasAsignadas[0].count > 0) {
        return res.status(400).json({ 
          success: false, 
          message: `No se puede desactivar el trabajador ${username} porque tiene ${tareasAsignadas[0].count} tareas pendientes asignadas. Complete o reasigne las tareas primero.` 
        });
      }
    }

    // Si se está desactivando un revendedor, informar sobre stock pero permitir desactivación
    let stockWarning = null;
    if (newActiveState === 0 && role === 'revendedor') {
      const [inventariosAsignados] = await db.execute(
        'SELECT COUNT(*) as count, SUM(stock_actual) as total_fichas FROM inventarios WHERE revendedor_id = ? AND stock_actual > 0', 
        [id]
      );
      
      if (inventariosAsignados[0].count > 0 && inventariosAsignados[0].total_fichas > 0) {
        stockWarning = {
          inventarios: inventariosAsignados[0].count,
          fichas_pendientes: inventariosAsignados[0].total_fichas
        };
        console.log(`⚠️ ADVERTENCIA: Revendedor ${username} tiene ${inventariosAsignados[0].total_fichas} fichas en ${inventariosAsignados[0].count} inventarios`);
      }
    }

    // Actualizar estado en tabla usuarios
    await db.execute('UPDATE usuarios SET activo = ? WHERE id = ?', [newActiveState, id]);
    console.log(`✅ Estado actualizado en tabla usuarios para ${username}`);

    // ACTUALIZACIÓN EN CASCADA: Actualizar estado en tablas relacionadas
    console.log(`🔄 Actualizando estado en cascada...`);
    
    // Actualizar en tabla revendedores si existe
    const [revendedorExists] = await db.execute(
      'SELECT id FROM revendedores WHERE usuario_id = ?', [id]
    );
    if (revendedorExists.length > 0) {
      await db.execute(
        'UPDATE revendedores SET activo = ? WHERE usuario_id = ?', 
        [newActiveState, id]
      );
      console.log(`✅ Estado actualizado en tabla revendedores para ${username}`);
    }
    
    // Actualizar en tabla trabajadores_mantenimiento si existe
    const [trabajadorExists] = await db.execute(
      'SELECT id FROM trabajadores_mantenimiento WHERE usuario_id = ?', [id]
    );
    if (trabajadorExists.length > 0) {
      await db.execute(
        'UPDATE trabajadores_mantenimiento SET activo = ? WHERE usuario_id = ?', 
        [newActiveState, id]
      );
      console.log(`✅ Estado actualizado en tabla trabajadores_mantenimiento para ${username}`);
    }

    // Actualizar estado en clientes si es usuario de tipo cliente
    const [usuarioCliente] = await db.execute(
      'SELECT cliente_id FROM usuarios WHERE id = ? AND COALESCE(role, tipo_usuario) = "cliente"',
      [id]
    );
    if (usuarioCliente.length > 0 && usuarioCliente[0].cliente_id) {
      await db.execute('UPDATE clientes SET activo = ? WHERE id = ?', [newActiveState, usuarioCliente[0].cliente_id]);
      console.log(`✅ Estado actualizado en tabla clientes (id=${usuarioCliente[0].cliente_id}) para ${username}`);
    }

    const statusText = newActiveState === 1 ? 'ACTIVADO' : 'DESACTIVADO';
    console.log(`🎉 Usuario ${username} ${statusText} exitosamente`);
    
    // Preparar respuesta con información de stock si aplica
    const response = { 
      success: true,
      message: `Usuario ${username} ${statusText.toLowerCase()} exitosamente`,
      newState: newActiveState === 1
    };

    // Agregar advertencia de stock si existe
    if (stockWarning) {
      response.warning = `⚠️ IMPORTANTE: Este revendedor tiene ${stockWarning.fichas_pendientes} fichas pendientes en ${stockWarning.inventarios} inventario(s). Asegúrate de recuperar o reasignar las fichas antes de hacer cambios permanentes.`;
      response.stock_info = stockWarning;
    }
    
    res.json(response);

  } catch (error) {
    console.error('❌ Error al alternar estado de usuario:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error interno del servidor al cambiar estado del usuario: ' + error.message 
    });
  }
});

export default router;
