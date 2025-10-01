import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { query, queryOne } from './database.js';

// Cache simple para introspección de esquema
let hasClienteIdColumnCache = null;
const hasClienteIdColumn = async () => {
  if (hasClienteIdColumnCache !== null) return hasClienteIdColumnCache;
  try {
    const rows = await query("SHOW COLUMNS FROM usuarios LIKE 'cliente_id'");
    hasClienteIdColumnCache = Array.isArray(rows) && rows.length > 0;
  } catch (e) {
    hasClienteIdColumnCache = false;
  }
  return hasClienteIdColumnCache;
};

// Middleware de autenticación usando cookies httpOnly
export const authenticateToken = async (req, res, next) => {
  const token = req.cookies?.auth_token; // Leer de cookies en lugar de headers
  const debugAuth = process.env.DEBUG_AUTH === '1';
  if (debugAuth) {
    console.log('[DEBUG_AUTH] Incoming auth check', {
      path: req.path,
      hasCookie: !!token,
      cookies: Object.keys(req.cookies || {}),
      origin: req.get?.('origin'),
      host: req.hostname
    });
  }

  if (!token) {
    return res.status(401).json({ 
      error: 'Token de acceso requerido',
      detail: 'No se proporcionó token de autenticación',
      expired: false
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (debugAuth) {
      console.log('[DEBUG_AUTH] Token decoded', { userId: decoded.userId, exp: decoded.exp });
    }
  const hasCliente = await hasClienteIdColumn();
  // Detectar columnas opcionales (activo, revendedor_id) de forma segura
  let hasActivo = true, hasRevendedor = true, hasTipo = true, hasRole = false;
  try {
    const rows = await query("SHOW COLUMNS FROM usuarios WHERE Field IN ('activo','revendedor_id','tipo_usuario','role')");
    const names = new Set((rows || []).map(r => r.Field));
    hasActivo = names.has('activo');
    hasRevendedor = names.has('revendedor_id');
    hasTipo = names.has('tipo_usuario');
    hasRole = names.has('role');
  } catch (e) {
    hasActivo = true; // asumir existe en la mayoría de esquemas
    hasRevendedor = false;
    hasTipo = true;
    hasRole = false;
  }
  // Verificar que el usuario sigue existiendo y activo si aplica
  // Derivar rol de manera robusta usando COALESCE entre role y tipo_usuario
  let roleExpr = `'admin'`;
  if (hasRole && hasTipo) roleExpr = "COALESCE(role, tipo_usuario, 'admin')";
  else if (hasRole) roleExpr = "COALESCE(role, 'admin')";
  else if (hasTipo) roleExpr = "COALESCE(tipo_usuario, 'admin')";

  const selectSql = `SELECT id, username, email, ${roleExpr} AS tipo_usuario, ${hasActivo ? 'activo' : '1 AS activo'}, ${hasRevendedor ? 'revendedor_id' : 'NULL AS revendedor_id'}, ${hasCliente ? 'cliente_id' : 'NULL AS cliente_id'} FROM usuarios WHERE id = ? ${hasActivo ? 'AND activo = 1' : ''}`;
  const user = await queryOne(selectSql, [decoded.userId]);
    if (debugAuth) {
      console.log('[DEBUG_AUTH] Query user result', { found: !!user });
    }

    if (!user) {
      // Limpiar cookie si el usuario no existe o está inactivo
      res.clearCookie('auth_token', getCookieOptions(req, { omitMaxAge: true }));
      return res.status(401).json({ 
        error: 'Usuario no válido',
        detail: 'El usuario no existe o está inactivo',
        expired: true
      });
    }

    // Validaciones adicionales según el rol asociado
  if (user.tipo_usuario === 'cliente' && user.cliente_id) {
      const cliente = await queryOne('SELECT id FROM clientes WHERE id = ? AND activo = 1', [user.cliente_id]);
      if (!cliente) {
        res.clearCookie('auth_token', getCookieOptions(req, { omitMaxAge: true }));
        return res.status(401).json({ 
          error: 'Usuario no válido',
          detail: 'El cliente asociado está inactivo o no existe',
          expired: true
        });
      }
    }

  if (user.tipo_usuario === 'revendedor' && user.revendedor_id) {
      const rev = await queryOne('SELECT id FROM revendedores WHERE id = ? AND activo = 1', [user.revendedor_id]);
      if (!rev) {
        res.clearCookie('auth_token', getCookieOptions(req, { omitMaxAge: true }));
        return res.status(401).json({ 
          error: 'Usuario no válido',
          detail: 'El revendedor asociado está inactivo o no existe',
          expired: true
        });
      }
    }

    // Verificar si el token está próximo a expirar (menos de 10 minutos)
    const currentTime = Math.floor(Date.now() / 1000);
    const timeUntilExpiry = decoded.exp - currentTime;
    
    if (timeUntilExpiry < 600) { // 10 minutos
      res.setHeader('X-Token-Warning', 'Token expires soon');
    }

    // Normalizar/derivar el rol cuando venga vacío
    let resolvedRole = (user.tipo_usuario || '').trim();
    if (!resolvedRole) {
      if (user.cliente_id) resolvedRole = 'cliente';
      else if (user.revendedor_id) resolvedRole = 'revendedor';
      else resolvedRole = 'trabajador';
    }

    req.user = {
      id: user.id,
      username: user.username,
      email: user.email,
  role: resolvedRole,
  activo: user.activo,
      revendedor_id: user.revendedor_id,
  cliente_id: user.cliente_id,
      tokenExp: decoded.exp
    };
    if (debugAuth) console.log('[DEBUG_AUTH] Auth OK for', req.user.username, 'role', req.user.role);
    
    next();
  } catch (error) {
  if (debugAuth) console.log('[DEBUG_AUTH] Auth failure', { error: error.message, name: error.name });
  // Limpiar cookie en caso de token inválido o expirado
  res.clearCookie('auth_token', getCookieOptions(req, { omitMaxAge: true }));
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        error: 'Sesión expirada',
        detail: 'Tu sesión ha expirado después de 2 horas de inactividad. Por favor, inicia sesión nuevamente.',
        expired: true
      });
    }
    
    return res.status(403).json({ 
      error: 'Token inválido',
      detail: 'El token de autenticación no es válido',
      expired: true
    });
  }
};

// Middleware para verificar roles
export const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Usuario no autenticado' 
      });
    }

    const userRole = req.user.role; // Ahora usamos el campo 'role' que seteamos en authenticateToken
    const allowedRoles = Array.isArray(roles) ? roles : [roles];

    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({ 
        error: 'Permisos insuficientes',
        detail: `Se requiere rol: ${allowedRoles.join(' o ')}, tu rol actual es: ${userRole}`
      });
    }

    next();
  };
};

// Funciones helper para autenticación
export const hashPassword = async (password) => {
  const saltRounds = 12;
  return await bcrypt.hash(password, saltRounds);
};

export const comparePassword = async (password, hashedPassword) => {
  return await bcrypt.compare(password, hashedPassword);
};

export const generateToken = (userId, expiresIn = '2h') => {
  return jwt.sign(
    { userId }, 
    process.env.JWT_SECRET, 
    { expiresIn }
  );
};

// Middleware para logging de requests autenticados
export const logAuthenticatedRequest = (req, res, next) => {
  if (req.user) {
  console.log(`🔐 ${req.method} ${req.path} - Usuario: ${req.user.username} (${req.user.role})`);
  }
  next();
};

// Helper centralizado para opciones de cookies (coherentes entre set/clear)
export const getCookieOptions = (req, { omitMaxAge = false } = {}) => {
  const origin = req.get?.('origin') || req.headers?.referer || '';
  const isTunneled = /\.(ngrok\.(io|app)|loca\.lt)/i.test(origin);
  const xfProto = (req.headers?.['x-forwarded-proto'] || '').toString().toLowerCase();
  const viaHttpsProxy = xfProto === 'https';
  const isProd = process.env.NODE_ENV === 'production';

  const base = {
    httpOnly: true,
    secure: isProd || isTunneled || viaHttpsProxy,
    sameSite: (isProd || isTunneled || viaHttpsProxy) ? 'none' : 'lax',
    path: '/',
  };

  if (!omitMaxAge) {
    return { ...base, maxAge: 2 * 60 * 60 * 1000 }; // 2 horas
  }
  return base;
};
