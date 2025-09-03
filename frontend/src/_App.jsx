// src/App.jsx (Versión Final Orquestada)

import React, { useState, useEffect, useCallback } from 'react';
import { WorkspaceProvider, useWorkspace } from './context/WorkspaceProvider';
import { StrategyProvider, useStrategy } from './context/StrategyProvider';
import { ConfigProvider } from './context/ConfigProvider'; // <-- Importa el nuevo provider

// Importa las vistas principales
import LandingPage from './pages/LandingPage';
import { Dashboard } from './components/Dashboard';
import { LoadingScreen } from './components/LoadingScreen'; // Asumiendo que creas este componente
import { AnalysisWorkspace } from './components/AnalysisWorkspace'; // Asumiendo que creas este componente
import { AdminRechargePage } from './pages/AdminRechargePage'; // <-- Importa la nueva página
import { LandingStockMuerto } from './pages/LandingStockMuerto';
import { LandingRotacion } from './pages/LandingRotacion';
import { LandingABC } from './pages/LandingABC';

import * as analytics from './utils/analytics';

// Este componente hijo contiene la lógica para evitar problemas con el contexto
function AppContent() {
  const [authToken, setAuthToken] = useState(() => localStorage.getItem('accessToken'));
  const [currentView, setCurrentView] = useState('loading'); // loading, landing, dashboard

  const [anonymousAnalysisData, setAnonymousAnalysisData] = useState(null);

  const { fetchWorkspaces, clearWorkspaceContext, activeWorkspace, setActiveWorkspace } = useWorkspace();
  const { loadStrategy } = useStrategy();

  useEffect(() => {
    // Inicializa Google Analytics cuando la aplicación se carga por primera vez.
    analytics.initGA();
  }, []);

  // "Checklist de Bienvenida": se ejecuta al cargar la app o al cambiar el token
  useEffect(() => {
    const initializeApp = async () => {
      if (authToken) {
        // Si hay token, cargamos los datos del usuario en paralelo
        const [workspaces, globalStrategy] = await Promise.all([
            fetchWorkspaces(),
            loadStrategy({ type: 'global' })
        ]);
        
        if (workspaces && workspaces.length > 0) {
          // Si tiene workspaces, establecemos el más reciente como activo
          const mostRecentWorkspace = workspaces[0];
          setActiveWorkspace(mostRecentWorkspace);
          // Cargamos la estrategia específica de ese workspace (o la global si no tiene una)
          await loadStrategy({ type: 'workspace', id: mostRecentWorkspace.id });
          // Lo llevamos directo al análisis
          setCurrentView('analysis'); 
        } else {
          // Si es un usuario nuevo sin workspaces, lo llevamos al dashboard
          setCurrentView('dashboard');
        }
      } else {
        // Si no hay token, es un visitante anónimo
        clearWorkspaceContext();
        setCurrentView('landing');
      }
    };
    initializeApp();
  }, [authToken, fetchWorkspaces, setActiveWorkspace, loadStrategy, clearWorkspaceContext]);


  const handleLoginSuccess = (token) => {
    localStorage.setItem('accessToken', token);
    setAuthToken(token); // Esto dispara el useEffect de arriba
  };

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    setAuthToken(null); // Esto también dispara el useEffect
  };

  // Esta función se llamará desde el Dashboard
  const handleEnterWorkspace = async (workspace) => {
    setActiveWorkspace(workspace);
    // Antes de cambiar la vista, cargamos la estrategia para ese workspace
    await loadStrategy({ type: 'workspace', id: workspace.id });
    setCurrentView('analysis');
  };
  
  const handleBackToDashboard = () => {
    // 1. Forzamos una recarga de los datos del usuario (workspaces Y créditos)
    // console.log("Volviendo al dashboard, refrescando contexto del usuario...");
    // await fetchWorkspaces();
    
    // 2. Una vez que los datos están frescos, cambiamos la vista
    setCurrentView('dashboard');
  };


  const handleAnonymousAnalyze = async ({ reportType, ventasFile, inventarioFile }) => {
    // Aquí irá la lógica de la Fase 2:
    // 1. Llamar al backend con los archivos.
    console.log(`Iniciando análisis anónimo para: ${reportType}`);
    // 2. El backend validará la sesión de 24h.
    // 3. Si es exitoso, devolverá la data del análisis.
    //    Si no, devolverá { error: 'SESSION_LIMIT_EXCEEDED' }.
    
    // ---- SIMULACIÓN POR AHORA ----
    // Simular una respuesta exitosa del backend
    const mockData = { report: reportType, results: [{ sku: '123', stock: 100, days_no_sale: 365 }] };
    setAnonymousAnalysisData(mockData);
    setCurrentView('anonymous-workspace'); // Cambiamos a la nueva vista

    // Simular una respuesta de límite excedido
    // const mockError = { error: 'SESSION_LIMIT_EXCEEDED' };
    // if (mockError.error === 'SESSION_LIMIT_EXCEEDED') {
    //   // Aquí levantaríamos el modal de registro/login
    //   console.log("Límite de sesión excedido, mostrando modal de registro.");
    //   // Por ahora, solo lo logueamos. La implementación del modal va después.
    // }
  };

  const currentPath = window.location.pathname;

  // Si el usuario ya está logueado, cualquier ruta de landing lo redirige a su app.
  if (authToken && ['/stock-muerto', '/rotacion-de-stock', '/analisis-abc'].includes(currentPath)) {
    // En una app con router, usaríamos <Navigate to="/" />.
    // Aquí, simplemente nos aseguramos de no mostrar las landings públicas.
    // El useEffect de initializeApp se encargará de llevarlo a su 'dashboard' o 'analysis'.
  } else {
    // Si no está logueado, decidimos qué landing mostrar.
    if (currentPath === '/stock-muerto') {
      return <LandingStockMuerto onAnalyze={handleAnonymousAnalyze} />;
    }
    if (currentPath === '/rotacion-de-stock') {
      return <LandingRotacion onAnalyze={handleAnonymousAnalyze} />;
    }
    if (currentPath === '/analisis-abc') {
      return <LandingABC onAnalyze={handleAnonymousAnalyze} />;
    }
  }

  if (window.location.pathname === '/sys/recharge') {
    return <AdminRechargePage />;
  }

  // Nueva vista para el workspace anónimo
  if (currentView === 'anonymous-workspace') {
      return <AnalysisWorkspace 
                context={{ type: 'anonymous' }} 
                initialData={anonymousAnalysisData} 
                onLoginSuccess={handleLoginSuccess}
             />
  }

  if (currentView === 'loading') {
    return <LoadingScreen message="Inicializando Ferretero.IA..." />;
  }

  if (authToken) {
    switch(currentView) {
        case 'dashboard':
            return <Dashboard onLogout={handleLogout} onEnterWorkspace={handleEnterWorkspace} />;
        case 'analysis':
            return <AnalysisWorkspace 
                        context={{ type: 'user', workspace: activeWorkspace }}
                        onLogout={handleLogout} 
                        onBackToDashboard={handleBackToDashboard} 
                    />;
        default:
            // Si está logueado pero aún cargando, muestra el loader
            return <LoadingScreen message="Cargando tu espacio..."/>;
    }
  }
  
  // Si no hay token, el único camino es el LandingPage
  return <LandingPage onLoginSuccess={handleLoginSuccess} />;
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