// Archivo: routes/trabajadores.js
import express from 'express';
import bcrypt from 'bcryptjs';
import { query } from '../database.js';
import { authenticateToken, requireRole } from '../auth.js';

const router = express.Router();

console.log('📝 Registrando rutas de trabajadores...');
console.log('✅ POST /api/trabajadores - Crear trabajador');
console.log('✅ PUT /api/trabajadores/:id - Actualizar trabajador');
console.log('✅ DELETE /api/trabajadores/:id - Eliminar trabajador');

// ==================================================
// RUTA PARA CREAR UN NUEVO TRABAJADOR (Y SU USUARIO ASOCIADO)
// ==================================================
router.post('/', authenticateToken, requireRole(['admin']), async (req, res) => {
    const { username, password, nombre_completo, email, telefono, especialidad, active } = req.body;

    // Validación básica
    if (!username || !password || !nombre_completo) {
        return res.status(400).json({ success: false, message: 'Nombre de usuario, contraseña y nombre completo son requeridos.' });
    }

    try {
        console.log('🔍 Datos recibidos para crear trabajador:', { username, email, nombre_completo, telefono, especialidad, active });
        
        // --- Paso 1: Crear el registro en la tabla `usuarios` ---
        const passwordHash = await bcrypt.hash(password, 10);
        
        // Manejar campos que pueden ser null/undefined - ASEGURAR que email nunca sea null
        let emailFinal;
        if (email && typeof email === 'string' && email.trim() !== '') {
            emailFinal = email.trim();
        } else {
            emailFinal = `${username}@empresa.com`;
        }
        
        const telefonoFinal = (telefono && telefono.trim() !== '') ? telefono.trim() : null;
        const activoFinal = active !== undefined ? active : true;
        
        console.log('🔧 Valores finales para inserción:', { 
            username, 
            emailFinal, 
            telefonoFinal, 
            activoFinal,
            nombre_completo 
        });
        
        const usuarioResult = await query(
            `INSERT INTO usuarios (username, password_hash, nombre_completo, email, telefono, tipo_usuario, activo) VALUES (?, ?, ?, ?, ?, 'trabajador', ?)`,
            [username, passwordHash, nombre_completo, emailFinal, telefonoFinal, activoFinal]
        );

        const nuevoUsuarioId = usuarioResult.insertId;
        console.log(`✅ Usuario creado con ID: ${nuevoUsuarioId}`);

        // --- Paso 2: Crear el registro en la tabla `trabajadores_mantenimiento` ---
        // IMPORTANTE: Esta tabla NO tiene password, solo datos específicos del trabajador
        // Asegurar que especialidad nunca sea null
        let especialidadFinal;
        if (especialidad && typeof especialidad === 'string' && especialidad.trim() !== '') {
            especialidadFinal = especialidad.trim();
        } else {
            especialidadFinal = 'General';
        }
        
        console.log('🔧 Especialidad final para inserción:', especialidadFinal);
        
        const trabajadorResult = await query(
            `INSERT INTO trabajadores_mantenimiento (id, nombre_completo, especialidad, email, username, activo) VALUES (?, ?, ?, ?, ?, ?)`,
            [nuevoUsuarioId, nombre_completo, especialidadFinal, emailFinal, username, activoFinal]
        );
        
        console.log(`✅ Trabajador de mantenimiento creado con ID: ${trabajadorResult.insertId}`);

        res.status(201).json({ 
            success: true, 
            message: 'Trabajador creado exitosamente',
            data: {
                id: nuevoUsuarioId,
                username: username
            }
        });

    } catch (error) {
        console.error('❌ ERROR al crear trabajador:', error);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ success: false, message: 'El nombre de usuario o el email ya existen.' });
        }
        res.status(500).json({ success: false, message: 'Error interno del servidor al crear el trabajador.' });
    }
});

// ==================================================
// OTRAS RUTAS (PUT, DELETE) - A implementar en el futuro
// ==================================================

// Actualizar un trabajador
router.put('/:id', authenticateToken, requireRole(['admin']), async (req, res) => {
    const { id } = req.params;
    const { username, password, nombre_completo, email, telefono, especialidad, active } = req.body;

    try {
        // Manejar campos que pueden ser null/undefined
        let emailFinal;
        if (email && typeof email === 'string' && email.trim() !== '') {
            emailFinal = email.trim();
        } else {
            emailFinal = `${username}@empresa.com`;
        }
        
        const telefonoFinal = (telefono && telefono.trim() !== '') ? telefono.trim() : null;
        const activoFinal = active !== undefined ? active : true;
        
        // Asegurar que especialidad nunca sea null
        let especialidadFinal;
        if (especialidad && typeof especialidad === 'string' && especialidad.trim() !== '') {
            especialidadFinal = especialidad.trim();
        } else {
            especialidadFinal = 'General';
        }

        // --- Paso 1: Actualizar en la tabla `usuarios` ---
        let updateQuery = `UPDATE usuarios SET username = ?, nombre_completo = ?, email = ?, telefono = ?, activo = ?`;
        let params = [username, nombre_completo, emailFinal, telefonoFinal, activoFinal];

        // Si se proporciona una nueva contraseña, también la actualizamos
        if (password && password.trim() !== '') {
            const passwordHash = await bcrypt.hash(password, 10);
            updateQuery += `, password_hash = ?`;
            params.push(passwordHash);
        }

        updateQuery += ` WHERE id = ?`;
        params.push(id);

        await query(updateQuery, params);
        console.log(`✅ Usuario actualizado con ID: ${id}`);

        // --- Paso 2: Actualizar en la tabla `trabajadores_mantenimiento` ---
        await query(
            `UPDATE trabajadores_mantenimiento SET nombre_completo = ?, especialidad = ?, email = ?, username = ?, activo = ? WHERE id = ?`,
            [nombre_completo, especialidadFinal, emailFinal, username, activoFinal, id]
        );
        
        console.log(`✅ Trabajador de mantenimiento actualizado con ID: ${id}`);

        res.json({ 
            success: true, 
            message: 'Trabajador actualizado exitosamente'
        });

    } catch (error) {
        console.error('❌ ERROR al actualizar trabajador:', error);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ success: false, message: 'El nombre de usuario o el email ya existen.' });
        }
        res.status(500).json({ success: false, message: 'Error interno del servidor al actualizar el trabajador.' });
    }
});

// Eliminar (desactivar) un trabajador
router.delete('/:id', authenticateToken, requireRole(['admin']), async (req, res) => {
    const { id } = req.params;
    
    console.log(`🗑️ DELETE /api/trabajadores/${id} - Iniciando eliminación de trabajador`);

    try {
        // --- Eliminar en cascada: tareas, trabajador, usuario ---
        console.log(`🔄 Eliminando tareas asignadas al trabajador con ID: ${id}`);
        const tareasResult = await query(`DELETE FROM tareas_mantenimiento WHERE trabajador_id = ?`, [id]);
        console.log(`✅ ${tareasResult.affectedRows} tareas eliminadas`);
        
        console.log(`🔄 Eliminando trabajador en tabla trabajadores_mantenimiento con ID: ${id}`);
        await query(`DELETE FROM trabajadores_mantenimiento WHERE id = ?`, [id]);
        
        console.log(`🔄 Eliminando usuario en tabla usuarios con ID: ${id}`);
        await query(`DELETE FROM usuarios WHERE id = ?`, [id]);
        
        console.log(`✅ Trabajador eliminado completamente con ID: ${id}`);

        res.json({ 
            success: true, 
            message: 'Trabajador eliminado exitosamente'
        });

    } catch (error) {
        console.error('❌ ERROR al eliminar trabajador:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor al eliminar el trabajador.' });
    }
});


export default router;
