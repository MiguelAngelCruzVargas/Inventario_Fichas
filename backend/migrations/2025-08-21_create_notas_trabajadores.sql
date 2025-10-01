-- Migration: create notas_trabajadores table
-- Fecha: 2025-08-21

CREATE TABLE IF NOT EXISTS notas_trabajadores (
  id INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT NOT NULL,
  revendedor_id INT NULL,
  titulo VARCHAR(150) NOT NULL,
  contenido TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_usuario (usuario_id),
  INDEX idx_revendedor (revendedor_id),
  CONSTRAINT fk_notas_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  CONSTRAINT fk_notas_revendedor FOREIGN KEY (revendedor_id) REFERENCES revendedores(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
