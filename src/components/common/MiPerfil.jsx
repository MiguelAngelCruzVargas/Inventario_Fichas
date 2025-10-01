// components/common/MiPerfil.jsx
import React, { useState, useEffect } from 'react';
import { 
  User, 
  Save, 
  X, 
  Eye, 
  EyeOff, 
  CheckCircle, 
  AlertCircle,
  Key,
  Edit3
} from 'lucide-react';
import { useAuth } from '@context/AuthContext';
import usuariosService from '@services/usuariosService';

const MiPerfil = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('datos');
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState({ show: false, message: '', type: '' });

  // Datos personales
  const [datosPersonales, setDatosPersonales] = useState({
    username: '',
    nombre_completo: '',
    telefono: ''
  });

  // Datos para cambio de contraseña
  const [datosPassword, setDatosPassword] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [mostrarPasswords, setMostrarPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });

  useEffect(() => {
    if (isOpen && user) {
      setDatosPersonales({
        username: user.username || '',
        nombre_completo: user.nombre_completo || '',
        telefono: user.telefono || ''
      });
    }
  }, [isOpen, user]);

  const mostrarNotificacion = (message, type = 'success') => {
    setNotification({ show: true, message, type });
    setTimeout(() => {
      setNotification({ show: false, message: '', type: '' });
    }, 4000);
  };

  const limpiarFormularios = () => {
    setDatosPassword({
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    });
    setMostrarPasswords({
      current: false,
      new: false,
      confirm: false
    });
  };

  const handleClose = () => {
    limpiarFormularios();
    setActiveTab('datos');
    onClose();
  };

  const actualizarDatos = async () => {
    // Validar datos usando el nuevo método
    const errores = usuariosService.validarDatosPerfil(datosPersonales);

    if (errores.length > 0) {
      mostrarNotificacion(errores[0], 'error');
      return;
    }

    setLoading(true);
    try {
      const result = await usuariosService.actualizarMiPerfil({
        username: datosPersonales.username.trim(),
        nombre_completo: datosPersonales.nombre_completo?.trim(),
        telefono: datosPersonales.telefono?.trim()
      });

      if (result.success) {
        mostrarNotificacion('Perfil actualizado exitosamente. La página se recargará para reflejar los cambios.', 'success');
        // Recargar la página después de un momento para reflejar cambios en el contexto
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        mostrarNotificacion(result.error, 'error');
      }
    } catch (error) {
      mostrarNotificacion('Error al actualizar perfil', 'error');
    } finally {
      setLoading(false);
    }
  };

  const cambiarPassword = async () => {
    const errores = usuariosService.validarCambioPassword(
      datosPassword.currentPassword,
      datosPassword.newPassword,
      datosPassword.confirmPassword
    );

    if (errores.length > 0) {
      mostrarNotificacion(errores[0], 'error');
      return;
    }

    setLoading(true);
    try {
      const result = await usuariosService.cambiarPassword(
        datosPassword.currentPassword,
        datosPassword.newPassword
      );

      if (result.success) {
        mostrarNotificacion('Contraseña actualizada exitosamente', 'success');
        limpiarFormularios();
        setTimeout(() => {
          setActiveTab('datos');
        }, 1500);
      } else {
        mostrarNotificacion(result.error, 'error');
      }
    } catch (error) {
      mostrarNotificacion('Error al cambiar contraseña', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <User className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Mi Perfil</h2>
              <p className="text-sm text-gray-600">
                Usuario: <span className="font-medium text-blue-600">{user?.username}</span> 
                {' · '}
                <span className="capitalize">{user?.role}</span>
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Notificación */}
        {notification.show && (
          <div className={`mb-4 p-3 rounded-lg ${
            notification.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
          }`}>
            <div className="flex items-center space-x-2">
              {notification.type === 'success' ? 
                <CheckCircle className="w-4 h-4" /> : 
                <AlertCircle className="w-4 h-4" />
              }
              <span className="text-sm">{notification.message}</span>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex space-x-1 mb-6 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setActiveTab('datos')}
            className={`flex-1 flex items-center justify-center space-x-2 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'datos' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Edit3 className="w-4 h-4" />
            <span>Mis Datos</span>
          </button>
          <button
            onClick={() => setActiveTab('password')}
            className={`flex-1 flex items-center justify-center space-x-2 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'password' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Key className="w-4 h-4" />
            <span>Contraseña</span>
          </button>
        </div>

        {/* Contenido */}
        {activeTab === 'datos' && (
          <div className="space-y-4">
            <div className="bg-blue-50 rounded-lg p-4 mb-6">
              <div className="flex items-start space-x-2">
                <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium">Importante:</p>
                  <ul className="mt-1 list-disc list-inside space-y-1">
                    <li>Tu nombre de usuario debe ser único</li>
                    <li>Solo letras, números, guiones (_), guiones (-) y puntos (.)</li>
                    <li>Sin espacios permitidos</li>
                    <li>Si cambias tu usuario, deberás usarlo para iniciar sesión</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Nombre de Usuario */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nombre de Usuario *
              </label>
              <input
                type="text"
                value={datosPersonales.username}
                onChange={(e) => setDatosPersonales(prev => ({ 
                  ...prev, 
                  username: e.target.value.toLowerCase().replace(/\s/g, '') // Remover espacios automáticamente
                }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-left"
                placeholder="carlos_hernandez"
              />
              <p className="text-xs text-gray-500 mt-1">
                Ejemplos: carlos_hernandez, admin2025, jefe.sistema, carlos_admin
              </p>
            </div>

            {/* Nombre Completo */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nombre Completo
              </label>
              <input
                type="text"
                value={datosPersonales.nombre_completo}
                onChange={(e) => setDatosPersonales(prev => ({ ...prev, nombre_completo: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-left"
                placeholder="Carlos Hernández"
              />
            </div>

            {/* Teléfono */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Teléfono
              </label>
              <input
                type="tel"
                value={datosPersonales.telefono}
                onChange={(e) => setDatosPersonales(prev => ({ ...prev, telefono: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-left"
                placeholder="555-1234567"
              />
            </div>

            {/* Botones */}
            <div className="flex justify-end space-x-3 pt-4">
              <button
                onClick={handleClose}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={actualizarDatos}
                disabled={loading}
                className="flex items-center space-x-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{loading ? 'Guardando...' : 'Guardar Cambios'}</span>
              </button>
            </div>
          </div>
        )}

        {activeTab === 'password' && (
          <div className="space-y-4">
            {/* Contraseña Actual */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Contraseña Actual *
              </label>
              <div className="relative">
                <input
                  type={mostrarPasswords.current ? "text" : "password"}
                  value={datosPassword.currentPassword}
                  onChange={(e) => setDatosPassword(prev => ({ ...prev, currentPassword: e.target.value }))}
                  className="w-full px-3 py-2 pr-10 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-left"
                  placeholder="Tu contraseña actual"
                />
                <button
                  type="button"
                  onClick={() => setMostrarPasswords(prev => ({ ...prev, current: !prev.current }))}
                  className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                >
                  {mostrarPasswords.current ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Nueva Contraseña */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nueva Contraseña *
              </label>
              <div className="relative">
                <input
                  type={mostrarPasswords.new ? "text" : "password"}
                  value={datosPassword.newPassword}
                  onChange={(e) => setDatosPassword(prev => ({ ...prev, newPassword: e.target.value }))}
                  className="w-full px-3 py-2 pr-10 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-left"
                  placeholder="Mínimo 6 caracteres"
                />
                <button
                  type="button"
                  onClick={() => setMostrarPasswords(prev => ({ ...prev, new: !prev.new }))}
                  className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                >
                  {mostrarPasswords.new ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Confirmar Nueva Contraseña */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Confirmar Nueva Contraseña *
              </label>
              <div className="relative">
                <input
                  type={mostrarPasswords.confirm ? "text" : "password"}
                  value={datosPassword.confirmPassword}
                  onChange={(e) => setDatosPassword(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  className="w-full px-3 py-2 pr-10 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-left"
                  placeholder="Repite la nueva contraseña"
                />
                <button
                  type="button"
                  onClick={() => setMostrarPasswords(prev => ({ ...prev, confirm: !prev.confirm }))}
                  className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                >
                  {mostrarPasswords.confirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Indicador de fortaleza */}
            {datosPassword.newPassword && (
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-sm font-medium text-gray-700 mb-2">Fortaleza de contraseña:</p>
                <div className="space-y-1">
                  {usuariosService.validarFortalezaPassword(datosPassword.newPassword).length === 0 ? (
                    <div className="flex items-center space-x-2 text-xs text-green-600">
                      <CheckCircle className="w-3 h-3" />
                      <span>Contraseña válida</span>
                    </div>
                  ) : (
                    usuariosService.validarFortalezaPassword(datosPassword.newPassword).map((error, index) => (
                      <div key={index} className="flex items-center space-x-2 text-xs text-red-500">
                        <AlertCircle className="w-3 h-3" />
                        <span>{error}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Botones */}
            <div className="flex justify-end space-x-3 pt-4">
              <button
                onClick={() => {
                  limpiarFormularios();
                  setActiveTab('datos');
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={cambiarPassword}
                disabled={loading}
                className="flex items-center space-x-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                <Key className="w-4 h-4" />
                <span>{loading ? 'Actualizando...' : 'Cambiar Contraseña'}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MiPerfil;
