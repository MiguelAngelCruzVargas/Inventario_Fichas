import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { query, queryOne } from './database.js';

// Middleware de autenticación usando cookies httpOnly
export const authenticateToken = async (req, res, next) => {
  const token = req.cookies?.auth_token; // Leer de cookies en lugar de headers

  if (!token) {
    return res.status(401).json({ 
      error: 'Token de acceso requerido',
      detail: 'No se proporcionó token de autenticación',
      expired: false
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Verificar que el usuario sigue existiendo y activo
    const user = await queryOne(
      'SELECT id, username, email, tipo_usuario, activo, revendedor_id FROM usuarios WHERE id = ? AND activo = 1',
      [decoded.userId]
    );

    if (!user) {
      // Limpiar cookie si el usuario no existe o está inactivo
      res.clearCookie('auth_token');
      return res.status(401).json({ 
        error: 'Usuario no válido',
        detail: 'El usuario no existe o está inactivo',
        expired: true
      });
    }

    // Verificar si el token está próximo a expirar (menos de 10 minutos)
    const currentTime = Math.floor(Date.now() / 1000);
    const timeUntilExpiry = decoded.exp - currentTime;
    
    if (timeUntilExpiry < 600) { // 10 minutos
      res.setHeader('X-Token-Warning', 'Token expires soon');
    }

    req.user = {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.tipo_usuario,
      activo: user.activo,
      revendedor_id: user.revendedor_id,
      tokenExp: decoded.exp
    };
    
    next();
  } catch (error) {
    // Limpiar cookie en caso de token inválido o expirado
    res.clearCookie('auth_token');
    
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
    console.log(`🔐 ${req.method} ${req.path} - Usuario: ${req.user.username} (${req.user.tipo_usuario})`);
  }
  next();
};
