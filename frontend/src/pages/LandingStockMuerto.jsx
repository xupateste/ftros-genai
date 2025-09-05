// src/pages/LandingStockMuerto.jsx

import React, {useEffect} from 'react';

import { Helmet } from 'react-helmet-async';
import * as analytics from '../utils/analytics';

import { ProductLandingPage } from './ProductLandingPage';

export const LandingStockMuerto = ({ onAnalyze, onLoginClick, onLimitExceeded }) => {
  useEffect(() => {
    analytics.trackPageView('/stock-muerto');
  }, []);

  return (
    <>
      <Helmet>
        <title>Calculadora de Stock Muerto Gratis | Ferreteros.app</title>
        <meta name="description" content="Analiza tu inventario y descubre qué productos no se venden. Sube tu CSV ó Excel y obtén un reporte de stock muerto al instante, sin registros." />
      </Helmet>

      <ProductLandingPage
        title={<>La app más confiable para <strong>Calcular Stock Muerto</strong></>}
        // subtitle="Convierte tus datos en decisiones inteligentes que optimizan tu inventario y aumentan tu rentabilidad."
        subtitle="Detecta productos que no rotan, libera espacio y optimiza tu inventario con decisiones más inteligentes."
        ctaText="Analizar Stock Muerto"
        reportType="dead-stock"
        action="el Cálculo"
        onAnalyze={onAnalyze}
        onLoginClick={onLoginClick}
        onLimitExceeded={onLimitExceeded}
      />
    </>
  );
};