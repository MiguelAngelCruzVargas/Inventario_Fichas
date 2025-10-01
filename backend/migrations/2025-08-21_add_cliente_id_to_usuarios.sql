-- Añadir relación opcional a cliente en usuarios para portal de clientes
ALTER TABLE usuarios
  ADD COLUMN cliente_id INT NULL AFTER revendedor_id,
  ADD INDEX idx_usuarios_cliente (cliente_id),
  ADD CONSTRAINT fk_usuarios_cliente FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE SET NULL;
