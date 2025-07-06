// src/context/ConfigProvider.jsx

import React, { createContext, useState, useEffect, useContext, useMemo } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const ConfigContext = createContext();

export function ConfigProvider({ children }) {
  // Estado para la configuración cruda que viene de la API
  const [rawConfig, setRawConfig] = useState({ reports: {}, tooltips: {} });
  const [isLoading, setIsLoading] = useState(true);

  // Este efecto carga la configuración completa una sola vez al iniciar la app
  useEffect(() => {
    const fetchConfig = async () => {
      setIsLoading(true);
      try {
        const response = await axios.get(`${API_URL}/reports-config`);
        setRawConfig(response.data || { reports: {}, tooltips: {} });
      } catch (error) {
        console.error("Error fatal: no se pudo cargar la configuración de reportes.", error);
        // En caso de error, establecemos un estado vacío para que la app no se rompa
        setRawConfig({ reports: {}, tooltips: {} });
      } finally {
        setIsLoading(false);
      }
    };
    fetchConfig();
  }, []); // El array vacío [] asegura que se ejecute solo una vez

  // Usamos useMemo para transformar la configuración de reportes al formato que la UI necesita (agrupado por categoría).
  // Esto es muy eficiente, ya que solo se recalcula si `rawConfig.reports` cambia.
  const reportData = useMemo(() => {
    if (!rawConfig.reports) return {};
    
    const groupedData = {};
    for (const key in rawConfig.reports) {
      const report = { ...rawConfig.reports[key], key };
      const category = report.categoria;
      if (!groupedData[category]) groupedData[category] = [];
      groupedData[category].push(report);
    }
    return groupedData;
  }, [rawConfig.reports]);

  // El valor del contexto ahora expone los datos de los reportes y el glosario de tooltips.
  const value = { 
    reportData, 
    tooltips: rawConfig.tooltips, 
    isLoading 
  };

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
