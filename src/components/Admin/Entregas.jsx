// Entregas.jsx - Gestión de Revendedores (Versión con Diseño Restaurado y Funcionalidad Mejorada)
import React, { useState, useEffect } from 'react';
import {
    Users,
    Building2,
    Phone,
    User,
    MapPin,
    Edit3,
    Check,
    X,
    ChevronDown,
    ChevronUp,
    Calculator,
    AlertTriangle,
    Trash2,
    Search
} from 'lucide-react';
import { useFichas } from '@context/FichasContext';
import { useUsers } from '@context/UsersContext';
import { fichasService } from '@services/fichasService';

// --- Componentes de UI Modulares ---

const NotificationPopup = ({ message, type, onClose }) => {
    useEffect(() => {
        const timer = setTimeout(onClose, 3000);
        return () => clearTimeout(timer);
    }, [onClose]);

    const baseClasses = "fixed top-5 right-5 z-50 p-4 rounded-xl shadow-lg border max-w-sm w-full animate-in fade-in-5 slide-in-from-top-5";
    const typeClasses = {
        success: 'bg-green-100 border-green-200 text-green-800',
        error: 'bg-red-100 border-red-200 text-red-800',
    };

    return (
        <div className={`${baseClasses} ${typeClasses[type]}`}>
            <p className="font-medium">{message}</p>
        </div>
    );
};

const ConfirmationModal = ({ title, message, onConfirm, onCancel }) => (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in-25">
        <div className="bg-white rounded-2xl p-6 sm:p-8 max-w-md w-full shadow-2xl border animate-in zoom-in-95">
            <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mr-4">
                    <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900">{title}</h3>
            </div>
            <p className="text-gray-700 mb-6 whitespace-pre-line">{message}</p>
            <div className="flex flex-col sm:flex-row gap-3">
                <button onClick={onConfirm} className="w-full sm:flex-1 bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-xl font-medium transition-colors flex items-center justify-center">
                    <Trash2 className="w-4 h-4 mr-2" />
                    Eliminar
                </button>
                <button onClick={onCancel} className="w-full sm:flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 px-6 py-3 rounded-xl font-medium transition-colors flex items-center justify-center">
                    <X className="w-4 h-4 mr-2" />
                    Cancelar
                </button>
            </div>
        </div>
    </div>
);

const ResumenFinanciero = ({ resumen }) => {
    const [isExpanded, setIsExpanded] = useState(true); // Expandido por defecto
    if (!resumen.tieneInventario) return null;

    return (
        <div className="mt-4">
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex justify-between items-center p-3 bg-green-50 rounded-lg border border-green-200 hover:bg-green-100 transition-colors"
            >
                <div className="flex items-center">
                    <Calculator className="w-5 h-5 mr-3 text-green-600" />
                    <span className="font-semibold text-green-800 text-base">Resumen Financiero</span>
                </div>
                {isExpanded ? <ChevronUp className="w-5 h-5 text-green-600" /> : <ChevronDown className="w-5 h-5 text-green-600" />}
            </button>

            {isExpanded && (
                <div className="mt-2 bg-white p-4 rounded-lg border border-gray-200 animate-in fade-in-50">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <div className="text-gray-600 text-sm mb-2 font-medium">Total Fichas</div>
                            <div className="grid grid-cols-3 gap-2 text-sm">
                                <div className="text-center p-2 bg-blue-50 rounded">
                                    <div className="text-gray-500 text-xs">Entregadas</div>
                                    <div className="font-semibold text-blue-800 text-lg">{resumen.totalFichasEntregadas}</div>
                                </div>
                                <div className="text-center p-2 bg-green-50 rounded">
                                    <div className="text-gray-500 text-xs">Vendidas</div>
                                    <div className="font-semibold text-green-800 text-lg">{resumen.totalFichasVendidas}</div>
                                </div>
                                <div className="text-center p-2 bg-orange-50 rounded">
                                    <div className="text-gray-500 text-xs">Existentes</div>
                                    <div className="font-semibold text-orange-800 text-lg">{resumen.totalFichasExistentes}</div>
                                </div>
                            </div>
                        </div>
                        <div>
                            <div className="text-gray-600 text-sm mb-2 font-medium">Cálculos Finales</div>
                            <div className="space-y-2 bg-gray-50 p-3 rounded">
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-700">Subtotal (Ventas):</span>
                                    <span className="font-semibold text-blue-800">${(resumen.totalSubtotal || 0).toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-700">Mi ganancia ({resumen.porcentajeGananciaCreador ?? 20}%):</span>
                                    <span className="font-semibold text-orange-800">${(resumen.totalGananciaCreador || 0).toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-base pt-2 border-t">
                                    <span className="font-medium text-gray-800">Para el revendedor:</span>
                                    <span className="font-bold text-green-800 text-xl">${(resumen.totalGananciaRevendedor || 0).toFixed(2)}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const RevendedorCard = ({
    revendedor,
    tiposFicha,
    onEditPrecios,
    onDelete,
    onEditComision,
    onUpdateVendidas,
    calcularResumenFinanciero,
    ajustarInventarioExcel,
    porcentajeGlobal
}) => {
    const [tempVendidas, setTempVendidas] = useState({});
        const resumen = calcularResumenFinanciero(revendedor);
        // Normalizar porcentaje: 0/null/"" => usar global; solo override si > 0
        const pctRaw = revendedor.porcentaje_comision;
        let pctParsed = Number.isFinite(Number(pctRaw)) ? Number(pctRaw) : NaN;
        const pctNum = (!Number.isNaN(pctParsed) && pctParsed > 0) ? pctParsed : null;
        const globalNum = (porcentajeGlobal !== null && porcentajeGlobal !== undefined && `${porcentajeGlobal}`.trim() !== '' && !Number.isNaN(parseFloat(porcentajeGlobal)))
            ? parseFloat(porcentajeGlobal)
            : null;
        const pctEfectivo = (pctNum !== null ? pctNum : (globalNum !== null ? globalNum : 20));
        const usaGlobal = (pctNum === null);

    const handleVendidasChange = (tipoId, value) => {
        if (value === '' || /^\d+$/.test(value)) {
            setTempVendidas(prev => ({ ...prev, [tipoId]: value }));
        }
    };

    const handleSaveVendidas = (tipoId) => {
        const inventarioItem = revendedor.inventarios?.find(inv => inv.tipo_ficha_id === tipoId);
        const entregadas = inventarioItem?.fichas_entregadas || 0;
        const nuevasVendidas = parseInt(tempVendidas[tipoId] || '0', 10);

        if (nuevasVendidas >= 0 && nuevasVendidas <= entregadas) {
            onUpdateVendidas(revendedor.id, tipoId, nuevasVendidas);
            setTempVendidas(prev => {
                const newState = { ...prev };
                delete newState[tipoId];
                return newState;
            });
        } else {
            alert(`El número de fichas vendidas debe estar entre 0 y ${entregadas}.`);
        }
    };

    return (
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                    {(() => {
                        const persona = revendedor.responsable || revendedor.nombre || revendedor.nombre_negocio || '—';
                        const tienda = revendedor.nombre_negocio && revendedor.nombre_negocio !== persona ? revendedor.nombre_negocio : '';
                        return (
                            <div>
                                <h4 className="font-semibold text-gray-900 flex items-center text-lg">
                                    <User className="w-5 h-5 mr-3 text-gray-500" />
                                    {persona}
                                </h4>
                                {tienda && (
                                    <div className="pl-8 mt-1 text-sm text-gray-600 flex items-center">
                                        <Building2 className="w-4 h-4 mr-2 text-gray-400" />
                                        {tienda}
                                    </div>
                                )}
                            </div>
                        );
                    })()}
                    <div className="mt-2 space-y-1 pl-8">
                        <p className="text-sm text-gray-600 flex items-center"><Phone className="w-4 h-4 mr-2 text-gray-400" />{revendedor.telefono}</p>
                        {revendedor.direccion && <p className="text-sm text-gray-600 flex items-center"><MapPin className="w-4 h-4 mr-2 text-gray-400" />{revendedor.direccion}</p>}
                        <div className="flex items-center space-x-2 pt-1">
                            <p className="text-sm text-gray-600 flex items-center">
                                <Calculator className="w-4 h-4 mr-2 text-gray-400" />
                                Comisión: {pctEfectivo.toFixed(2)}%{usaGlobal ? ' (global)' : ''}
                            </p>
                            <button onClick={() => onEditComision(revendedor)} className="text-blue-600 hover:text-blue-700 text-xs font-semibold px-2 py-1 rounded hover:bg-blue-50 transition-colors">Editar</button>
                        </div>
                    </div>
                </div>
                <div className="flex items-center space-x-1">
                    <button onClick={() => onEditPrecios(revendedor.id)} className="text-blue-600 hover:text-blue-700 p-2 rounded-full hover:bg-blue-50 transition-colors" title="Editar precios"><Edit3 className="w-5 h-5" /></button>
                    <button onClick={() => onDelete(revendedor)} className="text-red-600 hover:text-red-700 p-2 rounded-full hover:bg-red-50 transition-colors" title="Eliminar revendedor"><Trash2 className="w-5 h-5" /></button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                {(tiposFicha || []).map(tipo => {
                    const inventarioItem = revendedor.inventarios?.find(inv => inv.tipo_ficha_id === tipo.id);
                    const entregadas = inventarioItem?.fichas_entregadas || 0;
                    const vendidas = inventarioItem?.fichas_vendidas || 0;
                    // Usar stock_actual de la base de datos en lugar de calcular entregadas - vendidas
                    const existentes = inventarioItem?.stock_actual ?? (entregadas - vendidas);
                    // ⚠️ CORRECCIÓN: Para mostrar, siempre calcular correctamente: entregadas - vendidas
                    const existentesCalculado = entregadas - vendidas;

                    if (entregadas === 0 && vendidas === 0) return null;

                    const tempValue = tempVendidas[tipo.id];
                    const hasChanged = tempValue !== undefined && parseInt(tempValue || 0) !== vendidas;

                    return (
                        <div key={tipo.id} className="bg-gray-50 p-4 rounded-lg border">
                            <div className="text-base font-semibold text-gray-800 mb-3">{tipo.nombre}</div>
                            <div className="grid grid-cols-3 gap-2 text-sm mb-3">
                                <div className="text-center">
                                    <div className="text-gray-600 text-xs">Entregadas</div>
                                    <div className="font-semibold text-lg text-blue-800 p-2 bg-blue-100 rounded">{entregadas}</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-gray-600 text-xs">Vendidas (Editable, acumulado)</div>
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        value={tempValue !== undefined ? tempValue : vendidas}
                                        onChange={(e) => handleVendidasChange(tipo.id, e.target.value)}
                                        className="w-full font-semibold text-lg text-green-800 bg-white rounded px-2 py-1 text-center border-2 border-green-300 focus:ring-2 focus:ring-green-400"
                                        title={`Es un valor acumulado hasta hoy. No crea ventas ni afecta reportes hasta hacer un corte. Máximo permitido: ${entregadas}.`}
                                    />
                                </div>
                                <div className="text-center">
                                    <div className="text-gray-600 text-xs">Existentes</div>
                                    <div className={`font-semibold text-lg p-2 rounded ${existentesCalculado > 0 ? 'text-orange-800 bg-orange-100' : 'text-red-800 bg-red-100'}`}>{existentesCalculado}</div>
                                </div>
                            </div>
                            
                            {hasChanged && (
                                <button
                                    onClick={() => handleSaveVendidas(tipo.id)}
                                    className="w-full bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-xs font-semibold transition-colors mb-2 animate-in fade-in-50">
                                    Guardar
                                </button>
                            )}

                            <div className="flex flex-wrap justify-center gap-2 border-t pt-3 mt-2">
                                <button onClick={() => ajustarInventarioExcel(revendedor.id, tipo.nombre, 'entregadas', 1)} className="bg-blue-100 hover:bg-blue-200 text-blue-700 px-3 py-1 rounded text-sm transition-colors" title="Agregar entregada">+Entregada</button>
                                <button onClick={() => ajustarInventarioExcel(revendedor.id, tipo.nombre, 'vendidas', 1)} className="bg-green-100 hover:bg-green-200 text-green-700 px-3 py-1 rounded text-sm transition-colors" title="Agregar vendida">+Vendida</button>
                                <button onClick={() => ajustarInventarioExcel(revendedor.id, tipo.nombre, 'vendidas', -1)} className="bg-red-100 hover:bg-red-200 text-red-700 px-3 py-1 rounded text-sm transition-colors" title="Restar vendida">-Vendida</button>
                            </div>
                        </div>
                    );
                })}
            </div>

            <ResumenFinanciero resumen={resumen} />
        </div>
    );
};

const ModalEdicionPrecios = ({ isOpen, onClose, onSave, tiposFicha, revendedorId }) => {
    const [tempPrecios, setTempPrecios] = useState({});

    useEffect(() => {
        const fetchPrecios = async () => {
            if (isOpen && revendedorId) {
                try {
                    const preciosData = await fichasService.obtenerPreciosRevendedor(revendedorId);
                    const preciosMap = preciosData.reduce((acc, p) => {
                        acc[p.tipo_ficha_id] = p.precio;
                        return acc;
                    }, {});
                    setTempPrecios(preciosMap);
                } catch (error) {
                    console.error("Error fetching prices:", error);
                }
            }
        };
        fetchPrecios();
    }, [isOpen, revendedorId]);

    if (!isOpen) return null;

    const handleSave = () => {
        onSave(revendedorId, tempPrecios);
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 sm:p-8 max-w-md w-full max-h-[90vh] overflow-y-auto shadow-2xl border">
                <h3 className="text-xl font-semibold text-gray-900 mb-6">Editar Precios</h3>
                <div className="space-y-4">
                    {(tiposFicha || []).map(tipo => (
                        <div key={tipo.id} className="p-4 bg-gray-50 rounded-xl flex justify-between items-center">
                            <span className="font-medium text-gray-900">{tipo.nombre}</span>
                            <input
                                type="number"
                                inputMode="decimal"
                                value={tempPrecios[tipo.id] || ''}
                                onChange={(e) => setTempPrecios({ ...tempPrecios, [tipo.id]: parseFloat(e.target.value) || 0 })}
                                className="w-28 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                style={{ MozAppearance: 'textfield' }}
                                placeholder="0.00"
                            />
                        </div>
                    ))}
                </div>
                <div className="flex flex-col sm:flex-row gap-3 pt-6 mt-6 border-t">
                    <button onClick={handleSave} className="w-full sm:flex-1 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-medium transition-colors flex items-center justify-center"><Check className="w-5 h-5 mr-2" />Guardar</button>
                    <button onClick={onClose} className="w-full sm:flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 px-6 py-3 rounded-xl font-medium transition-colors flex items-center justify-center"><X className="w-5 h-5 mr-2" />Cancelar</button>
                </div>
            </div>
        </div>
    );
};

const ModalPorcentajeComision = ({ isOpen, onClose, revendedor, onSave, porcentajeGlobal }) => {
    const [porcentaje, setPorcentaje] = useState(20.0);
    const [usarGlobal, setUsarGlobal] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (revendedor) {
            // Por defecto, marcar "usar global"; si tiene personalizado > 0, se mostrará ese valor
            const num = Number(revendedor.porcentaje_comision);
            setUsarGlobal(true);
            if (Number.isFinite(num) && num > 0) {
                setPorcentaje(num);
            } else {
                const globalNum = Number(porcentajeGlobal);
                setPorcentaje(Number.isFinite(globalNum) ? globalNum : 20.0);
            }
        }
    }, [revendedor]);

    if (!isOpen) return null;

    const handleSave = async () => {
        if (!usarGlobal) {
            if (porcentaje < 0 || porcentaje > 100) {
                alert('El porcentaje debe estar entre 0 y 100');
                return;
            }
        }
        setLoading(true);
        await onSave(revendedor.id, usarGlobal ? null : parseFloat(porcentaje));
        setLoading(false);
        onClose();
    };

    return (
        <div 
            className="fixed inset-0 flex items-center justify-center z-50 p-4"
            style={{
                backgroundColor: 'rgba(255, 255, 255, 0.3)',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)' // Para Safari
            }}
        >
            <div className="bg-white rounded-xl p-6 w-full max-w-md border border-gray-300 shadow-2xl">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold text-gray-900">Configurar Comisión</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600" disabled={loading}><X className="w-5 h-5" /></button>
                </div>
                                <div className="space-y-4">
                                        <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Revendedor</label>
                                                {(() => {
                                                    const persona = revendedor?.responsable || revendedor?.nombre || revendedor?.nombre_negocio || '—';
                                                    const tienda = revendedor?.nombre_negocio && revendedor?.nombre_negocio !== persona ? revendedor?.nombre_negocio : '';
                                                    return (
                                                        <div className="text-gray-900 font-medium">
                                                            {persona}
                                                            {tienda && <div className="text-sm text-gray-500">{tienda}</div>}
                                                        </div>
                                                    );
                                                })()}
                                        </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Porcentaje de Mi Ganancia (%)</label>
                        <div className="flex items-center gap-3 mb-2">
                            <input id="usarGlobalPct" type="checkbox" checked={usarGlobal} onChange={(e) => setUsarGlobal(e.target.checked)} disabled={loading} />
                            <label htmlFor="usarGlobalPct" className="text-sm text-gray-700">Usar porcentaje global</label>
                        </div>
                        <input
                            type="number" min="0" max="100" step="0.01"
                            inputMode="decimal"
                            value={porcentaje}
                            onChange={(e) => setPorcentaje(e.target.value)}
                            className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            style={{ MozAppearance: 'textfield' }}
                            placeholder="Ej: 20.00"
                            disabled={loading || usarGlobal}
                        />
                    </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 mt-6">
                    <button onClick={onClose} className="w-full sm:flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 py-3 px-4 rounded-lg font-medium transition-colors" disabled={loading}>Cancelar</button>
                    <button onClick={handleSave} disabled={loading || (!usarGlobal && (porcentaje < 0 || porcentaje > 100))} className="w-full sm:flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white py-3 px-4 rounded-lg font-medium transition-colors">{loading ? 'Guardando...' : 'Guardar'}</button>
                </div>
            </div>
        </div>
    );
};


// --- Componente Principal ---

const Entregas = () => {
    const { revendedores = [], tiposFicha = [], loading = false, error, loadAllData, eliminarRevendedor } = useFichas();
    const { notifyUsersChanged, notifyRevendedoresChanged } = useUsers();

    const [modalNotificacion, setModalNotificacion] = useState(null);
    const [modalConfirmacion, setModalConfirmacion] = useState(null);
    const [modalEdicionPrecios, setModalEdicionPrecios] = useState({ isOpen: false, revendedorId: null });
    const [modalComision, setModalComision] = useState({ isOpen: false, revendedor: null });
    const [filtroRevendedores, setFiltroRevendedores] = useState('');
    const [porcentajeGlobal, setPorcentajeGlobal] = useState(20);

    // Cargar porcentaje global configurado (fallback cuando revendedor no tiene override)
    useEffect(() => {
        let isMounted = true;

        const cargarPorcentajeGlobal = async () => {
            try {
                const conf = await fichasService.obtenerConfiguracionClave('porcentaje_ganancia_creador');
                const val = conf?.valor != null ? parseFloat(conf.valor) : NaN;
                if (isMounted && !Number.isNaN(val)) setPorcentajeGlobal(val);
            } catch (_) {
                // Mantener 20 por defecto si no existe o falla
            }
        };

        // Inicial
        cargarPorcentajeGlobal();

        // Refrescar cuando cambie la configuración global en otra pantalla
        const onConfigChanged = (ev) => {
            if (ev?.detail?.clave === 'porcentaje_ganancia_creador') {
                const raw = ev.detail.valor;
                const val = raw != null && `${raw}`.trim() !== '' && !Number.isNaN(parseFloat(raw))
                    ? parseFloat(raw)
                    : null;
                if (val !== null) setPorcentajeGlobal(val);
            }
        };
        window.addEventListener('configChanged', onConfigChanged);

        // También actualizar al recuperar el foco (por si la edición fue en otra pestaña)
        const onFocus = () => cargarPorcentajeGlobal();
        window.addEventListener('focus', onFocus);

        return () => {
            isMounted = false;
            window.removeEventListener('configChanged', onConfigChanged);
            window.removeEventListener('focus', onFocus);
        };
    }, []);

    const mostrarNotificacion = (mensaje, tipo = 'success') => {
        setModalNotificacion({ mensaje, tipo });
    };

    const revendedoresFiltrados = revendedores.filter(revendedor => {
        if (!filtroRevendedores.trim()) return true;
        const filtro = filtroRevendedores.toLowerCase();
        return (
            (revendedor.responsable || revendedor.nombre || revendedor.nombre_negocio || '').toLowerCase().includes(filtro) ||
            (revendedor.responsable || '').toLowerCase().includes(filtro) ||
            (revendedor.telefono || '').toLowerCase().includes(filtro) ||
            (revendedor.direccion || '').toLowerCase().includes(filtro)
        );
    });

        const calcularResumenFinancieroLocal = (revendedor) => {
        if (!revendedor || !tiposFicha) return { tieneInventario: false };

                // Normalizar porcentaje: 0/null/"" => usar global; solo override si > 0
                const pctRaw = revendedor.porcentaje_comision;
                const numRaw = Number(pctRaw);
                const pctNum = (Number.isFinite(numRaw) && numRaw > 0) ? numRaw : null;
                const globalNum = (porcentajeGlobal !== null && porcentajeGlobal !== undefined && `${porcentajeGlobal}`.trim() !== '' && !Number.isNaN(parseFloat(porcentajeGlobal)))
                    ? parseFloat(porcentajeGlobal)
                    : null;
                const PORCENTAJE_GANANCIA_CREADOR = (pctNum !== null ? pctNum : (globalNum !== null ? globalNum : 20));
        let totalSubtotal = 0;
        let totalFichasEntregadas = 0;
        let totalFichasVendidas = 0;

        (revendedor.inventarios || []).forEach(inv => {
            const tipo = tiposFicha.find(tf => tf.id === inv.tipo_ficha_id);
            const precioItem = revendedor.precios?.find(p => p.tipo_ficha_id === inv.tipo_ficha_id);
            const precio = precioItem?.precio || tipo?.precio_venta || 0;

            totalSubtotal += inv.fichas_vendidas * precio;
            totalFichasEntregadas += inv.fichas_entregadas;
            totalFichasVendidas += inv.fichas_vendidas;
        });

        const totalGananciaCreador = totalSubtotal * (PORCENTAJE_GANANCIA_CREADOR / 100);
        const totalGananciaRevendedor = totalSubtotal - totalGananciaCreador;

    return {
            totalFichasEntregadas,
            totalFichasVendidas,
            totalFichasExistentes: totalFichasEntregadas - totalFichasVendidas,
            totalSubtotal,
            totalGananciaCreador,
            totalGananciaRevendedor,
            porcentajeGananciaCreador: PORCENTAJE_GANANCIA_CREADOR,
            tieneInventario: (revendedor.inventarios || []).length > 0
        };
    };


    const handleUpdateVendidas = async (revendedorId, tipoFichaId, nuevasVendidas) => {
        try {
            await fichasService.actualizarVendidasDirecto(revendedorId, tipoFichaId, nuevasVendidas);
            mostrarNotificacion('Cantidad vendida actualizada', 'success');
            await loadAllData();
        } catch (error) {
            console.error('Error al actualizar vendidas:', error);
            mostrarNotificacion('Error al actualizar cantidad vendida', 'error');
        }
    };
    
    // Ajustes rápidos tipo Excel
    const ajustarInventarioExcel = async (revendedorId, tipoFichaNombre, campo, cantidad) => {
        try {
            const tipoFichaObj = tiposFicha.find(tipo => tipo.nombre === tipoFichaNombre);
            if (!tipoFichaObj) throw new Error('Tipo de ficha no encontrado');
            await fichasService.ajustarInventarioExcel(revendedorId, tipoFichaObj.id, campo, cantidad);
            mostrarNotificacion('Inventario ajustado', 'success');
            await loadAllData();
        } catch (error) {
            console.error('Error al ajustar inventario:', error);
            mostrarNotificacion(`Error al ajustar inventario: ${error.message}`, 'error');
        }
    };

    // Guardar precios de un revendedor (desde el modal)
    const handleSavePrecios = async (revendedorId, nuevosPreciosPorId) => {
        try {
            // Mapear { tipoId: precio } -> { keyFromNombre: precio }
            const preciosMap = {};
            for (const [idStr, precioVal] of Object.entries(nuevosPreciosPorId || {})) {
                const id = parseInt(idStr, 10);
                const tf = (tiposFicha || []).find(t => t.id === id);
                if (!tf) continue;
                const keyFromNombre = tf.nombre?.replace(/\s+/g, '').replace('horas', 'h').replace('hora', 'h');
                const precio = parseFloat(precioVal);
                if (!Number.isNaN(precio) && precio > 0) preciosMap[keyFromNombre] = precio;
            }

            await fichasService.actualizarPreciosRevendedor(revendedorId, preciosMap);
            setModalEdicionPrecios({ isOpen: false, revendedorId: null });
            mostrarNotificacion('Precios actualizados exitosamente');
            await loadAllData();
        } catch (error) {
            console.error('Error al actualizar precios:', error);
            mostrarNotificacion(`Error al actualizar precios: ${error.message}`, 'error');
        }
    };

    const handleSaveComision = async (revendedorId, nuevoPorcentaje) => {
        try {
            await fichasService.actualizarPorcentajeComision(revendedorId, nuevoPorcentaje);
            mostrarNotificacion('Porcentaje de comisión actualizado', 'success');
            await loadAllData();
        } catch (error) {
            console.error('Error al actualizar porcentaje:', error);
            mostrarNotificacion(`Error al actualizar comisión: ${error.message}`, 'error');
        }
    };

    const handleDeleteRevendedor = async (revendedorId) => {
        try {
            const resultado = await eliminarRevendedor(revendedorId);
            if (resultado.success) {
                setModalConfirmacion(null);
                mostrarNotificacion('Revendedor eliminado exitosamente');
                notifyRevendedoresChanged();
                notifyUsersChanged();
            } else {
                throw new Error(resultado.error || 'Error desconocido');
            }
        } catch (error) {
            console.error('Error al eliminar revendedor:', error);
            mostrarNotificacion(`Error al eliminar: ${error.message}`, 'error');
        }
    };

    return (
        <div className="bg-gray-50 min-h-screen">
            <div className="w-full max-w-none mx-auto px-3 sm:px-4 md:px-5 lg:px-6 py-4 space-y-5">
                <div className="flex items-center space-x-4">
                    <div className="w-14 h-14 bg-white border border-gray-200 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm"><Users className="w-7 h-7 text-blue-600" /></div>
                    <div>
                        <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Gestión de Revendedores</h1>
                        <p className="text-gray-600">Administra inventarios, precios y comisiones.</p>
                    </div>
                </div>

                {loading && <div className="text-center py-8 text-gray-500">Cargando...</div>}
                {error && <div className="bg-red-100 text-red-700 p-4 rounded-lg">{error}</div>}

                {!loading && !error && (
                    <div className="space-y-6">
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                            <input
                                type="text"
                                placeholder="Buscar por nombre, responsable, teléfono..."
                                value={filtroRevendedores}
                                onChange={(e) => setFiltroRevendedores(e.target.value)}
                                className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        {revendedoresFiltrados.length > 0 ? (
                            <div className="space-y-6">
                                {revendedoresFiltrados.map(revendedor => (
                                    <RevendedorCard
                                        key={revendedor.id}
                                        revendedor={revendedor}
                                        tiposFicha={tiposFicha}
                                        onEditPrecios={(id) => setModalEdicionPrecios({ isOpen: true, revendedorId: id })}
                                                                                onDelete={(r) => setModalConfirmacion({
                                                                                        title: 'Eliminar Revendedor',
                                                                                        message: (() => {
                                                                                            const persona = r.responsable || r.nombre || r.nombre_negocio || '—';
                                                                                            const tienda = r.nombre_negocio && r.nombre_negocio !== persona ? ` (${r.nombre_negocio})` : '';
                                                                                            return `¿Seguro que quieres eliminar a "${persona}${tienda}"? Esta acción no se puede deshacer.`;
                                                                                        })(),
                                                                                        onConfirm: () => handleDeleteRevendedor(r.id),
                                                                                        onCancel: () => setModalConfirmacion(null)
                                                                                })}
                                        onEditComision={(r) => setModalComision({ isOpen: true, revendedor: r })}
                                        onUpdateVendidas={handleUpdateVendidas}
                                        calcularResumenFinanciero={calcularResumenFinancieroLocal}
                                        ajustarInventarioExcel={ajustarInventarioExcel}
                                        porcentajeGlobal={porcentajeGlobal}
                                    />
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-16 text-gray-500">
                                <Users className="mx-auto h-16 w-16 text-gray-300 mb-4" />
                                <p className="text-xl font-medium">No se encontraron revendedores</p>
                                <p className="text-md text-gray-400 mt-1">{filtroRevendedores ? 'Intenta con otros términos de búsqueda.' : 'Agrega revendedores desde el panel de usuarios.'}</p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {modalNotificacion && <NotificationPopup message={modalNotificacion.mensaje} type={modalNotificacion.tipo} onClose={() => setModalNotificacion(null)} />}
            {modalConfirmacion && <ConfirmationModal {...modalConfirmacion} />}
            <ModalEdicionPrecios isOpen={modalEdicionPrecios.isOpen} onClose={() => setModalEdicionPrecios({ isOpen: false, revendedorId: null })} onSave={handleSavePrecios} tiposFicha={tiposFicha} revendedorId={modalEdicionPrecios.revendedorId} />
            <ModalPorcentajeComision isOpen={modalComision.isOpen} onClose={() => setModalComision({ isOpen: false, revendedor: null })} onSave={handleSaveComision} revendedor={modalComision.revendedor} porcentajeGlobal={porcentajeGlobal} />
        </div>
    );
};

export default Entregas;
