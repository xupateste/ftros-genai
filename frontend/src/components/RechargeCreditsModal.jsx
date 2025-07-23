
// src/components/RechargeCreditsModal.jsx
import React from 'react';
import { FiCreditCard, FiX } from 'react-icons/fi';

export function RechargeCreditsModal({ onClose }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg p-8 m-4 max-w-md w-full shadow-2xl text-center relative animate-fade-in-fast">
        <button onClick={onClose} className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"><FiX size={24}/></button>
        <FiCreditCard className="text-5xl text-blue-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Recarga tus Créditos</h2>
        <p className="text-gray-600 mb-6">Has agotado tus créditos. Adquiere un paquete para seguir generando análisis ilimitados de tus datos.</p>
        <div className="text-left p-4 border rounded-lg bg-gray-50 mb-6">
          <p className="font-semibold text-blue-500">Paquetes de Créditos (Próximamente...)</p>
        </div>
        <div className="flex flex-col gap-3">
          <button disabled className="w-full bg-blue-600 text-white font-bold py-3 px-4 rounded-lg opacity-50 cursor-not-allowed">Ir a Recargar</button>
          <button onClick={onClose} className="text-sm text-gray-500 hover:text-gray-800">Volver</button>
        </div>
      </div>
    </div>
  );
}