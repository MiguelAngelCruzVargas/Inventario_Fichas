// scripts/export_dataset_poc.js - POC offline
// Uso: node ./scripts/export_dataset_poc.js --include=clientes,clientes_pagos --only-activos=1 --out=exports/demo.json
import fs from 'fs';
import path from 'path';
import { db } from '../database.js';

const ENTITIES = {
  clientes: { sql: ({ onlyActivos }) => `SELECT * FROM clientes ${onlyActivos ? 'WHERE activo=1' : ''}` },
  clientes_pagos: { sql: ({ onlyActivos }) => `SELECT cp.* FROM clientes_pagos cp JOIN clientes c ON c.id=cp.cliente_id ${onlyActivos ? 'WHERE c.activo=1' : ''}` },
  revendedores: { sql: ({ onlyActivos }) => `SELECT * FROM revendedores ${onlyActivos ? 'WHERE activo=1' : ''}` },
  usuarios: { sql: ({ onlyActivos }) => `SELECT id,username,role,tipo_usuario,activo,revendedor_id,cliente_id,created_at FROM usuarios ${onlyActivos ? 'WHERE activo=1' : ''}` },
  tipos_ficha: { sql: () => 'SELECT * FROM tipos_ficha' }
};

async function run() {
  const includeArg = process.argv.find(a => a.startsWith('--include='));
  const include = includeArg ? includeArg.split('=')[1].split(',').map(s => s.trim()) : [];
  const onlyActivos = process.argv.includes('--only-activos=1');
  const outArg = process.argv.find(a => a.startsWith('--out='));
  const out = outArg ? outArg.split('=')[1] : `exports/snapshot_${Date.now()}.json`;
  if (include.length === 0) { console.error('Debe indicar --include=lista'); process.exit(1); }

  const snapshot = {
    snapshot_version: 1,
    schema_version: process.env.SCHEMA_VERSION || 'unversioned',
    exported_at: new Date().toISOString(),
    filters: { only_activos: onlyActivos, entities: include },
    entities: {}
  };
  let total = 0;
  for (const ent of include) {
    if (!ENTITIES[ent]) { console.warn('Entidad desconocida', ent); continue; }
    const [rows] = await db.execute(ENTITIES[ent].sql({ onlyActivos }));
    total += rows.length;
    snapshot.entities[ent] = { row_count: rows.length, data: rows };
  }
  const fullPath = path.resolve(process.cwd(), out);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, JSON.stringify(snapshot, null, 2));
  console.log('✅ Export generado:', fullPath, 'filas:', total);
  process.exit(0);
}

run().catch(e => { console.error('Error export POC:', e); process.exit(1); });
