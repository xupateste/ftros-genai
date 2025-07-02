import React, { useState, useEffect, useCallback } from 'react';
import { WorkspaceProvider, useWorkspace } from './context/WorkspaceProvider';
import { StrategyProvider } from './context/StrategyProvider';
import LandingPage from './pages/LandingPage'; // Tu componente existente
import { Dashboard } from './components/Dashboard'; // El nuevo componente
import { LoginPage } from './components/_LoginPage'; // Asumiendo que tienes un componente de Login
import { AppHeader } from './components/AppHeader'; // Importa el nuevo encabezado
import AnalysisWorkspace from './components/AnalysisWorkspace'; // Necesitaremos renderizarlo desde aquí

// Componente de Carga para una mejor UX
const LoadingScreen = ({ message = "Cargando Ferretero.IA..." }) => (
  <div className="min-h-screen bg-neutral-900 flex flex-col items-center justify-center text-white">
    <p>{message}</p>
    {/* Aquí podrías añadir un spinner o logo animado */}
  </div>
);

function AppContent() {
  const [authToken, setAuthToken] = useState(() => localStorage.getItem('accessToken'));
  // El estado ahora puede ser: 'loading', 'landing', 'dashboard', 'analysis'
  const [currentView, setCurrentView] = useState('loading');

  // const [isInitializing, setIsInitializing] = useState(true);

  // Obtenemos la función para cargar los workspaces desde el contexto
  const { activeWorkspace, setActiveWorkspace, fetchWorkspaces } = useWorkspace();

  useEffect(() => {
    if (authToken) {
      // Si hay token, cargamos los workspaces para decidir a dónde ir
      const initializeSession = async () => {
        const workspaces = await fetchWorkspaces(authToken);
        if (workspaces && workspaces.length > 0) {
          // Si hay workspaces, vamos directo al de análisis con el más reciente
          setActiveWorkspace(workspaces[0]);
          setCurrentView('analysis');
        } else {
          // Si es un usuario nuevo sin workspaces, lo llevamos al dashboard
          setCurrentView('dashboard');
        }
      };
      initializeSession();
    } else {
      // Si no hay token, es un visitante anónimo
      setCurrentView('landing');
    }
  }, [authToken, fetchWorkspaces, setActiveWorkspace]);


  // Función que se pasará al LoginPage a través de LandingPage
  // const handleLoginSuccess = useCallback((token) => {
  //   localStorage.setItem('accessToken', token);
  //   setAuthToken(token); // Esto disparará el useEffect de arriba y cargará los workspaces
  // }, []);
  const handleLoginSuccess = (token) => {
    localStorage.setItem('accessToken', token);
    setAuthToken(token); // Esto disparará el useEffect de arriba, iniciando el flujo de usuario registrado
  };

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    setAuthToken(null); // Esto disparará el useEffect, cambiando la vista a 'landing'
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

//   // --- Renderizado Condicional ---
//   if (isInitializing) {
//     return <LoadingScreen />;
//   }
  
//   return authToken ? (
//     // Si hay un token, mostramos el Dashboard
//     <Dashboard onLogout={handleLogout} onEnterWorkspace={handleEnterWorkspace} />
//   ) : (
//     // Si no, mostramos el flujo para usuarios anónimos/nuevos
//     <LandingPage onLoginSuccess={handleLoginSuccess} />
//   );
// }

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