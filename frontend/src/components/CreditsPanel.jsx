import React from 'react';

export function CreditsPanel({ used, remaining, onHistoryClick }) {
  return (
    // 1. Contenedor principal: Un único bloque más ancho y con sombra
    <div className="flex w-full max-w-md hover:bg-gray-800 hover:ring-1 hover:ring-purple-700 cursor-pointer bg-gray-800 border border-gray-700 rounded-lg shadow-lg overflow-hidden">
      
      {/* 2. Sección de Créditos Usados (Clickeable) */}
      <div onClick={onHistoryClick} className="w-48 flex-1 p-3 md:p-4 text-center transition-colors duration-200">
        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Créditos Usados</h4>
        <p className="text-3xl font-bold text-white mt-1">{used}<span className="text-2xl">🪙</span></p>
        <p className="text-xs text-gray-500 mt-1">
          Hasta ahora
        </p>
      </div>

      {/* 3. Divisor Vertical */}
      <div className="w-px bg-gray-700"></div>

      {/* 4. Sección de Créditos Restantes (No Clickeable) */}
      <div onClick={onHistoryClick} className="w-48 flex-1 p-3 md:p-4 text-center bg-purple-900 bg-opacity-30">
        <h4 className="text-xs font-semibold text-purple-300 uppercase tracking-wider">Créditos Restantes</h4>
        <p className="text-3xl font-bold text-white mt-1">{remaining}<span className="text-2xl">🪙</span></p>
        <p className="text-xs text-purple-400 mt-1">
          Disponibles
        </p>
      </div>

    </div>
  );
}