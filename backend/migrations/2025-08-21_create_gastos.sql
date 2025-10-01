-- Tabla de gastos (viáticos y prestado)
CREATE TABLE IF NOT EXISTS gastos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tipo ENUM('prestado','viaticos') NOT NULL,
  persona VARCHAR(150) NOT NULL,
  monto DECIMAL(10,2) NOT NULL CHECK (monto >= 0),
  motivo VARCHAR(255) NULL,
  pagado TINYINT(1) NOT NULL DEFAULT 0,
  pagado_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_gastos_tipo (tipo),
  INDEX idx_gastos_persona (persona),
  INDEX idx_gastos_pagado (pagado),
  INDEX idx_gastos_created_at (created_at)
);
