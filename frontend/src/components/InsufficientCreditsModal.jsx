// src/components/InsufficientCreditsModal.jsx

import React from 'react';
import { FiX, FiGift, FiRefreshCw } from 'react-icons/fi'; // O tus iconos

export function InsufficientCreditsModal({ required, remaining, onClose, onRegister, onNewSession }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-white rounded-lg p-8 m-4 max-w-md w-full shadow-2xl relative text-center">
        <button onClick={onClose} className="absolute top-3 right-3 text-gray-400 hover:text-gray-600">
           <FiX size={24}/>
        </button>
        
        <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-4xl">🪙</span>
        </div>

        <h2 className="text-2xl font-bold text-gray-800 mb-2">Créditos Insuficientes</h2>
        <p className="text-gray-600 mb-6">
          Este reporte requiere <strong className="text-purple-600">{required} créditos</strong>, pero solo te quedan <strong className="text-red-500">{remaining}</strong> en esta sesión.
        </p>
        
        <div className="space-y-4">
          {/* Opción A (Recomendada): El camino a la conversión */}
          <div className="p-4 border-2 border-purple-500 bg-purple-50 rounded-lg">
            <h3 className="font-bold text-lg text-gray-800">Crea una Cuenta Gratis</h3>
            <p className="text-sm text-gray-600 my-2">
              Obtén un bono de <strong>50 créditos</strong>, guarda tu historial y accede a la tienda de créditos para recargas.
            </p>
            <button
              onClick={onRegister}
              className="w-full bg-purple-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 flex items-center justify-center gap-2"
            >
              <FiGift />
              Registrarme y Obtener Bono
            </button>
          </div>

          {/* Opción B (Escape): Respetar al usuario */}
          <div>
            <button
              onClick={onNewSession}
              className="text-sm text-gray-500 hover:text-gray-800 hover:underline flex items-center justify-center gap-2 mx-auto"
            >
              <FiRefreshCw />
              O iniciar una nueva sesión anónima (empezarás con 20 créditos)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}