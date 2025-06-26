// src/components/ProOfferModal.jsx

import React from 'react';
import { FiX, FiZap, FiUserPlus } from 'react-icons/fi';

export function ProOfferModal({ reportName, onClose, onRegister }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-white rounded-lg p-8 m-4 max-w-md w-full shadow-2xl relative text-center">
        <button onClick={onClose} className="absolute top-3 right-3 text-gray-400 hover:text-gray-600">
           <FiX size={24}/>
        </button>
        
        <FiZap className="text-5xl text-yellow-500 mx-auto mb-4" />

        <h2 className="text-2xl font-bold text-gray-800 mb-2">
          Desbloquea el Reporte "{reportName}"
        </h2>
        <p className="text-gray-600 mb-6">
          Esta es una herramienta **Pro** diseñada para darte una ventaja competitiva. Para acceder, crea una cuenta gratuita.
        </p>
        
        <div className="space-y-4">
          <button
            onClick={onRegister}
            className="w-full bg-purple-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 flex items-center justify-center gap-2"
          >
            <FiUserPlus />
            Registrarme y Ver Opciones Pro
          </button>
          <p className="text-xs text-gray-400">
            Al registrarte, podrás guardar tu historial y acceder a la tienda de créditos para desbloquear funciones avanzadas.
          </p>
        </div>
      </div>
    </div>
  );
}