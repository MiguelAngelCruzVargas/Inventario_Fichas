ALTER TABLE notas_trabajadores
  ADD COLUMN imagen VARCHAR(255) NULL;

-- Reversión (manual):
-- ALTER TABLE notas_trabajadores DROP COLUMN imagen;