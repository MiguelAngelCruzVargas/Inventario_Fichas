import express from 'express';
import { query } from '../database.js';
import { authenticateToken, requireRole } from '../auth.js';

const router = express.Router();

// Función para crear la tabla de configuración si no existe
const createConfigTableIfNotExists = async () => {
  try {
    // La app usa la tabla 'configuraciones'; creémosla si no existe
    await query(`
      CREATE TABLE IF NOT EXISTS configuraciones (
        id INT AUTO_INCREMENT PRIMARY KEY,
        clave VARCHAR(100) NOT NULL UNIQUE,
        valor TEXT NOT NULL,
        descripcion TEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ Tabla configuraciones verificada/creada');
  } catch (error) {
    console.error('❌ Error creando tabla configuraciones:', error);
  }
};

// Inicializar tabla al cargar el módulo
createConfigTableIfNotExists();

// GET /configuracion - Obtener toda la configuración global
router.get('/', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const configuraciones = await query(`
      SELECT clave, valor, descripcion
      FROM configuraciones
      ORDER BY clave
    `);

    // Convertir a objeto para facilitar el uso en el frontend
    const config = {};
    configuraciones.forEach(conf => {
      let valor = conf.valor;
      
      // Intentar convertir números
      if (!isNaN(valor) && valor.trim() !== '') {
        valor = parseFloat(valor);
      }
      
      // Intentar convertir booleanos
      if (valor === 'true' || valor === 'false') {
        valor = valor === 'true';
      }

      config[conf.clave] = {
        valor,
        descripcion: conf.descripcion,
        tipo: 'auto' // Tipo automático basado en contenido
      };
    });

    res.json(config);
  } catch (error) {
    console.error('Error al obtener configuración:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      detail: 'Error al obtener la configuración'
    });
  }
});

// ===== BRANDING (Nombre del negocio, logo, etc.) =====
// Nota: GET es público para que el login pueda mostrar marca sin autenticación.
// Importante: definir ANTES de '/:clave' para que no lo capture la ruta genérica
router.get('/branding', async (_req, res) => {
  try {
    const rows = await query('SELECT valor FROM configuraciones WHERE clave = ?', ['branding']);
    if (!rows || rows.length === 0) {
      return res.json({ name: 'Plaza Wifi', tagline: 'Sistema de Gestión v2.0', logoDataUrl: null });
    }

    let value = rows[0].valor;

    // Función de parseo robusto: maneja JSON doblemente serializado o valores simples
    const safeParseBranding = (val) => {
      try {
        const first = JSON.parse(val);
        if (typeof first === 'string') {
          try {
            return JSON.parse(first);
          } catch {
            return first; // ya es string legible
          }
        }
        return first;
      } catch {
        return val; // devolver tal cual para manejar abajo
      }
    };

    const parsed = safeParseBranding(value);

    if (parsed && typeof parsed === 'object') {
      return res.json({
        name: parsed.name || 'Plaza Wifi',
        tagline: parsed.tagline || 'Sistema de Gestión v2.0',
        logoDataUrl: parsed.logoDataUrl || null,
      });
    }

    // Si llegó aquí, es un string plano; intentar una pasada más si parece JSON
    if (typeof parsed === 'string' && parsed.trim().startsWith('{')) {
      try {
        const again = JSON.parse(parsed.trim());
        return res.json({
          name: again.name || 'Plaza Wifi',
          tagline: again.tagline || 'Sistema de Gestión v2.0',
          logoDataUrl: again.logoDataUrl || null,
        });
      } catch {
        // cae al retorno simple
      }
    }

    return res.json({ name: String(parsed || 'Plaza Wifi'), tagline: 'Sistema de Gestión v2.0', logoDataUrl: null });
  } catch (error) {
    // En cualquier error (sin tabla, DB caída, etc.), devolver valores por defecto para no bloquear el login/UI
    if (error && error.code === 'ER_NO_SUCH_TABLE') {
      console.warn('⚠️ Tabla configuraciones no existe aún. Devolviendo branding por defecto.');
    } else {
      console.warn('⚠️ Branding fallback por error de BD/esquema. Devolviendo valores por defecto.', error?.message || error);
    }
    return res.json({ name: 'Plaza Wifi', tagline: 'Sistema de Gestión v2.0', logoDataUrl: null });
  }
});

router.put('/branding', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { name, tagline, logoDataUrl } = req.body || {};
    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return res.status(400).json({ error: 'Nombre inválido', detail: 'Proporciona el nombre de tu negocio' });
    }
    if (logoDataUrl && (!/^data:image\/(png|jpeg|jpg|svg\+xml);base64,/.test(logoDataUrl) || logoDataUrl.length > 450000)) {
      return res.status(400).json({ error: 'Logo inválido', detail: 'Debe ser una imagen PNG/JPG/SVG en base64 y menor a ~300KB' });
    }

    const value = JSON.stringify({ name: name.trim(), tagline: (tagline || '').toString().trim(), logoDataUrl: logoDataUrl || null });
    const exists = await query('SELECT clave FROM configuraciones WHERE clave = ? LIMIT 1', ['branding']);
    if (exists && exists.length) {
      await query('UPDATE configuraciones SET valor = ?, descripcion = ?, updated_at = CURRENT_TIMESTAMP WHERE clave = ?', [value, 'Configuración de branding de la aplicación', 'branding']);
    } else {
      await query('INSERT INTO configuraciones (clave, valor, descripcion) VALUES (?, ?, ?)', ['branding', value, 'Configuración de branding de la aplicación']);
    }
    res.json({ message: 'Branding actualizado', branding: { name, tagline: tagline || '', logoDataUrl: logoDataUrl || null } });
  } catch (error) {
    console.error('Error al actualizar branding:', error);
    res.status(500).json({ error: 'Error interno del servidor', detail: 'No se pudo guardar el branding' });
  }
});

// GET /configuracion/:clave - Obtener una configuración específica
router.get('/:clave', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { clave } = req.params;

    const configuracion = await query(`
      SELECT clave, valor, descripcion
      FROM configuraciones
      WHERE clave = ?
    `, [clave]);

    if (!configuracion || configuracion.length === 0) {
      return res.status(404).json({
        error: 'Configuración no encontrada'
      });
    }

    const conf = configuracion[0];
    let valor = conf.valor;

    // Conversión automática de tipos
    if (!isNaN(valor) && valor.trim() !== '') {
      valor = parseFloat(valor);
    } else if (valor === 'true' || valor === 'false') {
      valor = valor === 'true';
    }

    res.json({
      clave: conf.clave,
      valor,
      descripcion: conf.descripcion,
      tipo: 'auto'
    });
  } catch (error) {
    console.error('Error al obtener configuración específica:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      detail: 'Error al obtener la configuración'
    });
  }
});

// PUT /configuracion/:clave - Actualizar una configuración específica
router.put('/:clave', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { clave } = req.params;
    const { valor, descripcion } = req.body;

    if (valor === undefined || valor === null) {
      return res.status(400).json({
        error: 'Datos incompletos',
        detail: 'Se requiere un valor'
      });
    }

    // Verificar que la configuración existe
    const existingConfig = await query(`
      SELECT clave FROM configuraciones WHERE clave = ?
    `, [clave]);

    if (!existingConfig || existingConfig.length === 0) {
      return res.status(404).json({
        error: 'Configuración no encontrada'
      });
    }

    // Validaciones específicas para porcentaje de comisión
    if (clave === 'porcentaje_ganancia_creador') {
      const valorNum = parseFloat(valor);
      if (isNaN(valorNum) || valorNum < 0 || valorNum > 100) {
        return res.status(400).json({
          error: 'Porcentaje inválido',
          detail: 'El porcentaje debe estar entre 0 y 100'
        });
      }
    }

    // Construir query de actualización
    const updates = ['valor = ?', 'updated_at = CURRENT_TIMESTAMP'];
    const values = [valor.toString()];

    if (descripcion !== undefined) {
      updates.push('descripcion = ?');
      values.push(descripcion);
    }

    values.push(clave);

    // Actualizar configuración
    await query(`
      UPDATE configuraciones 
      SET ${updates.join(', ')} 
      WHERE clave = ?
    `, values);

    // Obtener configuración actualizada
    const configActualizada = await query(`
      SELECT clave, valor, descripcion
      FROM configuraciones
      WHERE clave = ?
    `, [clave]);

    res.json({
      message: 'Configuración actualizada correctamente',
      configuracion: configActualizada[0]
    });

  } catch (error) {
    console.error('Error al actualizar configuración:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      detail: 'Error al actualizar la configuración'
    });
  }
});

// POST /configuracion - Crear nueva configuración
router.post('/', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { clave, valor, descripcion } = req.body;

    // Validaciones
    if (!clave || valor === undefined || valor === null) {
      return res.status(400).json({
        error: 'Datos incompletos',
        detail: 'Se requiere clave y valor'
      });
    }

    // Verificar que no existe
    const existingConfig = await query(`
      SELECT clave FROM configuraciones WHERE clave = ?
    `, [clave]);

    if (existingConfig && existingConfig.length > 0) {
      return res.status(409).json({
        error: 'Configuración ya existe',
        detail: 'Ya existe una configuración con esa clave'
      });
    }

    // Validaciones específicas
    if (clave === 'porcentaje_ganancia_creador') {
      const valorNum = parseFloat(valor);
      if (isNaN(valorNum) || valorNum < 0 || valorNum > 100) {
        return res.status(400).json({
          error: 'Porcentaje inválido',
          detail: 'El porcentaje debe estar entre 0 y 100'
        });
      }
    }

    // Crear configuración
    await query(`
      INSERT INTO configuraciones (clave, valor, descripcion)
      VALUES (?, ?, ?)
    `, [clave, valor.toString(), descripcion]);

    // Obtener configuración creada
    const nuevaConfig = await query(`
      SELECT * FROM configuraciones WHERE clave = ?
    `, [clave]);

    res.status(201).json(nuevaConfig[0]);

  } catch (error) {
    console.error('Error al crear configuración:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      detail: 'Error al crear la configuración'
    });
  }
});

export default router;
