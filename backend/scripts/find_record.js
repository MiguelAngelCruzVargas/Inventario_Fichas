#!/usr/bin/env node
/**
 * Busca un valor (cadena o número) en todas las tablas de la base de datos configurada.
 * Uso:
 *   node scripts/find_record.js "texto"
 *   npm run find:record -- "texto"
 *
 * Hace búsqueda LIKE en columnas tipo texto y comparación exacta en columnas numéricas si el valor es numérico.
 * Limita resultados por tabla para evitar explosión (LIMIT 50). Ajusta si necesitas más.
 */
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const DB = process.env.DB_NAME || 'inventario_fichas_wifi';
const term = process.argv.slice(2).join(' ').trim();
if (!term) {
  console.error('❌ Debes indicar el valor a buscar. Ej: node scripts/find_record.js "Juan"');
  process.exit(1);
}

const isNumeric = /^\d+(\.\d+)?$/.test(term);

const pool = await mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: DB,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: 'utf8mb4'
});

console.log(`🔎 Buscando "${term}" en base de datos ${DB} ...`);

try {
  const [tables] = await pool.query(
    'SELECT table_name FROM information_schema.tables WHERE table_schema = ? ORDER BY table_name',
    [DB]
  );
  for (const t of tables) {
    const table = t.table_name;
    // Columnas de la tabla
    const [cols] = await pool.query(
      'SELECT column_name, data_type FROM information_schema.columns WHERE table_schema=? AND table_name=?',
      [DB, table]
    );
    if (!cols.length) continue;
    const likeCols = cols.filter(c => /char|text|blob|enum|set/i.test(c.data_type)).map(c => c.column_name);
    const numCols = isNumeric ? cols.filter(c => /int|decimal|double|float|bigint|smallint|tinyint/i.test(c.data_type)).map(c => c.column_name) : [];

    const conditions = [];
    const params = [];
    if (likeCols.length) {
      const likeClause = likeCols.map(c => `${mysql.escapeId(c)} LIKE ?`).join(' OR ');
      likeCols.forEach(()=>params.push(`%${term}%`));
      conditions.push(`(${likeClause})`);
    }
    if (isNumeric && numCols.length) {
      const eqClause = numCols.map(c => `${mysql.escapeId(c)} = ?`).join(' OR ');
      numCols.forEach(()=>params.push(term));
      conditions.push(`(${eqClause})`);
    }
    if (!conditions.length) continue;
    const where = conditions.join(' OR ');
    const sql = `SELECT * FROM ${mysql.escapeId(table)} WHERE ${where} LIMIT 50`;
    try {
      const [rows] = await pool.query(sql, params);
      if (rows.length) {
        console.log(`\n📌 Tabla: ${table} · Resultados: ${rows.length}`);
        // Mostrar primeras 3 filas abreviadas
        rows.slice(0,3).forEach((r,i)=>{
          const preview = Object.entries(r).slice(0,8).map(([k,v])=>`${k}=${v}`).join(', ');
            console.log(`  #${i+1}: ${preview}${Object.keys(r).length>8?' …':''}`);
        });
        if (rows.length > 3) console.log('  ...');
      }
    } catch (e) {
      console.error(`Error consultando ${table}:`, e.message);
    }
  }
  console.log('\n✅ Búsqueda finalizada');
} catch (e) {
  console.error('Error global:', e);
} finally {
  await pool.end();
}
