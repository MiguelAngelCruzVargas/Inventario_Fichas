-- Añade columna para almacenar JSON (array de rutas) de imágenes asociadas a la tarea
-- Ejecutar una sola vez. Si ya existe la columna, ignorar el error "Duplicate column".
ALTER TABLE tareas_mantenimiento ADD imagenes TEXT;
