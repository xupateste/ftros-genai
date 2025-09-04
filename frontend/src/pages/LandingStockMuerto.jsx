// src/pages/LandingStockMuerto.jsx

import React from 'react';
import { ProductLandingPage } from './ProductLandingPage';

export const LandingStockMuerto = ({ onAnalyze, onLoginClick, onLimitExceeded }) => {
  return (
    <ProductLandingPage
      title={<>La app más confiable para <strong>Calcular Stock Muerto</strong></>}
      // subtitle="Convierte tus datos en decisiones inteligentes que optimizan tu inventario y aumentan tu rentabilidad."
      subtitle="Detecta productos que no rotan, libera espacio y optimiza tu inventario con decisiones más inteligentes."
      ctaText="Analizar Stock Muerto"
      reportType="dead-stock"
      onAnalyze={onAnalyze}
      onLoginClick={onLoginClick}
      onLimitExceeded={onLimitExceeded}
    />
  );
};