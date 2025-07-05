import React, { useState, useEffect, useCallback } from 'react';
import { WorkspaceProvider, useWorkspace } from './context/WorkspaceProvider';
import { StrategyProvider } from './context/StrategyProvider';
import LandingPage from './pages/LandingPage'; // Tu componente existente
import { Dashboard } from './components/Dashboard'; // El nuevo componente
import LoginPage from './components/LoginPage'; // Asumiendo que tienes un componente de Login
import { AppHeader } from './components/AppHeader'; // Importa el nuevo encabezado
import AnalysisWorkspace from './components/AnalysisWorkspace'; // Necesitaremos renderizarlo desde aquí
import { useStrategy } from './context/StrategyProvider';

// Componente de Carga para una mejor UX
const LoadingScreen = ({ message = "Cargando Ferretero.IA..." }) => (
  <div className="min-h-screen bg-neutral-900 flex flex-col items-center justify-center text-white">
    <p>{message}</p>
    {/* Aquí podrías añadir un spinner o logo animado */}
  </div>
);

function AppContent() {
  const [authToken, setAuthToken] = useState(() => localStorage.getItem('accessToken'));
  const [currentView, setCurrentView] = useState('loading');

  const [isInitializing, setIsInitializing] = useState(true);

// Obtenemos las funciones de ambos contextos
  const { fetchWorkspaces, clearWorkspaceContext, setActiveWorkspace, activeWorkspace } = useWorkspace();
  const { loadStrategyForSession } = useStrategy(); // Asumimos que esta función existe en StrategyProvider

  useEffect(() => {
    const initializeApp = async () => {
      if (authToken) {
        // Si hay token, cargamos los workspaces del usuario
        const initialWorkspace = await fetchWorkspaces(authToken);
        if (initialWorkspace) {
          // Si tiene workspaces, lo llevamos directo al análisis
          setCurrentView('analysis'); 
        } else {
          // Si no, al dashboard para que cree uno
          setCurrentView('dashboard');
        }
      } else {
        // Si no hay token, es un visitante anónimo
        setCurrentView('landing');
      }
    };
    initializeApp();
  }, [authToken, fetchWorkspaces, setActiveWorkspace]);

  const handleLoginSuccess = (token) => {
    localStorage.setItem('accessToken', token);
    setAuthToken(token); // Esto disparará el useEffect de arriba, iniciando el flujo de usuario registrado
  };

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    setAuthToken(null); // Esto disparará el useEffect, cambiando la vista a 'landing'
    clearWorkspaceContext();
  };

  const handleEnterWorkspace = (workspace) => {
    // Establece el workspace activo y cambia la vista a la de análisis
    setActiveWorkspace(workspace);
    setCurrentView('analysis');
  };

  const handleOnBackToDashboard = () => {
    // Establece el workspace activo y cambia la vista a la de análisis
    setActiveWorkspace('');
    setCurrentView('dashboard');
  };

// --- Renderizado Condicional Basado en la Vista ---
  switch (currentView) {
    case 'loading':
      return <LoadingScreen />;
    
    case 'dashboard':
      // El dashboard ahora te permite entrar a un workspace, lo que cambia la vista a 'analysis'
      return <Dashboard onLogout={handleLogout} onBackToDashboard={handleOnBackToDashboard} onEnterWorkspace={(workspace) => {
        setActiveWorkspace(workspace);
        setCurrentView('analysis');
      }}/>;
      
    case 'analysis':
       // El workspace necesita una forma de volver al dashboard
      return <AnalysisWorkspace context={{ type: 'user', workspace: activeWorkspace }} onBackToDashboard={handleOnBackToDashboard} onLogout={handleLogout}/>;
      
    case 'landing':
    default:
      return <LandingPage onLoginSuccess={handleLoginSuccess} />;
  }
}


function App() {
  return (
    <StrategyProvider>
      <WorkspaceProvider>
        <AppContent />
      </WorkspaceProvider>
    </StrategyProvider>
  );
}

export default App;