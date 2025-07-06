// src/context/StrategyProvider.jsx

import React, { createContext, useState, useContext, useCallback } from 'react';
import api from '../utils/api';

const StrategyContext = createContext();

export function StrategyProvider({ children }) {
  const [strategy, setStrategy] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // Carga la estrategia para un contexto específico (global o de workspace)
  const loadStrategy = useCallback(async (context) => {
    if (!context) {
      console.warn("Se intentó cargar una estrategia sin contexto.");
      return;
    }
    
    setIsLoading(true);
    let endpoint = '';
    
    if (context.type === 'global') {
      endpoint = '/strategy';
    } else if (context.type === 'workspace' && context.id) {
      endpoint = `/workspaces/${context.id}/strategy`;
    } else {
      // Si es anónimo, cargamos la de fábrica
      endpoint = '/strategy/default';
    }

    try {
      const response = await api.get(endpoint);
      setStrategy(response.data);
    } catch (error) {
      console.error(`Error al cargar la estrategia para el contexto ${context.type}:`, error);
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
    
    const endpoint = context.type === 'global' ? '/strategy' : `/workspaces/${context.id}/strategy`;
    
    try {
      await api.put(endpoint, strategyToSave); 
      setStrategy(strategyToSave);
    } catch (error) {
      console.error(`🔥 Error al guardar la estrategia:`, error);
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
    setStrategy,
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