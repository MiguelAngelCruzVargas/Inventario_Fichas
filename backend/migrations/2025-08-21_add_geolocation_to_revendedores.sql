-- Add geolocation columns for revendedores
ALTER TABLE revendedores
  ADD COLUMN latitud DECIMAL(10,7) NULL AFTER direccion,
  ADD COLUMN longitud DECIMAL(10,7) NULL AFTER latitud,
  ADD INDEX idx_revendedores_lat (latitud),
  ADD INDEX idx_revendedores_lng (longitud);
