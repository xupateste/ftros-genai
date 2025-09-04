// src/App.jsx (Versión Final Orquestada)

import React, { useState, useEffect, useCallback } from 'react';
import { WorkspaceProvider, useWorkspace } from './context/WorkspaceProvider';
import { StrategyProvider, useStrategy } from './context/StrategyProvider';
import { ConfigProvider } from './context/ConfigProvider'; // <-- Importa el nuevo provider

import axios from 'axios';

import { LoginModal } from './components/LoginModal';
import { RegisterModal } from './components/RegisterModal';

import { LimitExceededModal } from './components/LimitExceededModal';

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

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Este componente hijo contiene la lógica para evitar problemas con el contexto
function AppContent() {
  const [authToken, setAuthToken] = useState(() => localStorage.getItem('accessToken'));
  const [currentView, setCurrentView] = useState('loading'); // loading, landing, dashboard

  const [anonymousAnalysisData, setAnonymousAnalysisData] = useState(null);
  const [anonymousSessionId, setAnonymousSessionId] = useState(null);

  const [activeModal, setActiveModal] = useState(null); // 'login', 'register'

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
    window.history.replaceState({}, '', '/');
    setAuthToken(token); // Esto dispara el useEffect de arriba
    setActiveModal(null);
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
    const formData = new FormData();
    formData.append("ventas_file", ventasFile);
    formData.append("inventario_file", inventarioFile);
    formData.append("report_type", reportType);

    try {
      // Usamos el cliente 'api' que no tiene interceptor de token
      const response = await axios.post(`${API_URL}/api/v1/anonymous-analysis`, formData, {
         headers: { 'Content-Type': 'multipart/form-data' }
      });

      console.log("Respuesta exitosa del backend:", response.data); // Log de éxito

      // Éxito: Guardamos los datos y cambiamos de vista
      setAnonymousSessionId(response.data.session_id);
      setAnonymousAnalysisData(response.data.analysis_result);
      setCurrentView('anonymous-workspace');

    } catch (error) {
      console.error("Error en la ejecución final:", error);
      alert("Ocurrió un error al generar tu reporte final. Por favor, intenta de nuevo.");
      // Límite Excedido: Abrimos el modal de registro
      // if (error.response?.status === 429) {
      //   console.log("Límite de sesión excedido, mostrando modal de registro.");
      //   // setActiveModal('register');
      //   setActiveModal('limitExceeded'); 
      // } else {
      //   // Otro tipo de error
      //   alert(error.response?.data?.detail || "Ocurrió un error inesperado al procesar tu solicitud.");
      // }
    }
  };

  const handleLimitExceeded = () => {
    console.log("Límite de sesión excedido, mostrando modal de contexto.");
    setActiveModal('limitExceeded');
  };

  const currentPath = window.location.pathname;

  if (currentView === 'anonymous-workspace') {
      return (
        <>
          <AnalysisWorkspace 
            context={{ type: 'anonymous', id: anonymousSessionId }} 
            initialData={anonymousAnalysisData} 
            onLoginSuccess={handleLoginSuccess}
          />
          {activeModal === 'login' && <LoginModal onLoginSuccess={handleLoginSuccess} onSwitchToRegister={() => setActiveModal('register')} onClose={() => setActiveModal(null)} />}
          {activeModal === 'register' && <RegisterModal onRegisterSuccess={() => setActiveModal('login')} onSwitchToLogin={() => setActiveModal('login')} onClose={() => setActiveModal(null)} />}
        </>
      );
  }


  if (authToken) {
    // La lógica para usuarios autenticados también es una vista activa prioritaria.
    // (El switch para 'dashboard' y 'analysis' va aquí, como lo tenías)
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
            return <LoadingScreen message="Cargando tu espacio..."/>;
    }
  }


  if (currentPath === '/stock-muerto') {
    return (
      <>
        <LandingStockMuerto onAnalyze={handleAnonymousAnalyze} onLimitExceeded={handleLimitExceeded} onLoginClick={() => setActiveModal('login')} />;
        {activeModal === 'login' && <LoginModal onLoginSuccess={handleLoginSuccess} onSwitchToRegister={() => setActiveModal('register')} onClose={() => setActiveModal(null)} />}
        {activeModal === 'register' && <RegisterModal onRegisterSuccess={() => setActiveModal('login')} onSwitchToLogin={() => setActiveModal('login')} onClose={() => setActiveModal(null)} />}
        {activeModal === 'limitExceeded' && (
          <LimitExceededModal
            onClose={() => setActiveModal(null)}
            onRegister={() => setActiveModal('register')}
            onLogin={() => setActiveModal('login')}
          />
        )}
      </>
    )
  }
  if (currentPath === '/rotacion-de-stock') {
    return (
      <>
        <LandingRotacion onAnalyze={handleAnonymousAnalyze} onLimitExceeded={handleLimitExceeded} onLoginClick={() => setActiveModal('login')} />;
        {activeModal === 'login' && <LoginModal onLoginSuccess={handleLoginSuccess} onSwitchToRegister={() => setActiveModal('register')} onClose={() => setActiveModal(null)} />}
        {activeModal === 'register' && <RegisterModal onRegisterSuccess={() => setActiveModal('login')} onSwitchToLogin={() => setActiveModal('login')} onClose={() => setActiveModal(null)} />}
      </>
    )
  }
  if (currentPath === '/analisis-abc') {
    return (
      <>
        <LandingABC onAnalyze={handleAnonymousAnalyze} onLimitExceeded={handleLimitExceeded} onLoginClick={() => setActiveModal('login')} />;
        {activeModal === 'login' && <LoginModal onLoginSuccess={handleLoginSuccess} onSwitchToRegister={() => setActiveModal('register')} onClose={() => setActiveModal(null)} />}
        {activeModal === 'register' && <RegisterModal onRegisterSuccess={() => setActiveModal('login')} onSwitchToLogin={() => setActiveModal('login')} onClose={() => setActiveModal(null)} />}
      </>
    )
  }
  
  // --- PRIORIDAD 3: VISTAS POR DEFECTO ---
  if (window.location.pathname === '/sys/recharge') {
    return <AdminRechargePage />;
  }
  
  if (currentView === 'loading') {
    return <LoadingScreen message="Inicializando Analisis Ferreteros..." />;
  }

  // Si ninguna de las condiciones anteriores se cumple, muestra la landing principal.
  return (
    <>
      <LandingPage onLoginSuccess={handleLoginSuccess} />
      {activeModal === 'login' && <LoginModal onLoginSuccess={handleLoginSuccess} onSwitchToRegister={() => setActiveModal('register')} onClose={() => setActiveModal(null)} />}
      {activeModal === 'register' && <RegisterModal onRegisterSuccess={() => setActiveModal('login')} onSwitchToLogin={() => setActiveModal('login')} onClose={() => setActiveModal(null)} />}
    </>
  );





  // // Si el usuario ya está logueado, cualquier ruta de landing lo redirige a su app.
  // if (authToken && ['/stock-muerto', '/rotacion-de-stock', '/analisis-abc'].includes(currentPath)) {
  //   // En una app con router, usaríamos <Navigate to="/" />.
  //   // Aquí, simplemente nos aseguramos de no mostrar las landings públicas.
  //   // El useEffect de initializeApp se encargará de llevarlo a su 'dashboard' o 'analysis'.
  // } else {
  //   // Si no está logueado, decidimos qué landing mostrar.
  //   if (currentPath === '/stock-muerto') {
  //     return <LandingStockMuerto onAnalyze={handleAnonymousAnalyze} />;
  //   }
  //   if (currentPath === '/rotacion-de-stock') {
  //     return <LandingRotacion onAnalyze={handleAnonymousAnalyze} />;
  //   }
  //   if (currentPath === '/analisis-abc') {
  //     return <LandingABC onAnalyze={handleAnonymousAnalyze} />;
  //   }
  // }

  // if (window.location.pathname === '/sys/recharge') {
  //   return <AdminRechargePage />;
  // }

  // // Nueva vista para el workspace anónimo
  // if (currentView === 'anonymous-workspace') {
  //     return (
  //       <>
  //         <AnalysisWorkspace 
  //           context={{ type: 'anonymous', id: anonymousSessionId }} 
  //           initialData={anonymousAnalysisData} 
  //           onLoginSuccess={handleLoginSuccess}
  //         />
  //         {/* Añadimos los modales aquí también por si necesita registrarse desde el workspace */}
  //         {activeModal === 'login' && <LoginModal onLoginSuccess={handleLoginSuccess} onSwitchToRegister={() => setActiveModal('register')} onClose={() => setActiveModal(null)} />}
  //         {activeModal === 'register' && <RegisterModal onRegisterSuccess={() => setActiveModal('login')} onSwitchToLogin={() => setActiveModal('login')} onClose={() => setActiveModal(null)} />}
  //       </>
  //     );
  // }

  // if (currentView === 'loading') {
  //   return <LoadingScreen message="Inicializando Ferretero.IA..." />;
  // }

  // if (authToken) {
  //   switch(currentView) {
  //       case 'dashboard':
  //           return <Dashboard onLogout={handleLogout} onEnterWorkspace={handleEnterWorkspace} />;
  //       case 'analysis':
  //           return <AnalysisWorkspace 
  //                       context={{ type: 'user', workspace: activeWorkspace }}
  //                       onLogout={handleLogout} 
  //                       onBackToDashboard={handleBackToDashboard} 
  //                   />;
  //       default:
  //           // Si está logueado pero aún cargando, muestra el loader
  //           return <LoadingScreen message="Cargando tu espacio..."/>;
  //   }
  // }
  
  // // Si no hay token, el único camino es el LandingPage
  // // return <LandingPage onLoginSuccess={handleLoginSuccess} />;
  // return (
  //   <>
  //     <LandingPage onLoginSuccess={handleLoginSuccess} />
      
  //     {/* --- RENDERIZADO DE MODALES GLOBALES --- */}
  //     {activeModal === 'login' && <LoginModal onLoginSuccess={handleLoginSuccess} onSwitchToRegister={() => setActiveModal('register')} onClose={() => setActiveModal(null)} />}
  //     {activeModal === 'register' && <RegisterModal onRegisterSuccess={() => setActiveModal('login')} onSwitchToLogin={() => setActiveModal('login')} onClose={() => setActiveModal(null)} />}
  //   </>
  // );
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