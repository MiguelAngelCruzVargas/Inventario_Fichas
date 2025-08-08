// CorteCaja.jsx - Versión Mejorada y Responsiva con Estilos de Tarjeta Actualizados
import React, { useState, useEffect } from 'react';
import { useFichas } from '../../context/FichasContext';
import { useAuth } from '../../context/AuthContext';
import { 
  DollarSign, 
  Calendar, 
  TrendingUp, 
  Users, 
  Calculator, 
  FileText, 
  Search, 
  Check, 
  X, 
  User, 
  ArrowLeft,
  AlertCircle,
  Building2,
  Phone,
  ChevronDown,
  ChevronUp,
  Eye,
  RefreshCw,
  Info
} from 'lucide-react';

// --- FUNCIÓN DE FORMATO DE FECHA ---
const formatearFechaSegura = (fecha, conHora = false) => {
  if (!fecha) return 'Fecha no disponible';
  try {
    const fechaObj = new Date(fecha);
    if (isNaN(fechaObj.getTime())) return 'Fecha inválida';
    
    if (conHora) {
      return fechaObj.toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' });
    }
    return fechaObj.toLocaleDateString('es-MX');
  } catch (error) {
    console.error('Error al formatear fecha:', error);
    return 'Error en fecha';
  }
};

// --- MODALES PERSONALIZADOS ---
const AlertModal = ({ isOpen, onClose, title, message }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in-25">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border animate-in zoom-in-95">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0 border-4 border-white ring-4 ring-red-100">
            <AlertCircle className="w-6 h-6 text-red-600" />
          </div>
          <h3 className="text-xl font-bold text-gray-900">{title || 'Alerta'}</h3>
        </div>
        <p className="text-gray-700 mb-6 whitespace-pre-line">{message}</p>
        <div className="flex justify-end">
          <button onClick={onClose} className="px-6 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all transform hover:scale-105 shadow-md hover:shadow-lg">Entendido</button>
        </div>
      </div>
    </div>
  );
};

const ConfirmModal = ({ isOpen, onClose, onConfirm, title, message }) => {
    if (!isOpen) return null;
    const formatMessage = () => {
        const parts = message.split('\n\n');
        if (parts.length <= 1) return <div className="text-gray-700 mb-6 whitespace-pre-line">{message}</div>;
        const [header, salesInfo, footer] = parts;
        return (
            <div className="mb-6">
                <p className="text-gray-700 mb-4 font-medium">{header}</p>
                {salesInfo && (
                    <div className="bg-gray-50 p-4 rounded-lg mb-4 text-sm border border-gray-200">
                        <div className="pl-2 border-l-2 border-blue-400 space-y-2 whitespace-pre-line">{salesInfo}</div>
                    </div>
                )}
                {footer && <p className="text-gray-600 text-sm">{footer}</p>}
            </div>
        );
    };
    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in-25">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border animate-in zoom-in-95">
                <div className="flex items-center space-x-3 mb-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 border-4 border-white ring-4 ring-blue-100">
                        <Info className="w-6 h-6 text-blue-600" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900">{title || 'Confirmar'}</h3>
                </div>
                {formatMessage()}
                <div className="flex justify-end space-x-3">
                    <button onClick={onClose} className="px-5 py-2.5 bg-white border border-gray-300 text-gray-800 rounded-lg hover:bg-gray-100 transition-all transform hover:scale-105">Cancelar</button>
                    <button onClick={() => { onConfirm(); onClose(); }} className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all transform hover:scale-105 shadow-md hover:shadow-lg">Confirmar</button>
                </div>
            </div>
        </div>
    );
};

const SuccessModal = ({ isOpen, onClose, title, message }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in-25">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border animate-in zoom-in-95">
                <div className="flex items-center space-x-3 mb-4">
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 border-4 border-white ring-4 ring-green-100">
                        <Check className="w-6 h-6 text-green-600" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900">{title || 'Éxito'}</h3>
                </div>
                <p className="text-gray-700 mb-6 whitespace-pre-line">{message}</p>
                <div className="flex justify-end">
                    <button onClick={onClose} className="px-6 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all transform hover:scale-105 shadow-md hover:shadow-lg">Aceptar</button>
                </div>
            </div>
        </div>
    );
};


const CorteCaja = () => {
  const { user } = useAuth();
  const {
    revendedores,
    setRevendedores,
    tiposFicha,
    corteCaja,
    setCorteCaja,
    historialCortes,
    loading,
    guardarCorte,
    cargarHistorialCortes,
    loadAllData
  } = useFichas();

  const [modoVista, setModoVista] = useState('selector');
  const [revendedorSeleccionado, setRevendedorSeleccionado] = useState(null);
  const [ventasIngresadas, setVentasIngresadas] = useState({});
  const [fechaCorte, setFechaCorte] = useState(new Date().toISOString().split('T')[0]);
  const [searchTerm, setSearchTerm] = useState('');
  const [errores, setErrores] = useState({});
  const [expandirDetalles, setExpandirDetalles] = useState(false);
  
  const [alertModal, setAlertModal] = useState({ isOpen: false, title: '', message: '' });
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', onConfirm: () => {} });
  const [successModal, setSuccessModal] = useState({ isOpen: false, title: '', message: '' });

  useEffect(() => {
    if (modoVista === 'historial') {
      cargarHistorialCortes().catch(console.error);
    }
  }, [modoVista, cargarHistorialCortes]);

  const revendedoresFiltrados = (revendedores || []).filter(r => {
    if (!searchTerm.trim()) return true;
    const termino = searchTerm.toLowerCase().trim();
    return (
      (r.nombre || '').toLowerCase().includes(termino) ||
      (r.responsable || '').toLowerCase().includes(termino)
    );
  });

  useEffect(() => {
    if (revendedorSeleccionado) {
      const ventasIniciales = {};
      (tiposFicha || []).forEach(tipoObj => {
        const tipoNombre = typeof tipoObj === 'object' ? tipoObj.nombre : tipoObj;
        const tipoId = typeof tipoObj === 'object' ? tipoObj.id : null;
        const inventarioItem = revendedorSeleccionado.inventarios?.find(inv => inv.tipo_ficha_id === tipoId);
        const entregadas = inventarioItem?.fichas_entregadas || 0;
        const vendidas = inventarioItem?.fichas_vendidas || 0;
        // Usar stock_actual de la base de datos en lugar de calcular entregadas - vendidas
        const inventarioActual = inventarioItem?.stock_actual ?? (entregadas - vendidas);
        // ⚠️ CORRECCIÓN: Para mostrar, siempre calcular correctamente: entregadas - vendidas históricas
        const inventarioCalculado = entregadas - vendidas;
        const precioItem = revendedorSeleccionado.precios?.find(p => p.tipo_ficha_id === tipoId);
        const precio = precioItem?.precio || tipoObj.precio_venta || 0;
        ventasIniciales[tipoNombre] = {
          inventarioMaximo: inventarioActual,
          inventarioActual: inventarioActual,
          inventarioCalculado: inventarioCalculado, // Para mostrar el cálculo correcto
          entregadas: entregadas,
          vendidas: 0,
          precio: precio
        };
      });
      setVentasIngresadas(ventasIniciales);
    }
  }, [revendedorSeleccionado, tiposFicha]);

  const seleccionarRevendedor = (revendedor) => {
    setRevendedorSeleccionado(revendedor);
    setModoVista('corte');
    setErrores({});
  };

  const actualizarVentas = (tipo, vendidas) => {
    const nuevosErrores = { ...errores };
    delete nuevosErrores[tipo];
    setErrores(nuevosErrores);
    if (vendidas === "") {
      setVentasIngresadas(prev => ({ ...prev, [tipo]: { ...prev[tipo], vendidas: "" } }));
      return;
    }
    const valor = parseInt(vendidas);
    if (isNaN(valor)) return;
    const inventarioDisponible = ventasIngresadas[tipo]?.inventarioActual || 0;
    if (valor > inventarioDisponible) {
      setErrores(prev => ({ ...prev, [tipo]: `Solo hay ${inventarioDisponible} disponible(s)` }));
      return;
    }
    if (valor < 0) {
      setErrores(prev => ({ ...prev, [tipo]: `No se permiten negativos` }));
      return;
    }
    setVentasIngresadas(prev => ({ ...prev, [tipo]: { ...prev[tipo], vendidas: valor } }));
  };

  const calcularResumen = () => {
    if (!revendedorSeleccionado) return null;
    const resumenPorTipo = Object.entries(ventasIngresadas || {}).map(([tipo, datos]) => {
      const vendidasNum = datos.vendidas === "" || datos.vendidas === 0 ? 0 : parseInt(datos.vendidas) || 0;
      const valorVendido = vendidasNum * datos.precio;
      return {
        tipo,
        inventarioActual: datos.inventarioActual,
        vendidas: vendidasNum,
        inventarioResultante: datos.inventarioActual - vendidasNum,
        valorVendido: valorVendido,
        valor_total: valorVendido, // Agregamos este campo para que coincida con el historial
        precio: datos.precio
      };
    });
    const totalVendido = resumenPorTipo.reduce((sum, r) => sum + r.valorVendido, 0);
    const totalFichasVendidas = resumenPorTipo.reduce((sum, r) => sum + r.vendidas, 0);
    const PORCENTAJE_GANANCIA_CREADOR = 20;
    const totalGananciaCreador = totalVendido * (PORCENTAJE_GANANCIA_CREADOR / 100);
    const totalGananciaRevendedor = totalVendido - totalGananciaCreador;
    return {
      resumenPorTipo,
      totalVendido,
      totalGananciaCreador,
      totalGananciaRevendedor,
      totalFichasVendidas,
      porcentajeGananciaCreador: PORCENTAJE_GANANCIA_CREADOR,
    };
  };

  const procesarCorte = async () => {
    try {
      const resumen = calcularResumen();
      
      // Preparar actualizaciones de inventario
      const actualizacionesInventario = resumen.resumenPorTipo
        .filter(item => item.vendidas > 0)
        .map(item => {
          const tipoObj = (tiposFicha || []).find(t => t.nombre === item.tipo);
          return {
            tipo_ficha_id: tipoObj?.id,
            fichas_vendidas_nuevas: item.vendidas
          };
        })
        .filter(item => item.tipo_ficha_id); // Solo incluir los que tienen ID válido
      
      const datosCorte = {
        fecha_corte: fechaCorte,
        usuario_id: user?.id,
        usuario_nombre: user?.nombre || user?.username || 'Admin',
        revendedor_id: revendedorSeleccionado?.id, // *** AGREGAR ESTO ***
        total_ingresos: resumen.totalVendido,
        total_ganancias: resumen.totalGananciaCreador,
        total_revendedores: resumen.totalGananciaRevendedor,
        detalle_tipos: resumen.resumenPorTipo.map(item => ({...item})),
        actualizaciones_inventario: actualizacionesInventario, // *** AGREGAR ESTO ***
        observaciones: `Corte para ${revendedorSeleccionado.nombre_negocio || revendedorSeleccionado.nombre}`
      };
      
      console.log('📦 Datos del corte a enviar:', {
        revendedor_id: datosCorte.revendedor_id,
        actualizaciones: actualizacionesInventario,
        total: resumen.totalVendido
      });
      
      const resultado = await guardarCorte(datosCorte);
      if (resultado.success) {
        // Recargar datos desde el servidor para asegurar consistencia
        await loadAllData();
        
        setCorteCaja({ ...datosCorte, id: resultado.data.id, created_at: resultado.data.created_at });
        setSuccessModal({ isOpen: true, title: 'Corte Completado', message: `Corte por $${resumen.totalVendido.toFixed(2)} guardado.\nEl inventario ha sido actualizado.` });
        reiniciar();
      } else {
        throw new Error(resultado.error || 'Error desconocido al guardar.');
      }
    } catch (error) {
      setAlertModal({ isOpen: true, title: 'Error al Procesar', message: `No se pudo completar el corte: ${error.message}` });
    }
  };

  const confirmarCorte = () => {
    const resumen = calcularResumen();
    if (resumen.totalFichasVendidas === 0) {
      setAlertModal({ isOpen: true, title: 'Sin Ventas', message: 'No se puede realizar un corte sin ventas registradas.' });
      return;
    }
    let msg = `¿Confirmar corte por $${resumen.totalVendido.toFixed(2)}?\n\n`;
    msg += resumen.resumenPorTipo.filter(i => i.vendidas > 0).map(i => `- ${i.tipo}: ${i.vendidas} fichas`).join('\n');
    msg += `\n\nEl inventario se actualizará permanentemente.`;
    setConfirmModal({ isOpen: true, title: 'Confirmar Corte', message: msg, onConfirm: procesarCorte });
  };

  const reiniciar = () => {
    setModoVista('selector');
    setRevendedorSeleccionado(null);
    setVentasIngresadas({});
    setSearchTerm('');
    setErrores({});
  };

  const handleInputTap = (e) => { e.preventDefault(); e.target.focus(); setTimeout(() => { if (e.target.value) e.target.select(); }, 100); };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="text-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div><p className="mt-4 text-gray-600">Cargando datos...</p></div></div>
    );
  }

  const resumen = calcularResumen();

  const renderSelector = () => (
    <div className="space-y-6 animate-in fade-in-50">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center flex-shrink-0"><Calculator className="w-6 h-6 text-slate-600" /></div>
            <div><h1 className="text-2xl font-bold text-gray-900">Corte de Caja</h1><p className="text-gray-500 mt-1">Selecciona un revendedor para iniciar</p></div>
          </div>
          <div className="flex items-center space-x-3">
            <button onClick={() => setModoVista('historial')} className="flex items-center space-x-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold rounded-lg transition-all text-sm"><FileText className="w-4 h-4" /><span>Ver Historial</span></button>
          </div>
        </div>
      </div>
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Fecha de Corte</label>
            <div className="relative"><Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 text-gray-400" /><input type="date" value={fechaCorte} onChange={(e) => setFechaCorte(e.target.value)} className="w-full pl-11 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all" /></div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Buscar Revendedor</label>
            <div className="relative"><Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 text-gray-400" /><input type="text" placeholder="Nombre o responsable..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-11 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all" /></div>
          </div>
        </div>
      </div>
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Revendedores Disponibles</h3>
        {revendedoresFiltrados.length > 0 ? (
          // =================================================================
          // ========= 👇 BLOQUE DE CÓDIGO CON ESTILOS AJUSTADOS 👇 =========
          // =================================================================
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4">
            {revendedoresFiltrados.map((revendedor) => {
              // Usar stock_actual para calcular el total de inventario
              const totalInventario = (revendedor.inventarios || []).reduce((sum, inv) => sum + Math.max(0, inv.stock_actual ?? ((inv.fichas_entregadas || 0) - (inv.fichas_vendidas || 0))), 0);
              return (
                <div 
                  key={revendedor.id} 
                  onClick={() => seleccionarRevendedor(revendedor)} 
                  className="bg-white rounded-2xl p-4 shadow-md hover:shadow-xl hover:-translate-y-1 transform-gpu cursor-pointer transition-all duration-300 group active:scale-[0.97] flex flex-col items-center text-center"
                >
                  {/* Icono */}
                  <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center group-hover:bg-blue-500 transition-colors duration-300 mb-3">
                    <Building2 className="w-7 h-7 text-slate-500 group-hover:text-white transition-colors duration-300" />
                  </div>

                  {/* Nombre y Responsable */}
                  <div className="flex-1 min-w-0 w-full mb-3">
                    <h4 className="font-bold text-base text-gray-800 truncate w-full" title={revendedor.nombre}>{revendedor.nombre}</h4>
                    <p className="text-sm text-gray-500 truncate w-full" title={revendedor.responsable}>{revendedor.responsable}</p>
                  </div>

                  {/* Footer con Fichas e ID */}
                  <div className="w-full flex justify-between items-center text-xs mt-auto pt-2 border-t border-gray-100">
                     <span className="font-mono text-gray-400">ID: {revendedor.id}</span>
                     <span className={`font-semibold px-2.5 py-1 rounded-full ${totalInventario > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{totalInventario}</span>
                  </div>
                </div>
              );
            })}
          </div>
          // =================================================================
          // ========= 👆 FIN DEL BLOQUE DE CÓDIGO AJUSTADO 👆 =========
          // =================================================================
        ) : <p className="text-center py-8 text-gray-500">No se encontraron revendedores.</p>}
      </div>
    </div>
  );

  const renderHistorial = () => (
    <div className="space-y-6 animate-in fade-in-50">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center space-x-4">
          <button onClick={reiniciar} className="w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center justify-center transition-colors"><ArrowLeft className="w-5 h-5 text-gray-600" /></button>
          <div><h2 className="text-xl font-bold text-gray-900">Historial de Cortes</h2><p className="text-gray-500">Cortes de caja realizados previamente</p></div>
        </div>
      </div>
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900">Todos los Cortes</h3>
          <button onClick={() => cargarHistorialCortes()} className="flex items-center space-x-2 px-3 py-2 bg-blue-100 hover:bg-blue-200 text-blue-800 font-medium rounded-lg transition-all text-sm" title="Actualizar historial">
            <RefreshCw className="w-4 h-4" />
            <span className="hidden sm:inline">Actualizar</span>
          </button>
        </div>
        {historialCortes.length > 0 ? (
          <div className="space-y-4">
            {[...historialCortes].reverse().map((corte, index) => {
              const totalVendido = corte.total_ingresos ?? 0;
              const gananciasCreador = corte.total_ganancias ?? 0;
              const gananciasRevendedor = corte.total_revendedores ?? 0;
              const nombreRevendedor = corte.observaciones?.replace('Corte realizado para ', '') || 'N/A';
              return (
                <div key={corte.id || index} className="border border-gray-200 rounded-xl p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex items-center space-x-4 flex-1 min-w-0">
                      <FileText className="w-6 h-6 text-slate-500 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="font-bold text-gray-900 truncate">{nombreRevendedor}</p>
                        <p className="text-sm text-gray-500">{formatearFechaSegura(corte.fecha_corte || corte.created_at, true)}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-end gap-x-4 gap-y-2 flex-wrap flex-shrink-0">
                      <div className="text-right"><p className="text-xs text-gray-500">Vendido</p><p className="font-semibold text-gray-900">${totalVendido.toLocaleString('es-MX')}</p></div>
                      <div className="text-right"><p className="text-xs text-emerald-600">Mi Ganancia</p><p className="font-semibold text-emerald-600">${gananciasCreador.toLocaleString('es-MX')}</p></div>
                      <div className="text-right"><p className="text-xs text-amber-600">P/ Revendedor</p><p className="font-semibold text-amber-600">${gananciasRevendedor.toLocaleString('es-MX')}</p></div>
                    </div>
                  </div>
                  {corte.detalle_tipos?.filter(t => t.vendidas > 0).length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 text-xs">
                        {corte.detalle_tipos.filter(t => t.vendidas > 0).map((tipo, idx) => {
                          // Calcular valor_total si no existe, usando precio o valorVendido como respaldo
                          const valorTotal = tipo.valor_total || tipo.valorVendido || (tipo.vendidas * (tipo.precio || 0));
                          return (
                            <div key={idx} className="bg-gray-100 rounded p-2">
                              <p className="font-medium text-gray-800">{tipo.tipo}</p>
                              <p className="text-gray-600">{tipo.vendidas} vendidas - ${valorTotal.toFixed(2)}</p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : <p className="text-center py-8 text-gray-500">No hay cortes de caja registrados.</p>}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="w-full px-2 sm:px-6 lg:px-8 py-6">
        {modoVista === 'selector' && renderSelector()}
        {modoVista === 'historial' && renderHistorial()}
        
        {modoVista === 'corte' && (
            <main className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in-50">
                <div className="lg:col-span-12 xl:col-span-7 space-y-6">
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6">
                        <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center space-x-4">
                                <button onClick={reiniciar} className="w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center justify-center transition-colors flex-shrink-0"><ArrowLeft className="w-5 h-5 text-gray-600" /></button>
                                <div><h2 className="text-xl font-bold text-gray-900">Realizando Corte</h2><p className="text-gray-500 truncate">{revendedorSeleccionado?.nombre}</p></div>
                            </div>
                            <button onClick={() => setExpandirDetalles(!expandirDetalles)} className="flex items-center space-x-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors text-sm flex-shrink-0"><Eye className="w-4 h-4" /><span className="hidden sm:inline">Detalles</span>{expandirDetalles ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}</button>
                        </div>
                    </div>

                    {expandirDetalles && (
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 animate-in fade-in-50">
                            <h3 className="font-bold text-gray-900 mb-4">Información del Revendedor</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                                <div className="flex items-center gap-3"><Building2 className="w-5 h-5 text-gray-400"/><div className="min-w-0"><p className="text-xs text-gray-500">Negocio</p><p className="font-medium truncate">{revendedorSeleccionado?.nombre}</p></div></div>
                                <div className="flex items-center gap-3"><User className="w-5 h-5 text-gray-400"/><div className="min-w-0"><p className="text-xs text-gray-500">Responsable</p><p className="font-medium truncate">{revendedorSeleccionado?.responsable}</p></div></div>
                                <div className="flex items-center gap-3"><Phone className="w-5 h-5 text-gray-400"/><div className="min-w-0"><p className="text-xs text-gray-500">Teléfono</p><p className="font-medium truncate">{revendedorSeleccionado?.telefono}</p></div></div>
                            </div>
                        </div>
                    )}
                    
                    <div className="lg:hidden bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-3">
                        <div className="flex justify-between items-center text-blue-800"><p>Total Vendido</p><p className="text-xl font-bold">${(resumen?.totalVendido || 0).toLocaleString('es-MX')}</p></div>
                        <div className="flex justify-between items-center text-emerald-800"><p>Mi Ganancia</p><p className="font-bold">${(resumen?.totalGananciaCreador || 0).toLocaleString('es-MX')}</p></div>
                        <div className="flex justify-between items-center text-amber-800"><p>Para Revendedor</p><p className="font-bold">${(resumen?.totalGananciaRevendedor || 0).toLocaleString('es-MX')}</p></div>
                    </div>

                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6">
                        <h3 className="text-lg font-bold text-gray-900 mb-6">Ingresar Ventas por Tipo de Ficha</h3>
                        <div className="space-y-6">
                            {Object.entries(ventasIngresadas || {}).map(([tipo, datos]) => (
                                <div key={tipo} className="border border-gray-200 rounded-xl p-4 sm:p-6">
                                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-2">
                                        <h4 className="font-semibold text-gray-900 text-lg">{tipo}</h4>
                                        <div className={`text-sm px-3 py-1 rounded-full font-semibold ${datos.precio > 0 ? 'text-gray-700 bg-gray-100' : 'text-red-700 bg-red-100'}`}>{datos.precio > 0 ? `$${datos.precio}` : 'Sin precio'}</div>
                                    </div>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                        <div><label className="block text-sm font-medium text-gray-700 mb-2 sm:mb-3">Entregadas</label><div className="p-3 sm:p-4 bg-blue-50 rounded-lg text-center"><p className="text-lg sm:text-xl font-bold text-blue-900">{datos.entregadas}</p></div></div>
                                        <div><label className="block text-sm font-medium text-gray-700 mb-2 sm:mb-3">Inventario</label><div className="p-3 sm:p-4 bg-gray-50 rounded-lg text-center"><p className="text-lg sm:text-xl font-bold text-gray-900">{datos.inventarioCalculado !== undefined ? datos.inventarioCalculado : datos.inventarioActual}</p></div></div>
                                        <div className="col-span-2 sm:col-span-1">
                                            <label className="block text-sm font-medium text-gray-700 mb-2 sm:mb-3">Vendidas *</label>
                                            <input type="text" inputMode="numeric" value={datos.vendidas === 0 ? "" : datos.vendidas} onChange={(e) => { if (e.target.value === '' || /^\d+$/.test(e.target.value)) actualizarVentas(tipo, e.target.value); }} onFocus={(e) => e.target.select()} onClick={handleInputTap} onTouchStart={handleInputTap} autoComplete="off" className={`w-full p-3 sm:p-4 border rounded-lg text-center text-lg sm:text-xl font-semibold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none transition-all ${errores[tipo] ? 'border-red-400 bg-red-50 ring-2 ring-red-200' : 'border-gray-300 bg-white focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'}`} placeholder="0" />
                                            {errores[tipo] && <p className="text-xs text-red-600 mt-2 flex items-center gap-1"><AlertCircle className="w-3 h-3"/>{errores[tipo]}</p>}
                                        </div>
                                        <div><label className="block text-sm font-medium text-gray-700 mb-2 sm:mb-3">Valor Total</label><div className="p-3 sm:p-4 bg-green-50 rounded-lg text-center"><p className="text-lg sm:text-xl font-bold text-green-900">${((parseInt(datos.vendidas) || 0) * datos.precio).toLocaleString('es-MX')}</p></div></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <aside className="hidden lg:block lg:col-span-5 xl:col-span-4">
                    <div className="sticky top-6 space-y-6">
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                            <h3 className="text-lg font-bold text-gray-900 mb-4">Resumen del Corte</h3>
                            <div className="space-y-4">
                                <div className="p-4 bg-blue-50 rounded-xl flex justify-between items-center"><p className="font-medium text-blue-800">Total Vendido</p><p className="text-2xl font-bold text-blue-900">${(resumen?.totalVendido || 0).toLocaleString('es-MX')}</p></div>
                                <div className="p-4 bg-emerald-50 rounded-xl flex justify-between items-center"><p className="font-medium text-emerald-800">Mi Ganancia ({resumen?.porcentajeGananciaCreador}%)</p><p className="text-xl font-bold text-emerald-900">${(resumen?.totalGananciaCreador || 0).toLocaleString('es-MX')}</p></div>
                                <div className="p-4 bg-amber-50 rounded-xl flex justify-between items-center"><p className="font-medium text-amber-800">Para Revendedor</p><p className="text-xl font-bold text-amber-900">${(resumen?.totalGananciaRevendedor || 0).toLocaleString('es-MX')}</p></div>
                            </div>
                        </div>
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-3">
                             <button onClick={confirmarCorte} disabled={(resumen?.totalFichasVendidas || 0) === 0 || Object.keys(errores || {}).length > 0} className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-6 py-3 rounded-xl font-bold transition-all text-base transform hover:scale-105 shadow-md hover:shadow-lg">
                                <Check className="w-5 h-5" />
                                <span>Confirmar Corte</span>
                            </button>
                            <button onClick={reiniciar} className="w-full flex items-center justify-center gap-2 text-gray-800 bg-gray-100 hover:bg-gray-200 border border-gray-200 px-6 py-3 rounded-xl transition-colors text-base font-medium">
                                <X className="w-5 h-5" />
                                <span>Cancelar</span>
                            </button>
                        </div>
                    </div>
                </aside>
            </main>
        )}
      </div>

      <AlertModal isOpen={alertModal.isOpen} onClose={() => setAlertModal({ ...alertModal, isOpen: false })} title={alertModal.title} message={alertModal.message} />
      <ConfirmModal isOpen={confirmModal.isOpen} onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })} onConfirm={confirmModal.onConfirm} title={confirmModal.title} message={confirmModal.message} />
      <SuccessModal isOpen={successModal.isOpen} onClose={() => setSuccessModal({ ...successModal, isOpen: false })} title={successModal.title} message={successModal.message} />
    </div>
  );
};

export default CorteCaja;
