// src/context/StrategyProvider.jsx

import React, { createContext, useState, useContext, useCallback } from 'react';
import api from '../utils/api'; // Usamos nuestro cliente API centralizado

const StrategyContext = createContext();

export function StrategyProvider({ children }) {
  const [strategy, setStrategy] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // Carga la estrategia correcta dependiendo del contexto (anónimo o de usuario)
  const loadStrategy = useCallback(async (context) => {
    if (!context || (!context.id && !context.workspace?.id)) {
      setStrategy({}); // Evita errores si no hay contexto
      return;
    }
    
    setIsLoading(true);
    let endpoint = '';
    
    if (context.type === 'user' && context.workspace) {
      endpoint = `/workspaces/${context.workspace.id}/strategy`;
    } else {
      // Para anónimos, el backend ya inicializó la sesión con la estrategia default
      endpoint = `/sessions/${context.id}/strategy`;
    }

    try {
      const response = await api.get(endpoint);
      setStrategy(response.data);
    } catch (error) {
      console.error("Error al cargar la estrategia activa:", error);
      setStrategy({}); // En caso de error, establece un objeto vacío
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Guarda la estrategia en el lugar correcto
  const saveStrategy = useCallback(async (strategyToSave, context) => {
    if (!context || !strategyToSave || (!context.id && !context.workspace?.id)) {
      throw new Error("Falta contexto o datos para guardar la estrategia.");
    }
    const identifier = context.type === 'user' ? context.workspace.id : context.id;
    try {
      // Endpoint para guardar la estrategia personalizada del workspace o la global del usuario
      const endpoint = context.type === 'user' ? `/workspaces/${identifier}/strategy` : `/sessions/${identifier}/strategy`;
      await api.put(endpoint, strategyToSave); 
      setStrategy(strategyToSave); // Actualización optimista
    } catch (error) {
      console.error("🔥 Error al guardar la estrategia:", error);
      throw error;
    }
  }, []);

  // Restaura la estrategia a su estado por defecto
  const resetStrategy = useCallback(async (context) => {
    if (!context) return;
    try {
      let newStrategy;
      if (context.type === 'workspace' && context.id) {
        await api.delete(`/workspaces/${context.id}/strategy`);
        // Volvemos a cargar la estrategia, que ahora será la global
        const response = await api.get(`/workspaces/${context.id}/strategy`);
        newStrategy = response.data;
      } else {
        const response = await api.get('/strategy/default');
        newStrategy = response.data;
      }
      setStrategy(newStrategy);
    } catch (error) {
      console.error(`Error al restaurar la estrategia:`, error);
      throw error;
    }
  }, []);

  const value = { 
    strategy, 
    setStrategy, // Necesario para la actualización local de anónimos
    isLoading, 
    loadStrategy, 
    saveStrategy, 
    resetStrategy 
  };

  return (
    <StrategyContext.Provider value={value}>
      {children}
    </StrategyContext.Provider>
  );
}

export function useStrategy() {
  return useContext(StrategyContext);
}
