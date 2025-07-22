// src/components/ReportButton.jsx

import React, { useState, useEffect, useRef } from 'react';
import { FiMoreVertical, FiInfo, FiMessageSquare, FiStar, FiLock } from 'react-icons/fi';

export function ReportButton({ reportItem, onExecute, onInfoClick, onFeedbackClick }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef(null);

  // Efecto para cerrar el menú si se hace clic fuera de él
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuRef]);

  const isPro = reportItem.isPro;

  // --- CAMBIO CLAVE: Añadimos un z-index condicional ---
  // Cuando el menú está abierto, elevamos todo el componente para que se superponga a los demás.
  const containerClasses = `relative flex w-full rounded-lg shadow-md transition-all duration-200 ease-in-out transform hover:scale-105 group ${isMenuOpen ? 'z-10' : 'z-0'}`;
  
  // Clases específicas para cada tipo de reporte
  const proClasses = 'bg-gray-700 text-gray-300 hover:bg-gray-600 border border-purple-800';
  const standardClasses = 'bg-white bg-opacity-90 text-black hover:bg-purple-100';

  return (
    <div className={`${containerClasses} ${isPro ? proClasses : standardClasses}`}>
      {/* --- BOTÓN PRINCIPAL (SIEMPRE PRESENTE) --- */}
      <button
        onClick={() => onExecute(reportItem)}
        className="flex-grow text-left p-4 rounded-l-lg"
      >
        <div className="flex items-center justify-between">
          <span className="font-semibold text-sm">{reportItem.label}</span>
          {isPro && <FiLock className="text-yellow-500" />}
        </div>
      </button>

      {/* --- MENÚ DE OPCIONES (SOLO PARA REPORTES NO-PRO) --- */}
      {!isPro && (
        <div ref={menuRef} className="relative flex-shrink-0">
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="h-full px-2 rounded-r-lg border-l border-black border-opacity-10 hover:bg-black hover:bg-opacity-10"
            aria-label="Más opciones"
          >
            <FiMoreVertical />
          </button>

          {/* --- DROPDOWN CON ESTILO OSCURO --- */}
          {isMenuOpen && (
            <div className="absolute right-0 mt-0 w-48 bg-gray-800 border border-gray-700 rounded-md shadow-lg z-20 animate-fade-in-fast">
              <ul className="py-1">
                <li>
                  <a href="#" onClick={(e) => { e.preventDefault(); onInfoClick(reportItem); setIsMenuOpen(false); }} className="flex items-center gap-3 px-4 py-2 text-sm text-gray-300 hover:bg-gray-700">
                    <FiInfo /> Más Información
                  </a>
                </li>
                <li>
                  <a href="#" onClick={(e) => { e.preventDefault(); onFeedbackClick(reportItem); setIsMenuOpen(false); }} className="flex items-center gap-3 px-4 py-2 text-sm text-gray-300 hover:bg-gray-700">
                    <FiMessageSquare /> Enviar una Sugerencia
                  </a>
                </li>
                <li className="border-t border-gray-700 my-1"></li>
                <li>
                  <a href="#" className="flex items-center gap-3 px-4 py-2 text-sm text-gray-500 cursor-not-allowed">
                    <FiStar /> Marcar como Favorito
                  </a>
                </li>
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
