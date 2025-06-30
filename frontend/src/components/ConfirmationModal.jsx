// src/components/ConfirmationModal.jsx
import React from 'react';
import { FiAlertTriangle, FiX } from 'react-icons/fi';

export function ConfirmationModal({ title, message, onConfirm, onCancel, confirmText = "Eliminar", isLoading = false }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 m-4 max-w-sm w-full shadow-2xl text-center">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <FiAlertTriangle className="text-4xl text-red-500" />
        </div>
        <h3 className="text-xl font-bold text-gray-800">{title}</h3>
        <p className="text-gray-600 my-4">{message}</p>
        <div className="flex gap-4">
          <button onClick={onCancel} disabled={isLoading} className="flex-1 bg-gray-200 text-gray-700 font-bold py-2 px-4 rounded-lg hover:bg-gray-300">Cancelar</button>
          <button onClick={onConfirm} disabled={isLoading} className="flex-1 bg-red-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-red-700 flex items-center justify-center">
            {isLoading ? "Eliminando..." : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}