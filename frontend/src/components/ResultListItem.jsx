// src/components/ResultListItem.jsx

import React, { useState } from 'react';
import { FiChevronDown, FiChevronUp } from 'react-icons/fi';

// Componente para una línea de detalle en la ficha expandida
const DetailRow = ({ label, value, prefix = '', suffix = '' }) => (
  <div className="flex justify-between text-xs py-1 border-b border-gray-200">
    <span className="text-gray-500">{label}:</span>
    <span className="font-semibold text-gray-700">{prefix}{value}{suffix}</span>
  </div>
);

export function ResultListItem({ itemData, detailInstructions }) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Extraemos los datos que queremos mostrar
  const nombre = itemData['Nombre del producto'] || 'N/A';
  const sku = itemData['SKU / Código de producto'] || 'N/A';
  const marca = itemData['Marca'] || 'N/A';

  return (
    <div className="bg-white rounded-lg border border-gray-200 transition-all duration-300">
      <button 
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex justify-between items-center p-3 text-left"
      >
        <div>
          <p className="font-semibold text-sm text-gray-800">{nombre}</p>
          <p className="text-xs text-gray-500">
            SKU: {sku} | Marca: {marca}
          </p>
        </div>
        {isExpanded ? <FiChevronUp className="text-purple-600" /> : <FiChevronDown className="text-purple-600" />}
      </button>

      {/* Contenido expandible con animación */}
      {/* El contenido expandible ahora se construye con un bucle */}
      {isExpanded && (
        <div className="px-4 pb-4 pt-4 border-t border-gray-100 animate-fade-in-fast">
          <h4 className="text-xs font-bold text-purple-700 mb-2">DETALLES</h4>
          <div className="space-y-1">
            {(detailInstructions || []).map(instr => (
              <DetailRow 
                key={instr.data_key}
                label={instr.label}
                value={itemData[instr.data_key] || 'N/A'}
                prefix={instr.prefix}
                suffix={instr.suffix}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
