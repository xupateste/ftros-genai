// src/components/ReportButton.jsx

import React from 'react';
import { FiInfo, FiLock } from 'react-icons/fi';

// onExecute abre el modal en la vista de parámetros.
// onInfoClick abre el modal directamente en la vista de información.
export function ReportButton({ reportItem, onExecute, onInfoClick }) {
  const isPro = reportItem.isPro;

  // Clases de estilo base
  const containerClasses = `flex w-full rounded-lg shadow-md transition-all duration-200 ease-in-out transform hover:scale-105 group`;
  const proClasses = 'bg-gray-700 text-gray-300 hover:bg-gray-600 border border-purple-800';
  const standardClasses = 'bg-white bg-opacity-90 text-black hover:bg-purple-100';

  // Si el reporte es Pro, renderizamos un único botón grande y simple
  if (isPro) {
    return (
      <button
        onClick={() => onExecute(reportItem)}
        className={`${containerClasses} ${proClasses} p-4`}
      >
        <div className="flex items-center justify-between w-full">
          <span className="font-semibold text-sm">{reportItem.label}</span>
          <FiLock className="text-yellow-500" />
        </div>
      </button>
    );
  }

  // Si no es Pro, renderizamos el botón de dos partes
  return (
    <div className={`${containerClasses} ${standardClasses}`}>
      {/* Botón de Acción Principal */}
      <button
        onClick={() => onExecute(reportItem)}
        className="flex-grow text-left p-4 rounded-l-lg"
      >
        <span className="font-semibold text-sm">{reportItem.label}</span>
      </button>
      
      {/* Botón de Información Secundario */}
      <button
        onClick={() => onInfoClick(reportItem)}
        className="flex-shrink-0 px-3 border-l border-black border-opacity-10 text-purple-800 hover:bg-black hover:bg-opacity-10 rounded-r-lg"
        aria-label="Más información sobre este reporte"
        title="Más información"
      >
        <FiInfo size={20}/>
      </button>
    </div>
  );
}
