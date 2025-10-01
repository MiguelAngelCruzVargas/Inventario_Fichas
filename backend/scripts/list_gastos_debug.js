import { db } from '../database.js';

async function run() {
  const conn = await db.getConnection();
  try {
    const [rows] = await conn.query("SELECT id, CAST(tipo AS CHAR) AS tipo, persona, monto, motivo, pagado, created_at FROM gastos ORDER BY id DESC LIMIT 20");
    console.log('Últimos 20 gastos:');
    for (const r of rows) {
      console.log(`#${r.id} tipo='${r.tipo}' persona='${r.persona}' monto=${r.monto} pagado=${r.pagado} fecha=${r.created_at}`);
    }
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    conn.release();
    process.exit(0);
  }
}
run();
