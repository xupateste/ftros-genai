// src/context/WorkspaceProvider.jsx

import React, { createContext, useState, useContext, useCallback } from 'react';
// import axios from 'axios';
import api from '../utils/api'; // Usamos nuestro cliente de API centralizado
import { useStrategy } from './StrategyProvider'; // Usamos nuestro cliente de API centralizado


// const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const WorkspaceContext = createContext();

export function WorkspaceProvider({ children }) {
  const [user, setUser] = useState(null);
  const [workspaces, setWorkspaces] = useState([]);
  const [activeWorkspace, setActiveWorkspace] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);

  const { loadStrategy } = useStrategy();
  // --- NUEVO ESTADO PARA LOS CRÉDITOS, AHORA VIVE AQUÍ ---
  const [credits, setCredits] = useState(null);

  const fetchWorkspaces = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/workspaces');

      const { workspaces: fetchedWorkspaces, credits: fetchedCredits, user: fetchedUser } = response.data || {};

      setWorkspaces(fetchedWorkspaces || []);
      setCredits(fetchedCredits || { used: 0, remaining: 0 });
      setUser(fetchedUser || null); // <-- Guardamos el perfil del usuario

      // Si hay workspaces, establecemos el primero como activo por defecto
      // Establece el primer espacio de trabajo como activo por defecto
      if (fetchedWorkspaces && fetchedWorkspaces.length > 0) {
        setActiveWorkspace(fetchedWorkspaces[0]);
      }

      return fetchedWorkspaces || [];
    } catch (error) {
      console.error("Error al cargar el contexto del usuario:", error);
      // En caso de error, reseteamos a un estado seguro
      setWorkspaces([]);
      setCredits(null);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  // --- NUEVA FUNCIÓN PARA ACTUALIZACIÓN QUIRÚRGICA ---
  const updateCredits = useCallback((newCreditData) => {
    if (newCreditData) {
      console.log("Actualizando créditos en el contexto:", newCreditData);
      setCredits(newCreditData);
    }
  }, []);

  // --- NUEVA FUNCIÓN PARA LIMPIAR EL ESTADO ---
  const clearWorkspaceContext = useCallback(() => {
    console.log("Limpiando contexto del espacio de trabajo...");
    setIsLoading(false);
    setWorkspaces([]);
    setActiveWorkspace(null);
    setCredits(null);
  }, []);


  // Función para crear un nuevo espacio de trabajo
  const createWorkspace = useCallback(async (name) => {
    if (!name) return;
    try {
      const response = await api.post('/workspaces', { nombre: name });
      const newWorkspace = response.data.workspace; // Obtenemos el workspace creado
      
      // Actualizamos la lista local para que la UI reaccione
      setWorkspaces(prev => [newWorkspace, ...prev]);

      // --- CAMBIO CLAVE: Devolvemos el nuevo workspace ---
      return newWorkspace;

    } catch (error) {
      console.error("Error al crear el espacio de trabajo:", error);
      throw error;
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
    // 1. Guardamos una copia del estado actual para poder revertir en caso de error.
    const originalWorkspaces = [...workspaces];
    
    // 2. **LA ACTUALIZACIÓN OPTIMISTA:**
    // Eliminamos el espacio de trabajo del estado local INMEDIATAMENTE.
    // La tarjeta desaparecerá de la interfaz al instante.
    setWorkspaces(prev => prev.filter(ws => ws.id !== workspaceId));
    
    // Si el workspace eliminado era el activo, lo limpiamos.
    if (activeWorkspace?.id === workspaceId) {
      setActiveWorkspace(null);
    }

    try {
      // 3. Enviamos la petición a la API en segundo plano.
      await api.delete(`/workspaces/${workspaceId}`);
      // Si la API responde con éxito, no necesitamos hacer nada más.
      // La UI ya está actualizada y ahora la base de datos también.
      console.log(`✅ Espacio de trabajo ${workspaceId} eliminado exitosamente del servidor.`);
      
    } catch (error) {
      console.error("Error al eliminar el espacio de trabajo:", error);
      alert(error.response?.data?.detail || "No se pudo eliminar el espacio de trabajo. Se restaurará la vista.");
      
      // 4. **LA REVERSIÓN:**
      // Si la API falla, restauramos la UI a su estado original.
      // El espacio de trabajo que "desapareció" volverá a aparecer.
      setWorkspaces(originalWorkspaces);
      
      // Opcional: si el activo fue el que falló, lo restauramos también.
      if (activeWorkspace?.id === workspaceId) {
        const originalWorkspace = originalWorkspaces.find(ws => ws.id === workspaceId);
        setActiveWorkspace(originalWorkspace || null);
      }
    }
  }, [workspaces, activeWorkspace]); // La dependencia ahora es la lista completa y el activo


  const togglePinWorkspace = useCallback(async (workspaceId) => {
    // 1. Guardamos el estado original por si necesitamos revertir
    const originalWorkspaces = workspaces;

    // 2. **LA ACTUALIZACIÓN OPTIMISTA:**
    // Modificamos el estado local INMEDIATAMENTE, sin esperar a la API.
    setWorkspaces(prev => 
      prev.map(ws => 
        ws.id === workspaceId ? { ...ws, isPinned: !ws.isPinned } : ws
      )
    );

    try {
      // 3. Enviamos la petición a la API en segundo plano
      await api.put(`/workspaces/${workspaceId}/pin`);
      // Si la API responde con éxito, no necesitamos hacer nada más. La UI ya está actualizada.
      console.log(`✅ Estado de pin para ${workspaceId} actualizado en el servidor.`);

    } catch (error) {
      console.error("Error al fijar el espacio de trabajo:", error);
      alert(error.response?.data?.detail || "No se pudo actualizar el estado. Reintentando.");
      
      // 4. **LA REVERSIÓN:**
      // Si la API falla, revertimos la UI a su estado original.
      setWorkspaces(originalWorkspaces);
    }
  }, [workspaces]); ;

  const touchWorkspace = useCallback(async (workspaceId) => {
      try {
          // Llamada "fire-and-forget". No esperamos una respuesta ni bloqueamos la UI.
          api.put(`/workspaces/${workspaceId}/touch`);
      } catch (error) {
          // Como es una operación en segundo plano, solo la registramos en la consola.
          console.warn("No se pudo actualizar la fecha de último acceso:", error);
      }
  }, []);

  const value = {
    user, // <-- Exponemos el usuario
    workspaces,
    activeWorkspace,
    setActiveWorkspace,
    isLoading,
    fetchWorkspaces,
    createWorkspace,
    renameWorkspace, // Exponemos las nuevas funciones
    deleteWorkspace,
    isSwitching,
    togglePinWorkspace,
    touchWorkspace,
    clearWorkspaceContext,
    updateCredits,
    credits
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