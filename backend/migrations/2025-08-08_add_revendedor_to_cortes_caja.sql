-- Agregar columnas para asociar cortes a un revendedor (compatibles y NULL por defecto)
ALTER TABLE cortes_caja
  ADD COLUMN IF NOT EXISTS revendedor_id INT NULL,
  ADD COLUMN IF NOT EXISTS revendedor_nombre VARCHAR(255) NULL,
  ADD INDEX IF NOT EXISTS idx_cortes_revendedor (revendedor_id);

-- Backfill aproximado desde "observaciones" (busca "Corte para {nombre}")
-- Nota: Es heurístico; si hay múltiples coincidencias, tomará una de ellas.
UPDATE cortes_caja c
JOIN revendedores r
  ON (c.observaciones LIKE CONCAT('%', r.nombre_negocio, '%'))
   OR (c.observaciones LIKE CONCAT('%', r.nombre, '%'))
SET c.revendedor_id = r.id,
    c.revendedor_nombre = COALESCE(r.nombre_negocio, r.nombre)
WHERE c.revendedor_id IS NULL;
