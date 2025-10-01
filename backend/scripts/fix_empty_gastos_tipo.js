import { db } from '../database.js';

async function run() {
  const conn = await db.getConnection();
  try {
    console.log('🔧 Corrigiendo filas con tipo vacío en gastos...');
    const [before] = await conn.query("SELECT COUNT(*) AS c FROM gastos WHERE tipo='' OR tipo IS NULL");
    console.log(`Filas a corregir: ${before[0].c}`);

    // Por defecto, asumimos que los registros vacíos fueron creados como 'prestamos'
    await conn.query("UPDATE gastos SET tipo='prestamos' WHERE tipo='' OR tipo IS NULL");

    const [after] = await conn.query("SELECT COUNT(*) AS c FROM gastos WHERE tipo='' OR tipo IS NULL");
    console.log(`Filas restantes con tipo vacío: ${after[0].c}`);
    console.log('✅ Corrección completada');
  } catch (e) {
    console.error('❌ Error corrigiendo gastos.tipo:', e.message);
  } finally {
    conn.release();
    process.exit(0);
  }
}

run();
