// src/pages/LandingABC.jsx

import React from 'react';
import { ProductLandingPage } from './ProductLandingPage';

export const LandingABC = ({ onAnalyze, onLoginClick }) => {
  return (
    <ProductLandingPage
      title={<>La app más confiable para el <strong>Análisis ABC</strong> de tu inventario</>}
      subtitle="Identifica los productos que generan más valor, ordena tu inventario y maximiza tus recursos."
      ctaText="Realizar Análisis ABC"
      reportType="abc-analysis"
      action="el Análisis"
      onAnalyze={onAnalyze}
      onLoginClick={onLoginClick}
    />
  );
};