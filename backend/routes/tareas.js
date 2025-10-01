// Archivo: routes/tareas.js
import express from 'express';
import { query } from '../database.js'; // Asegúrate de que la ruta sea correcta
import bus from '../events/bus.js';
import { authenticateToken, requireRole } from '../auth.js'; // Asegúrate de que la ruta sea correcta
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { compressAdaptive, ensureDir, validateImage } from '../lib/imageUtils.js';

const router = express.Router();

// ===== Configuración de subida de imágenes para tareas =====
const uploadTareas = multer({ storage: multer.memoryStorage(), limits: { files: 3, fileSize: 15 * 1024 * 1024 } });
const TAREAS_UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'tareas');
ensureDir(TAREAS_UPLOAD_DIR);

async function processTaskImages(files){
  const stored = [];
  for(const f of files){
    const err = validateImage(f);
    if(err) throw new Error(err);
  }
  for(const f of files){
    const { buffer } = await compressAdaptive(f.buffer);
    const filename = `tarea_${Date.now()}_${Math.random().toString(36).slice(2,8)}.jpg`;
    const fullPath = path.join(TAREAS_UPLOAD_DIR, filename);
    await fs.promises.writeFile(fullPath, buffer);
    stored.push(`/uploads/tareas/${filename}`);
  }
  return stored;
}

// Utils de introspección de esquema con cache simple
const schemaCache = {
  tablas: new Map(),
  columnas: new Map()
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

// ==================================================
// RUTAS DE TRABAJADORES (DENTRO DEL CONTEXTO DE TAREAS)
// ==================================================

// OBTENER TODOS LOS TRABAJADORES (ACTIVOS E INACTIVOS)
// Utilizado para poblar los selectores en el frontend al crear una tarea.
// Los inactivos se muestran pero no están disponibles para asignación
router.get('/trabajadores', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    console.log('🔍 Consultando trabajadores en tabla trabajadores_mantenimiento...');
    
    // Obtenemos TODOS los trabajadores para mostrar historial completo
    const trabajadores = await query(`
      SELECT 
        t.id, 
        t.nombre_completo, 
        t.especialidad, 
        t.activo, 
        t.created_at,
        u.username,
        u.activo as usuario_activo,
        -- Estado combinado: trabajador Y usuario deben estar activos
        CASE 
          WHEN t.activo = 1 AND u.activo = 1 THEN 1 
          ELSE 0 
        END as disponible_para_asignacion
      FROM trabajadores_mantenimiento t
      LEFT JOIN usuarios u ON t.usuario_id = u.id
      ORDER BY 
        (t.activo = 1 AND u.activo = 1) DESC, 
        t.nombre_completo ASC
    `);

    // Separar trabajadores por disponibilidad real (ambos activos)
    const trabajadoresDisponibles = trabajadores.filter(t => t.disponible_para_asignacion === 1);
    const trabajadoresNoDisponibles = trabajadores.filter(t => t.disponible_para_asignacion === 0);

    console.log(`✅ Trabajadores encontrados: ${trabajadoresDisponibles.length} disponibles, ${trabajadoresNoDisponibles.length} no disponibles`);
    
    // MANTENER COMPATIBILIDAD CON FRONTEND:
    // El frontend espera: { success: true, trabajadores: [...] }
    // Pero también enviamos información adicional
    res.json({ 
      success: true, 
      trabajadores: trabajadores, // Array completo para compatibilidad
      // Información adicional para componentes avanzados
      _metadata: {
        total: trabajadores.length,
        disponiblesCount: trabajadoresDisponibles.length,
        noDisponiblesCount: trabajadoresNoDisponibles.length
      },
      disponibles: trabajadoresDisponibles,
      noDisponibles: trabajadoresNoDisponibles
    });

  } catch (error) {
    console.error('❌ ERROR al obtener trabajadores:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor al obtener trabajadores'
    });
  }
});

// OBTENER TRABAJADORES DISPONIBLES PARA ASIGNACIÓN (SOLO ACTIVOS)
// Esta ruta específica para selectores donde solo queremos trabajadores activos
router.get('/trabajadores/disponibles', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    console.log('🔍 Consultando trabajadores disponibles para asignación...');
    
    const trabajadoresDisponibles = await query(`
      SELECT 
        t.id, 
        t.nombre_completo, 
        t.especialidad, 
        t.activo, 
        t.created_at,
        u.username,
        u.activo as usuario_activo
      FROM trabajadores_mantenimiento t
      INNER JOIN usuarios u ON t.usuario_id = u.id
      WHERE t.activo = 1 AND u.activo = 1
      ORDER BY t.nombre_completo ASC
    `);

    console.log(`✅ ${trabajadoresDisponibles.length} trabajadores disponibles para asignación`);
    console.log('📋 Lista de trabajadores disponibles:');
    trabajadoresDisponibles.forEach(t => {
      console.log(`  - ID: ${t.id}, Nombre: ${t.nombre_completo}, Usuario: ${t.username}, Activo: T=${t.activo}/U=${t.usuario_activo}`);
    });
    
    res.json({ success: true, trabajadores: trabajadoresDisponibles });

  } catch (error) {
    console.error('❌ ERROR al obtener trabajadores disponibles:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor al obtener trabajadores disponibles'
    });
  }
});

// ==================================================
// RUTAS PRINCIPALES DE TAREAS
// ==================================================

// OBTENER TODAS LAS TAREAS
router.get('/', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    // Introspección del esquema
    const tExists = await tableExists('tareas_mantenimiento');
    if (!tExists) {
      return res.json({ success: true, tareas: [] });
    }
    const tCols = await getColumns('tareas_mantenimiento');
    const hasClienteId = tCols.has('cliente_id');
    const hasRevendedorId = tCols.has('revendedor_id');
    const hasTrabajadorId = tCols.has('trabajador_id');

  const selectParts = ['t.id'];
    const pushIf = (cond, frag) => { if (cond) selectParts.push(frag); };

    // Campos básicos si existen
    pushIf(hasRevendedorId, 't.revendedor_id');
    pushIf(hasClienteId, 't.cliente_id');
    pushIf(hasTrabajadorId, 't.trabajador_id');
    ['titulo','descripcion','prioridad','estado','fecha_asignacion','fecha_vencimiento','fecha_completado','notas','created_at','imagenes','es_abierta','accepted_at']
      .forEach(c => { if (tCols.has(c)) selectParts.push(`t.${c}`); });

    let joinClause = '';

    // Join revendedores (si corresponde)
    let rCols = new Set();
    const rExists = await tableExists('revendedores');
    if (rExists && hasRevendedorId) {
      joinClause += ' LEFT JOIN revendedores r ON t.revendedor_id = r.id';
      rCols = await getColumns('revendedores');
      const nameCandidates = [];
      if (rCols.has('responsable')) nameCandidates.push('r.responsable');
      if (rCols.has('nombre')) nameCandidates.push('r.nombre');
      if (rCols.has('nombre_negocio')) nameCandidates.push('r.nombre_negocio');
      if (nameCandidates.length === 1) selectParts.push(`${nameCandidates[0]} as nombre_revendedor`);
      else if (nameCandidates.length > 1) selectParts.push(`COALESCE(${nameCandidates.join(', ')}) as nombre_revendedor`);
      if (rCols.has('activo')) selectParts.push('r.activo as revendedor_activo');
      if (rCols.has('latitud')) selectParts.push('r.latitud as revendedor_latitud');
      if (rCols.has('longitud')) selectParts.push('r.longitud as revendedor_longitud');
      if (rCols.has('direccion')) selectParts.push('r.direccion as revendedor_direccion');
    }

    // Join clientes (solo si existe columna y tabla)
    let cCols = new Set();
    const cExists = hasClienteId && await tableExists('clientes');
    if (cExists) {
      joinClause += ' LEFT JOIN clientes c ON t.cliente_id = c.id';
      cCols = await getColumns('clientes');
      if (cCols.has('nombre_completo')) selectParts.push('c.nombre_completo as nombre_cliente');
      if (cCols.has('activo')) selectParts.push('c.activo as cliente_activo');
      if (cCols.has('latitud')) selectParts.push('c.latitud as cliente_latitud');
      if (cCols.has('longitud')) selectParts.push('c.longitud as cliente_longitud');
      if (cCols.has('direccion')) selectParts.push('c.direccion as cliente_direccion');
    }

    // destino_tipo y destino_nombre (solo si hay cliente_id en la tabla)
    if (hasClienteId) {
      selectParts.push(`CASE WHEN t.cliente_id IS NOT NULL THEN 'cliente' ELSE 'revendedor' END AS destino_tipo`);
      // Construir destino_nombre de forma segura
      const destParts = [];
      if (cExists && cCols.has('nombre_completo')) destParts.push('c.nombre_completo');
      const revNameCandidates = [];
      if (rCols.has('responsable')) revNameCandidates.push('r.responsable');
      if (rCols.has('nombre')) revNameCandidates.push('r.nombre');
      if (rCols.has('nombre_negocio')) revNameCandidates.push('r.nombre_negocio');
      if (revNameCandidates.length) destParts.push(`COALESCE(${revNameCandidates.join(', ')})`);
      if (destParts.length === 1) selectParts.push(`${destParts[0]} AS destino_nombre`);
      else if (destParts.length > 1) selectParts.push(`COALESCE(${destParts.join(', ')}) AS destino_nombre`);
    }

    // Trabajadores
    const tmExists = hasTrabajadorId && await tableExists('trabajadores_mantenimiento');
    let tmCols = new Set();
    if (tmExists) {
      joinClause += ' LEFT JOIN trabajadores_mantenimiento tm ON t.trabajador_id = tm.id';
      tmCols = await getColumns('trabajadores_mantenimiento');
      if (tmCols.has('nombre_completo')) selectParts.push('tm.nombre_completo as nombre_trabajador');
      if (tmCols.has('activo')) selectParts.push('tm.activo as trabajador_activo');
    }

    // Usuarios relacionados (opcional y seguro)
    const uExists = await tableExists('usuarios');
    if (uExists) {
      const uCols = await getColumns('usuarios');
      if (rExists && rCols.has('usuario_id')) {
        joinClause += ' LEFT JOIN usuarios u_revendedor ON r.usuario_id = u_revendedor.id';
        if (uCols.has('activo')) selectParts.push('u_revendedor.activo as usuario_revendedor_activo');
      }
      if (tmExists && tmCols.has('usuario_id')) {
        joinClause += ' LEFT JOIN usuarios u_trabajador ON tm.usuario_id = u_trabajador.id';
        if (uCols.has('activo')) selectParts.push('u_trabajador.activo as usuario_trabajador_activo');
      }
    }

    // ORDER BY seguro
    let orderClause = '';
    const parts = [];
    if (tCols.has('estado')) parts.push(`CASE t.estado WHEN 'Pendiente' THEN 1 ELSE 2 END`);
    if (tCols.has('prioridad')) parts.push(`CASE t.prioridad WHEN 'Urgente' THEN 1 WHEN 'Alta' THEN 2 WHEN 'Media' THEN 3 ELSE 4 END`);
    if (tCols.has('fecha_vencimiento')) parts.push('t.fecha_vencimiento ASC');
    if (parts.length) orderClause = ` ORDER BY ${parts.join(', ')}`;

    const sql = `SELECT ${selectParts.join(', ')} FROM tareas_mantenimiento t${joinClause}${orderClause}`;
    let tareas = await query(sql);
    tareas = tareas.map(t => {
      if('imagenes' in t && typeof t.imagenes === 'string'){
        try { t.imagenes = JSON.parse(t.imagenes) || []; } catch { t.imagenes = []; }
      }
      return t;
    });

    console.log(`📋 Consulta de tareas obtuvo ${tareas.length} resultados`);
    if (tareas.length > 0) {
      console.log('Primera tarea como ejemplo:', tareas[0]);
    }

    res.json({ success: true, tareas });
  } catch (error) {
    console.error('❌ ERROR al obtener tareas:', error);
    res.status(500).json({ success: false, error: 'Error interno del servidor al obtener tareas' });
  }
});

// CREAR NUEVA TAREA
router.post('/', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { revendedor_id, cliente_id, trabajador_id, titulo, descripcion, prioridad = 'Media', fecha_vencimiento, es_abierta = 0 } = req.body;

    console.log('📝 Datos recibidos para crear tarea:', { revendedor_id, cliente_id, trabajador_id, titulo, descripcion, prioridad, fecha_vencimiento });

    if ((!revendedor_id && !cliente_id) || !titulo || !descripcion || !fecha_vencimiento) {
      return res.status(400).json({ success: false, error: 'Faltan campos requeridos. Debe especificar revendedor_id o cliente_id, trabajador_id, título, descripción y fecha de vencimiento.' });
    }

    // Validar destino (revendedor o cliente)
    if (revendedor_id) {
      const revendedorExiste = await query(`
        SELECT r.id 
        FROM revendedores r 
        INNER JOIN usuarios u ON r.usuario_id = u.id 
        WHERE r.id = ? AND u.activo = 1
      `, [revendedor_id]);
      if (revendedorExiste.length === 0) {
        console.log('❌ Revendedor no encontrado o inactivo:', revendedor_id);
        return res.status(400).json({ success: false, error: 'El revendedor seleccionado no existe o está inactivo' });
      }
    } else if (cliente_id) {
      const clienteExiste = await query(`
        SELECT id FROM clientes WHERE id = ? AND tipo = 'servicio' AND activo = 1
      `, [cliente_id]);
      if (clienteExiste.length === 0) {
        console.log('❌ Cliente de servicio no encontrado o inactivo:', cliente_id);
        return res.status(400).json({ success: false, error: 'El cliente seleccionado no existe o no es de servicio/está inactivo' });
      }
    }

    // Validar que el trabajador existe y está activo (tanto en trabajadores_mantenimiento como en usuarios)
    let trabajadorExiste = [];
    if (!es_abierta) {
      trabajadorExiste = await query(`
      SELECT t.id, t.usuario_id, t.nombre_completo, u.username
      FROM trabajadores_mantenimiento t
      INNER JOIN usuarios u ON t.usuario_id = u.id
      WHERE t.id = ? AND t.activo = 1 AND u.activo = 1
    `, [trabajador_id]);

      if (trabajadorExiste.length === 0) {
        console.log('❌ Trabajador no encontrado o inactivo (verificando tabla trabajadores_mantenimiento Y usuarios):', trabajador_id);
        return res.status(400).json({ success: false, error: 'El trabajador seleccionado no existe o está inactivo' });
      }
      const usuarioIdTrabajador = trabajadorExiste[0].usuario_id;
      console.log('✅ Trabajador validado:', trabajadorExiste[0]);
      console.log('📋 Usuario ID del trabajador:', usuarioIdTrabajador);
    }

    // Introspección de columnas para construir INSERT seguro
    const tExists = await tableExists('tareas_mantenimiento');
    if (!tExists) {
      return res.status(503).json({ success: false, error: 'La tabla tareas_mantenimiento no existe. Ejecuta las migraciones.' });
    }
    const tCols = await getColumns('tareas_mantenimiento');
    const hasClienteId = tCols.has('cliente_id');
    const hasRevendedorId = tCols.has('revendedor_id');

    // Si se intenta crear para cliente pero el esquema no lo soporta
    if (cliente_id && !hasClienteId) {
      return res.status(400).json({
        success: false,
        error: 'El esquema actual no soporta tareas dirigidas a clientes (falta columna cliente_id). Ejecuta la migración correspondiente.'
      });
    }

    // Construir columnas y valores dinámicamente
    const cols = [];
    const vals = [];
    const placeholders = [];

  if (hasRevendedorId) { cols.push('revendedor_id'); vals.push(revendedor_id || null); placeholders.push('?'); }
  if (hasClienteId)   { cols.push('cliente_id');   vals.push(cliente_id || null);   placeholders.push('?'); }
  if (!es_abierta) { cols.push('trabajador_id'); vals.push(trabajador_id); placeholders.push('?'); }
    cols.push('titulo');        vals.push(titulo);        placeholders.push('?');
    cols.push('descripcion');   vals.push(descripcion);   placeholders.push('?');
    cols.push('prioridad');     vals.push(prioridad);     placeholders.push('?');
    cols.push('fecha_asignacion'); placeholders.push('CURDATE()'); // valor directo, no en vals
    cols.push('fecha_vencimiento'); vals.push(fecha_vencimiento); placeholders.push('?');
    cols.push('created_by');    vals.push(req.user?.id || 1); placeholders.push('?');
  if ((await getColumns('tareas_mantenimiento')).has('es_abierta')) { cols.push('es_abierta'); vals.push(es_abierta ? 1 : 0); placeholders.push('?'); }

    // Ajustar placeholders porque fecha_asignacion no es ?
    const ph = placeholders.map(p => p === 'CURDATE()' ? 'CURDATE()' : '?');
    const insertSql = `INSERT INTO tareas_mantenimiento (${cols.join(', ')}) VALUES (${ph.join(', ')})`;
    const result = await query(insertSql, vals);

    console.log('✅ Tarea creada exitosamente con ID:', result.insertId);
    
    // Verificar que se insertó correctamente
    if (result.insertId === 0 || !result.insertId) {
      console.error('❌ ERROR: El ID insertado es 0 o inválido. Resultado completo:', result);
      return res.status(500).json({ success: false, error: 'Error al crear la tarea - ID inválido' });
    }
    
  res.status(201).json({ success: true, message: 'Tarea creada exitosamente', tarea_id: result.insertId });
  // Broadcast
  bus.emit('broadcast', { type: 'tarea-creada', payload: { id: result.insertId, trabajador_id, titulo, prioridad, fecha_vencimiento } });
  } catch (error) {
    console.error('❌ ERROR al crear tarea:', error);
    res.status(500).json({ success: false, error: 'Error interno del servidor al crear la tarea.' });
  }
});

// ACTUALIZAR ESTADO DE TAREA (ADMIN/TRABAJADOR) CON IMÁGENES OPCIONALES
router.put('/:id/estado', authenticateToken, requireRole(['admin', 'trabajador']), uploadTareas.array('imagenes[]',3), async (req, res) => {
  try {
    const { id } = req.params;
    const { estado, notas = '' } = req.body;
    const files = req.files || [];

    if (!estado || !['Pendiente', 'Completado'].includes(estado)) {
      return res.status(400).json({ success: false, error: 'Estado inválido' });
    }

    const rows = await query('SELECT estado, fecha_completado, imagenes FROM tareas_mantenimiento WHERE id = ?', [id]);
    if(rows.length === 0) return res.status(404).json({ success:false, error:'Tarea no encontrada' });
    const current = rows[0];
    let existingImages = [];
    if(current.imagenes){ try { existingImages = JSON.parse(current.imagenes) || []; } catch { existingImages = []; } }

    let fechaCompletado = current.fecha_completado;
    const now = new Date();
    const within24h = fechaCompletado ? (now - new Date(fechaCompletado)) < 24*60*60*1000 : false;

    let newImages = [];
    if(files.length){
      if(files.length > 3) return res.status(400).json({ success:false, error:'Máximo 3 imágenes' });
      newImages = await processTaskImages(files);
    }

    let finalImages = existingImages;
    if(estado === 'Completado' && files.length){
      finalImages = newImages; // completando ahora con imágenes
    } else if(current.estado === 'Completado' && within24h && files.length){
      finalImages = newImages; // reemplazo dentro de ventana 24h
    }

    if(estado === 'Completado' && !fechaCompletado){
      fechaCompletado = now;
    } else if(estado !== 'Completado') {
      fechaCompletado = null;
    }

    await query(
      'UPDATE tareas_mantenimiento SET estado = ?, notas = ?, fecha_completado = ?, imagenes = ? WHERE id = ?',
      [estado, notas, fechaCompletado, JSON.stringify(finalImages), id]
    );

    const payload = { id: Number(id), estado, notas, fecha_completado: fechaCompletado, imagenes: finalImages };
    res.json({ success: true, message: 'Estado de tarea actualizado exitosamente', tarea: payload });

    bus.emit('broadcast', { type: 'tarea-actualizada', payload });
    if (estado === 'Completado') bus.emit('broadcast', { type: 'tarea-completada', payload });
  } catch (error) {
    console.error('Error al actualizar estado de tarea:', error);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
});

// ELIMINAR TAREA
router.delete('/:id', authenticateToken, requireRole(['admin']), async (req, res) => {
  const { id } = req.params;
  
  console.log(`🗑️ DELETE /api/tareas/${id} - Iniciando eliminación de tarea`);

  try {
      // Primero verificar que la tarea existe
      const tareaExiste = await query(`SELECT id, titulo FROM tareas_mantenimiento WHERE id = ?`, [id]);
      
      if (tareaExiste.length === 0) {
          console.log(`❌ Tarea con ID ${id} no encontrada`);
          return res.status(404).json({ success: false, message: 'Tarea no encontrada.' });
      }
      
      console.log(`📋 Tarea encontrada: "${tareaExiste[0].titulo}" - Procediendo a eliminar...`);
      
      const resultado = await query(`DELETE FROM tareas_mantenimiento WHERE id = ?`, [id]);
      
      if (resultado.affectedRows === 0) {
          console.log(`❌ No se pudo eliminar la tarea con ID ${id}`);
          return res.status(404).json({ success: false, message: 'No se pudo eliminar la tarea.' });
      }
      
      console.log(`✅ Tarea eliminada exitosamente - ID: ${id}, Filas afectadas: ${resultado.affectedRows}`);
      res.json({ success: true, message: 'Tarea eliminada exitosamente' });

  } catch (error) {
      console.error('❌ ERROR al eliminar tarea:', error);
      res.status(500).json({ success: false, message: 'Error interno del servidor al eliminar la tarea.' });
  }
});

// REASIGNAR TAREA
router.put('/:id/reasignar', authenticateToken, requireRole(['admin']), async (req, res) => {
  const { id } = req.params;
  const { nuevo_trabajador_id } = req.body;
  
  console.log(`🔄 PUT /api/tareas/${id}/reasignar - Reasignando tarea al trabajador ${nuevo_trabajador_id}`);

  try {
      // Verificar que el nuevo trabajador existe y está activo (tanto en trabajadores_mantenimiento como en usuarios)
      const trabajadorValido = await query(`
          SELECT t.id, t.usuario_id, t.nombre_completo, u.username
          FROM trabajadores_mantenimiento t
          INNER JOIN usuarios u ON t.usuario_id = u.id
          WHERE t.id = ? AND t.activo = 1 AND u.activo = 1
      `, [nuevo_trabajador_id]);

      if (trabajadorValido.length === 0) {
          return res.status(400).json({ 
              success: false, 
              message: 'El trabajador seleccionado no existe o está inactivo.' 
          });
      }

  const nuevoTrabajadorIdValido = trabajadorValido[0].id; // id en trabajadores_mantenimiento
  console.log('✅ Nuevo trabajador validado:', trabajadorValido[0]);
  console.log('📋 Nuevo trabajador tm.id:', nuevoTrabajadorIdValido, ' | usuario_id:', trabajadorValido[0].usuario_id);

      // Verificar que la tarea existe
      const tareaExiste = await query(`
          SELECT id, titulo 
          FROM tareas_mantenimiento 
          WHERE id = ?
      `, [id]);

      if (tareaExiste.length === 0) {
          return res.status(404).json({ 
              success: false, 
              message: 'Tarea no encontrada.' 
          });
      }

      // Reasignar la tarea
    const resultado = await query(`
      UPDATE tareas_mantenimiento 
      SET trabajador_id = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [nuevoTrabajadorIdValido, id]);
      
      if (resultado.affectedRows === 0) {
          return res.status(404).json({ success: false, message: 'No se pudo reasignar la tarea.' });
      }
      
      console.log(`✅ Tarea ${id} reasignada al trabajador ${trabajadorValido[0].nombre_completo}`);
      
      res.json({ 
          success: true, 
          message: `Tarea "${tareaExiste[0].titulo}" reasignada exitosamente a ${trabajadorValido[0].nombre_completo}` 
      });

  } catch (error) {
      console.error('❌ ERROR al reasignar tarea:', error);
      res.status(500).json({ success: false, message: 'Error interno del servidor al reasignar la tarea.' });
  }
});

// OBTENER MIS TAREAS (PARA TRABAJADORES)
router.get('/mis-tareas', authenticateToken, requireRole(['trabajador']), async (req, res) => {
  try {
    const usuarioId = req.user.id; // ID del usuario trabajador desde el token
    console.log(`🔍 Obteniendo tareas para trabajador con usuario ID: ${usuarioId}`);

    // Verificar que el usuario es un trabajador activo
    const trabajador = await query(`
      SELECT id, nombre_completo, especialidad FROM trabajadores_mantenimiento 
      WHERE usuario_id = ? AND activo = 1
    `, [usuarioId]);

    if (trabajador.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'No se encontró información del trabajador o está inactivo' 
      });
    }

    console.log(`✅ Trabajador validado: ${trabajador[0].nombre_completo}`);

    const trabajadorId = trabajador[0].id; // Usar el ID del trabajador, no del usuario
    console.log(`🔍 Buscando tareas para trabajador ID: ${trabajadorId}`);

    // Construcción dinámica segura según columnas existentes
    const tExists = await tableExists('tareas_mantenimiento');
    if (!tExists) {
      return res.json({ success: true, tareas: [] });
    }
    const tCols = await getColumns('tareas_mantenimiento');
    const hasClienteId = tCols.has('cliente_id');
    const hasRevendedorId = tCols.has('revendedor_id');
    const hasTrabajadorId = tCols.has('trabajador_id');
    if (!hasTrabajadorId) {
      return res.json({ success: true, tareas: [] });
    }

    const selectParts = ['t.id'];
    const pushIf = (cond, frag) => { if (cond) selectParts.push(frag); };

    // Campos base
    pushIf(hasRevendedorId, 't.revendedor_id');
    pushIf(hasClienteId, 't.cliente_id');
    pushIf(hasTrabajadorId, 't.trabajador_id');
    ['titulo','descripcion','prioridad','estado','fecha_asignacion','fecha_vencimiento','fecha_completado','notas','created_at','imagenes','es_abierta','accepted_at']
      .forEach(c => { if (tCols.has(c)) selectParts.push(`t.${c}`); });

    let joinClause = '';

    // Revendedores
    let rCols = new Set();
    const rExists = hasRevendedorId && await tableExists('revendedores');
    if (rExists) {
      joinClause += ' LEFT JOIN revendedores r ON t.revendedor_id = r.id';
      rCols = await getColumns('revendedores');
      const nameCandidates = [];
      if (rCols.has('responsable')) nameCandidates.push('r.responsable');
      if (rCols.has('nombre')) nameCandidates.push('r.nombre');
      if (rCols.has('nombre_negocio')) nameCandidates.push('r.nombre_negocio');
      if (nameCandidates.length === 1) selectParts.push(`${nameCandidates[0]} as nombre_revendedor`);
      else if (nameCandidates.length > 1) selectParts.push(`COALESCE(${nameCandidates.join(', ')}) as nombre_revendedor`);
      if (rCols.has('responsable')) selectParts.push('r.responsable as responsable_revendedor');
      if (rCols.has('telefono')) selectParts.push('r.telefono as telefono_revendedor');
  // Coordenadas/dirección para navegación
  if (rCols.has('latitud')) selectParts.push('r.latitud as revendedor_latitud');
  if (rCols.has('longitud')) selectParts.push('r.longitud as revendedor_longitud');
  if (rCols.has('direccion')) selectParts.push('r.direccion as revendedor_direccion');
    }

    // Clientes
    let cCols = new Set();
    const cExists = hasClienteId && await tableExists('clientes');
    if (cExists) {
      joinClause += ' LEFT JOIN clientes c ON t.cliente_id = c.id';
      cCols = await getColumns('clientes');
      if (cCols.has('nombre_completo')) selectParts.push('c.nombre_completo as nombre_cliente');
  // Coordenadas/dirección para navegación
  if (cCols.has('latitud')) selectParts.push('c.latitud as cliente_latitud');
  if (cCols.has('longitud')) selectParts.push('c.longitud as cliente_longitud');
  if (cCols.has('direccion')) selectParts.push('c.direccion as cliente_direccion');
    }

    // destino_tipo y nombre
    if (hasClienteId) {
      selectParts.push(`CASE WHEN t.cliente_id IS NOT NULL THEN 'cliente' ELSE 'revendedor' END AS destino_tipo`);
      const destParts = [];
      if (cExists && cCols.has('nombre_completo')) destParts.push('c.nombre_completo');
      const revNameCandidates = [];
      if (rCols.has('responsable')) revNameCandidates.push('r.responsable');
      if (rCols.has('nombre')) revNameCandidates.push('r.nombre');
      if (rCols.has('nombre_negocio')) revNameCandidates.push('r.nombre_negocio');
      if (revNameCandidates.length) destParts.push(`COALESCE(${revNameCandidates.join(', ')})`);
      if (destParts.length === 1) selectParts.push(`${destParts[0]} AS destino_nombre`);
      else if (destParts.length > 1) selectParts.push(`COALESCE(${destParts.join(', ')}) AS destino_nombre`);
    }

    // Trabajador info
    const tmExists = hasTrabajadorId && await tableExists('trabajadores_mantenimiento');
    let tmCols = new Set();
    if (tmExists) {
      joinClause += ' LEFT JOIN trabajadores_mantenimiento tm ON t.trabajador_id = tm.id';
      tmCols = await getColumns('trabajadores_mantenimiento');
      if (tmCols.has('nombre_completo')) selectParts.push('tm.nombre_completo as nombre_trabajador');
      if (tmCols.has('especialidad')) selectParts.push('tm.especialidad as especialidad_trabajador');
    }

    // Usuario creador (si columna existe)
    if (tCols.has('created_by') && await tableExists('usuarios')) {
      joinClause += ' LEFT JOIN usuarios u ON t.created_by = u.id';
      const uCols = await getColumns('usuarios');
      if (uCols.has('nombre_completo')) selectParts.push('u.nombre_completo as creado_por_nombre');
    }

    // ORDER BY
    const orderParts = [];
    if (tCols.has('estado')) orderParts.push(`CASE t.estado WHEN 'Pendiente' THEN 1 WHEN 'En Progreso' THEN 2 ELSE 3 END`);
    if (tCols.has('prioridad')) orderParts.push(`CASE t.prioridad WHEN 'Urgente' THEN 1 WHEN 'Alta' THEN 2 WHEN 'Media' THEN 3 ELSE 4 END`);
    if (tCols.has('fecha_vencimiento')) orderParts.push('t.fecha_vencimiento ASC');
    const orderClause = orderParts.length ? ` ORDER BY ${orderParts.join(', ')}` : '';

  // Tareas propias + abiertas (sin asignar) visibles para todos
  const whereOwn = 't.trabajador_id = ?';
  const whereOpen = tCols.has('es_abierta') ? ' OR (t.es_abierta = 1 AND (t.trabajador_id IS NULL OR t.trabajador_id = 0) AND (t.accepted_at IS NULL))' : '';
  const sql = `SELECT ${selectParts.join(', ')} FROM tareas_mantenimiento t${joinClause} WHERE (${whereOwn}${whereOpen})${orderClause}`;
  let tareas = await query(sql, [trabajadorId]);
    tareas = tareas.map(t => {
      if('imagenes' in t && typeof t.imagenes === 'string'){
        try { t.imagenes = JSON.parse(t.imagenes) || []; } catch { t.imagenes = []; }
      }
      return t;
    });

    console.log(`📋 ${tareas.length} tareas encontradas para el trabajador`);
    res.json({ success: true, tareas });

  } catch (error) {
    console.error('❌ ERROR al obtener mis tareas:', error);
    res.status(500).json({ success: false, error: 'Error interno del servidor al obtener tareas' });
  }
});

// OBTENER MIS TAREAS COMO REVENDEDOR
router.get('/mis-tareas-revendedor', authenticateToken, requireRole(['revendedor']), async (req, res) => {
  try {
    const usuarioId = req.user.id; // ID del usuario revendedor desde el token
    console.log(`🔍 Obteniendo tareas para revendedor con usuario ID: ${usuarioId}`);

    // Primero obtenemos el revendedor_id basado en el usuario_id
    const revendedor = await query(`
      SELECT id FROM revendedores WHERE usuario_id = ? AND activo = 1
    `, [usuarioId]);

    if (revendedor.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'No se encontró información del revendedor' 
      });
    }

    const revendedorId = revendedor[0].id;
    console.log(`🔍 Revendedor ID encontrado: ${revendedorId}`);

    // Construcción dinámica según esquema
    const tExists = await tableExists('tareas_mantenimiento');
    if (!tExists) return res.json({ success: true, tareas: [] });
    const tCols = await getColumns('tareas_mantenimiento');
    const hasClienteId = tCols.has('cliente_id');
    const hasRevendedorId = tCols.has('revendedor_id');
    const hasTrabajadorId = tCols.has('trabajador_id');
    if (!hasRevendedorId) return res.json({ success: true, tareas: [] });

    const selectParts = ['t.id'];
    const pushIf = (cond, frag) => { if (cond) selectParts.push(frag); };
    pushIf(hasRevendedorId, 't.revendedor_id');
    pushIf(hasClienteId, 't.cliente_id');
    pushIf(hasTrabajadorId, 't.trabajador_id');
    ['titulo','descripcion','prioridad','estado','fecha_asignacion','fecha_vencimiento','fecha_completado','notas','created_at','imagenes']
      .forEach(c => { if (tCols.has(c)) selectParts.push(`t.${c}`); });

    let joinClause = '';
    let rCols = new Set();
    if (hasRevendedorId && await tableExists('revendedores')) {
      joinClause += ' LEFT JOIN revendedores r ON t.revendedor_id = r.id';
      rCols = await getColumns('revendedores');
      const nameCandidates = [];
      if (rCols.has('responsable')) nameCandidates.push('r.responsable');
      if (rCols.has('nombre')) nameCandidates.push('r.nombre');
      if (rCols.has('nombre_negocio')) nameCandidates.push('r.nombre_negocio');
      if (nameCandidates.length === 1) selectParts.push(`${nameCandidates[0]} as nombre_revendedor`);
      else if (nameCandidates.length > 1) selectParts.push(`COALESCE(${nameCandidates.join(', ')}) as nombre_revendedor`);
  if (rCols.has('responsable')) selectParts.push('r.responsable as responsable_revendedor');
  if (rCols.has('telefono')) selectParts.push('r.telefono as telefono_revendedor');
  if (rCols.has('latitud')) selectParts.push('r.latitud as revendedor_latitud');
  if (rCols.has('longitud')) selectParts.push('r.longitud as revendedor_longitud');
  if (rCols.has('direccion')) selectParts.push('r.direccion as revendedor_direccion');
    }

    let cCols = new Set();
    const cExists = hasClienteId && await tableExists('clientes');
    if (cExists) {
      joinClause += ' LEFT JOIN clientes c ON t.cliente_id = c.id';
      cCols = await getColumns('clientes');
  if (cCols.has('nombre_completo')) selectParts.push('c.nombre_completo as nombre_cliente');
  if (cCols.has('latitud')) selectParts.push('c.latitud as cliente_latitud');
  if (cCols.has('longitud')) selectParts.push('c.longitud as cliente_longitud');
  if (cCols.has('direccion')) selectParts.push('c.direccion as cliente_direccion');
    }

    if (hasClienteId) {
      selectParts.push(`CASE WHEN t.cliente_id IS NOT NULL THEN 'cliente' ELSE 'revendedor' END AS destino_tipo`);
      const destParts = [];
      if (cExists && cCols.has('nombre_completo')) destParts.push('c.nombre_completo');
      const revNameCandidates = [];
      if (rCols.has('responsable')) revNameCandidates.push('r.responsable');
      if (rCols.has('nombre')) revNameCandidates.push('r.nombre');
      if (rCols.has('nombre_negocio')) revNameCandidates.push('r.nombre_negocio');
      if (revNameCandidates.length) destParts.push(`COALESCE(${revNameCandidates.join(', ')})`);
      if (destParts.length === 1) selectParts.push(`${destParts[0]} AS destino_nombre`);
      else if (destParts.length > 1) selectParts.push(`COALESCE(${destParts.join(', ')}) AS destino_nombre`);
    }

    if (hasTrabajadorId && await tableExists('trabajadores_mantenimiento')) {
      joinClause += ' LEFT JOIN trabajadores_mantenimiento tm ON t.trabajador_id = tm.id';
      const tmCols = await getColumns('trabajadores_mantenimiento');
      if (tmCols.has('nombre_completo')) selectParts.push('tm.nombre_completo as nombre_trabajador');
      if (tmCols.has('especialidad')) selectParts.push('tm.especialidad as especialidad_trabajador');
    }

    if (tCols.has('created_by') && await tableExists('usuarios')) {
      joinClause += ' LEFT JOIN usuarios u ON t.created_by = u.id';
      const uCols = await getColumns('usuarios');
      if (uCols.has('nombre_completo')) selectParts.push('u.nombre_completo as creado_por_nombre');
    }

    const orderParts = [];
    if (tCols.has('estado')) orderParts.push(`CASE t.estado WHEN 'Pendiente' THEN 1 WHEN 'En Progreso' THEN 2 WHEN 'Completado' THEN 3 ELSE 4 END`);
    if (tCols.has('prioridad')) orderParts.push(`CASE t.prioridad WHEN 'Urgente' THEN 1 WHEN 'Alta' THEN 2 WHEN 'Media' THEN 3 WHEN 'Baja' THEN 4 ELSE 5 END`);
    if (tCols.has('fecha_vencimiento')) orderParts.push('t.fecha_vencimiento ASC');
    if (tCols.has('created_at')) orderParts.push('t.created_at DESC');
  const orderClause = orderParts.length ? ` ORDER BY ${orderParts.join(', ')}` : '';

    const sql = `SELECT ${selectParts.join(', ')} FROM tareas_mantenimiento t${joinClause} WHERE t.revendedor_id = ?${orderClause}`;
  let tareas = await query(sql, [revendedorId]);
  tareas = tareas.map(t => { if('imagenes' in t && typeof t.imagenes === 'string'){ try { t.imagenes = JSON.parse(t.imagenes) || []; } catch { t.imagenes = []; } } return t; });

    console.log(`✅ Encontradas ${tareas.length} tareas para el revendedor`);
    
    res.json({ 
      success: true, 
      tareas 
    });

  } catch (error) {
    console.error('❌ ERROR al obtener mis tareas como revendedor:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error interno del servidor al obtener las tareas' 
    });
  }
});

// ACTUALIZAR ESTADO DE MI TAREA (PARA TRABAJADORES)
router.put('/mis-tareas/:id/estado', authenticateToken, requireRole(['trabajador']), uploadTareas.array('imagenes[]',3), async (req, res) => {
  try {
    const { id } = req.params;
    const { estado, notas } = req.body;
    const files = req.files || [];
    const usuarioId = req.user.id;

    console.log(`🔄 Actualizando estado de tarea ${id} a "${estado}" por usuario ${usuarioId}`);

    // Primero obtenemos el trabajador_id basado en el usuario_id
    const trabajador = await query(`
      SELECT id FROM trabajadores_mantenimiento WHERE usuario_id = ? AND activo = 1
    `, [usuarioId]);

    if (trabajador.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'No se encontró información del trabajador' 
      });
    }

    const trabajadorId = trabajador[0].id;

    // Verificar que la tarea pertenece al trabajador
    const tareaExiste = await query(`
      SELECT * FROM tareas_mantenimiento 
      WHERE id = ? AND trabajador_id = ?
    `, [id, trabajadorId]);

    if (tareaExiste.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Tarea no encontrada o no tienes permisos para modificarla' 
      });
    }

    // Estado previo para ventana 24h e imágenes
    const prev = tareaExiste[0];
    let existingImages = [];
    if(prev.imagenes){ try { existingImages = JSON.parse(prev.imagenes) || []; } catch { existingImages = []; } }
    let fechaCompletado = prev.fecha_completado;
    const now = new Date();
    const within24h = fechaCompletado ? (now - new Date(fechaCompletado)) < 24*60*60*1000 : false;

    let newImages = [];
    if(files.length){
      if(files.length > 3) return res.status(400).json({ success:false, error:'Máximo 3 imágenes' });
      newImages = await processTaskImages(files);
    }
    let finalImages = existingImages;
    if(estado === 'Completado' && files.length){
      finalImages = newImages;
    } else if(prev.estado === 'Completado' && within24h && files.length){
      finalImages = newImages;
    }

    if(estado === 'Completado' && !fechaCompletado){
      fechaCompletado = now;
    } else if(estado !== 'Completado') {
      fechaCompletado = null;
    }

    await query('UPDATE tareas_mantenimiento SET estado = ?, notas = ?, fecha_completado = ?, imagenes = ?, updated_at = NOW() WHERE id = ? AND trabajador_id = ?',
      [estado, notas || '', fechaCompletado, JSON.stringify(finalImages), id, trabajadorId]);

    console.log(`✅ Tarea ${id} actualizada a estado "${estado}"`);

    const payload = { id: Number(id), estado, notas: notas || null, fecha_completado: fechaCompletado, imagenes: finalImages };
    res.json({ success: true, message: `Tarea actualizada a estado "${estado}"`, tarea: payload });
    bus.emit('broadcast', { type: 'tarea-actualizada', payload });
    if (estado === 'Completado') bus.emit('broadcast', { type: 'tarea-completada', payload });

  } catch (error) {
    console.error('❌ ERROR al actualizar estado de mi tarea:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Error interno del servidor al actualizar la tarea' 
    });
  }
});

// ACEPTAR TAREA ABIERTA (PARA TRABAJADORES)
router.put('/mis-tareas/:id/aceptar', authenticateToken, requireRole(['trabajador']), async (req, res) => {
  try {
    const { id } = req.params;
    const usuarioId = req.user.id;

    // Obtener trabajador_id desde usuario y validar activo
    const trabajador = await query(`
      SELECT id FROM trabajadores_mantenimiento WHERE usuario_id = ? AND activo = 1
    `, [usuarioId]);
    if (trabajador.length === 0) {
      return res.status(404).json({ success: false, error: 'No se encontró información del trabajador o está inactivo' });
    }
    const trabajadorId = trabajador[0].id;

    // Aceptación atómica: solo si es abierta y no asignada aún
    const result = await query(`
      UPDATE tareas_mantenimiento
      SET trabajador_id = ?, accepted_at = NOW(), updated_at = NOW()
      WHERE id = ?
        AND es_abierta = 1
        AND (trabajador_id IS NULL OR trabajador_id = 0)
        AND accepted_at IS NULL
    `, [trabajadorId, id]);

    if (!result.affectedRows) {
      // Verificar causa específica
      const t = await query('SELECT id, es_abierta, trabajador_id, accepted_at FROM tareas_mantenimiento WHERE id = ?', [id]);
      if (!t.length) return res.status(404).json({ success: false, error: 'Tarea no encontrada' });
      return res.status(409).json({ success: false, error: 'La tarea ya fue aceptada por otro técnico o no es una tarea abierta' });
    }

    const rows = await query('SELECT * FROM tareas_mantenimiento WHERE id = ?', [id]);
    const tarea = rows[0];
    if (tarea && typeof tarea.imagenes === 'string') {
      try { tarea.imagenes = JSON.parse(tarea.imagenes) || []; } catch { tarea.imagenes = []; }
    }

    const payload = { id: Number(id), trabajador_id: trabajadorId, accepted_at: tarea?.accepted_at };
    bus.emit('broadcast', { type: 'tarea-aceptada', payload });
    res.json({ success: true, message: 'Tarea aceptada exitosamente', tarea });
  } catch (error) {
    console.error('❌ ERROR al aceptar tarea abierta:', error);
    res.status(500).json({ success: false, error: 'Error interno del servidor al aceptar la tarea' });
  }
});

// OBTENER MIS TAREAS (PARA CLIENTES DE SERVICIO)
router.get('/mis-tareas-cliente', authenticateToken, requireRole(['cliente']), async (req, res) => {
  try {
    const clienteId = req.user.cliente_id; // ID del cliente asociado al usuario
    if (!clienteId) {
      return res.status(400).json({ success: false, error: 'No hay cliente asociado a este usuario' });
    }

    // Introspección segura de esquema para evitar columnas inexistentes
    const tExists = await tableExists('tareas_mantenimiento');
    if (!tExists) return res.json({ success: true, tareas: [] });
    const tCols = await getColumns('tareas_mantenimiento');
    if (!tCols.has('cliente_id')) {
      // Sin relación cliente_id no hay forma de filtrar tareas por cliente
      return res.json({ success: true, tareas: [] });
    }
    const selectParts = [];

    // Siempre incluir columnas básicas existentes de tareas
  const tBasic = ['id','titulo','descripcion','prioridad','estado','fecha_asignacion','fecha_vencimiento','fecha_completado','notas','created_at','created_by','trabajador_id','cliente_id','imagenes'];
    tBasic.forEach(c => { if (tCols.has(c)) selectParts.push(`t.${c}`); });

    let joinClause = '';

    // Join clientes
    const cExists = await tableExists('clientes');
    let cCols = new Set();
    if (cExists) {
      joinClause += ' LEFT JOIN clientes c ON t.cliente_id = c.id';
      cCols = await getColumns('clientes');
      // Alias de nombre de cliente preferente
      if (cCols.has('nombre_completo')) selectParts.push('c.nombre_completo AS nombre_cliente');
      else if (cCols.has('nombre')) selectParts.push('c.nombre AS nombre_cliente');
      else if (cCols.has('razon_social')) selectParts.push('c.razon_social AS nombre_cliente');
      // Otros datos útiles
      if (cCols.has('telefono')) selectParts.push('c.telefono AS telefono_cliente');
      if (cCols.has('direccion')) selectParts.push('c.direccion AS direccion_cliente');
    }

    // Join trabajadores
  const tmExists = tCols.has('trabajador_id') && await tableExists('trabajadores_mantenimiento');
    let tmCols = new Set();
    if (tmExists) {
      joinClause += ' LEFT JOIN trabajadores_mantenimiento tm ON t.trabajador_id = tm.id';
      tmCols = await getColumns('trabajadores_mantenimiento');
      if (tmCols.has('nombre_completo')) selectParts.push('tm.nombre_completo AS nombre_trabajador');
      if (tmCols.has('especialidad')) selectParts.push('tm.especialidad AS especialidad_trabajador');
    }

    // Join usuarios (creado por)
  const uExists = tCols.has('created_by') && await tableExists('usuarios');
    let uCols = new Set();
    if (uExists) {
      joinClause += ' LEFT JOIN usuarios u ON t.created_by = u.id';
      uCols = await getColumns('usuarios');
      if (uCols.has('nombre_completo')) selectParts.push('u.nombre_completo AS creado_por_nombre');
      else if (uCols.has('username')) selectParts.push('u.username AS creado_por_nombre');
    }

    // ORDER BY seguro
    const orderParts = [];
    if (tCols.has('estado')) orderParts.push(`CASE t.estado WHEN 'Pendiente' THEN 1 WHEN 'En Progreso' THEN 2 WHEN 'Completado' THEN 3 ELSE 4 END`);
    if (tCols.has('prioridad')) orderParts.push(`CASE t.prioridad WHEN 'Urgente' THEN 1 WHEN 'Alta' THEN 2 WHEN 'Media' THEN 3 WHEN 'Baja' THEN 4 ELSE 5 END`);
    if (tCols.has('fecha_vencimiento')) orderParts.push('t.fecha_vencimiento ASC');
    if (tCols.has('created_at')) orderParts.push('t.created_at DESC');
    const orderClause = orderParts.length ? ` ORDER BY ${orderParts.join(', ')}` : '';

    const sql = `SELECT ${selectParts.join(', ')} FROM tareas_mantenimiento t${joinClause} WHERE t.cliente_id = ?${orderClause}`;
    if (process.env.NODE_ENV !== 'production') {
      console.log('[tareas] SQL mis-tareas-cliente:', sql);
    }
  let tareas = await query(sql, [clienteId]);
  tareas = tareas.map(t => { if('imagenes' in t && typeof t.imagenes === 'string'){ try { t.imagenes = JSON.parse(t.imagenes) || []; } catch { t.imagenes = []; } } return t; });

    res.json({ success: true, tareas });
  } catch (error) {
    console.error('❌ ERROR al obtener mis tareas como cliente:', error);
    res.status(500).json({ success: false, error: 'Error interno del servidor al obtener tareas' });
  }
});

export default router;
