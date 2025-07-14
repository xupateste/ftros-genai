// src/components/RegisterToUnlockModal.jsx
import React from 'react';
import { FiGift, FiUserPlus, FiX } from 'react-icons/fi';

// Un modal genérico para incentivar el registro en usuarios anónimos
export function RegisterToUnlockModal({ title, message, onRegister, onClose }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg p-8 m-4 max-w-md w-full shadow-2xl text-center relative animate-fade-in-fast">
        <button onClick={onClose} className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"><FiX size={24}/></button>
        <FiGift className="text-5xl text-purple-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-800 mb-2">{title}</h2>
        <p className="text-gray-600 mb-6">{message}</p>
        <div className="flex flex-col gap-3">
          <button onClick={onRegister} className="w-full bg-purple-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-purple-700 flex items-center justify-center gap-2">
            <FiUserPlus /> Registrarme Gratis y Desbloquear
          </button>
          <button onClick={onClose} className="text-sm text-gray-500 hover:text-gray-800">Quizás más tarde</button>
        </div>
      </div>
    </div>
  );
}