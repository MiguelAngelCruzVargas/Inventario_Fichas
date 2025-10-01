import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import morgan from 'morgan';
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
import bus from './events/bus.js';


// Configurar variables de entorno
dotenv.config();

const app = express();
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
app.use(morgan('combined'));

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

// Middleware para logging personalizado
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Rutas de health check
app.get('/', (req, res) => {
  res.json({ message: 'Sistema de Fichas WiFi API', version: '1.0.0', status: 'online' });
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

// SSE stream for realtime updates (tareas, notas, entregas...)
app.get('/api/stream', authenticateToken, (req, res) => {
  // Only workers, admins (and optionally revendedores) listen
  const role = (req.user?.role || req.user?.tipo_usuario || '').toLowerCase();
  if (!['trabajador','admin'].includes(role)) {
    // allow but filter by user id in events
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();
  // Send an initial ping so upstream proxies don't think the response is empty
  try { res.write(': connected\n\n'); } catch {}

  const heartbeat = setInterval(() => {
    res.write(': keep-alive\n\n');
  }, 15000);

  const handler = (evt) => {
    // evt: { type, payload, targets?: { workerId?, userId? } }
    try {
      // Optional filtering can be added here
      res.write(`event: ${evt.type}\n`);
      res.write(`data: ${JSON.stringify(evt.payload)}\n\n`);
    } catch {}
  };
  bus.on('broadcast', handler);

  req.on('close', () => {
    clearInterval(heartbeat);
    bus.off('broadcast', handler);
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
  console.error('Error no manejado:', error);
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
        console.error('❌ No se pudo conectar a la base de datos. Verifica la configuración en .env');
        process.exit(1);
      } else {
        console.warn('⚠️ No se pudo conectar a la base de datos. Continuando en modo degradado (solo endpoints tolerantes, p.ej. /api/configuracion/branding)');
      }
    }
    // Intentar levantar el servidor con fallback de puerto en desarrollo si está ocupado
    const isProd = process.env.NODE_ENV === 'production';
    const tryListen = (port, attemptsLeft = 5) => new Promise((resolve, reject) => {
      const server = app.listen(port, () => resolve({ server, port }));
      server.on('error', (err) => {
        if (!isProd && err && err.code === 'EADDRINUSE' && attemptsLeft > 0) {
          const nextPort = (port === PORT) ? 3001 : (port + 1);
          console.warn(`⚠️ Puerto ${port} en uso. Intentando con ${nextPort}...`);
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
      console.log(`\n🚀 Servidor iniciado en http://localhost:${boundPort} [Entorno: ${process.env.NODE_ENV || 'development'}]`);
    } catch (listenErr) {
      console.error('❌ No se pudo iniciar el servidor:', listenErr?.message || listenErr);
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Error al iniciar el servidor:', error);
    process.exit(1);
  }
};

// Manejo de cierre graceful
process.on('SIGTERM', () => {
  console.log('🛑 Recibida señal SIGTERM, cerrando servidor...');
  process.exit(0);
});
process.on('SIGINT', () => {
  console.log('🛑 Recibida señal SIGINT, cerrando servidor...');
  process.exit(0);
});

// Iniciar servidor
startServer();

export default app;
