// components/Admin/GestionUsuarios.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { 
  Users, Plus, Edit3, Trash2, Eye, EyeOff, Key, Search,
  CheckCircle, XCircle, AlertCircle, Save, X, RefreshCw, Shield, 
  User, UserCheck, Copy, AlertTriangle, Info, Database
} from 'lucide-react';
import usuariosService from '../../services/usuariosService';
import { useUsers } from '../../context/UsersContext';
import passwordGeneratorService from '../../services/passwordGeneratorService';

// --- Componentes de UI Modulares  ---

const Notification = ({ notification, onClose }) => {
    useEffect(() => {
        const timer = setTimeout(onClose, 4000);
        return () => clearTimeout(timer);
    }, [onClose]);

    if (!notification.show) return null;
    const isSuccess = notification.type === 'success';
    return (
        <div className={`mb-4 p-4 rounded-lg flex items-center space-x-3 ${isSuccess ? 'bg-green-100 text-green-800 border border-green-200' : 'bg-red-100 text-red-800 border border-red-200'}`}>
            {isSuccess ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            <span className="font-medium">{notification.message}</span>
        </div>
    );
};

const ErrorModal = ({ errorModal, onClose }) => {
    if (!errorModal.show) return null;
    
    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4 shadow-2xl">
                <div className="text-center">
                    <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                        <AlertCircle className="h-6 w-6 text-red-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Error en la Operación</h3>
                    <p className="text-sm text-gray-600 mb-6 whitespace-pre-line">{errorModal.message}</p>
                    <button 
                        onClick={onClose} 
                        className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                    >
                        Entendido
                    </button>
                </div>
            </div>
        </div>
    );
};

const CredentialsModal = ({ modalConfig, onClose, onCopy }) => {
    if (!modalConfig.show) return null;
    
    const { usuario, password, nombre } = modalConfig;
    
    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4 shadow-2xl">
                <div className="text-center">
                    <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                        <CheckCircle className="h-6 w-6 text-green-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Usuario Creado Exitosamente</h3>
                    <p className="text-sm text-gray-600 mb-6">Guarda estas credenciales para <strong>{nombre || 'el nuevo usuario'}</strong>. No se mostrarán de nuevo.</p>
                    <div className="bg-gray-50 rounded-lg p-4 mb-4 space-y-3 text-left border">
                        <div className="flex justify-between items-center">
                            <span className="text-sm font-medium text-gray-700">Usuario:</span>
                            <code className="text-sm bg-white px-2 py-1 rounded border">{usuario}</code>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-sm font-medium text-gray-700">Contraseña:</span>
                            <code className="text-sm bg-white px-2 py-1 rounded border">{password}</code>
                        </div>
                    </div>
                    <div className="flex space-x-3">
                        <button onClick={() => onCopy(`Usuario: ${usuario}\nContraseña: ${password}`)} className="flex-1 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2">
                            <Copy className="w-4 h-4" /> Copiar
                        </button>
                        <button onClick={onClose} className="flex-1 px-4 py-2 text-sm bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors">Cerrar</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const DeleteConfirmationModal = ({ modalConfig, onConfirm, onClose, loading }) => {
    if (!modalConfig.show) return null;
    
    const { usuario, deletionInfo } = modalConfig;
    
    if (!deletionInfo) {
        // Modal simple si no hay información detallada
        return (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4 shadow-2xl">
                    <div className="text-center">
                        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                            <AlertCircle className="h-6 w-6 text-red-600" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Confirmar Eliminación</h3>
                        <p className="text-sm text-gray-600 mb-4">¿Estás seguro de eliminar a <strong className="text-red-600">"{usuario?.username}"</strong>? Esta acción no se puede deshacer.</p>
                        <div className="flex space-x-3">
                            <button onClick={onClose} className="flex-1 px-4 py-2 text-sm bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors" disabled={loading}>Cancelar</button>
                            <button onClick={onConfirm} disabled={loading} className="flex-1 px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center">
                                {loading ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
                                {loading ? 'Eliminando...' : 'Eliminar'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
    
    const { canDelete, warnings, criticalData, recommendations } = deletionInfo;
    
    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl p-6 w-full max-w-2xl mx-4 shadow-2xl max-h-[90vh] overflow-y-auto">
                <div className="text-center mb-6">
                    <div className={`mx-auto flex items-center justify-center h-12 w-12 rounded-full mb-4 ${canDelete ? 'bg-yellow-100' : 'bg-red-100'}`}>
                        {canDelete ? <AlertTriangle className="h-6 w-6 text-yellow-600" /> : <AlertCircle className="h-6 w-6 text-red-600" />}
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        {canDelete ? '⚠️ Eliminación con Pérdida de Datos' : '🚫 Eliminación Bloqueada'}
                    </h3>
                    <p className="text-sm text-gray-600">
                        Usuario: <strong className="text-red-600">"{usuario?.username}"</strong> ({usuario?.role})
                    </p>
                </div>

                {/* Información crítica */}
                {Object.keys(criticalData).length > 0 && (
                    <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                        <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                            <Database className="w-4 h-4 mr-2" />
                            Datos que se eliminarán permanentemente:
                        </h4>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                            {usuario?.role === 'revendedor' && (
                                <>
                                    <div className="flex justify-between">
                                        <span>📦 Inventarios:</span>
                                        <span className="font-semibold">{criticalData.inventarios || 0}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>🎫 Fichas pendientes:</span>
                                        <span className="font-semibold text-red-600">{criticalData.fichas_pendientes || 0}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>💰 Ventas registradas:</span>
                                        <span className="font-semibold">{criticalData.ventas || 0}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>💵 Monto total ventas:</span>
                                        <span className="font-semibold">${criticalData.monto_total_ventas || 0}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>📋 Entregas:</span>
                                        <span className="font-semibold">{criticalData.entregas || 0}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>🏦 Cortes de caja:</span>
                                        <span className="font-semibold">{criticalData.cortes_caja || 0}</span>
                                    </div>
                                </>
                            )}
                            {usuario?.role === 'trabajador' && (
                                <>
                                    <div className="flex justify-between">
                                        <span>⏳ Tareas pendientes:</span>
                                        <span className="font-semibold text-red-600">{criticalData.tareas_pendientes || 0}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>✅ Tareas completadas:</span>
                                        <span className="font-semibold">{criticalData.tareas_completadas || 0}</span>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                )}

                {/* Advertencias */}
                {warnings.length > 0 && (
                    <div className="mb-6 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                        <h4 className="font-semibold text-yellow-800 mb-3 flex items-center">
                            <AlertTriangle className="w-4 h-4 mr-2" />
                            Advertencias importantes:
                        </h4>
                        <ul className="text-sm text-yellow-700 space-y-1">
                            {warnings.map((warning, index) => (
                                <li key={index} className="flex items-start">
                                    <span className="mr-2">•</span>
                                    {warning}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* Recomendaciones */}
                {recommendations.length > 0 && (
                    <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <h4 className="font-semibold text-blue-800 mb-3 flex items-center">
                            <Info className="w-4 h-4 mr-2" />
                            Recomendaciones:
                        </h4>
                        <ul className="text-sm text-blue-700 space-y-1">
                            {recommendations.map((recommendation, index) => (
                                <li key={index} className="flex items-start">
                                    <span className="mr-2">💡</span>
                                    {recommendation}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* Botones */}
                <div className="flex space-x-3">
                    <button 
                        onClick={onClose} 
                        className="flex-1 px-4 py-2 text-sm bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors" 
                        disabled={loading}
                    >
                        Cancelar
                    </button>
                    
                    {canDelete ? (
                        <button 
                            onClick={onConfirm} 
                            disabled={loading} 
                            className="flex-1 px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center"
                        >
                            {loading ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
                            {loading ? 'Eliminando...' : 'Eliminar Definitivamente'}
                        </button>
                    ) : (
                        <div className="flex-1 px-4 py-2 text-sm bg-gray-100 text-gray-500 rounded-lg text-center">
                            Eliminación Bloqueada
                        </div>
                    )}
                </div>
                
                {canDelete && (
                    <p className="text-xs text-gray-500 text-center mt-3">
                        ⚠️ Esta acción es irreversible. Todo el historial se perderá para siempre.
                    </p>
                )}
            </div>
        </div>
    );
};

const UserFormModal = ({ isOpen, onClose, usuarioEditando, onSave, loading, showNotification }) => {
    const [formData, setFormData] = useState({
        username: '', 
        password: '', 
        role: '', 
        active: true,
        nombre_completo: '', 
        telefono: '', 
        email: '',
        nombre_negocio: '', 
        direccion: '', 
        especialidad: ''
    });
    const [errors, setErrors] = useState({});
    const [mostrarPassword, setMostrarPassword] = useState(false);

    const validateForm = useCallback((data) => {
        const newErrors = {};
        if (!data.username?.trim()) newErrors.username = 'El nombre de usuario es requerido.';
        if (!data.role) newErrors.role = 'El rol es requerido.';
        if (!data.nombre_completo?.trim()) newErrors.nombre_completo = 'El nombre completo es requerido.';
        if (!usuarioEditando && !data.password?.trim()) newErrors.password = 'La contraseña es requerida para nuevos usuarios.';
        // Validación de email solo si se proporciona
        if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
            newErrors.email = 'El formato del email no es válido.';
        }
        return newErrors;
    }, [usuarioEditando]);

    useEffect(() => {
        if (isOpen) {
            const initialData = usuarioEditando ? {
                username: usuarioEditando.username || '', password: '', role: usuarioEditando.role || '', 
                active: usuarioEditando.active !== undefined ? usuarioEditando.active : true,
                nombre_completo: usuarioEditando.nombre_completo || '', telefono: usuarioEditando.telefono || '', email: usuarioEditando.email || '',
                nombre_negocio: usuarioEditando.nombre_negocio || '', direccion: usuarioEditando.direccion || '', especialidad: usuarioEditando.especialidad || ''
            } : {
                username: '', password: '', role: '', active: true,
                nombre_completo: '', telefono: '', email: '',
                nombre_negocio: '', direccion: '', especialidad: ''
            };
            setFormData(initialData);
            setErrors(validateForm(initialData));
        }
    }, [isOpen, usuarioEditando, validateForm]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        const newFormData = { ...formData, [name]: type === 'checkbox' ? checked : value };
        
        // Auto-generar email cuando cambie el username
        if (name === 'username') {
            // Si hay username y el email está vacío O es un email auto-generado previo
            if (value && value.trim() && 
                (!formData.email || 
                 formData.email === '' || 
                 formData.email === `${formData.username}@empresa.com` ||
                 formData.email.endsWith('@empresa.com'))) {
                newFormData.email = `${value.trim()}@empresa.com`;
            }
            // Si se borra el username, limpiar el email auto-generado
            else if ((!value || value.trim() === '') && formData.email && formData.email.endsWith('@empresa.com')) {
                newFormData.email = '';
            }
        }
        
        setFormData(newFormData);
        setErrors(validateForm(newFormData));
    };

    const handleGeneratePassword = () => {
        if (!formData.role || !formData.nombre_completo) { 
            showNotification('Selecciona un rol e ingresa el nombre completo primero.', 'error'); 
            return; 
        }
        try {
            // Para revendedores, informar sobre el nombre del negocio
            if (formData.role === 'revendedor' && (!formData.nombre_negocio || formData.nombre_negocio.trim() === '')) {
                showNotification('💡 Tip: Si agregas el nombre del negocio, la contraseña será más específica y fácil de recordar.', 'info');
            }
            
            const result = passwordGeneratorService.generatePassword(formData.role, formData.nombre_completo, formData.nombre_negocio);
            const newFormData = { ...formData, password: result.password };
            setFormData(newFormData);
            setErrors(validateForm(newFormData));
            showNotification(`✅ Contraseña generada exitosamente`, 'success');
        } catch (error) {
            showNotification(error.message, 'error');
        }
    };

    const handleSave = () => {
        const validationErrors = validateForm(formData);
        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            showNotification('Por favor, corrige los errores marcados.', 'error');
            return;
        }
        onSave(formData);
    };

    if (!isOpen) return null;
    
    const isSaveDisabled = loading || Object.keys(errors).length > 0;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-gray-900">{usuarioEditando ? 'Editar Usuario' : 'Crear Nuevo Usuario'}</h2>
                    <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg"><X className="w-5 h-5" /></button>
                </div>
                
                {/* Información de campos obligatorios */}
                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-800">
                        <span className="font-medium">Campos obligatorios (*):</span> Nombre de Usuario, Rol, Nombre Completo
                        {!usuarioEditando && ', Contraseña'}
                    </p>
                    <p className="text-xs text-blue-600 mt-1">
                        Los demás campos son opcionales. El email se genera automáticamente si no se especifica.
                    </p>
                </div>
                
                <form autoComplete="off" onSubmit={(e) => e.preventDefault()}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-5 mb-6">
                        {/* Campos del formulario (sin cambios) */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre de Usuario *</label>
                            <input name="username" type="text" value={formData.username || ''} onChange={handleChange} className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${errors.username ? 'border-red-500' : 'border-gray-200'}`} placeholder="maria_juana" />
                            {errors.username && <p className="text-xs text-red-600 mt-1">{errors.username}</p>}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Rol *</label>
                            <select name="role" value={formData.role || ''} onChange={handleChange} className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${errors.role ? 'border-red-500' : 'border-gray-200'}`}>
                                <option value="">Seleccionar rol</option>
                                <option value="admin">Administrador</option>
                                <option value="trabajador">Trabajador</option>
                                <option value="revendedor">Revendedor</option>
                            </select>
                            {errors.role && <p className="text-xs text-red-600 mt-1">{errors.role}</p>}
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña {!usuarioEditando && '*'}</label>
                            <div className="flex space-x-2">
                                <div className="relative flex-1">
                                    <input name="password" type={mostrarPassword ? "text" : "password"} value={formData.password || ''} onChange={handleChange} className={`w-full px-3 py-2 pr-10 border rounded-lg focus:ring-2 focus:ring-blue-500 ${errors.password ? 'border-red-500' : 'border-gray-200'}`} placeholder={usuarioEditando ? "Dejar vacío para no cambiar" : "Contraseña"} autoComplete="new-password" />
                                    <button type="button" onClick={() => setMostrarPassword(!mostrarPassword)} className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"><Eye className="w-4 h-4" /></button>
                                </div>
                                <button type="button" onClick={handleGeneratePassword} className="px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors flex items-center space-x-1" title="Generar contraseña"><Key className="w-4 h-4" /><span className="text-sm">Generar</span></button>
                            </div>
                            {errors.password && <p className="text-xs text-red-600 mt-1">{errors.password}</p>}
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre Completo *</label>
                            <input name="nombre_completo" type="text" value={formData.nombre_completo || ''} onChange={handleChange} className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${errors.nombre_completo ? 'border-red-500' : 'border-gray-200'}`} placeholder="Juan Pérez" />
                            {errors.nombre_completo && <p className="text-xs text-red-600 mt-1">{errors.nombre_completo}</p>}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Teléfono <span className="text-gray-400 text-xs">(opcional)</span>
                            </label>
                            <input 
                                name="telefono" 
                                type="tel" 
                                value={formData.telefono || ''} 
                                onChange={handleChange} 
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500" 
                                placeholder="555-1234567 (opcional)" 
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Email <span className="text-gray-400 text-xs">(opcional - se genera automáticamente)</span>
                            </label>
                            <div className="flex space-x-2">
                                <input 
                                    name="email" 
                                    type="email" 
                                    value={formData.email || ''} 
                                    onChange={handleChange} 
                                    className={`flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${errors.email ? 'border-red-500' : 'border-gray-200'}`} 
                                    placeholder="usuario@empresa.com (se genera automático)" 
                                />
                                {formData.email && (
                                    <button 
                                        type="button" 
                                        onClick={() => {
                                            const newFormData = { ...formData };
                                            if (formData.username && formData.username.trim()) {
                                                newFormData.email = `${formData.username.trim()}@empresa.com`;
                                            } else {
                                                newFormData.email = '';
                                            }
                                            setFormData(newFormData);
                                            setErrors(validateForm(newFormData));
                                        }}
                                        className="px-3 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors text-sm"
                                        title="Regenerar email automático basado en el username"
                                    >
                                        Auto
                                    </button>
                                )}
                            </div>
                            {errors.email && <p className="text-xs text-red-600 mt-1">{errors.email}</p>}
                            {!formData.email && formData.username && <p className="text-xs text-gray-500 mt-1">Se generará automáticamente: {formData.username}@empresa.com</p>}
                            {!formData.email && !formData.username && <p className="text-xs text-gray-500 mt-1">Se generará automáticamente cuando ingreses el nombre de usuario</p>}
                        </div>
                        {formData.role === 'revendedor' && (
                            <>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Nombre del Negocio <span className="text-gray-400 text-xs">(recomendado para contraseñas)</span>
                                    </label>
                                    <input 
                                        name="nombre_negocio" 
                                        type="text" 
                                        value={formData.nombre_negocio || ''} 
                                        onChange={handleChange} 
                                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${errors.nombre_negocio ? 'border-red-500' : 'border-gray-200'}`} 
                                        placeholder="Tienda de Juan (opcional)" 
                                    />
                                    {errors.nombre_negocio && <p className="text-xs text-red-600 mt-1">{errors.nombre_negocio}</p>}
                                    <p className="text-xs text-gray-500 mt-1">Se usa para generar contraseñas más específicas</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Dirección <span className="text-gray-400 text-xs">(opcional)</span>
                                    </label>
                                    <input 
                                        name="direccion" 
                                        type="text" 
                                        value={formData.direccion || ''} 
                                        onChange={handleChange} 
                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500" 
                                        placeholder="Calle Falsa 123 (opcional)" 
                                    />
                                </div>
                            </>
                        )}
                        {formData.role === 'trabajador' && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Especialidad <span className="text-gray-400 text-xs">(opcional)</span>
                                </label>
                                <input 
                                    name="especialidad" 
                                    type="text" 
                                    value={formData.especialidad || ''} 
                                    onChange={handleChange} 
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500" 
                                    placeholder="Técnico en Redes (opcional - default: General)" 
                                />
                                <p className="text-xs text-gray-500 mt-1">Si se deja vacío, se asignará "General"</p>
                            </div>
                        )}
                        <div className="md:col-span-2">
                            <label className="flex items-center space-x-2">
                                <input name="active" type="checkbox" checked={formData.active || false} onChange={handleChange} className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" />
                                <span className="text-sm font-medium text-gray-700">Usuario activo</span>
                            </label>
                        </div>
                    </div>
                    <div className="flex justify-end space-x-3">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors">Cancelar</button>
                        <button type="button" onClick={handleSave} disabled={isSaveDisabled} className="flex items-center space-x-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-blue-300 disabled:cursor-not-allowed">
                            <Save className="w-4 h-4" />
                            <span>{usuarioEditando ? 'Actualizar' : 'Crear'}</span>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};


// --- Componente Principal ---

const GestionUsuarios = () => {
    const { notifyUsersChanged, notifyTrabajadoresChanged, notifyRevendedoresChanged } = useUsers();
    
    const [usuarios, setUsuarios] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(''); // Estado para manejar errores
    const [filtro, setFiltro] = useState('');
    const [filtroRole, setFiltroRole] = useState('');
    const [filtroEstado, setFiltroEstado] = useState(''); // '' = todos, 'activo' = solo activos, 'inactivo' = solo inactivos
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [usuarioEditando, setUsuarioEditando] = useState(null);
    const [notification, setNotification] = useState({ show: false, message: '', type: '' });
    const [modalCredenciales, setModalCredenciales] = useState({ show: false, usuario: '', password: '', nombre: '' });
    const [modalEliminar, setModalEliminar] = useState({ show: false, usuario: null, deletionInfo: null });

    // Función para abrir modal de eliminación con vista previa
    const abrirModalEliminacion = async (usuario) => {
        try {
            setLoading(true);
            
            // Obtener información detallada antes de mostrar el modal
            const result = await usuariosService.obtenerVistaEliminacion(usuario.id);
            
            if (result.success) {
                setModalEliminar({ 
                    show: true, 
                    usuario: usuario,
                    deletionInfo: result.data 
                });
            } else {
                // Si hay error, mostrar modal simple
                setModalEliminar({ 
                    show: true, 
                    usuario: usuario,
                    deletionInfo: null 
                });
                console.error('Error al obtener vista previa:', result.error);
            }
        } catch (error) {
            console.error('Error al abrir modal de eliminación:', error);
            // Modal simple en caso de error
            setModalEliminar({ 
                show: true, 
                usuario: usuario,
                deletionInfo: null 
            });
        } finally {
            setLoading(false);
        }
    };
    const [errorModal, setErrorModal] = useState({ show: false, message: '' });

    // Sistema de carga optimizado con retry integrado en el servicio
    const cargarUsuarios = useCallback(async () => {
        try {
            setLoading(true);
            console.log('🔄 Iniciando carga de usuarios...');
            
            // El servicio ya maneja el retry automático para throttling
            const result = await usuariosService.obtenerUsuarios();
            
            if (result.success) {
                setUsuarios(result.data);
                setError(''); // Limpiar errores previos
                console.log(`✅ Usuarios cargados exitosamente: ${result.data.length} usuarios`);
                
                // Opcional: Mostrar notificación de éxito solo si había error previo
                if (error) {
                    mostrarNotificacion('✅ Usuarios cargados exitosamente', 'success');
                }
            } else {
                // El servicio ya manejó los retries, este es el error final
                setError(result.error);
                mostrarNotificacion(result.error, 'error');
                console.error('❌ Error final al cargar usuarios:', result.error);
                
                // En caso de error, mantener lista vacía para evitar crashes
                setUsuarios([]);
            }
        } catch (error) {
            console.error('❌ Error inesperado al cargar usuarios:', error);
            setError('Error inesperado al cargar usuarios');
            mostrarNotificacion('Error inesperado al cargar usuarios', 'error');
            setUsuarios([]);
        } finally {
            setLoading(false);
        }
    }, []); // Sin dependencias ya que solo usa funciones estables

    // Carga inicial con delay para evitar conflictos con otras cargas
    useEffect(() => {
        const timeout = setTimeout(() => {
            cargarUsuarios();
        }, 150); // Pequeño delay para evitar colisiones con otras peticiones

        return () => clearTimeout(timeout);
    }, [cargarUsuarios]);

    const mostrarNotificacion = (message, type = 'success') => {
        setNotification({ show: true, message, type });
    };

    const abrirFormularioNuevo = () => {
        setUsuarioEditando(null);
        setIsFormOpen(true);
    };

    const editarUsuario = (usuario) => {
        setUsuarioEditando(usuario);
        setIsFormOpen(true);
    };

    const guardarUsuario = async (formData) => {
        const datosParaEnvio = { ...formData };
        if (usuarioEditando && !datosParaEnvio.password) {
            delete datosParaEnvio.password;
        }
        
        // Asegurar que siempre haya un email válido ANTES de enviar
        if (!datosParaEnvio.email || datosParaEnvio.email.trim() === '') {
            if (datosParaEnvio.username && datosParaEnvio.username.trim()) {
                datosParaEnvio.email = `${datosParaEnvio.username.trim()}@empresa.com`;
                console.log('🔧 Email generado automáticamente en frontend:', datosParaEnvio.email);
            } else {
                datosParaEnvio.email = 'usuario@empresa.com';
                console.log('🚨 Username vacío, usando email por defecto:', datosParaEnvio.email);
            }
        }
        
        Object.keys(datosParaEnvio).forEach(key => {
            if (typeof datosParaEnvio[key] === 'string' && datosParaEnvio[key].trim() === '') {
                // Ahora el email ya está garantizado que no está vacío, pero por seguridad adicional
                if (key === 'email') {
                    datosParaEnvio[key] = `${datosParaEnvio.username || 'usuario'}@empresa.com`;
                }
                // No convertir especialidad a null porque el backend maneja el default
                else if (key !== 'especialidad') {
                    datosParaEnvio[key] = null;
                }
            }
        });

        console.log('📤 Datos finales enviados al backend:', {
            ...datosParaEnvio,
            password: datosParaEnvio.password ? '***' : 'no incluida'
        });

        setLoading(true);
        try {
            let result;
            const isEditing = !!usuarioEditando;

            // ===================================================================
            // LÓGICA SIMPLIFICADA: TODO VA A USUARIOS - SIN RUTAS ESPECÍFICAS
            // ===================================================================
            if (isEditing) {
                result = await usuariosService.actualizarUsuario(usuarioEditando.id, datosParaEnvio);
            } else {
                result = await usuariosService.crearUsuario(datosParaEnvio);
            }
            // ===================================================================

            if (result.success) {
                if (!isEditing) {
                    setModalCredenciales({
                        show: true,
                        usuario: formData.username,
                        password: formData.password,
                        nombre: formData.nombre_completo
                    });
                }
                mostrarNotificacion(isEditing ? 'Usuario actualizado' : 'Usuario creado', 'success');
                setIsFormOpen(false);
                
                // Usar sistema de tiempo real en lugar de cargar directamente
                console.log('🚀 Activando actualizaciones en tiempo real tras guardar usuario...');
                
                // Notificar a los contextos para que otras partes de la app se actualicen
                if (formData.role === 'trabajador') notifyTrabajadoresChanged();
                if (formData.role === 'revendedor') notifyRevendedoresChanged();
                notifyUsersChanged();
                
                // Recargar lista local con delay pequeño para evitar conflictos
                setTimeout(() => {
                    cargarUsuarios();
                }, 300);
            } else {
                mostrarNotificacion(result.error, 'error');
            }
        } catch (error) {
            mostrarNotificacion(error.message || 'Error al guardar usuario', 'error');
        } finally {
            setLoading(false);
        }
    };

    const toggleEstadoUsuario = async (usuario) => {
        setLoading(true);
        try {
            const result = await usuariosService.toggleEstadoUsuario(usuario.id);
            
            if (result.success) {
                // Mostrar mensaje principal
                mostrarNotificacion(result.data.message, 'success');
                
                // Si hay advertencia de stock, mostrarla como notificación adicional
                if (result.data.warning) {
                    setTimeout(() => {
                        mostrarNotificacion(result.data.warning, 'warning');
                    }, 1000);
                }
                
                // Usar sistema de tiempo real
                console.log('🔄 Activando actualizaciones tras cambio de estado...');
                if (usuario.role === 'trabajador') notifyTrabajadoresChanged();
                if (usuario.role === 'revendedor') notifyRevendedoresChanged();
                notifyUsersChanged();
                
                // Recargar con delay
                setTimeout(() => {
                    cargarUsuarios();
                }, 200);
            } else {
                setErrorModal({ 
                    show: true, 
                    message: result.error || 'Error al cambiar estado del usuario' 
                });
            }
        } catch (error) {
            console.error('Error al cambiar estado:', error);
            setErrorModal({ 
                show: true, 
                message: 'Error inesperado al cambiar estado del usuario' 
            });
        } finally {
            setLoading(false);
        }
    };

    const confirmarEliminacion = async () => {
        const usuarioAEliminar = modalEliminar.usuario;
        if (!usuarioAEliminar) return;
        
        setLoading(true);
        try {
            let result;
            // ===================================================================
            // LÓGICA SIMPLIFICADA: TODO VA A USUARIOS - SIN RUTAS ESPECÍFICAS
            // ===================================================================
            result = await usuariosService.eliminarUsuario(usuarioAEliminar.id);
            // ===================================================================

            if (result.success) {
                mostrarNotificacion('Usuario eliminado exitosamente', 'success');
                
                // Usar sistema de tiempo real
                console.log('🗑️ Activando actualizaciones tras eliminación...');
                if (usuarioAEliminar.role === 'trabajador') notifyTrabajadoresChanged();
                if (usuarioAEliminar.role === 'revendedor') notifyRevendedoresChanged();
                notifyUsersChanged();
                
                setModalEliminar({ show: false, usuario: null, deletionInfo: null });
                
                // Recargar con delay
                setTimeout(() => {
                    cargarUsuarios();
                }, 200);
            } else {
                // Mostrar el error en un modal elegante en lugar de notificación
                setModalEliminar({ show: false, usuario: null, deletionInfo: null });
                setErrorModal({ 
                    show: true, 
                    message: result.error || 'Error desconocido al eliminar usuario' 
                });
            }
        } catch (error) {
            console.debug('Error inesperado al eliminar usuario:', error);
            setModalEliminar({ show: false, usuario: null, deletionInfo: null });
            setErrorModal({ 
                show: true, 
                message: 'Error inesperado al comunicarse con el servidor. Por favor intenta de nuevo.' 
            });
        } finally {
            setLoading(false);
        }
    };
    
    const usuariosFiltrados = usuarios.filter(u => 
        (!filtro || u.username.toLowerCase().includes(filtro.toLowerCase()) || (u.nombre_completo || '').toLowerCase().includes(filtro.toLowerCase())) &&
        (!filtroRole || u.role === filtroRole) &&
        (!filtroEstado || (filtroEstado === 'activo' ? u.active : !u.active))
    );

    const getRoleInfo = (role) => ({
        'admin': { icon: Shield, color: 'bg-red-100 text-red-800' },
        'trabajador': { icon: UserCheck, color: 'bg-blue-100 text-blue-800' },
        'revendedor': { icon: User, color: 'bg-green-100 text-green-800' },
    }[role] || { icon: User, color: 'bg-gray-100 text-gray-800' });

    return (
        <div className="p-4 sm:p-6 w-full bg-gray-50 min-h-screen">
            <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                 <div className="flex items-center space-x-4">
                   <div className="w-14 h-14 bg-white border border-gray-200 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm"><Users className="w-7 h-7 text-blue-600" /></div>
                   <div>
                       <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Gestión de Usuarios</h1>
                       <p className="text-gray-600">Administra, crea y edita los usuarios del sistema.</p>
                   </div>
               </div>
               <div className="flex gap-2">
                   <button onClick={abrirFormularioNuevo} className="flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"><Plus className="w-4 h-4" /><span>Nuevo Usuario</span></button>
                   <button onClick={cargarUsuarios} disabled={loading} className="flex items-center justify-center space-x-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 shadow-sm">
                       <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /><span>Actualizar</span>
                   </button>
               </div>
            </header>

            <Notification notification={notification} onClose={() => setNotification({ show: false, message: '', type: '' })} />

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
                <div className="flex flex-col sm:flex-row gap-4">
                    <div className="relative flex-1">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input type="text" placeholder="Buscar por nombre o usuario..." value={filtro} onChange={(e) => setFiltro(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <select value={filtroRole} onChange={(e) => setFiltroRole(e.target.value)} className="sm:w-48 w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500">
                        <option value="">Todos los roles</option>
                        <option value="admin">Administradores</option>
                        <option value="trabajador">Trabajadores</option>
                        <option value="revendedor">Revendedores</option>
                    </select>
                    <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)} className="sm:w-48 w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500">
                        <option value="">Todos los estados</option>
                        <option value="activo">Solo activos</option>
                        <option value="inactivo">Solo inactivos</option>
                    </select>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Usuario</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rol</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contacto</th>
                            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {loading ? (
                            <tr><td colSpan="5" className="text-center p-8 text-gray-500">Cargando...</td></tr>
                        ) : usuariosFiltrados.length === 0 ? (
                            <tr><td colSpan="5" className="text-center p-8 text-gray-500">No se encontraron usuarios.</td></tr>
                        ) : (
                            usuariosFiltrados.map((usuario) => {
                                const { icon: RoleIcon, color } = getRoleInfo(usuario.role);
                                return (
                                    <tr key={usuario.id} className={`hover:bg-gray-50 ${!usuario.active ? 'bg-gray-50 opacity-75' : ''}`}>
                                        <td className="px-4 py-4">
                                            <div className={`text-sm font-medium ${usuario.active ? 'text-gray-900' : 'text-gray-500'}`}>
                                                {usuario.nombre_completo || usuario.username}
                                                {!usuario.active && <span className="ml-2 text-xs text-red-500 font-normal">(Inactivo)</span>}
                                            </div>
                                            <div className="text-sm text-gray-500">@{usuario.username}</div>
                                        </td>
                                        <td className="px-4 py-4">
                                            <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full ${color} ${!usuario.active ? 'opacity-60' : ''}`}>
                                                <RoleIcon className="w-3 h-3" />
                                                {usuario.role}
                                            </span>
                                        </td>
                                        <td className="px-4 py-4">
                                            <div className={`inline-flex items-center gap-1 text-sm font-medium ${usuario.active ? 'text-green-600 bg-green-50' : 'text-red-600 bg-red-50'} px-2 py-1 rounded-full`}>
                                                {usuario.active ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                                                {usuario.active ? 'Activo' : 'Inactivo'}
                                            </div>
                                        </td>
                                        <td className="px-4 py-4 text-sm text-gray-600">{usuario.telefono || '-'}</td>
                                        <td className="px-4 py-4">
                                            <div className="flex items-center justify-center space-x-2">
                                                <button 
                                                    onClick={() => editarUsuario(usuario)} 
                                                    className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg" 
                                                    title="Editar"
                                                >
                                                    <Edit3 className="w-4 h-4" />
                                                </button>
                                                <button 
                                                    onClick={() => toggleEstadoUsuario(usuario)} 
                                                    className={`p-2 rounded-lg ${usuario.active ? 'text-orange-600 hover:bg-orange-100' : 'text-green-600 hover:bg-green-100'}`}
                                                    title={usuario.active ? 'Desactivar' : 'Activar'}
                                                    disabled={loading}
                                                >
                                                    {usuario.active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                                </button>
                                                <button 
                                                    onClick={() => abrirModalEliminacion(usuario)} 
                                                    className="p-2 text-red-600 hover:bg-red-100 rounded-lg" 
                                                    title="Eliminar"
                                                    disabled={loading}
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            <UserFormModal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} usuarioEditando={usuarioEditando} onSave={guardarUsuario} loading={loading} showNotification={mostrarNotificacion} />
            <CredentialsModal modalConfig={modalCredenciales} onClose={() => setModalCredenciales({ show: false })} onCopy={(text) => navigator.clipboard.writeText(text).then(() => mostrarNotificacion('Copiado al portapapeles'))} />
            <DeleteConfirmationModal modalConfig={modalEliminar} onConfirm={confirmarEliminacion} onClose={() => setModalEliminar({ show: false, usuario: null, deletionInfo: null })} loading={loading} />
            <ErrorModal errorModal={errorModal} onClose={() => setErrorModal({ show: false, message: '' })} />
        </div>
    );
};

export default GestionUsuarios;
