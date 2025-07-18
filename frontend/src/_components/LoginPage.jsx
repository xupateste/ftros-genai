import React, { useState } from 'react';
import axios from 'axios';
import { FiLogIn, FiUser, FiMail, FiX, FiKey, FiUserPlus, FiLoader } from 'react-icons/fi';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// ===================================================================================
// --- VISTA LOGIN ---
// ===================================================================================
export default function LoginPage ({ onLoginSuccess, onClose, onSwitchToRegister, onBackToAnalysis }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    // FastAPI con OAuth2PasswordRequestForm espera los datos en formato x-www-form-urlencoded.
    // La forma más fácil de construir esto es con URLSearchParams.
    const formData = new URLSearchParams();
    formData.append('username', email); // FastAPI usa 'username' para el email
    formData.append('password', password);

    try {
      const response = await axios.post(`${API_URL}/token`, formData, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });
      
      const accessToken = response.data.access_token;
      
      // Llamamos a la función del padre para que maneje el token y el estado de autenticación
      onLoginSuccess(accessToken);

    } catch (err) {
      console.error("Error en el inicio de sesión:", err);
      if (err.response && err.response.data && err.response.data.detail) {
        setError(err.response.data.detail);
      } else {
        setError("No se pudo conectar con el servidor. Inténtalo más tarde.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4 animate-fade-in">
    <div className="w-full max-w-md mx-auto animate-fade-in text-white">
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-8 shadow-2xl">
        <button onClick={onBackToAnalysis} className="relative float-right text-gray-400 hover:text-gray-600">
           <FiX size={24}/>
        </button>
       <h2 className="text-3xl font-bold mb-6 text-center">Iniciar Sesión</h2>
        <form onSubmit={handleLogin} className="space-y-4 text-left">
          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-1" htmlFor="email-login">Correo Electrónico</label>
            <div className="relative">
              <FiMail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input 
                id="email-login" 
                type="email" 
                placeholder="tu@correo.com" 
                className="w-full bg-gray-900 border border-gray-600 rounded-md py-2 pl-10 pr-4 focus:ring-purple-500 focus:border-purple-500"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-1" htmlFor="password-login">Contraseña</label>
            <div className="relative">
              <FiKey className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input 
                id="password-login" 
                type="password" 
                placeholder="••••••••" 
                className="w-full bg-gray-900 border border-gray-600 rounded-md py-2 pl-10 pr-4 focus:ring-purple-500 focus:border-purple-500"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>
          
          {error && <p className="text-sm text-red-400 bg-red-900 bg-opacity-50 p-2 rounded-md">{error}</p>}

          <button
            type="submit"
            className="w-full flex justify-center items-center gap-2 bg-purple-600 font-bold py-3 px-4 rounded-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:bg-gray-500"
            disabled={isLoading}
          >
            {isLoading ? <><FiLoader className="animate-spin" /> Ingresando...</> : <><FiLogIn /> Ingresar</>}
          </button>
        </form>
        <div className="mt-6 text-center text-sm">
            <p className="text-gray-400">¿No tienes cuenta? <button onClick={onSwitchToRegister} className="font-semibold text-purple-400 hover:underline">Regístrate</button></p>
            <button onClick={onBackToAnalysis} className="mt-4 text-xs text-gray-500 hover:text-white">&larr; Volver</button>
        </div>
      </div>
    </div>
    </div>
  );
};
