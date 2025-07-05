// src/context/ConfigProvider.jsx

import React, { createContext, useState, useEffect, useContext, useMemo } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const ConfigContext = createContext();

export function ConfigProvider({ children }) {
  const [reportsConfig, setReportsConfig] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Este efecto carga la configuración una sola vez cuando la app se monta
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const response = await axios.get(`${API_URL}/reports-config`);
        setReportsConfig(response.data);
      } catch (error) {
        console.error("Error fatal: no se pudo cargar la configuración de reportes.", error);
        // Aquí podrías mostrar un error global si la configuración es crítica
      } finally {
        setIsLoading(false);
      }
    };
    fetchConfig();
  }, []); // El array vacío asegura que se ejecute solo una vez

  // Usamos useMemo para transformar la configuración al formato que la UI necesita.
  // Esto es muy eficiente, ya que solo se recalcula si `reportsConfig` cambia.
  const reportData = useMemo(() => {
    if (!reportsConfig) return {};
    const groupedData = {};
    for (const key in reportsConfig) {
      const report = { ...reportsConfig[key], key };
      const category = report.categoria;
      if (!groupedData[category]) groupedData[category] = [];
      groupedData[category].push(report);
    }
    return groupedData;
  }, [reportsConfig]);

  const value = { reportData, isLoading };

  return (
    <ConfigContext.Provider value={value}>
      {children}
    </ConfigContext.Provider>
  );
}

// Hook personalizado para un uso más fácil
export function useConfig() {
  return useContext(ConfigContext);
}