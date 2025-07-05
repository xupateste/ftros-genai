import React, { useState } from 'react';
import axios from 'axios';
import { FiX, FiUser, FiMail, FiKey, FiUserPlus, FiLoader } from 'react-icons/fi';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
// ===================================================================================
// --- VISTA 2: El Modal de Onboarding ---
// ===================================================================================
export default function OnboardingModal ({ onSubmit, onSwitchToLogin, onCancel, isLoading, onBackToLanding }) {
  const [rol, setRol] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!rol) {
      alert("Por favor, selecciona tu rol para continuar.");
      return;
    }
    onSubmit({ rol });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4 animate-fade-in">
    <div className="w-full max-w-md mx-auto animate-fade-in text-white">
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-8 shadow-2xl">
        <button onClick={onCancel} className="relative float-right text-gray-400 hover:text-gray-600">
           <FiX size={24}/>
        </button>
        <h2 className="text-2xl font-bold text-white mb-2">¡Un último paso!</h2>
        <p className="text-white mb-6">Esta información (totalmente anónima) nos ayuda a entender a nuestros usuarios y mejorar la herramienta.</p>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="rol" className="block text-sm font-medium text-white mb-2">¿Cuál es tu rol principal en el negocio?</label>
            <select id="rol" value={rol} onChange={(e) => setRol(e.target.value)} className="mt-1 block text-black w-full py-3 px-4 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm" required>
              <option value="" disabled>Selecciona una opción...</option>
              <option value="dueño">Dueño(a) / Propietario(a)</option>
              <option value="gerente_compras">Gerente de Compras</option>
              <option value="administrador">Administrador(a)</option>
              <option value="consultor">Consultor / Analista</option>
              <option value="otro">Otro</option>
            </select>
          </div>
          <button type="submit" disabled={isLoading} className="w-full gap-2 bg-purple-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:bg-gray-400 flex items-center justify-center">
            {isLoading && <FiLoader className="animate-spin" /> }
            {isLoading ? " Creando sesión anónima..." : "Comenzar a Analizar"}
          </button>
        </form>
        <div className="mt-6 text-center text-sm">
            <p className="text-gray-400">¿Ya tienes una cuenta?{' '}
              <button onClick={onSwitchToLogin} className="font-semibold text-purple-400 hover:underline">Inicia sesión aquí</button>
            </p>
            <button onClick={onBackToLanding} className="mt-4 text-xs text-gray-500 hover:text-white">&larr; Volver</button>
        </div>
      </div>
    </div>
    </div>
  );
};