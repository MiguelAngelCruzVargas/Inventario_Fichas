-- Migration: create equipos table (equipos prestados/asignados a clientes)
-- Fecha: 2025-08-21

CREATE TABLE IF NOT EXISTS equipos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  revendedor_id INT NOT NULL,
  nombre VARCHAR(150) NOT NULL,
  descripcion TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_revendedor (revendedor_id),
  INDEX idx_created_at (created_at),
  CONSTRAINT fk_equipos_revendedor FOREIGN KEY (revendedor_id) REFERENCES revendedores(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
