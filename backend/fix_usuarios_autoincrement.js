// Script para corregir AUTO_INCREMENT en tabla usuarios de forma segura
import { db } from './database.js';

async function fixUsuariosAutoIncrement() {
  try {
    console.log('🔧 === CORRIGIENDO AUTO_INCREMENT EN TABLA USUARIOS ===');
    
    // Verificar datos actuales
    console.log('\n📊 Verificando datos actuales en usuarios...');
    const [usuariosData] = await db.execute('SELECT id, username, role FROM usuarios ORDER BY id');
    
    console.log('Usuarios existentes:');
    usuariosData.forEach(user => {
      console.log(`  - ID: ${user.id}, Username: ${user.username}, Role: ${user.role}`);
    });
    
    const maxId = Math.max(...usuariosData.map(u => u.id));
    console.log(`\n📈 ID máximo encontrado: ${maxId}`);
    
    // Opción 1: Recrear la tabla con AUTO_INCREMENT
    console.log('\n🔄 Método 1: Recreando tabla temporal...');
    
    try {
      // Crear tabla temporal con AUTO_INCREMENT
      await db.execute(`
        CREATE TABLE usuarios_temp (
          id INT(11) NOT NULL AUTO_INCREMENT,
          username VARCHAR(50) NOT NULL,
          email VARCHAR(100) NOT NULL,
          password_hash VARCHAR(255) NOT NULL,
          nombre_completo VARCHAR(100) NOT NULL,
          tipo_usuario ENUM('admin','revendedor','trabajador') NOT NULL,
          revendedor_id INT(11) DEFAULT NULL,
          activo TINYINT(1) DEFAULT 1,
          ultimo_login TIMESTAMP NULL DEFAULT NULL,
          fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP(),
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP(),
          updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP() ON UPDATE CURRENT_TIMESTAMP(),
          telefono VARCHAR(20) DEFAULT NULL,
          role ENUM('admin','trabajador','revendedor') NOT NULL DEFAULT 'revendedor',
          especialidad VARCHAR(100) DEFAULT NULL,
          PRIMARY KEY (id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci AUTO_INCREMENT=${maxId + 1}
      `);
      console.log('✅ Tabla temporal creada');
      
      // Copiar datos manteniendo los IDs originales
      await db.execute(`
        INSERT INTO usuarios_temp (
          id, username, email, password_hash, nombre_completo, tipo_usuario,
          revendedor_id, activo, ultimo_login, fecha_creacion, created_at,
          updated_at, telefono, role, especialidad
        )
        SELECT 
          id, username, email, password_hash, nombre_completo, tipo_usuario,
          revendedor_id, activo, ultimo_login, fecha_creacion, created_at,
          updated_at, telefono, role, especialidad
        FROM usuarios
      `);
      console.log('✅ Datos copiados a tabla temporal');
      
      // Renombrar tablas
      await db.execute('RENAME TABLE usuarios TO usuarios_old, usuarios_temp TO usuarios');
      console.log('✅ Tablas renombradas');
      
      // Eliminar tabla antigua
      await db.execute('DROP TABLE usuarios_old');
      console.log('✅ Tabla antigua eliminada');
      
      // Verificar resultado
      const [newStatus] = await db.execute('SHOW TABLE STATUS LIKE "usuarios"');
      console.log(`✅ AUTO_INCREMENT configurado correctamente: ${newStatus[0].Auto_increment}`);
      
      console.log('\n🎉 ¡CORRECCIÓN COMPLETADA EXITOSAMENTE!');
      
    } catch (error) {
      console.error('❌ Error durante la corrección:', error);
      
      // Cleanup en caso de error
      try {
        await db.execute('DROP TABLE IF EXISTS usuarios_temp');
        console.log('🧹 Tabla temporal limpiada');
      } catch (cleanupError) {
        console.log('⚠️ Error en cleanup:', cleanupError.message);
      }
    }
    
  } catch (error) {
    console.error('❌ Error general:', error);
  } finally {
    process.exit(0);
  }
}

// Ejecutar el script
fixUsuariosAutoIncrement();
