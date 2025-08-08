-- Script de prueba completo para CASCADE DELETE
-- Verifica que todas las foreign keys funcionen correctamente

-- Limpiar datos de prueba previos
DELETE FROM usuarios WHERE username LIKE 'test_%';

-- 1. CREAR TRABAJADOR DE PRUEBA
INSERT INTO usuarios (username, password_hash, role, activo, created_at) 
VALUES ('test_trabajador_full', '$2b$12$dummy.hash.test', 'trabajador', 1, NOW());

SET @worker_id = LAST_INSERT_ID();

-- Crear registro en trabajadores_mantenimiento
INSERT INTO trabajadores_mantenimiento (usuario_id, nombre_completo, especialidad, email, username, password, activo, created_at) 
VALUES (@worker_id, 'Test Trabajador Full', 'Mantenimiento Completo', 'test@worker.com', 'test_trabajador_full', 'dummy_password', 1, NOW());

-- Crear algunas tareas para el trabajador
INSERT INTO tareas_mantenimiento (trabajador_id, revendedor_id, titulo, descripcion, prioridad, estado, fecha_asignacion, fecha_vencimiento, created_by, created_at) 
VALUES 
(@worker_id, 1, 'Tarea Test 1', 'Descripción tarea 1', 'Media', 'Completado', CURDATE(), DATE_ADD(CURDATE(), INTERVAL 7 DAY), 1, NOW()),
(@worker_id, 1, 'Tarea Test 2', 'Descripción tarea 2', 'Alta', 'Completado', CURDATE(), DATE_ADD(CURDATE(), INTERVAL 3 DAY), 1, NOW());

-- 2. CREAR REVENDEDOR DE PRUEBA (SIN DATOS CRÍTICOS)
INSERT INTO usuarios (username, password_hash, role, activo, created_at) 
VALUES ('test_revendedor_clean', '$2b$12$dummy.hash.test', 'revendedor', 1, NOW());

SET @revendedor_id = LAST_INSERT_ID();

INSERT INTO revendedores (id, usuario_id, nombre_negocio, nombre, responsable, telefono, direccion, activo, porcentaje_comision, created_at) 
VALUES (@revendedor_id, @revendedor_id, 'Negocio Test Clean', 'Test Revendedor Clean', 'Responsable Test', '123456789', 'Dirección Test', 1, 15.00, NOW());

-- Mostrar estado ANTES de las pruebas
SELECT 'ESTADO INICIAL:' as info;
SELECT 'TRABAJADOR:' as tipo, id, username, role FROM usuarios WHERE username = 'test_trabajador_full';
SELECT 'TRABAJADOR DETALLE:' as tipo, usuario_id, nombre_completo FROM trabajadores_mantenimiento WHERE usuario_id = @worker_id;
SELECT 'TAREAS:' as tipo, COUNT(*) as total FROM tareas_mantenimiento WHERE trabajador_id = @worker_id;

SELECT 'REVENDEDOR:' as tipo, id, username, role FROM usuarios WHERE username = 'test_revendedor_clean';
SELECT 'REVENDEDOR DETALLE:' as tipo, usuario_id, nombre FROM revendedores WHERE usuario_id = @revendedor_id;

-- Verificar foreign keys existentes
SELECT 'FOREIGN KEYS CONFIGURADAS:' as info;
SELECT 
  TABLE_NAME, 
  COLUMN_NAME, 
  CONSTRAINT_NAME, 
  REFERENCED_TABLE_NAME, 
  REFERENCED_COLUMN_NAME,
  DELETE_RULE
FROM information_schema.KEY_COLUMN_USAGE k
JOIN information_schema.REFERENTIAL_CONSTRAINTS r 
  ON k.CONSTRAINT_NAME = r.CONSTRAINT_NAME
WHERE k.TABLE_SCHEMA = 'inventario_fichas_wifi' 
  AND k.REFERENCED_TABLE_NAME = 'usuarios'
ORDER BY k.TABLE_NAME;

SELECT 'PRUEBA LISTA - Usa el frontend para eliminar estos usuarios de prueba' as resultado;
