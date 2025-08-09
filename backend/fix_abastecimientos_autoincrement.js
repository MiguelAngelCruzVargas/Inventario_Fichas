// Script para asegurar AUTO_INCREMENT en la tabla 'abastecimientos'
import { db } from './database.js';

async function fixAbastecimientos() {
  try {
    console.log('🔧 === CORRIGIENDO ABASTECIMIENTOS (AUTO_INCREMENT) ===');

    // 1) Checar si la columna id ya es AUTO_INCREMENT
    const [cols] = await db.execute(`
      SELECT EXTRA, COLUMN_KEY
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'abastecimientos' AND COLUMN_NAME = 'id'
    `);

    if (!cols || cols.length === 0) {
      console.log('❌ La tabla abastecimientos o la columna id no existe');
      process.exit(1);
    }

    const isAuto = (cols[0].EXTRA || '').toLowerCase().includes('auto_increment');
    const isPK = (cols[0].COLUMN_KEY || '').toUpperCase() === 'PRI';
    console.log(`ℹ️ Estado actual -> PK: ${isPK}, AUTO_INCREMENT: ${isAuto}`);

    if (!isPK) {
      // Asegurar PK
      try {
        await db.execute('ALTER TABLE abastecimientos ADD PRIMARY KEY (id)');
        console.log('✅ PRIMARY KEY agregado en abastecimientos');
      } catch (e) {
        console.log('ℹ️ PRIMARY KEY ya existía o no fue necesario:', e.message);
      }
    }

    if (!isAuto) {
      console.log('🛠️ Habilitando AUTO_INCREMENT en abastecimientos.id ...');
      // Habilitar AUTO_INCREMENT
      await db.execute('ALTER TABLE abastecimientos MODIFY id INT(11) NOT NULL AUTO_INCREMENT');
      console.log('✅ AUTO_INCREMENT habilitado');
    }

    // 2) Ajustar el siguiente AUTO_INCREMENT
    const [maxRows] = await db.execute('SELECT COALESCE(MAX(id), 0) AS maxId FROM abastecimientos');
    const nextId = (maxRows[0]?.maxId || 0) + 1;
    await db.execute(`ALTER TABLE abastecimientos AUTO_INCREMENT = ${nextId}`);
    console.log(`🔎 Siguiente AUTO_INCREMENT establecido en ${nextId}`);

    // 3) Mostrar muestra del top 5
    const [rows] = await db.execute('SELECT id, tipo_ficha_id, cantidad, proveedor FROM abastecimientos ORDER BY id ASC LIMIT 5');
    console.log('📋 Muestra (primeros 5 registros):');
    rows.forEach(r => console.log(`  - id=${r.id} tipo=${r.tipo_ficha_id} cant=${r.cantidad} prov=${r.proveedor || '-'} `));

    console.log('\n🎉 FIX COMPLETADO');
  } catch (error) {
    console.error('❌ Error en fixAbastecimientos:', error);
  } finally {
    process.exit(0);
  }
}

fixAbastecimientos();
