// src/components/ConversionModal.jsx

import React from 'react';
import { FiX, FiGift, FiRefreshCw, FiZap } from 'react-icons/fi'; // O tus iconos

export function ConversionModal({ onClose, onRegister, onNewSession }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-white rounded-lg p-8 m-4 max-w-lg w-full shadow-2xl relative text-center">
        {/* Botón de cerrar para usuarios que no quieren tomar ninguna acción */}
        <button onClick={onClose} className="absolute top-3 right-3 text-gray-400 hover:text-gray-600">
           <FiX size={24}/>
        </button>
        
        <FiZap className="text-5xl text-purple-500 mx-auto mb-4" />

        <h2 className="text-2xl font-bold text-gray-800 mb-2">¡Potencia tus Análisis!</h2>
        <p className="text-gray-600 mb-6">
          Has agotado los créditos de esta sesión anónima. ¡No te detengas! Regístrate para desbloquear más poder.
        </p>
        
        <div className="space-y-4">
          {/* Opción A (Recomendada): El camino a la conversión */}
          <div className="p-4 border-2 border-purple-500 bg-purple-50 rounded-lg">
            <h3 className="font-bold text-lg text-gray-800">Crea una Cuenta Gratis</h3>
            <p className="text-sm text-gray-600 my-2">
              Obtén un bono de <strong>50 créditos</strong>, guarda tu historial y accede a reportes avanzados. ¡Tu sesión actual no se perderá!
            </p>
            <button
              onClick={onRegister}
              className="w-full bg-purple-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 flex items-center justify-center gap-2"
            >
              <FiGift />
              Registrarme y Obtener Bono
            </button>
          </div>

          {/* Opción B (Escape): Respetar al usuario que no quiere registrarse */}
          <div>
            <button
              onClick={onNewSession}
              className="text-sm text-gray-500 hover:text-gray-800 hover:underline flex items-center justify-center gap-2 mx-auto"
            >
              <FiRefreshCw />
              O iniciar una nueva sesión anónima (se perderán los archivos actuales)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}