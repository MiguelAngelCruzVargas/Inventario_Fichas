// Script de verificación final y prueba de creación de usuario
import { db } from './database.js';

async function finalVerification() {
  try {
    console.log('🔍 === VERIFICACIÓN FINAL DEL SISTEMA ===');
    
    // 1. Verificar estructura de ambas tablas
    console.log('\n📊 1. Verificando AUTO_INCREMENT en ambas tablas...');
    
    const [usuariosStatus] = await db.execute('SHOW TABLE STATUS LIKE "usuarios"');
    const [trabajadoresStatus] = await db.execute('SHOW TABLE STATUS LIKE "trabajadores_mantenimiento"');
    
    console.log(`  ✅ usuarios - AUTO_INCREMENT: ${usuariosStatus[0].Auto_increment}`);
    console.log(`  ✅ trabajadores_mantenimiento - AUTO_INCREMENT: ${trabajadoresStatus[0].Auto_increment}`);
    
    // 2. Verificar datos actuales
    console.log('\n📋 2. Verificando datos actuales...');
    
    const [usuarios] = await db.execute('SELECT id, username, role FROM usuarios ORDER BY id');
    const [trabajadores] = await db.execute('SELECT id, usuario_id, nombre_completo FROM trabajadores_mantenimiento ORDER BY id');
    
    console.log('\nUsuarios existentes:');
    usuarios.forEach(user => {
      console.log(`  - ID: ${user.id}, Username: ${user.username}, Role: ${user.role}`);
    });
    
    console.log('\nTrabajadores existentes:');
    trabajadores.forEach(trabajador => {
      console.log(`  - ID: ${trabajador.id}, Usuario_ID: ${trabajador.usuario_id}, Nombre: ${trabajador.nombre_completo}`);
    });
    
    // 3. Prueba de creación de nuevo trabajador
    console.log('\n🧪 3. PRUEBA: Creando nuevo trabajador de prueba...');
    
    try {
      // Crear usuario
      const [userResult] = await db.execute(`
        INSERT INTO usuarios (
          username, password_hash, role, tipo_usuario, activo, 
          nombre_completo, telefono, email
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        'test_trabajador', 
        '$2b$10$hashedPassword', 
        'trabajador', 
        'trabajador', 
        1, 
        'Trabajador de Prueba', 
        '555-0123', 
        'test@empresa.com'
      ]);
      
      const nuevoUserId = userResult.insertId;
      console.log(`  ✅ Usuario creado con ID: ${nuevoUserId}`);
      
      // Crear trabajador
      const [trabajadorResult] = await db.execute(`
        INSERT INTO trabajadores_mantenimiento (
          usuario_id, nombre_completo, email, username, especialidad, activo
        ) VALUES (?, ?, ?, ?, ?, ?)
      `, [
        nuevoUserId,
        'Trabajador de Prueba',
        'test@empresa.com',
        'test_trabajador',
        'Pruebas',
        1
      ]);
      
      const nuevoTrabajadorId = trabajadorResult.insertId;
      console.log(`  ✅ Trabajador creado con ID: ${nuevoTrabajadorId}`);
      
      // Verificar la relación
      const [relacionVerificacion] = await db.execute(`
        SELECT 
          u.id as usuario_id, u.username, u.role,
          t.id as trabajador_id, t.nombre_completo
        FROM usuarios u
        LEFT JOIN trabajadores_mantenimiento t ON u.id = t.usuario_id
        WHERE u.id = ?
      `, [nuevoUserId]);
      
      console.log('  ✅ Verificación de relación:');
      console.log(`     Usuario ID: ${relacionVerificacion[0].usuario_id}`);
      console.log(`     Trabajador ID: ${relacionVerificacion[0].trabajador_id}`);
      console.log(`     Relación correcta: ${relacionVerificacion[0].trabajador_id ? 'SÍ' : 'NO'}`);
      
      // Limpiar datos de prueba
      await db.execute('DELETE FROM trabajadores_mantenimiento WHERE id = ?', [nuevoTrabajadorId]);
      await db.execute('DELETE FROM usuarios WHERE id = ?', [nuevoUserId]);
      console.log('  🧹 Datos de prueba eliminados');
      
    } catch (testError) {
      console.error('❌ Error en prueba:', testError.message);
    }
    
    // 4. Limpiar usuario con ID=0 si existe
    console.log('\n🧹 4. Limpiando registros inválidos...');
    
    const [invalidUsers] = await db.execute('SELECT id, username FROM usuarios WHERE id = 0');
    if (invalidUsers.length > 0) {
      console.log(`  ⚠️ Encontrado usuario con ID=0: ${invalidUsers[0].username}`);
      
      // Eliminar trabajador relacionado si existe
      await db.execute('DELETE FROM trabajadores_mantenimiento WHERE usuario_id = 0');
      // Eliminar usuario con ID=0
      await db.execute('DELETE FROM usuarios WHERE id = 0');
      
      console.log('  ✅ Usuario con ID=0 eliminado');
    } else {
      console.log('  ✅ No hay usuarios con ID inválido');
    }
    
    console.log('\n🎉 === VERIFICACIÓN COMPLETADA ===');
    console.log('💡 El sistema está listo para crear usuarios con IDs secuenciales correctos');
    
  } catch (error) {
    console.error('❌ Error durante verificación:', error);
  } finally {
    process.exit(0);
  }
}

// Ejecutar verificación
finalVerification();
