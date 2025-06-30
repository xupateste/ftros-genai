// src/components/RegisterPage.jsx (Corregido)

import React, { useState } from 'react';
import axios from 'axios';
import { FiUser, FiMail, FiKey, FiUserPlus, FiLoader } from 'react-icons/fi';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export function RegisterPage({ 
    onRegisterSuccess, 
    onSwitchToLogin, 
    onBackToLanding, 
    sessionId, 
    onboardingData 
}) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    if (!email || !password || !name) {
      setError("Todos los campos son obligatorios.");
      setIsLoading(false);
      return;
    }

    const formData = new FormData();
    formData.append('email', email);
    formData.append('password', password);
    formData.append('rol', onboardingData?.rol || 'otro');

    try {
      await axios.post(`${API_URL}/register`, formData, {
        headers: { 'X-Session-ID': sessionId }
      });
      
      alert("¡Registro exitoso! Serás redirigido para que inicies sesión.");
      
      // Verificamos que onRegisterSuccess sea una función antes de llamarla
      if (typeof onRegisterSuccess === 'function') {
        onRegisterSuccess();
      }

    } catch (err) {
      console.error("Error en el registro:", err);
      if (err.response?.data?.detail) {
        setError(err.response.data.detail);
      } else {
        setError("No se pudo completar el registro. Inténtalo más tarde.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md animate-fade-in text-white">
      <div className="bg-gray-800 bg-opacity-70 border border-gray-700 rounded-lg p-8 shadow-2xl">
        <div className="text-center">
          <h2 className="text-3xl font-bold mb-2">Crea tu Cuenta</h2>
          <p className="text-gray-400 mb-6">Desbloquea el historial y los reportes Pro.</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4 text-left">
          <div>
            {/* --- ID CORREGIDO --- */}
            <label className="block text-sm font-semibold text-gray-300 mb-1" htmlFor="name-register">Nombre</label>
            <div className="relative">
              <FiUser className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input id="name-register" type="text" placeholder="Tu nombre" value={name} onChange={e => setName(e.target.value)} className="w-full bg-gray-900 border border-gray-600 rounded-md py-2 pl-10 pr-4 focus:ring-purple-500 focus:border-purple-500" required />
            </div>
          </div>
          <div>
            {/* --- ID CORREGIDO --- */}
            <label className="block text-sm font-semibold text-gray-300 mb-1" htmlFor="email-register">Correo Electrónico</label>
            <div className="relative">
              <FiMail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input id="email-register" type="email" placeholder="tu@correo.com" value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-gray-900 border border-gray-600 rounded-md py-2 pl-10 pr-4 focus:ring-purple-500 focus:border-purple-500" required />
            </div>
          </div>
          <div>
            {/* --- ID CORREGIDO --- */}
            <label className="block text-sm font-semibold text-gray-300 mb-1" htmlFor="password-register">Contraseña</label>
            <div className="relative">
              <FiKey className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input id="password-register" type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-gray-900 border border-gray-600 rounded-md py-2 pl-10 pr-4 focus:ring-purple-500 focus:border-purple-500" required />
            </div>
          </div>
          {error && <p className="text-sm text-red-400 bg-red-900 bg-opacity-50 p-2 rounded-md text-center">{error}</p>}
          <button type="submit" className="w-full flex justify-center items-center gap-2 bg-purple-600 font-bold py-3 px-4 rounded-lg hover:bg-purple-700 disabled:opacity-50" disabled={isLoading}>
            {isLoading ? <FiLoader className="animate-spin" /> : <FiUserPlus />}
            {isLoading ? "Registrando..." : "Crear Cuenta"}
          </button>
        </form>
        <div className="mt-6 text-center text-sm">
          <p className="text-gray-400">¿Ya tienes una cuenta?{' '}
            <button onClick={onSwitchToLogin} className="font-semibold text-purple-400 hover:underline">Inicia sesión aquí</button>
          </p>
          <button onClick={onBackToLanding} className="mt-4 text-xs text-gray-500 hover:text-white hover:underline">&larr; Volver</button>
        </div>
      </div>
    </div>
  );
}