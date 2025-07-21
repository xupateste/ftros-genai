// src/components/ParameterPill.jsx

import React from 'react';

// El componente ahora recibe una prop `isDefault` para cambiar su estilo
export function ParameterPill({ label, value, isDefault }) {
  if (!value || (Array.isArray(value) && value.length === 0)) {
    return null;
  }

  const displayValue = Array.isArray(value) ? value.join(', ') : value;

  // Clases de estilo condicionales
  const baseClasses = "text-xs font-medium px-2.5 py-1 rounded-full bg-purple-100 text-purple-800";
  // const defaultClasses = "bg-purple-100 text-gray-700"; // Estilo para valores por defecto
  // const modifiedClasses = "bg-purple-100 text-purple-800 border border-purple-300"; // Estilo para valores modificados

  return (
    <div className={`${baseClasses}`}>
      <span className="font-bold">{label}:</span> {displayValue}
    </div>
  );
}
