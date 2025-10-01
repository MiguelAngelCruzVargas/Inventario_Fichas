import React from 'react';

/**
 * DataTable - componente de tabla reutilizable con estados de carga, error y vacía.
 * Props:
 *  columns: [{ header, accessor, cell?(value,row), className }]
 *  data: array de objetos
 *  loading: bool
 *  error: string|null
 *  emptyMessage: string
 *  rowKey: function(row) -> unique key
 *  dense: bool (reduce padding)
 *  onRowClick?: fn(row)
 *  skeletonRows?: number (cuántas filas fantasma mostrar mientras carga)
 */
const DataTable = ({
  columns = [],
  data = [],
  loading = false,
  error = null,
  emptyMessage = 'Sin registros',
  rowKey = (r, i) => r.id ?? i,
  dense = false,
  onRowClick,
  className = '',
  skeletonRows = 6
}) => {
  const cellPad = dense ? 'px-3 py-2' : 'px-4 py-3';
  return (
    <div className={`bg-white rounded-xl border overflow-hidden ${className}`}>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm border-separate border-spacing-0">
          <thead className="bg-gray-50 text-gray-700">
            <tr className="border-b border-gray-200">
              {columns.map(col => (
                <th key={col.accessor || col.header}
                    className={`${cellPad} text-left font-medium uppercase text-xs tracking-wide ${col.className || ''}`}> 
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && Array.from({ length: skeletonRows }).map((_, i) => (
              <tr key={`sk-${i}`} className="border-b border-gray-100">
                {columns.map((col, j) => (
                  <td key={`skc-${j}`} className={`${cellPad}`}>
                    <div className="h-4 bg-gray-200/70 rounded animate-pulse" />
                  </td>
                ))}
              </tr>
            ))}
            {!loading && error && (
              <tr><td colSpan={columns.length} className={`${cellPad} text-center text-red-600`}>{error}</td></tr>
            )}
            {!loading && !error && data.length === 0 && (
              <tr><td colSpan={columns.length} className={`${cellPad} text-center text-gray-500`}>{emptyMessage}</td></tr>
            )}
            {!loading && !error && data.map((row, idx) => (
              <tr key={rowKey(row, idx)}
                  onClick={() => onRowClick && onRowClick(row)}
                  className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${onRowClick ? 'cursor-pointer' : ''}`}>
                {columns.map(col => {
                  const value = row[col.accessor];
                  const content = col.cell ? col.cell(value, row) : (value ?? '');
                  return (
                    <td key={col.accessor || col.header} className={`${cellPad} align-middle ${col.tdClassName || ''}`}>
                      {content}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DataTable;
