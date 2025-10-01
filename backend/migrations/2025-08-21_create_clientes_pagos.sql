-- Tabla de pagos mensuales de clientes de servicio
CREATE TABLE IF NOT EXISTS clientes_pagos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  cliente_id INT NOT NULL,
  periodo_year SMALLINT NOT NULL,
  periodo_month TINYINT NOT NULL,
  fecha_vencimiento DATE NOT NULL,
  monto DECIMAL(10,2) NOT NULL,
  estado ENUM('pendiente','pagado','vencido','suspendido') NOT NULL DEFAULT 'pendiente',
  pagado_at DATETIME NULL,
  corte_servicio_at DATETIME NULL,
  notas VARCHAR(255) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_cliente_periodo (cliente_id, periodo_year, periodo_month),
  INDEX idx_cliente (cliente_id),
  INDEX idx_periodo (periodo_year, periodo_month),
  INDEX idx_estado (estado),
  CONSTRAINT fk_clientes_pagos_cliente FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
