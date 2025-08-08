// Stock.jsx - Gestión de Stock Global de Fichas (Versión Optimizada Sin Recarga Manual)
import React, { useState, useEffect } from 'react';
import { useFichas } from '../../context/FichasContext';
import { fichasService } from '../../services/fichasService';
import { 
  Package, 
  Plus, 
  TrendingUp,
  DollarSign, 
  Users, 
  Calculator,
  Send,
  AlertCircle,
  Check,
  X,
  Edit3,
  Info,
  Trash2,
  Save,
  Boxes
} from 'lucide-react';

// --- COMPONENTES DE UI MODULARES ---

/**
 * Muestra una notificación emergente (modal) para éxito, error o información.
 */
const NotificationModal = ({ isOpen, onClose, message, type = 'success' }) => {
  if (!isOpen) return null;

  const config = {
    success: { color: 'bg-green-100 text-green-800 border-green-200', icon: <Check className="w-5 h-5" /> },
    error: { color: 'bg-red-100 text-red-800 border-red-200', icon: <AlertCircle className="w-5 h-5" /> },
    info: { color: 'bg-blue-100 text-blue-800 border-blue-200', icon: <Info className="w-5 h-5" /> }
  };
  const { color, icon } = config[type];

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 animate-in fade-in-25">
      <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl animate-in zoom-in-95">
        <div className={`flex items-center space-x-3 p-4 rounded-lg border ${color}`}>
          {icon}
          <p className="font-medium">{message}</p>
        </div>
        <div className="flex justify-end mt-5">
          <button onClick={onClose} className="px-5 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">Aceptar</button>
        </div>
      </div>
    </div>
  );
};

/**
 * Muestra un modal de confirmación para acciones críticas.
 */
const ConfirmModal = ({ isOpen, onClose, onConfirm, title, message }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 animate-in fade-in-25">
      <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl animate-in zoom-in-95">
        <div className="flex items-start space-x-4 mb-4">
          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0"><Info className="w-6 h-6 text-blue-600" /></div>
          <div>
            <h3 className="text-xl font-bold text-gray-900">{title}</h3>
            <p className="text-gray-600 mt-2 whitespace-pre-line">{message}</p>
          </div>
        </div>
        <div className="flex justify-end space-x-3 mt-6">
          <button onClick={onClose} className="px-5 py-2 bg-gray-200 text-gray-800 font-semibold rounded-lg hover:bg-gray-300 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2">Cancelar</button>
          <button onClick={() => { onConfirm(); onClose(); }} className="px-5 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">Confirmar</button>
        </div>
      </div>
    </div>
  );
};

/**
 * Tarjeta de resumen para mostrar métricas clave.
 */
const SummaryCard = ({ titulo, valor, icono, colorClass }) => (
  <div className="bg-white border border-gray-200/80 rounded-2xl p-3 sm:p-5 shadow-sm hover:shadow-md transition-shadow duration-300">
    <div className="flex items-center justify-between gap-2">
      <div className='min-w-0 flex-1'>
        <p className={`text-xs sm:text-sm font-semibold ${colorClass} uppercase tracking-wider leading-tight`}>{titulo}</p>
        <p className="text-lg sm:text-3xl font-bold text-gray-800 mt-1 truncate leading-tight">{valor}</p>
      </div>
      <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center ${colorClass} bg-opacity-10 flex-shrink-0`}>
        <div className="w-5 h-5 sm:w-6 sm:h-6">{icono}</div>
      </div>
    </div>
  </div>
);

/**
 * Componente genérico para un campo de formulario.
 */
const FormField = ({ label, children }) => (
  <div>
    <label className="text-sm font-medium text-gray-600 mb-1 block">{label}</label>
    {children}
  </div>
);

const StyledInput = (props) => (
  <input 
    {...props} 
    className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-moz-appearance]:textfield"
    style={{
      MozAppearance: 'textfield'
    }}
  />
);

const StyledSelect = (props) => (
  <select {...props} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition" />
);

const ActionButton = ({ onClick, children, className, disabled }) => (
    <button onClick={onClick} disabled={disabled} className={`w-full font-semibold py-2.5 px-4 rounded-lg transition-all duration-200 flex items-center justify-center space-x-2 focus:outline-none focus:ring-2 focus:ring-offset-2 ${className}`}>
        {children}
    </button>
);


/**
 * Formulario para agregar nuevo stock de fichas.
 */
const AddStockForm = ({ nuevoStock, setNuevoStock, tiposFicha, agregarStock }) => {
  
  // Función para manejar el cambio de tipo de ficha
  const handleTipoChange = (e) => {
    const tipoSeleccionado = e.target.value;
    const tipoFicha = tiposFicha.find(tipo => tipo.nombre === tipoSeleccionado);
    
    setNuevoStock({ 
      ...nuevoStock, 
      tipo: tipoSeleccionado,
      precio: tipoFicha ? tipoFicha.precio_venta : ''
    });
  };

  return (
    <div className="space-y-4">
      <FormField label="Tipo de Ficha">
        <StyledSelect value={nuevoStock.tipo} onChange={handleTipoChange}>
          <option value="">Selecciona un tipo</option>
          {tiposFicha.map(tipo => <option key={tipo.id} value={tipo.nombre}>{tipo.nombre}</option>)}
        </StyledSelect>
      </FormField>
      <FormField label="Cantidad">
        <StyledInput 
          type="number" 
          inputMode="numeric"
          value={nuevoStock.cantidad} 
          onChange={(e) => setNuevoStock({ ...nuevoStock, cantidad: e.target.value })} 
          placeholder="Ej: 100" 
        />
      </FormField>
      <FormField label="Precio de Venta por Ficha ($)">
        <StyledInput 
          type="number" 
          inputMode="decimal"
          value={nuevoStock.precio} 
          onChange={(e) => setNuevoStock({ ...nuevoStock, precio: e.target.value })} 
          placeholder="Se llena automáticamente" 
          step="0.01"
          readOnly={!!nuevoStock.tipo}
          className={`mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${!!nuevoStock.tipo ? 'bg-gray-50 cursor-not-allowed' : ''}`}
        />
        {nuevoStock.tipo && (
          <p className="text-xs text-gray-500 mt-1">
            💡 Precio automático del tipo "{nuevoStock.tipo}". Puedes modificar el precio en la sección "Tipos de Fichas".
          </p>
        )}
      </FormField>
      <ActionButton onClick={agregarStock} className="bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500">
        <Plus className="w-5 h-5" />
        <span>Agregar Stock</span>
      </ActionButton>
    </div>
  );
};

/**
 * Formulario para entregar fichas a los revendedores.
 */
const DeliverStockForm = ({ entregaActual, setEntregaActual, revendedores, tiposFicha, entregarFichasDeStock }) => (
  <div className="space-y-4">
    <FormField label="Revendedor">
      <StyledSelect value={entregaActual.revendedorId} onChange={(e) => setEntregaActual({ ...entregaActual, revendedorId: e.target.value })}>
        <option value="">Selecciona un revendedor</option>
        {revendedores.map(r => <option key={r.id} value={r.id}>{r.nombre}</option>)}
      </StyledSelect>
    </FormField>
    <FormField label="Tipo de Ficha">
      <StyledSelect value={entregaActual.tipo} onChange={(e) => setEntregaActual({ ...entregaActual, tipo: e.target.value })}>
        <option value="">Selecciona un tipo</option>
        {tiposFicha.map(tipo => <option key={tipo.id} value={tipo.nombre}>{tipo.nombre}</option>)}
      </StyledSelect>
    </FormField>
    <FormField label="Cantidad a Entregar">
      <StyledInput 
        type="number" 
        inputMode="numeric"
        value={entregaActual.cantidad} 
        onChange={(e) => setEntregaActual({ ...entregaActual, cantidad: e.target.value })} 
        placeholder="Ej: 50" 
      />
    </FormField>
    <ActionButton onClick={entregarFichasDeStock} className="bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500">
      <Send className="w-5 h-5" />
      <span>Entregar Fichas</span>
    </ActionButton>
  </div>
);

/**
 * Componente para gestionar (crear, listar, editar, eliminar) los tipos de fichas.
 */
const TicketTypesManager = ({
  tiposFicha,
  nuevoTipoFicha, setNuevoTipoFicha,
  duracionNuevoTipo, setDuracionNuevoTipo,
  unidadDuracion, setUnidadDuracion,
  precioVentaNuevoTipo, setPrecioVentaNuevoTipo,
  agregarTipoFichaLocal,
  editandoTipo, iniciarEdicion, cancelarEdicion,
  tipoEditado, setTipoEditado, guardarEdicion,
  eliminarTipo
}) => (
  <div className="space-y-6">
    <div className="space-y-4 p-4 border border-gray-200 rounded-lg bg-gray-50/50">
      <h3 className="font-semibold text-gray-800">Crear Nuevo Tipo de Ficha</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField label="Duración">
          <div className="flex">
            <StyledInput 
              type="number" 
              inputMode="numeric"
              value={duracionNuevoTipo} 
              onChange={e => setDuracionNuevoTipo(e.target.value)} 
              placeholder="Ej: 24" 
              className="rounded-r-none"
            />
            <StyledSelect value={unidadDuracion} onChange={e => setUnidadDuracion(e.target.value)} className="rounded-l-none border-l-0">
              <option value="H">Horas</option>
              <option value="S">Semanas</option>
              <option value="M">Meses</option>
            </StyledSelect>
          </div>
        </FormField>
        <FormField label="Precio Venta ($)">
          <StyledInput 
            type="number" 
            inputMode="decimal"
            value={precioVentaNuevoTipo} 
            onChange={e => setPrecioVentaNuevoTipo(e.target.value)} 
            placeholder="Ej: 10.00" 
            step="0.01" 
          />
        </FormField>
      </div>
      <FormField label="Nombre (Opcional)">
        <StyledInput type="text" value={nuevoTipoFicha} onChange={e => setNuevoTipoFicha(e.target.value)} placeholder="Autogenerado si se deja vacío" />
      </FormField>
      <ActionButton onClick={agregarTipoFichaLocal} className="bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500">
        <Plus className="w-5 h-5" />
        <span>Crear Tipo</span>
      </ActionButton>
    </div>

    <div className="space-y-3">
      <h3 className="font-semibold text-gray-800 mb-2">Tipos Existentes</h3>
      {tiposFicha && tiposFicha.length > 0 ? (
        tiposFicha.map(tipo => (
          editandoTipo === tipo.id ? (
            <div key={tipo.id} className="bg-blue-50 p-4 rounded-lg space-y-3 border border-blue-200">
              <StyledInput value={tipoEditado.nombre} onChange={e => setTipoEditado({...tipoEditado, nombre: e.target.value})} />
              <StyledInput 
                type="number" 
                inputMode="numeric"
                value={tipoEditado.duracion_horas} 
                onChange={e => setTipoEditado({...tipoEditado, duracion_horas: e.target.value})} 
                placeholder="Duración en Horas" 
              />
              <StyledInput 
                type="number" 
                inputMode="decimal"
                value={tipoEditado.precio_venta} 
                onChange={e => setTipoEditado({...tipoEditado, precio_venta: e.target.value})} 
                placeholder="Precio de Venta" 
                step="0.01" 
              />
              <div className="flex justify-end space-x-2">
                <button onClick={cancelarEdicion} className="p-2 bg-gray-200 rounded-full hover:bg-gray-300 transition-colors"><X className="w-4 h-4 text-gray-700" /></button>
                <button onClick={guardarEdicion} className="p-2 bg-green-500 rounded-full hover:bg-green-600 transition-colors"><Check className="w-4 h-4 text-white" /></button>
              </div>
            </div>
          ) : (
            <div key={tipo.id} className="flex items-center justify-between bg-white p-3 rounded-lg border border-gray-200 hover:border-blue-400 transition-colors">
              <div>
                <p className="font-semibold text-gray-800">{tipo.nombre}</p>
                <p className="text-sm text-gray-500">{tipo.duracion_horas} horas - ${Number(tipo.precio_venta || 0).toFixed(2)}</p>
              </div>
              <div className="flex items-center space-x-1">
                <button onClick={() => iniciarEdicion(tipo)} className="p-2 rounded-full hover:bg-gray-100 text-gray-500 hover:text-blue-600 transition-colors"><Edit3 className="w-4 h-4" /></button>
                <button onClick={() => eliminarTipo(tipo)} className="p-2 rounded-full hover:bg-red-50 text-gray-500 hover:text-red-600 transition-colors"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          )
        ))
      ) : (
        <div className="text-center py-6 text-gray-500">
          <Package className="w-12 h-12 mx-auto mb-2 text-gray-300" />
          <p>No hay tipos de fichas creados</p>
          <p className="text-sm">Crea tu primer tipo usando el formulario de arriba</p>
        </div>
      )}
    </div>
  </div>
);

/**
 * Componente para mostrar el inventario de stock global
 */
const GlobalStockInventory = ({ stockGlobal, tiposFicha, porcentajeComisionGlobal }) => {
  if (!stockGlobal || !Array.isArray(stockGlobal) || stockGlobal.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <Package className="w-16 h-16 mx-auto mb-4 text-gray-300" />
        <h3 className="text-lg font-semibold text-gray-700 mb-2">No hay stock disponible</h3>
        <p>Agrega fichas al inventario para verlas aquí</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
        <div className="flex items-center space-x-2">
          <Info className="w-4 h-4 text-blue-600 flex-shrink-0" />
          <p className="text-sm text-blue-800">
            <strong>Stock Global:</strong> Inventario total disponible para entregar a revendedores.
          </p>
        </div>
      </div>
      
      <div className="grid gap-3">
        {stockGlobal.map(item => {
          const tipoFicha = tiposFicha.find(t => t.id === item.tipo_ficha_id);
          const cantidad = Number(item.cantidad_disponible) || 0;
          const precio = Number(item.precio_base) || 0;
          const tuGanancia = precio * (Number(porcentajeComisionGlobal) / 100);
          const paraRevendedor = precio - tuGanancia;
          const valorTotal = cantidad * precio;
          
          return (
            <div key={item.tipo_ficha_id} className="bg-white border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    <div>
                      <h4 className="font-semibold text-gray-900">{tipoFicha?.nombre || 'Tipo desconocido'}</h4>
                      <p className="text-sm text-gray-500">
                        {tipoFicha?.duracion_horas} horas de duración
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="text-right">
                  <div className="text-2xl font-bold text-gray-900">
                    {cantidad.toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-500">fichas</div>
                </div>
              </div>
              
              <div className="mt-4 grid grid-cols-2 lg:grid-cols-4 gap-3 pt-3 border-t border-gray-100">
                <div className="text-center">
                  <div className="text-sm font-semibold text-green-600">${precio.toFixed(2)}</div>
                  <div className="text-xs text-gray-500">Precio unitario</div>
                </div>
                <div className="text-center">
                  <div className="text-sm font-semibold text-blue-600">${tuGanancia.toFixed(2)}</div>
                  <div className="text-xs text-gray-500">Tu ganancia</div>
                </div>
                <div className="text-center">
                  <div className="text-sm font-semibold text-amber-600">${paraRevendedor.toFixed(2)}</div>
                  <div className="text-xs text-gray-500">P/ revendedor</div>
                </div>
                <div className="text-center">
                  <div className="text-sm font-semibold text-gray-700">${valorTotal.toLocaleString()}</div>
                  <div className="text-xs text-gray-500">Valor total</div>
                </div>
              </div>
              
              {cantidad <= 10 && cantidad > 0 && (
                <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded-md">
                  <div className="flex items-center space-x-2">
                    <AlertCircle className="w-4 h-4 text-yellow-600" />
                    <p className="text-sm text-yellow-800">Stock bajo - Solo quedan {cantidad} fichas</p>
                  </div>
                </div>
              )}
              
              {cantidad === 0 && (
                <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded-md">
                  <div className="flex items-center space-x-2">
                    <AlertCircle className="w-4 h-4 text-red-600" />
                    <p className="text-sm text-red-800">Sin stock disponible</p>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

/**
 * Componente para configurar el porcentaje de ganancia.
 */
const CommissionSettings = ({ porcentajeComisionGlobal, setPorcentajeComisionGlobal, guardarComisionGlobal, hayCambiosSinGuardar, guardandoComision }) => (
  <div className="space-y-4">
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
      <div className="flex items-center space-x-2">
        <Info className="w-4 h-4 text-blue-600 flex-shrink-0" />
        <p className="text-sm text-blue-800">
          <strong>Configuración de Ganancia:</strong> Define qué porcentaje de cada venta te corresponde como creador del sistema.
        </p>
      </div>
    </div>
    {hayCambiosSinGuardar && (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
        <div className="flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 text-yellow-600 flex-shrink-0" />
          <p className="text-sm text-yellow-800">
            Tienes cambios sin guardar. Haz clic en "Guardar Cambios" para aplicar la configuración.
          </p>
        </div>
      </div>
    )}
    <FormField label="Tu porcentaje de ganancia sobre ventas (%)">
      <div className="relative pt-1">
        <input
          type="range"
          min="0"
          max="100"
          value={porcentajeComisionGlobal}
          onChange={(e) => setPorcentajeComisionGlobal(parseFloat(e.target.value))}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
        />
        <div className="text-center text-xl font-bold text-blue-600 mt-2">{porcentajeComisionGlobal}%</div>
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>Tu ganancia: {porcentajeComisionGlobal}%</span>
          <span>Para revendedor: {100 - porcentajeComisionGlobal}%</span>
        </div>
      </div>
    </FormField>
    <div className="space-y-2">
      <ActionButton
        onClick={guardarComisionGlobal}
        disabled={!hayCambiosSinGuardar || guardandoComision}
        className="bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500 disabled:bg-blue-300 disabled:cursor-not-allowed"
      >
        <Save className="w-5 h-5" />
        <span>{guardandoComision ? 'Guardando...' : 'Guardar Cambios'}</span>
      </ActionButton>
    </div>
    {!hayCambiosSinGuardar && <p className="text-xs text-center text-green-600 font-medium">✅ Configuración guardada</p>}
  </div>
);

const SectionCard = ({ icon, title, subtitle, children }) => (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200/80 p-6">
        <div className="flex items-center space-x-4 mb-6">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">{icon}</div>
            <div>
                <h2 className="text-xl font-bold text-gray-900">{title}</h2>
                <p className="text-gray-500 text-sm">{subtitle}</p>
            </div>
        </div>
        {children}
    </div>
);


// --- COMPONENTE PRINCIPAL ---

const Stock = () => {
  // --- CONTEXTO Y ESTADOS (LÓGICA ORIGINAL) ---
  const {
    stockGlobal,
    tiposFicha,
    revendedores,
    agregarTipoFicha,
    actualizarTipoFicha,
    eliminarTipoFicha,
    loadAllData
  } = useFichas();

  // --- DEDUPLICACIÓN DE DATOS PARA EVITAR WARNING DE CLAVES DUPLICADAS ---
  // Si por cualquier razón el backend retorna elementos duplicados (mismo id),
  // React mostrará el warning 'Encountered two children with the same key'.
  // Normalizamos aquí para la capa de UI sin mutar los arrays originales del contexto.
  const uniqueTiposFicha = React.useMemo(() => {
    const seen = new Set();
    return (tiposFicha || []).filter(t => t && !seen.has(t.id) && (seen.add(t.id), true));
  }, [tiposFicha]);

  const uniqueStockGlobal = React.useMemo(() => {
    const seen = new Set();
    return (stockGlobal || []).filter(it => it && !seen.has(it.tipo_ficha_id) && (seen.add(it.tipo_ficha_id), true));
  }, [stockGlobal]);

  // Helper para generar una key segura cuando el id falta o es 0 duplicado
  const safeKey = (prefix, id, extra='') => {
    if (id === undefined || id === null) return `${prefix}-null-${extra}`;
    return `${prefix}-${id}-${extra}`;
  };
  
  const [nuevoStock, setNuevoStock] = useState({ tipo: '', cantidad: '', precio: '' });
  const [porcentajeComisionGlobal, setPorcentajeComisionGlobal] = useState(25);
  const [porcentajeOriginal, setPorcentajeOriginal] = useState(25);
  const [guardandoComision, setGuardandoComision] = useState(false);
  const [nuevoTipoFicha, setNuevoTipoFicha] = useState('');
  const [duracionNuevoTipo, setDuracionNuevoTipo] = useState('');
  const [unidadDuracion, setUnidadDuracion] = useState('H');
  const [precioVentaNuevoTipo, setPrecioVentaNuevoTipo] = useState('');
  const [editandoTipo, setEditandoTipo] = useState(null);
  const [tipoEditado, setTipoEditado] = useState({ nombre: '', duracion_horas: '', precio_venta: '' });
  const [entregaActual, setEntregaActual] = useState({ revendedorId: '', tipo: '', cantidad: '' });
  const [notificationModal, setNotificationModal] = useState({ isOpen: false, message: '', type: 'success' });
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', onConfirm: () => {} });
  
  const [vistaMovil, setVistaMovil] = useState('agregar');
  
  // --- LÓGICA DE NEGOCIO ---

  const mostrarNotificacion = (mensaje, tipo = 'success') => {
    setNotificationModal({ isOpen: true, message: mensaje, type: tipo });
  };

  const cerrarNotificacion = () => setNotificationModal({ isOpen: false, message: '', type: 'success' });

  const mostrarConfirmacion = (titulo, mensaje, onConfirm) => {
    setConfirmModal({ isOpen: true, title: titulo, message: mensaje, onConfirm });
  };

  const cerrarConfirmacion = () => setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: () => {} });

  const guardarComisionGlobal = async () => {
    if (porcentajeComisionGlobal < 0 || porcentajeComisionGlobal > 100) {
      mostrarNotificacion('El porcentaje debe estar entre 0 y 100', 'error');
      return;
    }
    setGuardandoComision(true);
    try {
      // Intentar actualizar primero
      try {
        await fichasService.actualizarConfiguracion(
          'porcentaje_ganancia_creador', 
          porcentajeComisionGlobal, 
          'Porcentaje de ganancia del creador de fichas sobre las ventas'
        );
        mostrarNotificacion(`Tu porcentaje de ganancia actualizado a ${porcentajeComisionGlobal}%`, 'success');
      } catch (updateError) {
        // Si falla la actualización (configuración no existe), crear la configuración
        if (updateError.response?.status === 404) {
          await fichasService.crearConfiguracion(
            'porcentaje_ganancia_creador',
            porcentajeComisionGlobal,
            'Porcentaje de ganancia del creador de fichas sobre las ventas',
            'number'
          );
          mostrarNotificacion(`Configuración creada. Tu porcentaje de ganancia establecido en ${porcentajeComisionGlobal}%`, 'success');
        } else {
          throw updateError; // Re-lanzar si es otro tipo de error
        }
      }
      
      setPorcentajeOriginal(porcentajeComisionGlobal);
    } catch (error) {
      console.error('Error al guardar el porcentaje de ganancia:', error);
      mostrarNotificacion(
        error.response?.data?.detail || 'Error al guardar la configuración en el servidor', 
        'error'
      );
    } finally {
      setGuardandoComision(false);
    }
  };

  const cargarComisionGlobal = async () => {
    try {
      const configuracion = await fichasService.obtenerConfiguracionClave('porcentaje_ganancia_creador');
      if (configuracion && configuracion.valor !== undefined) {
        const porcentaje = parseFloat(configuracion.valor);
        setPorcentajeComisionGlobal(porcentaje);
        setPorcentajeOriginal(porcentaje);
      } else {
        // La configuración no existe, usar valor por defecto
        setPorcentajeComisionGlobal(25);
        setPorcentajeOriginal(25);
      }
    } catch (error) {
      console.error('Error al cargar la comisión global desde el servidor:', error);
      // Si hay error (404, tabla no existe, etc.), usar valor por defecto
      setPorcentajeComisionGlobal(25);
      setPorcentajeOriginal(25);
      
      // Solo mostrar notificación si es un error diferente a 404
      if (error.response?.status !== 404) {
        mostrarNotificacion('Error al cargar configuración. Usando valores por defecto.', 'info');
      }
    }
  };

  useEffect(() => {
    cargarComisionGlobal();
  }, []);

  const hayCambiosSinGuardar = porcentajeComisionGlobal !== porcentajeOriginal;

  const convertirDuracionAHoras = (duracion, unidad) => {
    const dur = parseInt(duracion) || 0;
    switch (unidad) {
      case 'H': return dur;
      case 'S': return dur * 168;
      case 'M': return dur * 730;
      default: return dur;
    }
  };

  const generarNombreTipo = (duracion, unidad) => {
    const dur = parseInt(duracion) || 0;
    if (dur <= 0) return '';
    switch (unidad) {
      case 'H': return dur === 1 ? '1 hora' : `${dur} horas`;
      case 'S': return dur === 1 ? '1 semana' : `${dur} semanas`;
      case 'M': return dur === 1 ? '1 mes' : `${dur} meses`;
      default: return '';
    }
  };

  const agregarStock = async () => {
    const cantidad = parseInt(nuevoStock.cantidad) || 0;
    
    if (!nuevoStock.tipo || cantidad <= 0) {
      mostrarNotificacion('Completa todos los campos correctamente', 'error');
      return;
    }
    const tipoFicha = tiposFicha.find(tipo => tipo.nombre === nuevoStock.tipo);
    if (!tipoFicha) {
      mostrarNotificacion('Tipo de ficha no encontrado', 'error');
      return;
    }
    
    // Usar el precio del tipo de ficha directamente
    const precio = parseFloat(tipoFicha.precio_venta) || 0;
    if (precio <= 0) {
      mostrarNotificacion('El tipo de ficha debe tener un precio de venta válido', 'error');
      return;
    }
    
    const tuGanancia = (precio * porcentajeComisionGlobal / 100);
    const paraRevendedores = precio - tuGanancia;
    const mensaje = `¿Confirmar crear ${cantidad} fichas de ${nuevoStock.tipo}?\n\nPrecio de venta: $${precio}\nTu ganancia por ficha (${porcentajeComisionGlobal}%): $${tuGanancia.toFixed(2)}\nPara revendedor por ficha: $${paraRevendedores.toFixed(2)}`;
    mostrarConfirmacion('Confirmar Creación', mensaje, async () => {
      try {
        const abastecimientoData = {
          tipo_ficha_id: tipoFicha.id,
          cantidad: cantidad,
          proveedor: 'Stock Manual',
          costo_total: precio * cantidad,
          observaciones: `Stock agregado manualmente`
        };
        await fichasService.abastecerStock(abastecimientoData);
        await loadAllData();
        setNuevoStock({ tipo: '', cantidad: '', precio: '' });
        mostrarNotificacion(`Stock agregado exitosamente`, 'success');
      } catch (error) {
        mostrarNotificacion(error.response?.data?.detail || 'Error al agregar stock', 'error');
      }
    });
  };

  const entregarFichasDeStock = async () => {
    const cantidad = parseInt(entregaActual.cantidad);
    if (!entregaActual.revendedorId || !entregaActual.tipo || !cantidad || cantidad <= 0) {
      mostrarNotificacion('Completa todos los campos para la entrega', 'error');
      return;
    }
    const tipoFicha = tiposFicha.find(tipo => tipo.nombre === entregaActual.tipo);
    const revendedor = revendedores.find(r => r.id === parseInt(entregaActual.revendedorId));
    if (!tipoFicha || !revendedor) {
      mostrarNotificacion('Tipo de ficha o revendedor no encontrado', 'error');
      return;
    }
    const stockActual = stockGlobal?.find(item => item.tipo_ficha_id === tipoFicha.id);
    if (!stockActual || stockActual.cantidad_disponible < cantidad) {
      mostrarNotificacion(`Stock insuficiente. Disponibles: ${stockActual?.cantidad_disponible || 0}`, 'error');
      return;
    }
    const mensaje = `¿Confirmar entrega de ${cantidad} fichas de ${entregaActual.tipo} a ${revendedor?.nombre}?`;
    mostrarConfirmacion('Confirmar Entrega', mensaje, async () => {
      try {
        const entregaData = {
          revendedor_id: parseInt(entregaActual.revendedorId),
          tipo_ficha_id: tipoFicha.id,
          cantidad: cantidad,
          tipo_movimiento: 'entrega',
          nota: `Entrega desde stock global`
        };
        await fichasService.entregarFichasDeStock(entregaData);
        await loadAllData();
        setEntregaActual({ revendedorId: '', tipo: '', cantidad: '' });
        mostrarNotificacion(`Entrega realizada a ${revendedor?.nombre}`, 'success');
      } catch (error) {
        mostrarNotificacion(error.response?.data?.detail || 'Error al entregar fichas', 'error');
      }
    });
  };

  const agregarTipoFichaLocal = async () => {
    let nombreFinal = nuevoTipoFicha.trim();
    if (!nombreFinal) nombreFinal = generarNombreTipo(duracionNuevoTipo, unidadDuracion);
    if (!nombreFinal || !duracionNuevoTipo || !precioVentaNuevoTipo) {
      mostrarNotificacion('Completa todos los campos para el nuevo tipo', 'error');
      return;
    }
    if (tiposFicha.some(t => t.nombre.toLowerCase() === nombreFinal.toLowerCase())) {
      mostrarNotificacion('Este tipo de ficha ya existe', 'error');
      return;
    }
    try {
      const tipoData = {
        nombre: nombreFinal,
        duracion_horas: convertirDuracionAHoras(duracionNuevoTipo, unidadDuracion),
        precio_compra: 0,
        precio_venta: parseFloat(precioVentaNuevoTipo) || 0,
        descripcion: `Ficha de ${nombreFinal}`
      };
      const resultado = await agregarTipoFicha(tipoData);
      if (resultado.success) {
        setNuevoTipoFicha(''); setDuracionNuevoTipo(''); setUnidadDuracion('H'); setPrecioVentaNuevoTipo('');
        await loadAllData(); // Recargar datos para mostrar el nuevo tipo
        mostrarNotificacion(`Tipo "${nombreFinal}" agregado`);
      } else {
        mostrarNotificacion(resultado.error || 'Error al agregar', 'error');
      }
    } catch (error) {
      mostrarNotificacion('Error al agregar el tipo de ficha', 'error');
    }
  };

  const iniciarEdicion = (tipo) => {
    setEditandoTipo(tipo.id);
    setTipoEditado({ nombre: tipo.nombre, duracion_horas: tipo.duracion_horas, precio_venta: tipo.precio_venta });
  };

  const cancelarEdicion = () => {
    setEditandoTipo(null);
    setTipoEditado({ nombre: '', duracion_horas: '', precio_venta: '' });
  };

  const guardarEdicion = async () => {
    if (!tipoEditado.nombre || !tipoEditado.duracion_horas || !tipoEditado.precio_venta) {
      mostrarNotificacion('Completa todos los campos', 'error');
      return;
    }
    try {
      const datosActualizados = {
        nombre: tipoEditado.nombre.trim(),
        duracion_horas: parseInt(tipoEditado.duracion_horas) || 1,
        precio_compra: 0,
        precio_venta: parseFloat(tipoEditado.precio_venta) || 0,
        descripcion: `Ficha de ${tipoEditado.nombre.trim()}`
      };
      const resultado = await actualizarTipoFicha(editandoTipo, datosActualizados);
      if (resultado.success) {
        cancelarEdicion();
        await loadAllData(); // Recargar datos para mostrar los cambios
        mostrarNotificacion('Tipo actualizado');
      } else {
        mostrarNotificacion(resultado.error || 'Error al actualizar', 'error');
      }
    } catch (error) {
      mostrarNotificacion('Error al actualizar', 'error');
    }
  };

  const eliminarTipo = async (tipo) => {
    mostrarConfirmacion('Confirmar Eliminación', `¿Seguro que quieres eliminar "${tipo.nombre}"?`, async () => {
      try {
        const resultado = await eliminarTipoFicha(tipo.id);
        if (resultado.success) {
          await loadAllData(); // Recargar datos para actualizar la lista
          mostrarNotificacion(`"${tipo.nombre}" eliminado`);
        } else {
          mostrarNotificacion(resultado.error || 'Error al eliminar', 'error');
        }
      } catch (error) {
        mostrarNotificacion('Error al eliminar', 'error');
      }
    });
  };

  const calcularTotalesStock = () => {
    let totalFichas = 0, valorTotal = 0, comisionTotal = 0, gananciaTotal = 0;
    if (stockGlobal && Array.isArray(stockGlobal)) {
      stockGlobal.forEach(item => {
        if (item && typeof item === 'object') {
          const cantidad = item.cantidad_disponible || 0;
          const precio = item.precio_base || 0;
          const tuGananciaPorFicha = precio * (porcentajeComisionGlobal / 100);
          totalFichas += cantidad;
          valorTotal += cantidad * precio;
          comisionTotal += cantidad * tuGananciaPorFicha;
          gananciaTotal += cantidad * (precio - tuGananciaPorFicha);
        }
      });
    }
    return { totalFichas, valorTotal, comisionTotal, gananciaTotal };
  };

  const totales = calcularTotalesStock();

  // --- RENDERIZADO ---
  
  const renderContent = () => {
      const sections = {
        agregar: (
          <SectionCard icon={<Plus className="w-6 h-6 text-blue-600" />} title="Agregar Stock" subtitle="Añade nuevas fichas al inventario">
            <AddStockForm nuevoStock={nuevoStock} setNuevoStock={setNuevoStock} tiposFicha={uniqueTiposFicha} agregarStock={agregarStock} />
          </SectionCard>
        ),
        entregar: (
          <SectionCard icon={<Send className="w-6 h-6 text-blue-600" />} title="Entregar Fichas" subtitle="Envía fichas a revendedores">
            <DeliverStockForm entregaActual={entregaActual} setEntregaActual={setEntregaActual} revendedores={revendedores} tiposFicha={uniqueTiposFicha} entregarFichasDeStock={entregarFichasDeStock} />
          </SectionCard>
        ),
        inventario: (
          <SectionCard icon={<Boxes className="w-6 h-6 text-blue-600" />} title="Inventario Global" subtitle="Stock disponible por tipo de ficha">
            <GlobalStockInventory stockGlobal={uniqueStockGlobal} tiposFicha={uniqueTiposFicha} porcentajeComisionGlobal={porcentajeComisionGlobal} />
          </SectionCard>
        ),
        tipos: (
          <SectionCard icon={<Package className="w-6 h-6 text-blue-600" />} title="Tipos de Fichas" subtitle="Crea y administra los tipos de fichas">
            <TicketTypesManager 
              tiposFicha={uniqueTiposFicha}
              nuevoTipoFicha={nuevoTipoFicha} setNuevoTipoFicha={setNuevoTipoFicha}
              duracionNuevoTipo={duracionNuevoTipo} setDuracionNuevoTipo={setDuracionNuevoTipo}
              unidadDuracion={unidadDuracion} setUnidadDuracion={setUnidadDuracion}
              precioVentaNuevoTipo={precioVentaNuevoTipo} setPrecioVentaNuevoTipo={setPrecioVentaNuevoTipo}
              agregarTipoFichaLocal={agregarTipoFichaLocal}
              editandoTipo={editandoTipo} iniciarEdicion={iniciarEdicion} cancelarEdicion={cancelarEdicion}
              tipoEditado={tipoEditado} setTipoEditado={setTipoEditado} guardarEdicion={guardarEdicion}
              eliminarTipo={eliminarTipo}
            />
          </SectionCard>
        ),
        config: (
          <SectionCard icon={<Calculator className="w-6 h-6 text-blue-600" />} title="Configuración de Ganancia" subtitle="Define tu porcentaje de comisión">
            <CommissionSettings 
              porcentajeComisionGlobal={porcentajeComisionGlobal} 
              setPorcentajeComisionGlobal={setPorcentajeComisionGlobal} 
              guardarComisionGlobal={guardarComisionGlobal} 
              hayCambiosSinGuardar={hayCambiosSinGuardar} 
              guardandoComision={guardandoComision}
            />
          </SectionCard>
        ),
      };

      return {
        desktop: (
            <div className="hidden lg:grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-6">
                    {sections.agregar}
                    {sections.entregar}
                    {sections.inventario}
                </div>
                <div className="space-y-6">
                    {sections.tipos}
                    {sections.config}
                </div>
            </div>
        ),
        mobile: (
            <div className="lg:hidden space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 p-1 bg-gray-200/80 rounded-xl overflow-x-auto">
                    {Object.keys(sections).map(vista => (
                        <button key={vista} onClick={() => setVistaMovil(vista)} className={`px-3 py-2 text-sm font-semibold rounded-lg transition-all duration-200 whitespace-nowrap ${vistaMovil === vista ? 'bg-white text-blue-600 shadow-md' : 'text-gray-600 hover:bg-white/60'}`}>
                            {vista === 'inventario' ? 'Stock' : vista.charAt(0).toUpperCase() + vista.slice(1)}
                        </button>
                    ))}
                </div>
                {sections[vistaMovil]}
            </div>
        )
      }
  };

  const { desktop, mobile } = renderContent();

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center space-x-4">
                <div className="w-14 h-14 bg-white border border-gray-200 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm"><Package className="w-7 h-7 text-blue-600" /></div>
                <div>
                  <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Gestión de Stock</h1>
                  <p className="text-gray-600">Administra el inventario global de fichas y entregas.</p>
                </div>
            </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
          <SummaryCard titulo="Total Fichas" valor={totales.totalFichas.toLocaleString()} icono={<Package />} colorClass="text-blue-600" />
          <SummaryCard titulo="Valor Total" valor={`$${totales.valorTotal.toLocaleString('es-MX')}`} icono={<DollarSign />} colorClass="text-green-600" />
          <SummaryCard titulo="Tu Ganancia" valor={`$${totales.comisionTotal.toLocaleString('es-MX')}`} icono={<Users />} colorClass="text-amber-600" />
          <SummaryCard titulo="P/ Revendedores" valor={`$${totales.gananciaTotal.toLocaleString('es-MX')}`} icono={<TrendingUp />} colorClass="text-teal-600" />
        </div>

        {/* --- VISTA MÓVIL Y DESKTOP --- */}
        {mobile}
        {desktop}

        <NotificationModal isOpen={notificationModal.isOpen} onClose={cerrarNotificacion} message={notificationModal.message} type={notificationModal.type} />
        <ConfirmModal isOpen={confirmModal.isOpen} onClose={cerrarConfirmacion} onConfirm={confirmModal.onConfirm} title={confirmModal.title} message={confirmModal.message} />
      </div>
    </div>
  );
};

export default Stock;
