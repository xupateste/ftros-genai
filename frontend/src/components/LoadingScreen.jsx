// src/components/LoadingScreen.jsx

import React from 'react';
import { FiLoader } from 'react-icons/fi'; // O el icono de carga que prefieras

export function LoadingScreen({ message = "Cargando..." }) {
  return (
    <div className="min-h-screen bg-neutral-900 flex flex-col items-center justify-center text-white animate-fade-in">
      <div className="text-center">
        <FiLoader className="text-4xl text-purple-400 mx-auto animate-spin mb-4" />
        <p className="text-lg text-gray-300">{message}</p>
      </div>
    </div>
  );
}
