// src/pages/LandingRotacion.jsx

import React from 'react';
import { ProductLandingPage } from './ProductLandingPage';

export const LandingRotacion = ({ onAnalyze, onLoginClick }) => {
  return (
    <ProductLandingPage
      title={<>La app más confiable para medir la <strong>Rotación de Stock</strong></>}
      subtitle="Calcula la rotación de cada producto, detecta excesos o quiebres de stock y toma decisiones basadas en el movimiento real de tu inventario."
      ctaText="Analizar Rotación de Stock"
      reportType="inventory-turnover"
      action="la Medición"
      onAnalyze={onAnalyze}
      onLoginClick={onLoginClick}
    />
  );
};