import express from 'express';
import { query } from '../database.js';
import { authenticateToken, requireRole } from '../auth.js';

const router = express.Router();

// Función para crear la tabla de configuración si no existe
const createConfigTableIfNotExists = async () => {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS configuracion_global (
        id INT AUTO_INCREMENT PRIMARY KEY,
        clave VARCHAR(100) NOT NULL UNIQUE,
        valor TEXT NOT NULL,
        descripcion TEXT,
        tipo ENUM('string', 'number', 'boolean', 'json') DEFAULT 'string',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ Tabla configuracion_global verificada/creada');
  } catch (error) {
    console.error('❌ Error creando tabla configuracion_global:', error);
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
