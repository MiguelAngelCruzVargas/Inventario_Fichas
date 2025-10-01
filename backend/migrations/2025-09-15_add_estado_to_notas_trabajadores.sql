-- Migration: add estado to notas_trabajadores
-- Fecha: 2025-09-15

-- Añadimos columna estado (0 = pendiente, 1 = realizada)
ALTER TABLE notas_trabajadores ADD COLUMN estado TINYINT(1) NOT NULL DEFAULT 0;
CREATE INDEX idx_notas_estado_usuario ON notas_trabajadores (estado, usuario_id);
