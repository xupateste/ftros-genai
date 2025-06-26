// src/context/StrategyProvider.jsx

import React, { createContext, useState, useContext } from 'react';

// Valores por defecto "de fábrica" para la estrategia
const defaultStrategy = {
  // Pesos de Importancia (1-10)
  score_ventas: 8,
  score_ingreso: 6,
  score_margen: 4,
  score_dias_venta: 2,
  
  // Parámetros de Riesgo y Cobertura
  lead_time_dias: 7,
  dias_cobertura_ideal_base: 10,
  dias_seguridad_base: 0,

  // Parámetros de Análisis
  dias_analisis_ventas_recientes: 30,
  dias_analisis_ventas_general: 180,
  excluir_sin_ventas: 'true',
  peso_ventas_historicas: 0.6,
};

const StrategyContext = createContext();

export function StrategyProvider({ children }) {
  // El estado SIEMPRE inicia con los valores por defecto.
  // Ya no lee de localStorage para mantener la sesión efímera.
  const [strategy, setStrategy] = useState(defaultStrategy);

  const restoreDefaults = () => {
    setStrategy(defaultStrategy);
  };

  // El valor del contexto ahora solo contiene el estado, el setter y la función de reseteo.
  const value = { strategy, setStrategy, restoreDefaults };

  return (
    <StrategyContext.Provider value={value}>
      {children}
    </StrategyContext.Provider>
  );
}

// Hook personalizado para usar el contexto fácilmente
export function useStrategy() {
  return useContext(StrategyContext);
}