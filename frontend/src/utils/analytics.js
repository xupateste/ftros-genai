/*
================================================================================
|                                                                              |
| 📂 utils/analytics.js                                                        |
|                                                                              |
| Este archivo centraliza toda la lógica de Google Analytics.                  |
|                                                                              |
================================================================================
*/
import ReactGA from "react-ga4";

// Función para inicializar Google Analytics. Se llama una sola vez.
export const initGA = () => {
  const IS_PRODUCTION = process.env.NODE_ENV === 'production'
  // En un proyecto real, es mejor guardar este ID en una variable de entorno.
  if (!IS_PRODUCTION) {
    console.log("GA Init: Modo desarrollo, no se inicializará Google Analytics.");
    return;
  }
  const measurementId = "G-6TBQVG5P7V"; // <-- REEMPLAZA ESTO con tu ID de Medición de GA4
  ReactGA.initialize(measurementId);
};

// Función genérica para enviar eventos
const trackEvent = (name, params = {}) => {
  ReactGA.event(name, params);
};

// --- Eventos Específicos de la Aplicación ---

// 1. Interacción en la Landing Page
export const trackViewSectionFeatures = () => trackEvent("view_section", { section_name: "features" });
export const trackViewSectionTestimonial = () => trackEvent("view_section", { section_name: "testimonial" });

// 2. Proceso de Onboarding (Modal)
export const trackBeginOnboarding = () => trackEvent("begin_onboarding");
export const trackOnboardingStepComplete = (step) => trackEvent("onboarding_step_complete", { step: step });
export const trackOnboardingAbandoned = (step) => trackEvent("onboarding_abandoned", { step: step });

// 3. Conversiones y Acciones Finales
export const trackGenerateLead = (profile) => trackEvent("generate_lead", { user_profile: profile });
export const trackViewAlternateEnd = () => trackEvent("view_alternate_end");
export const trackClickSurveyLink = () => trackEvent("click_survey_link");
export const trackClickExternalLink = () => trackEvent("click_external_link", { link_url: "https://misotras.app" });