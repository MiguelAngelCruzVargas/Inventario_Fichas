-- Update gastos.tipo enum: add 'personales' and rename 'prestado' -> 'prestamos'
-- Step 1: allow both values during transition
ALTER TABLE gastos MODIFY tipo ENUM('prestado','prestamos','viaticos','personales');

-- Step 2: migrate existing rows
UPDATE gastos SET tipo='prestamos' WHERE tipo='prestado';

-- Step 3: finalize enum values
ALTER TABLE gastos MODIFY tipo ENUM('prestamos','viaticos','personales');
