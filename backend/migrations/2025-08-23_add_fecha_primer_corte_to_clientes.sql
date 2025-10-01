-- Agrega fecha_primer_corte a clientes para anclar el ciclo de cobro
ALTER TABLE clientes
  ADD COLUMN fecha_primer_corte DATE NULL AFTER fecha_instalacion,
  ADD INDEX idx_clientes_fecha_primer_corte (fecha_primer_corte);
