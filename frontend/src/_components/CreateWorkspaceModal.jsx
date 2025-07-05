// src/components/CreateWorkspaceModal.jsx

import React, { useState } from 'react';
import { useWorkspace } from '../context/WorkspaceProvider';
import { FiX, FiPlusCircle, FiLoader } from 'react-icons/fi';

export default function CreateWorkspaceModal({ onClose, onSuccess }) {
  const { createWorkspace } = useWorkspace();
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newWorkspaceName.trim()) {
      setError("El nombre del espacio no puede estar vacío.");
      return;
    }
    setError('');
    setIsCreating(true);
    try {
      // La función del provider ahora devuelve el workspace creado
      const newWorkspace = await createWorkspace(newWorkspaceName);
      setNewWorkspaceName('');
      onSuccess(newWorkspace); // Notificamos al componente padre con el nuevo workspace
    } catch (err) {
      setError(err.response?.data?.detail || "No se pudo crear el espacio de trabajo.");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 m-4 max-w-md w-full shadow-2xl relative">
        <button onClick={onClose} className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"><FiX size={24}/></button>
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Crear Nuevo Espacio de Trabajo</h2>
        <form onSubmit={handleSubmit}>
          <label htmlFor="workspaceName" className="block text-sm font-medium text-gray-700 mb-2">Nombre del Espacio</label>
          <input
            id="workspaceName"
            type="text"
            value={newWorkspaceName}
            onChange={(e) => setNewWorkspaceName(e.target.value)}
            placeholder="Ej: Análisis Tienda Principal Q3"
            className="w-full bg-gray-100 text-black border border-gray-300 rounded-md py-2 px-4 focus:ring-purple-500 focus:border-purple-500"
            autoFocus
          />
          {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
          <div className="flex gap-4 mt-6">
            <button type="button" onClick={onClose} className="flex-1 bg-gray-200 text-gray-700 font-bold py-2 px-4 rounded-lg hover:bg-gray-300">Cancelar</button>
            <button type="submit" disabled={isCreating} className="flex-1 bg-purple-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-purple-700 disabled:bg-gray-500 flex items-center justify-center gap-2">
              {isCreating ? <FiLoader className="animate-spin" /> : <FiPlusCircle />}
              {isCreating ? "Creando..." : "Crear"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}