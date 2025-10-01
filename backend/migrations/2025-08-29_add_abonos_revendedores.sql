-- Soporte de abonos parciales para revendedores en cortes de caja
-- 1) Nuevas columnas en cortes_caja para seguimiento simple
ALTER TABLE cortes_caja
  ADD COLUMN IF NOT EXISTS monto_pagado_revendedor DECIMAL(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS saldo_revendedor DECIMAL(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS estado_cobro ENUM('pendiente','parcial','saldado') DEFAULT 'pendiente';

-- 2) Tabla de abonos por corte para historial detallado
CREATE TABLE IF NOT EXISTS cortes_caja_abonos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  corte_id INT NOT NULL,
  revendedor_id INT NULL,
  monto DECIMAL(10,2) NOT NULL,
  usuario_id INT NULL,
  nota VARCHAR(255) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_abonos_corte (corte_id),
  INDEX idx_abonos_revendedor (revendedor_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
