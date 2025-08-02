import express from 'express';
import { query, queryOne } from '../database.js';
import { authenticateToken, requireRole, comparePassword, generateToken, hashPassword } from '../auth.js';

const router = express.Router();

// POST /auth/login - Iniciar sesión
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        error: 'Datos incompletos',
        detail: 'Se requiere username y password'
      });
    }

    // Buscar usuario por username o email
    const user = await queryOne(`
      SELECT id, username, email, password_hash, tipo_usuario, activo,
             revendedor_id, nombre_completo, especialidad
      FROM usuarios 
      WHERE (username = ? OR email = ?) AND activo = 1
    `, [username, username]);

    if (!user) {
      return res.status(401).json({
        error: 'Credenciales inválidas',
        detail: 'Usuario o contraseña incorrectos'
      });
    }

    // Verificar contraseña
    const isValidPassword = await comparePassword(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({
        error: 'Credenciales inválidas',
        detail: 'Usuario o contraseña incorrectos'
      });
    }

    // Generar token JWT
    const token = generateToken(user.id);

    // Setear cookie httpOnly con expiración de 2 horas
    res.cookie('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 2 * 60 * 60 * 1000, // 2 horas en milisegundos
      path: '/',
      domain: process.env.NODE_ENV === 'development' ? 'localhost' : undefined
    });

    // Actualizar último login
    await query(
      'UPDATE usuarios SET ultimo_login = NOW() WHERE id = ?',
      [user.id]
    );

    // Preparar datos del usuario (sin password)
    const userData = {
      id: user.id,
      username: user.username,
      email: user.email,
      tipo_usuario: user.tipo_usuario,
      revendedor_id: user.revendedor_id,
      nombre_completo: user.nombre_completo,
      especialidad: user.especialidad
    };

    // Calcular tiempo de expiración
    const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 horas desde ahora

    res.json({
      access_token: token, // Solo para referencia en el frontend
      token_type: 'Bearer',
      expires_at: expiresAt.toISOString(),
      expires_in: 7200, // 2 horas en segundos
      user: userData
    });

  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      detail: 'Error al procesar el login'
    });
  }
});

// POST /auth/register - Registrar nuevo usuario (solo admin)
router.post('/register', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const { username, email, password, tipo_usuario, revendedor_id, nombre_completo } = req.body;

    // Validaciones
    if (!username || !email || !password || !tipo_usuario) {
      return res.status(400).json({
        error: 'Datos incompletos',
        detail: 'Se requiere username, email, password y tipo_usuario'
      });
    }

    // Verificar que username no exista
    const existingUser = await queryOne(
      'SELECT id FROM usuarios WHERE username = ? OR email = ?',
      [username, email]
    );

    if (existingUser) {
      return res.status(409).json({
        error: 'Usuario ya existe',
        detail: 'El username o email ya están registrados'
      });
    }

    // Hash de la contraseña
    const passwordHash = await hashPassword(password);

    // Crear usuario
    const result = await query(`
      INSERT INTO usuarios (username, email, password_hash, tipo_usuario, revendedor_id, nombre_completo, activo)
      VALUES (?, ?, ?, ?, ?, ?, 1)
    `, [username, email, passwordHash, tipo_usuario, revendedor_id, nombre_completo]);

    res.status(201).json({
      message: 'Usuario creado exitosamente',
      user_id: result.insertId
    });

  } catch (error) {
    console.error('Error en register:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      detail: 'Error al crear el usuario'
    });
  }
});

// POST /auth/change-password - Cambiar contraseña
router.post('/change-password', authenticateToken, async (req, res) => {
  try {
    const { old_password, new_password } = req.body;

    if (!old_password || !new_password) {
      return res.status(400).json({
        error: 'Datos incompletos',
        detail: 'Se requiere contraseña actual y nueva contraseña'
      });
    }

    // Obtener contraseña actual del usuario
    const user = await queryOne(
      'SELECT password_hash FROM usuarios WHERE id = ?',
      [req.user.id]
    );

    // Verificar contraseña actual
    const isValidPassword = await comparePassword(old_password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({
        error: 'Contraseña incorrecta',
        detail: 'La contraseña actual no es correcta'
      });
    }

    // Hash de la nueva contraseña
    const newPasswordHash = await hashPassword(new_password);

    // Actualizar contraseña
    await query(
      'UPDATE usuarios SET password_hash = ? WHERE id = ?',
      [newPasswordHash, req.user.id]
    );

    res.json({
      message: 'Contraseña actualizada exitosamente'
    });

  } catch (error) {
    console.error('Error al cambiar contraseña:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      detail: 'Error al cambiar la contraseña'
    });
  }
});

// Debug endpoint - solo para desarrollo
router.get('/debug/users', authenticateToken, requireRole(['admin']), async (req, res) => {
  if (process.env.NODE_ENV !== 'development') {
    return res.status(403).json({ error: 'Solo disponible en desarrollo' });
  }
  
  try {
    const users = await query('SELECT id, username, tipo_usuario, revendedor_id, nombre_completo, activo FROM usuarios');
    const revendedores = await query('SELECT id, nombre_negocio, nombre FROM revendedores WHERE activo = 1');
    
    res.json({
      users,
      revendedores,
      message: 'Debug info - usuarios y revendedores'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /auth/me - Obtener información del usuario actual
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await queryOne(`
      SELECT u.id, u.username, u.email, COALESCE(u.role, u.tipo_usuario) as tipo_usuario, u.revendedor_id, 
             u.nombre_completo, u.especialidad, u.fecha_creacion, u.ultimo_login,
             r.nombre as revendedor_nombre
      FROM usuarios u
      LEFT JOIN revendedores r ON u.revendedor_id = r.id
      WHERE u.id = ?
    `, [req.user.id]);

    if (!user) {
      return res.status(404).json({
        error: 'Usuario no encontrado'
      });
    }

    res.json(user);

  } catch (error) {
    console.error('Error al obtener usuario actual:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      detail: 'Error al obtener información del usuario'
    });
  }
});

// POST /auth/logout - Cerrar sesión
router.post('/logout', (req, res) => {
  // Limpiar cookie de autenticación
  res.clearCookie('auth_token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    path: '/',
    domain: process.env.NODE_ENV === 'development' ? 'localhost' : undefined
  });

  res.json({ 
    message: 'Sesión cerrada exitosamente' 
  });
});

// GET /auth/users - Obtener todos los usuarios (para administradores)
router.get('/users', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const users = await query(`
      SELECT u.id, u.username, u.email, u.tipo_usuario, u.revendedor_id, 
             u.nombre_completo, u.especialidad, u.fecha_creacion, u.ultimo_login, u.activo,
             r.nombre_negocio as revendedor_nombre
      FROM usuarios u
      LEFT JOIN revendedores r ON u.revendedor_id = r.id
      WHERE u.activo = 1
      ORDER BY u.tipo_usuario, u.nombre_completo
    `);

    res.json(users);

  } catch (error) {
    console.error('Error al obtener usuarios:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      detail: 'Error al obtener usuarios'
    });
  }
});

// DELETE /auth/users/:id - Eliminar usuario (soft delete)
router.delete('/users/:id', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const userId = parseInt(id);

    console.log(`Intentando eliminar usuario con ID: ${userId}`);

    if (isNaN(userId)) {
      return res.status(400).json({
        error: 'ID inválido',
        detail: 'El ID debe ser un número válido'
      });
    }

    // Verificar que no se está tratando de eliminar al usuario actual
    if (userId === req.user.id) {
      return res.status(400).json({
        error: 'Operación no permitida',
        detail: 'No puedes eliminarte a ti mismo'
      });
    }

    // Verificar que el usuario existe
    const existingUser = await queryOne(
      'SELECT id, username, nombre_completo, tipo_usuario FROM usuarios WHERE id = ? AND activo = 1',
      [userId]
    );

    console.log(`Usuario encontrado:`, existingUser);

    if (!existingUser) {
      return res.status(404).json({
        error: 'Usuario no encontrado',
        detail: 'El usuario no existe o ya ha sido eliminado'
      });
    }

    // Desactivar usuario (soft delete)
    const result = await query(`
      UPDATE usuarios 
      SET activo = 0 
      WHERE id = ?
    `, [userId]);

    console.log(`Resultado de la eliminación:`, result);

    res.json({
      message: 'Usuario eliminado correctamente',
      id: userId,
      username: existingUser.username,
      nombre_completo: existingUser.nombre_completo
    });

  } catch (error) {
    console.error('Error detallado al eliminar usuario:', {
      message: error.message,
      code: error.code,
      errno: error.errno,
      sql: error.sql,
      stack: error.stack
    });
    res.status(500).json({
      error: 'Error interno del servidor',
      detail: 'Error al eliminar el usuario',
      debugInfo: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// POST /auth/crear-trabajador - Crear nuevo usuario trabajador
router.post('/crear-trabajador', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { nombre_completo, especialidad, email } = req.body;

    if (!nombre_completo || !especialidad) {
      return res.status(400).json({
        error: 'Datos incompletos',
        detail: 'Se requiere nombre_completo y especialidad'
      });
    }

    // Generar username basado en el nombre
    const username = nombre_completo.toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remover acentos
      .replace(/\s+/g, '')
      .substring(0, 20);

    // Verificar si el username ya existe
    const existeUsername = await queryOne(
      'SELECT id FROM usuarios WHERE username = ?',
      [username]
    );

    if (existeUsername) {
      return res.status(409).json({
        error: 'Usuario ya existe',
        detail: `El username "${username}" ya está en uso`
      });
    }

    // Generar contraseña temporal
    const passwordTemporal = `${username}123`;
    const passwordHash = await hashPassword(passwordTemporal);

    // Crear el usuario
    const result = await query(`
      INSERT INTO usuarios (
        username, 
        email, 
        password_hash, 
        nombre_completo,
        especialidad,
        tipo_usuario, 
        activo,
        fecha_creacion
      ) VALUES (?, ?, ?, ?, ?, 'trabajador', 1, CURRENT_TIMESTAMP)
    `, [username, email || `${username}@empresa.com`, passwordHash, nombre_completo, especialidad]);

    const nuevoUsuario = {
      id: result.insertId,
      username,
      email: email || `${username}@empresa.com`,
      nombre_completo,
      especialidad,
      tipo_usuario: 'trabajador',
      activo: 1
    };

    res.status(201).json({
      message: 'Trabajador creado exitosamente',
      usuario: nuevoUsuario,
      credenciales: {
        username,
        password: passwordTemporal,
        nota: 'El usuario debe cambiar la contraseña en su primer inicio de sesión'
      }
    });

  } catch (error) {
    console.error('Error al crear trabajador:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      detail: 'Error al crear el trabajador'
    });
  }
});

// GET /auth/admin-exists - Verificar si existe un administrador
router.get('/admin-exists', async (req, res) => {
  try {
    const adminUser = await queryOne(`
      SELECT id, username 
      FROM usuarios 
      WHERE COALESCE(role, tipo_usuario) = 'admin' AND activo = 1
      LIMIT 1
    `);

    res.json({
      adminExists: !!adminUser,
      adminUsername: adminUser ? adminUser.username : null
    });

  } catch (error) {
    console.error('Error verificando admin:', error);
    res.status(500).json({
      error: 'Error del servidor',
      detail: error.message
    });
  }
});

// POST /auth/create-initial-admin - Crear administrador inicial
router.post('/create-initial-admin', async (req, res) => {
  try {
    const { username, email, password, nombre_completo } = req.body;

    // Verificar que los campos requeridos estén presentes
    if (!username || !email || !password || !nombre_completo) {
      return res.status(400).json({
        error: 'Datos incompletos',
        detail: 'Se requiere: username, email, password y nombre_completo'
      });
    }

    // Verificar que no exista ya un administrador
    const existingAdmin = await queryOne(`
      SELECT id 
      FROM usuarios 
      WHERE COALESCE(role, tipo_usuario) = 'admin' AND activo = 1
      LIMIT 1
    `);

    if (existingAdmin) {
      return res.status(403).json({
        error: 'Admin ya existe',
        detail: 'Ya existe un administrador en el sistema'
      });
    }

    // Validar que el username y email no estén en uso
    const existingUser = await queryOne(`
      SELECT username, email 
      FROM usuarios 
      WHERE username = ? OR email = ?
    `, [username, email]);

    if (existingUser) {
      return res.status(400).json({
        error: 'Usuario duplicado',
        detail: existingUser.username === username ? 
          'El nombre de usuario ya está en uso' : 
          'El email ya está en uso'
      });
    }

    // Validar contraseña
    if (password.length < 6) {
      return res.status(400).json({
        error: 'Contraseña inválida',
        detail: 'La contraseña debe tener al menos 6 caracteres'
      });
    }

    // Crear el administrador inicial
    const passwordHash = await hashPassword(password);

    const result = await query(`
      INSERT INTO usuarios (
        username, 
        email, 
        password_hash, 
        nombre_completo, 
        tipo_usuario, 
        role, 
        activo, 
        fecha_creacion
      ) VALUES (?, ?, ?, ?, 'admin', 'admin', 1, NOW())
    `, [username, email, passwordHash, nombre_completo]);

    console.log('✅ Administrador inicial creado:', {
      id: result.insertId,
      username,
      email,
      nombre_completo
    });

    res.status(201).json({
      message: 'Administrador inicial creado exitosamente',
      admin: {
        id: result.insertId,
        username,
        email,
        nombre_completo
      }
    });

  } catch (error) {
    console.error('Error creando admin inicial:', error);
    res.status(500).json({
      error: 'Error del servidor',
      detail: error.message
    });
  }
});

export default router;
