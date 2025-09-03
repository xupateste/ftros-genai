// src/pages/LandingABC.jsx

import React from 'react';
import { ProductLandingPage } from './ProductLandingPage';

export const LandingABC = ({ onAnalyze, onLoginClick }) => {
  return (
    <ProductLandingPage
      title="Realiza un Análisis ABC de tu Catálogo"
      subtitle="Clasifica tus productos para saber cuáles generan la mayor parte de tus ingresos. Enfoca tus esfuerzos en lo que realmente importa."
      ctaText="Realizar Análisis ABC"
      reportType="abc-analysis"
      onAnalyze={onAnalyze}
      onLoginClick={onLoginClick}
    />
  );
};