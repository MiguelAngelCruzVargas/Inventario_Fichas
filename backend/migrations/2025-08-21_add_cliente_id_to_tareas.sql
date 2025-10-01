-- Permitir tareas dirigidas a clientes de servicio
ALTER TABLE tareas_mantenimiento
  ADD COLUMN cliente_id INT NULL AFTER revendedor_id,
  ADD INDEX idx_tareas_cliente (cliente_id),
  ADD CONSTRAINT fk_tareas_cliente FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE SET NULL;
