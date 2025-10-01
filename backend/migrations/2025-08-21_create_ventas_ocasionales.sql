-- Ventas a clientes ocasionales (no revendedores)
CREATE TABLE IF NOT EXISTS ventas_ocasionales (
  id INT AUTO_INCREMENT PRIMARY KEY,
  cliente_id INT NOT NULL,
  tipo_ficha_id INT NOT NULL,
  cantidad INT NOT NULL,
  precio_unitario DECIMAL(10,2) NOT NULL,
  subtotal DECIMAL(12,2) NOT NULL,
  nota VARCHAR(255) NULL,
  fecha_venta DATE NOT NULL,
  usuario_id INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_cliente (cliente_id),
  INDEX idx_tipo_ficha (tipo_ficha_id),
  INDEX idx_fecha (fecha_venta),
  CONSTRAINT fk_vo_cliente FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE RESTRICT,
  CONSTRAINT fk_vo_tipo_ficha FOREIGN KEY (tipo_ficha_id) REFERENCES tipos_fichas(id) ON DELETE RESTRICT,
  CONSTRAINT fk_vo_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
