// src/components/StrategySlider.jsx

import React, { useState, useEffect, useRef } from 'react';
import { FiInfo, FiX } from 'react-icons/fi'; // O el icono que prefieras

export function StrategySlider({ name, label, tooltipText, value, onChange }) {
  // 1. Estado para controlar la visibilidad del tooltip
  const [isTooltipVisible, setIsTooltipVisible] = useState(false);
  const tooltipRef = useRef(null); // Ref para detectar clics fuera del tooltip

  // 2. Efecto para cerrar el tooltip si se hace clic fuera de él
  useEffect(() => {
    function handleClickOutside(event) {
      if (tooltipRef.current && !tooltipRef.current.contains(event.target)) {
        setIsTooltipVisible(false);
      }
    }
    // Añadimos el listener cuando el tooltip es visible
    if (isTooltipVisible) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    // Limpiamos el listener cuando el componente se desmonta o el tooltip se oculta
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isTooltipVisible]);


  const handleIconClick = (e) => {
    // Detenemos la propagación para que el clic no afecte a otros elementos
    e.stopPropagation(); 
    setIsTooltipVisible(prev => !prev);
  };


  return (
    <div className="relative"> {/* Contenedor relativo principal */}
      <label className="flex items-center text-sm font-medium text-gray-700">
        <span>{label}</span>
        
        {/* El icono de información ahora usa onClick */}
        <div className="ml-2 relative" ref={tooltipRef}>
          <button 
            type="button" 
            onClick={handleIconClick} 
            className="text-gray-400 hover:text-purple-600 focus:outline-none"
            aria-label="Más información"
          >
            <FiInfo className="cursor-help" />
          </button>

          {/* 3. El tooltip ahora se renderiza condicionalmente basado en el estado */}
          {isTooltipVisible && (
            <div 
              className="absolute bottom-full left-1/2 z-20 mb-3 w-64 -translate-x-1/2 transform rounded-lg bg-gray-800 p-3 text-left text-sm font-normal text-white shadow-lg animate-fade-in-fast"
            >
              <p>{tooltipText}</p>
              {/* Añadimos un pequeño triángulo para apuntar al icono */}
              <div className="absolute -bottom-2 left-1/2 h-0 w-0 -translate-x-1/2 border-x-8 border-t-8 border-x-transparent border-t-gray-800"></div>
            </div>
          )}
        </div>
      </label>

      {/* El resto del componente (input y span) no cambia */}
      <div className="flex items-center gap-4 mt-1">
        <input 
          type="range" 
          name={name} 
          min="1" 
          max="10" 
          value={value} 
          onChange={onChange} 
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer" 
        />
        <span className="w-8 text-right font-bold text-purple-700">{value}</span>
      </div>
    </div>
  );
}