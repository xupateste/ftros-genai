// src/components/BecomeStrategistModal.jsx
import React from 'react';
import { FiAward, FiX } from 'react-icons/fi';

export function BecomeStrategistModal({ onClose }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg p-8 m-4 max-w-md w-full shadow-2xl text-center relative animate-fade-in-fast">
        <button onClick={onClose} className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"><FiX size={24}/></button>
        <FiAward className="text-5xl text-yellow-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Conviértete en un Ferretero Estratega</h2>
        <p className="text-gray-600 mb-6">Desbloquea herramientas de Inteligencia Colectiva. Compara tu negocio con el mercado y toma decisiones basadas en datos que tus competidores no tienen.</p>
        <div className="flex flex-col gap-3">
          <button disabled className="w-full bg-yellow-500 text-white font-bold py-3 px-4 rounded-lg opacity-50 cursor-not-allowed">Iniciar Verificación (Próximamente)</button>
          <button onClick={onClose} className="text-sm text-gray-500 hover:text-gray-800">Quizás más tarde</button>
        </div>
      </div>
    </div>
  );
}