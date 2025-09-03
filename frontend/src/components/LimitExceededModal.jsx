// src/components/LimitExceededModal.jsx

import React from 'react';
import { FiX, FiCheckCircle, FiUserPlus, FiLogIn } from 'react-icons/fi';

export const LimitExceededModal = ({ onClose, onRegister, onLogin }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-white rounded-lg max-w-md w-full shadow-2xl relative transform transition-all scale-95 hover:scale-100">
        
        {/* Encabezado */}
        <div className="p-5 border-b text-center bg-gray-50 rounded-t-lg">
          <h2 className="text-2xl font-bold text-gray-800 mt-6">
            ¡Has completado tu prueba del día!
          </h2>
          <p className="text-gray-500 mt-1">Gracias por probar la herramienta.</p>
        </div>

        {/* Cuerpo del Modal */}
        <div className="p-6 text-gray-700">
          <p className="text-center mb-6">
            Ya has utilizado tu análisis anónimo gratuito del día. Te invitamos a dar el siguiente paso.
          </p>
          
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 space-y-3">
            <h3 className="font-semibold text-purple-800">Usuarios Registrados:</h3>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-3">
                <FiCheckCircle className="text-purple-600 flex-shrink-0" />
                <span><strong>25 Créditos diarios</strong> renovados cada medianoche.</span>
              </li>
              <li className="flex items-center gap-3">
                <FiCheckCircle className="text-purple-600 flex-shrink-0" />
                <span>Acceso al <b>Workspace personal</b> para guardar tu historial.</span>
              </li>
              <li className="flex items-center gap-3">
                <FiCheckCircle className="text-purple-600 flex-shrink-0" />
                <span>Análisis con <b>filtros avanzados y más opciones.</b></span>
              </li>
            </ul>
          </div>
        </div>

        {/* Pie de página con los botones de acción */}
        <div className="px-6 py-4 bg-gray-50 border-t rounded-b-lg space-y-3">
          <button
            onClick={onRegister}
            className="w-full flex items-center justify-center gap-2 bg-purple-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-purple-700 transition-transform transform hover:scale-105"
          >
            <FiUserPlus />
            Regístrate Gratis (y obtén 25 créditos)
          </button>
          <button
            onClick={onLogin}
            className="w-full text-sm text-gray-600 hover:text-gray-900 hover:underline"
          >
            Ya tengo una cuenta
          </button>
        </div>
        
        <button onClick={onClose} className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 p-2 rounded-full">
          <FiX size={24} />
        </button>
      </div>
    </div>
  );
};