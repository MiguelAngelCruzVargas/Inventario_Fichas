// Simple SSE client
export function connectRealtime(onEvent) {
  const es = new EventSource('/api/stream', { withCredentials: true });
  const handler = (type) => (e) => {
    try { onEvent?.(type, JSON.parse(e.data)); } catch {}
  };
  es.addEventListener('tarea-creada', handler('tarea-creada'));
  es.addEventListener('tarea-actualizada', handler('tarea-actualizada'));
  es.addEventListener('tarea-completada', handler('tarea-completada'));
  es.addEventListener('tarea-aceptada', handler('tarea-aceptada'));
  es.addEventListener('nota-creada', handler('nota-creada'));
  es.addEventListener('nota-actualizada', handler('nota-actualizada'));
  es.addEventListener('nota-eliminada', handler('nota-eliminada'));
  es.addEventListener('inventario-actualizado', handler('inventario-actualizado'));
  es.addEventListener('corte-creado', handler('corte-creado'));
  es.addEventListener('corte-abonado', handler('corte-abonado'));
  es.addEventListener('entrega-creada', handler('entrega-creada'));
  es.addEventListener('entrega-actualizada', handler('entrega-actualizada'));
  
  // heartbeat is ignored by EventSource automatically
  return () => es.close();
}
