import { db } from '../database.js';

async function run() {
  const conn = await db.getConnection();
  try {
    const [rows] = await conn.query("SELECT id, tipo, persona, monto, motivo, pagado, created_at FROM gastos WHERE tipo='' OR tipo IS NULL ORDER BY id DESC LIMIT 50");
    console.log('Filas con tipo vacío o NULL:', rows);
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    conn.release();
    process.exit(0);
  }
}
run();
