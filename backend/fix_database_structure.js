// Script para corregir la estructura de la base de datos
import { db } from './database.js';

async function fixDatabaseStructure() {
  try {
    console.log('🔧 === INICIANDO CORRECCIÓN DE ESTRUCTURA DE BASE DE DATOS ===');
    
    // Paso 1: Verificar IDs máximos actuales
    console.log('\n📊 Paso 1: Verificando IDs máximos actuales...');
    
    const [usuariosMax] = await db.execute('SELECT MAX(id) as max_id FROM usuarios');
    const [trabajadoresMax] = await db.execute('SELECT MAX(id) as max_id FROM trabajadores_mantenimiento');
    
    const maxUsuariosId = usuariosMax[0].max_id || 0;
    const maxTrabajadoresId = trabajadoresMax[0].max_id || 0;
    
    console.log(`  - MAX ID en usuarios: ${maxUsuariosId}`);
    console.log(`  - MAX ID en trabajadores_mantenimiento: ${maxTrabajadoresId}`);
    
    // Paso 2: Verificar estructura actual de las tablas
    console.log('\n🔍 Paso 2: Verificando estructura actual...');
    
    const [usuariosStructure] = await db.execute('SHOW CREATE TABLE usuarios');
    const [trabajadoresStructure] = await db.execute('SHOW CREATE TABLE trabajadores_mantenimiento');
    
    console.log('\n📋 Estructura actual de usuarios:');
    console.log(usuariosStructure[0]['Create Table']);
    
    console.log('\n📋 Estructura actual de trabajadores_mantenimiento:');
    console.log(trabajadoresStructure[0]['Create Table']);
    
    // Paso 3: Verificar si ya tienen PRIMARY KEY
    console.log('\n🔑 Paso 3: Verificando PRIMARY KEYs...');
    
    const [usuariosPK] = await db.execute(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
      WHERE TABLE_SCHEMA = 'inventario_fichas_wifi' 
      AND TABLE_NAME = 'usuarios' 
      AND CONSTRAINT_NAME = 'PRIMARY'
    `);
    
    const [trabajadoresPK] = await db.execute(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
      WHERE TABLE_SCHEMA = 'inventario_fichas_wifi' 
      AND TABLE_NAME = 'trabajadores_mantenimiento' 
      AND CONSTRAINT_NAME = 'PRIMARY'
    `);
    
    console.log(`  - usuarios tiene PRIMARY KEY: ${usuariosPK.length > 0 ? 'SÍ' : 'NO'}`);
    console.log(`  - trabajadores_mantenimiento tiene PRIMARY KEY: ${trabajadoresPK.length > 0 ? 'SÍ' : 'NO'}`);
    
    // Paso 4: Agregar PRIMARY KEYs si no existen
    console.log('\n🔨 Paso 4: Agregando PRIMARY KEYs...');
    
    if (usuariosPK.length === 0) {
      try {
        await db.execute('ALTER TABLE usuarios ADD PRIMARY KEY (id)');
        console.log('✅ PRIMARY KEY agregada a tabla usuarios');
      } catch (error) {
        console.log('⚠️ Error agregando PRIMARY KEY a usuarios (puede que ya exista):', error.message);
      }
    } else {
      console.log('✅ Tabla usuarios ya tiene PRIMARY KEY');
    }
    
    if (trabajadoresPK.length === 0) {
      try {
        await db.execute('ALTER TABLE trabajadores_mantenimiento ADD PRIMARY KEY (id)');
        console.log('✅ PRIMARY KEY agregada a tabla trabajadores_mantenimiento');
      } catch (error) {
        console.log('⚠️ Error agregando PRIMARY KEY a trabajadores_mantenimiento (puede que ya exista):', error.message);
      }
    } else {
      console.log('✅ Tabla trabajadores_mantenimiento ya tiene PRIMARY KEY');
    }
    
    // Paso 5: Configurar AUTO_INCREMENT
    console.log('\n🔢 Paso 5: Configurando AUTO_INCREMENT...');
    
    const nextUsuariosId = maxUsuariosId + 1;
    const nextTrabajadoresId = maxTrabajadoresId + 1;
    
    try {
      // Primero agregar AUTO_INCREMENT
      await db.execute(`ALTER TABLE usuarios MODIFY id INT(11) NOT NULL AUTO_INCREMENT`);
      console.log('✅ AUTO_INCREMENT agregado a usuarios');
      
      // Luego establecer el valor inicial
      await db.execute(`ALTER TABLE usuarios AUTO_INCREMENT = ${nextUsuariosId}`);
      console.log(`✅ AUTO_INCREMENT configurado en usuarios (siguiente ID: ${nextUsuariosId})`);
    } catch (error) {
      console.log('⚠️ Error configurando AUTO_INCREMENT en usuarios:', error.message);
    }
    
    try {
      // Primero agregar AUTO_INCREMENT
      await db.execute(`ALTER TABLE trabajadores_mantenimiento MODIFY id INT(11) NOT NULL AUTO_INCREMENT`);
      console.log('✅ AUTO_INCREMENT agregado a trabajadores_mantenimiento');
      
      // Luego establecer el valor inicial
      await db.execute(`ALTER TABLE trabajadores_mantenimiento AUTO_INCREMENT = ${nextTrabajadoresId}`);
      console.log(`✅ AUTO_INCREMENT configurado en trabajadores_mantenimiento (siguiente ID: ${nextTrabajadoresId})`);
    } catch (error) {
      console.log('⚠️ Error configurando AUTO_INCREMENT en trabajadores_mantenimiento:', error.message);
    }
    
    // Paso 6: Verificación final
    console.log('\n✅ Paso 6: Verificación final...');
    
    const [finalUsuarios] = await db.execute('SHOW TABLE STATUS LIKE "usuarios"');
    const [finalTrabajadores] = await db.execute('SHOW TABLE STATUS LIKE "trabajadores_mantenimiento"');
    
    console.log(`  - usuarios Auto_increment: ${finalUsuarios[0].Auto_increment}`);
    console.log(`  - trabajadores_mantenimiento Auto_increment: ${finalTrabajadores[0].Auto_increment}`);
    
    console.log('\n🎉 === CORRECCIÓN DE ESTRUCTURA COMPLETADA ===');
    
  } catch (error) {
    console.error('❌ Error durante la corrección:', error);
  } finally {
    process.exit(0);
  }
}

// Ejecutar el script
fixDatabaseStructure();
