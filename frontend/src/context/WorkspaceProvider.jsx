// src/context/WorkspaceProvider.jsx

import React, { createContext, useState, useContext, useCallback } from 'react';
// import axios from 'axios';
import api from '../utils/api'; // Usamos nuestro cliente de API centralizado


// const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const WorkspaceContext = createContext();

export function WorkspaceProvider({ children }) {
  const [workspaces, setWorkspaces] = useState([]);
  const [activeWorkspace, setActiveWorkspace] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // Función para cargar los espacios de trabajo de un usuario
  const fetchWorkspaces = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/workspaces');
      setWorkspaces(response.data);
      // Establece el primer espacio de trabajo como activo por defecto
      if (response.data.length > 0 && !activeWorkspace) {
        setActiveWorkspace(response.data[0]);
      }
    } catch (error) {
      console.error("Error al cargar los espacios de trabajo:", error);
      setWorkspaces([]); // En caso de error, dejamos la lista vacía
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Función para crear un nuevo espacio de trabajo
  const createWorkspace = useCallback(async (name) => {
    if (!name) return;
    try {
      await api.post('/workspaces', { nombre: name });
      // Después de crear, volvemos a cargar la lista para que se actualice
      await fetchWorkspaces();
    } catch (error) {
      console.error("Error al crear el espacio de trabajo:", error);
      throw error; // Lanzamos el error para que el componente visual pueda reaccionar
    }
  }, [fetchWorkspaces]);

  const renameWorkspace = useCallback(async (workspaceId, newName) => {
    try {
      await api.put(`/workspaces/${workspaceId}`, { nombre: newName });
      // Actualizamos el estado localmente para una respuesta instantánea en la UI
      setWorkspaces(prev => 
        prev.map(ws => ws.id === workspaceId ? { ...ws, nombre: newName } : ws)
      );
      if (activeWorkspace?.id === workspaceId) {
        setActiveWorkspace(prev => ({ ...prev, nombre: newName }));
      }
    } catch (error) {
      console.error("Error al renombrar el espacio de trabajo:", error);
      throw error;
    }
  }, [activeWorkspace]);

  const deleteWorkspace = useCallback(async (workspaceId) => {
    try {
      await api.delete(`/workspaces/${workspaceId}`);
      // Actualizamos el estado local para que la UI reaccione al instante
      setWorkspaces(prev => prev.filter(ws => ws.id !== workspaceId));
      if (activeWorkspace?.id === workspaceId) {
        setActiveWorkspace(null); // Si se borra el activo, lo deseleccionamos
      }
    } catch (error) {
      console.error("Error al eliminar el espacio de trabajo:", error);
      throw error;
    }
  }, [activeWorkspace]);

  const togglePinWorkspace = useCallback(async (workspaceId) => {
    try {
      // Llamamos al nuevo endpoint del backend
      const response = await api.put(`/workspaces/${workspaceId}/pin`);
      
      // Actualizamos el estado local para que la UI reaccione instantáneamente
      setWorkspaces(prev => 
        prev.map(ws => 
          ws.id === workspaceId ? { ...ws, isPinned: response.data.isPinned } : ws
        )
      );
    } catch (error) {
      console.error("Error al fijar el espacio de trabajo:", error);
      alert(error.response?.data?.detail || "No se pudo realizar la acción.");
      // Opcional: revertir el cambio en la UI si la API falla
    }
  }, []);

  const value = {
    workspaces,
    activeWorkspace,
    setActiveWorkspace,
    isLoading,
    fetchWorkspaces,
    createWorkspace,
    renameWorkspace, // Exponemos las nuevas funciones
    deleteWorkspace,
    togglePinWorkspace
  };

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
}

// Hook personalizado para un uso más fácil
export function useWorkspace() {
  return useContext(WorkspaceContext);
}