// src/pages/LandingABC.jsx

import React, {useEffect} from 'react';
import { ProductLandingPage } from './ProductLandingPage';

import { Helmet } from 'react-helmet-async';
import * as analytics from '../utils/analytics';

export const LandingABC = ({ onAnalyze, onLoginClick }) => {
  // SEO: Título y descripción específicos
  const pageTitle = "Herramienta de Análisis ABC de Inventario | Ferreteros.app";
  const pageDescription = "Clasifica tus productos según su impacto en tus ingresos. Enfoca tu tiempo y dinero en los productos que realmente importan con un análisis ABC gratuito.";

  // SEM: Seguimiento de vista de página
  useEffect(() => {
    analytics.trackPageView('/analisis-abc');
  }, []);

  return (
    <>
      <Helmet>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDescription} />
      </Helmet>
      <ProductLandingPage
        title={<>La app más confiable para el <strong>Análisis ABC</strong> de tu inventario</>}
        subtitle="Identifica los productos que generan más valor, ordena tu inventario y maximiza tus recursos."
        ctaText="Realizar Análisis ABC"
        reportType="abc-analysis"
        action="el Análisis"
        onAnalyze={onAnalyze}
        onLoginClick={onLoginClick}
      />
    </>
  );
};