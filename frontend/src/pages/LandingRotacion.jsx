// src/pages/LandingRotacion.jsx

import React, {useEffect} from 'react';
import { ProductLandingPage } from './ProductLandingPage';

import { Helmet } from 'react-helmet-async';
import * as analytics from '../utils/analytics';

export const LandingRotacion = ({ onAnalyze, onLoginClick }) => {
  // SEO: Título y descripción específicos para esta herramienta
  const pageTitle = "Calculadora de Rotación de Inventario | Ferreteros.app";
  const pageDescription = "Mide la eficiencia de tu inventario. Descubre qué tan rápido vendes tus productos para optimizar compras y mejorar tu flujo de caja.";

  // SEM: Seguimiento de vista de página
  useEffect(() => {
    analytics.trackPageView('/rotacion-de-stock');
  }, []);

  return (
    <>
      <Helmet>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDescription} />
      </Helmet>

      <ProductLandingPage
        title={<>La app más confiable para medir la <strong>Rotación de Stock</strong></>}
        subtitle="Calcula la rotación de cada producto, detecta excesos o quiebres de stock y toma decisiones basadas en el movimiento real de tu inventario."
        ctaText="Analizar Rotación de Stock"
        reportType="inventory-turnover"
        action="la Medición"
        onAnalyze={onAnalyze}
        onLoginClick={onLoginClick}
      />
    </>
  );
};