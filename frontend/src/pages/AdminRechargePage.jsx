// src/pages/AdminRechargePage.jsx

import React, { useState } from 'react';
import api from '../utils/api'; // Usamos nuestro cliente API
import { FiSend, FiLoader, FiCheckCircle, FiAlertTriangle } from 'react-icons/fi';

export function AdminRechargePage() {
  const [formData, setFormData] = useState({
    secret_key: '',
    user_email: '',
    credits_to_add: '',
    reason: 'Recarga por Yape/Plin'
  });
  const [isLoading, setIsLoading] = useState(false);
  const [responseMessage, setResponseMessage] = useState({ type: '', text: '' });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setResponseMessage({ type: '', text: '' });

    const formPayload = new FormData();
    formPayload.append('secret_key', formData.secret_key);
    formPayload.append('user_email', formData.user_email);
    formPayload.append('credits_to_add', formData.credits_to_add);
    formPayload.append('reason', formData.reason);

    try {
      const response = await api.post('/admin/recharge', formPayload);
      setResponseMessage({ type: 'success', text: response.data.message });
      // Limpiamos el formulario excepto la clave secreta
      setFormData(prev => ({ ...prev, user_email: '', credits_to_add: '', reason: 'Recarga por Yape/Plin' }));
    } catch (error) {
      setResponseMessage({ type: 'error', text: error.response?.data?.detail || 'Ocurrió un error inesperado.' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-gray-800 p-8 rounded-lg shadow-2xl border border-purple-500">
        <h1 className="text-2xl font-bold text-white mb-6 text-center">Consola de Recarga de Créditos</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300">Llave Maestra (Secret Key)</label>
            <input type="password" name="secret_key" value={formData.secret_key} onChange={handleChange} required className="mt-1 w-full bg-gray-700 text-white rounded-md p-2 border border-gray-600 focus:ring-purple-500 focus:border-purple-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300">Email del Usuario</label>
            <input type="email" name="user_email" value={formData.user_email} onChange={handleChange} required className="mt-1 w-full bg-gray-700 text-white rounded-md p-2 border border-gray-600 focus:ring-purple-500 focus:border-purple-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300">Créditos a Añadir</label>
            <input type="number" name="credits_to_add" value={formData.credits_to_add} onChange={handleChange} required className="mt-1 w-full bg-gray-700 text-white rounded-md p-2 border border-gray-600 focus:ring-purple-500 focus:border-purple-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300">Motivo (Opcional)</label>
            <input type="text" name="reason" value={formData.reason} onChange={handleChange} className="mt-1 w-full bg-gray-700 text-white rounded-md p-2 border border-gray-600 focus:ring-purple-500 focus:border-purple-500" />
          </div>
          <button type="submit" disabled={isLoading} className="w-full flex justify-center items-center gap-2 bg-purple-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-purple-700 disabled:bg-gray-500">
            {isLoading ? <FiLoader className="animate-spin" /> : <FiSend />}
            {isLoading ? 'Procesando...' : 'Confirmar Recarga'}
          </button>
        </form>
        {responseMessage.text && (
          <div className={`mt-4 p-3 rounded-md text-sm flex items-center bg-purple-50 gap-3 ${responseMessage.type === 'success' ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'}`}>
            {responseMessage.type === 'success' ? <FiCheckCircle /> : <FiAlertTriangle />}
            {responseMessage.text}
          </div>
        )}
      </div>
    </div>
  );
}
