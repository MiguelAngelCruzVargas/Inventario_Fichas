import React from 'react';
import { Eye, EyeOff, Copy, RefreshCw, Shield, CheckCircle, AlertCircle } from 'lucide-react';

const PasswordDisplay = ({ 
  passwordData, 
  isVisible, 
  onToggleVisibility, 
  onCopy, 
  onRegenerate, 
  showComponents = false,
  tipo = 'usuario'
}) => {
  if (!passwordData) return null;

  const { password, strength, components } = passwordData;

  const getStrengthColor = (level) => {
    switch (level) {
      case 'Muy fuerte': return 'text-green-600 bg-green-50 border-green-200';
      case 'Fuerte': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'Moderada': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'Débil': return 'text-orange-600 bg-orange-50 border-orange-200';
      default: return 'text-red-600 bg-red-50 border-red-200';
    }
  };

  const getProgressColor = (score) => {
    if (score >= 90) return 'bg-green-500';
    if (score >= 70) return 'bg-blue-500';
    if (score >= 50) return 'bg-yellow-500';
    if (score >= 30) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const formatComponentsDisplay = () => {
    if (!showComponents || !components) return null;

    const componentLabels = {
      revendedor: {
        negocio: 'Negocio',
        nombre: 'Nombre',
        numeros: 'Números',
        simbolo: 'Símbolo'
      },
      trabajador: {
        nombre: 'Nombre',
        numeros: 'Números',
        simbolo: 'Símbolo'
      },
      admin: {
        prefijo: 'Prefijo',
        nombre: 'Nombre',
        numeros: 'Números',
        simbolo: 'Símbolo'
      }
    };

    const labels = componentLabels[tipo] || componentLabels.trabajador;

    return (
      <div className="mt-3 p-3 bg-gray-50 rounded-lg border">
        <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
          <Shield className="w-4 h-4 mr-1" />
          Componentes de la contraseña:
        </h4>
        <div className="grid grid-cols-2 gap-2 text-xs">
          {Object.entries(components).map(([key, value]) => (
            <div key={key} className="flex justify-between">
              <span className="text-gray-600">{labels[key] || key}:</span>
              <span className="font-mono font-medium text-gray-800">{value}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-3">
      {/* Campo de contraseña */}
      <div className="relative">
        <div className="flex">
          <input
            type={isVisible ? 'text' : 'password'}
            value={password}
            readOnly
            className="flex-1 px-4 py-3 border border-gray-300 rounded-l-lg bg-gray-50 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Contraseña generada..."
          />
          
          {/* Botones de acción */}
          <div className="flex border-t border-r border-b border-gray-300 rounded-r-lg overflow-hidden">
            <button
              type="button"
              onClick={onToggleVisibility}
              className="px-3 py-3 bg-gray-50 hover:bg-gray-100 transition-colors border-r border-gray-300"
              title={isVisible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            >
              {isVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
            
            <button
              type="button"
              onClick={() => onCopy(password)}
              className="px-3 py-3 bg-gray-50 hover:bg-gray-100 transition-colors border-r border-gray-300"
              title="Copiar contraseña"
            >
              <Copy className="w-4 h-4" />
            </button>
            
            {onRegenerate && (
              <button
                type="button"
                onClick={onRegenerate}
                className="px-3 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
                title="Generar nueva contraseña"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Indicador de fortaleza */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Fortaleza de la contraseña:</span>
          <div className={`px-2 py-1 rounded-full border text-xs font-medium ${getStrengthColor(strength.level)}`}>
            {strength.level}
          </div>
        </div>
        
        {/* Barra de progreso */}
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className={`h-2 rounded-full transition-all duration-300 ${getProgressColor(strength.score)}`}
            style={{ width: `${Math.min(strength.score, 100)}%` }}
          />
        </div>
        
        {/* Puntuación */}
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>Puntuación: {strength.score}/100</span>
          <div className="flex items-center space-x-1">
            {strength.score >= 70 ? (
              <CheckCircle className="w-4 h-4 text-green-500" />
            ) : (
              <AlertCircle className="w-4 h-4 text-yellow-500" />
            )}
            <span>{strength.score >= 70 ? 'Segura' : 'Mejorable'}</span>
          </div>
        </div>
      </div>

      {/* Componentes de la contraseña */}
      {formatComponentsDisplay()}

      {/* Información adicional */}
      <div className="text-xs text-gray-500 bg-blue-50 p-3 rounded-lg border border-blue-200">
        <div className="flex items-start space-x-2">
          <Shield className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium text-blue-700 mb-1">Contraseña personalizada generada</p>
            <p>Esta contraseña fue generada usando información específica del usuario para que sea más fácil de recordar pero manteniendo la seguridad.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PasswordDisplay;
