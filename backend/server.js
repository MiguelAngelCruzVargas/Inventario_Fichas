import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import morgan from 'morgan'; // temporal mientras validamos transición
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import { testConnection } from './database.js';
import { authenticateToken } from './auth.js';
import path from 'path';
import fs from 'fs';

// Importar rutas
import authRoutes from './routes/auth.js';
import usuariosRoutes from './routes/usuarios.js';
import revendedoresRoutes from './routes/revendedores.js';
import tiposFichaRoutes from './routes/tipos-ficha.js';
import inventariosRoutes from './routes/inventarios.js';
import preciosRoutes from './routes/precios.js';
import entregasRoutes from './routes/entregas.js';
import ventasRoutes from './routes/ventas.js';
import stockGlobalRoutes from './routes/stock-global.js';
import reportesRoutes from './routes/reportes.js';
import configuracionRoutes from './routes/configuracion.js';
import tareasRoutes from './routes/tareas.js';
import dashboardRoutes from './routes/dashboard.js';
import cortesCajaRoutes from './routes/cortes-caja.js';
import trabajadoresRoutes from './routes/trabajadores.js';
import notasRoutes from './routes/notas.js';
import equiposRoutes from './routes/equipos.js';
import equiposInventarioRoutes from './routes/equipos-inventario.js';
import gastosRoutes from './routes/gastos.js';
import clientesRoutes from './routes/clientes.js';
import clientesPagosRoutes from './routes/clientes-pagos.js';
import ventasOcasionalesRoutes from './routes/ventas-ocasionales.js';
import catalogoRoutes from './routes/catalogo.js';
import geoRoutes from './routes/geo.js';
import archiveRoutes from './routes/archive.js';
import bus from './events/bus.js';
import { sseManager } from './lib/sse.js';
import { logger, httpLogger, logStartupContext, logUnhandledError } from './lib/logger.js';


// Configurar variables de entorno
dotenv.config();

const app = express();
logStartupContext();
const PORT = parseInt(process.env.PORT, 10) || 3001;

// ==================================================
// Validación de variables de entorno críticas
// ==================================================
const requiredEnv = ['DB_HOST','DB_USER','DB_NAME','JWT_SECRET'];
const missing = requiredEnv.filter(k => !process.env[k] || (typeof process.env[k] === 'string' && process.env[k].trim() === ''));
if (missing.length) {
  if (process.env.NODE_ENV === 'production') {
    console.error('\n❌ Falta(n) variable(s) de entorno requerida(s):', missing.join(', '));
    console.error('   Crea un archivo .env basado en backend/.env.example o configura las variables en tu hosting.');
    process.exit(1);
  } else {
    console.warn('\n⚠️ Variables de entorno faltantes en desarrollo:', missing.join(', '));
    // Defaults seguros para desarrollo únicamente
    if (!process.env.JWT_SECRET) process.env.JWT_SECRET = 'dev-secret-change-me';
  }
}

// Parsear orígenes permitidos desde ALLOWED_ORIGINS
const allowedOriginsEnv = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);

// Expresiones para túneles seguros permitidos
const tunnelRegexes = [
  /https?:\/\/.*\.ngrok\.(io|app)/i,
  /https?:\/\/.*\.loca\.lt/i
];

// Rate limiting general configurable
const limiter = rateLimit({
  windowMs: (parseInt(process.env.RATE_LIMIT_WINDOW_MINUTES, 10) || 15) * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX, 10) || 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Demasiadas solicitudes',
    detail: 'Has excedido el límite de solicitudes. Intenta de nuevo más tarde.'
  },
  skip: (req) => {
    // En desarrollo o si no se definió NODE_ENV, desactivar rate-limit para orígenes locales y same-origin
    if ((process.env.NODE_ENV === 'development' || !process.env.NODE_ENV)) {
      const origin = req.headers.origin || '';
      if (!origin) return true; // same-origin (navegador directo)
      if (origin.includes('localhost') || origin.includes('127.0.0.1')) return true;
    }
    return false;
  }
});

// Rate limit específico para login
export const loginLimiter = rateLimit({
  windowMs: (parseInt(process.env.LOGIN_RATE_LIMIT_WINDOW_MINUTES, 10) || 15) * 60 * 1000,
  max: parseInt(process.env.LOGIN_RATE_LIMIT_MAX, 10) || 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Demasiados intentos',
    detail: 'Has intentado iniciar sesión demasiadas veces. Espera y vuelve a intentarlo.'
  }
});

// Middlewares globales
app.use(helmet());
app.use(limiter);
// Sustituimos morgan por pino-http (se puede eliminar morgan del package en futuro commit)
app.use(httpLogger);

// Configurar CORS
const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true); // Peticiones same-origin

    const isAllowedStatic = allowedOriginsEnv.includes(origin);
    const isTunnel = tunnelRegexes.some(r => r.test(origin));
    const isLocalhost = /https?:\/\/localhost:\d+/i.test(origin);
    const isDevEnv = (process.env.NODE_ENV !== 'production');

    if (isAllowedStatic || isTunnel || (isLocalhost && isDevEnv)) {
      return callback(null, true);
    }
    console.warn('🚫 CORS rechazado para origen:', origin);
    callback(new Error('No permitido por CORS'));
  },
  credentials: true,
  methods: ['GET','POST','PUT','DELETE','PATCH','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization','X-Requested-With','Accept','Origin','Cache-Control','X-File-Name'],
  exposedHeaders: ['Set-Cookie','X-Token-Warning'],
  optionsSuccessStatus: 200,
  preflightContinue: false
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // Habilitar pre-flight para todas las rutas

app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ================================
// Archivos estáticos de uploads
// ================================
const uploadsDir = path.resolve('./uploads');
if (!fs.existsSync(uploadsDir)) {
  try { fs.mkdirSync(uploadsDir, { recursive: true }); } catch (e) { console.error('No se pudo crear carpeta uploads:', e); }
}
app.use('/uploads', express.static(uploadsDir, {
  maxAge: '7d',
  setHeaders: (res) => {
    res.setHeader('Cross-Origin-Resource-Policy', 'same-site');
  }
}));

// Eliminado logging manual redundante; pino-http cubre request/response

// Rutas de health check
app.get('/', (req, res) => {
  res.json({ message: 'Sistema de Fichas WiFi API', version: '1.0.0', status: 'online' });
});

// Endpoints de liveness y readiness separados para orquestadores
app.get('/live', (req, res) => {
  res.json({ live: true, uptime: process.uptime() });
});
app.get('/ready', async (req, res) => {
  try {
    const dbConnected = await testConnection();
    if (!dbConnected) return res.status(503).json({ ready: false, database: 'disconnected' });
    res.json({ ready: true, database: 'connected' });
  } catch (e) {
    res.status(503).json({ ready: false, error: e.message });
  }
});

app.get('/health', async (req, res) => {
  try {
    const dbConnected = await testConnection();
    res.json({ status: 'healthy', database: dbConnected ? 'connected' : 'disconnected' });
  } catch (error) {
    res.status(503).json({ status: 'unhealthy', database: 'error', error: error.message });
  }
});

// ==================================================
// Registrar rutas de la API
// ==================================================
app.use('/api/auth', authRoutes);
app.use('/api/usuarios', usuariosRoutes);
app.use('/api/revendedores', revendedoresRoutes);
app.use('/api/tipos-ficha', tiposFichaRoutes);
app.use('/api/inventarios', inventariosRoutes);
app.use('/api/precios', preciosRoutes);
app.use('/api/entregas', entregasRoutes);
app.use('/api/ventas', ventasRoutes);
app.use('/api/stock-global', stockGlobalRoutes);
app.use('/api/reportes', reportesRoutes);
app.use('/api/configuracion', configuracionRoutes);
app.use('/api/tareas', tareasRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/cortes-caja', cortesCajaRoutes);
app.use('/api/trabajadores', trabajadoresRoutes);
app.use('/api/notas', notasRoutes);
app.use('/api/equipos', equiposRoutes);
app.use('/api/equipos-inventario', equiposInventarioRoutes);
app.use('/api/gastos', gastosRoutes);
app.use('/api/clientes', clientesRoutes);
app.use('/api/clientes-pagos', clientesPagosRoutes);
app.use('/api/ventas-ocasionales', ventasOcasionalesRoutes);
app.use('/api/catalogo', catalogoRoutes);
app.use('/api/geo', geoRoutes);
if (process.env.ENABLE_DATA_EXPORT === '1') {
  app.use('/api/admin/archive', archiveRoutes);
  logger.info('Archive module ENABLED');
} else {
  logger.info('Archive module disabled');
}

// SSE stream for realtime updates (tareas, notas, entregas...)
app.get('/api/stream', authenticateToken, (req, res) => {
  const role = (req.user?.role || req.user?.tipo_usuario || '').toLowerCase();
  const userId = req.user?.id;

  // Parámetro ?types=tarea-creada,tarea-actualizada
  const typesParam = (req.query.types || '').toString().trim();
  const filters = typesParam
    ? new Set(typesParam.split(',').map(s => s.trim()).filter(Boolean))
    : new Set();

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  // Permitir reconexión más rápida del EventSource estándar
  res.setHeader('X-Accel-Buffering', 'no'); // Nginx: desactiva buffering
  res.flushHeaders?.();

  // Registrar conexión
  const connId = sseManager.addConnection({ res, userId, role, filters });

  // Evento inicial "ready"
  const readyPayload = {
    userId,
    role,
    filters: [...filters],
    capabilities: sseManager.capabilities,
    serverTime: Date.now()
  };
  try {
    res.write('id: 0\n');
    res.write('event: ready\n');
    res.write(`data: ${JSON.stringify(readyPayload)}\n\n`);
  } catch {}

  // Heartbeat + ping (separados: comentario + evento ping)
  const heartbeat = setInterval(() => {
    try {
      res.write(': keep-alive\n\n');
      res.write('event: ping\n');
      res.write(`data: {"ts":${Date.now()}}\n\n`);
    } catch (e) {
      clearInterval(heartbeat);
      sseManager.removeConnection(connId);
    }
  }, 15000);

  req.on('close', () => {
    clearInterval(heartbeat);
    sseManager.removeConnection(connId);
  });
});

// Middleware para rutas no encontradas
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Ruta no encontrada',
    detail: `La ruta ${req.method} ${req.originalUrl} no existe`,
  });
});

// Middleware global para manejo de errores
app.use((error, req, res, next) => {
  logger.error({ err: error }, 'Error no manejado');
  if (error.message === 'No permitido por CORS') {
    return res.status(403).json({ error: 'CORS Error', detail: 'Tu origen no está permitido' });
  }
  if (error instanceof SyntaxError && error.status === 400 && 'body' in error) {
    return res.status(400).json({ error: 'JSON inválido', detail: 'El cuerpo de la solicitud contiene JSON malformado' });
  }
  res.status(500).json({
    error: 'Error interno del servidor',
    detail: process.env.NODE_ENV === 'development' ? error.message : 'Ha ocurrido un error inesperado'
  });
});

// Función para iniciar el servidor
const startServer = async () => {
  try {
    const dbConnected = await testConnection();
    if (!dbConnected) {
      const isProd = process.env.NODE_ENV === 'production';
      if (isProd) {
  logger.error('No se pudo conectar a la base de datos. Verifica la configuración en .env');
        process.exit(1);
      } else {
  logger.warn('No se pudo conectar a la base de datos. Modo degradado (solo endpoints tolerantes)');
      }
    }
    // Intentar levantar el servidor con fallback de puerto en desarrollo si está ocupado
    const isProd = process.env.NODE_ENV === 'production';
    const tryListen = (port, attemptsLeft = 5) => new Promise((resolve, reject) => {
      const server = app.listen(port, () => resolve({ server, port }));
      server.on('error', (err) => {
        if (!isProd && err && err.code === 'EADDRINUSE' && attemptsLeft > 0) {
          const nextPort = (port === PORT) ? 3001 : (port + 1);
          logger.warn({ port, nextPort }, 'Puerto en uso, reintentando');
          setTimeout(() => {
            tryListen(nextPort, attemptsLeft - 1).then(resolve).catch(reject);
          }, 200);
        } else {
          reject(err);
        }
      });
    });

    try {
      const { port: boundPort } = await tryListen(PORT);
      logger.info({ port: boundPort, env: process.env.NODE_ENV || 'development' }, 'Servidor iniciado');
    } catch (listenErr) {
      logger.error({ err: listenErr }, 'No se pudo iniciar el servidor');
      process.exit(1);
    }
  } catch (error) {
    logger.error({ err: error }, 'Error al iniciar el servidor');
    process.exit(1);
  }
};

// Manejo de cierre graceful
process.on('SIGTERM', () => {
  logger.warn('Recibida señal SIGTERM, cerrando servidor...');
  process.exit(0);
});
process.on('SIGINT', () => {
  logger.warn('Recibida señal SIGINT, cerrando servidor...');
  process.exit(0);
});
process.on('unhandledRejection', (reason) => {
  logger.error({ reason }, 'unhandledRejection');
});
process.on('uncaughtException', (err) => {
  logUnhandledError(err);
  process.exit(1);
});

// Iniciar servidor
startServer();

export default app;
