import { query } from './database.js';

async function checkTable() {
  try {
    console.log('=== ESTRUCTURA DE LA TABLA tareas_mantenimiento ===');
    const estructura = await query('DESCRIBE tareas_mantenimiento');
    console.table(estructura);
    
    console.log('\n=== DATOS ACTUALES EN LA TABLA ===');
    const datos = await query('SELECT * FROM tareas_mantenimiento ORDER BY id DESC LIMIT 5');
    console.log('Últimas 5 tareas:', JSON.stringify(datos, null, 2));
    
    console.log('\n=== AUTO_INCREMENT ACTUAL ===');
    const autoInc = await query("SHOW TABLE STATUS LIKE 'tareas_mantenimiento'");
    console.log('Auto_increment actual:', autoInc[0]?.Auto_increment);
    
  } catch(error) {
    console.error('Error:', error);
  }
  process.exit(0);
}

checkTable();
