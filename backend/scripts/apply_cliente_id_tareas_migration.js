// Migration: add cliente_id to tareas_mantenimiento if missing
import { query } from '../database.js';

const log = (...a) => console.log('[migrate:tareas_cliente_id]', ...a);

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

async function fkExists(table, constraintName) {
  const rows = await query(
    `SELECT COUNT(1) AS cnt FROM information_schema.REFERENTIAL_CONSTRAINTS WHERE CONSTRAINT_SCHEMA = DATABASE() AND CONSTRAINT_NAME = ?`,
    [constraintName]
  );
  return rows[0]?.cnt > 0;
}

async function run() {
  try {
    log('Starting migration...');

    const hasCol = await columnExists('tareas_mantenimiento', 'cliente_id');
    if (!hasCol) {
      log('Adding column cliente_id ...');
      await query(`ALTER TABLE tareas_mantenimiento ADD COLUMN cliente_id INT NULL AFTER revendedor_id`);
    } else {
      log('cliente_id already exists');
    }

    const hasIdx = await indexExists('tareas_mantenimiento', 'idx_tareas_cliente');
    if (!hasIdx) {
      log('Creating index idx_tareas_cliente ...');
      await query(`CREATE INDEX idx_tareas_cliente ON tareas_mantenimiento (cliente_id)`);
    } else {
      log('Index idx_tareas_cliente already exists');
    }

    // Add FK if not present
    const hasFk = await fkExists('tareas_mantenimiento', 'fk_tareas_cliente');
    if (!hasFk) {
      log('Adding foreign key fk_tareas_cliente ...');
      await query(`ALTER TABLE tareas_mantenimiento ADD CONSTRAINT fk_tareas_cliente FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE SET NULL`);
    } else {
      log('Foreign key fk_tareas_cliente already exists');
    }

    log('Migration complete.');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

run();
