-- Tabla de clientes (servicio mensual y compradores ocasionales)
CREATE TABLE IF NOT EXISTS clientes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tipo ENUM('servicio','ocasional') NOT NULL,
  nombre_completo VARCHAR(150) NOT NULL,
  telefono VARCHAR(30) NULL,
  email VARCHAR(150) NULL,
  direccion VARCHAR(255) NULL,
  latitud DECIMAL(10,7) NULL,
  longitud DECIMAL(10,7) NULL,
  notas TEXT NULL,
  -- Campos específicos para clientes de servicio mensual (opcionales)
  plan VARCHAR(100) NULL,
  velocidad_mbps INT NULL,
  cuota_mensual DECIMAL(10,2) NULL,
  fecha_instalacion DATE NULL,
  dia_corte TINYINT UNSIGNED NULL,
  estado ENUM('activo','suspendido','cancelado') DEFAULT 'activo',
  -- Control
  activo TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_clientes_tipo (tipo),
  INDEX idx_clientes_activo (activo),
  INDEX idx_clientes_estado (estado),
  INDEX idx_clientes_lat (latitud),
  INDEX idx_clientes_lng (longitud)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
