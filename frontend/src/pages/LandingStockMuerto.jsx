// src/pages/LandingStockMuerto.jsx

import React from 'react';
import { ProductLandingPage } from './ProductLandingPage';

export const LandingStockMuerto = ({ onAnalyze, onLoginClick, onLimitExceeded }) => {
  return (
    <ProductLandingPage
      title="La app más confiable para Calcular Stock Muerto"
      subtitle="Convierte tus datos en decisiones inteligentes que optimizan tu inventario y aumentan tu rentabilidad."
      ctaText="Analizar Stock Muerto"
      reportType="dead-stock"
      onAnalyze={onAnalyze}
      onLoginClick={onLoginClick}
      onLimitExceeded={onLimitExceeded}
    />
  );
};