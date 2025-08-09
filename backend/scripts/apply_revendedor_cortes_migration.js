// Migration: add revendedor_id and revendedor_nombre to cortes_caja and backfill
import { query } from '../database.js';

const log = (...a) => console.log('[migrate:cortes_caja]', ...a);

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

    const hasId = await columnExists('cortes_caja', 'revendedor_id');
    const hasNombre = await columnExists('cortes_caja', 'revendedor_nombre');

    if (!hasId) {
      log('Adding column revendedor_id...');
      await query(`ALTER TABLE cortes_caja ADD COLUMN revendedor_id INT NULL`);
    } else {
      log('revendedor_id already exists');
    }

    if (!hasNombre) {
      log('Adding column revendedor_nombre...');
      await query(`ALTER TABLE cortes_caja ADD COLUMN revendedor_nombre VARCHAR(255) NULL`);
    } else {
      log('revendedor_nombre already exists');
    }

    const hasIdx = await indexExists('cortes_caja', 'idx_cortes_revendedor');
    if (!hasIdx) {
      log('Creating index idx_cortes_revendedor...');
      await query(`CREATE INDEX idx_cortes_revendedor ON cortes_caja (revendedor_id)`);
    } else {
      log('Index idx_cortes_revendedor already exists');
    }

    log('Backfilling from observaciones when possible...');
    const affected = await query(`
      UPDATE cortes_caja c
      JOIN revendedores r
        ON (c.revendedor_id IS NULL)
       AND (
            (c.observaciones IS NOT NULL AND c.observaciones LIKE CONCAT('%', r.nombre_negocio, '%'))
         OR (c.observaciones IS NOT NULL AND c.observaciones LIKE CONCAT('%', r.nombre, '%'))
       )
      SET c.revendedor_id = r.id,
          c.revendedor_nombre = COALESCE(r.nombre_negocio, r.nombre)
    `);
    log('Backfill result:', affected?.affectedRows ?? 0, 'rows updated');

    log('Migration complete.');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

run();
