// Utilidades de fechas para pagos de clientes de servicio
// sumarMes('YYYY-MM-DD', diaCorte?) -> retorna nueva fecha 'YYYY-MM-DD' del siguiente mes manteniendo dia (o diaCorte si se provee) limitado a 28
export function sumarMes(fechaStr, diaCorte) {
  if (!fechaStr) return null;
  const [y,m,d] = fechaStr.split('-').map(n=>parseInt(n,10));
  let year = y;
  let month = m + 1;
  if (month > 12) { month = 1; year++; }
  let dia = diaCorte || d || 1;
  if (dia > 28) dia = 28; // evitar problemas meses cortos
  const iso = new Date(Date.UTC(year, month-1, dia)).toISOString().slice(0,10);
  return iso;
}

export function formatearLocal(fechaStr) {
  if (!fechaStr) return '-';
  try { return new Date(fechaStr+'T00:00:00').toLocaleDateString('es-MX'); } catch { return fechaStr; }
}
