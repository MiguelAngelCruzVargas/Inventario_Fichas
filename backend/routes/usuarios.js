// routes/usuarios.js - Gestión completa de usuarios
import express from 'express';
import bcrypt from 'bcrypt';
import { db } from '../database.js';
import { authenticateToken, requireRole } from '../auth.js';

const router = express.Router();

// Obtener todos los usuarios (solo admin)
router.get('/', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    console.log('🔍 Obteniendo lista consolidada de usuarios...');
    
    const [usuarios] = await db.execute(`
      SELECT 
        u.id,
        u.username,
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
          WHEN COALESCE(u.role, u.tipo_usuario) = 'revendedor' THEN COALESCE(r.porcentaje_comision, 20.00)
          ELSE NULL
        END as porcentaje_comision
      FROM usuarios u
      LEFT JOIN revendedores r ON u.id = r.usuario_id
      LEFT JOIN trabajadores_mantenimiento tm ON u.id = tm.usuario_id
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
    
    res.json(usuarios);
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
    const [result] = await db.execute(
      `INSERT INTO usuarios (
        username, 
        password_hash, 
        role, 
        tipo_usuario, 
        activo, 
        nombre_completo, 
        telefono, 
        email
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      insertParams
    );

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
            porcentaje_comision, 
            activo
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            userId,
            nombre_completo || username, 
            nombre_negocio || nombre_completo || username,
            nombre_completo || username,
            telefono || '', 
            direccion || '', 
            20.00, // Comisión por defecto
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
        await db.execute(
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
        
        console.log('✅ Trabajador creado en trabajadores_mantenimiento con ID:', userId);
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
      especialidad 
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
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(password, saltRounds);
      updateFields.push('password_hash = ?');
      updateValues.push(hashedPassword);
    }

    if (role !== undefined) {
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

    if (updateFields.length > 0) {
      updateQuery += updateFields.join(', ') + ' WHERE id = ?';
      updateValues.push(id);
      await db.execute(updateQuery, updateValues);
    }

    // Manejar cambio de rol
    const newRole = role || currentRole;
    
    if (newRole !== currentRole) {
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
            usuario_id, nombre, nombre_negocio, responsable, telefono, direccion, porcentaje_comision, activo
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            id,
            nombre_completo || username || currentUser[0].username,
            nombre_negocio || nombre_completo || username || currentUser[0].username,
            responsable || '',
            telefono || '',
            direccion || '',
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

// Eliminar usuario
router.delete('/:id', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`Intentando eliminar usuario con ID: ${id}`);

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
      const [tareasAsignadas] = await db.execute(
        'SELECT COUNT(*) as count FROM tareas_mantenimiento WHERE trabajador_id = ? AND estado IN ("Pendiente", "En Progreso")', 
        [id]
      );
      
      if (tareasAsignadas[0].count > 0) {
        console.log(`⚠️ Usuario ${user.username} tiene ${tareasAsignadas[0].count} tareas pendientes`);
        return res.status(400).json({ 
          message: `No se puede eliminar el trabajador porque tiene ${tareasAsignadas[0].count} tareas pendientes asignadas. Complete o reasigne las tareas primero.` 
        });
      }
    }

    // Ahora que tenemos CASCADE DELETE en las foreign keys, podemos eliminar directamente
    // La base de datos se encarga automáticamente de eliminar registros relacionados
    console.log('Eliminando usuario (CASCADE automático)...');
    const [userDeleteResult] = await db.execute('DELETE FROM usuarios WHERE id = ?', [id]);
    console.log(`Filas eliminadas de usuarios: ${userDeleteResult.affectedRows}`);

    if (userDeleteResult.affectedRows === 0) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }
    
    console.log(`Usuario ${user.username} eliminado exitosamente con CASCADE automático`);
    res.json({ message: 'Usuario eliminado exitosamente' });

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

    if (newPassword.length < 6) {
      return res.status(400).json({ 
        message: 'La nueva contraseña debe tener al menos 6 caracteres' 
      });
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

    const statusText = newActiveState === 1 ? 'ACTIVADO' : 'DESACTIVADO';
    console.log(`🎉 Usuario ${username} ${statusText} exitosamente`);
    
    res.json({ 
      success: true,
      message: `Usuario ${username} ${statusText.toLowerCase()} exitosamente`,
      newState: newActiveState === 1
    });

  } catch (error) {
    console.error('❌ Error al alternar estado de usuario:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error interno del servidor al cambiar estado del usuario: ' + error.message 
    });
  }
});

export default router;
