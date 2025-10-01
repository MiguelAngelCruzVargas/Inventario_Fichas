import express from 'express';
import rateLimit from 'express-rate-limit';
import { query, queryOne } from '../database.js';
import { authenticateToken, requireRole, comparePassword, generateToken, hashPassword, getCookieOptions } from '../auth.js';

const router = express.Router();

// Utilidades de introspección de esquema (cache simple en memoria)
let schemaCache = {
  tablas: new Map(), // nombreTabla -> boolean
  columnas: new Map() // nombreTabla -> Set(columnas)
};

const tableExists = async (tableName) => {
  if (schemaCache.tablas.has(tableName)) return schemaCache.tablas.get(tableName);
  try {
    const rows = await query(
      'SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? LIMIT 1',
      [tableName]
    );
    const exists = Array.isArray(rows) && rows.length > 0;
    schemaCache.tablas.set(tableName, exists);
    return exists;
  } catch (e) {
    schemaCache.tablas.set(tableName, false);
    return false;
  }
};

const getColumns = async (tableName) => {
  if (schemaCache.columnas.has(tableName)) return schemaCache.columnas.get(tableName);
  try {
    const rows = await query(
      'SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?',
      [tableName]
    );
    const cols = new Set(rows.map(r => r.COLUMN_NAME));
    schemaCache.columnas.set(tableName, cols);
    return cols;
  } catch (e) {
    const empty = new Set();
    schemaCache.columnas.set(tableName, empty);
    return empty;
  }
};

// Definir rate limiter local para evitar dependencia circular con el servidor
const loginLimiter = rateLimit({
  windowMs: (parseInt(process.env.LOGIN_RATE_LIMIT_WINDOW_MINUTES, 10) || 15) * 60 * 1000,
  max: parseInt(process.env.LOGIN_RATE_LIMIT_MAX, 10) || 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Demasiados intentos',
    detail: 'Has intentado iniciar sesión demasiadas veces. Espera y vuelve a intentarlo.'
  }
});

// POST /auth/login - Iniciar sesión (protección rate limit)
router.post('/login', loginLimiter, async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        error: 'Datos incompletos',
        detail: 'Se requiere username y password'
      });
    }

    // Buscar usuario solo por coincidencia exacta (mitiga enumeración)
    // Adaptar campos según existan en el esquema
    const usuariosExiste = await tableExists('usuarios');
    if (!usuariosExiste) {
      return res.status(503).json({
        error: 'Base de datos no inicializada',
        detail: 'La tabla usuarios no existe aún. Ejecuta las migraciones.'
      });
    }
    const uCols = await getColumns('usuarios');
    const selectFields = [
      '`id`', '`username`', '`email`'
    ];
    // Password: preferir password_hash, si no existe usar password como alias
    if (uCols.has('password_hash')) {
      selectFields.push('`password_hash`');
    } else if (uCols.has('password')) {
      selectFields.push('`password` AS `password_hash`');
    } else {
      // Sin columna de contraseña no se puede autenticar
      return res.status(503).json({
        error: 'Esquema de usuarios incompleto',
        detail: 'Falta columna de contraseña (password_hash o password)'
      });
    }
    // Rol: preferir tipo_usuario; si no, usar role como alias; si tampoco, fijar alias constante
    if (uCols.has('tipo_usuario')) {
      selectFields.push('`tipo_usuario`');
    } else if (uCols.has('role')) {
      selectFields.push('`role` AS `tipo_usuario`');
    } else {
      selectFields.push("'admin' AS `tipo_usuario`");
    }
    if (uCols.has('activo')) selectFields.push('`activo`');
    if (uCols.has('revendedor_id')) selectFields.push('`revendedor_id`');
    if (uCols.has('nombre_completo')) selectFields.push('`nombre_completo`');
    if (uCols.has('especialidad')) selectFields.push('`especialidad`');

    const whereActivo = uCols.has('activo') ? ' AND activo = 1' : '';
  const sql = `SELECT ${selectFields.join(', ')} FROM usuarios WHERE (username = ? OR email = ?)${whereActivo} LIMIT 1`;
    const user = await queryOne(sql, [username, username]);

    if (!user) {
      return res.status(401).json({
        error: 'Credenciales inválidas',
        detail: 'Usuario o contraseña incorrectos'
      });
    }

  // Verificar contraseña (soporta hash bcrypt o texto plano heredado)
    let isValidPassword = false;
    const pwdStored = user.password_hash;
    if (typeof pwdStored === 'string' && pwdStored.startsWith('$2')) {
      // bcrypt hash
      isValidPassword = await comparePassword(password, pwdStored);
    } else if (typeof pwdStored === 'string') {
      // texto plano (legacy)
      isValidPassword = password === pwdStored;
    }
    if (!isValidPassword) {
      return res.status(401).json({
        error: 'Credenciales inválidas',
        detail: 'Usuario o contraseña incorrectos'
      });
    }

    // Si autenticó con texto plano, migrar a bcrypt de forma transparente
    if (isValidPassword && (!pwdStored || (typeof pwdStored === 'string' && !pwdStored.startsWith('$2')))) {
      try {
        if (uCols.has('password_hash')) {
          const newHash = await hashPassword(password);
          await query('UPDATE usuarios SET password_hash = ?' + (uCols.has('password') ? ', password = NULL' : '') + ' WHERE id = ?', [newHash, user.id]);
        }
      } catch (e) {
        // No crítico, continuar login
      }
    }

  // Generar token JWT
    const token = generateToken(user.id);

  // Setear cookie httpOnly con opciones centralizadas coherentes
  res.cookie('auth_token', token, getCookieOptions(req));

    // Actualizar último login si existe la columna
    if (uCols.has('ultimo_login')) {
      try {
        await query('UPDATE usuarios SET ultimo_login = NOW() WHERE id = ?', [user.id]);
      } catch (e) {
        // No crítico
      }
    }

    // Preparar datos del usuario (sin password)
    const userData = {
      id: user.id,
      username: user.username,
      email: user.email,
      tipo_usuario: user.tipo_usuario,
      revendedor_id: uCols.has('revendedor_id') ? user.revendedor_id : null,
      nombre_completo: uCols.has('nombre_completo') ? user.nombre_completo : null,
      especialidad: uCols.has('especialidad') ? user.especialidad : null
    };

    // Calcular tiempo de expiración
    const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000);

    res.json({
      access_token: token,
      token_type: 'Bearer',
      expires_at: expiresAt.toISOString(),
      expires_in: 7200,
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

    if (!username || !email || !password || !tipo_usuario) {
      return res.status(400).json({
        error: 'Datos incompletos',
        detail: 'Se requiere username, email, password y tipo_usuario'
      });
    }

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

    const passwordHash = await hashPassword(password);

    const result = await query(
      'INSERT INTO usuarios (username, email, password_hash, tipo_usuario, revendedor_id, nombre_completo, activo) VALUES (?, ?, ?, ?, ?, ?, 1)',
      [username, email, passwordHash, tipo_usuario, revendedor_id, nombre_completo]
    );

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

    const user = await queryOne(
      'SELECT password_hash FROM usuarios WHERE id = ?',
      [req.user.id]
    );

    const isValidPassword = await comparePassword(old_password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({
        error: 'Contraseña incorrecta',
        detail: 'La contraseña actual no es correcta'
      });
    }

    const newPasswordHash = await hashPassword(new_password);

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

// GET /auth/me - Obtener información del usuario actual

router.get('/me', authenticateToken, async (req, res) => {
  try {
    const usuariosExiste = await tableExists('usuarios');
    if (!usuariosExiste) {
      return res.status(401).json({ error: 'No autenticado' });
    }
    const uCols = await getColumns('usuarios');
    const rExists = await tableExists('revendedores');
    const selectParts = [ 'u.id', 'u.username', 'u.email' ];
    // Robust alias for tipo_usuario
    if (uCols.has('tipo_usuario')) {
      selectParts.push('u.tipo_usuario');
    } else if (uCols.has('role')) {
      selectParts.push('u.role AS tipo_usuario');
    } else {
      selectParts.push("'admin' AS tipo_usuario");
    }
    if (uCols.has('revendedor_id')) selectParts.push('u.revendedor_id');
    if (uCols.has('nombre_completo')) selectParts.push('u.nombre_completo');
    if (uCols.has('especialidad')) selectParts.push('u.especialidad');
    if (uCols.has('fecha_creacion')) selectParts.push('u.fecha_creacion');
    if (uCols.has('ultimo_login')) selectParts.push('u.ultimo_login');

    let joinClause = '';
    if (rExists && uCols.has('revendedor_id')) {
      joinClause = ' LEFT JOIN revendedores r ON u.revendedor_id = r.id';
      // Construir de forma segura el nombre del revendedor segfn columnas existentes
      try {
        const rCols = await getColumns('revendedores');
        const nameCandidates = [];
        if (rCols.has('responsable')) nameCandidates.push('r.responsable');
        if (rCols.has('nombre')) nameCandidates.push('r.nombre');
        if (rCols.has('nombre_negocio')) nameCandidates.push('r.nombre_negocio');
        if (nameCandidates.length === 1) {
          selectParts.push(`${nameCandidates[0]} as revendedor_nombre`);
        } else if (nameCandidates.length > 1) {
          selectParts.push(`COALESCE(${nameCandidates.join(', ')}) as revendedor_nombre`);
        }
      } catch (e) {
        // Si falla la introspeccin, omitimos el alias para evitar errores
      }
    }

  const sql = `SELECT ${selectParts.join(', ')} FROM usuarios u${joinClause} WHERE u.id = ?`;
  const user = await queryOne(sql, [req.user.id]);
    if (!user) {
      // Fallback a datos mínimos del token si no encontrado
      return res.json({
        id: req.user.id,
        username: req.user.username,
        email: req.user.email,
        tipo_usuario: req.user.role,
        revendedor_id: req.user.revendedor_id
      });
    }
    // Normalizar rol si viene vacío desde DB
    const normalized = { ...user };
    if (!normalized.tipo_usuario || !String(normalized.tipo_usuario).trim()) {
      if (normalized.revendedor_id) normalized.tipo_usuario = 'revendedor';
      else if (req.user.cliente_id) normalized.tipo_usuario = 'cliente';
      else normalized.tipo_usuario = 'trabajador';
    }
    res.json(normalized);

  } catch (error) {
    console.error('Error al obtener usuario actual:', error);
    // Fallback suave: responder con lo mínimo del token para evitar 500 en inicialización
    return res.json({
      id: req.user.id,
      username: req.user.username,
      email: req.user.email,
      tipo_usuario: req.user.role,
      revendedor_id: req.user.revendedor_id
    });
  }
});

// GET /auth/debug-cookie - Diagnóstico de cookies (solo en desarrollo o túnel)
router.get('/debug-cookie', async (req, res) => {
  try {
    const origin = req.get('origin') || '';
    const isTunnel = /\.(ngrok\.(io|app)|loca\.lt)/i.test(origin) || /\.(ngrok\.(io|app)|loca\.lt)/i.test(req.hostname);
    const isProd = process.env.NODE_ENV === 'production';
    if (isProd && !isTunnel) {
      return res.status(403).json({ error: 'No permitido en producción' });
    }
    res.json({
      receivedCookies: req.cookies || {},
      hasAuthToken: !!req.cookies?.auth_token,
      origin,
      hostname: req.hostname,
      secureHeader: req.headers['x-forwarded-proto'] || null,
      nodeEnv: process.env.NODE_ENV,
      tunnelMode: isTunnel,
      hint: !req.cookies?.auth_token ? 'El navegador no envió la cookie auth_token. Revisa SameSite/secure y dominio.' : 'Cookie recibida correctamente.'
    });
  } catch (e) {
    res.status(500).json({ error: 'Error en debug-cookie', detail: e.message });
  }
});

// POST /auth/logout - Cerrar sesión
router.post('/logout', (req, res) => {
  res.clearCookie('auth_token', getCookieOptions(req, { omitMaxAge: true }));

  res.json({ 
    message: 'Sesión cerrada exitosamente' 
  });
});

// GET /auth/users - Obtener todos los usuarios (para administradores)
router.get('/users', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    // Construir SELECT dinmico y seguro segn columnas disponibles
    const uCols = await getColumns('usuarios');
    const rExists = await tableExists('revendedores');
    const selectParts = [
      'u.id', 'u.username', 'u.email', 'u.tipo_usuario', 'u.activo'
    ];
    if (uCols.has('revendedor_id')) selectParts.push('u.revendedor_id');
    if (uCols.has('nombre_completo')) selectParts.push('u.nombre_completo');
    if (uCols.has('especialidad')) selectParts.push('u.especialidad');
    if (uCols.has('fecha_creacion')) selectParts.push('u.fecha_creacion');
    if (uCols.has('ultimo_login')) selectParts.push('u.ultimo_login');

    let joinClause = '';
    if (rExists && uCols.has('revendedor_id')) {
      joinClause = ' LEFT JOIN revendedores r ON u.revendedor_id = r.id';
      try {
        const rCols = await getColumns('revendedores');
        const nameCandidates = [];
        if (rCols.has('responsable')) nameCandidates.push('r.responsable');
        if (rCols.has('nombre')) nameCandidates.push('r.nombre');
        if (rCols.has('nombre_negocio')) nameCandidates.push('r.nombre_negocio');
        if (nameCandidates.length === 1) {
          selectParts.push(`${nameCandidates[0]} as revendedor_nombre`);
        } else if (nameCandidates.length > 1) {
          selectParts.push(`COALESCE(${nameCandidates.join(', ')}) as revendedor_nombre`);
        }
      } catch (e) {
        // Omitir alias si no se puede determinar de forma segura
      }
    }

    const sql = `SELECT ${selectParts.join(', ')} FROM usuarios u${joinClause} WHERE u.activo = 1 ORDER BY u.tipo_usuario, ${uCols.has('nombre_completo') ? 'u.nombre_completo' : 'u.username'}`;
    const users = await query(sql);

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

    if (isNaN(userId)) {
      return res.status(400).json({
        error: 'ID inválido',
        detail: 'El ID debe ser un número válido'
      });
    }

    if (userId === req.user.id) {
      return res.status(400).json({
        error: 'Operación no permitida',
        detail: 'No puedes eliminarte a ti mismo'
      });
    }

    const existingUser = await queryOne(
      'SELECT id, username, nombre_completo, tipo_usuario FROM usuarios WHERE id = ? AND activo = 1',
      [userId]
    );

    if (!existingUser) {
      return res.status(404).json({
        error: 'Usuario no encontrado',
        detail: 'El usuario no existe o ya ha sido eliminado'
      });
    }

    await query(
      'UPDATE usuarios SET activo = 0 WHERE id = ?',
      [userId]
    );

    res.json({
      message: 'Usuario eliminado correctamente',
      id: userId
    });

  } catch (error) {
    console.error('Error al eliminar usuario:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      detail: 'Error al eliminar el usuario'
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

    const username = nombre_completo.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '').substring(0, 20);

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

    const passwordTemporal = `${username}123`;
    const passwordHash = await hashPassword(passwordTemporal);

    const result = await query(
      "INSERT INTO usuarios (username, email, password_hash, nombre_completo, especialidad, tipo_usuario, activo, fecha_creacion) VALUES (?, ?, ?, ?, ?, 'trabajador', 1, CURRENT_TIMESTAMP)",
      [username, email || `${username}@empresa.com`, passwordHash, nombre_completo, especialidad]
    );

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

// GET /auth/detect-role - Detectar rol de usuario (para UX del login) - mantiene búsqueda parcial controlada
router.get('/detect-role', loginLimiter, async (req, res) => {
  try {
    const { username } = req.query;

    if (!username) {
      return res.status(400).json({
        error: 'Username requerido',
        detail: 'Se requiere el parámetro username'
      });
    }

    // Primero intento exacto
    let user = await queryOne(
      'SELECT tipo_usuario, nombre_completo FROM usuarios WHERE (username = ? OR email = ?) AND activo = 1',
      [username, username]
    );
    // Luego parcial (limitado) solo si no exacto
    if (!user && username.length >= 3) {
      user = await queryOne(
        'SELECT tipo_usuario, nombre_completo FROM usuarios WHERE (username LIKE ? OR email LIKE ? OR LOWER(nombre_completo) LIKE LOWER(?)) AND activo = 1 LIMIT 1',
        [`%${username}%`, `%${username}%`, `%${username}%`]
      );
    }

    if (!user) {
      // Evitar 404 ruidoso: responder 200 con bandera
      return res.json({ found: false });
    }

    // En producción: no filtrar información sensible (solo bandera found)
    if (process.env.NODE_ENV === 'production') {
      return res.json({ found: true });
    }

    // En desarrollo, devolver solo el tipo de usuario, sin nombre
    res.json({
      found: true,
      tipo_usuario: user.tipo_usuario
    });

  } catch (error) {
    console.error('Error detectando rol:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      detail: 'Error al detectar el rol del usuario'
    });
  }
});

// GET /auth/admin-exists - Verificar si existe un administrador

router.get('/admin-exists', async (req, res) => {
  try {
    // Soportar esquemas parciales: sin tabla, sin columnas 'activo' o usando 'role'
    const usuariosExiste = await tableExists('usuarios');
    if (!usuariosExiste) {
      return res.json({ adminExists: false, adminUsername: null, setupRequired: true });
    }
    const uCols = await getColumns('usuarios');
    const roleExpr = uCols.has('tipo_usuario') && uCols.has('role')
      ? "(tipo_usuario = 'admin' OR role = 'admin')"
      : (uCols.has('tipo_usuario') ? "tipo_usuario = 'admin'" : (uCols.has('role') ? "role = 'admin'" : "1=0"));
    const activoExpr = uCols.has('activo') ? ' AND activo = 1' : '';
    const sql = `SELECT id, username FROM usuarios WHERE ${roleExpr}${activoExpr} LIMIT 1`;
    let adminUser = null;
    try {
      adminUser = await queryOne(sql);
    } catch (e) {
      // Si falla por esquema extraño o DB caída, responder suave
      console.warn('⚠️ admin-exists: fallback por error de DB/esquema:', e?.message || e);
      return res.json({ adminExists: false, adminUsername: null, setupRequired: true });
    }

		 res.json({
      adminExists: !!adminUser,
      adminUsername: adminUser ? adminUser.username : null
    });

  } catch (error) {
		console.warn('⚠️ admin-exists: error no crítico, devolviendo por defecto:', error?.message || error);
		return res.json({ adminExists: false, adminUsername: null, setupRequired: true });
  }
});

// POST /auth/create-initial-admin - Crear administrador inicial
router.post('/create-initial-admin', loginLimiter, async (req, res) => {
  try {
    const { username, email, password, nombre_completo } = req.body;

    if (!username || !email || !password || !nombre_completo) {
      return res.status(400).json({
        error: 'Datos incompletos',
        detail: 'Se requiere: username, email, password y nombre_completo'
      });
    }

    const existingAdmin = await queryOne(
      "SELECT id FROM usuarios WHERE tipo_usuario = 'admin' AND activo = 1 LIMIT 1"
    );

    if (existingAdmin) {
      return res.status(403).json({
        error: 'Admin ya existe',
        detail: 'Ya existe un administrador en el sistema'
      });
    }

    const existingUser = await queryOne(
      'SELECT username, email FROM usuarios WHERE username = ? OR email = ?',
      [username, email]
    );

    if (existingUser) {
      return res.status(400).json({
        error: 'Usuario duplicado',
        detail: existingUser.username === username ? 
          'El nombre de usuario ya está en uso' : 
          'El email ya está en uso'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        error: 'Contraseña inválida',
        detail: 'La contraseña debe tener al menos 6 caracteres'
      });
    }

    const passwordHash = await hashPassword(password);

    const result = await query(
      "INSERT INTO usuarios (username, email, password_hash, nombre_completo, tipo_usuario, activo, fecha_creacion) VALUES (?, ?, ?, ?, 'admin', 1, NOW())",
      [username, email, passwordHash, nombre_completo]
    );

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


// GET /auth/search - Búsqueda explícita de usuarios (admin) con protección
router.get('/search', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 3) {
      return res.status(400).json({ error: 'Parámetro q requerido (min 3 caracteres)' });
    }
    const term = `%${q}%`;
    const rows = await query(
      'SELECT id, username, email, nombre_completo, tipo_usuario FROM usuarios WHERE (username LIKE ? OR email LIKE ? OR nombre_completo LIKE ?) AND activo = 1 LIMIT 20',
      [term, term, term]
    );
    res.json({ results: rows });
  } catch (error) {
    console.error('Error en búsqueda usuarios:', error);
    res.status(500).json({ error: 'Error interno', detail: 'No se pudo realizar la búsqueda' });
  }
});

export default router;
