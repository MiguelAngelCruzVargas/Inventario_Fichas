import { db } from '../database.js';

async function run() {
  const conn = await db.getConnection();
  try {
    const [rows] = await conn.query("SELECT id, CAST(tipo AS CHAR) AS tipo, LENGTH(CAST(tipo AS CHAR)) AS len, HEX(CAST(tipo AS CHAR)) AS hx, persona, monto FROM gastos ORDER BY id DESC LIMIT 50");
    console.log(rows);
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    conn.release();
    process.exit(0);
  }
}
run();
