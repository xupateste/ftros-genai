// src/components/ContextualBanner.jsx

import React from 'react';
import { FiInfo, FiX } from 'react-icons/fi';

export function ContextualBanner({ contextInfo, onClear }) {
  // Si no hay información de contexto, no se renderiza nada.
  if (!contextInfo) {
    return null;
  }

  const { title, skus } = contextInfo;
  const count = skus?.length || 0;

  return (
    <div className="p-4 bg-blue-50 border-l-4 border-blue-500 rounded-r-lg animate-fade-in-fast">
      <div className="flex items-start">
        <div className="flex-shrink-0 pt-1">
          <FiInfo className="h-5 w-5 text-blue-400" />
        </div>
        <div className="ml-3 flex-1">
          <p className="text-sm font-bold text-blue-800">Análisis Enfocado</p>
          <p className="mt-1 text-sm text-blue-700">
            Este reporte se ha pre-filtrado para mostrar únicamente los <strong>{count} productos</strong> relacionados con la alerta: <em>"{title}"</em>.
          </p>
          <div className="mt-3">
            <button
              onClick={onClear}
              className="text-xs font-semibold text-blue-700 hover:text-blue-900 bg-blue-100 hover:bg-blue-200 px-2 py-1 rounded-md flex items-center gap-1"
            >
              <FiX size={14} /> Limpiar filtro y ver el reporte completo
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
