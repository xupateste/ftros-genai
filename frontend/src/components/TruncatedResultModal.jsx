// src/components/TruncatedResultModal.jsx
import React from 'react';
import { FiEye, FiUserPlus } from 'react-icons/fi';

export function TruncatedResultModal({ shown, total, onRegister, onClose }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg p-8 m-4 max-w-md w-full shadow-2xl text-center">
        <FiEye className="text-5xl text-purple-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Desbloquea el Reporte Completo</h2>
        <p className="text-gray-600 mb-6">
          Estás viendo los primeros <strong>{shown}</strong> de <strong>{total}</strong> resultados. Crea una cuenta gratuita para ver el análisis completo, guardar tu historial y acceder a más beneficios.
        </p>
        <div className="flex flex-col gap-3">
          <button onClick={onRegister} className="w-full bg-purple-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-purple-700 flex items-center justify-center gap-2">
            <FiUserPlus /> Registrarme Gratis para Ver Todo
          </button>
          <button onClick={onClose} className="text-sm text-gray-500 hover:text-gray-800">Continuar con vista limitada</button>
        </div>
      </div>
    </div>
  );
}