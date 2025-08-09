// Script para corregir IDs y AUTO_INCREMENT en la tabla tipos_fichas
import { db } from './database.js';

async function fixTiposFichas() {
  try {
    console.log('🔧 === CORRIGIENDO TIPOS_FICHAS (IDs y AUTO_INCREMENT) ===');

    // 1) Mostrar datos actuales
    const [rows] = await db.execute('SELECT id, nombre, descripcion, duracion_horas, precio_venta, activo FROM tipos_fichas ORDER BY id');
    console.log('Tipos actuales:');
    rows.forEach(r => console.log(`  - id=${r.id} nombre="${r.nombre}" activo=${r.activo}`));

    // 2) Asegurar PRIMARY KEY en id
    try {
      const [pk] = await db.execute(`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
        WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'tipos_fichas'
        AND CONSTRAINT_NAME = 'PRIMARY'
      `);
      if (pk.length === 0) {
        await db.execute('ALTER TABLE tipos_fichas ADD PRIMARY KEY (id)');
        console.log('✅ PRIMARY KEY agregado en tipos_fichas');
      } else {
        console.log('✅ tipos_fichas ya tiene PRIMARY KEY');
      }
    } catch (e) {
      console.log('ℹ️ PRIMARY KEY ya existía o no fue necesario:', e.message);
    }

    // 3) Detectar IDs cero o duplicados
    const ids = rows.map(r => r.id);
    const duplicates = ids.filter((id, idx) => ids.indexOf(id) !== idx);
    const hasZero = ids.includes(0);

    // 4) Si hay duplicados o ceros, recrear tabla con AUTO_INCREMENT manteniendo datos
    if (duplicates.length > 0 || hasZero) {
      console.log('⚠️ Detectados IDs duplicados o en 0. Recreando tabla con AUTO_INCREMENT...');

      // Calcular próximo ID
      const maxId = ids.length ? Math.max(...ids) : 0;
      const nextId = isFinite(maxId) ? maxId + 1 : 1;

      // Crear tabla temporal con AUTO_INCREMENT
      await db.execute(`
        CREATE TABLE tipos_fichas_temp (
          id INT(11) NOT NULL AUTO_INCREMENT,
          nombre VARCHAR(100) NOT NULL,
          descripcion VARCHAR(255) DEFAULT NULL,
          duracion_horas INT(11) NOT NULL,
          precio_compra DECIMAL(10,2) NOT NULL DEFAULT 0,
          precio_venta DECIMAL(10,2) NOT NULL,
          activo TINYINT(1) NOT NULL DEFAULT 1,
          fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP(),
          fecha_actualizacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP() ON UPDATE CURRENT_TIMESTAMP(),
          PRIMARY KEY (id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci AUTO_INCREMENT=${nextId}
      `);

      // Insertar copiando datos; si hay ids 0 o duplicados, dejamos que AUTO_INCREMENT asigne nuevos
      for (const r of rows) {
        if (!r.id || r.id === 0 || duplicates.includes(r.id)) {
          // insertar sin id
          const [res] = await db.execute(
            'INSERT INTO tipos_fichas_temp (nombre, descripcion, duracion_horas, precio_compra, precio_venta, activo) VALUES (?, ?, ?, 0, ?, ?)',
            [r.nombre, r.descripcion || null, r.duracion_horas || 0, r.precio_venta || 0, r.activo || 1]
          );
          console.log(`  → Reasignado ${r.nombre} a id=${res.insertId}`);
        } else {
          // mantener id si es válido y único en temp
          await db.execute(
            'INSERT INTO tipos_fichas_temp (id, nombre, descripcion, duracion_horas, precio_compra, precio_venta, activo, fecha_creacion, fecha_actualizacion) VALUES (?, ?, ?, ?, 0, ?, ?, CURRENT_TIMESTAMP(), CURRENT_TIMESTAMP())',
            [r.id, r.nombre, r.descripcion || null, r.duracion_horas || 0, r.precio_venta || 0, r.activo || 1]
          );
        }
      }

      // Renombrar tablas de forma atómica
      await db.execute('RENAME TABLE tipos_fichas TO tipos_fichas_old, tipos_fichas_temp TO tipos_fichas');
      await db.execute('DROP TABLE tipos_fichas_old');
      console.log('✅ Tabla tipos_fichas recreada con AUTO_INCREMENT y datos saneados');
    } else {
      // 5) Asegurar AUTO_INCREMENT cuando no hay duplicados
      try {
        await db.execute('ALTER TABLE tipos_fichas MODIFY id INT(11) NOT NULL AUTO_INCREMENT');
        console.log('✅ AUTO_INCREMENT asegurado en tipos_fichas');
      } catch (e) {
        console.log('ℹ️ AUTO_INCREMENT ya estaba configurado:', e.message);
      }
    }

    // 6) Verificación final
    const [status] = await db.execute('SHOW TABLE STATUS LIKE "tipos_fichas"');
    console.log(`🔎 Siguiente AUTO_INCREMENT: ${status[0].Auto_increment}`);

    const [finalRows] = await db.execute('SELECT id, nombre FROM tipos_fichas ORDER BY id');
    console.log('Tipos finales:');
    finalRows.forEach(r => console.log(`  - id=${r.id} nombre="${r.nombre}"`));

    console.log('\n🎉 FIX COMPLETADO');
  } catch (error) {
    console.error('❌ Error en fixTiposFichas:', error);
  } finally {
    process.exit(0);
  }
}

fixTiposFichas();
