import React, { useState, useEffect, useCallback } from 'react';
import { WorkspaceProvider, useWorkspace } from './context/WorkspaceProvider';
import { StrategyProvider } from './context/StrategyProvider';
import LandingPage from './pages/LandingPage'; // Tu componente existente
import { Dashboard } from './components/Dashboard'; // El nuevo componente
import { LoginPage } from './components/_LoginPage'; // Asumiendo que tienes un componente de Login
import { AppHeader } from './components/AppHeader'; // Importa el nuevo encabezado

// Componente de Carga para una mejor UX
const LoadingScreen = () => (
  <div className="min-h-screen bg-neutral-900 flex flex-col items-center justify-center text-white">
    <p>Cargando Ferretero.IA...</p>
    {/* Aquí podrías poner un spinner o logo animado */}
  </div>
);

function AppContent() {
  const [authToken, setAuthToken] = useState(() => localStorage.getItem('accessToken'));
  const [isInitializing, setIsInitializing] = useState(true);

  // Obtenemos la función para cargar los workspaces desde el contexto
  const { fetchWorkspaces } = useWorkspace();
  useEffect(() => {
    const initializeUserSession = async () => {
      if (authToken) {
        await fetchWorkspaces();
      }
      setIsInitializing(false);
    };
    initializeUserSession();
  }, [authToken, fetchWorkspaces]);

  // Función que se pasará al LoginPage a través de LandingPage
  const handleLoginSuccess = useCallback((token) => {
    localStorage.setItem('accessToken', token);
    setAuthToken(token); // Esto disparará el useEffect de arriba y cargará los workspaces
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    setAuthToken(null);
    // No necesitamos recargar, el cambio de estado se encargará de todo
  };

  const handleEnterWorkspace = (workspace) => {
    // Establece el workspace activo y cambia la vista a la de análisis
    setActiveWorkspace(workspace);
    setCurrentView('analysis');
  };

  // --- Renderizado Condicional ---
  if (isInitializing) {
    return <LoadingScreen />;
  }
  
  return authToken ? (
    // Si hay un token, mostramos el Dashboard
    <Dashboard onLogout={handleLogout} onEnterWorkspace={handleEnterWorkspace} />
  ) : (
    // Si no, mostramos el flujo para usuarios anónimos/nuevos
    <LandingPage onLoginSuccess={handleLoginSuccess} />
  );
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