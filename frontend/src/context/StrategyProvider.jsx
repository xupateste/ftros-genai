// src/context/StrategyProvider.jsx (Versión Orquestada y Final)

import React, { createContext, useState, useContext, useCallback } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const StrategyContext = createContext();

export function StrategyProvider({ children }) {
  // --- ESTADOS INTERNOS ---
  const [strategy, setStrategy] = useState(null); // La estrategia "maestra" o guardada
  const [isLoading, setIsLoading] = useState(false);
  const [activeSessionId, setActiveSessionId] = useState(null); // El ID de la sesión activa

  // --- FUNCIONES EXPUESTAS ---

  // Se llama una vez, cuando la sesión de análisis comienza.
  const initializeSessionAndLoadStrategy = useCallback(async (sessionId) => {
    if (!sessionId) return;
    setIsLoading(true);
    setActiveSessionId(sessionId); // Guarda el ID de sesión para usarlo después
    try {
      const response = await axios.get(`${API_URL}/sessions/${sessionId}/strategy`);
      setStrategy(response.data);
    } catch (error) {
      console.error("Error al cargar la estrategia inicial:", error);
      alert("No se pudo cargar la configuración de la estrategia.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Se llama desde el modal al hacer clic en "Guardar Cambios".
  const saveStrategy = useCallback(async (strategyToSave) => {
    if (!activeSessionId || !strategyToSave) {
      console.error("No se puede guardar: falta el ID de sesión o los datos.");
      throw new Error("Falta ID de sesión o datos para guardar.");
    }
    console.log(`Guardando estrategia para la sesión ${activeSessionId}...`);
    try {
      await axios.post(`${API_URL}/sessions/${activeSessionId}/strategy`, strategyToSave);
      // Actualizamos el estado "maestro" con los nuevos datos guardados
      setStrategy(strategyToSave);
      console.log("✅ Estrategia guardada en Firestore y actualizada en el contexto.");
    } catch (error) {
      console.error("🔥 Error al guardar la estrategia:", error);
      throw error; // Lanzamos el error para que el modal pueda informar al usuario
    }
  }, [activeSessionId]); // Esta función depende del ID de sesión activo

  // El valor que se comparte con toda la aplicación
  const value = { 
    strategy, 
    isLoading,
    initializeSessionAndLoadStrategy, 
    saveStrategy
  };

  return (
    <StrategyContext.Provider value={value}>
      {children}
    </StrategyContext.Provider>
  );
}

// Hook personalizado para un uso más fácil
export function useStrategy() {
  return useContext(StrategyContext);
}