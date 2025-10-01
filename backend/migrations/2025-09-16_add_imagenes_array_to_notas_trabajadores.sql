-- Agrega columna 'imagenes' para múltiples imágenes (guardamos JSON como LONGTEXT por compatibilidad)
ALTER TABLE notas_trabajadores ADD imagenes TEXT;

-- Nota: la app tratará 'imagenes' como un array JSON (parse/stringify). Se mantiene 'imagen' para legado.
