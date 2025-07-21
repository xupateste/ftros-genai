// src/components/AppliedParameters.jsx

import React, { useMemo } from 'react';
import { ParameterPill } from './ParameterPill';

export function AppliedParameters({ reportConfig, modalParams }) {
  
  const paramsToShow = useMemo(() => {
    if (!reportConfig?.basic_parameters || !modalParams) {
      return [];
    }

    return reportConfig.basic_parameters
      .map(param => {
        const usedValue = modalParams[param.name];
        
        // --- LÓGICA DE VISUALIZACIÓN CORREGIDA ---
        // Mostramos el parámetro si tiene un valor, o si es un array no vacío.
        // Ya no lo comparamos con el valor por defecto aquí.
        const shouldShow = Array.isArray(usedValue)
          ? usedValue.length > 0
          : usedValue !== undefined && usedValue !== null && usedValue !== '';
        
        if (shouldShow) {
          // Buscamos la etiqueta legible en las opciones del select para una mejor visualización
          const selectedOption = param.options?.find(opt => String(opt.value) === String(usedValue));
          const displayValue = selectedOption ? selectedOption.label : usedValue;
          
          return {
            label: param.label,
            value: displayValue,
            // Añadimos un flag para que la píldora sepa cómo colorearse
            isDefault: usedValue == param.defaultValue 
          };
        }
        return null;
      })
      .filter(Boolean); // Limpiamos los nulos

  }, [reportConfig, modalParams]);

  if (paramsToShow.length === 0) {
    return null;
  }

  return (
    <div className="my-2 p-4 bg-white border border-purple-600 rounded-lg">
      <h4 className="text-xs font-bold text-purple-800 uppercase mb-2">Parámetros de la Ejecución</h4>
      <div className="flex flex-wrap gap-2">
        {paramsToShow.map(p => (
          <ParameterPill 
            key={p.label} 
            label={p.label} 
            value={p.value}
            isDefault={p.isDefault} // <-- Pasamos el nuevo prop
          />
        ))}
      </div>
    </div>
  );
}
