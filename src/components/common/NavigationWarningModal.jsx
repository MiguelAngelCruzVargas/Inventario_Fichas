import React from 'react';
import { AlertTriangle, ArrowLeft, ArrowRight, X } from 'lucide-react';

const NavigationWarningModal = ({ isVisible, onConfirm, onCancel, navigationType = 'navigate' }) => {
  if (!isVisible) return null;

  const getNavigationText = () => {
    switch (navigationType) {
      case 'back':
        return {
          icon: <ArrowLeft className="w-6 h-6 text-blue-500" />,
          title: 'Navegación hacia atrás',
          message: 'Estás intentando navegar hacia atrás usando el botón del navegador. Esto puede cerrar tu sesión de trabajo.',
          action: 'navegar hacia atrás'
        };
      case 'forward':
        return {
          icon: <ArrowRight className="w-6 h-6 text-blue-500" />,
          title: 'Navegación hacia adelante',
          message: 'Estás intentando navegar hacia adelante usando el botón del navegador.',
          action: 'navegar hacia adelante'
        };
      case 'close':
        return {
          icon: <X className="w-6 h-6 text-red-500" />,
          title: 'Cerrar ventana',
          message: 'Estás intentando cerrar la ventana o pestaña. Tu sesión de trabajo se cerrará.',
          action: 'cerrar la ventana'
        };
      default:
        return {
          icon: <AlertTriangle className="w-6 h-6 text-amber-500" />,
          title: 'Navegación detectada',
          message: 'Se detectó un intento de navegación que puede cerrar tu sesión de trabajo.',
          action: 'continuar'
        };
    }
  };

  const { icon, title, message, action } = getNavigationText();

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
            {icon}
            <h3 className="text-lg font-semibold text-gray-900 ml-2">
              {title}
            </h3>
          </div>
        </div>

        <div className="mb-6">
          <p className="text-gray-700 mb-4">
            {message}
          </p>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-center">
              <AlertTriangle className="w-4 h-4 text-blue-600 mr-2 flex-shrink-0" />
              <p className="text-sm text-blue-800">
                <strong>Recomendación:</strong> Usa los menús de navegación de la aplicación para moverte de forma segura.
              </p>
            </div>
          </div>
        </div>

        <div className="flex space-x-3">
          <button
            onClick={onCancel}
            className="flex-1 bg-blue-600 text-white px-4 py-2.5 rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Quedarme en la aplicación
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 bg-gray-200 text-gray-700 px-4 py-2.5 rounded-lg hover:bg-gray-300 transition-colors font-medium"
          >
            Sí, {action}
          </button>
        </div>

        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
          <p className="text-xs text-gray-600 text-center">
            <strong>💡 Tip:</strong> Para cerrar sesión correctamente, usa el botón "Cerrar Sesión" del menú.
          </p>
        </div>
      </div>
    </div>
  );
};

export default NavigationWarningModal;
