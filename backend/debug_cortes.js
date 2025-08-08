import { query } from './database.js';

async function debugCortes() {
  try {
    console.log('🔍 DEBUGGING CORTES DE CAJA PARA MARIA JUANA');
    console.log('='.repeat(50));
    
    // 1. Verificar datos del revendedor
    console.log('\n📋 1. DATOS DEL REVENDEDOR:');
    const revendedor = await query(`
      SELECT id, nombre, nombre_negocio, usuario_id 
      FROM revendedores 
      WHERE usuario_id = 9
    `);
    console.log('Revendedor encontrado:', revendedor[0]);
    
    if (revendedor.length === 0) {
      console.log('❌ No se encontró revendedor con usuario_id = 9');
      return;
    }
    
    const nombrePersona = revendedor[0].nombre;
    const nombreNegocio = revendedor[0].nombre_negocio;
    
    // 2. Verificar cortes existentes
    console.log('\n📋 2. CORTES EXISTENTES:');
    const todosCortes = await query(`
      SELECT id, fecha_corte, observaciones, 
             LEFT(detalle_tipos, 100) as muestra_detalle
      FROM cortes_caja 
      ORDER BY fecha_corte DESC
    `);
    console.log(`Total de cortes: ${todosCortes.length}`);
    todosCortes.forEach(corte => {
      console.log(`- Corte ${corte.id}: ${corte.fecha_corte} - ${corte.observaciones}`);
      console.log(`  Detalle: ${corte.muestra_detalle}...`);
    });
    
    // 3. Buscar cortes que contengan referencias al revendedor
    console.log('\n📋 3. BÚSQUEDA EN DETALLE_TIPOS:');
    console.log(`Buscando por persona: "${nombrePersona}"`);
    console.log(`Buscando por negocio: "${nombreNegocio}"`);
    
    const cortesConRevendedor = await query(`
      SELECT 
        id,
        fecha_corte,
        observaciones,
        detalle_tipos
      FROM cortes_caja 
      WHERE detalle_tipos LIKE CONCAT('%"revendedor":"', ?, '"%')
         OR detalle_tipos LIKE CONCAT('%"revendedor": "', ?, '"%')
         OR detalle_tipos LIKE CONCAT('%"revendedor":"', ?, '"%')
         OR detalle_tipos LIKE CONCAT('%"revendedor": "', ?, '"%')
         OR detalle_tipos LIKE CONCAT('%', ?, '%')
         OR detalle_tipos LIKE CONCAT('%', ?, '%')
      ORDER BY fecha_corte DESC
    `, [nombrePersona, nombrePersona, nombreNegocio, nombreNegocio, nombrePersona, nombreNegocio]);
    
    console.log(`\n✅ Cortes encontrados: ${cortesConRevendedor.length}`);
    
    if (cortesConRevendedor.length > 0) {
      console.log('\n📋 4. ANÁLISIS DEL PRIMER CORTE:');
      const primerCorte = cortesConRevendedor[0];
      console.log(`Corte ID: ${primerCorte.id}`);
      console.log(`Fecha: ${primerCorte.fecha_corte}`);
      console.log(`Observaciones: ${primerCorte.observaciones}`);
      
      // Analizar el JSON
      try {
        const detalle = JSON.parse(primerCorte.detalle_tipos);
        console.log(`\n📊 Detalle JSON parseado (${detalle.length} elementos):`);
        
        detalle.forEach((item, index) => {
          console.log(`\n  [${index}] CAMPOS DISPONIBLES:`);
          Object.keys(item).forEach(key => {
            const value = item[key];
            const valueStr = typeof value === 'string' ? `"${value}"` : String(value);
            console.log(`        ${key}: ${valueStr}`);
          });
          
          if (index >= 1) return; // Solo mostrar los primeros 2 elementos
        });
        
      } catch (error) {
        console.log('❌ Error al parsear JSON:', error.message);
        console.log('JSON crudo:', primerCorte.detalle_tipos.substring(0, 500));
      }
    } else {
      console.log('\n❌ NO SE ENCONTRARON CORTES PARA ESTE REVENDEDOR');
      console.log('\n📋 Verificando contenido de algunos cortes:');
      
      // Mostrar contenido de algunos cortes para debug
      const algunosCortes = await query(`
        SELECT id, detalle_tipos 
        FROM cortes_caja 
        LIMIT 2
      `);
      
      algunosCortes.forEach(corte => {
        console.log(`\n--- Corte ${corte.id} ---`);
        try {
          const detalle = JSON.parse(corte.detalle_tipos);
          detalle.forEach((item, index) => {
            if (index < 3) { // Solo los primeros 3
              console.log(`  [${index}] Revendedor: "${item.revendedor || 'N/A'}"`);
            }
          });
        } catch (error) {
          console.log('  Error al parsear JSON');
        }
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
  
  process.exit(0);
}

debugCortes();
