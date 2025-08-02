import React from 'react';
import { Clock, AlertTriangle, X } from 'lucide-react';

const SessionExpirationWarning = ({ isVisible, onRenew, onDismiss, onLogout }) => {
  if (!isVisible) return null;

  return (
    <div 
      className="fixed inset-0 flex items-center justify-center z-[9999]"
      style={{
        backgroundColor: 'rgba(255, 255, 255, 0.3)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)' // Para Safari
      }}
    >
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 p-6 border border-gray-300">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <AlertTriangle className="w-6 h-6 text-amber-500 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900">
              Sesión por expirar
            </h3>
          </div>
          <button
            onClick={onDismiss}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mb-6">
          <div className="flex items-center mb-4">
            <Clock className="w-5 h-5 text-gray-500 mr-2" />
            <p className="text-gray-700">
              Tu sesión expirará en <strong>5 minutos</strong> por seguridad.
            </p>
          </div>

          <p className="text-gray-600 mb-4">
            ¿Deseas continuar trabajando? Si no respondes, serás desconectado automáticamente.
          </p>
          
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <div className="flex items-center">
              <AlertTriangle className="w-4 h-4 text-amber-600 mr-2 flex-shrink-0" />
              <p className="text-sm text-amber-800">
                <strong>Importante:</strong> Guarda tu trabajo antes de que expire la sesión.
              </p>
            </div>
          </div>
        </div>

        <div className="flex space-x-3">
          <button
            onClick={onLogout}
            className="flex-1 bg-gray-200 text-gray-700 px-4 py-2.5 rounded-lg hover:bg-gray-300 transition-colors font-medium"
          >
            Cerrar sesión
          </button>
          <button
            onClick={onRenew}
            className="flex-1 bg-blue-600 text-white px-4 py-2.5 rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Continuar sesión
          </button>
        </div>

        <div className="mt-4 p-3 bg-blue-50 rounded-lg">
          <p className="text-xs text-blue-800 text-center">
            <strong>🛡️ Seguridad:</strong> Las sesiones se cierran automáticamente después de 2 horas para proteger tu cuenta.
          </p>
        </div>
      </div>
    </div>
  );
};

export default SessionExpirationWarning;
