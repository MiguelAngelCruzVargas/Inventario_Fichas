-- Create simple inventory table for generic equipment stock
-- Fecha: 2025-08-22

CREATE TABLE IF NOT EXISTS equipos_inventario (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(150) NOT NULL,
  cantidad INT NOT NULL DEFAULT 0,
  estado ENUM('nuevo','usado','dañado','reparación') NOT NULL DEFAULT 'nuevo',
  descripcion TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_nombre (nombre),
  INDEX idx_estado (estado)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
