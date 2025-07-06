// src/components/Tooltip.jsx

import React, { useState, useEffect, useRef } from 'react';
import { FiInfo } from 'react-icons/fi';

export function Tooltip({ text }) {
  const [isVisible, setIsVisible] = useState(false);
  const tooltipRef = useRef(null);

  // Efecto para cerrar el tooltip si se hace clic fuera de él
  useEffect(() => {
    function handleClickOutside(event) {
      if (tooltipRef.current && !tooltipRef.current.contains(event.target)) {
        setIsVisible(false);
      }
    }
    if (isVisible) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isVisible]);

  // Si no hay texto de ayuda, no renderizamos nada
  if (!text) {
    return null;
  }

  const handleIconClick = (e) => {
    e.stopPropagation(); 
    setIsVisible(prev => !prev);
  };

  return (
    <div className="relative inline-flex ml-2" ref={tooltipRef}>
      <button 
        type="button" 
        onClick={handleIconClick} 
        className="text-gray-400 hover:text-purple-600 focus:outline-none"
        aria-label="Más información"
      >
        <FiInfo className="cursor-help" size={14} />
      </button>

      {/* El tooltip se renderiza condicionalmente */}
      {isVisible && (
        <div 
          className="absolute bottom-full left-1/2 z-20 mb-3 w-64 -translate-x-1/2 transform rounded-lg bg-gray-800 p-3 text-left text-sm font-normal text-white shadow-lg animate-fade-in-fast"
        >
          <p>{text}</p>
          {/* Pequeño triángulo para apuntar al icono */}
          <div className="absolute -bottom-2 left-1/2 h-0 w-0 -translate-x-1/2 border-x-8 border-t-8 border-x-transparent border-t-gray-800"></div>
        </div>
      )}
    </div>
  );
}
