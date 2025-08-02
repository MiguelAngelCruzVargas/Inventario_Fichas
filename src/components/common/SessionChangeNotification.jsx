import React from 'react';
import { AlertTriangle, RefreshCw, X } from 'lucide-react';

const SessionChangeNotification = ({ user, onDismiss, onRefresh }) => {
  const getUserTypeLabel = (tipo) => {
    const labels = {
      'admin': 'Administrador',
      'revendedor': 'Revendedor',
      'trabajador': 'Técnico'
    };
    return labels[tipo] || tipo;
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-50 animate-in slide-in-from-top duration-500">
      <div className="bg-white shadow-2xl border-l-4 border-blue-500">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-blue-600" />
              </div>
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-1">
                  <h3 className="text-lg font-bold text-gray-900">
                    Cambio de Sesión Detectado
                  </h3>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                    Local Dev
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-1">
                  La sesión cambió a <span className="font-semibold text-gray-900">{getUserTypeLabel(user?.tipo_usuario)}</span>
                  {user?.nombre_completo && (
                    <span className="text-gray-500"> • {user.nombre_completo}</span>
                  )}
                </p>
                <p className="text-xs text-gray-500 mb-1">
                  <span className="inline-flex items-center">
                    <span className="w-2 h-2 bg-blue-400 rounded-full mr-2"></span>
                    En desarrollo local, las cookies se comparten entre pestañas
                  </span>
                </p>
                <p className="text-xs text-gray-500">
                  � Redirigiendo automáticamente a la interfaz de {getUserTypeLabel(user?.tipo_usuario)}...
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={onRefresh}
                className="inline-flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 transform hover:scale-105 shadow-sm"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Actualizar Página</span>
              </button>
              <button
                onClick={onDismiss}
                className="inline-flex items-center justify-center w-8 h-8 bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-800 rounded-lg transition-all duration-200 transform hover:scale-105"
                title="Cerrar notificación"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SessionChangeNotification;
