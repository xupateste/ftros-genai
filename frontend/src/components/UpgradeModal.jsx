// src/components/UpgradeModal.jsx

import React from 'react';
import { FiUserPlus, FiAward, FiX, FiLock } from 'react-icons/fi';

// Este componente es un "camaleón". Muestra diferentes mensajes según las props.
export function UpgradeModal({ context, reportItem, onAction, onClose }) {

  // Definimos el contenido para cada tipo de usuario
  const content = {
    anonymous: {
      icon: <FiUserPlus className="text-5xl text-purple-500 mx-auto mb-4" />,
      title: "Desbloquea Reportes Estratégicos",
      message: "Este es un reporte Pro. Regístrate gratis para acceder a este y otros análisis avanzados, guardar tu historial y organizar tu negocio.",
      ctaText: "Registrarme y Desbloquear",
      action: 'register'
    },
    user: {
      icon: <FiAward className="text-5xl text-yellow-500 mx-auto mb-4" />,
      title: "Accede al Siguiente Nivel: Ferretero Estratega",
      message: "Los reportes Pro y los gráficos de benchmarking son herramientas exclusivas para nuestra comunidad de negocios verificados. Obtén una ventaja competitiva.",
      ctaText: "Mejorar mi Plan (Próximamente)",
      action: 'verify'
    }
  };

  // Seleccionamos el contenido correcto basado en el contexto
  const currentContent = content[context.type] || content.anonymous;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center p-4 animate-fade-in-fast">
      <div className="bg-white rounded-lg p-8 m-4 max-w-md w-full shadow-2xl text-center relative">
        <button onClick={onClose} className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"><FiX size={24}/></button>
        
        {currentContent.icon}
        <h2 className="text-2xl font-bold text-gray-800 mb-2">{currentContent.title}</h2>

        {/* --- El "Ancla" Contextual --- */}

          <p className="text-xs text-gray-500">Intentaste acceder a:</p>
          <button
            onClick={() => {}} 
            className="relative w-full text-left p-4 text-xs rounded-lg shadow-md transition-all duration-200 ease-in-out transform scale-80 hover:scale-87 group bg-gray-700 text-gray-400 hover:bg-gray-600 border border-purple-800 disabled:cursor-not-allowed"
          >
            <div className="flex items-center justify-between">
              <span className="font-semibold text-sm">{reportItem.label}</span>
              <FiLock className="text-yellow-500" />
            </div>
            <p className="text-xs text-purple-400 mt-1">Función Avanzada</p>
          </button>

        
        <p className="text-gray-600 mb-6">{currentContent.message}</p>
        
        <div className="flex flex-col gap-3">
          <button 
            onClick={() => onAction(currentContent.action)} 
            disabled={currentContent.action === 'verify'} // Deshabilitamos el botón de verificar por ahora
            className="w-full bg-purple-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-purple-700 flex items-center justify-center gap-2 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {currentContent.ctaText}
          </button>
          <button onClick={onClose} className="text-sm text-gray-500 hover:text-gray-800">
            Quizás más tarde
          </button>
        </div>
      </div>
    </div>
  );
}
