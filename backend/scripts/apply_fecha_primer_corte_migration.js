// Migration: add fecha_primer_corte to clientes if missing
import { query } from '../database.js';

const log = (...a) => console.log('[migrate:clientes_primer_corte]', ...a);

async function columnExists(table, column) {
  const rows = await query(
    `SELECT COUNT(*) AS cnt FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [table, column]
  );
  return rows[0]?.cnt > 0;
}

async function indexExists(table, indexName) {
  const rows = await query(
    `SELECT COUNT(1) AS cnt FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ?`,
    [table, indexName]
  );
  return rows[0]?.cnt > 0;
}

async function run() {
  try {
    log('Starting migration...');

    const hasCol = await columnExists('clientes', 'fecha_primer_corte');
    if (!hasCol) {
      log('Adding column fecha_primer_corte...');
      await query(`ALTER TABLE clientes ADD COLUMN fecha_primer_corte DATE NULL AFTER fecha_instalacion`);
    } else {
      log('fecha_primer_corte already exists');
    }

    const hasIdx = await indexExists('clientes', 'idx_clientes_fecha_primer_corte');
    if (!hasIdx) {
      log('Creating index idx_clientes_fecha_primer_corte...');
      await query(`CREATE INDEX idx_clientes_fecha_primer_corte ON clientes (fecha_primer_corte)`);
    } else {
      log('Index idx_clientes_fecha_primer_corte already exists');
    }

    log('Migration complete.');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

run();
