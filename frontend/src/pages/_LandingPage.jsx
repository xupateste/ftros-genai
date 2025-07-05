// LandingPage.jsx (Versión Refactorizada)

import React, { useState, useMemo, useEffect } from 'react';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

// Importa las vistas que necesitas
import LandingView from '../components/LandingView'; // Suponiendo que extraes el JSX del landing a su propio componente
import OnboardingModal from '../components/OnboardingModal';
import LoginPage from '../components/LoginPage';
import RegisterPage from '../components/RegisterPage';

import LoginModal from '../components/LoginModal';
import RegisterModal from '../components/RegisterModal';
import AnalysisWorkspace from '../components/AnalysisWorkspace'; // Importamos el nuevo motor

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
// const reportData = es obtenido del backend
const diccionarioData = { /* ... esto puede desestimarse ... */ };

// Este componente ahora solo maneja el flujo para usuarios NO logueados.
export default function LandingPage({ onLoginSuccess, onBackToDashboard }) {
  const [appState, setAppState] = useState('landing');
  const [activeModal, setActiveModal] = useState(null); // null, 'login', 'register', 'onboarding'
  
  const [sessionId, setSessionId] = useState(null);
  const [onboardingData, setOnboardingData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const [reportsConfig, setReportsConfig] = useState(null); // Para guardar la respuesta cruda de la API

  const handleOpenLogin = () => setActiveModal('login');
  const handleOpenRegister = () => setActiveModal('register');
  const closeModal = () => setActiveModal(null);

  const handleStartSession = () => setActiveModal('onboarding');

  const reportData = useMemo(() => {
    if (!reportsConfig) return {}; // Si no hay config, devuelve un objeto vacío

    const groupedData = {};
    // Iteramos sobre la configuración recibida del backend
    for (const key in reportsConfig) {
      const report = { ...reportsConfig[key], key }; // Añadimos la key única al objeto del reporte
      const category = report.categoria;
      if (!groupedData[category]) {
        groupedData[category] = [];
      }
      groupedData[category].push(report);
    }
    return groupedData;
  }, [reportsConfig]);

  useEffect(() => {
    // Solo se ejecuta una vez cuando el componente se monta
    const fetchConfig = async () => {
      // setIsConfigLoading(true);
      try {
        const response = await axios.get(`${API_URL}/reports-config`);
        console.log(response.data)
        setReportsConfig(response.data);
      } catch (error) {
        console.error("Error fatal: no se pudo cargar la configuración de reportes.", error);
        alert("No se pudo conectar con el servidor para cargar los reportes disponibles.");
      } finally {
        // setIsConfigLoading(false);
      }
    };
    fetchConfig();
  }, []);

  const handleOnboardingSubmit = async (data) => {
    setIsLoading(true);
    try {
      const response = await axios.post(`${API_URL}/sessions`, data);
      setSessionId(response.data.sessionId);
      setOnboardingData(data);
      setActiveModal(null); // Cierra el modal de onboarding
      setAppState('analysis'); // Cambia a la vista de análisis
    } catch (error) {
      alert("No se pudo iniciar la sesión.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoginFromModal = (token) => {
    closeModal();
    onLoginSuccess(token); // Notifica al componente App que el login fue exitoso
  };

  return (
    <div className="min-h-screen bg-neutral-900 flex flex-col items-center justify-center text-white">
      {appState === 'landing' ? (
        <LandingView onStartSession={handleStartSession} onLoginClick={handleOpenLogin} />
      ) : (
        <AnalysisWorkspace 
          context={{ type: 'anonymous', id: sessionId }}
          // Pasamos las funciones para que el workspace pueda abrir los modales
          onSwitchToLogin={handleOpenLogin}
          onSwitchToRegister={handleOpenRegister}
          onLoginSuccess={onLoginSuccess}
          reportData={reportData}
          diccionarioData={diccionarioData}
          onBackToDashboard={onBackToDashboard}
        />
      )}

      {/* --- RENDERIZADO CONDICIONAL DE MODALES --- */}
      {activeModal === 'onboarding' && (
        <OnboardingModal 
          onSubmit={handleOnboardingSubmit} 
          onCancel={closeModal} 
          isLoading={isLoading}
          onSwitchToLogin={() => setActiveModal('login')}
          onBackToLanding={() => setActiveModal(null)}
        />
      )}
      {activeModal === 'login' && (
        <LoginModal 
          onLoginSuccess={handleLoginFromModal}
          onSwitchToRegister={() => setActiveModal('register')}
          onClose={closeModal}
          onBackToAnalysis={() => setActiveModal(null)}
        />
      )}
      {activeModal === 'register' && (
        <RegisterModal 
          onRegisterSuccess={() => setActiveModal('login')} // Después de registrarse, abre el login
          onSwitchToLogin={() => setActiveModal('login')}
          onClose={closeModal}
          sessionId={sessionId}
          onboardingData={onboardingData}
          onBackToLanding={() => setActiveModal(null)}
        />
      )}
    </div>
  )
}