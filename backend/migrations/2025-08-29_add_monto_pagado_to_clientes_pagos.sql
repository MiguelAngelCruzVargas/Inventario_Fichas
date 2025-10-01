-- Agrega columna para abonos parciales de pagos de clientes de servicio
ALTER TABLE clientes_pagos
  ADD COLUMN monto_pagado DECIMAL(10,2) NOT NULL DEFAULT 0 AFTER monto;

-- Índice opcional si se consulta por estado/monto_pagado a futuro
-- CREATE INDEX idx_monto_pagado ON clientes_pagos (monto_pagado);
