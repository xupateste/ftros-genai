// src/components/RegisterPage.jsx

import React from 'react';
import { FiUser, FiMail, FiKey, FiUserPlus } from 'react-icons/fi';

export function RegisterPage({ onBackToLanding }) {
  return (
    <div className="w-full max-w-md animate-fade-in text-white">
      <div className="bg-gray-800 bg-opacity-70 border border-gray-700 rounded-lg p-8 shadow-2xl">
        {/* El contenido interno sí puede estar centrado */}
        <div className="text-center">
          <h2 className="text-3xl font-bold mb-2">
            Crea tu Cuenta en <span className="bg-clip-text text-transparent" style={{ backgroundImage: 'linear-gradient(to right, #560bad, #7209b7, #b5179e)' }}>Ferretero.IA</span>
          </h2>
          <p className="text-gray-400 mb-6">
            Desbloquea el historial, los reportes Pro y la persistencia de datos.
          </p>
        </div>
        <form className="space-y-4 text-left">
          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-1" htmlFor="name">Nombre</label>
            <div className="relative">
              <FiUser className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input id="name" type="text" placeholder="Tu nombre" className="w-full bg-gray-900 border border-gray-600 rounded-md py-2 pl-10 pr-4 focus:ring-purple-500 focus:border-purple-500" disabled />
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-1" htmlFor="email">Correo Electrónico</label>
            <div className="relative">
              <FiMail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input id="email" type="email" placeholder="tu@correo.com" className="w-full bg-gray-900 border border-gray-600 rounded-md py-2 pl-10 pr-4 focus:ring-purple-500 focus:border-purple-500" disabled />
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-1" htmlFor="password">Contraseña</label>
            <div className="relative">
              <FiKey className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input id="password" type="password" placeholder="••••••••" className="w-full bg-gray-900 border border-gray-600 rounded-md py-2 pl-10 pr-4 focus:ring-purple-500 focus:border-purple-500" disabled />
            </div>
          </div>
          <button
            type="submit"
            className="w-full flex justify-center items-center gap-2 bg-purple-600 font-bold py-3 px-4 rounded-lg cursor-not-allowed opacity-50"
            disabled
          >
            <FiUserPlus />
            Registrarse (Próximamente)
          </button>
        </form>

        <div className="mt-6">
          <button onClick={onBackToLanding} className="text-sm text-gray-400 hover:text-white hover:underline">
            &larr; Volver a la página de análisis
          </button>
        </div>
      </div>
    </div>
  );
}