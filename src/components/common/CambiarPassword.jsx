// components/common/CambiarPassword.jsx
import React, { useState } from 'react';
import { 
  Key, 
  Eye, 
  EyeOff, 
  Save, 
  X, 
  CheckCircle, 
  AlertCircle 
} from 'lucide-react';
import usuariosService from '../../services/usuariosService';

const CambiarPassword = ({ isOpen, onClose }) => {
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [mostrarPasswords, setMostrarPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState({ show: false, message: '', type: '' });

  const mostrarNotificacion = (message, type = 'success') => {
    setNotification({ show: true, message, type });
    setTimeout(() => {
      setNotification({ show: false, message: '', type: '' });
    }, 4000);
  };

  const limpiarFormulario = () => {
    setFormData({
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
    limpiarFormulario();
    onClose();
  };

  const validarFormulario = () => {
    const errores = usuariosService.validarCambioPassword(
      formData.currentPassword,
      formData.newPassword,
      formData.confirmPassword
    );

    if (errores.length > 0) {
      mostrarNotificacion(errores[0], 'error'); // Mostrar el primer error
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validarFormulario()) {
      return;
    }

    setLoading(true);
    try {
      const result = await usuariosService.cambiarPassword(
        formData.currentPassword,
        formData.newPassword
      );

      if (result.success) {
        mostrarNotificacion('Contraseña actualizada exitosamente', 'success');
        setTimeout(() => {
          handleClose();
        }, 2000);
      } else {
        mostrarNotificacion(result.error, 'error');
      }
    } catch (error) {
      mostrarNotificacion('Error al cambiar contraseña', 'error');
    } finally {
      setLoading(false);
    }
  };

  const toggleMostrarPassword = (field) => {
    setMostrarPasswords(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-md w-full p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <Key className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Cambiar Contraseña</h2>
              <p className="text-sm text-gray-600">Actualiza tu contraseña de acceso</p>
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

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Contraseña Actual */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Contraseña Actual *
            </label>
            <div className="relative">
              <input
                type={mostrarPasswords.current ? "text" : "password"}
                value={formData.currentPassword}
                onChange={(e) => setFormData(prev => ({ ...prev, currentPassword: e.target.value }))}
                className="w-full px-3 py-2 pr-10 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Tu contraseña actual"
                required
              />
              <button
                type="button"
                onClick={() => toggleMostrarPassword('current')}
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
                value={formData.newPassword}
                onChange={(e) => setFormData(prev => ({ ...prev, newPassword: e.target.value }))}
                className="w-full px-3 py-2 pr-10 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Mínimo 6 caracteres"
                required
                minLength={6}
              />
              <button
                type="button"
                onClick={() => toggleMostrarPassword('new')}
                className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
              >
                {mostrarPasswords.new ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              La contraseña debe tener al menos 6 caracteres
            </p>
          </div>

          {/* Confirmar Nueva Contraseña */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Confirmar Nueva Contraseña *
            </label>
            <div className="relative">
              <input
                type={mostrarPasswords.confirm ? "text" : "password"}
                value={formData.confirmPassword}
                onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                className="w-full px-3 py-2 pr-10 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Repite la nueva contraseña"
                required
              />
              <button
                type="button"
                onClick={() => toggleMostrarPassword('confirm')}
                className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
              >
                {mostrarPasswords.confirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Indicador de fortaleza de contraseña */}
          {formData.newPassword && (
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-sm font-medium text-gray-700 mb-2">Fortaleza de contraseña:</p>
              <div className="space-y-1">
                <div className={`flex items-center space-x-2 text-xs ${
                  formData.newPassword.length >= 6 ? 'text-green-600' : 'text-red-500'
                }`}>
                  <div className={`w-2 h-2 rounded-full ${
                    formData.newPassword.length >= 6 ? 'bg-green-500' : 'bg-red-400'
                  }`}></div>
                  <span>Al menos 6 caracteres</span>
                </div>
                <div className={`flex items-center space-x-2 text-xs ${
                  /[A-Z]/.test(formData.newPassword) ? 'text-green-600' : 'text-gray-400'
                }`}>
                  <div className={`w-2 h-2 rounded-full ${
                    /[A-Z]/.test(formData.newPassword) ? 'bg-green-500' : 'bg-gray-300'
                  }`}></div>
                  <span>Al menos una mayúscula</span>
                </div>
                <div className={`flex items-center space-x-2 text-xs ${
                  /[a-z]/.test(formData.newPassword) ? 'text-green-600' : 'text-gray-400'
                }`}>
                  <div className={`w-2 h-2 rounded-full ${
                    /[a-z]/.test(formData.newPassword) ? 'bg-green-500' : 'bg-gray-300'
                  }`}></div>
                  <span>Al menos una minúscula</span>
                </div>
                <div className={`flex items-center space-x-2 text-xs ${
                  /\d/.test(formData.newPassword) ? 'text-green-600' : 'text-gray-400'
                }`}>
                  <div className={`w-2 h-2 rounded-full ${
                    /\d/.test(formData.newPassword) ? 'bg-green-500' : 'bg-gray-300'
                  }`}></div>
                  <span>Al menos un número</span>
                </div>
                <div className={`flex items-center space-x-2 text-xs ${
                  /[!@#$%^&*(),.?":{}|<>]/.test(formData.newPassword) ? 'text-green-600' : 'text-gray-400'
                }`}>
                  <div className={`w-2 h-2 rounded-full ${
                    /[!@#$%^&*(),.?":{}|<>]/.test(formData.newPassword) ? 'bg-green-500' : 'bg-gray-300'
                  }`}></div>
                  <span>Al menos un símbolo (recomendado)</span>
                </div>
                
                {/* Mostrar errores específicos */}
                {usuariosService.validarFortalezaPassword(formData.newPassword).map((error, index) => (
                  <div key={index} className="flex items-center space-x-2 text-xs text-red-500">
                    <div className="w-2 h-2 rounded-full bg-red-400"></div>
                    <span>{error}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Botones */}
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center space-x-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{loading ? 'Actualizando...' : 'Actualizar Contraseña'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CambiarPassword;
