// src/App.jsx (Versión Final Orquestada)

import React, { useState, useEffect, useCallback } from 'react';
import { WorkspaceProvider, useWorkspace } from './context/WorkspaceProvider';
import { StrategyProvider } from './context/StrategyProvider';
import { ConfigProvider } from './context/ConfigProvider'; // <-- Importa el nuevo provider

// Importa las vistas principales
import LandingPage from './pages/LandingPage';
import { Dashboard } from './components/Dashboard';
import { LoadingScreen } from './components/LoadingScreen'; // Asumiendo que creas este componente

// Este componente hijo contiene la lógica para evitar problemas con el contexto
function AppContent() {
  const [authToken, setAuthToken] = useState(() => localStorage.getItem('accessToken'));
  const [currentView, setCurrentView] = useState('loading'); // loading, landing, dashboard

  const { fetchWorkspaces, clearWorkspaceContext } = useWorkspace();

  // Decide qué mostrar al cargar la app y cuando el token cambia
  useEffect(() => {
    const initializeApp = async () => {
      if (authToken) {
        await fetchWorkspaces();
        setCurrentView('dashboard');
      } else {
        clearWorkspaceContext(); // Limpia datos de usuario si se cierra sesión
        setCurrentView('landing');
      }
    };
    initializeApp();
  }, [authToken, fetchWorkspaces, clearWorkspaceContext]);

  const handleLoginSuccess = (token) => {
    localStorage.setItem('accessToken', token);
    setAuthToken(token); // Esto dispara el useEffect de arriba
  };

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    setAuthToken(null); // Esto también dispara el useEffect
  };

  if (currentView === 'loading') {
    return <LoadingScreen message="Inicializando Ferretero.IA..." />;
  }

  return authToken ? (
    <Dashboard onLogout={handleLogout} />
  ) : (
    <LandingPage onLoginSuccess={handleLoginSuccess} />
  );
}


function App() {
  return (
      <StrategyProvider>
    <ConfigProvider>
        <WorkspaceProvider>
          <AppContent />
        </WorkspaceProvider>
    </ConfigProvider>
      </StrategyProvider>
  );
}

export default App;