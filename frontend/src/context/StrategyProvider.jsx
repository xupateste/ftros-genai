// src/context/StrategyProvider.jsx

import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import axios from 'axios';
import { useDebounce } from '../utils/useDebounce';

const API_URL = import.meta.env.VITE_API_URL;

const StrategyContext = createContext();

export function StrategyProvider({ children, sessionId }) { // Ahora recibe sessionId
  const [strategy, setStrategy] = useState(null); // Inicia como null
  const [isLoading, setIsLoading] = useState(true);

  // El valor "debounced" solo se actualizará 500ms después del último cambio
  const debouncedStrategy = useDebounce(strategy, 5750);

  // Efecto para cargar la estrategia inicial
  useEffect(() => {
    const fetchInitialStrategy = async () => {
      try {
        const response = await axios.get(`${API_URL}/strategy/default`);
        setStrategy(response.data);
      } catch (error) {
        console.error("Error al cargar la estrategia por defecto:", error);
        // Aquí podrías establecer un default local como plan B
      } finally {
        setIsLoading(false);
      }
    };
    fetchInitialStrategy();
  }, []); // Se ejecuta solo una vez

  // // Efecto para guardar la estrategia en Firestore cuando cambia
  // useEffect(() => {
  //   // No guardamos si la estrategia aún no se ha cargado o si no hay sesión
  //   if (!debouncedStrategy || !sessionId || isLoading) return;

  //   const saveStrategy = async () => {
  //     console.log("Guardando estrategia en el servidor...", debouncedStrategy);
  //     try {
  //       await axios.post(`${API_URL}/sessions/${sessionId}/strategy`, debouncedStrategy);
  //       console.log("✅ Estrategia guardada en Firestore.");
  //     } catch (error) {
  //       console.error("🔥 Error al guardar la estrategia:", error);
  //     }
  //   };
  //   saveStrategy();
  // }, [debouncedStrategy, sessionId, isLoading]);

  const saveStrategy = useCallback(async (strategyToSave, sessionId) => {
    if (!sessionId || !strategyToSave) return;
    console.log(`Guardando estrategia para la sesión ${sessionId}...`, strategyToSave);
    try {
      await axios.post(`${API_URL}/sessions/${sessionId}/strategy`, strategyToSave);
      console.log("✅ Estrategia guardada en Firestore.");
    } catch (error) {
      console.error("🔥 Error al guardar la estrategia:", error);
    }
  }, []);

  const restoreDefaults = async () => {
     // Ahora, restaurar también pide los defaults a la API
     try {
        const response = await axios.get(`${API_URL}/strategy/default`);
        setStrategy(response.data);
      } catch (error) {
        console.error("Error al restaurar defaults:", error);
      }
  };

  const value = { strategy, setStrategy, restoreDefaults, isLoading, saveStrategy };


  return (
    <StrategyContext.Provider value={value}>
      {children}
    </StrategyContext.Provider>
  );
}

export function useStrategy() {
  return useContext(StrategyContext);
}