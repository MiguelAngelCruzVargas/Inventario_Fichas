import { db } from '../database.js';

async function run() {
  const conn = await db.getConnection();
  try {
    console.log('🔧 Aplicando migración de enum gastos.tipo...');
    await conn.beginTransaction();

    // Verificar estructura actual
    const [rows] = await conn.query("SHOW COLUMNS FROM gastos LIKE 'tipo'");
    const typeDef = rows?.[0]?.Type || '';
    console.log('Tipo actual:', typeDef);

    // Permitir valores intermedios y migrar
    await conn.query("ALTER TABLE gastos MODIFY COLUMN tipo ENUM('prestado','prestamos','viaticos','personales') NOT NULL");
    await conn.query("UPDATE gastos SET tipo='prestamos' WHERE tipo='prestado'");
    await conn.query("ALTER TABLE gastos MODIFY COLUMN tipo ENUM('prestamos','viaticos','personales') NOT NULL");

    await conn.commit();
    console.log('✅ Migración aplicada');
  } catch (e) {
    await conn.rollback();
    console.error('❌ Error aplicando migración:', e.message);
  } finally {
    conn.release();
    process.exit(0);
  }
}

run();
