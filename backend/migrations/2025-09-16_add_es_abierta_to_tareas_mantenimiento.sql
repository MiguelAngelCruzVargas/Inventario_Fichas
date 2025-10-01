-- Agrega soporte para tareas abiertas aceptables por cualquier técnico
ALTER TABLE tareas_mantenimiento ADD es_abierta INT;

ALTER TABLE tareas_mantenimiento ADD accepted_at TIMESTAMP;