// src/pages/LandingRotacion.jsx

import React from 'react';
import { ProductLandingPage } from './ProductLandingPage';

export const LandingRotacion = ({ onAnalyze, onLoginClick }) => {
  return (
    <ProductLandingPage
      title="Mide la Rotación de tu Inventario"
      subtitle="Descubre qué tan rápido se vende tu mercancía. Optimiza tus compras, mejora tu flujo de caja y maximiza la rentabilidad."
      ctaText="Analizar Rotación de Stock"
      reportType="inventory-turnover"
      onAnalyze={onAnalyze}
      onLoginClick={onLoginClick}
    />
  );
};