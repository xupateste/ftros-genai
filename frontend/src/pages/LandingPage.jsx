// src/pages/LandingPage.jsx (Versión Simplificada)

import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { useStrategy } from '../context/StrategyProvider';

// Importa las vistas y componentes que necesita
import { LandingView } from '../components/LandingView';
import { OnboardingModal } from '../components/OnboardingModal';
import { LoginModal } from '../components/LoginModal';
import { RegisterModal } from '../components/RegisterModal';
import { AnalysisWorkspace } from '../components/AnalysisWorkspace';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export default function LandingPage({ onLoginSuccess }) {
  const [view, setView] = useState('landing'); // landing, onboarding, analysis
  const [activeModal, setActiveModal] = useState(null); // login, register

  const [initialDataForWorkspace, setInitialDataForWorkspace] = useState({});

  const [sessionId, setSessionId] = useState(null);
  const [onboardingData, setOnboardingData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const [appState, setAppState] = useState('landing');

  const { setStrategy } = useStrategy();

  const anonymousContext = useMemo(() => ({
    type: 'anonymous',
    id: sessionId
  }), [sessionId]); // Solo se recrea si el sessionId cambia


  const handleOnboardingSubmit = async (data) => {
    setIsLoading(true);
    try {
      const response = await axios.post(`${API_URL}/sessions`, data);
      const { sessionId: newSessionId, strategy: initialStrategy } = response.data;
      setSessionId(newSessionId);
      // setOnboardingData(data);

      setStrategy(initialStrategy);
      
      setActiveModal(null);
      setAppState('analysis');
    } catch (error) {
      alert("No se pudo iniciar la sesión.");
    } finally {
      setIsLoading(false);
    }
  };


   const renderMainView = () => {
    switch (appState) {
      case 'analysis':
        // Solo muestra el workspace si estamos en el estado de análisis
        return (
          <AnalysisWorkspace 
            context={anonymousContext}
            initialData={initialDataForWorkspace}
            onBackToDashboard={() => setActiveModal('login')}
            onSwitchToLogin={() => setActiveModal('login')}
            onSwitchToRegister={() => setActiveModal('register')}
            onLoginSuccess={onLoginSuccess}
          />
        );
      
      case 'landing':
      default:
        // Por defecto, o si estamos en el landing, muestra la vista de bienvenida
        return <LandingView onStartSession={() => setActiveModal('onboarding')} onLoginClick={() => setActiveModal('login')} />;
    }
  };
  
  return (
    <div className="min-h-screen bg-neutral-900 flex flex-col items-center justify-center">

      {renderMainView()}

      {/* Renderizado de Modales */}
      {activeModal === 'onboarding' && <OnboardingModal onSubmit={handleOnboardingSubmit} onCancel={() => setActiveModal(null)} isLoading={isLoading} onSwitchToLogin={() => setActiveModal('login')} />}
      {activeModal === 'login' && <LoginModal onLoginSuccess={onLoginSuccess} onSwitchToRegister={() => setActiveModal('register')} onClose={() => setActiveModal(null)} />}
      {activeModal === 'register' && <RegisterModal onRegisterSuccess={() => setActiveModal('login')} onSwitchToLogin={() => setActiveModal('login')} onClose={() => setActiveModal(null)} sessionId={sessionId} onboardingData={onboardingData} />}
    </div>
  );
}