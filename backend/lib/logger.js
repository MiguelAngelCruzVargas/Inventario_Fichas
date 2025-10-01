import pino from 'pino';
import pinoHttp from 'pino-http';

// Level por entorno
// production: info, development: debug
const level = process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug');

export const logger = pino({
  level,
  redact: {
    paths: ['req.headers.authorization','req.headers.cookie','res.headers.set-cookie'],
    censor: '[REDACTED]'
  },
  timestamp: pino.stdTimeFunctions.isoTime
});

// Middleware HTTP
export const httpLogger = pinoHttp({
  logger,
  customLogLevel: (res, err) => {
    if (err || res.statusCode >= 500) return 'error';
    if (res.statusCode >= 400) return 'warn';
    return 'info';
  },
  serializers: {
    req(req) {
      return {
        method: req.method,
        url: req.url,
        remoteIP: req.ip,
        userId: req.user?.id,
        role: req.user?.role
      };
    },
    res(res) {
      return { statusCode: res.statusCode };
    }
  },
  quietReqLogger: true
});

export function logStartupContext() {
  logger.info({ env: process.env.NODE_ENV, logLevel: logger.level }, 'Servidor iniciando');
}

export function logUnhandledError(err) {
  logger.error({ err }, 'Error no manejado');
}
