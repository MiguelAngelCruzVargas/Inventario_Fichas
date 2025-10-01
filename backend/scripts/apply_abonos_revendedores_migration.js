// Migration: add abonos tracking for revendedores in cortes_caja
import { db, query } from '../database.js';

async function columnExists(table, column) {
  const rows = await query(
    `SELECT COUNT(*) AS c FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [table, column]
  );
  return rows?.[0]?.c > 0;
}

async function tableExists(table) {
  const rows = await query(
    `SELECT COUNT(*) AS c FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
    [table]
  );
  return rows?.[0]?.c > 0;
}

async function run() {
  try {
    console.log('🔧 Applying abonos for revendedores migration...');

    // Add columns on cortes_caja if missing
    const cols = [
      { name: 'monto_pagado_revendedor', ddl: 'ALTER TABLE cortes_caja ADD COLUMN monto_pagado_revendedor DECIMAL(10,2) NOT NULL DEFAULT 0' },
      { name: 'saldo_revendedor', ddl: 'ALTER TABLE cortes_caja ADD COLUMN saldo_revendedor DECIMAL(10,2) NOT NULL DEFAULT 0' },
      { name: 'estado_cobro', ddl: "ALTER TABLE cortes_caja ADD COLUMN estado_cobro ENUM('pendiente','parcial','saldado') DEFAULT 'pendiente'" }
    ];
    for (const c of cols) {
      const exists = await columnExists('cortes_caja', c.name);
      if (!exists) {
        console.log(`➡️ Adding column ${c.name}...`);
        await query(c.ddl);
      } else {
        console.log(`✅ Column ${c.name} already exists`);
      }
    }

    // Create cortes_caja_abonos if missing
    const hasTable = await tableExists('cortes_caja_abonos');
    if (!hasTable) {
      console.log('➡️ Creating table cortes_caja_abonos...');
      await query(`
        CREATE TABLE cortes_caja_abonos (
          id INT AUTO_INCREMENT PRIMARY KEY,
          corte_id INT NOT NULL,
          revendedor_id INT NULL,
          monto DECIMAL(10,2) NOT NULL,
          usuario_id INT NULL,
          nota VARCHAR(255) NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT fk_abono_corte FOREIGN KEY (corte_id) REFERENCES cortes_caja(id)
            ON DELETE CASCADE ON UPDATE CASCADE,
          INDEX idx_abonos_corte (corte_id),
          INDEX idx_abonos_revendedor (revendedor_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);
    } else {
      console.log('✅ Table cortes_caja_abonos already exists');
    }

    console.log('🎉 Migration completed');
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  } finally {
    try { await db.end(); } catch {}
  }
}

run();
