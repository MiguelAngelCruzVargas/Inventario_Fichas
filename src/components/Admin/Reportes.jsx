// Reportes.jsx
import React from 'react';
import { FileText, AlertTriangle } from 'lucide-react';

const Reportes = () => {
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="w-full space-y-8">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center">
              <FileText className="w-6 h-6 text-slate-600" />
            </div>
            <div>
              <h1 className="text-3xl font-semibold text-gray-900">Reportes</h1>
              <p className="text-gray-500 mt-1">Sección en construcción</p>
            </div>
          </div>
        </div>

        {/* Mensaje de sección eliminada */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-8">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="w-6 h-6 text-yellow-600 mt-0.5 flex-shrink-0" />
            <div className="text-center w-full">
              <h3 className="text-yellow-800 font-medium text-lg mb-2">Sección de Reportes Deshabilitada</h3>
              <p className="text-yellow-700 mb-4">
                La funcionalidad de reportes ha sido temporalmente removida del sistema.
              </p>
              <p className="text-yellow-600 text-sm">
                Esta sección estará disponible en futuras actualizaciones.
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Reportes;
