// src/components/ReportButton.jsx

import React, { useState, useEffect, useRef } from 'react';
import { FiMoreVertical, FiInfo, FiMessageSquare, FiStar } from 'react-icons/fi';

export function ReportButton({ reportItem, onExecute, onInfoClick, onFeedbackClick, onProFeatureClick }) {
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

  const handleProOptionClick = (e) => {
    e.preventDefault();
    onProFeatureClick(reportItem);
    setIsMenuOpen(false);
  };

  // --- Clases de Estilo ---
  const containerClasses = `relative flex w-full rounded-lg shadow-md transition-all duration-200 ease-in-out transform hover:scale-105 group ${isMenuOpen ? 'z-10' : 'z-0'}`;
  const proClasses = 'bg-gray-700 text-gray-300 hover:bg-gray-600 border border-purple-800';
  const standardClasses = 'bg-white bg-opacity-90 text-black hover:bg-purple-100';

  // --- Clases condicionales para el botón principal ---
  // Si es Pro, tiene todos los bordes redondeados. Si no, solo los de la izquierda.
  const mainButtonClasses = `flex-grow text-left p-4 ${isPro ? 'rounded-lg' : 'rounded-l-lg'}`;

  return (
    <div className={`${containerClasses} ${isPro ? proClasses : standardClasses}`}>
      {/* --- BOTÓN PRINCIPAL (AHORA CON BORDES DINÁMICOS) --- */}
      <button
        onClick={() => onExecute(reportItem)}
        className={mainButtonClasses}
      >
        <div className="flex items-center justify-between">
          <span className="font-semibold text-sm">{reportItem.label}</span>
          {isPro && <FiStar className="text-yellow-500" />}
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
            <FiMoreVertical className="mx-2" />
          </button>

          {isMenuOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-gray-800 border border-gray-700 rounded-md shadow-lg z-20 animate-fade-in-fast">
              <ul className="py-1">
                <li>
                  <a href="#" onClick={(e) => { e.preventDefault(); onInfoClick(reportItem); setIsMenuOpen(false); }} className="flex items-center gap-3 px-4 py-2 text-sm text-gray-300 hover:bg-gray-700">
                    <FiInfo /> Ver Detalles y Estrategias
                  </a>
                </li>
                <li className="border-t border-gray-700 my-1"></li>
                <li>
                  <a href="#" onClick={handleProOptionClick} className="flex items-center justify-between px-4 py-2 text-sm text-gray-300 hover:bg-gray-700">
                    <span className="flex items-center gap-3"><FiMessageSquare /> Enviar Sugerencia</span>
                    <FiStar className="text-yellow-500" />
                  </a>
                </li>
                <li>
                  <a href="#" onClick={handleProOptionClick} className="flex items-center justify-between px-4 py-2 text-sm text-gray-300 hover:bg-gray-700">
                    <span className="flex items-center gap-3"><FiStar /> Marcar como Favorito</span>
                    <FiStar className="text-yellow-500" />
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
